import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'full' | 'simple' | 'text-only';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  variant = 'simple',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  const textSizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl'
  };

  if (variant === 'text-only') {
    return (
      <div className={`flex items-center ${className}`}>
        <span className={`font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${textSizeClasses[size]}`}>
          dISO Registry
        </span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center ${className}`}>
        <div className={`${sizeClasses[size]} mr-3`}>
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#2563eb', stopOpacity:1}} />
                <stop offset="100%" style={{stopColor:'#7c3aed', stopOpacity:1}} />
              </linearGradient>
            </defs>
            
            {/* Main background */}
            <rect width="64" height="64" rx="12" fill="url(#logoGradient)"/>
            
            {/* "d" letter */}
            <g fill="white">
              <path d="M18 35 L18 45 L22 48 L30 48 Q35 48 37 43 L37 40 Q37 35 32 33 L26 33 L26 35 Z" />
              <rect x="18" y="28" width="4" height="20" rx="1"/>
            </g>
            
            {/* ISO indicator */}
            <circle cx="42" cy="38" r="2.5" fill="rgba(255,255,255,0.9)"/>
            <text x="42" y="40" fontFamily="Arial, sans-serif" fontSize="4" fontWeight="bold" textAnchor="middle" fill="#2563eb">ISO</text>
            
            {/* Verification checkmark */}
            <path d="M45 25 L48 28 L54 20" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            
            {/* Blockchain element */}
            <g fill="rgba(255,255,255,0.4)">
              <rect x="12" y="18" width="4" height="4" rx="0.5"/>
              <rect x="12" y="23" width="4" height="4" rx="0.5"/>
              <line x1="16" y1="20" x2="20" y2="20" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
            </g>
          </svg>
        </div>
        <div>
          <h1 className={`font-bold text-card-foreground ${textSizeClasses[size]}`}>
            dISO Registry
          </h1>
          {size !== 'small' && (
            <p className="text-xs text-muted-foreground">Decentralized ISO Certification</p>
          )}
        </div>
      </div>
    );
  }

  // Simple variant (default)
  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="simpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor:'#2563eb', stopOpacity:1}} />
            <stop offset="100%" style={{stopColor:'#7c3aed', stopOpacity:1}} />
          </linearGradient>
        </defs>
        
        {/* Main background */}
        <rect width="64" height="64" rx="12" fill="url(#simpleGradient)"/>
        
        {/* "d" letter */}
        <g fill="white">
          <path d="M18 35 L18 45 L22 48 L30 48 Q35 48 37 43 L37 40 Q37 35 32 33 L26 33 L26 35 Z" />
          <rect x="18" y="28" width="4" height="20" rx="1"/>
        </g>
        
        {/* ISO indicator */}
        <circle cx="42" cy="38" r="2.5" fill="rgba(255,255,255,0.9)"/>
        <text x="42" y="40" fontFamily="Arial, sans-serif" fontSize="4" fontWeight="bold" textAnchor="middle" fill="#2563eb">ISO</text>
        
        {/* Verification checkmark */}
        <path d="M45 25 L48 28 L54 20" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        
        {/* Blockchain element */}
        <g fill="rgba(255,255,255,0.4)">
          <rect x="12" y="18" width="4" height="4" rx="0.5"/>
          <rect x="12" y="23" width="4" height="4" rx="0.5"/>
          <line x1="16" y1="20" x2="20" y2="20" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
        </g>
      </svg>
    </div>
  );
};