import { ExamHistoryLog, ExamSession } from '../types';

const PENDING_SYNC_KEY = 'cbt_pending_sync_results';

/**
 * Service Worker Registration Helper
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[ServiceWorker] Successfully registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.warn('[ServiceWorker] Registration failed:', error);
        });
    });
  }
}

/**
 * Get current network online status
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Queue an exam result for offline sync when internet is restored
 */
export function queueOfflineResult(logRecord: ExamHistoryLog): void {
  try {
    const existing = getPendingSyncResults();
    // Avoid duplicate queueing
    if (!existing.some(item => item.id === logRecord.id)) {
      existing.push(logRecord);
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(existing));
      console.log('[OfflineManager] Exam result queued for background sync:', logRecord.id);
    }
  } catch (err) {
    console.error('[OfflineManager] Error queueing result offline:', err);
  }
}

/**
 * Retrieve queued pending exam results
 */
export function getPendingSyncResults(): ExamHistoryLog[] {
  try {
    const data = localStorage.getItem(PENDING_SYNC_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('[OfflineManager] Error parsing pending sync results:', err);
    return [];
  }
}

/**
 * Synchronize pending offline exam results to server MongoDB database
 */
export async function syncPendingResults(): Promise<{ syncedCount: number; errors: number }> {
  if (!isOnline()) {
    return { syncedCount: 0, errors: 0 };
  }

  const pending = getPendingSyncResults();
  if (pending.length === 0) {
    return { syncedCount: 0, errors: 0 };
  }

  console.log(`[OfflineManager] Attempting to sync ${pending.length} pending offline exam results...`);
  const remainingPending: ExamHistoryLog[] = [];
  let syncedCount = 0;
  let errors = 0;

  for (const record of pending) {
    try {
      const res = await fetch('/api/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      const data = await res.json();
      if (data.success) {
        syncedCount++;
        console.log(`[OfflineManager] Successfully synced offline result ${record.id}`);
      } else {
        remainingPending.push(record);
        errors++;
      }
    } catch (err) {
      console.warn(`[OfflineManager] Failed syncing offline result ${record.id}:`, err);
      remainingPending.push(record);
      errors++;
    }
  }

  try {
    if (remainingPending.length === 0) {
      localStorage.removeItem(PENDING_SYNC_KEY);
    } else {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remainingPending));
    }
  } catch (e) {
    console.error('[OfflineManager] Error updating pending sync storage:', e);
  }

  return { syncedCount, errors };
}

/**
 * Store active exam state safely in local storage (instant auto-save)
 */
export function saveActiveSessionLocal(userId: string, session: ExamSession): void {
  try {
    const key = `cbt_active_session_${userId}`;
    localStorage.setItem(key, JSON.stringify(session));
  } catch (err) {
    console.warn('[OfflineManager] Could not write active session to localStorage:', err);
  }
}

/**
 * Load saved active exam session from local storage
 */
export function loadActiveSessionLocal(userId: string): ExamSession | null {
  try {
    const key = `cbt_active_session_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn('[OfflineManager] Could not read active session from localStorage:', err);
    return null;
  }
}

/**
 * Clear saved active exam session
 */
export function clearActiveSessionLocal(userId: string): void {
  try {
    const key = `cbt_active_session_${userId}`;
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[OfflineManager] Could not remove active session from localStorage:', err);
  }
}
