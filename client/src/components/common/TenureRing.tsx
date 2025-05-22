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
      {/* Perfect circular gradient border with glow effect */}
      <div 
        className={`absolute -inset-1 rounded-full pointer-events-none ${className}`}
        style={{
          background: `conic-gradient(from 0deg, ${style.gradientFrom}, ${style.gradientTo}, white, ${style.gradientTo}, ${style.gradientFrom})`,
          padding: '3px',
          borderRadius: '50%',
          boxShadow: `0 0 20px ${style.shadowColor}, inset 0 0 20px ${style.shadowColor}`,
        }}
      >
        {/* Inner cutout to show avatar */}
        <div 
          className="w-full h-full bg-white"
          style={{ borderRadius: '50%' }}
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