import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Palette, Moon, Sun } from 'lucide-react';

interface ThemeQuickToggleProps {
  variant?: 'header' | 'floating' | 'button-only';
  className?: string;
}

export const ThemeQuickToggle: React.FC<ThemeQuickToggleProps> = ({
  variant = 'header',
  className = ''
}) => {
  const { resolvedMode, paletteInfo, toggleMode, setIsThemeModalOpen } = useTheme();

  if (variant === 'floating') {
    return (
      <div className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 ${className}`}>
        {/* Quick Dark/White Mode Toggle */}
        <button
          type="button"
          onClick={toggleMode}
          className="w-10 h-10 rounded-2xl bg-theme-surface/90 hover:bg-theme-elevated border border-theme-main shadow-xl backdrop-blur-md flex items-center justify-center text-theme-primary transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title={resolvedMode === 'dark' ? '화이트 모드로 전환' : '다크 모드로 전환'}
        >
          {resolvedMode === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-blue-500" />
          )}
        </button>

        {/* Palette Modal Opener */}
        <button
          type="button"
          onClick={() => setIsThemeModalOpen(true)}
          className="px-3.5 h-10 rounded-2xl bg-theme-surface/90 hover:bg-theme-elevated border border-theme-main shadow-xl backdrop-blur-md flex items-center gap-2 text-theme-primary text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="테마 및 컬러 팔레트 설정"
        >
          <div
            className="w-3.5 h-3.5 rounded-full border border-black/20"
            style={{ backgroundColor: paletteInfo.primaryHex }}
          />
          <Palette className="w-4 h-4 text-theme-accent" />
          <span className="hidden sm:inline">{paletteInfo.name}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 bg-theme-surface/80 border border-theme-main p-1 rounded-2xl backdrop-blur-xs ${className}`}>
      {/* 1-Click Dark/White Mode Toggle */}
      <button
        type="button"
        onClick={toggleMode}
        className="p-1.5 rounded-xl hover:bg-theme-elevated text-theme-secondary hover:text-theme-primary transition-all cursor-pointer"
        title={resolvedMode === 'dark' ? '화이트(라이트) 모드로 전환' : '다크 모드로 전환'}
      >
        {resolvedMode === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-blue-500" />
        )}
      </button>

      {/* Palette Selector Button with Active Swatch */}
      <button
        type="button"
        onClick={() => setIsThemeModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-theme-elevated hover:bg-theme-main text-theme-primary text-xs font-bold transition-all cursor-pointer"
        title="디자인 테마 및 컬러 팔레트 변경"
      >
        <div
          className="w-2.5 h-2.5 rounded-full shadow-2xs"
          style={{ backgroundColor: paletteInfo.primaryHex }}
        />
        <Palette className="w-3.5 h-3.5 text-theme-accent" />
        <span className="text-[11px] font-medium hidden md:inline">{paletteInfo.name}</span>
      </button>
    </div>
  );
};
