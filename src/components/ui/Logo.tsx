import React from 'react';
import Image from 'next/image';
import { ColorizedDisoRegistry } from './ColorizedDiso';

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

  const sizePixels = {
    small: 32,
    medium: 48,
    large: 64
  };

  const textSizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl'
  };

  if (variant === 'text-only') {
    return (
      <div className={`flex items-center ${className}`}>
        <span className={`font-bold ${textSizeClasses[size]}`}>
          <ColorizedDisoRegistry />
        </span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center ${className}`}>
        <div className={`${sizeClasses[size]} mr-3`}>
          <Image 
            src="/diso-logo-simple.svg" 
            alt="d'ISO Registry Logo"
            width={sizePixels[size]}
            height={sizePixels[size]}
            className="w-full h-full"
            priority
          />
        </div>
        <div>
          <h1 className={`font-bold text-card-foreground ${textSizeClasses[size]}`}>
            <ColorizedDisoRegistry />
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
      <Image 
        src="/diso-logo-simple.svg" 
        alt="dISO Registry Logo"
        width={sizePixels[size]}
        height={sizePixels[size]}
        className="w-full h-full"
        priority
      />
    </div>
  );
};