import React, { useState, useMemo } from 'react';
import {
  Candidate,
  Evaluation,
  PlatformSettings,
  EvaluationCriterion,
  ScoringFormula,
  InterviewRoomItem
} from '../types';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  HelpCircle,
  PieChart as PieIcon,
  Layers,
  Brain,
  ThumbsUp,
  AlertCircle,
  FileSpreadsheet,
  Zap,
  Filter
} from 'lucide-react';
import { calculateEvaluatorScore } from '../lib/scoring';

interface AdminStatsDashboardProps {
  candidates: Candidate[];
  allEvaluations: Evaluation[];
  settings: PlatformSettings;
  rooms: InterviewRoomItem[];
  scoringFormula: ScoringFormula;
}

export const AdminStatsDashboard: React.FC<AdminStatsDashboardProps> = ({
  candidates,
  allEvaluations,
  settings,
  rooms,
  scoringFormula
}) => {
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('ALL');
  const [selectedInterviewerFilter, setSelectedInterviewerFilter] = useState<string>('ALL');

  const criteria = useMemo(() => {
    return settings.criteria && settings.criteria.length > 0
      ? settings.criteria
      : [
          { id: 'technical', name: '기술 역량', description: '', weight: 40, maxScore: 100, color: 'blue' },
          { id: 'problemSolving', name: '문제 해결력', description: '', weight: 30, maxScore: 100, color: 'purple' },
          { id: 'communication', name: '의사소통', description: '', weight: 20, maxScore: 100, color: 'emerald' },
          { id: 'cultureFit', name: '동아리 적합도', description: '', weight: 10, maxScore: 100, color: 'amber' }
        ];
  }, [settings.criteria]);

  // Filter candidates & evaluations by selected room & track
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (selectedRoomFilter !== 'ALL' && c.roomId !== selectedRoomFilter) return false;
      if (selectedTrackFilter !== 'ALL' && c.track !== selectedTrackFilter) return false;
      return true;
    });
  }, [candidates, selectedRoomFilter, selectedTrackFilter]);

  const filteredCandidateIds = useMemo(() => new Set(filteredCandidates.map(c => c.id)), [filteredCandidates]);

  const validEvaluations = useMemo(() => {
    return allEvaluations.filter(e => {
      if (!filteredCandidateIds.has(e.candidateId)) return false;
      if (e.status !== 'SUBMITTED') return false;
      if (selectedInterviewerFilter !== 'ALL' && e.interviewerName !== selectedInterviewerFilter && e.interviewerId !== selectedInterviewerFilter) return false;
      return true;
    });
  }, [allEvaluations, filteredCandidateIds, selectedInterviewerFilter]);

  // Extract all unique interviewer names
  const allInterviewerNames = useMemo(() => {
    const names = new Set<string>();
    allEvaluations.forEach(e => {
      if (e.interviewerName) names.add(e.interviewerName);
    });
    // Also add from rooms
    rooms.forEach(r => {
      r.interviewers?.forEach(i => names.add(i.name));
    });
    return Array.from(names);
  }, [allEvaluations, rooms]);

  // Extract unique tracks
  const allTracks = useMemo(() => {
    const tracks = new Set<string>();
    candidates.forEach(c => {
      if (c.track) tracks.add(c.track);
    });
    return Array.from(tracks);
  }, [candidates]);

  // -------------------------------------------------------------
  // 1. STATS: PER-INTERVIEWER DEEP ANALYSIS
  // -------------------------------------------------------------
  const interviewerStats = useMemo(() => {
    return allInterviewerNames.map(name => {
      const evals = allEvaluations.filter(
        e => (e.interviewerName === name || e.interviewerId === name) &&
             e.status === 'SUBMITTED' &&
             filteredCandidateIds.has(e.candidateId)
      );

      const count = evals.length;

      // Item-wise stats
      const criteriaBreakdown: Record<string, { avg: number; min: number; max: number; sum: number }> = {};
      criteria.forEach(crit => {
        const scores = evals.map(e => Number(e.scores?.[crit.id] ?? 0)).filter(s => s > 0);
        if (scores.length > 0) {
          const sum = scores.reduce((a, b) => a + b, 0);
          criteriaBreakdown[crit.id] = {
            avg: Number((sum / scores.length).toFixed(1)),
            min: Math.min(...scores),
            max: Math.max(...scores),
            sum
          };
        } else {
          criteriaBreakdown[crit.id] = { avg: 0, min: 0, max: 0, sum: 0 };
        }
      });

      // Overall weighted total score given by this interviewer (including presentation bonuses)
      const totalWeightedScores = evals.map(e => {
        const res = calculateEvaluatorScore(e.scores, e.presentationBonuses, criteria);
        return res.totalScore;
      });

      const avgWeightedScore = totalWeightedScores.length > 0
        ? Number((totalWeightedScores.reduce((a, b) => a + b, 0) / totalWeightedScores.length).toFixed(1))
        : 0;
      const minWeightedScore = totalWeightedScores.length > 0 ? Number(Math.min(...totalWeightedScores).toFixed(1)) : 0;
      const maxWeightedScore = totalWeightedScores.length > 0 ? Number(Math.max(...totalWeightedScores).toFixed(1)) : 0;

      // Highest scored candidate by this interviewer
      let highestCandidate: { name: string; score: number; comment?: string } | null = null;
      let lowestCandidate: { name: string; score: number; comment?: string } | null = null;

      if (evals.length > 0) {
        const withScores = evals.map(e => {
          const cand = candidates.find(c => c.id === e.candidateId);
          const res = calculateEvaluatorScore(e.scores, e.presentationBonuses, criteria);
          return {
            name: cand?.name || '지원자',
            score: res.totalScore,
            comment: e.comments?.overallComment || e.comments?.technicalNote || e.comments?.attitudeNote || e.presentationNote || ''
          };
        }).sort((a, b) => b.score - a.score);

        highestCandidate = withScores[0] || null;
        lowestCandidate = withScores[withScores.length - 1] || null;
      }

      // Collect qualitative review comments & extract favorite keywords/traits
      const allCommentsText = evals
        .map(e => [e.comments?.overallComment, e.comments?.technicalNote, e.comments?.attitudeNote].filter(Boolean).join(' '))
        .join(' ');

      // Personality/Tendency analysis
      let evaluationStyle = '균형적 평가형';
      let styleColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      if (avgWeightedScore >= 88) {
        evaluationStyle = '호의적 / 잠재력 격려형 (관대함)';
        styleColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      } else if (avgWeightedScore > 0 && avgWeightedScore <= 75) {
        evaluationStyle = '엄격한 기준 / 팩트 검증형 (현미경 심사)';
        styleColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      } else if (maxWeightedScore - minWeightedScore >= 25) {
        evaluationStyle = '변별력 중시형 (고득점/저득점 분별 뚜렷)';
        styleColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      }

      // Key preferred attributes based on highest scoring category
      let highestCategory = criteria[0];
      let maxCatAvg = -1;
      criteria.forEach(crit => {
        if ((criteriaBreakdown[crit.id]?.avg || 0) > maxCatAvg) {
          maxCatAvg = criteriaBreakdown[crit.id]?.avg || 0;
          highestCategory = crit;
        }
      });

      return {
        name,
        count,
        avgWeightedScore,
        minWeightedScore,
        maxWeightedScore,
        criteriaBreakdown,
        highestCandidate,
        lowestCandidate,
        allCommentsText,
        evaluationStyle,
        styleColor,
        highestCategory
      };
    }).filter(i => i.count > 0 || selectedInterviewerFilter === 'ALL');
  }, [allInterviewerNames, allEvaluations, filteredCandidateIds, criteria, candidates, selectedInterviewerFilter]);

  // -------------------------------------------------------------
  // 2. STATS: CRITERIA BENCHMARK ACROSS ALL EVALUATIONS
  // -------------------------------------------------------------
  const globalCriteriaStats = useMemo(() => {
    return criteria.map(crit => {
      const allScores = validEvaluations
        .map(e => Number(e.scores?.[crit.id] ?? 0))
        .filter(s => s > 0);

      const count = allScores.length;
      const sum = allScores.reduce((a, b) => a + b, 0);
      const avg = count > 0 ? Number((sum / count).toFixed(1)) : 0;
      const min = count > 0 ? Math.min(...allScores) : 0;
      const max = count > 0 ? Math.max(...allScores) : 0;

      // Distribution brackets: <70, 70-79, 80-89, 90-100
      const dist = {
        under70: allScores.filter(s => s < 70).length,
        from70to79: allScores.filter(s => s >= 70 && s < 80).length,
        from80to89: allScores.filter(s => s >= 80 && s < 90).length,
        from90to100: allScores.filter(s => s >= 90).length
      };

      return {
        criterion: crit,
        avg,
        min,
        max,
        count,
        dist
      };
    });
  }, [criteria, validEvaluations]);

  // -------------------------------------------------------------
  // 3. STATS: CANDIDATE PERFORMANCE RANKINGS & PREFERENCE
  // -------------------------------------------------------------
  const candidateScoresList = useMemo(() => {
    return filteredCandidates
      .filter(c => c.status !== 'NO_SHOW')
      .map(candidate => {
        const evals = validEvaluations.filter(e => e.candidateId === candidate.id);
        const count = evals.length;

        const scores = evals.map(e => {
          let w = 0;
          criteria.forEach(crit => {
            w += (Number(e.scores?.[crit.id] ?? 0) * crit.weight) / 100;
          });
          return w;
        });

        let finalScore = 0;
        if (count > 0) {
          if (scoringFormula === 'TRIMMED_MEAN' && count >= 3) {
            const sorted = [...scores].sort((a, b) => a - b);
            const trimmed = sorted.slice(1, -1);
            finalScore = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
          } else if (scoringFormula === 'MEDIAN') {
            const sorted = [...scores].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            finalScore = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
          } else {
            finalScore = scores.reduce((a, b) => a + b, 0) / count;
          }
        }

        // Category averages
        const catAverages: Record<string, number> = {};
        criteria.forEach(crit => {
          const catScores = evals.map(e => Number(e.scores?.[crit.id] ?? 0));
          catAverages[crit.id] = catScores.length > 0
            ? Number((catScores.reduce((a, b) => a + b, 0) / catScores.length).toFixed(1))
            : 0;
        });

        return {
          candidate,
          evalCount: count,
          finalScore: Number(finalScore.toFixed(1)),
          catAverages,
          evals
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore);
  }, [filteredCandidates, validEvaluations, criteria, scoringFormula]);

  // Overall Global Average
  const globalOverallAverage = useMemo(() => {
    const withScores = candidateScoresList.filter(c => c.evalCount > 0);
    if (withScores.length === 0) return 0;
    const sum = withScores.reduce((a, b) => a + b.finalScore, 0);
    return Number((sum / withScores.length).toFixed(1));
  }, [candidateScoresList]);

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      {/* Top Filter & Overview Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 rounded-2xl text-slate-950 font-black">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>SmartLab 면접관 심사 성향 및 종합 심층 통계</span>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-500/40">
                  실시간 집계
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                면접관별 세부 항목 평균점수, 최고/최저점 분포, 선호하는 인재 유형 및 정성 답변 성향을 심층 분석합니다.
              </p>
            </div>
          </div>

          {/* Dynamic Filters */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Room Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-bold">면접실:</span>
              <select
                value={selectedRoomFilter}
                onChange={e => setSelectedRoomFilter(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">전체 면접실</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>
                ))}
              </select>
            </div>

            {/* Track Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-bold">분야:</span>
              <select
                value={selectedTrackFilter}
                onChange={e => setSelectedTrackFilter(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">전체 분야</option>
                {allTracks.map(t => (
                  <option key={t} value={t} className="bg-slate-900">{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Global Summary KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>평가 완료 지원자</span>
            </span>
            <div className="text-2xl font-black text-white font-mono">
              {candidateScoresList.filter(c => c.evalCount > 0).length}
              <span className="text-xs text-slate-500 font-normal ml-1">/ {filteredCandidates.length}명</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>전체 평균 환산 총점</span>
            </span>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {globalOverallAverage}
              <span className="text-xs text-slate-500 font-normal ml-1">점</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>최고 득점자</span>
            </span>
            <div className="text-base font-black text-emerald-300 truncate">
              {candidateScoresList[0]?.finalScore > 0 ? (
                <span>{candidateScoresList[0].candidate.name} ({candidateScoresList[0].finalScore}점)</span>
              ) : (
                <span className="text-slate-500 text-sm">집계 대기</span>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>제출된 평가 건수</span>
            </span>
            <div className="text-2xl font-black text-purple-300 font-mono">
              {validEvaluations.length}
              <span className="text-xs text-slate-500 font-normal ml-1">건</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PER-INTERVIEWER DETAILED SCORE CARDS & TENDENCIES */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-black text-base">
            <Brain className="w-5 h-5 text-amber-400" />
            <span>면접관별 세부 평가 지표 및 심사 성향 분석</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            항목별 평균점 / 최고·최저점 / 선호 인재 유형
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {interviewerStats.map(stat => (
            <div
              key={stat.name}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Interviewer Header & Style Tag */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 font-black flex items-center justify-center text-xs shadow-inner">
                        {stat.name.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base leading-tight">{stat.name}</h4>
                        <span className="text-xs text-slate-400">
                          총 {stat.count}명 심사 완료
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${stat.styleColor}`}>
                      {stat.evaluationStyle}
                    </span>
                  </div>
                </div>

                {/* Score Summary Metrics (Average, Min, Max) */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">평균 부여 점수</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {stat.count > 0 ? stat.avgWeightedScore : '-'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal"> / 100</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">최저 부여 점수</span>
                    <span className="text-lg font-black text-rose-400 font-mono">
                      {stat.count > 0 ? stat.minWeightedScore : '-'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal"> 점</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">최고 부여 점수</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {stat.count > 0 ? stat.maxWeightedScore : '-'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal"> 점</span>
                  </div>
                </div>

                {/* Breakdown by active criteria */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>평가 항목별 평균 및 최고/최저 점수</span>
                  </span>

                  <div className="space-y-2 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/60">
                    {criteria.map(crit => {
                      const itemStat = stat.criteriaBreakdown[crit.id] || { avg: 0, min: 0, max: 0 };
                      return (
                        <div key={crit.id} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-300 font-semibold truncate">
                              {crit.name.split('.')[1] || crit.name} ({crit.weight}%)
                            </span>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-slate-500 text-[10px]">
                                최저 {itemStat.min}점 ~ 최고 {itemStat.max}점
                              </span>
                              <span className="font-bold text-amber-300 text-xs">
                                평균 {itemStat.avg}점
                              </span>
                            </div>
                          </div>
                          {/* Mini Bar */}
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(itemStat.avg, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Interviewer Favorites & Qualitative Stance */}
                <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>선호 인재 및 최고 평가자</span>
                  </div>

                  {stat.highestCandidate ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-300">{stat.highestCandidate.name}</span>
                        <span className="font-mono font-bold text-slate-300">{stat.highestCandidate.score}점 부여</span>
                      </div>
                      {stat.highestCandidate.comment && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                          "{stat.highestCandidate.comment}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[11px]">아직 제출된 심사 기록이 없습니다.</p>
                  )}
                </div>
              </div>

              {/* Bottom Trait Summary */}
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>가장 높게 점수를 준 항목: <strong className="text-white">{stat.highestCategory?.name.split('.')[1] || stat.highestCategory?.name}</strong></span>
                <span className="text-amber-400 font-semibold font-mono">가중치 {stat.highestCategory?.weight}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: GLOBAL CRITERIA STATS & SCORE DISTRIBUTION */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-amber-400" />
              <span>항목별 전체 점수 분포 및 난이도 분석</span>
            </h3>
            <p className="text-xs text-slate-400">
              전체 면접관이 각 항목에 부여한 점수의 평균과 고득점(90+)/과락(70 미만) 분포를 보여줍니다.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            총 {validEvaluations.length}건 평가 데이터 기반
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {globalCriteriaStats.map(({ criterion, avg, min, max, count, dist }) => (
            <div
              key={criterion.id}
              className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs truncate">
                  {criterion.name.split('.')[1] || criterion.name}
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono font-bold px-2 py-0.5 rounded-md border border-blue-500/30">
                  {criterion.weight}%
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-400">평균 점수</span>
                  <span className="text-xl font-black text-amber-400 font-mono">{avg}점</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>최저 {min}점</span>
                  <span>최고 {max}점</span>
                </div>
              </div>

              {/* Distribution Mini Progress Stack */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold block">점수대별 분포:</span>
                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded p-1 text-rose-300">
                    <span className="block text-[9px] text-slate-500">~69점</span>
                    <strong>{dist.under70}</strong>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded p-1 text-amber-300">
                    <span className="block text-[9px] text-slate-500">70s</span>
                    <strong>{dist.from70to79}</strong>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded p-1 text-blue-300">
                    <span className="block text-[9px] text-slate-500">80s</span>
                    <strong>{dist.from80to89}</strong>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-1 text-emerald-300">
                    <span className="block text-[9px] text-slate-500">90+</span>
                    <strong>{dist.from90to100}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: CANDIDATE RANKINGS & EVALUATOR CONSENSUS */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">지원자별 종합 순위 및 심사 평가 요약</h3>
          </div>
          <span className="text-xs text-slate-400">
            총 {candidateScoresList.length}명 지원자 순위 집계
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px]">
                <th className="pb-3 px-3">순위</th>
                <th className="pb-3 px-3">지원자</th>
                <th className="pb-3 px-3">트랙</th>
                <th className="pb-3 px-3">심사 완료</th>
                <th className="pb-3 px-3 text-center">항목별 평균점수</th>
                <th className="pb-3 px-3 text-right">환산 가중 총점</th>
                <th className="pb-3 px-3 text-center">면접관 평가 일치도</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {candidateScoresList.map((item, idx) => {
                const rank = idx + 1;
                // Calculate evaluator divergence/consensus
                const evals = item.evals;
                let consensusTag = '데이터 부족';
                let consensusColor = 'text-slate-500 bg-slate-800';

                if (evals.length >= 2) {
                  const weightedSums = evals.map(e => {
                    let w = 0;
                    criteria.forEach(crit => {
                      w += (Number(e.scores?.[crit.id] ?? 0) * crit.weight) / 100;
                    });
                    return w;
                  });
                  const diff = Math.max(...weightedSums) - Math.min(...weightedSums);
                  if (diff <= 5) {
                    consensusTag = '완전 일치 (만장일치 호평)';
                    consensusColor = 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40';
                  } else if (diff <= 12) {
                    consensusTag = '높은 합의';
                    consensusColor = 'text-blue-300 bg-blue-500/20 border border-blue-500/40';
                  } else {
                    consensusTag = `견해 분분 (편차 ${diff.toFixed(1)}점)`;
                    consensusColor = 'text-amber-300 bg-amber-500/20 border border-amber-500/40';
                  }
                }

                return (
                  <tr key={item.candidate.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      {rank === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-xs">
                          1
                        </span>
                      ) : rank === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-bold flex items-center justify-center text-xs">
                          2
                        </span>
                      ) : rank === 3 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-bold flex items-center justify-center text-xs">
                          3
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400 pl-2">{rank}</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-white text-sm">{item.candidate.name}</div>
                      <div className="text-[11px] text-slate-400">{item.candidate.studentId}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[11px] border border-slate-700">
                        {item.candidate.track}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-300">
                      {item.evalCount}인 완료
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-300">
                      {criteria.map((c, cIdx) => (
                        <span key={c.id}>
                          {cIdx > 0 && <span className="text-slate-600 mx-1">/</span>}
                          <span>{(item.catAverages[c.id] || 0).toFixed(0)}</span>
                        </span>
                      ))}
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <span className="text-base font-black text-amber-400">
                        {item.finalScore.toFixed(1)}
                      </span>
                      <span className="text-slate-500 text-xs"> / 100</span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${consensusColor}`}>
                        {consensusTag}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
