import React, { useEffect, useState } from 'react';
import * as firebaseService from './firebase-service';
import type { Lead, CallTask, AppUser, CallRecord, ActivityLog, Settings } from './types';

// Re-export all Firebase functions with array guarantees
export const store = {
  // Users
  listUsers: async () => {
    const users = await firebaseService.getUsers();
    return Array.isArray(users) ? users : [];
  },
  getUser: firebaseService.getUser,
  upsertUser: firebaseService.upsertUser,
  deleteUser: firebaseService.deleteUser,
  
  // Leads
  listLeads: async () => {
    const leads = await firebaseService.getLeads();
    return Array.isArray(leads) ? leads : [];
  },
  upsertLead: firebaseService.upsertLead,
  upsertLeads: firebaseService.upsertLeads,
  assignLeads: firebaseService.assignLeads,
  
  // Calls
  listCalls: async () => {
    const calls = await firebaseService.getCalls();
    return Array.isArray(calls) ? calls : [];
  },
  addCall: firebaseService.addCall,
  
  // Tasks
  listTasks: async () => {
    const tasks = await firebaseService.getTasks();
    return Array.isArray(tasks) ? tasks : [];
  },
  upsertTask: firebaseService.upsertTask,
  
  // Activity
  listActivity: async () => {
    const activity = await firebaseService.getActivity();
    return Array.isArray(activity) ? activity : [];
  },
  addActivity: firebaseService.addActivity,
  
  // Settings
  getSettings: firebaseService.getSettings,
  updateSettings: firebaseService.updateSettings,
};

// Helper to generate IDs
export function newId(prefix: string = ''): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Store version for reactivity
let storeVersion = 0;
export function useStoreVersion() {
  const [version, setVersion] = useState(storeVersion);
  useEffect(() => {
    const interval = setInterval(() => {
      storeVersion++;
      setVersion(storeVersion);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return version;
}