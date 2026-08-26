import React, { useState } from 'react';
import { QuestionPersonaStyle } from '../types';
import {
  Sparkles,
  Zap,
  Target,
  Wrench,
  Layers,
  Users,
  Compass,
  Search,
  RotateCw,
  Plus,
  Tag,
  SlidersHorizontal,
  Flame
} from 'lucide-react';

interface QuestionPersonaSelectorProps {
  selectedPersona: QuestionPersonaStyle;
  onSelectPersona: (persona: QuestionPersonaStyle) => void;
  customFocusKeyword: string;
  onChangeCustomFocus: (text: string) => void;
  onGenerateQuestions: () => void;
  isLoading?: boolean;
}

export const PERSONA_CONFIGS: {
  id: QuestionPersonaStyle;
  label: string;
  shortLabel: string;
  icon: any;
  desc: string;
  badgeColor: string;
  activeColor: string;
}[] = [
  {
    id: 'BALANCED',
    label: '전체 균형 검증',
    shortLabel: '균형형',
    icon: Compass,
    desc: '기술, 문제해결, 소통, 컬처핏을 다채롭게 검증',
    badgeColor: 'text-blue-400 bg-blue-950/40 border-blue-500/30',
    activeColor: 'bg-blue-600 text-white border-blue-400 shadow-blue-600/30'
  },
  {
    id: 'LOGIC_PRESSURE',
    label: '압박 및 논리 검증',
    shortLabel: '압박/논리',
    icon: Target,
    desc: '극단적 예외, 논리적 모순, 한계점을 집요하게 검증',
    badgeColor: 'text-rose-400 bg-rose-950/40 border-rose-500/30',
    activeColor: 'bg-rose-600 text-white border-rose-400 shadow-rose-600/30'
  },
  {
    id: 'TROUBLESHOOTING',
    label: '실무 트러블슈팅',
    shortLabel: '장애 대응',
    icon: Wrench,
    desc: '실제 장애 발생, 병목, 디버깅 경험을 정밀 타격',
    badgeColor: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
    activeColor: 'bg-amber-600 text-white border-amber-400 shadow-amber-600/30'
  },
  {
    id: 'ARCHITECTURE',
    label: '아키텍처 & 트레이드오프',
    shortLabel: '설계/비교',
    icon: Layers,
    desc: '기술 선택 이유, 대안 비교, 시스템 확장성 검증',
    badgeColor: 'text-purple-400 bg-purple-950/40 border-purple-500/30',
    activeColor: 'bg-purple-600 text-white border-purple-400 shadow-purple-600/30'
  },
  {
    id: 'STAR_COLLABORATION',
    label: '협업 & 컬처핏 (STAR)',
    shortLabel: '협업/인성',
    icon: Users,
    desc: '팀 갈등 극복, 동료 설득, 동아리 문화 적합도',
    badgeColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
    activeColor: 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/30'
  },
  {
    id: 'GROWTH_FUNDAMENTALS',
    label: 'CS 기본기 & 성장성',
    shortLabel: '기본기/잠재력',
    icon: Sparkles,
    desc: 'CS 기초 원리(네트워크, DB, OS)와 학습 속도',
    badgeColor: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
    activeColor: 'bg-cyan-600 text-white border-cyan-400 shadow-cyan-600/30'
  }
];

export const QUICK_TAGS = [
  'MSA 분산 트랜잭션',
  '대용량 트래픽 동시성 제어',
  'DB 인덱스 & 슬로우 쿼리',
  '비전공자 극복 과정',
  '코드리뷰 의견 충돌',
  'Next.js 렌더링 최적화',
  'Kafka 메시지 유실 방지',
  'AI 프롬프트 엔지니어링'
];

export const QuestionPersonaSelector: React.FC<QuestionPersonaSelectorProps> = ({
  selectedPersona,
  onSelectPersona,
  customFocusKeyword,
  onChangeCustomFocus,
  onGenerateQuestions,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activePersonaObj = PERSONA_CONFIGS.find(p => p.id === selectedPersona) || PERSONA_CONFIGS[0];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      onGenerateQuestions();
    }
  };

  return (
    <div
      id="question-persona-selector"
      className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-md space-y-3 font-sans"
    >
      {/* Header & Mode Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-200 flex items-center gap-1.5">
              <span>질문 스타일 & 집중 평가 제어판</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[11px] font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>{isExpanded ? '간략히' : '전체 스타일 보기'}</span>
        </button>
      </div>

      {/* Persona Selection Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
        {PERSONA_CONFIGS.map((persona) => {
          const isSelected = selectedPersona === persona.id;
          const Icon = persona.icon;

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => onSelectPersona(persona.id)}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? `${persona.activeColor} shadow-md ring-2 ring-white/20`
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={persona.desc}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span className="text-xs font-bold leading-tight truncate">{persona.shortLabel}</span>
              </div>
              {isExpanded && (
                <span className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                  {persona.desc}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Focus Keyword Input & Generate Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={customFocusKeyword}
            onChange={(e) => onChangeCustomFocus(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="채점하고 싶은 맞춤 주제/키워드 직접 입력 (예: MSA 트랜잭션, 비전공자 극복...)"
            className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <button
          type="button"
          onClick={onGenerateQuestions}
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md ${
            isLoading
              ? 'bg-blue-900/50 text-blue-300 border border-blue-800 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20 active:scale-95'
          }`}
        >
          {isLoading ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>AI 생성 중...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>맞춤 질문 생성 (Enter)</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Keyword Tag Suggestions */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
        <span className="text-slate-500 text-[10px] shrink-0 font-bold">추천 키워드:</span>
        {QUICK_TAGS.map((tag, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onChangeCustomFocus(tag);
            }}
            className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-blue-300 hover:border-blue-500/40 hover:bg-blue-950/30 transition-all text-[11px] shrink-0 cursor-pointer whitespace-nowrap"
          >
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
};
