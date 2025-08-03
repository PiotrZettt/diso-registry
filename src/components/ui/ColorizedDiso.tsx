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
      <span className="text-green-600">d</span>
      <span className="text-black">'</span>
      <span className="text-blue-800">I</span>
      <span className="text-blue-800">S</span>
      <span className="text-blue-800">O</span>
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
      <ColorizedDiso size={size} /> <span className="text-gray-700">Registry</span>
    </span>
  );
};