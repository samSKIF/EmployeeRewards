import React from 'react';

interface TenureRingProps {
  yearsOfService: number;
  className?: string;
}

export function TenureRing({ yearsOfService, className = "" }: TenureRingProps) {
  const getBorderColor = (years: number) => {
    if (years < 1) {
      return 'border-gray-400';
    } else if (years >= 1 && years < 5) {
      return 'border-gray-500';
    } else if (years >= 5 && years < 10) {
      return 'border-yellow-500';
    } else {
      return 'border-yellow-600';
    }
  };

  const showNumber = yearsOfService >= 10;
  const borderColor = getBorderColor(yearsOfService);

  return (
    <>
      {/* Simple border ring around avatar */}
      <div 
        className={`absolute inset-0 rounded-full border-2 ${borderColor} pointer-events-none ${className}`}
      />
      
      {/* Years badge for 10+ years */}
      {showNumber && (
        <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-white">
          {yearsOfService}
        </div>
      )}
    </>
  );
}