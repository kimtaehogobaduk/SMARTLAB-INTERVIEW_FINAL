import React, { useState, useEffect, useRef } from 'react';
import {
  Candidate,
  Evaluation,
  AuditLog,
  PlatformSettings,
  EvaluationCriterion,
  ScoringFormula,
  STTMessage,
  DocumentItem,
  TailQuestion,
  InterviewerUser,
  InterviewRoomItem,
  LiveNotification,
  AppView
} from './types';
import { LandingEntryPage } from './components/LandingEntryPage';
import { RoleSelectLandingPage } from './components/RoleSelectLandingPage';
import { CandidateEntryFlow } from './components/CandidateEntryFlow';
import { CandidatePortalPage } from './components/CandidatePortalPage';
import { AdminPortalPage } from './components/AdminPortalPage';
import { RoomLobbyPage } from './components/RoomLobbyPage';
import { SelectInterviewerPage } from './components/SelectInterviewerPage';
import { CandidateListPage } from './components/CandidateListPage';
import { InterviewRoom } from './components/InterviewRoom';
import { LeaderboardModal } from './components/LeaderboardModal';
import { UniversalParserModal } from './components/UniversalParserModal';
import { AdminAuditModal } from './components/AdminAuditModal';
import { DBSchemaModal } from './components/DBSchemaModal';
import { AIQualitativeModal } from './components/AIQualitativeModal';
import { LiveNotificationToast } from './components/LiveNotificationToast';
import confetti from 'canvas-confetti';

const DEFAULT_INTERVIEWERS: InterviewerUser[] = [
  { id: 'interviewer-1', name: '면접관 1 (김태호)', role: 'interviewer', trackExpertise: 'AI & 심층 기술 심사' },
  { id: 'interviewer-2', name: '면접관 2 (이지수)', role: 'interviewer', trackExpertise: 'UI/UX & 문제해결력 심사' },
  { id: 'interviewer-3', name: '면접관 3 (박민우)', role: 'interviewer', trackExpertise: '인프라 & 협업 태도 심사' },
  { id: 'admin-user', name: '동아리 총괄 관리자 (Admin)', role: 'admin', trackExpertise: '시스템 관리 & 감사 승인' }
];

export default function App() {
  // Navigation View State: Starts at ROLE_SELECT!
  const [currentView, setCurrentView] = useState<AppView>('ROLE_SELECT');

  // Candidate Self-Service Portal State
  const [portalCandidate, setPortalCandidate] = useState<Candidate | null>(null);
  const [portalRoom, setPortalRoom] = useState<InterviewRoomItem | null>(null);
  const [lastCandidateSession, setLastCandidateSession] = useState<{
    roomId: string;
    studentId: string;
    name: string;
  } | null>(null);

  // Load last saved candidate session from localStorage and request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    try {
      const saved = localStorage.getItem('smartlab_last_candidate_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.studentId && parsed.name) {
          setLastCandidateSession(parsed);
        }
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const handleResumeCandidateSession = async (session: { roomId: string; studentId: string; name: string }) => {
    try {
      const res = await fetch('/api/candidate-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: session.roomId || rooms[0]?.id || 'room-main',
          studentId: session.studentId,
          name: session.name
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.candidate) {
        setPortalCandidate(data.candidate);
        setPortalRoom(data.room || rooms.find(r => r.id === session.roomId) || currentRoom);
        setCurrentView('CANDIDATE_PORTAL');
      } else {
        setCurrentView('CANDIDATE_LOGIN');
      }
    } catch (e) {
      setCurrentView('CANDIDATE_LOGIN');
    }
  };

  // Rooms & Interviewer State
  const [rooms, setRooms] = useState<InterviewRoomItem[]>([]);
  const [currentRoom, setCurrentRoom] = useState<InterviewRoomItem>({
    id: 'room-main',
    name: 'SmartLab 면접 평가실',
    description: '동아리 신규 멤버 선발 3인 면접실',
    createdAt: new Date().toISOString(),
    createdBy: '총괄 관리자 (Admin)',
    panelCount: 3,
    minutesPerPerson: 30
  });
  const [currentUser, setCurrentUser] = useState<InterviewerUser>(DEFAULT_INTERVIEWERS[0]);

  // Candidates & Live Interview State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeCandidateId, setActiveCandidateId] = useState<string>('');
  const [isObserverMode, setIsObserverMode] = useState<boolean>(false);
  const [myEvaluation, setMyEvaluation] = useState<Evaluation | null>(null);
  const [peerEvaluations, setPeerEvaluations] = useState<Evaluation[]>([]);
  const [isBlind, setIsBlind] = useState<boolean>(true);
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    scoringFormula: 'TRIMMED_MEAN',
    weights: { technical: 40, problemSolving: 30, communication: 20, cultureFit: 10 },
    criteria: [
      { id: 'technical', name: '1. 기술 직무 역량', description: '직무 이해도, 기술 스택 깊이, 문제 접근 논리', weight: 40, maxScore: 100, color: 'blue' },
      { id: 'problemSolving', name: '2. 논리적 문제 해결력', description: '돌발 질문 대응, 트러블슈팅 논리, 한계 극복 경험', weight: 30, maxScore: 100, color: 'purple' },
      { id: 'communication', name: '3. 의사소통 및 전달력', description: '두괄식 설명, 경청 태도 및 질문 의도 파악 역량', weight: 20, maxScore: 100, color: 'emerald' },
      { id: 'cultureFit', name: '4. 동아리 적합도 & 성장성', description: 'SmartLab 문화 수용성, 열정 및 협업 주도성', weight: 10, maxScore: 100, color: 'amber' }
    ],
    isCriteriaConfirmed: false,
    passThresholdScore: 70,
    panelSize: 3,
    adminOverrideWindowSeconds: 300,
    aiProvider: 'groq',
    aiModel: 'llama-3.3-70b-versatile'
  });
  const [adminUnlockExpiresAt, setAdminUnlockExpiresAt] = useState<number | null>(null);

  // Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Modal Dialogs
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAdminPromptOpen, setIsAdminPromptOpen] = useState(false);
  const [adminPromptPassword, setAdminPromptPassword] = useState('');
  const [adminPromptError, setAdminPromptError] = useState('');
  const [isAdminVerifying, setIsAdminVerifying] = useState(false);

  const handleRequestGoToAdminPortal = () => {
    if (currentUser.role === 'admin') {
      setCurrentView('ADMIN_PORTAL');
    } else {
      setIsAdminPromptOpen(true);
      setAdminPromptPassword('');
      setAdminPromptError('');
    }
  };

  const handleAdminPromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdminVerifying(true);
    setAdminPromptError('');

    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPromptPassword.trim() })
      });

      if (res.ok) {
        setIsAdminPromptOpen(false);
        setAdminPromptPassword('');
        setAdminPromptError('');
        setCurrentUser(DEFAULT_INTERVIEWERS[3]); // Switch to Admin User
        setCurrentView('ADMIN_PORTAL');
      } else {
        const data = await res.json().catch(() => ({}));
        setAdminPromptError(data.error || '관리자 비밀번호가 일치하지 않습니다.');
      }
    } catch (err: any) {
      setAdminPromptError('관리자 인증 서버 통신 중 오류가 발생했습니다.');
    } finally {
      setIsAdminVerifying(false);
    }
  };

  // Cross-Interviewer Real-time Live Notifications
  const [activeNotifications, setActiveNotifications] = useState<LiveNotification[]>([]);
  const lastSeenNotificationTimeRef = useRef<number>(Date.now());
  const dismissedNotificationIdsRef = useRef<Set<string>>(new Set());

  // Polling for live notifications and candidate updates every 2 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/notifications?since=${lastSeenNotificationTimeRef.current - 10000}`);
        if (res.ok) {
          const notifs: LiveNotification[] = await res.json();
          if (Array.isArray(notifs) && notifs.length > 0) {
            // Filter out notifications we already dismissed or that were created more than 1 minute ago
            const now = Date.now();
            const unread = notifs.filter(n => 
              !dismissedNotificationIdsRef.current.has(n.id) &&
              (now - n.createdAt < 60000)
            );

            if (unread.length > 0) {
              setActiveNotifications(prev => {
                const combined = [...unread, ...prev.filter(p => !dismissedNotificationIdsRef.current.has(p.id))];
                // Deduplicate by id
                const seen = new Set<string>();
                return combined.filter(item => {
                  if (seen.has(item.id)) return false;
                  seen.add(item.id);
                  return true;
                }).slice(0, 3);
              });
            }
          }
        }
        
        // Also keep candidate statuses synchronized in real-time
        const candRes = await fetch('/api/candidates');
        if (candRes.ok) {
          const candData = await candRes.json();
          setCandidates(candData);
        }
      } catch (e) {
        // Silent poll error
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, []);

  const handleDismissNotification = (id: string) => {
    dismissedNotificationIdsRef.current.add(id);
    setActiveNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNavigateFromNotification = (roomId?: string, candidateId?: string) => {
    if (roomId) {
      const targetRoom = rooms.find(r => r.id === roomId);
      if (targetRoom) {
        setCurrentRoom(targetRoom);
      }
    }
    if (candidateId) {
      setActiveCandidateId(candidateId);
      setCurrentView('INTERVIEW_ROOM');
    }
  };

  // Initial Data Fetching
  useEffect(() => {
    fetchRooms();
    fetchCandidates();
    fetchAuditLogs();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error('Fetch settings error:', e);
    }
  };

  const handleConfirmCriteria = async (criteria: EvaluationCriterion[], formula: ScoringFormula, passScore: number) => {
    try {
      const res = await fetch('/api/settings/confirm-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria,
          scoringFormula: formula,
          passThresholdScore: passScore,
          confirmedBy: currentUser.name || '동아리 총괄 관리자 (Admin)',
          adminPassword: 'admin'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '평가 기준 확정에 실패했습니다.');
      }

      const updated = await res.json();
      setSettings(updated.settings);
      fetchAuditLogs();
    } catch (e: any) {
      console.error('Confirm criteria error:', e);
      throw e;
    }
  };

  const handleUnconfirmCriteria = async () => {
    try {
      const res = await fetch('/api/settings/unconfirm-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorName: currentUser.name || '동아리 총괄 관리자 (Admin)',
          adminPassword: 'admin'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '수정 모드 전환에 실패했습니다.');
      }

      const updated = await res.json();
      setSettings(updated.settings);
      fetchAuditLogs();
    } catch (e: any) {
      console.error('Unconfirm criteria error:', e);
      throw e;
    }
  };

  // Fetch evaluations when active candidate or user changes
  useEffect(() => {
    if (activeCandidateId && currentUser) {
      fetchEvaluations(activeCandidateId);
    }
  }, [activeCandidateId, currentUser.id]);

  const activeCandidate = candidates.find(c => c.id === activeCandidateId) || candidates[0];

  // Manage Stopwatch
  useEffect(() => {
    if (activeCandidate?.status === 'IN_PROGRESS') {
      setIsTimerRunning(true);
    } else if (activeCandidate?.status === 'COMPLETED' || activeCandidate?.status === 'NO_SHOW') {
      setIsTimerRunning(false);
    } else if (activeCandidate?.status === 'PENDING') {
      setIsTimerRunning(false);
      setTimerSeconds(0);
    }
  }, [activeCandidate?.status]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
        if (data.length > 0) {
          setCurrentRoom(data[0]);
        }
      }
    } catch (e) {
      console.error('Fetch rooms error:', e);
    }
  };

  const handleCreateRoom = async (roomData: {
    name: string;
    description: string;
    minutesPerPerson: number;
    panelCount: number;
    interviewers?: string[];
    securityType?: 'NONE' | 'PASSWORD' | 'QUIZ';
    roomPassword?: string;
    quizQuestion?: string;
    quizAnswer?: string;
  }): Promise<void> => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...roomData,
          adminPassword: 'admin',
          createdBy: '동아리 총괄 관리자 (Admin)'
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '방 생성에 실패했습니다.');
      }
      const newRoom = await res.json();
      await fetchRooms();
      setCurrentRoom(newRoom);
    } catch (e: any) {
      console.error('Create room error:', e);
      throw e;
    }
  };

  const handleUpdateRoom = async (roomId: string, data: {
    interviewers?: string[];
    name?: string;
    description?: string;
    securityType?: 'NONE' | 'PASSWORD' | 'QUIZ';
    roomPassword?: string;
    quizQuestion?: string;
    quizAnswer?: string;
  }): Promise<void> => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          adminPassword: 'admin'
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '방 정보 수정에 실패했습니다.');
      }
      await fetchRooms();
    } catch (e: any) {
      console.error('Update room error:', e);
      throw e;
    }
  };

  const handleDeleteRoom = async (roomId: string): Promise<void> => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: 'admin' })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '방 삭제에 실패했습니다.');
      }
      await fetchRooms();
    } catch (e: any) {
      console.error('Delete room error:', e);
      throw e;
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/candidates');
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
        if (!activeCandidateId && data.length > 0) {
          setActiveCandidateId(data[0].id);
        }
      }
    } catch (e) {
      console.error('Fetch candidates error:', e);
    }
  };

  const fetchEvaluations = async (candidateId: string) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/evaluations?interviewerId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setIsBlind(data.blind);
        const evals: Evaluation[] = data.evaluations;
        setPeerEvaluations(evals);

        const mine = evals.find(e => e.interviewerId === currentUser.id);
        if (mine && mine.scores) {
          setMyEvaluation(mine);
        } else {
          setMyEvaluation({
            id: `eval-${candidateId}-${currentUser.id}`,
            candidateId: candidateId,
            interviewerId: currentUser.id,
            interviewerName: currentUser.name,
            status: 'IN_PROGRESS',
            scores: {
              technical: 85,
              problemSolving: 80,
              communication: 85,
              cultureFit: 85
            },
            comments: {
              technicalNote: '',
              attitudeNote: '',
              overallComment: ''
            }
          });
        }
      }

      const allRes = await fetch(`/api/candidates/${candidateId}/evaluations?isAdmin=true`);
      if (allRes.ok) {
        const allData = await allRes.json();
        setAllEvaluations(prev => {
          const filtered = prev.filter(e => e.candidateId !== candidateId);
          return [...filtered, ...allData.evaluations];
        });
      }
    } catch (e) {
      console.error('Fetch evaluations error:', e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error('Fetch audit logs error:', e);
    }
  };

  // Status Transitions
  const handleCandidateStatusChange = async (
    action: 'start' | 'no_show' | 'vote_no_show' | 'cancel_vote_no_show' | 'cancel_no_show' | 'finish' | 'cancel_finish' | 'admin_reopen_5min',
    reason?: string
  ) => {
    if (!activeCandidate) return;

    try {
      const res = await fetch(`/api/candidates/${activeCandidate.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          interviewerId: currentUser.id,
          operatorName: currentUser.name,
          reason
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCandidates(prev => prev.map(c => c.id === activeCandidate.id ? data.candidate : c));
        fetchEvaluations(activeCandidate.id);
        fetchAuditLogs();

        if (action === 'finish' && data.candidate.status === 'COMPLETED') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
    } catch (e) {
      console.error('Status change error:', e);
    }
  };

  const handleSaveEvaluation = async (evalData: Evaluation, isSubmitting = false) => {
    if (!activeCandidate) return;
    try {
      const res = await fetch(`/api/candidates/${activeCandidate.id}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evalData)
      });

      if (res.ok) {
        setMyEvaluation(evalData);
        fetchEvaluations(activeCandidate.id);

        if (isSubmitting) {
          handleCandidateStatusChange('finish');
        }
      } else if (res.status === 403) {
        const errData = await res.json();
        alert(`⚠️ ${errData.error || '어드민이 평가 기준을 확정하기 전에는 평가를 제출하거나 저장할 수 없습니다.'}`);
      }
    } catch (e) {
      console.error('Save evaluation error:', e);
    }
  };

  const handleSendMessage = async (msg: STTMessage, triggerAI: boolean) => {
    if (!activeCandidate) return;
    try {
      const res = await fetch(`/api/candidates/${activeCandidate.id}/stt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          triggerAI
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCandidates(prev => prev.map(c => {
          if (c.id === activeCandidate.id) {
            return {
              ...c,
              sttTranscript: data.sttTranscript,
              aiInsights: data.aiInsights
            };
          }
          return c;
        }));
      }
    } catch (e) {
      console.error('STT send error:', e);
    }
  };

  const handleAddDocument = async (newDoc: DocumentItem) => {
    if (!activeCandidate) return;
    try {
      const res = await fetch(`/api/candidates/${activeCandidate.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(prev => prev.map(c => {
          if (c.id === activeCandidate.id) {
            return {
              ...c,
              documents: data.documents
            };
          }
          return c;
        }));
      }
    } catch (e) {
      console.error('Failed to add candidate document to server:', e);
      // Fallback local update
      setCandidates(prev => prev.map(c => {
        if (c.id === activeCandidate.id) {
          return {
            ...c,
            documents: [...c.documents, newDoc]
          };
        }
        return c;
      }));
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!activeCandidate) return;
    try {
      const res = await fetch(`/api/candidates/${activeCandidate.id}/documents/${docId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(prev => prev.map(c => {
          if (c.id === activeCandidate.id) {
            return {
              ...c,
              documents: data.documents
            };
          }
          return c;
        }));
      }
    } catch (e) {
      console.error('Failed to delete candidate document:', e);
      setCandidates(prev => prev.map(c => {
        if (c.id === activeCandidate.id) {
          return {
            ...c,
            documents: c.documents.filter(d => d.id !== docId)
          };
        }
        return c;
      }));
    }
  };

  const handleAddCandidate = async (candidateData: Partial<Candidate>) => {
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidateData)
      });
      if (res.ok) {
        await fetchCandidates();
      }
    } catch (e) {
      console.error('Add candidate error:', e);
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchCandidates();
      }
    } catch (e) {
      console.error('Delete candidate error:', e);
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch('/api/candidates/clear-all', {
        method: 'POST'
      });
      if (res.ok) {
        setCandidates([]);
        setActiveCandidateId('');
      }
    } catch (e) {
      console.error('Clear all error:', e);
    }
  };

  const handleCommitParsedCandidates = async (newCandidates: Candidate[]) => {
    try {
      const res = await fetch('/api/candidates/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidates: newCandidates,
          roomId: currentRoom?.id
        })
      });
      if (!res.ok) {
        // Fallback to sequential
        for (const c of newCandidates) {
          await fetch('/api/candidates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...c, roomId: currentRoom?.id })
          });
        }
      }
    } catch (e) {
      console.error('Batch commit candidates error:', e);
    }
    await fetchCandidates();
    if (newCandidates.length > 0) {
      setActiveCandidateId(newCandidates[0].id);
    }
  };

  const handleAdminUnlock = async (candidateId?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/unlock-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'admin', candidateId })
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUnlockExpiresAt(data.expiresAt);
        await fetchAuditLogs();
        return true;
      }
    } catch (e) {
      console.error('Admin unlock error:', e);
    }
    return false;
  };

  const handleModifyEvaluationAdmin = async (modifyData: any) => {
    try {
      const res = await fetch('/api/admin/modify-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modifyData)
      });
      if (res.ok) {
        await fetchCandidates();
        if (activeCandidate) fetchEvaluations(activeCandidate.id);
        await fetchAuditLogs();
      }
    } catch (e) {
      console.error('Admin modify error:', e);
    }
  };

  const handleRefreshAISynthesis = async () => {
    if (!activeCandidate) return;
    setIsAiLoading(true);
    try {
      const res = await fetch(`/api/candidates/${activeCandidate.id}/ai-synthesis`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(prev => prev.map(c => {
          if (c.id === activeCandidate.id) {
            return {
              ...c,
              qualitativeAiSummary: data.qualitativeAiSummary,
              mindMapData: data.mindMapData
            };
          }
          return c;
        }));
      }
    } catch (e) {
      console.error('AI synthesis error:', e);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <>
      {/* 0. Top Entry: Role Selection (지원자/학생 vs 면접관/관리자) */}
      {currentView === 'ROLE_SELECT' && (
        <RoleSelectLandingPage
          roomsCount={rooms.length}
          onSelectCandidateMode={() => setCurrentView('CANDIDATE_LOGIN')}
          onSelectInterviewerMode={() => setCurrentView('LANDING_ENTRY')}
          lastCandidateSession={lastCandidateSession}
          onResumeCandidateSession={handleResumeCandidateSession}
        />
      )}

      {/* 0-A. Candidate Entry Flow (방 선택 & 학번/성함 확인 및 이전 세션 자동 복원) */}
      {currentView === 'CANDIDATE_LOGIN' && (
        <CandidateEntryFlow
          rooms={rooms}
          onBackToRoleSelect={() => setCurrentView('ROLE_SELECT')}
          onCandidateLoginSuccess={({ candidate, room }) => {
            setPortalCandidate(candidate);
            setPortalRoom(room);
            setCurrentView('CANDIDATE_PORTAL');
          }}
        />
      )}

      {/* 0-B. Candidate Self-Service Portal (면접 일정 조율, 추가 서류 제출, 10분전 알림, 면접관 전체 메시지) */}
      {currentView === 'CANDIDATE_PORTAL' && portalCandidate && portalRoom && (
        <CandidatePortalPage
          candidate={portalCandidate}
          room={portalRoom}
          onLogout={() => {
            setPortalCandidate(null);
            setCurrentView('ROLE_SELECT');
          }}
          onCandidateUpdated={(updatedCandidate) => {
            setPortalCandidate(updatedCandidate);
            // Also update in parent candidate state if exists
            setCandidates((prev) =>
              prev.map((c) => (c.id === updatedCandidate.id ? updatedCandidate : c))
            );
          }}
        />
      )}

      {/* 1. Step 0: Main Landing Entry for Interviewer (admin으로 참가 / 방 들어가기) */}
      {currentView === 'LANDING_ENTRY' && (
        <LandingEntryPage
          roomCount={rooms.length}
          onJoinAsAdmin={() => setCurrentView('ADMIN_PORTAL')}
          onEnterRooms={() => setCurrentView('ROOM_LOBBY')}
          onBackToRoleSelect={() => setCurrentView('ROLE_SELECT')}
        />
      )}

      {/* 2. Step 1-A: Admin Portal (방 개설 및 관리 콘솔 & 평가 기준 확정 & 통계 분석 & AI 지식 학습) */}
      {currentView === 'ADMIN_PORTAL' && (
        <AdminPortalPage
          rooms={rooms}
          settings={settings}
          auditLogs={auditLogs}
          candidates={candidates}
          allEvaluations={allEvaluations}
          onCreateRoom={handleCreateRoom}
          onUpdateRoom={handleUpdateRoom}
          onDeleteRoom={handleDeleteRoom}
          onConfirmCriteria={handleConfirmCriteria}
          onUnconfirmCriteria={handleUnconfirmCriteria}
          onRefreshSettings={fetchSettings}
          onSelectRoomAsAdmin={(room) => {
            setCurrentRoom(room);
            setCurrentUser(DEFAULT_INTERVIEWERS[3]); // Admin user
            setCurrentView('CANDIDATE_LIST');
          }}
          onBackToLanding={() => setCurrentView('LANDING_ENTRY')}
        />
      )}

      {/* 3. Step 1-B: Room Lobby (개설된 방 목록 선택 / 없을 시 안내) */}
      {currentView === 'ROOM_LOBBY' && (
        <RoomLobbyPage
          rooms={rooms}
          onSelectRoom={(room) => {
            setCurrentRoom(room);
            setCurrentView('SELECT_INTERVIEWER');
          }}
          onBackToLanding={() => setCurrentView('LANDING_ENTRY')}
          onGoToAdmin={() => setCurrentView('ADMIN_PORTAL')}
        />
      )}

      {/* 4. Step 2: Select Interviewer within Room */}
      {currentView === 'SELECT_INTERVIEWER' && (
        <SelectInterviewerPage
          room={currentRoom}
          onBackToLobby={() => setCurrentView('ROOM_LOBBY')}
          availableInterviewers={currentRoom.interviewers && currentRoom.interviewers.length > 0 ? currentRoom.interviewers : DEFAULT_INTERVIEWERS}
          onSelectInterviewer={(user) => {
            setCurrentUser(user);
            setCurrentView('CANDIDATE_LIST');
          }}
        />
      )}

      {/* 5. Step 3: Candidate List & Room Management */}
      {currentView === 'CANDIDATE_LIST' && (
        <CandidateListPage
          currentRoom={currentRoom}
          currentUser={currentUser}
          candidates={candidates}
          settings={settings}
          onSelectCandidate={(id, isObserver) => {
            setActiveCandidateId(id);
            setIsObserverMode(Boolean(isObserver));
            setCurrentView('INTERVIEW_ROOM');
          }}
          onBackToRooms={() => setCurrentView('ROOM_LOBBY')}
          onSwitchInterviewer={() => setCurrentView('SELECT_INTERVIEWER')}
          onOpenParser={() => setIsParserOpen(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenSchema={() => setIsSchemaOpen(true)}
          onGoToAdminPortal={handleRequestGoToAdminPortal}
          onDeleteCandidate={handleDeleteCandidate}
          onClearAll={handleClearAll}
          onAddCandidate={handleAddCandidate}
        />
      )}

      {/* 4. Step 4: Live Interview Room (Togglable Panels & Decimal Scoring) */}
      {currentView === 'INTERVIEW_ROOM' && activeCandidate && (
        <InterviewRoom
          candidate={activeCandidate}
          allCandidates={candidates}
          currentUser={currentUser}
          myEvaluation={myEvaluation}
          peerEvaluations={peerEvaluations}
          isBlind={isBlind}
          timerSeconds={timerSeconds}
          settings={settings}
          initialObserverMode={isObserverMode}
          onBackToList={() => setCurrentView('CANDIDATE_LIST')}
          onSelectCandidate={(id) => setActiveCandidateId(id)}
          onStatusChange={handleCandidateStatusChange}
          onSaveEvaluation={handleSaveEvaluation}
          onSendMessage={handleSendMessage}
          onAddDocument={handleAddDocument}
          onDeleteDocument={handleDeleteDocument}
          onUseTailQuestion={(q: TailQuestion) => {
            setCandidates(prev => prev.map(c => {
              if (c.id === activeCandidate?.id) {
                return {
                  ...c,
                  aiInsights: {
                    ...c.aiInsights,
                    tailQuestions: c.aiInsights.tailQuestions.map(item => item.id === q.id ? { ...item, used: true } : item)
                  }
                };
              }
              return c;
            }));
          }}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenAIQualitative={() => setIsAIOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          isAiLoading={isAiLoading}
        />
      )}

      {/* Modals & Dialogs */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        candidates={candidates}
        allEvaluations={allEvaluations}
        settings={settings}
        scoringFormula={settings.scoringFormula}
        onFormulaChange={async (formula: ScoringFormula) => {
          setSettings(prev => ({ ...prev, scoringFormula: formula }));
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scoringFormula: formula })
          });
        }}
        onSelectCandidate={(candidateId: string) => {
          setActiveCandidateId(candidateId);
          setCurrentView('INTERVIEW_ROOM');
        }}
      />

      <UniversalParserModal
        isOpen={isParserOpen}
        onClose={() => setIsParserOpen(false)}
        currentRoom={currentRoom}
        onCommitCandidates={handleCommitParsedCandidates}
      />

      {activeCandidate && (
        <AIQualitativeModal
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          candidate={activeCandidate}
          onRefreshSynthesis={handleRefreshAISynthesis}
          isLoading={isAiLoading}
        />
      )}

      <AdminAuditModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        auditLogs={auditLogs}
        candidates={candidates}
        allEvaluations={allEvaluations}
        onAdminUnlock={handleAdminUnlock}
        unlockExpiresAt={adminUnlockExpiresAt}
        onModifyEvaluationAdmin={handleModifyEvaluationAdmin}
      />

      <DBSchemaModal
        isOpen={isSchemaOpen}
        onClose={() => setIsSchemaOpen(false)}
      />

      {/* Real-time Cross-Interviewer Live Notifications Toast */}
      <LiveNotificationToast
        notifications={activeNotifications}
        currentCandidateId={activeCandidateId}
        currentUserId={currentUser.id}
        onNavigateToInterview={handleNavigateFromNotification}
        onDismiss={handleDismissNotification}
      />

      {/* Admin Password Prompt Modal */}
      {isAdminPromptOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5 animate-scale-in text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>관리자(Admin) 권한 확인</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdminPromptOpen(false);
                  setAdminPromptPassword('');
                  setAdminPromptError('');
                }}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-400">
              <p>관리자 콘솔에 접근하려면 마스터 관리자 비밀번호를 입력해주세요.</p>
            </div>

            <form onSubmit={handleAdminPromptSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  관리자 비밀번호
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={adminPromptPassword}
                  onChange={(e) => {
                    setAdminPromptPassword(e.target.value);
                    if (adminPromptError) setAdminPromptError('');
                  }}
                  placeholder="관리자 비밀번호 입력"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 placeholder-slate-500 font-mono"
                />
              </div>

              {adminPromptError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <span>{adminPromptError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminPromptOpen(false);
                    setAdminPromptPassword('');
                    setAdminPromptError('');
                  }}
                  className="px-3.5 py-2 border border-slate-700 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isAdminVerifying}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <span>{isAdminVerifying ? '인증 확인 중...' : '관리자 권한 진입'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
