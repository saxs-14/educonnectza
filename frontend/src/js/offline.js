import { openDB } from 'https://unpkg.com/idb@7/build/umd.js';
import { api } from './api.js';

const DB_NAME = 'EduConnectOfflineDB';
const STORE_NAME = 'pendingSubmissions';
let dbPromise;

export const initOfflineSync = async () => {
  dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-status', 'status');
      }
    },
  });
};

export const addPendingSubmission = async (submissionData) => {
  const db = await dbPromise;
  return db.add(STORE_NAME, {
    ...submissionData,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
};

export const getPendingSubmissions = async () => {
  const db = await dbPromise;
  return db.getAllFromIndex(STORE_NAME, 'by-status', 'pending');
};

export const markAsSynced = async (id) => {
  const db = await dbPromise;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const item = await store.get(id);
  item.status = 'synced';
  item.syncedAt = new Date().toISOString();
  await store.put(item);
  await tx.done;
};

export const syncPending = async () => {
  const pending = await getPendingSubmissions();
  for (const sub of pending) {
    try {
      const formData = new FormData();
      formData.append('textAnswer', sub.textAnswer || '');
      if (sub.file) {
        const blob = await (await fetch(sub.file)).blob();
        formData.append('file', blob, sub.fileName);
      }
      await api.post(`/assignments/${sub.assignmentId}/submit`, formData, true);
      await markAsSynced(sub.id);
    } catch (error) {
      console.error('Sync failed for submission', sub.id, error);
    }
  }
};
