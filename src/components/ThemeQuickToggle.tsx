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

  // Floating tab removed as per user request (플로팅 탭 삭제)
  if (variant === 'floating') {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 bg-theme-surface/80 border border-theme-main p-1 rounded-2xl backdrop-blur-xs shadow-xs ${className}`}>
      {/* 1-Click Dark/White Mode Toggle (Icon Button) */}
      <button
        type="button"
        onClick={toggleMode}
        className="w-8 h-8 rounded-xl hover:bg-theme-elevated flex items-center justify-center text-theme-secondary hover:text-theme-primary transition-all cursor-pointer"
        title={resolvedMode === 'dark' ? '화이트(라이트) 모드로 전환' : '다크 모드로 전환'}
        aria-label="화면 모드 전환"
      >
        {resolvedMode === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-blue-500" />
        )}
      </button>

      {/* Palette & Theme Settings Button (Icon-Only Button) */}
      <button
        type="button"
        onClick={() => setIsThemeModalOpen(true)}
        className="w-8 h-8 rounded-xl bg-theme-elevated hover:bg-theme-main text-theme-primary flex items-center justify-center transition-all cursor-pointer relative"
        title={`디자인 테마 및 컬러 팔레트 설정 (현재: ${paletteInfo.name})`}
        aria-label="디자인 설정"
      >
        <Palette className="w-4 h-4 text-theme-accent" />
        <span
          className="w-2 h-2 rounded-full absolute bottom-1 right-1 border border-theme-surface shadow-2xs"
          style={{ backgroundColor: paletteInfo.primaryHex }}
        />
      </button>
    </div>
  );
};
