import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { loadCloudState, saveCloudState } from './server/db';
import { checkAndAutoFinalizeReopenedCandidates } from './server/utils/autoFinalize';

// Import Route Modules
import { authRouter } from './server/routes/auth';
import { roomsRouter } from './server/routes/rooms';
import { candidatesRouter } from './server/routes/candidates';
import { evaluationsRouter } from './server/routes/evaluations';
import { aiRouter } from './server/routes/ai';
import { settingsRouter } from './server/routes/settings';
import { candidatePortalRouter } from './server/routes/candidatePortal';
import { chatRouter } from './server/routes/chat';
import { adminRouter } from './server/routes/admin';
import { syncRouter } from './server/routes/sync';
import { proxyRouter } from './server/routes/proxy';

// Re-export utility functions for backward compatibility
export { getKSTDateTimeStr, getKSTTimeStr } from './server/utils/kst';
export { checkAndAutoFinalizeReopenedCandidates } from './server/utils/autoFinalize';

dotenv.config();

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

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Static serving for assets directory (including uploaded intro video)
  const assetsDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  app.use('/assets', express.static(assetsDir));

  // Check intro video availability
  app.get('/api/intro-video/status', (req, res) => {
    const videoPath = path.join(assetsDir, 'intro.mp4');
    const exists = fs.existsSync(videoPath);
    res.json({ exists, url: exists ? '/assets/intro.mp4' : null });
  });

  // Upload/Save intro video directly (base64 encoded)
  app.post('/api/intro-video', (req, res) => {
    try {
      const { videoBase64 } = req.body;
      if (!videoBase64) {
        return res.status(400).json({ error: 'videoBase64 is required' });
      }
      const base64Data = videoBase64.replace(/^data:video\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const videoPath = path.join(assetsDir, 'intro.mp4');
      fs.writeFileSync(videoPath, buffer);
      console.log(`[SmartLab] Intro video saved successfully (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
      return res.json({ success: true, url: '/assets/intro.mp4' });
    } catch (err: any) {
      console.error('[SmartLab] Error saving intro video:', err);
      return res.status(500).json({ error: err.message || 'Failed to save intro video' });
    }
  });

  // ----------------------------------------------------
  // MOUNT API ROUTERS
  // ----------------------------------------------------

  // Sync, Health, Backup/Restore (/api/sync, /api/health, /api/cloud-backup, etc.)
  app.use('/api', syncRouter);

  // Authentication & PIN (/api/interviewers/..., /api/admin/verify-password)
  app.use('/api', authRouter);

  // Admin Operations (/api/audit-logs, /api/admin/audit-logs, /api/admin/unlock-edit, etc.)
  app.use('/api', adminRouter);
  app.use('/api/admin', adminRouter);

  // Rooms (/api/rooms, /api/rooms/:id/...)
  app.use('/api/rooms', roomsRouter);

  // Candidates (/api/candidates, /api/candidates/:id/evaluations, /api/candidates/:id/stt, etc.)
  app.use('/api/candidates', candidatesRouter);

  // Evaluations (/api/evaluations)
  app.use('/api/evaluations', evaluationsRouter);

  // AI & STT & Knowledge Base (/api/ai/...)
  app.use('/api/ai', aiRouter);

  // Settings, Leadership, Presences & Live Notifications (/api/settings, /api/presence, /api/notifications, /api/leadership)
  app.use('/api/settings', settingsRouter);
  app.use('/api', settingsRouter);

  // Interviewer Chat (/api/chat/messages)
  app.use('/api/chat', chatRouter);

  // Candidate Self-Service Portal (/api/candidate-portal/...)
  app.use('/api/candidate-portal', candidatePortalRouter);

  // Proxy for Web Embedding (/api/proxy/...)
  app.use('/api/proxy', proxyRouter);

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
