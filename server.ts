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
  learnFromKnowledgeSourceAI,
  simulateInterviewQnAWithKnowledgeAI,
  extractYouTubeVideoId
} from './server/ai.ts';
import { Candidate, Evaluation, AuditLog, PlatformSettings, InterviewRoomInfo, AIKnowledgeItem, DocumentItem, LiveNotification, InterviewerPresence, InterviewerChatMessage } from './src/types.ts';

dotenv.config();

// Safe dirname resolution that works in both TSX (ESM) and bundled CommonJS (production)
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

async function startServer() {
  // Load persistent cloud state from Firestore on startup
  await loadCloudState();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // ----------------------------------------------------
  // API ROUTES FIRST
  // ----------------------------------------------------

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
    const roomsWithCount = db.rooms.map(room => ({
      ...room,
      candidateCount: db.candidates.filter(c => !c.roomId || c.roomId === room.id).length
    }));
    res.json(roomsWithCount);
  });

  app.post('/api/rooms', async (req, res) => {
    const { name, title, description, createdBy, adminPassword, password, panelCount, minutesPerPerson, interviewers } = req.body;
    const pwd = adminPassword || password;
    if (pwd !== 'admin') {
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

    const newRoom: InterviewRoomInfo = {
      id: `room-${Date.now().toString(36)}`,
      name: roomName,
      description: description || '동아리 실시간 면접 평가실',
      createdAt: new Date().toLocaleDateString('ko-KR'),
      createdBy: createdBy || '동아리 관리자 (Admin)',
      panelCount: formattedInterviewers.length || Number(panelCount) || 3,
      minutesPerPerson: Number(minutesPerPerson) || 30,
      interviewers: formattedInterviewers
    };

    db.rooms.push(newRoom);
    await saveCloudState();
    res.status(201).json(newRoom);
  });

  app.put('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { adminPassword, password, name, description, interviewers, minutesPerPerson, panelCount } = req.body;
    const pwd = adminPassword || password;
    if (pwd !== 'admin') {
      return res.status(401).json({ error: '관리자 권한 인증에 실패했습니다.' });
    }

    const room = db.rooms.find(r => r.id === id);
    if (!room) return res.status(404).json({ error: '존재하지 않는 방입니다.' });

    if (name) room.name = name.trim();
    if (description !== undefined) room.description = description;
    if (minutesPerPerson) room.minutesPerPerson = Number(minutesPerPerson);
    if (panelCount) room.panelCount = Number(panelCount);

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

  app.delete('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { adminPassword, password } = req.body;
    const pwd = adminPassword || password;
    if (pwd !== 'admin') {
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

    let notifType: any = 'INTERVIEWER_ACTION';
    let title = '';
    let message = '';

    if (actionType === 'question') {
      notifType = 'QUESTION_INTENT';
      title = `${cleanName} 면접관이 먼저 질문합니다`;
      message = customMessage || `${cleanName} 면접관이 발언권을 얻어 먼저 질문을 진행합니다.`;
    } else if (actionType === 'suspicion') {
      notifType = 'SUSPICION_ALERT';
      title = `${cleanName} 면접관이 의심/팩트체크 신호를 보냈습니다`;
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
      title = `${cleanName} 면접관이 AI 꼬리질문 활용을 제안했습니다`;
      message = customMessage || `AI 콘솔의 실시간 심층 검증 질문을 확인해보세요.`;
    } else if (actionType === 'yield') {
      notifType = 'YIELD_FLOOR';
      title = `${cleanName} 면접관이 질문 순서를 양보했습니다`;
      message = customMessage || `다른 면접관님께서 질문을 이어가실 수 있습니다.`;
    } else if (actionType === 'time_check') {
      notifType = 'TIME_ALERT';
      title = `${cleanName} 면접관이 면접 시간 준수를 상기시켰습니다`;
      message = customMessage || `배정된 면접 시간을 확인하고 마무리를 준비해주세요.`;
    } else {
      title = `${cleanName} 면접관의 행동 신호: ${actionType}`;
      message = customMessage || `${cleanName} 면접관이 알림을 전송했습니다.`;
    }

    const actionNotif: LiveNotification = {
      id: `act-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      type: notifType,
      actionType,
      title,
      message,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      createdAt: Date.now(),
      roomId,
      roomName,
      candidateId: candidateId || '',
      candidateName: candidateName || '',
      operatorId,
      operatorName: cleanName
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

    const presenceItem: InterviewerPresence = {
      interviewerId,
      interviewerName: interviewerName || '면접관',
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
    const latestMessages = filtered.slice(-100);
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
      isImportant
    } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: '메시지 내용을 입력해주세요.' });
    }

    const rawName = senderName || '면접관';
    const cleanName = rawName.replace(/^(면접관\s*\d*\s*\(?|\(?총괄\s*관리자\s*\(?)/, '').replace(/[\)\(]/g, '').trim() || rawName;

    const newMessage: InterviewerChatMessage = {
      id: `chat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      roomId: roomId || '',
      roomName: roomName || '',
      candidateId: candidateId || '',
      candidateName: candidateName || '',
      senderId: senderId || 'user-unknown',
      senderName: cleanName,
      senderRole: senderRole || '면접관',
      message: message.trim(),
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      createdAt: Date.now(),
      isImportant: !!isImportant
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
    const { roomId } = req.query;
    if (roomId && typeof roomId === 'string') {
      res.json(db.candidates.filter(c => !c.roomId || c.roomId === roomId));
    } else {
      res.json(db.candidates);
    }
  });

  app.get('/api/candidates/:id', (req, res) => {
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
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
        createdAt: Date.now(),
        roomId: candidate.roomId || room?.id,
        roomName: roomName,
        candidateId: candidate.id,
        candidateName: candidate.name,
        operatorId: interviewerId,
        operatorName: actorName
      };

      db.notifications.unshift(notif);
      // Keep recent 50
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
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      modifiedBy: operatorName || '면접관 패널',
      field: `${candidate.name} (${candidate.id}) 상태 변경: ${action}`,
      beforeVal: { status: oldStatus },
      afterVal: { status: candidate.status },
      reason: reason || `상태 전이 액션 실행 (${action})`
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

    // Enforce criteria confirmation requirement
    if (!db.settings.isCriteriaConfirmed) {
      if (incoming.status === 'SUBMITTED') {
        return res.status(403).json({
          error: '어드민이 평가 기준(가중치 및 배점 항목)을 확정하기 전에는 평가를 제출할 수 없습니다.',
          isCriteriaConfirmed: false
        });
      }
      return res.status(403).json({
        error: '평가 기준이 아직 관리자에 의해 확정되지 않아 점수가 반영되지 않습니다.',
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

  // 5. STT Speech & Realtime AI Feedback
  app.post('/api/candidates/:id/stt', async (req, res) => {
    const { id } = req.params;
    const { message, triggerAI } = req.body;
    const candidate = db.candidates.find(c => c.id === id);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    candidate.sttTranscript.push({
      id: message.id || `stt-${Date.now().toString(36)}`,
      speaker: message.speaker || 'candidate',
      text: message.text,
      timestamp: message.timestamp || new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      confidence: message.confidence ?? 0.95
    });

    if (triggerAI && message.speaker === 'candidate' && message.text.length > 5) {
      try {
        const docText = candidate.documents?.map(d => d.rawText || d.contentSnippet || '').join('\n') || '';
        const transcriptHistory = candidate.sttTranscript.slice(-6).map(s => `${s.speaker}: ${s.text}`).join('\n');
        
        const feedback = await generateRealtimeFeedbackAI(
          candidate.name,
          candidate.track,
          docText,
          transcriptHistory,
          message.text,
          { knowledgeBase: db.settings.knowledgeBase }
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
            candidate.aiInsights.tailQuestions.unshift({
              id: `tail-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
              timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
              question: q.question,
              reason: q.reason,
              category: q.category || '기술 검증',
              used: false
            });
          });
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

      if (adminPassword && adminPassword !== 'admin') {
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
    if (pwd && pwd !== 'admin') {
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
    const { password, candidateId, durationSeconds } = req.body;
    if (password !== 'admin') {
      return res.status(401).json({ error: '관리자 비밀번호가 일치하지 않습니다.' });
    }

    const duration = durationSeconds || 300; // 5 minutes
    db.adminUnlock = {
      candidateId: candidateId || null,
      expiresAt: Date.now() + duration * 1000
    };

    db.auditLogs.unshift({
      id: `audit-unlock-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      modifiedBy: '관리자 (admin)',
      field: '관리자 5분 수정 권한 활성화',
      beforeVal: { locked: true },
      afterVal: { locked: false, expiresAt: new Date(db.adminUnlock.expiresAt).toLocaleTimeString('ko-KR') },
      reason: `면접건(${candidateId || '전체'}) 데이터 사후 정정을 위한 임시 잠금 해제`
    });

    await saveCloudState();

    res.json({
      success: true,
      expiresAt: db.adminUnlock.expiresAt,
      remainingSeconds: duration
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
      candidate.lastModifiedAt = new Date().toLocaleString('ko-KR', { hour12: false });
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
      timestamp: new Date().toLocaleString('ko-KR', { hour12: false }),
      modifiedBy: modifiedBy || '관리자 (admin)',
      field: `[관리자 직권 수정] ${field}`,
      beforeVal,
      afterVal,
      reason: reason || '관리자 직권 점수/의견 정정'
    });

    await saveCloudState();

    res.json({ success: true, evaluations: db.evaluations.filter(e => e.candidateId === candidateId) });
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
