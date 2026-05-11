import { store } from "./mock-store";
import type { AppUser } from "./types";

const day = 86400000;

export function agentMetrics(agentId: string) {
  const since = Date.now() - 30 * day;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const calls = store.listCalls().filter((c) => c.agentId === agentId);
  const recent = calls.filter((c) => c.startTime >= since);
  const todayCalls = calls.filter((c) => c.startTime >= todayStart.getTime());
  const leads = store.listLeads().filter((l) => l.assignedTo === agentId);
  const won = leads.filter((l) => l.status === "won").length;
  const lost = leads.filter((l) => l.status === "lost").length;
  const total = leads.length || 1;
  const answered = recent.filter((c) => c.status === "answered").length;
  const conversion = Math.round((won / total) * 100);
  const avgDuration = recent.length
    ? Math.round(recent.reduce((a, c) => a + c.duration, 0) / recent.length)
    : 0;
  const answerRate = recent.length ? Math.round((answered / recent.length) * 100) : 0;
  return {
    leadsAssigned: leads.length,
    callsToday: todayCalls.length,
    calls30d: recent.length,
    conversion,
    avgDuration,
    answerRate,
    won,
    lost,
  };
}

export function tier(conversion: number): "high" | "medium" | "low" {
  if (conversion >= 70) return "high";
  if (conversion >= 40) return "medium";
  return "low";
}

export function visibleAgents(viewer: AppUser | null): AppUser[] {
  if (!viewer) return [];
  const all = store.listUsers().filter((u) => u.role === "agent");
  if (viewer.role === "super_admin") return all;
  if (viewer.role === "admin") return all.filter((u) => u.adminId === viewer.id);
  if (viewer.role === "manager") return all.filter((u) => u.managerId === viewer.id);
  return all.filter((u) => u.id === viewer.id);
}

export function visibleLeads(viewer: AppUser | null) {
  const leads = store.listLeads();
  if (!viewer) return [];
  if (viewer.role === "super_admin") return leads;
  if (viewer.role === "agent") return leads.filter((l) => l.assignedTo === viewer.id);
  const agents = visibleAgents(viewer).map((a) => a.id);
  return leads.filter((l) => l.assignedTo && agents.includes(l.assignedTo));
}

export function visibleCalls(viewer: AppUser | null) {
  const calls = store.listCalls();
  if (!viewer) return [];
  if (viewer.role === "super_admin") return calls;
  if (viewer.role === "agent") return calls.filter((c) => c.agentId === viewer.id);
  const agents = visibleAgents(viewer).map((a) => a.id);
  return calls.filter((c) => agents.includes(c.agentId));
}

export function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
