
import React, { useState } from 'react';
import { db } from '../services/mockDatabase';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  overrideLogo?: string; // Permet l'aperçu en temps réel
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '', overrideLogo }) => {
  const [hasError, setHasError] = useState(false);
  const settings = db.getSystemSettings();
  const { initials, logoUrl, name } = settings.branding;

  const currentLogo = overrideLogo || logoUrl;

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-lg',
    lg: 'w-14 h-14 rounded-xl',
    xl: 'w-20 h-20 rounded-2xl'
  };

  const fontSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  if (hasError || (!currentLogo && !hasError)) {
    return (
      <div 
        className={`${sizeClasses[size]} bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20 ${className}`}
        title={name}
      >
        <span className={`font-bold text-white ${fontSizeClasses[size]}`}>
          {initials || 'PE'}
        </span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} relative overflow-hidden bg-black border border-slate-700/50 shadow-lg ${className}`}>
      <img
        src={currentLogo || "/brand/pixel-en-route.jpg"}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
};
