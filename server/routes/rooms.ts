import { Router } from 'express';
import { db, saveCloudState } from '../db';
import { getEffectiveAdminPassword } from './auth';
import { InterviewRoomInfo, SecurityQuizItem } from '../../src/types';

export const roomsRouter = Router();

// GET /api/rooms - List all rooms with security status & candidate count
roomsRouter.get('/', (req, res) => {
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
    const clientQuizzes =
      room.securityType === 'QUIZ'
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
      securityQuestion:
        room.securityType === 'QUIZ'
          ? room.securityQuestion || normalizedQuizzes[0]?.question
          : undefined,
      securityQuizzes: clientQuizzes,
      password: isMasterAdmin ? room.password : undefined,
      securityAnswer: isMasterAdmin ? room.securityAnswer || normalizedQuizzes[0]?.answer : undefined
    };
  });
  res.json(roomsWithCount);
});

// POST /api/rooms/:id/verify-access - Verify room password or quiz challenge
roomsRouter.post('/:id/verify-access', async (req, res) => {
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

    if (targetQuizzes.length === 1 && typeof answer === 'string' && answer.trim()) {
      const cleanUserAns = answer.trim().toLowerCase().replace(/\s+/g, '');
      const cleanCorrectAns = (targetQuizzes[0].answer || room.securityAnswer || '').trim().toLowerCase().replace(/\s+/g, '');
      if (cleanUserAns && cleanUserAns === cleanCorrectAns) {
        if (cleanDeviceId) {
          const alreadyIn = (room as any).authorizedQuizDevices.some(
            (d: any) => (typeof d === 'string' ? d === cleanDeviceId : d?.deviceId === cleanDeviceId)
          );
          if (!alreadyIn) {
            (room as any).authorizedQuizDevices.push(cleanDeviceId);
            await saveCloudState();
          }
        }
        return res.json({ success: true, authorized: true, roomName: room.name, accessType: 'QUIZ' });
      }
      return res.status(401).json({ error: '퀴즈 정답이 일치하지 않습니다. 다시 입력해주세요.' });
    }

    const userAnswers = answers && typeof answers === 'object' ? answers : {};
    let allCorrect = true;
    let failedCount = 0;

    for (let i = 0; i < targetQuizzes.length; i++) {
      const q = targetQuizzes[i];
      const userAns = (userAnswers[q.id] || (i === 0 ? answer : '') || '').trim().toLowerCase().replace(/\s+/g, '');
      const correctAns = (q.answer || '').trim().toLowerCase().replace(/\s+/g, '');
      if (!userAns || userAns !== correctAns) {
        allCorrect = false;
        failedCount++;
      }
    }

    if (!allCorrect) {
      return res.status(401).json({
        error: `보안 퀴즈 정답이 일치하지 않습니다. (오답: ${failedCount}개) 다시 확인해주세요.`
      });
    }

    if (cleanDeviceId) {
      const alreadyIn = (room as any).authorizedQuizDevices.some(
        (d: any) => (typeof d === 'string' ? d === cleanDeviceId : d?.deviceId === cleanDeviceId)
      );
      if (!alreadyIn) {
        (room as any).authorizedQuizDevices.push(cleanDeviceId);
        await saveCloudState();
      }
    }

    return res.json({ success: true, authorized: true, roomName: room.name, accessType: 'QUIZ', deviceRemembered: true });
  }

  res.json({ success: true, authorized: true, roomName: room.name });
});

// POST /api/rooms - Create a new room
roomsRouter.post('/', async (req, res) => {
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
    const count = Number(panelCount) || 2;
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
    securityQuestion: validatedSecType === 'QUIZ' ? formattedQuizzes[0]?.question || effectiveQuizQuestion : undefined,
    securityAnswer: validatedSecType === 'QUIZ' ? formattedQuizzes[0]?.answer || effectiveQuizAnswer : undefined,
    securityQuizzes: validatedSecType === 'QUIZ' ? formattedQuizzes : undefined
  };

  db.rooms.push(newRoom);
  await saveCloudState();
  res.status(201).json(newRoom);
});

// PUT /api/rooms/:id - Update room
roomsRouter.put('/:id', async (req, res) => {
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

// PUT /api/rooms/:id/criteria - Set criteria for room
roomsRouter.put('/:id/criteria', async (req, res) => {
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

// POST /api/rooms/:id/confirm-criteria - Confirm room criteria
roomsRouter.post('/:id/confirm-criteria', async (req, res) => {
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

// POST /api/rooms/:id/unconfirm-criteria - Unconfirm room criteria
roomsRouter.post('/:id/unconfirm-criteria', async (req, res) => {
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

// DELETE /api/rooms/:id - Delete room
roomsRouter.delete('/:id', async (req, res) => {
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
