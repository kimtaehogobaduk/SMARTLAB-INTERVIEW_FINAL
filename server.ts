import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, loadCloudState, saveCloudState } from './server/db.ts';
import {
  generateRealtimeFeedbackAI,
  parseUniversalDataAI,
  generateQualitativeSynthesisAI,
  generateMindMapAI,
  generateCandidateDetailedReportAI,
  learnFromKnowledgeSourceAI,
  simulateInterviewQnAWithKnowledgeAI,
  extractYouTubeVideoId
} from './server/ai.ts';
import { Candidate, Evaluation, AuditLog, PlatformSettings, ClubLeadership, LeadershipMember, LeadershipRole, InterviewRoomInfo, SecurityQuizItem, AIKnowledgeItem, DocumentItem, LiveNotification, InterviewerPresence, InterviewerChatMessage, CandidateChatMessage, TailQuestion, InterviewerNameDisplayPolicy, CandidateDetailedAIReport, CandidateFullResultData, CandidateResultStats, CandidateEvaluatorScoreDetail, EvaluationCriterion } from './src/types.ts';

dotenv.config();

// Safe dirname resolution that works in both TSX (ESM) and bundled CommonJS (production)
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

// 실시간 대한민국 표준시(KST, Asia/Seoul) 변환 유틸리티
export function getKSTTimeStr(dateInput: Date | number | string = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d);
}

export function getKSTDateTimeStr(dateInput: Date | number | string = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}

export function checkAndAutoFinalizeReopenedCandidates(): boolean {
  const now = Date.now();
  let changed = false;
  db.candidates.forEach(c => {
    if (c.reopenedUntil && now >= c.reopenedUntil) {
      c.status = 'COMPLETED';
      c.reopenedUntil = undefined;
      // 최초 완료되었던 시각 그대로 보존
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

async function startServer() {
  // Load persistent cloud state from Firestore on startup
  await loadCloudState();

  // Periodically check for 5-minute admin re-edit expiration
  setInterval(async () => {
    const changed = checkAndAutoFinalizeReopenedCandidates();
    if (changed) {
      await saveCloudState();
    }
  }, 1000);

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Helper function to get current configured master admin password
  function getEffectiveAdminPassword(): string {
    return db.settings?.adminMasterPassword || 'admin';
  }

  // ----------------------------------------------------
  // API ROUTES FIRST
  // ----------------------------------------------------

  // 0. Admin Authentication & Master Password Management
  app.post('/api/admin/verify-password', (req, res) => {
    const { password } = req.body;
    const masterPwd = getEffectiveAdminPassword();
    if (password === masterPwd) {
      return res.json({ valid: true });
    }
    return res.status(401).json({ valid: false, error: '관리자 비밀번호가 일치하지 않습니다.' });
  });

  app.post('/api/admin/change-password', async (req, res) => {
    const { currentPassword, newPassword, operatorName } = req.body;
    const masterPwd = getEffectiveAdminPassword();
    if (currentPassword !== masterPwd) {
      return res.status(401).json({ error: '현재 관리자 비밀번호가 일치하지 않습니다.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 2) {
      return res.status(400).json({ error: '새 관리자 비밀번호를 2자 이상 입력해주세요.' });
    }
    const cleanNewPwd = newPassword.trim();
    db.settings.adminMasterPassword = cleanNewPwd;
    db.auditLogs.unshift({
      id: `audit-pwd-${Date.now().toString(36)}`,
      timestamp: getKSTDateTimeStr(),
      modifiedBy: operatorName || '관리자 (Admin)',
      field: '관리자 마스터 비밀번호 변경',
      beforeVal: '***',
      afterVal: '***',
      reason: '관리자 계정 보안을 위한 마스터 비밀번호 갱신'
    });
    await saveCloudState();
    res.json({ success: true, message: '관리자 마스터 비밀번호가 성공적으로 변경되었습니다.' });
  });

  // 1. Health check & settings
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      cloudDatabase: 'firestore',
      roomsCount: db.rooms.length,
      candidatesCount: db.candidates.length,
      aiConfigured: !!(
        (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'MY_GROQ_API_KEY') ||
        (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') ||
        (process.env.CEREBRAS_API_KEY && process.env.CEREBRAS_API_KEY !== 'MY_CEREBRAS_API_KEY')
      ),
      groqConfigured: !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'MY_GROQ_API_KEY'),
      geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
    });
  });

  // 2. Rooms API (Admin only for creation, persistent in Firestore)
  app.get('/api/rooms', (req, res) => {
    const { isAdmin, adminPassword } = req.query;
    const isMasterAdmin = isAdmin === 'true' && adminPassword === getEffectiveAdminPassword();

    const roomsWithCount = db.rooms.map(room => {
      const hasLock = Boolean(room.securityType && room.securityType !== 'NONE');
      
      // Normalize security quizzes
      let normalizedQuizzes = room.securityQuizzes || [];
      if (normalizedQuizzes.length === 0 && room.securityQuestion) {
        normalizedQuizzes = [
          {
            id: 'quiz-0',
            question: room.securityQuestion,
            answer: room.securityAnswer || ''
          }
        ];
      }

      // If not admin, mask answers in quizzes
      const clientQuizzes = room.securityType === 'QUIZ'
        ? normalizedQuizzes.map(q => ({
            id: q.id,
            question: q.question,
            answer: isMasterAdmin ? q.answer : undefined
          }))
        : undefined;

      return {
        ...room,
        candidateCount: db.candidates.filter(c => !c.roomId || c.roomId === room.id).length,
        hasSecurityLock: hasLock,
        securityType: room.securityType || 'NONE',
        securityQuestion: room.securityType === 'QUIZ' ? (room.securityQuestion || (normalizedQuizzes[0]?.question)) : undefined,
        securityQuizzes: clientQuizzes,
        // Only return sensitive plain password and answer if authenticated master admin query
        password: isMasterAdmin ? room.password : undefined,
        securityAnswer: isMasterAdmin ? (room.securityAnswer || (normalizedQuizzes[0]?.answer)) : undefined
      };
    });
    res.json(roomsWithCount);
  });

  // Verify access for room (Password or Multiple Quiz challenge, with Master Admin override & same-device skip)
  app.post('/api/rooms/:id/verify-access', async (req, res) => {
    const { id } = req.params;
    const { password, answer, answers, adminPassword, deviceId } = req.body;
    const room = db.rooms.find(r => r.id === id);
    if (!room) return res.status(404).json({ error: '존재하지 않는 면접방입니다.' });

    const masterPwd = getEffectiveAdminPassword();
    if (adminPassword && adminPassword === masterPwd) {
      return res.json({ success: true, authorized: true, roomName: room.name, accessType: 'ADMIN_OVERRIDE' });
    }

    const secType = room.securityType || 'NONE';
    if (secType === 'NONE') {
      return res.json({ success: true, authorized: true, roomName: room.name, accessType: 'PUBLIC' });
    }

    if (secType === 'PASSWORD') {
      const cleanInput = (password || '').trim();
      const cleanTarget = (room.password || '').trim();
      if (cleanInput && cleanInput === cleanTarget) {
        return res.json({ success: true, authorized: true, roomName: room.name, accessType: 'PASSWORD' });
      }
      return res.status(401).json({ error: '방 비밀번호가 일치하지 않습니다. 다시 확인해주세요.' });
    }

    if (secType === 'QUIZ') {
      if (!Array.isArray((room as any).authorizedQuizDevices)) {
        (room as any).authorizedQuizDevices = [];
      }

      const cleanDeviceId = typeof deviceId === 'string' ? deviceId.trim() : '';

      // Check if this device has already passed this room's quiz previously
      if (cleanDeviceId) {
        const isDeviceAlreadyAuthorized = (room as any).authorizedQuizDevices.some(
          (d: any) => (typeof d === 'string' ? d === cleanDeviceId : d?.deviceId === cleanDeviceId)
        );
        if (isDeviceAlreadyAuthorized) {
          return res.json({
            success: true,
            authorized: true,
            roomName: room.name,
            accessType: 'QUIZ',
            deviceSkipped: true
          });
        }
      }

      // Gather all required quizzes
      let targetQuizzes = room.securityQuizzes || [];
      if (targetQuizzes.length === 0 && room.securityQuestion) {
        targetQuizzes = [
          {
            id: 'quiz-0',
            question: room.securityQuestion,
            answer: room.securityAnswer || ''
          }
        ];
      }

      if (targetQuizzes.length === 0) {
        return res.json({ success: true, authorized: true, roomName: room.name, accessType: 'QUIZ' });
      }

      // Check single answer fallback
      if (targetQuizzes.length === 1 && typeof answer === 'string' && answer.trim()) {
        const cleanUserAns = answer.trim().toLowerCase().replace(/\s+/g, '');
        const cleanCorrectAns = (targetQuizzes[0].answer || room.securityAnswer || '').trim().toLowerCase().replace(/\s+/g, '');
        if (cleanUserAns && cleanUserAns === cleanCorrectAns) {
          if (cleanDeviceId) {
            const alreadyIn = (room as any).authorizedQuizDevices.some(
              (d: any) => (typeof d === 'string' ? d === cleanDeviceId : d?.deviceId === cleanDeviceId)
            );
            if (!alreadyIn) {
              (room as any).authorizedQuizDevices.push({
                deviceId: cleanDeviceId,
                authorizedAt: new Date().toISOString()
              });
              await saveCloudState();
            }
          }
          return res.json({ success: true, authorized: true, roomName: room.name, accessType: 'QUIZ', deviceRemembered: true });
        }
        return res.status(401).json({ error: '보안 문제의 정답이 일치하지 않습니다.' });
      }

      // Multi quiz validation
      const answersMap: Record<string, string> = {};
      if (answers && typeof answers === 'object') {
        if (Array.isArray(answers)) {
          answers.forEach((item: any, idx: number) => {
            if (typeof item === 'string') {
              answersMap[targetQuizzes[idx]?.id || `idx-${idx}`] = item;
            } else if (item && item.id) {
              answersMap[item.id] = item.answer || '';
            }
          });
        } else {
          Object.assign(answersMap, answers);
        }
      } else if (typeof answer === 'string') {
        answersMap[targetQuizzes[0]?.id || 'quiz-0'] = answer;
      }

      // Validate all quizzes
      for (let i = 0; i < targetQuizzes.length; i++) {
        const quiz = targetQuizzes[i];
        const userRawAns = answersMap[quiz.id] || answersMap[`idx-${i}`] || (i === 0 ? answer : '');
        const cleanUserAns = (userRawAns || '').trim().toLowerCase().replace(/\s+/g, '');
        const cleanCorrectAns = (quiz.answer || '').trim().toLowerCase().replace(/\s+/g, '');

        if (!cleanUserAns) {
          return res.status(400).json({
            error: targetQuizzes.length > 1
              ? `[문제 ${i + 1}] 정답을 입력해주세요.`
              : '퀴즈 정답을 입력해주세요.'
          });
        }

        if (cleanUserAns !== cleanCorrectAns) {
          return res.status(401).json({
            error: targetQuizzes.length > 1
              ? `[문제 ${i + 1}] 정답이 일치하지 않습니다. 다시 확인해주세요.`
              : '보안 문제의 정답이 일치하지 않습니다.'
          });
        }
      }

      // Store device recognition
      if (cleanDeviceId) {
        const alreadyIn = (room as any).authorizedQuizDevices.some(
          (d: any) => (typeof d === 'string' ? d === cleanDeviceId : d?.deviceId === cleanDeviceId)
        );
        if (!alreadyIn) {
          (room as any).authorizedQuizDevices.push({
            deviceId: cleanDeviceId,
            authorizedAt: new Date().toISOString()
          });
          if ((room as any).authorizedQuizDevices.length > 200) {
            (room as any).authorizedQuizDevices = (room as any).authorizedQuizDevices.slice(-200);
          }
          await saveCloudState();
        }
      }

      return res.json({ success: true, authorized: true, roomName: room.name, accessType: 'QUIZ', deviceRemembered: true });
    }

    res.json({ success: true, authorized: true, roomName: room.name });
  });

  app.post('/api/rooms', async (req, res) => {
    const {
      name,
      title,
      description,
      createdBy,
      adminPassword,
      password,
      panelCount,
      minutesPerPerson,
      interviewers,
      securityType,
      roomPassword,
      securityQuestion,
      securityAnswer
    } = req.body;
    const pwd = adminPassword || password;
    if (pwd !== getEffectiveAdminPassword()) {
      return res.status(401).json({ error: '관리자 권한 인증에 실패했습니다.' });
    }
    const roomName = (name || title || '').trim();
    if (!roomName) {
      return res.status(400).json({ error: '방 이름을 입력해주세요.' });
    }

    let formattedInterviewers: any[] = [];
    if (Array.isArray(interviewers)) {
      formattedInterviewers = interviewers.map((item: any, idx: number) => {
        if (typeof item === 'string') {
          const clean = item.trim();
          return {
            id: `intv-${Date.now().toString(36)}-${idx}`,
            name: clean.endsWith('면접관') ? clean : `${clean} 면접관`,
            role: 'interviewer',
            trackExpertise: 'SmartLab 면접 심사위원'
          };
        }
        return item;
      });
    } else if (typeof interviewers === 'string' && interviewers.trim()) {
      formattedInterviewers = interviewers
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .map((nameStr, idx) => ({
          id: `intv-${Date.now().toString(36)}-${idx}`,
          name: nameStr.endsWith('면접관') ? nameStr : `${nameStr} 면접관`,
          role: 'interviewer',
          trackExpertise: 'SmartLab 면접 심사위원'
        }));
    }

    if (formattedInterviewers.length === 0) {
      const count = Number(panelCount) || 3;
      formattedInterviewers = Array.from({ length: count }, (_, idx) => ({
        id: `intv-${Date.now().toString(36)}-${idx + 1}`,
        name: `면접관 ${idx + 1}`,
        role: 'interviewer',
        trackExpertise: 'SmartLab 면접 심사위원'
      }));
    }

    const validatedSecType: 'NONE' | 'PASSWORD' | 'QUIZ' =
      securityType === 'PASSWORD' || securityType === 'QUIZ' ? securityType : 'NONE';

    const effectiveRoomPassword = (roomPassword || req.body.password || '').trim();
    const effectiveQuizQuestion = (securityQuestion || req.body.quizQuestion || '').trim();
    const effectiveQuizAnswer = (securityAnswer || req.body.quizAnswer || '').trim();

    let formattedQuizzes: SecurityQuizItem[] = [];
    if (Array.isArray(req.body.securityQuizzes)) {
      formattedQuizzes = req.body.securityQuizzes
        .filter((q: any) => q && typeof q.question === 'string' && q.question.trim())
        .map((q: any, idx: number) => ({
          id: q.id || `quiz-${Date.now().toString(36)}-${idx}`,
          question: q.question.trim(),
          answer: (q.answer || '').trim()
        }));
    } else if (effectiveQuizQuestion) {
      formattedQuizzes = [
        {
          id: `quiz-${Date.now().toString(36)}-0`,
          question: effectiveQuizQuestion,
          answer: effectiveQuizAnswer
        }
      ];
    }

    const newRoom: InterviewRoomInfo = {
      id: `room-${Date.now().toString(36)}`,
      name: roomName,
      description: description || '동아리 실시간 면접 평가실',
      createdAt: new Date().toLocaleDateString('ko-KR'),
      createdBy: createdBy || '동아리 관리자 (Admin)',
      panelCount: formattedInterviewers.length || Number(panelCount) || 3,
      minutesPerPerson: Number(minutesPerPerson) || 30,
      interviewers: formattedInterviewers,
      securityType: validatedSecType,
      password: validatedSecType === 'PASSWORD' ? effectiveRoomPassword : undefined,
      securityQuestion: validatedSecType === 'QUIZ' ? (formattedQuizzes[0]?.question || effectiveQuizQuestion) : undefined,
      securityAnswer: validatedSecType === 'QUIZ' ? (formattedQuizzes[0]?.answer || effectiveQuizAnswer) : undefined,
      securityQuizzes: validatedSecType === 'QUIZ' ? formattedQuizzes : undefined
    };

    db.rooms.push(newRoom);
    await saveCloudState();
    res.status(201).json(newRoom);
  });

  app.put('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const {
      adminPassword,
      password,
      name,
      description,
      interviewers,
      minutesPerPerson,
      panelCount,
      securityType,
      roomPassword,
      securityQuestion,
      securityAnswer,
      securityQuizzes
    } = req.body;
    const pwd = adminPassword || password;
    if (pwd !== getEffectiveAdminPassword()) {
      return res.status(401).json({ error: '관리자 권한 인증에 실패했습니다.' });
    }

    const room = db.rooms.find(r => r.id === id);
    if (!room) return res.status(404).json({ error: '존재하지 않는 방입니다.' });

    if (name) room.name = name.trim();
    if (description !== undefined) room.description = description;
    if (minutesPerPerson) room.minutesPerPerson = Number(minutesPerPerson);
    if (panelCount) room.panelCount = Number(panelCount);

    if (securityType !== undefined) {
      room.securityType = securityType === 'PASSWORD' || securityType === 'QUIZ' ? securityType : 'NONE';
      if (room.securityType === 'PASSWORD') {
        const p = roomPassword !== undefined ? roomPassword : req.body.password;
        if (p !== undefined) room.password = (p || '').trim();
        room.securityQuestion = undefined;
        room.securityAnswer = undefined;
        room.securityQuizzes = undefined;
      } else if (room.securityType === 'QUIZ') {
        let updatedQuizzes: SecurityQuizItem[] = [];
        if (Array.isArray(securityQuizzes)) {
          updatedQuizzes = securityQuizzes
            .filter((q: any) => q && typeof q.question === 'string' && q.question.trim())
            .map((q: any, idx: number) => ({
              id: q.id || `quiz-${Date.now().toString(36)}-${idx}`,
              question: q.question.trim(),
              answer: (q.answer || '').trim()
            }));
        } else {
          const q = securityQuestion !== undefined ? securityQuestion : req.body.quizQuestion;
          const a = securityAnswer !== undefined ? securityAnswer : req.body.quizAnswer;
          if (q) {
            updatedQuizzes = [
              {
                id: `quiz-${Date.now().toString(36)}-0`,
                question: (q || '').trim(),
                answer: (a || '').trim()
              }
            ];
          }
        }
        room.securityQuizzes = updatedQuizzes;
        room.securityQuestion = updatedQuizzes[0]?.question || (securityQuestion || '').trim();
        room.securityAnswer = updatedQuizzes[0]?.answer || (securityAnswer || '').trim();
        room.password = undefined;
        (room as any).authorizedQuizDevices = [];
      } else {
        room.password = undefined;
        room.securityQuestion = undefined;
        room.securityAnswer = undefined;
        room.securityQuizzes = undefined;
        (room as any).authorizedQuizDevices = [];
      }
    }

    if (interviewers) {
      if (Array.isArray(interviewers)) {
        room.interviewers = interviewers.map((item: any, idx: number) => {
          if (typeof item === 'string') {
            const clean = item.trim();
            return {
              id: `intv-${Date.now().toString(36)}-${idx}`,
              name: clean.endsWith('면접관') ? clean : `${clean} 면접관`,
              role: 'interviewer',
              trackExpertise: 'SmartLab 면접 심사위원'
            };
          }
          return item;
        });
      } else if (typeof interviewers === 'string') {
        room.interviewers = interviewers
          .split(/[\n,]+/)
          .map(s => s.trim())
          .filter(Boolean)
          .map((nameStr, idx) => ({
            id: `intv-${Date.now().toString(36)}-${idx}`,
            name: nameStr.endsWith('면접관') ? nameStr : `${nameStr} 면접관`,
            role: 'interviewer',
            trackExpertise: 'SmartLab 면접 심사위원'
          }));
      }
    }

    await saveCloudState();
    res.json(room);
  });

  // Room-specific Evaluation Criteria Endpoints
  app.put('/api/rooms/:id/criteria', async (req, res) => {
    const { id } = req.params;
    const { criteria, scoringFormula, passThresholdScore, defaultQuestionPersona, customFocusKeywords, isCriteriaConfirmed } = req.body;
    const room = db.rooms.find(r => r.id === id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (criteria && Array.isArray(criteria)) {
      const weightsObj: Record<string, number> = {};
      criteria.forEach((c: any) => {
        weightsObj[c.id] = Number(c.weight) || 0;
      });
      room.criteria = criteria;
      room.weights = weightsObj;
    }

    if (scoringFormula) room.scoringFormula = scoringFormula;
    if (passThresholdScore !== undefined) room.passThresholdScore = Number(passThresholdScore);
    if (defaultQuestionPersona) room.defaultQuestionPersona = defaultQuestionPersona;
    if (customFocusKeywords) room.customFocusKeywords = customFocusKeywords;
    if (isCriteriaConfirmed !== undefined) room.isCriteriaConfirmed = isCriteriaConfirmed;

    await saveCloudState();
    res.json({ success: true, room });
  });

  app.post('/api/rooms/:id/confirm-criteria', async (req, res) => {
    const { id } = req.params;
    const { password, adminPassword, criteria, scoringFormula, passThresholdScore, confirmedBy, adminName } = req.body;
    const pwd = password || adminPassword;
    if (pwd !== getEffectiveAdminPassword()) {
      return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
    }

    const room = db.rooms.find(r => r.id === id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

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
    room.isCriteriaConfirmed = true;
    room.criteriaConfirmedAt = new Date().toLocaleString('ko-KR', { hour12: false });
    room.criteriaConfirmedBy = operator;
    room.criteria = criteria;
    room.weights = weightsObj;
    if (scoringFormula) room.scoringFormula = scoringFormula;
    if (passThresholdScore !== undefined) room.passThresholdScore = Number(passThresholdScore);

    db.auditLogs.unshift({
      id: `audit-room-crit-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      modifiedBy: operator,
      field: `[${room.name || room.title}] 방별 평가 기준 확정`,
      beforeVal: { confirmed: false },
      afterVal: {
        roomId: room.id,
        roomName: room.name,
        confirmed: true,
        criteriaCount: criteria.length,
        scoringFormula: room.scoringFormula,
        passThreshold: room.passThresholdScore
      },
      reason: `어드민이 [${room.name || room.title}] 전용 평가 기준 ${criteria.length}개 항목을 최종 확정함`
    });

    await saveCloudState();
    res.json({ success: true, room });
  });

  app.post('/api/rooms/:id/unconfirm-criteria', async (req, res) => {
    const { id } = req.params;
    const { password, adminPassword, adminName, operatorName } = req.body;
    const pwd = password || adminPassword;
    if (pwd !== getEffectiveAdminPassword()) {
      return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
    }

    const room = db.rooms.find(r => r.id === id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const operator = adminName || operatorName || '관리자 (Admin)';
    room.isCriteriaConfirmed = false;

    db.auditLogs.unshift({
      id: `audit-room-crit-unconfirm-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      modifiedBy: operator,
      field: `[${room.name || room.title}] 방별 평가 기준 수정 모드 전환`,
      beforeVal: { confirmed: true },
      afterVal: { confirmed: false },
      reason: `어드민이 [${room.name || room.title}] 평가 기준 수정을 위해 확정을 해제함`
    });

    await saveCloudState();
    res.json({ success: true, room });
  });

  app.delete('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { adminPassword, password } = req.body;
    const pwd = adminPassword || password;
    if (pwd !== getEffectiveAdminPassword()) {
      return res.status(401).json({ error: '관리자 권한 인증에 실패했습니다.' });
    }

    db.rooms = db.rooms.filter(r => r.id !== id);
    db.candidates = db.candidates.filter(c => c.roomId !== id);
    db.evaluations = db.evaluations.filter(e => e.roomId !== id);
    await saveCloudState();
    res.json({ success: true });
  });

  app.get('/api/settings', (req, res) => {
    res.json(db.settings);
  });

  app.post('/api/settings', async (req, res) => {
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

  // Helper function to resolve an interviewer's leadership role (CAPTAIN | VICE_CAPTAIN | NONE)
  function getInterviewerLeadershipRole(name: string): LeadershipRole {
    if (!name || !db.settings?.leadership) return 'NONE';
    const clean = name.replace(/(\s*(면접관|심사위원|님|대표|위원))+$/g, '').trim().toLowerCase();
    if (!clean) return 'NONE';

    const cap = db.settings.leadership.captain;
    if (cap && cap.name && cap.name.replace(/(\s*(면접관|심사위원|님|대표|위원))+$/g, '').trim().toLowerCase() === clean) {
      return 'CAPTAIN';
    }

    const vcs = db.settings.leadership.viceCaptains || [];
    for (const vc of vcs) {
      if (vc && vc.name && vc.name.replace(/(\s*(면접관|심사위원|님|대표|위원))+$/g, '').trim().toLowerCase() === clean) {
        return 'VICE_CAPTAIN';
      }
    }
    return 'NONE';
  }

  // Club Leadership Management (기장 1명, 부기장 최대 2명)
  app.get('/api/leadership', (req, res) => {
    if (!db.settings.leadership) {
      db.settings.leadership = { captain: null, viceCaptains: [] };
    }
    res.json(db.settings.leadership);
  });

  app.post('/api/leadership/update', async (req, res) => {
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
      const filtered = viceCaptains
        .filter(v => v && v.name && v.name.trim())
        .slice(0, 2); // 최대 2명 엄격 준수

      validatedViceCaptains = filtered.map((v, idx) => ({
        id: v.id || `lead-vc-${Date.now()}-${idx}`,
        name: v.name.trim(),
        role: 'VICE_CAPTAIN',
        appointedAt: v.appointedAt || getKSTDateTimeStr(),
        appointedBy: updatedBy || '총괄 관리자 (Admin)',
        memo: v.memo || ''
      }));
    }

    // 중복 제거: 기장으로 임명된 사람은 부기장 명단에서 자동 제외
    if (validatedCaptain) {
      const capClean = validatedCaptain.name.trim().toLowerCase();
      validatedViceCaptains = validatedViceCaptains.filter(
        v => v.name.trim().toLowerCase() !== capClean
      );
    }

    db.settings.leadership = {
      captain: validatedCaptain,
      viceCaptains: validatedViceCaptains
    };

    // 기록용 감사 로그(Audit Log)
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
      reason: `동아리 임원진 임명 업데이트 (기장: ${validatedCaptain?.name || '미임명'}, 부기장: ${validatedViceCaptains.map(v => v.name).join(', ') || '없음'})`
    });

    // 실시간 면접관 알림 브로드캐스트
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

  // Real-time Live Notifications endpoints
  app.get('/api/notifications', (req, res) => {
    const { since } = req.query;
    if (since) {
      const sinceTime = Number(since);
      const filtered = (db.notifications || []).filter(n => n.createdAt > sinceTime);
      return res.json(filtered);
    }
    // Return last 20 notifications
    res.json((db.notifications || []).slice(0, 20));
  });

  app.post('/api/notifications/clear', async (req, res) => {
    db.notifications = [];
    await saveCloudState();
    res.json({ success: true });
  });

  // Action Broadcast endpoint (e.g. 질문 먼저 하기, 의심/팩트체크 신호 등)
  app.post('/api/notifications/action', async (req, res) => {
    const {
      actionType,
      operatorId,
      operatorName,
      roomId,
      roomName,
      candidateId,
      candidateName,
      customMessage
    } = req.body;

    // Clean name
    const rawName = operatorName || '면접관';
    const cleanName = rawName.replace(/^(면접관\s*\d*\s*\(?|\(?총괄\s*관리자\s*\(?)/, '').replace(/[\)\(]/g, '').trim() || rawName;

    const leadershipRole = getInterviewerLeadershipRole(cleanName);
    const leaderPrefix = leadershipRole === 'CAPTAIN' ? '👑 [기장] ' : leadershipRole === 'VICE_CAPTAIN' ? '⭐ [부기장] ' : '';

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
      message = customMessage || `지원자의 답변 또는 서류 기재 내용에 대한 진위 확인 및 심층 검증이 권장됩니다.`;

      // Also record suspicion into candidate contradiction points if candidateId provided
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
      message = customMessage || `AI 콘솔의 실시간 심층 검증 질문을 확인해보세요.`;
    } else if (actionType === 'yield') {
      notifType = 'YIELD_FLOOR';
      title = `${leaderPrefix}${cleanName} 면접관이 질문 순서를 양보했습니다`;
      message = customMessage || `다른 면접관님께서 질문을 이어가실 수 있습니다.`;
    } else if (actionType === 'time_check') {
      notifType = 'TIME_ALERT';
      title = `${leaderPrefix}${cleanName} 면접관이 면접 시간 준수를 상기시켰습니다`;
      message = customMessage || `배정된 면접 시간을 확인하고 마무리를 준비해주세요.`;
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

  // Real-time Interviewer Presence endpoints (Heartbeat, Status Tracking)
  app.post('/api/presence/heartbeat', async (req, res) => {
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

    // Retain only presences from the last 10 minutes to avoid memory leak
    db.presences = db.presences.filter(p => now - p.lastActiveAt < 600000);

    res.json({ success: true, presence: presenceItem });
  });

  app.post('/api/presence/leave', async (req, res) => {
    const { interviewerId, candidateId, roomId } = req.body;
    if (!interviewerId) return res.status(400).json({ error: 'Missing interviewerId' });

    if (Array.isArray(db.presences)) {
      const target = db.presences.find(
        p => p.interviewerId === interviewerId && (p.candidateId === candidateId || p.roomId === roomId)
      );
      if (target) {
        target.mode = 'left';
        target.lastActiveAt = Date.now() - 30000; // Mark as left
      }
    }
    res.json({ success: true });
  });

  app.get('/api/presence', (req, res) => {
    const { roomId, candidateId } = req.query;
    const now = Date.now();

    if (!Array.isArray(db.presences)) {
      db.presences = [];
    }

    // Filter relevant presences
    const relevant = db.presences.filter(p => {
      if (candidateId && p.candidateId === candidateId) return true;
      if (roomId && p.roomId === roomId) return true;
      return false;
    });

    // Calculate current live status:
    // Active if pinged within last 18 seconds
    const results = relevant.map(p => {
      const isRecent = (now - p.lastActiveAt) < 18000;
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

  // Real-time Interviewer Chat Endpoints
  app.get('/api/chat/messages', (req, res) => {
    const { roomId, candidateId, since } = req.query;
    if (!Array.isArray(db.chatMessages)) {
      db.chatMessages = [];
    }

    let filtered = db.chatMessages;

    // Filter by candidate or room if specified
    if (candidateId) {
      filtered = filtered.filter(m => !m.candidateId || m.candidateId === candidateId);
    } else if (roomId) {
      filtered = filtered.filter(m => !m.roomId || m.roomId === roomId);
    }

    if (since) {
      const sinceNum = Number(since);
      if (!isNaN(sinceNum)) {
        filtered = filtered.filter(m => m.createdAt > sinceNum);
      }
    }

    // Return the latest 100 messages in chronological order
    const latestMessages = filtered.slice(-100).map(m => ({
      ...m,
      senderLeadershipRole: m.senderLeadershipRole || getInterviewerLeadershipRole(m.senderName)
    }));
    res.json(latestMessages);
  });

  app.post('/api/chat/messages', async (req, res) => {
    const {
      roomId,
      roomName,
      candidateId,
      candidateName,
      senderId,
      senderName,
      senderRole,
      message,
      isImportant,
      isOfficialLeaderNotice,
      sharedQuestion
    } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: '메시지 내용을 입력해주세요.' });
    }

    const rawName = senderName || '면접관';
    const cleanName = rawName.replace(/^(면접관\s*\d*\s*\(?|\(?총괄\s*관리자\s*\(?)/, '').replace(/[\)\(]/g, '').trim() || rawName;

    const senderLeadershipRole = getInterviewerLeadershipRole(cleanName);
    const isLeader = senderLeadershipRole === 'CAPTAIN' || senderLeadershipRole === 'VICE_CAPTAIN';

    const newMessage: InterviewerChatMessage = {
      id: `chat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      roomId: roomId || '',
      roomName: roomName || '',
      candidateId: candidateId || '',
      candidateName: candidateName || '',
      senderId: senderId || 'user-unknown',
      senderName: cleanName,
      senderRole: senderRole || '면접관',
      senderLeadershipRole,
      isOfficialLeaderNotice: isLeader && Boolean(isOfficialLeaderNotice),
      message: message.trim(),
      timestamp: getKSTTimeStr(),
      createdAt: Date.now(),
      isImportant: !!isImportant || (isLeader && Boolean(isOfficialLeaderNotice)),
      sharedQuestion
    };

    if (!Array.isArray(db.chatMessages)) {
      db.chatMessages = [];
    }

    db.chatMessages.push(newMessage);
    // Keep max 500 messages to prevent unbounded memory growth
    if (db.chatMessages.length > 500) {
      db.chatMessages = db.chatMessages.slice(-500);
    }

    await saveCloudState();
    res.status(201).json({ success: true, message: newMessage });
  });

  app.delete('/api/chat/messages/:id', async (req, res) => {
    const { id } = req.params;
    if (Array.isArray(db.chatMessages)) {
      const idx = db.chatMessages.findIndex(m => m.id === id);
      if (idx >= 0) {
        const removed = db.chatMessages.splice(idx, 1)[0];
        await saveCloudState();
        return res.json({ success: true, removed });
      }
    }
    res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
  });

  app.delete('/api/chat/messages', async (req, res) => {
    const { candidateId, roomId } = req.query;
    if (Array.isArray(db.chatMessages)) {
      if (candidateId) {
        db.chatMessages = db.chatMessages.filter(m => m.candidateId !== candidateId);
      } else if (roomId) {
        db.chatMessages = db.chatMessages.filter(m => m.roomId !== roomId);
      } else {
        db.chatMessages = [];
      }
      await saveCloudState();
    }
    res.json({ success: true });
  });

  // Proxy Endpoint for Web Embedding & Document Viewing (Solves X-Frame-Options / Refused to Connect issues)
  app.get('/api/proxy/embed', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      let validatedUrl = targetUrl.trim();
      if (!validatedUrl.startsWith('http://') && !validatedUrl.startsWith('https://')) {
        validatedUrl = `https://${validatedUrl}`;
      }

      const response = await fetch(validatedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      const contentType = response.headers.get('content-type') || 'text/html';
      
      // If it's HTML, strip frame blocking headers and inject <base href="...">
      if (contentType.includes('text/html')) {
        let html = await response.text();
        const urlObj = new URL(validatedUrl);
        const origin = urlObj.origin;
        const baseHref = validatedUrl;

        // Inject base tag so relative links, images, css resolve correctly
        if (!html.includes('<base ') && !html.includes('<BASE ')) {
          if (html.includes('<head>')) {
            html = html.replace('<head>', `<head><base href="${baseHref}">`);
          } else if (html.includes('<HEAD>')) {
            html = html.replace('<HEAD>', `<HEAD><base href="${baseHref}">`);
          } else {
            html = `<base href="${baseHref}">${html}`;
          }
        }

        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(html);
      } else {
        // Stream / buffer other types
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        const buffer = await response.arrayBuffer();
        return res.send(Buffer.from(buffer));
      }
    } catch (err: any) {
      console.error('Embed proxy fetch error:', err.message);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; text-align: center; color: #334155; background: #f8fafc; }
            .card { max-width: 520px; margin: 40px auto; background: white; padding: 28px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
            h3 { color: #0f172a; margin-top: 0; }
            p { font-size: 13px; line-height: 1.6; color: #64748b; }
            .btn { display: inline-block; margin-top: 14px; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; }
            .btn:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>🔗 원본 사이트 직접 열람 안내</h3>
            <p>보안 정책(CORS/X-Frame)으로 인해 인앱 직접 렌더링이 제한되는 외부 웹사이트입니다.</p>
            <p style="font-family: monospace; font-size: 11px; word-break: break-all; background: #f1f5f9; padding: 8px; border-radius: 6px;">${targetUrl}</p>
            <a href="${targetUrl}" target="_blank" rel="noreferrer" class="btn">새 창에서 바로 열기 ↗</a>
          </div>
        </body>
        </html>
      `);
    }
  });

  // Dedicated endpoint for Admin confirming evaluation criteria
  app.post('/api/settings/confirm-criteria', async (req, res) => {
    const { password, adminPassword, criteria, scoringFormula, passThresholdScore, adminName, confirmedBy } = req.body;
    const pwd = password || adminPassword;
    if (pwd !== 'admin') {
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

  // Dedicated endpoint for Admin unconfirming (re-opening for edit)
  app.post('/api/settings/unconfirm-criteria', async (req, res) => {
    const { password, adminPassword, adminName, operatorName } = req.body;
    const pwd = password || adminPassword;
    if (pwd !== 'admin') {
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

  // 3. Candidates endpoints
  app.get('/api/candidates', (req, res) => {
    checkAndAutoFinalizeReopenedCandidates();
    const { roomId } = req.query;
    if (roomId && typeof roomId === 'string') {
      res.json(db.candidates.filter(c => !c.roomId || c.roomId === roomId));
    } else {
      res.json(db.candidates);
    }
  });

  app.get('/api/candidates/:id', (req, res) => {
    checkAndAutoFinalizeReopenedCandidates();
    const candidate = db.candidates.find(c => c.id === req.params.id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    res.json(candidate);
  });

  // Candidate Document Addition
  app.post('/api/candidates/:id/documents', async (req, res) => {
    const { id } = req.params;
    const newDoc: DocumentItem = req.body;
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

  // Candidate Document Deletion
  app.delete('/api/candidates/:id/documents/:docId', async (req, res) => {
    const { id, docId } = req.params;
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

  app.post('/api/candidates', async (req, res) => {
    const newCandidate: Candidate = req.body;
    if (!newCandidate.id) {
      newCandidate.id = `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    }
    if (!newCandidate.sttTranscript) newCandidate.sttTranscript = [];
    if (!newCandidate.aiInsights) {
      newCandidate.aiInsights = { realtimeSummaries: [], tailQuestions: [], contradictions: [] };
    }
    if (!newCandidate.documents) newCandidate.documents = [];

    // Automatically inject the shared Google Docs document if not already present
    const SHARED_GDOC_URL = 'https://docs.google.com/document/d/1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4/edit?usp=drivesdk';
    const hasSharedDoc = newCandidate.documents.some(d => d.url && d.url.includes('1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4'));
    if (!hasSharedDoc) {
      newCandidate.documents.unshift({
        id: `gdoc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: '면접평가기준',
        type: 'gdocs',
        url: SHARED_GDOC_URL,
        fileSize: 'Google Docs (인앱 연동)',
        contentSnippet: '구글 닥스 면접평가기준 원본 (인앱 미리보기 지원)',
        rawText: 'SmartLab 지원자 공식 구글 닥스 서류 링크: https://docs.google.com/document/d/1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4/edit?usp=drivesdk',
        uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false })
      });
    }

    db.candidates.push(newCandidate);
    await saveCloudState();
    res.status(201).json(newCandidate);
  });

  app.post('/api/candidates/batch', async (req, res) => {
    const { candidates: newCandidates, roomId } = req.body;
    if (!Array.isArray(newCandidates) || newCandidates.length === 0) {
      return res.status(400).json({ error: '등록할 지원자 목록이 비어 있습니다.' });
    }

    const SHARED_GDOC_URL = 'https://docs.google.com/document/d/1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4/edit?usp=drivesdk';
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
          rawText: 'SmartLab 지원자 공식 구글 닥스 서류 링크: https://docs.google.com/document/d/1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4/edit?usp=drivesdk',
          uploadedAt: new Date().toLocaleTimeString('ko-KR', { hour12: false })
        });
      }

      const candidate: Candidate = {
        ...c,
        id: c.id || `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        roomId: c.roomId || roomId || (c.timeslot?.room ? db.rooms.find(r => r.name === c.timeslot.room)?.id : undefined),
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

  app.delete('/api/candidates/:id', async (req, res) => {
    const { id } = req.params;
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

  app.post('/api/candidates/clear-all', async (req, res) => {
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

  // Candidate Status Transition
  app.post('/api/candidates/:id/status', async (req, res) => {
    const { id } = req.params;
    const { action, interviewerId, reason, operatorName } = req.body;
    const candidate = db.candidates.find(c => c.id === id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const oldStatus = candidate.status;

    if (action === 'start') {
      candidate.status = 'IN_PROGRESS';
      if (!candidate.startedAt) {
        candidate.startedAt = getKSTDateTimeStr();
      }
      candidate.interviewStartedTimestamp = Date.now();

      // Push real-time notification to all other interviewers
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
      // 5분간 완료 취소 및 수정 모드 개방
      // 1. 처음 완료된 시간 보존
      if (!candidate.initialCompletedAt) {
        candidate.initialCompletedAt = candidate.completedAt || getKSTDateTimeStr();
      }
      candidate.completedAt = candidate.initialCompletedAt;
      candidate.status = 'IN_PROGRESS';
      candidate.reopenedUntil = Date.now() + 5 * 60 * 1000; // 5분 (300초)
      candidate.reopenedAt = getKSTDateTimeStr();
      candidate.reopenedBy = operatorName || '동아리 총괄 관리자 (Admin)';
      candidate.isModifiedUnderAdmin = true;
      candidate.lastModifiedAt = getKSTDateTimeStr();

      // 평가표도 수정 가능하도록 IN_PROGRESS로 일시 전환
      const evals = db.evaluations.filter(e => e.candidateId === id);
      evals.forEach(e => {
        e.status = 'IN_PROGRESS';
      });

      // 알림 전송
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
      // 2/3 majority requirement for no-show
      const room = db.rooms.find(r => r.id === candidate.roomId);
      const totalPanel = (room?.interviewers?.length) || (candidate.interviewers?.length) || 3;
      const requiredVotes = Math.ceil((totalPanel * 2) / 3); // 2/3 or more

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
      const totalPanel = (room?.interviewers?.length) || (candidate.interviewers?.length) || 1;
      const evals = db.evaluations.filter(e => e.candidateId === id);
      const submittedCount = evals.filter(e => e.status === 'SUBMITTED').length;

      if (submittedCount >= totalPanel || (evals.length > 0 && evals.length === submittedCount)) {
        candidate.status = 'COMPLETED';
        candidate.reopenedUntil = undefined;
        // 처음에 되었던 완료 시간 그대로 유지 (최초 완료 시간 보존)
        if (!candidate.initialCompletedAt) {
          candidate.initialCompletedAt = candidate.completedAt || getKSTDateTimeStr();
        }
        candidate.completedAt = candidate.initialCompletedAt;

        // Qualitative synthesis if completed
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

    // Audit log
    db.auditLogs.unshift({
      id: `audit-${Date.now().toString(36)}`,
      timestamp: getKSTDateTimeStr(),
      modifiedBy: operatorName || '면접관 패널',
      field: `${candidate.name} (${candidate.id}) 상태 변경: ${action}`,
      beforeVal: { status: oldStatus },
      afterVal: { status: candidate.status, completedAt: candidate.completedAt, initialCompletedAt: candidate.initialCompletedAt },
      reason: reason || (action === 'admin_reopen_5min'
        ? `관리자 승인 5분 수정 모드 개방 (5분 후 자동 재완료, 최초 완료시각 ${candidate.initialCompletedAt} 유지)`
        : `상태 전이 액션 실행 (${action})`)
    });

    await saveCloudState();

    res.json({ candidate, evaluations: db.evaluations.filter(e => e.candidateId === id) });
  });

  // 4. Evaluations (with Blind Realtime Protection)
  app.get('/api/candidates/:id/evaluations', (req, res) => {
    const { id } = req.params;
    const { interviewerId, isAdmin } = req.query;

    const evals = db.evaluations.filter(e => e.candidateId === id);
    const candidate = db.candidates.find(c => c.id === id);
    const room = db.rooms.find(r => r.id === candidate?.roomId);
    const totalPanel = (room?.interviewers?.length) || (candidate?.interviewers?.length) || 1;

    const submittedEvals = evals.filter(e => e.status === 'SUBMITTED');
    const isAllSubmitted = (submittedEvals.length >= totalPanel) || candidate?.status === 'COMPLETED';

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

  app.post('/api/candidates/:id/evaluations', async (req, res) => {
    const { id } = req.params;
    const incoming: Evaluation = req.body;
    incoming.candidateId = id;

    const candidate = db.candidates.find(c => c.id === id);
    const room = db.rooms.find(r => r.id === candidate?.roomId);
    
    // Check room criteria or global criteria confirmation
    const isCriteriaConfirmed = room && room.criteria && room.criteria.length > 0
      ? (room.isCriteriaConfirmed ?? false)
      : (db.settings.isCriteriaConfirmed ?? false);

    // Enforce criteria confirmation requirement
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

    const existingIndex = db.evaluations.findIndex(
      e => e.candidateId === id && e.interviewerId === incoming.interviewerId
    );

    if (existingIndex >= 0) {
      db.evaluations[existingIndex] = {
        ...db.evaluations[existingIndex],
        ...incoming,
        submittedAt: incoming.status === 'SUBMITTED' ? new Date().toISOString() : db.evaluations[existingIndex].submittedAt
      };
    } else {
      db.evaluations.push({
        ...incoming,
        id: incoming.id || `eval-${Date.now().toString(36)}`,
        submittedAt: incoming.status === 'SUBMITTED' ? new Date().toISOString() : undefined
      });
    }

    await saveCloudState();
    res.json({ success: true, evaluation: incoming });
  });

  // 5. STT Speech & Realtime AI Feedback (with Room Criteria & Persona)
  app.post('/api/candidates/:id/stt', async (req, res) => {
    const { id } = req.params;
    const { message, triggerAI, personaStyle, customFocusPrompt, customApiKey } = req.body;
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
        const activeCriteria = (room && room.criteria && room.criteria.length > 0)
          ? room.criteria
          : db.settings.criteria;

        const effectivePersona = personaStyle || room?.defaultQuestionPersona || 'BALANCED';
        const effectiveFocus = customFocusPrompt || (room?.customFocusKeywords && room.customFocusKeywords.length > 0 ? room.customFocusKeywords.join(', ') : undefined);

        const docText = candidate.documents?.map(d => d.rawText || d.contentSnippet || '').join('\n') || '';
        const transcriptHistory = candidate.sttTranscript.slice(-6).map(s => `${s.speaker}: ${s.text}`).join('\n');
        
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
          // Retain max 40 high quality tail questions
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

  // 5.1 On-Demand Custom Interview Question Generation with Persona / Style / Keywords
  app.post('/api/candidates/:id/generate-questions', async (req, res) => {
    const { id } = req.params;
    const { personaStyle, customFocusPrompt, latestAnswer, customApiKey } = req.body;
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
      const activeCriteria = (room && room.criteria && room.criteria.length > 0)
        ? room.criteria
        : db.settings.criteria;

      const effectivePersona = personaStyle || room?.defaultQuestionPersona || 'BALANCED';
      const effectiveFocus = customFocusPrompt || (room?.customFocusKeywords && room.customFocusKeywords.length > 0 ? room.customFocusKeywords.join(', ') : undefined);

      const docText = candidate.documents?.map(d => d.rawText || d.contentSnippet || '').join('\n') || '';
      
      // Determine latest answer from provided text or last candidate STT
      const lastCandSpeech = candidate.sttTranscript.slice().reverse().find(s => s.speaker === 'candidate');
      const speechToAnalyze = latestAnswer || lastCandSpeech?.text || `${candidate.name} 지원자의 ${candidate.track} 직무 핵심 역량 및 프로젝트 수행 경험`;

      const transcriptHistory = candidate.sttTranscript.slice(-8).map(s => `${s.speaker}: ${s.text}`).join('\n');

      // Use ultra-fast Llama-3.1-8b-instant for instant on-demand custom question generation
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

  // 5.2 Share Question with All Interviewers (Broadcasts to Chat, Notifications, and Shared Feed)
  app.post('/api/candidates/:id/tail-questions/share', async (req, res) => {
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
    const cleanName = rawName.replace(/^(면접관\s*\d*\s*\(?|\(?총괄\s*관리자\s*\(?)/, '').replace(/[\)\(]/g, '').trim() || rawName;

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

    // Mark question as shared across the platform
    targetQuestion.isShared = true;
    targetQuestion.sharedBy = cleanName;
    targetQuestion.sharedById = sharedById || 'user-unknown';
    targetQuestion.sharedAt = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    targetQuestion.shareCount = (targetQuestion.shareCount || 0) + 1;

    // 1. Create LiveNotification for all room members
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

    // 2. Automatically post to InterviewerChat channel as a rich question card message
    const chatMsg: InterviewerChatMessage = {
      id: `chat-q-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      roomId: roomId || candidate.roomId || '',
      roomName: candidate.timeslot?.room || 'SmartLab 면접 평가실',
      candidateId: candidate.id,
      candidateName: candidateName || candidate.name,
      senderId: sharedById || 'user-unknown',
      senderName: cleanName,
      senderRole: '면접관 (질문 공유)',
      message: `💡 [면접관 추천 질문 공유]\n"${targetQuestion.question}"\n\n📌 평가 의도: ${targetQuestion.intent || targetQuestion.reason || '동료 면접관 공유 질문'}`,
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

  // 5.3 Add User Custom Typed Question (Direct or with AI Polishing & Optional Share)
  app.post('/api/candidates/:id/custom-question', async (req, res) => {
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
    const cleanName = rawName.replace(/^(면접관\s*\d*\s*\(?|\(?총괄\s*관리자\s*\(?)/, '').replace(/[\)\(]/g, '').trim() || rawName;

    const room = db.rooms.find(r => r.id === candidate.roomId);
    const activeCriteria = (room && room.criteria && room.criteria.length > 0)
      ? room.criteria
      : db.settings.criteria;

    const criteriaIds = Array.isArray(evaluatedCriteria) && evaluatedCriteria.length > 0
      ? evaluatedCriteria
      : ['technical', 'problemSolving'];

    const newQuestion: TailQuestion = {
      id: `tq-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      question: questionText.trim(),
      claim: candidate.sttTranscript.slice().reverse().find(s => s.speaker === 'candidate')?.text?.substring(0, 80) || `${candidate.name} 지원자 답변`,
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
          evaluationGuideline: userTypedIntent || `${matched?.name || '직무 역량'}에 대한 깊이 있는 이해와 논리적 문제 해결력 직접 검증`
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
      followUpProbing: [
        '그 과정에서 예상치 못한 문제가 발생했을 때는 어떻게 대처하셨나요?'
      ],
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

    // If shared with everyone, create notification and chat
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

  // 6. Universal Data & Image Parser Endpoint
  app.post('/api/ai/universal-parser', async (req, res) => {
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

  // 7. Qualitative Synthesis & MindMap on demand
  app.post('/api/candidates/:id/ai-synthesis', async (req, res) => {
    const { id } = req.params;
    const candidate = db.candidates.find(c => c.id === id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    const evals = db.evaluations.filter(e => e.candidateId === id);
    try {
      const summary = await generateQualitativeSynthesisAI(candidate, evals, { knowledgeBase: db.settings.knowledgeBase });
      const mindmap = await generateMindMapAI(candidate, evals);
      candidate.qualitativeAiSummary = summary;
      candidate.mindMapData = mindmap;
      await saveCloudState();
      res.json({ qualitativeAiSummary: summary, mindMapData: mindmap });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7.1 AI Knowledge Base Learning & Training Endpoints
  app.get('/api/ai/knowledge', (req, res) => {
    if (!db.settings.knowledgeBase) db.settings.knowledgeBase = [];
    res.json(db.settings.knowledgeBase);
  });

  app.post('/api/ai/knowledge/learn', async (req, res) => {
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

  app.put('/api/ai/knowledge/:id/toggle', async (req, res) => {
    const { id } = req.params;
    if (!db.settings.knowledgeBase) db.settings.knowledgeBase = [];
    const item = db.settings.knowledgeBase.find(k => k.id === id);
    if (!item) return res.status(404).json({ error: '해당 지식 항목을 찾을 수 없습니다.' });

    item.isActive = !item.isActive;
    item.updatedAt = new Date().toLocaleString('ko-KR', { hour12: false });

    await saveCloudState();
    res.json({ success: true, item, knowledgeBase: db.settings.knowledgeBase });
  });

  app.delete('/api/ai/knowledge/:id', async (req, res) => {
    const { id } = req.params;
    const { password, adminPassword } = req.body || {};
    const pwd = password || adminPassword;
    // Allow deletion from app UI directly or with admin password
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

  // Batch delete knowledge items
  app.post('/api/ai/knowledge/batch-delete', async (req, res) => {
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

  // Delete all knowledge items
  app.delete('/api/ai/knowledge', async (req, res) => {
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

  app.post('/api/ai/knowledge/simulate', async (req, res) => {
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

  // 8. Admin Temporary Unlock & Audit Log
  app.get('/api/audit-logs', (req, res) => {
    res.json(db.auditLogs);
  });

  app.post('/api/admin/unlock-edit', async (req, res) => {
    const { password, candidateId, durationSeconds, operatorName } = req.body;
    if (password !== getEffectiveAdminPassword()) {
      return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
    }

    const duration = durationSeconds || 300; // 5 minutes
    db.adminUnlock = {
      candidateId: candidateId || null,
      expiresAt: Date.now() + duration * 1000
    };

    // If specific candidate provided, or if all candidates
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

      // Open evaluations for edit
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
      afterVal: { locked: false, expiresAt: getKSTDateTimeStr(db.adminUnlock.expiresAt), candidatesReopened: targetCandidates.map(c => c.name) },
      reason: `면접건(${candidateId || '전체'}) 데이터 사후 정정을 위한 5분간 임시 완료 취소 및 수정 권한 활성화 (최초 완료 시간 보존)`
    });

    if (!Array.isArray(db.notifications)) db.notifications = [];
    db.notifications.unshift({
      id: `notif-admin-unlock-${Date.now().toString(36)}`,
      type: 'ADMIN_ALERT',
      title: `⚠️ [관리자 권한] 5분간 면접 수정 모드 활성화`,
      message: `관리자 승인으로 5분간 면접 완료가 취소되고 수정이 가능합니다. 5분 후 원래 완료 시간으로 자동 재완료됩니다.`,
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

  app.post('/api/admin/modify-evaluation', async (req, res) => {
    const { candidateId, evaluationId, field, beforeVal, afterVal, reason, modifiedBy } = req.body;

    const isUnlocked = db.adminUnlock.expiresAt && db.adminUnlock.expiresAt > Date.now();
    if (!isUnlocked) {
      return res.status(403).json({ error: '관리자 수정 권한 시간이 만료되었거나 활성화되지 않았습니다.' });
    }

    const candidate = db.candidates.find(c => c.id === candidateId);
    if (candidate) {
      candidate.isModifiedUnderAdmin = true;
      candidate.lastModifiedAt = getKSTDateTimeStr();
    }

    const evalItem = db.evaluations.find(e => e.id === evaluationId || (e.candidateId === candidateId && e.interviewerId === req.body.interviewerId));
    if (evalItem && field && afterVal !== undefined) {
      if (field.startsWith('scores.')) {
        const scoreKey = field.replace('scores.', '') as keyof typeof evalItem.scores;
        evalItem.scores[scoreKey] = Number(afterVal);
      } else if (field.startsWith('presentationBonuses.')) {
        const bonusKey = field.replace('presentationBonuses.', '');
        if (!evalItem.presentationBonuses) evalItem.presentationBonuses = {};
        evalItem.presentationBonuses[bonusKey] = Number(afterVal);
        evalItem.presentationBonusTotal = Object.values(evalItem.presentationBonuses).reduce((a, b) => a + (Number(b) || 0), 0);
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

  app.post('/api/admin/verify-password', (req, res) => {
    const { password, adminPassword } = req.body || {};
    const pwd = (password || adminPassword || '').trim();
    if (pwd === getEffectiveAdminPassword()) {
      return res.json({ success: true, authorized: true });
    }
    return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
  });

  // ----------------------------------------------------
  // INTERVIEWER 4-DIGIT PIN AUTHENTICATION APIS
  // ----------------------------------------------------
  app.get('/api/interviewers/pin-status', (req, res) => {
    const { name, id } = req.query;
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanId = typeof id === 'string' ? id.trim() : '';
    
    if (!cleanName && !cleanId) {
      return res.status(400).json({ error: '면접관 이름 또는 ID가 필요합니다.' });
    }

    const nameKey = cleanName.toLowerCase().replace(/\s+/g, '');
    const idKey = cleanId.toLowerCase();
    const baseKey = cleanName.replace(/(\s*(면접관|심사위원|님))+$/g, '').trim().toLowerCase();

    const pins = db.settings?.interviewerPins || {};
    const setAts = db.settings?.interviewerPinSetAt || {};

    const storedPin = pins[nameKey] || (cleanId ? pins[idKey] : undefined) || (baseKey ? pins[baseKey] : undefined);
    const pinSetAt = setAts[nameKey] || (cleanId ? setAts[idKey] : undefined) || (baseKey ? setAts[baseKey] : undefined);

    res.json({
      isPinSet: Boolean(storedPin && storedPin.length === 4),
      interviewerName: cleanName || cleanId,
      pinSetAt: pinSetAt || null
    });
  });

  app.post('/api/interviewers/set-pin', async (req, res) => {
    const { interviewerName, interviewerId, pin } = req.body || {};
    const cleanName = (interviewerName || interviewerId || '').trim();
    const cleanId = (interviewerId || '').trim();
    const cleanPin = typeof pin === 'string' ? pin.trim() : '';

    if (!cleanName) {
      return res.status(400).json({ error: '면접관 정보가 누락되었습니다.' });
    }

    if (!/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({ error: '비밀번호는 반드시 4자리 숫자여야 합니다.' });
    }

    if (!db.settings.interviewerPins) db.settings.interviewerPins = {};
    if (!db.settings.interviewerPinSetAt) db.settings.interviewerPinSetAt = {};

    const nameKey = cleanName.toLowerCase().replace(/\s+/g, '');
    const idKey = cleanId ? cleanId.toLowerCase() : '';
    const baseKey = cleanName.replace(/(\s*(면접관|심사위원|님))+$/g, '').trim().toLowerCase();
    const nowKST = getKSTDateTimeStr();

    db.settings.interviewerPins[nameKey] = cleanPin;
    db.settings.interviewerPinSetAt[nameKey] = nowKST;

    if (baseKey) {
      db.settings.interviewerPins[baseKey] = cleanPin;
      db.settings.interviewerPinSetAt[baseKey] = nowKST;
    }
    if (idKey) {
      db.settings.interviewerPins[idKey] = cleanPin;
      db.settings.interviewerPinSetAt[idKey] = nowKST;
    }

    // Update room interviewer entities if present
    db.rooms.forEach(r => {
      if (Array.isArray(r.interviewers)) {
        r.interviewers.forEach(u => {
          if (u.name === cleanName || u.id === cleanId) {
            u.pinCode = cleanPin;
            u.isPinSet = true;
            u.pinSetAt = nowKST;
          }
        });
      }
    });

    db.auditLogs.unshift({
      id: `audit-pin-set-${Date.now().toString(36)}`,
      timestamp: nowKST,
      modifiedBy: cleanName,
      field: `[면접관 4자리 PIN 설정] ${cleanName}`,
      beforeVal: { isPinSet: false },
      afterVal: { isPinSet: true, pinSetAt: nowKST },
      reason: `${cleanName} 면접관이 최초 4자리 숫자 비밀번호를 설정함`
    });

    await saveCloudState();
    res.json({
      success: true,
      message: '4자리 비밀번호가 안전하게 설정되었습니다.',
      interviewerName: cleanName,
      pinSetAt: nowKST
    });
  });

  app.post('/api/interviewers/verify-pin', (req, res) => {
    const { interviewerName, interviewerId, pin } = req.body || {};
    const cleanName = (interviewerName || interviewerId || '').trim();
    const cleanId = (interviewerId || '').trim();
    const cleanPin = typeof pin === 'string' ? pin.trim() : '';

    if (!cleanName) {
      return res.status(400).json({ error: '면접관 정보가 누락되었습니다.' });
    }

    if (!cleanPin) {
      return res.status(400).json({ verified: false, error: '4자리 비밀번호를 입력해주세요.' });
    }

    const nameKey = cleanName.toLowerCase().replace(/\s+/g, '');
    const idKey = cleanId ? cleanId.toLowerCase() : '';
    const baseKey = cleanName.replace(/(\s*(면접관|심사위원|님))+$/g, '').trim().toLowerCase();

    const pins = db.settings?.interviewerPins || {};
    const storedPin = pins[nameKey] || (idKey ? pins[idKey] : undefined) || (baseKey ? pins[baseKey] : undefined);

    if (!storedPin) {
      return res.json({
        verified: false,
        isPinSet: false,
        error: '설정된 비밀번호가 없습니다. 최초 4자리 비밀번호 설정을 진행해주세요.'
      });
    }

    if (storedPin === cleanPin) {
      return res.json({
        success: true,
        verified: true,
        interviewerName: cleanName
      });
    }

    return res.status(401).json({
      verified: false,
      isPinSet: true,
      error: '비밀번호가 일치하지 않습니다. 4자리 숫자를 다시 확인해주세요.'
    });
  });

  app.post('/api/interviewers/reset-pin', async (req, res) => {
    const { adminPassword, password, interviewerName, interviewerId } = req.body || {};
    const pwd = (adminPassword || password || '').trim();
    if (pwd !== getEffectiveAdminPassword()) {
      return res.status(401).json({ error: '관리자 권한 인증에 실패했습니다.' });
    }

    const cleanName = (interviewerName || interviewerId || '').trim();
    const cleanId = (interviewerId || '').trim();

    if (!cleanName) {
      return res.status(400).json({ error: '초기화할 면접관 정보가 필요합니다.' });
    }

    const nameKey = cleanName.toLowerCase().replace(/\s+/g, '');
    const idKey = cleanId ? cleanId.toLowerCase() : '';
    const baseKey = cleanName.replace(/(\s*(면접관|심사위원|님))+$/g, '').trim().toLowerCase();
    const nowKST = getKSTDateTimeStr();

    if (db.settings.interviewerPins) {
      delete db.settings.interviewerPins[nameKey];
      if (baseKey) delete db.settings.interviewerPins[baseKey];
      if (idKey) delete db.settings.interviewerPins[idKey];
    }
    if (db.settings.interviewerPinSetAt) {
      delete db.settings.interviewerPinSetAt[nameKey];
      if (baseKey) delete db.settings.interviewerPinSetAt[baseKey];
      if (idKey) delete db.settings.interviewerPinSetAt[idKey];
    }

    db.rooms.forEach(r => {
      if (Array.isArray(r.interviewers)) {
        r.interviewers.forEach(u => {
          if (u.name === cleanName || u.id === cleanId) {
            u.pinCode = undefined;
            u.isPinSet = false;
            u.pinSetAt = undefined;
          }
        });
      }
    });

    db.auditLogs.unshift({
      id: `audit-pin-reset-${Date.now().toString(36)}`,
      timestamp: nowKST,
      modifiedBy: '총괄 관리자 (Admin)',
      field: `[면접관 4자리 PIN 초기화] ${cleanName}`,
      beforeVal: { isPinSet: true },
      afterVal: { isPinSet: false },
      reason: `어드민이 ${cleanName} 면접관의 4자리 비밀번호를 초기화하여 재설정할 수 있도록 조치함`
    });

    await saveCloudState();
    res.json({
      success: true,
      message: `${cleanName} 면접관의 비밀번호가 초기화되었습니다. 다음 입장 시 4자리 비밀번호를 새로 설정합니다.`
    });
  });

  app.get('/api/interviewers/all-pins-status', (req, res) => {
    const pins = db.settings?.interviewerPins || {};
    const setAts = db.settings?.interviewerPinSetAt || {};
    res.json({
      pinsCount: Object.keys(pins).length,
      pinsSummary: Object.keys(pins).map(key => ({
        key,
        isPinSet: true,
        pinSetAt: setAts[key] || null
      }))
    });
  });

  // ----------------------------------------------------
  // CANDIDATE SELF-SERVICE PORTAL & MESSAGING APIS
  // ----------------------------------------------------
  app.post('/api/candidate-portal/login', async (req, res) => {
    try {
      const { roomId, studentId, name, track, phone, email, interviewDate, startTime, endTime } = req.body || {};
      const cleanRoomId = (roomId || '').trim();
      const cleanStudentId = (studentId || '').trim();
      const cleanName = (name || '').trim();

      if (!cleanRoomId) {
        return res.status(400).json({ error: '면접 평가 방을 선택해주세요.' });
      }
      if (!cleanStudentId || !cleanName) {
        return res.status(400).json({ error: '학번과 성함을 모두 입력해주세요.' });
      }

      const room = db.rooms.find(r => r.id === cleanRoomId);
      if (!room) {
        return res.status(404).json({ error: '선택하신 면접 방이 존재하지 않습니다.' });
      }

      // Find existing candidate by studentId in the room, or globally by studentId + name
      let candidate = db.candidates.find(
        c => (c.roomId === cleanRoomId && (c.studentId.trim() === cleanStudentId || c.name.trim() === cleanName)) ||
             (c.studentId.trim() === cleanStudentId && c.name.trim() === cleanName)
      );

      const effectiveDate = interviewDate ? interviewDate.trim() : (candidate?.interviewDate || new Date().toISOString().split('T')[0]);
      const effectiveStart = startTime ? startTime.trim() : (candidate?.timeslot?.start || '14:00');
      const effectiveEnd = endTime ? endTime.trim() : (candidate?.timeslot?.end || '14:30');

      if (candidate) {
        // If candidate belonged to this room or global match, associate with cleanRoomId if not set
        if (!candidate.roomId) candidate.roomId = cleanRoomId;
        candidate.lastCandidateActiveAt = getKSTDateTimeStr();
        if (cleanName && candidate.name !== cleanName) candidate.name = cleanName;
        if (phone) candidate.phone = phone;
        if (email) candidate.email = email;
        if (interviewDate) candidate.interviewDate = effectiveDate;
        if (startTime || endTime) {
          candidate.timeslot = {
            start: effectiveStart,
            end: effectiveEnd,
            room: room.name || room.title || candidate.timeslot?.room || 'SmartLab 면접실'
          };
        }
      } else {
        // Create new candidate entry
        const newCandidateId = `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
        const defaultInterviewerNames = (room.interviewers || []).map(i => i.name);

        candidate = {
          id: newCandidateId,
          roomId: cleanRoomId,
          name: cleanName,
          track: track || '일반 지원',
          studentId: cleanStudentId,
          phone: phone || '',
          email: email || '',
          timeslot: {
            start: effectiveStart,
            end: effectiveEnd,
            room: room.name || room.title || 'SmartLab 면접실'
          },
          status: 'PENDING',
          interviewers: defaultInterviewerNames.length > 0 ? defaultInterviewerNames : ['면접관 1', '면접관 2', '면접관 3'],
          documents: [
            {
              id: `gdoc-${newCandidateId}`,
              title: '면접평가기준',
              type: 'gdocs',
              url: 'https://docs.google.com/document/d/1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4/edit?usp=drivesdk',
              fileSize: 'Google Docs (인앱 연동)',
              contentSnippet: '구글 닥스 지원서류 원본 (인앱 미리보기 지원)',
              rawText: 'SmartLab 지원자 공식 구글 닥스 서류 링크: https://docs.google.com/document/d/1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4/edit?usp=drivesdk',
              uploadedAt: getKSTTimeStr()
            }
          ],
          sttTranscript: [],
          aiInsights: {
            realtimeSummaries: [],
            tailQuestions: [],
            contradictions: []
          },
          interviewDate: effectiveDate,
          reminder10MinEnabled: true,
          lastCandidateActiveAt: getKSTDateTimeStr()
        };

        db.candidates.push(candidate);
        room.candidateCount = db.candidates.filter(c => c.roomId === cleanRoomId).length;

        db.auditLogs.unshift({
          id: `audit-cand-reg-${Date.now().toString(36)}`,
          timestamp: getKSTDateTimeStr(),
          modifiedBy: `지원자 본인 (${cleanName})`,
          field: '지원자 셀프 등록',
          beforeVal: null,
          afterVal: { id: candidate.id, name: candidate.name, studentId: candidate.studentId, room: room.name, date: effectiveDate, timeslot: candidate.timeslot },
          reason: '지원자 포털에서 직접 학번/이름/면접일정 입력으로 지원 등록'
        });
      }

      await saveCloudState();

      if (!Array.isArray(db.candidateMessages)) db.candidateMessages = [];
      const messages = db.candidateMessages.filter(
        m => m.candidateId === candidate!.id || (m.studentId === candidate!.studentId && m.roomId === cleanRoomId)
      );

      return res.json({
        success: true,
        candidate,
        room,
        messages
      });
    } catch (err: any) {
      console.error('Candidate login error:', err);
      return res.status(500).json({ error: '지원자 로그인 처리 중 서버 오류가 발생했습니다.' });
    }
  });

  // Candidate Live Status Polling API (Safe: strictly removes evaluation scores, comments, AI prompts)
  app.get('/api/candidate-portal/status', (req, res) => {
    const { candidateId, roomId, studentId } = req.query;
    if (!candidateId && (!roomId || !studentId)) {
      return res.status(400).json({ error: 'candidateId or (roomId and studentId) required' });
    }

    const candidate = db.candidates.find(
      c => (candidateId && c.id === candidateId) ||
           (roomId && studentId && c.roomId === roomId && c.studentId === studentId)
    );

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const room = db.rooms.find(r => r.id === candidate.roomId);

    // List of interviewers for this room / candidate (Safe view without evaluation scores)
    const assignedInterviewers = (room?.interviewers || []).map(i => ({
      id: i.id,
      name: i.name,
      role: i.role,
      avatarColor: i.avatarColor
    }));

    // Return safe candidate object
    const safeCandidate = {
      id: candidate.id,
      roomId: candidate.roomId,
      name: candidate.name,
      studentId: candidate.studentId,
      phone: candidate.phone,
      email: candidate.email,
      track: candidate.track,
      timeslot: candidate.timeslot,
      interviewDate: candidate.interviewDate,
      status: candidate.status,
      startedAt: candidate.startedAt,
      interviewStartedTimestamp: candidate.interviewStartedTimestamp,
      completedAt: candidate.completedAt,
      initialCompletedAt: candidate.initialCompletedAt,
      interviewers: candidate.interviewers || assignedInterviewers.map(i => i.name),
      documents: candidate.documents || [],
      sttTranscript: candidate.sttTranscript || [],
      reminder10MinEnabled: candidate.reminder10MinEnabled,
      candidateNotes: candidate.candidateNotes
    };

    return res.json({
      success: true,
      candidate: safeCandidate,
      room: room ? {
        id: room.id,
        name: room.name,
        title: room.title,
        description: room.description,
        interviewers: assignedInterviewers,
        minutesPerPerson: room.minutesPerPerson || 30
      } : null,
      assignedInterviewers
    });
  });

  app.post('/api/candidate-portal/update-profile', async (req, res) => {
    try {
      const {
        candidateId,
        timeslot,
        interviewDate,
        documents,
        phone,
        email,
        track,
        candidateNotes,
        reminder10MinEnabled
      } = req.body || {};

      if (!candidateId) {
        return res.status(400).json({ error: '지원자 식별자가 필요합니다.' });
      }

      const candidate = db.candidates.find(c => c.id === candidateId);
      if (!candidate) {
        return res.status(404).json({ error: '해당 지원자를 찾을 수 없습니다.' });
      }

      if (timeslot) {
        candidate.timeslot = {
          ...candidate.timeslot,
          ...timeslot
        };
      }
      if (interviewDate !== undefined) candidate.interviewDate = interviewDate;
      if (Array.isArray(documents)) candidate.documents = documents;
      if (phone !== undefined) candidate.phone = phone;
      if (email !== undefined) candidate.email = email;
      if (track !== undefined) candidate.track = track;
      if (candidateNotes !== undefined) candidate.candidateNotes = candidateNotes;
      if (reminder10MinEnabled !== undefined) candidate.reminder10MinEnabled = Boolean(reminder10MinEnabled);
      candidate.lastCandidateActiveAt = getKSTDateTimeStr();
      candidate.lastModifiedAt = getKSTDateTimeStr();

      if (!Array.isArray(db.notifications)) db.notifications = [];
      db.notifications.unshift({
        id: `notif-cand-up-${Date.now().toString(36)}`,
        type: 'INTERVIEWER_ACTION',
        title: `📄 '${candidate.name}' 지원자 정보/서류 업데이트`,
        message: `${candidate.name} 지원자가 면접 일정(${candidate.interviewDate || ''} ${candidate.timeslot?.start || ''}) 및 추가 서류(${candidate.documents?.length || 0}건)를 제출/수정했습니다.`,
        timestamp: getKSTTimeStr(),
        createdAt: Date.now(),
        roomId: candidate.roomId,
        candidateId: candidate.id,
        candidateName: candidate.name,
        operatorName: candidate.name
      });

      await saveCloudState();
      return res.json({ success: true, candidate });
    } catch (err: any) {
      console.error('Candidate profile update error:', err);
      return res.status(500).json({ error: '지원자 정보 업데이트 중 오류가 발생했습니다.' });
    }
  });

  app.get('/api/candidate-portal/messages', (req, res) => {
    const { candidateId, roomId, studentId } = req.query;
    if (!Array.isArray(db.candidateMessages)) db.candidateMessages = [];

    const messages = db.candidateMessages.filter(m => {
      if (candidateId && m.candidateId === candidateId) return true;
      if (roomId && studentId && m.roomId === roomId && m.studentId === studentId) return true;
      return false;
    });

    res.json({ success: true, messages });
  });

  app.post('/api/candidate-portal/send-message', async (req, res) => {
    try {
      const {
        candidateId,
        roomId,
        studentId,
        candidateName,
        senderType,
        senderName,
        senderInterviewerId,
        text
      } = req.body || {};

      if (!candidateId || !text || !text.trim()) {
        return res.status(400).json({ error: '메시지 내용과 지원자 ID가 필요합니다.' });
      }

      if (!Array.isArray(db.candidateMessages)) db.candidateMessages = [];

      const cleanText = text.trim();
      const isFromCandidate = senderType === 'candidate';

      const newMessage: CandidateChatMessage = {
        id: `cmsg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        roomId: roomId || '',
        candidateId,
        studentId: studentId || '',
        candidateName: candidateName || '지원자',
        senderType: isFromCandidate ? 'candidate' : 'interviewer',
        senderName: isFromCandidate ? (candidateName || '지원자') : (senderName || 'SmartLab 면접관'),
        senderInterviewerId: isFromCandidate ? undefined : senderInterviewerId,
        text: cleanText,
        timestamp: getKSTTimeStr(),
        createdAt: Date.now(),
        readByCandidate: isFromCandidate,
        readByInterviewers: isFromCandidate ? [] : [senderInterviewerId || 'interviewer']
      };

      db.candidateMessages.push(newMessage);

      // If sent by candidate, notify interviewers in realtime
      if (isFromCandidate) {
        if (!Array.isArray(db.notifications)) db.notifications = [];
        db.notifications.unshift({
          id: `notif-cand-msg-${Date.now().toString(36)}`,
          type: 'INTERVIEWER_ACTION',
          title: `💬 '${candidateName || '지원자'}'님의 메시지 도착`,
          message: cleanText.length > 40 ? cleanText.substring(0, 40) + '...' : cleanText,
          timestamp: getKSTTimeStr(),
          createdAt: Date.now(),
          roomId,
          candidateId,
          candidateName,
          operatorName: candidateName
        });
      }

      await saveCloudState();

      const relevantMessages = db.candidateMessages.filter(m => m.candidateId === candidateId);
      return res.json({ success: true, message: newMessage, messages: relevantMessages });
    } catch (err: any) {
      console.error('Send message error:', err);
      return res.status(500).json({ error: '메시지 전송 중 오류가 발생했습니다.' });
    }
  });

  app.post('/api/candidate-portal/toggle-reminder', async (req, res) => {
    try {
      const { candidateId, enabled } = req.body || {};
      const candidate = db.candidates.find(c => c.id === candidateId);
      if (!candidate) return res.status(404).json({ error: '지원자를 찾을 수 없습니다.' });

      candidate.reminder10MinEnabled = Boolean(enabled);
      candidate.lastCandidateActiveAt = getKSTDateTimeStr();

      if (enabled) {
        if (!Array.isArray(db.notifications)) db.notifications = [];
        db.notifications.unshift({
          id: `notif-remind-${Date.now().toString(36)}`,
          type: 'TIME_ALERT',
          title: `🔔 '${candidate.name}' 지원자 면접 10분 전 알림 요청 활성화`,
          message: `${candidate.name} 지원자가 면접 시작 10분 전 실시간 알림 수신을 활성화했습니다. (예정 시간: ${candidate.interviewDate || ''} ${candidate.timeslot?.start || ''})`,
          timestamp: getKSTTimeStr(),
          createdAt: Date.now(),
          roomId: candidate.roomId,
          candidateId: candidate.id,
          candidateName: candidate.name,
          operatorName: candidate.name
        });
      }

      await saveCloudState();
      return res.json({ success: true, candidate });
    } catch (err: any) {
      return res.status(500).json({ error: '알림 설정 중 오류가 발생했습니다.' });
    }
  });

  // ----------------------------------------------------
  // ADMIN ALL INTERVIEWS COMPLETION & RESULTS PUBLISHING
  // ----------------------------------------------------

  // Calculate score for single evaluator
  function computeEvaluatorTotal(
    scores: Record<string, number> | undefined,
    bonuses: Record<string, number> | undefined,
    bonusTotal: number | undefined,
    criteria: any[]
  ): number {
    if (!scores) return 0;
    let baseSum = 0;
    let bSum = bonusTotal !== undefined ? bonusTotal : 0;

    criteria.forEach(crit => {
      const raw = Number(scores[crit.id]) || 0;
      const weight = Number(crit.weight) || 0;
      baseSum += (raw * weight) / 100;
      if (bonusTotal === undefined) {
        bSum += Number(bonuses?.[crit.id]) || 0;
      }
    });
    return Math.round((baseSum + bSum) * 10) / 10;
  }

  // Calculate candidate aggregate score
  function computeCandidateScore(
    candidate: Candidate,
    evals: Evaluation[],
    room: InterviewRoomInfo | undefined,
    settings: PlatformSettings
  ): number {
    const activeCriteria = (room?.criteria && room.criteria.length > 0)
      ? room.criteria
      : ((settings.criteria && settings.criteria.length > 0) ? settings.criteria : [
          { id: 'technical', name: '기술 역량', weight: 40 },
          { id: 'problemSolving', name: '문제 해결력', weight: 30 },
          { id: 'communication', name: '의사소통', weight: 20 },
          { id: 'cultureFit', name: '동아리 적합도', weight: 10 }
        ]);

    const submitted = evals.filter(e => e.candidateId === candidate.id && e.status === 'SUBMITTED');
    if (submitted.length === 0) return 0;

    const scoresList = submitted.map(e =>
      computeEvaluatorTotal(e.scores, e.presentationBonuses, e.presentationBonusTotal, activeCriteria)
    );

    const formula = room?.scoringFormula || settings.scoringFormula || 'TRIMMED_MEAN';
    if (formula === 'TRIMMED_MEAN' && scoresList.length >= 3) {
      const sorted = [...scoresList].sort((a, b) => a - b);
      const trimmed = sorted.slice(1, -1);
      const sum = trimmed.reduce((a, b) => a + b, 0);
      return Math.round((sum / trimmed.length) * 10) / 10;
    }
    if (formula === 'MEDIAN') {
      const sorted = [...scoresList].sort((a, b) => a - b);
      const mid = Math.floor(scoresList.length / 2);
      if (scoresList.length % 2 !== 0) {
        return Math.round(sorted[mid] * 10) / 10;
      }
      return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
    }

    const sum = scoresList.reduce((a, b) => a + b, 0);
    return Math.round((sum / scoresList.length) * 10) / 10;
  }

  // Admin endpoint: Finalize all interviews and publish results
  app.post('/api/admin/complete-all-interviews', async (req, res) => {
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
      db.settings.resultsPublishedBy = isResultsPublished ? (operatorName || '관리자 (Admin)') : undefined;
      db.settings.showPassFailToCandidates = Boolean(showPassFailToCandidates);
      db.settings.interviewerNameDisplayPolicy = interviewerNameDisplayPolicy as InterviewerNameDisplayPolicy;
      db.settings.showStatsToCandidates = Boolean(showStatsToCandidates);
      db.settings.showDetailedComments = Boolean(showDetailedComments);

      // Auto-complete any candidates not marked as NO_SHOW
      db.candidates.forEach(c => {
        if (c.status !== 'NO_SHOW') {
          if (!c.initialCompletedAt) {
            c.initialCompletedAt = c.completedAt || getKSTDateTimeStr();
          }
          c.completedAt = c.initialCompletedAt;
          c.status = 'COMPLETED';
        }
      });

      // Trigger asynchronous background AI generation for all completed candidates
      (async () => {
        for (const cand of db.candidates) {
          const candEvals = db.evaluations.filter(e => e.candidateId === cand.id);
          const room = db.rooms.find(r => r.id === cand.roomId);
          const critList = room?.criteria || db.settings.criteria || [];

          if (!cand.qualitativeAiSummary) {
            try {
              cand.qualitativeAiSummary = await generateQualitativeSynthesisAI(cand, candEvals, { knowledgeBase: db.settings.knowledgeBase });
            } catch (e) {
              console.error(`AI qualitative summary failed for ${cand.name}:`, e);
            }
          }

          if (!(cand as any).detailedAiReport) {
            try {
              (cand as any).detailedAiReport = await generateCandidateDetailedReportAI(cand, candEvals, critList, { knowledgeBase: db.settings.knowledgeBase });
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

  // Admin endpoint: Publish / Unpublish / Modify Result Policies
  app.post('/api/admin/publish-results', async (req, res) => {
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

  // Candidate Results & AI Feedback Report Query Endpoint
  app.get('/api/candidate-portal/result', async (req, res) => {
    try {
      const { candidateId, studentId, roomId } = req.query;
      const isPublished = Boolean(db.settings.isResultsPublished);
      const isAllCompleted = Boolean(db.settings.isAllInterviewsCompleted);

      // Find candidate
      const candidate = db.candidates.find(
        c => (candidateId && c.id === candidateId) ||
             (studentId && c.studentId === studentId && (!roomId || c.roomId === roomId))
      );

      if (!candidate) {
        return res.status(404).json({ error: '해당 지원자 정보를 찾을 수 없습니다.' });
      }

      if (!isPublished) {
        return res.json({
          success: true,
          isPublished: false,
          isAllCompleted,
          message: '면접 평가 및 최종 심사가 진행 중입니다. 관리자의 공식 결과 발표 후 성적표와 AI 피드백을 확인하실 수 있습니다.',
          candidateName: candidate.name,
          studentId: candidate.studentId,
          result: null
        });
      }

      const room = db.rooms.find(r => r.id === candidate.roomId);
      const activeCriteria: EvaluationCriterion[] = (room?.criteria && room.criteria.length > 0)
        ? room.criteria
        : ((db.settings.criteria && db.settings.criteria.length > 0) ? db.settings.criteria : [
            { id: 'technical', name: '1. 기술 직무 역량', description: '직무 이해도 및 기술적 깊이', weight: 40, maxScore: 100, color: 'blue' },
            { id: 'problemSolving', name: '2. 논리적 문제 해결력', description: '문제 해결 및 돌발 상황 대처', weight: 30, maxScore: 100, color: 'purple' },
            { id: 'communication', name: '3. 의사소통 및 전달력', description: '소통 및 답변 전달력', weight: 20, maxScore: 100, color: 'emerald' },
            { id: 'cultureFit', name: '4. 동아리 적합도', description: '동아리 적합도 및 협업 자세', weight: 10, maxScore: 100, color: 'amber' }
          ]);

      const policy = db.settings.interviewerNameDisplayPolicy || 'LEADERS_ONLY';
      const showPassFail = db.settings.showPassFailToCandidates ?? true;
      const showStats = db.settings.showStatsToCandidates ?? true;
      const showComments = db.settings.showDetailedComments ?? true;

      // Candidate's evaluations
      const myEvaluationsRaw = db.evaluations.filter(e => e.candidateId === candidate.id && e.status === 'SUBMITTED');

      // Calculate candidate's total score
      const myTotalScore = computeCandidateScore(candidate, db.evaluations, room, db.settings);

      // Format evaluator scores according to name policy
      const formattedEvaluations: CandidateEvaluatorScoreDetail[] = myEvaluationsRaw.map((e, idx) => {
        const leadershipRole = getInterviewerLeadershipRole(e.interviewerName);
        const isLeader = leadershipRole === 'CAPTAIN' || leadershipRole === 'VICE_CAPTAIN';
        let displayName = e.interviewerName;
        let roleLabel = '면접관';

        if (policy === 'LEADERS_ONLY') {
          if (isLeader) {
            roleLabel = leadershipRole === 'CAPTAIN' ? '기장' : '부기장';
            displayName = `[${roleLabel}] ${e.interviewerName}`;
          } else {
            displayName = `면접관 ${String.fromCharCode(65 + (idx % 26))} (익명)`;
            roleLabel = '일반 면접관';
          }
        } else if (policy === 'ALL_PUBLIC') {
          if (isLeader) {
            roleLabel = leadershipRole === 'CAPTAIN' ? '기장' : '부기장';
            displayName = `[${roleLabel}] ${e.interviewerName}`;
          } else {
            displayName = `${e.interviewerName} 면접관`;
          }
        } else if (policy === 'ALL_ANONYMOUS') {
          displayName = `면접관 ${idx + 1} (익명)`;
          roleLabel = '심사위원';
        }

        const calculatedTotal = computeEvaluatorTotal(e.scores, e.presentationBonuses, e.presentationBonusTotal, activeCriteria);

        return {
          interviewerDisplayName: displayName,
          isLeader,
          leadershipRole,
          roleLabel,
          scores: e.scores || {},
          presentationBonus: e.presentationBonusTotal || 0,
          calculatedTotal,
          comments: showComments ? (e.comments || {}) : { overallComment: '정성 코멘트 비공개' },
          submittedAt: e.submittedAt
        };
      });

      // Calculate population stats across all candidates
      const allCandidateScores = db.candidates
        .filter(c => c.status !== 'NO_SHOW')
        .map(c => {
          const cRoom = db.rooms.find(r => r.id === c.roomId);
          return {
            id: c.id,
            score: computeCandidateScore(c, db.evaluations, cRoom, db.settings)
          };
        })
        .filter(c => c.score > 0);

      const totalCount = allCandidateScores.length || 1;
      const rawScores = allCandidateScores.map(c => c.score);
      const scoreSum = rawScores.reduce((a, b) => a + b, 0);
      const meanScore = Math.round((scoreSum / totalCount) * 10) / 10;

      // Variance & StdDev
      const variance = rawScores.reduce((acc, val) => acc + Math.pow(val - meanScore, 2), 0) / totalCount;
      const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

      const sortedScores = [...rawScores].sort((a, b) => b - a);
      const maxScore = sortedScores.length > 0 ? sortedScores[0] : 0;
      const minScore = sortedScores.length > 0 ? sortedScores[sortedScores.length - 1] : 0;
      const medianScore = sortedScores.length > 0
        ? (sortedScores.length % 2 !== 0
            ? sortedScores[Math.floor(sortedScores.length / 2)]
            : Math.round(((sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2) * 10) / 10)
        : 0;

      // Candidate rank & percentile
      const higherCount = sortedScores.filter(s => s > myTotalScore).length;
      const myRank = higherCount + 1;
      const myPercentile = Math.round(((totalCount - higherCount) / totalCount) * 1000) / 10;

      // Per-criterion statistical breakdown
      const criteriaStats: CandidateResultStats['criteriaStats'] = {};
      activeCriteria.forEach(crit => {
        const critValues: number[] = [];
        let myCritSum = 0;
        let myCritCount = 0;

        db.candidates.forEach(c => {
          const cEvals = db.evaluations.filter(e => e.candidateId === c.id && e.status === 'SUBMITTED');
          if (cEvals.length > 0) {
            const avgForCand = cEvals.reduce((sum, ev) => sum + (Number(ev.scores?.[crit.id]) || 0), 0) / cEvals.length;
            critValues.push(avgForCand);
            if (c.id === candidate.id) {
              myCritSum = avgForCand;
              myCritCount = 1;
            }
          }
        });

        const cCount = critValues.length || 1;
        const cSum = critValues.reduce((a, b) => a + b, 0);
        const cMean = Math.round((cSum / cCount) * 10) / 10;
        const cVar = critValues.reduce((acc, val) => acc + Math.pow(val - cMean, 2), 0) / cCount;
        const cStd = Math.round(Math.sqrt(cVar) * 10) / 10;
        const cSorted = [...critValues].sort((a, b) => b - a);

        criteriaStats[crit.id] = {
          criterionName: crit.name,
          mean: cMean,
          stdDev: cStd,
          max: cSorted.length > 0 ? Math.round(cSorted[0] * 10) / 10 : 0,
          min: cSorted.length > 0 ? Math.round(cSorted[cSorted.length - 1] * 10) / 10 : 0,
          myAvgScore: myCritCount > 0 ? Math.round(myCritSum * 10) / 10 : 0
        };
      });

      const passThreshold = room?.passThresholdScore ?? db.settings.passThresholdScore ?? 70;
      const isPassed = candidate.status !== 'NO_SHOW' && myTotalScore >= passThreshold;

      // AI Detailed Report (retrieve cached or generate on-the-fly)
      let aiReport = (candidate as any).detailedAiReport;
      if (!aiReport) {
        try {
          aiReport = await generateCandidateDetailedReportAI(candidate, myEvaluationsRaw, activeCriteria, { knowledgeBase: db.settings.knowledgeBase });
          (candidate as any).detailedAiReport = aiReport;
          await saveCloudState();
        } catch (e) {
          console.error('On-demand AI report generation error:', e);
        }
      }

      const resultPayload: CandidateFullResultData = {
        isPublished: true,
        isAllCompleted: true,
        showPassFail,
        isPassed: showPassFail ? isPassed : undefined,
        passThresholdScore: passThreshold,
        myTotalScore,
        myEvaluations: formattedEvaluations,
        stats: showStats ? {
          totalCandidates: totalCount,
          meanScore,
          stdDev,
          maxScore,
          minScore,
          medianScore,
          myRank,
          myPercentile,
          criteriaStats
        } : {
          totalCandidates: totalCount,
          meanScore: 0,
          stdDev: 0,
          maxScore: 0,
          minScore: 0,
          medianScore: 0,
          myRank: 0,
          myPercentile: 0,
          criteriaStats: {}
        },
        aiReport,
        criteria: activeCriteria,
        publishedAt: db.settings.resultsPublishedAt || getKSTDateTimeStr()
      };

      return res.json({
        success: true,
        candidate: {
          id: candidate.id,
          name: candidate.name,
          studentId: candidate.studentId,
          track: candidate.track,
          phone: candidate.phone,
          email: candidate.email,
          timeslot: candidate.timeslot,
          interviewDate: candidate.interviewDate,
          status: candidate.status,
          completedAt: candidate.completedAt || candidate.initialCompletedAt
        },
        result: resultPayload
      });
    } catch (err: any) {
      console.error('Candidate result API error:', err);
      return res.status(500).json({ error: '성적표 및 결과 조회 중 오류가 발생했습니다.' });
    }
  });

  // Candidate AI Report re-generation endpoint
  app.post('/api/candidate-portal/generate-ai-report', async (req, res) => {
    try {
      const { candidateId } = req.body || {};
      const candidate = db.candidates.find(c => c.id === candidateId);
      if (!candidate) return res.status(404).json({ error: '지원자를 찾을 수 없습니다.' });

      const room = db.rooms.find(r => r.id === candidate.roomId);
      const activeCriteria = room?.criteria || db.settings.criteria || [];
      const evals = db.evaluations.filter(e => e.candidateId === candidate.id && e.status === 'SUBMITTED');

      const aiReport = await generateCandidateDetailedReportAI(candidate, evals, activeCriteria, { knowledgeBase: db.settings.knowledgeBase });
      (candidate as any).detailedAiReport = aiReport;
      await saveCloudState();

      return res.json({ success: true, aiReport });
    } catch (err: any) {
      console.error('Generate AI report error:', err);
      return res.status(500).json({ error: 'AI 성장 보고서 생성 중 오류가 발생했습니다.' });
    }
  });


  // ----------------------------------------------------
  // VITE DEVELOPMENT OR PRODUCTION STATIC SERVING
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartLab server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
