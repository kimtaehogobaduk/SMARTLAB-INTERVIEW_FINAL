import React, { useState, useEffect } from 'react';
import { SmartLabLogo } from './SmartLabLogo';
import { GraduationCap, ShieldCheck, ArrowRight, Clock, FileText, BellRing, Bell, MessageSquareText, Sparkles, CheckCircle2 } from 'lucide-react';
import { ThemeQuickToggle } from './ThemeQuickToggle';

interface RoleSelectLandingPageProps {
  onSelectCandidateMode: () => void;
  onSelectInterviewerMode: () => void;
  roomsCount: number;
  lastCandidateSession?: {
    roomId: string;
    studentId: string;
    name: string;
  } | null;
  onResumeCandidateSession?: (session: { roomId: string; studentId: string; name: string }) => void;
}

export const RoleSelectLandingPage: React.FC<RoleSelectLandingPageProps> = ({
  onSelectCandidateMode,
  onSelectInterviewerMode,
  roomsCount,
  lastCandidateSession,
  onResumeCandidateSession
}) => {
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission>('default');

  // Immediately request browser notification permission at the very start
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPerm(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          setNotificationPerm(perm);
        }).catch(() => {});
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPerm(perm);
        if (perm === 'granted') {
          new Notification('SmartLab 면접 알림 허용 완료', {
            body: '면접 일정 10분 전 알림과 실시간 메시지 알림을 받으실 수 있습니다.',
            icon: '/favicon.ico'
          });
        }
      } catch (e) {
        // Ignore
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden text-slate-100 font-sans select-none">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-md relative z-10 space-y-6 animate-fade-in">
        
        {/* Top Control Bar with Theme Selector */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/70">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400 font-mono tracking-wide">SmartLab Platform</span>
          </div>
          <ThemeQuickToggle variant="header" />
        </div>

        {/* Notification Permission Prompt */}
        {notificationPerm !== 'granted' && typeof window !== 'undefined' && 'Notification' in window && (
          <div className="px-3.5 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <BellRing className="w-3.5 h-3.5" />
              </div>
              <span className="text-slate-300 text-xs font-normal">
                면접 10분 전 알림과 실시간 공지를 받으시려면 브라우저 알림을 켜주세요.
              </span>
            </div>
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium rounded-lg text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <Bell className="w-3 h-3" />
              <span>알림 켜기</span>
            </button>
          </div>
        )}

        {/* Header Branding */}
        <div className="text-center space-y-1.5 pt-1">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('replay_smartlab_intro'))}
            className="inline-flex justify-center hover:opacity-90 transition-opacity cursor-pointer"
            title="오프닝 인트로 감상"
          >
            <SmartLabLogo size="lg" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            접속하실 역할을 선택해주세요
          </h1>
        </div>

        {/* Quick Resume for Recent Candidate */}
        {lastCandidateSession && onResumeCandidateSession && (
          <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl flex items-center justify-between gap-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-white">최근 지원자: {lastCandidateSession.name} ({lastCandidateSession.studentId})</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onResumeCandidateSession(lastCandidateSession)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1"
            >
              <span>이어서 입장</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dual Role Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. Candidate (Student) Role Card */}
          <div
            onClick={onSelectCandidateMode}
            className="group relative p-6 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 hover:border-blue-500/60 transition-all duration-200 cursor-pointer shadow-xs flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  지원자 포털
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                  지원자 (학생)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  면접 일정 확인, 추가 서류 제출, 면접관 팀과의 실시간 소통
                </p>
              </div>

              {/* Feature Highlights for Candidate */}
              <div className="space-y-2 pt-2.5 border-t border-slate-800/80 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>내 면접 일정 확인 및 희망 시간대 조율</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>포트폴리오 및 추가 서류(PDF/링크) 제출</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquareText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>면접관 팀과 1:1 실시간 메시지 소통</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="w-full py-2 bg-blue-600 group-hover:bg-blue-500 text-white rounded-lg font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>지원자 화면 입장</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* 2. Interviewer / Admin Role Card */}
          <div
            onClick={onSelectInterviewerMode}
            className="group relative p-6 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 hover:border-amber-500/60 transition-all duration-200 cursor-pointer shadow-xs flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  면접관 & 관리자
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white group-hover:text-amber-400 transition-colors">
                  면접관 / 평가 관리자
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  블라인드 면접 채점, 서류 열람, AI 꼬리질문 추천, 관리자 제어
                </p>
              </div>

              {/* Feature Highlights for Interviewer */}
              <div className="space-y-2 pt-2.5 border-t border-slate-800/80 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>독립 블라인드 면접 평가 및 실시간 점수 집계</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>AI 실시간 음성인식(STT) 및 꼬리질문 제안</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>지원자 제출 서류 및 일정 실시간 확인</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="w-full py-2 bg-slate-800/80 group-hover:bg-amber-600 border border-slate-700/80 group-hover:border-transparent text-slate-200 group-hover:text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>면접관 / 관리자 입장</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-800/70 text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-3">
            <span>활성화된 면접 방: {roomsCount}개</span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('replay_smartlab_intro'))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>인트로 다시보기</span>
            </button>
          </div>
          <span className="font-mono text-[11px] text-slate-500">SmartLab Platform</span>
        </div>

      </div>
    </div>
  );
};
