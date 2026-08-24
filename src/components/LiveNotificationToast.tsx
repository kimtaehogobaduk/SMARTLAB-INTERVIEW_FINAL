import React, { useEffect, useState } from 'react';
import { LiveNotification } from '../types';
import { Play, Bell, ChevronRight, X, Sparkles, Volume2 } from 'lucide-react';

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
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-9999 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none">
      {notifications.map((n) => {
        const isCurrentCandidate = currentCandidateId === n.candidateId;
        const isMe = currentUserId && n.operatorId === currentUserId;

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
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {n.message}
                  </p>
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
                {isCurrentCandidate ? '이미 이 지원자 방에 참여 중입니다.' : '동료 면접관과 함께 실시간 평가에 참여하세요.'}
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
