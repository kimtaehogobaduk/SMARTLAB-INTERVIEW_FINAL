// Persistent Intro Video Storage (IndexedDB + Server sync)

const IDB_NAME = 'smartlab_media_db';
const IDB_STORE = 'videos';
const INTRO_VIDEO_KEY = 'kling_intro_video';

export async function getStoredVideo(): Promise<string | null> {
  // 1. First check IndexedDB
  const localBlobUrl = await new Promise<string | null>((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const getReq = store.get(INTRO_VIDEO_KEY);
        getReq.onsuccess = () => {
          if (getReq.result instanceof Blob) {
            resolve(URL.createObjectURL(getReq.result));
          } else {
            resolve(null);
          }
        };
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  if (localBlobUrl) return localBlobUrl;

  // 2. Check Server static /assets/intro.mp4
  try {
    const res = await fetch('/api/intro-video/status');
    if (res.ok) {
      const data = await res.json();
      if (data.exists && data.url) {
        return data.url;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function saveStoredVideo(fileOrBlob: Blob): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // 1. High-speed Direct Binary Upload to server first
    let serverUrl: string | null = null;
    try {
      const resp = await fetch('/api/intro-video/binary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: fileOrBlob
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.url) serverUrl = data.url;
      }
    } catch (e) {
      console.warn('[SmartLab] Direct binary upload failed, trying local fallback...', e);
    }

    // 2. Store in IndexedDB for offline / instant availability
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(fileOrBlob, INTRO_VIDEO_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });

    const activeUrl = serverUrl || URL.createObjectURL(fileOrBlob);

    // 3. Dispatch event for instant UI update
    window.dispatchEvent(new CustomEvent('smartlab_intro_video_updated', { detail: { url: activeUrl } }));

    return { success: true, url: activeUrl };
  } catch (err: any) {
    return { success: false, error: err.message || '비디오 저장 실패' };
  }
}

export async function deleteStoredVideo(): Promise<boolean> {
  try {
    // 1. Delete from Server
    try {
      await fetch('/api/intro-video', { method: 'DELETE' });
    } catch (e) {
      console.warn('[SmartLab] Failed to call server delete intro-video', e);
    }

    // 2. Delete from IndexedDB
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.delete(INTRO_VIDEO_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });

    // 3. Notify app components
    window.dispatchEvent(new CustomEvent('smartlab_intro_video_updated', { detail: { url: null } }));
    return true;
  } catch {
    return false;
  }
}
