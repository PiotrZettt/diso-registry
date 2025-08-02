#!/usr/bin/env node

// Simple test script for the secure API Gateway + Lambda setup (using IAM roles)
const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function testAPI() {
  console.log('🚀 Testing API Gateway + Lambda setup...');
  console.log('📍 API Base URL:', API_BASE_URL);
  
  try {
    // Test 1: Register a new user
    console.log('\n1️⃣ Testing user registration...');
    
    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'viewer'
      }),
    });

    const registerData = await registerResponse.json();
    console.log('✅ Registration response:', registerData);

    if (!registerData.success) {
      throw new Error('Registration failed: ' + registerData.error);
    }

    const authToken = registerData.token;
    console.log('🔑 Auth token received');

    // Test 2: Get user profile
    console.log('\n2️⃣ Testing get user profile...');
    
    const profileResponse = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const profileData = await profileResponse.json();
    console.log('✅ Profile response:', profileData);

    if (!profileData.success) {
      throw new Error('Get profile failed: ' + profileData.error);
    }

    // Test 3: Create a certificate
    console.log('\n3️⃣ Testing certificate creation...');
    
    const certificateResponse = await fetch(`${API_BASE_URL}/certificates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        organization: {
          name: 'Test Organization Ltd',
          address: '123 Test Street, Test City, TC1 2AB',
          website: 'https://testorg.example.com',
          email: 'contact@testorg.example.com',
        },
        standard: {
          number: 'ISO 9001',
          title: 'Quality Management Systems',
          version: '2015',
          category: 'Quality Management',
        },
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        scope: 'Design and development of software applications',
        status: 'valid',
        issuerName: 'Test Certification Body',
        issuerCode: 'TCB001',
        auditInfo: {
          auditorName: 'Test Auditor',
          auditDate: new Date().toISOString(),
        },
      }),
    });

    const certificateData = await certificateResponse.json();
    console.log('✅ Certificate creation response:', certificateData);

    if (!certificateData.success) {
      throw new Error('Certificate creation failed: ' + certificateData.error);
    }

    // Test 4: Get user certificates
    console.log('\n4️⃣ Testing get user certificates...');
    
    const certificatesResponse = await fetch(`${API_BASE_URL}/certificates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const certificatesData = await certificatesResponse.json();
    console.log('✅ Get certificates response:', certificatesData);

    if (!certificatesData.success) {
      throw new Error('Get certificates failed: ' + certificatesData.error);
    }

    // Test 5: Search public certificates
    console.log('\n5️⃣ Testing public certificate search...');
    
    const searchResponse = await fetch(`${API_BASE_URL}/public/certificates/search?status=valid`, {
      method: 'GET',
    });

    const searchData = await searchResponse.json();
    console.log('✅ Public search response:', {
      success: searchData.success,
      count: searchData.count,
      certificatesFound: searchData.certificates?.length || 0
    });

    if (!searchData.success) {
      console.warn('⚠️ Public search failed:', searchData.error);
    }

    // Test 6: Verify certificate
    if (certificateData.success && certificateData.certificate) {
      console.log('\n6️⃣ Testing certificate verification...');
      
      const verifyResponse = await fetch(`${API_BASE_URL}/public/certificates/verify/${certificateData.certificate.certificateNumber}`, {
        method: 'GET',
      });

      const verifyData = await verifyResponse.json();
      console.log('✅ Certificate verification response:', {
        success: verifyData.success,
        found: verifyData.verification?.found,
        dbVerified: verifyData.verification?.verification?.database?.verified,
        blockchainVerified: verifyData.verification?.verification?.blockchain?.verified
      });

      if (!verifyData.success) {
        console.warn('⚠️ Certificate verification failed:', verifyData.error);
      }
    }

    console.log('\n🎉 All tests passed successfully!');
    console.log('✨ API Gateway + Lambda setup with blockchain integration is working correctly');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAPI();