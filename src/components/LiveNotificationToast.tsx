import React, { useEffect, useState } from 'react';
import { LiveNotification } from '../types';
import {
  Play,
  Bell,
  ChevronRight,
  X,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  Clock,
  UserCheck,
  Zap,
  HandMetal
} from 'lucide-react';
import { formatInterviewerDisplayName } from './ObserverDashboard';

interface LiveNotificationToastProps {
  notifications: LiveNotification[];
  currentCandidateId?: string;
  currentUserId?: string;
  onNavigateToInterview: (roomId?: string, candidateId?: string) => void;
  onDismiss: (id: string) => void;
}

export const LiveNotificationToast: React.FC<LiveNotificationToastProps> = ({
  notifications,
  currentCandidateId,
  currentUserId,
  onNavigateToInterview,
  onDismiss
}) => {
  // Auto-dismiss 4-second action alerts
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    notifications.forEach((n) => {
      const isAction =
        n.type === 'INTERVIEWER_ACTION' ||
        n.type === 'QUESTION_INTENT' ||
        n.type === 'SUSPICION_ALERT' ||
        n.type === 'TAIL_QUESTION_REQUEST' ||
        n.type === 'TIME_ALERT' ||
        n.type === 'YIELD_FLOOR' ||
        !!n.actionType;

      if (isAction) {
        // Calculate remaining ms (4 seconds total duration)
        const elapsed = Date.now() - n.createdAt;
        const remaining = Math.max(200, 4000 - elapsed);
        const timer = setTimeout(() => {
          onDismiss(n.id);
        }, remaining);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [notifications, onDismiss]);

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-9999 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none">
      {notifications.map((n) => {
        const isCurrentCandidate = currentCandidateId === n.candidateId;
        const isAction =
          n.type === 'INTERVIEWER_ACTION' ||
          n.type === 'QUESTION_INTENT' ||
          n.type === 'SUSPICION_ALERT' ||
          n.type === 'TAIL_QUESTION_REQUEST' ||
          n.type === 'TIME_ALERT' ||
          n.type === 'YIELD_FLOOR' ||
          !!n.actionType;

        const isQuestion = n.type === 'QUESTION_INTENT' || n.actionType === 'question';
        const isSuspicion = n.type === 'SUSPICION_ALERT' || n.actionType === 'suspicion';
        const isTailQ = n.type === 'TAIL_QUESTION_REQUEST' || n.actionType === 'tail_question';
        const isYield = n.type === 'YIELD_FLOOR' || n.actionType === 'yield';
        const isTime = n.type === 'TIME_ALERT' || n.actionType === 'time_check';

        const operatorName = formatInterviewerDisplayName(n.operatorName || '면접관');

        // Action Notification UI (Floating 4s Signal Toast)
        if (isAction) {
          return (
            <div
              key={n.id}
              className={`pointer-events-auto rounded-2xl p-4 shadow-2xl transition-all border relative overflow-hidden backdrop-blur-md animate-bounce-short ${
                isQuestion
                  ? 'bg-slate-900/95 border-indigo-500/80 text-white ring-2 ring-indigo-500/30'
                  : isSuspicion
                  ? 'bg-slate-900/95 border-rose-500/80 text-white ring-2 ring-rose-500/30'
                  : isTailQ
                  ? 'bg-slate-900/95 border-amber-500/80 text-white'
                  : 'bg-slate-900/95 border-slate-700 text-white'
              }`}
              role="alert"
            >
              {/* 4-Second Shrinking Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
                <div
                  className={`h-full animate-toast-shrink ${
                    isQuestion ? 'bg-indigo-400' : isSuspicion ? 'bg-rose-400' : 'bg-amber-400'
                  }`}
                  style={{ animationDuration: '4s' }}
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Action Icon Badge */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-md ${
                      isQuestion
                        ? 'bg-indigo-600 text-white animate-pulse'
                        : isSuspicion
                        ? 'bg-rose-600 text-white animate-bounce'
                        : isTailQ
                        ? 'bg-amber-600 text-white'
                        : isYield
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {isQuestion ? (
                      <Zap className="w-5 h-5 fill-white" />
                    ) : isSuspicion ? (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    ) : isTailQ ? (
                      <Lightbulb className="w-5 h-5 text-white" />
                    ) : isYield ? (
                      <UserCheck className="w-5 h-5 text-white" />
                    ) : (
                      <Clock className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isQuestion
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                            : isSuspicion
                            ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                        }`}
                      >
                        {isQuestion
                          ? '🙋 질문 신호'
                          : isSuspicion
                          ? '🔍 의심 / 팩트체크 신호'
                          : isTailQ
                          ? '💡 꼬리질문 제안'
                          : isYield
                          ? '🤝 순서 양보'
                          : '⏱️ 시간 체크'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">4초간 표시</span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug flex items-center gap-1.5 flex-wrap">
                      {n.operatorLeadershipRole === 'CAPTAIN' && (
                        <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-amber-500 text-slate-950 shadow-xs inline-flex items-center gap-0.5">
                          👑 기장
                        </span>
                      )}
                      {n.operatorLeadershipRole === 'VICE_CAPTAIN' && (
                        <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-purple-600 text-white shadow-xs inline-flex items-center gap-0.5">
                          ⭐ 부기장
                        </span>
                      )}
                      <span>
                        {isQuestion
                          ? `${operatorName} 면접관이 먼저 질문합니다`
                          : isSuspicion
                          ? `${operatorName} 면접관이 의심/팩트체크 신호를 보냈습니다`
                          : n.title}
                      </span>
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                  </div>
                </div>

                <button
                  onClick={() => onDismiss(n.id)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                  title="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        }

        // Standard Interview Start / General Toast
        return (
          <div
            key={n.id}
            className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white border border-blue-500/40 rounded-2xl p-4 shadow-2xl transition-all animate-bounce-short hover:border-blue-400"
            role="alert"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                  <Play className="w-5 h-5 fill-blue-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                      실시간 면접 시작 알림
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <span>{n.title}</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                  {n.roomName && (
                    <div className="text-[11px] text-slate-400">
                      📍 면접실: <strong className="text-slate-200">{n.roomName}</strong>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => onDismiss(n.id)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Button to jump into interview room */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                {isCurrentCandidate
                  ? '이미 이 지원자 방에 참여 중입니다.'
                  : '동료 면접관과 함께 실시간 평가에 참여하세요.'}
              </span>

              <button
                onClick={() => {
                  onNavigateToInterview(n.roomId, n.candidateId);
                  onDismiss(n.id);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-transform active:scale-95 shrink-0"
              >
                <span>면접실 즉시 입장</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
