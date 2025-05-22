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
        ringColor: 'ring-gray-400',
        ringWidth: 'ring-3',
        glowClass: 'tenure-glow-gray',
        showNumber: false,
        numberStyle: ''
      };
    } else if (years === 1) {
      // 1 year - silver ring with silver glow
      return {
        ringColor: 'ring-gray-300',
        ringWidth: 'ring-3',
        glowClass: 'tenure-glow-silver',
        showNumber: false,
        numberStyle: ''
      };
    } else if (years >= 2 && years < 5) {
      // 2-4 years - silver ring with brighter glow
      return {
        ringColor: 'ring-gray-300',
        ringWidth: 'ring-3',
        glowClass: 'tenure-glow-silver',
        showNumber: false,
        numberStyle: ''
      };
    } else if (years >= 5 && years < 10) {
      // 5-9 years - golden ring with gold glow
      return {
        ringColor: 'ring-yellow-400',
        ringWidth: 'ring-4',
        glowClass: 'tenure-glow-gold',
        showNumber: false,
        numberStyle: ''
      };
    } else {
      // 10+ years - golden ring with intense gold glow and number
      return {
        ringColor: 'ring-yellow-400',
        ringWidth: 'ring-4',
        glowClass: 'tenure-glow-gold-intense',
        showNumber: true,
        numberStyle: 'absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg ring-2 ring-white'
      };
    }
  };

  const style = getTenureStyle(yearsOfService);

  return (
    <>
      {/* Main glowing ring that surrounds the avatar like a picture frame */}
      <div 
        className={`absolute -inset-1 rounded-full ${style.ringColor} ${style.ringWidth} ${style.glowClass} pointer-events-none`}
      />
      
      {/* Inner highlight ring for extra shine */}
      <div 
        className={`absolute inset-0 rounded-full ring-1 ring-white/20 pointer-events-none`}
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