/**
 * handleStorage.js — Helpers IndexedDB pour persister les DirectoryHandle / FileHandle
 *
 * Extrait de MagasinContext.jsx pour pouvoir être partagé
 * entre PageParametres et MagasinContext.
 */

const IDB_NAME = 'bvp-planning-handles';
const IDB_STORE = 'handles';

function openHandleDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHandle(key, handle) {
  // Ne persister que les handles natifs (Chrome/Edge).
  // Les handles virtuels (fallback Firefox) ne supportent pas IndexedDB.
  if (!handle || typeof handle.queryPermission !== 'function') return;
  try {
    const db = await openHandleDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, key);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch { /* silently ignore */ }
}

export async function loadHandle(key) {
  try {
    const db = await openHandleDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    return new Promise((res) => {
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => res(null);
    });
  } catch { return null; }
}

export async function removeHandle(key) {
  try {
    const db = await openHandleDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch { /* silently ignore */ }
}

export async function verifyHandlePermission(handle, mode = 'read') {
  if (!handle) return false;
  // Les handles virtuels (Firefox fallback) n'ont pas queryPermission → toujours OK
  if (typeof handle.queryPermission !== 'function') return true;
  try {
    let perm = await handle.queryPermission({ mode });
    if (perm === 'granted') return true;
    perm = await handle.requestPermission({ mode });
    return perm === 'granted';
  } catch { return false; }
}
