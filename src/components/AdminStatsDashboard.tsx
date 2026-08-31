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
  Filter,
  Scale,
  ShieldCheck,
  Flame,
  UserCheck,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowUpDown,
  Compass,
  Clock
} from 'lucide-react';
import { calculateEvaluatorScore } from '../lib/scoring';
import {
  calculateComprehensiveBiasAnalysis,
  ComprehensiveBiasAnalysisResult,
  EvaluatorBiasMetrics,
  CandidateCalibrationResult,
  DiscrepancyCandidateInsight
} from '../lib/biasCorrection';

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
  const [activeTab, setActiveTab] = useState<'BIAS_CORRECTION' | 'SPARSE_MATRIX' | 'INTERVIEWER_STATS' | 'GLOBAL_DISTRIBUTION'>('BIAS_CORRECTION');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('ALL');
  const [selectedInterviewerFilter, setSelectedInterviewerFilter] = useState<string>('ALL');
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [showOnlyDiscrepancies, setShowOnlyDiscrepancies] = useState<boolean>(false);

  const criteria = useMemo(() => {
    return settings.criteria && settings.criteria.length > 0
      ? settings.criteria
      : [
          { id: 'technical', name: '1. 기술 직무 역량', description: '', weight: 40, maxScore: 100, color: 'blue' },
          { id: 'problemSolving', name: '2. 논리적 문제 해결력', description: '', weight: 30, maxScore: 100, color: 'purple' },
          { id: 'communication', name: '3. 의사소통 및 전달력', description: '', weight: 20, maxScore: 100, color: 'emerald' },
          { id: 'cultureFit', name: '4. 동아리 적합도', description: '', weight: 10, maxScore: 100, color: 'amber' }
        ];
  }, [settings.criteria]);

  const passThreshold = settings.passThresholdScore ?? 70;

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
  // COMPREHENSIVE BIAS CORRECTION & RELIABILITY CALCULATION
  // -------------------------------------------------------------
  const biasAnalysis: ComprehensiveBiasAnalysisResult = useMemo(() => {
    return calculateComprehensiveBiasAnalysis(
      filteredCandidates,
      allEvaluations.filter(e => filteredCandidateIds.has(e.candidateId)),
      criteria,
      passThreshold,
      scoringFormula,
      allInterviewerNames
    );
  }, [filteredCandidates, allEvaluations, filteredCandidateIds, criteria, passThreshold, scoringFormula, allInterviewerNames]);

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

      const allCommentsText = evals
        .map(e => [e.comments?.overallComment, e.comments?.technicalNote, e.comments?.attitudeNote].filter(Boolean).join(' '))
        .join(' ');

      // Find bias metrics for this interviewer
      const biasMetric = biasAnalysis.evaluatorMetrics.find(
        m => m.interviewerName === name || m.interviewerId === name
      );

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
        biasMetric,
        highestCategory
      };
    }).filter(i => i.count > 0 || selectedInterviewerFilter === 'ALL');
  }, [allInterviewerNames, allEvaluations, filteredCandidateIds, criteria, candidates, selectedInterviewerFilter, biasAnalysis]);

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

  // Average Inter-Rater Agreement across all evaluators
  const avgAgreementRate = useMemo(() => {
    const valid = biasAnalysis.evaluatorMetrics.filter(m => m.count >= 2);
    if (valid.length === 0) return 100;
    const sum = valid.reduce((s, m) => s + m.interRaterAgreementRate, 0);
    return Math.round(sum / valid.length);
  }, [biasAnalysis]);

  // Number of candidates who experienced rank shifts from calibration
  const shiftedCandidatesCount = useMemo(() => {
    return biasAnalysis.candidateCalibrations.filter(c => Math.abs(c.rankDelta) > 0).length;
  }, [biasAnalysis]);

  // Filtered candidate calibrations
  const displayCandidateCalibrations = useMemo(() => {
    if (showOnlyDiscrepancies) {
      return biasAnalysis.candidateCalibrations.filter(
        c => Math.abs(c.rankDelta) >= 2 || c.statusShift !== 'UNCHANGED' || c.isBorderline
      );
    }
    return biasAnalysis.candidateCalibrations;
  }, [biasAnalysis.candidateCalibrations, showOnlyDiscrepancies]);

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      {/* Top Filter & Navigation Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 rounded-2xl text-slate-950 font-black">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>SmartLab 심사위원 성향 분석 & 채점 편향(Z-Score) 공정보정</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  실시간 표준화 연산
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                면접관별 관대/엄격 성향($\Delta$), 표준편차($\sigma$) 기반 변별력 및 일치도를 분석하고 표준화 보정 점수를 시뮬레이션합니다.
              </p>
            </div>
          </div>

          {/* Dynamic Filter Controls */}
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

        {/* Tab Navigation Switches */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1 text-xs">
            <button
              onClick={() => setActiveTab('BIAS_CORRECTION')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'BIAS_CORRECTION'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>⚖️ 심사위원 성향 & Z-Score 공정보정</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40 text-slate-950 font-mono font-bold">
                {biasAnalysis.evaluatorMetrics.length}명
              </span>
            </button>

            <button
              onClick={() => setActiveTab('SPARSE_MATRIX')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SPARSE_MATRIX'
                  ? 'bg-purple-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>🎯 5인 패널 희소 매트릭스 & 정족수</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40 text-white font-mono font-bold">
                {biasAnalysis.totalPanelPoolCount}인 풀
              </span>
            </button>

            <button
              onClick={() => setActiveTab('INTERVIEWER_STATS')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'INTERVIEWER_STATS'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>🧠 면접관별 세부 채점표 & 선호 인재</span>
            </button>

            <button
              onClick={() => setActiveTab('GLOBAL_DISTRIBUTION')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'GLOBAL_DISTRIBUTION'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <PieIcon className="w-4 h-4" />
              <span>📊 항목별 전체 점수 분포</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <span>패널 풀: <strong className="text-purple-400">{biasAnalysis.totalPanelPoolCount}명</strong></span>
            <span className="text-slate-600">|</span>
            <span>글로벌 평균: <strong className="text-amber-400">{biasAnalysis.globalMean}점</strong></span>
            <span className="text-slate-600">|</span>
            <span>표준편차(σ): <strong className="text-blue-400">{biasAnalysis.globalStdDev}점</strong></span>
          </div>
        </div>

        {/* Global Summary KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>심사 완료 지원자</span>
            </span>
            <div className="text-2xl font-black text-white font-mono">
              {biasAnalysis.candidateCalibrations.filter(c => c.evalCount > 0).length}
              <span className="text-xs text-slate-500 font-normal ml-1">/ {filteredCandidates.length}명</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>평가자 간 평균 일치율</span>
            </span>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {avgAgreementRate}%
              <span className="text-xs text-slate-500 font-normal ml-1">합의도</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>보정 순위 변동 인원</span>
            </span>
            <div className="text-2xl font-black text-emerald-300 font-mono">
              {shiftedCandidatesCount}
              <span className="text-xs text-slate-500 font-normal ml-1">명 변동</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl space-y-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>심사 이견 집중 검토</span>
            </span>
            <div className="text-2xl font-black text-rose-300 font-mono">
              {biasAnalysis.highDiscrepancyCandidates.length}
              <span className="text-xs text-slate-500 font-normal ml-1">명 (10점+ 편차)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BIAS CORRECTION & RELIABILITY DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'BIAS_CORRECTION' && (
        <div className="space-y-8 animate-fade-in">
          {/* Section: Evaluator Tendency Radar Cards */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white font-black text-base">
                <Compass className="w-5 h-5 text-amber-400" />
                <span>심사위원별 채점 성향 및 신뢰도 매트릭스</span>
              </div>
              <span className="text-xs text-slate-400">
                관대화 지수 ($\Delta$), 변별력($\sigma$), 동료 면접관과의 평균 편차(MAE)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {biasAnalysis.evaluatorMetrics.map(evaluator => (
                <div
                  key={evaluator.interviewerId}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 font-black flex items-center justify-center text-xs">
                            {evaluator.interviewerName.substring(0, 2)}
                          </div>
                          <h4 className="font-bold text-white text-sm">{evaluator.interviewerName}</h4>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          총 {evaluator.count}명 심사 제출
                        </span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${evaluator.tendencyBadgeColor.bg} ${evaluator.tendencyBadgeColor.text} ${evaluator.tendencyBadgeColor.border}`}>
                        {evaluator.tendencyLabel}
                      </span>
                    </div>

                    {/* Tendency Indicators (Leniency, StdDev, Agreement) */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 text-center font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block">평균 점수 (μ)</span>
                        <span className="text-base font-black text-amber-400">{evaluator.rawMean}</span>
                        <span className={`text-[10px] font-bold block ${evaluator.leniencyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {evaluator.leniencyDelta >= 0 ? `+${evaluator.leniencyDelta}` : evaluator.leniencyDelta}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block">표준편차 (σ)</span>
                        <span className="text-base font-black text-blue-400">{evaluator.rawStdDev}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {evaluator.rawStdDev >= 10 ? '우수 변별' : '중심화'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block">동료 일치율</span>
                        <span className="text-base font-black text-emerald-400">{evaluator.interRaterAgreementRate}%</span>
                        <span className="text-[10px] text-slate-500 block">
                          MAE {evaluator.interRaterMAE}점
                        </span>
                      </div>
                    </div>

                    {/* Leniency Visual Bar */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">채점 경향성 (엄격 ↔ 관대)</span>
                        <span className="font-mono text-slate-300">
                          {evaluator.leniencyDelta > 0 ? `+${evaluator.leniencyDelta}점 후함` : evaluator.leniencyDelta < 0 ? `${evaluator.leniencyDelta}점 엄격` : '표준'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full border border-slate-800 flex items-center px-0.5 relative">
                        {/* Center Mark */}
                        <div className="absolute left-1/2 -top-0.5 bottom-0.5 w-0.5 bg-slate-600" />
                        {/* Position Indicator */}
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${evaluator.leniencyDelta >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{
                            width: `${Math.min(Math.abs(evaluator.leniencyDelta) * 5, 45)}%`,
                            marginLeft: evaluator.leniencyDelta >= 0 ? '50%' : `${50 - Math.min(Math.abs(evaluator.leniencyDelta) * 5, 45)}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* AI Tendency Summary */}
                    <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                      {evaluator.tendencyDescription}
                    </p>

                    {/* Criteria Item Tendencies */}
                    <div className="space-y-1 pt-1 border-t border-slate-800/80 text-[11px]">
                      <span className="text-slate-400 font-semibold block text-[10px]">항목별 평균 격차 (전체 대비):</span>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                        {Object.values(evaluator.criteriaTendencies).map(ct => (
                          <div key={ct.criterionId} className="bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800/80 flex items-center justify-between">
                            <span className="text-slate-400 truncate">{ct.criterionName.split('.')[1] || ct.criterionName}:</span>
                            <span className={`font-bold ${ct.deltaFromGlobal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {ct.deltaFromGlobal >= 0 ? `+${ct.deltaFromGlobal}` : ct.deltaFromGlobal}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Standardized Z-Score Calibration Ranking Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Z-Score 기반 표준화 공정 보정 순위 시뮬레이터</span>
                </h3>
                <p className="text-xs text-slate-400">
                  면접관의 채점 편향(관대/엄격도 및 표준편차)을 정규화하여 엄격한 면접관 방에 배정되었던 지원자의 불이익을 방지합니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOnlyDiscrepancies(!showOnlyDiscrepancies)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    showOnlyDiscrepancies
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{showOnlyDiscrepancies ? '전체 보기' : '순위 변동/경계선만 필터'}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px]">
                    <th className="pb-3 px-3 text-center">보정 순위</th>
                    <th className="pb-3 px-3 text-center">순위 변동</th>
                    <th className="pb-3 px-3">지원자</th>
                    <th className="pb-3 px-3">분야</th>
                    <th className="pb-3 px-3 text-right">원점수 (Raw)</th>
                    <th className="pb-3 px-3 text-right">보정 환산점수</th>
                    <th className="pb-3 px-3 text-center">T-Score</th>
                    <th className="pb-3 px-3 text-center">공정 보정 상태 진단</th>
                    <th className="pb-3 px-3 text-center">세부</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {displayCandidateCalibrations.map((item) => {
                    const isExpanded = expandedCandidateId === item.candidate.id;
                    return (
                      <React.Fragment key={item.candidate.id}>
                        <tr
                          className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                            item.statusShift === 'SAVED_BY_CALIBRATION' ? 'bg-emerald-950/20' : ''
                          }`}
                          onClick={() => setExpandedCandidateId(isExpanded ? null : item.candidate.id)}
                        >
                          <td className="py-3 px-3 text-center">
                            <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 font-black flex items-center justify-center text-xs mx-auto border border-slate-700">
                              {item.calibratedRank}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-mono">
                            {item.rankDelta > 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 text-[10px]">
                                <ArrowUpRight className="w-3 h-3" />
                                +{item.rankDelta}
                              </span>
                            ) : item.rankDelta < 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30 text-[10px]">
                                <ArrowDownRight className="w-3 h-3" />
                                {item.rankDelta}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px] font-semibold">-</span>
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

                          <td className="py-3 px-3 text-right font-mono text-slate-400">
                            <span className="text-xs line-through text-slate-500 mr-1">{item.rawRank}위</span>
                            <span className="text-sm font-semibold">{item.rawScore}점</span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono">
                            <div className="flex items-baseline justify-end gap-1.5">
                              <span className="text-base font-black text-amber-400">
                                {item.calibratedScore}
                              </span>
                              <span className={`text-[10px] font-bold ${item.scoreDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ({item.scoreDelta >= 0 ? `+${item.scoreDelta}` : item.scoreDelta})
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center font-mono">
                            <span className="px-2 py-0.5 rounded bg-slate-950 text-blue-300 font-bold text-[11px] border border-slate-800">
                              T-{item.tScore}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            {item.statusShift === 'SAVED_BY_CALIBRATION' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                                <Sparkles className="w-3 h-3" />
                                깐깐한 심사 보정 구제 (합격선 진입)
                              </span>
                            ) : item.statusShift === 'DROPPED_BY_CALIBRATION' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                <AlertCircle className="w-3 h-3" />
                                과도한 관대 점수 거품 조정
                              </span>
                            ) : item.isBorderline ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                합격선 경계 (±3.5점)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 bg-slate-800">
                                정상 안정권
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                          </td>
                        </tr>

                        {/* Expanded Evaluator Breakdown Details */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80">
                            <td colSpan={9} className="p-4 border-b border-slate-800">
                              <div className="space-y-3 pl-4 border-l-2 border-amber-500 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white flex items-center gap-2">
                                    <span>{item.candidate.name} 지원자의 면접관별 Z-Score 표준화 내역</span>
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    산식: Z = (X - μ_i) / σ_i, 보정점수 = μ_global + (Z × σ_global)
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {item.evaluatorBreakdowns.map((eb, ebIdx) => (
                                    <div key={ebIdx} className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-white text-xs">{eb.interviewerName}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${eb.leniencyDelta >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                          {eb.leniencyDelta >= 0 ? `+${eb.leniencyDelta} 관대` : `${eb.leniencyDelta} 엄격`}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between font-mono text-[11px]">
                                        <span className="text-slate-400">부여 원점수:</span>
                                        <span className="text-white font-bold">{eb.rawEvaluatorScore}점</span>
                                      </div>
                                      <div className="flex items-center justify-between font-mono text-[11px]">
                                        <span className="text-slate-400">산출 Z-Score:</span>
                                        <span className="text-blue-300 font-bold">{eb.zScore}</span>
                                      </div>
                                      <div className="flex items-center justify-between font-mono text-[11px] pt-1 border-t border-slate-800">
                                        <span className="text-slate-300 font-semibold">보정 환산점:</span>
                                        <span className="text-amber-400 font-black">{eb.calibratedEvaluatorScore}점</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: High Discrepancy Candidates Panel */}
          {biasAnalysis.highDiscrepancyCandidates.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="text-base font-black text-white">
                    심사위원 간 극심한 이견(Discrepancy) 후보자 집중 검토
                  </h3>
                  <p className="text-xs text-slate-400">
                    동일 지원자에 대해 면접관 간 점수 편차가 10점 이상 발생한 지원자들의 상반된 정성 평가를 대조합니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {biasAnalysis.highDiscrepancyCandidates.map(disc => (
                  <div
                    key={disc.candidate.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <div className="font-bold text-white text-sm">{disc.candidate.name} ({disc.candidate.track})</div>
                        <span className="text-[10px] text-slate-400">{disc.candidate.studentId}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black font-mono">
                        점수차 {disc.scoreRange}점
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Highest Score */}
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          최고 평가: {disc.highestScore.interviewerName}
                        </span>
                        <div className="text-base font-black text-emerald-300 font-mono">
                          {disc.highestScore.score}점
                        </div>
                        {disc.highestScore.comment && (
                          <p className="text-[11px] text-slate-400 italic line-clamp-2">
                            "{disc.highestScore.comment}"
                          </p>
                        )}
                      </div>

                      {/* Lowest Score */}
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-rose-500/30 space-y-1">
                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          최저 평가: {disc.lowestScore.interviewerName}
                        </span>
                        <div className="text-base font-black text-rose-300 font-mono">
                          {disc.lowestScore.score}점
                        </div>
                        {disc.lowestScore.comment && (
                          <p className="text-[11px] text-slate-400 italic line-clamp-2">
                            "{disc.lowestScore.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: 5-INTERVIEWER SPARSE MATRIX & QUORUM ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === 'SPARSE_MATRIX' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Panel Operational Summary */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      5인 패널 희소 다면평가(Sparse Evaluation) & 정족수 실시간 현황
                    </h3>
                    <p className="text-xs text-slate-400">
                      모든 면접관이 전원 평가하지 않는 분산/로테이션 심사 환경에서도 공정성을 보장하는 다차원 매트릭스입니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="bg-purple-950/80 text-purple-300 border border-purple-800 px-3 py-1.5 rounded-xl font-bold font-mono">
                  패널 풀: {biasAnalysis.totalPanelPoolCount}명 ({biasAnalysis.allPanelInterviewerNames.join(', ') || '5인 배정'})
                </span>
              </div>
            </div>

            {/* Quorum Summary KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  정족수 충족 (3인 이상)
                </span>
                <div className="text-2xl font-black text-emerald-300 font-mono">
                  {biasAnalysis.candidateCalibrations.filter(c => c.quorumStatus === 'SUFFICIENT').length}
                  <span className="text-xs text-slate-500 font-normal ml-1">명</span>
                </div>
                <p className="text-[10px] text-slate-400">절사평균 및 Z-보정 신뢰도 높음</p>
              </div>

              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  부분 심사 (2인 평가)
                </span>
                <div className="text-2xl font-black text-blue-300 font-mono">
                  {biasAnalysis.candidateCalibrations.filter(c => c.quorumStatus === 'PARTIAL').length}
                  <span className="text-xs text-slate-500 font-normal ml-1">명</span>
                </div>
                <p className="text-[10px] text-slate-400">산술평균 기반 보정 적용</p>
              </div>

              <div className="p-4 bg-slate-950/80 border border-amber-500/30 rounded-2xl space-y-1 bg-amber-500/5">
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  단일 심사 경고 (1인)
                </span>
                <div className="text-2xl font-black text-amber-300 font-mono">
                  {biasAnalysis.candidateCalibrations.filter(c => c.quorumStatus === 'WARNING_SINGLE').length}
                  <span className="text-xs text-slate-500 font-normal ml-1">명</span>
                </div>
                <p className="text-[10px] text-amber-400/80">표본 부족 - 추가 심사 권장</p>
              </div>

              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  미심사 (0인)
                </span>
                <div className="text-2xl font-black text-slate-300 font-mono">
                  {biasAnalysis.candidateCalibrations.filter(c => c.quorumStatus === 'UNGRADED').length}
                  <span className="text-xs text-slate-500 font-normal ml-1">명</span>
                </div>
                <p className="text-[10px] text-slate-500">평가 대기 중</p>
              </div>
            </div>

            {/* Empirical Bayes Shrinkage Banner */}
            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-start gap-3 text-xs">
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-purple-200 flex items-center gap-2">
                  <span>베이지안 수축 정규화(Empirical Bayes Shrinkage) 자동 가동 중</span>
                  <span className="px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                    k = 3.0 Prior Weight
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  5인 면접관이 모든 지원자를 평가하지 않는 로테이션 환경에서는 특정 면접관의 심사 건수가 1~2건으로 적을 때 점수 왜곡이 일어날 수 있습니다. 본 시스템은 베이지안 수축 알고리즘을 적용하여 심사 건수가 적은 면접관의 평균을 전체 글로벌 평균(평균 {biasAnalysis.globalMean}점)으로 안전하게 수축 정규화하여 극단적인 Z-보정 오류를 사전에 차단합니다.
                </p>
              </div>
            </div>
          </div>

          {/* 2D Sparse Evaluation Matrix Grid */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                  <span>지원자별 5인 패널 채점 매트릭스 그리드</span>
                </h4>
                <p className="text-xs text-slate-400">
                  각 면접관이 부여한 원점수, 심사 참여 여부, 지원자 내 최고(초록)·최저(빨강) 점수 및 정족수를 한눈에 확인합니다.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-500 inline-block"></span>
                  최고점
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/30 border border-rose-500 inline-block"></span>
                  최저점
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700 inline-block"></span>
                  미참여
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/50">
                    <th className="py-3 px-3 w-40">지원자</th>
                    <th className="py-3 px-2 w-24 text-center">정족수 / 참여율</th>
                    {biasAnalysis.allPanelInterviewerNames.map(pName => (
                      <th key={pName} className="py-3 px-2 text-center font-mono">
                        <div className="text-white truncate max-w-[90px] mx-auto">{pName}</div>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {biasAnalysis.evaluatorMetrics.find(m => m.interviewerName === pName)?.count || 0}건 심사
                        </span>
                      </th>
                    ))}
                    <th className="py-3 px-2 text-center w-20">원점수</th>
                    <th className="py-3 px-2 text-center w-24">Z-보정점수</th>
                    <th className="py-3 px-2 text-center w-16">편차</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {biasAnalysis.sparseMatrixRows.map(row => {
                    const { candidate, cells, evalCount, totalPanelCount, rawScore, calibratedScore, scoreRange, quorumStatus } = row;

                    let quorumBadge = (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold font-mono text-[10px]">
                        {evalCount}/{totalPanelCount}명 (충족)
                      </span>
                    );

                    if (quorumStatus === 'PARTIAL') {
                      quorumBadge = (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold font-mono text-[10px]">
                          {evalCount}/{totalPanelCount}명 (부분)
                        </span>
                      );
                    } else if (quorumStatus === 'WARNING_SINGLE') {
                      quorumBadge = (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-mono text-[10px] animate-pulse">
                          ⚠️ {evalCount}/{totalPanelCount}명 (보완 권장)
                        </span>
                      );
                    } else if (quorumStatus === 'UNGRADED') {
                      quorumBadge = (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 font-bold font-mono text-[10px]">
                          0/{totalPanelCount}명 (미심사)
                        </span>
                      );
                    }

                    return (
                      <tr key={candidate.id} className="hover:bg-slate-950/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{candidate.name}</span>
                            {candidate.track && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {candidate.track}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{candidate.studentId}</span>
                        </td>

                        <td className="py-3 px-2 text-center">
                          {quorumBadge}
                        </td>

                        {biasAnalysis.allPanelInterviewerNames.map(pName => {
                          const cell = cells[pName];

                          if (!cell || cell.status === 'UNASSIGNED') {
                            return (
                              <td key={pName} className="py-3 px-2 text-center text-slate-600 font-mono">
                                <span className="inline-block px-2 py-1 rounded bg-slate-950/40 border border-slate-800/40 text-[11px]">
                                  -
                                </span>
                              </td>
                            );
                          }

                          if (cell.status === 'IN_PROGRESS') {
                            return (
                              <td key={pName} className="py-3 px-2 text-center">
                                <span className="inline-block px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                  평가중
                                </span>
                              </td>
                            );
                          }

                          let borderStyle = 'border-slate-800 bg-slate-950';
                          let textStyle = 'text-white';

                          if (cell.isHighestInCandidate) {
                            borderStyle = 'border-emerald-500/50 bg-emerald-950/30';
                            textStyle = 'text-emerald-300 font-black';
                          } else if (cell.isLowestInCandidate) {
                            borderStyle = 'border-rose-500/50 bg-rose-950/30';
                            textStyle = 'text-rose-300 font-black';
                          }

                          return (
                            <td key={pName} className="py-3 px-2 text-center font-mono">
                              <div className={`inline-block px-2.5 py-1 rounded-lg border text-xs ${borderStyle} ${textStyle} shadow-2xs`}>
                                <span>{cell.rawScore}점</span>
                                {cell.zScore !== undefined && (
                                  <span className="block text-[9px] text-slate-400 font-normal">
                                    Z: {cell.zScore > 0 ? `+${cell.zScore}` : cell.zScore}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        <td className="py-3 px-2 text-center font-mono font-bold text-slate-300">
                          {evalCount > 0 ? `${rawScore}점` : '-'}
                        </td>

                        <td className="py-3 px-2 text-center font-mono font-black text-amber-400">
                          {evalCount > 0 ? `${calibratedScore}점` : '-'}
                        </td>

                        <td className="py-3 px-2 text-center font-mono text-[11px]">
                          {scoreRange > 0 ? (
                            <span className={scoreRange >= 10 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                              Δ {scoreRange}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evaluator Workload & Bayes Regularization Breakdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <Scale className="w-5 h-5 text-purple-400" />
              <div>
                <h4 className="text-base font-black text-white">
                  5인 면접관별 심사 참여율 & 베이지안 수축 보정 내역
                </h4>
                <p className="text-xs text-slate-400">
                  각 면접관의 심사 표본 수에 따라 원평균이 어떻게 안정적으로 수축 정규화(Shrunk Mean)되는지 검증합니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {biasAnalysis.evaluatorMetrics.map(em => (
                <div
                  key={em.interviewerId}
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">
                        {em.interviewerName.substring(0, 1)}
                      </div>
                      <span>{em.interviewerName}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      참여율 {em.coverageRate}% ({em.count}명)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 space-y-0.5">
                      <span className="text-[10px] text-slate-500 block">원평균 (Raw μ)</span>
                      <span className="text-sm font-bold text-slate-200">{em.rawMean}점</span>
                    </div>
                    <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-0.5">
                      <span className="text-[10px] text-purple-300 block">수축평균 (Shrunk μ)</span>
                      <span className="text-sm font-black text-purple-200">{em.shrunkMean}점</span>
                    </div>
                  </div>

                  <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>편향 성향: <strong className={em.tendencyBadgeColor.text}>{em.tendencyLabel.split('(')[0]}</strong></span>
                    <span className="font-mono text-slate-500">Δ {em.leniencyDelta > 0 ? `+${em.leniencyDelta}` : em.leniencyDelta}점</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INTERVIEWER DETAILED CARDS & FAVORITES */}
      {/* ========================================================================= */}
      {activeTab === 'INTERVIEWER_STATS' && (
        <div className="space-y-4 animate-fade-in">
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
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${stat.biasMetric?.tendencyBadgeColor.bg || 'bg-blue-500/10'} ${stat.biasMetric?.tendencyBadgeColor.text || 'text-blue-400'} ${stat.biasMetric?.tendencyBadgeColor.border || 'border-blue-500/30'}`}>
                        {stat.biasMetric?.tendencyLabel || '표준 심사형'}
                      </span>
                    </div>
                  </div>

                  {/* Score Summary Metrics */}
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

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>가장 높게 점수를 준 항목: <strong className="text-white">{stat.highestCategory?.name.split('.')[1] || stat.highestCategory?.name}</strong></span>
                  <span className="text-amber-400 font-semibold font-mono">가중치 {stat.highestCategory?.weight}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GLOBAL CRITERIA STATS & SCORE DISTRIBUTION */}
      {/* ========================================================================= */}
      {activeTab === 'GLOBAL_DISTRIBUTION' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fade-in">
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
      )}
    </div>
  );
};

