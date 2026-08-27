import React, { useState } from 'react';
import { InterviewRoomItem } from '../types';
import { SmartLabLogo } from './SmartLabLogo';
import { DoorOpen, ArrowRight, ArrowLeft, Lock, Unlock, HelpCircle, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';

interface RoomLobbyPageProps {
  rooms: InterviewRoomItem[];
  onSelectRoom: (room: InterviewRoomItem) => void;
  onBackToLanding: () => void;
  onGoToAdmin?: () => void;
}

export const RoomLobbyPage: React.FC<RoomLobbyPageProps> = ({
  rooms,
  onSelectRoom,
  onBackToLanding
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  
  // Security Challenge Modal State
  const [challengingRoom, setChallengingRoom] = useState<InterviewRoomItem | null>(null);
  const [challengeInput, setChallengeInput] = useState('');
  const [quizAnswersMap, setQuizAnswersMap] = useState<Record<string, string>>({});
  const [challengeError, setChallengeError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const activeRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];

  const handleRoomEntryAttempt = (room: InterviewRoomItem) => {
    if (room.securityType === 'PASSWORD' || room.securityType === 'QUIZ') {
      setChallengingRoom(room);
      setChallengeInput('');
      setQuizAnswersMap({});
      setChallengeError('');
    } else {
      onSelectRoom(room);
    }
  };

  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengingRoom) return;

    if (challengingRoom.securityType === 'PASSWORD') {
      if (!challengeInput.trim()) {
        setChallengeError('방 비밀번호를 입력해주세요.');
        return;
      }
    } else if (challengingRoom.securityType === 'QUIZ') {
      const activeQuizzes = (challengingRoom.securityQuizzes && challengingRoom.securityQuizzes.length > 0)
        ? challengingRoom.securityQuizzes
        : [{ id: 'q-0', question: challengingRoom.securityQuestion || challengingRoom.quizQuestion || '보안 퀴즈' }];

      for (let i = 0; i < activeQuizzes.length; i++) {
        const q = activeQuizzes[i];
        const ans = (quizAnswersMap[q.id] || quizAnswersMap[`idx-${i}`] || '').trim();
        if (!ans) {
          setChallengeError(
            activeQuizzes.length > 1
              ? `[문제 ${i + 1}] 정답을 입력해주세요.`
              : '퀴즈 정답을 입력해주세요.'
          );
          return;
        }
      }
    }

    setIsVerifying(true);
    setChallengeError('');

    try {
      const payload: any = {};
      if (challengingRoom.securityType === 'PASSWORD') {
        payload.password = challengeInput.trim();
      } else if (challengingRoom.securityType === 'QUIZ') {
        payload.answers = quizAnswersMap;
        payload.answer = Object.values(quizAnswersMap)[0] || '';
      }

      const res = await fetch(`/api/rooms/${challengingRoom.id}/verify-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const targetRoom = challengingRoom;
        setChallengingRoom(null);
        setChallengeInput('');
        setQuizAnswersMap({});
        setChallengeError('');
        onSelectRoom(targetRoom);
      } else {
        const data = await res.json().catch(() => ({}));
        setChallengeError(
          data.error ||
          (challengingRoom.securityType === 'PASSWORD'
            ? '방 비밀번호가 일치하지 않습니다.'
            : '보안 문제(퀴즈)의 정답이 일치하지 않습니다.')
        );
      }
    } catch (err: any) {
      setChallengeError('보안 검증 서버 통신 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden text-slate-100 select-none font-sans">
      {/* Background Ambience */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-7 sm:p-9 backdrop-blur-xl relative z-10 space-y-6 animate-fade-in">
        
        {/* Navigation Bar - Clean, Admin Console button removed per user request */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={onBackToLanding}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>처음 화면으로</span>
          </button>
          <div className="text-[11px] text-slate-500 font-mono">
            면접관 입장 로비
          </div>
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
                  onClick={onBackToLanding}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>처음 화면으로 돌아가기</span>
                </button>
              </div>
            </div>
          ) : (
            /* 방 목록 리스트 */
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {rooms.map((room) => {
                const isSelected = (selectedRoomId === room.id) || (!selectedRoomId && room === rooms[0]);
                const intvList = room.interviewers || [];
                const secType = room.securityType || 'NONE';

                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    onDoubleClick={() => handleRoomEntryAttempt(room)}
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
                      
                      <div className="flex items-center gap-2">
                        {/* Security Type Badges */}
                        {secType === 'PASSWORD' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>비번 잠금</span>
                          </span>
                        )}
                        {secType === 'QUIZ' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                            <HelpCircle className="w-2.5 h-2.5" />
                            <span>퀴즈 보안</span>
                          </span>
                        )}
                        {secType === 'NONE' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Unlock className="w-2.5 h-2.5" />
                            <span>자유 입장</span>
                          </span>
                        )}

                        <div className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
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
            onClick={() => activeRoom && handleRoomEntryAttempt(activeRoom)}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>{activeRoom?.securityType && activeRoom.securityType !== 'NONE' ? '보안 인증 후 방 입장하기' : '선택한 방으로 입장하기'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>SmartLab 3인 블라인드 격리 시스템</span>
          <span className="font-mono">v2.5</span>
        </div>

      </div>

      {/* Security Challenge Modal for Password / Quiz Lock */}
      {challengingRoom && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 space-y-5 animate-scale-in">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                {challengingRoom.securityType === 'PASSWORD' ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>방 입장 비밀번호 확인</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>보안 퀴즈(질문) 인증</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setChallengingRoom(null);
                  setChallengeInput('');
                  setChallengeError('');
                }}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-300 font-bold">
                [{challengingRoom.name || challengingRoom.title}]
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {challengingRoom.securityType === 'PASSWORD'
                  ? '이 방은 관리자에 의해 비밀번호가 설정되어 있습니다. 입장 비밀번호를 입력해주세요.'
                  : '외부 비인가자 접근 방지를 위한 보안 문제입니다. 질문에 대한 정답을 입력해주세요.'}
              </p>
            </div>

            {/* Security Question/Password Form */}
            <form onSubmit={handleChallengeSubmit} className="space-y-4">
              {challengingRoom.securityType === 'PASSWORD' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    방 비밀번호 입력
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      autoFocus
                      required
                      value={challengeInput}
                      onChange={(e) => {
                        setChallengeInput(e.target.value);
                        if (challengeError) setChallengeError('');
                      }}
                      placeholder="방 비밀번호를 입력하세요"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                    />
                  </div>
                </div>
              )}

              {challengingRoom.securityType === 'QUIZ' && (
                <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                  {((challengingRoom.securityQuizzes && challengingRoom.securityQuizzes.length > 0)
                    ? challengingRoom.securityQuizzes
                    : [{ id: 'q-0', question: challengingRoom.securityQuestion || challengingRoom.quizQuestion || '보안 퀴즈' }]
                  ).map((quiz, idx, arr) => (
                    <div
                      key={quiz.id || idx}
                      className="p-3.5 bg-purple-950/40 border border-purple-800/60 rounded-2xl space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
                        <span className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                          <span>{arr.length > 1 ? `보안 퀴즈 문제 ${idx + 1}` : '보안 퀴즈 문제'}</span>
                        </span>
                      </div>
                      <p className="text-xs text-white font-semibold leading-relaxed">
                        {quiz.question}
                      </p>
                      <div className="space-y-1 pt-1">
                        <input
                          type="text"
                          required
                          autoFocus={idx === 0}
                          value={quizAnswersMap[quiz.id] || quizAnswersMap[`idx-${idx}`] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuizAnswersMap(prev => ({
                              ...prev,
                              [quiz.id]: val,
                              [`idx-${idx}`]: val
                            }));
                            if (challengeError) setChallengeError('');
                          }}
                          placeholder="정답 입력 (띄어쓰기/대소문자 무관)"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {challengeError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{challengeError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setChallengingRoom(null);
                    setChallengeInput('');
                    setQuizAnswersMap({});
                    setChallengeError('');
                  }}
                  className="px-3.5 py-2 border border-slate-700 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <span>{isVerifying ? '인증 확인 중...' : '확인 및 방 입장'}</span>
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
