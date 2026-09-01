import { Router } from 'express';
import { db, saveCloudState, atomicUpsertEvaluation } from '../db';
import { getEffectiveAdminPassword } from './auth';
import { getKSTDateTimeStr, getKSTTimeStr } from '../utils/kst';
import { candidateMutex } from '../utils/mutex';
import { generateQualitativeSynthesisAI, generateCandidateDetailedReportAI } from '../ai';
import { Evaluation, InterviewerNameDisplayPolicy } from '../../src/types';

export const evaluationsRouter = Router();

// GET /api/candidates/:id/evaluations - Get candidate evaluations with blind protection
evaluationsRouter.get('/candidates/:id/evaluations', (req, res) => {
  const { id } = req.params;
  const { interviewerId, isAdmin } = req.query;

  const evals = db.evaluations.filter(e => e.candidateId === id);
  const candidate = db.candidates.find(c => c.id === id);
  const room = db.rooms.find(r => r.id === candidate?.roomId);
  const totalPanel = room?.interviewers?.length || candidate?.interviewers?.length || 1;

  const submittedEvals = evals.filter(e => e.status === 'SUBMITTED');
  const isAllSubmitted = submittedEvals.length >= totalPanel || candidate?.status === 'COMPLETED';

  if (isAdmin === 'true' || isAllSubmitted) {
    return res.json({ blind: false, evaluations: evals });
  }

  // Apply blind masking
  const masked = evals.map(e => {
    if (e.interviewerId === interviewerId) {
      return e;
    }
    return {
      id: e.id,
      candidateId: e.candidateId,
      roomId: e.roomId,
      interviewerId: e.interviewerId,
      interviewerName: e.interviewerName,
      status: e.status,
      submittedAt: e.submittedAt,
      scores: { technical: 0, problemSolving: 0, communication: 0, cultureFit: 0 },
      presentationBonuses: {},
      presentationBonusTotal: 0,
      presentationNote: '🔒 [블라인드 보호 중: 전원 평가 완료 후 열람 가능]',
      comments: {
        technicalNote: '🔒 [블라인드 보호 중: 전원 평가 완료 후 열람 가능]',
        attitudeNote: '🔒 [블라인드 보호 중: 전원 평가 완료 후 열람 가능]',
        overallComment: '🔒 [블라인드 보호 중: 전원 평가 완료 후 열람 가능]'
      }
    };
  });

  res.json({ blind: true, evaluations: masked });
});

// POST /api/candidates/:id/evaluations - Concurrency-safe atomic evaluation submit/update
evaluationsRouter.post('/candidates/:id/evaluations', async (req, res) => {
  const { id } = req.params;
  const incoming: Evaluation = req.body;
  incoming.candidateId = id;

  const candidate = db.candidates.find(c => c.id === id);
  const room = db.rooms.find(r => r.id === candidate?.roomId);

  // Check room criteria or global criteria confirmation
  const isCriteriaConfirmed =
    room && room.criteria && room.criteria.length > 0
      ? (room.isCriteriaConfirmed ?? false)
      : (db.settings.isCriteriaConfirmed ?? false);

  if (!isCriteriaConfirmed) {
    if (incoming.status === 'SUBMITTED') {
      return res.status(403).json({
        error: '어드민이 면접방의 평가 기준(가중치 및 배점 항목)을 확정하기 전에는 평가를 제출할 수 없습니다.',
        isCriteriaConfirmed: false
      });
    }
    return res.status(403).json({
      error: '면접방 평가 기준이 아직 관리자에 의해 확정되지 않아 점수가 반영되지 않습니다.',
      isCriteriaConfirmed: false
    });
  }

  const evalToSave: Evaluation = {
    ...incoming,
    id: incoming.id || `eval-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    submittedAt:
      incoming.status === 'SUBMITTED'
        ? incoming.submittedAt || new Date().toISOString()
        : incoming.submittedAt
  };

  // Perform atomic concurrency-safe upsert with candidateId lock queue
  const { evaluation, allCandidateEvaluations } = await atomicUpsertEvaluation(id, evalToSave);

  res.json({
    success: true,
    evaluation,
    evaluationsCount: allCandidateEvaluations.length
  });
});

// POST /api/admin/unlock-edit - Admin 5-min grace period unlock
evaluationsRouter.post('/admin/unlock-edit', async (req, res) => {
  const { password, candidateId, durationSeconds, operatorName } = req.body;
  if (password !== getEffectiveAdminPassword()) {
    return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
  }

  const duration = durationSeconds || 300; // 5 minutes
  db.adminUnlock = {
    candidateId: candidateId || null,
    expiresAt: Date.now() + duration * 1000
  };

  const targetCandidates = candidateId
    ? db.candidates.filter(c => c.id === candidateId)
    : db.candidates.filter(c => c.status === 'COMPLETED');

  targetCandidates.forEach(c => {
    if (!c.initialCompletedAt) {
      c.initialCompletedAt = c.completedAt || getKSTDateTimeStr();
    }
    c.completedAt = c.initialCompletedAt;
    c.status = 'IN_PROGRESS';
    c.reopenedUntil = db.adminUnlock.expiresAt;
    c.reopenedAt = getKSTDateTimeStr();
    c.reopenedBy = operatorName || '동아리 총괄 관리자 (Admin)';
    c.isModifiedUnderAdmin = true;
    c.lastModifiedAt = getKSTDateTimeStr();

    db.evaluations.filter(e => e.candidateId === c.id).forEach(e => {
      e.status = 'IN_PROGRESS';
    });
  });

  db.auditLogs.unshift({
    id: `audit-unlock-${Date.now().toString(36)}`,
    timestamp: getKSTDateTimeStr(),
    modifiedBy: operatorName || '관리자 (admin)',
    field: '관리자 5분 수정 권한 활성화 및 완료 취소',
    beforeVal: { locked: true },
    afterVal: {
      locked: false,
      expiresAt: getKSTDateTimeStr(db.adminUnlock.expiresAt),
      candidatesReopened: targetCandidates.map(c => c.name)
    },
    reason: `면접건(${candidateId || '전체'}) 데이터 사후 정정을 위한 5분간 임시 완료 취소 및 수정 권한 활성화 (최초 완료 시간 보존)`
  });

  if (!Array.isArray(db.notifications)) db.notifications = [];
  db.notifications.unshift({
    id: `notif-admin-unlock-${Date.now().toString(36)}`,
    type: 'ADMIN_ALERT',
    title: '⚠️ [관리자 권한] 5분간 면접 수정 모드 활성화',
    message: '관리자 승인으로 5분간 면접 완료가 취소되고 수정이 가능합니다. 5분 후 원래 완료 시간으로 자동 재완료됩니다.',
    timestamp: getKSTTimeStr(),
    createdAt: Date.now(),
    operatorName: operatorName || '동아리 총괄 관리자 (Admin)'
  });

  await saveCloudState();

  res.json({
    success: true,
    expiresAt: db.adminUnlock.expiresAt,
    remainingSeconds: duration,
    candidates: db.candidates
  });
});

// POST /api/admin/modify-evaluation - Admin direct override of evaluation
evaluationsRouter.post('/admin/modify-evaluation', async (req, res) => {
  const { candidateId, evaluationId, field, beforeVal, afterVal, reason, modifiedBy } = req.body;

  const isUnlocked = db.adminUnlock.expiresAt && db.adminUnlock.expiresAt > Date.now();
  if (!isUnlocked) {
    return res.status(403).json({ error: '관리자 수정 권한 시간이 만료되었거나 활성화되지 않았습니다.' });
  }

  return candidateMutex.runExclusive(candidateId, async () => {
    const candidate = db.candidates.find(c => c.id === candidateId);
    if (candidate) {
      candidate.isModifiedUnderAdmin = true;
      candidate.lastModifiedAt = getKSTDateTimeStr();
    }

    const evalItem = db.evaluations.find(
      e => e.id === evaluationId || (e.candidateId === candidateId && e.interviewerId === req.body.interviewerId)
    );
    if (evalItem && field && afterVal !== undefined) {
      if (field.startsWith('scores.')) {
        const scoreKey = field.replace('scores.', '') as keyof typeof evalItem.scores;
        evalItem.scores[scoreKey] = Number(afterVal);
      } else if (field.startsWith('presentationBonuses.')) {
        const bonusKey = field.replace('presentationBonuses.', '');
        if (!evalItem.presentationBonuses) evalItem.presentationBonuses = {};
        evalItem.presentationBonuses[bonusKey] = Number(afterVal);
        evalItem.presentationBonusTotal = Object.values(evalItem.presentationBonuses).reduce(
          (a, b) => a + (Number(b) || 0),
          0
        );
      } else if (field === 'presentationNote') {
        evalItem.presentationNote = String(afterVal);
      } else if (field.startsWith('comments.')) {
        const commentKey = field.replace('comments.', '') as keyof typeof evalItem.comments;
        (evalItem.comments as any)[commentKey] = String(afterVal);
      }
    }

    db.auditLogs.unshift({
      id: `audit-mod-${Date.now().toString(36)}`,
      timestamp: getKSTDateTimeStr(),
      modifiedBy: modifiedBy || '관리자 (admin)',
      field: `[관리자 직권 수정] ${field}`,
      beforeVal,
      afterVal,
      reason: reason || '관리자 직권 점수/의견 정정'
    });

    await saveCloudState();
    res.json({ success: true, evaluations: db.evaluations.filter(e => e.candidateId === candidateId) });
  });
});

// POST /api/admin/complete-all-interviews - Complete all interviews & generate background reports
evaluationsRouter.post('/admin/complete-all-interviews', async (req, res) => {
  try {
    const {
      operatorName,
      isResultsPublished = true,
      showPassFailToCandidates = true,
      interviewerNameDisplayPolicy = 'LEADERS_ONLY',
      showStatsToCandidates = true,
      showDetailedComments = true
    } = req.body || {};

    db.settings.isAllInterviewsCompleted = true;
    db.settings.allInterviewsCompletedAt = getKSTDateTimeStr();
    db.settings.allInterviewsCompletedBy = operatorName || '관리자 (Admin)';
    db.settings.isResultsPublished = Boolean(isResultsPublished);
    db.settings.resultsPublishedAt = isResultsPublished ? getKSTDateTimeStr() : undefined;
    db.settings.resultsPublishedBy = isResultsPublished ? operatorName || '관리자 (Admin)' : undefined;
    db.settings.showPassFailToCandidates = Boolean(showPassFailToCandidates);
    db.settings.interviewerNameDisplayPolicy = interviewerNameDisplayPolicy as InterviewerNameDisplayPolicy;
    db.settings.showStatsToCandidates = Boolean(showStatsToCandidates);
    db.settings.showDetailedComments = Boolean(showDetailedComments);

    db.candidates.forEach(c => {
      if (c.status !== 'NO_SHOW') {
        if (!c.initialCompletedAt) {
          c.initialCompletedAt = c.completedAt || getKSTDateTimeStr();
        }
        c.completedAt = c.initialCompletedAt;
        c.status = 'COMPLETED';
      }
    });

    (async () => {
      for (const cand of db.candidates) {
        const candEvals = db.evaluations.filter(e => e.candidateId === cand.id);
        const room = db.rooms.find(r => r.id === cand.roomId);
        const critList = room?.criteria || db.settings.criteria || [];

        if (!cand.qualitativeAiSummary) {
          try {
            cand.qualitativeAiSummary = await generateQualitativeSynthesisAI(cand, candEvals, {
              knowledgeBase: db.settings.knowledgeBase
            });
          } catch (e) {
            console.error(`AI qualitative summary failed for ${cand.name}:`, e);
          }
        }

        if (!(cand as any).detailedAiReport) {
          try {
            (cand as any).detailedAiReport = await generateCandidateDetailedReportAI(cand, candEvals, critList, {
              knowledgeBase: db.settings.knowledgeBase
            });
          } catch (e) {
            console.error(`AI detailed report failed for ${cand.name}:`, e);
          }
        }
      }
      await saveCloudState();
    })().catch(e => console.error('Background AI report batch error:', e));

    db.auditLogs.unshift({
      id: `audit-all-comp-${Date.now().toString(36)}`,
      timestamp: getKSTDateTimeStr(),
      modifiedBy: operatorName || '관리자 (Admin)',
      field: '모든 면접 완료 및 결과 공개 상태 설정',
      beforeVal: { isAllCompleted: false, isResultsPublished: false },
      afterVal: {
        isAllCompleted: true,
        isResultsPublished: db.settings.isResultsPublished,
        showPassFail: db.settings.showPassFailToCandidates,
        interviewerPolicy: db.settings.interviewerNameDisplayPolicy
      },
      reason: '어드민이 모든 면접 평가를 공식 종료 처리하고 학생 성적표/결과 공개 정책을 활성화함'
    });

    if (!Array.isArray(db.notifications)) db.notifications = [];
    db.notifications.unshift({
      id: `notif-all-comp-${Date.now().toString(36)}`,
      type: 'ADMIN_ALERT',
      title: '🏁 모든 면접 평가 공식 완료 및 결과 발표',
      message: `관리자가 전체 면접 평가를 공식 완료 처리했습니다. (결과 공개: ${db.settings.isResultsPublished ? '공개됨' : '비공개'}, 합불공개: ${db.settings.showPassFailToCandidates ? 'ON' : 'OFF'}, 면접관표시: ${db.settings.interviewerNameDisplayPolicy})`,
      timestamp: getKSTTimeStr(),
      createdAt: Date.now()
    });

    await saveCloudState();

    return res.json({
      success: true,
      settings: db.settings,
      completedCandidateCount: db.candidates.filter(c => c.status === 'COMPLETED').length
    });
  } catch (err: any) {
    console.error('Complete all interviews error:', err);
    return res.status(500).json({ error: '모든 면접 완료 처리 중 오류가 발생했습니다.' });
  }
});

// POST /api/admin/publish-results - Publish / Unpublish result policies
evaluationsRouter.post('/admin/publish-results', async (req, res) => {
  try {
    const {
      isResultsPublished,
      showPassFailToCandidates,
      interviewerNameDisplayPolicy,
      showStatsToCandidates,
      showDetailedComments,
      operatorName
    } = req.body || {};

    if (isResultsPublished !== undefined) {
      db.settings.isResultsPublished = Boolean(isResultsPublished);
      if (db.settings.isResultsPublished) {
        db.settings.resultsPublishedAt = getKSTDateTimeStr();
        db.settings.resultsPublishedBy = operatorName || '관리자 (Admin)';
      }
    }
    if (showPassFailToCandidates !== undefined) {
      db.settings.showPassFailToCandidates = Boolean(showPassFailToCandidates);
    }
    if (interviewerNameDisplayPolicy !== undefined) {
      db.settings.interviewerNameDisplayPolicy = interviewerNameDisplayPolicy as InterviewerNameDisplayPolicy;
    }
    if (showStatsToCandidates !== undefined) {
      db.settings.showStatsToCandidates = Boolean(showStatsToCandidates);
    }
    if (showDetailedComments !== undefined) {
      db.settings.showDetailedComments = Boolean(showDetailedComments);
    }

    db.auditLogs.unshift({
      id: `audit-pub-res-${Date.now().toString(36)}`,
      timestamp: getKSTDateTimeStr(),
      modifiedBy: operatorName || '관리자 (Admin)',
      field: '학생 결과 공개 설정 변경',
      beforeVal: null,
      afterVal: {
        isResultsPublished: db.settings.isResultsPublished,
        showPassFail: db.settings.showPassFailToCandidates,
        interviewerPolicy: db.settings.interviewerNameDisplayPolicy,
        showStats: db.settings.showStatsToCandidates,
        showComments: db.settings.showDetailedComments
      },
      reason: '어드민이 학생 대상 성적표/결과 공개 설정 옵션을 정정함'
    });

    await saveCloudState();
    return res.json({ success: true, settings: db.settings });
  } catch (err: any) {
    return res.status(500).json({ error: '결과 공개 설정 변경 중 오류가 발생했습니다.' });
  }
});
