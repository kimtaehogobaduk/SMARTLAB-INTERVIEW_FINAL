import React, { useState, useEffect } from 'react';
import {
  InterviewRoomItem,
  InterviewerUser,
  PlatformSettings,
  EvaluationCriterion,
  ScoringFormula,
  AuditLog,
  Candidate,
  Evaluation
} from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { AdminStatsDashboard } from './AdminStatsDashboard';
import { AIKnowledgeManager } from './AIKnowledgeManager';
import {
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
  BookOpen
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
  }) => Promise<void>;
  onUpdateRoom: (roomId: string, data: { interviewers?: string[]; name?: string; description?: string }) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<'CRITERIA' | 'STATS' | 'ROOMS' | 'AUDIT' | 'AI_KNOWLEDGE'>('STATS');

  // Room creation state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newMinutes, setNewMinutes] = useState(30);
  const [rawInterviewersText, setRawInterviewersText] = useState('면접관 1, 면접관 2, 면접관 3');
  const [isRoomSubmitting, setIsRoomSubmitting] = useState(false);
  const [roomSuccessMsg, setRoomSuccessMsg] = useState('');
  const [roomErrorMsg, setRoomErrorMsg] = useState('');

  // Editing existing room interviewers
  const [editingRoom, setEditingRoom] = useState<InterviewRoomItem | null>(null);
  const [editInterviewersText, setEditInterviewersText] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Criteria Configuration State
  const [localCriteria, setLocalCriteria] = useState<EvaluationCriterion[]>(() => {
    return settings.criteria && settings.criteria.length > 0
      ? JSON.parse(JSON.stringify(settings.criteria))
      : JSON.parse(JSON.stringify(PRESET_TEMPLATES[0].criteria));
  });

  const [localFormula, setLocalFormula] = useState<ScoringFormula>(settings.scoringFormula || 'TRIMMED_MEAN');
  const [localPassScore, setLocalPassScore] = useState<number>(settings.passThresholdScore || 70);
  const [isCriteriaDirty, setIsCriteriaDirty] = useState(false);
  const [criteriaSubmitting, setCriteriaSubmitting] = useState(false);
  const [criteriaSuccessMsg, setCriteriaSuccessMsg] = useState('');
  const [criteriaErrorMsg, setCriteriaErrorMsg] = useState('');

  // Sync when settings change from outside ONLY if the user hasn't made dirty edits
  useEffect(() => {
    if (!isCriteriaDirty) {
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
  }, [settings, isCriteriaDirty]);

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
      if (settings.criteria && settings.criteria.length > 0) {
        setLocalCriteria(JSON.parse(JSON.stringify(settings.criteria)));
      }
      if (settings.scoringFormula) {
        setLocalFormula(settings.scoringFormula);
      }
      if (settings.passThresholdScore !== undefined) {
        setLocalPassScore(settings.passThresholdScore);
      }
      setIsCriteriaDirty(false);
      setCriteriaSuccessMsg('서버에 저장된 기존 설정으로 복원되었습니다.');
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
      await onConfirmCriteria(criteriaToSave, localFormula, localPassScore);
      setIsCriteriaDirty(false);
      setCriteriaSuccessMsg('✅ 평가 기준과 가중치 공식이 성공적으로 저장 및 실시간 적용되었습니다!');
      setTimeout(() => setCriteriaSuccessMsg(''), 5000);
    } catch (err: any) {
      setCriteriaErrorMsg(err.message || '평가 기준 저장 중 오류가 발생했습니다.');
    } finally {
      setCriteriaSubmitting(false);
    }
  };

  const handleUnlockForEdit = async () => {
    if (confirm('평가 기준을 임시 미확정(평가 일시 중단) 상태로 변경하시겠습니까?')) {
      setCriteriaSubmitting(true);
      try {
        await onUnconfirmCriteria();
        setCriteriaSuccessMsg('평가 기준이 미확정 상태로 전환되었습니다.');
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

    setIsRoomSubmitting(true);
    setRoomErrorMsg('');
    try {
      await onCreateRoom({
        name: newRoomName.trim(),
        description: newRoomDesc.trim() || 'SmartLab 동아리 실시간 면접 평가실',
        minutesPerPerson: Number(newMinutes) || 30,
        panelCount: parsedNewInterviewers.length,
        interviewers: parsedNewInterviewers
      });

      setRoomSuccessMsg(`"${newRoomName.trim()}" 방과 면접관 ${parsedNewInterviewers.length}명이 등록되었습니다.`);
      setNewRoomName('');
      setNewRoomDesc('');
      setRawInterviewersText('면접관 1, 면접관 2, 면접관 3');
      setNewMinutes(30);
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

    setIsEditSubmitting(true);
    try {
      await onUpdateRoom(editingRoom.id, { interviewers: parsed });
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

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-8 relative overflow-x-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
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
          {/* Status & Quick Action Bar */}
          <div className={`p-5 rounded-3xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 shadow-xl backdrop-blur-md ${
            settings.isCriteriaConfirmed
              ? 'bg-slate-900/95 border-slate-700/80 text-slate-100'
              : 'bg-amber-950/40 border-amber-800/80 text-amber-100'
          }`}>
            <div className="flex items-start gap-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                settings.isCriteriaConfirmed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
              }`}>
                {settings.isCriteriaConfirmed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Sliders className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white">
                    {settings.isCriteriaConfirmed
                      ? '평가 기준 및 가중 합산 기준이 실시간 적용 중입니다'
                      : '평가 기준 설정 및 편집 중'}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    settings.isCriteriaConfirmed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {settings.isCriteriaConfirmed ? '실시간 평가 활성화됨' : '작성/설정 중'}
                  </span>
                  {isCriteriaDirty && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-xs animate-bounce">
                      ✏️ 미저장 수정 내역 있음
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  언제든지 평가 항목, 배점 가중치, 합산 방식을 자유롭게 수정한 후 [저장 및 실시간 적용]을 누르면 모든 면접실에 즉각 반영됩니다.
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
                  {criteriaSubmitting ? '저장 동기화 중...' : '평가 기준 저장 및 즉시 반영'}
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
                            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>면접관 명단 수정</span>
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
                  rows={4}
                  required
                  value={editInterviewersText}
                  onChange={(e) => setEditInterviewersText(e.target.value)}
                  placeholder="예: 김철수, 이영희, 박민수, 최지훈"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
                />
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
                  <span>{isEditSubmitting ? '저장 중...' : '면접관 명단 저장'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
