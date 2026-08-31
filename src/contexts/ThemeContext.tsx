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
    name: '스카이 사파이어 블루',
    nameEn: 'Sky Sapphire',
    description: '청명하고 신뢰감 있는 스카이 & 사파이어 블루',
    primaryHex: '#0284c7',
    accentBadgeBg: 'rgba(2, 132, 199, 0.15)',
    accentBadgeText: '#38bdf8',
    lightBgHex: '#f8fafc',
    darkBgHex: '#030712',
    swatches: ['#0284c7', '#38bdf8', '#0369a1', '#030712']
  },
  {
    id: 'orange',
    name: '선셋 웜 주황',
    nameEn: 'Sunset Orange',
    description: '에너지와 활력이 넘치는 따뜻한 웜 오렌지',
    primaryHex: '#f97316',
    accentBadgeBg: 'rgba(249, 115, 22, 0.15)',
    accentBadgeText: '#fb923c',
    lightBgHex: '#faf8f5',
    darkBgHex: '#0c0704',
    swatches: ['#f97316', '#fb923c', '#c2410c', '#0c0704']
  },
  {
    id: 'yellow',
    name: '골든 앰버',
    nameEn: 'Golden Amber',
    description: '고급스럽고 선명한 프리미엄 골드 & 앰버',
    primaryHex: '#d97706',
    accentBadgeBg: 'rgba(217, 119, 6, 0.15)',
    accentBadgeText: '#fbbf24',
    lightBgHex: '#fbf9f4',
    darkBgHex: '#0b0902',
    swatches: ['#d97706', '#fbbf24', '#92400e', '#0b0902']
  },
  {
    id: 'emerald',
    name: '에메랄드 포레스트',
    nameEn: 'Emerald Green',
    description: '차분하고 편안한 포레스트 그린',
    primaryHex: '#059669',
    accentBadgeBg: 'rgba(5, 150, 105, 0.15)',
    accentBadgeText: '#34d399',
    lightBgHex: '#f6f9f7',
    darkBgHex: '#020b06',
    swatches: ['#059669', '#34d399', '#047857', '#020b06']
  },
  {
    id: 'purple',
    name: '소프트 라벤더 / 바이올렛',
    nameEn: 'Soft Lavender',
    description: '부드럽고 감각적인 소프트 라벤더 & 바이올렛',
    primaryHex: '#7c3aed',
    accentBadgeBg: 'rgba(124, 58, 237, 0.15)',
    accentBadgeText: '#a78bfa',
    lightBgHex: '#f9f8fc',
    darkBgHex: '#090412',
    swatches: ['#7c3aed', '#a78bfa', '#5b21b6', '#090412']
  },
  {
    id: 'rose',
    name: '로즈 블러쉬',
    nameEn: 'Rose Blush',
    description: '화사하고 세련된 소프트 로즈 & 크림슨',
    primaryHex: '#e11d48',
    accentBadgeBg: 'rgba(225, 29, 72, 0.15)',
    accentBadgeText: '#fb7185',
    lightBgHex: '#faf7f8',
    darkBgHex: '#0e0307',
    swatches: ['#e11d48', '#fb7185', '#be123c', '#0e0307']
  },
  {
    id: 'cyan',
    name: '청량 시안 아쿠아',
    nameEn: 'Cyan Aqua',
    description: '시원하고 맑은 민트 터콰이즈 & 아쿠아',
    primaryHex: '#0891b2',
    accentBadgeBg: 'rgba(8, 145, 178, 0.15)',
    accentBadgeText: '#22d3ee',
    lightBgHex: '#f6fafb',
    darkBgHex: '#020a0e',
    swatches: ['#0891b2', '#22d3ee', '#0e7490', '#020a0e']
  },
  {
    id: 'zinc',
    name: '모노크롬 징크',
    nameEn: 'Monochrome Zinc',
    description: '군더더기 없는 미니멀 흑백 & 그레이스케일',
    primaryHex: '#71717a',
    accentBadgeBg: 'rgba(113, 113, 122, 0.15)',
    accentBadgeText: '#a1a1aa',
    lightBgHex: '#f4f4f5',
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
