import React, { useState, useEffect } from 'react';
import { InterviewRoomInfo } from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import {
  DoorOpen,
  Plus,
  Shield,
  ArrowRight,
  Trash2,
  Calendar,
  Users,
  Lock,
  Sparkles,
  KeyRound
} from 'lucide-react';

interface RoomSelectPageProps {
  onSelectRoom: (room: InterviewRoomInfo) => void;
}

export const RoomSelectPage: React.FC<RoomSelectPageProps> = ({ onSelectRoom }) => {
  const [rooms, setRooms] = useState<InterviewRoomInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New Room Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (e) {
      console.error('Fetch rooms error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (adminPassword !== 'admin') {
      setErrorMessage('관리자 비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName,
          description: roomDescription,
          adminPassword
        })
      });

      if (res.ok) {
        const newRoom = await res.json();
        setIsCreateModalOpen(false);
        setRoomName('');
        setRoomDescription('');
        setAdminPassword('');
        await fetchRooms();
        // Immediately select the created room
        onSelectRoom(newRoom);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || '방 생성에 실패했습니다.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || '네트워크 오류가 발생했습니다.');
    }
  };

  const handleDeleteRoom = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const pwd = prompt('방을 삭제하려면 관리자 비밀번호를 입력하세요:');
    if (!pwd) return;

    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: pwd })
      });

      if (res.ok) {
        await fetchRooms();
      } else {
        alert('삭제 실패: 관리자 비밀번호를 확인해주세요.');
      }
    } catch (e) {
      console.error('Delete room error:', e);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden text-slate-100 select-none">
      {/* Background Ambient Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-8 backdrop-blur-md relative z-10 space-y-6 animate-fade-in">
        {/* Brand & Heading */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1 text-center sm:text-left">
            <SmartLabLogo size="md" />
            <p className="text-xs text-slate-400">
              참여할 면접 방을 선택하거나, 관리자 권한으로 신규 방을 개설하세요.
            </p>
          </div>

          <button
            onClick={() => {
              setErrorMessage('');
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>새 면접 방 개설 (Admin)</span>
          </button>
        </div>

        {/* Room List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
            <span>활성화된 면접 평가실 목록 ({rooms.length})</span>
            <span className="text-[11px] text-slate-500 font-normal">방 선택 후 면접관 프로필 지정</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              면접 방 목록 불러오는 중...
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 space-y-3">
              <DoorOpen className="w-10 h-10 text-slate-500 mx-auto" />
              <div className="text-sm font-bold text-slate-300">개설된 면접 방이 없습니다.</div>
              <p className="text-xs text-slate-500">
                상단의 <strong>[새 면접 방 개설 (Admin)]</strong> 버튼을 눌러 첫 번째 평가 방을 만들어보세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  className="p-5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500 transition-all cursor-pointer flex items-center justify-between group shadow-sm"
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                        <DoorOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                          {room.name}
                        </h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {room.createdAt}
                          </span>
                          <span>•</span>
                          <span>{room.createdBy}</span>
                        </div>
                      </div>
                    </div>

                    {room.description && (
                      <p className="text-xs text-slate-400 pl-10.5 line-clamp-1">
                        {room.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={(e) => handleDeleteRoom(room.id, e)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="방 삭제 (Admin)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="px-4 py-2 bg-blue-600 group-hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all">
                      <span>방 입장</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            방 생성은 동아리 Admin 비밀번호로 승인됩니다.
          </span>
          <span className="font-mono text-slate-600">SmartLab Architecture</span>
        </div>
      </div>

      {/* Admin Room Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">신규 면접 방 개설 (Admin)</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">면접 방 이름 *</label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="예: SmartLab 2026 하반기 신입 면접 1실"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">방 설명 (선택)</label>
                <input
                  type="text"
                  value={roomDescription}
                  onChange={(e) => setRoomDescription(e.target.value)}
                  placeholder="예: 다대일 심층 기술 심사 및 실시간 블라인드 채점"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-slate-800/70 border border-slate-700 rounded-xl space-y-1.5">
                <label className="block font-bold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  관리자 비밀번호 확인 *
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md transition-all"
                >
                  방 개설 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
