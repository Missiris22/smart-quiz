import { AppState, User, UserRole, PDFDocument, Quiz } from '../types';

const STORAGE_KEY = 'smartquiz_ai_db_v1';
const ADMIN_PHONE = '18321376704';

// --- IndexedDB Implementation for Large Files ---
const DB_NAME = 'SmartQuizAssets';
const STORE_NAME = 'pdfs';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if indexedDB is available
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const savePdfToStorage = async (id: string, data: string) => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(data, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to save to IndexedDB", e);
    throw e;
  }
};

export const getPdfFromStorage = async (id: string): Promise<string | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as string);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to read from IndexedDB", e);
    return null;
  }
};

// --- LocalStorage Implementation for Metadata ---

const defaultState: AppState = {
  currentUser: null,
  users: [
    {
      phoneNumber: ADMIN_PHONE,
      role: UserRole.ADMIN,
      name: '管理员'
    }
  ],
  documents: [],
  quizzes: []
};

// Helper to get state
export const getStore = (): AppState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultState;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return defaultState;
  }
};

// Helper to save state
export const setStore = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("LocalStorage Save Error", e);
    throw new Error("存储空间已满，请清理部分数据。");
  }
};

// Auth Actions
export const loginUser = (phoneNumber: string): User | null => {
  const store = getStore();
  const user = store.users.find(u => u.phoneNumber === phoneNumber);
  
  if (!user) return null;

  // Check expiry for non-admins
  if (user.role === UserRole.USER && user.expiryDate) {
    const now = new Date();
    const expiry = new Date(user.expiryDate);
    if (now > expiry) {
      throw new Error("账号已过期");
    }
  }

  const newState = { ...store, currentUser: user };
  setStore(newState);
  return user;
};

export const logoutUser = () => {
  const store = getStore();
  setStore({ ...store, currentUser: null });
};

// Admin Actions
export const addUser = (newUser: User) => {
  const store = getStore();
  if (store.users.some(u => u.phoneNumber === newUser.phoneNumber)) {
    throw new Error("该用户已存在");
  }
  const updatedUsers = [...store.users, newUser];
  setStore({ ...store, users: updatedUsers });
};

// Async addDocument to handle splitting data
export const addDocument = async (doc: PDFDocument) => {
  const store = getStore();
  
  // Extract base64Data to store in IndexedDB
  const { base64Data, ...metadata } = doc;
  
  if (base64Data) {
    await savePdfToStorage(doc.id, base64Data);
  }
  
  // Store only metadata in LocalStorage
  setStore({ ...store, documents: [...store.documents, metadata] });
};

export const addQuiz = (quiz: Quiz) => {
  const store = getStore();
  setStore({ ...store, quizzes: [...store.quizzes, quiz] });
};

// Data retrieval
export const getDocuments = (): PDFDocument[] => {
  return getStore().documents;
};

export const getQuizzes = (): Quiz[] => {
  return getStore().quizzes;
};

export const getUsers = (): User[] => {
  return getStore().users;
};