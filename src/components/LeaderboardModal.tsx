import React, { useState } from 'react';
import { Candidate, Evaluation, ScoringFormula, PlatformSettings, EvaluationCriterion } from '../types';
import { Trophy, Medal, Award, TrendingUp, Filter, Sparkles, X, ChevronRight, CheckCircle2, ShieldAlert, CheckCircle } from 'lucide-react';
import { DEFAULT_CRITERIA, calculateEvaluatorScore, calculateAggregatedScore, calculateAveragePresentationBonus } from '../lib/scoring';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  allEvaluations: Evaluation[];
  settings: PlatformSettings;
  scoringFormula: ScoringFormula;
  onFormulaChange: (formula: ScoringFormula) => void;
  onSelectCandidate: (candidateId: string) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  candidates,
  allEvaluations,
  settings,
  scoringFormula,
  onFormulaChange,
  onSelectCandidate
}) => {
  const [selectedTrack, setSelectedTrack] = useState<string>('ALL');

  if (!isOpen) return null;

  const activeCriteria = (settings?.criteria && settings.criteria.length > 0)
    ? settings.criteria
    : DEFAULT_CRITERIA;

  const passThreshold = settings?.passThresholdScore ?? 70;
  const isCriteriaConfirmed = settings?.isCriteriaConfirmed ?? false;

  // Filter out NO_SHOW candidates from ranking
  const activeCandidates = candidates.filter(c => c.status !== 'NO_SHOW');

  // Compute scores per candidate based on the admin's configured criteria weights and selected formula
  const computedList = activeCandidates.map(candidate => {
    const candidateEvals = allEvaluations.filter(e => e.candidateId === candidate.id && e.status === 'SUBMITTED');
    const isCompleted = candidate.status === 'COMPLETED';

    // Calculate individual weighted totals for each evaluator based on active criteria + presentation bonuses
    const evaluatorScores = candidateEvals.map(e => {
      const res = calculateEvaluatorScore(e.scores, e.presentationBonuses, activeCriteria);
      return res.totalScore;
    });

    const count = evaluatorScores.length;
    const avgPresentationBonus = calculateAveragePresentationBonus(candidateEvals, activeCriteria);
    const finalScore = calculateAggregatedScore(evaluatorScores, scoringFormula);

    // Category item-wise averages for display
    const criteriaAverages: Record<string, number> = {};
    activeCriteria.forEach(crit => {
      if (candidateEvals.length > 0) {
        const sum = candidateEvals.reduce((s, e) => s + (e.scores?.[crit.id] ?? 0), 0);
        criteriaAverages[crit.id] = sum / candidateEvals.length;
      } else {
        criteriaAverages[crit.id] = 0;
      }
    });

    return {
      candidate,
      finalScore,
      evaluatorScores,
      evalCount: count,
      isCompleted,
      criteriaAverages,
      avgPresentationBonus
    };
  });

  // Calculate highest scorers for top badge highlights
  const topCriterionScorers = activeCriteria.map(crit => {
    const sorted = [...computedList].sort((a, b) => (b.criteriaAverages[crit.id] || 0) - (a.criteriaAverages[crit.id] || 0));
    return {
      criterion: crit,
      topCandidate: sorted[0] && (sorted[0].criteriaAverages[crit.id] || 0) > 0 ? sorted[0] : null
    };
  });

  // Filter by track and sort descending by finalScore with tie-breaking
  const filteredRankings = computedList
    .filter(item => selectedTrack === 'ALL' || item.candidate.track === selectedTrack)
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      // Tie-breaking: first criterion score
      const firstCritId = activeCriteria[0]?.id;
      if (firstCritId && (b.criteriaAverages[firstCritId] !== a.criteriaAverages[firstCritId])) {
        return (b.criteriaAverages[firstCritId] || 0) - (a.criteriaAverages[firstCritId] || 0);
      }
      return a.candidate.name.localeCompare(b.candidate.name);
    });

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-xl text-slate-950 font-black">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>SmartLab 면접 종합 순위 & 리더보드</span>
                {isCriteriaConfirmed ? (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-500/40">
                    어드민 가중합산 확정 적용
                  </span>
                ) : (
                  <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-500/40 animate-pulse">
                    기준 미확정 (평가 대기)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                100점 만점 가중 환산 종합 집계 • 결시자(NO_SHOW) 자동 제외 • 실시간 순위 정렬
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formula Selector Bar & Track Filter */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Scoring Formula Picker */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">산출 공식:</span>
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-2xs">
                {[
                  { id: 'TRIMMED_MEAN', label: '가중 절사평균 (권장)' },
                  { id: 'WEIGHTED_MEAN', label: '가중 평균 (Mean)' },
                  { id: 'MEDIAN', label: '중앙값 (Median)' },
                  { id: 'MEAN', label: '산술 평균' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => onFormulaChange(opt.id as ScoringFormula)}
                    className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors cursor-pointer ${
                      scoringFormula === opt.id
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Track Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-600">트랙 필터:</span>
              <select
                value={selectedTrack}
                onChange={e => setSelectedTrack(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="ALL">전체 트랙</option>
                <option value="AI/ML">AI/ML</option>
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Embedded/Robotics">Embedded/Robotics</option>
                <option value="Product/Design">Product/Design</option>
              </select>
            </div>
          </div>

          {/* Active Criteria Weights Badge strip */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200 text-[11px] text-slate-600">
            <span className="font-bold text-slate-700">적용된 가중치:</span>
            {activeCriteria.map(c => (
              <span
                key={c.id}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-800"
              >
                {c.name.split('.')[1] || c.name} <strong className="text-blue-600">({c.weight}%)</strong>
              </span>
            ))}
          </div>

          {/* Top Category Badges Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            {topCriterionScorers.slice(0, 4).map(({ criterion, topCandidate }) => {
              if (!topCandidate) return null;
              const avg = topCandidate.criteriaAverages[criterion.id] || 0;
              return (
                <div
                  key={criterion.id}
                  className="p-2 rounded-xl bg-white border border-slate-200 flex items-center gap-2 shadow-2xs"
                >
                  <span className="text-base">🏆</span>
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-bold text-blue-700 uppercase block truncate">
                      {criterion.name.split('.')[1] || criterion.name} 1위
                    </span>
                    <div className="font-bold text-slate-900 truncate">{topCandidate.candidate.name}</div>
                    <span className="text-slate-500 text-[10px]">({avg.toFixed(1)}점)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rankings Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                <th className="pb-3 px-2">순위</th>
                <th className="pb-3 px-2">지원자</th>
                <th className="pb-3 px-2">트랙</th>
                <th className="pb-3 px-2">평가 현황</th>
                <th className="pb-3 px-2 text-center">항목별 평균 점수</th>
                <th className="pb-3 px-2 text-right">환산 가중 총점</th>
                <th className="pb-3 px-2 text-right">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRankings.map((item, idx) => {
                const rank = idx + 1;
                return (
                  <tr
                    key={item.candidate.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => {
                      onSelectCandidate(item.candidate.id);
                      onClose();
                    }}
                  >
                    <td className="py-3.5 px-2">
                      {rank === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-xs">
                          1
                        </span>
                      ) : rank === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-bold flex items-center justify-center text-xs">
                          2
                        </span>
                      ) : rank === 3 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-700/40 text-amber-900 font-bold flex items-center justify-center text-xs">
                          3
                        </span>
                      ) : (
                        <span className="font-mono text-slate-500 pl-2">{rank}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-2">
                      <div className="font-bold text-slate-900 text-sm">
                        {item.candidate.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.candidate.studentId}
                      </div>
                    </td>

                    <td className="py-3.5 px-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {item.candidate.track}
                      </span>
                    </td>

                    <td className="py-3.5 px-2">
                      {item.isCompleted ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          평가 완료 ({item.evalCount}인 참여)
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold text-[10px] w-max">
                          진행 중 ({item.evalCount}인 평가 제출)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-2 text-center font-mono text-[11px] text-slate-600">
                      {activeCriteria.map((c, cIdx) => (
                        <span key={c.id}>
                          {cIdx > 0 && <span className="text-slate-300 mx-1">/</span>}
                          <span>{(item.criteriaAverages[c.id] || 0).toFixed(0)}</span>
                        </span>
                      ))}
                    </td>

                    <td className="py-3.5 px-2 text-right">
                      <div className="flex flex-col items-end">
                        <div>
                          <span className="text-base font-black text-blue-600 font-mono">
                            {item.finalScore.toFixed(1)}
                          </span>
                          <span className="text-slate-400 text-xs font-normal"> / 100</span>
                        </div>
                        {item.avgPresentationBonus > 0 && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-bold">
                            🎤 발표 가산 +{item.avgPresentationBonus}점
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-2 text-right">
                      <button className="p-1 text-slate-400 group-hover:text-blue-600 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>* 어드민 확정 가중치 및 면접관별 평가 집계 기반 종합 순위 (면접관 수 제한 없음)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
