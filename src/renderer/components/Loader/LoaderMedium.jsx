import React from 'react';

const LoaderMedium = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className="relative w-8 h-8">
        {}
        <div className="absolute inset-0 border-4 border-primary-accent/30 rounded-full animate-pulse"></div>
        {}
        <div className="absolute inset-0 border-4 border-transparent border-t-primary-accent border-r-primary-accent rounded-full animate-spin"></div>
        {}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary-accent rounded-full animate-pulse"></div>
        {}
        <div className="absolute inset-1 border-2 border-secondary-muted/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>
    </div>
  );
};

export default LoaderMedium;

