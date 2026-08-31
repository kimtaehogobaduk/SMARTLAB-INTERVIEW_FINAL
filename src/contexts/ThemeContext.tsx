import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeMode, ThemePalette, ThemeConfig } from '../types';

export interface PaletteInfo {
  id: ThemePalette;
  name: string;
  nameEn: string;
  description: string;
  primaryHex: string;
  accentBadgeBg: string;
  accentBadgeText: string;
  lightBgHex: string;
  darkBgHex: string;
  swatches: string[];
}

export const PALETTE_LIST: PaletteInfo[] = [
  {
    id: 'blue',
    name: '오션 블루',
    nameEn: 'Ocean Blue',
    description: '신뢰감 있는 클래식 딥 블루 & 사파이어',
    primaryHex: '#3b82f6',
    accentBadgeBg: 'rgba(59, 130, 246, 0.15)',
    accentBadgeText: '#60a5fa',
    lightBgHex: '#f8fafc',
    darkBgHex: '#020617',
    swatches: ['#3b82f6', '#60a5fa', '#1d4ed8', '#020617']
  },
  {
    id: 'orange',
    name: '선셋 주황',
    nameEn: 'Sunset Orange',
    description: '에너지와 활력이 넘치는 따뜻한 오렌지',
    primaryHex: '#f97316',
    accentBadgeBg: 'rgba(249, 115, 22, 0.15)',
    accentBadgeText: '#fb923c',
    lightBgHex: '#fffaf5',
    darkBgHex: '#140a05',
    swatches: ['#f97316', '#fb923c', '#c2410c', '#140a05']
  },
  {
    id: 'yellow',
    name: '골든 옐로우 / 앰버',
    nameEn: 'Golden Amber',
    description: '밝고 선명한 프리미엄 골드 & 옐로우',
    primaryHex: '#eab308',
    accentBadgeBg: 'rgba(234, 179, 8, 0.15)',
    accentBadgeText: '#facc15',
    lightBgHex: '#fefce8',
    darkBgHex: '#161304',
    swatches: ['#eab308', '#facc15', '#a16207', '#161304']
  },
  {
    id: 'emerald',
    name: '에메랄드 포레스트',
    nameEn: 'Emerald Green',
    description: '차분하고 집중도 높은 자연의 그린',
    primaryHex: '#10b981',
    accentBadgeBg: 'rgba(16, 185, 129, 0.15)',
    accentBadgeText: '#34d399',
    lightBgHex: '#f0fdf4',
    darkBgHex: '#04140b',
    swatches: ['#10b981', '#34d399', '#047857', '#04140b']
  },
  {
    id: 'purple',
    name: '로열 퍼플 / 바이올렛',
    nameEn: 'Royal Purple',
    description: '신비롭고 세련된 딥 바이올렛 & 라벤더',
    primaryHex: '#8b5cf6',
    accentBadgeBg: 'rgba(139, 92, 246, 0.15)',
    accentBadgeText: '#a78bfa',
    lightBgHex: '#faf5ff',
    darkBgHex: '#0e071c',
    swatches: ['#8b5cf6', '#a78bfa', '#6d28d9', '#0e071c']
  },
  {
    id: 'rose',
    name: '로즈 마젠타',
    nameEn: 'Rose Crimson',
    description: '화사하고 감각적인 로즈 & 루비 핑크',
    primaryHex: '#f43f5e',
    accentBadgeBg: 'rgba(244, 63, 94, 0.15)',
    accentBadgeText: '#fb7185',
    lightBgHex: '#fff1f2',
    darkBgHex: '#18060c',
    swatches: ['#f43f5e', '#fb7185', '#be123c', '#18060c']
  },
  {
    id: 'cyan',
    name: '시안 아쿠아',
    nameEn: 'Cyan Aqua',
    description: '청량하고 시원한 아쿠아 & 민트 터콰이즈',
    primaryHex: '#06b6d4',
    accentBadgeBg: 'rgba(6, 182, 212, 0.15)',
    accentBadgeText: '#22d3ee',
    lightBgHex: '#ecfeff',
    darkBgHex: '#03141a',
    swatches: ['#06b6d4', '#22d3ee', '#0e7490', '#03141a']
  },
  {
    id: 'zinc',
    name: '모노크롬 징크',
    nameEn: 'Monochrome Zinc',
    description: '군더더기 없는 미니멀 흑백 & 그레이스케일',
    primaryHex: '#71717a',
    accentBadgeBg: 'rgba(113, 113, 122, 0.15)',
    accentBadgeText: '#a1a1aa',
    lightBgHex: '#fafafa',
    darkBgHex: '#09090b',
    swatches: ['#71717a', '#a1a1aa', '#3f3f46', '#09090b']
  }
];

interface ThemeContextType {
  mode: ThemeMode;
  palette: ThemePalette;
  resolvedMode: 'dark' | 'light';
  paletteInfo: PaletteInfo;
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: ThemePalette) => void;
  toggleMode: () => void;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_MODE_KEY = 'smartlab_theme_mode';
const STORAGE_PALETTE_KEY = 'smartlab_theme_palette';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MODE_KEY) as ThemeMode;
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'dark'; // Default to sleek dark
  });

  const [palette, setPaletteState] = useState<ThemePalette>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PALETTE_KEY) as ThemePalette;
      if (saved && PALETTE_LIST.some((p) => p.id === saved)) {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'blue'; // Default to Ocean Blue
  });

  const [resolvedMode, setResolvedMode] = useState<'dark' | 'light'>('dark');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Compute resolved mode based on system preference if mode === 'system'
  useEffect(() => {
    const updateResolved = () => {
      if (mode === 'system') {
        const isSystemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedMode(isSystemDark ? 'dark' : 'light');
      } else {
        setResolvedMode(mode);
      }
    };

    updateResolved();

    if (mode === 'system' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => updateResolved();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [mode]);

  // Apply data-theme and data-palette to html and body, and class="dark"
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.setAttribute('data-theme', resolvedMode);
    root.setAttribute('data-palette', palette);
    body.setAttribute('data-theme', resolvedMode);
    body.setAttribute('data-palette', palette);

    if (resolvedMode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [resolvedMode, palette]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_MODE_KEY, newMode);
    } catch {
      // Ignore
    }
  };

  const setPalette = (newPalette: ThemePalette) => {
    setPaletteState(newPalette);
    try {
      localStorage.setItem(STORAGE_PALETTE_KEY, newPalette);
    } catch {
      // Ignore
    }
  };

  const toggleMode = () => {
    const nextMode = resolvedMode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
  };

  const paletteInfo = PALETTE_LIST.find((p) => p.id === palette) || PALETTE_LIST[0];

  return (
    <ThemeContext.Provider
      value={{
        mode,
        palette,
        resolvedMode,
        paletteInfo,
        setMode,
        setPalette,
        toggleMode,
        isThemeModalOpen,
        setIsThemeModalOpen
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
