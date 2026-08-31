import React, { useState, useEffect } from 'react';
import {
  InterviewRoomItem,
  InterviewerUser,
  PlatformSettings,
  EvaluationCriterion,
  ScoringFormula,
  AuditLog,
  Candidate,
  Evaluation,
  QuestionPersonaStyle,
  SecurityQuizItem,
  InterviewerNameDisplayPolicy
} from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { AdminStatsDashboard } from './AdminStatsDashboard';
import { AIKnowledgeManager } from './AIKnowledgeManager';
import { LeadershipManager } from './LeadershipManager';
import { AdminAllInterviewsCompleteModal } from './AdminAllInterviewsCompleteModal';
import {
  Crown,
  Shield,
  Plus,
  DoorOpen,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Youtube,
  Calendar,
  UserCheck,
  Edit3,
  X,
  Sliders,
  Scale,
  Lock,
  Unlock,
  Check,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  Database,
  Layers,
  HelpCircle,
  TrendingUp,
  Award,
  BarChart3,
  Save,
  BookOpen,
  Globe,
  Tag,
  Target,
  Brain,
  MessageSquareQuote,
  KeyRound
} from 'lucide-react';

interface AdminPortalPageProps {
  rooms: InterviewRoomItem[];
  settings: PlatformSettings;
  auditLogs?: AuditLog[];
  candidates?: Candidate[];
  allEvaluations?: Evaluation[];
  onCreateRoom: (roomData: {
    name: string;
    description: string;
    minutesPerPerson: number;
    panelCount: number;
    interviewers?: string[];
    securityType?: 'NONE' | 'PASSWORD' | 'QUIZ';
    roomPassword?: string;
    quizQuestion?: string;
    quizAnswer?: string;
    securityQuizzes?: SecurityQuizItem[];
  }) => Promise<void>;
  onUpdateRoom: (roomId: string, data: {
    interviewers?: string[];
    name?: string;
    description?: string;
    securityType?: 'NONE' | 'PASSWORD' | 'QUIZ';
    roomPassword?: string;
    quizQuestion?: string;
    quizAnswer?: string;
    securityQuizzes?: SecurityQuizItem[];
  }) => Promise<void>;
  onDeleteRoom: (roomId: string) => Promise<void>;
  onSelectRoomAsAdmin: (room: InterviewRoomItem) => void;
  onBackToLanding: () => void;
  onConfirmCriteria: (criteria: EvaluationCriterion[], formula: ScoringFormula, passScore: number) => Promise<void>;
  onUnconfirmCriteria: () => Promise<void>;
  onRefreshSettings?: () => Promise<void>;
}

const PRESET_TEMPLATES: {
  title: string;
  desc: string;
  formula: ScoringFormula;
  passScore: number;
  criteria: EvaluationCriterion[];
}[] = [
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

export const AdminPortalPage: React.FC<AdminPortalPageProps> = ({
  rooms,
  settings,
  auditLogs = [],
  candidates = [],
  allEvaluations = [],
  onCreateRoom,
  onUpdateRoom,
  onDeleteRoom,
  onSelectRoomAsAdmin,
  onBackToLanding,
  onConfirmCriteria,
  onUnconfirmCriteria,
  onRefreshSettings
}) => {
  const [activeTab, setActiveTab] = useState<'CRITERIA' | 'STATS' | 'ROOMS' | 'LEADERSHIP' | 'AUDIT' | 'AI_KNOWLEDGE'>('STATS');

  // Room creation state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newMinutes, setNewMinutes] = useState(30);
  const [rawInterviewersText, setRawInterviewersText] = useState('면접관 1, 면접관 2, 면접관 3');
  const [newSecurityType, setNewSecurityType] = useState<'NONE' | 'PASSWORD' | 'QUIZ'>('NONE');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [newQuizzes, setNewQuizzes] = useState<Array<{ id: string; question: string; answer: string }>>([
    { id: 'quiz-1', question: '', answer: '' }
  ]);
  const [isRoomSubmitting, setIsRoomSubmitting] = useState(false);
  const [roomSuccessMsg, setRoomSuccessMsg] = useState('');
  const [roomErrorMsg, setRoomErrorMsg] = useState('');

  // Editing existing room interviewers & security
  const [editingRoom, setEditingRoom] = useState<InterviewRoomItem | null>(null);
  const [editInterviewersText, setEditInterviewersText] = useState('');
  const [editSecurityType, setEditSecurityType] = useState<'NONE' | 'PASSWORD' | 'QUIZ'>('NONE');
  const [editRoomPassword, setEditRoomPassword] = useState('');
  const [editQuizzes, setEditQuizzes] = useState<Array<{ id: string; question: string; answer: string }>>([
    { id: 'quiz-1', question: '', answer: '' }
  ]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Criteria Configuration State
  const [isCompleteAllModalOpen, setIsCompleteAllModalOpen] = useState(false);
  const [completeAllSuccessToast, setCompleteAllSuccessToast] = useState('');
  const [selectedRoomScope, setSelectedRoomScope] = useState<'GLOBAL' | string>('GLOBAL');
  const [localCriteria, setLocalCriteria] = useState<EvaluationCriterion[]>(() => {
    return settings.criteria && settings.criteria.length > 0
      ? JSON.parse(JSON.stringify(settings.criteria))
      : JSON.parse(JSON.stringify(PRESET_TEMPLATES[0].criteria));
  });

  const [localFormula, setLocalFormula] = useState<ScoringFormula>(settings.scoringFormula || 'TRIMMED_MEAN');
  const [localPassScore, setLocalPassScore] = useState<number>(settings.passThresholdScore || 70);
  const [localRoomPersona, setLocalRoomPersona] = useState<QuestionPersonaStyle>('BALANCED');
  const [localRoomFocusKeywords, setLocalRoomFocusKeywords] = useState<string>('');
  const [isCriteriaDirty, setIsCriteriaDirty] = useState(false);
  const [criteriaSubmitting, setCriteriaSubmitting] = useState(false);
  const [criteriaSuccessMsg, setCriteriaSuccessMsg] = useState('');
  const [criteriaErrorMsg, setCriteriaErrorMsg] = useState('');

  // Interviewer 4-digit PIN management state
  const [pinsStatus, setPinsStatus] = useState<Record<string, { isPinSet: boolean; pinSetAt?: string }>>({});
  const [pinResetLoading, setPinResetLoading] = useState<Record<string, boolean>>({});
  const [pinFeedbackMsg, setPinFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAllPinsStatus = async () => {
    try {
      const res = await fetch('/api/interviewers/all-pins-status');
      if (res.ok) {
        const data = await res.json();
        if (data.pinsStatus) {
          setPinsStatus(data.pinsStatus);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch PINs status:', e);
    }
  };

  useEffect(() => {
    fetchAllPinsStatus();
  }, [activeTab]);

  const handleResetPin = async (interviewer: { id?: string; name: string }) => {
    if (!confirm(`정말로 "${interviewer.name}" 면접관의 4자리 비밀번호를 초기화하시겠습니까?\n초기화 후 해당 면접관은 다음 로그인 시 4자리 비밀번호를 새로 설정하게 됩니다.`)) {
      return;
    }
    const key = interviewer.id || interviewer.name;
    setPinResetLoading(prev => ({ ...prev, [key]: true }));
    setPinFeedbackMsg(null);
    try {
      const res = await fetch('/api/interviewers/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewerId: interviewer.id,
          name: interviewer.name
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPinFeedbackMsg({ type: 'success', text: `"${interviewer.name}" 면접관의 4자리 비밀번호가 안전하게 초기화되었습니다.` });
        await fetchAllPinsStatus();
      } else {
        setPinFeedbackMsg({ type: 'error', text: data.error || '비밀번호 초기화 실패' });
      }
    } catch (err: any) {
      setPinFeedbackMsg({ type: 'error', text: err.message || '초기화 통신 중 오류가 발생했습니다.' });
    } finally {
      setPinResetLoading(prev => ({ ...prev, [key]: false }));
      setTimeout(() => setPinFeedbackMsg(null), 5000);
    }
  };

  // Selected room object
  const activeSelectedRoom = selectedRoomScope === 'GLOBAL' 
    ? null 
    : rooms.find(r => r.id === selectedRoomScope) || null;

  // Function to switch scope (GLOBAL or a specific room)
  const handleSwitchScope = (newScope: 'GLOBAL' | string) => {
    if (isCriteriaDirty) {
      if (!confirm('현재 편집 중인 미저장 내용이 있습니다. 탭을 전환하시겠습니까?')) {
        return;
      }
    }

    setSelectedRoomScope(newScope);
    setIsCriteriaDirty(false);
    setCriteriaErrorMsg('');
    setCriteriaSuccessMsg('');

    if (newScope === 'GLOBAL') {
      if (settings.criteria && settings.criteria.length > 0) {
        setLocalCriteria(JSON.parse(JSON.stringify(settings.criteria)));
      } else {
        setLocalCriteria(JSON.parse(JSON.stringify(PRESET_TEMPLATES[0].criteria)));
      }
      setLocalFormula(settings.scoringFormula || 'TRIMMED_MEAN');
      setLocalPassScore(settings.passThresholdScore !== undefined ? settings.passThresholdScore : 70);
      setLocalRoomPersona('BALANCED');
      setLocalRoomFocusKeywords('');
    } else {
      const room = rooms.find(r => r.id === newScope);
      if (room && room.criteria && room.criteria.length > 0) {
        // Room has its own custom criteria
        setLocalCriteria(JSON.parse(JSON.stringify(room.criteria)));
        setLocalFormula(room.scoringFormula || 'TRIMMED_MEAN');
        setLocalPassScore(room.passThresholdScore !== undefined ? room.passThresholdScore : 70);
        setLocalRoomPersona(room.defaultQuestionPersona || 'BALANCED');
        setLocalRoomFocusKeywords((room.customFocusKeywords || []).join(', '));
      } else {
        // Room is currently inheriting global criteria - start with a clone of global
        if (settings.criteria && settings.criteria.length > 0) {
          setLocalCriteria(JSON.parse(JSON.stringify(settings.criteria)));
        } else {
          setLocalCriteria(JSON.parse(JSON.stringify(PRESET_TEMPLATES[0].criteria)));
        }
        setLocalFormula(room?.scoringFormula || settings.scoringFormula || 'TRIMMED_MEAN');
        setLocalPassScore(room?.passThresholdScore ?? settings.passThresholdScore ?? 70);
        setLocalRoomPersona(room?.defaultQuestionPersona || 'BALANCED');
        setLocalRoomFocusKeywords((room?.customFocusKeywords || []).join(', '));
      }
    }
  };

  // Sync when settings change from outside ONLY if in GLOBAL scope and not dirty
  useEffect(() => {
    if (!isCriteriaDirty && selectedRoomScope === 'GLOBAL') {
      if (settings.criteria && settings.criteria.length > 0) {
        setLocalCriteria(JSON.parse(JSON.stringify(settings.criteria)));
      }
      if (settings.scoringFormula) {
        setLocalFormula(settings.scoringFormula);
      }
      if (settings.passThresholdScore !== undefined) {
        setLocalPassScore(settings.passThresholdScore);
      }
    }
  }, [settings, isCriteriaDirty, selectedRoomScope]);

  // Calculate current weight sum
  const currentTotalWeight = localCriteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = Math.abs(currentTotalWeight - 100) < 0.01;

  // Criteria manipulation handlers
  const handleUpdateCriterion = (index: number, field: keyof EvaluationCriterion, value: any) => {
    setIsCriteriaDirty(true);
    const updated = [...localCriteria];
    updated[index] = { ...updated[index], [field]: value };
    setLocalCriteria(updated);
  };

  const handleAddCriterion = () => {
    setIsCriteriaDirty(true);
    const newIdx = localCriteria.length + 1;
    const colors = ['blue', 'purple', 'emerald', 'amber', 'rose', 'cyan', 'indigo'];
    const assignedColor = colors[(newIdx - 1) % colors.length];
    
    setLocalCriteria([
      ...localCriteria,
      {
        id: `crit_${Date.now().toString(36)}`,
        name: `${newIdx}. 신규 평가 항목`,
        description: '평가 기준 및 관찰 포인트 설명 입력',
        weight: 10,
        maxScore: 100,
        color: assignedColor
      }
    ]);
  };

  const handleDeleteCriterion = (index: number) => {
    if (localCriteria.length <= 1) {
      alert('최소 1개 이상의 평가 기준 항목이 유지되어야 합니다.');
      return;
    }
    setIsCriteriaDirty(true);
    setLocalCriteria(localCriteria.filter((_, i) => i !== index));
  };

  const handleMoveCriterion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === localCriteria.length - 1) return;
    setIsCriteriaDirty(true);
    const updated = [...localCriteria];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setLocalCriteria(updated);
  };

  const handleAutoBalanceWeights = () => {
    if (localCriteria.length === 0) return;
    setIsCriteriaDirty(true);
    const count = localCriteria.length;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    const adjusted = localCriteria.map((c, idx) => ({
      ...c,
      weight: idx === 0 ? base + remainder : base
    }));
    setLocalCriteria(adjusted);
    setCriteriaSuccessMsg('✅ 가중치를 모든 항목에 균등하게 100%로 자동 분배했습니다.');
    setTimeout(() => setCriteriaSuccessMsg(''), 4000);
  };

  const handleProportionalNormalize = () => {
    if (localCriteria.length === 0) return;
    const sum = localCriteria.reduce((acc, c) => acc + (Number(c.weight) || 0), 0);
    if (sum <= 0) {
      handleAutoBalanceWeights();
      return;
    }
    setIsCriteriaDirty(true);
    let runningTotal = 0;
    const adjusted = localCriteria.map((c, idx) => {
      if (idx === localCriteria.length - 1) {
        return { ...c, weight: Math.max(0, 100 - runningTotal) };
      }
      const proportional = Math.round(((Number(c.weight) || 0) / sum) * 100);
      runningTotal += proportional;
      return { ...c, weight: proportional };
    });
    setLocalCriteria(adjusted);
    setCriteriaSuccessMsg('✅ 현재 가중치 비율을 유지하며 정확히 100%로 비례 보정했습니다.');
    setTimeout(() => setCriteriaSuccessMsg(''), 4000);
  };

  const handleResetToCurrentSettings = () => {
    if (confirm('현재 편집 중인 내용을 취소하고 서버에 저장된 기존 평가 기준으로 원복하시겠습니까?')) {
      if (selectedRoomScope === 'GLOBAL') {
        if (settings.criteria && settings.criteria.length > 0) {
          setLocalCriteria(JSON.parse(JSON.stringify(settings.criteria)));
        }
        if (settings.scoringFormula) {
          setLocalFormula(settings.scoringFormula);
        }
        if (settings.passThresholdScore !== undefined) {
          setLocalPassScore(settings.passThresholdScore);
        }
      } else {
        const room = rooms.find(r => r.id === selectedRoomScope);
        if (room && room.criteria && room.criteria.length > 0) {
          setLocalCriteria(JSON.parse(JSON.stringify(room.criteria)));
          setLocalFormula(room.scoringFormula || 'TRIMMED_MEAN');
          setLocalPassScore(room.passThresholdScore !== undefined ? room.passThresholdScore : 70);
          setLocalRoomPersona(room.defaultQuestionPersona || 'BALANCED');
          setLocalRoomFocusKeywords((room.customFocusKeywords || []).join(', '));
        } else {
          setLocalCriteria(JSON.parse(JSON.stringify(settings.criteria || PRESET_TEMPLATES[0].criteria)));
          setLocalFormula(settings.scoringFormula || 'TRIMMED_MEAN');
          setLocalPassScore(settings.passThresholdScore !== undefined ? settings.passThresholdScore : 70);
        }
      }
      setIsCriteriaDirty(false);
      setCriteriaSuccessMsg('기존 설정으로 복원되었습니다.');
      setTimeout(() => setCriteriaSuccessMsg(''), 3000);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    if (confirm(`"${preset.title}" 템플릿을 불러오시겠습니까? 현재 작성 중인 기준이 대체됩니다.`)) {
      setIsCriteriaDirty(true);
      setLocalCriteria(JSON.parse(JSON.stringify(preset.criteria)));
      setLocalFormula(preset.formula);
      setLocalPassScore(preset.passScore);
      setCriteriaSuccessMsg(`"${preset.title}" 템플릿이 로드되었습니다. 확인 후 저장을 눌러주세요.`);
      setTimeout(() => setCriteriaSuccessMsg(''), 4000);
    }
  };

  const handleSaveAndConfirmCriteria = async (autoNormalize = false) => {
    let criteriaToSave = [...localCriteria];
    const sum = criteriaToSave.reduce((acc, c) => acc + (Number(c.weight) || 0), 0);

    if (Math.abs(sum - 100) > 0.01) {
      if (autoNormalize || confirm(`가중치 합계가 현재 ${sum}%입니다. 100%로 자동 비례 보정하여 저장하시겠습니까?`)) {
        // Normalize
        let runningTotal = 0;
        criteriaToSave = criteriaToSave.map((c, idx) => {
          if (idx === criteriaToSave.length - 1) {
            return { ...c, weight: Math.max(0, 100 - runningTotal) };
          }
          const proportional = sum > 0 ? Math.round(((Number(c.weight) || 0) / sum) * 100) : Math.floor(100 / criteriaToSave.length);
          runningTotal += proportional;
          return { ...c, weight: proportional };
        });
        setLocalCriteria(criteriaToSave);
      } else {
        setCriteriaErrorMsg(`가중치 합계는 정확히 100%여야 합니다. (현재: ${sum}%) [100% 자동 분배] 버튼을 눌러보세요.`);
        return;
      }
    }

    setCriteriaSubmitting(true);
    setCriteriaErrorMsg('');
    setCriteriaSuccessMsg('');

    try {
      if (selectedRoomScope === 'GLOBAL') {
        await onConfirmCriteria(criteriaToSave, localFormula, localPassScore);
        setIsCriteriaDirty(false);
        setCriteriaSuccessMsg('✅ 플랫폼 공통 평가 기준과 가중치 공식이 저장 및 실시간 적용되었습니다!');
      } else {
        // Save to specific room
        const parsedKeywords = localRoomFocusKeywords
          .split(/[\n,]+/)
          .map(s => s.trim())
          .filter(Boolean);

        const res = await fetch(`/api/rooms/${selectedRoomScope}/criteria`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            criteria: criteriaToSave,
            scoringFormula: localFormula,
            passThresholdScore: localPassScore,
            defaultQuestionPersona: localRoomPersona,
            customFocusKeywords: parsedKeywords
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '방별 평가 기준 저장에 실패했습니다.');
        }

        // Auto confirm for this room
        const confirmRes = await fetch(`/api/rooms/${selectedRoomScope}/confirm-criteria`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            confirmedBy: '동아리 총괄 관리자 (Admin)'
          })
        });

        if (!confirmRes.ok) {
          const err = await confirmRes.json();
          throw new Error(err.error || '방 평가 기준 확정에 실패했습니다.');
        }

        setIsCriteriaDirty(false);
        setCriteriaSuccessMsg(`✅ "${activeSelectedRoom?.name || '해당 면접실'}" 전용 평가 기준 및 AI 질문 스타일이 실시간 적용되었습니다!`);
        if (onRefreshSettings) await onRefreshSettings();
      }
      setTimeout(() => setCriteriaSuccessMsg(''), 5000);
    } catch (err: any) {
      setCriteriaErrorMsg(err.message || '평가 기준 저장 중 오류가 발생했습니다.');
    } finally {
      setCriteriaSubmitting(false);
    }
  };

  const handleRevertRoomToGlobal = async () => {
    if (!activeSelectedRoom) return;
    if (confirm(`"${activeSelectedRoom.name}" 면접방의 전용 기준을 삭제하고 플랫폼 전체 공통 기본 기준을 따르도록 초기화하시겠습니까?`)) {
      setCriteriaSubmitting(true);
      try {
        const res = await fetch(`/api/rooms/${selectedRoomScope}/criteria`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            criteria: null,
            scoringFormula: null,
            passThresholdScore: null,
            defaultQuestionPersona: null,
            customFocusKeywords: null
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '초기화에 실패했습니다.');
        }

        setIsCriteriaDirty(false);
        // Reload global
        setLocalCriteria(JSON.parse(JSON.stringify(settings.criteria || PRESET_TEMPLATES[0].criteria)));
        setLocalFormula(settings.scoringFormula || 'TRIMMED_MEAN');
        setLocalPassScore(settings.passThresholdScore !== undefined ? settings.passThresholdScore : 70);
        setLocalRoomPersona('BALANCED');
        setLocalRoomFocusKeywords('');
        setCriteriaSuccessMsg(`"${activeSelectedRoom.name}" 방이 플랫폼 공통 기본 기준을 상속받도록 복원되었습니다.`);
        if (onRefreshSettings) await onRefreshSettings();
        setTimeout(() => setCriteriaSuccessMsg(''), 4000);
      } catch (err: any) {
        setCriteriaErrorMsg(err.message || '초기화에 실패했습니다.');
      } finally {
        setCriteriaSubmitting(false);
      }
    }
  };

  const handleUnlockForEdit = async () => {
    if (confirm('평가 기준을 임시 미확정(평가 일시 중단) 상태로 변경하시겠습니까?')) {
      setCriteriaSubmitting(true);
      try {
        if (selectedRoomScope === 'GLOBAL') {
          await onUnconfirmCriteria();
          setCriteriaSuccessMsg('플랫폼 기본 평가 기준이 미확정 상태로 전환되었습니다.');
        } else {
          const res = await fetch(`/api/rooms/${selectedRoomScope}/unconfirm-criteria`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operatorName: '동아리 총괄 관리자 (Admin)'
            })
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '미확정 전환에 실패했습니다.');
          }
          setCriteriaSuccessMsg(`"${activeSelectedRoom?.name}" 방의 기준이 미확정 상태로 전환되었습니다.`);
          if (onRefreshSettings) await onRefreshSettings();
        }
        setTimeout(() => setCriteriaSuccessMsg(''), 4000);
      } catch (err: any) {
        setCriteriaErrorMsg(err.message || '상태 전환에 실패했습니다.');
      } finally {
        setCriteriaSubmitting(false);
      }
    }
  };

  // Room handlers
  const parsedNewInterviewers = rawInterviewersText
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      setRoomErrorMsg('방 이름을 입력해주세요.');
      return;
    }
    if (parsedNewInterviewers.length === 0) {
      setRoomErrorMsg('최소 1명 이상의 면접관을 입력해주세요.');
      return;
    }

    if (newSecurityType === 'PASSWORD' && !newRoomPassword.trim()) {
      setRoomErrorMsg('방 입장 비밀번호를 설정해주세요.');
      return;
    }

    if (newSecurityType === 'QUIZ') {
      const validQuizzes = newQuizzes.filter(q => q.question.trim() && q.answer.trim());
      if (validQuizzes.length === 0) {
        setRoomErrorMsg('최소 1개 이상의 보안 퀴즈 질문과 정답을 입력해주세요.');
        return;
      }
      const hasEmpty = newQuizzes.some(q => !q.question.trim() || !q.answer.trim());
      if (hasEmpty) {
        setRoomErrorMsg('모든 보안 퀴즈 문제의 질문과 정답을 빠짐없이 입력해주세요.');
        return;
      }
    }

    setIsRoomSubmitting(true);
    setRoomErrorMsg('');
    try {
      const formattedSecurityQuizzes: SecurityQuizItem[] = newQuizzes
        .filter(q => q.question.trim() && q.answer.trim())
        .map((q, idx) => ({
          id: q.id || `quiz-${Date.now()}-${idx + 1}`,
          question: q.question.trim(),
          answer: q.answer.trim()
        }));

      await onCreateRoom({
        name: newRoomName.trim(),
        description: newRoomDesc.trim() || 'SmartLab 동아리 실시간 면접 평가실',
        minutesPerPerson: Number(newMinutes) || 30,
        panelCount: parsedNewInterviewers.length,
        interviewers: parsedNewInterviewers,
        securityType: newSecurityType,
        roomPassword: newSecurityType === 'PASSWORD' ? newRoomPassword.trim() : undefined,
        quizQuestion: newSecurityType === 'QUIZ' ? (formattedSecurityQuizzes[0]?.question) : undefined,
        quizAnswer: newSecurityType === 'QUIZ' ? (formattedSecurityQuizzes[0]?.answer) : undefined,
        securityQuizzes: newSecurityType === 'QUIZ' ? formattedSecurityQuizzes : undefined
      });

      setRoomSuccessMsg(`"${newRoomName.trim()}" 방과 면접관 ${parsedNewInterviewers.length}명이 등록되었습니다.`);
      setNewRoomName('');
      setNewRoomDesc('');
      setRawInterviewersText('면접관 1, 면접관 2, 면접관 3');
      setNewMinutes(30);
      setNewSecurityType('NONE');
      setNewRoomPassword('');
      setNewQuizzes([{ id: 'quiz-1', question: '', answer: '' }]);
      setTimeout(() => setRoomSuccessMsg(''), 4000);
    } catch (err: any) {
      setRoomErrorMsg(err.message || '방 생성 중 오류가 발생했습니다.');
    } finally {
      setIsRoomSubmitting(false);
    }
  };

  const openEditModal = (room: InterviewRoomItem) => {
    setEditingRoom(room);
    const existingNames = room.interviewers && room.interviewers.length > 0
      ? room.interviewers.map(i => i.name).join(', ')
      : '면접관 1, 면접관 2, 면접관 3';
    setEditInterviewersText(existingNames);
    setEditSecurityType(room.securityType || 'NONE');
    setEditRoomPassword(room.roomPassword || room.password || '');
    
    // Load existing quizzes
    if (room.securityQuizzes && room.securityQuizzes.length > 0) {
      setEditQuizzes(room.securityQuizzes.map(q => ({
        id: q.id,
        question: q.question,
        answer: q.answer || ''
      })));
    } else if (room.quizQuestion || room.securityQuestion) {
      setEditQuizzes([
        {
          id: 'quiz-1',
          question: room.quizQuestion || room.securityQuestion || '',
          answer: room.quizAnswer || room.securityAnswer || ''
        }
      ]);
    } else {
      setEditQuizzes([{ id: 'quiz-1', question: '', answer: '' }]);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    const parsed = editInterviewersText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (parsed.length === 0) {
      alert('최소 1명 이상의 면접관 이름을 입력해야 합니다.');
      return;
    }

    if (editSecurityType === 'PASSWORD' && !editRoomPassword.trim()) {
      alert('방 입장 비밀번호를 설정해주세요.');
      return;
    }

    if (editSecurityType === 'QUIZ') {
      const validQuizzes = editQuizzes.filter(q => q.question.trim() && q.answer.trim());
      if (validQuizzes.length === 0) {
        alert('최소 1개 이상의 보안 퀴즈 질문과 정답을 입력해주세요.');
        return;
      }
      const hasEmpty = editQuizzes.some(q => !q.question.trim() || !q.answer.trim());
      if (hasEmpty) {
        alert('모든 보안 퀴즈 문제의 질문과 정답을 빠짐없이 입력해주세요.');
        return;
      }
    }

    setIsEditSubmitting(true);
    try {
      const formattedQuizzes: SecurityQuizItem[] = editQuizzes
        .filter(q => q.question.trim() && q.answer.trim())
        .map((q, idx) => ({
          id: q.id || `quiz-${Date.now()}-${idx + 1}`,
          question: q.question.trim(),
          answer: q.answer.trim()
        }));

      await onUpdateRoom(editingRoom.id, {
        interviewers: parsed,
        securityType: editSecurityType,
        roomPassword: editSecurityType === 'PASSWORD' ? editRoomPassword.trim() : undefined,
        quizQuestion: editSecurityType === 'QUIZ' ? (formattedQuizzes[0]?.question) : undefined,
        quizAnswer: editSecurityType === 'QUIZ' ? (formattedQuizzes[0]?.answer) : undefined,
        securityQuizzes: editSecurityType === 'QUIZ' ? formattedQuizzes : undefined
      });
      setEditingRoom(null);
    } catch (err: any) {
      alert(err.message || '면접관 명단 수정에 실패했습니다.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    try {
      await onDeleteRoom(roomId);
    } catch (err: any) {
      alert(err.message || '방 삭제에 실패했습니다.');
    }
  };

  // Handler for All Interviews Completed & Candidate Results Publishing
  const handleCompleteAllInterviews = async (config: {
    operatorName: string;
    isResultsPublished: boolean;
    showPassFailToCandidates: boolean;
    interviewerNameDisplayPolicy: InterviewerNameDisplayPolicy;
    showStatsToCandidates: boolean;
    showDetailedComments: boolean;
  }) => {
    try {
      const res = await fetch('/api/admin/complete-all-interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '모든 면접 완료 처리에 실패했습니다.');
      }

      const result = await res.json();
      setCompleteAllSuccessToast(
        `모든 면접이 공식 완료되었습니다! (${result.completedCandidates}명 지원자 완료 처리 및 AI 보고서 자동 생성 가동)`
      );

      if (onRefreshSettings) {
        await onRefreshSettings();
      }

      setTimeout(() => {
        setCompleteAllSuccessToast('');
      }, 7000);
    } catch (err: any) {
      console.error('Complete all interviews error:', err);
      throw err;
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-8 relative overflow-x-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="max-w-6xl w-full mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToLanding}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>처음 화면으로</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <SmartLabLogo size="sm" />
            <span className="text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
              Admin Console
            </span>
          </div>
        </div>

        {/* Action Button: All Interviews Completed */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCompleteAllModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-600 hover:from-blue-500 hover:via-indigo-500 hover:to-amber-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>모든 면접 완료 & 결과 발표 설정</span>
            {settings.isResultsPublished ? (
              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                공개 중 (ON)
              </span>
            ) : (
              <span className="text-[10px] bg-slate-900/60 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                비공개 (OFF)
              </span>
            )}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('STATS')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'STATS'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>면접관별 통계 & 성향 분석</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-amber-300">
              추천
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CRITERIA')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'CRITERIA'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>평가 기준 & 가중치 설정</span>
            {settings.isCriteriaConfirmed ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ROOMS')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ROOMS'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>면접 방 & 면접관 관리</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300">
              {rooms.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LEADERSHIP')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'LEADERSHIP'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>기장 & 부기장 임명</span>
            {(settings.leadership?.captain || (settings.leadership?.viceCaptains && settings.leadership.viceCaptains.length > 0)) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AI_KNOWLEDGE')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'AI_KNOWLEDGE'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>AI 지식 & YouTube 학습</span>
            <span className="text-[10px] bg-indigo-950/80 text-indigo-200 border border-indigo-500/30 px-1.5 py-0.2 rounded-full">
              {settings.knowledgeBase?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'AUDIT'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>감사 로그</span>
          </button>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* TAB 0: DETAILED INTERVIEWER STATS & TENDENCY DASHBOARD */}
      {/* ========================================================================================= */}
      {activeTab === 'STATS' && (
        <div className="max-w-6xl w-full mx-auto mt-8">
          <AdminStatsDashboard
            candidates={candidates}
            allEvaluations={allEvaluations}
            settings={settings}
            rooms={rooms}
            scoringFormula={settings.scoringFormula || 'TRIMMED_MEAN'}
          />
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 1: EVALUATION CRITERIA & WEIGHTED SCORING MANAGEMENT */}
      {/* ========================================================================================= */}
      {activeTab === 'CRITERIA' && (
        <div className="max-w-6xl w-full mx-auto mt-8 space-y-6">
          {/* Room Scope Switcher Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>평가 기준 적용 대상 범위 (Scope) 설정</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  플랫폼 전체 기본 기준을 설정하거나, 각 면접방마다 독립된 전용 평가 기준 및 AI 질문 스타일을 다르게 구성할 수 있습니다.
                </p>
              </div>

              {selectedRoomScope !== 'GLOBAL' && activeSelectedRoom?.criteria && activeSelectedRoom.criteria.length > 0 && (
                <button
                  type="button"
                  onClick={handleRevertRoomToGlobal}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                  title="이 방의 전용 기준을 삭제하고 플랫폼 전체 공통 기준으로 복원합니다"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>플랫폼 공통 기준으로 원복 (상속)</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
              {/* Global Default Button */}
              <button
                type="button"
                onClick={() => handleSwitchScope('GLOBAL')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shrink-0 border transition-all cursor-pointer ${
                  selectedRoomScope === 'GLOBAL'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>🌐 플랫폼 공통 기본 기준 (Global Default)</span>
                {settings.isCriteriaConfirmed ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>

              {/* Rooms Buttons */}
              {rooms.map(r => {
                const isSelected = selectedRoomScope === r.id;
                const hasCustomCriteria = Boolean(r.criteria && r.criteria.length > 0);

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSwitchScope(r.id)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <DoorOpen className="w-4 h-4" />
                    <span className="font-black">{r.name}</span>
                    {hasCustomCriteria ? (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-indigo-950 text-indigo-200 border border-indigo-400/40">
                        전용 기준 ({r.criteria?.length}항목)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-700">
                        글로벌 상속
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status & Quick Action Bar */}
          <div className={`p-5 rounded-3xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 shadow-xl backdrop-blur-md ${
            (selectedRoomScope === 'GLOBAL' ? settings.isCriteriaConfirmed : activeSelectedRoom?.isCriteriaConfirmed !== false)
              ? 'bg-slate-900/95 border-slate-700/80 text-slate-100'
              : 'bg-amber-950/40 border-amber-800/80 text-amber-100'
          }`}>
            <div className="flex items-start gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                (selectedRoomScope === 'GLOBAL' ? settings.isCriteriaConfirmed : activeSelectedRoom?.isCriteriaConfirmed !== false)
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
              }`}>
                {(selectedRoomScope === 'GLOBAL' ? settings.isCriteriaConfirmed : activeSelectedRoom?.isCriteriaConfirmed !== false) ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Sliders className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white">
                    {selectedRoomScope === 'GLOBAL' ? (
                      settings.isCriteriaConfirmed
                        ? '플랫폼 공통 평가 기준 및 가중 합산 기준이 실시간 적용 중입니다'
                        : '플랫폼 공통 평가 기준 설정 및 편집 중'
                    ) : (
                      `[${activeSelectedRoom?.name}] 전용 평가 기준 설정`
                    )}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    (selectedRoomScope === 'GLOBAL' ? settings.isCriteriaConfirmed : activeSelectedRoom?.isCriteriaConfirmed !== false)
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {selectedRoomScope === 'GLOBAL'
                      ? (settings.isCriteriaConfirmed ? '공통 기준 적용 중' : '작성/설정 중')
                      : (activeSelectedRoom?.criteria && activeSelectedRoom.criteria.length > 0 ? '이 방 전용 기준 활성화' : '글로벌 기준 상속 중')}
                  </span>
                  {isCriteriaDirty && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-xs animate-bounce">
                      ✏️ 미저장 수정 내역 있음
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  {selectedRoomScope === 'GLOBAL'
                    ? '플랫폼 전체 기본 평가 항목과 가중치를 설정합니다. 개별 면접방에 전용 기준이 없을 시 이 공통 기준을 따릅니다.'
                    : `"${activeSelectedRoom?.name}" 방만을 위한 맞춤형 평가 기준, 배점 가중치, AI 질문 성향을 독자적으로 구성합니다.`}
                </p>
              </div>
            </div>

            {/* Top Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
              {isCriteriaDirty && (
                <button
                  type="button"
                  onClick={handleResetToCurrentSettings}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  title="편집 취소"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>수정 취소 (원복)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSaveAndConfirmCriteria(false)}
                disabled={criteriaSubmitting}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {criteriaSubmitting
                    ? '저장 동기화 중...'
                    : selectedRoomScope === 'GLOBAL'
                    ? '공통 기준 저장 및 즉시 반영'
                    : '이 방 전용 기준 저장 & 적용'}
                </span>
              </button>
            </div>
          </div>

          {criteriaSuccessMsg && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-2xl text-xs flex items-center gap-2.5 shadow-lg animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-semibold">{criteriaSuccessMsg}</span>
            </div>
          )}

          {criteriaErrorMsg && (
            <div className="p-4 bg-rose-950/80 border border-rose-700 text-rose-200 rounded-2xl text-xs flex items-center gap-2.5 shadow-lg animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="font-semibold">{criteriaErrorMsg}</span>
            </div>
          )}

          {/* Room-specific Question Persona and Focus Tuning */}
          {selectedRoomScope !== 'GLOBAL' && (
            <div className="bg-indigo-950/40 border border-indigo-700/60 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
                <div className="flex items-center gap-2 text-white font-black text-sm">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <span>이 면접방 전용 AI 질문 생성 성향 & 실시간 심층 검증 키워드</span>
                </div>
                <span className="text-xs text-indigo-300 font-mono">
                  {activeSelectedRoom?.name}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    기본 AI 질문 생성 페르소나 스타일
                  </label>
                  <select
                    value={localRoomPersona}
                    onChange={(e) => {
                      setIsCriteriaDirty(true);
                      setLocalRoomPersona(e.target.value as QuestionPersonaStyle);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="BALANCED">⚖️ 표준 균형형 (기술/문제해결/소통 종합 검증)</option>
                    <option value="LOGIC_PRESSURE">🔥 논리 압박 / 꼬리 질문 심층 검증 (모순 및 인과관계 파고들기)</option>
                    <option value="DEEP_TECHNICAL">💻 딥 테크니컬 (코드 아키텍처, 트랜잭션, 동시성, 성능 최적화)</option>
                    <option value="ARCHITECTURE">🏛️ 시스템 설계 / 대규모 확장성 (트래픽 병목, 분산 시스템)</option>
                    <option value="CULTURE_BEHAVIORAL">🤝 컬처핏 & 협업 갈등 (STAR 기법, 팀플레이 태도)</option>
                    <option value="CREATIVE_CRITICAL">💡 창의적 문제 해결 & 비판적 사고 (한계 돌파)</option>
                  </select>
                  <p className="text-[11px] text-slate-400">
                    면접 중 실시간 STT 및 질문 추천 엔진이 이 방의 성향을 최우선으로 반영하여 질문을 도출합니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    방 전용 집중 검증 키워드 / 평가 지침 (쉼표 구분)
                  </label>
                  <input
                    type="text"
                    value={localRoomFocusKeywords}
                    onChange={(e) => {
                      setIsCriteriaDirty(true);
                      setLocalRoomFocusKeywords(e.target.value);
                    }}
                    placeholder="예: Kafka 이벤트 기반, 트랜잭션 격리, 동시성 락, 발표 전달력"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-400">
                    입력된 키워드가 지원자의 답변과 서류에서 실시간으로 대조되어 핵심 꼬리질문으로 생성됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Preset Selection & Quick Setup */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-black text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>추천 평가 기준 프리셋 템플릿</span>
              </div>
              <span className="text-xs text-slate-400">클릭 시 즉시 템플릿이 로드됩니다</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PRESET_TEMPLATES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="p-3.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 rounded-2xl text-left transition-all group cursor-pointer"
                >
                  <div className="font-bold text-xs text-white group-hover:text-amber-300 flex items-center justify-between">
                    <span>{preset.title}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">
                      {preset.criteria.length}개 항목
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {preset.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Main Formula & Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Calculation Formula Selector */}
            <div className="md:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Scale className="w-4 h-4 text-amber-400" />
                <span>종합 점수 집계 및 가중치 환산 공식</span>
              </div>

              <div className="space-y-2">
                {[
                  {
                    id: 'WEIGHTED_MEAN' as ScoringFormula,
                    name: '가중 합산 (Weighted Sum / Mean)',
                    desc: '각 항목의 지정 가중치 비율을 곱하여 총 100점 만점으로 환산'
                  },
                  {
                    id: 'TRIMMED_MEAN' as ScoringFormula,
                    name: '가중 절사 평균 (Trimmed Mean - 권장)',
                    desc: '3인 이상 평가 시 최고점과 최저점을 제외한 후 가중 합산 (이상치 배제)'
                  },
                  {
                    id: 'MEDIAN' as ScoringFormula,
                    name: '중앙값 (Median)',
                    desc: '평가위원들 점수의 중간값을 최종 점수로 채택'
                  },
                  {
                    id: 'MEAN' as ScoringFormula,
                    name: '단순 산술 평균 (Arithmetic Mean)',
                    desc: '전체 면접관 가중 점수의 단순 산술 평균'
                  }
                ].map(opt => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      localFormula === opt.id
                        ? 'bg-amber-500/10 border-amber-500/60 text-white'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scoringFormula"
                      value={opt.id}
                      checked={localFormula === opt.id}
                      onChange={() => {
                        setIsCriteriaDirty(true);
                        setLocalFormula(opt.id);
                      }}
                      className="mt-1 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-200">{opt.name}</div>
                      <div className="text-[11px] text-slate-400">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Weight Total Gauge & Confirmation Card */}
            <div className="md:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>가중치 검증 및 무결성 체크</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAutoBalanceWeights}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                      title="모든 항목에 가중치를 동일하게 나눕니다"
                    >
                      균등 100%
                    </button>
                    <button
                      type="button"
                      onClick={handleProportionalNormalize}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                      title="현재 비율대로 100%에 맞춰 자동 스케일링합니다"
                    >
                      비례 100%
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      평가 산출 방식 (순위표 정렬 기준)
                    </span>
                    <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-md font-bold text-xs border border-amber-500/30">
                      100점 만점 가중 환산
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    임의의 인위적 컷오프(과락선) 없이 모든 지원자의 실제 역량 점수를 있는 그대로 환산 및 정렬합니다.
                  </p>
                </div>

                {/* Live Weight Sum Gauge */}
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  isWeightValid
                    ? 'bg-emerald-950/40 border-emerald-700/80 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-700/80 text-rose-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      {isWeightValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>전체 항목 가중치 합계</span>
                    </span>
                    <span className="font-mono text-base font-black">
                      {currentTotalWeight}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isWeightValid
                          ? 'bg-emerald-500'
                          : currentTotalWeight > 100
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(currentTotalWeight, 100)}%` }}
                    />
                  </div>

                  <p className="text-[11px]">
                    {isWeightValid
                      ? '✅ 가중치 합계가 정확히 100%입니다.'
                      : `⚠️ 가중치 합계가 100%가 되어야 합니다. (${currentTotalWeight > 100 ? `${currentTotalWeight - 100}% 초과` : `${100 - currentTotalWeight}% 부족`}) [균등/비례 100%] 버튼으로 1초 만에 맞출 수 있습니다.`}
                  </p>
                </div>
              </div>

              {/* Submit Final Confirmation */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveAndConfirmCriteria(true)}
                  disabled={criteriaSubmitting}
                  className="w-full py-4 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {criteriaSubmitting
                      ? '평가 기준 저장 및 클라우드 동기화 중...'
                      : isCriteriaDirty
                      ? '변경된 평가 기준 저장 및 즉시 반영'
                      : '평가 기준 저장 완료 (실시간 적용 중)'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Individual Criteria Items Editor */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>개별 평가 항목 및 세부 배점/가중치 설정</span>
                </h3>
                <p className="text-xs text-slate-400">
                  각 평가 항목의 명칭, 평가 가이드라인, 반영 가중치(%)를 자유롭게 수정하고 순서를 변경할 수 있습니다.
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                  <span>🎤 <strong>발표 가산점 규정 적용:</strong> 면접관은 지원자의 발표 완성도에 따라 각 항목 가중치의 최대 10%까지 추가 가산점을 부여할 수 있습니다. (예: 가중치 30% 항목은 최대 +3.0점 가산 가능)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddCriterion}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ 새 평가 항목 추가</span>
                </button>
              </div>
            </div>

            {/* List of Criteria Cards */}
            <div className="space-y-4">
              {localCriteria.map((criterion, index) => (
                <div
                  key={criterion.id || index}
                  className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-4 hover:border-slate-600 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveCriterion(index, 'up')}
                          disabled={index === 0}
                          className="p-1 bg-slate-900 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="위로 이동"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCriterion(index, 'down')}
                          disabled={index === localCriteria.length - 1}
                          className="p-1 bg-slate-900 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="아래로 이동"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="w-7 h-7 rounded-xl bg-slate-900 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={criterion.name}
                        onChange={e => handleUpdateCriterion(index, 'name', e.target.value)}
                        placeholder="항목 명칭 (예: 1. 기술 직무 역량)"
                        className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Weight percentage input & Delete */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                        <span className="text-xs font-bold text-slate-300">가중치:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={criterion.weight}
                          onChange={e => handleUpdateCriterion(index, 'weight', Number(e.target.value) || 0)}
                          className="w-14 bg-transparent font-mono font-black text-amber-400 text-sm text-right focus:outline-hidden"
                        />
                        <span className="text-slate-400 text-xs font-bold">%</span>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteCriterion(index)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                        title="항목 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Weight Slider */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={criterion.weight}
                      onChange={e => handleUpdateCriterion(index, 'weight', Number(e.target.value) || 0)}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Description / Evaluator Guidance */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 block">
                      면접관 평가 가이드 / 관찰 포인트
                    </label>
                    <input
                      type="text"
                      value={criterion.description || ''}
                      onChange={e => handleUpdateCriterion(index, 'description', e.target.value)}
                      placeholder="면접관이 점수 채점 시 참고할 핵심 관찰 포인트를 입력하세요..."
                      className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Finalize CTA */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>총 {localCriteria.length}개 평가 항목</span>
                <span>•</span>
                <span>가중치 합계: <strong className={`font-mono ${isWeightValid ? 'text-emerald-400' : 'text-rose-400'}`}>{currentTotalWeight}%</strong></span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleAutoBalanceWeights}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                  100% 자동 분배
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAndConfirmCriteria(true)}
                  disabled={criteriaSubmitting}
                  className="px-6 py-3 rounded-xl font-black text-xs shadow-lg transition-all flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {criteriaSubmitting
                      ? '저장 중...'
                      : '평가 기준 저장 및 실시간 적용'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 2: INTERVIEW ROOMS & PANEL MANAGEMENT */}
      {/* ========================================================================================= */}
      {activeTab === 'ROOMS' && (
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          {/* Left Column: New Room Creation Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md space-y-5">
              <div className="flex items-center gap-2.5 text-white border-b border-slate-800 pb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black">신규 면접 평가 방 및 면접관 개설</h2>
                  <p className="text-xs text-slate-400">어드민이 면접 방과 참여 면접관을 일괄 지정합니다</p>
                </div>
              </div>

              {roomSuccessMsg && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{roomSuccessMsg}</span>
                </div>
              )}

              {roomErrorMsg && (
                <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{roomErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 block">
                    방 이름 / 면접 회차 명칭 *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="예: SmartLab 2026 1차 정기 리크루팅"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 block">
                    방 설명 (선택)
                  </label>
                  <input
                    type="text"
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="예: AI/ML 및 웹/앱 풀스택 신규 기수 선발"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Interviewer Bulk Input */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>배정 면접관 명단 일괄 입력 *</span>
                    </label>
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      총 {parsedNewInterviewers.length}명 지정됨
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => setRawInterviewersText('면접관 1, 면접관 2')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
                    >
                      2인 조
                    </button>
                    <button
                      type="button"
                      onClick={() => setRawInterviewersText('면접관 1, 면접관 2, 면접관 3')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
                    >
                      3인 기본 조
                    </button>
                    <button
                      type="button"
                      onClick={() => setRawInterviewersText('면접관 1, 면접관 2, 면접관 3, 면접관 4')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
                    >
                      4인 심사단
                    </button>
                    <button
                      type="button"
                      onClick={() => setRawInterviewersText('면접관 1, 면접관 2, 면접관 3, 면접관 4, 면접관 5')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors cursor-pointer"
                    >
                      5인 대규모 심사단
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    required
                    value={rawInterviewersText}
                    onChange={(e) => setRawInterviewersText(e.target.value)}
                    placeholder="면접관 이름을 쉼표(,) 또는 줄바꿈으로 구분하여 입력하세요&#10;예: 김철수, 이영희, 박민수"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>지원자 1인당 배정 면접 시간 (분)</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(Number(e.target.value) || 30)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                {/* Room Security Mode Settings */}
                <div className="space-y-2.5 pt-2 border-t border-slate-800">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>방 입장 보안 설정 (자유 입장 / 비밀번호 / 퀴즈 질문)</span>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewSecurityType('NONE')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        newSecurityType === 'NONE'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs">자유 입장</div>
                      <div className="text-[10px] opacity-75">비번 없음</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSecurityType('PASSWORD')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        newSecurityType === 'PASSWORD'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>비밀번호</span>
                      </div>
                      <div className="text-[10px] opacity-75">코드 입력</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSecurityType('QUIZ')}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        newSecurityType === 'QUIZ'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs flex items-center justify-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        <span>퀴즈/질문</span>
                      </div>
                      <div className="text-[10px] opacity-75">문제 정답 입력</div>
                    </button>
                  </div>

                  {newSecurityType === 'PASSWORD' && (
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5 animate-fade-in">
                      <label className="text-[11px] font-bold text-slate-300">
                        방 입장 비밀번호 설정 *
                      </label>
                      <input
                        type="password"
                        required
                        value={newRoomPassword}
                        onChange={(e) => setNewRoomPassword(e.target.value)}
                        placeholder="면접관들이 방 입장 시 입력할 비밀번호"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}

                  {newSecurityType === 'QUIZ' && (
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                          <span>보안 퀴즈 문제 설정 ({newQuizzes.length}개)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewQuizzes(prev => [
                              ...prev,
                              { id: `quiz-${Date.now()}-${prev.length + 1}`, question: '', answer: '' }
                            ]);
                          }}
                          className="px-2 py-1 bg-purple-900/50 hover:bg-purple-800/60 text-purple-200 border border-purple-700/50 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>퀴즈 문제 추가</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {newQuizzes.map((quiz, idx) => (
                          <div key={quiz.id || idx} className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 relative">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                              <span className="text-amber-400">문제 {idx + 1}</span>
                              {newQuizzes.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewQuizzes(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="text-slate-500 hover:text-red-400 text-[10px] flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>삭제</span>
                                </button>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-slate-400">
                                퀴즈 질문 *
                              </label>
                              <input
                                type="text"
                                required
                                value={quiz.question}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewQuizzes(prev => prev.map((q, i) => i === idx ? { ...q, question: val } : q));
                                }}
                                placeholder={`보안 질문 ${idx + 1} 입력`}
                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-slate-400">
                                정답 (대소문자/띄어쓰기 무관 일치) *
                              </label>
                              <input
                                type="text"
                                required
                                value={quiz.answer}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewQuizzes(prev => prev.map((q, i) => i === idx ? { ...q, answer: val } : q));
                                }}
                                placeholder={`문제 ${idx + 1} 정답 입력`}
                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isRoomSubmitting}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRoomSubmitting ? '방 개설 및 클라우드 동기화 중...' : '새 면접 평가 방 개설하기'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Existing Rooms List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-black text-sm">
                <DoorOpen className="w-4 h-4 text-amber-400" />
                <span>개설된 면접 평가 방 목록 ({rooms.length}개)</span>
              </div>
              <span className="text-xs text-slate-400">클라우드 DB에 실시간 영구 보존됨</span>
            </div>

            {rooms.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl space-y-3">
                <DoorOpen className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">개설된 방이 없습니다</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  왼쪽 양식에서 첫 번째 면접 방과 면접관 명단을 개설해보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {rooms.map((room) => {
                  const interviewersList = room.interviewers || [];
                  return (
                    <div
                      key={room.id}
                      className="p-5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-4 transition-all shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white">{room.name || room.title}</h3>
                            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md">
                              {room.minutesPerPerson || 30}분/인
                            </span>
                            {room.securityType === 'PASSWORD' && (
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                <span>비번 보안</span>
                              </span>
                            )}
                            {room.securityType === 'QUIZ' && (
                              <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <HelpCircle className="w-2.5 h-2.5" />
                                <span>퀴즈 보안</span>
                              </span>
                            )}
                          </div>
                          {room.description && (
                            <p className="text-xs text-slate-400 mt-1">{room.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectRoomAsAdmin(room)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>어드민 입장</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`"${room.name || room.title}" 방을 삭제하시겠습니까? 등록된 지원자 및 평가 데이터가 함께 삭제됩니다.`)) {
                                handleDelete(room.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-800/60 rounded-xl transition-colors cursor-pointer"
                            title="방 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Assigned Interviewers */}
                      <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-amber-400" />
                            <span>지정된 면접관 ({interviewersList.length}명)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => openEditModal(room)}
                            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer font-bold"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>방/면접관/보안 수정</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {interviewersList.length > 0 ? (
                            interviewersList.map((intv) => (
                              <span
                                key={intv.id}
                                className="px-2.5 py-0.5 bg-slate-800/90 border border-slate-700 text-slate-200 rounded-md text-[11px] font-medium"
                              >
                                {intv.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">
                              지정된 면접관이 없습니다
                            </span>
                          )}
                        </div>

                        {/* Security Detail Display for Admin */}
                        {room.securityType === 'QUIZ' && (
                          <div className="mt-2 pt-2 border-t border-slate-800/60 space-y-1 text-[11px] text-purple-300">
                            <div className="flex items-center gap-1.5 font-bold">
                              <HelpCircle className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                              <span>보안 퀴즈 ({room.securityQuizzes && room.securityQuizzes.length > 0 ? room.securityQuizzes.length : 1}문제)</span>
                            </div>
                            <div className="space-y-1 pl-5">
                              {room.securityQuizzes && room.securityQuizzes.length > 0 ? (
                                room.securityQuizzes.map((q, idx) => (
                                  <div key={q.id || idx} className="text-slate-300">
                                    <span className="font-semibold text-purple-300">Q{idx + 1}.</span> {q.question}
                                  </div>
                                ))
                              ) : (
                                <div className="text-slate-300">
                                  <span className="font-semibold text-purple-300">Q.</span> {room.securityQuestion || room.quizQuestion || '보안 퀴즈'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {room.securityType === 'PASSWORD' && (
                          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] text-amber-300">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-bold">비밀번호 잠금 활성화됨</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {room.createdAt}
                        </span>
                        <span>개설자: {room.createdBy}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dedicated Interviewer 4-digit PIN Management Section */}
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>면접관 4자리 PIN 비밀번호 보안 관리</span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.2 rounded font-mono">
                        보안 격리
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      면접관은 최초 로그인 시 4자리 PIN을 설정하며, 분실 시 어드민이 초기화할 수 있습니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchAllPinsStatus}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  title="PIN 상태 새로고침"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>새로고침</span>
                </button>
              </div>

              {pinFeedbackMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
                  pinFeedbackMsg.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-red-950/60 border border-red-800 text-red-300'
                }`}>
                  {pinFeedbackMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{pinFeedbackMsg.text}</span>
                </div>
              )}

              {(() => {
                const uniqueInterviewers: InterviewerUser[] = Array.from(
                  new Map<string, InterviewerUser>(
                    rooms.flatMap(r => r.interviewers || []).map(i => [i.name.trim().toLowerCase(), i])
                  ).values()
                );

                if (uniqueInterviewers.length === 0) {
                  return (
                    <div className="p-4 text-center text-xs text-slate-500">
                      등록된 면접관이 없습니다. 방 개설 시 면접관을 배정해주세요.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {uniqueInterviewers.map(intv => {
                      const key = intv.id || intv.name;
                      const status = pinsStatus[intv.id] || pinsStatus[intv.name] || pinsStatus[intv.name.trim().toLowerCase()];
                      const isPinSet = !!status?.isPinSet;
                      const isLoading = !!pinResetLoading[key];

                      return (
                        <div
                          key={key}
                          className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPinSet ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {intv.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate flex items-center gap-1.5">
                                <span>{intv.name}</span>
                                {intv.role === 'admin' && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] flex items-center gap-1.5 mt-0.5">
                                {isPinSet ? (
                                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>PIN 설정 완료</span>
                                  </span>
                                ) : (
                                  <span className="text-amber-400 flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>최초 설정 대기</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!isPinSet || isLoading}
                            onClick={() => handleResetPin(intv)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-red-950/50 hover:text-red-300 hover:border-red-800/50 border border-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-800 disabled:hover:text-slate-300 disabled:hover:border-slate-700 rounded-lg text-[11px] font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                            title={isPinSet ? '4자리 비밀번호 초기화' : '설정된 비밀번호가 없습니다'}
                          >
                            <RotateCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>{isLoading ? '초기화 중...' : '비번 초기화'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 3: AUDIT TRAIL LOGS */}
      {/* ========================================================================================= */}
      {activeTab === 'AUDIT' && (
        <div className="max-w-6xl w-full mx-auto mt-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                <span>시스템 감사 로그 (Audit Trail)</span>
              </h3>
              <p className="text-xs text-slate-400">
                평가 기준 변경, 점수 수정, 관리자 해제 등 모든 시스템 변경 이력이 클라우드에 영구 기록됩니다.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
              총 {auditLogs.length}건
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">기록된 감사 로그가 없습니다.</div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.field}</span>
                      <span className="px-2 py-0.2 rounded-md text-[10px] bg-slate-700 text-slate-300 font-mono">
                        {log.modifiedBy}
                      </span>
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-slate-400">{log.reason}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {log.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB: CLUB LEADERSHIP (기장 1명, 부기장 최대 2명 임명 관리) */}
      {/* ========================================================================================= */}
      {activeTab === 'LEADERSHIP' && (
        <div className="max-w-6xl w-full mx-auto mt-8">
          <LeadershipManager
            settings={settings}
            rooms={rooms}
            onRefreshSettings={onRefreshSettings}
          />
        </div>
      )}

      {/* ========================================================================================= */}
      {/* TAB 4: AI KNOWLEDGE & YOUTUBE MULTI-SOURCE LEARNING CENTER */}
      {/* ========================================================================================= */}
      {activeTab === 'AI_KNOWLEDGE' && (
        <div className="max-w-6xl w-full mx-auto mt-8">
          <AIKnowledgeManager
            settings={settings}
            onRefreshSettings={onRefreshSettings}
          />
        </div>
      )}

      {/* Modal for bulk interviewer edit */}
      {editingRoom && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Users className="w-4 h-4 text-amber-400" />
                <span>면접관 명단 수정 ({editingRoom.name || editingRoom.title})</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  면접관 명단 (쉼표 또는 줄바꿈으로 일괄 입력)
                </label>
                <textarea
                  rows={3}
                  required
                  value={editInterviewersText}
                  onChange={(e) => setEditInterviewersText(e.target.value)}
                  placeholder="예: 김철수, 이영희, 박민수, 최지훈"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
                />
              </div>

              {/* Room Security Settings */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>방 입장 보안 설정 (자유 입장 / 비밀번호 / 퀴즈 질문)</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSecurityType('NONE')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      editSecurityType === 'NONE'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs">자유 입장</div>
                    <div className="text-[10px] opacity-75">비번 없음</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSecurityType('PASSWORD')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      editSecurityType === 'PASSWORD'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>비밀번호</span>
                    </div>
                    <div className="text-[10px] opacity-75">코드 입력</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSecurityType('QUIZ')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      editSecurityType === 'QUIZ'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs flex items-center justify-center gap-1">
                      <HelpCircle className="w-3 h-3" />
                      <span>퀴즈/질문</span>
                    </div>
                    <div className="text-[10px] opacity-75">정답 입력</div>
                  </button>
                </div>

                {editSecurityType === 'PASSWORD' && (
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5 animate-fade-in">
                    <label className="text-[11px] font-bold text-slate-300">
                      방 입장 비밀번호 *
                    </label>
                    <input
                      type="password"
                      required
                      value={editRoomPassword}
                      onChange={(e) => setEditRoomPassword(e.target.value)}
                      placeholder="입장 비밀번호 입력"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                {editSecurityType === 'QUIZ' && (
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                        <span>보안 퀴즈 문제 설정 ({editQuizzes.length}개)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditQuizzes(prev => [
                            ...prev,
                            { id: `quiz-${Date.now()}-${prev.length + 1}`, question: '', answer: '' }
                          ]);
                        }}
                        className="px-2 py-1 bg-purple-900/50 hover:bg-purple-800/60 text-purple-200 border border-purple-700/50 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>퀴즈 문제 추가</span>
                      </button>
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {editQuizzes.map((quiz, idx) => (
                        <div key={quiz.id || idx} className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 relative">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                            <span className="text-amber-400">문제 {idx + 1}</span>
                            {editQuizzes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditQuizzes(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-slate-500 hover:text-red-400 text-[10px] flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>삭제</span>
                              </button>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-slate-400">
                              퀴즈 질문 *
                            </label>
                            <input
                              type="text"
                              required
                              value={quiz.question}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditQuizzes(prev => prev.map((q, i) => i === idx ? { ...q, question: val } : q));
                              }}
                              placeholder={`보안 질문 ${idx + 1} 입력`}
                              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-slate-400">
                              정답 (대소문자/띄어쓰기 무관 일치) *
                            </label>
                            <input
                              type="text"
                              required
                              value={quiz.answer}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditQuizzes(prev => prev.map((q, i) => i === idx ? { ...q, answer: val } : q));
                              }}
                              placeholder={`문제 ${idx + 1} 정답 입력`}
                              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-3.5 py-2 border border-slate-700 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <span>{isEditSubmitting ? '저장 중...' : '방 설정 저장'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast for Complete All Interviews */}
      {completeAllSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-950/90 border border-emerald-500/60 rounded-2xl shadow-2xl text-emerald-200 text-xs flex items-center gap-3 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold">{completeAllSuccessToast}</span>
        </div>
      )}

      {/* Modal: Complete All Interviews & Results Publication Policy */}
      <AdminAllInterviewsCompleteModal
        isOpen={isCompleteAllModalOpen}
        onClose={() => setIsCompleteAllModalOpen(false)}
        settings={settings}
        operatorName="총괄 관리자"
        totalCandidatesCount={candidates.length}
        completedCandidatesCount={candidates.filter(c => c.status === 'COMPLETED').length}
        onCompleteAll={handleCompleteAllInterviews}
      />
    </div>
  );
};
