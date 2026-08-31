import React from 'react';
import { useTheme, PALETTE_LIST, PaletteInfo } from '../contexts/ThemeContext';
import { ThemeMode, ThemePalette } from '../types';
import {
  Palette,
  Moon,
  Sun,
  Laptop,
  Check,
  X,
  Sparkles,
  Eye,
  Sliders,
  CheckCircle2,
  Clock,
  Layers,
  Heart
} from 'lucide-react';

export const ThemeSelectorModal: React.FC = () => {
  const {
    mode,
    palette,
    resolvedMode,
    paletteInfo,
    setMode,
    setPalette,
    isThemeModalOpen,
    setIsThemeModalOpen
  } = useTheme();

  if (!isThemeModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-2xl bg-theme-surface border border-theme-main rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-theme-header border-b border-theme-main flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-theme-elevated border border-theme-accent flex items-center justify-center text-theme-accent">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-theme-primary flex items-center gap-2">
                <span>사이트 디자인 & 테마 설정</span>
                <span className="text-xs px-2 py-0.5 rounded-full badge-theme-accent font-semibold">
                  {resolvedMode === 'dark' ? '다크 모드' : '화이트 모드'} • {paletteInfo.name}
                </span>
              </h3>
              <p className="text-xs text-theme-secondary">
                다크/화이트 모드 및 주황, 노랑, 에메랄드, 퍼플 등 다양한 컬러 팔레트를 자유롭게 선택하세요.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsThemeModalOpen(false)}
            className="w-8 h-8 rounded-xl bg-theme-elevated hover:bg-theme-main text-theme-secondary hover:text-theme-primary flex items-center justify-center transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Section 1: Display Mode (Dark / White / System) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-theme-accent" />
              <span>화면 모드 (Dark / White)</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Dark Mode */}
              <button
                type="button"
                onClick={() => setMode('dark')}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center cursor-pointer ${
                  mode === 'dark'
                    ? 'border-theme-accent bg-theme-elevated ring-2 ring-[var(--color-primary)]/20 shadow-md'
                    : 'border-theme-main bg-theme-surface hover:bg-theme-elevated'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-blue-400">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-theme-primary flex items-center justify-center gap-1">
                    <span>다크 모드</span>
                    {mode === 'dark' && <Check className="w-3 h-3 text-theme-accent" />}
                  </div>
                  <span className="text-[11px] text-theme-muted">어두운 배경 • 눈의 피로 최소화</span>
                </div>
              </button>

              {/* White / Light Mode */}
              <button
                type="button"
                onClick={() => setMode('light')}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center cursor-pointer ${
                  mode === 'light'
                    ? 'border-theme-accent bg-theme-elevated ring-2 ring-[var(--color-primary)]/20 shadow-md'
                    : 'border-theme-main bg-theme-surface hover:bg-theme-elevated'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-amber-500">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-theme-primary flex items-center justify-center gap-1">
                    <span>화이트 / 라이트 모드</span>
                    {mode === 'light' && <Check className="w-3 h-3 text-theme-accent" />}
                  </div>
                  <span className="text-[11px] text-theme-muted">밝고 선명한 화이트 배경</span>
                </div>
              </button>

              {/* System Auto Mode */}
              <button
                type="button"
                onClick={() => setMode('system')}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center cursor-pointer ${
                  mode === 'system'
                    ? 'border-theme-accent bg-theme-elevated ring-2 ring-[var(--color-primary)]/20 shadow-md'
                    : 'border-theme-main bg-theme-surface hover:bg-theme-elevated'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-theme-elevated border border-theme-subtle flex items-center justify-center text-theme-secondary">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-theme-primary flex items-center justify-center gap-1">
                    <span>시스템 연동</span>
                    {mode === 'system' && <Check className="w-3 h-3 text-theme-accent" />}
                  </div>
                  <span className="text-[11px] text-theme-muted">기기 설정에 자동 맞춤</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Color Palettes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-theme-accent" />
                <span>컬러 팔레트 테마 (주황, 노랑, 에메랄드, 퍼플 등)</span>
              </label>
              <span className="text-[11px] text-theme-muted">
                현재 선택: <strong className="text-theme-primary">{paletteInfo.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PALETTE_LIST.map((item) => {
                const isSelected = palette === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPalette(item.id)}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-start gap-2.5 text-left cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-theme-accent bg-theme-elevated ring-2 ring-[var(--color-primary)]/30 shadow-md'
                        : 'border-theme-main bg-theme-surface hover:bg-theme-elevated'
                    }`}
                  >
                    {/* Color Swatch Dots */}
                    <div className="flex items-center gap-1.5 w-full">
                      {item.swatches.map((hex, idx) => (
                        <div
                          key={idx}
                          className="w-4 h-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>

                    <div className="w-full">
                      <div className="font-bold text-theme-primary flex items-center justify-between gap-1">
                        <span className="truncate">{item.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-theme-accent shrink-0" />}
                      </div>
                      <p className="text-[10px] text-theme-muted truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>

                    {/* Accent Color Bar at bottom */}
                    <div
                      className="h-1 w-full rounded-full mt-1"
                      style={{ backgroundColor: item.primaryHex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Live Realtime Preview Card */}
          <div className="space-y-2.5 pt-2 border-t border-theme-main">
            <label className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-theme-accent" />
              <span>실시간 UI 미리보기 (Live Preview)</span>
            </label>

            <div className="p-4 bg-theme-app border border-theme-main rounded-2xl space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-theme-elevated border border-theme-accent flex items-center justify-center text-theme-accent font-black text-xs">
                    SL
                  </div>
                  <div>
                    <h4 className="font-bold text-theme-primary text-xs">SmartLab 인터뷰 평가 시스템</h4>
                    <span className="text-[10px] text-theme-secondary">2026 동아리 신규 멤버 선발 면접실</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold badge-theme-accent">
                  {paletteInfo.name} 테마 적용 중
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Sample Candidate Item */}
                <div className="p-3 bg-theme-surface border border-theme-main rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-theme-primary">홍길동 (202610291)</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold badge-theme-accent">
                      AI 트랙
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-theme-secondary">
                    <Clock className="w-3.5 h-3.5 text-theme-accent" />
                    <span>14:00 ~ 14:30 • 5인 심사</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      className="px-2.5 py-1 bg-theme-elevated border border-theme-main rounded-lg text-[10px] font-bold text-theme-secondary"
                    >
                      관전만
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 btn-theme-primary rounded-lg text-[10px] font-bold shadow-xs"
                    >
                      면접실 입장
                    </button>
                  </div>
                </div>

                {/* Sample Score & Evaluation Item */}
                <div className="p-3 bg-theme-surface border border-theme-main rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-theme-primary">1. 기술 직무 역량 (40%)</span>
                    <span className="font-mono font-bold text-theme-accent text-xs">92점</span>
                  </div>
                  <div className="w-full bg-theme-elevated h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: '92%', backgroundColor: paletteInfo.primaryHex }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-theme-muted">
                    <span>가중 절사평균 반영</span>
                    <span className="text-theme-accent font-semibold">합격권 통과</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-theme-header border-t border-theme-main flex items-center justify-between shrink-0">
          <span className="text-[11px] text-theme-muted">
            설정하신 디자인 테마는 브라우저에 안전하게 저장되며 모든 페이지에 즉시 반영됩니다.
          </span>
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(false)}
            className="px-5 py-2 btn-theme-primary rounded-xl font-bold text-xs shadow-md cursor-pointer"
          >
            설정 완료
          </button>
        </div>
      </div>
    </div>
  );
};
