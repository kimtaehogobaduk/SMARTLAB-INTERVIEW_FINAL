import React, { useState } from 'react';
import { SmartLabLogo } from './SmartLabLogo';
import { Shield, DoorOpen, ArrowRight, Lock, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

interface LandingEntryPageProps {
  onJoinAsAdmin: () => void;
  onEnterRooms: () => void;
  roomCount: number;
}

export const LandingEntryPage: React.FC<LandingEntryPageProps> = ({
  onJoinAsAdmin,
  onEnterRooms,
  roomCount
}) => {
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((adminId.trim() === 'admin' || !adminId.trim()) && adminPassword.trim() === 'admin') {
      setIsAdminAuthModalOpen(false);
      setAdminId('');
      setAdminPassword('');
      setAuthError('');
      onJoinAsAdmin();
    } else {
      setAuthError('관리자 인증에 실패했습니다. 아이디 및 비밀번호를 확인해주세요.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden text-slate-100 select-none font-sans">
      {/* Background Ambience / Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-slate-900/40 rounded-full blur-2xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-8 sm:p-10 backdrop-blur-xl relative z-10 space-y-8 animate-fade-in">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex justify-center mb-2">
            <SmartLabLogo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            SmartLab 면접 평가 시스템
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            동아리 실시간 AI 면접 평가 및 심사위원 블라인드 채점 플랫폼
          </p>
        </div>

        {/* Primary Action Buttons / Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          {/* 1. admin으로 참가 */}
          <button
            type="button"
            id="btn-join-admin"
            onClick={() => setIsAdminAuthModalOpen(true)}
            className="group relative flex flex-col justify-between p-6 bg-slate-800/80 hover:bg-slate-800 border-2 border-slate-700/80 hover:border-amber-500/80 rounded-2xl transition-all duration-200 text-left cursor-pointer shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  <span>admin으로 참가</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  면접 방 생성, 시간표 배정, 지원자 관리 및 감사 로그
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-bold text-amber-400 pt-3 border-t border-slate-700/60">
              <span>방 개설 및 관리</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* 2. 방 들어가기 */}
          <button
            type="button"
            id="btn-enter-rooms"
            onClick={onEnterRooms}
            className="group relative flex flex-col justify-between p-6 bg-blue-950/40 hover:bg-blue-950/70 border-2 border-blue-800/60 hover:border-blue-500 rounded-2xl transition-all duration-200 text-left cursor-pointer shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <DoorOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                  <span>방 들어가기</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  개설된 면접 평가 방을 선택하고 면접관으로 참여
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-bold text-blue-400 pt-3 border-t border-blue-900/60">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${roomCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {roomCount > 0 ? `${roomCount}개 방 개설됨` : '개설된 방 확인'}
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

        {/* Footer Info */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 gap-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>3인 블라인드 실시간 채점 및 AI 꼬리질문 어시스턴트</span>
          </div>
          <span className="font-mono text-slate-600">SmartLab v2.5</span>
        </div>

      </div>

      {/* Admin Password Authentication Modal */}
      {isAdminAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 animate-scale-in">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>관리자(Admin) 인증</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdminAuthModalOpen(false);
                  setAuthError('');
                  setAdminPassword('');
                }}
                className="text-slate-400 hover:text-white text-xs px-1.5 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  관리자 ID
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={adminId}
                  onChange={(e) => {
                    setAdminId(e.target.value);
                    if (authError) setAuthError('');
                  }}
                  placeholder="관리자 계정 ID 입력"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 placeholder-slate-500 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  관리자 비밀번호
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      if (authError) setAuthError('');
                    }}
                    placeholder="비밀번호 입력"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500 placeholder-slate-500"
                  />
                </div>
              </div>

              {authError && (
                <div className="p-2.5 bg-red-950/60 border border-red-800 text-red-400 rounded-xl text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminAuthModalOpen(false);
                    setAuthError('');
                    setAdminId('');
                    setAdminPassword('');
                  }}
                  className="px-3.5 py-2 border border-slate-700 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <span>관리자 로그인</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
