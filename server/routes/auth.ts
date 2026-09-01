import { Router } from 'express';
import { db, saveCloudState } from '../db';
import { getKSTDateTimeStr } from '../utils/kst';

export const authRouter = Router();

export function getEffectiveAdminPassword(): string {
  return db.settings?.adminMasterPassword || 'admin';
}

// ----------------------------------------------------
// 0. Admin Authentication & Master Password Management
// ----------------------------------------------------

authRouter.post('/admin/verify-password', (req, res) => {
  const { password } = req.body;
  const masterPwd = getEffectiveAdminPassword();
  if (password === masterPwd) {
    return res.json({ valid: true });
  }
  return res.status(401).json({ valid: false, error: '관리자 비밀번호가 일치하지 않습니다.' });
});

authRouter.post('/admin/change-password', async (req, res) => {
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

// ----------------------------------------------------
// 1. Interviewer 4-digit PIN Management
// ----------------------------------------------------

authRouter.get('/interviewers/pin-status', (req, res) => {
  const { interviewerName, interviewerId } = req.query;
  const normKey = (interviewerId || interviewerName || '').toString().trim().toLowerCase();
  if (!normKey) {
    return res.status(400).json({ error: '면접관 식별자가 제공되지 않았습니다.' });
  }

  const pins = db.settings?.interviewerPins || {};
  const isSet = Boolean(pins[normKey]);
  const pinSetAt = db.settings?.interviewerPinSetAt?.[normKey] || undefined;

  res.json({
    isPinSet: isSet,
    interviewerKey: normKey,
    pinSetAt
  });
});

authRouter.post('/interviewers/set-pin', async (req, res) => {
  const { interviewerName, interviewerId, pinCode, currentPin } = req.body;
  const normKey = (interviewerId || interviewerName || '').toString().trim().toLowerCase();
  if (!normKey) {
    return res.status(400).json({ error: '면접관 식별자가 누락되었습니다.' });
  }

  const cleanPin = (pinCode || '').toString().trim();
  if (!/^\d{4}$/.test(cleanPin)) {
    return res.status(400).json({ error: 'PIN 비밀번호는 반드시 숫자 4자리여야 합니다.' });
  }

  if (!db.settings.interviewerPins) db.settings.interviewerPins = {};
  if (!db.settings.interviewerPinSetAt) db.settings.interviewerPinSetAt = {};

  const existingPin = db.settings.interviewerPins[normKey];
  if (existingPin && existingPin !== (currentPin || '').toString().trim()) {
    return res.status(401).json({ error: '기존 PIN 번호가 일치하지 않습니다.' });
  }

  db.settings.interviewerPins[normKey] = cleanPin;
  db.settings.interviewerPinSetAt[normKey] = getKSTDateTimeStr();

  db.auditLogs.unshift({
    id: `audit-pin-set-${Date.now().toString(36)}`,
    timestamp: getKSTDateTimeStr(),
    modifiedBy: `${interviewerName || normKey} 면접관`,
    field: '면접관 4자리 PIN 비밀번호 설정',
    beforeVal: existingPin ? '****' : '미설정',
    afterVal: '****',
    reason: '면접관 본인 평가서 보안 인증을 위한 4자리 PIN 갱신'
  });

  await saveCloudState();
  res.json({ success: true, message: '면접관 전용 4자리 PIN 번호가 안전하게 등록/변경되었습니다.' });
});

authRouter.post('/interviewers/verify-pin', (req, res) => {
  const { interviewerName, interviewerId, pinCode } = req.body;
  const normKey = (interviewerId || interviewerName || '').toString().trim().toLowerCase();
  if (!normKey) {
    return res.status(400).json({ valid: false, error: '면접관 식별자가 제공되지 않았습니다.' });
  }

  const pins = db.settings?.interviewerPins || {};
  const savedPin = pins[normKey];

  if (!savedPin) {
    return res.json({ valid: false, isPinSet: false, error: '등록된 PIN 비밀번호가 없습니다. 초기 PIN을 먼저 설정해주세요.' });
  }

  const cleanPin = (pinCode || '').toString().trim();
  if (savedPin === cleanPin) {
    return res.json({ valid: true, isPinSet: true });
  }

  return res.status(401).json({ valid: false, isPinSet: true, error: '입력하신 4자리 PIN 비밀번호가 일치하지 않습니다.' });
});

authRouter.post('/interviewers/reset-pin', async (req, res) => {
  const { interviewerName, interviewerId, adminPassword, operatorName } = req.body;
  const masterPwd = getEffectiveAdminPassword();
  if (adminPassword !== masterPwd) {
    return res.status(401).json({ error: '관리자 마스터 비밀번호가 일치하지 않습니다.' });
  }

  const normKey = (interviewerId || interviewerName || '').toString().trim().toLowerCase();
  if (!normKey) {
    return res.status(400).json({ error: '면접관 식별자가 누락되었습니다.' });
  }

  if (db.settings.interviewerPins && db.settings.interviewerPins[normKey]) {
    delete db.settings.interviewerPins[normKey];
  }
  if (db.settings.interviewerPinSetAt && db.settings.interviewerPinSetAt[normKey]) {
    delete db.settings.interviewerPinSetAt[normKey];
  }

  db.auditLogs.unshift({
    id: `audit-pin-reset-${Date.now().toString(36)}`,
    timestamp: getKSTDateTimeStr(),
    modifiedBy: operatorName || '동아리 관리자 (Admin)',
    field: `${interviewerName || normKey} 면접관 PIN 초기화`,
    beforeVal: '****',
    afterVal: '미설정(초기화됨)',
    reason: '면접관 비밀번호 분실에 따른 관리자 강제 초기화'
  });

  await saveCloudState();
  res.json({ success: true, message: `'${interviewerName || normKey}' 면접관의 PIN이 성공적으로 초기화되었습니다.` });
});

authRouter.get('/interviewers/all-pins-status', (req, res) => {
  const pins = db.settings?.interviewerPins || {};
  const dates = db.settings?.interviewerPinSetAt || {};
  const result: Record<string, { isPinSet: boolean; pinSetAt?: string }> = {};

  Object.keys(pins).forEach(key => {
    result[key] = {
      isPinSet: Boolean(pins[key]),
      pinSetAt: dates[key]
    };
  });

  res.json(result);
});
