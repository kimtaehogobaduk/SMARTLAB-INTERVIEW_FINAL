import React from 'react';

export interface SmartLabLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  className?: string;
  variant?: 'auto' | 'dark' | 'light';
}

export const SmartLabLogo: React.FC<SmartLabLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  variant = 'auto'
}) => {
  const iconSizes: Record<string, string> = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14'
  };

  const textSizes: Record<string, string> = {
    sm: 'text-sm font-bold tracking-tight',
    md: 'text-base font-extrabold tracking-tight',
    lg: 'text-lg font-black tracking-tight',
    xl: 'text-2xl font-black tracking-tight'
  };

  const isNumericSize = typeof size === 'number';
  const containerSizeClass = isNumericSize ? '' : (iconSizes[size] || iconSizes.md);
  const containerStyle = isNumericSize ? { width: `${size}px`, height: `${size}px` } : undefined;

  const textClass = isNumericSize
    ? size < 28
      ? 'text-xs font-bold'
      : size < 38
      ? 'text-base font-extrabold'
      : 'text-xl font-black'
    : textSizes[size] || textSizes.md;

  return (
    <div id="smartlab-logo-container" className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* SVG Icon matching the SmartLab Crown & Interconnected M/W Geometric Logo */}
      <div
        className={`smartlab-logo-badge relative flex items-center justify-center ${containerSizeClass} bg-[#09090b] text-white rounded-lg p-1.5 shadow-sm border border-zinc-700/60 transition-transform hover:scale-105 shrink-0`}
        style={containerStyle}
      >
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
            stroke="#ffffff"
            strokeWidth="9"
            strokeLinejoin="miter"
          />
          {/* Central Peak & Diamond Cross */}
          <path
            d="M26 88L50 36L74 88H26Z"
            fill="#ffffff"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinejoin="miter"
          />
          <path
            d="M50 36L34 58L50 80L66 58L50 36Z"
            fill="#09090b"
          />
          {/* Bottom baseline bar */}
          <line
            x1="8"
            y1="88"
            x2="92"
            y2="88"
            stroke="#ffffff"
            strokeWidth="8"
            strokeLinecap="square"
          />
        </svg>
      </div>

      {showText && (
        <span
          className={`font-black tracking-wider font-mono select-none text-slate-900 dark:text-white ${textClass}`}
        >
          SMART LAB
        </span>
      )}
    </div>
  );
};

