import { Router } from 'express';
import { db, saveCloudState } from '../db';
import { getKSTTimeStr } from '../utils/kst';
import { InterviewerChatMessage } from '../../src/types';

export const chatRouter = Router();

// GET /api/chat/messages - List chat messages
chatRouter.get('/messages', (req, res) => {
  const { roomId, candidateId } = req.query;
  if (!Array.isArray(db.chatMessages)) db.chatMessages = [];

  let filtered = db.chatMessages;
  if (candidateId) {
    filtered = filtered.filter(m => m.candidateId === candidateId);
  } else if (roomId) {
    filtered = filtered.filter(m => !m.roomId || m.roomId === roomId);
  }

  res.json(filtered);
});

// POST /api/chat/messages - Send chat message
chatRouter.post('/messages', async (req, res) => {
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
    sharedQuestion
  } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: '메시지 내용을 입력해주세요.' });
  }

  if (!Array.isArray(db.chatMessages)) db.chatMessages = [];

  const rawSender = senderName || '면접관';
  const cleanSender =
    rawSender.replace(/^(면접관\s*\d*\s*\(?|\(?총괄\s*관리자\s*\(?)/, '').replace(/[\)\(]/g, '').trim() || rawSender;

  const newMessage: InterviewerChatMessage = {
    id: `chat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
    roomId: roomId || '',
    roomName: roomName || 'SmartLab 면접 평가실',
    candidateId,
    candidateName,
    senderId: senderId || 'unknown',
    senderName: cleanSender,
    senderRole: senderRole || '면접관',
    message: message.trim(),
    timestamp: getKSTTimeStr(),
    createdAt: Date.now(),
    isImportant: Boolean(isImportant),
    sharedQuestion
  };

  db.chatMessages.push(newMessage);
  if (db.chatMessages.length > 150) {
    db.chatMessages = db.chatMessages.slice(-150);
  }

  await saveCloudState();
  res.status(201).json({ success: true, message: newMessage });
});

// DELETE /api/chat/messages/:id - Delete single message
chatRouter.delete('/messages/:id', async (req, res) => {
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

// DELETE /api/chat/messages - Clear messages
chatRouter.delete('/messages', async (req, res) => {
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
