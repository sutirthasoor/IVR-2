// src/lib/firebase-service.ts
import { 
  db, 
  auth, 
  storage 
} from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  writeBatch,
  addDoc
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Lead, CallTask, AppUser, CallRecord, ActivityLog, Settings } from './types';
import { newId } from './mock-store';

// Collections
const USERS_COLLECTION = 'users';
const LEADS_COLLECTION = 'leads';
const CALLS_COLLECTION = 'calls';
const TASKS_COLLECTION = 'tasks';
const ACTIVITY_COLLECTION = 'activity';
const SETTINGS_COLLECTION = 'settings';

// Convert Firestore timestamp to Date
const fromTimestamp = (timestamp: any) => {
  return timestamp?.toDate?.()?.getTime() || timestamp;
};

// User Functions
export async function getUsers(): Promise<AppUser[]> {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: fromTimestamp(doc.data().createdAt),
    lastLogin: fromTimestamp(doc.data().lastLogin),
  } as AppUser));
}

export async function getUser(userId: string): Promise<AppUser | null> {
  const docRef = doc(db, USERS_COLLECTION, userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: fromTimestamp(docSnap.data().createdAt),
    lastLogin: fromTimestamp(docSnap.data().lastLogin),
  } as AppUser;
}

export async function upsertUser(user: AppUser): Promise<void> {
  const userData = {
    ...user,
    createdAt: user.createdAt ? Timestamp.fromMillis(user.createdAt) : Timestamp.now(),
    lastLogin: user.lastLogin ? Timestamp.fromMillis(user.lastLogin) : null,
  };
  await setDoc(doc(db, USERS_COLLECTION, user.id), userData, { merge: true });
  
  // Log activity
  await addActivity({
    id: newId('act'),
    userId: user.id,
    action: 'user_updated',
    details: `${user.fullName} was updated`,
    timestamp: Date.now(),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, USERS_COLLECTION, userId));
}

// Lead Functions
export async function getLeads(): Promise<Lead[]> {
  const snapshot = await getDocs(collection(db, LEADS_COLLECTION));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: fromTimestamp(doc.data().createdAt),
    lastContactedAt: fromTimestamp(doc.data().lastContactedAt),
  } as Lead));
}

export async function getLeadsByAgent(agentId: string): Promise<Lead[]> {
  const q = query(collection(db, LEADS_COLLECTION), where('assignedTo', '==', agentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: fromTimestamp(doc.data().createdAt),
  } as Lead));
}

export async function upsertLead(lead: Lead): Promise<void> {
  const leadData = {
    ...lead,
    createdAt: lead.createdAt ? Timestamp.fromMillis(lead.createdAt) : Timestamp.now(),
    lastContactedAt: lead.lastContactedAt ? Timestamp.fromMillis(lead.lastContactedAt) : null,
  };
  await setDoc(doc(db, LEADS_COLLECTION, lead.id), leadData, { merge: true });
}

export async function upsertLeads(leads: Lead[]): Promise<void> {
  const batch = writeBatch(db);
  leads.forEach(lead => {
    const leadData = {
      ...lead,
      createdAt: lead.createdAt ? Timestamp.fromMillis(lead.createdAt) : Timestamp.now(),
      lastContactedAt: lead.lastContactedAt ? Timestamp.fromMillis(lead.lastContactedAt) : null,
    };
    batch.set(doc(db, LEADS_COLLECTION, lead.id), leadData);
  });
  await batch.commit();
}

export async function assignLeads(leadIds: string[], agentId: string, assignedBy: string): Promise<void> {
  const batch = writeBatch(db);
  leadIds.forEach(leadId => {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    batch.update(leadRef, { assignedTo: agentId });
  });
  await batch.commit();
  
  // Log activity
  await addActivity({
    id: newId('act'),
    userId: assignedBy,
    action: 'leads_assigned',
    details: `Assigned ${leadIds.length} leads to agent ${agentId}`,
    timestamp: Date.now(),
  });
}

// Call Functions
export async function getCalls(): Promise<CallRecord[]> {
  const snapshot = await getDocs(query(collection(db, CALLS_COLLECTION), orderBy('startTime', 'desc')));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    startTime: fromTimestamp(doc.data().startTime),
  } as CallRecord));
}

export async function addCall(call: CallRecord): Promise<void> {
  const callData = {
    ...call,
    startTime: Timestamp.fromMillis(call.startTime),
  };
  await setDoc(doc(db, CALLS_COLLECTION, call.id), callData);
}

// Task Functions
export async function getTasks(): Promise<CallTask[]> {
  const snapshot = await getDocs(collection(db, TASKS_COLLECTION));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    scheduledTime: fromTimestamp(doc.data().scheduledTime),
    completedAt: fromTimestamp(doc.data().completedAt),
  } as CallTask));
}

export async function getTasksByAgent(agentId: string): Promise<CallTask[]> {
  const q = query(
    collection(db, TASKS_COLLECTION), 
    where('assignedTo', '==', agentId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    scheduledTime: fromTimestamp(doc.data().scheduledTime),
  } as CallTask));
}

export async function upsertTask(task: CallTask): Promise<void> {
  const taskData = {
    ...task,
    scheduledTime: Timestamp.fromMillis(task.scheduledTime),
    completedAt: task.completedAt ? Timestamp.fromMillis(task.completedAt) : null,
  };
  await setDoc(doc(db, TASKS_COLLECTION, task.id), taskData, { merge: true });
}

// Activity Functions
export async function addActivity(activity: ActivityLog): Promise<void> {
  const activityData = {
    ...activity,
    timestamp: Timestamp.fromMillis(activity.timestamp),
  };
  await setDoc(doc(db, ACTIVITY_COLLECTION, activity.id), activityData);
}

export async function getActivity(userId?: string): Promise<ActivityLog[]> {
  let q = query(collection(db, ACTIVITY_COLLECTION), orderBy('timestamp', 'desc'));
  if (userId) {
    q = query(q, where('userId', '==', userId));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: fromTimestamp(doc.data().timestamp),
  } as ActivityLog));
}

// Settings Functions
export async function getSettings(): Promise<Settings> {
  const docRef = doc(db, SETTINGS_COLLECTION, 'global');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as Settings;
  }
  // Default settings
  return {
    companyName: 'Call Hub Pro',
    timezone: 'America/New_York',
    voipServer: '',
    voipPort: '5060',
    voipWebsocketUrl: '',
    autoRecord: true,
    recordingRetentionDays: 90,
  };
}

export async function updateSettings(settings: Settings): Promise<void> {
  await setDoc(doc(db, SETTINGS_COLLECTION, 'global'), settings, { merge: true });
}

// Auth Functions - UPDATED VERSION
export async function login(email: string, password: string): Promise<AppUser> {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCred.user;
    
    // Try to get existing user document
    let userDoc = await getUser(firebaseUser.uid);
    
    // If user document doesn't exist, create it
    if (!userDoc) {
      const isAdmin = email === 'admin@luxe.com';
      
      const newUser: AppUser = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        fullName: firebaseUser.displayName || email.split('@')[0],
        role: isAdmin ? 'admin' : 'agent',
        createdAt: Date.now(),
        lastLogin: Date.now(),
        avatar: firebaseUser.photoURL || '',
        phoneNumber: firebaseUser.phoneNumber || '',
      };
      
      await upsertUser(newUser);
      userDoc = newUser;
    } else {
      // Update last login for existing user
      await upsertUser({ ...userDoc, lastLogin: Date.now() });
    }
    
    return userDoc;
    
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// Real-time listeners
export function subscribeToLeads(callback: (leads: Lead[]) => void): () => void {
  return onSnapshot(collection(db, LEADS_COLLECTION), (snapshot) => {
    const leads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: fromTimestamp(doc.data().createdAt),
    } as Lead));
    callback(leads);
  });
}

export function subscribeToCalls(callback: (calls: CallRecord[]) => void): () => void {
  return onSnapshot(
    query(collection(db, CALLS_COLLECTION), orderBy('startTime', 'desc')),
    (snapshot) => {
      const calls = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: fromTimestamp(doc.data().startTime),
      } as CallRecord));
      callback(calls);
    }
  );
}