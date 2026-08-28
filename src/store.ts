import type { AppData } from './types';
import { EMPTY_DATA } from './types';

const DB_NAME = 'family-handoff-calendar';
const STORE = 'household';
const KEY = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

export async function loadData(): Promise<AppData> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve(request.result ? normalizeData(request.result) : { ...EMPTY_DATA });
    request.onerror = () => reject(request.error ?? new Error('Could not read this household.'));
  });
}

export async function saveData(data: AppData): Promise<void> {
  const db = await openDb();
  const value = { ...data, updatedAt: new Date().toISOString() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not save changes.'));
  });
}

export function normalizeData(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('That backup is not valid calendar data.');
  const value = raw as Partial<AppData>;
  if (!Array.isArray(value.members) || !Array.isArray(value.events)) throw new Error('That backup is missing members or events.');
  return {
    householdName: typeof value.householdName === 'string' ? value.householdName.slice(0, 80) : 'Our household',
    members: value.members.filter(member => member && typeof member.id === 'string' && typeof member.name === 'string'),
    events: value.events.filter(event => event && typeof event.id === 'string' && typeof event.title === 'string'),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString()
  } as AppData;
}
