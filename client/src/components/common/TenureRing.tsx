
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
        badgeFrom: '#d1d5db',
        badgeTo: '#9ca3af',
      };
    } else if (years >= 1 && years < 5) {
      // 1-4 years - silver
      return {
        borderColor: '#6b7280',
        shadowColor: 'rgba(107, 114, 128, 0.4)',
        badgeFrom: '#e5e7eb',
        badgeTo: '#6b7280',
      };
    } else if (years >= 5 && years < 10) {
      // 5-9 years - golden glow
      return {
        borderColor: '#f59e0b',
        shadowColor: 'rgba(245, 158, 11, 0.6)',
        badgeFrom: '#fef3c7',
        badgeTo: '#f59e0b',
      };
    } else {
      // 10+ years - intense golden glow
      return {
        borderColor: '#d97706',
        shadowColor: 'rgba(217, 119, 6, 0.8)',
        badgeFrom: '#fffbeb',
        badgeTo: '#d97706',
      };
    }
  };

  const showNumber = yearsOfService >= 10;
  const style = getTenureStyle(yearsOfService);

  return (
    <>
      {/* Circular border ring */}
      <div 
        className={`absolute w-[calc(100%+8px)] h-[calc(100%+8px)] -top-1 -left-1 rounded-full pointer-events-none ${className}`}
        style={{
          border: `2px solid ${style.borderColor}`,
          boxShadow: `0 0 10px ${style.shadowColor}`,
        }}
      />
      
      {/* Years badge for 10+ years */}
      {showNumber && (
        <div 
          className="absolute -top-2 -right-2 w-6 h-6 text-white text-xs font-bold flex items-center justify-center border-2 border-white rounded-full shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${style.badgeFrom}, ${style.badgeTo})`,
            boxShadow: `0 0 8px ${style.shadowColor}`,
          }}
        >
          {yearsOfService}
        </div>
      )}
    </>
  );
}
