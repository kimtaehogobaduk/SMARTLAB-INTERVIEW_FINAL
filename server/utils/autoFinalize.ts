import { db } from '../db';
import { getKSTDateTimeStr, getKSTTimeStr } from './kst';

export function checkAndAutoFinalizeReopenedCandidates(): boolean {
  const now = Date.now();
  let changed = false;
  db.candidates.forEach(c => {
    if (c.reopenedUntil && now >= c.reopenedUntil) {
      c.status = 'COMPLETED';
      c.reopenedUntil = undefined;
      // Preserve initial completion time
      c.completedAt = c.initialCompletedAt || c.completedAt || getKSTDateTimeStr();
      c.isModifiedUnderAdmin = true;
      c.lastModifiedAt = getKSTDateTimeStr();

      // Auto-submit any unsubmitted evaluations for this candidate
      const evals = db.evaluations.filter(e => e.candidateId === c.id);
      evals.forEach(e => {
        if (e.status !== 'SUBMITTED') {
          e.status = 'SUBMITTED';
          e.submittedAt = e.submittedAt || getKSTDateTimeStr();
        }
      });

      db.auditLogs.unshift({
        id: `audit-auto-recomplete-${Date.now().toString(36)}`,
        timestamp: getKSTDateTimeStr(),
        modifiedBy: '시스템 자동화 (Admin 5분 수정 타이머 만료)',
        field: `${c.name} (${c.id}) 5분 수정 모드 만료 및 면접 자동 재완료`,
        beforeVal: { status: 'IN_PROGRESS' },
        afterVal: { status: 'COMPLETED', completedAt: c.completedAt },
        reason: `어드민이 허락한 5분 수정 시간이 종료되어 자동으로 면접 완료 상태로 복원되었습니다. (최초 면접 완료 시각: ${c.completedAt} 유지)`
      });

      if (!Array.isArray(db.notifications)) db.notifications = [];
      db.notifications.unshift({
        id: `notif-auto-comp-${Date.now().toString(36)}`,
        type: 'INTERVIEW_FINISHED',
        title: `✅ '${c.name}' 지원자 5분 수정 시간 종료 (자동 재완료)`,
        message: `관리자 승인 5분 수정 시간이 만료되어 면접이 원래 완료 시간(${c.completedAt})으로 자동 재완료되었습니다.`,
        timestamp: getKSTTimeStr(),
        createdAt: Date.now(),
        roomId: c.roomId,
        candidateId: c.id,
        candidateName: c.name,
        operatorName: '시스템 자동화'
      });

      changed = true;
    }
  });
  return changed;
}
