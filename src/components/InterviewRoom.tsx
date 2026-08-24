import React, { useState, useEffect, useRef } from 'react';
import {
  Candidate,
  Evaluation,
  InterviewerUser,
  PanelVisibility,
  LayoutPreset,
  LayoutStructure,
  STTMessage,
  DocumentItem,
  TailQuestion,
  PlatformSettings,
  InterviewerPresence,
  InterviewerChatMessage
} from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { STTConsole } from './STTConsole';
import { DocumentViewer } from './DocumentViewer';
import { EvaluationForm } from './EvaluationForm';
import { ObserverDashboard, formatInterviewerDisplayName } from './ObserverDashboard';
import { InterviewerChat } from './InterviewerChat';
import { FlexibleWorkspace } from './FlexibleWorkspace';
import {
  ArrowLeft,
  LayoutGrid,
  FileText,
  Mic,
  CheckSquare,
  Play,
  Square,
  RotateCcw,
  UserX,
  CheckCircle2,
  Trophy,
  Brain,
  Shield,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Activity,
  Users,
  Zap,
  AlertTriangle,
  Lightbulb,
  Clock,
  UserCheck,
  ChevronDown,
  Radio,
  Sparkles,
  MessageSquare,
  X,
  Columns,
  Rows,
  SplitSquareVertical,
  SplitSquareHorizontal,
  Maximize2
} from 'lucide-react';

interface InterviewRoomProps {
  candidate: Candidate;
  allCandidates: Candidate[];
  currentUser: InterviewerUser;
  myEvaluation: Evaluation | null;
  peerEvaluations: Evaluation[];
  isBlind: boolean;
  timerSeconds: number;
  settings?: PlatformSettings;
  initialObserverMode?: boolean;
  onBackToList: () => void;
  onSelectCandidate: (id: string) => void;
  onStatusChange: (
    action: 'start' | 'no_show' | 'vote_no_show' | 'cancel_vote_no_show' | 'cancel_no_show' | 'finish' | 'cancel_finish',
    reason?: string
  ) => void;
  onSaveEvaluation: (evalData: Evaluation, isSubmitting?: boolean) => void;
  onSendMessage: (msg: STTMessage, triggerAI: boolean) => void;
  onAddDocument: (newDoc: DocumentItem) => void;
  onDeleteDocument?: (docId: string) => void;
  onUseTailQuestion: (q: TailQuestion) => void;
  onOpenLeaderboard: () => void;
  onOpenAIQualitative: () => void;
  onOpenAdmin: () => void;
  isAiLoading: boolean;
}

export const InterviewRoom: React.FC<InterviewRoomProps> = ({
  candidate,
  allCandidates,
  currentUser,
  myEvaluation,
  peerEvaluations,
  isBlind,
  timerSeconds,
  settings,
  initialObserverMode = false,
  onBackToList,
  onSelectCandidate,
  onStatusChange,
  onSaveEvaluation,
  onSendMessage,
  onAddDocument,
  onDeleteDocument,
  onUseTailQuestion,
  onOpenLeaderboard,
  onOpenAIQualitative,
  onOpenAdmin,
  isAiLoading
}) => {
  // Pure Observer Mode (fixed based on entry mode)
  const isObserverMode = initialObserverMode;

  // Panel Visibility State (All panels including Chat can be toggled on/off)
  const [panels, setPanels] = useState<PanelVisibility>({
    showSTT: true,
    showDocs: true,
    showEval: true,
    showChat: false
  });

  // Layout Topology Structure (Columns, Top/Bottom T, Inverse T, Left/Right Stack, 2x2 Grid)
  const [layoutStructure, setLayoutStructure] = useState<LayoutStructure>('COLUMNS');

  const [noShowConfirmOpen, setNoShowConfirmOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  // Interviewer Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatFloating, setIsChatFloating] = useState(true);
  const [isFloatingBubbleEnabled, setIsFloatingBubbleEnabled] = useState(true);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Mini Toast Notification for incoming chat messages (작게 알림 뜨게)
  const [chatToast, setChatToast] = useState<InterviewerChatMessage | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleNewMessageToast = (msg: InterviewerChatMessage) => {
    // If chat is not currently visible as an open panel or modal
    if (!panels.showChat || !isChatOpen) {
      setChatToast(msg);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setChatToast(null);
      }, 5000);
    }
  };

  // Actions menu state (e.g. 질문 먼저 하기, 의심/팩트체크 신호 등)
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSendingAction, setIsSendingAction] = useState(false);

  // Realtime Presence State of all interviewers in the room
  const [livePresences, setLivePresences] = useState<InterviewerPresence[]>([]);

  // Send action signal to all other interviewers in real time
  const handleSendAction = async (
    actionType: 'question' | 'suspicion' | 'tail_question' | 'yield' | 'time_check',
    customMessage?: string
  ) => {
    setIsSendingAction(true);
    setIsActionMenuOpen(false);

    try {
      const res = await fetch('/api/notifications/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType,
          operatorId: currentUser.id,
          operatorName: currentUser.name,
          roomId: candidate.roomId || 'room-1',
          roomName: candidate.timeslot?.room || 'SmartLab 면접 평가실',
          candidateId: candidate.id,
          candidateName: candidate.name,
          customMessage
        })
      });

      if (res.ok) {
        let label = '신호를 전송했습니다 (동료 면접관 화면에 4초간 표시)';
        if (actionType === 'question') {
          label = '🙋 [질문 신호]를 전송했습니다 ("000 면접관이 먼저 질문합니다" 4초간 표시)';
        } else if (actionType === 'suspicion') {
          label = '🔍 [의심/팩트체크 신호]를 동료 면접관들에게 공유했습니다';
        } else if (actionType === 'tail_question') {
          label = '💡 [AI 꼬리질문 추천 요청] 신호를 전송했습니다';
        } else if (actionType === 'yield') {
          label = '🤝 [질문 순서 양보] 신호를 전송했습니다';
        } else if (actionType === 'time_check') {
          label = '⏱️ [시간 준수 체크] 신호를 전송했습니다';
        }

        setActionFeedback(label);
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (e) {
      console.error('Failed to broadcast action:', e);
    } finally {
      setIsSendingAction(false);
    }
  };

  // Send Heartbeat and Poll Presences
  useEffect(() => {
    let isMounted = true;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewerId: currentUser.id,
            interviewerName: currentUser.name,
            roomId: candidate.roomId || 'room-1',
            candidateId: candidate.id,
            mode: isObserverMode ? 'observing' : 'evaluating'
          })
        });
      } catch (e) {
        // Heartbeat failure ignored silently
      }
    };

    const fetchPresences = async () => {
      try {
        const res = await fetch(`/api/presence?roomId=${candidate.roomId || ''}&candidateId=${candidate.id}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setLivePresences(data);
          }
        }
      } catch (e) {
        // Presence fetch failure ignored
      }
    };

    // Initial run
    sendHeartbeat();
    fetchPresences();

    // Intervals
    const heartbeatInterval = setInterval(sendHeartbeat, 5000);
    const presenceInterval = setInterval(fetchPresences, 3000);

    return () => {
      isMounted = false;
      clearInterval(heartbeatInterval);
      clearInterval(presenceInterval);
      // Attempt leave notification on unmount
      try {
        fetch('/api/presence/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewerId: currentUser.id,
            roomId: candidate.roomId,
            candidateId: candidate.id
          }),
          keepalive: true
        });
      } catch (e) {
        // Ignore
      }
    };
  }, [currentUser.id, currentUser.name, candidate.id, candidate.roomId, isObserverMode]);

  // Compute merged interviewer list with their real-time state:
  // Colors:
  // - 🟢 Evaluating (채점중)
  // - 🟡 Observing (관전중)
  // - 🔴 Left (아까 있었는데 나갔음 / 오프라인)
  const computeInterviewerStatuses = () => {
    const list: Array<{
      id: string;
      displayName: string;
      mode: 'evaluating' | 'observing' | 'left';
      isCurrent: boolean;
      statusLabel: string;
    }> = [];

    const knownIds = new Set<string>();

    // 1. Current user
    const myDisplayName = formatInterviewerDisplayName(currentUser.name);
    list.push({
      id: currentUser.id,
      displayName: myDisplayName,
      mode: isObserverMode ? 'observing' : 'evaluating',
      isCurrent: true,
      statusLabel: isObserverMode ? '관전중' : '채점중'
    });
    knownIds.add(currentUser.id);
    knownIds.add(currentUser.name);

    // 2. Add from server live presences
    livePresences.forEach((p) => {
      const cleanName = formatInterviewerDisplayName(p.interviewerName);
      if (knownIds.has(p.interviewerId) || knownIds.has(cleanName) || knownIds.has(p.interviewerName)) {
        return;
      }
      knownIds.add(p.interviewerId);
      knownIds.add(cleanName);

      let mode: 'evaluating' | 'observing' | 'left' = p.mode;
      let label = '나감';
      if (mode === 'evaluating') label = '채점중';
      else if (mode === 'observing') label = '관전중';
      else label = '나감';

      list.push({
        id: p.interviewerId,
        displayName: cleanName,
        mode: mode,
        isCurrent: false,
        statusLabel: label
      });
    });

    // 3. Add from peer evaluations (if peer evaluated, they were here)
    peerEvaluations.forEach((pe) => {
      const cleanName = formatInterviewerDisplayName(pe.interviewerName);
      if (knownIds.has(pe.interviewerId) || knownIds.has(cleanName) || knownIds.has(pe.interviewerName)) {
        return;
      }
      knownIds.add(pe.interviewerId);
      knownIds.add(cleanName);

      // Check if this peer is marked active in livePresences
      const live = livePresences.find(lp => lp.interviewerId === pe.interviewerId || formatInterviewerDisplayName(lp.interviewerName) === cleanName);
      const isOnline = live && live.mode !== 'left';
      const mode = isOnline ? (live.mode || 'evaluating') : 'left';
      const label = mode === 'evaluating' ? '채점중' : mode === 'observing' ? '관전중' : '나감';

      list.push({
        id: pe.interviewerId || pe.id || cleanName,
        displayName: cleanName,
        mode: mode,
        isCurrent: false,
        statusLabel: label
      });
    });

    // 4. Fallback from candidate assigned interviewers (e.g. ['이지은', '박준혁'])
    if (Array.isArray(candidate.interviewers)) {
      candidate.interviewers.forEach((nameOrObj: any, idx) => {
        const rawName = typeof nameOrObj === 'string' ? nameOrObj : nameOrObj?.name || `면접관 ${idx + 1}`;
        const cleanName = formatInterviewerDisplayName(rawName);
        if (knownIds.has(cleanName) || knownIds.has(rawName)) {
          return;
        }
        knownIds.add(cleanName);

        // Not currently active
        list.push({
          id: `assigned-${idx}`,
          displayName: cleanName,
          mode: 'left',
          isCurrent: false,
          statusLabel: '나감'
        });
      });
    }

    return list;
  };

  const interviewerPresenceList = computeInterviewerStatuses();

  const applyLayoutPreset = (preset: LayoutPreset | 'ALL_OFF') => {
    switch (preset) {
      case 'ALL_THREE':
        setLayoutStructure('COLUMNS');
        setPanels({ showSTT: true, showDocs: true, showEval: true, showChat: false });
        break;
      case 'ALL_FOUR':
        setLayoutStructure('COLUMNS');
        setPanels({ showSTT: true, showDocs: true, showEval: true, showChat: true });
        break;
      case 'TOP_BOTTOM_T':
        setLayoutStructure('TOP_ONE_BOTTOM_TWO');
        setPanels({ showDocs: true, showSTT: true, showEval: true, showChat: false });
        break;
      case 'TOP_BOTTOM_INV_T':
        setLayoutStructure('TOP_TWO_BOTTOM_ONE');
        setPanels({ showSTT: true, showDocs: true, showEval: true, showChat: false });
        break;
      case 'LEFT_RIGHT_STACK':
        setLayoutStructure('LEFT_ONE_RIGHT_TWO');
        setPanels({ showSTT: true, showDocs: true, showEval: true, showChat: false });
        break;
      case 'GRID_2X2':
        setLayoutStructure('GRID_2X2');
        setPanels({ showSTT: true, showDocs: true, showEval: true, showChat: true });
        break;
      case 'DOCS_AND_EVAL':
        setLayoutStructure('COLUMNS');
        setPanels({ showSTT: false, showDocs: true, showEval: true, showChat: false });
        break;
      case 'STT_AND_EVAL':
        setLayoutStructure('COLUMNS');
        setPanels({ showSTT: true, showDocs: false, showEval: true, showChat: false });
        break;
      case 'EVAL_AND_CHAT':
        setLayoutStructure('COLUMNS');
        setPanels({ showSTT: false, showDocs: false, showEval: true, showChat: true });
        break;
      case 'STT_AND_CHAT':
        setLayoutStructure('COLUMNS');
        setPanels({ showSTT: true, showDocs: false, showEval: false, showChat: true });
        break;
      case 'DOCS_AND_CHAT':
        setLayoutStructure('COLUMNS');
        setPanels({ showSTT: false, showDocs: true, showEval: false, showChat: true });
        break;
      case 'EVAL_ONLY':
        setLayoutStructure('COLUMNS');
        setPanels({ showSTT: false, showDocs: false, showEval: true, showChat: false });
        break;
      case 'CHAT_ONLY':
        setLayoutStructure('COLUMNS');
        setPanels({ showSTT: false, showDocs: false, showEval: false, showChat: true });
        break;
      case 'ALL_OFF':
        setLayoutStructure('COLUMNS');
        setPanels({ showSTT: false, showDocs: false, showEval: false, showChat: false });
        break;
    }
    setIsLayoutMenuOpen(false);
  };

  // Toggle individual panel without blocking (allows 0 panels -> empty screen)
  const togglePanel = (key: keyof PanelVisibility) => {
    setPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Format Stopwatch (MM:SS)
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate dynamic CSS grid layout
  const visibleCount =
    (panels.showSTT ? 1 : 0) +
    (panels.showDocs ? 1 : 0) +
    (panels.showEval ? 1 : 0) +
    (panels.showChat ? 1 : 0);

  let gridClass = 'grid-cols-1';

  if (visibleCount === 4) {
    gridClass = 'grid-cols-[280px_1fr_340px_320px]';
  } else if (visibleCount === 3) {
    if (!panels.showChat) {
      gridClass = 'grid-cols-[340px_1fr_360px]';
    } else if (!panels.showDocs) {
      gridClass = 'grid-cols-[320px_1fr_340px]';
    } else if (!panels.showSTT) {
      gridClass = 'grid-cols-[1fr_360px_340px]';
    } else if (!panels.showEval) {
      gridClass = 'grid-cols-[320px_1fr_340px]';
    }
  } else if (visibleCount === 2) {
    if (panels.showDocs && panels.showEval) {
      gridClass = 'grid-cols-[1fr_420px]';
    } else if (panels.showSTT && panels.showEval) {
      gridClass = 'grid-cols-[360px_1fr]';
    } else if (panels.showSTT && panels.showDocs) {
      gridClass = 'grid-cols-[360px_1fr]';
    } else if (panels.showEval && panels.showChat) {
      gridClass = 'grid-cols-[1fr_360px]';
    } else if (panels.showSTT && panels.showChat) {
      gridClass = 'grid-cols-[1fr_360px]';
    } else if (panels.showDocs && panels.showChat) {
      gridClass = 'grid-cols-[1fr_360px]';
    } else {
      gridClass = 'grid-cols-[1fr_1fr]';
    }
  } else if (visibleCount === 1) {
    gridClass = 'grid-cols-1';
  }

  const isFormLocked = candidate.status === 'PENDING';
  const isCurrentlySubmitted = myEvaluation?.status === 'SUBMITTED';

  // No-Show 2/3 agreement calculation
  const totalInterviewersCount = candidate.interviewers?.length || (peerEvaluations.length > 0 ? peerEvaluations.length : 3);
  const requiredNoShowVotes = Math.ceil((totalInterviewersCount * 2) / 3);
  const currentVotes: string[] = Array.isArray(candidate.noShowVotes) ? candidate.noShowVotes : [];
  const hasMyVote = currentVotes.includes(currentUser.id) || currentVotes.includes(currentUser.name);
  const isCandidateNoShow = candidate.status === 'NO_SHOW';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden select-none">
      {/* ==================================================================== */}
      {/* 1. TOP HEADER & CUSTOM LAYOUT CONTROLS */}
      {/* ==================================================================== */}
      <header className="h-16 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left: Back button & Candidate Profile */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToList}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>목록으로</span>
          </button>

          {/* Quick Candidate Switcher Dropdown */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <select
              value={candidate.id}
              onChange={(e) => onSelectCandidate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-slate-900 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {allCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.timeslot.start}] {c.name} ({c.track})
                </option>
              ))}
            </select>

            <div className="text-left hidden sm:block">
              <span className="text-[10px] text-slate-400 font-mono block">
                {candidate.studentId} • {candidate.timeslot.room}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Customizable Screen Panel Toggle Controls & Observer Status & Action Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Observer Mode Indicator Badge (No switch button) */}
          {isObserverMode && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <Eye className="w-4 h-4 text-amber-600" />
              <span>관전 모드 (Observer)</span>
            </div>
          )}

          {/* Action Menu (행동 신호: 질문, 의심 등) */}
          <div className="relative">
            <button
              onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              disabled={isSendingAction}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="동료 면접관들과 실시간 신호/행동 공유"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-200 text-amber-200 animate-pulse" />
              <span>행동 (신호)</span>
              <ChevronDown className="w-3 h-3 text-amber-200" />
            </button>

            {/* Action Menu Dropdown */}
            {isActionMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 text-xs font-semibold animate-fade-in space-y-1">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-500 animate-ping" />
                    <span>실시간 면접관 상호작용 (신호)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                    신호를 누르면 동료 면접관들 화면에 4초간 알림이 표시됩니다.
                  </p>
                </div>

                {/* 1. 질문하기 */}
                <button
                  onClick={() => handleSendAction('question')}
                  className="w-full text-left p-2.5 hover:bg-indigo-50 rounded-xl text-slate-700 hover:text-indigo-900 flex items-start gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-700">
                        🙋 질문하기 (내가 먼저 질문)
                      </span>
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">4초 알림</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      "{formatInterviewerDisplayName(currentUser.name)} 면접관이 먼저 질문합니다" 알림을 브로드캐스트합니다.
                    </p>
                  </div>
                </button>

                {/* 2. 의심 / 팩트체크 */}
                <button
                  onClick={() => handleSendAction('suspicion')}
                  className="w-full text-left p-2.5 hover:bg-rose-50 rounded-xl text-slate-700 hover:text-rose-900 flex items-start gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-rose-700">
                        🔍 의심 (허위/과장 팩트체크)
                      </span>
                      <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-mono">진위 검증</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      지원자의 답변/서류 진위가 의심될 때 동료 면접관들과 즉시 신호를 공유합니다.
                    </p>
                  </div>
                </button>

                {/* 3. AI 꼬리질문 제안 */}
                <button
                  onClick={() => handleSendAction('tail_question')}
                  className="w-full text-left p-2.5 hover:bg-amber-50 rounded-xl text-slate-700 hover:text-amber-900 flex items-start gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-amber-700 block">
                      💡 AI 꼬리질문 추천 요청
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      방금 발언에 대한 AI 심층 검증 꼬리질문을 함께 확인하자고 제안합니다.
                    </p>
                  </div>
                </button>

                {/* 4. 순서 양보 */}
                <button
                  onClick={() => handleSendAction('yield')}
                  className="w-full text-left p-2.5 hover:bg-emerald-50 rounded-xl text-slate-700 hover:text-emerald-900 flex items-start gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 block">
                      🤝 질문 순서 양보 (Pass)
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      다른 면접관님께 다음 질문 발언권을 양보합니다.
                    </p>
                  </div>
                </button>

                {/* 5. 시간 체크 */}
                <button
                  onClick={() => handleSendAction('time_check')}
                  className="w-full text-left p-2.5 hover:bg-slate-100 rounded-xl text-slate-700 hover:text-slate-900 flex items-start gap-2.5 transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition-colors shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-slate-700 block">
                      ⏱️ 면접 시간 체크 (마무리)
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      배정된 면접 시간을 확인하고 마무리를 준비하자고 알립니다.
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold animate-fade-in shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* Layout Controls */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              화면 구성:
            </span>

            {/* Individual Panel Toggles */}
            <button
              onClick={() => togglePanel('showSTT')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                panels.showSTT
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-200/70'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>STT 콘솔</span>
            </button>

            <button
              onClick={() => togglePanel('showDocs')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                panels.showDocs
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-200/70'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>지원 서류</span>
            </button>

            <button
              onClick={() => togglePanel('showEval')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                panels.showEval
                  ? isObserverMode ? 'bg-amber-600 text-white shadow-2xs' : 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-200/70'
              }`}
            >
              {isObserverMode ? <Eye className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
              <span>{isObserverMode ? '관전 현황' : '평가표'}</span>
            </button>

            <button
              onClick={() => togglePanel('showChat')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                panels.showChat
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-200/70'
              }`}
              title="면접관 실시간 대화창을 화면 패널로 배치"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>면접관 대화</span>
              {unreadChatCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold font-mono animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Preset Layouts Dropdown */}
            <div className="relative border-l border-slate-200 pl-1">
              <button
                onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                  isLayoutMenuOpen
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="화면 분할 구조 및 레이아웃 프리셋"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-[11px] hidden md:inline">화면 분할</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isLayoutMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 text-xs font-semibold animate-fade-in divide-y divide-slate-100">
                  {/* Section 1: Multi-Split Structure Selection */}
                  <div className="p-2 space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 block">
                      📐 화면 분할 구조 (마우스 드래그 조절)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLayoutStructure('COLUMNS');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        layoutStructure === 'COLUMNS'
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Columns className="w-3.5 h-3.5 text-indigo-600" />
                        <span>가로 열 분할 (Columns)</span>
                      </div>
                      {layoutStructure === 'COLUMNS' && <span className="text-[10px] text-indigo-600 font-bold">선택됨</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLayoutStructure('TOP_ONE_BOTTOM_TWO');
                        setPanels(prev => ({ ...prev, showDocs: true, showSTT: true, showEval: true }));
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        layoutStructure === 'TOP_ONE_BOTTOM_TWO'
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <SplitSquareHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                        <span>상단 1개 + 하단 2개 (T자형)</span>
                      </div>
                      {layoutStructure === 'TOP_ONE_BOTTOM_TWO' && <span className="text-[10px] text-indigo-600 font-bold">선택됨</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLayoutStructure('TOP_TWO_BOTTOM_ONE');
                        setPanels(prev => ({ ...prev, showSTT: true, showDocs: true, showEval: true }));
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        layoutStructure === 'TOP_TWO_BOTTOM_ONE'
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Rows className="w-3.5 h-3.5 text-indigo-600" />
                        <span>상단 2개 + 하단 1개 (역T자형)</span>
                      </div>
                      {layoutStructure === 'TOP_TWO_BOTTOM_ONE' && <span className="text-[10px] text-indigo-600 font-bold">선택됨</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLayoutStructure('LEFT_ONE_RIGHT_TWO');
                        setPanels(prev => ({ ...prev, showSTT: true, showDocs: true, showEval: true }));
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        layoutStructure === 'LEFT_ONE_RIGHT_TWO'
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <SplitSquareVertical className="w-3.5 h-3.5 text-indigo-600" />
                        <span>좌측 1개 + 우측 상하 2개</span>
                      </div>
                      {layoutStructure === 'LEFT_ONE_RIGHT_TWO' && <span className="text-[10px] text-indigo-600 font-bold">선택됨</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLayoutStructure('GRID_2X2');
                        setPanels({ showSTT: true, showDocs: true, showEval: true, showChat: true });
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        layoutStructure === 'GRID_2X2'
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                        <span>2x2 쿼드 바둑판 (4분할)</span>
                      </div>
                      {layoutStructure === 'GRID_2X2' && <span className="text-[10px] text-indigo-600 font-bold">선택됨</span>}
                    </button>
                  </div>

                  {/* Section 2: Quick Presets */}
                  <div className="p-2 space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 block">
                      ⚡ 빠른 구성 프리셋
                    </span>
                    <button
                      type="button"
                      onClick={() => applyLayoutPreset('ALL_THREE')}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg block cursor-pointer"
                    >
                      표준 3분할 (STT + 서류 + 평가표)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyLayoutPreset('ALL_FOUR')}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 text-indigo-700 font-bold rounded-lg block cursor-pointer"
                    >
                      ✨ 4분할 전체 (대화창 포함)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyLayoutPreset('EVAL_AND_CHAT')}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg block cursor-pointer"
                    >
                      {isObserverMode ? '관전현황' : '평가표'} + 대화창 모드
                    </button>
                    <button
                      type="button"
                      onClick={() => applyLayoutPreset('DOCS_AND_EVAL')}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg block cursor-pointer"
                    >
                      서류 + {isObserverMode ? '관전현황' : '평가표'} 모드
                    </button>
                    <button
                      type="button"
                      onClick={() => applyLayoutPreset('STT_AND_EVAL')}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg block cursor-pointer"
                    >
                      대화/STT + {isObserverMode ? '관전현황' : '평가표'} 모드
                    </button>
                  </div>

                  {/* Section 3: Options & Reset */}
                  <div className="p-2 space-y-1">
                    {/* Floating Tab Restore Toggle if disabled */}
                    {!isFloatingBubbleEnabled && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsFloatingBubbleEnabled(true);
                          setIsLayoutMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg flex items-center gap-2 cursor-pointer font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>하단 플로팅 대화 버튼 복구</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => applyLayoutPreset('ALL_OFF')}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 text-red-600 font-bold rounded-lg block cursor-pointer"
                    >
                      전체 패널 숨기기 (빈 화면)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Interviewer Chat Button, Stopwatch Timer & Current Interviewer */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Interviewer Realtime Chat Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (panels.showChat) {
                togglePanel('showChat');
              } else {
                setIsChatOpen(!isChatOpen);
              }
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 ${
              panels.showChat || isChatOpen
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-600'
            }`}
            title="동료 면접관들과 실시간 채팅"
          >
            <MessageSquare className={`w-3.5 h-3.5 ${panels.showChat || isChatOpen ? 'text-white' : 'text-indigo-600'}`} />
            <span className="hidden sm:inline">면접관 대화</span>
            {unreadChatCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold font-mono animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Stopwatch Digital Monospace Display */}
          <div className="bg-slate-950 px-3.5 py-1 rounded-lg border border-slate-800 shadow-inner flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <div className="font-mono text-xl font-black text-red-500 tracking-wider">
              {formatTimer(timerSeconds)}
            </div>
          </div>

          <div className="text-right border-l border-slate-200 pl-3">
            <div className="text-xs font-bold text-slate-900">{formatInterviewerDisplayName(currentUser.name)}</div>
            <div className="text-[10px] font-semibold text-blue-600">
              {isObserverMode ? '관전 심사위원' : '평가 심사위원'}
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. DYNAMIC WORKSPACE (Configurable Layout & Empty State Support) */}
      {/* ==================================================================== */}
      <main className={`flex-1 ${visibleCount > 0 ? `grid ${gridClass}` : 'flex items-center justify-center'} gap-px bg-slate-300 min-h-0 overflow-hidden`}>
        {/* Empty Workspace Placeholder when all 3 panels are OFF */}
        {visibleCount === 0 && (
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-8 text-center select-none">
            <div className="p-6 bg-slate-800/90 rounded-2xl border border-slate-700/80 max-w-md shadow-2xl space-y-3 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-400/20">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">모든 화면 패널이 숨겨졌습니다</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                현재 빈 화면 모드입니다. 상단 헤더의 <strong>[STT 콘솔]</strong>, <strong>[지원 서류]</strong>, <strong>[{isObserverMode ? '관전 현황' : '평가표'}]</strong> 버튼을 클릭하여 원하는 화면을 다시 활성화할 수 있습니다.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => applyLayoutPreset('ALL_THREE')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  기본 3분할 화면 복구
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel 1: STT Console (Togglable) */}
        {panels.showSTT && (
          <section className="h-full overflow-hidden bg-white">
            <STTConsole
              transcript={candidate.sttTranscript || []}
              realtimeSummaries={candidate.aiInsights?.realtimeSummaries || []}
              tailQuestions={candidate.aiInsights?.tailQuestions || []}
              contradictions={candidate.aiInsights?.contradictions || []}
              candidateName={candidate.name}
              candidateTrack={candidate.track}
              settings={settings}
              onSendMessage={onSendMessage}
              onUseTailQuestion={onUseTailQuestion}
              isLoadingAI={isAiLoading}
            />
          </section>
        )}

        {/* Panel 2: Document Viewer (Togglable) */}
        {panels.showDocs && (
          <section className="h-full overflow-hidden bg-slate-900">
            <DocumentViewer
              documents={candidate.documents || []}
              candidateName={candidate.name}
              onAddDocument={onAddDocument}
              onDeleteDocument={onDeleteDocument}
            />
          </section>
        )}

        {/* Panel 3: Evaluation Form or Observer Dashboard (Togglable) */}
        {panels.showEval && (
          <section className="h-full overflow-hidden bg-white">
            {isObserverMode ? (
              <ObserverDashboard
                candidate={candidate}
                peerEvaluations={peerEvaluations}
                settings={settings || {
                  isCriteriaConfirmed: false,
                  criteria: [],
                  scoringFormula: 'AVERAGE',
                  passThresholdScore: 70
                }}
              />
            ) : myEvaluation ? (
              <EvaluationForm
                evaluation={myEvaluation}
                peerEvaluations={peerEvaluations}
                candidateStatus={candidate.status}
                isBlind={isBlind}
                isLocked={isFormLocked}
                settings={settings}
                onSaveEvaluation={onSaveEvaluation}
                currentInterviewerName={currentUser.name}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                평가표 로딩 중...
              </div>
            )}
          </section>
        )}

        {/* Panel 4: Interviewer Realtime Chat Panel (Togglable into Workspace Grid) */}
        {panels.showChat && (
          <section className="h-full overflow-hidden bg-white">
            <InterviewerChat
              currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
              roomId={candidate.roomId || 'room-1'}
              roomName={candidate.timeslot?.room || 'SmartLab 면접 평가실'}
              candidateId={candidate.id}
              candidateName={candidate.name}
              presences={livePresences}
              isOpen={true}
              onClose={() => setPanels(prev => ({ ...prev, showChat: false }))}
              isFloating={false}
              onToggleFloating={() => {
                setPanels(prev => ({ ...prev, showChat: false }));
                setIsChatFloating(true);
                setIsChatOpen(true);
              }}
              onUnreadCountChange={setUnreadChatCount}
              onNewMessageToast={handleNewMessageToast}
            />
          </section>
        )}
      </main>

      {/* ==================================================================== */}
      {/* 3. FOOTER ACTIONS, REALTIME INTERVIEWERS & STATE MACHINE */}
      {/* ==================================================================== */}
      <footer className="h-16 bg-white border-t border-slate-200 px-5 flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left Side: Secondary Tools */}
        <div className="flex items-center gap-2">
          {candidate.status === 'NO_SHOW' ? (
            <button
              onClick={() => onStatusChange('cancel_no_show')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>결시 취소 (원복)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              {!isObserverMode && (
                <button
                  onClick={() => setNoShowConfirmOpen(true)}
                  className={`px-3 py-2 rounded-md font-bold text-xs border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    hasMyVote
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5 text-red-600" />
                  <span>
                    {hasMyVote
                      ? `결시 동의 철회 (${currentVotes.length}/${requiredNoShowVotes}명)`
                      : currentVotes.length > 0
                      ? `결시 동의 (${currentVotes.length}/${requiredNoShowVotes}명 필요)`
                      : '결시(No-Show) 동의 투표'}
                  </span>
                </button>
              )}

              {currentVotes.length > 0 && !isCandidateNoShow && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-1 rounded-md border border-amber-200">
                  2/3 이상 동의 시 결시 처리 ({currentVotes.length}/{requiredNoShowVotes}명)
                </span>
              )}
            </div>
          )}

          <button
            onClick={onOpenAIQualitative}
            className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md font-bold text-xs border border-purple-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-purple-600" />
            AI 마인드맵 & 요약
          </button>

          <button
            onClick={onOpenAdmin}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-xs border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            감사 로그
          </button>
        </div>

        {/* Center: Realtime Interviewer Presence Indicator (🟢 채점중, 🟡 관전중, 🔴 나감) */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mr-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">면접관 상태:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {interviewerPresenceList.map((intv) => {
              // Color styles:
              // - 🟢 evaluating: Green
              // - 🟡 observing: Yellow / Amber
              // - 🔴 left: Red
              let dotColor = 'bg-emerald-500';
              let badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
              if (intv.mode === 'observing') {
                dotColor = 'bg-amber-500';
                badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
              } else if (intv.mode === 'left') {
                dotColor = 'bg-rose-500';
                badgeBg = 'bg-rose-50 text-rose-700 border-rose-200 opacity-75';
              }

              return (
                <div
                  key={intv.id || intv.displayName}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold ${badgeBg} transition-all`}
                  title={`${intv.displayName}: ${intv.statusLabel}${intv.isCurrent ? ' (나)' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full ${dotColor} ${intv.mode !== 'left' ? 'animate-pulse' : ''}`}></span>
                  <span>{intv.displayName}</span>
                  <span className="text-[9px] font-normal text-slate-500">
                    ({intv.statusLabel})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Start / Finish Action or Observer Info */}
        <div className="flex items-center gap-3">
          {isObserverMode ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>관전 모드 진행 중</span>
              </span>
            </div>
          ) : (
            <>
              {candidate.status === 'PENDING' && (
                <button
                  onClick={() => onStatusChange('start')}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-102 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  면접 시작 (Start)
                </button>
              )}

              {candidate.status === 'IN_PROGRESS' && (
                <>
                  {isCurrentlySubmitted ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        내 평가 제출 완료 (동료 면접관 대기 중)
                      </span>
                      <button
                        onClick={() => onStatusChange('cancel_finish')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        제출 취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onStatusChange('finish')}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                      면접 평가 완료 제출
                    </button>
                  )}
                </>
              )}

              {candidate.status === 'CLOSING_PENDING' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-md flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                    다른 면접관 최종 제출 대기 중...
                  </span>
                  <button
                    onClick={() => onStatusChange('cancel_finish')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  >
                    제출 취소
                  </button>
                </div>
              )}
            </>
          )}

          {candidate.status === 'COMPLETED' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3.5 py-1.5 rounded-md flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                면접관 전원 평가 완료 (COMPLETED)
              </span>
              <button
                onClick={onOpenLeaderboard}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5" />
                순위표 확인
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* No-Show Confirmation Dialog */}
      {noShowConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <UserX className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              {candidate.name} 지원자 결시(No-Show) {hasMyVote ? '동의 철회' : '동의 투표'}
            </h3>
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 text-left space-y-1.5">
              <div className="flex justify-between items-center font-semibold text-slate-800">
                <span>결시 처리 요건:</span>
                <span className="text-red-600 font-bold">면접관 2/3 이상 동의</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>현재 동의 현황:</span>
                <span className="font-mono font-bold text-slate-900">
                  {currentVotes.length} / {totalInterviewersCount}명 (최소 {requiredNoShowVotes}명 필요)
                </span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                {hasMyVote
                  ? '현재 결시 처리에 동의하신 상태입니다. 동의를 취소하시겠습니까?'
                  : `${requiredNoShowVotes}명 이상 동의 시 즉시 결시(No-Show) 확정 및 순위 집계에서 자동 제외됩니다.`}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setNoShowConfirmOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setNoShowConfirmOpen(false);
                  if (hasMyVote) {
                    onStatusChange('cancel_vote_no_show', `${formatInterviewerDisplayName(currentUser.name)} 결시 동의 철회`);
                  } else {
                    onStatusChange('vote_no_show', `${formatInterviewerDisplayName(currentUser.name)} 지원자 미참석 결시 동의 투표`);
                  }
                }}
                className={`px-4 py-2 text-white rounded-md text-xs font-bold cursor-pointer ${
                  hasMyVote
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {hasMyVote ? '동의 철회하기' : '결시 처리에 동의'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Interviewer Chat Window (When not docked in workspace panel) */}
      {!panels.showChat && (
        <InterviewerChat
          currentUser={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
          roomId={candidate.roomId || 'room-1'}
          roomName={candidate.timeslot?.room || 'SmartLab 면접 평가실'}
          candidateId={candidate.id}
          candidateName={candidate.name}
          presences={livePresences}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          isFloating={true}
          onToggleFloating={() => {
            setIsChatOpen(false);
            setPanels(prev => ({ ...prev, showChat: true }));
          }}
          onUnreadCountChange={setUnreadChatCount}
          onNewMessageToast={handleNewMessageToast}
        />
      )}

      {/* Mini Chat Toast Notification (작게 알림 뜨게) */}
      {chatToast && !isChatOpen && !panels.showChat && (
        <div className="fixed bottom-20 right-5 z-50 max-w-sm w-88 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-indigo-500/40 flex items-start gap-3 animate-fade-in">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              chatToast.isImportant
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-xs text-indigo-200 truncate">
                  {formatInterviewerDisplayName(chatToast.senderName)} 면접관
                </span>
                {chatToast.isImportant && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded text-[9px] font-extrabold font-mono">
                    긴급
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                {chatToast.timestamp || '방금'}
              </span>
            </div>

            <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed break-words font-medium">
              {chatToast.message}
            </p>

            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setChatToast(null);
                  setIsChatOpen(true);
                }}
                className="text-[11px] font-bold text-indigo-300 hover:text-indigo-100 flex items-center gap-1 cursor-pointer"
              >
                <span>대화 열기 &rarr;</span>
              </button>
              {unreadChatCount > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  안읽은 메시지 {unreadChatCount}건
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setChatToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer shrink-0"
            title="알림 닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Chat Quick Opener Button (When chat is closed and not docked) */}
      {!panels.showChat && !isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-5 right-5 z-40 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl shadow-xl flex items-center gap-2.5 font-bold text-xs transition-all hover:scale-105 active:scale-95 border border-indigo-400/40 cursor-pointer animate-fade-in group select-none"
          title="동료 면접관 실시간 대화창 열기"
        >
          <div className="relative">
            <MessageSquare className="w-4 h-4 text-white" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span>면접관 대화방</span>
          {unreadChatCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold font-mono shadow-sm animate-bounce">
              {unreadChatCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
