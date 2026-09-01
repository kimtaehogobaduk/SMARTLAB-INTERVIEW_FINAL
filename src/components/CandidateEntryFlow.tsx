import React, { useState, useEffect } from 'react';
import { SmartLabLogo } from './SmartLabLogo';
import { InterviewRoomItem, Candidate, CandidateChatMessage } from '../types';
import { GraduationCap, ArrowLeft, ArrowRight, Lock, CheckCircle2, User, Hash, AlertCircle, Building2, Sparkles, BookOpen, Clock, FileCheck } from 'lucide-react';

interface CandidateEntryFlowProps {
  rooms: InterviewRoomItem[];
  onBackToRoleSelect: () => void;
  onCandidateLoginSuccess: (payload: {
    candidate: Candidate;
    room: InterviewRoomItem;
    messages: CandidateChatMessage[];
  }) => void;
  initialSelectedRoomId?: string;
}

const CANDIDATE_STORAGE_KEY = 'smartlab_last_candidate_session';

export const CandidateEntryFlow: React.FC<CandidateEntryFlowProps> = ({
  rooms,
  onBackToRoleSelect,
  onCandidateLoginSuccess,
  initialSelectedRoomId
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialSelectedRoomId || (rooms[0]?.id || ''));
  const [studentId, setStudentId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [interviewDate, setInterviewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('14:00');
  const [endTime, setEndTime] = useState<string>('14:30');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [hasSavedSession, setHasSavedSession] = useState<boolean>(false);
  const [savedSessionInfo, setSavedSessionInfo] = useState<{
    roomId: string;
    studentId: string;
    name: string;
  } | null>(null);

  // Proactively request browser notification permission at the very start
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Load last saved candidate session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CANDIDATE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.studentId && parsed.name) {
          setHasSavedSession(true);
          setSavedSessionInfo(parsed);
          if (!studentId) setStudentId(parsed.studentId);
          if (!name) setName(parsed.name);
          if (parsed.roomId && rooms.some(r => r.id === parsed.roomId)) {
            setSelectedRoomId(parsed.roomId);
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }, [rooms]);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setErrorMsg('면접 평가 방을 선택해주세요.');
      return;
    }
    if (!studentId.trim()) {
      setErrorMsg('학번을 입력해주세요.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('지원자 성함을 입력해주세요.');
      return;
    }
    if (!interviewDate || !startTime || !endTime) {
      setErrorMsg('면접 희망/예정 일정을 정확히 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/candidate-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoomId,
          studentId: studentId.trim(),
          name: name.trim(),
          phone: phone.trim(),
          interviewDate: interviewDate.trim(),
          startTime: startTime.trim(),
          endTime: endTime.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '지원자 로그인 처리에 실패했습니다.');
      }

      // Save credentials in localStorage for automatic future restoration
      try {
        localStorage.setItem(
          CANDIDATE_STORAGE_KEY,
          JSON.stringify({
            roomId: selectedRoomId,
            studentId: studentId.trim(),
            name: name.trim()
          })
        );
      } catch (e) {
        // Ignore
      }

      onCandidateLoginSuccess({
        candidate: data.candidate,
        room: data.room || selectedRoom || rooms[0],
        messages: data.messages || []
      });
    } catch (err: any) {
      setErrorMsg(err.message || '서버 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplySavedSession = () => {
    if (savedSessionInfo) {
      if (savedSessionInfo.roomId && rooms.some(r => r.id === savedSessionInfo.roomId)) {
        setSelectedRoomId(savedSessionInfo.roomId);
      }
      setStudentId(savedSessionInfo.studentId);
      setName(savedSessionInfo.name);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden text-slate-100 font-sans">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10 space-y-6 animate-fade-in">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <button
            type="button"
            onClick={onBackToRoleSelect}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>역할 선택으로 돌아가기</span>
          </button>
          
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold">
            <GraduationCap className="w-4 h-4" />
            <span>지원자(학생) 전용 등록 & 포털</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex justify-center scale-100">
            <SmartLabLogo size="md" />
          </div>
          <h2 className="text-2xl font-black text-white">
            지원자 면접 방 선택 및 본인 확인
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            지원하신 <strong className="text-slate-200">면접 방</strong>을 선택하고, <strong className="text-slate-200">학번과 성함</strong>을 입력해주세요. 이전에 접속한 적이 있다면 기존에 등록하셨던 페이지와 제출 서류가 즉시 복원됩니다.
          </p>
        </div>

        {/* Quick Autofill Alert if previous session detected */}
        {hasSavedSession && savedSessionInfo && (
          <div className="p-3.5 bg-blue-950/50 border border-blue-800/60 rounded-2xl flex items-center justify-between gap-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white">이전 접속 정보 감지: </span>
                <span className="text-blue-300">{savedSessionInfo.name} ({savedSessionInfo.studentId})</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplySavedSession}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer"
            >
              내 정보 불러오기
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Step 1: Room Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>1. 지원할 면접 평가 방 선택 *</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">개설된 방: {rooms.length}개</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {rooms.map((room) => {
                const isSelected = selectedRoomId === room.id;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/30 text-white'
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-white line-clamp-1">
                        {room.name || room.title}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">
                      {room.description || 'SmartLab 직무 심층 면접'}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-700/40">
                      <span>면접관: {room.interviewers?.length || room.panelCount || 2}명 배정</span>
                      <span>•</span>
                      <span>1인당 {room.minutesPerPerson || 30}분</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Student Identification */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>2. 지원자 본인 확인 (학번 및 성명) *</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-slate-500" />
                  <span>학번 *</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="예: 202410101"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>성함 *</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="예: 김태호"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder-slate-500 font-bold"
                />
              </div>
            </div>

            {/* Optional details (Phone) */}
            <div className="pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">
                  비상 연락처 (선택)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Mandatory Interview Schedule Details */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>3. 면접 희망 / 예정 일정 확인 및 입력 *</span>
              </span>
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md font-semibold">
                필수 입력 항목
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">
                  면접 일자 *
                </label>
                <input
                  type="date"
                  required
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">
                  희망 시작 시간 *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">
                  희망 종료 시간 *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50">
              💡 입력하신 면접 시간은 면접관 시스템에 실시간으로 공유되며, 면접 10분 전 자동 알림 및 실시간 대기실 상태와 동기화됩니다.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/70 text-red-300 rounded-xl text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !studentId.trim() || !name.trim()}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isSubmitting ? '지원자 포털 불러오는 중...' : '지원자 포털 입장하기'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            * 입력하신 학번과 성함은 다음 접속 시 브라우저 및 서버에 기억되어 동일한 지원서 상태로 안전하게 연결됩니다.
          </p>

        </form>

      </div>
    </div>
  );
};
