import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Candidate, InterviewRoomItem, CandidateChatMessage, DocumentItem, CandidateFullResultData } from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { CandidateLiveInterviewPage } from './CandidateLiveInterviewPage';
import { CandidateResultScorecard } from './CandidateResultScorecard';
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
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <SmartLabLogo size="sm" />
            <div className="hidden sm:block h-5 w-px bg-slate-800" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white">{candidate.name} 지원자 포털</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  학번: {candidate.studentId}
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
            <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActivePortalTab('PREPARATION')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePortalTab === 'PREPARATION'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>일정 & 서류 소통</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePortalTab('RESULTS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePortalTab === 'RESULTS'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>면접 성적표 & AI 리포트</span>
                {candidateResult?.isPublished && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                )}
              </button>
            </div>

            {candidate.status === 'IN_PROGRESS' && (
              <button
                type="button"
                onClick={() => setIsLiveInterviewMode(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/30 animate-pulse"
              >
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">실시간 면접실</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30 shadow-lg">
                <FileCheck className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                  면접 심사 및 다면 평가 집계 중
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  면접 결과 및 AI 심층 성적표 발표 준비 중입니다
                </h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  모든 면접 일정이 완료된 후, 운영진의 최종 심사 마감과 함께 <strong>지원자 개별 점수</strong>, <strong>면접관별 채점표</strong>, <strong>집단 평균/표준편차/석차</strong> 및 <strong>AI 맞춤 성장 보고서</strong>가 공개됩니다.
                </p>
              </div>

              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/80 max-w-md mx-auto text-left space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 font-bold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>발표 시 제공되는 항목</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                  <li>내 종합 환산 점수 및 가중치별 세부 배점표</li>
                  <li>기장/부기장 및 심사위원별 세부 채점표 & 정성 피드백</li>
                  <li>전체 지원자 평균(μ), 표준편차(σ), 석차 및 백분위</li>
                  <li>Groq Llama 3.3 70B 기반 강점/보완점/역량 로드맵 AI 보고서</li>
                  <li>공식 인증 PDF 성적표 다운로드 기능</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={fetchCandidateResult}
                disabled={isLoadingResult}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30 inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingResult ? 'animate-spin' : ''}`} />
                <span>결과 발표 여부 지금 확인하기</span>
              </button>
            </div>
          )
        ) : (
          <>
            {/* Banner: Candidate Status & 10-Minute Countdown Banner */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/60 border border-blue-800/60 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>지원자 실시간 동기화 상태: 연결됨 (면접관 시스템 실시간 반영 중)</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  안녕하세요, {candidate.name}님! 면접 준비를 환영합니다.
                </h1>
                <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                  본 포털에서 <strong className="text-blue-300">면접 일정 조율</strong>, <strong className="text-blue-300">추가 서류 제출</strong>, <strong className="text-blue-300">10분 전 실시간 알림</strong> 및 <strong className="text-blue-300">면접관 전체와의 메시지 소통</strong>을 진행하실 수 있습니다.
                </p>
              </div>

              {/* Countdown & Reminder Card */}
              <div className="bg-slate-900/90 border border-blue-500/40 rounded-2xl p-4 sm:p-5 shrink-0 min-w-[280px] space-y-3 shadow-lg relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>면접 시작까지</span>
                  </span>
                  <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    {interviewDate} {startTime}
                  </span>
                </div>

                <div className="text-2xl font-black text-white font-mono tracking-tight text-center py-1">
                  {timeUntilInterview}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <BellRing className={`w-3.5 h-3.5 ${reminderEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span>10분 전 알림</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleReminder}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      reminderEnabled
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <span>{reminderEnabled ? '알림 켜짐' : '알림 꺼짐'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Global Save Notifications */}
            {saveSuccessMsg && (
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 rounded-2xl text-xs flex items-center gap-2 shadow-lg animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-bold">{saveSuccessMsg}</span>
              </div>
            )}
            {saveErrorMsg && (
              <div className="p-3.5 bg-red-950/60 border border-red-800/80 text-red-300 rounded-2xl text-xs flex items-center gap-2 shadow-lg animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="font-bold">{saveErrorMsg}</span>
              </div>
            )}

        {/* Grid Layout: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Schedule (일정 입력) & Additional Documents (추가 제출 서류) - 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Schedule Settings Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">내 면접 일정 입력 및 조율</h2>
                    <p className="text-[11px] text-slate-400">
                      희망하시는 면접 일자와 시간대를 설정하시면 면접관 일정표에 즉시 반영됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>면접 일자 *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>시작 시간 *</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>종료 시간 *</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    비상 연락처 (휴대폰 번호)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="예: 010-1234-5678"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    면접관 전달 메모 / 일정 참고사항
                  </label>
                  <textarea
                    rows={2}
                    value={candidateNotes}
                    onChange={(e) => setCandidateNotes(e.target.value)}
                    placeholder="면접관에게 미리 전달하고 싶은 일정 조율 사유나 참고사항을 적어주세요."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{isSavingProfile ? '저장 중...' : '면접 일정 및 정보 저장'}</span>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>

              </form>
            </div>

            {/* 2. Additional Submitted Documents Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">추가 제출 서류 및 포트폴리오</h2>
                    <p className="text-[11px] text-slate-400">
                      이력서, 포트폴리오(PDF/PPTX), GitHub/Notion 링크 등을 등록하면 면접관이 실시간으로 열람합니다.
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>서류 추가 제출</span>
                </button>
              </div>

              {/* Documents List */}
              <div className="space-y-2.5">
                {documents.length === 0 ? (
                  <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400 space-y-2">
                    <FileUp className="w-8 h-8 mx-auto text-slate-500" />
                    <div className="text-xs font-semibold text-slate-300">제출된 서류가 없습니다.</div>
                    <div className="text-[11px] text-slate-500">
                      '서류 추가 제출' 버튼을 눌러 PDF, 포트폴리오, 링크 등을 등록해주세요.
                    </div>
                  </div>
                ) : (
                  documents.map((doc, idx) => (
                    <div
                      key={doc.id || idx}
                      className="p-3.5 bg-slate-800/70 border border-slate-700 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-600 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-indigo-400 shrink-0 font-bold text-xs uppercase">
                          {doc.type === 'pdf' ? 'PDF' : doc.type === 'pptx' ? 'PPT' : doc.type === 'gdocs' ? 'DOC' : doc.type === 'image' ? 'IMG' : 'DOC'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-white truncate flex items-center gap-2">
                            <span>{doc.title}</span>
                            {doc.fileSize && (
                              <span className="text-[10px] text-slate-400 font-normal px-1.5 py-0.5 rounded bg-slate-900">
                                {doc.fileSize}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {doc.contentSnippet || doc.url || '제출된 증빙 서류'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                            title="링크 열기"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-900/50 transition-colors cursor-pointer"
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
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col h-[600px]">
              
              {/* Chat Header */}
              <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                      <span>면접관 전체 메시지함</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      면접관 팀 전체에게 실시간 문의/전달 사항을 보낼 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Body: Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 my-2 scrollbar-thin">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2 p-6">
                    <MessageSquare className="w-8 h-8 text-slate-600" />
                    <div className="text-xs font-bold text-slate-300">아직 주고받은 메시지가 없습니다.</div>
                    <div className="text-[11px] text-slate-500 max-w-xs">
                      면접 일정, 장소, 기술 사전 질문 등 궁금하신 점을 작성하시면 면접관 팀이 확인 후 답변드립니다.
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
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold px-1">
                          {isMe ? (
                            <span>나 ({candidate.name})</span>
                          ) : (
                            <span className="text-amber-300 font-bold flex items-center gap-1">
                              <Shield className="w-3 h-3 text-amber-400" />
                              <span>SmartLab 면접관</span>
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                        </div>

                        <div
                          className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/20'
                              : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
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
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="면접관 전체에게 메시지 보내기..."
                  className="flex-1 px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isSendingMessage}
                  className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="text-[10px] text-slate-500 pt-2 text-center">
                * 면접관이 보낸 답변은 공정성을 위해 일괄 'SmartLab 면접관' 명의로 전달됩니다.
              </div>

            </div>

          </div>

        </div>
        </>
        )}

      </main>

      {/* Modal: Add Document */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 animate-scale-in text-slate-100">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <FileUp className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">추가 서류 및 포트폴리오 등록</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-4">
              
              {/* Document File Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  파일 업로드 (PDF, PPTX, 문서, 이미지)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.pptx,.ppt,.doc,.docx,.hwp,.png,.jpg,.jpeg,.zip,.py,.ts,.js,.txt"
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  서류 제목 *
                </label>
                <input
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="예: 홍길동_AI_포트폴리오.pdf, GitHub 저장소"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* URL or Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>웹 링크 / 포트폴리오 URL (선택)</span>
                </label>
                <input
                  type="url"
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                  placeholder="https://github.com/..., https://notion.so/..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Snippet / Brief Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  서류 간단 요약 / 주요 내용 (선택)
                </label>
                <textarea
                  rows={3}
                  value={newDocSnippet}
                  onChange={(e) => setNewDocSnippet(e.target.value)}
                  placeholder="본 서류의 핵심 연구 및 기여한 프로젝트 요약을 적어주시면 면접관 심사위원 서류 검토에 함께 활용됩니다."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>서류 제출 완료</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
