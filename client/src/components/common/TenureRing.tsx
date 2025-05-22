import React from 'react';

interface TenureRingProps {
  yearsOfService: number;
  className?: string;
}

export function TenureRing({ yearsOfService, className = "" }: TenureRingProps) {
  const getTenureStyle = (years: number) => {
    if (years < 1) {
      // Less than 1 year - grey ring with subtle glow
      return {
        ringColor: 'border-gray-400',
        glowClass: 'tenure-glow-gray',
        showNumber: false,
        numberStyle: ''
      };
    } else if (years >= 1 && years < 5) {
      // 1-4 years - silver ring with silver glow
      return {
        ringColor: 'border-gray-300',
        glowClass: 'tenure-glow-silver',
        showNumber: false,
        numberStyle: ''
      };
    } else if (years >= 5 && years < 10) {
      // 5-9 years - golden ring with gold glow
      return {
        ringColor: 'border-yellow-400',
        glowClass: 'tenure-glow-gold',
        showNumber: false,
        numberStyle: ''
      };
    } else {
      // 10+ years - golden ring with intense gold glow and number
      return {
        ringColor: 'border-yellow-400',
        glowClass: 'tenure-glow-gold-intense',
        showNumber: true,
        numberStyle: 'absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg border-2 border-white'
      };
    }
  };

  const style = getTenureStyle(yearsOfService);

  return (
    <>
      {/* Outer glowing ring that extends beyond the avatar */}
      <div 
        className={`absolute -inset-2 rounded-full border-4 ${style.ringColor} ${style.glowClass} pointer-events-none`}
      />
      
      {/* Inner accent ring for extra shine */}
      <div 
        className={`absolute -inset-1 rounded-full border-2 border-white/30 pointer-events-none`}
      />
      
      {/* Years badge for 10+ years */}
      {style.showNumber && (
        <div className={style.numberStyle}>
          {yearsOfService}
        </div>
      )}
    </>
  );
}