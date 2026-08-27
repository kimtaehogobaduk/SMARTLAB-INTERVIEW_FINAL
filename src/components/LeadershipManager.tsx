import React, { useState, useEffect } from 'react';
import { PlatformSettings, InterviewRoomItem, ClubLeadership, LeadershipMember } from '../types';
import { Crown, Star, ShieldCheck, UserCheck, Plus, Trash2, CheckCircle2, AlertCircle, Sparkles, MessageSquare, Info, Shield, Radio } from 'lucide-react';
import { formatInterviewerDisplayName } from './ObserverDashboard';
import { getLeadershipBadgeConfig } from '../lib/leadership';

interface LeadershipManagerProps {
  settings: PlatformSettings;
  rooms: InterviewRoomItem[];
  onRefreshSettings?: () => Promise<void> | void;
}

export const LeadershipManager: React.FC<LeadershipManagerProps> = ({
  settings,
  rooms,
  onRefreshSettings
}) => {
  // Extract all existing unique interviewer names from rooms
  const existingInterviewers = React.useMemo(() => {
    const names = new Set<string>();
    rooms.forEach(r => {
      if (Array.isArray(r.interviewers)) {
        r.interviewers.forEach(iv => {
          const rawName = typeof iv === 'string' ? iv : (iv as any).name || '';
          const cleaned = formatInterviewerDisplayName(rawName).trim();
          if (cleaned) names.add(cleaned);
        });
      }
    });
    return Array.from(names).sort();
  }, [rooms]);

  // Local state initialized from settings
  const [captainName, setCaptainName] = useState<string>('');
  const [captainMemo, setCaptainMemo] = useState<string>('');
  const [viceCaptains, setViceCaptains] = useState<Array<{ name: string; memo?: string }>>([]);

  const [newVcName, setNewVcName] = useState<string>('');
  const [newVcMemo, setNewVcMemo] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state when settings change
  useEffect(() => {
    if (settings.leadership) {
      setCaptainName(settings.leadership.captain?.name || '');
      setCaptainMemo(settings.leadership.captain?.memo || '');
      setViceCaptains(
        Array.isArray(settings.leadership.viceCaptains)
          ? settings.leadership.viceCaptains.map(v => ({ name: v.name, memo: v.memo || '' }))
          : []
      );
    } else {
      setCaptainName('');
      setCaptainMemo('');
      setViceCaptains([]);
    }
  }, [settings.leadership]);

  // Handle setting captain
  const handleSelectCaptain = (name: string) => {
    const cleaned = formatInterviewerDisplayName(name).trim();
    if (!cleaned) return;
    setCaptainName(cleaned);
    // If this person was in viceCaptains, remove them
    setViceCaptains(prev => prev.filter(vc => formatInterviewerDisplayName(vc.name).trim().toLowerCase() !== cleaned.toLowerCase()));
  };

  const handleRemoveCaptain = () => {
    setCaptainName('');
    setCaptainMemo('');
  };

  // Handle adding vice captain (max 2)
  const handleAddViceCaptain = (nameToAdd?: string, memoToAdd?: string) => {
    const targetName = formatInterviewerDisplayName(nameToAdd || newVcName).trim();
    if (!targetName) return;

    if (viceCaptains.length >= 2) {
      setStatusMsg({ type: 'error', text: '부기장은 최대 2명까지만 임명할 수 있습니다.' });
      return;
    }

    // Check if already captain
    if (captainName && formatInterviewerDisplayName(captainName).trim().toLowerCase() === targetName.toLowerCase()) {
      setStatusMsg({ type: 'error', text: '이미 기장으로 임명된 면접관은 부기장으로 중복 임명할 수 없습니다.' });
      return;
    }

    // Check if already in viceCaptains
    const alreadyExists = viceCaptains.some(
      vc => formatInterviewerDisplayName(vc.name).trim().toLowerCase() === targetName.toLowerCase()
    );
    if (alreadyExists) {
      setStatusMsg({ type: 'error', text: '이미 부기장 목록에 등록된 면접관입니다.' });
      return;
    }

    setViceCaptains(prev => [...prev, { name: targetName, memo: memoToAdd || newVcMemo }]);
    setNewVcName('');
    setNewVcMemo('');
    setStatusMsg(null);
  };

  const handleRemoveViceCaptain = (index: number) => {
    setViceCaptains(prev => prev.filter((_, i) => i !== index));
  };

  // Save to backend
  const handleSaveLeadership = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const payloadCaptain = captainName.trim()
        ? {
            id: settings.leadership?.captain?.id || `lead-cap-${Date.now()}`,
            name: captainName.trim(),
            role: 'CAPTAIN' as const,
            appointedAt: settings.leadership?.captain?.appointedAt || new Date().toLocaleString('ko-KR', { hour12: false }),
            appointedBy: '총괄 관리자 (Admin)',
            memo: captainMemo.trim()
          }
        : null;

      const payloadViceCaptains = viceCaptains.slice(0, 2).map((vc, idx) => ({
        id: (settings.leadership?.viceCaptains && settings.leadership.viceCaptains[idx]?.id) || `lead-vc-${Date.now()}-${idx}`,
        name: vc.name.trim(),
        role: 'VICE_CAPTAIN' as const,
        appointedAt: (settings.leadership?.viceCaptains && settings.leadership.viceCaptains[idx]?.appointedAt) || new Date().toLocaleString('ko-KR', { hour12: false }),
        appointedBy: '총괄 관리자 (Admin)',
        memo: vc.memo?.trim() || ''
      }));

      const res = await fetch('/api/leadership/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captain: payloadCaptain,
          viceCaptains: payloadViceCaptains,
          updatedBy: '총괄 관리자 (Admin)'
        })
      });

      if (!res.ok) {
        throw new Error('임원진 정보 저장에 실패했습니다.');
      }

      setStatusMsg({
        type: 'success',
        text: '👑 동아리 기장(1명) 및 부기장(최대 2명) 임명 정보가 클라우드에 안전하게 저장되었습니다.'
      });

      if (onRefreshSettings) {
        await onRefreshSettings();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || '임원진 저장 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const capBadge = getLeadershipBadgeConfig('CAPTAIN');
  const vcBadge = getLeadershipBadgeConfig('VICE_CAPTAIN');

  return (
    <div className="max-w-6xl w-full mx-auto space-y-8 animate-fade-in text-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>SmartLab 동아리 임원진 직책 관리</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>기장 & 부기장 임명 콘솔</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              어드민 권한으로 <strong className="text-amber-300">기장 1명</strong>과 <strong className="text-purple-300">부기장 최대 2명</strong>을 임명합니다.
              임명된 임원진은 실시간 알림, 발언 신호, 채팅 및 면접관 목록에 전용 뱃지가 자동 표기됩니다.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveLeadership}
            disabled={isSaving}
            className="self-start md:self-auto px-6 py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>임원진 임명 확정 및 저장</span>
              </>
            )}
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`mt-4 p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-bold ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Captain & Vice-Captains Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================================= */}
        {/* CARD 1: CAPTAIN (기장 - 1명 정원) */}
        {/* ========================================================================= */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">동아리 기장 (Captain)</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      정원 1명
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">동아리 최고 대표직 / 면접 총괄 진행</p>
                </div>
              </div>

              {captainName ? (
                <button
                  type="button"
                  onClick={handleRemoveCaptain}
                  className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="기장 임명 해제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>해임</span>
                </button>
              ) : (
                <span className="text-xs text-slate-500 italic">미임명</span>
              )}
            </div>

            {/* Current Appointed Captain Display */}
            {captainName ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-800/60 border border-amber-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-lg flex items-center justify-center shadow-md">
                    {captainName.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white">{captainName}</span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-black bg-amber-500 text-slate-950 shadow-xs">
                        👑 기장
                      </span>
                    </div>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      {captainMemo || '별도 메모 없음 (SmartLab 대표 임원)'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-dashed border-slate-700 text-center space-y-1">
                <p className="text-xs font-bold text-slate-400">현재 임명된 기장이 없습니다.</p>
                <p className="text-[11px] text-slate-500">아래 면접관 목록에서 선택하거나 이름을 입력하여 임명하세요.</p>
              </div>
            )}

            {/* Input Form for Captain */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  기장 이름 입력 또는 변경
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={captainName}
                    onChange={(e) => setCaptainName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-hidden text-xs text-white placeholder-slate-600"
                  />
                  {captainName && (
                    <button
                      type="button"
                      onClick={handleRemoveCaptain}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      초기화
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  직책 메모 / 비고 (선택 사항)
                </label>
                <input
                  type="text"
                  value={captainMemo}
                  onChange={(e) => setCaptainMemo(e.target.value)}
                  placeholder="예: 2026년도 상반기 SmartLab 동아리 총괄 기장"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-hidden text-xs text-white placeholder-slate-600"
                />
              </div>
            </div>

            {/* Quick Assign from Registered Interviewers */}
            {existingInterviewers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 block">
                  빠른 선택 (등록된 면접관 풀)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {existingInterviewers.map((name) => {
                    const isCap = captainName.toLowerCase() === name.toLowerCase();
                    const isVc = viceCaptains.some(v => v.name.toLowerCase() === name.toLowerCase());
                    return (
                      <button
                        key={`cap-quick-${name}`}
                        type="button"
                        onClick={() => handleSelectCaptain(name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isCap
                            ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                            : isVc
                            ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60 opacity-60'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {isCap && <span>👑</span>}
                        {isVc && <span>⭐</span>}
                        <span>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl text-[11px] text-amber-300/90 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>기장은 동아리당 단 1명만 유일하게 임명됩니다. 부기장과 중복될 수 없습니다.</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: VICE-CAPTAINS (부기장 - 최대 2명) */}
        {/* ========================================================================= */}
        <div className="bg-slate-900/90 border border-purple-500/30 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">동아리 부기장 (Vice-Captains)</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      viceCaptains.length >= 2
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      현재 {viceCaptains.length} / 최대 2명
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">동아리 부대표직 / 면접 지원 및 부괄</p>
                </div>
              </div>
            </div>

            {/* Current Appointed Vice-Captains List */}
            <div className="space-y-2.5">
              {viceCaptains.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-dashed border-slate-700 text-center space-y-1">
                  <p className="text-xs font-bold text-slate-400">현재 임명된 부기장이 없습니다.</p>
                  <p className="text-[11px] text-slate-500">최대 2명까지 등록할 수 있습니다.</p>
                </div>
              ) : (
                viceCaptains.map((vc, idx) => (
                  <div
                    key={`vc-item-${idx}`}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 to-slate-800/60 border border-purple-500/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-400 text-white font-black text-sm flex items-center justify-center shadow-md">
                        {vc.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">{vc.name}</span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-purple-600 text-white shadow-xs">
                            ⭐ 부기장 #{idx + 1}
                          </span>
                        </div>
                        <p className="text-[11px] text-purple-300/80 mt-0.5">
                          {vc.memo || '별도 메모 없음 (SmartLab 부기장)'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveViceCaptain(idx)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                      title="부기장 해임"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Vice-Captain Form (if < 2) */}
            {viceCaptains.length < 2 ? (
              <div className="space-y-3 pt-2 bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-purple-300 block">
                  새 부기장 추가 (최대 2명까지 가능)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newVcName}
                    onChange={(e) => setNewVcName(e.target.value)}
                    placeholder="부기장 이름 (예: 김철수)"
                    className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-purple-500 focus:outline-hidden text-xs text-white placeholder-slate-600"
                  />
                  <input
                    type="text"
                    value={newVcMemo}
                    onChange={(e) => setNewVcMemo(e.target.value)}
                    placeholder="직책 비고 (선택 사항)"
                    className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-purple-500 focus:outline-hidden text-xs text-white placeholder-slate-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddViceCaptain()}
                  disabled={!newVcName.trim()}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>부기장 목록에 추가 ({viceCaptains.length}/2)</span>
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-300 text-center font-bold">
                부기장 정원(최대 2명)이 모두 충족되었습니다.
              </div>
            )}

            {/* Quick Add from Interviewers */}
            {existingInterviewers.length > 0 && viceCaptains.length < 2 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 block">
                  빠른 선택 (등록된 면접관 풀)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {existingInterviewers.map((name) => {
                    const isCap = captainName.toLowerCase() === name.toLowerCase();
                    const isVc = viceCaptains.some(v => v.name.toLowerCase() === name.toLowerCase());
                    return (
                      <button
                        key={`vc-quick-${name}`}
                        type="button"
                        disabled={isCap || isVc}
                        onClick={() => handleAddViceCaptain(name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isCap
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60 opacity-50 cursor-not-allowed'
                            : isVc
                            ? 'bg-purple-600 text-white font-black shadow-xs cursor-default'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer'
                        }`}
                      >
                        {isCap && <span>👑</span>}
                        {isVc && <span>⭐</span>}
                        <span>{name}</span>
                        {!isCap && !isVc && <Plus className="w-3 h-3 opacity-60" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl text-[11px] text-purple-300/90 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-purple-400 mt-0.5" />
            <span>부기장은 최대 2명까지만 임명 가능하며, 기장과 중복될 수 없습니다.</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: LIVE PREVIEW OF LEADERSHIP BADGES & ACTION SIGNALS */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>임원진 UI 뱃지 및 액션 신호 실시간 미리보기</span>
            </h3>
            <p className="text-xs text-slate-400">
              기장 및 부기장으로 임명된 면접관이 화면에서 활동할 때 다음과 같이 표시됩니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Preview 1: Chat Message Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                면접관 실시간 대화방
              </span>
              <span className="text-[10px] font-mono">14:02:15</span>
            </div>

            <div className="space-y-2">
              {/* Captain Chat Bubble */}
              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-amber-500 text-slate-950">
                    👑 기장
                  </span>
                  <span className="text-xs font-bold text-white">{captainName || '김기장'}</span>
                  <span className="text-[10px] text-slate-500 font-mono">총괄 공지</span>
                </div>
                <p className="text-xs text-amber-200/90 font-medium">
                  "다음 지원자 인성 질문 위주로 심층 검증 부탁드립니다."
                </p>
              </div>

              {/* Vice Captain Chat Bubble */}
              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-purple-600 text-white">
                    ⭐ 부기장
                  </span>
                  <span className="text-xs font-bold text-white">
                    {viceCaptains[0]?.name || '이부기장'}
                  </span>
                </div>
                <p className="text-xs text-purple-200/90 font-medium">
                  "확인했습니다. 기술 직무 꼬리질문 먼저 진행하겠습니다."
                </p>
              </div>
            </div>
          </div>

          {/* Preview 2: Live Action Signal */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                실시간 행동 신호 알림
              </span>
              <span className="text-[10px] font-mono">LIVE</span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <span>👑 [기장] {captainName || '김기장'} 면접관이 먼저 질문합니다</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {captainName || '김기장'} 면접관이 발언권을 얻어 먼저 질문을 진행합니다.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                <div className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                  <span>⭐ [부기장] {viceCaptains[0]?.name || '이부기장'} 면접관이 팩트체크 신호를 보냈습니다</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  지원자의 직전문항 심층 검증이 권장됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* Preview 3: Presence Banner */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                실시간 동료 면접관 상태바
              </span>
              <span className="text-[10px] font-mono">ONLINE</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-white">{captainName || '김기장'}</span>
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-amber-500 text-slate-950">
                  👑 기장
                </span>
              </div>

              <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-purple-500/40 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-bold text-white">{viceCaptains[0]?.name || '이부기장'}</span>
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-purple-600 text-white">
                  ⭐ 부기장
                </span>
              </div>

              <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-bold text-slate-300">박면접관</span>
                <span className="text-[10px] text-slate-500">일반</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
