import React, { useState, useEffect } from 'react';
import { InterviewerUser, InterviewRoomItem, ClubLeadership } from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { UserCheck, Shield, ArrowRight, ArrowLeft, DoorOpen, Users, Crown, Star, Lock, KeyRound } from 'lucide-react';
import { getLeadershipRole } from '../lib/leadership';
import { InterviewerPinModal } from './InterviewerPinModal';

interface SelectInterviewerPageProps {
  room: InterviewRoomItem;
  availableInterviewers: InterviewerUser[];
  leadership?: ClubLeadership;
  onSelectInterviewer: (user: InterviewerUser) => void;
  onBackToLobby: () => void;
}

export const SelectInterviewerPage: React.FC<SelectInterviewerPageProps> = ({
  room,
  availableInterviewers,
  leadership,
  onSelectInterviewer,
  onBackToLobby
}) => {
  // Use room's designated interviewers if present, otherwise availableInterviewers
  const roomInterviewers = room.interviewers && room.interviewers.length > 0
    ? room.interviewers
    : availableInterviewers;

  const [selectedUser, setSelectedUser] = useState<InterviewerUser>(roomInterviewers[0]);
  const [pinModalOpen, setPinModalOpen] = useState<boolean>(false);
  const [interviewerToAuth, setInterviewerToAuth] = useState<InterviewerUser | null>(null);

  const handleOpenPinModal = (user: InterviewerUser) => {
    const leaderRole = user.leadershipRole || getLeadershipRole(user.name, leadership);
    const preparedUser = {
      ...user,
      leadershipRole: leaderRole
    };
    setSelectedUser(preparedUser);
    setInterviewerToAuth(preparedUser);
    setPinModalOpen(true);
  };

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      handleOpenPinModal(selectedUser);
    }
  };

  const handleAuthSuccess = (authenticatedUser: InterviewerUser) => {
    setPinModalOpen(false);
    onSelectInterviewer(authenticatedUser);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden text-slate-100 select-none font-sans">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-md relative z-10 space-y-5 animate-fade-in">
        
        {/* Room Header Info */}
        <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-slate-200 font-medium truncate">
            <DoorOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">{room.name || room.title || 'SmartLab 면접실'}</span>
          </div>
          <button
            type="button"
            onClick={onBackToLobby}
            className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium shrink-0 cursor-pointer ml-2 flex items-center gap-1 transition-colors border border-slate-700/60"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>방 변경</span>
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-1 pt-1">
          <div className="inline-flex justify-center mb-0.5">
            <SmartLabLogo size="md" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-white">면접관 선택</h3>
          <p className="text-xs text-slate-400">
            배정된 면접관 프로필을 선택 후 PIN으로 인증하세요
          </p>
        </div>

        {/* Panel Selection Form */}
        <form onSubmit={handleEnter} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300 px-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>배정된 면접관 ({roomInterviewers.length}명)</span>
              </span>
              <span className="text-[11px] text-slate-500">4자리 PIN 인증</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {roomInterviewers.map((user, idx) => {
                const isSelected = selectedUser?.id === user.id || (!selectedUser && idx === 0);
                const role = user.leadershipRole || getLeadershipRole(user.name, leadership);
                const isCap = role === 'CAPTAIN';
                const isVc = role === 'VICE_CAPTAIN';

                return (
                  <div
                    key={user.id || idx}
                    onClick={() => setSelectedUser({ ...user, leadershipRole: role })}
                    onDoubleClick={() => handleOpenPinModal({ ...user, leadershipRole: role })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/80 text-white shadow-xs'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isCap
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isVc
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-xs sm:text-sm text-white flex items-center gap-2 flex-wrap">
                          <span>{user.name}</span>
                          {isCap && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5 fill-amber-300" />
                              <span>기장</span>
                            </span>
                          )}
                          {isVc && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-purple-300" />
                              <span>부기장</span>
                            </span>
                          )}
                          {user.role === 'admin' && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>
                            {isCap
                              ? (leadership?.captain?.memo || 'SmartLab 동아리 총괄 기장')
                              : isVc
                              ? (leadership?.viceCaptains?.find(v => v.name.trim().toLowerCase() === user.name.trim().toLowerCase())?.memo || 'SmartLab 동아리 부기장')
                              : (user.trackExpertise || 'SmartLab 면접 심사위원')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-600'
                      }`}>
                        {isSelected && <div className="w-1 h-1 bg-slate-950 rounded-full" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="interviewer-select-submit-btn"
            type="submit"
            disabled={!selectedUser}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-1"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{selectedUser ? `${selectedUser.name} 비밀번호 입력 및 입장` : '면접관을 선택해주세요'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-500">
          <span>개인별 4자리 PIN 인증 보호</span>
          <span className="font-mono text-slate-500">SmartLab Platform</span>
        </div>
      </div>

      {/* 4-digit PIN Authentication Modal */}
      {interviewerToAuth && (
        <InterviewerPinModal
          interviewer={interviewerToAuth}
          isOpen={pinModalOpen}
          onClose={() => setPinModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
};
