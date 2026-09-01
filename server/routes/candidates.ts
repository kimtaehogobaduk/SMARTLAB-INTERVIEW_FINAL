import { Router } from 'express';
import { db, saveCloudState, SHARED_GDOC_LINK, atomicUpsertEvaluation } from '../db';
import { getKSTDateTimeStr, getKSTTimeStr } from '../utils/kst';
import { checkAndAutoFinalizeReopenedCandidates } from '../utils/autoFinalize';
import { candidateMutex } from '../utils/mutex';
import {
  generateQualitativeSynthesisAI,
  generateMindMapAI,
  generateRealtimeFeedbackAI
} from '../ai';
import {
  Candidate,
  DocumentItem,
  LiveNotification,
  Evaluation,
  TailQuestion,
  InterviewerChatMessage
} from '../../src/types';

export const candidatesRouter = Router();

// GET /api/candidates - List candidates with optional roomId filtering
candidatesRouter.get('/', (req, res) => {
  checkAndAutoFinalizeReopenedCandidates();
  const { roomId } = req.query;
  if (roomId && typeof roomId === 'string') {
    res.json(db.candidates.filter(c => !c.roomId || c.roomId === roomId));
  } else {
    res.json(db.candidates);
  }
});

// GET /api/candidates/:id - Get candidate by ID
candidatesRouter.get('/:id', (req, res) => {
  checkAndAutoFinalizeReopenedCandidates();
  const candidate = db.candidates.find(c => c.id === req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  res.json(candidate);
});

// POST /api/candidates/:id/documents - Add document
candidatesRouter.post('/:id/documents', async (req, res) => {
  const { id } = req.params;
  const newDoc: DocumentItem = req.body;

  return candidateMutex.runExclusive(id, async () => {
    const candidate = db.candidates.find(c => c.id === id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    if (!Array.isArray(candidate.documents)) {
      candidate.documents = [];
    }

    if (!newDoc.id) {
      newDoc.id = `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    }
    if (!newDoc.uploadedAt) {
      newDoc.uploadedAt = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    }

    candidate.documents.push(newDoc);
    await saveCloudState();
    res.status(201).json({ success: true, documents: candidate.documents, addedDocument: newDoc });
  });
});

// DELETE /api/candidates/:id/documents/:docId - Remove document
candidatesRouter.delete('/:id/documents/:docId', async (req, res) => {
  const { id, docId } = req.params;

  return candidateMutex.runExclusive(id, async () => {
    const candidate = db.candidates.find(c => c.id === id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    if (Array.isArray(candidate.documents)) {
      const idx = candidate.documents.findIndex(d => d.id === docId);
      if (idx >= 0) {
        const removed = candidate.documents.splice(idx, 1)[0];
        await saveCloudState();
        return res.json({ success: true, documents: candidate.documents, removedDocument: removed });
      }
    }
    res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  });
});

// POST /api/candidates - Create single candidate
candidatesRouter.post('/', async (req, res) => {
  const newCandidate: Candidate = req.body;
  if (!newCandidate.name || !newCandidate.name.trim()) {
    return res.status(400).json({ error: '지원자 이름이 필요합니다.' });
  }

  // 1. Check if identical candidate ID already exists
  if (newCandidate.id) {
    const existingById = db.candidates.find(c => c.id === newCandidate.id);
    if (existingById) {
      Object.assign(existingById, newCandidate);
      await saveCloudState();
      return res.status(200).json(existingById);
    }
  } else {
    newCandidate.id = `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  }

  // 2. Prevent accidental duplicate submission by room + (studentId or identical name created recently)
  const trimmedName = newCandidate.name.trim();
  const trimmedStudentId = newCandidate.studentId ? newCandidate.studentId.trim() : '';
  const candRoomId = newCandidate.roomId || '';

  const existingDuplicate = db.candidates.find(c => {
    const sameRoom = !candRoomId || !c.roomId || c.roomId === candRoomId;
    if (!sameRoom) return false;

    // Check studentId match if present
    if (trimmedStudentId && c.studentId && c.studentId.trim() === trimmedStudentId && c.name.trim() === trimmedName) {
      return true;
    }
    // Check identical name and timeslot if studentId matches or was randomly generated in same room
    if (c.name.trim() === trimmedName && c.timeslot?.start === newCandidate.timeslot?.start && c.timeslot?.end === newCandidate.timeslot?.end) {
      return true;
    }
    return false;
  });

  if (existingDuplicate) {
    // Update existing candidate rather than creating a duplicate
    Object.assign(existingDuplicate, newCandidate, { id: existingDuplicate.id });
    await saveCloudState();
    return res.status(200).json(existingDuplicate);
  }

  if (!newCandidate.sttTranscript) newCandidate.sttTranscript = [];
  if (!newCandidate.aiInsights) {
    newCandidate.aiInsights = { realtimeSummaries: [], tailQuestions: [], contradictions: [] };
  }
  if (!newCandidate.documents) newCandidate.documents = [];

  const SHARED_GDOC_URL =
    SHARED_GDOC_LINK ||
    'https://docs.google.com/document/d/1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4/edit?usp=drivesdk';
  const hasSharedDoc = newCandidate.documents.some(
    d => d.url && d.url.includes('1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4')
  );
  if (!hasSharedDoc) {
    newCandidate.documents.unshift({
      id: `gdoc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: '면접평가기준',
      type: 'gdocs',
      url: SHARED_GDOC_URL,
      fileSize: 'Google Docs (인앱 연동)',
      contentSnippet: '구글 닥스 면접평가기준 원본 (인앱 미리보기 지원)',
      rawText: `SmartLab 지원자 공식 구글 닥스 서류 링크: ${SHARED_GDOC_URL}`,
      uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false })
    });
  }

  db.candidates.push(newCandidate);
  await saveCloudState();
  res.status(201).json(newCandidate);
});

// POST /api/candidates/batch - Batch add candidates
candidatesRouter.post('/batch', async (req, res) => {
  const { candidates: newCandidates, roomId } = req.body;
  if (!Array.isArray(newCandidates) || newCandidates.length === 0) {
    return res.status(400).json({ error: '등록할 지원자 목록이 비어 있습니다.' });
  }

  const SHARED_GDOC_URL =
    SHARED_GDOC_LINK ||
    'https://docs.google.com/document/d/1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4/edit?usp=drivesdk';
  const added: Candidate[] = [];
  for (const c of newCandidates) {
    const docs = Array.isArray(c.documents) ? [...c.documents] : [];
    const hasSharedDoc = docs.some(d => d.url && d.url.includes('1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4'));
    if (!hasSharedDoc) {
      docs.unshift({
        id: `gdoc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: '면접평가기준',
        type: 'gdocs',
        url: SHARED_GDOC_URL,
        fileSize: 'Google Docs (인앱 연동)',
        contentSnippet: '구글 닥스 면접평가기준 원본 (인앱 미리보기 지원)',
        rawText: `SmartLab 지원자 공식 구글 닥스 서류 링크: ${SHARED_GDOC_URL}`,
        uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false })
      });
    }

    const targetRoomId = c.roomId || roomId || (c.timeslot?.room ? db.rooms.find(r => r.name === c.timeslot.room)?.id : undefined);
    const candidateId = c.id || `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // Check if duplicate exists
    const existingById = db.candidates.find(ex => ex.id === candidateId);
    if (existingById) {
      Object.assign(existingById, c, { roomId: targetRoomId, documents: docs });
      added.push(existingById);
      continue;
    }

    const candidate: Candidate = {
      ...c,
      id: candidateId,
      roomId: targetRoomId,
      status: c.status || 'PENDING',
      sttTranscript: c.sttTranscript || [],
      aiInsights: c.aiInsights || { realtimeSummaries: [], tailQuestions: [], contradictions: [] },
      documents: docs
    };
    db.candidates.push(candidate);
    added.push(candidate);
  }

  await saveCloudState();
  res.status(201).json({ success: true, addedCount: added.length, candidates: added });
});

// DELETE /api/candidates/:id - Delete single candidate
candidatesRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  return candidateMutex.runExclusive(id, async () => {
    const index = db.candidates.findIndex(c => c.id === id);
    if (index >= 0) {
      const removed = db.candidates.splice(index, 1)[0];
      db.evaluations = db.evaluations.filter(e => e.candidateId !== id);
      await saveCloudState();
      res.json({ success: true, removedCandidate: removed });
    } else {
      res.status(404).json({ error: 'Candidate not found' });
    }
  });
});

// POST /api/candidates/clear-all - Clear all candidates (or all in room)
candidatesRouter.post('/clear-all', async (req, res) => {
  const { roomId } = req.body;
  if (roomId) {
    db.candidates = db.candidates.filter(c => c.roomId !== roomId);
    db.evaluations = db.evaluations.filter(e => e.roomId !== roomId);
  } else {
    db.candidates = [];
    db.evaluations = [];
  }
  await saveCloudState();
  res.json({ success: true, message: '모든 지원자 데이터가 초기화되었습니다.' });
});

// POST /api/candidates/:id/status - Status transition with mutex lock
candidatesRouter.post('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { action, interviewerId, reason, operatorName } = req.body;

  return candidateMutex.runExclusive(id, async () => {
    const candidate = db.candidates.find(c => c.id === id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const oldStatus = candidate.status;

    if (action === 'start') {
      candidate.status = 'IN_PROGRESS';
      if (!candidate.startedAt) {
        candidate.startedAt = getKSTDateTimeStr();
      }
      candidate.interviewStartedTimestamp = Date.now();

      const room = db.rooms.find(r => r.id === candidate.roomId);
      const roomName = room?.name || room?.title || candidate.timeslot?.room || '면접실';
      const actorName = operatorName || '동료 면접관';

      if (!Array.isArray(db.notifications)) {
        db.notifications = [];
      }

      const notif: LiveNotification = {
        id: `notif-start-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'INTERVIEW_STARTED',
        title: `🎙️ '${candidate.name}' 지원자 면접 시작`,
        message: `${actorName}님이 [${roomName}]에서 ${candidate.name} 지원자의 면접을 시작했습니다.`,
        timestamp: getKSTTimeStr(),
        createdAt: Date.now(),
        roomId: candidate.roomId || room?.id,
        roomName: roomName,
        candidateId: candidate.id,
        candidateName: candidate.name,
        operatorId: interviewerId,
        operatorName: actorName
      };

      db.notifications.unshift(notif);
      db.notifications = db.notifications.slice(0, 50);
    } else if (action === 'admin_reopen_5min') {
      if (!candidate.initialCompletedAt) {
        candidate.initialCompletedAt = candidate.completedAt || getKSTDateTimeStr();
      }
      candidate.completedAt = candidate.initialCompletedAt;
      candidate.status = 'IN_PROGRESS';
      candidate.reopenedUntil = Date.now() + 5 * 60 * 1000;
      candidate.reopenedAt = getKSTDateTimeStr();
      candidate.reopenedBy = operatorName || '동아리 총괄 관리자 (Admin)';
      candidate.isModifiedUnderAdmin = true;
      candidate.lastModifiedAt = getKSTDateTimeStr();

      const evals = db.evaluations.filter(e => e.candidateId === id);
      evals.forEach(e => {
        e.status = 'IN_PROGRESS';
      });

      if (!Array.isArray(db.notifications)) db.notifications = [];
      db.notifications.unshift({
        id: `notif-reopen-${Date.now().toString(36)}`,
        type: 'ADMIN_ALERT',
        title: `⚠️ [관리자 승인] '${candidate.name}' 지원자 5분 수정 모드 활성화`,
        message: `관리자 승인으로 완료가 5분간 취소되어 재평가 및 점수 수정이 가능합니다. 5분 후 자동으로 다시 면접 완료되며 최초 완료 시간(${candidate.initialCompletedAt})은 그대로 유지됩니다.`,
        timestamp: getKSTTimeStr(),
        createdAt: Date.now(),
        roomId: candidate.roomId,
        candidateId: candidate.id,
        candidateName: candidate.name,
        operatorName: candidate.reopenedBy
      });
      db.notifications = db.notifications.slice(0, 50);
    } else if (action === 'vote_no_show' || action === 'no_show') {
      const room = db.rooms.find(r => r.id === candidate.roomId);
      const totalPanel = room?.interviewers?.length || candidate.interviewers?.length || 1;
      const requiredVotes = Math.max(1, Math.ceil((totalPanel * 2) / 3));

      if (!Array.isArray(candidate.noShowVotes)) {
        candidate.noShowVotes = [];
      }

      const voterId = interviewerId || operatorName || 'interviewer';
      if (!candidate.noShowVotes.includes(voterId)) {
        candidate.noShowVotes.push(voterId);
      }

      if (candidate.noShowVotes.length >= requiredVotes) {
        candidate.status = 'NO_SHOW';
      }
    } else if (action === 'cancel_vote_no_show') {
      if (Array.isArray(candidate.noShowVotes)) {
        const voterId = interviewerId || operatorName || 'interviewer';
        candidate.noShowVotes = candidate.noShowVotes.filter(v => v !== voterId);
      }
      if (candidate.status === 'NO_SHOW') {
        candidate.status = 'PENDING';
      }
    } else if (action === 'cancel_no_show') {
      candidate.status = 'PENDING';
      candidate.noShowVotes = [];
    } else if (action === 'finish') {
      const room = db.rooms.find(r => r.id === candidate.roomId);
      const totalPanel = room?.interviewers?.length || candidate.interviewers?.length || 1;
      const evals = db.evaluations.filter(e => e.candidateId === id);
      const submittedCount = evals.filter(e => e.status === 'SUBMITTED').length;

      if (submittedCount >= totalPanel || (evals.length > 0 && evals.length === submittedCount)) {
        candidate.status = 'COMPLETED';
        candidate.reopenedUntil = undefined;
        if (!candidate.initialCompletedAt) {
          candidate.initialCompletedAt = candidate.completedAt || getKSTDateTimeStr();
        }
        candidate.completedAt = candidate.initialCompletedAt;

        if (!candidate.qualitativeAiSummary) {
          try {
            const synthesis = await generateQualitativeSynthesisAI(candidate, evals);
            const mindmap = await generateMindMapAI(candidate, evals);
            candidate.qualitativeAiSummary = synthesis;
            candidate.mindMapData = mindmap;
          } catch (e) {
            console.error('Auto AI synthesis on completion error:', e);
          }
        }
      } else {
        candidate.status = 'CLOSING_PENDING';
      }
    } else if (action === 'cancel_finish') {
      if (interviewerId) {
        const myEval = db.evaluations.find(e => e.candidateId === id && e.interviewerId === interviewerId);
        if (myEval) {
          myEval.status = 'IN_PROGRESS';
          myEval.submittedAt = undefined;
        }
      }
      candidate.status = 'IN_PROGRESS';
    }

    db.auditLogs.unshift({
      id: `audit-${Date.now().toString(36)}`,
      timestamp: getKSTDateTimeStr(),
      modifiedBy: operatorName || '면접관 패널',
      field: `${candidate.name} (${candidate.id}) 상태 변경: ${action}`,
      beforeVal: { status: oldStatus },
      afterVal: {
        status: candidate.status,
        completedAt: candidate.completedAt,
        initialCompletedAt: candidate.initialCompletedAt
      },
      reason:
        reason ||
        (action === 'admin_reopen_5min'
          ? `관리자 승인 5분 수정 모드 개방 (5분 후 자동 재완료, 최초 완료시각 ${candidate.initialCompletedAt} 유지)`
          : `상태 전이 액션 실행 (${action})`)
    });

    await saveCloudState();
    res.json({ candidate, evaluations: db.evaluations.filter(e => e.candidateId === id) });
  });
});

// GET /api/candidates/:id/evaluations - Get evaluations for specific candidate
candidatesRouter.get('/:id/evaluations', (req, res) => {
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
candidatesRouter.post('/:id/evaluations', async (req, res) => {
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

// POST /api/candidates/:id/stt - Realtime speech processing & feedback
candidatesRouter.post('/:id/stt', async (req, res) => {
  const { id } = req.params;
  const { message, triggerAI, personaStyle, customFocusPrompt, customApiKey } = req.body;

  return candidateMutex.runExclusive(id, async () => {
    const candidate = db.candidates.find(c => c.id === id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    candidate.sttTranscript.push({
      id: message.id || `stt-${Date.now().toString(36)}`,
      speaker: message.speaker || 'candidate',
      text: message.text,
      timestamp: message.timestamp || new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      confidence: message.confidence ?? 0.95
    });

    if (triggerAI && message.speaker === 'candidate' && message.text.length > 3) {
      try {
        const room = db.rooms.find(r => r.id === candidate.roomId);
        const activeCriteria =
          room && room.criteria && room.criteria.length > 0 ? room.criteria : db.settings.criteria;

        const effectivePersona = personaStyle || room?.defaultQuestionPersona || 'BALANCED';
        const effectiveFocus =
          customFocusPrompt ||
          (room?.customFocusKeywords && room.customFocusKeywords.length > 0
            ? room.customFocusKeywords.join(', ')
            : undefined);

        const docText = candidate.documents?.map(d => d.rawText || d.contentSnippet || '').join('\n') || '';
        const transcriptHistory = candidate.sttTranscript
          .slice(-6)
          .map(s => `${s.speaker}: ${s.text}`)
          .join('\n');

        const feedback = await generateRealtimeFeedbackAI(
          candidate.name,
          candidate.track,
          docText,
          transcriptHistory,
          message.text,
          {
            knowledgeBase: db.settings.knowledgeBase,
            criteria: activeCriteria,
            personaStyle: effectivePersona,
            customFocusPrompt: effectiveFocus,
            customApiKey
          }
        );

        if (feedback.summary) {
          candidate.aiInsights.realtimeSummaries.unshift({
            id: `sum-${Date.now().toString(36)}`,
            timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
            text: feedback.summary,
            source: 'ai'
          });
        }

        if (feedback.tailQuestions && feedback.tailQuestions.length > 0) {
          feedback.tailQuestions.forEach((q: any) => {
            candidate.aiInsights.tailQuestions.unshift(q);
          });
          if (candidate.aiInsights.tailQuestions.length > 40) {
            candidate.aiInsights.tailQuestions = candidate.aiInsights.tailQuestions.slice(0, 40);
          }
        }

        if (feedback.contradictions && feedback.contradictions.length > 0) {
          feedback.contradictions.forEach((c: any) => {
            candidate.aiInsights.contradictions.unshift({
              id: `contra-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
              timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
              point: c.point,
              context: c.context
            });
          });
        }
      } catch (e) {
        console.error('Realtime STT AI Error:', e);
      }
    }

    await saveCloudState();
    res.json({
      sttTranscript: candidate.sttTranscript,
      aiInsights: candidate.aiInsights
    });
  });
});

// POST /api/candidates/:id/generate-questions - On-demand AI question generation
candidatesRouter.post('/:id/generate-questions', async (req, res) => {
  const { id } = req.params;
  const { personaStyle, customFocusPrompt, latestAnswer, customApiKey } = req.body;

  return candidateMutex.runExclusive(id, async () => {
    const candidate = db.candidates.find(c => c.id === id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    if (!candidate.aiInsights) {
      candidate.aiInsights = { realtimeSummaries: [], tailQuestions: [], customQuestions: [], contradictions: [] };
    }
    if (!candidate.aiInsights.customQuestions) {
      candidate.aiInsights.customQuestions = [];
    }

    try {
      const room = db.rooms.find(r => r.id === candidate.roomId);
      const activeCriteria =
        room && room.criteria && room.criteria.length > 0 ? room.criteria : db.settings.criteria;

      const effectivePersona = personaStyle || room?.defaultQuestionPersona || 'BALANCED';
      const effectiveFocus =
        customFocusPrompt ||
        (room?.customFocusKeywords && room.customFocusKeywords.length > 0
          ? room.customFocusKeywords.join(', ')
          : undefined);

      const docText = candidate.documents?.map(d => d.rawText || d.contentSnippet || '').join('\n') || '';
      const lastCandSpeech = candidate.sttTranscript.slice().reverse().find(s => s.speaker === 'candidate');
      const speechToAnalyze =
        latestAnswer ||
        lastCandSpeech?.text ||
        `${candidate.name} 지원자의 ${candidate.track} 직무 핵심 역량 및 프로젝트 수행 경험`;

      const transcriptHistory = candidate.sttTranscript
        .slice(-8)
        .map(s => `${s.speaker}: ${s.text}`)
        .join('\n');

      const feedback = await generateRealtimeFeedbackAI(
        candidate.name,
        candidate.track,
        docText,
        transcriptHistory,
        speechToAnalyze,
        {
          knowledgeBase: db.settings.knowledgeBase,
          criteria: activeCriteria,
          personaStyle: effectivePersona,
          customFocusPrompt: effectiveFocus,
          model: 'llama-3.1-8b-instant',
          customApiKey
        }
      );

      if (feedback.tailQuestions && feedback.tailQuestions.length > 0) {
        feedback.tailQuestions.forEach((q: any) => {
          q.isCustomGenerated = true;
          candidate.aiInsights.customQuestions!.unshift(q);
        });
        if (candidate.aiInsights.customQuestions!.length > 50) {
          candidate.aiInsights.customQuestions = candidate.aiInsights.customQuestions!.slice(0, 50);
        }
      }

      await saveCloudState();

      res.json({
        success: true,
        generatedQuestions: feedback.tailQuestions,
        customQuestions: candidate.aiInsights.customQuestions,
        tailQuestions: candidate.aiInsights.tailQuestions,
        allQuestions: candidate.aiInsights.tailQuestions
      });
    } catch (err: any) {
      console.error('On-demand Question generation error:', err);
      res.status(500).json({ error: err.message || '질문 생성 중 오류가 발생했습니다.' });
    }
  });
});

// POST /api/candidates/:id/tail-questions/share - Share question
candidatesRouter.post('/:id/tail-questions/share', async (req, res) => {
  const { id } = req.params;
  const {
    questionId,
    question: incomingQuestion,
    sharedByName,
    sharedById,
    roomId,
    candidateName
  } = req.body;

  const candidate = db.candidates.find(c => c.id === id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  if (!candidate.aiInsights) {
    candidate.aiInsights = { realtimeSummaries: [], tailQuestions: [], contradictions: [] };
  }
  if (!candidate.aiInsights.tailQuestions) {
    candidate.aiInsights.tailQuestions = [];
  }

  const rawName = sharedByName || '면접관';
  const cleanName =
    rawName.replace(/^(면접관\s*\d*\s*\(?|\(?총괄\s*관리자\s*\(?)/, '').replace(/[\)\(]/g, '').trim() || rawName;

  let targetQuestion: TailQuestion | undefined;

  if (questionId) {
    targetQuestion = candidate.aiInsights.tailQuestions.find(q => q.id === questionId);
  }

  if (!targetQuestion && incomingQuestion) {
    targetQuestion = {
      ...incomingQuestion,
      id: incomingQuestion.id || `tq-shared-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`
    };
    candidate.aiInsights.tailQuestions.unshift(targetQuestion);
  }

  if (!targetQuestion) {
    return res.status(400).json({ error: '공유할 질문 정보를 찾을 수 없습니다.' });
  }

  targetQuestion.isShared = true;
  targetQuestion.sharedBy = cleanName;
  targetQuestion.sharedById = sharedById || 'user-unknown';
  targetQuestion.sharedAt = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  targetQuestion.shareCount = (targetQuestion.shareCount || 0) + 1;

  const liveNotif: LiveNotification = {
    id: `notif-share-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
    type: 'SHARED_QUESTION',
    actionType: 'share_question',
    title: `💡 [${cleanName} 면접관] 추천 질문 공유`,
    message: `"${targetQuestion.question}"`,
    timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
    createdAt: Date.now(),
    roomId: roomId || candidate.roomId || '',
    roomName: candidate.timeslot?.room || 'SmartLab 면접 평가실',
    candidateId: candidate.id,
    candidateName: candidateName || candidate.name,
    operatorId: sharedById,
    operatorName: cleanName,
    questionId: targetQuestion.id
  };

  if (!Array.isArray(db.notifications)) db.notifications = [];
  db.notifications.unshift(liveNotif);
  if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);

  const chatMsg: InterviewerChatMessage = {
    id: `chat-q-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
    roomId: roomId || candidate.roomId || '',
    roomName: candidate.timeslot?.room || 'SmartLab 면접 평가실',
    candidateId: candidate.id,
    candidateName: candidateName || candidate.name,
    senderId: sharedById || 'user-unknown',
    senderName: cleanName,
    senderRole: '면접관 (질문 공유)',
    message: `💡 [면접관 추천 질문 공유]\n"${targetQuestion.question}"\n\n📌 평가 의도: ${
      targetQuestion.intent || targetQuestion.reason || '동료 면접관 공유 질문'
    }`,
    timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
    createdAt: Date.now(),
    isImportant: true,
    sharedQuestion: targetQuestion
  };

  if (!Array.isArray(db.chatMessages)) db.chatMessages = [];
  db.chatMessages.push(chatMsg);
  if (db.chatMessages.length > 150) db.chatMessages = db.chatMessages.slice(-150);

  await saveCloudState();

  res.json({
    success: true,
    question: targetQuestion,
    notification: liveNotif,
    chatMessage: chatMsg,
    tailQuestions: candidate.aiInsights.tailQuestions
  });
});

// POST /api/candidates/:id/custom-question - Custom typed question
candidatesRouter.post('/:id/custom-question', async (req, res) => {
  const { id } = req.params;
  const {
    questionText,
    userTypedIntent,
    category,
    difficulty,
    evaluatedCriteria,
    shouldShareWithEveryone,
    operatorName,
    operatorId,
    roomId,
    candidateName
  } = req.body;

  const candidate = db.candidates.find(c => c.id === id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  if (!questionText || typeof questionText !== 'string' || !questionText.trim()) {
    return res.status(400).json({ error: '질문 내용을 입력해주세요.' });
  }

  if (!candidate.aiInsights) {
    candidate.aiInsights = { realtimeSummaries: [], tailQuestions: [], customQuestions: [], contradictions: [] };
  }
  if (!candidate.aiInsights.tailQuestions) {
    candidate.aiInsights.tailQuestions = [];
  }
  if (!candidate.aiInsights.customQuestions) {
    candidate.aiInsights.customQuestions = [];
  }

  const rawName = operatorName || '면접관';
  const cleanName =
    rawName.replace(/^(면접관\s*\d*\s*\(?|\(?총괄\s*관리자\s*\(?)/, '').replace(/[\)\(]/g, '').trim() || rawName;

  const room = db.rooms.find(r => r.id === candidate.roomId);
  const activeCriteria =
    room && room.criteria && room.criteria.length > 0 ? room.criteria : db.settings.criteria;

  const criteriaIds =
    Array.isArray(evaluatedCriteria) && evaluatedCriteria.length > 0
      ? evaluatedCriteria
      : ['technical', 'problemSolving'];

  const newQuestion: TailQuestion = {
    id: `tq-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
    question: questionText.trim(),
    claim:
      candidate.sttTranscript.slice().reverse().find(s => s.speaker === 'candidate')?.text?.substring(0, 80) ||
      `${candidate.name} 지원자 답변`,
    category: category || '면접관 직접 출제',
    categoryLabel: category || '커스텀 질문',
    difficulty: difficulty || 'ADVANCED',
    evaluatedCriteria: criteriaIds,
    evaluatedCriteriaDetails: criteriaIds.map((cid: string) => {
      const matched = activeCriteria?.find((c: any) => c.id === cid);
      return {
        criterionId: cid,
        criterionName: matched ? `${matched.name} (${matched.weight}%)` : cid,
        weight: matched?.weight || 30,
        relevanceScore: 95,
        evaluationGuideline:
          userTypedIntent ||
          `${matched?.name || '직무 역량'}에 대한 깊이 있는 이해와 논리적 문제 해결력 직접 검증`
      };
    }),
    intent: userTypedIntent || '면접관이 직접 입력한 평가 목적 및 검증 포인트를 확인하기 위한 질문',
    verificationPoint: userTypedIntent || '직접 기여도 및 실전 트러블슈팅 역량 검증',
    reason: userTypedIntent || '면접관 맞춤형 직접 질문',
    idealAnswerSignals: [
      '질문의 의도를 정확히 파악하고 핵심 해결책을 두괄식으로 설명함',
      '직접 경험한 구체적 사례와 수치, 트레이드오프를 명확히 제시함'
    ],
    redFlagSignals: [
      '질문 의도와 무관한 일반론적인 설명만 반복함',
      '본인이 직접 담당하지 않았거나 이해도가 부족함을 드러냄'
    ],
    followUpProbing: ['그 과정에서 예상치 못한 문제가 발생했을 때는 어떻게 대처하셨나요?'],
    matchScore: 99,
    isUserCreated: true,
    isCustomGenerated: true,
    userTypedIntent: userTypedIntent?.trim(),
    isShared: shouldShareWithEveryone || false,
    sharedBy: shouldShareWithEveryone ? cleanName : undefined,
    sharedById: shouldShareWithEveryone ? operatorId : undefined,
    sharedAt: shouldShareWithEveryone ? new Date().toLocaleTimeString('ko-KR', { hour12: false }) : undefined,
    shareCount: shouldShareWithEveryone ? 1 : 0
  };

  candidate.aiInsights.tailQuestions.unshift(newQuestion);
  candidate.aiInsights.customQuestions.unshift(newQuestion);

  if (shouldShareWithEveryone) {
    const liveNotif: LiveNotification = {
      id: `notif-share-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      type: 'SHARED_QUESTION',
      actionType: 'share_question',
      title: `💡 [${cleanName} 면접관] 맞춤 질문 등록 및 공유`,
      message: `"${newQuestion.question}"`,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      createdAt: Date.now(),
      roomId: roomId || candidate.roomId || '',
      roomName: candidate.timeslot?.room || 'SmartLab 면접 평가실',
      candidateId: candidate.id,
      candidateName: candidateName || candidate.name,
      operatorId,
      operatorName: cleanName,
      questionId: newQuestion.id
    };

    if (!Array.isArray(db.notifications)) db.notifications = [];
    db.notifications.unshift(liveNotif);

    const chatMsg: InterviewerChatMessage = {
      id: `chat-q-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      roomId: roomId || candidate.roomId || '',
      roomName: candidate.timeslot?.room || 'SmartLab 면접 평가실',
      candidateId: candidate.id,
      candidateName: candidateName || candidate.name,
      senderId: operatorId || 'user-unknown',
      senderName: cleanName,
      senderRole: '면접관 (직접 출제 및 공유)',
      message: `💡 [면접관 직접 출제 질문 공유]\n"${newQuestion.question}"\n\n📌 평가 의도: ${newQuestion.intent}`,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      createdAt: Date.now(),
      isImportant: true,
      sharedQuestion: newQuestion
    };

    if (!Array.isArray(db.chatMessages)) db.chatMessages = [];
    db.chatMessages.push(chatMsg);
  }

  await saveCloudState();

  res.status(201).json({
    success: true,
    question: newQuestion,
    customQuestions: candidate.aiInsights.customQuestions,
    tailQuestions: candidate.aiInsights.tailQuestions
  });
});

// POST /api/candidates/:id/ai-synthesis - Qualitative synthesis & mindmap
candidatesRouter.post('/:id/ai-synthesis', async (req, res) => {
  const { id } = req.params;
  const candidate = db.candidates.find(c => c.id === id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const evals = db.evaluations.filter(e => e.candidateId === id);
  try {
    const summary = await generateQualitativeSynthesisAI(candidate, evals, {
      knowledgeBase: db.settings.knowledgeBase
    });
    const mindmap = await generateMindMapAI(candidate, evals);
    candidate.qualitativeAiSummary = summary;
    candidate.mindMapData = mindmap;
    await saveCloudState();
    res.json({ qualitativeAiSummary: summary, mindMapData: mindmap });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
