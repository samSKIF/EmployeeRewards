import React from 'react';

interface TenureRingProps {
  yearsOfService: number;
  className?: string;
}

export function TenureRing({ yearsOfService, className = "" }: TenureRingProps) {
  // Debug: log the years of service
  console.log('TenureRing: yearsOfService =', yearsOfService);
  
  const getBorderColor = (years: number) => {
    console.log('Getting border color for years:', years);
    if (years < 1) {
      return 'border-gray-400';
    } else if (years >= 1 && years < 5) {
      return 'border-gray-500';
    } else if (years >= 5 && years < 10) {
      return 'border-yellow-500';
    } else {
      return 'border-amber-500';
    }
  };

  const showNumber = yearsOfService >= 10;
  const borderColor = getBorderColor(yearsOfService);
  console.log('TenureRing: borderColor =', borderColor);

  return (
    <>
      {/* Border ring positioned outside the avatar */}
      <div 
        className={`absolute -inset-1 rounded-full ${borderColor} pointer-events-none ${className}`}
        style={{ borderWidth: '3px' }}
      />
      
      {/* Years badge for 10+ years */}
      {showNumber && (
        <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-lg">
          {yearsOfService}
        </div>
      )}
    </>
  );
}