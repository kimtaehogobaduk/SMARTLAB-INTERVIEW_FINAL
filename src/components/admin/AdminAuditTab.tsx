import React from 'react';
import { Shield } from 'lucide-react';
import { AuditLog } from '../../types';

interface AdminAuditTabProps {
  auditLogs?: AuditLog[];
}

export const AdminAuditTab: React.FC<AdminAuditTabProps> = ({ auditLogs = [] }) => {
  return (
    <div className="max-w-6xl w-full mx-auto mt-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-400" />
            <span>시스템 감사 로그 (Audit Trail)</span>
          </h3>
          <p className="text-xs text-slate-400">
            평가 기준 변경, 점수 수정, 관리자 해제 등 모든 시스템 변경 이력이 클라우드에 영구 기록됩니다.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
          총 {auditLogs.length}건
        </span>
      </div>

      <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">기록된 감사 로그가 없습니다.</div>
        ) : (
          auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{log.field}</span>
                  <span className="px-2 py-0.2 rounded-md text-[10px] bg-slate-700 text-slate-300 font-mono">
                    {log.modifiedBy}
                  </span>
                </div>
                {log.reason && (
                  <p className="text-[11px] text-slate-400">{log.reason}</p>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                {log.timestamp}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
