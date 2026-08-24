import React, { useState } from 'react';
import { InterviewerUser, InterviewRoomItem } from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { UserCheck, Shield, ArrowRight, ArrowLeft, DoorOpen, Users } from 'lucide-react';

interface SelectInterviewerPageProps {
  room: InterviewRoomItem;
  availableInterviewers: InterviewerUser[];
  onSelectInterviewer: (user: InterviewerUser) => void;
  onBackToLobby: () => void;
}

export const SelectInterviewerPage: React.FC<SelectInterviewerPageProps> = ({
  room,
  availableInterviewers,
  onSelectInterviewer,
  onBackToLobby
}) => {
  // Use room's designated interviewers if present, otherwise availableInterviewers
  const roomInterviewers = room.interviewers && room.interviewers.length > 0
    ? room.interviewers
    : availableInterviewers;

  const [selectedUser, setSelectedUser] = useState<InterviewerUser>(roomInterviewers[0]);

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      onSelectInterviewer(selectedUser);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-100 select-none font-sans">
      {/* Dynamic Background */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-7 sm:p-8 backdrop-blur-md relative z-10 space-y-6 animate-fade-in">
        
        {/* Room Header Info */}
        <div className="flex items-center justify-between bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs">
          <div className="flex items-center gap-2 text-slate-200 font-bold truncate">
            <DoorOpen className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="truncate">{room.name || room.title || 'SmartLab 면접실'}</span>
          </div>
          <button
            type="button"
            onClick={onBackToLobby}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold shrink-0 cursor-pointer ml-2 flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>방 변경</span>
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex justify-center mb-1">
            <SmartLabLogo size="md" />
          </div>
          <h3 className="text-lg font-black text-white">면접관 본인 선택</h3>
          <p className="text-xs text-slate-400">
            관리자가 배정한 면접관 명단에서 본인의 이름을 선택해주세요
          </p>
        </div>

        {/* Panel Selection Form */}
        <form onSubmit={handleEnter} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>배정된 면접관 ({roomInterviewers.length}명)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">관리자 지정 명단</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {roomInterviewers.map((user, idx) => {
                const isSelected = selectedUser?.id === user.id || (!selectedUser && idx === 0);
                return (
                  <div
                    key={user.id || idx}
                    onClick={() => setSelectedUser(user)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-950/70 border-blue-500 ring-2 ring-blue-500/30 text-white shadow-md'
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{user.name}</span>
                          {user.role === 'admin' && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
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
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedUser}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer mt-2"
          >
            <span>{selectedUser ? `${selectedUser.name}으로 입장하기` : '면접관을 선택해주세요'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
          * 면접관 명단 추가/변경은 관리자(Admin) 콘솔에서 가능합니다.
        </div>
      </div>
    </div>
  );
};
