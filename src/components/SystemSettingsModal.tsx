import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  MonitorPlay,
  Sparkles,
  Power,
  RotateCcw,
  Square,
  Play,
  Sliders,
  Palette,
  Check,
  ChevronRight,
  Info,
  Film
} from 'lucide-react';
import { useTTS } from '../hooks/useTTS';

export const SystemSettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    setIsThemeModalOpen,
    paletteInfo
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
    setPitch: setTTSPitch,
    setVolume: setTTSVolume,
    setVoiceUri: setTTSVoiceUri,
    setMuted: setTTSMuted,
    setAutoRead: setTTSAutoRead
  } = useTTS();



  if (!isSettingsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-2xl bg-theme-surface border border-theme-main rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-theme-header border-b border-theme-main flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-theme-primary flex items-center gap-2">
                <span>시스템 환경설정</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold border border-blue-500/30">
                  System Settings
                </span>
              </h3>
              <p className="text-xs text-theme-secondary">
                음성 안내(TTS), 유휴 화면보호기, 시네마틱 오프닝 등 시스템 동작 환경을 관리합니다.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="w-8 h-8 rounded-xl bg-theme-elevated hover:bg-theme-main text-theme-secondary hover:text-theme-primary flex items-center justify-center transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Section 1: TTS Speech Synthesis Settings */}
          <div className="space-y-3.5 bg-theme-surface border border-theme-main p-4.5 rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>음성 안내 & 합성 설정 (Text-To-Speech)</span>
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isTTSSupported
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isTTSSupported ? 'Web Speech 지원됨' : '미지원 환경'}
              </span>
            </div>

            <p className="text-[11px] text-theme-secondary leading-relaxed">
              면접 질문 대본, 실시간 꼬리질문, 지원자 발화 자막을 자연스러운 한국어 음성으로 실시간 변환하여 읽어줍니다.
            </p>

            {/* Voice and Speed Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Voice Selector */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-theme-primary block">한국어 음성(Voice) 선택</span>
                <select
                  value={ttsSettings.voiceUri || ''}
                  onChange={(e) => setTTSVoiceUri(e.target.value || null)}
                  className="w-full px-2.5 py-2 bg-theme-app border border-theme-main rounded-xl text-xs text-theme-primary focus:outline-hidden focus:border-theme-accent"
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
                  <span className="text-[11px] font-bold text-theme-primary">음성 배속(Speed):</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
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
                            ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-theme-main bg-theme-app hover:bg-theme-elevated text-theme-secondary'
                        }`}
                      >
                        {r.toFixed(1)}x{r === 1.0 ? ' (기본)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pitch & Volume Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 border-t border-theme-main/60">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-theme-secondary font-medium">음높이(Pitch):</span>
                  <span className="font-mono text-theme-primary font-bold">{ttsSettings.pitch.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.4"
                  step="0.1"
                  value={ttsSettings.pitch}
                  onChange={(e) => setTTSPitch(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-theme-secondary font-medium">음량(Volume):</span>
                  <span className="font-mono text-theme-primary font-bold">{Math.round(ttsSettings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ttsSettings.volume}
                  onChange={(e) => setTTSVolume(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Toggles & Test Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-theme-main/60">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Auto Read Toggle */}
                <label className="flex items-center gap-2 text-xs text-theme-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ttsSettings.autoReadIncomingQuestions}
                    onChange={(e) => setTTSAutoRead(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className={ttsSettings.autoReadIncomingQuestions ? 'font-bold text-theme-primary' : ''}>
                    새 면접 질문 도착 시 자동 낭독
                  </span>
                </label>

                {/* Mute Toggle */}
                <label className="flex items-center gap-2 text-xs text-theme-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ttsSettings.muted}
                    onChange={(e) => setTTSMuted(e.target.checked)}
                    className="rounded text-rose-500 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
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
                    : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40'
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

          {/* Section 2: Screensaver Auto-Play Idle Settings */}
          <div className="space-y-3.5 bg-theme-surface border border-theme-main p-4.5 rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                <MonitorPlay className="w-4 h-4 text-sky-400" />
                <span>화면보호기 자동 재생 (유휴 대기 시간 설정)</span>
              </label>
              <span className="text-[11px] font-semibold text-sky-400 font-mono">
                {screensaverMinutes === 0 ? '자동 재생 끄기' : `${screensaverMinutes}분 미조작 시 실행`}
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
                    ? 'border-rose-500/80 bg-rose-950/30 text-rose-400 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-theme-main bg-theme-app hover:bg-theme-elevated text-theme-secondary'
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
                    ? 'border-sky-500 bg-sky-950/40 text-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-theme-main bg-theme-app hover:bg-theme-elevated text-theme-secondary'
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
                    ? 'border-sky-500 bg-sky-950/40 text-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-theme-main bg-theme-app hover:bg-theme-elevated text-theme-secondary'
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
                    ? 'border-sky-500 bg-sky-950/40 text-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-theme-main bg-theme-app hover:bg-theme-elevated text-theme-secondary'
                }`}
              >
                <span>3분</span>
                <span className="text-[9px] px-1 py-0.2 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
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
                    ? 'border-sky-500 bg-sky-950/40 text-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-theme-main bg-theme-app hover:bg-theme-elevated text-theme-secondary'
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
                    ? 'border-sky-500 bg-sky-950/40 text-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-theme-main bg-theme-app hover:bg-theme-elevated text-theme-secondary'
                }`}
              >
                <span>10분</span>
              </button>
            </div>

            {/* Custom Minutes Input Option */}
            <div className="pt-1 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-theme-secondary shrink-0">직접 시간 입력:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="예: 7"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const parsed = parseInt(customInput, 10);
                      if (!isNaN(parsed) && parsed >= 0) {
                        setIsCustomActive(true);
                        handleUpdateScreensaver(parsed);
                      }
                    }
                  }}
                  className="w-20 px-2.5 py-1 bg-theme-app border border-theme-main rounded-lg text-theme-primary text-xs focus:outline-hidden focus:border-sky-500"
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

          {/* Section 3: Cinematic Opening & Video Presentation */}
          <div className="space-y-3.5 bg-theme-surface border border-theme-main p-4.5 rounded-2xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>시네마틱 오프닝 (Intro Experience)</span>
              </label>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Film className="w-3 h-3" />
                <span>스마트랩 MP4 비디오 활성화됨</span>
              </span>
            </div>

            <p className="text-[11px] text-theme-secondary leading-relaxed">
              상산고 스마트랩 로봇 인트로 영상이 기본 탑재되어 있으며, 우측 하단 로고 마스킹이 정밀하게 적용됩니다. 아래 버튼을 눌러 언제든 오프닝 연출을 다시 감상하실 수 있습니다.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsModalOpen(false);
                  window.dispatchEvent(new CustomEvent('replay_smartlab_intro', { detail: { theme: 'smartlab_robot' } }));
                }}
                className="px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-950/25 hover:bg-amber-950/50 text-amber-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>스마트랩 로봇 인트로 즉시 재생</span>
              </button>
            </div>
          </div>

          {/* Section 4: Link to Design & Theme Settings */}
          <div className="p-4 bg-theme-app border border-theme-main rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs shrink-0"
                style={{ backgroundColor: paletteInfo.primaryHex }}
              >
                <Palette className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-theme-primary block text-xs">사이트 디자인 & 컬러 테마 설정</span>
                <span className="text-[11px] text-theme-muted">
                  다크/화이트 모드 및 8종 컬러 팔레트({paletteInfo.name})는 전용 디자인 창에서 변경하세요.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSettingsModalOpen(false);
                setIsThemeModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-theme-elevated hover:bg-theme-main border border-theme-main rounded-xl text-xs font-bold text-theme-primary flex items-center gap-1 cursor-pointer transition-colors shrink-0"
            >
              <span>디자인 설정 열기</span>
              <ChevronRight className="w-3.5 h-3.5 text-theme-secondary" />
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-theme-header border-t border-theme-main flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-theme-muted flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>설정한 시스템 환경은 브라우저 로컬 저장소에 영구 보존됩니다.</span>
          </span>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(false)}
            className="px-5 py-2 btn-theme-primary rounded-xl font-bold text-xs shadow-md cursor-pointer"
          >
            설정 완료
          </button>
        </div>
      </div>
    </div>
  );
};
