import React, { useState, useEffect } from 'react';
import { Evaluation, CandidateStatus, PlatformSettings, EvaluationCriterion } from '../types';
import { Lock, CheckCircle, Eye, EyeOff, UserCheck, AlertTriangle, ShieldAlert, Sliders, Mic } from 'lucide-react';
import { COLOR_MAP, DEFAULT_CRITERIA, calculateEvaluatorScore } from '../lib/scoring';

interface EvaluationFormProps {
  evaluation: Evaluation;
  peerEvaluations: Evaluation[];
  candidateStatus: CandidateStatus;
  isBlind: boolean;
  isLocked: boolean;
  settings?: PlatformSettings;
  onSaveEvaluation: (evalData: Evaluation, isSubmitting?: boolean) => void;
  currentInterviewerName: string;
}

export const EvaluationForm: React.FC<EvaluationFormProps> = ({
  evaluation,
  peerEvaluations,
  candidateStatus,
  isBlind,
  isLocked,
  settings,
  onSaveEvaluation,
  currentInterviewerName
}) => {
  const isCriteriaConfirmed = settings?.isCriteriaConfirmed ?? false;
  const activeCriteria = (settings?.criteria && settings.criteria.length > 0)
    ? settings.criteria
    : DEFAULT_CRITERIA;

  // Track if user has scrolled the evaluation panel
  const [hasScrolled, setHasScrolled] = useState(false);

  // Initial scores based on criteria (0 ~ 100 scale)
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    activeCriteria.forEach(c => {
      initial[c.id] = evaluation?.scores?.[c.id] ?? 80;
    });
    return initial;
  });

  // Presentation bonuses per criterion (up to +10% of criterion weight, e.g. up to 3.0 for 30 weight)
  const [presentationBonuses, setPresentationBonuses] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    activeCriteria.forEach(c => {
      initial[c.id] = evaluation?.presentationBonuses?.[c.id] ?? 0;
    });
    return initial;
  });

  const [presentationNote, setPresentationNote] = useState<string>(evaluation.presentationNote || '');

  const [comments, setComments] = useState(evaluation.comments || {
    technicalNote: '',
    attitudeNote: '',
    overallComment: ''
  });

  useEffect(() => {
    if (evaluation) {
      if (evaluation.scores) {
        const mergedScores: Record<string, number> = {};
        activeCriteria.forEach(c => {
          mergedScores[c.id] = evaluation.scores[c.id] !== undefined ? evaluation.scores[c.id] : 80;
        });
        setScores(mergedScores);
      }
      if (evaluation.presentationBonuses) {
        const mergedBonuses: Record<string, number> = {};
        activeCriteria.forEach(c => {
          mergedBonuses[c.id] = evaluation.presentationBonuses?.[c.id] !== undefined ? evaluation.presentationBonuses[c.id] : 0;
        });
        setPresentationBonuses(mergedBonuses);
      }
      if (evaluation.presentationNote !== undefined) {
        setPresentationNote(evaluation.presentationNote);
      }
      setComments(evaluation.comments || { technicalNote: '', attitudeNote: '', overallComment: '' });
    }
  }, [evaluation, settings?.criteria]);

  // Overall effective locked state: either the candidate isn't started OR criteria not confirmed by admin
  const isEffectivelyLocked = isLocked || !isCriteriaConfirmed;

  const computeBonusTotal = (bonuses: Record<string, number>): number => {
    const sum = Object.values(bonuses).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
    return Math.round(sum * 10) / 10;
  };

  const handleScoreChange = (field: string, rawVal: string | number) => {
    if (isEffectivelyLocked) return;
    let numVal = typeof rawVal === 'string' ? parseFloat(rawVal) : rawVal;
    if (isNaN(numVal)) numVal = 0;
    if (numVal < 0) numVal = 0;
    if (numVal > 100) numVal = 100;
    numVal = Math.round(numVal * 10) / 10;

    const newScores = { ...scores, [field]: numVal };
    setScores(newScores);

    const bonusTotal = computeBonusTotal(presentationBonuses);
    onSaveEvaluation({
      ...evaluation,
      scores: newScores,
      presentationBonuses,
      presentationBonusTotal: bonusTotal,
      presentationNote,
      comments
    }, false);
  };

  const handlePresentationBonusChange = (criterionId: string, rawBonus: string | number) => {
    if (isEffectivelyLocked) return;
    const criterion = activeCriteria.find(c => c.id === criterionId);
    const weight = Number(criterion?.weight) || 0;
    const maxAllowedBonus = Math.round((weight * 0.1) * 10) / 10; // Max 10% of weight (e.g. 30 -> 3.0)

    let bonusVal = typeof rawBonus === 'string' ? parseFloat(rawBonus) : rawBonus;
    if (isNaN(bonusVal)) bonusVal = 0;
    if (bonusVal < 0) bonusVal = 0;
    if (bonusVal > maxAllowedBonus) bonusVal = maxAllowedBonus;
    bonusVal = Math.round(bonusVal * 10) / 10;

    const newBonuses = { ...presentationBonuses, [criterionId]: bonusVal };
    setPresentationBonuses(newBonuses);

    const bonusTotal = computeBonusTotal(newBonuses);
    onSaveEvaluation({
      ...evaluation,
      scores,
      presentationBonuses: newBonuses,
      presentationBonusTotal: bonusTotal,
      presentationNote,
      comments
    }, false);
  };

  const handlePresentationNoteChange = (note: string) => {
    if (isEffectivelyLocked) return;
    setPresentationNote(note);
    const bonusTotal = computeBonusTotal(presentationBonuses);
    onSaveEvaluation({
      ...evaluation,
      scores,
      presentationBonuses,
      presentationBonusTotal: bonusTotal,
      presentationNote: note,
      comments
    }, false);
  };

  const handleCommentChange = (field: string, value: string) => {
    if (isEffectivelyLocked) return;
    const newComments = { ...comments, [field]: value };
    setComments(newComments);
    const bonusTotal = computeBonusTotal(presentationBonuses);
    onSaveEvaluation({
      ...evaluation,
      scores,
      presentationBonuses,
      presentationBonusTotal: bonusTotal,
      presentationNote,
      comments: newComments
    }, false);
  };

  const handleSubmitEvaluation = () => {
    if (isEffectivelyLocked) return;
    const bonusTotal = computeBonusTotal(presentationBonuses);
    onSaveEvaluation({
      ...evaluation,
      scores,
      presentationBonuses,
      presentationBonusTotal: bonusTotal,
      presentationNote,
      comments,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString()
    }, true);
  };

  // Calculate Weighted Base Score & Presentation Bonus Total
  const calculateCandidateWeightedScore = (
    evalScores?: Record<string, number>,
    evalBonuses?: Record<string, number>
  ) => {
    const res = calculateEvaluatorScore(evalScores, evalBonuses, activeCriteria);
    return {
      base: res.baseScore.toFixed(1),
      bonus: res.bonusScore.toFixed(1),
      total: res.totalScore.toFixed(1)
    };
  };

  const currentScoreBreakdown = calculateCandidateWeightedScore(scores, presentationBonuses);
  const totalBonusValue = parseFloat(currentScoreBreakdown.bonus);

  // Peer submission counter
  const totalPeers = peerEvaluations.length;
  const submittedPeers = peerEvaluations.filter(e => e.status === 'SUBMITTED').length;

  return (
    <div id="evaluation-form-panel" className="h-full flex flex-col bg-white border-l border-slate-200 overflow-hidden select-none">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Evaluation Console
          </div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span>{currentInterviewerName}</span>
            {evaluation.status === 'SUBMITTED' ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                제출 완료
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                작성 중
              </span>
            )}
          </h3>
        </div>

        {/* Real-time Weighted Score Badge with Presentation Bonus */}
        <div className="text-right flex flex-col items-end">
          <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
            <span>가중 합산 총점</span>
            {totalBonusValue > 0 && hasScrolled && (
              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                발표 가산 +{currentScoreBreakdown.bonus}점
              </span>
            )}
          </div>
          <div className={`font-mono text-xl font-black ${isCriteriaConfirmed ? 'text-blue-600' : 'text-slate-400'}`}>
            {!hasScrolled ? (
              <span className="text-sm font-semibold text-slate-400">스크롤 후 표시</span>
            ) : (
              <>
                {currentScoreBreakdown.total}
                <span className="text-xs font-normal text-slate-400">
                  {totalBonusValue > 0 ? ' / 100 (+10% 가산)' : ' / 100'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ⚠️ CRITICAL NOTICE: Unconfirmed Criteria Blocking Banner */}
      {!isCriteriaConfirmed ? (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-xs text-rose-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>어드민 평가 기준 미확정 (평가 불가)</span>
              <span className="px-1.5 py-0.2 bg-rose-200 text-rose-800 text-[10px] rounded font-semibold">입력 차단됨</span>
            </div>
            <p className="text-[11px] text-rose-700 leading-snug">
              어드민이 가중 합산 기준 및 평가 항목을 확정하기 전에는 사용자가 점수를 입력하거나 제출해도 <strong>시스템에 반영되지 않도록 비활성화</strong>되어 있습니다.
            </p>
          </div>
        </div>
      ) : isLocked ? (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>하단의 <strong>[면접 시작]</strong> 버튼을 누르면 점수 입력이 활성화됩니다.</span>
        </div>
      ) : null}

      {/* Evaluation Input Form */}
      <div
        onScroll={(e) => {
          if (!hasScrolled && e.currentTarget.scrollTop > 5) {
            setHasScrolled(true);
          }
        }}
        className="flex-1 overflow-y-auto p-4 space-y-4 text-xs"
      >
        {/* Scroll prompt guide badge if not scrolled yet */}
        {!hasScrolled && (
          <div className="bg-slate-100/90 border border-slate-300/80 rounded-xl p-3 text-center text-slate-600 space-y-1">
            <div className="text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1.5">
              <span>📜 점수 확인 및 입력을 위해 평가표를 아래로 스크롤하세요</span>
            </div>
            <p className="text-[10px] text-slate-500">
              블라인드 편향 방지를 위해 스크롤 조작 전까지 점수 수치가 숨김 처리됩니다.
            </p>
          </div>
        )}

        {/* Dynamic Score Criteria List configured by Admin */}
        {activeCriteria.map((criterion) => {
          const colorStyles = COLOR_MAP[criterion.color || 'blue'] || COLOR_MAP.blue;
          const scoreVal = scores[criterion.id] ?? 80;
          const weight = Number(criterion.weight) || 0;
          const maxBonus = Math.round((weight * 0.1) * 10) / 10; // e.g. 30 weight -> max +3.0 pts
          const bonusVal = presentationBonuses[criterion.id] ?? 0;

          // Convert 0~100 score to weighted points (e.g. 80 * 0.3 = 24.0 pt)
          const basePoints = Math.round(((scoreVal * weight) / 100) * 10) / 10;
          const itemTotalPoints = Math.round((basePoints + bonusVal) * 10) / 10;
          const itemMaxPossible = Math.round((weight + maxBonus) * 10) / 10;

          return (
            <div
              key={criterion.id}
              className={`space-y-2.5 p-3.5 rounded-xl border transition-colors ${
                isEffectivelyLocked
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : 'bg-white hover:bg-slate-50/50 border-slate-200 shadow-2xs'
              }`}
            >
              {/* Criterion Title & Base Score Input */}
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${colorStyles.dot}`}></span>
                  <span>{criterion.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${colorStyles.badge}`}>
                    배점 {weight}% ({weight}점)
                  </span>
                </label>
                <div className="flex items-center gap-1">
                  {!hasScrolled ? (
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded">
                      스크롤 후 표시
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        disabled={isEffectivelyLocked}
                        value={scoreVal}
                        onChange={e => handleScoreChange(criterion.id, e.target.value)}
                        className={`w-14 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold ${colorStyles.text} text-xs text-right ${colorStyles.ring} focus:outline-hidden disabled:bg-slate-100`}
                      />
                      <span className="text-slate-400 font-normal text-xs">/100</span>
                      <span className="font-mono text-slate-700 font-bold text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {basePoints.toFixed(1)}점
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {criterion.description && (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {criterion.description}
                </p>
              )}

              {/* Base Score Slider */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  disabled={isEffectivelyLocked || !hasScrolled}
                  value={hasScrolled ? scoreVal : 0}
                  onChange={e => handleScoreChange(criterion.id, e.target.value)}
                  className={`w-full ${colorStyles.accent} cursor-pointer disabled:opacity-40`}
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0점</span>
                  <span>50점 (보통)</span>
                  <span>100점 (만점)</span>
                </div>
              </div>

              {/* 🎤 PRESENTATION BONUS SECTION (Up to +10% of item weight) */}
              <div className={`p-2.5 rounded-lg border ${colorStyles.bonusBg} ${colorStyles.bonusBorder} space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold text-slate-800 text-[11px]">
                      발표 가산점 (최대 +10%)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (최대 +{maxBonus.toFixed(1)}점)
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-mono">
                    <span className={`text-[11px] font-bold ${bonusVal > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      +{bonusVal.toFixed(1)}점
                    </span>
                    {bonusVal > 0 && (
                      <span className="text-[9px] font-semibold text-amber-800 bg-amber-100 px-1 py-0.2 rounded border border-amber-300">
                        {Math.round((bonusVal / (weight || 1)) * 100)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Bonus Buttons & Slider */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={isEffectivelyLocked}
                    onClick={() => handlePresentationBonusChange(criterion.id, 0)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      bonusVal === 0
                        ? 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    +0점
                  </button>

                  <button
                    type="button"
                    disabled={isEffectivelyLocked}
                    onClick={() => handlePresentationBonusChange(criterion.id, Math.round((maxBonus * 0.33) * 10) / 10)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      bonusVal > 0 && bonusVal <= Math.round((maxBonus * 0.5) * 10) / 10
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-amber-50'
                    }`}
                  >
                    +{(Math.round((maxBonus * 0.33) * 10) / 10).toFixed(1)}점 (+3%)
                  </button>

                  <button
                    type="button"
                    disabled={isEffectivelyLocked}
                    onClick={() => handlePresentationBonusChange(criterion.id, Math.round((maxBonus * 0.66) * 10) / 10)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      bonusVal > Math.round((maxBonus * 0.5) * 10) / 10 && bonusVal < maxBonus
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-amber-50'
                    }`}
                  >
                    +{(Math.round((maxBonus * 0.66) * 10) / 10).toFixed(1)}점 (+7%)
                  </button>

                  <button
                    type="button"
                    disabled={isEffectivelyLocked}
                    onClick={() => handlePresentationBonusChange(criterion.id, maxBonus)}
                    className={`px-2 py-0.5 rounded text-[10px] font-black border transition-colors cursor-pointer ${
                      bonusVal === maxBonus
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                        : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    +{maxBonus.toFixed(1)}점 (최대 +10% 만점)
                  </button>

                  {/* Micro input for exact custom bonus */}
                  <div className="ml-auto flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">직접입력:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={maxBonus}
                      disabled={isEffectivelyLocked}
                      value={bonusVal}
                      onChange={e => handlePresentationBonusChange(criterion.id, e.target.value)}
                      className="w-12 px-1 py-0.5 bg-white border border-amber-300 rounded font-mono font-bold text-[11px] text-right text-amber-800 focus:ring-1 focus:ring-amber-500 focus:outline-hidden disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {/* Micro slider for smooth bonus control */}
                <input
                  type="range"
                  min="0"
                  max={maxBonus}
                  step="0.1"
                  disabled={isEffectivelyLocked || !hasScrolled}
                  value={hasScrolled ? bonusVal : 0}
                  onChange={e => handlePresentationBonusChange(criterion.id, e.target.value)}
                  className="w-full accent-amber-600 cursor-pointer disabled:opacity-40"
                />

                {/* Subtotal for this criterion */}
                <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    항목 합산: 기본 {basePoints.toFixed(1)}점 {bonusVal > 0 && `+ 가산 ${bonusVal.toFixed(1)}점`}
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    = <span className="text-blue-700 font-black">{itemTotalPoints.toFixed(1)}점</span> / {weight}점
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(최대 {itemMaxPossible.toFixed(1)}점)</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Qualitative Notes & Presentation Speech Feedback */}
        <div className="pt-2 border-t border-slate-200 space-y-3">
          {/* Presentation Note */}
          <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-1">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-amber-600" />
              <span>발표 태도 및 스피치 정성 평가 (가산점 사유)</span>
            </label>
            <textarea
              disabled={isEffectivelyLocked}
              rows={2}
              value={presentationNote}
              onChange={e => handlePresentationNoteChange(e.target.value)}
              placeholder="지원자의 발표 전달력, 발표 자료의 구조성, 추가 가산점 부여 사유 등을 구체적으로 메모하세요..."
              className="w-full p-2 bg-white border border-amber-200 rounded-md text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden disabled:bg-slate-100 resize-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              기술 역량 정성 메모 (선택 입력)
            </label>
            <textarea
              disabled={isEffectivelyLocked}
              rows={2}
              value={comments.technicalNote || ''}
              onChange={e => handleCommentChange('technicalNote', e.target.value)}
              placeholder="지원자의 기술적 장점 또는 검증된 역량을 구체적으로 메모하세요..."
              className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100 resize-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              종합 총평 메모 (선택 입력)
            </label>
            <textarea
              disabled={isEffectivelyLocked}
              rows={2}
              value={comments.overallComment || ''}
              onChange={e => handleCommentChange('overallComment', e.target.value)}
              placeholder="동아리 기여도, 협업 스타일, 추천 포지션 등에 대한 메모를 입력하세요..."
              className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Peer Status Footer (Blind Real-Time Tracker) */}
      <div className="p-3 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            {isBlind ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-purple-600" />
                <span>면접관 실시간 블라인드 평가 중</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>전원 제출 완료 (블라인드 해제됨)</span>
              </>
            )}
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-600">
            {submittedPeers} / {totalPeers} 완료
          </span>
        </div>

        {/* Live Peer Status Badges */}
        <div className="space-y-1.5 text-xs">
          {peerEvaluations.map((p) => {
            const isMe = p.interviewerName === currentInterviewerName;
            const isSubmitted = p.status === 'SUBMITTED';
            const peerBreakdown = calculateCandidateWeightedScore(p.scores, p.presentationBonuses);

            return (
              <div
                key={p.id}
                className="flex items-center justify-between py-1 px-2 rounded bg-white border border-slate-200 text-[11px]"
              >
                <span className="font-medium text-slate-800 truncate max-w-[130px]">
                  {p.interviewerName} {isMe && '(나)'}
                </span>

                {isSubmitted ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    제출 완료
                    {!isBlind && p.scores && (
                      <span className="font-mono text-slate-900 ml-1">
                        ({peerBreakdown.total}점
                        {parseFloat(peerBreakdown.bonus) > 0 && (
                          <span className="text-amber-700 text-[10px] ml-0.5">+{peerBreakdown.bonus}</span>
                        )}
                        )
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    작성 중...
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit My Evaluation Button */}
        {evaluation.status !== 'SUBMITTED' && (
          <button
            onClick={handleSubmitEvaluation}
            disabled={isEffectivelyLocked}
            className="mt-3 w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-md font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <UserCheck className="w-4 h-4" />
            <span>
              {!isCriteriaConfirmed ? '평가 기준 확정 대기 중 (제출 불가)' : '내 평가 제출하기'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

