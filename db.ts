
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Worklet, Habit, SpeedSession, Material, TimeBlock } from './types.ts';

const DB_NAME = 'gemini-scheduler-db';
const DB_VERSION = 3; // Incremented version for schema change
const WORKLETS_STORE = 'worklets';
const HABITS_STORE = 'habits';
const SESSIONS_STORE = 'speed-sessions';
const MATERIALS_STORE = 'materials';
const TIME_BLOCKS_STORE = 'time_blocks';

interface AppDBSchema extends DBSchema {
  [WORKLETS_STORE]: {
    key: string;
    value: Worklet;
    indexes: { deadline: string };
  };
  [HABITS_STORE]: {
    key: string;
    value: Habit;
    indexes: { name: string };
  };
  [SESSIONS_STORE]: {
    key: string;
    value: SpeedSession;
    indexes: { workletId: string };
  };
  [MATERIALS_STORE]: {
    key: string;
    value: Material;
    indexes: { type: string };
  };
  [TIME_BLOCKS_STORE]: {
    key: string;
    value: TimeBlock;
    indexes: { date: string, isRecurring: 'true' | 'false' };
  }
}

let dbPromise: Promise<IDBPDatabase<AppDBSchema>>;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<AppDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
            if (!db.objectStoreNames.contains(WORKLETS_STORE)) {
              const store = db.createObjectStore(WORKLETS_STORE, { keyPath: 'id' });
              store.createIndex('deadline', 'deadline');
            }
            if (!db.objectStoreNames.contains(HABITS_STORE)) {
              const store = db.createObjectStore(HABITS_STORE, { keyPath: 'id' });
              store.createIndex('name', 'name');
            }
            if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
              const store = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
              store.createIndex('workletId', 'workletId');
            }
        }
        if (oldVersion < 2) {
             if (!db.objectStoreNames.contains(MATERIALS_STORE)) {
                const store = db.createObjectStore(MATERIALS_STORE, { keyPath: 'id' });
                store.createIndex('type', 'type');
            }
        }
         if (oldVersion < 3) {
            if (!db.objectStoreNames.contains(TIME_BLOCKS_STORE)) {
                const store = db.createObjectStore(TIME_BLOCKS_STORE, { keyPath: 'id' });
                store.createIndex('date', 'date');
                store.createIndex('isRecurring', 'isRecurring');
            }
        }
      },
    });
  }
  return dbPromise;
};

// Worklet functions
export const getAllWorklets = async (): Promise<Worklet[]> => {
  const db = await getDb();
  return db.getAll(WORKLETS_STORE);
};
export const saveWorklet = async (worklet: Worklet): Promise<void> => {
  const db = await getDb();
  await db.put(WORKLETS_STORE, worklet);
};
export const deleteWorklet = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete(WORKLETS_STORE, id);
};

// Habit functions
export const getAllHabits = async (): Promise<Habit[]> => {
  const db = await getDb();
  return db.getAll(HABITS_STORE);
};
export const saveHabit = async (habit: Habit): Promise<void> => {
  const db = await getDb();
  await db.put(HABITS_STORE, habit);
};
export const deleteHabit = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete(HABITS_STORE, id);
};

// Session functions
export const getAllSessions = async (): Promise<SpeedSession[]> => {
    const db = await getDb();
    return db.getAll(SESSIONS_STORE);
};
export const saveSession = async (session: SpeedSession): Promise<void> => {
    const db = await getDb();
    await db.put(SESSIONS_STORE, session);
};
export const deleteSessionsForWorklet = async (workletId: string): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(SESSIONS_STORE, 'readwrite');
    const index = tx.store.index('workletId');
    let cursor = await index.openCursor(workletId);
    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }
    await tx.done;
};

// Material functions
export const getAllMaterials = async (): Promise<Material[]> => {
  const db = await getDb();
  return db.getAll(MATERIALS_STORE);
};
export const getMaterial = async (id: string): Promise<Material | undefined> => {
  const db = await getDb();
  return db.get(MATERIALS_STORE, id);
};
export const saveMaterial = async (material: Material): Promise<void> => {
  const db = await getDb();
  await db.put(MATERIALS_STORE, material);
};
export const deleteMaterial = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete(MATERIALS_STORE, id);
};

// TimeBlock functions
export const getAllTimeBlocks = async (): Promise<TimeBlock[]> => {
  const db = await getDb();
  return db.getAll(TIME_BLOCKS_STORE);
};
export const saveTimeBlock = async (timeBlock: TimeBlock): Promise<void> => {
  const db = await getDb();
  await db.put(TIME_BLOCKS_STORE, timeBlock);
};
export const deleteTimeBlock = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete(TIME_BLOCKS_STORE, id);
};

// --- Data Management Functions ---

export const clearStore = async (storeName: 'worklets' | 'habits' | 'speed-sessions' | 'materials' | 'time_blocks'): Promise<void> => {
    const db = await getDb();
    await db.clear(storeName);
};

export const bulkSaveWorklets = async (worklets: Worklet[]): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(WORKLETS_STORE, 'readwrite');
    await Promise.all([...worklets.map(w => tx.store.put(w)), tx.done]);
};

export const bulkSaveHabits = async (habits: Habit[]): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(HABITS_STORE, 'readwrite');
    await Promise.all([...habits.map(h => tx.store.put(h)), tx.done]);
};

export const bulkSaveSessions = async (sessions: SpeedSession[]): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(SESSIONS_STORE, 'readwrite');
    await Promise.all([...sessions.map(s => tx.store.put(s)), tx.done]);
};

export const bulkSaveMaterials = async (materials: Material[]): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(MATERIALS_STORE, 'readwrite');
    await Promise.all([...materials.map(m => tx.store.put(m)), tx.done]);
};

export const bulkSaveTimeBlocks = async (timeBlocks: TimeBlock[]): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(TIME_BLOCKS_STORE, 'readwrite');
    await Promise.all([...timeBlocks.map(tb => tx.store.put(tb)), tx.done]);
};