import React, { useState, useRef, useEffect } from 'react';
import { Candidate, InterviewerUser, InterviewRoomItem, PlatformSettings, InterviewerChatMessage, CandidateChatMessage } from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { EntryModeModal } from './EntryModeModal';
import { InterviewerChat } from './InterviewerChat';
import { CandidateChatModal } from './CandidateChatModal';
import { ThemeQuickToggle } from './ThemeQuickToggle';
import { useTheme } from '../contexts/ThemeContext';
import { formatInterviewerDisplayName } from './ObserverDashboard';
import { getLeadershipRole } from '../lib/leadership';
import {
  Users,
  Plus,
  Sparkles,
  Trophy,
  Shield,
  Crown,
  Star,
  Trash2,
  Play,
  CheckCircle2,
  Clock,
  UserX,
  LogOut,
  RotateCcw,
  FileText,
  Search,
  ChevronRight,
  Database,
  ArrowLeft,
  AlertTriangle,
  Sliders,
  Upload,
  Link2,
  Eye,
  MessageSquare,
  X,
  BellRing,
  Calendar,
  MessageSquareText,
  GripVertical,
  Settings,
  Palette,
  Sun,
  Moon,
  ExternalLink,
  ChevronDown,
  Inbox,
  User,
  Loader2
} from 'lucide-react';

interface CandidateListPageProps {
  currentRoom: InterviewRoomItem;
  currentUser: InterviewerUser;
  candidates: Candidate[];
  settings?: PlatformSettings;
  onSelectCandidate: (candidateId: string, isObserver?: boolean) => void;
  onBackToRooms: () => void;
  onSwitchInterviewer: () => void;
  onOpenParser: () => void;
  onOpenLeaderboard: () => void;
  onOpenAdmin: () => void;
  onOpenSchema: () => void;
  onGoToAdminPortal?: () => void;
  onDeleteCandidate: (candidateId: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  onAddCandidate: (candidate: Partial<Candidate>) => Promise<void>;
}

export const CandidateListPage: React.FC<CandidateListPageProps> = ({
  currentRoom,
  currentUser,
  candidates,
  settings,
  onSelectCandidate,
  onBackToRooms,
  onSwitchInterviewer,
  onOpenParser,
  onOpenLeaderboard,
  onOpenAdmin,
  onOpenSchema,
  onGoToAdminPortal,
  onDeleteCandidate,
  onClearAll,
  onAddCandidate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingCandidate, setIsSubmittingCandidate] = useState(false);
  const [selectedCandidateForEntry, setSelectedCandidateForEntry] = useState<Candidate | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Floating Chat Button Position & Long-Press Dragging State (면접실 밖에서도 이동 가능)
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
      // Ignore
    }
    return null;
  });

  const [isDraggingChatBtn, setIsDraggingChatBtn] = useState(false);
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
        setIsDraggingChatBtn(true);
        chatBtnDragRef.current.isDragging = true;
      }, 200)
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
          chatBtnDragRef.current.isDragging = false;
        }, 50);
      } else {
        setIsDraggingChatBtn(false);
        chatBtnDragRef.current.isDragging = false;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Theme Context for Quick Settings
  const { resolvedMode, toggleMode, setIsThemeModalOpen, paletteInfo } = useTheme();

  // Settings Dropdown Menu State
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  // Candidate Inquiries Hub / Inbox State
  const [isCandidateInboxOpen, setIsCandidateInboxOpen] = useState(false);
  const [candidateForChat, setCandidateForChat] = useState<Candidate | null>(null);
  const [allCandidateMessages, setAllCandidateMessages] = useState<CandidateChatMessage[]>([]);

  // Fetch all candidate messages in current room
  const fetchRoomCandidateMessages = async () => {
    try {
      const res = await fetch(`/api/candidate-portal/messages?roomId=${currentRoom.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setAllCandidateMessages(data.messages);
        }
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    fetchRoomCandidateMessages();
    const interval = setInterval(fetchRoomCandidateMessages, 3500);
    return () => clearInterval(interval);
  }, [currentRoom.id]);

  // Click outside to close settings menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };
    if (isSettingsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsMenuOpen]);

  // Group candidate messages by candidateId
  const candidateMessageStats = React.useMemo(() => {
    const stats: Record<string, { total: number; fromCandidate: number; latestText: string; latestTime: string }> = {};
    allCandidateMessages.forEach(msg => {
      if (!msg.candidateId) return;
      if (!stats[msg.candidateId]) {
        stats[msg.candidateId] = { total: 0, fromCandidate: 0, latestText: '', latestTime: '' };
      }
      stats[msg.candidateId].total += 1;
      if (msg.senderType === 'candidate') {
        stats[msg.candidateId].fromCandidate += 1;
      }
      stats[msg.candidateId].latestText = msg.text;
      stats[msg.candidateId].latestTime = msg.timestamp;
    });
    return stats;
  }, [allCandidateMessages]);

  const totalCandidateInquiries = React.useMemo(() => {
    return allCandidateMessages.filter(m => m.senderType === 'candidate').length;
  }, [allCandidateMessages]);

  // Mini Toast Notification for incoming chat messages (작게 알림 뜨게)
  const [chatToast, setChatToast] = useState<InterviewerChatMessage | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleNewMessageToast = (msg: InterviewerChatMessage) => {
    if (!isChatOpen) {
      setChatToast(msg);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setChatToast(null);
      }, 5000);
    }
  };

  // New Candidate Form State
  const [newName, setNewName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newFieldNote, setNewFieldNote] = useState('');
  const [newStartTime, setNewStartTime] = useState('14:00');
  const [newEndTime, setNewEndTime] = useState('14:30');
  const [newDocText, setNewDocText] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('pdf');
  const [newDocFileData, setNewDocFileData] = useState<string | null>(null);
  const [newDocFileSize, setNewDocFileSize] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');

  const filteredCandidates = candidates.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.studentId && c.studentId.includes(term)) ||
      (c.track && c.track.toLowerCase().includes(term))
    );
  });

  const handleModalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    let detectedType = ext;
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) detectedType = 'image';
    else if (['js', 'ts', 'py', 'java', 'cpp', 'html', 'json'].includes(ext)) detectedType = 'code';
    else if (['hwp', 'hwpx'].includes(ext)) detectedType = 'hwp';
    else if (['xlsx', 'xls', 'csv'].includes(ext)) detectedType = 'xlsx';
    else if (['doc', 'docx'].includes(ext)) detectedType = 'doc';
    else if (['ppt', 'pptx'].includes(ext)) detectedType = 'pptx';
    else if (['pdf'].includes(ext)) detectedType = 'pdf';

    setNewDocTitle(file.name);
    setNewDocType(detectedType);

    const sizeKB = Math.round(file.size / 1024);
    const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
    setNewDocFileSize(sizeStr);

    const reader = new FileReader();
    if (['txt', 'code', 'js', 'ts', 'py', 'json', 'md', 'csv'].includes(detectedType) || file.type.startsWith('text/')) {
      reader.onload = (ev) => {
        const txt = ev.target?.result as string;
        setNewDocText(txt || '');
        setNewDocFileData(txt || '');
      };
      reader.readAsText(file);
    } else {
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setNewDocFileData(dataUrl);
        if (!newDocText) {
          setNewDocText(`[${detectedType.toUpperCase()} 서류: ${file.name} (${sizeStr})]\n실제 서류 파일이 등록되었습니다.`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCandidate) return;
    if (!newName.trim()) {
      alert('지원자 이름을 입력해주세요.');
      return;
    }

    setIsSubmittingCandidate(true);
    try {
      const docItems = (newDocText.trim() || newDocFileData || newDocUrl) ? [
        {
          id: `doc-${Date.now()}`,
          title: newDocTitle.trim() || `${newName}_지원서.${newDocType === 'url' ? 'link' : newDocType}`,
          type: newDocType as any,
          contentSnippet: (newDocText || newDocUrl || '지원 서류').substring(0, 100),
          rawText: newDocText || (newDocUrl ? `외부 링크: ${newDocUrl}` : ''),
          url: newDocUrl || undefined,
          fileData: newDocFileData || undefined,
          fileSize: newDocFileSize || '직접 등록',
          uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false })
        }
      ] : [];

      await onAddCandidate({
        id: `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        name: newName.trim(),
        track: newFieldNote.trim() || '일반',
        studentId: newStudentId || `2026${Math.floor(10000 + Math.random() * 90000)}`,
        phone: newPhone || '010-0000-0000',
        email: `${newName.trim().toLowerCase()}@smartlab.edu`,
        timeslot: {
          start: newStartTime,
          end: newEndTime,
          room: currentRoom.name || currentRoom.title || 'SmartLab Studio'
        },
        status: 'PENDING',
        interviewers: currentRoom.interviewers && currentRoom.interviewers.length > 0
          ? currentRoom.interviewers.map(i => i.name)
          : ['면접관 1', '면접관 2'],
        documents: docItems,
        sttTranscript: [],
        aiInsights: {
          realtimeSummaries: [],
          tailQuestions: [],
          contradictions: []
        }
      });

      setIsAddModalOpen(false);
      setNewName('');
      setNewFieldNote('');
      setNewDocText('');
      setNewDocTitle('');
      setNewDocFileData(null);
      setNewDocFileSize('');
      setNewDocUrl('');
    } catch (err: any) {
      console.error('Candidate registration error:', err);
      alert(`지원자 등록 중 오류가 발생했습니다: ${err.message || '다시 시도해주세요.'}`);
    } finally {
      setIsSubmittingCandidate(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col select-none text-slate-100 font-sans">
      {/* Header Bar */}
      <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onBackToRooms}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
            title="방 목록으로 이동"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>방 목록</span>
          </button>

          <SmartLabLogo size="md" />

          {/* Room Title */}
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs">
            <span className="text-slate-400 font-semibold">현재 방:</span>
            <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              {currentRoom.name || currentRoom.title || 'SmartLab 면접실'}
            </span>
          </div>
        </div>

        {/* Center/Right Navigation Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs shadow-xs">
            {/* Leaderboard Button */}
            <button
              onClick={onOpenLeaderboard}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700/60 shadow-2xs"
              title="지원자 종합 순위표 및 실시간 랭킹"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">순위표</span>
            </button>

            {/* Interviewer Chat Button */}
            <button
              type="button"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                isChatOpen
                  ? 'btn-theme-primary text-white shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
              }`}
              title="면접관 실시간 대화방 (플로팅 이동 가능)"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">면접관 대화</span>
              {unreadChatCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold font-mono animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Candidate Inquiries & Messages Inbox Button */}
            <button
              type="button"
              onClick={() => setIsCandidateInboxOpen(true)}
              className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/60 transition-all cursor-pointer shadow-2xs"
              title="지원자 대화 내역 통합 관리 및 수신함"
            >
              <MessageSquareText className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">지원자 대화함</span>
              {totalCandidateInquiries > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black font-mono shadow-xs animate-bounce">
                  {totalCandidateInquiries}
                </span>
              )}
            </button>

            {/* Quick Dark/Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleMode}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              title={resolvedMode === 'dark' ? '화이트(라이트) 모드로 전환' : '다크 모드로 전환'}
              aria-label="화면 모드 전환"
            >
              {resolvedMode === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-400" />
              )}
            </button>

            {/* Unified Settings Icon Button & Popover */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                type="button"
                onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  isSettingsMenuOpen
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="통합 시스템 및 도구 설정"
                aria-label="설정 메뉴"
              >
                <Settings className={`w-4 h-4 transition-transform ${isSettingsMenuOpen ? 'rotate-90' : ''}`} />
              </button>

              {/* Settings Dropdown Popover */}
              {isSettingsMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs font-semibold animate-scale-in text-slate-200 divide-y divide-slate-800/80">
                  <div className="px-3 py-2 text-[11px] font-bold text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-blue-400" />
                      <span>시스템 & 도구 설정</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">v2.5</span>
                  </div>

                  <div className="py-1.5 space-y-1">
                    {/* Theme & Palette Modal */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        setIsThemeModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-800/80 text-left flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs"
                          style={{ backgroundColor: paletteInfo.primaryHex }}
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 group-hover:text-white">디자인 & 테마 설정</span>
                          <span className="text-[10px] text-slate-400">현재 팔레트: {paletteInfo.name}</span>
                        </div>
                      </div>
                      <Palette className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
                    </button>

                    {/* AI Parser */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        onOpenParser();
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-800/80 text-left flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 group-hover:text-white">AI 일정 생성기</span>
                          <span className="text-[10px] text-slate-400">지원서 / 명단 스마트 자동 파서</span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                    </button>

                    {/* Audit Logs */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-800/80 text-left flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Shield className="w-4 h-4 text-rose-400" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 group-hover:text-white">관리자 감사 로그</span>
                          <span className="text-[10px] text-slate-400">평가 및 방 활동 기록 감사</span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                    </button>

                    {/* DB Schema & API Specs */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        onOpenSchema();
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-slate-800/80 text-left flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Database className="w-4 h-4 text-emerald-400" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 group-hover:text-white">PostgreSQL 스키마 & API</span>
                          <span className="text-[10px] text-slate-400">DB 구조 및 REST 명세서</span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                    </button>
                  </div>

                  {/* Club Admin & Leadership Role Manager */}
                  {onGoToAdminPortal && (
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSettingsMenuOpen(false);
                          onGoToAdminPortal();
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-amber-950/40 text-amber-300 text-left flex items-center justify-between transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Crown className="w-4 h-4 text-amber-400" />
                          <span className="font-bold">동아리 관리자 포털 이동</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Current Interviewer Badge */}
          {(() => {
            const role = currentUser.leadershipRole || getLeadershipRole(currentUser.name, settings?.leadership);
            const isCap = role === 'CAPTAIN';
            const isVc = role === 'VICE_CAPTAIN';

            return (
              <div className="flex items-center gap-2.5 border-l border-slate-800 pl-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-white flex items-center justify-end gap-1.5">
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
                    <span>{currentUser.name}</span>
                  </div>
                  <div className={`text-[10px] font-bold ${
                    isCap ? 'text-amber-400' : isVc ? 'text-purple-400' : 'text-blue-400'
                  }`}>
                    {isCap ? '총괄 기장' : isVc ? '부기장' : '평가위원'}
                  </div>
                </div>

                <button
                  onClick={onSwitchInterviewer}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer"
                  title="면접관 전환"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span>전환</span>
                </button>
              </div>
            );
          })()}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Evaluation Criteria Confirmation Status Notice */}
        {settings && !settings.isCriteriaConfirmed ? (
          <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-900/60 text-rose-300 rounded-xl shrink-0 mt-0.5 border border-rose-700/60">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-rose-200">
                    ⚠️ 어드민 평가 기준 미확정 (평가 점수 입력 및 제출 차단됨)
                  </h4>
                  <span className="px-2 py-0.5 bg-rose-900 text-rose-200 border border-rose-700 text-[10px] font-bold rounded-md">
                    잠금 상태
                  </span>
                </div>
                <p className="text-xs text-rose-300/90 leading-relaxed">
                  어드민이 가중 합산 기준과 평가 항목을 확정하기 전까지는, 면접실에 들어가도 평가 점수를 저장하거나 제출할 수 없도록 안전하게 차단되어 있습니다.
                </p>
              </div>
            </div>

            {onGoToAdminPortal && (
              <button
                type="button"
                onClick={onGoToAdminPortal}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>어드민 기준 설정으로 이동</span>
              </button>
            )}
          </div>
        ) : settings && settings.isCriteriaConfirmed && (
          <div className="px-4 py-3 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl flex items-center justify-between text-xs text-emerald-200 shadow-md">
            <div className="flex items-center gap-2 flex-wrap">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-emerald-100">
                어드민 평가 기준 확정됨:
              </span>
              <span className="text-emerald-300 font-medium">
                {settings.criteria?.map(c => `${c.name.split('.')[1] || c.name} (${c.weight}%)`).join(' • ')}
              </span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-700 px-2.5 py-1 rounded-md shrink-0">
              평가 활성화됨
            </span>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-xl">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="지원자 이름 또는 학번 검색..."
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>신규 지원자 추가</span>
            </button>

            <button
              onClick={onOpenParser}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>이미지/명단 일괄 등록</span>
            </button>

            {candidates.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('등록된 모든 지원자 및 평가 데이터를 비우시겠습니까?')) {
                    onClearAll();
                  }
                }}
                className="px-3.5 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="전체 비우기"
              >
                전체 비우기
              </button>
            )}
          </div>
        </div>

        {/* Candidate List Cards */}
        {filteredCandidates.length === 0 ? (
          <div className="bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">
                현재 등록된 지원자가 없습니다
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                <strong>[+ 신규 지원자 추가]</strong> 버튼을 누르거나, <strong>[⚡ 이미지/명단 일괄 등록]</strong>을 통해 엑셀 표나 일정표 사진을 올려보세요.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                신규 지원자 추가
              </button>
              <button
                onClick={onOpenParser}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                이미지 / 텍스트로 일정 생성
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCandidates.map((c) => {
              const isCompleted = c.status === 'COMPLETED';
              const isInProgress = c.status === 'IN_PROGRESS';
              const isNoShow = c.status === 'NO_SHOW';

              return (
                <div
                  key={c.id}
                  className={`bg-slate-900/90 rounded-2xl border p-5 shadow-xl transition-all hover:border-slate-700 flex flex-col justify-between space-y-4 ${
                    isInProgress
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : isCompleted
                      ? 'border-emerald-500/50 bg-slate-900/95'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Card Top Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-white">{c.name}</h4>
                        <span className="text-xs font-semibold text-slate-400 font-mono">
                          {c.studentId}
                        </span>
                        {c.track && (
                          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {c.track}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          {c.timeslot.start} ~ {c.timeslot.end}
                        </span>
                        <span>•</span>
                        <span>{c.timeslot.room}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isInProgress ? (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          면접 진행 중
                        </span>
                      ) : isCompleted ? (
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                          평가 완료
                        </span>
                      ) : isNoShow ? (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <UserX className="w-3.5 h-3.5 text-rose-400" />
                          결시 확정
                        </span>
                      ) : (c.noShowVotes && c.noShowVotes.length > 0) ? (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <UserX className="w-3.5 h-3.5 text-amber-400" />
                          결시 동의 중 ({c.noShowVotes.length}/{Math.ceil(((c.interviewers?.length || 5) * 2) / 3)}명)
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          대기 중
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Documents & Details preview */}
                  <div className="text-xs text-slate-300 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                    
                    {/* Panel Assignment & Quorum Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-slate-400">심사 패널:</span>
                        <span className="font-semibold text-white">
                          {c.interviewers && c.interviewers.length > 0 ? c.interviewers.join(', ') : '5인 로테이션 풀 배정'}
                        </span>
                      </div>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                        {c.interviewers?.length || 5}인 풀
                      </span>
                    </div>

                    {/* Candidate Self-scheduled date & reminder status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>면접일: <strong className="text-white">{c.interviewDate || '당일 배정'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.reminder10MinEnabled && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <BellRing className="w-3 h-3 text-amber-400" />
                            <span>10분전 알림요청</span>
                          </span>
                        )}
                        {c.lastCandidateActiveAt && (
                          <span className="text-[11px] text-emerald-400 font-semibold">포털 접속됨</span>
                        )}
                      </div>
                    </div>

                    {c.candidateNotes && (
                      <div className="text-xs text-blue-200 bg-blue-950/40 p-2.5 rounded-lg border border-blue-800/50 leading-relaxed">
                        <span className="font-bold text-blue-300">지원자 전달사항: </span>
                        {c.candidateNotes}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="font-semibold text-slate-400">제출 서류:</span>
                      <span className="text-slate-400 font-mono text-xs">
                        {c.documents.length > 0 ? `${c.documents.length}개 서류` : '서류 없음'}
                      </span>
                    </div>
                    {c.documents.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {c.documents.map((doc, idx) => (
                          <span
                            key={doc.id || idx}
                            className="inline-flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-200 font-medium"
                          >
                            <span className="uppercase text-[10px] font-bold text-blue-400 bg-blue-950 px-1 rounded border border-blue-800">
                              {doc.type || 'DOC'}
                            </span>
                            <span className="truncate max-w-[150px]">{doc.title}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">등록된 사전 서류 없음</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (confirm(`'${c.name}' 지원자를 삭제하시겠습니까?`)) {
                            onDeleteCandidate(c.id);
                          }
                        }}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-800/40"
                        title="지원자 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Candidate 1:1 Chat Button */}
                      <button
                        type="button"
                        onClick={() => setCandidateForChat(c)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                          (candidateMessageStats[c.id]?.total || 0) > 0
                            ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border-emerald-700/80 ring-1 ring-emerald-500/40 shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                        }`}
                        title="지원자 실시간 대화함 열기 (전체 면접관 공유)"
                      >
                        <MessageSquareText className={`w-3.5 h-3.5 ${(candidateMessageStats[c.id]?.total || 0) > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                        <span>지원자 대화</span>
                        {(candidateMessageStats[c.id]?.total || 0) > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black font-mono">
                            {candidateMessageStats[c.id].total}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectCandidate(c.id, true)}
                        className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="평가하지 않고 면접 진행 흐름만 관전"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>관전만</span>
                      </button>

                      <button
                        onClick={() => setSelectedCandidateForEntry(c)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                      >
                        <span>면접실 입장</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Candidate Inquiries & Messages Hub Modal */}
      {isCandidateInboxOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] animate-scale-in text-slate-100 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">지원자 문의 및 대화 내역 통합 관리함</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      총 {totalCandidateInquiries}건
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    지원자가 포털에서 전송한 실시간 질문 및 모든 1:1 대화 내역을 한곳에서 확인하고 답변할 수 있습니다.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCandidateInboxOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Message List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin">
              {candidates.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  등록된 면접 지원자가 없습니다.
                </div>
              ) : (
                candidates.map(candidate => {
                  const stats = candidateMessageStats[candidate.id];
                  const hasMessages = stats && stats.total > 0;

                  return (
                    <div
                      key={candidate.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        hasMessages
                          ? 'bg-slate-800/80 border-emerald-500/40 hover:border-emerald-500 shadow-md'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          hasMessages
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {candidate.name.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">{candidate.name}</span>
                            <span className="text-xs text-slate-400 font-mono">학번 {candidate.studentId}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                              {candidate.track || '일반'}
                            </span>
                            {hasMessages ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950">
                                메시지 {stats.total}건
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">대화 없음</span>
                            )}
                          </div>

                          {hasMessages ? (
                            <div className="mt-1 text-xs text-slate-300 flex items-center gap-1.5 truncate">
                              <span className="text-slate-500 font-mono text-[11px] shrink-0">[{stats.latestTime}]</span>
                              <span className="truncate text-slate-200">최신: "{stats.latestText}"</span>
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-slate-500">
                              면접 예정 시각: {candidate.interviewDate || '당일'} {candidate.timeslot?.start || '14:00'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setCandidateForChat(candidate);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            hasMessages
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                        >
                          <MessageSquareText className="w-3.5 h-3.5" />
                          <span>{hasMessages ? '대화창 열기' : '메시지 전송'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Notice */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>💡 지원자와 주고받은 메시지는 모든 면접관이 실시간으로 함께 열람할 수 있습니다.</span>
              <button
                type="button"
                onClick={() => setIsCandidateInboxOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate 1:1 Chat Modal */}
      {candidateForChat && (
        <CandidateChatModal
          isOpen={Boolean(candidateForChat)}
          onClose={() => setCandidateForChat(null)}
          candidate={candidateForChat}
          room={currentRoom}
          currentUser={currentUser}
        />
      )}

      {/* Manual Candidate Creation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden text-white">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                신규 면접 지원자 직접 등록
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">지원자 성명 *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden font-medium text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">분야 / 메모 (선택)</label>
                  <input
                    type="text"
                    value={newFieldNote}
                    onChange={(e) => setNewFieldNote(e.target.value)}
                    placeholder="예: AI, 프론트, 기획 등"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">학번 / 식별번호</label>
                  <input
                    type="text"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="202610291"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">연락처</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">시작 시간</label>
                  <input
                    type="text"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    placeholder="14:00"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden font-mono font-bold text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1.5">종료 시간</label>
                  <input
                    type="text"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    placeholder="14:30"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden font-mono font-bold text-white"
                  />
                </div>
              </div>

              {/* Multi-Format Document Attachment Section */}
              <div className="space-y-2.5 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-300">
                    지원 서류 첨부 (PDF / PPTX / HWP / 이미지 / Word / 링크 등)
                  </label>
                  <span className="text-[10px] text-blue-400 font-bold bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-md">
                    다양한 서식 지원
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">서류 형식 선택</label>
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-800 rounded-xl text-xs bg-slate-950 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden cursor-pointer"
                    >
                      <option value="docx">📝 DOCX / Word 워드 문서</option>
                      <option value="gdocs">📑 Google Docs / Drive (인앱 로딩)</option>
                      <option value="pdf">📄 PDF (이력서 / 자소서)</option>
                      <option value="pptx">📊 PPTX (포트폴리오)</option>
                      <option value="hwp">📑 HWP (한글 문서)</option>
                      <option value="xlsx">📈 XLSX (스프레드시트)</option>
                      <option value="image">🖼️ 이미지 (수료증 / 캡처)</option>
                      <option value="code">💻 소스 코드 / GitHub</option>
                      <option value="url">🔗 외부 URL / 노션 (인앱 로딩)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">서류 파일 직접 업로드</label>
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 cursor-pointer transition-colors truncate">
                      <Upload className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{newDocTitle || '파일 선택 (DOCX, PDF 등)'}</span>
                      <input
                        type="file"
                        onChange={handleModalFileUpload}
                        accept=".docx,.doc,.pdf,.pptx,.ppt,.hwp,.hwpx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.txt,.json,.zip"
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {(newDocType === 'url' || newDocType === 'gdocs') && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {newDocType === 'gdocs' ? 'Google Docs / Sheets / Drive 공유 URL (인앱 뷰어로 변환)' : '외부 서류 / 웹사이트 URL (인앱 로딩)'}
                    </label>
                    <input
                      type="url"
                      value={newDocUrl}
                      onChange={(e) => setNewDocUrl(e.target.value)}
                      placeholder={newDocType === 'gdocs' ? 'https://docs.google.com/document/d/...' : 'https://notion.so/... 또는 https://github.com/...'}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    지원 서류 본문 / 핵심 역량 요약 (AI 질문 생성에 활용)
                  </label>
                  <textarea
                    rows={3}
                    value={newDocText}
                    onChange={(e) => setNewDocText(e.target.value)}
                    placeholder="지원 동기, 프로젝트 경험, 포트폴리오 텍스트를 입력하면 실시간 AI 꼬리 질문 생성에 활용됩니다..."
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden resize-none text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingCandidate}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-slate-300 font-semibold hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCandidate}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingCandidate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingCandidate ? '등록 중...' : '지원자 등록 완료'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entry Mode Selection Modal (평가 vs 관전) */}
      {selectedCandidateForEntry && (
        <EntryModeModal
          candidate={selectedCandidateForEntry}
          currentUser={currentUser}
          isOpen={Boolean(selectedCandidateForEntry)}
          onClose={() => setSelectedCandidateForEntry(null)}
          onSelectMode={(isObserver) => {
            const candId = selectedCandidateForEntry.id;
            setSelectedCandidateForEntry(null);
            onSelectCandidate(candId, isObserver);
          }}
        />
      )}

      {/* Floating Interviewer Chat Window */}
      {(() => {
        const myRole = currentUser.leadershipRole || getLeadershipRole(currentUser.name, settings.leadership);
        return (
          <InterviewerChat
            currentUser={{
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
              leadershipRole: myRole
            }}
            roomId={currentRoom.id}
            roomName={currentRoom.name || currentRoom.title || 'SmartLab 면접실'}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            isFloating={true}
            onUnreadCountChange={setUnreadChatCount}
            onNewMessageToast={handleNewMessageToast}
          />
        );
      })()}

      {/* Mini Chat Toast Notification (작게 알림 뜨게) */}
      {chatToast && !isChatOpen && (
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

      {/* Floating Chat Button (Draggable / Movable outside interview room) */}
      {!isChatOpen && (
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
            className={`px-4 py-3 btn-theme-primary text-white rounded-2xl shadow-xl flex items-center gap-2 font-bold text-xs transition-all border border-white/20 select-none touch-none ${
              isDraggingChatBtn
                ? 'cursor-grabbing scale-105 shadow-2xl ring-4 ring-[var(--color-primary)]/50 opacity-90'
                : 'cursor-grab hover:scale-105 active:scale-95 animate-fade-in group'
            }`}
            title="클릭: 대화방 열기 | 길게 누르고 드래그하여 위치 이동"
          >
            <div className="flex items-center gap-1">
              <GripVertical
                className={`w-3.5 h-3.5 transition-opacity ${
                  isDraggingChatBtn ? 'text-white opacity-100' : 'text-white/70 opacity-70 group-hover:opacity-100'
                }`}
              />
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-white" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
            </div>

            <span>{isDraggingChatBtn ? '위치 이동 중...' : '면접관 대화방'}</span>
            {unreadChatCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold font-mono shadow-sm animate-bounce">
                {unreadChatCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
