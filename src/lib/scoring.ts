import { Evaluation, EvaluationCriterion, ScoringFormula, PlatformSettings } from '../types';

export const DEFAULT_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'technical',
    name: '1. 기술 직무 역량',
    description: '직무 이해도, 기술 스택 깊이, 문제 접근 논리',
    weight: 40,
    maxScore: 100,
    color: 'blue'
  },
  {
    id: 'problemSolving',
    name: '2. 논리적 문제 해결력',
    description: '돌발 질문 대응, 트러블슈팅 논리, 한계 극복 경험',
    weight: 30,
    maxScore: 100,
    color: 'purple'
  },
  {
    id: 'communication',
    name: '3. 의사소통 및 전달력',
    description: '두괄식 설명, 경청 태도 및 질문 의도 파악 역량',
    weight: 20,
    maxScore: 100,
    color: 'emerald'
  },
  {
    id: 'cultureFit',
    name: '4. 동아리 적합도 & 성장성',
    description: 'SmartLab 문화 수용성, 열정 및 협업 주도성',
    weight: 10,
    maxScore: 100,
    color: 'amber'
  }
];

export interface CriterionColorStyle {
  badge: string;
  text: string;
  ring: string;
  dot: string;
  accent: string;
  bonusBg: string;
  bonusBorder: string;
}

export const COLOR_MAP: Record<string, CriterionColorStyle> = {
  blue: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    text: 'text-blue-700',
    ring: 'focus:ring-blue-500',
    dot: 'bg-blue-600',
    accent: 'accent-blue-600',
    bonusBg: 'bg-blue-50/50',
    bonusBorder: 'border-blue-200/60'
  },
  purple: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    text: 'text-purple-700',
    ring: 'focus:ring-purple-500',
    dot: 'bg-purple-600',
    accent: 'accent-purple-600',
    bonusBg: 'bg-purple-50/50',
    bonusBorder: 'border-purple-200/60'
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
    ring: 'focus:ring-emerald-500',
    dot: 'bg-emerald-600',
    accent: 'accent-emerald-600',
    bonusBg: 'bg-emerald-50/50',
    bonusBorder: 'border-emerald-200/60'
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
    ring: 'focus:ring-amber-500',
    dot: 'bg-amber-600',
    accent: 'accent-amber-600',
    bonusBg: 'bg-amber-50/50',
    bonusBorder: 'border-amber-200/60'
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
    ring: 'focus:ring-rose-500',
    dot: 'bg-rose-600',
    accent: 'accent-rose-600',
    bonusBg: 'bg-rose-50/50',
    bonusBorder: 'border-rose-200/60'
  },
  cyan: {
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    text: 'text-cyan-700',
    ring: 'focus:ring-cyan-500',
    dot: 'bg-cyan-600',
    accent: 'accent-cyan-600',
    bonusBg: 'bg-cyan-50/50',
    bonusBorder: 'border-cyan-200/60'
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    text: 'text-indigo-700',
    ring: 'focus:ring-indigo-500',
    dot: 'bg-indigo-600',
    accent: 'accent-indigo-600',
    bonusBg: 'bg-indigo-50/50',
    bonusBorder: 'border-indigo-200/60'
  }
};

/**
 * Calculates weighted score, presentation bonus, and total score for a single evaluation.
 */
export function calculateEvaluatorScore(
  scores: Record<string, number> | undefined,
  bonuses: Record<string, number> | undefined,
  criteria: EvaluationCriterion[]
): { baseScore: number; bonusScore: number; totalScore: number } {
  if (!scores) {
    return { baseScore: 0, bonusScore: 0, totalScore: 0 };
  }

  let baseSum = 0;
  let bonusSum = 0;

  criteria.forEach(crit => {
    const rawScore = Number(scores[crit.id]) || 0;
    const weight = Number(crit.weight) || 0;
    const bonus = Number(bonuses?.[crit.id]) || 0;

    baseSum += (rawScore * weight) / 100;
    bonusSum += bonus;
  });

  const totalSum = baseSum + bonusSum;

  return {
    baseScore: Math.round(baseSum * 10) / 10,
    bonusScore: Math.round(bonusSum * 10) / 10,
    totalScore: Math.round(totalSum * 10) / 10
  };
}

/**
 * Calculates candidate final aggregated score from all evaluators based on platform formula.
 */
export function calculateAggregatedScore(
  evaluatorScores: number[],
  formula: ScoringFormula = 'TRIMMED_MEAN'
): number {
  const count = evaluatorScores.length;
  if (count === 0) return 0;

  if (formula === 'TRIMMED_MEAN' && count >= 3) {
    const sorted = [...evaluatorScores].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, -1);
    const sum = trimmed.reduce((a, b) => a + b, 0);
    return Math.round((sum / trimmed.length) * 10) / 10;
  }

  if (formula === 'MEDIAN') {
    const sorted = [...evaluatorScores].sort((a, b) => a - b);
    const mid = Math.floor(count / 2);
    if (count % 2 !== 0) {
      return Math.round(sorted[mid] * 10) / 10;
    } else {
      return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
    }
  }

  // Default: Arithmetic MEAN
  const sum = evaluatorScores.reduce((a, b) => a + b, 0);
  return Math.round((sum / count) * 10) / 10;
}

/**
 * Returns effective criteria, scoring formula, passThresholdScore, and isCriteriaConfirmed
 * for a specific room, falling back to platform settings or global defaults.
 */
export function getEffectiveRoomCriteria(
  room?: { criteria?: EvaluationCriterion[]; scoringFormula?: ScoringFormula; passThresholdScore?: number; isCriteriaConfirmed?: boolean } | null,
  settings?: PlatformSettings | null
): {
  criteria: EvaluationCriterion[];
  scoringFormula: ScoringFormula;
  passThresholdScore: number;
  isCriteriaConfirmed: boolean;
  isRoomCustom: boolean;
} {
  if (room && Array.isArray(room.criteria) && room.criteria.length > 0) {
    return {
      criteria: room.criteria,
      scoringFormula: room.scoringFormula || settings?.scoringFormula || 'TRIMMED_MEAN',
      passThresholdScore: room.passThresholdScore ?? settings?.passThresholdScore ?? 70,
      isCriteriaConfirmed: room.isCriteriaConfirmed ?? settings?.isCriteriaConfirmed ?? false,
      isRoomCustom: true
    };
  }

  return {
    criteria: (settings?.criteria && settings.criteria.length > 0) ? settings.criteria : DEFAULT_CRITERIA,
    scoringFormula: settings?.scoringFormula || 'TRIMMED_MEAN',
    passThresholdScore: settings?.passThresholdScore ?? 70,
    isCriteriaConfirmed: settings?.isCriteriaConfirmed ?? false,
    isRoomCustom: false
  };
}

/**
 * Calculates average presentation bonus for a candidate across all submitted evaluations.
 */
export function calculateAveragePresentationBonus(
  evaluations: Evaluation[],
  criteria: EvaluationCriterion[]
): number {
  const submittedEvals = evaluations.filter(e => e.status === 'SUBMITTED');
  if (submittedEvals.length === 0) return 0;

  let totalBonus = 0;
  submittedEvals.forEach(e => {
    if (e.presentationBonusTotal !== undefined) {
      totalBonus += e.presentationBonusTotal;
    } else {
      let bSum = 0;
      criteria.forEach(crit => {
        bSum += (Number(e.presentationBonuses?.[crit.id]) || 0);
      });
      totalBonus += bSum;
    }
  });

  return Math.round((totalBonus / submittedEvals.length) * 10) / 10;
}
