import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  getUsers, 
  getLeads, 
  getCalls, 
  getTasks,
  getSettings,
  subscribeToLeads,
  subscribeToCalls
} from './firebase-service';
import type { Lead, CallRecord, AppUser, CallTask, Settings } from './types';
import { useAuth } from './auth-context';

interface FirebaseDataContextType {
  users: AppUser[];
  leads: Lead[];
  calls: CallRecord[];
  tasks: CallTask[];
  settings: Settings;
  loading: boolean;
  refresh: () => void;
}

const FirebaseDataContext = createContext<FirebaseDataContextType | undefined>(undefined);

export function FirebaseDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [tasks, setTasks] = useState<CallTask[]>([]);
  const [settings, setSettings] = useState<Settings>({} as Settings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Load initial data
    const loadData = async () => {
      try {
        const [usersData, leadsData, callsData, tasksData, settingsData] = await Promise.all([
          getUsers(),
          getLeads(),
          getCalls(),
          getTasks(),
          getSettings(),
        ]);
        setUsers(usersData);
        setLeads(leadsData);
        setCalls(callsData);
        setTasks(tasksData);
        setSettings(settingsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Setup real-time listeners
    const unsubLeads = subscribeToLeads(setLeads);
    const unsubCalls = subscribeToCalls(setCalls);

    return () => {
      unsubLeads();
      unsubCalls();
    };
  }, [user]);

  const refresh = () => {
    setLoading(true);
    Promise.all([getUsers(), getLeads(), getCalls(), getTasks(), getSettings()])
      .then(([usersData, leadsData, callsData, tasksData, settingsData]) => {
        setUsers(usersData);
        setLeads(leadsData);
        setCalls(callsData);
        setTasks(tasksData);
        setSettings(settingsData);
      })
      .finally(() => setLoading(false));
  };

  return (
    <FirebaseDataContext.Provider value={{ users, leads, calls, tasks, settings, loading, refresh }}>
      {children}
    </FirebaseDataContext.Provider>
  );
}

export function useFirebaseData() {
  const context = useContext(FirebaseDataContext);
  if (!context) throw new Error('useFirebaseData must be used within FirebaseDataProvider');
  return context;
}