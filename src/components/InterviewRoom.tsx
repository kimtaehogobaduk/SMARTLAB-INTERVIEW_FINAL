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
import { formatInterviewerDisplayName } from './ObserverDashboard';
import { InterviewerChat } from './InterviewerChat';
import { CandidateChatModal } from './CandidateChatModal';
import { FlexibleWorkspace } from './FlexibleWorkspace';
import { getLeadershipRole } from '../lib/leadership';
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
  Crown,
  Star,
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
  ChevronUp,
  Pin,
  PinOff,
  Radio,
  Sparkles,
  MessageSquare,
  MessageSquareText,
  X,
  GripVertical,
  Move,
  Columns,
  Rows,
  SplitSquareVertical,
  SplitSquareHorizontal,
  Maximize2,
  ShieldAlert
} from 'lucide-react';
import { getKSTTimeStr, getKSTDateTimeStr } from '../utils/time';

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
    action: 'start' | 'no_show' | 'vote_no_show' | 'cancel_vote_no_show' | 'cancel_no_show' | 'finish' | 'cancel_finish' | 'admin_reopen_5min',
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

  // Auto-hiding Footer state (마우스 이동/스크롤 시 표시, 3초간 비활동 시 부드럽게 숨김)
  const [isFooterVisible, setIsFooterVisible] = useState(true);
  const [isFooterPinned, setIsFooterPinned] = useState(false);
  const isHoveringFooterRef = useRef(false);
  const footerHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyCollapsedRef = useRef(false);

  // Realtime KST Clock & 5-Min Admin Re-edit Countdown
  const [kstClock, setKstClock] = useState(getKSTTimeStr());
  const [reopenRemainingSeconds, setReopenRemainingSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setKstClock(getKSTTimeStr());
      if (candidate.reopenedUntil) {
        const diff = Math.max(0, Math.floor((candidate.reopenedUntil - Date.now()) / 1000));
        setReopenRemainingSeconds(diff);
      } else {
        setReopenRemainingSeconds(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [candidate.reopenedUntil]);

  const resetFooterHideTimer = () => {
    if (isManuallyCollapsedRef.current) return;
    setIsFooterVisible(true);
    if (footerHideTimerRef.current) {
      clearTimeout(footerHideTimerRef.current);
    }
    if (!isFooterPinned) {
      footerHideTimerRef.current = setTimeout(() => {
        if (!isHoveringFooterRef.current) {
          setIsFooterVisible(false);
        }
      }, 3500);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // If cursor moves near the bottom edge (within 50px), open footer even if collapsed
      if (e.clientY >= window.innerHeight - 50) {
        isManuallyCollapsedRef.current = false;
        setIsFooterVisible(true);
        resetFooterHideTimer();
      } else if (!isManuallyCollapsedRef.current) {
        resetFooterHideTimer();
      }
    };

    const handleGeneralActivity = () => {
      if (!isManuallyCollapsedRef.current) {
        resetFooterHideTimer();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleGeneralActivity, { passive: true, capture: true });
    window.addEventListener('wheel', handleGeneralActivity, { passive: true });
    window.addEventListener('keydown', handleGeneralActivity, { passive: true });
    window.addEventListener('touchstart', handleGeneralActivity, { passive: true });

    resetFooterHideTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleGeneralActivity);
      window.removeEventListener('wheel', handleGeneralActivity);
      window.removeEventListener('keydown', handleGeneralActivity);
      window.removeEventListener('touchstart', handleGeneralActivity);
      if (footerHideTimerRef.current) clearTimeout(footerHideTimerRef.current);
    };
  }, [isFooterPinned]);

  const [noShowConfirmOpen, setNoShowConfirmOpen] = useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  // Interviewer Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatFloating, setIsChatFloating] = useState(true);
  const [isFloatingBubbleEnabled, setIsFloatingBubbleEnabled] = useState(true);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Candidate 1:1 Chat state
  const [isCandidateChatOpen, setIsCandidateChatOpen] = useState(false);
  const [candidateMessageCount, setCandidateMessageCount] = useState(0);

  // Poll candidate messages for current candidate
  useEffect(() => {
    const fetchCandidateChat = async () => {
      try {
        const res = await fetch(`/api/candidate-portal/messages?candidateId=${candidate.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages)) {
            setCandidateMessageCount(data.messages.length);
          }
        }
      } catch (e) {
        // Ignore
      }
    };
    fetchCandidateChat();
    const interval = setInterval(fetchCandidateChat, 4000);
    return () => clearInterval(interval);
  }, [candidate.id]);

  // Floating Chat Button Position & Long-Press Dragging State
  const [chatBtnPos, setChatBtnPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('smartlab_chat_btn_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      // Ignore local storage error
    }
    return null;
  });

  const [isDraggingChatBtn, setIsDraggingChatBtn] = useState(false);
  const [isLongPressChatBtn, setIsLongPressChatBtn] = useState(false);
  const chatBtnDragRef = useRef<{
    startX: number;
    startY: number;
    initialBtnX: number;
    initialBtnY: number;
    isDragging: boolean;
    longPressTimer: NodeJS.Timeout | null;
  }>({
    startX: 0,
    startY: 0,
    initialBtnX: 0,
    initialBtnY: 0,
    isDragging: false,
    longPressTimer: null
  });
  const chatBtnElementRef = useRef<HTMLButtonElement | null>(null);

  const handleChatBtnPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const currentX = chatBtnPos ? chatBtnPos.x : rect.left;
    const currentY = chatBtnPos ? chatBtnPos.y : rect.top;

    chatBtnDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialBtnX: currentX,
      initialBtnY: currentY,
      isDragging: false,
      longPressTimer: setTimeout(() => {
        setIsLongPressChatBtn(true);
        setIsDraggingChatBtn(true);
        chatBtnDragRef.current.isDragging = true;
      }, 250)
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - chatBtnDragRef.current.startX;
      const dy = moveEvent.clientY - chatBtnDragRef.current.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        if (!chatBtnDragRef.current.isDragging) {
          if (chatBtnDragRef.current.longPressTimer) {
            clearTimeout(chatBtnDragRef.current.longPressTimer);
          }
          chatBtnDragRef.current.isDragging = true;
          setIsDraggingChatBtn(true);
          setIsLongPressChatBtn(true);
        }

        const btnWidth = rect.width || 140;
        const btnHeight = rect.height || 48;
        const maxX = window.innerWidth - btnWidth - 12;
        const maxY = window.innerHeight - btnHeight - 12;

        const newX = Math.max(12, Math.min(maxX, chatBtnDragRef.current.initialBtnX + dx));
        const newY = Math.max(12, Math.min(maxY, chatBtnDragRef.current.initialBtnY + dy));

        setChatBtnPos({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      if (chatBtnDragRef.current.longPressTimer) {
        clearTimeout(chatBtnDragRef.current.longPressTimer);
      }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (chatBtnDragRef.current.isDragging) {
        setChatBtnPos(prev => {
          if (prev) {
            try {
              localStorage.setItem('smartlab_chat_btn_pos', JSON.stringify(prev));
            } catch (e) {}
          }
          return prev;
        });
        setTimeout(() => {
          setIsDraggingChatBtn(false);
          setIsLongPressChatBtn(false);
          chatBtnDragRef.current.isDragging = false;
        }, 50);
      } else {
        setIsDraggingChatBtn(false);
        setIsLongPressChatBtn(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

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
          operatorLeadershipRole: currentUser.leadershipRole || getLeadershipRole(currentUser.name, candidate.platformSettings?.leadership),
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
      if (!p) return;
      const cleanName = formatInterviewerDisplayName(p.interviewerName || '');
      if (!p.interviewerId && !cleanName) return;
      if (knownIds.has(p.interviewerId) || knownIds.has(cleanName) || (p.interviewerName && knownIds.has(p.interviewerName))) {
        return;
      }
      if (p.interviewerId) knownIds.add(p.interviewerId);
      if (cleanName) knownIds.add(cleanName);

      let mode: 'evaluating' | 'observing' | 'left' = p.mode || 'evaluating';
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
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left: Back button, Candidate Switcher & Status Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToList}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">목록으로</span>
          </button>

          {/* Quick Candidate Switcher Dropdown */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <select
              value={candidate.id}
              onChange={(e) => onSelectCandidate(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-900 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-colors"
            >
              {allCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.timeslot.start}] {c.name} ({c.track})
                </option>
              ))}
            </select>

            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
              {candidate.studentId} • {candidate.timeslot.room}
            </span>

            {/* Candidate Status Pill */}
            {candidate.status === 'NO_SHOW' ? (
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-black flex items-center gap-1">
                <UserX className="w-3 h-3" />
                <span>결시 (No-Show)</span>
              </span>
            ) : candidate.status === 'IN_PROGRESS' ? (
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-black flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                <span>면접 진행중</span>
              </span>
            ) : candidate.status === 'COMPLETED' ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>평가 완료</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold">
                대기중
              </span>
            )}

            {/* Observer Mode Indicator Badge */}
            {isObserverMode && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center gap-1">
                <Eye className="w-3 h-3 text-amber-600" />
                <span>관전 모드</span>
              </span>
            )}

            {/* Active No-Show Voting Alert Pill */}
            {currentVotes.length > 0 && !isCandidateNoShow && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                <span>결시 투표 진행중 ({currentVotes.length}/{requiredNoShowVotes}명)</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Clean Unified Action & Layout Controls */}
        <div className="flex items-center gap-2">
          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold animate-fade-in shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* 1. Unified Action Menu (면접 행동 & 노쇼 투표) */}
          <div className="relative">
            <button
              onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              disabled={isSendingAction}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                isActionMenuOpen
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-300'
                  : currentVotes.length > 0 && !isCandidateNoShow
                  ? 'bg-gradient-to-r from-rose-500 to-amber-600 text-white border-rose-400 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-amber-400'
              }`}
              title="면접 진행 상호작용 및 결시(No-Show) 투표"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-200 text-amber-200" />
              <span>면접 행동 & 노쇼</span>
              {currentVotes.length > 0 && !isCandidateNoShow && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-rose-600 font-mono text-[10px] font-black">
                  {currentVotes.length}/{requiredNoShowVotes}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${isActionMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Action Menu Dropdown with No-Show Section */}
            {isActionMenuOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 text-xs font-semibold animate-fade-in divide-y divide-slate-100">
                {/* Header */}
                <div className="px-3 py-2">
                  <div className="font-extrabold text-slate-900 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <span>면접관 행동 및 진행 제어</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">실시간 동기화</span>
                  </div>
                </div>

                {/* Section A: No-Show / 결시 처리 및 투표 */}
                <div className="p-2 space-y-1.5 bg-slate-50/70 rounded-xl my-1 border border-slate-100">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                      <UserX className="w-3.5 h-3.5 text-rose-500" />
                      <span>결시(No-Show) 판정 투표</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      2/3 정족수 ({requiredNoShowVotes}명 필요)
                    </span>
                  </div>

                  {candidate.status === 'NO_SHOW' ? (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                      <p className="text-[11px] text-rose-800 font-bold">
                        현재 이 지원자는 <strong>결시(No-Show)</strong> 처리되었습니다.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onStatusChange('cancel_no_show');
                          setIsActionMenuOpen(false);
                        }}
                        className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg font-bold text-xs border border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                        <span>결시 취소 (면접 상태 원복)</span>
                      </button>
                    </div>
                  ) : isObserverMode ? (
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-xl text-[11px]">
                      관전 모드에서는 결시 투표 권한이 없습니다. (현재 동의: {currentVotes.length}/{requiredNoShowVotes}명)
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
                        <span>현재 동의 면접관:</span>
                        <strong className="text-slate-900 font-bold">{currentVotes.length} / {requiredNoShowVotes}명</strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          setNoShowConfirmOpen(true);
                        }}
                        className={`w-full py-2 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                          hasMyVote
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white border-rose-500'
                        }`}
                      >
                        <UserX className="w-4 h-4" />
                        <span>
                          {hasMyVote
                            ? `결시 동의 철회 (${currentVotes.length}/${requiredNoShowVotes}명)`
                            : `결시(No-Show) 동의 투표하기 (${currentVotes.length}/${requiredNoShowVotes}명)`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Section B: Live Interviewer Signals */}
                <div className="p-1 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 pt-1 block">
                    📢 실시간 면접관 신호 (4초 알림 브로드캐스트)
                  </span>

                  {/* 1. 질문하기 */}
                  <button
                    onClick={() => handleSendAction('question')}
                    className="w-full text-left p-2 hover:bg-indigo-50 rounded-xl text-slate-700 hover:text-indigo-900 flex items-start gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-700">
                          🙋 질문하기 (내가 먼저 질문)
                        </span>
                        <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-mono">신호</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        동료 면접관들에게 내가 먼저 질문하겠다고 알립니다.
                      </p>
                    </div>
                  </button>

                  {/* 2. 의심 / 팩트체크 */}
                  <button
                    onClick={() => handleSendAction('suspicion')}
                    className="w-full text-left p-2 hover:bg-rose-50 rounded-xl text-slate-700 hover:text-rose-900 flex items-start gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-rose-700">
                          🔍 의심 (허위/과장 팩트체크)
                        </span>
                        <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded font-mono">검증</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        지원자의 답변이나 서류 진위가 의심될 때 공유합니다.
                      </p>
                    </div>
                  </button>

                  {/* 3. AI 꼬리질문 제안 */}
                  <button
                    onClick={() => handleSendAction('tail_question')}
                    className="w-full text-left p-2 hover:bg-amber-50 rounded-xl text-slate-700 hover:text-amber-900 flex items-start gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                      <Lightbulb className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-amber-700 block">
                        💡 AI 꼬리질문 추천 공유
                      </span>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        실시간 AI 심층 꼬리질문을 함께 확인하자고 제안합니다.
                      </p>
                    </div>
                  </button>

                  {/* 4. 순서 양보 */}
                  <button
                    onClick={() => handleSendAction('yield')}
                    className="w-full text-left p-2 hover:bg-emerald-50 rounded-xl text-slate-700 hover:text-emerald-900 flex items-start gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 block">
                        🤝 질문 순서 양보 (Pass)
                      </span>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        다른 면접관님께 다음 발언권을 양보합니다.
                      </p>
                    </div>
                  </button>

                  {/* 5. 시간 체크 */}
                  <button
                    onClick={() => handleSendAction('time_check')}
                    className="w-full text-left p-2 hover:bg-slate-100 rounded-xl text-slate-700 hover:text-slate-900 flex items-start gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white transition-colors shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-slate-700 block">
                        ⏱️ 면접 시간 체크 (마무리)
                      </span>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        배정된 시간을 확인하고 마무리를 준비하자고 알립니다.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Unified Layout & Screen Composition Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                isLayoutMenuOpen
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="화면 패널 토글 및 레이아웃 분할 구조"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
              <span>화면 레이아웃</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-mono font-bold hidden md:inline">
                {visibleCount}분할
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isLayoutMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Layout Popover */}
            {isLayoutMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2.5 z-50 text-xs font-semibold animate-fade-in divide-y divide-slate-100 space-y-2">
                {/* 1. Panel Toggles */}
                <div className="space-y-1.5 pb-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1 block">
                    👁️ 개별 패널 표시/숨김
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => togglePanel('showSTT')}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                        panels.showSTT
                          ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-blue-600" />
                        <span>STT 콘솔</span>
                      </span>
                      {panels.showSTT && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePanel('showDocs')}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                        panels.showDocs
                          ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>지원 서류</span>
                      </span>
                      {panels.showDocs && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePanel('showEval')}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                        panels.showEval
                          ? isObserverMode
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                            : 'bg-blue-50 border-blue-300 text-blue-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isObserverMode ? <Eye className="w-3.5 h-3.5 text-amber-600" /> : <CheckSquare className="w-3.5 h-3.5 text-blue-600" />}
                        <span>{isObserverMode ? '관전 현황' : '평가표'}</span>
                      </span>
                      {panels.showEval && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePanel('showChat')}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                        panels.showChat
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        <span>동료 대화창</span>
                      </span>
                      {panels.showChat && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  </div>
                </div>

                {/* 2. Topology Structures */}
                <div className="py-2 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1 block">
                    📐 화면 분할 구조 (마우스 드래그 조절)
                  </span>
                  
                  <div className="grid grid-cols-1 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLayoutStructure('COLUMNS');
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        layoutStructure === 'COLUMNS' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
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
                        layoutStructure === 'TOP_ONE_BOTTOM_TWO' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
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
                        layoutStructure === 'TOP_TWO_BOTTOM_ONE' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
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
                        setLayoutStructure('GRID_2X2');
                        setPanels({ showSTT: true, showDocs: true, showEval: true, showChat: true });
                        setIsLayoutMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        layoutStructure === 'GRID_2X2' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                        <span>2x2 쿼드 바둑판 (4분할 전체)</span>
                      </div>
                      {layoutStructure === 'GRID_2X2' && <span className="text-[10px] text-indigo-600 font-bold">선택됨</span>}
                    </button>
                  </div>
                </div>

                {/* 3. Quick Presets */}
                <div className="pt-2 space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1 block">
                    ⚡ 빠른 프리셋
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => applyLayoutPreset('ALL_THREE')}
                      className="px-2 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg text-left cursor-pointer"
                    >
                      표준 3분할
                    </button>
                    <button
                      type="button"
                      onClick={() => applyLayoutPreset('ALL_FOUR')}
                      className="px-2 py-1.5 hover:bg-indigo-50 text-indigo-700 font-bold rounded-lg text-left cursor-pointer"
                    >
                      ✨ 4분할 전체
                    </button>
                    <button
                      type="button"
                      onClick={() => applyLayoutPreset('DOCS_AND_EVAL')}
                      className="px-2 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg text-left cursor-pointer"
                    >
                      서류 + 평가표
                    </button>
                    <button
                      type="button"
                      onClick={() => applyLayoutPreset('STT_AND_EVAL')}
                      className="px-2 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg text-left cursor-pointer"
                    >
                      STT + 평가표
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: KST Clock, Interviewer Chat Button, Stopwatch Timer & Profile */}
        <div className="flex items-center gap-3">
          {/* Realtime KST Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800" title="대한민국 표준시(KST) 실시간 시계">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>KST {kstClock}</span>
          </div>

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
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 border ${
              panels.showChat || isChatOpen
                ? 'btn-theme-primary text-white border-transparent shadow-md'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-[var(--color-primary)]'
            }`}
            title="동료 면접관들과 실시간 채팅"
          >
            <MessageSquare className={`w-3.5 h-3.5 ${panels.showChat || isChatOpen ? 'text-white' : 'text-slate-600'}`} />
            <span className="hidden sm:inline">동료 대화</span>
            {unreadChatCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold font-mono animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Candidate 1:1 Inquiries & Chat Button */}
          <button
            type="button"
            onClick={() => setIsCandidateChatOpen(true)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 border ${
              isCandidateChatOpen
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-300'
                : candidateMessageCount > 0
                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-emerald-600'
            }`}
            title="현재 지원자와 1:1 대화 (모든 면접관 공유)"
          >
            <MessageSquareText className={`w-3.5 h-3.5 ${isCandidateChatOpen ? 'text-white' : 'text-emerald-600'}`} />
            <span className="hidden sm:inline">지원자 대화</span>
            {candidateMessageCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black font-mono shadow-2xs">
                {candidateMessageCount}
              </span>
            )}
          </button>

          {/* Stopwatch Digital Monospace Display */}
          <div className="bg-slate-950 px-3.5 py-1 rounded-xl border border-slate-800 shadow-inner flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <div className="font-mono text-lg font-black text-red-500 tracking-wider">
              {formatTimer(timerSeconds)}
            </div>
          </div>

          {(() => {
            const role = currentUser.leadershipRole || getLeadershipRole(currentUser.name, candidate.platformSettings?.leadership);
            const isCap = role === 'CAPTAIN';
            const isVc = role === 'VICE_CAPTAIN';

            return (
              <div className="text-right border-l border-slate-200 pl-3 hidden sm:block">
                <div className="text-xs font-black text-slate-900 flex items-center justify-end gap-1.5">
                  {isCap && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-black rounded flex items-center gap-0.5 shadow-xs">
                      <Crown className="w-2.5 h-2.5 fill-slate-950" />
                      <span>기장</span>
                    </span>
                  )}
                  {isVc && (
                    <span className="px-1.5 py-0.2 bg-purple-600 text-white text-[10px] font-black rounded flex items-center gap-0.5 shadow-xs">
                      <Star className="w-2.5 h-2.5 fill-white" />
                      <span>부기장</span>
                    </span>
                  )}
                  <span>{formatInterviewerDisplayName(currentUser.name)}</span>
                </div>
                <div className={`text-[10px] font-bold ${
                  isCap ? 'text-amber-600' : isVc ? 'text-purple-600' : 'text-blue-600'
                }`}>
                  {isCap ? '총괄 기장' : isVc ? '부기장' : (isObserverMode ? '관전 심사위원' : '평가 심사위원')}
                </div>
              </div>
            );
          })()}
        </div>
      </header>

      {/* 5-Minute Admin Re-edit Mode Top Countdown Banner */}
      {candidate.reopenedUntil && Date.now() < candidate.reopenedUntil && (
        <div className="bg-amber-50 border-b border-amber-300 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-amber-950 font-bold shrink-0 animate-fade-in z-10 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>[관리자 5분 한시 수정 모드]</span>
            <span className="font-normal text-slate-700">
              면접 완료가 5분간 취소되어 점수와 평가를 수정할 수 있습니다. (최초 면접 완료 시각: <b className="font-mono">{candidate.initialCompletedAt || candidate.completedAt}</b> 영구 보존)
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="bg-amber-200/90 text-amber-950 px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-800" />
              남은 시간: {Math.floor(reopenRemainingSeconds / 60)}분 {String(reopenRemainingSeconds % 60).padStart(2, '0')}초
            </span>
            <button
              type="button"
              onClick={() => onStatusChange('finish')}
              className="px-2.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-[11px] font-bold cursor-pointer transition-all"
            >
              지금 재완료
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. DYNAMIC WORKSPACE (Configurable Layout & Mouse Drag Resizable Panels) */}
      {/* ==================================================================== */}
      <FlexibleWorkspace
        panels={panels}
        onTogglePanel={togglePanel}
        layoutStructure={layoutStructure}
        onChangeLayoutStructure={setLayoutStructure}
        candidate={candidate}
        myEvaluation={myEvaluation}
        peerEvaluations={peerEvaluations}
        isObserverMode={isObserverMode}
        isBlind={isBlind}
        isFormLocked={isFormLocked}
        settings={settings}
        currentUser={currentUser}
        livePresences={livePresences}
        isAiLoading={isAiLoading}
        onSaveEvaluation={onSaveEvaluation}
        onSendMessage={onSendMessage}
        onUseTailQuestion={onUseTailQuestion}
        onAddDocument={onAddDocument}
        onDeleteDocument={onDeleteDocument}
        onCloseChatPanel={() => setPanels(prev => ({ ...prev, showChat: false }))}
        onPopoutChat={() => {
          setPanels(prev => ({ ...prev, showChat: false }));
          setIsChatFloating(true);
          setIsChatOpen(true);
        }}
        onUnreadChatCountChange={setUnreadChatCount}
        onNewMessageToast={handleNewMessageToast}
      />

      {/* ==================================================================== */}
      {/* 3. AUTO-HIDING FOOTER & MANUAL TOGGLE BUTTON */}
      {/* ==================================================================== */}
      
      {/* Manual Toggle Button (When hidden: 올라가는 버튼) */}
      {!isFooterVisible && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-30 pb-0 pt-2 px-4 animate-fade-in pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              isManuallyCollapsedRef.current = false;
              setIsFooterVisible(true);
              resetFooterHideTimer();
            }}
            className="h-6 px-3 bg-slate-900/95 hover:bg-slate-900 text-white text-[11px] font-bold rounded-t-lg border-t border-x border-slate-700 shadow-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95 backdrop-blur-xs"
            title="하단 탭 올리기"
          >
            <ChevronUp className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
            <span>하단 탭 올리기</span>
          </button>
        </div>
      )}

      <footer
        onMouseEnter={() => {
          isHoveringFooterRef.current = true;
          setIsFooterVisible(true);
          if (footerHideTimerRef.current) clearTimeout(footerHideTimerRef.current);
        }}
        onMouseLeave={() => {
          isHoveringFooterRef.current = false;
          resetFooterHideTimer();
        }}
        className={`relative w-full shrink-0 transition-all duration-300 ease-in-out z-20 ${
          isFooterVisible
            ? 'h-16 border-t border-slate-200 opacity-100'
            : 'h-0 border-t-0 opacity-0 overflow-hidden pointer-events-none'
        }`}
      >
        <div className="h-16 w-full bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shadow-lg">
          {/* Manual Toggle Button (When visible: 내려가는 버튼) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              isManuallyCollapsedRef.current = true;
              setIsFooterVisible(false);
              setIsFooterPinned(false);
            }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 h-6 px-3 bg-white/95 hover:bg-white text-slate-700 hover:text-slate-950 rounded-t-lg border-t border-x border-slate-300 shadow-sm flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-all active:scale-95 z-30 pointer-events-auto"
            title="하단 탭 내리기"
          >
            <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
            <span>하단 탭 내리기</span>
          </button>

          {/* Left Side: Secondary Tools & Pin Toggle */}
          <div className="flex items-center gap-2">
            {/* Pin / Auto-hide Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !isFooterPinned;
                setIsFooterPinned(next);
                if (next) {
                  isManuallyCollapsedRef.current = false;
                  setIsFooterVisible(true);
                  if (footerHideTimerRef.current) clearTimeout(footerHideTimerRef.current);
                } else {
                  resetFooterHideTimer();
                }
              }}
              className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                isFooterPinned
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border-slate-200'
              }`}
              title={isFooterPinned ? '하단 바 고정됨 (클릭 시 자동 숨김 전환)' : '하단 바 자동 숨김 중 (클릭 시 화면 하단에 고정)'}
            >
              {isFooterPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onOpenAIQualitative}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-bold text-xs border border-purple-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Brain className="w-3.5 h-3.5 text-purple-600" />
              <span>AI 마인드맵 & 요약</span>
            </button>

            <button
              onClick={onOpenAdmin}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>감사 로그</span>
            </button>
          </div>

          {/* Center: Realtime Interviewer Presence Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mr-1.5 hidden md:flex">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>면접관 상태:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {interviewerPresenceList.map((intv) => {
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

          {/* Right Side: Primary Workflow State Machine Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isObserverMode ? (
              <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>관전 진행 중</span>
              </span>
            ) : (
              <>
                {candidate.status === 'PENDING' && (
                  <button
                    onClick={() => onStatusChange('start')}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all hover:scale-102 cursor-pointer active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>면접 시작 (Start)</span>
                  </button>
                )}

                {candidate.status === 'IN_PROGRESS' && (
                  <>
                    {isCurrentlySubmitted ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>내 평가 제출 완료 (대기중)</span>
                        </span>
                        <button
                          onClick={() => onStatusChange('cancel_finish')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>제출 취소</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onStatusChange('finish')}
                        className="px-5 py-2 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-md shadow-slate-900/20 transition-all cursor-pointer active:scale-95 border border-slate-800"
                      >
                        <Square className="w-3.5 h-3.5 text-indigo-400" />
                        <span>면접 평가 완료 제출</span>
                      </button>
                    )}
                  </>
                )}

                {candidate.status === 'CLOSING_PENDING' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                      <span>타 면접관 제출 대기중</span>
                    </span>
                    <button
                      onClick={() => onStatusChange('cancel_finish')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      제출 취소
                    </button>
                  </div>
                )}
              </>
            )}

            {candidate.status === 'COMPLETED' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs" title={`최초 완료 시각: ${candidate.initialCompletedAt || candidate.completedAt}`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>평가 완료</span>
                </span>
                <button
                  onClick={() => onStatusChange('admin_reopen_5min')}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="관리자 권한으로 5분간 완료 취소 및 수정 모드 활성화"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>5분 수정 승인</span>
                </button>
                <button
                  onClick={onOpenLeaderboard}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>순위표</span>
                </button>
              </div>
            )}
          </div>
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
      {!panels.showChat && (() => {
        const myRole = currentUser.leadershipRole || getLeadershipRole(currentUser.name, candidate.platformSettings?.leadership);
        return (
          <InterviewerChat
            currentUser={{
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
              leadershipRole: myRole
            }}
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
            onDisableFloating={() => {
              setIsFloatingBubbleEnabled(false);
              setIsChatOpen(false);
            }}
            onUnreadCountChange={setUnreadChatCount}
            onNewMessageToast={handleNewMessageToast}
          />
        );
      })()}

      {/* Mini Chat Toast Notification (작게 알림 뜨게) */}
      {chatToast && !isChatOpen && !panels.showChat && (
        <div className={`fixed bottom-20 right-5 z-50 max-w-sm w-88 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl flex items-start gap-3 animate-fade-in ${
          chatToast.isOfficialLeaderNotice
            ? 'bg-slate-900/95 border-2 border-amber-500/80 ring-2 ring-amber-500/30'
            : chatToast.isImportant
            ? 'bg-slate-900/95 border border-rose-500/80 ring-2 ring-rose-500/30'
            : 'bg-slate-900/95 border border-indigo-500/40'
        }`}>
          <div
            className={`p-2 rounded-xl shrink-0 ${
              chatToast.isOfficialLeaderNotice
                ? 'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-md font-black'
                : chatToast.isImportant
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            {chatToast.isOfficialLeaderNotice ? (
              <Crown className="w-4 h-4 fill-slate-950" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                {chatToast.senderLeadershipRole === 'CAPTAIN' && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[9px] font-black rounded flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5 fill-slate-950" />
                    <span>기장</span>
                  </span>
                )}
                {chatToast.senderLeadershipRole === 'VICE_CAPTAIN' && (
                  <span className="px-1.5 py-0.2 bg-purple-600 text-white text-[9px] font-black rounded flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-white" />
                    <span>부기장</span>
                  </span>
                )}
                <span className="font-bold text-xs text-indigo-200 truncate">
                  {formatInterviewerDisplayName(chatToast.senderName)} 면접관
                </span>
                {chatToast.isOfficialLeaderNotice && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded text-[9px] font-black">
                    임원 공식 공지
                  </span>
                )}
                {chatToast.isImportant && !chatToast.isOfficialLeaderNotice && (
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

      {/* Floating Chat Quick Opener Button (Draggable on long-press/drag, movable anywhere) */}
      {isFloatingBubbleEnabled && !panels.showChat && !isChatOpen && (
        <div
          style={
            chatBtnPos
              ? {
                  position: 'fixed',
                  left: `${chatBtnPos.x}px`,
                  top: `${chatBtnPos.y}px`,
                  zIndex: 45
                }
              : undefined
          }
          className={!chatBtnPos ? 'fixed bottom-5 right-5 z-40' : ''}
        >
          <button
            ref={chatBtnElementRef}
            type="button"
            onPointerDown={handleChatBtnPointerDown}
            onClick={() => {
              if (!chatBtnDragRef.current.isDragging && !isDraggingChatBtn) {
                setIsChatOpen(true);
              }
            }}
            className={`px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl shadow-xl flex items-center gap-2 font-bold text-xs transition-all border border-indigo-400/40 select-none touch-none ${
              isDraggingChatBtn
                ? 'cursor-grabbing scale-105 shadow-2xl ring-4 ring-purple-400/80 bg-gradient-to-r from-purple-600 to-indigo-700'
                : 'cursor-grab hover:scale-105 active:scale-95 animate-fade-in group'
            }`}
            title="클릭: 대화방 열기 | 길게 누르고 드래그하여 위치 이동"
          >
            <div className="flex items-center gap-1">
              <GripVertical
                className={`w-3.5 h-3.5 transition-opacity ${
                  isDraggingChatBtn ? 'text-purple-200 opacity-100' : 'text-indigo-300/70 opacity-70 group-hover:opacity-100'
                }`}
              />
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-white" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
            </div>

            <span>{isDraggingChatBtn ? '위치 이동 중...' : '면접관 대화방'}</span>

            {unreadChatCount > 0 && !isDraggingChatBtn && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold font-mono shadow-sm animate-bounce">
                {unreadChatCount}
              </span>
            )}

            {isDraggingChatBtn && (
              <span className="text-[10px] text-purple-200 font-normal bg-purple-950/70 px-1.5 py-0.5 rounded border border-purple-400/40">
                놓으면 고정
              </span>
            )}
          </button>
        </div>
      )}
      {/* Candidate 1:1 Chat Modal */}
      {isCandidateChatOpen && (
        <CandidateChatModal
          isOpen={isCandidateChatOpen}
          onClose={() => setIsCandidateChatOpen(false)}
          candidate={candidate}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
