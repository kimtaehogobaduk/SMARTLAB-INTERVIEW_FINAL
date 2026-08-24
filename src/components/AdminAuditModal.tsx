import React, { useState, useEffect } from 'react';
import { AuditLog, Candidate, Evaluation } from '../types';
import { Shield, ShieldAlert, KeyRound, Clock, AlertTriangle, CheckCircle, History, X, Edit3 } from 'lucide-react';

interface AdminAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLog[];
  candidates: Candidate[];
  allEvaluations: Evaluation[];
  onAdminUnlock: (candidateId?: string) => Promise<boolean>;
  unlockExpiresAt: number | null;
  onModifyEvaluationAdmin?: (data: any) => Promise<void>;
}

export const AdminAuditModal: React.FC<AdminAuditModalProps> = ({
  isOpen,
  onClose,
  auditLogs,
  candidates,
  allEvaluations,
  onAdminUnlock,
  unlockExpiresAt,
  onModifyEvaluationAdmin
}) => {
  const [adminId, setAdminId] = useState('');
  const [adminPw, setAdminPw] = useState('');
  const [authError, setAuthError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(candidates[0]?.id || '');
  const [editScoreTech, setEditScoreTech] = useState<number>(90);
  const [editReason, setEditReason] = useState<string>('점수 오기입 정정 요청에 따른 관리자 수정');
  const [isSuccessMsg, setIsSuccessMsg] = useState(false);

  useEffect(() => {
    if (!unlockExpiresAt) {
      setRemainingSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((unlockExpiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [unlockExpiresAt]);

  if (!isOpen) return null;

  const isUnlocked = remainingSeconds > 0;

  const handleLoginUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPw !== 'admin' || (adminId.trim() !== 'admin' && adminId.trim() !== '')) {
      setAuthError('관리자 아이디 또는 비밀번호가 일치하지 않습니다.');
      return;
    }
    setAuthError('');
    const success = await onAdminUnlock(selectedCandidateId);
    if (!success) {
      setAuthError('권한 활성화 실패');
    }
  };

  const handleAdminScoreEdit = async () => {
    if (!onModifyEvaluationAdmin) return;
    const targetCandidate = candidates.find(c => c.id === selectedCandidateId);
    const targetEval = allEvaluations.find(e => e.candidateId === selectedCandidateId);

    if (!targetEval) return;

    await onModifyEvaluationAdmin({
      candidateId: selectedCandidateId,
      evaluationId: targetEval.id,
      field: `${targetCandidate?.name} 기술 평가 점수 수정`,
      beforeVal: { technical: targetEval.scores.technical },
      afterVal: { technical: editScoreTech },
      reason: editReason,
      newScores: { ...targetEval.scores, technical: editScoreTech },
      modifiedBy: '관리자 (admin)'
    });

    setIsSuccessMsg(true);
    setTimeout(() => setIsSuccessMsg(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                관리자 예외 승인 & 무결성 감사 로그 (Audit Log)
              </h2>
              <p className="text-xs text-slate-400">
                완료된 면접 수정 잠금 원칙 • 관리자 5분 한시적 수정 승인 및 변경 이력 추적
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Admin Unlock Control Box */}
          <div className={`p-4 rounded-xl border transition-all ${
            isUnlocked
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-5 h-5 ${isUnlocked ? 'text-amber-600 animate-pulse' : 'text-slate-500'}`} />
                <h3 className="font-bold text-sm text-slate-900">
                  5분 임시 수정 권한 (Admin Temporary Override)
                </h3>
              </div>

              {isUnlocked ? (
                <div className="flex items-center gap-2 bg-amber-200/70 text-amber-950 px-3 py-1 rounded-full font-mono font-bold text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-800" />
                  남은 시간: {Math.floor(remainingSeconds / 60)}분 {String(remainingSeconds % 60).padStart(2, '0')}초
                </div>
              ) : (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                  잠금 활성화 (Read-Only)
                </span>
              )}
            </div>

            {!isUnlocked ? (
              <form onSubmit={handleLoginUnlock} className="flex items-end gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">관리자 ID</label>
                  <input
                    type="text"
                    value={adminId}
                    onChange={e => setAdminId(e.target.value)}
                    placeholder="관리자 ID 입력"
                    className="w-32 px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">관리자 비밀번호</label>
                  <input
                    type="password"
                    value={adminPw}
                    onChange={e => setAdminPw(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="w-36 px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  5분간 수정 권한 승인
                </button>
              </form>
            ) : (
              <div className="space-y-3 pt-2 border-t border-amber-200">
                <div className="text-xs text-amber-900 font-medium">
                  ⚠️ 관리자 권한이 활성화되었습니다. 수정되는 모든 사항은 타임스탬프와 함께 감사 로그(Audit Log)에 영구 기록됩니다.
                </div>

                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-amber-200 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">수정 대상 지원자</label>
                    <select
                      value={selectedCandidateId}
                      onChange={e => setSelectedCandidateId(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded font-semibold"
                    >
                      {candidates.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.track} - {c.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">기술 점수 변경</label>
                    <input
                      type="number"
                      value={editScoreTech}
                      onChange={e => setEditScoreTech(Number(e.target.value))}
                      className="w-24 px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block font-bold text-slate-700 mb-1">정정 사유</label>
                    <input
                      type="text"
                      value={editReason}
                      onChange={e => setEditReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAdminScoreEdit}
                    className="self-end px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    수정 및 감사기록
                  </button>
                </div>

                {isSuccessMsg && (
                  <div className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    수정 사항이 저장되고 감사 로그에 기록되었습니다.
                  </div>
                )}
              </div>
            )}

            {authError && (
              <p className="text-xs text-red-600 mt-2 font-medium">{authError}</p>
            )}
          </div>

          {/* 2. Audit Log Timeline Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                감사 로그 타임라인 (Audit Trail Log)
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                총 {auditLogs.length}건의 변경 이력
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3">일시 (Timestamp)</th>
                    <th className="py-2.5 px-3">수행자 (Operator)</th>
                    <th className="py-2.5 px-3">변경 항목</th>
                    <th className="py-2.5 px-3">변경 전 ➔ 변경 후</th>
                    <th className="py-2.5 px-3">사유</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {log.modifiedBy}
                      </td>
                      <td className="py-2.5 px-3 text-blue-700 font-semibold">
                        {log.field}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <span className="text-red-600 bg-red-50 px-1 py-0.5 rounded">
                          {JSON.stringify(log.beforeVal)}
                        </span>
                        {' ➔ '}
                        <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-bold">
                          {JSON.stringify(log.afterVal)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {log.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-md hover:bg-slate-800 transition-colors text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
