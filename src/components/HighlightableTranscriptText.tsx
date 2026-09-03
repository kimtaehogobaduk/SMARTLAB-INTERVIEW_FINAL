import React, { useMemo } from 'react';
import { parseTranscriptTokens, extractKeyEntities, HighlightToken } from '../lib/sttAnalysis';
import { TrendingUp, Code, CheckCircle2, Quote } from 'lucide-react';

interface HighlightableTranscriptTextProps {
  text: string;
  searchQuery?: string;
  showEntityPills?: boolean;
  highlightEntities?: boolean;
  className?: string;
}

export const HighlightableTranscriptText: React.FC<HighlightableTranscriptTextProps> = ({
  text,
  searchQuery = '',
  showEntityPills = true,
  highlightEntities = true,
  className = 'text-xs leading-relaxed'
}) => {
  const tokens = useMemo(() => {
    if (!highlightEntities && !searchQuery.trim()) {
      return [{ text, type: 'text' as const }];
    }
    return parseTranscriptTokens(text, searchQuery);
  }, [text, searchQuery, highlightEntities]);

  const entities = useMemo(() => {
    if (!showEntityPills) return [];
    return extractKeyEntities(text);
  }, [text, showEntityPills]);

  return (
    <div className="space-y-1.5">
      <p className={`${className} break-words whitespace-pre-wrap`}>
        {tokens.map((token, index) => {
          if (token.type === 'search_match') {
            return (
              <mark
                key={index}
                className="bg-amber-400 text-slate-950 font-bold px-1 py-0.5 rounded-sm shadow-xs"
              >
                {token.text}
              </mark>
            );
          }

          if (token.type === 'metric') {
            return (
              <span
                key={index}
                className="inline-flex items-center text-emerald-300 font-semibold bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/60"
                title="수치/성과 지표"
              >
                {token.text}
              </span>
            );
          }

          if (token.type === 'tech_entity') {
            return (
              <span
                key={index}
                className="inline-flex items-center text-sky-300 font-medium bg-sky-950/60 px-1 py-0.2 rounded border border-sky-800/50"
                title="기술/프레임워크 엔티티"
              >
                {token.text}
              </span>
            );
          }

          if (token.type === 'action_marker') {
            return (
              <span
                key={index}
                className="inline-flex items-center text-rose-300 font-medium bg-rose-950/50 px-1 py-0.2 rounded border border-rose-800/50"
                title="문제해결 / 핵심 액션 마커"
              >
                {token.text}
              </span>
            );
          }

          if (token.type === 'quote') {
            return (
              <span
                key={index}
                className="text-violet-300 italic font-medium bg-violet-950/40 px-0.5 rounded"
              >
                {token.text}
              </span>
            );
          }

          return <span key={index}>{token.text}</span>;
        })}
      </p>

      {/* Extracted Key Entity Pills */}
      {showEntityPills && entities.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {entities.map((ent, idx) => {
            if (ent.type === 'metric') {
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-800/70 px-1.5 py-0.5 rounded-md"
                >
                  <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{ent.label}</span>
                </span>
              );
            }
            if (ent.type === 'tech') {
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-300 bg-sky-950/70 border border-sky-800/70 px-1.5 py-0.5 rounded-md"
                >
                  <Code className="w-2.5 h-2.5 text-sky-400" />
                  <span>{ent.label}</span>
                </span>
              );
            }
            if (ent.type === 'action') {
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-300 bg-rose-950/70 border border-rose-800/70 px-1.5 py-0.5 rounded-md"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-rose-400" />
                  <span>{ent.label}</span>
                </span>
              );
            }
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[10px] text-violet-300 bg-violet-950/70 border border-violet-800/70 px-1.5 py-0.5 rounded-md"
              >
                <Quote className="w-2.5 h-2.5 text-violet-400" />
                <span>{ent.label}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
