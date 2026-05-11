export type Role = "super_admin" | "admin" | "manager" | "agent";
export type UserStatus = "active" | "inactive" | "on_break";
export type LeadStatus = "new" | "contacted" | "proposal" | "won" | "lost";
export type CallStatus = "answered" | "voicemail" | "no_answer" | "busy";
export type TaskStatus = "pending" | "completed" | "cancelled";
export type Priority = "high" | "medium" | "low";

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: UserStatus;
  phone?: string;
  adminId?: string | null;
  managerId?: string | null;
  createdBy?: string;
  createdAt?: number;
  lastLogin?: number;
  performanceNotes?: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  company?: string;
  status: LeadStatus;
  notes?: string;
  assignedTo?: string | null;
  assignedBy?: string | null;
  assignedAt?: number | null;
  createdBy?: string;
  createdAt: number;
  lastContactedAt?: number | null;
}

export interface Call {
  id: string;
  leadId: string;
  leadName?: string;
  leadPhone: string;
  agentId: string;
  agentName: string;
  recordingUrl?: string;
  duration: number; // seconds
  status: CallStatus;
  startTime: number;
  endTime?: number;
  transcript?: string;
}

export interface CallTask {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  assignedTo: string;
  assignedBy: string;
  priority: Priority;
  scheduledTime: number;
  notes?: string;
  status: TaskStatus;
  completedAt?: number;
  callId?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  timestamp: number;
}
