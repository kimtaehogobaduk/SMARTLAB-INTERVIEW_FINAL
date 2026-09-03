import React from 'react';
import { Mic, MicOff, AlertCircle, Volume2 } from 'lucide-react';
import { STTStatus } from '../lib/stt';

interface STTAudioMeterProps {
  status: STTStatus;
  audioLevel: number;
  isListening: boolean;
  lang?: string;
  className?: string;
}

export const STTAudioMeter: React.FC<STTAudioMeterProps> = ({
  status,
  audioLevel,
  isListening,
  lang = 'ko-KR',
  className = ''
}) => {
  // Compute height multiplier based on audioLevel (0-100)
  const barHeights = [
    Math.max(15, Math.min(100, audioLevel * 0.7 + (isListening ? 10 : 0))),
    Math.max(20, Math.min(100, audioLevel * 1.1 + (isListening ? 15 : 0))),
    Math.max(25, Math.min(100, audioLevel * 1.3 + (isListening ? 20 : 0))),
    Math.max(20, Math.min(100, audioLevel * 0.9 + (isListening ? 15 : 0))),
    Math.max(15, Math.min(100, audioLevel * 0.6 + (isListening ? 10 : 0))),
  ];

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Live Equalizer Bars */}
      {isListening ? (
        <div className="flex items-center gap-0.5 h-4 px-1.5 py-0.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg shadow-xs">
          {barHeights.map((h, idx) => (
            <span
              key={idx}
              style={{ height: `${h}%` }}
              className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-0.5 h-4 px-1.5 py-0.5 bg-slate-800/80 border border-slate-700 rounded-lg">
          <span className="w-1 h-1 bg-slate-500 rounded-full" />
          <span className="w-1 h-1 bg-slate-500 rounded-full" />
          <span className="w-1 h-1 bg-slate-500 rounded-full" />
        </div>
      )}

      {/* Status Badge */}
      {status === 'listening' && (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>실시간 인식 중 ({audioLevel}%)</span>
        </span>
      )}

      {status === 'starting' && (
        <span className="text-[11px] font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30">
          마이크 연결 중...
        </span>
      )}

      {status === 'permission-denied' && (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-500/30">
          <AlertCircle className="w-3 h-3" />
          <span>마이크 권한 거부됨</span>
        </span>
      )}

      {status === 'unsupported' && (
        <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
          Web Speech 미지원 환경
        </span>
      )}

      {status === 'idle' && (
        <span className="text-[11px] font-medium text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-800">
          마이크 대기
        </span>
      )}
    </div>
  );
};
