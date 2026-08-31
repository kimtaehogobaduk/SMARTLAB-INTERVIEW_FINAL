import { Candidate, Evaluation, EvaluationCriterion, PlatformSettings, ScoringFormula } from '../types';
import { calculateEvaluatorScore, calculateAggregatedScore } from './scoring';

export type EvaluatorTendencyType =
  | 'LENIENT' // 관대형 (점수를 후하게 줌)
  | 'STRICT' // 엄격형 (점수를 짜게 줌)
  | 'CENTRAL' // 중심화형 (중간 점수 몰아주기, 변별력 낮음)
  | 'DISCRIMINATING' // 고변별형 (잘한 사람과 못한 사람 점수 차가 큼)
  | 'BALANCED'; // 균형형 (표준적인 채점 분포)

export type QuorumStatus = 'SUFFICIENT' | 'PARTIAL' | 'WARNING_SINGLE' | 'UNGRADED';

export interface EvaluatorBiasMetrics {
  interviewerId: string;
  interviewerName: string;
  count: number; // 심사한 지원자 수
  coverageRate: number; // 전체 지원자 대비 심사 참여율 (%)
  rawMean: number; // 면접관 평균 부여 점수 (μ_i)
  rawStdDev: number; // 면접관 채점 표준편차 (σ_i)
  shrunkMean: number; // 베이지안 수축 정규화 평균 (Empirical Bayes Shrinkage)
  shrunkStdDev: number; // 베이지안 수축 정규화 표준편차
  minScore: number;
  maxScore: number;
  leniencyDelta: number; // 전체 평균과의 격차 (μ_i - μ_global)
  discriminationScore: number; // 변별력 지수 (표준편차 기반 0~100)
  interRaterMAE: number; // 다른 심사위원과의 평균 절대 편차 (Mean Absolute Error)
  interRaterAgreementRate: number; // 다른 심사위원과의 일치도 (0 ~ 100%)
  tendencyType: EvaluatorTendencyType;
  tendencyLabel: string;
  tendencyDescription: string;
  tendencyBadgeColor: {
    bg: string;
    text: string;
    border: string;
  };
  criteriaTendencies: Record<string, {
    criterionId: string;
    criterionName: string;
    mean: number;
    deltaFromGlobal: number; // 해당 항목 전체 평균 대비 차이
  }>;
}

export interface CandidateCalibrationResult {
  candidate: Candidate;
  evalCount: number;
  totalPanelCount: number; // 전체 면접관 풀 규모 (통상 5명)
  coverageRate: number; // 패널 참여율 (%)
  quorumStatus: QuorumStatus;
  quorumMessage: string;
  missingInterviewers: string[]; // 아직 심사하지 않은 면접관 목록
  evaluatedInterviewers: string[]; // 심사 완료한 면접관 목록
  rawScore: number;
  rawRank: number;
  calibratedScore: number; // Z-Score 기반 전체 스케일 역환산 보정 점수
  calibratedRank: number;
  rankDelta: number; // calibratedRank - rawRank (양수면 순위 상승, 음수면 순위 하락)
  scoreDelta: number; // calibratedScore - rawScore
  tScore: number; // T-점수 (평균 50, 표준편차 10)
  scoreRange: number; // 참여한 면접관 간 최고점 - 최저점 차이
  evaluatorBreakdowns: {
    interviewerName: string;
    rawEvaluatorScore: number;
    zScore: number;
    calibratedEvaluatorScore: number;
    leniencyDelta: number;
  }[];
  isBorderline: boolean; // 합격선 근처(±3점) 지원자인지 여부
  rawPassed: boolean;
  calibratedPassed: boolean;
  statusShift?: 'SAVED_BY_CALIBRATION' | 'DROPPED_BY_CALIBRATION' | 'UNCHANGED';
}

export interface DiscrepancyCandidateInsight {
  candidate: Candidate;
  scoreRange: number; // 최고점 - 최저점
  highestScore: {
    interviewerName: string;
    score: number;
    comment?: string;
  };
  lowestScore: {
    interviewerName: string;
    score: number;
    comment?: string;
  };
  allEvaluations: {
    interviewerName: string;
    score: number;
    comment?: string;
  }[];
}

export interface SparseMatrixCell {
  interviewerName: string;
  candidateId: string;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'UNASSIGNED';
  rawScore?: number;
  calibratedScore?: number;
  zScore?: number;
  isHighestInCandidate?: boolean;
  isLowestInCandidate?: boolean;
  isOutlier?: boolean; // 해당 지원자 평균 대비 7점 이상 벗어난 경우
}

export interface SparseMatrixRow {
  candidate: Candidate;
  cells: Record<string, SparseMatrixCell>; // interviewerName -> SparseMatrixCell
  evalCount: number;
  totalPanelCount: number;
  rawScore: number;
  calibratedScore: number;
  scoreRange: number;
  quorumStatus: QuorumStatus;
}

export interface ComprehensiveBiasAnalysisResult {
  globalMean: number;
  globalStdDev: number;
  totalEvaluationsCount: number;
  evaluatorsCount: number;
  totalPanelPoolCount: number;
  candidatesCount: number;
  evaluatorMetrics: EvaluatorBiasMetrics[];
  candidateCalibrations: CandidateCalibrationResult[];
  highDiscrepancyCandidates: DiscrepancyCandidateInsight[];
  sparseMatrixRows: SparseMatrixRow[];
  allPanelInterviewerNames: string[];
  passThreshold: number;
}

/**
 * Calculates comprehensive bias correction metrics, Z/T scores, and discrepancy analysis
 * designed for sparse/fractional multi-rater panels (e.g. ~5 interviewers where not all evaluate every candidate).
 */
export function calculateComprehensiveBiasAnalysis(
  candidates: Candidate[],
  allEvaluations: Evaluation[],
  criteria: EvaluationCriterion[],
  passThreshold: number = 70,
  scoringFormula: ScoringFormula = 'TRIMMED_MEAN',
  expectedPanelPool: string[] = []
): ComprehensiveBiasAnalysisResult {
  // 1. Filter valid evaluations & candidates
  const activeCandidates = candidates.filter(c => c.status !== 'NO_SHOW');
  const activeCandidateIds = new Set(activeCandidates.map(c => c.id));
  const submittedEvals = allEvaluations.filter(
    e => e.status === 'SUBMITTED' && activeCandidateIds.has(e.candidateId)
  );

  // Group evaluations by interviewer
  const evalsByInterviewer = new Map<string, { name: string; evals: Evaluation[] }>();
  submittedEvals.forEach(e => {
    const key = e.interviewerName || e.interviewerId || '알 수 없는 면접관';
    if (!evalsByInterviewer.has(key)) {
      evalsByInterviewer.set(key, { name: key, evals: [] });
    }
    evalsByInterviewer.get(key)!.evals.push(e);
  });

  // Collect all distinct panel names
  const allDistinctPanelNames = new Set<string>();
  expectedPanelPool.forEach(name => { if (name && name.trim()) allDistinctPanelNames.add(name.trim()); });
  allEvaluations.forEach(e => { if (e.interviewerName) allDistinctPanelNames.add(e.interviewerName); });
  evalsByInterviewer.forEach((_, name) => allDistinctPanelNames.add(name));
  const panelNamesList = Array.from(allDistinctPanelNames);
  const totalPanelPoolCount = Math.max(panelNamesList.length, 5); // default pool size 5 if sparse

  // Calculate evaluator-level weighted total scores for all submissions
  const evalScoreMap = new Map<string, number>(); // eval.id -> totalScore
  const allRawScores: number[] = [];

  submittedEvals.forEach(e => {
    const res = calculateEvaluatorScore(e.scores, e.presentationBonuses, criteria);
    evalScoreMap.set(e.id, res.totalScore);
    allRawScores.push(res.totalScore);
  });

  // Global mean & standard deviation across all evaluations
  const totalEvalsCount = allRawScores.length;
  const globalMean = totalEvalsCount > 0
    ? allRawScores.reduce((sum, val) => sum + val, 0) / totalEvalsCount
    : 75;

  const globalVariance = totalEvalsCount > 1
    ? allRawScores.reduce((sum, val) => sum + Math.pow(val - globalMean, 2), 0) / (totalEvalsCount - 1)
    : 100;
  const globalStdDev = Math.max(Math.sqrt(globalVariance), 3.0); // minimum 3.0 std dev to prevent divide by zero

  // Category global means
  const categoryGlobalMeans: Record<string, number> = {};
  criteria.forEach(crit => {
    const catScores = submittedEvals
      .map(e => Number(e.scores?.[crit.id] ?? 0))
      .filter(s => s > 0);
    categoryGlobalMeans[crit.id] = catScores.length > 0
      ? catScores.reduce((s, v) => s + v, 0) / catScores.length
      : 75;
  });

  // 2. Compute individual Evaluator Metrics with Bayesian Shrinkage (소표본 수축 보정)
  const evaluatorMetrics: EvaluatorBiasMetrics[] = [];
  const candidateTotalCount = activeCandidates.length;

  evalsByInterviewer.forEach((data, interviewerKey) => {
    const interviewerEvals = data.evals;
    const count = interviewerEvals.length;
    const scores = interviewerEvals.map(e => evalScoreMap.get(e.id) || 0);

    const rawMean = count > 0 ? scores.reduce((s, v) => s + v, 0) / count : 0;
    const sampleVar = count > 1
      ? scores.reduce((s, v) => s + Math.pow(v - rawMean, 2), 0) / (count - 1)
      : (count === 1 ? 0 : 0);
    const rawStdDev = Math.sqrt(sampleVar);

    // Bayesian Shrinkage (Empirical Bayes) for small sample sizes:
    // Shrink mean towards global mean: μ_shrunk = (n * μ_i + k * μ_global) / (n + k)
    const shrinkageK = 3.0; // prior weight of 3 evaluations
    const shrunkMean = (count * rawMean + shrinkageK * globalMean) / (count + shrinkageK);

    // Regularize standard deviation towards globalStdDev
    const shrunkVar = ((Math.max(0, count - 1) * sampleVar) + (shrinkageK * globalVariance)) / (Math.max(0, count - 1) + shrinkageK);
    const shrunkStdDev = Math.max(Math.sqrt(shrunkVar), 2.5);

    const minScore = count > 0 ? Math.min(...scores) : 0;
    const maxScore = count > 0 ? Math.max(...scores) : 0;
    const leniencyDelta = count > 0 ? shrunkMean - globalMean : 0;

    const coverageRate = candidateTotalCount > 0 ? Math.round((count / candidateTotalCount) * 100) : 0;

    // Inter-Rater Mean Absolute Error (MAE) compared to other evaluators on the same candidates
    let totalAbsDiff = 0;
    let comparisonsCount = 0;

    interviewerEvals.forEach(myEval => {
      const myScore = evalScoreMap.get(myEval.id) || 0;
      const peerEvals = submittedEvals.filter(
        e => e.candidateId === myEval.candidateId && (e.interviewerName || e.interviewerId) !== interviewerKey
      );

      if (peerEvals.length > 0) {
        const peerScores = peerEvals.map(pe => evalScoreMap.get(pe.id) || 0);
        const peerAvg = peerScores.reduce((s, v) => s + v, 0) / peerScores.length;
        totalAbsDiff += Math.abs(myScore - peerAvg);
        comparisonsCount++;
      }
    });

    const interRaterMAE = comparisonsCount > 0 ? totalAbsDiff / comparisonsCount : 0;
    const interRaterAgreementRate = Math.max(0, Math.min(100, Math.round(100 - (interRaterMAE * 3.33))));

    // Discrimination score based on std dev
    const discriminationScore = Math.min(100, Math.round((shrunkStdDev / 15) * 100));

    // Determine tendency type using shrunk metrics
    let tendencyType: EvaluatorTendencyType = 'BALANCED';
    let tendencyLabel = '균형/표준 심사형';
    let tendencyDescription = '전체 면접관 평균과 유사한 점수 부여 패턴을 보이며 공정한 표준 기준을 유지하고 있습니다.';
    let tendencyBadgeColor = {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30'
    };

    if (count >= 1) {
      if (leniencyDelta >= 3.0) {
        tendencyType = 'LENIENT';
        tendencyLabel = '호의/잠재력 격려형 (관대함)';
        tendencyDescription = `전체 평균 대비 +${leniencyDelta.toFixed(1)}점 높게 채점하는 경향이 있어, 표준화 보정 시 다소 점수가 조정됩니다.`;
        tendencyBadgeColor = {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/30'
        };
      } else if (leniencyDelta <= -3.0) {
        tendencyType = 'STRICT';
        tendencyLabel = '엄격 기준/팩트 검증형 (엄격함)';
        tendencyDescription = `전체 평균 대비 ${leniencyDelta.toFixed(1)}점 엄격하게 채점하는 경향이 있어, 표준화 보정 시 지원자의 점수가 상향 보정됩니다.`;
        tendencyBadgeColor = {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/30'
        };
      } else if (shrunkStdDev >= 11.0) {
        tendencyType = 'DISCRIMINATING';
        tendencyLabel = '고변별력/양극화 분별형';
        tendencyDescription = '우수자와 보완 대상자 간 점수 격차가 뚜렷하여 탁월한 분별력을 보이고 있습니다.';
        tendencyBadgeColor = {
          bg: 'bg-purple-500/10',
          text: 'text-purple-400',
          border: 'border-purple-500/30'
        };
      } else if (shrunkStdDev < 4.0 && count >= 3) {
        tendencyType = 'CENTRAL';
        tendencyLabel = '중심화 집중형 (안전 채점)';
        tendencyDescription = '특정 점수대(중간 점수)에 몰아서 채점하는 경향이 있어 지원자 간 변별력이 낮을 수 있습니다.';
        tendencyBadgeColor = {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/30'
        };
      }
    }

    // Category breakdown tendencies
    const criteriaTendencies: Record<string, { criterionId: string; criterionName: string; mean: number; deltaFromGlobal: number }> = {};
    criteria.forEach(crit => {
      const critScores = interviewerEvals
        .map(e => Number(e.scores?.[crit.id] ?? 0))
        .filter(s => s > 0);
      const cMean = critScores.length > 0 ? critScores.reduce((s, v) => s + v, 0) / critScores.length : 0;
      const gMean = categoryGlobalMeans[crit.id] || 75;
      criteriaTendencies[crit.id] = {
        criterionId: crit.id,
        criterionName: crit.name,
        mean: Number(cMean.toFixed(1)),
        deltaFromGlobal: Number((cMean - gMean).toFixed(1))
      };
    });

    evaluatorMetrics.push({
      interviewerId: interviewerKey,
      interviewerName: data.name,
      count,
      coverageRate,
      rawMean: Number(rawMean.toFixed(1)),
      rawStdDev: Number(rawStdDev.toFixed(1)),
      shrunkMean: Number(shrunkMean.toFixed(1)),
      shrunkStdDev: Number(shrunkStdDev.toFixed(1)),
      minScore: Number(minScore.toFixed(1)),
      maxScore: Number(maxScore.toFixed(1)),
      leniencyDelta: Number(leniencyDelta.toFixed(1)),
      discriminationScore,
      interRaterMAE: Number(interRaterMAE.toFixed(1)),
      interRaterAgreementRate,
      tendencyType,
      tendencyLabel,
      tendencyDescription,
      tendencyBadgeColor,
      criteriaTendencies
    });
  });

  // Build Map for fast lookups
  const evaluatorMetricsMap = new Map<string, EvaluatorBiasMetrics>();
  evaluatorMetrics.forEach(em => {
    evaluatorMetricsMap.set(em.interviewerId, em);
    evaluatorMetricsMap.set(em.interviewerName, em);
  });

  // 3. Compute Candidate Standardized (Z-Score & Calibrated) Scores with Quorum & Sparse Analysis
  const initialCandidateList = activeCandidates.map(candidate => {
    const cEvals = submittedEvals.filter(e => e.candidateId === candidate.id);
    const count = cEvals.length;

    // Evaluated interviewers
    const evaluatedInterviewers = cEvals.map(e => e.interviewerName || '심사위원');
    const missingInterviewers = panelNamesList.filter(name => !evaluatedInterviewers.includes(name));

    // Quorum status determination
    let quorumStatus: QuorumStatus = 'SUFFICIENT';
    let quorumMessage = `${count}/${totalPanelPoolCount}명 심사 완료 (정족수 충족)`;

    if (count === 0) {
      quorumStatus = 'UNGRADED';
      quorumMessage = '미심사 (제출된 평가 없음)';
    } else if (count === 1) {
      quorumStatus = 'WARNING_SINGLE';
      quorumMessage = '단일 심사자(1명) 평가 - 타 면접관 추가 검토 권장';
    } else if (count === 2) {
      quorumStatus = 'PARTIAL';
      quorumMessage = `2/${totalPanelPoolCount}명 심사 완료 (부분 평가)`;
    } else {
      quorumStatus = 'SUFFICIENT';
      quorumMessage = `${count}/${totalPanelPoolCount}명 심사 완료`;
    }

    const coverageRate = Math.round((count / totalPanelPoolCount) * 100);

    // Raw scores by each evaluator
    const rawEvaluatorScores: number[] = [];
    const calibratedEvaluatorScores: number[] = [];
    const zScores: number[] = [];
    const evaluatorBreakdowns: CandidateCalibrationResult['evaluatorBreakdowns'] = [];

    cEvals.forEach(e => {
      const rawScore = evalScoreMap.get(e.id) || 0;
      rawEvaluatorScores.push(rawScore);

      const intvKey = e.interviewerName || e.interviewerId || '';
      const em = evaluatorMetricsMap.get(intvKey);

      // Robust Bayesian Z-Score for this evaluator: Z = (X - μ_shrunk) / σ_shrunk
      let z = 0;
      if (em) {
        z = (rawScore - em.shrunkMean) / em.shrunkStdDev;
      } else {
        z = (rawScore - globalMean) / globalStdDev;
      }

      // Clamp Z between -3.0 and +3.0 to prevent extreme outliers
      z = Math.max(-3.0, Math.min(3.0, z));
      zScores.push(z);

      // Calibrated score restored to global distribution: X_cal = μ_global + (Z * σ_global)
      let calScore = globalMean + (z * globalStdDev);
      calScore = Math.max(0, Math.min(100, calScore));
      calibratedEvaluatorScores.push(calScore);

      evaluatorBreakdowns.push({
        interviewerName: e.interviewerName || '심사위원',
        rawEvaluatorScore: Number(rawScore.toFixed(1)),
        zScore: Number(z.toFixed(2)),
        calibratedEvaluatorScore: Number(calScore.toFixed(1)),
        leniencyDelta: em ? em.leniencyDelta : 0
      });
    });

    const rawScore = count > 0 ? calculateAggregatedScore(rawEvaluatorScores, scoringFormula) : 0;
    const calibratedScore = count > 0 ? calculateAggregatedScore(calibratedEvaluatorScores, scoringFormula) : 0;

    const scoreRange = rawEvaluatorScores.length >= 2
      ? Number((Math.max(...rawEvaluatorScores) - Math.min(...rawEvaluatorScores)).toFixed(1))
      : 0;

    const avgZ = zScores.length > 0 ? zScores.reduce((s, v) => s + v, 0) / zScores.length : 0;
    const tScore = Number((50 + (10 * avgZ)).toFixed(1));

    const isBorderline = Math.abs(rawScore - passThreshold) <= 3.5 || Math.abs(calibratedScore - passThreshold) <= 3.5;
    const rawPassed = rawScore >= passThreshold;
    const calibratedPassed = calibratedScore >= passThreshold;

    let statusShift: CandidateCalibrationResult['statusShift'] = 'UNCHANGED';
    if (!rawPassed && calibratedPassed) {
      statusShift = 'SAVED_BY_CALIBRATION';
    } else if (rawPassed && !calibratedPassed) {
      statusShift = 'DROPPED_BY_CALIBRATION';
    }

    return {
      candidate,
      evalCount: count,
      totalPanelCount: totalPanelPoolCount,
      coverageRate,
      quorumStatus,
      quorumMessage,
      missingInterviewers,
      evaluatedInterviewers,
      rawScore: Number(rawScore.toFixed(1)),
      calibratedScore: Number(calibratedScore.toFixed(1)),
      scoreDelta: Number((calibratedScore - rawScore).toFixed(1)),
      scoreRange,
      tScore,
      evaluatorBreakdowns,
      isBorderline,
      rawPassed,
      calibratedPassed,
      statusShift,
      rawRank: 0,
      calibratedRank: 0,
      rankDelta: 0
    };
  });

  // Calculate Raw Ranks
  const sortedByRaw = [...initialCandidateList].sort((a, b) => b.rawScore - a.rawScore);
  sortedByRaw.forEach((item, index) => {
    item.rawRank = index + 1;
  });

  // Calculate Calibrated Ranks
  const sortedByCalibrated = [...initialCandidateList].sort((a, b) => b.calibratedScore - a.calibratedScore);
  sortedByCalibrated.forEach((item, index) => {
    item.calibratedRank = index + 1;
    item.rankDelta = item.rawRank - item.calibratedRank;
  });

  const candidateCalibrations = sortedByCalibrated;

  // 4. High Discrepancy Candidates (where evaluator scores differ by >= 10 points)
  const highDiscrepancyCandidates: DiscrepancyCandidateInsight[] = [];

  activeCandidates.forEach(candidate => {
    const cEvals = submittedEvals.filter(e => e.candidateId === candidate.id);
    if (cEvals.length >= 2) {
      const withScores = cEvals.map(e => ({
        interviewerName: e.interviewerName || '심사위원',
        score: evalScoreMap.get(e.id) || 0,
        comment: e.comments?.overallComment || e.comments?.technicalNote || e.comments?.attitudeNote || ''
      })).sort((a, b) => b.score - a.score);

      const max = withScores[0];
      const min = withScores[withScores.length - 1];
      const scoreRange = Number((max.score - min.score).toFixed(1));

      if (scoreRange >= 10.0) {
        highDiscrepancyCandidates.push({
          candidate,
          scoreRange,
          highestScore: max,
          lowestScore: min,
          allEvaluations: withScores
        });
      }
    }
  });

  highDiscrepancyCandidates.sort((a, b) => b.scoreRange - a.scoreRange);

  // 5. Build 2D Sparse Matrix Rows for all candidates x all panel interviewers
  const sparseMatrixRows: SparseMatrixRow[] = activeCandidates.map(candidate => {
    const cEvals = allEvaluations.filter(e => e.candidateId === candidate.id);
    const submittedCEvals = cEvals.filter(e => e.status === 'SUBMITTED');
    const calib = candidateCalibrations.find(c => c.candidate.id === candidate.id);

    const cells: Record<string, SparseMatrixCell> = {};
    const candScores: { name: string; score: number }[] = [];

    panelNamesList.forEach(pName => {
      const targetEval = cEvals.find(e => (e.interviewerName === pName || e.interviewerId === pName));
      if (!targetEval) {
        cells[pName] = {
          interviewerName: pName,
          candidateId: candidate.id,
          status: 'UNASSIGNED'
        };
      } else if (targetEval.status === 'SUBMITTED') {
        const rawScore = evalScoreMap.get(targetEval.id) || 0;
        candScores.push({ name: pName, score: rawScore });
        const em = evaluatorMetricsMap.get(pName);
        const z = em ? (rawScore - em.shrunkMean) / em.shrunkStdDev : (rawScore - globalMean) / globalStdDev;
        const cal = Math.max(0, Math.min(100, globalMean + (z * globalStdDev)));

        cells[pName] = {
          interviewerName: pName,
          candidateId: candidate.id,
          status: 'SUBMITTED',
          rawScore: Number(rawScore.toFixed(1)),
          calibratedScore: Number(cal.toFixed(1)),
          zScore: Number(z.toFixed(2))
        };
      } else {
        cells[pName] = {
          interviewerName: pName,
          candidateId: candidate.id,
          status: 'IN_PROGRESS'
        };
      }
    });

    // Mark highest, lowest, and outliers
    if (candScores.length >= 2) {
      const maxVal = Math.max(...candScores.map(c => c.score));
      const minVal = Math.min(...candScores.map(c => c.score));
      const avgVal = candScores.reduce((s, v) => s + v.score, 0) / candScores.length;

      candScores.forEach(c => {
        const cell = cells[c.name];
        if (cell && cell.rawScore !== undefined) {
          if (cell.rawScore === maxVal && maxVal !== minVal) cell.isHighestInCandidate = true;
          if (cell.rawScore === minVal && maxVal !== minVal) cell.isLowestInCandidate = true;
          if (Math.abs(cell.rawScore - avgVal) >= 7.0) cell.isOutlier = true;
        }
      });
    }

    return {
      candidate,
      cells,
      evalCount: submittedCEvals.length,
      totalPanelCount: totalPanelPoolCount,
      rawScore: calib?.rawScore || 0,
      calibratedScore: calib?.calibratedScore || 0,
      scoreRange: calib?.scoreRange || 0,
      quorumStatus: calib?.quorumStatus || 'UNGRADED'
    };
  });

  return {
    globalMean: Number(globalMean.toFixed(1)),
    globalStdDev: Number(globalStdDev.toFixed(1)),
    totalEvaluationsCount: totalEvalsCount,
    evaluatorsCount: evaluatorMetrics.length,
    totalPanelPoolCount,
    candidatesCount: activeCandidates.length,
    evaluatorMetrics,
    candidateCalibrations,
    highDiscrepancyCandidates,
    sparseMatrixRows,
    allPanelInterviewerNames: panelNamesList,
    passThreshold
  };
}

