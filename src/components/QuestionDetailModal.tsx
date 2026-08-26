import React, { useState } from 'react';
import { TailQuestion, EvaluationCriterion } from '../types';
import {
  X,
  Sparkles,
  Target,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
  Send,
  Bookmark,
  Share2,
  ArrowRight,
  Sliders,
  Award,
  Flame,
  ShieldCheck,
  MessageSquareQuote,
  Lightbulb
} from 'lucide-react';
import { COLOR_MAP } from '../lib/scoring';

interface QuestionDetailModalProps {
  question: TailQuestion | null;
  onClose: () => void;
  onShareToChat?: (question: TailQuestion) => void;
  onToggleBookmark?: (questionId: string) => void;
  onMarkUsed?: (questionId: string) => void;
  criteria?: EvaluationCriterion[];
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  question,
  onClose,
  onShareToChat,
  onToggleBookmark,
  onMarkUsed,
  criteria = []
}) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  if (!question) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(question.question);
    setCopied(true);
    if (onMarkUsed) onMarkUsed(question.id);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (onShareToChat) {
      onShareToChat(question);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  };

  // Resolve evaluated criteria details
  const details = question.evaluatedCriteriaDetails || [];
  const evaluatedIds = question.evaluatedCriteria || [];

  // Difficulty badge colors
  const difficultyBadge = {
    BASIC: { label: '초급 / 기본기', bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' },
    INTERMEDIATE: { label: '중급 / 실무 적용', bg: 'bg-blue-950/60 text-blue-300 border-blue-500/30' },
    ADVANCED: { label: '고급 / 심층 설계', bg: 'bg-purple-950/60 text-purple-300 border-purple-500/30' },
    HARD: { label: '하드 / 극단적 예외', bg: 'bg-rose-950/60 text-rose-300 border-rose-500/30' }
  }[question.difficulty || 'ADVANCED'] || { label: '심층 검증', bg: 'bg-slate-800 text-slate-300 border-slate-700' };

  return (
    <div
      id="question-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 relative z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-blue-400">
                  {question.categoryLabel || question.category || '심층 기술 질문'}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${difficultyBadge.bg}`}>
                  {difficultyBadge.label}
                </span>
                {question.matchScore && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/30">
                    발언 적합도 {question.matchScore}%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">실시간 AI 검증 가이드 및 세부 채점 지표</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleBookmark && (
              <button
                type="button"
                onClick={() => onToggleBookmark(question.id)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  question.isBookmarked
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="질문 북마크"
              >
                <Bookmark className={`w-4 h-4 ${question.isBookmarked ? 'fill-amber-400' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm font-sans">
          
          {/* 1. The Interview Question (Highlight Card) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-indigo-950/30 border border-blue-500/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <MessageSquareQuote className="w-3.5 h-3.5" />
                <span>면접관 실전 구어체 질문 대본</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사 완료!' : '질문 복사'}</span>
              </button>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-100 leading-relaxed select-text">
              "{question.question}"
            </p>
          </div>

          {/* 2. Anchor Claim & Intent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Anchor Claim */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                <span>지원자 직전 발언 닻(Anchor Claim)</span>
              </div>
              <p className="text-xs text-slate-300 italic bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                "{question.claim || '지원자의 직전 답변 핵심 내용'}"
              </p>
            </div>

            {/* Verification Intent */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>출제 의도 및 검증 목적</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                {question.intent || question.reason || '단순 지식 암기가 아닌 실제 트러블슈팅과 아키텍처 선택 근거 파악'}
              </p>
            </div>
          </div>

          {/* 3. Evaluated Criteria Mapping (What to Score) */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>이 질문으로 측정 가능한 면접방 평가 항목</span>
              </div>
              <span className="text-[11px] text-purple-400 font-semibold">
                {details.length || evaluatedIds.length}개 지표 반영
              </span>
            </div>

            <div className="space-y-2.5">
              {details.length > 0 ? (
                details.map((detail, idx) => {
                  const matchedCrit = criteria.find(c => c.id === detail.criterionId);
                  const colorKey = matchedCrit?.color || 'purple';
                  const style = COLOR_MAP[colorKey] || COLOR_MAP.purple;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[11px] font-black rounded-md border ${style.badge}`}>
                            {detail.criterionName || matchedCrit?.name || detail.criterionId}
                          </span>
                          {detail.weight && (
                            <span className="text-[10px] text-slate-400 font-bold">
                              가중치 {detail.weight}%
                            </span>
                          )}
                          {detail.relevanceScore && (
                            <span className="text-[10px] text-purple-300 font-medium">
                              연관도 {detail.relevanceScore}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {detail.evaluationGuideline}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                evaluatedIds.map((cid, idx) => {
                  const matchedCrit = criteria.find(c => c.id === cid);
                  return (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                      <span className="font-bold text-purple-300">{matchedCrit?.name || cid}</span>
                      <span className="text-slate-400">가중치 {matchedCrit?.weight || 30}% 반영 항목</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Ideal Score Signals vs Red Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* High Score Checklist */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-2.5">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>우수 답변 판별 시그널 (고득점)</span>
              </div>
              <ul className="space-y-2 text-xs text-emerald-200/90 leading-relaxed">
                {(question.idealAnswerSignals && question.idealAnswerSignals.length > 0
                  ? question.idealAnswerSignals
                  : [
                      '구체적인 수치/지표 기반으로 의사결정 이유를 명확히 제시함',
                      '기술의 한계점과 대안의 트레이드오프를 솔직히 설명함',
                      '실제 발생했던 에러 로그와 디버깅 흐름을 논리적으로 진술함'
                    ]
                ).map((sig, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{sig}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Red Flag Checklist */}
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-2.5">
              <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>미흡 / 감점 의심 시그널 (Red Flag)</span>
              </div>
              <ul className="space-y-2 text-xs text-rose-200/90 leading-relaxed">
                {(question.redFlagSignals && question.redFlagSignals.length > 0
                  ? question.redFlagSignals
                  : [
                      '기본 권장 설정이나 블로그 튜토리얼을 맹목적으로 복사함',
                      '본인이 직접 구현하지 않은 라이브러리 내부 원리를 회피함',
                      '장애 발생 시 롤백이나 예외 핸들링 대책이 전무함'
                    ]
                ).map((sig, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{sig}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 5. 2-Step Probing Follow-ups */}
          {question.followUpProbing && question.followUpProbing.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                <span>답변 청취 후 2차 심화 유도 질문 (Probing Follow-ups)</span>
              </div>
              <div className="space-y-1.5">
                {question.followUpProbing.map((prob, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2"
                  >
                    <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 font-black text-[10px] shrink-0">
                      Step 2.{idx + 1}
                    </span>
                    <span className="leading-relaxed">{prob}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onShareToChat && (
              <button
                type="button"
                onClick={handleShare}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  shared
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {shared ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5 text-blue-400" />}
                <span>{shared ? '채팅방 추천 완료!' : '동료 면접관 채팅방에 공유'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사됨' : '질문 복사 & 사용'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
