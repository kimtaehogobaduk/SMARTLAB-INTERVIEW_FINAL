import { Router } from 'express';
import { db, saveCloudState, loadCloudState } from '../db';
import { getEffectiveAdminPassword } from './auth';
import { checkAndAutoFinalizeReopenedCandidates } from '../utils/autoFinalize';
import { getKSTDateTimeStr } from '../utils/kst';

export const syncRouter = Router();

// GET /api/health
syncRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cloudDatabase: 'firestore',
    roomsCount: db.rooms.length,
    candidatesCount: db.candidates.length,
    aiConfigured: Boolean(
      (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'MY_GROQ_API_KEY') ||
        (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') ||
        (process.env.CEREBRAS_API_KEY && process.env.CEREBRAS_API_KEY !== 'MY_CEREBRAS_API_KEY')
    ),
    groqConfigured: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'MY_GROQ_API_KEY'),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
  });
});

// GET /api/sync - Master state synchronization endpoint
syncRouter.get('/sync', (req, res) => {
  checkAndAutoFinalizeReopenedCandidates();

  const { roomId, candidateId } = req.query;

  let filteredCandidates = db.candidates;
  let filteredEvaluations = db.evaluations;
  let filteredChatMessages = db.chatMessages || [];
  let filteredCandidateMessages = db.candidateMessages || [];

  if (roomId && typeof roomId === 'string') {
    filteredCandidates = db.candidates.filter(c => !c.roomId || c.roomId === roomId);
    filteredEvaluations = db.evaluations.filter(e => !e.roomId || e.roomId === roomId);
    filteredChatMessages = (db.chatMessages || []).filter(m => !m.roomId || m.roomId === roomId);
    filteredCandidateMessages = (db.candidateMessages || []).filter(m => !m.roomId || m.roomId === roomId);
  }

  if (candidateId && typeof candidateId === 'string') {
    filteredEvaluations = filteredEvaluations.filter(e => e.candidateId === candidateId);
  }

  res.json({
    rooms: db.rooms,
    candidates: filteredCandidates,
    evaluations: filteredEvaluations,
    settings: db.settings,
    presences: db.presences || [],
    chatMessages: filteredChatMessages.slice(-100),
    candidateMessages: filteredCandidateMessages,
    notifications: (db.notifications || []).slice(0, 30),
    auditLogs: (db.auditLogs || []).slice(0, 50),
    adminUnlock: db.adminUnlock,
    serverTimeKST: getKSTDateTimeStr()
  });
});

// POST /api/cloud-backup - Force write to cloud
syncRouter.post('/cloud-backup', async (req, res) => {
  try {
    await saveCloudState();
    res.json({ success: true, message: 'Cloud backup completed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cloud-restore - Force reload from cloud
syncRouter.post('/cloud-restore', async (req, res) => {
  try {
    await loadCloudState();
    res.json({ success: true, message: 'State restored from cloud.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/backup - Export all data as JSON
syncRouter.get('/export/backup', (req, res) => {
  const { password, adminPassword } = req.query;
  const pwd = (password || adminPassword || '').toString();
  if (pwd !== getEffectiveAdminPassword()) {
    return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
  }

  const exportPayload = {
    version: '1.0.0',
    exportedAt: getKSTDateTimeStr(),
    data: {
      rooms: db.rooms,
      candidates: db.candidates,
      evaluations: db.evaluations,
      settings: db.settings,
      auditLogs: db.auditLogs
    }
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="smartlab-backup-${Date.now()}.json"`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

// POST /api/import/backup - Import JSON backup
syncRouter.post('/import/backup', async (req, res) => {
  const { password, adminPassword, backupData } = req.body;
  const pwd = password || adminPassword;
  if (pwd !== getEffectiveAdminPassword()) {
    return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
  }

  if (!backupData || !backupData.data) {
    return res.status(400).json({ error: '유효한 백업 데이터가 아닙니다.' });
  }

  try {
    const d = backupData.data;
    if (Array.isArray(d.rooms)) db.rooms = d.rooms;
    if (Array.isArray(d.candidates)) db.candidates = d.candidates;
    if (Array.isArray(d.evaluations)) db.evaluations = d.evaluations;
    if (d.settings) db.settings = d.settings;
    if (Array.isArray(d.auditLogs)) db.auditLogs = d.auditLogs;

    db.auditLogs.unshift({
      id: `audit-restore-${Date.now().toString(36)}`,
      timestamp: getKSTDateTimeStr(),
      modifiedBy: '관리자 (Admin)',
      field: '전체 데이터 백업 복원',
      beforeVal: null,
      afterVal: {
        roomsCount: db.rooms.length,
        candidatesCount: db.candidates.length,
        evaluationsCount: db.evaluations.length
      },
      reason: '관리자가 외부 JSON 백업 파일로부터 시스템 전체 데이터를 복원함'
    });

    await saveCloudState();
    res.json({ success: true, message: '백업 데이터가 성공적으로 복원되었습니다.' });
  } catch (err: any) {
    console.error('Import error:', err);
    res.status(500).json({ error: '백업 복원 중 오류가 발생했습니다.' });
  }
});

// POST /api/reset-data - Reset all evaluations and candidates data
syncRouter.post('/reset-data', async (req, res) => {
  const { password, adminPassword, keepRooms = true } = req.body;
  const pwd = password || adminPassword;
  if (pwd !== getEffectiveAdminPassword()) {
    return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
  }

  db.candidates = [];
  db.evaluations = [];
  db.chatMessages = [];
  db.candidateMessages = [];
  db.notifications = [];
  db.presences = [];

  if (!keepRooms) {
    db.rooms = [];
  }

  db.auditLogs.unshift({
    id: `audit-reset-${Date.now().toString(36)}`,
    timestamp: getKSTDateTimeStr(),
    modifiedBy: '관리자 (Admin)',
    field: '전체 데이터 초기화',
    beforeVal: null,
    afterVal: { keepRooms },
    reason: '관리자가 지원자 및 평가 데이터를 전체 초기화함'
  });

  await saveCloudState();
  res.json({ success: true, message: '모든 평가 데이터가 초기화되었습니다.' });
});
