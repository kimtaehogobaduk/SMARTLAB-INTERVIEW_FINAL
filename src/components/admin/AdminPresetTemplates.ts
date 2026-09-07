import { EvaluationCriterion, ScoringFormula } from '../../types';

export interface PresetTemplateItem {
  title: string;
  desc: string;
  formula: ScoringFormula;
  passScore: number;
  criteria: EvaluationCriterion[];
}

export const PRESET_TEMPLATES: PresetTemplateItem[] = [
  {
    title: '개발 직무 표준',
    desc: '기술(40%) + 문제해결(30%) + 의사소통(20%) + 컬처핏(10%)',
    formula: 'TRIMMED_MEAN',
    passScore: 70,
    criteria: [
      {
        id: 'technical',
        name: '1. 기술 직무 역량',
        description: '직무 이해도, 기술 스택 깊이, 문제 접근 및 설계 논리',
        weight: 40,
        maxScore: 100,
        color: 'blue'
      },
      {
        id: 'problemSolving',
        name: '2. 논리적 문제 해결력',
        description: '돌발 질문 대응, 트러블슈팅 논리, 한계 극복 및 문제 분해 역량',
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
        description: 'SmartLab 동아리 문화 수용성, 열정 및 협업 주도성',
        weight: 10,
        maxScore: 100,
        color: 'amber'
      }
    ]
  },
  {
    title: '동등 4분할 균형형',
    desc: '모든 항목 25% 균등 반영',
    formula: 'WEIGHTED_MEAN',
    passScore: 75,
    criteria: [
      { id: 'technical', name: '1. 직무 기술 역량', description: '기술 스택과 기본기', weight: 25, maxScore: 100, color: 'blue' },
      { id: 'problemSolving', name: '2. 문제 해결력', description: '논리적 사고와 대처', weight: 25, maxScore: 100, color: 'purple' },
      { id: 'communication', name: '3. 커뮤니케이션', description: '표현력과 경청 태도', weight: 25, maxScore: 100, color: 'emerald' },
      { id: 'cultureFit', name: '4. 조직 적합도', description: '동아리 몰입과 열정', weight: 25, maxScore: 100, color: 'amber' }
    ]
  },
  {
    title: '인성 / 협업 중심형',
    desc: '조직적합도(40%) + 소통(30%) + 기술(15%) + 문제해결(15%)',
    formula: 'WEIGHTED_MEAN',
    passScore: 70,
    criteria: [
      { id: 'cultureFit', name: '1. 조직 적합도 & 태도', description: '협업 태도, 긍정적 영향력, 성장 가능성', weight: 40, maxScore: 100, color: 'amber' },
      { id: 'communication', name: '2. 의사소통 및 설득력', description: '상대방 존중 및 논리적 전달력', weight: 30, maxScore: 100, color: 'emerald' },
      { id: 'problemSolving', name: '3. 문제 해결력', description: '갈등 해결 및 위기 대응', weight: 15, maxScore: 100, color: 'purple' },
      { id: 'technical', name: '4. 직무 기본 소양', description: '기본 직무 이해도', weight: 15, maxScore: 100, color: 'blue' }
    ]
  },
  {
    title: '3대 핵심 지표형',
    desc: '전문기술(50%) + 문제해결(30%) + 의사소통(20%)',
    formula: 'TRIMMED_MEAN',
    passScore: 80,
    criteria: [
      { id: 'technical', name: '1. 전문 기술 역량', description: '코딩/설계 역량 및 아키텍처 이해도', weight: 50, maxScore: 100, color: 'blue' },
      { id: 'problemSolving', name: '2. 논리적 분석력', description: '알고리즘 및 최적화 사고력', weight: 30, maxScore: 100, color: 'purple' },
      { id: 'communication', name: '3. 소통 및 발표력', description: '기술 설명 및 질의응답력', weight: 20, maxScore: 100, color: 'emerald' }
    ]
  }
];
