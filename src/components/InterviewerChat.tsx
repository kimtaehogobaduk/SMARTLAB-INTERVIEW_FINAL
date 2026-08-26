import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InterviewerChatMessage, InterviewerPresence, TailQuestion } from '../types';
import {
  MessageSquare,
  Send,
  X,
  Sparkles,
  Users,
  AlertCircle,
  Volume2,
  VolumeX,
  Trash2,
  Maximize2,
  LayoutGrid,
  GripHorizontal,
  EyeOff,
  Star,
  Copy,
  Check,
  Eye,
  Sliders,
  Target
} from 'lucide-react';
import { formatInterviewerDisplayName } from './ObserverDashboard';
import { QuestionDetailModal } from './QuestionDetailModal';

interface InterviewerChatProps {
  currentUser: { id: string; name: string; role: string };
  roomId?: string;
  roomName?: string;
  candidateId?: string;
  candidateName?: string;
  presences?: InterviewerPresence[];
  isOpen: boolean;
  onClose: () => void;
  isFloating?: boolean;
  onToggleFloating?: () => void;
  onDisableFloating?: () => void;
  onUnreadCountChange?: (count: number) => void;
  onNewMessageToast?: (msg: InterviewerChatMessage) => void;
}

const QUICK_PHRASES = [
  '질문 끝나셨나요? 다음 질문 제가 진행하겠습니다.',
  '서류 기재 내용과 실제 답변이 상이한 것 같습니다 (검증 필요)',
  '기술 구현 깊이 관련 꼬리질문 한번 더 부탁드립니다.',
  '면접 시간 5분 남았습니다. 마무리 단계 준비해주세요.',
  '답변 논리가 탄탄하고 인상적입니다 👍',
  '동의합니다. 다음 평가 항목으로 넘어가시죠.'
];

export const InterviewerChat: React.FC<InterviewerChatProps> = ({
  currentUser,
  roomId,
  roomName,
  candidateId,
  candidateName,
  presences = [],
  isOpen,
  onClose,
  isFloating = false,
  onToggleFloating,
  onDisableFloating,
  onUnreadCountChange,
  onNewMessageToast
}) => {
  const [messages, setMessages] = useState<InterviewerChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [copiedQuestionId, setCopiedQuestionId] = useState<string | null>(null);
  const [selectedQuestionForDetail, setSelectedQuestionForDetail] = useState<TailQuestion | null>(null);

  const handleCopySharedQuestion = (q: TailQuestion) => {
    navigator.clipboard.writeText(q.question);
    setCopiedQuestionId(q.id);
    setTimeout(() => setCopiedQuestionId(null), 2000);
  };

  // Draggable Floating Position State
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number }>({
    startX: 0,
    startY: 0,
    initPosX: 0,
    initPosY: 0
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);
  const isFirstLoadRef = useRef<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize position when floating opens for the first time
  useEffect(() => {
    if (isFloating && !position) {
      const defaultWidth = 384; // w-96
      const defaultHeight = 580;
      const initialX = Math.max(16, window.innerWidth - defaultWidth - 24);
      const initialY = Math.max(70, window.innerHeight - defaultHeight - 24);
      setPosition({ x: initialX, y: initialY });
    }
  }, [isFloating, position]);

  // Drag handlers
  const handleMouseDownHeader = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag when floating and not clicking interactive buttons
    if (!isFloating) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);

    const currentX = position?.x ?? Math.max(16, window.innerWidth - 400);
    const currentY = position?.y ?? Math.max(70, window.innerHeight - 600);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: currentX,
      initPosY: currentY
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      const containerWidth = 384;
      const containerHeight = 580;
      const maxX = Math.max(0, window.innerWidth - containerWidth - 10);
      const maxY = Math.max(0, window.innerHeight - containerHeight - 10);

      const nextX = Math.min(maxX, Math.max(10, dragStartRef.current.initPosX + deltaX));
      const nextY = Math.min(maxY, Math.max(10, dragStartRef.current.initPosY + deltaY));

      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Play subtle chime on new message from others
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioContextRef.current = new AudioCtx();
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (audioContextRef.current) {
        const ctx = audioContextRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // Audio playback might be restricted without user interaction
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const url = candidateId
        ? `/api/chat/messages?candidateId=${encodeURIComponent(candidateId)}`
        : `/api/chat/messages?roomId=${encodeURIComponent(roomId || '')}`;

      const res = await fetch(url);
      if (res.ok) {
        const data: InterviewerChatMessage[] = await res.json();
        setMessages(() => {
          // Check if there are new messages not sent by current user
          if (data.length > lastMessageCountRef.current && !isFirstLoadRef.current) {
            const latestMsg = data[data.length - 1];
            if (latestMsg && latestMsg.senderId !== currentUser.id) {
              playNotificationSound();
              onNewMessageToast?.(latestMsg);
              if (!isOpen) {
                setUnreadCount((c) => {
                  const newCount = c + (data.length - lastMessageCountRef.current);
                  onUnreadCountChange?.(newCount);
                  return newCount;
                });
              }
            }
          }
          isFirstLoadRef.current = false;
          lastMessageCountRef.current = data.length;
          return data;
        });
      }
    } catch (e) {
      console.error('Chat fetch error:', e);
    }
  };

  // Polling loop
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 1500);
    return () => clearInterval(interval);
  }, [roomId, candidateId, isOpen]);

  // Reset unread count when opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      onUnreadCountChange?.(0);
    }
  }, [isOpen]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent, customContent?: string) => {
    if (e) e.preventDefault();
    const text = (customContent || inputText).trim();
    if (!text || isSending) return;

    const messageToSend = text;
    if (!customContent) setInputText('');

    setIsSending(true);

    const myName = formatInterviewerDisplayName(currentUser.name);

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: InterviewerChatMessage = {
      id: tempId,
      roomId: roomId || '',
      roomName: roomName || '',
      candidateId: candidateId || '',
      candidateName: candidateName || '',
      senderId: currentUser.id,
      senderName: myName,
      senderRole: currentUser.role,
      message: messageToSend,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      createdAt: Date.now(),
      isImportant
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setIsImportant(false);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          roomName,
          candidateId,
          candidateName,
          senderId: currentUser.id,
          senderName: myName,
          senderRole: currentUser.role,
          message: messageToSend,
          isImportant
        })
      });

      if (res.ok) {
        const result = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === tempId ? result.message : m)));
      }
    } catch (e) {
      console.error('Failed to send chat message:', e);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('현재 방의 면접관 대화 기록을 모두 비우시겠습니까?')) return;
    try {
      const url = candidateId
        ? `/api/chat/messages?candidateId=${encodeURIComponent(candidateId)}`
        : `/api/chat/messages?roomId=${encodeURIComponent(roomId || '')}`;
      await fetch(url, { method: 'DELETE' });
      setMessages([]);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  // Filter online interviewers
  const activeInterviewers = presences.filter((p) => p.mode !== 'left');

  return (
    <div
      ref={chatContainerRef}
      style={
        isFloating && position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              bottom: 'auto',
              right: 'auto'
            }
          : undefined
      }
      className={
        isFloating
          ? `fixed z-90 w-96 max-w-[calc(100vw-24px)] h-[580px] bg-white rounded-3xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-fade-in ${
              isDragging ? 'select-none shadow-indigo-500/20 ring-2 ring-indigo-500/50' : ''
            }`
          : 'h-full w-full bg-white flex flex-col overflow-hidden border-l border-slate-200 shadow-lg'
      }
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDownHeader}
        className={`px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shadow-md shrink-0 ${
          isFloating ? 'cursor-grab active:cursor-grabbing select-none' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/50 border border-indigo-400/40 flex items-center justify-center text-indigo-200 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white truncate">면접관 실시간 대화방</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            </div>
            <p className="text-[10px] text-indigo-200/80 truncate">
              {candidateName ? `${candidateName} 지원자 면접관 전용` : '동료 면접관 소통 채널'}
            </p>
          </div>
        </div>

        {/* Header Drag Indicator for Floating Mode */}
        {isFloating && (
          <div className="hidden sm:flex items-center justify-center text-indigo-300/60 px-1" title="드래그하여 원하는 위치로 이동">
            <GripHorizontal className="w-4 h-4" />
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {/* Dock / Undock (Grid Panel vs Floating Popout) */}
          {onToggleFloating && (
            <button
              type="button"
              onClick={onToggleFloating}
              className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={isFloating ? '화면 분할 패널로 배치' : '플로팅 창으로 분리'}
            >
              {isFloating ? <LayoutGrid className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              soundEnabled
                ? 'text-indigo-200 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? '알림음 켜짐' : '알림음 꺼짐'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Disable / Hide Floating Tab Button (선택적으로 플로팅 탭 없애기) */}
          {isFloating && onDisableFloating && (
            <button
              type="button"
              onClick={onDisableFloating}
              className="p-1.5 text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer"
              title="플로팅 탭 숨기기 (상단 바에서만 열기)"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          )}

          {/* Clear Messages */}
          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 text-slate-400 hover:text-rose-300 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="대화 비우기"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Online Interviewers Presence Banner */}
      <div className="px-3 py-2 bg-indigo-50/70 border-b border-indigo-100/60 flex items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span>참여 중인 면접관 ({activeInterviewers.length}명)</span>
        </div>

        <div className="flex items-center gap-1 flex-wrap justify-end">
          {activeInterviewers.length > 0 ? (
            activeInterviewers.map((p) => {
              const name = formatInterviewerDisplayName(p.interviewerName);
              const isMe = p.interviewerId === currentUser.id;
              return (
                <span
                  key={p.interviewerId}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isMe
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{name}{isMe ? ' (나)' : ''}</span>
                </span>
              );
            })
          ) : (
            <span className="text-[10px] text-slate-400">대기 중</span>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-600">아직 나눈 대화가 없습니다.</p>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-[240px]">
              동료 면접관들과 질문 순서, 팩트체크, 점수 조율 등을 실시간으로 의논해보세요.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUser.id;
            const senderCleanName = formatInterviewerDisplayName(m.senderName);

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 animate-fade-in`}
              >
                {/* Sender Name & Timestamp */}
                <div className="flex items-center gap-1.5 px-1">
                  {!isMe && (
                    <span className="text-[11px] font-bold text-slate-700">
                      {senderCleanName}
                    </span>
                  )}
                  {m.isImportant && (
                    <span className="text-[9px] font-extrabold bg-rose-500 text-white px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-white" />
                      <span>중요</span>
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">{m.timestamp}</span>
                </div>

                {/* Message Bubble */}
                {m.sharedQuestion ? (
                  <div
                    className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm border ${
                      isMe
                        ? 'bg-gradient-to-br from-indigo-950 to-slate-900 border-indigo-500/40 text-slate-100 rounded-tr-xs'
                        : 'bg-gradient-to-br from-slate-900 to-indigo-950/60 border-indigo-400/30 text-slate-100 rounded-tl-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-indigo-500/20">
                      <span className="text-[10px] font-black text-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>면접관 추천 질문 공유</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                        {m.sharedQuestion.category || '맞춤 질문'}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-white mb-2 leading-snug">
                      "{m.sharedQuestion.question}"
                    </p>

                    {(m.sharedQuestion.intent || m.sharedQuestion.verificationPoint) && (
                      <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-xl border border-slate-800 mb-2.5">
                        <strong className="text-indigo-300">평가 의도:</strong> {m.sharedQuestion.intent || m.sharedQuestion.verificationPoint}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedQuestionForDetail(m.sharedQuestion!)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                      >
                        <Eye className="w-3 h-3 text-indigo-400" />
                        <span>평가 항목 상세</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopySharedQuestion(m.sharedQuestion!)}
                        className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        {copiedQuestionId === m.sharedQuestion.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-300" />
                            <span>복사됨!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>질문 복사</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs break-words ${
                      isMe
                        ? m.isImportant
                          ? 'bg-rose-600 text-white rounded-tr-xs font-medium'
                          : 'bg-indigo-600 text-white rounded-tr-xs'
                        : m.isImportant
                        ? 'bg-rose-50 text-rose-950 border border-rose-200 rounded-tl-xs font-medium'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    {m.message}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Phrase Chips */}
      <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto shrink-0 flex items-center gap-1.5 no-scrollbar">
        <span className="text-[10px] font-bold text-slate-400 shrink-0 flex items-center gap-0.5">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          빠른 전송:
        </span>
        {QUICK_PHRASES.map((phrase, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(undefined, phrase)}
            className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[11px] font-medium transition-colors cursor-pointer border border-slate-200/60 shrink-0"
          >
            {phrase}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2"
      >
        <div className="flex items-center justify-between text-[11px]">
          <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isImportant}
              onChange={(e) => setIsImportant(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
            />
            <span className={isImportant ? 'font-bold text-rose-600' : 'text-slate-500'}>
              🚨 중요 / 긴급 알림으로 전송
            </span>
          </label>

          <span className="text-[10px] text-slate-400">Enter로 즉시 전송</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="동료 면접관에게 보낼 메시지 입력..."
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <span>전송</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Detail Modal for Shared Questions clicked from chat */}
      {selectedQuestionForDetail && (
        <QuestionDetailModal
          question={selectedQuestionForDetail}
          onClose={() => setSelectedQuestionForDetail(null)}
        />
      )}
    </div>
  );
};
