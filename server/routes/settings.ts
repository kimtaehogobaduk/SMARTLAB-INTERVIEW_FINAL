import { Router } from 'express';
import { db, saveCloudState } from '../db';
import { getEffectiveAdminPassword } from './auth';
import { getKSTDateTimeStr, getKSTTimeStr } from '../utils/kst';
import {
  PlatformSettings,
  LeadershipMember,
  LeadershipRole,
  InterviewerPresence,
  LiveNotification
} from '../../src/types';

export const settingsRouter = Router();

export function getInterviewerLeadershipRole(name: string): LeadershipRole {
  if (!name || !db.settings?.leadership) return 'NONE';
  const clean = name.replace(/(\s*(면접관|심사위원|님|대표|위원))+$/g, '').trim().toLowerCase();
  if (!clean) return 'NONE';

  const cap = db.settings.leadership.captain;
  if (
    cap &&
    cap.name &&
    cap.name.replace(/(\s*(면접관|심사위원|님|대표|위원))+$/g, '').trim().toLowerCase() === clean
  ) {
    return 'CAPTAIN';
  }

  const vcs = db.settings.leadership.viceCaptains || [];
  for (const vc of vcs) {
    if (
      vc &&
      vc.name &&
      vc.name.replace(/(\s*(면접관|심사위원|님|대표|위원))+$/g, '').trim().toLowerCase() === clean
    ) {
      return 'VICE_CAPTAIN';
    }
  }
  return 'NONE';
}

// GET /api/settings - Retrieve global settings
settingsRouter.get('/', (req, res) => {
  res.json(db.settings);
});

// POST /api/settings - Update global settings
settingsRouter.post('/', async (req, res) => {
  const newSettings: Partial<PlatformSettings> = req.body;
  const prevConfirmed = db.settings.isCriteriaConfirmed;

  db.settings = { ...db.settings, ...newSettings };

  if (newSettings.criteria && Array.isArray(newSettings.criteria)) {
    const weightsObj: Record<string, number> = {};
    newSettings.criteria.forEach(c => {
      weightsObj[c.id] = c.weight;
    });
    db.settings.weights = weightsObj;
  }

  if (newSettings.isCriteriaConfirmed !== undefined && newSettings.isCriteriaConfirmed !== prevConfirmed) {
    db.auditLogs.unshift({
      id: `audit-crit-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      modifiedBy: '관리자 (Admin)',
      field: '평가 기준 확정 상태 변경',
      beforeVal: { isCriteriaConfirmed: prevConfirmed },
      afterVal: { isCriteriaConfirmed: db.settings.isCriteriaConfirmed },
      reason: db.settings.isCriteriaConfirmed
        ? '어드민이 평가 기준 및 가중 합산 항목을 최종 확정하고 평가 권한을 활성화함'
        : '어드민이 평가 기준을 수정 모드로 전환하여 면접관 평가를 일시 잠금함'
    });
  }

  await saveCloudState();
  res.json(db.settings);
});

// POST /api/settings/confirm-criteria - Finalize criteria
settingsRouter.post('/confirm-criteria', async (req, res) => {
  const { password, adminPassword, criteria, scoringFormula, passThresholdScore, adminName, confirmedBy } = req.body;
  const pwd = password || adminPassword;
  if (pwd !== getEffectiveAdminPassword()) {
    return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
  }

  if (!Array.isArray(criteria) || criteria.length === 0) {
    return res.status(400).json({ error: '최소 1개 이상의 평가 기준 항목이 필요합니다.' });
  }

  const totalWeight = criteria.reduce((sum: number, c: any) => sum + (Number(c.weight) || 0), 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    return res.status(400).json({ error: `가중치 합계는 정확히 100%이어야 합니다. (현재: ${totalWeight}%)` });
  }

  const weightsObj: Record<string, number> = {};
  criteria.forEach((c: any) => {
    weightsObj[c.id] = Number(c.weight);
  });

  const operator = adminName || confirmedBy || '동아리 관리자 (Admin)';
  db.settings.isCriteriaConfirmed = true;
  db.settings.criteriaConfirmedAt = new Date().toLocaleString('ko-KR', { hour12: false });
  db.settings.criteriaConfirmedBy = operator;
  db.settings.criteria = criteria;
  db.settings.weights = weightsObj;
  if (scoringFormula) db.settings.scoringFormula = scoringFormula;
  if (passThresholdScore !== undefined) db.settings.passThresholdScore = Number(passThresholdScore);

  db.auditLogs.unshift({
    id: `audit-crit-confirm-${Date.now().toString(36)}`,
    timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
    modifiedBy: operator,
    field: '평가 기준 및 가중치 공식 최종 확정',
    beforeVal: { confirmed: false },
    afterVal: {
      confirmed: true,
      criteriaCount: criteria.length,
      scoringFormula: db.settings.scoringFormula,
      passThreshold: db.settings.passThresholdScore,
      weights: weightsObj
    },
    reason: `어드민이 ${criteria.length}개 평가 항목에 대한 가중 합산 기준을 최종 확정하고 전 면접관 평가를 개시함`
  });

  await saveCloudState();
  res.json({ success: true, settings: db.settings });
});

// POST /api/settings/unconfirm-criteria - Unconfirm criteria for editing
settingsRouter.post('/unconfirm-criteria', async (req, res) => {
  const { password, adminPassword, adminName, operatorName } = req.body;
  const pwd = password || adminPassword;
  if (pwd !== getEffectiveAdminPassword()) {
    return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
  }

  const operator = adminName || operatorName || '관리자 (Admin)';
  db.settings.isCriteriaConfirmed = false;
  db.auditLogs.unshift({
    id: `audit-crit-unconfirm-${Date.now().toString(36)}`,
    timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
    modifiedBy: operator,
    field: '평가 기준 수정 모드 전환 (평가 일시 잠금)',
    beforeVal: { confirmed: true },
    afterVal: { confirmed: false },
    reason: '어드민이 평가 기준 항목/가중치를 재조정하기 위해 기준을 미확정 상태로 전환함'
  });

  await saveCloudState();
  res.json({ success: true, settings: db.settings });
});

// GET /api/leadership - Get leadership team
settingsRouter.get('/leadership', (req, res) => {
  if (!db.settings.leadership) {
    db.settings.leadership = { captain: null, viceCaptains: [] };
  }
  res.json(db.settings.leadership);
});

// POST /api/leadership/update - Update leadership team
settingsRouter.post('/leadership/update', async (req, res) => {
  const { captain, viceCaptains, updatedBy } = req.body;

  if (!db.settings.leadership) {
    db.settings.leadership = { captain: null, viceCaptains: [] };
  }

  const prevCaptain = db.settings.leadership.captain;
  const prevViceCaptains = db.settings.leadership.viceCaptains || [];

  let validatedCaptain: LeadershipMember | null = null;
  if (captain && captain.name && captain.name.trim()) {
    validatedCaptain = {
      id: captain.id || `lead-cap-${Date.now()}`,
      name: captain.name.trim(),
      role: 'CAPTAIN',
      appointedAt: captain.appointedAt || getKSTDateTimeStr(),
      appointedBy: updatedBy || '총괄 관리자 (Admin)',
      memo: captain.memo || ''
    };
  }

  let validatedViceCaptains: LeadershipMember[] = [];
  if (Array.isArray(viceCaptains)) {
    const filtered = viceCaptains.filter(v => v && v.name && v.name.trim()).slice(0, 2);

    validatedViceCaptains = filtered.map((v, idx) => ({
      id: v.id || `lead-vc-${Date.now()}-${idx}`,
      name: v.name.trim(),
      role: 'VICE_CAPTAIN',
      appointedAt: v.appointedAt || getKSTDateTimeStr(),
      appointedBy: updatedBy || '총괄 관리자 (Admin)',
      memo: v.memo || ''
    }));
  }

  if (validatedCaptain) {
    const capClean = validatedCaptain.name.trim().toLowerCase();
    validatedViceCaptains = validatedViceCaptains.filter(v => v.name.trim().toLowerCase() !== capClean);
  }

  db.settings.leadership = {
    captain: validatedCaptain,
    viceCaptains: validatedViceCaptains
  };

  db.auditLogs.unshift({
    id: `audit-lead-${Date.now().toString(36)}`,
    timestamp: getKSTDateTimeStr(),
    modifiedBy: updatedBy || '총괄 관리자 (Admin)',
    field: '동아리 임원진 (기장/부기장) 임명 업데이트',
    beforeVal: {
      captain: prevCaptain?.name || '미임명',
      viceCaptains: prevViceCaptains.map(v => v.name).join(', ') || '없음'
    },
    afterVal: {
      captain: validatedCaptain?.name || '미임명',
      viceCaptains: validatedViceCaptains.map(v => v.name).join(', ') || '없음'
    },
    reason: `동아리 임원진 임명 업데이트 (기장: ${validatedCaptain?.name || '미임명'}, 부기장: ${
      validatedViceCaptains.map(v => v.name).join(', ') || '없음'
    })`
  });

  const capName = validatedCaptain ? validatedCaptain.name : '미임명';
  const vcNames = validatedViceCaptains.length > 0 ? validatedViceCaptains.map(v => v.name).join(', ') : '없음';

  if (!Array.isArray(db.notifications)) db.notifications = [];
  db.notifications.unshift({
    id: `notif-lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'ADMIN_ALERT',
    actionType: 'leadership_update',
    title: '👑 SmartLab 임원진 (기장/부기장) 임명 안내',
    message: `관리자에 의해 기장 [${capName}], 부기장 [${vcNames}] 임명이 완료되었습니다.`,
    timestamp: getKSTTimeStr(),
    createdAt: Date.now(),
    operatorName: updatedBy || '총괄 관리자'
  });

  await saveCloudState();
  res.json({ success: true, leadership: db.settings.leadership });
});

// GET /api/presence - Query presence status
settingsRouter.get('/presence', (req, res) => {
  const { roomId, candidateId } = req.query;
  const now = Date.now();

  if (!Array.isArray(db.presences)) {
    db.presences = [];
  }

  const relevant = db.presences.filter(p => {
    if (candidateId && p.candidateId === candidateId) return true;
    if (roomId && p.roomId === roomId) return true;
    return false;
  });

  const results = relevant.map(p => {
    const isRecent = now - p.lastActiveAt < 18000;
    let effectiveMode: 'evaluating' | 'observing' | 'left' = p.mode;
    if (!isRecent || p.mode === 'left') {
      effectiveMode = 'left';
    }
    return {
      ...p,
      leadershipRole: p.leadershipRole || getInterviewerLeadershipRole(p.interviewerName),
      mode: effectiveMode,
      isOnline: isRecent && p.mode !== 'left'
    };
  });

  res.json(results);
});

// POST /api/presence/heartbeat - Heartbeat ping
settingsRouter.post('/presence/heartbeat', async (req, res) => {
  const { interviewerId, interviewerName, roomId, candidateId, mode } = req.body;
  if (!interviewerId) return res.status(400).json({ error: 'Missing interviewerId' });

  if (!Array.isArray(db.presences)) {
    db.presences = [];
  }

  const now = Date.now();
  const existingIndex = db.presences.findIndex(
    p => p.interviewerId === interviewerId && (p.candidateId === candidateId || p.roomId === roomId)
  );

  const leadershipRole = getInterviewerLeadershipRole(interviewerName || '');

  const presenceItem: InterviewerPresence = {
    interviewerId,
    interviewerName: interviewerName || '면접관',
    leadershipRole,
    roomId,
    candidateId,
    mode: mode === 'observing' ? 'observing' : 'evaluating',
    lastActiveAt: now
  };

  if (existingIndex >= 0) {
    db.presences[existingIndex] = presenceItem;
  } else {
    db.presences.push(presenceItem);
  }

  db.presences = db.presences.filter(p => now - p.lastActiveAt < 600000);
  res.json({ success: true, presence: presenceItem });
});

// POST /api/presence/leave - Mark as left
settingsRouter.post('/presence/leave', async (req, res) => {
  const { interviewerId, candidateId, roomId } = req.body;
  if (!interviewerId) return res.status(400).json({ error: 'Missing interviewerId' });

  if (Array.isArray(db.presences)) {
    const target = db.presences.find(
      p => p.interviewerId === interviewerId && (p.candidateId === candidateId || p.roomId === roomId)
    );
    if (target) {
      target.mode = 'left';
      target.lastActiveAt = Date.now() - 30000;
    }
  }
  res.json({ success: true });
});

// GET /api/notifications - Realtime notifications
settingsRouter.get('/notifications', (req, res) => {
  const { since } = req.query;
  if (since) {
    const sinceTime = Number(since);
    const filtered = (db.notifications || []).filter(n => n.createdAt > sinceTime);
    return res.json(filtered);
  }
  res.json((db.notifications || []).slice(0, 20));
});

// POST /api/notifications/clear - Clear notifications
settingsRouter.post('/notifications/clear', async (req, res) => {
  db.notifications = [];
  await saveCloudState();
  res.json({ success: true });
});

// POST /api/notifications/action - Broadcast interviewer action
settingsRouter.post('/notifications/action', async (req, res) => {
  const { actionType, operatorId, operatorName, roomId, roomName, candidateId, candidateName, customMessage } =
    req.body;

  const rawName = operatorName || '면접관';
  const cleanName =
    rawName.replace(/^(면접관\s*\d*\s*\(?|\(?총괄\s*관리자\s*\(?)/, '').replace(/[\)\(]/g, '').trim() || rawName;

  const leadershipRole = getInterviewerLeadershipRole(cleanName);
  const leaderPrefix =
    leadershipRole === 'CAPTAIN' ? '👑 [기장] ' : leadershipRole === 'VICE_CAPTAIN' ? '⭐ [부기장] ' : '';

  let notifType: any = 'INTERVIEWER_ACTION';
  let title = '';
  let message = '';

  if (actionType === 'question') {
    notifType = 'QUESTION_INTENT';
    title = `${leaderPrefix}${cleanName} 면접관이 먼저 질문합니다`;
    message = customMessage || `${cleanName} 면접관이 발언권을 얻어 먼저 질문을 진행합니다.`;
  } else if (actionType === 'suspicion') {
    notifType = 'SUSPICION_ALERT';
    title = `${leaderPrefix}${cleanName} 면접관이 의심/팩트체크 신호를 보냈습니다`;
    message = customMessage || '지원자의 답변 또는 서류 기재 내용에 대한 진위 확인 및 심층 검증이 권장됩니다.';

    if (candidateId) {
      const cand = db.candidates.find(c => c.id === candidateId);
      if (cand) {
        if (!cand.aiInsights) cand.aiInsights = { realtimeSummaries: [], tailQuestions: [], contradictions: [] };
        if (!cand.aiInsights.contradictions) cand.aiInsights.contradictions = [];
        cand.aiInsights.contradictions.unshift({
          id: `susp-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
          point: `${cleanName} 면접관의 실시간 팩트체크/의심 신호`,
          context: customMessage || '지원자의 직전 답변에 대해 동료 면접관이 추가 검증 필요성을 제기함'
        });
      }
    }
  } else if (actionType === 'tail_question') {
    notifType = 'TAIL_QUESTION_REQUEST';
    title = `${leaderPrefix}${cleanName} 면접관이 AI 꼬리질문 활용을 제안했습니다`;
    message = customMessage || 'AI 콘솔의 실시간 심층 검증 질문을 확인해보세요.';
  } else if (actionType === 'yield') {
    notifType = 'YIELD_FLOOR';
    title = `${leaderPrefix}${cleanName} 면접관이 질문 순서를 양보했습니다`;
    message = customMessage || '다른 면접관님께서 질문을 이어가실 수 있습니다.';
  } else if (actionType === 'time_check') {
    notifType = 'TIME_ALERT';
    title = `${leaderPrefix}${cleanName} 면접관이 면접 시간 준수를 상기시켰습니다`;
    message = customMessage || '배정된 면접 시간을 확인하고 마무리를 준비해주세요.';
  } else {
    title = `${leaderPrefix}${cleanName} 면접관의 행동 신호: ${actionType}`;
    message = customMessage || `${cleanName} 면접관이 알림을 전송했습니다.`;
  }

  const actionNotif: LiveNotification = {
    id: `act-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    type: notifType,
    actionType,
    title,
    message,
    timestamp: getKSTTimeStr(),
    createdAt: Date.now(),
    roomId,
    roomName,
    candidateId: candidateId || '',
    candidateName: candidateName || '',
    operatorId,
    operatorName: cleanName,
    operatorLeadershipRole: leadershipRole
  };

  if (!Array.isArray(db.notifications)) db.notifications = [];
  db.notifications.unshift(actionNotif);
  if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);

  await saveCloudState();
  res.status(201).json({ success: true, notification: actionNotif });
});
