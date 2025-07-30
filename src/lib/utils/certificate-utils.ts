// Certificate utility functions
import { randomBytes } from 'crypto';

/**
 * Generate a unique certificate number
 */
export function generateCertificateNumber(standardNumber: string): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `ISO${standardNumber}-${timestamp}-${random}`;
}

/**
 * Validate certificate number format
 */
export function validateCertificateNumber(certificateNumber: string): boolean {
  const pattern = /^ISO\d+-[a-z0-9]+-[A-F0-9]{8}$/;
  return pattern.test(certificateNumber);
}

/**
 * Extract standard number from certificate number
 */
export function extractStandardFromCertNumber(certificateNumber: string): string | null {
  const match = certificateNumber.match(/^ISO(\d+)-/);
  return match ? match[1] : null;
}

/**
 * Format certificate display name
 */
export function formatCertificateDisplayName(standard: { number: string; title: string }): string {
  return `ISO ${standard.number} - ${standard.title}`;
}

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(expiryDate: Date): number {
  const now = new Date();
  const timeDiff = expiryDate.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Check if certificate is expiring soon
 */
export function isExpiringSoon(expiryDate: Date, daysThreshold = 90): boolean {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  return daysUntilExpiry <= daysThreshold && daysUntilExpiry > 0;
}

/**
 * Check if certificate is expired
 */
export function isExpired(expiryDate: Date): boolean {
  return getDaysUntilExpiry(expiryDate) <= 0;
}

/**
 * Get certificate status color for UI
 */
export function getCertificateStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'green';
    case 'suspended':
      return 'yellow';
    case 'revoked':
      return 'red';
    case 'expired':
      return 'gray';
    default:
      return 'gray';
  }
}

/**
 * Get certificate priority level based on expiry
 */
export function getCertificatePriority(expiryDate: Date): 'high' | 'medium' | 'low' {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  
  if (daysUntilExpiry <= 30) return 'high';
  if (daysUntilExpiry <= 90) return 'medium';
  return 'low';
}

/**
 * Generate certificate scope string from array
 */
export function formatCertificateScope(scope: string[]): string {
  if (scope.length === 0) return 'No scope defined';
  if (scope.length === 1) return scope[0];
  if (scope.length <= 3) return scope.join(', ');
  return `${scope.slice(0, 3).join(', ')} and ${scope.length - 3} more`;
}
