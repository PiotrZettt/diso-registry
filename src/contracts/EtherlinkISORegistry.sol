// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Etherlink ISO Certificate Registry
 * @dev Handles frequent operations and public queries for ISO certificates
 */
contract EtherlinkISORegistry {
    struct Certificate {
        string certificateId;
        string organizationName;
        string standard;
        string issuerName;
        uint256 issuedDate;
        uint256 expiryDate;
        uint8 status; // 0: Valid, 1: Suspended, 2: Revoked, 3: Expired
        string ipfsHash;
        string tezosTransactionHash;
        address certificationBodyAddress;
    }

    struct CertificationBody {
        string name;
        string accreditationNumber;
        string country;
        bool isActive;
        bool isApproved;
        address walletAddress;
        uint256 totalCertificatesIssued;
    }

    // State variables
    mapping(string => Certificate) public certificates;
    mapping(address => CertificationBody) public certificationBodies;
    mapping(string => bool) public usedCertificateIds;
    
    address public admin;
    uint256 public totalCertificates;
    
    // Events
    event CertificateIssued(
        string indexed certificateId,
        string organizationName,
        address indexed certificationBody,
        uint256 issuedDate
    );
    
    event CertificateStatusUpdated(
        string indexed certificateId,
        uint8 newStatus,
        address indexed updatedBy
    );
    
    event CertificationBodyRegistered(
        address indexed bodyAddress,
        string name,
        string accreditationNumber
    );
    
    event CertificationBodyApproved(
        address indexed bodyAddress,
        bool approved
    );

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyApprovedCertificationBody() {
        require(
            certificationBodies[msg.sender].isApproved && 
            certificationBodies[msg.sender].isActive,
            "Only approved certification bodies can perform this action"
        );
        _;
    }
    
    modifier certificateExists(string memory certificateId) {
        require(usedCertificateIds[certificateId], "Certificate does not exist");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Register a new certification body (pending approval)
     */
    function registerCertificationBody(
        string memory name,
        string memory accreditationNumber,
        string memory country
    ) external {
        require(
            certificationBodies[msg.sender].walletAddress == address(0),
            "Certification body already registered"
        );
        
        certificationBodies[msg.sender] = CertificationBody({
            name: name,
            accreditationNumber: accreditationNumber,
            country: country,
            isActive: true,
            isApproved: false, // Requires admin approval
            walletAddress: msg.sender,
            totalCertificatesIssued: 0
        });
        
        emit CertificationBodyRegistered(msg.sender, name, accreditationNumber);
    }

    /**
     * @dev Approve or reject a certification body (admin only)
     */
    function approveCertificationBody(address bodyAddress, bool approved) 
        external 
        onlyAdmin 
    {
        require(
            certificationBodies[bodyAddress].walletAddress != address(0),
            "Certification body not registered"
        );
        
        certificationBodies[bodyAddress].isApproved = approved;
        emit CertificationBodyApproved(bodyAddress, approved);
    }

    /**
     * @dev Issue a new certificate
     */
    function issueCertificate(
        string memory certificateId,
        string memory organizationName,
        string memory standard,
        uint256 expiryDate,
        string memory ipfsHash,
        string memory tezosTransactionHash
    ) external onlyApprovedCertificationBody {
        require(!usedCertificateIds[certificateId], "Certificate ID already exists");
        require(expiryDate > block.timestamp, "Expiry date must be in the future");
        
        certificates[certificateId] = Certificate({
            certificateId: certificateId,
            organizationName: organizationName,
            standard: standard,
            issuerName: certificationBodies[msg.sender].name,
            issuedDate: block.timestamp,
            expiryDate: expiryDate,
            status: 0, // Valid
            ipfsHash: ipfsHash,
            tezosTransactionHash: tezosTransactionHash,
            certificationBodyAddress: msg.sender
        });
        
        usedCertificateIds[certificateId] = true;
        certificationBodies[msg.sender].totalCertificatesIssued++;
        totalCertificates++;
        
        emit CertificateIssued(certificateId, organizationName, msg.sender, block.timestamp);
    }

    /**
     * @dev Update certificate status
     */
    function updateCertificateStatus(
        string memory certificateId,
        uint8 newStatus
    ) external certificateExists(certificateId) {
        require(newStatus <= 3, "Invalid status");
        
        Certificate storage cert = certificates[certificateId];
        
        // Only the issuing certification body or admin can update status
        require(
            msg.sender == cert.certificationBodyAddress || msg.sender == admin,
            "Unauthorized to update this certificate"
        );
        
        cert.status = newStatus;
        emit CertificateStatusUpdated(certificateId, newStatus, msg.sender);
    }

    /**
     * @dev Get certificate details
     */
    function getCertificate(string memory certificateId) 
        external 
        view 
        returns (Certificate memory) 
    {
        require(usedCertificateIds[certificateId], "Certificate does not exist");
        return certificates[certificateId];
    }

    /**
     * @dev Check if certificate is valid (not expired, not revoked/suspended)
     */
    function isCertificateValid(string memory certificateId) 
        external 
        view 
        returns (bool) 
    {
        if (!usedCertificateIds[certificateId]) return false;
        
        Certificate memory cert = certificates[certificateId];
        return (cert.status == 0 && cert.expiryDate > block.timestamp);
    }

    /**
     * @dev Get certification body details
     */
    function getCertificationBody(address bodyAddress) 
        external 
        view 
        returns (CertificationBody memory) 
    {
        return certificationBodies[bodyAddress];
    }

    /**
     * @dev Emergency pause/unpause certification body (admin only)
     */
    function setCertificationBodyStatus(address bodyAddress, bool isActive) 
        external 
        onlyAdmin 
    {
        certificationBodies[bodyAddress].isActive = isActive;
    }

    /**
     * @dev Transfer admin rights (admin only)
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        admin = newAdmin;
    }
}
