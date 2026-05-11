// In-memory + localStorage demo store. Used as a fallback when Firestore is empty
// or the user is in demo mode. All pages read/write through this store so the UI
// is fully functional without configuring Firebase rules.
import type {
  AppUser,
  Lead,
  Call,
  CallTask,
  ActivityLog,
  Role,
  LeadStatus,
  CallStatus,
} from "./types";

const KEY = "crm-demo-store-v1";

interface Store {
  users: AppUser[];
  leads: Lead[];
  calls: Call[];
  tasks: CallTask[];
  activity: ActivityLog[];
  settings: {
    companyName: string;
    timezone: string;
    voipServer: string;
    voipPort: string;
    voipWebsocketUrl: string;
    autoRecord: boolean;
    recordingRetentionDays: number;
  };
}

const now = Date.now();
const day = 86400000;

function seed(): Store {
  const users: AppUser[] = [
    { id: "u-super", fullName: "Sarah Owner", email: "super@luxe.com", role: "super_admin", status: "active", phone: "+1 555 0100", createdAt: now - 90 * day, lastLogin: now - 3600000 },
    { id: "u-admin1", fullName: "David Admin", email: "admin@luxe.com", role: "admin", status: "active", phone: "+1 555 0101", createdBy: "u-super", createdAt: now - 60 * day, lastLogin: now - 7200000 },
    { id: "u-mgr1", fullName: "Maria Manager", email: "manager@luxe.com", role: "manager", status: "active", phone: "+1 555 0102", adminId: "u-admin1", createdBy: "u-admin1", createdAt: now - 45 * day, lastLogin: now - 1800000 },
    { id: "u-mgr2", fullName: "Mike Manager", email: "mike@luxe.com", role: "manager", status: "active", phone: "+1 555 0103", adminId: "u-admin1", createdBy: "u-admin1", createdAt: now - 40 * day, lastLogin: now - 86400000 },
    { id: "u-ag1", fullName: "John Doe", email: "john@luxe.com", role: "agent", status: "active", phone: "+1 234 567 8900", adminId: "u-admin1", managerId: "u-mgr1", createdAt: now - 30 * day, lastLogin: now - 600000 },
    { id: "u-ag2", fullName: "Jane Smith", email: "jane@luxe.com", role: "agent", status: "active", phone: "+1 234 567 8901", adminId: "u-admin1", managerId: "u-mgr1", createdAt: now - 25 * day, lastLogin: now - 1200000 },
    { id: "u-ag3", fullName: "Carlos Reyes", email: "carlos@luxe.com", role: "agent", status: "on_break", phone: "+1 234 567 8902", adminId: "u-admin1", managerId: "u-mgr1", createdAt: now - 20 * day, lastLogin: now - 900000 },
    { id: "u-ag4", fullName: "Priya Patel", email: "priya@luxe.com", role: "agent", status: "active", phone: "+1 234 567 8903", adminId: "u-admin1", managerId: "u-mgr2", createdAt: now - 15 * day, lastLogin: now - 7200000 },
    { id: "u-ag5", fullName: "Liam Chen", email: "liam@luxe.com", role: "agent", status: "inactive", phone: "+1 234 567 8904", adminId: "u-admin1", managerId: "u-mgr2", createdAt: now - 10 * day, lastLogin: now - 5 * day },
  ];

  const leadStatuses: LeadStatus[] = ["new", "contacted", "proposal", "won", "lost"];
  const agentIds = ["u-ag1", "u-ag2", "u-ag3", "u-ag4", "u-ag5", null];
  const firstNames = ["Alex", "Jordan", "Taylor", "Sam", "Riley", "Casey", "Morgan", "Avery", "Quinn", "Reese", "Drew", "Hayden"];
  const lastNames = ["Johnson", "Lee", "Garcia", "Brown", "Davis", "Miller", "Wilson", "Moore", "Anderson", "Thomas"];
  const companies = ["Acme Co", "Globex", "Initech", "Umbrella", "Hooli", "Stark Ind", "Wayne Ent", "Pied Piper"];

  const leads: Lead[] = Array.from({ length: 60 }).map((_, i) => ({
    id: `l-${i + 1}`,
    firstName: firstNames[i % firstNames.length],
    lastName: lastNames[i % lastNames.length],
    phone: `+1 555 ${String(1000 + i).padStart(4, "0")}`,
    email: `lead${i + 1}@example.com`,
    company: companies[i % companies.length],
    status: leadStatuses[i % leadStatuses.length],
    assignedTo: agentIds[i % agentIds.length],
    assignedBy: "u-mgr1",
    assignedAt: now - (i % 20) * day,
    createdAt: now - (i % 30) * day,
    lastContactedAt: i % 3 === 0 ? now - (i % 7) * day : null,
    notes: "",
  }));

  const callStatuses: CallStatus[] = ["answered", "voicemail", "no_answer", "busy"];
  const calls: Call[] = Array.from({ length: 80 }).map((_, i) => {
    const agent = users[4 + (i % 5)];
    const lead = leads[i % leads.length];
    const start = now - (i % 30) * day - (i % 24) * 3600000;
    return {
      id: `c-${i + 1}`,
      leadId: lead.id,
      leadName: `${lead.firstName} ${lead.lastName}`,
      leadPhone: lead.phone,
      agentId: agent.id,
      agentName: agent.fullName,
      duration: 30 + (i * 17) % 480,
      status: callStatuses[i % callStatuses.length],
      startTime: start,
      endTime: start + ((i * 17) % 480) * 1000,
      transcript: i % 4 === 0 ? "Discussed pricing and follow-up next week." : "",
    };
  });

  const tasks: CallTask[] = Array.from({ length: 8 }).map((_, i) => {
    const lead = leads[i];
    return {
      id: `t-${i + 1}`,
      leadId: lead.id,
      leadName: `${lead.firstName} ${lead.lastName}`,
      leadPhone: lead.phone,
      assignedTo: ["u-ag1", "u-ag2", "u-ag4"][i % 3],
      assignedBy: "u-mgr1",
      priority: (["high", "medium", "low"] as const)[i % 3],
      scheduledTime: now + (i + 1) * 3600000,
      notes: "Follow up on proposal sent last week.",
      status: "pending",
    };
  });

  const activity: ActivityLog[] = users.slice(4).flatMap((u, i) => [
    { id: `a-${i}-1`, userId: u.id, userName: u.fullName, action: "Logged in", timestamp: now - i * 3600000 },
    { id: `a-${i}-2`, userId: u.id, userName: u.fullName, action: "Completed call", details: "Lead #1234", timestamp: now - i * 3600000 - 1800000 },
  ]);

  return {
    users,
    leads,
    calls,
    tasks,
    activity,
    settings: {
      companyName: "Luxe CRM",
      timezone: "UTC",
      voipServer: "",
      voipPort: "5060",
      voipWebsocketUrl: "",
      autoRecord: true,
      recordingRetentionDays: 90,
    },
  };
}

function load(): Store {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch {
    return seed();
  }
}

let cache: Store | null = null;

function get(): Store {
  if (!cache) cache = load();
  return cache;
}

function persist() {
  if (typeof window === "undefined" || !cache) return;
  localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();

export const store = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  reset() {
    cache = seed();
    persist();
  },
  // users
  listUsers: () => get().users,
  getUser: (id: string) => get().users.find((u) => u.id === id),
  upsertUser: (u: AppUser) => {
    const s = get();
    const idx = s.users.findIndex((x) => x.id === u.id);
    if (idx >= 0) s.users[idx] = u;
    else s.users.push(u);
    persist();
  },
  deleteUser: (id: string) => {
    const s = get();
    s.users = s.users.filter((u) => u.id !== id);
    persist();
  },
  // leads
  listLeads: () => get().leads,
  upsertLead: (l: Lead) => {
    const s = get();
    const idx = s.leads.findIndex((x) => x.id === l.id);
    if (idx >= 0) s.leads[idx] = l;
    else s.leads.push(l);
    persist();
  },
  upsertLeads: (ls: Lead[]) => {
    const s = get();
    ls.forEach((l) => {
      const idx = s.leads.findIndex((x) => x.id === l.id);
      if (idx >= 0) s.leads[idx] = l;
      else s.leads.push(l);
    });
    persist();
  },
  deleteLead: (id: string) => {
    const s = get();
    s.leads = s.leads.filter((x) => x.id !== id);
    persist();
  },
  assignLeads: (leadIds: string[], agentId: string | null, byUserId: string) => {
    const s = get();
    s.leads = s.leads.map((l) =>
      leadIds.includes(l.id)
        ? { ...l, assignedTo: agentId, assignedBy: byUserId, assignedAt: Date.now() }
        : l,
    );
    persist();
  },
  // calls
  listCalls: () => get().calls,
  upsertCall: (c: Call) => {
    const s = get();
    const idx = s.calls.findIndex((x) => x.id === c.id);
    if (idx >= 0) s.calls[idx] = c;
    else s.calls.push(c);
    persist();
  },
  // tasks
  listTasks: () => get().tasks,
  upsertTask: (t: CallTask) => {
    const s = get();
    const idx = s.tasks.findIndex((x) => x.id === t.id);
    if (idx >= 0) s.tasks[idx] = t;
    else s.tasks.push(t);
    persist();
  },
  // activity
  listActivity: () => get().activity,
  log: (userId: string, userName: string, action: string, details?: string) => {
    const s = get();
    s.activity.unshift({
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      userName,
      action,
      details,
      timestamp: Date.now(),
    });
    persist();
  },
  // settings
  getSettings: () => get().settings,
  updateSettings: (patch: Partial<Store["settings"]>) => {
    const s = get();
    s.settings = { ...s.settings, ...patch };
    persist();
  },
};

export function useStoreVersion() {
  const [v, setV] = useStateImport();
  useEffectImport(() => store.subscribe(() => setV((n) => n + 1)), []);
  return v;
}

// dynamic import-friendly hook stubs
import { useState as useStateImport, useEffect as useEffectImport } from "react";

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function _roles(): Role[] {
  return ["super_admin", "admin", "manager", "agent"];
}
