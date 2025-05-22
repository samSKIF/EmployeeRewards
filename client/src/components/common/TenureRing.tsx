import React from 'react';

interface TenureRingProps {
  yearsOfService: number;
  className?: string;
}

export function TenureRing({ yearsOfService, className = "" }: TenureRingProps) {
  const getTenureStyle = (years: number) => {
    if (years < 1) {
      // Less than 1 year - subtle grey gradient border
      return {
        borderStyle: 'from-gray-300 to-gray-500',
        showNumber: false,
        numberStyle: ''
      };
    } else if (years >= 1 && years < 5) {
      // 1-4 years - silver gradient border
      return {
        borderStyle: 'from-gray-300 to-gray-600',
        showNumber: false,
        numberStyle: ''
      };
    } else if (years >= 5 && years < 10) {
      // 5-9 years - golden gradient border
      return {
        borderStyle: 'from-yellow-300 to-yellow-600',
        showNumber: false,
        numberStyle: ''
      };
    } else {
      // 10+ years - intense golden gradient border with number
      return {
        borderStyle: 'from-yellow-400 to-amber-600',
        showNumber: true,
        numberStyle: 'absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white'
      };
    }
  };

  const style = getTenureStyle(yearsOfService);

  return (
    <>
      {/* Clean border ring that perfectly frames the avatar */}
      <div 
        className={`absolute inset-0 rounded-full border-4 bg-gradient-to-br ${style.borderStyle} pointer-events-none`}
        style={{
          padding: '2px',
        }}
      >
        {/* Inner cutout to show the avatar */}
        <div className="w-full h-full rounded-full bg-white" />
      </div>
      
      {/* Years badge for 10+ years */}
      {style.showNumber && (
        <div className={style.numberStyle}>
          {yearsOfService}
        </div>
      )}
    </>
  );
}