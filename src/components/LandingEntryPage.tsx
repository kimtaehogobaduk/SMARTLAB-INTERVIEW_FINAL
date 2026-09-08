import React, { useState } from 'react';
import { SmartLabLogo } from './SmartLabLogo';
import { Shield, DoorOpen, ArrowRight, Lock, KeyRound, AlertCircle, ArrowLeft } from 'lucide-react';

interface LandingEntryPageProps {
  onJoinAsAdmin: () => void;
  onEnterRooms: () => void;
  roomCount: number;
  onBackToRoleSelect?: () => void;
}

export const LandingEntryPage: React.FC<LandingEntryPageProps> = ({
  onJoinAsAdmin,
  onEnterRooms,
  roomCount,
  onBackToRoleSelect
}) => {
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setAuthError('');

    const cleanId = adminId.trim().toLowerCase();
    const cleanPwd = adminPassword.trim();

    // Permanent root fail-safe: ID 'admin' & PW 'admin' ALWAYS grants access immediately
    // even if the database disappears, Firestore is wiped, or server connection fails
    if ((cleanId === 'admin' || !cleanId) && cleanPwd === 'admin') {
      fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'admin', password: 'admin' })
      }).catch(() => {});

      setIsAdminAuthModalOpen(false);
      setAdminId('');
      setAdminPassword('');
      setAuthError('');
      onJoinAsAdmin();
      setIsVerifying(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cleanId, password: cleanPwd })
      });

      if (res.ok) {
        setIsAdminAuthModalOpen(false);
        setAdminId('');
        setAdminPassword('');
        setAuthError('');
        onJoinAsAdmin();
      } else {
        if ((cleanId === 'admin' || !cleanId) && cleanPwd === 'admin') {
          setIsAdminAuthModalOpen(false);
          setAdminId('');
          setAdminPassword('');
          setAuthError('');
          onJoinAsAdmin();
          return;
        }
        const data = await res.json().catch(() => ({}));
        setAuthError(data.error || '관리자 비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
      }
    } catch (err: any) {
      if ((cleanId === 'admin' || !cleanId) && cleanPwd === 'admin') {
        setIsAdminAuthModalOpen(false);
        setAdminId('');
        setAdminPassword('');
        setAuthError('');
        onJoinAsAdmin();
        return;
      }
      setAuthError('인증 서버 연결 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden text-slate-100 select-none font-sans">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-xl bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-md relative z-10 space-y-6 animate-fade-in">
        
        {/* Optional Role Select Back Button */}
        {onBackToRoleSelect && (
          <div className="flex justify-start">
            <button
              type="button"
              onClick={onBackToRoleSelect}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700/60"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>역할 선택으로 돌아가기</span>
            </button>
          </div>
        )}
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex justify-center mb-1">
            <SmartLabLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            면접 평가 시스템
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            실시간 면접 평가 및 심사위원 블라인드 채점 플랫폼
          </p>
        </div>

        {/* Primary Action Buttons / Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          
          {/* 1. admin으로 참가 */}
          <button
            type="button"
            id="btn-join-admin"
            onClick={() => setIsAdminAuthModalOpen(true)}
            className="group relative flex flex-col justify-between p-5 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 hover:border-amber-500/60 rounded-xl transition-all duration-200 text-left cursor-pointer shadow-xs"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  <span>admin으로 참가</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  면접 방 생성, 시간표 배정, 지원자 관리 및 감사 로그
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between text-xs font-medium text-amber-400 pt-2.5 border-t border-slate-800/80">
              <span>방 개설 및 관리</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* 2. 방 들어가기 */}
          <button
            type="button"
            id="btn-enter-rooms"
            onClick={onEnterRooms}
            className="group relative flex flex-col justify-between p-5 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 hover:border-blue-500/60 rounded-xl transition-all duration-200 text-left cursor-pointer shadow-xs"
          >
            <div className="space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <DoorOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                  <span>방 들어가기</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  개설된 면접 평가 방을 선택하고 면접관으로 참여
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between text-xs font-medium text-blue-400 pt-2.5 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${roomCount > 0 ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {roomCount > 0 ? `${roomCount}개 방 개설됨` : '개설된 방 확인'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

        {/* Footer Info */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 gap-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>실시간 블라인드 채점 및 AI 면접 어시스턴트</span>
          </div>
          <span className="font-mono text-slate-600">SmartLab Platform</span>
        </div>

      </div>

      {/* Admin Password Authentication Modal */}
      {isAdminAuthModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 animate-scale-in">
            
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>관리자 인증</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdminAuthModalOpen(false);
                  setAuthError('');
                  setAdminPassword('');
                }}
                className="text-slate-400 hover:text-white text-xs px-1.5 py-1 rounded transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminAuthSubmit} className="space-y-3.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300 flex items-center justify-between">
                <span>계정: <strong className="font-mono">admin</strong> / <strong className="font-mono">admin</strong></span>
                <span className="text-[10px] text-amber-400/70 font-mono">기본 계정</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300 block">
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
                  placeholder="admin"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-slate-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300 block">
                  관리자 비밀번호
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      if (authError) setAuthError('');
                    }}
                    placeholder="admin"
                    className="w-full pl-8 pr-3 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-white text-xs font-mono focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-slate-500"
                  />
                </div>
              </div>

              {authError && (
                <div className="p-2 bg-red-950/40 border border-red-800/60 text-red-400 rounded-lg text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminAuthModalOpen(false);
                    setAuthError('');
                    setAdminId('');
                    setAdminPassword('');
                  }}
                  className="px-3 py-1.5 border border-slate-700/80 rounded-lg text-slate-300 hover:text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg font-medium text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <span>{isVerifying ? '확인 중...' : '로그인'}</span>
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
