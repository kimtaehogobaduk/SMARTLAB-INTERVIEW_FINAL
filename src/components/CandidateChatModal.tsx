import React, { useState, useEffect, useRef } from 'react';
import { Candidate, InterviewRoomItem, CandidateChatMessage, InterviewerUser } from '../types';
import { MessageSquare, Send, X, Shield, User, Clock, CheckCheck, Sparkles } from 'lucide-react';

interface CandidateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  room?: InterviewRoomItem;
  currentUser: InterviewerUser;
}

export const CandidateChatModal: React.FC<CandidateChatModalProps> = ({
  isOpen,
  onClose,
  candidate,
  room,
  currentUser
}) => {
  const [messages, setMessages] = useState<CandidateChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Fetch messages for this candidate
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/candidate-portal/messages?candidateId=${candidate.id}&roomId=${candidate.roomId || room?.id || ''}`);
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

  useEffect(() => {
    if (isOpen && candidate) {
      setIsLoading(true);
      fetchMessages().finally(() => setIsLoading(false));
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, candidate.id]);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/candidate-portal/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate.id,
          roomId: candidate.roomId || room?.id || '',
          studentId: candidate.studentId,
          candidateName: candidate.name,
          senderType: 'interviewer',
          senderName: currentUser.name || 'SmartLab 면접관',
          senderInterviewerId: currentUser.id,
          text: textToSend
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.messages) {
          setMessages(data.messages);
        } else if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
      }
    } catch (e) {
      console.error('Send interviewer message error:', e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col h-[650px] animate-scale-in text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">'{candidate.name}' 지원자 실시간 대화함</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  학번: {candidate.studentId}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>모든 면접관 공유 대화 | 지원자 화면에는 'SmartLab 면접관'으로 통합 발신</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Notice */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>발신자: <strong className="text-amber-300">{currentUser.name}</strong> (작성자 기록 보존)</span>
          <span className="text-slate-500">메시지 {messages.length}건</span>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/40 scrollbar-thin">
          {isLoading && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              대화 내역을 불러오는 중입니다...
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-700" />
              <div className="text-xs font-bold text-slate-400">아직 주고받은 메시지가 없습니다.</div>
              <div className="text-[11px] text-slate-500 max-w-sm">
                지원자에게 면접 준비 안내, 시간 조율, 추가 서류 보완 요청 메시지를 전송해보세요.
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isCandidate = msg.senderType === 'candidate';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isCandidate ? 'items-start' : 'items-end'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1 font-semibold">
                    {isCandidate ? (
                      <span className="text-blue-300 font-bold flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-400" />
                        <span>{candidate.name} (지원자)</span>
                      </span>
                    ) : (
                      <span className="text-amber-300 font-bold flex items-center gap-1">
                        <Shield className="w-3 h-3 text-amber-400" />
                        <span>{msg.senderName || '면접관'}</span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      isCandidate
                        ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                        : 'bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-600/20'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`'${candidate.name}' 지원자에게 보낼 메시지 입력...`}
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
