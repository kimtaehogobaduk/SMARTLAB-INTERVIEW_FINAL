import React, { useState, useRef } from 'react';
import { Candidate, InterviewerUser, InterviewRoomItem, PlatformSettings, InterviewerChatMessage } from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { EntryModeModal } from './EntryModeModal';
import { InterviewerChat } from './InterviewerChat';
import { CandidateChatModal } from './CandidateChatModal';
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
  MessageSquareText
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
  const [selectedCandidateForEntry, setSelectedCandidateForEntry] = useState<Candidate | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Candidate Chat Modal State
  const [candidateForChat, setCandidateForChat] = useState<Candidate | null>(null);

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
    if (!newName.trim()) {
      alert('지원자 이름을 입력해주세요.');
      return;
    }

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
      id: `cand-${Date.now().toString(36)}`,
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
      interviewers: ['면접관 1', '면접관 2', '면접관 3'],
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
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col select-none text-slate-900">
      {/* Header Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToRooms}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
            title="방 목록으로 이동"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>방 목록</span>
          </button>

          <SmartLabLogo size="md" />

          {/* Room Title */}
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs">
            <span className="text-slate-400 font-semibold">현재 방:</span>
            <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
              {currentRoom.name || currentRoom.title || 'SmartLab 면접실'}
            </span>
          </div>
        </div>

        {/* Center/Right Navigation Tools */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={onOpenLeaderboard}
              className="px-3 py-1.5 bg-white text-slate-800 rounded-md font-bold shadow-2xs hover:text-blue-600 transition-colors flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>종합 순위표</span>
            </button>

            <button
              onClick={onOpenParser}
              className="px-3 py-1.5 text-slate-700 hover:text-purple-700 hover:bg-white rounded-md font-bold transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>⚡ 만능 AI 일정 생성기 (이미지/텍스트)</span>
            </button>

            <button
              onClick={onOpenAdmin}
              className="px-3 py-1.5 text-slate-700 hover:text-red-700 hover:bg-white rounded-md font-bold transition-all flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-red-600" />
              <span>감사 로그</span>
            </button>

            <button
              onClick={onOpenSchema}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-md font-semibold transition-all"
              title="PostgreSQL 스키마 & API 명세"
            >
              <Database className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isChatOpen
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-indigo-700 hover:bg-white'
              }`}
              title="면접관 실시간 대화방"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>면접관 대화</span>
              {unreadChatCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold font-mono animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </button>
          </div>

          {/* Current Interviewer Badge */}
          {(() => {
            const role = currentUser.leadershipRole || getLeadershipRole(currentUser.name, settings.leadership);
            const isCap = role === 'CAPTAIN';
            const isVc = role === 'VICE_CAPTAIN';

            return (
              <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 flex items-center justify-end gap-1.5">
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
                    isCap ? 'text-amber-600' : isVc ? 'text-purple-600' : 'text-blue-600'
                  }`}>
                    {isCap ? '총괄 기장' : isVc ? '부기장' : '평가위원'}
                  </div>
                </div>

                <button
                  onClick={onSwitchInterviewer}
                  className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="면접관 전환"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>전환</span>
                </button>
              </div>
            );
          })()}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Evaluation Criteria Confirmation Status Notice */}
        {settings && !settings.isCriteriaConfirmed ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-rose-900">
                    ⚠️ 어드민 평가 기준 미확정 (평가 점수 입력 및 제출 차단됨)
                  </h4>
                  <span className="px-2 py-0.2 bg-rose-200 text-rose-800 text-[10px] font-bold rounded-md">
                    잠금 상태
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 leading-snug">
                  어드민이 가중 합산 기준과 평가 항목을 확정하기 전까지는, 면접실에 들어가도 평가 점수를 저장하거나 제출할 수 없도록 안전하게 차단되어 있습니다.
                </p>
              </div>
            </div>

            {onGoToAdminPortal && (
              <button
                type="button"
                onClick={onGoToAdminPortal}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>어드민 기준 설정으로 이동</span>
              </button>
            )}
          </div>
        ) : settings && settings.isCriteriaConfirmed && (
          <div className="px-4 py-2.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">
                어드민 평가 기준 확정됨:
              </span>
              <span className="text-emerald-700 text-[11px]">
                {settings.criteria?.map(c => `${c.name.split('.')[1] || c.name} (${c.weight}%)`).join(' • ')} (합격선: {settings.passThresholdScore || 70}점)
              </span>
            </div>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
              평가 활성화됨
            </span>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="지원자 이름 또는 학번 검색..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>신규 지원자 추가</span>
            </button>

            <button
              onClick={onOpenParser}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
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
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors"
                title="전체 비우기"
              >
                전체 비우기
              </button>
            )}
          </div>
        </div>

        {/* Candidate List Cards */}
        {filteredCandidates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                현재 등록된 지원자가 없습니다
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                <strong>[+ 신규 지원자 추가]</strong> 버튼을 누르거나, <strong>[⚡ 이미지/명단 일괄 등록]</strong>을 통해 엑셀 표나 일정표 사진을 올려보세요.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                신규 지원자 추가
              </button>
              <button
                onClick={onOpenParser}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
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
                  className={`bg-white rounded-xl border p-5 shadow-2xs transition-all hover:shadow-md flex flex-col justify-between space-y-4 ${
                    isInProgress
                      ? 'border-blue-400 ring-2 ring-blue-500/20'
                      : isCompleted
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Card Top Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-900">{c.name}</h4>
                        <span className="text-xs font-medium text-slate-400 font-mono">
                          {c.studentId}
                        </span>
                        {c.track && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {c.track}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {c.timeslot.start} ~ {c.timeslot.end}
                        </span>
                        <span>•</span>
                        <span>{c.timeslot.room}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isInProgress ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          면접 진행 중
                        </span>
                      ) : isCompleted ? (
                        <span className="bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          평가 완료
                        </span>
                      ) : isNoShow ? (
                        <span className="bg-red-100 text-red-800 border border-red-300 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                          <UserX className="w-3.5 h-3.5 text-red-600" />
                          결시 확정 (2/3 동의)
                        </span>
                      ) : (c.noShowVotes && c.noShowVotes.length > 0) ? (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                          <UserX className="w-3.5 h-3.5 text-amber-600" />
                          결시 동의 중 ({c.noShowVotes.length}/{Math.ceil(((c.interviewers?.length || 3) * 2) / 3)}명)
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          대기 중
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Documents & Details preview */}
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-2">
                    
                    {/* Candidate Self-scheduled date & reminder status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60 text-[11px]">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>면접일: <strong className="text-slate-900">{c.interviewDate || '당일 배정'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.reminder10MinEnabled && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <BellRing className="w-3 h-3 text-amber-600" />
                            <span>10분전 알림요청</span>
                          </span>
                        )}
                        {c.lastCandidateActiveAt && (
                          <span className="text-[10px] text-slate-400">포털 접속됨</span>
                        )}
                      </div>
                    </div>

                    {c.candidateNotes && (
                      <div className="text-[11px] text-blue-900 bg-blue-50/70 p-2 rounded-md border border-blue-200/60 leading-relaxed">
                        <span className="font-bold text-blue-950">지원자 전달사항: </span>
                        {c.candidateNotes}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">제출 서류:</span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {c.documents.length > 0 ? `${c.documents.length}개 서류` : '서류 없음'}
                      </span>
                    </div>
                    {c.documents.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.documents.map((doc, idx) => (
                          <span
                            key={doc.id || idx}
                            className="inline-flex items-center gap-1 text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-medium"
                          >
                            <span className="uppercase text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded">
                              {doc.type || 'DOC'}
                            </span>
                            <span className="truncate max-w-[130px]">{doc.title}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400">등록된 사전 서류 없음</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (confirm(`'${c.name}' 지원자를 삭제하시겠습니까?`)) {
                            onDeleteCandidate(c.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="지원자 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Candidate 1:1 Chat Button */}
                      <button
                        type="button"
                        onClick={() => setCandidateForChat(c)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="지원자 실시간 대화함 열기 (전체 면접관 공유)"
                      >
                        <MessageSquareText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>지원자 대화</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectCandidate(c.id, true)}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="평가하지 않고 면접 진행 흐름만 관전"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>관전만</span>
                      </button>

                      <button
                        onClick={() => setSelectedCandidateForEntry(c)}
                        className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                신규 면접 지원자 직접 등록
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">지원자 성명 *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">분야 / 메모 (선택)</label>
                  <input
                    type="text"
                    value={newFieldNote}
                    onChange={(e) => setNewFieldNote(e.target.value)}
                    placeholder="예: AI, 프론트, 기획 등"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">학번 / 식별번호</label>
                  <input
                    type="text"
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="202610291"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">연락처</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">시작 시간</label>
                  <input
                    type="text"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    placeholder="14:00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">종료 시간</label>
                  <input
                    type="text"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    placeholder="14:30"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono font-bold"
                  />
                </div>
              </div>

              {/* Multi-Format Document Attachment Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">
                    지원 서류 첨부 (PDF / PPTX / HWP / 이미지 / Word / 링크 등)
                  </label>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                    다양한 서식 지원
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">서류 형식 선택</label>
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
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
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">서류 파일 직접 업로드</label>
                    <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer transition-colors truncate">
                      <Upload className="w-3.5 h-3.5 text-blue-600 shrink-0" />
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
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {newDocType === 'gdocs' ? 'Google Docs / Sheets / Drive 공유 URL (인앱 뷰어로 변환)' : '외부 서류 / 웹사이트 URL (인앱 로딩)'}
                    </label>
                    <input
                      type="url"
                      value={newDocUrl}
                      onChange={(e) => setNewDocUrl(e.target.value)}
                      placeholder={newDocType === 'gdocs' ? 'https://docs.google.com/document/d/...' : 'https://notion.so/... 또는 https://github.com/...'}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    지원 서류 본문 / 핵심 역량 요약 (AI 질문 생성에 활용)
                  </label>
                  <textarea
                    rows={3}
                    value={newDocText}
                    onChange={(e) => setNewDocText(e.target.value)}
                    placeholder="지원 동기, 프로젝트 경험, 포트폴리오 텍스트를 입력하면 실시간 AI 꼬리 질문 생성에 활용됩니다..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  지원자 등록 완료
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

      {/* Floating Chat Button */}
      {!isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-5 right-5 z-40 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl shadow-xl flex items-center gap-2 font-bold text-xs transition-all hover:scale-105 active:scale-95 border border-indigo-400/40 cursor-pointer animate-fade-in group select-none"
          title="면접관 실시간 대화방 열기"
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
