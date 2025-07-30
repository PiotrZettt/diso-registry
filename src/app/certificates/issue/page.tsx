'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function IssueCertificatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationEmail: '',
    certificateType: 'ISO 9001',
    validFrom: '',
    validUntil: '',
    scope: '',
    additionalInfo: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper functions for ISO standard data
  const getStandardTitle = (type: string) => {
    const titles: { [key: string]: string } = {
      'ISO 9001': 'Quality Management Systems',
      'ISO 14001': 'Environmental Management Systems',
      'ISO 45001': 'Occupational Health and Safety Management Systems',
      'ISO 27001': 'Information Security Management Systems',
      'ISO 22000': 'Food Safety Management Systems',
      'ISO 13485': 'Medical Devices - Quality Management Systems',
    };
    return titles[type] || 'Quality Management Systems';
  };

  const getStandardCategory = (type: string) => {
    const categories: { [key: string]: string } = {
      'ISO 9001': 'quality',
      'ISO 14001': 'environmental',
      'ISO 45001': 'health_safety',
      'ISO 27001': 'information_security',
      'ISO 22000': 'food_safety',
      'ISO 13485': 'medical_devices',
    };
    return categories[type] || 'quality';
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Create certificate data matching the API format
      const certificateData = {
        organization: {
          name: formData.organizationName,
          contactEmail: formData.organizationEmail,
          address: 'Address not provided', // Form could be extended to include this
        },
        standard: {
          number: formData.certificateType.split(' ')[1], // Extract number from "ISO 9001"
          title: getStandardTitle(formData.certificateType),
          version: '2015', // Default version
          category: getStandardCategory(formData.certificateType),
        },
        scope: formData.scope,
        expiryDate: formData.validUntil,
        additionalInfo: formData.additionalInfo,
      };

      const response = await fetch('/api/certificates/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(certificateData),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Certificate issued successfully! Certificate Number: ${result.certificate.certificateNumber}\n\nBlockchain Status:\n- Tezos: ${result.certificate.blockchain?.tezosHash ? 'Deployed' : 'Pending'}\n- Etherlink: ${result.certificate.blockchain?.etherlinkHash ? 'Deployed' : 'Pending'}\n- IPFS: ${result.certificate.blockchain?.ipfsHash ? 'Uploaded' : 'Pending'}`);
        
        // Reset form
        setFormData({
          organizationName: '',
          organizationEmail: '',
          certificateType: 'ISO 9001',
          validFrom: '',
          validUntil: '',
          scope: '',
          additionalInfo: '',
        });
        
        // Redirect to certificate list or detail page
        router.push('/certificates');
      } else {
        alert(`Error issuing certificate: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error issuing certificate:', error);
      alert('Error issuing certificate. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Issue New Certificate</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    name="organizationName"
                    id="organizationName"
                    required
                    value={formData.organizationName}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter organization name"
                  />
                </div>

                <div>
                  <label htmlFor="organizationEmail" className="block text-sm font-medium text-gray-700">
                    Organization Email
                  </label>
                  <input
                    type="email"
                    name="organizationEmail"
                    id="organizationEmail"
                    required
                    value={formData.organizationEmail}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter organization email"
                  />
                </div>

                <div>
                  <label htmlFor="certificateType" className="block text-sm font-medium text-gray-700">
                    Certificate Type
                  </label>
                  <select
                    name="certificateType"
                    id="certificateType"
                    value={formData.certificateType}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="ISO 9001">ISO 9001 - Quality Management</option>
                    <option value="ISO 14001">ISO 14001 - Environmental Management</option>
                    <option value="ISO 45001">ISO 45001 - Occupational Health & Safety</option>
                    <option value="ISO 27001">ISO 27001 - Information Security</option>
                    <option value="ISO 50001">ISO 50001 - Energy Management</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="validFrom" className="block text-sm font-medium text-gray-700">
                      Valid From
                    </label>
                    <input
                      type="date"
                      name="validFrom"
                      id="validFrom"
                      required
                      value={formData.validFrom}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      name="validUntil"
                      id="validUntil"
                      required
                      value={formData.validUntil}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="scope" className="block text-sm font-medium text-gray-700">
                    Scope of Certification
                  </label>
                  <textarea
                    name="scope"
                    id="scope"
                    rows={3}
                    required
                    value={formData.scope}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Describe the scope of this certification..."
                  />
                </div>

                <div>
                  <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700">
                    Additional Information (Optional)
                  </label>
                  <textarea
                    name="additionalInfo"
                    id="additionalInfo"
                    rows={2}
                    value={formData.additionalInfo}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Any additional notes or requirements..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Issuing...' : 'Issue Certificate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
