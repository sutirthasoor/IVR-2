import { store } from './mock-store';
import type { AppUser, CallRecord, Lead } from './types';

export async function visibleLeads(user: AppUser | null): Promise<Lead[]> {
  if (!user) return [];
  const allLeads = await store.listLeads();
  
  if (!Array.isArray(allLeads)) {
    console.warn('visibleLeads: allLeads is not an array', allLeads);
    return [];
  }
  
  if (user.role === 'super_admin' || user.role === 'admin') {
    return allLeads;
  }
  if (user.role === 'manager') {
    const allUsers = await store.listUsers();
    const agents = allUsers.filter(u => u.managerId === user.id);
    const agentIds = agents.map(a => a.id);
    return allLeads.filter(l => l.assignedTo && agentIds.includes(l.assignedTo));
  }
  if (user.role === 'agent') {
    return allLeads.filter(l => l.assignedTo === user.id);
  }
  return [];
}

export async function visibleCalls(user: AppUser | null): Promise<CallRecord[]> {
  if (!user) return [];
  const allCalls = await store.listCalls();
  
  if (!Array.isArray(allCalls)) {
    console.warn('visibleCalls: allCalls is not an array', allCalls);
    return [];
  }
  
  if (user.role === 'super_admin' || user.role === 'admin') {
    return allCalls;
  }
  if (user.role === 'manager') {
    const allUsers = await store.listUsers();
    const agents = allUsers.filter(u => u.managerId === user.id);
    const agentIds = agents.map(a => a.id);
    return allCalls.filter(c => c.agentId && agentIds.includes(c.agentId));
  }
  if (user.role === 'agent') {
    return allCalls.filter(c => c.agentId === user.id);
  }
  return [];
}

export async function visibleAgents(user: AppUser | null): Promise<AppUser[]> {
  if (!user) return [];
  const allUsers = await store.listUsers();
  
  if (!Array.isArray(allUsers)) {
    console.warn('visibleAgents: allUsers is not an array', allUsers);
    return [];
  }
  
  // Get only users with role 'agent'
  let agents = allUsers.filter(u => u.role === 'agent');
  
  if (user.role === 'super_admin' || user.role === 'admin') {
    // Super admin and admin see all agents
    return agents;
  }
  if (user.role === 'manager') {
    // Manager sees only agents assigned to them
    return agents.filter(a => a.managerId === user.id);
  }
  if (user.role === 'agent') {
    // Agents don't see other agents
    return [];
  }
  return [];
}

export async function agentMetrics(agentId: string) {
  const calls = await store.listCalls();
  const leads = await store.listLeads();
  
  const callsArray = Array.isArray(calls) ? calls : [];
  const leadsArray = Array.isArray(leads) ? leads : [];
  
  const agentCalls = callsArray.filter(c => c.agentId === agentId);
  const agentLeads = leadsArray.filter(l => l.assignedTo === agentId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const callsToday = agentCalls.filter(c => c.startTime >= today.getTime()).length;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const calls30d = agentCalls.filter(c => c.startTime >= thirtyDaysAgo).length;
  const answered = agentCalls.filter(c => c.status === 'answered').length;
  const conversion = agentLeads.length 
    ? Math.round((agentLeads.filter(l => l.status === 'won').length / agentLeads.length) * 100)
    : 0;
  const avgDuration = agentCalls.length 
    ? Math.round(agentCalls.reduce((s, c) => s + c.duration, 0) / agentCalls.length)
    : 0;
  const answerRate = agentCalls.length 
    ? Math.round((answered / agentCalls.length) * 100)
    : 0;
  const won = agentLeads.filter(l => l.status === 'won').length;
  const lost = agentLeads.filter(l => l.status === 'lost').length;
  
  return {
    leadsAssigned: agentLeads.length,
    callsToday,
    calls30d,
    conversion,
    avgDuration,
    answerRate,
    won,
    lost,
  };
}

export function fmtDuration(seconds: number): string {
  if (!seconds) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function tier(conversion: number): 'high' | 'medium' | 'low' {
  if (conversion >= 70) return 'high';
  if (conversion >= 40) return 'medium';
  return 'low';
}