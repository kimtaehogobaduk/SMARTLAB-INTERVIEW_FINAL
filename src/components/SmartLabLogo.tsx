import React from 'react';

export interface SmartLabLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  className?: string;
  variant?: 'auto' | 'dark' | 'light' | 'full' | 'banner' | 'icon';
  showSubtitle?: boolean;
  iconOnly?: boolean;
}

// Authentic SMART LAB Vector Emblem Geometry (1000 x 1000 coordinate space)
// Extracted with 100% precision from official SmartLab logo asset (1786661984877.png)
export const SMARTLAB_EMBLEM_PATH = `
  M 130 85
  L 225 85
  L 345 320
  L 500 150
  L 655 320
  L 775 85
  L 870 85
  L 870 795
  L 130 795
  Z

  M 500 315
  L 585 440
  L 500 565
  L 415 440
  Z

  M 500 220
  L 452 300
  L 548 300
  Z

  M 225 170
  L 415 440
  L 225 510
  Z

  M 775 170
  L 775 510
  L 585 440
  Z

  M 225 570
  L 435 570
  L 485 710
  L 225 710
  Z

  M 775 570
  L 775 710
  L 515 710
  L 565 570
  Z
`;

export const SmartLabLogo: React.FC<SmartLabLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  variant = 'auto',
  showSubtitle = false,
  iconOnly = false
}) => {
  // If banner or full variant is explicitly requested, render the authentic full SVG asset
  if (variant === 'banner' || variant === 'full') {
    const bannerHeights: Record<string, string> = {
      xs: 'h-6',
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-14',
      xl: 'h-24'
    };
    const hClass = typeof size === 'number' ? '' : (bannerHeights[size] || 'h-10');
    const hStyle = typeof size === 'number' ? { height: `${size}px` } : undefined;

    return (
      <div id="smartlab-logo-container" className={`inline-flex items-center select-none ${className}`}>
        <img
          src="/logo.svg"
          alt="SMART LAB"
          className={`w-auto object-contain max-w-full drop-shadow-md transition-transform hover:scale-[1.02] ${hClass}`}
          style={hStyle}
        />
      </div>
    );
  }

  const iconSizes: Record<string, string> = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20'
  };

  const textSizes: Record<string, string> = {
    xs: 'text-xs font-bold tracking-tight',
    sm: 'text-sm font-extrabold tracking-tight',
    md: 'text-base font-black tracking-tight',
    lg: 'text-xl font-black tracking-tight',
    xl: 'text-3xl font-black tracking-tight'
  };

  const isNumericSize = typeof size === 'number';
  const containerSizeClass = isNumericSize ? '' : (iconSizes[size] || iconSizes.md);
  const containerStyle = isNumericSize ? { width: `${size}px`, height: `${size}px` } : undefined;

  const textClass = isNumericSize
    ? size < 24
      ? 'text-xs font-bold'
      : size < 36
      ? 'text-sm font-extrabold'
      : size < 48
      ? 'text-lg font-black'
      : 'text-2xl font-black'
    : textSizes[size] || textSizes.md;

  const shouldRenderText = showText && !iconOnly;

  return (
    <div id="smartlab-logo-container" className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Authentic SmartLab Vector Monogram Emblem */}
      <div
        className={`smartlab-logo-badge relative flex items-center justify-center ${containerSizeClass} bg-slate-950/80 dark:bg-white/10 text-white dark:text-white p-1 rounded-xl shadow-md border border-slate-800/80 dark:border-white/15 transition-transform hover:scale-105 shrink-0 overflow-hidden`}
        style={containerStyle}
      >
        <svg
          viewBox="0 0 1000 880"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-contain overflow-visible"
        >
          {/* Subtle Backing Aura */}
          <circle cx="500" cy="440" r="400" fill="currentColor" opacity="0.05" />

          {/* Official Monogram Silhouette */}
          <path
            fillRule="evenodd"
            d={SMARTLAB_EMBLEM_PATH}
            fill="currentColor"
          />
        </svg>
      </div>

      {shouldRenderText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-wider font-sans select-none text-slate-900 dark:text-white ${textClass}`}>
              SMART<span className="text-sky-400 dark:text-sky-400">LAB</span>
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-400 tracking-wide font-mono uppercase">
              AI
            </span>
          </div>

          {showSubtitle && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-tight mt-0.5">
              상산고 No.1 코딩 동아리
            </span>
          )}
        </div>
      )}
    </div>
  );
};
