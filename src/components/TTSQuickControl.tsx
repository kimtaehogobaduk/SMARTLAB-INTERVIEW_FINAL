import React from 'react';
import { Volume2, VolumeX, Square, Gauge } from 'lucide-react';
import { useTTS } from '../hooks/useTTS';

export const TTSQuickControl: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isSupported, isSpeaking, activeText, stop, settings, setRate, setMuted } = useTTS();

  if (!isSupported) return null;

  const rates = [0.8, 1.0, 1.2, 1.4];
  const nextRate = () => {
    const currentIndex = rates.findIndex(r => Math.abs(r - settings.rate) < 0.05);
    const nextIdx = currentIndex === -1 || currentIndex === rates.length - 1 ? 0 : currentIndex + 1;
    setRate(rates[nextIdx]);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-300 shadow-sm ${className}`}>
      {/* Speaking Indicator & Stop Button */}
      {isSpeaking ? (
        <button
          type="button"
          onClick={stop}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-bold text-[10px] cursor-pointer animate-pulse"
          title={`현재 음성 재생 중: "${activeText?.slice(0, 30)}..." (클릭 시 정지)`}
        >
          <Square className="w-2.5 h-2.5 fill-amber-300" />
          <span>TTS 재생 중</span>
        </button>
      ) : (
        <span className="text-[10px] font-bold text-slate-400 px-1 flex items-center gap-1">
          <Volume2 className="w-3 h-3 text-slate-400" />
          <span>TTS</span>
        </span>
      )}

      {/* Speed Button */}
      <button
        type="button"
        onClick={nextRate}
        className="px-1.5 py-0.5 rounded-md hover:bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700/50 cursor-pointer"
        title="TTS 음성 속도 변경"
      >
        {settings.rate.toFixed(1)}x
      </button>

      {/* Mute Toggle */}
      <button
        type="button"
        onClick={() => setMuted(!settings.muted)}
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          settings.muted
            ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
        }`}
        title={settings.muted ? 'TTS 음소거 해제' : 'TTS 음소거'}
      >
        {settings.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
      </button>
    </div>
  );
};
