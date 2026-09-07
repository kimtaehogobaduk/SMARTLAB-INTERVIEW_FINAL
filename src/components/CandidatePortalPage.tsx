import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Candidate, InterviewRoomItem, CandidateChatMessage, DocumentItem, CandidateFullResultData } from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { CandidateLiveInterviewPage } from './CandidateLiveInterviewPage';
import { CandidateResultScorecard } from './CandidateResultScorecard';
import { ThemeQuickToggle } from './ThemeQuickToggle';
import {
  GraduationCap,
  Calendar,
  Clock,
  FileText,
  UploadCloud,
  Send,
  Bell,
  BellRing,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash2,
  FileUp,
  Link2,
  MessageSquare,
  Sparkles,
  Info,
  Building2,
  LogOut,
  RefreshCw,
  Eye,
  Check,
  Shield,
  Radio,
  Award,
  BarChart3,
  TrendingUp,
  FileCheck
} from 'lucide-react';

interface CandidatePortalPageProps {
  candidate: Candidate;
  room: InterviewRoomItem;
  initialMessages?: CandidateChatMessage[];
  onLogout: () => void;
  onCandidateUpdated: (updated: Candidate) => void;
}

export const CandidatePortalPage: React.FC<CandidatePortalPageProps> = ({
  candidate,
  room,
  initialMessages = [],
  onLogout,
  onCandidateUpdated
}) => {
  // Portal Main Tab State: 'PREPARATION' (면접 준비/소통) vs 'RESULTS' (면접 성적표/AI 피드백)
  const [activePortalTab, setActivePortalTab] = useState<'PREPARATION' | 'RESULTS'>('PREPARATION');
  const [candidateResult, setCandidateResult] = useState<CandidateFullResultData | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState<boolean>(false);

  // Candidate Profile & Schedule State
  const [interviewDate, setInterviewDate] = useState<string>(
    candidate.interviewDate || new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>(candidate.timeslot?.start || '14:00');
  const [endTime, setEndTime] = useState<string>(candidate.timeslot?.end || '14:30');
  const [candidateNotes, setCandidateNotes] = useState<string>(candidate.candidateNotes || '');
  const [phone, setPhone] = useState<string>(candidate.phone || '');
  const [email, setEmail] = useState<string>(candidate.email || '');

  // Documents State
  const [documents, setDocuments] = useState<DocumentItem[]>(candidate.documents || []);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocType, setNewDocType] = useState<string>('pdf');
  const [newDocUrl, setNewDocUrl] = useState<string>('');
  const [newDocSnippet, setNewDocSnippet] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');

  // 10-Minute Reminder State & Countdown
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(candidate.reminder10MinEnabled ?? true);
  const [timeUntilInterview, setTimeUntilInterview] = useState<string>('');
  const [is10MinAlertTriggered, setIs10MinAlertTriggered] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Real-time Chat / Messaging State
  const [messages, setMessages] = useState<CandidateChatMessage[]>(initialMessages);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Live Interview Auto-Transition State
  const [currentStatus, setCurrentStatus] = useState<string>(candidate.status || 'PENDING');
  const [isLiveInterviewMode, setIsLiveInterviewMode] = useState<boolean>(candidate.status === 'IN_PROGRESS');

  // Sync / Saving feedback
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [saveErrorMsg, setSaveErrorMsg] = useState<string>('');

  // Continuous status polling: Auto-navigate to live interview room as soon as interviewer starts it
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/candidate-portal/status?candidateId=${candidate.id}&roomId=${room.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.candidate) {
            setCurrentStatus(data.candidate.status);
            if (data.candidate.status === 'IN_PROGRESS') {
              setIsLiveInterviewMode(true);
            }
            onCandidateUpdated(data.candidate);
          }
        }
      } catch (e) {
        // Ignore polling error
      }
    };

    pollStatus();
    const statusInterval = setInterval(pollStatus, 2500);
    return () => clearInterval(statusInterval);
  }, [candidate.id, room.id, onCandidateUpdated]);

  // Initialize and immediately request notification permissions at the start
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          setNotificationPermission(perm);
          if (perm === 'granted') {
            try {
              new Notification('SmartLab 면접 알림 연결 완료', {
                body: `${candidate.name} 지원자님, 면접 시작 10분 전에 실시간 알림이 발송됩니다.`,
                icon: '/favicon.ico'
              });
            } catch (e) {
              // Ignore
            }
          }
        }).catch(() => {});
      }
    }
  }, [candidate.name]);

  // Request browser notification permission
  const handleRequestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('SmartLab 면접 알림 설정 완료', {
          body: `${candidate.name}님, 면접 시작 10분 전에 실시간 알림이 전송됩니다.`,
          icon: '/favicon.ico'
        });
      }
    }
  };

  // Realtime Countdown & 10-Minute Warning Engine
  useEffect(() => {
    const updateCountdown = () => {
      if (!interviewDate || !startTime) {
        setTimeUntilInterview('면접 일정 미정');
        return;
      }

      try {
        const targetDateTime = new Date(`${interviewDate}T${startTime}:00`);
        const now = new Date();
        const diffMs = targetDateTime.getTime() - now.getTime();

        if (isNaN(diffMs)) {
          setTimeUntilInterview('면접 시간 설정됨');
          return;
        }

        if (diffMs <= 0) {
          setTimeUntilInterview('면접 진행 중 또는 완료');
          return;
        }

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

        if (hours > 24) {
          const days = Math.floor(hours / 24);
          setTimeUntilInterview(`${days}일 ${hours % 24}시간 남음`);
        } else if (hours > 0) {
          setTimeUntilInterview(`${hours}시간 ${mins}분 ${secs}초 남음`);
        } else {
          setTimeUntilInterview(`${mins}분 ${secs}초 남음`);
        }

        // Trigger 10-Minute Alert if within 10 minutes and enabled
        if (diffMinutes <= 10 && diffMinutes > 0 && reminderEnabled && !is10MinAlertTriggered) {
          setIs10MinAlertTriggered(true);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔔 면접 10분 전 알림 (SmartLab)', {
              body: `${candidate.name}님! 면접 시작까지 10분 남았습니다. 마이크와 준비 서류를 확인해주세요.`,
              icon: '/favicon.ico'
            });
          }
        }
      } catch (e) {
        setTimeUntilInterview('면접 일정 설정됨');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [interviewDate, startTime, reminderEnabled, is10MinAlertTriggered, candidate.name]);

  // Polling for incoming messages & updates from interviewers
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/candidate-portal/messages?candidateId=${candidate.id}&roomId=${room.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
            setMessages(data.messages);
          }
        }
      } catch (e) {
        // Ignore polling error
      }
    };

    fetchMessages();
    const pollTimer = setInterval(fetchMessages, 3500);
    return () => clearInterval(pollTimer);
  }, [candidate.id, room.id]);

  // Fetch Candidate Scorecard & AI Diagnostic Results
  const fetchCandidateResult = useCallback(async () => {
    if (!candidate?.id) return;
    try {
      setIsLoadingResult(true);
      const params = new URLSearchParams({
        candidateId: candidate.id,
        roomId: room?.id || '',
        studentId: candidate.studentId || ''
      });
      const res = await fetch(`/api/candidate-portal/result?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          setCandidateResult(data.result);
          // If results are published, default or switch to results view
          if (data.result.isPublished) {
            setActivePortalTab(prev => (prev === 'RESULTS' ? prev : 'RESULTS'));
          }
        }
      }
    } catch (e) {
      // Safe fallback for transient network polling
      console.warn('Notice fetching candidate result:', e);
    } finally {
      setIsLoadingResult(false);
    }
  }, [candidate?.id, candidate?.studentId, room?.id]);

  useEffect(() => {
    fetchCandidateResult();
    const resultInterval = setInterval(fetchCandidateResult, 5000);
    return () => clearInterval(resultInterval);
  }, [fetchCandidateResult]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save Schedule & Profile Changes
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    try {
      const res = await fetch('/api/candidate-portal/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          timeslot: {
            start: startTime,
            end: endTime,
            room: room.name || room.title || 'SmartLab 면접실'
          },
          interviewDate,
          documents,
          phone,
          email,
          candidateNotes,
          reminder10MinEnabled: reminderEnabled
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '일정 저장에 실패했습니다.');
      }

      setSaveSuccessMsg('면접 일정과 서류가 면접관 시스템에 성공적으로 자동 반영되었습니다!');
      onCandidateUpdated(data.candidate);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Toggle 10-Minute Reminder
  const handleToggleReminder = async () => {
    const nextVal = !reminderEnabled;
    setReminderEnabled(nextVal);

    if (nextVal && notificationPermission !== 'granted') {
      handleRequestNotificationPermission();
    }

    try {
      await fetch('/api/candidate-portal/toggle-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          enabled: nextVal
        })
      });
    } catch (e) {
      // Ignore
    }
  };

  // Handle File Upload for Extra Documents
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!newDocTitle) {
      setNewDocTitle(file.name);
    }

    // Format file size
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setFileSizeStr(`${sizeInMB} MB`);

    // Determine type
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') setNewDocType('pdf');
    else if (['pptx', 'ppt'].includes(ext)) setNewDocType('pptx');
    else if (['doc', 'docx', 'hwp'].includes(ext)) setNewDocType('doc');
    else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) setNewDocType('image');
    else if (['zip', 'tar', 'gz'].includes(ext)) setNewDocType('zip');
    else if (['py', 'ts', 'js', 'cpp', 'java'].includes(ext)) setNewDocType('code');
    else setNewDocType('text');

    // Read Base64
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Add Document to List & Save
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    const newDoc: DocumentItem = {
      id: `doc-cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 4)}`,
      title: newDocTitle.trim(),
      type: newDocType,
      url: newDocUrl.trim() || undefined,
      fileData: fileBase64 || undefined,
      fileSize: fileSizeStr || (newDocUrl ? '웹 링크 / 포트폴리오' : '문서 서류'),
      contentSnippet: newDocSnippet.trim() || `${candidate.name} 지원자가 추가 제출한 ${newDocTitle} 서류`,
      rawText: newDocSnippet.trim() || `${newDocTitle} - 제출 서류 URL: ${newDocUrl || '첨부파일 업로드됨'}`,
      uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false })
    };

    const updatedDocs = [...documents, newDoc];
    setDocuments(updatedDocs);
    setIsDocModalOpen(false);

    // Reset Form
    setNewDocTitle('');
    setNewDocUrl('');
    setNewDocSnippet('');
    setSelectedFile(null);
    setFileBase64('');
    setFileSizeStr('');

    // Immediately sync to server
    try {
      const res = await fetch('/api/candidate-portal/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          documents: updatedDocs
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.candidate) onCandidateUpdated(data.candidate);
        setSaveSuccessMsg('추가 서류가 면접관 시스템에 즉시 등록되었습니다!');
        setTimeout(() => setSaveSuccessMsg(''), 3500);
      }
    } catch (e) {
      // Ignore
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId: string) => {
    const updatedDocs = documents.filter((d) => d.id !== docId);
    setDocuments(updatedDocs);

    try {
      const res = await fetch('/api/candidate-portal/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          documents: updatedDocs
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.candidate) onCandidateUpdated(data.candidate);
      }
    } catch (e) {
      // Ignore
    }
  };

  // Send Chat Message to All Interviewers
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingMessage) return;

    const messageText = chatInput.trim();
    setChatInput('');
    setIsSendingMessage(true);

    try {
      const res = await fetch('/api/candidate-portal/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          roomId: room.id,
          studentId: candidate.studentId,
          candidateName: candidate.name,
          senderType: 'candidate',
          senderName: candidate.name,
          text: messageText
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.messages) {
          setMessages(data.messages);
        } else if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Conditional Render: When Interview is in progress or entered, render CandidateLiveInterviewPage automatically
  if (isLiveInterviewMode || currentStatus === 'IN_PROGRESS') {
    return (
      <CandidateLiveInterviewPage
        candidate={candidate}
        room={room}
        onCandidateUpdated={(updated) => {
          onCandidateUpdated(updated);
          setCurrentStatus(updated.status);
        }}
        onExit={() => setIsLiveInterviewMode(false)}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans pb-16">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <SmartLabLogo size="sm" />
            <div className="hidden sm:block h-4 w-px bg-slate-800" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs sm:text-sm text-white">{candidate.name} 지원자 포털</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  {candidate.studentId}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-blue-400" />
                <span>{room.name || room.title}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tab Switcher */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActivePortalTab('PREPARATION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePortalTab === 'PREPARATION'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>일정 & 서류</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePortalTab('RESULTS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePortalTab === 'RESULTS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>성적표 & AI 리포트</span>
                {candidateResult?.isPublished && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
              </button>
            </div>

            {candidate.status === 'IN_PROGRESS' && (
              <button
                type="button"
                onClick={() => setIsLiveInterviewMode(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">실시간 면접실</span>
              </button>
            )}

            <ThemeQuickToggle variant="header" />

            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700/60"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">나가기</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Render RESULTS Tab if selected */}
        {activePortalTab === 'RESULTS' ? (
          candidateResult?.isPublished ? (
            <CandidateResultScorecard
              candidate={{
                id: candidate.id,
                name: candidate.name,
                studentId: candidate.studentId,
                track: candidate.track,
                phone: candidate.phone,
                email: candidate.email,
                interviewDate: candidate.interviewDate,
                completedAt: candidate.completedAt
              }}
              resultData={candidateResult}
              onRefresh={fetchCandidateResult}
            />
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-5 shadow-sm max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20">
                <FileCheck className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[11px] font-medium border border-blue-500/20">
                  심사 집계 중
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  면접 결과 및 성적표 집계 중
                </h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  운영진의 최종 심사 완료 후 개별 성적표 및 면접관별 평가 분석 리포트가 공개됩니다.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchCandidateResult}
                disabled={isLoadingResult}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingResult ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
            </div>
          )
        ) : (
          <>
            {/* Banner: Candidate Status & Countdown Banner */}
            <div className="p-5 sm:p-6 bg-slate-900/70 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[11px] font-medium">
                  <Sparkles className="w-3 h-3" />
                  <span>실시간 동기화 활성화</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  안녕하세요, {candidate.name}님
                </h1>
                <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  면접 일정 확인 및 조율, 추가 포트폴리오 서류 제출, 면접관 팀과의 실시간 소통이 가능합니다.
                </p>
              </div>

              {/* Countdown & Reminder Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 shrink-0 min-w-[260px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>면접 시작까지</span>
                  </span>
                  <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                    {interviewDate} {startTime}
                  </span>
                </div>

                <div className="text-2xl font-bold text-white font-mono tracking-tight text-center py-0.5">
                  {timeUntilInterview}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <BellRing className={`w-3.5 h-3.5 ${reminderEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span>10분 전 알림</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleReminder}
                    className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      reminderEnabled
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                    }`}
                  >
                    <span>{reminderEnabled ? '알림 켜짐' : '알림 꺼짐'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Global Save Notifications */}
            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span className="font-medium">{saveSuccessMsg}</span>
              </div>
            )}
            {saveErrorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span className="font-medium">{saveErrorMsg}</span>
              </div>
            )}

        {/* Grid Layout: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Schedule & Documents - 7 cols */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* 1. Schedule Settings Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">면접 일정 설정</h2>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>면접 일자 *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>시작 시간 *</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-xs font-mono focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>종료 시간 *</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-xs font-mono focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">
                    비상 연락처
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="예: 010-1234-5678"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">
                    면접관 전달 메모 (선택)
                  </label>
                  <textarea
                    rows={2}
                    value={candidateNotes}
                    onChange={(e) => setCandidateNotes(e.target.value)}
                    placeholder="면접관에게 미리 전달하고 싶은 일정 조율 사유나 참고사항을 적어주세요."
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isSavingProfile ? '저장 중...' : '일정 및 정보 저장'}</span>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>

              </form>
            </div>

            {/* 2. Additional Submitted Documents Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-medium">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">추가 제출 서류</h2>
                    <p className="text-[11px] text-slate-400">
                      이력서, 포트폴리오(PDF/PPTX), GitHub/링크 등을 등록할 수 있습니다.
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-all border border-slate-700/60"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>서류 추가</span>
                </button>
              </div>

              {/* Documents List */}
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <div className="p-6 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-400 space-y-1.5">
                    <FileUp className="w-6 h-6 mx-auto text-slate-500" />
                    <div className="text-xs font-medium text-slate-300">제출된 서류가 없습니다</div>
                    <div className="text-[11px] text-slate-500">
                      상단의 '서류 추가' 버튼을 눌러 PDF, 포트폴리오 등을 등록하세요.
                    </div>
                  </div>
                ) : (
                  documents.map((doc, idx) => (
                    <div
                      key={doc.id || idx}
                      className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 shrink-0 font-medium text-[11px] uppercase">
                          {doc.type === 'pdf' ? 'PDF' : doc.type === 'pptx' ? 'PPT' : doc.type === 'image' ? 'IMG' : 'DOC'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-xs text-white truncate flex items-center gap-2">
                            <span>{doc.title}</span>
                            {doc.fileSize && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                {doc.fileSize}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {doc.contentSnippet || doc.url || '제출 서류'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="링크 열기"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="서류 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Real-time Messenger to All Interviewers - 5 cols */}
          <div className="lg:col-span-5 space-y-5">
            
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col h-[560px]">
              
              {/* Chat Header */}
              <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-medium">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <span>면접관 메시지</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      면접관 팀 전체에게 실시간 문의사항을 전달합니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Body: Messages */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2.5 my-2 scrollbar-thin">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-1.5 p-6">
                    <MessageSquare className="w-7 h-7 text-slate-600" />
                    <div className="text-xs font-medium text-slate-300">주고받은 메시지가 없습니다</div>
                    <div className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                      면접 일정, 장소, 기술 사전 질문 등을 남기시면 면접관 팀이 확인 후 답변합니다.
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderType === 'candidate';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
                          {isMe ? (
                            <span>나 ({candidate.name})</span>
                          ) : (
                            <span className="text-slate-300 font-medium flex items-center gap-1">
                              <Shield className="w-3 h-3 text-blue-400" />
                              <span>면접관</span>
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                        </div>

                        <div
                          className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-800/80 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="면접관에게 메시지 보내기..."
                  className="flex-1 px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isSendingMessage}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-medium text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="text-[10px] text-slate-500 pt-1 text-center">
                * 공정성을 위해 일괄 'SmartLab 면접관' 명의로 전달됩니다.
              </div>

            </div>

          </div>

        </div>
        </>
        )}

      </main>

      {/* Modal: Add Document */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-lg p-5 sm:p-6 space-y-4 animate-scale-in text-slate-100">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <FileUp className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-semibold text-sm text-white">추가 서류 등록</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-md transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3.5">
              
              {/* Document File Upload */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300 block">
                  파일 업로드 (PDF, PPTX, 문서, 이미지)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.pptx,.ppt,.doc,.docx,.hwp,.png,.jpg,.jpeg,.zip,.py,.ts,.js,.txt"
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300 block">
                  서류 제목 *
                </label>
                <input
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="예: 홍길동_포트폴리오.pdf"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>

              {/* URL or Link */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-slate-400" />
                  <span>웹 링크 / 포트폴리오 URL (선택)</span>
                </label>
                <input
                  type="url"
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>

              {/* Snippet / Brief Note */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300 block">
                  서류 요약 및 메모 (선택)
                </label>
                <textarea
                  rows={3}
                  value={newDocSnippet}
                  onChange={(e) => setNewDocSnippet(e.target.value)}
                  placeholder="핵심 요약이나 참고사항을 적어주세요."
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-700/80 text-slate-300 hover:text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>등록 완료</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
