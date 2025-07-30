'use client';

import { useState } from 'react';

interface IssueCertificateFormProps {
  onSubmitAction: (data: any) => Promise<void>;
  isLoading: boolean;
}

export default function IssueCertificateForm({ onSubmitAction, isLoading }: IssueCertificateFormProps) {
  const [formData, setFormData] = useState({
    organization: {
      name: '',
      address: '',
      website: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
    },
    standard: {
      number: '',
      title: '',
      version: '2024',
      category: 'quality' as const,
    },
    scope: '',
    expiryDate: '',
    auditor: {
      name: '',
      qualifications: [],
      contactEmail: '',
    },
    certificationBodyContact: '',
    documents: [],
    metadata: {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitAction(formData);
  };

  const handleChange = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i] as keyof typeof current] as any;
      }
      
      current[keys[keys.length - 1] as keyof typeof current] = value;
      return newData;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Issue New ISO Certificate</h2>
      <p className="text-sm text-gray-600 mb-8">
        Issue a new ISO certificate that will be recorded on both Tezos and Etherlink blockchains for tamper-proof verification.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="org-name" className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name *
              </label>
              <input
                id="org-name"
                type="text"
                required
                value={formData.organization.name}
                onChange={(e) => handleChange('organization.name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter organization name"
              />
            </div>

            <div>
              <label htmlFor="org-email" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                id="org-email"
                type="email"
                value={formData.organization.contactEmail}
                onChange={(e) => handleChange('organization.contactEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="contact@organization.com"
              />
            </div>

            <div>
              <label htmlFor="org-contact" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person
              </label>
              <input
                id="org-contact"
                type="text"
                value={formData.organization.contactPerson}
                onChange={(e) => handleChange('organization.contactPerson', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="org-website" className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                id="org-website"
                type="url"
                value={formData.organization.website}
                onChange={(e) => handleChange('organization.website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://organization.com"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="org-address" className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                id="org-address"
                value={formData.organization.address}
                onChange={(e) => handleChange('organization.address', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full organization address"
              />
            </div>
          </div>
        </div>

        {/* ISO Standard Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ISO Standard Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="standard-number" className="block text-sm font-medium text-gray-700 mb-2">
                ISO Standard Number *
              </label>
              <input
                id="standard-number"
                type="text"
                required
                value={formData.standard.number}
                onChange={(e) => handleChange('standard.number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ISO 9001"
              />
            </div>

            <div>
              <label htmlFor="standard-version" className="block text-sm font-medium text-gray-700 mb-2">
                Version
              </label>
              <input
                id="standard-version"
                type="text"
                value={formData.standard.version}
                onChange={(e) => handleChange('standard.version', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2024"
              />
            </div>

            <div>
              <label htmlFor="standard-category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="standard-category"
                value={formData.standard.category}
                onChange={(e) => handleChange('standard.category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="quality">Quality Management</option>
                <option value="environmental">Environmental</option>
                <option value="security">Information Security</option>
                <option value="safety">Safety</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label htmlFor="standard-title" className="block text-sm font-medium text-gray-700 mb-2">
                Standard Title
              </label>
              <input
                id="standard-title"
                type="text"
                value={formData.standard.title}
                onChange={(e) => handleChange('standard.title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Quality management systems — Requirements"
              />
            </div>
          </div>
        </div>

        {/* Certificate Details */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="scope" className="block text-sm font-medium text-gray-700 mb-2">
                Scope of Certification
              </label>
              <textarea
                id="scope"
                value={formData.scope}
                onChange={(e) => handleChange('scope', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the scope of certification..."
              />
            </div>

            <div>
              <label htmlFor="expiry-date" className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date *
              </label>
              <input
                id="expiry-date"
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => handleChange('expiryDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="auditor-name" className="block text-sm font-medium text-gray-700 mb-2">
                Auditor Name
              </label>
              <input
                id="auditor-name"
                type="text"
                value={formData.auditor.name}
                onChange={(e) => handleChange('auditor.name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Lead Auditor Name"
              />
            </div>
          </div>
        </div>

        {/* Blockchain Integration Notice */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Blockchain Integration</h3>
              <p className="mt-1 text-sm text-blue-700">
                This certificate will be automatically recorded on both Tezos and Etherlink blockchains for tamper-proof verification.
                The certificate data will also be stored on IPFS for decentralized access.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Issuing Certificate...' : 'Issue Certificate'}
          </button>
        </div>
      </form>
    </div>
  );
}
