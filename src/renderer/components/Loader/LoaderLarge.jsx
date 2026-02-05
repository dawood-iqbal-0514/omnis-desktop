import React from 'react';

const LoaderLarge = ({ className = '' }) => {
  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 ${className}`}>
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-primary-accent/30 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-primary-accent border-r-primary-accent rounded-full animate-spin"></div>
        <div className="absolute inset-2 border-2 border-secondary-muted/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>
    </div>
  );
};

export default LoaderLarge;

