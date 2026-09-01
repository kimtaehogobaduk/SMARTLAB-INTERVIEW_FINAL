import { Router } from 'express';
import { db, saveCloudState } from '../db';
import { getKSTDateTimeStr, getKSTTimeStr } from '../utils/kst';
import { generateCandidateDetailedReportAI } from '../ai';
import {
  Candidate,
  CandidateChatMessage,
  Evaluation,
  InterviewRoomInfo,
  PlatformSettings,
  EvaluationCriterion,
  CandidateEvaluatorScoreDetail,
  CandidateResultStats,
  CandidateFullResultData,
  LeadershipRole
} from '../../src/types';

export const candidatePortalRouter = Router();

function getInterviewerLeadershipRole(name?: string): LeadershipRole {
  if (!name) return 'NONE';
  if (name.includes('기장') || name.includes('회장') || name.includes('총괄') || name.includes('대표')) {
    return 'CAPTAIN';
  }
  if (name.includes('부기장') || name.includes('부회장') || name.includes('부대표') || name.includes('팀장')) {
    return 'VICE_CAPTAIN';
  }
  return 'NONE';
}

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

export function computeCandidateScore(
  candidate: Candidate,
  evals: Evaluation[],
  room: InterviewRoomInfo | undefined,
  settings: PlatformSettings
): number {
  const activeCriteria =
    room?.criteria && room.criteria.length > 0
      ? room.criteria
      : settings.criteria && settings.criteria.length > 0
      ? settings.criteria
      : [
          { id: 'technical', name: '기술 역량', weight: 40 },
          { id: 'problemSolving', name: '문제 해결력', weight: 30 },
          { id: 'communication', name: '의사소통', weight: 20 },
          { id: 'cultureFit', name: '동아리 적합도', weight: 10 }
        ];

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

// POST /api/candidate-portal/login - Candidate login / registration
candidatePortalRouter.post('/login', async (req, res) => {
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

    let candidate = db.candidates.find(
      c =>
        (c.roomId === cleanRoomId && (c.studentId.trim() === cleanStudentId || c.name.trim() === cleanName)) ||
        (c.studentId.trim() === cleanStudentId && c.name.trim() === cleanName)
    );

    const effectiveDate = interviewDate
      ? interviewDate.trim()
      : candidate?.interviewDate || new Date().toISOString().split('T')[0];
    const effectiveStart = startTime ? startTime.trim() : candidate?.timeslot?.start || '14:00';
    const effectiveEnd = endTime ? endTime.trim() : candidate?.timeslot?.end || '14:30';

    if (candidate) {
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
        interviewers: defaultInterviewerNames.length > 0
          ? defaultInterviewerNames
          : (room.interviewers && room.interviewers.length > 0 ? room.interviewers.map((i: any) => i.name) : ['면접관 1', '면접관 2']),
        documents: [
          {
            id: `gdoc-${newCandidateId}`,
            title: '면접평가기준',
            type: 'gdocs',
            url: 'https://docs.google.com/document/d/1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4/edit?usp=drivesdk',
            fileSize: 'Google Docs (인앱 연동)',
            contentSnippet: '구글 닥스 지원서류 원본 (인앱 미리보기 지원)',
            rawText:
              'SmartLab 지원자 공식 구글 닥스 서류 링크: https://docs.google.com/document/d/1W1VyHNw3YmpABYzqorSwxdeb6LYt4JQeO2oG06gyc-4/edit?usp=drivesdk',
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
        afterVal: {
          id: candidate.id,
          name: candidate.name,
          studentId: candidate.studentId,
          room: room.name,
          date: effectiveDate,
          timeslot: candidate.timeslot
        },
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

// GET /api/candidate-portal/status - Safe status polling
candidatePortalRouter.get('/status', (req, res) => {
  const { candidateId, roomId, studentId } = req.query;
  if (!candidateId && (!roomId || !studentId)) {
    return res.status(400).json({ error: 'candidateId or (roomId and studentId) required' });
  }

  const candidate = db.candidates.find(
    c =>
      (candidateId && c.id === candidateId) ||
      (roomId && studentId && c.roomId === roomId && c.studentId === studentId)
  );

  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  const room = db.rooms.find(r => r.id === candidate.roomId);

  const assignedInterviewers = (room?.interviewers || []).map(i => ({
    id: i.id,
    name: i.name,
    role: i.role,
    avatarColor: i.avatarColor
  }));

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
    room: room
      ? {
          id: room.id,
          name: room.name,
          title: room.title,
          description: room.description,
          interviewers: assignedInterviewers,
          minutesPerPerson: room.minutesPerPerson || 30
        }
      : null,
    assignedInterviewers
  });
});

// POST /api/candidate-portal/update-profile - Update profile
candidatePortalRouter.post('/update-profile', async (req, res) => {
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

// GET /api/candidate-portal/messages - Get messages
candidatePortalRouter.get('/messages', (req, res) => {
  const { candidateId, roomId, studentId } = req.query;
  if (!Array.isArray(db.candidateMessages)) db.candidateMessages = [];

  const messages = db.candidateMessages.filter(m => {
    if (candidateId && m.candidateId === candidateId) return true;
    if (roomId && studentId && m.roomId === roomId && m.studentId === studentId) return true;
    if (roomId && !candidateId && !studentId && m.roomId === roomId) return true;
    return false;
  });

  res.json({ success: true, messages });
});

// POST /api/candidate-portal/send-message - Send message
candidatePortalRouter.post('/send-message', async (req, res) => {
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
      senderName: isFromCandidate ? candidateName || '지원자' : senderName || 'SmartLab 면접관',
      senderInterviewerId: isFromCandidate ? undefined : senderInterviewerId,
      text: cleanText,
      timestamp: getKSTTimeStr(),
      createdAt: Date.now(),
      readByCandidate: isFromCandidate,
      readByInterviewers: isFromCandidate ? [] : [senderInterviewerId || 'interviewer']
    };

    db.candidateMessages.push(newMessage);

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

// POST /api/candidate-portal/toggle-reminder - Toggle reminder
candidatePortalRouter.post('/toggle-reminder', async (req, res) => {
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

// GET /api/candidate-portal/result - Query published result & report
candidatePortalRouter.get('/result', async (req, res) => {
  try {
    const { candidateId, studentId, roomId } = req.query;
    const isPublished = Boolean(db.settings.isResultsPublished);
    const isAllCompleted = Boolean(db.settings.isAllInterviewsCompleted);

    const candidate = db.candidates.find(
      c =>
        (candidateId && c.id === candidateId) ||
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
        message:
          '면접 평가 및 최종 심사가 진행 중입니다. 관리자의 공식 결과 발표 후 성적표와 AI 피드백을 확인하실 수 있습니다.',
        candidateName: candidate.name,
        studentId: candidate.studentId,
        result: null
      });
    }

    const room = db.rooms.find(r => r.id === candidate.roomId);
    const activeCriteria: EvaluationCriterion[] =
      room?.criteria && room.criteria.length > 0
        ? room.criteria
        : db.settings.criteria && db.settings.criteria.length > 0
        ? db.settings.criteria
        : [
            {
              id: 'technical',
              name: '1. 기술 직무 역량',
              description: '직무 이해도 및 기술적 깊이',
              weight: 40,
              maxScore: 100,
              color: 'blue'
            },
            {
              id: 'problemSolving',
              name: '2. 논리적 문제 해결력',
              description: '문제 해결 및 돌발 상황 대처',
              weight: 30,
              maxScore: 100,
              color: 'purple'
            },
            {
              id: 'communication',
              name: '3. 의사소통 및 전달력',
              description: '소통 및 답변 전달력',
              weight: 20,
              maxScore: 100,
              color: 'emerald'
            },
            {
              id: 'cultureFit',
              name: '4. 동아리 적합도',
              description: '동아리 적합도 및 협업 자세',
              weight: 10,
              maxScore: 100,
              color: 'amber'
            }
          ];

    const policy = db.settings.interviewerNameDisplayPolicy || 'LEADERS_ONLY';
    const showPassFail = db.settings.showPassFailToCandidates ?? true;
    const showStats = db.settings.showStatsToCandidates ?? true;
    const showComments = db.settings.showDetailedComments ?? true;

    const myEvaluationsRaw = db.evaluations.filter(e => e.candidateId === candidate.id && e.status === 'SUBMITTED');
    const myTotalScore = computeCandidateScore(candidate, db.evaluations, room, db.settings);

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

      const calculatedTotal = computeEvaluatorTotal(
        e.scores,
        e.presentationBonuses,
        e.presentationBonusTotal,
        activeCriteria
      );

      return {
        interviewerDisplayName: displayName,
        isLeader,
        leadershipRole,
        roleLabel,
        scores: e.scores || {},
        presentationBonus: e.presentationBonusTotal || 0,
        calculatedTotal,
        comments: showComments ? e.comments || {} : { overallComment: '정성 코멘트 비공개' },
        submittedAt: e.submittedAt
      };
    });

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

    const variance = rawScores.reduce((acc, val) => acc + Math.pow(val - meanScore, 2), 0) / totalCount;
    const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

    const sortedScores = [...rawScores].sort((a, b) => b - a);
    const maxScore = sortedScores.length > 0 ? sortedScores[0] : 0;
    const minScore = sortedScores.length > 0 ? sortedScores[sortedScores.length - 1] : 0;
    const medianScore =
      sortedScores.length > 0
        ? sortedScores.length % 2 !== 0
          ? sortedScores[Math.floor(sortedScores.length / 2)]
          : Math.round(((sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2) * 10) /
            10
        : 0;

    const higherCount = sortedScores.filter(s => s > myTotalScore).length;
    const myRank = higherCount + 1;
    const myPercentile = Math.round(((totalCount - higherCount) / totalCount) * 1000) / 10;

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

    let aiReport = (candidate as any).detailedAiReport;
    if (!aiReport) {
      try {
        aiReport = await generateCandidateDetailedReportAI(candidate, myEvaluationsRaw, activeCriteria, {
          knowledgeBase: db.settings.knowledgeBase
        });
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
      stats: showStats
        ? {
            totalCandidates: totalCount,
            meanScore,
            stdDev,
            maxScore,
            minScore,
            medianScore,
            myRank,
            myPercentile,
            criteriaStats
          }
        : {
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

// POST /api/candidate-portal/generate-ai-report - Re-generate AI report
candidatePortalRouter.post('/generate-ai-report', async (req, res) => {
  try {
    const { candidateId } = req.body || {};
    const candidate = db.candidates.find(c => c.id === candidateId);
    if (!candidate) return res.status(404).json({ error: '지원자를 찾을 수 없습니다.' });

    const room = db.rooms.find(r => r.id === candidate.roomId);
    const activeCriteria = room?.criteria || db.settings.criteria || [];
    const evals = db.evaluations.filter(e => e.candidateId === candidate.id && e.status === 'SUBMITTED');

    const aiReport = await generateCandidateDetailedReportAI(candidate, evals, activeCriteria, {
      knowledgeBase: db.settings.knowledgeBase
    });
    (candidate as any).detailedAiReport = aiReport;
    await saveCloudState();

    return res.json({ success: true, aiReport });
  } catch (err: any) {
    console.error('Generate AI report error:', err);
    return res.status(500).json({ error: 'AI 성장 보고서 생성 중 오류가 발생했습니다.' });
  }
});
