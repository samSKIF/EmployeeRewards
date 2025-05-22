import React from 'react';

interface TenureRingProps {
  yearsOfService: number;
  className?: string;
}

export function TenureRing({ yearsOfService, className = "" }: TenureRingProps) {
  const getTenureStyle = (years: number) => {
    if (years < 1) {
      // New employees - subtle grey
      return {
        gradientFrom: '#d1d5db',
        gradientTo: '#9ca3af',
        shadowColor: 'rgba(156, 163, 175, 0.3)',
      };
    } else if (years >= 1 && years < 5) {
      // 1-4 years - silver
      return {
        gradientFrom: '#e5e7eb',
        gradientTo: '#6b7280',
        shadowColor: 'rgba(107, 114, 128, 0.4)',
      };
    } else if (years >= 5 && years < 10) {
      // 5-9 years - golden glow
      return {
        gradientFrom: '#fef3c7',
        gradientTo: '#f59e0b',
        shadowColor: 'rgba(245, 158, 11, 0.6)',
      };
    } else {
      // 10+ years - intense golden glow
      return {
        gradientFrom: '#fffbeb',
        gradientTo: '#d97706',
        shadowColor: 'rgba(217, 119, 6, 0.8)',
      };
    }
  };

  const showNumber = yearsOfService >= 10;
  const style = getTenureStyle(yearsOfService);

  return (
    <>
      {/* Outer glow effect */}
      <div 
        className={`absolute pointer-events-none ${className}`}
        style={{
          top: '-6px',
          left: '-6px',
          width: 'calc(100% + 12px)',
          height: 'calc(100% + 12px)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${style.shadowColor} 0%, transparent 70%)`,
          filter: 'blur(4px)',
        }}
      />
      
      {/* Perfect circular gradient border */}
      <div 
        className={`absolute pointer-events-none ${className}`}
        style={{
          top: '-3px',
          left: '-3px',
          width: 'calc(100% + 6px)',
          height: 'calc(100% + 6px)',
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, ${style.gradientFrom} 0%, ${style.gradientTo} 25%, white 50%, ${style.gradientTo} 75%, ${style.gradientFrom} 100%)`,
          padding: '3px',
        }}
      >
        {/* Inner cutout for perfect circle */}
        <div 
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'white',
          }}
        />
      </div>
      
      {/* Years badge for 10+ years */}
      {showNumber && (
        <div 
          className="absolute -top-2 -right-2 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${style.gradientFrom}, ${style.gradientTo})`,
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            boxShadow: `0 0 10px ${style.shadowColor}`,
          }}
        >
          {yearsOfService}
        </div>
      )}
    </>
  );
}