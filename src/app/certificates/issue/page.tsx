'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function IssueCertificatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Helper function to get default dates
  const getDefaultDates = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const threeYearsLater = new Date(tomorrow);
    threeYearsLater.setFullYear(threeYearsLater.getFullYear() + 3);
    
    return {
      validFrom: tomorrow.toISOString().split('T')[0],
      validUntil: threeYearsLater.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationEmail: '',
    certificateType: 'ISO 9001',
    validFrom: defaultDates.validFrom,
    validUntil: defaultDates.validUntil,
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
        credentials: 'include',
        body: JSON.stringify(certificateData),
      });

      const result = await response.json();

      if (result.success) {
        const blockchainInfo = [];
        if (result.certificate.blockchain?.etherlinkHash) {
          blockchainInfo.push('✅ Deployed on Etherlink blockchain');
        }
        if (result.certificate.blockchain?.ipfsHash) {
          blockchainInfo.push('✅ Document stored on IPFS');
        }
        if (blockchainInfo.length === 0) {
          blockchainInfo.push('📋 Certificate created successfully');
        }
        
        alert(`🎉 Certificate issued successfully!\n\nCertificate Number: ${result.certificate.certificateNumber}\nOrganization: ${result.certificate.organization}\nStandard: ${result.certificate.standard}\n\n${blockchainInfo.join('\n')}`);
        
        // Reset form
        const newDefaultDates = getDefaultDates();
        setFormData({
          organizationName: '',
          organizationEmail: '',
          certificateType: 'ISO 9001',
          validFrom: newDefaultDates.validFrom,
          validUntil: newDefaultDates.validUntil,
          scope: '',
          additionalInfo: '',
        });
        
        // Redirect to certificate list or detail page
        router.push('/certificates');
      } else {
        alert(`❌ Error issuing certificate: ${result.error || 'Unknown error'}`);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-semibold text-card-foreground">Issue New Certificate</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-card rounded-lg border shadow-sm">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  required
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder="Enter organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationEmail">Organization Email</Label>
                <Input
                  id="organizationEmail"
                  name="organizationEmail"
                  type="email"
                  required
                  value={formData.organizationEmail}
                  onChange={handleChange}
                  placeholder="Enter organization email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificateType">Certificate Type</Label>
                <Select value={formData.certificateType} onValueChange={(value) => setFormData({...formData, certificateType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select certificate type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ISO 9001">ISO 9001 - Quality Management</SelectItem>
                    <SelectItem value="ISO 14001">ISO 14001 - Environmental Management</SelectItem>
                    <SelectItem value="ISO 45001">ISO 45001 - Occupational Health & Safety</SelectItem>
                    <SelectItem value="ISO 27001">ISO 27001 - Information Security</SelectItem>
                    <SelectItem value="ISO 50001">ISO 50001 - Energy Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Valid From</Label>
                  <Input
                    id="validFrom"
                    name="validFrom"
                    type="date"
                    required
                    value={formData.validFrom}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input
                    id="validUntil"
                    name="validUntil"
                    type="date"
                    required
                    value={formData.validUntil}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope">Scope of Certification</Label>
                <Textarea
                  id="scope"
                  name="scope"
                  rows={4}
                  required
                  value={formData.scope}
                  onChange={handleChange}
                  placeholder="Describe the scope of this certification..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
                <Textarea
                  id="additionalInfo"
                  name="additionalInfo"
                  rows={3}
                  value={formData.additionalInfo}
                  onChange={handleChange}
                  placeholder="Any additional notes or requirements..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Issuing...
                    </>
                  ) : (
                    'Issue Certificate'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
