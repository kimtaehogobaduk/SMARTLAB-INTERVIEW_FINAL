import React, { useState } from 'react';
import { InterviewerUser, InterviewRoomInfo } from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { UserCheck, Shield, Sparkles, ArrowRight, Lock, KeyRound, ArrowLeft, DoorOpen } from 'lucide-react';

interface LoginPageProps {
  currentRoom: InterviewRoomInfo | null;
  onLogin: (user: InterviewerUser) => void;
  onBackToRooms: () => void;
  availableInterviewers: InterviewerUser[];
}

export const LoginPage: React.FC<LoginPageProps> = ({
  currentRoom,
  onLogin,
  onBackToRooms,
  availableInterviewers
}) => {
  const [selectedUser, setSelectedUser] = useState<InterviewerUser>(availableInterviewers[0]);
  const [customName, setCustomName] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCustomMode) {
      if (!customName.trim()) {
        alert('면접관 이름을 입력해주세요.');
        return;
      }
      onLogin({
        id: `interviewer-${Date.now().toString(36)}`,
        name: `${customName} 면접관`,
        role: 'interviewer'
      });
    } else {
      onLogin(selectedUser);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-100 select-none">
      {/* Subtle Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-md relative z-10 space-y-6 animate-fade-in">
        {/* Room Header & Back to Rooms */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            onClick={onBackToRooms}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>방 목록으로</span>
          </button>

          {currentRoom && (
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/50">
              <DoorOpen className="w-3.5 h-3.5" />
              <span className="truncate max-w-[170px]">{currentRoom.name}</span>
            </div>
          )}
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex justify-center mb-1">
            <SmartLabLogo size="md" />
          </div>
          <h3 className="text-sm font-bold text-white">면접관 프로필 선택</h3>
          <p className="text-xs text-slate-400">
            평가를 진행할 면접관 계정을 선택하고 세션에 입장하세요.
          </p>
        </div>

        {/* Panel Selection Form */}
        <form onSubmit={handleEnter} className="space-y-4 pt-1">
          <div className="space-y-2">
            {!isCustomMode ? (
              <div className="space-y-2">
                {availableInterviewers.map((user) => {
                  const isSelected = selectedUser.id === user.id;
                  return (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30 text-white shadow-md'
                          : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-2">
                            <span>{user.name}</span>
                            {user.role === 'admin' && (
                              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-mono font-normal">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {user.trackExpertise || 'SmartLab 면접 심사위원'}
                          </div>
                        </div>
                      </div>

                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="면접관 성함 입력 (예: 홍길동)"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-slate-400 hover:text-blue-400 transition-colors underline"
            >
              {isCustomMode ? '← 기본 면접관 목록에서 선택' : '+ 새로운 면접관 이름으로 접속'}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>면접 평가 세션 입장</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Security & Version Note */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            실시간 3인 블라인드 평가 격리
          </span>
          <span className="font-mono">SmartLab Core</span>
        </div>
      </div>
    </div>
  );
};
