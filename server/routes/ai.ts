import { Router } from 'express';
import { db, saveCloudState } from '../db';
import { getEffectiveAdminPassword } from './auth';
import { candidateMutex } from '../utils/mutex';
import {
  generateRealtimeFeedbackAI,
  parseUniversalDataAI,
  generateQualitativeSynthesisAI,
  generateMindMapAI,
  learnFromKnowledgeSourceAI,
  simulateInterviewQnAWithKnowledgeAI
} from '../ai';
import { LiveNotification, InterviewerChatMessage, TailQuestion } from '../../src/types';

export const aiRouter = Router();

// POST /api/candidates/:id/stt - Realtime speech processing & feedback
aiRouter.post('/candidates/:id/stt', async (req, res) => {
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
aiRouter.post('/candidates/:id/generate-questions', async (req, res) => {
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
aiRouter.post('/candidates/:id/tail-questions/share', async (req, res) => {
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
aiRouter.post('/candidates/:id/custom-question', async (req, res) => {
  const {
    id
  } = req.params;
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

// POST /api/ai/universal-parser - Parse roster & images
aiRouter.post('/universal-parser', async (req, res) => {
  try {
    const { rawInput, config, imageBase64, imageMimeType, customApiKey } = req.body;
    const parsed = await parseUniversalDataAI(
      rawInput || '',
      config || {
        panelCount: 3,
        minutesPerPerson: 30,
        startTime: '14:00',
        room: 'SmartLab Studio 1'
      },
      { customApiKey, imageBase64, imageMimeType }
    );
    res.json(parsed);
  } catch (err: any) {
    console.error('Parser endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/candidates/:id/ai-synthesis - Qualitative synthesis & mindmap
aiRouter.post('/candidates/:id/ai-synthesis', async (req, res) => {
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

// GET /api/ai/knowledge - Get knowledge base
aiRouter.get('/knowledge', (req, res) => {
  if (!db.settings.knowledgeBase) db.settings.knowledgeBase = [];
  res.json(db.settings.knowledgeBase);
});

// POST /api/ai/knowledge/learn - Learn from YouTube, Doc, Text
aiRouter.post('/knowledge/learn', async (req, res) => {
  try {
    const {
      sourceType,
      url,
      title,
      rawText,
      description,
      fileSize,
      addedBy,
      adminPassword,
      customApiKey
    } = req.body;

    if (adminPassword && adminPassword !== getEffectiveAdminPassword()) {
      return res.status(401).json({ error: '관리자 권한 인증에 실패했습니다.' });
    }

    if (!sourceType) {
      return res.status(400).json({ error: '자료 유형(sourceType)을 지정해주세요.' });
    }

    if (sourceType === 'youtube' && !url) {
      return res.status(400).json({ error: 'YouTube 영상 링크(URL)를 입력해주세요.' });
    }

    const learnedItem = await learnFromKnowledgeSourceAI(
      {
        sourceType,
        url,
        title,
        rawText,
        description,
        fileSize,
        addedBy: addedBy || '동아리 관리자 (Admin)'
      },
      { customApiKey }
    );

    if (!db.settings.knowledgeBase) db.settings.knowledgeBase = [];
    db.settings.knowledgeBase.unshift(learnedItem);

    db.auditLogs.unshift({
      id: `audit-kb-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      modifiedBy: addedBy || '관리자 (Admin)',
      field: 'AI 지식 베이스 학습 자료 추가',
      beforeVal: null,
      afterVal: {
        title: learnedItem.title,
        sourceType: learnedItem.sourceType,
        url: learnedItem.url
      },
      reason: `어드민이 ${learnedItem.sourceType === 'youtube' ? 'YouTube 영상' : '문서/자료'} 기반 AI 지식을 학습 및 인덱싱함`
    });

    await saveCloudState();

    res.status(201).json({
      success: true,
      item: learnedItem,
      knowledgeBase: db.settings.knowledgeBase
    });
  } catch (err: any) {
    console.error('AI Knowledge learn endpoint error:', err);
    res.status(500).json({ error: err.message || 'AI 지식 학습 처리 중 오류가 발생했습니다.' });
  }
});

// PUT /api/ai/knowledge/:id/toggle - Toggle active status
aiRouter.put('/knowledge/:id/toggle', async (req, res) => {
  const { id } = req.params;
  if (!db.settings.knowledgeBase) db.settings.knowledgeBase = [];
  const item = db.settings.knowledgeBase.find(k => k.id === id);
  if (!item) return res.status(404).json({ error: '해당 지식 항목을 찾을 수 없습니다.' });

  item.isActive = !item.isActive;
  item.updatedAt = new Date().toLocaleString('ko-KR', { hour12: false });

  await saveCloudState();
  res.json({ success: true, item, knowledgeBase: db.settings.knowledgeBase });
});

// DELETE /api/ai/knowledge/:id - Delete knowledge item
aiRouter.delete('/knowledge/:id', async (req, res) => {
  const { id } = req.params;
  const { password, adminPassword } = req.body || {};
  const pwd = password || adminPassword;
  if (pwd && pwd !== getEffectiveAdminPassword()) {
    return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
  }

  if (!db.settings.knowledgeBase) db.settings.knowledgeBase = [];
  const idx = db.settings.knowledgeBase.findIndex(k => k.id === id);
  if (idx >= 0) {
    const removed = db.settings.knowledgeBase.splice(idx, 1)[0];
    db.auditLogs.unshift({
      id: `audit-kb-del-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      modifiedBy: '관리자 (Admin)',
      field: 'AI 지식 베이스 학습 자료 삭제',
      beforeVal: { title: removed.title, sourceType: removed.sourceType },
      afterVal: null,
      reason: '어드민이 AI 지식 베이스에서 학습 자료를 영구 제거함'
    });
    await saveCloudState();
    res.json({ success: true, removed, knowledgeBase: db.settings.knowledgeBase });
  } else {
    res.status(404).json({ error: '지식 자료를 찾을 수 없습니다.' });
  }
});

// POST /api/ai/knowledge/batch-delete - Batch delete
aiRouter.post('/knowledge/batch-delete', async (req, res) => {
  const { ids, deleteAll } = req.body || {};
  if (!db.settings.knowledgeBase) db.settings.knowledgeBase = [];

  const beforeCount = db.settings.knowledgeBase.length;
  if (deleteAll) {
    db.settings.knowledgeBase = [];
    db.auditLogs.unshift({
      id: `audit-kb-clear-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      modifiedBy: '관리자 (Admin)',
      field: 'AI 지식 베이스 전체 초기화/삭제',
      beforeVal: { count: beforeCount },
      afterVal: { count: 0 },
      reason: '어드민이 모든 AI 학습 자료를 일괄 삭제함'
    });
  } else if (Array.isArray(ids) && ids.length > 0) {
    const idSet = new Set(ids);
    db.settings.knowledgeBase = db.settings.knowledgeBase.filter(k => !idSet.has(k.id));
    db.auditLogs.unshift({
      id: `audit-kb-batch-del-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      modifiedBy: '관리자 (Admin)',
      field: 'AI 지식 베이스 선택 자료 일괄 삭제',
      beforeVal: { count: beforeCount },
      afterVal: { count: db.settings.knowledgeBase.length },
      reason: `어드민이 ${ids.length}개 학습 자료를 일괄 제거함`
    });
  }

  await saveCloudState();
  res.json({ success: true, knowledgeBase: db.settings.knowledgeBase });
});

// DELETE /api/ai/knowledge - Clear all knowledge
aiRouter.delete('/knowledge', async (req, res) => {
  const beforeCount = db.settings.knowledgeBase?.length || 0;
  db.settings.knowledgeBase = [];
  db.auditLogs.unshift({
    id: `audit-kb-clear-${Date.now().toString(36)}`,
    timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
    modifiedBy: '관리자 (Admin)',
    field: 'AI 지식 베이스 전체 삭제',
    beforeVal: { count: beforeCount },
    afterVal: { count: 0 },
    reason: '어드민이 모든 AI 학습 자료를 일괄 삭제함'
  });
  await saveCloudState();
  res.json({ success: true, knowledgeBase: [] });
});

// POST /api/ai/knowledge/simulate - Simulate Q&A
aiRouter.post('/knowledge/simulate', async (req, res) => {
  try {
    const { query, customApiKey } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: '질문이나 테스트 시나리오를 입력해주세요.' });
    }
    const simResult = await simulateInterviewQnAWithKnowledgeAI(
      query,
      db.settings.knowledgeBase || [],
      { customApiKey }
    );
    res.json(simResult);
  } catch (err: any) {
    console.error('Knowledge simulation error:', err);
    res.status(500).json({ error: err.message });
  }
});
