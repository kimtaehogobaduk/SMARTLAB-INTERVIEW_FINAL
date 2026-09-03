import React, { useState, useEffect, useRef } from 'react';
import { SmartLabLogo } from './SmartLabLogo';
import { Candidate, InterviewRoomItem, STTMessage, CandidateChatMessage } from '../types';
import { TTSPlayButton } from './TTSPlayButton';
import { TTSQuickControl } from './TTSQuickControl';
import { ttsEngine } from '../lib/tts';
import { useSTT } from '../hooks/useSTT';
import { STTAudioMeter } from './STTAudioMeter';
import {
  Mic,
  MicOff,
  Volume2,
  Users,
  Clock,
  Radio,
  FileText,
  MessageSquare,
  Send,
  CheckCircle2,
  Shield,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  Info
} from 'lucide-react';

interface CandidateLiveInterviewPageProps {
  candidate: Candidate;
  room: InterviewRoomItem;
  onCandidateUpdated?: (candidate: Candidate) => void;
  onExit?: () => void;
}

export const CandidateLiveInterviewPage: React.FC<CandidateLiveInterviewPageProps> = ({
  candidate: initialCandidate,
  room: initialRoom,
  onCandidateUpdated,
  onExit
}) => {
  const [candidate, setCandidate] = useState<Candidate>(initialCandidate);
  const [room, setRoom] = useState<InterviewRoomItem>(initialRoom);
  const [assignedInterviewers, setAssignedInterviewers] = useState<Array<{ id: string; name: string; avatarColor?: string }>>([]);
  
  // Realtime Audio & STT State
  const [transcript, setTranscript] = useState<STTMessage[]>(initialCandidate.sttTranscript || []);
  const [manualSpeechText, setManualSpeechText] = useState<string>('');

  // Interview Elapsed Timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isInterviewCompleted, setIsInterviewCompleted] = useState<boolean>(initialCandidate.status === 'COMPLETED');

  // Emergency Chat with Interviewers
  const [messages, setMessages] = useState<CandidateChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  const transcriptBottomRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Synchronize candidate prop updates
  useEffect(() => {
    setCandidate(initialCandidate);
    if (initialCandidate.sttTranscript) {
      setTranscript(initialCandidate.sttTranscript);
    }
    if (initialCandidate.status === 'COMPLETED') {
      setIsInterviewCompleted(true);
    }
  }, [initialCandidate]);

  // 1. Elapsed Timer for Interview
  useEffect(() => {
    let startTs = Date.now();
    if (candidate.interviewStartedTimestamp) {
      startTs = candidate.interviewStartedTimestamp;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - startTs) / 1000));
      setElapsedSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [candidate.interviewStartedTimestamp]);

  // Format Elapsed Time MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 2. Continuous Polling for Interview Status & Assigned Interviewers
  useEffect(() => {
    const pollCandidateStatus = async () => {
      try {
        const res = await fetch(`/api/candidate-portal/status?candidateId=${candidate.id}&roomId=${room.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.candidate) {
            setCandidate(prev => ({
              ...prev,
              status: data.candidate.status,
              startedAt: data.candidate.startedAt || prev.startedAt,
              interviewStartedTimestamp: data.candidate.interviewStartedTimestamp || prev.interviewStartedTimestamp
            }));

            if (data.candidate.sttTranscript && data.candidate.sttTranscript.length > transcript.length) {
              const newItems = data.candidate.sttTranscript.slice(transcript.length);
              setTranscript(data.candidate.sttTranscript);
              // Auto-read incoming interviewer questions if enabled
              const ttsSettings = ttsEngine.getSettings();
              if (ttsSettings.autoReadIncomingQuestions && !ttsSettings.muted) {
                const lastInterviewerMsg = newItems.find((m: any) => m.speaker !== 'candidate' && m.text);
                if (lastInterviewerMsg) {
                  ttsEngine.speak(lastInterviewerMsg.text);
                }
              }
            }

            if (data.candidate.status === 'COMPLETED') {
              setIsInterviewCompleted(true);
            }

            if (onCandidateUpdated) {
              onCandidateUpdated(data.candidate);
            }
          }

          if (data.assignedInterviewers && Array.isArray(data.assignedInterviewers)) {
            setAssignedInterviewers(data.assignedInterviewers);
          } else if (data.room?.interviewers) {
            setAssignedInterviewers(data.room.interviewers);
          }
        }
      } catch (e) {
        // Ignore background polling errors
      }
    };

    pollCandidateStatus();
    const statusInterval = setInterval(pollCandidateStatus, 2500);
    return () => clearInterval(statusInterval);
  }, [candidate.id, room.id, transcript.length, onCandidateUpdated]);

  // 3. Polling for Chat Messages
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
        // Ignore
      }
    };

    fetchMessages();
    const chatInterval = setInterval(fetchMessages, 3000);
    return () => clearInterval(chatInterval);
  }, [candidate.id, room.id]);

  // Commit Candidate Speech to Server & Local State
  const handleCommitSpeech = async (speechText: string, confidence?: number) => {
    const newMsg: STTMessage = {
      id: `stt-cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      speaker: 'candidate',
      text: speechText,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      confidence: confidence || 0.96
    };

    // Optimistic local update
    setTranscript(prev => [...prev, newMsg]);

    try {
      await fetch(`/api/candidates/${candidate.id}/stt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMsg,
          triggerAI: true
        })
      });
    } catch (e) {
      console.error('Failed to post STT speech:', e);
    }
  };

  // Robust Universal STT Engine Hook
  const {
    isSupported: speechSupported,
    isListening: isMicActive,
    isSpeaking: isMicSpeaking,
    status: sttStatus,
    interimText,
    audioLevel: micAudioLevel,
    errorMessage: sttErrorMessage,
    toggle: toggleMic,
    clearError: clearSTTError
  } = useSTT({
    lang: 'ko-KR',
    continuous: true,
    autoStart: true,
    onFinalResult: (speechText, confidence, meta) => {
      handleCommitSpeech(speechText, confidence);
    }
  });

  const handleManualSendSpeech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSpeechText.trim()) return;
    handleCommitSpeech(manualSpeechText.trim());
    setManualSpeechText('');
  };

  // Auto-scroll transcript feed
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, interimText]);

  // Auto-scroll chat feed
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  // Send Emergency Chat Message to Interviewers
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const text = chatInput.trim();
    setChatInput('');
    setIsSendingChat(true);

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
          text
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      // Ignore
    } finally {
      setIsSendingChat(false);
    }
  };

  const interviewersList = assignedInterviewers.length > 0
    ? assignedInterviewers
    : (candidate.interviewers && candidate.interviewers.length > 0
        ? candidate.interviewers
        : (room.interviewers && room.interviewers.length > 0 ? room.interviewers.map(i => i.name) : ['면접위원 1', '면접위원 2'])
      ).map((name, idx) => ({
        id: `interviewer-${idx}`,
        name: typeof name === 'string' ? name : (name as any).name || `면접관 ${idx + 1}`
      }));

  const maxMinutes = room.minutesPerPerson || 30;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Background glow effects */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800/90 px-4 sm:px-6 py-3.5 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <SmartLabLogo size="sm" />
          <div className="hidden sm:block h-5 w-px bg-slate-800" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">
                {room.name || room.title || 'SmartLab 면접실'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 border border-red-500/30 text-red-400 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>실시간 면접 진행 중</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              지원자: <strong className="text-white">{candidate.name}</strong> ({candidate.studentId})
            </div>
          </div>
        </div>

        {/* Live Timer & Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 text-xs">
            <Clock className="w-4 h-4 text-amber-400 animate-spin-slow" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-semibold">면접 진행 시간</span>
              <span className="font-mono font-black text-amber-300 text-sm">
                {formatTime(elapsedSeconds)} <span className="text-[11px] font-normal text-slate-500">/ {maxMinutes}분</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`relative p-2.5 rounded-2xl border transition-all cursor-pointer ${
              isChatOpen
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-700 text-slate-300'
            }`}
            title="면접관 문의 메시지"
          >
            <MessageSquare className="w-4 h-4" />
            {messages.length > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
            )}
          </button>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">포털로 돌아가기</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10 overflow-hidden">
        
        {/* Left Column: Interviewer Panel & Fairness Guidelines */}
        <div className="lg:col-span-1 space-y-4 flex flex-col">
          
          {/* Panel Card: Currently Evaluating Interviewers (Strictly NO scores) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-xs text-white">
                  현재 면접 평가위원 ({interviewersList.length}인)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>실시간 연결됨</span>
              </span>
            </div>

            <div className="space-y-2.5">
              {interviewersList.map((interviewer, idx) => (
                <div
                  key={interviewer.id || idx}
                  className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                      {interviewer.name ? interviewer.name.substring(0, 1) : '관'}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <span>{interviewer.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">면접관</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {room.name || '평가실'} 심사위원
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                    <span>참여 중</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>면접관 명단은 실시간 배정 현황에 따라 동기화되며, 공정한 심사를 위해 평가 세부 점수 및 평점은 블라인드 보호됩니다.</span>
            </div>
          </div>

          {/* Microphone Status & Live Voice Visualizer Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs text-white">마이크 입력 상태</h3>
              </div>
              <STTAudioMeter
                status={sttStatus}
                audioLevel={micAudioLevel}
                isListening={isMicActive}
                isSpeaking={isMicSpeaking}
                lang="ko-KR"
              />
            </div>

            {/* STT Error Alert Banner (if any) */}
            {sttErrorMessage && (
              <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-2xl flex items-start justify-between text-xs text-rose-200 animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs">마이크 연결 확인 필요</p>
                    <p className="text-[11px] text-rose-300 leading-relaxed">{sttErrorMessage}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSTTError}
                  className="text-[11px] text-rose-400 hover:text-white underline ml-2 shrink-0 cursor-pointer"
                >
                  닫기
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">마이크 동작 제어:</span>
              <button
                type="button"
                onClick={toggleMic}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  isMicActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                }`}
              >
                {isMicActive ? (
                  <>
                    <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>마이크 켜짐 (클릭시 음소거)</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                    <span>마이크 꺼짐 (클릭시 활성화)</span>
                  </>
                )}
              </button>
            </div>

            {/* Audio Wave Visualizer Bars */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">음성 입력 감도 레벨</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">{micAudioLevel}%</span>
              </div>
              
              <div className="h-6 flex items-center justify-center gap-1">
                {[...Array(24)].map((_, i) => {
                  const factor = Math.sin((i / 24) * Math.PI);
                  const barHeight = isMicActive
                    ? Math.max(15, Math.min(100, (micAudioLevel * factor * 1.6) + (Math.random() * 15)))
                    : 10;
                  return (
                    <div
                      key={i}
                      style={{ height: `${barHeight}%` }}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        isMicActive
                          ? barHeight > 60
                            ? 'bg-emerald-400'
                            : 'bg-blue-500'
                          : 'bg-slate-800'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-400 text-center">
                {isMicActive ? (
                  <span className="text-emerald-400 font-medium">
                    🎙️ 마이크가 활성화되어 발언하시는 내용이 실시간으로 기록됩니다.
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium">
                    ⚠️ 마이크가 꺼져 있습니다. 상단 버튼을 눌러 마이크를 켜주세요.
                  </span>
                )}
              </div>
            </div>

            {/* Fairness Recording Notice (Strictly professional, no AI evaluation mention) */}
            <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-900 border border-blue-800/40 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>면접 평가 공정성 및 기록 보존 안내</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                면접의 공정하고 객관적인 평가와 원활한 기록 보존을 위해 면접 음성 녹음 및 실시간 발화 전사가 안전하게 진행되고 있습니다.
              </p>
            </div>

          </div>

        </div>

        {/* Right Column (2-spans): Live Speech-to-Text Transcript Feed & Interactive Message Box */}
        <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden">
          
          {/* Main STT Live Transcript Feed Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-md flex-1 flex flex-col min-h-[420px] overflow-hidden">
            
            {/* Feed Header */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-sm text-white">
                  실시간 발화 기록 모니터링
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <TTSQuickControl />
                <span className="text-[11px] text-slate-400 bg-slate-800 px-3 py-1 rounded-xl">
                  기록 건수: <strong className="text-white">{transcript.length}건</strong>
                </span>
              </div>
            </div>

            {/* Scrollable Live Transcript Stream */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 custom-scrollbar max-h-[480px]">
              {transcript.length === 0 && !interimText && (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <Mic className="w-8 h-8 text-slate-600 animate-bounce" />
                  <p className="text-xs font-semibold text-slate-400">
                    마이크에 대고 답변을 말씀하시면 실시간으로 이곳에 표시됩니다.
                  </p>
                  <p className="text-[11px] text-slate-600">
                    (공정한 기록 보존을 위해 발화 내용이 면접관 화면에 안전하게 전사됩니다.)
                  </p>
                </div>
              )}

              {transcript.map((msg, idx) => {
                const isCandidate = msg.speaker === 'candidate';
                return (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col space-y-1 animate-fade-in ${
                      isCandidate ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                      <span className={`font-bold ${isCandidate ? 'text-blue-400' : 'text-amber-400'}`}>
                        {isCandidate ? `${candidate.name} (본인)` : '면접관 질문'}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-500">{msg.timestamp}</span>
                      <TTSPlayButton text={msg.text} size="sm" />
                    </div>

                    <div
                      className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                        isCandidate
                          ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                          : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}

              {/* Interim Realtime Speech Bubble */}
              {interimText && (
                <div className="flex flex-col items-end space-y-1 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 px-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>실시간 음성 인식 중...</span>
                  </div>
                  <div className="max-w-[88%] p-3.5 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 text-xs rounded-tr-none font-medium italic animate-pulse">
                    {interimText}
                  </div>
                </div>
              )}

              <div ref={transcriptBottomRef} />
            </div>

            {/* Manual Speech Text Input Bar (Fallback if mic is quiet or unsupported) */}
            <form onSubmit={handleManualSendSpeech} className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={manualSpeechText}
                onChange={(e) => setManualSpeechText(e.target.value)}
                placeholder="마이크 음성 자동 인식 외에 직접 답변 텍스트를 입력하여 전송할 수도 있습니다..."
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!manualSpeechText.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md"
              >
                <span>전송</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>

          {/* Quick Drawer: Emergency Inquiries to Interviewers */}
          {isChatOpen && (
            <div className="bg-slate-900/95 border border-blue-500/40 rounded-3xl p-4 shadow-2xl backdrop-blur-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <h4 className="font-bold text-xs text-white">면접관 전체 실시간 전달 / 문의 메시지</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  닫기
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
                {messages.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-2">
                    면접관에게 전달할 긴급 메시지(화면 공유 준비, 오디오 확인 요청 등)를 보낼 수 있습니다.
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMine = m.senderType === 'candidate';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col space-y-0.5 ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] text-slate-400">
                          {isMine ? '지원자 (본인)' : 'SmartLab 면접관'} • {m.timestamp}
                        </span>
                        <div
                          className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                            isMine
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="면접관 팀 전체에게 전달할 메시지 입력..."
                  className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={isSendingChat || !chatInput.trim()}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>전송</span>
                </button>
              </form>
            </div>
          )}

        </div>

      </main>

      {/* Completion Modal if Interview is Marked as Completed by Interviewers */}
      {isInterviewCompleted && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">
                면접이 모두 완료되었습니다!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {candidate.name} 지원자님, 수고 많으셨습니다.<br />
                제출하신 서류 및 발화 기록은 안전하게 보존되며, 결과는 추후 공지될 예정입니다.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onExit}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                포털 홈으로 이동하기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
