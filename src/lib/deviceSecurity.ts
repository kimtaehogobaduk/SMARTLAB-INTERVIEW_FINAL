/**
 * Device-level security and verification helpers
 * Allows recognizing the same device to bypass security quizzes once verified.
 */

const DEVICE_ID_KEY = 'smartlab_device_id';
const QUIZ_AUTH_PREFIX = 'smartlab_quiz_auth_';

export function getDeviceId(): string {
  try {
    let devId = localStorage.getItem(DEVICE_ID_KEY);
    if (!devId || devId.trim() === '') {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        devId = crypto.randomUUID();
      } else {
        devId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      }
      localStorage.setItem(DEVICE_ID_KEY, devId);
    }
    return devId;
  } catch {
    return 'fallback_device_' + Date.now();
  }
}

export function isQuizVerifiedOnDevice(roomId: string): boolean {
  if (!roomId) return false;
  try {
    const raw = localStorage.getItem(`${QUIZ_AUTH_PREFIX}${roomId}`);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && parsed.deviceId && parsed.verified);
  } catch {
    return false;
  }
}

export function saveQuizVerifiedOnDevice(roomId: string): void {
  if (!roomId) return;
  try {
    const devId = getDeviceId();
    const data = {
      deviceId: devId,
      verified: true,
      verifiedAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    localStorage.setItem(`${QUIZ_AUTH_PREFIX}${roomId}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota/private mode errors gracefully
  }
}

export function clearQuizVerifiedOnDevice(roomId?: string): void {
  try {
    if (roomId) {
      localStorage.removeItem(`${QUIZ_AUTH_PREFIX}${roomId}`);
    } else {
      // Clear all
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(QUIZ_AUTH_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch {
    // Ignore
  }
}
