import React from 'react';

interface ColorizedDisoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
}

export const ColorizedDiso: React.FC<ColorizedDisoProps> = ({ 
  className = '',
  size = 'md'
}) => {
  return (
    <span className={`${className}`}>
      d<span style={{ color: '#AB2AD5' }}>I</span>
      <span style={{ color: '#E8932B' }}>S</span>
      <span style={{ color: '#3DDD67' }}>O</span>
    </span>
  );
};

interface ColorizedDisoRegistryProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
}

export const ColorizedDisoRegistry: React.FC<ColorizedDisoRegistryProps> = ({ 
  className = '',
  size = 'md'
}) => {
  return (
    <span className={`${className}`}>
      <ColorizedDiso size={size} /> Registry
    </span>
  );
};