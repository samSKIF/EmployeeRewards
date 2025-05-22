import React from 'react';

interface TenureRingProps {
  yearsOfService: number;
  className?: string;
}

export function TenureRing({ yearsOfService, className = "" }: TenureRingProps) {
  const getTenureStyle = (years: number) => {
    if (years < 1) {
      // Less than 1 year - grey ring
      return {
        ringColor: 'ring-gray-400',
        ringWidth: 'ring-2',
        showNumber: false,
        numberStyle: ''
      };
    } else if (years === 1) {
      // 1 year - silver ring
      return {
        ringColor: 'ring-gray-300',
        ringWidth: 'ring-2',
        showNumber: false,
        numberStyle: ''
      };
    } else if (years >= 2 && years < 5) {
      // 2-4 years - silver ring
      return {
        ringColor: 'ring-gray-300',
        ringWidth: 'ring-2',
        showNumber: false,
        numberStyle: ''
      };
    } else if (years >= 5 && years < 10) {
      // 5-9 years - golden ring
      return {
        ringColor: 'ring-yellow-400',
        ringWidth: 'ring-3',
        showNumber: false,
        numberStyle: ''
      };
    } else {
      // 10+ years - golden ring with number
      return {
        ringColor: 'ring-yellow-400',
        ringWidth: 'ring-3',
        showNumber: true,
        numberStyle: 'absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center'
      };
    }
  };

  const style = getTenureStyle(yearsOfService);

  return (
    <div className={`relative ${className}`}>
      <div className={`absolute inset-0 rounded-full ${style.ringColor} ${style.ringWidth}`} />
      {style.showNumber && (
        <div className={style.numberStyle}>
          {yearsOfService >= 10 ? Math.floor(yearsOfService) : ''}
        </div>
      )}
    </div>
  );
}