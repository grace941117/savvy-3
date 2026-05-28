import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "./firebase";
import { Transaction, Goal, UserProfile } from "./types";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error Detailed: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Resilient Local Storage fallback engine
const LOCAL_KEYS = {
  TRANSACTIONS: "savvy_transactions",
  GOALS: "savvy_goals",
  PROFILE: "savvy_profile",
};

function getLocalData<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocalData<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("LocalStorage write failed:", err);
  }
}

// ---------------- USER PROFILE CRUD ----------------
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured) {
    const local = getLocalData<UserProfile | null>(LOCAL_KEYS.PROFILE, null);
    if (local && local.userId === userId) return local;
    return {
      userId,
      email: "savvy.minimalist@gmail.com",
      displayName: "Savvy 大學生",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&fit=crop&q=80",
    };
  }

  const profilePath = `users/${userId}/private/profile`;
  try {
    const docRef = doc(db, profilePath);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, profilePath);
    return null;
  }
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
  if (!isFirebaseConfigured) {
    setLocalData(LOCAL_KEYS.PROFILE, profile);
    return;
  }

  const profilePath = `users/${userId}/private/profile`;
  try {
    const docRef = doc(db, profilePath);
    await setDoc(docRef, profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }
}

// ---------------- TRANSACTIONS CRUD ----------------
export async function getTransactionsList(userId: string): Promise<Transaction[]> {
  if (!isFirebaseConfigured) {
    return getLocalData<Transaction[]>(LOCAL_KEYS.TRANSACTIONS, []);
  }

  const pathStr = `users/${userId}/transactions`;
  try {
    const colRef = collection(db, pathStr);
    const snap = await getDocs(colRef);
    const txs: Transaction[] = [];
    snap.forEach((d) => {
      txs.push(d.data() as Transaction);
    });
    // Sort by date DESC, then createdAt DESC
    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathStr);
    return [];
  }
}

// Real-time operations listener binder (mandated handleFirestoreError in snapshot callback)
export function listenTransactions(userId: string, callback: (txs: Transaction[]) => void) {
  if (!isFirebaseConfigured) {
    // Return mock unbinder for localStorage
    const update = () => {
      const txs = getLocalData<Transaction[]>(LOCAL_KEYS.TRANSACTIONS, []);
      callback(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }

  const pathStr = `users/${userId}/transactions`;
  const q = query(collection(db, pathStr));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach((d) => {
        txs.push(d.data() as Transaction);
      });
      callback(txs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, pathStr);
    }
  );
}

export async function createTransaction(userId: string, tx: Transaction): Promise<void> {
  if (!isFirebaseConfigured) {
    const txs = getLocalData<Transaction[]>(LOCAL_KEYS.TRANSACTIONS, []);
    txs.push(tx);
    setLocalData(LOCAL_KEYS.TRANSACTIONS, txs);
    // Dispatch standard storage event so list listeners refresh
    window.dispatchEvent(new Event("storage"));
    return;
  }

  const txPath = `users/${userId}/transactions/${tx.id}`;
  try {
    await setDoc(doc(db, txPath), tx);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, txPath);
  }
}

export async function editTransaction(userId: string, tx: Transaction): Promise<void> {
  if (!isFirebaseConfigured) {
    const txs = getLocalData<Transaction[]>(LOCAL_KEYS.TRANSACTIONS, []);
    const idx = txs.findIndex((item) => item.id === tx.id);
    if (idx !== -1) {
      txs[idx] = tx;
      setLocalData(LOCAL_KEYS.TRANSACTIONS, txs);
      window.dispatchEvent(new Event("storage"));
    }
    return;
  }

  const txPath = `users/${userId}/transactions/${tx.id}`;
  try {
    const docRef = doc(db, txPath);
    await updateDoc(docRef, {
      amount: tx.amount,
      category: tx.category,
      type: tx.type,
      date: tx.date,
      note: tx.note,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, txPath);
  }
}

export async function deleteTransaction(userId: string, txId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const txs = getLocalData<Transaction[]>(LOCAL_KEYS.TRANSACTIONS, []);
    const filtered = txs.filter((item) => item.id !== txId);
    setLocalData(LOCAL_KEYS.TRANSACTIONS, filtered);
    window.dispatchEvent(new Event("storage"));
    return;
  }

  const txPath = `users/${userId}/transactions/${txId}`;
  try {
    await deleteDoc(doc(db, txPath));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, txPath);
  }
}

// ---------------- GOALS CRUD ----------------
export async function getGoalsList(userId: string): Promise<Goal[]> {
  if (!isFirebaseConfigured) {
    return getLocalData<Goal[]>(LOCAL_KEYS.GOALS, []);
  }

  const pathStr = `users/${userId}/goals`;
  try {
    const snap = await getDocs(collection(db, pathStr));
    const goals: Goal[] = [];
    snap.forEach((d) => {
      goals.push(d.data() as Goal);
    });
    return goals;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathStr);
    return [];
  }
}

export function listenGoals(userId: string, callback: (goals: Goal[]) => void) {
  if (!isFirebaseConfigured) {
    const update = () => {
      callback(getLocalData<Goal[]>(LOCAL_KEYS.GOALS, []));
    };
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }

  const pathStr = `users/${userId}/goals`;
  const q = query(collection(db, pathStr));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const goals: Goal[] = [];
      snapshot.forEach((d) => {
        goals.push(d.data() as Goal);
      });
      callback(goals);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, pathStr);
    }
  );
}

export async function createGoal(userId: string, goal: Goal): Promise<void> {
  if (!isFirebaseConfigured) {
    const goals = getLocalData<Goal[]>(LOCAL_KEYS.GOALS, []);
    goals.push(goal);
    setLocalData(LOCAL_KEYS.GOALS, goals);
    window.dispatchEvent(new Event("storage"));
    return;
  }

  const goalPath = `users/${userId}/goals/${goal.id}`;
  try {
    await setDoc(doc(db, goalPath), goal);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, goalPath);
  }
}

export async function updateGoalCurrent(userId: string, goalId: string, currentAmount: number, predictedDate?: string, aiAdvice?: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const goals = getLocalData<Goal[]>(LOCAL_KEYS.GOALS, []);
    const idx = goals.findIndex((item) => item.id === goalId);
    if (idx !== -1) {
      goals[idx].currentAmount = currentAmount;
      if (predictedDate) goals[idx].predictedDate = predictedDate;
      if (aiAdvice) goals[idx].aiAdvice = aiAdvice;
      setLocalData(LOCAL_KEYS.GOALS, goals);
      window.dispatchEvent(new Event("storage"));
    }
    return;
  }

  const goalPath = `users/${userId}/goals/${goalId}`;
  try {
    const docRef = doc(db, goalPath);
    const updates: any = { currentAmount };
    if (predictedDate) updates.predictedDate = predictedDate;
    if (aiAdvice) updates.aiAdvice = aiAdvice;
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, goalPath);
  }
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const goals = getLocalData<Goal[]>(LOCAL_KEYS.GOALS, []);
    const filtered = goals.filter((item) => item.id !== goalId);
    setLocalData(LOCAL_KEYS.GOALS, filtered);
    window.dispatchEvent(new Event("storage"));
    return;
  }

  const goalPath = `users/${userId}/goals/${goalId}`;
  try {
    await deleteDoc(doc(db, goalPath));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, goalPath);
  }
}
