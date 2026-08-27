import React, { useState, useEffect } from 'react';
import { SmartLabLogo } from './SmartLabLogo';
import { UserCheck, GraduationCap, ShieldCheck, ArrowRight, Clock, FileText, BellRing, Bell, MessageSquareText, Sparkles, CheckCircle2 } from 'lucide-react';
import { InterviewRoomItem } from '../types';

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
      {/* Dynamic Background Glows */}
      <div className="absolute -top-48 -left-48 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-10 backdrop-blur-xl relative z-10 space-y-8 animate-fade-in">
        
        {/* Notification Permission Prompt at the Very Start */}
        {notificationPerm !== 'granted' && typeof window !== 'undefined' && 'Notification' in window && (
          <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-blue-500/15 to-indigo-500/15 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-fade-in shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>면접 시작 10분 전 실시간 알림을 위한 권한 설정</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-semibold">필수 권장</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  원활한 면접 진행을 위해 브라우저 알림 권한을 허용해주세요.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestPermission}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>알림 권한 허용하기</span>
            </button>
          </div>
        )}

        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex justify-center mb-1 scale-110">
            <SmartLabLogo size="lg" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SmartLab 2026 통합 면접 평가 & 지원자 시스템</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            접속하실 역할을 선택해주세요
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            면접에 참여하는 <strong className="text-slate-200">지원자(학생)</strong>와 평가를 진행하는 <strong className="text-slate-200">면접관/관리자</strong> 전용 화면으로 분리되어 안전하고 공정하게 운영됩니다.
          </p>
        </div>

        {/* Quick Resume for Recent Candidate */}
        {lastCandidateSession && onResumeCandidateSession && (
          <div className="p-3.5 bg-blue-950/40 border border-blue-800/50 rounded-2xl flex items-center justify-between gap-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>최근 접속한 지원자: {lastCandidateSession.name} ({lastCandidateSession.studentId})</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-medium">자동 저장됨</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  클릭하시면 이전 제출 서류, 면접 일정, 메시지 화면으로 바로 이동합니다.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onResumeCandidateSession(lastCandidateSession)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer shrink-0 flex items-center gap-1"
            >
              <span>이어서 입장</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dual Role Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* 1. Candidate (Student) Role Card */}
          <div
            onClick={onSelectCandidateMode}
            className="group relative p-6 sm:p-7 rounded-3xl bg-slate-800/60 hover:bg-slate-800 border-2 border-slate-700/80 hover:border-blue-500 transition-all duration-200 cursor-pointer shadow-xl flex flex-col justify-between space-y-6 hover:shadow-blue-500/10 hover:-translate-y-0.5"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  <span>지원자 포털</span>
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                  <span>면접 보는 사람 (지원자/학생)</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  방 선택 후 학번과 이름을 입력하여 내 면접 일정을 조율하고, 추가 제출 서류(포트폴리오/과제/증빙)를 업로드하며 면접관 팀과 소통합니다.
                </p>
              </div>

              {/* Feature Highlights for Candidate */}
              <div className="space-y-2 pt-2 border-t border-slate-700/60">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>내 면접 일정 확인 및 희망 시간대 조율</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>포트폴리오, 이력서, 링크 등 추가 서류 제출</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <BellRing className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>면접 10분 전 자동 알림 및 실시간 카운트다운</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <MessageSquareText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>면접관 전체에게 1:1 실시간 메시지 전송</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="w-full py-3.5 bg-blue-600 group-hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
              >
                <span>지원자 화면으로 입장하기</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 2. Interviewer / Admin Role Card */}
          <div
            onClick={onSelectInterviewerMode}
            className="group relative p-6 sm:p-7 rounded-3xl bg-slate-800/60 hover:bg-slate-800 border-2 border-slate-700/80 hover:border-amber-500 transition-all duration-200 cursor-pointer shadow-xl flex flex-col justify-between space-y-6 hover:shadow-amber-500/10 hover:-translate-y-0.5"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>평가관 & 관리자</span>
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
                  <span>면접관 / 평가 관리자</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  개설된 면접 평가 방을 선택하고 면접관 슬롯으로 입장하여, 실시간 AI STT 전사, 꼬리질문 추천, 블라인드 점수 채점 및 관리자 콘솔을 제어합니다.
                </p>
              </div>

              {/* Feature Highlights for Interviewer */}
              <div className="space-y-2 pt-2 border-t border-slate-700/60">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>3인 독립 블라인드 평가 및 실시간 점수 집계</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>AI 실시간 음성인식(STT) & 다각도 꼬리질문 제안</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>지원자가 제출한 서류/일정 실시간 자동 동기화</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <MessageSquareText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>지원자와의 메시지 통합 열람 및 팀 답장 기능</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="w-full py-3.5 bg-slate-800 group-hover:bg-amber-600 border border-slate-700 group-hover:border-transparent text-slate-200 group-hover:text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>면접관 / 관리자 입장하기</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-500 gap-2">
          <span>개설된 면접 평가 방: {roomsCount}개 활성화</span>
          <span className="font-mono">SmartLab Interview Architecture v2.5</span>
        </div>

      </div>
    </div>
  );
};
