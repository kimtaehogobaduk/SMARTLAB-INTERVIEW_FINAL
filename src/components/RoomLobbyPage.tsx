import React, { useState } from 'react';
import { InterviewRoomItem } from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { DoorOpen, ArrowRight, ArrowLeft, Shield, Users, Clock, AlertCircle, Calendar } from 'lucide-react';

interface RoomLobbyPageProps {
  rooms: InterviewRoomItem[];
  onSelectRoom: (room: InterviewRoomItem) => void;
  onBackToLanding: () => void;
  onGoToAdmin: () => void;
}

export const RoomLobbyPage: React.FC<RoomLobbyPageProps> = ({
  rooms,
  onSelectRoom,
  onBackToLanding,
  onGoToAdmin
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');

  const activeRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden text-slate-100 select-none font-sans">
      {/* Background Ambience */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-7 sm:p-9 backdrop-blur-xl relative z-10 space-y-6 animate-fade-in">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={onBackToLanding}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>처음 화면으로</span>
          </button>
          <button
            type="button"
            onClick={onGoToAdmin}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer font-bold"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>어드민(Admin) 콘솔</span>
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex justify-center mb-1">
            <SmartLabLogo size="md" />
          </div>
          <h2 className="text-xl font-black text-white">면접 평가 방 선택</h2>
          <p className="text-xs text-slate-400">
            참여할 면접 평가 방을 선택하여 면접관 슬롯으로 입장하세요
          </p>
        </div>

        {/* Rooms Listing or Empty State */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>개설된 면접 방 ({rooms.length}개)</span>
          </div>

          {rooms.length === 0 ? (
            /* 개설된 방이 없을 때의 명확한 상태 표시 */
            <div className="p-8 text-center bg-slate-800/40 border-2 border-dashed border-slate-800 rounded-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mx-auto">
                <DoorOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">개설된 방이 없습니다</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  현재 활성화된 면접 평가 방이 없습니다. 관리자가 방과 면접관을 개설한 후 다시 접속해주세요.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onGoToAdmin}
                  className="px-4 py-2.5 bg-amber-600/20 hover:bg-amber-600 border border-amber-500/40 hover:border-amber-500 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>관리자 권한으로 방 개설하러 가기</span>
                </button>
              </div>
            </div>
          ) : (
            /* 방 목록 리스트 */
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {rooms.map((room) => {
                const isSelected = (selectedRoomId === room.id) || (!selectedRoomId && room === rooms[0]);
                const intvList = room.interviewers || [];
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-blue-950/70 border-blue-500 ring-2 ring-blue-500/30 text-white shadow-lg'
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <DoorOpen className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span>{room.name || room.title}</span>
                      </div>
                      <div className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 line-clamp-1">
                      {room.description || 'SmartLab 동아리 실시간 면접 평가실'}
                    </div>

                    {/* Interviewers Badges */}
                    {intvList.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {intvList.map((i) => (
                          <span
                            key={i.id}
                            className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700/80 rounded-md text-[10px] font-medium"
                          >
                            {i.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span className="text-blue-400 font-medium">지원자 {room.candidateCount ?? 0}명</span>
                      <span>{room.createdAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Enter Room Button (Only enabled when rooms exist) */}
        {rooms.length > 0 && (
          <button
            type="button"
            disabled={!activeRoom}
            onClick={() => activeRoom && onSelectRoom(activeRoom)}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>선택한 방으로 입장하기</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>SmartLab 3인 블라인드 격리 시스템</span>
          <span className="font-mono">v2.5</span>
        </div>

      </div>
    </div>
  );
};
