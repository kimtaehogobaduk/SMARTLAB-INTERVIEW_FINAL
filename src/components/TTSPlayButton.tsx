import React from 'react';
import { Volume2, VolumeX, Square } from 'lucide-react';
import { useTTS } from '../hooks/useTTS';

interface TTSPlayButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showLabel?: boolean;
}

export const TTSPlayButton: React.FC<TTSPlayButtonProps> = ({
  text,
  className = '',
  size = 'sm',
  label = '음성 듣기',
  showLabel = false
}) => {
  const { isSupported, isSpeaking, activeText, toggle } = useTTS();

  if (!isSupported) return null;

  const isCurrentPlaying = isSpeaking && activeText === text.trim();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(text);
  };

  const sizeClasses = {
    sm: 'p-1.5 text-[10px] rounded-lg',
    md: 'px-2.5 py-1.5 text-xs rounded-xl',
    lg: 'px-3.5 py-2 text-sm rounded-2xl'
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }[size];

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`inline-flex items-center gap-1.5 font-bold transition-all cursor-pointer border select-none ${sizeClasses} ${
        isCurrentPlaying
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs ring-1 ring-amber-400/30'
          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
      } ${className}`}
      title={isCurrentPlaying ? '음성 재생 중지 (TTS)' : '음성으로 듣기 (TTS)'}
      aria-label={isCurrentPlaying ? '음성 재생 중지' : '음성으로 듣기'}
    >
      {isCurrentPlaying ? (
        <>
          {/* Animated sound wave bars */}
          <div className="flex items-center gap-0.5 h-3 px-0.5">
            <span className="w-0.5 h-2 bg-amber-400 animate-pulse" />
            <span className="w-0.5 h-3 bg-amber-400 animate-ping" />
            <span className="w-0.5 h-1.5 bg-amber-400 animate-pulse" />
          </div>
          <Square className={`${iconSizes} fill-amber-300 text-amber-300`} />
          {showLabel && <span>중지</span>}
        </>
      ) : (
        <>
          <Volume2 className={iconSizes} />
          {showLabel && <span>{label}</span>}
        </>
      )}
    </button>
  );
};
