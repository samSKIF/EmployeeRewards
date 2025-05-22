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
        borderColor: '#9ca3af',
        shadowColor: 'rgba(156, 163, 175, 0.3)',
        gradientFrom: '#d1d5db',
        gradientTo: '#9ca3af',
      };
    } else if (years >= 1 && years < 5) {
      // 1-4 years - silver
      return {
        borderColor: '#6b7280',
        shadowColor: 'rgba(107, 114, 128, 0.4)',
        gradientFrom: '#e5e7eb',
        gradientTo: '#6b7280',
      };
    } else if (years >= 5 && years < 10) {
      // 5-9 years - golden glow
      return {
        borderColor: '#f59e0b',
        shadowColor: 'rgba(245, 158, 11, 0.6)',
        gradientFrom: '#fef3c7',
        gradientTo: '#f59e0b',
      };
    } else {
      // 10+ years - intense golden glow
      return {
        borderColor: '#d97706',
        shadowColor: 'rgba(217, 119, 6, 0.8)',
        gradientFrom: '#fffbeb',
        gradientTo: '#d97706',
      };
    }
  };

  const showNumber = yearsOfService >= 10;
  const style = getTenureStyle(yearsOfService);

  return (
    <>
      {/* Perfect circular border ring */}
      <div 
        className={`absolute -inset-1 rounded-full pointer-events-none ${className}`}
        style={{
          border: `3px solid ${style.borderColor}`,
          borderRadius: '50%',
          boxShadow: `0 0 15px ${style.shadowColor}, 0 0 25px ${style.shadowColor}`,
        }}
      />
      
      {/* Years badge for 10+ years */}
      {showNumber && (
        <div 
          className="absolute -top-2 -right-2 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-lg rounded-full"
          style={{
            background: `linear-gradient(135deg, ${style.gradientFrom}, ${style.gradientTo})`,
            width: '24px',
            height: '24px',
            boxShadow: `0 0 10px ${style.shadowColor}`,
          }}
        >
          {yearsOfService}
        </div>
      )}
    </>
  );
}