import React from 'react';

interface SmartLabLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const SmartLabLogo: React.FC<SmartLabLogoProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14'
  };

  const textSizes = {
    sm: 'text-sm font-bold tracking-tight',
    md: 'text-base font-extrabold tracking-tight',
    lg: 'text-lg font-black tracking-tight',
    xl: 'text-2xl font-black tracking-tight'
  };

  return (
    <div id="smartlab-logo-container" className={`flex items-center gap-2.5 ${className}`}>
      {/* SVG Icon matching the SmartLab Crown & Interconnected M/W Geometric Logo */}
      <div className={`relative flex items-center justify-center ${iconSizes[size]} bg-zinc-950 text-white rounded-lg p-1.5 shadow-sm transition-transform hover:scale-105`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-white"
        >
          {/* Outer Crown/M shape */}
          <path
            d="M10 88V12L50 56L90 12V88H10Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="9"
            strokeLinejoin="miter"
          />
          {/* Central Peak & Diamond Cross */}
          <path
            d="M26 88L50 36L74 88H26Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="miter"
          />
          <path
            d="M50 36L34 58L50 80L66 58L50 36Z"
            fill="#09090b"
          />
          {/* Bottom baseline bar */}
          <line x1="8" y1="88" x2="92" y2="88" stroke="currentColor" strokeWidth="8" strokeLinecap="square" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-black text-zinc-900 tracking-wider font-mono ${textSizes[size]}`}>
            SMART LAB
          </span>
          <span className="text-[10px] font-semibold text-zinc-700 tracking-widest uppercase">
            AI Interview Platform
          </span>
        </div>
      )}
    </div>
  );
};
