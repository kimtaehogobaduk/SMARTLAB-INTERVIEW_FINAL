import React, { useState, useEffect } from 'react';
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
  Heart,
  MonitorPlay,
  Power,
  RotateCcw,
  Volume2,
  VolumeX,
  Square,
  Play
} from 'lucide-react';
import { useTTS } from '../hooks/useTTS';

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

  // Screensaver idle minutes state (0 = disabled / off, default = 3)
  const [screensaverMinutes, setScreensaverMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('smartlab_screensaver_idle_minutes');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 3 : parsed;
      }
    } catch {
      // ignore
    }
    return 3;
  });

  const [customInput, setCustomInput] = useState<string>('');
  const [isCustomActive, setIsCustomActive] = useState<boolean>(false);

  const handleUpdateScreensaver = (minutes: number) => {
    const val = Math.max(0, Math.min(120, minutes)); // clamp 0 ~ 120 mins
    setScreensaverMinutes(val);
    try {
      localStorage.setItem('smartlab_screensaver_idle_minutes', String(val));
      window.dispatchEvent(new CustomEvent('smartlab_screensaver_config_changed', { detail: { minutes: val } }));
    } catch {
      // ignore
    }
  };

  // TTS Settings Hook
  const {
    isSupported: isTTSSupported,
    isSpeaking: isTTSSpeaking,
    settings: ttsSettings,
    koreanVoices,
    allVoices,
    speak: ttsSpeak,
    stop: ttsStop,
    setRate: setTTSRate,
    setVoiceUri: setTTSVoiceUri,
    setMuted: setTTSMuted,
    setAutoRead: setTTSAutoRead
  } = useTTS();

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

          {/* Section 4: Screensaver Auto-Play Idle Settings */}
          <div className="space-y-3 pt-2 border-t border-theme-main">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                <MonitorPlay className="w-3.5 h-3.5 text-theme-accent" />
                <span>화면보호기 자동 재생 (유휴 대기 시간)</span>
              </label>
              <span className="text-[11px] font-semibold text-theme-accent">
                {screensaverMinutes === 0 ? '자동 재생 끄기' : `${screensaverMinutes}분 후 자동 실행`}
              </span>
            </div>

            <p className="text-[11px] text-theme-secondary leading-relaxed">
              설정된 시간 동안 마우스나 키보드 조작이 없으면 스마트랩 로봇 시네마틱 오프닝이 화면보호기로 자동 재생됩니다. 
              <span className="font-semibold text-theme-primary ml-1">
                화면 아무 곳이나 터치하거나 클릭하면 즉시 원래 작업 화면으로 복귀합니다.
              </span>
            </p>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {/* Turn Off / Disable */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomActive(false);
                  handleUpdateScreensaver(0);
                }}
                className={`py-2 px-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  screensaverMinutes === 0 && !isCustomActive
                    ? 'border-red-500/80 bg-red-950/30 text-red-400 ring-2 ring-red-500/20 shadow-xs'
                    : 'border-theme-main bg-theme-surface hover:bg-theme-elevated text-theme-secondary'
                }`}
              >
                <Power className="w-3 h-3" />
                <span>끄기</span>
              </button>

              {/* 1 Minute */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomActive(false);
                  handleUpdateScreensaver(1);
                }}
                className={`py-2 px-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  screensaverMinutes === 1 && !isCustomActive
                    ? 'border-theme-accent bg-theme-elevated text-theme-primary ring-2 ring-[var(--color-primary)]/20 shadow-xs'
                    : 'border-theme-main bg-theme-surface hover:bg-theme-elevated text-theme-secondary'
                }`}
              >
                <span>1분</span>
              </button>

              {/* 2 Minutes */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomActive(false);
                  handleUpdateScreensaver(2);
                }}
                className={`py-2 px-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  screensaverMinutes === 2 && !isCustomActive
                    ? 'border-theme-accent bg-theme-elevated text-theme-primary ring-2 ring-[var(--color-primary)]/20 shadow-xs'
                    : 'border-theme-main bg-theme-surface hover:bg-theme-elevated text-theme-secondary'
                }`}
              >
                <span>2분</span>
              </button>

              {/* 3 Minutes (Default) */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomActive(false);
                  handleUpdateScreensaver(3);
                }}
                className={`py-2 px-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                  screensaverMinutes === 3 && !isCustomActive
                    ? 'border-theme-accent bg-theme-elevated text-theme-primary ring-2 ring-[var(--color-primary)]/20 shadow-xs'
                    : 'border-theme-main bg-theme-surface hover:bg-theme-elevated text-theme-secondary'
                }`}
              >
                <span>3분</span>
                <span className="text-[9px] px-1 py-0.2 rounded-full badge-theme-accent font-bold">
                  기본
                </span>
              </button>

              {/* 5 Minutes */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomActive(false);
                  handleUpdateScreensaver(5);
                }}
                className={`py-2 px-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  screensaverMinutes === 5 && !isCustomActive
                    ? 'border-theme-accent bg-theme-elevated text-theme-primary ring-2 ring-[var(--color-primary)]/20 shadow-xs'
                    : 'border-theme-main bg-theme-surface hover:bg-theme-elevated text-theme-secondary'
                }`}
              >
                <span>5분</span>
              </button>

              {/* 10 Minutes */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomActive(false);
                  handleUpdateScreensaver(10);
                }}
                className={`py-2 px-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  screensaverMinutes === 10 && !isCustomActive
                    ? 'border-theme-accent bg-theme-elevated text-theme-primary ring-2 ring-[var(--color-primary)]/20 shadow-xs'
                    : 'border-theme-main bg-theme-surface hover:bg-theme-elevated text-theme-secondary'
                }`}
              >
                <span>10분</span>
              </button>
            </div>

            {/* Custom Minutes Input Option */}
            <div className="pt-1 flex items-center gap-2">
              <span className="text-[11px] text-theme-secondary shrink-0">직접 입력:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="예: 7"
                  value={customInput}
                  onChange={(e) => {
                    setCustomInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const parsed = parseInt(customInput, 10);
                      if (!isNaN(parsed) && parsed >= 0) {
                        setIsCustomActive(true);
                        handleUpdateScreensaver(parsed);
                      }
                    }
                  }}
                  className="w-20 px-2.5 py-1 bg-theme-surface border border-theme-main rounded-lg text-theme-primary text-xs focus:outline-hidden focus:border-theme-accent"
                />
                <span className="text-[11px] text-theme-muted">분</span>
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseInt(customInput, 10);
                    if (!isNaN(parsed) && parsed >= 0) {
                      setIsCustomActive(true);
                      handleUpdateScreensaver(parsed);
                    }
                  }}
                  className="px-2.5 py-1 bg-theme-elevated hover:bg-theme-main border border-theme-main rounded-lg text-[11px] font-bold text-theme-primary cursor-pointer transition-colors"
                >
                  적용
                </button>
              </div>

              {screensaverMinutes !== 3 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomActive(false);
                    setCustomInput('');
                    handleUpdateScreensaver(3);
                  }}
                  className="ml-auto text-[11px] text-theme-muted hover:text-theme-primary flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>기본값(3분)으로 복원</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 5: TTS Speech Synthesis Settings */}
          <div className="space-y-3 pt-3 border-t border-theme-main">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-theme-accent" />
                <span>음성 안내 & 합성 설정 (Text-To-Speech)</span>
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isTTSSupported
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {isTTSSupported ? 'Web Speech 지원됨' : '미지원 환경'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-theme-secondary leading-relaxed">
              면접 질문 대본, 실시간 꼬리질문, 지원자 발화 자막을 자연스러운 한국어 음성으로 읽어줍니다.
            </p>

            {/* Voice and Speed Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Voice Selector */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-theme-primary block">한국어 음성(Voice) 선택</span>
                <select
                  value={ttsSettings.voiceUri || ''}
                  onChange={(e) => setTTSVoiceUri(e.target.value || null)}
                  className="w-full px-2.5 py-1.5 bg-theme-surface border border-theme-main rounded-xl text-xs text-theme-primary focus:outline-hidden focus:border-theme-accent"
                >
                  <option value="">자동 선택 (시스템 최적 한국어 음성)</option>
                  {(koreanVoices.length > 0 ? koreanVoices : allVoices).map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-theme-primary">음성 배속:</span>
                  <span className="text-[10px] font-mono text-theme-accent font-bold">
                    {ttsSettings.rate.toFixed(1)}x
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0.8, 1.0, 1.2, 1.4].map((r) => {
                    const isSelected = Math.abs(ttsSettings.rate - r) < 0.05;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setTTSRate(r)}
                        className={`py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'border-theme-accent bg-theme-elevated text-theme-primary ring-2 ring-[var(--color-primary)]/20'
                            : 'border-theme-main bg-theme-surface hover:bg-theme-elevated text-theme-secondary'
                        }`}
                      >
                        {r.toFixed(1)}x{r === 1.0 ? ' (기본)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Toggles & Test Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-4">
                {/* Auto Read Toggle */}
                <label className="flex items-center gap-1.5 text-xs text-theme-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ttsSettings.autoReadIncomingQuestions}
                    onChange={(e) => setTTSAutoRead(e.target.checked)}
                    className="rounded text-theme-accent focus:ring-theme-accent w-3.5 h-3.5"
                  />
                  <span className={ttsSettings.autoReadIncomingQuestions ? 'font-bold text-theme-primary' : ''}>
                    새 면접 질문 도착 시 음성 자동 읽기
                  </span>
                </label>

                {/* Mute Toggle */}
                <label className="flex items-center gap-1.5 text-xs text-theme-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ttsSettings.muted}
                    onChange={(e) => setTTSMuted(e.target.checked)}
                    className="rounded text-theme-accent focus:ring-theme-accent w-3.5 h-3.5"
                  />
                  <span className={ttsSettings.muted ? 'font-bold text-rose-400' : ''}>
                    전체 TTS 음소거
                  </span>
                </label>
              </div>

              {/* TTS Audio Test Button */}
              <button
                type="button"
                onClick={() => {
                  if (isTTSSpeaking) {
                    ttsStop();
                  } else {
                    ttsSpeak('스마트랩 AI 면접 지원 시스템의 음성 합성 안내 테스트입니다.');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                  isTTSSpeaking
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/30 animate-pulse'
                    : 'bg-theme-elevated hover:bg-theme-main text-theme-primary border-theme-main'
                }`}
              >
                {isTTSSpeaking ? (
                  <>
                    <Square className="w-3 h-3 fill-amber-300" />
                    <span>테스트 중지</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    <span>음성 테스트 듣기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-theme-header border-t border-theme-main flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsThemeModalOpen(false);
                window.dispatchEvent(new CustomEvent('replay_smartlab_intro', { detail: { theme: 'smartlab_robot' } }));
              }}
              className="px-3.5 py-1.5 rounded-xl border border-theme-main bg-theme-surface hover:bg-theme-elevated text-theme-primary text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>스마트랩 로봇 인트로 다시보기</span>
            </button>
            <span className="text-[11px] text-theme-muted hidden sm:inline">
              설정하신 디자인 테마는 브라우저에 자동 저장됩니다.
            </span>
          </div>
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
