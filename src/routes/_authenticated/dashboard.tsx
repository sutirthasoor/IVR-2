import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { store, useStoreVersion } from "@/lib/mock-store";
import { agentMetrics, fmtDuration, visibleAgents, visibleCalls, visibleLeads } from "@/lib/perf";
import { format, subDays, startOfDay } from "date-fns";
import type { Lead, CallRecord } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

function Dashboard() {
  useStoreVersion();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [leadsData, callsData] = await Promise.all([
          visibleLeads(user),
          visibleCalls(user)
        ]);
        setLeads(leadsData as Lead[]);
        setCalls(callsData as CallRecord[]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  const last7 = useMemo(() => {
    if (!calls.length) return [];
    return Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      const start = startOfDay(d).getTime();
      const end = start + 86400000;
      const count = calls.filter((c) => c.startTime >= start && c.startTime < end).length;
      return { day: format(d, "EEE"), calls: count };
    });
  }, [calls]);

  const leadsByStatus = useMemo(() => {
    if (!leads.length) return [];
    return ["new", "contacted", "proposal", "won", "lost"].map((s) => ({
      status: s,
      count: leads.filter((l) => l.status === s).length,
    }));
  }, [leads]);

  const callOutcomes = useMemo(() => {
    if (!calls.length) return [];
    return ["answered", "voicemail", "no_answer", "busy"].map((s) => ({
      name: s,
      value: calls.filter((c) => c.status === s).length,
    }));
  }, [calls]);

  const totalCalls = calls.length;
  const answered = calls.filter((c) => c.status === "answered").length;
  const won = leads.filter((l) => l.status === "won").length;
  const conversion = leads.length ? Math.round((won / leads.length) * 100) : 0;
  const avgDur = totalCalls
    ? Math.round(calls.reduce((a, c) => a + c.duration, 0) / totalCalls)
    : 0;

  const recent = [...calls].sort((a, b) => b.startTime - a.startTime).slice(0, 10);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold">Loading Dashboard...</div>
          <p className="text-sm text-muted-foreground mt-2">Fetching your data from Firebase</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "agent"
            ? "Your daily activity and tasks."
            : "Team performance and pipeline overview."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Total Leads" value={leads.length} hint="+12% vs last month" />
        <Kpi title="Calls Made" value={totalCalls} hint={`${answered} answered`} />
        <Kpi title="Conversion Rate" value={`${conversion}%`} hint={`${won} won`} />
        <Kpi title="Avg Call Duration" value={fmtDuration(avgDur)} hint="last 30 days" />
      </div>

      {user.role === "agent" && <AgentTasks userId={user.id} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads by status</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {leadsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No lead data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calls per day (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {last7.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last7}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No call data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Call outcomes</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {callOutcomes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={callOutcomes} dataKey="value" nameKey="name" outerRadius={90} label>
                    {callOutcomes.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No call outcome data
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recent.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{c.agentName}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.leadName} • {c.leadPhone}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{c.status}</Badge>
                    <span className="text-xs">{fmtDuration(c.duration)}</span>
                    <audio controls className="h-8" src="" />
                  </div>
                </div>
              ))}
              {recent.length === 0 && (
                <p className="text-sm text-muted-foreground">No calls yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {user.role !== "agent" && <Leaderboard viewerId={user.id} role={user.role} />}
    </div>
  );
}

function Kpi({ title, value, hint }: { title: string; value: any; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase text-muted-foreground">{title}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function AgentTasks({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  
  useEffect(() => {
    const loadTasks = async () => {
      const allTasks = await store.listTasks();
      setTasks(allTasks.filter((t: any) => t.assignedTo === userId && t.status === "pending"));
    };
    loadTasks();
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My pending callbacks ({tasks.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">No pending tasks.</p>
        )}
        {tasks.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-md border p-3 text-sm"
          >
            <div>
              <div className="font-medium">{t.leadName}</div>
              <div className="text-xs text-muted-foreground">
                {t.leadPhone} • {format(t.scheduledTime, "MMM d, p")}
              </div>
              {t.notes && <div className="mt-1 text-xs italic">{t.notes}</div>}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  t.priority === "high"
                    ? "destructive"
                    : t.priority === "medium"
                      ? "default"
                      : "secondary"
                }
              >
                {t.priority}
              </Badge>
              <Button size="sm">Call now</Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await store.upsertTask({ ...t, status: "completed", completedAt: Date.now() });
                  setTasks(prev => prev.filter(task => task.id !== t.id));
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Leaderboard({ viewerId, role }: { viewerId: string; role: string }) {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [ranked, setRanked] = useState<any[]>([]);

  useEffect(() => {
    const loadAgents = async () => {
      if (!user) return;
      const agentsList = await visibleAgents(user);
      setAgents(agentsList);
      
      const rankedList = await Promise.all(
        agentsList.map(async (a: any) => ({ 
          a, 
          m: await agentMetrics(a.id) 
        }))
      );
      setRanked(rankedList.sort((x, y) => y.m.conversion - x.m.conversion).slice(0, 10));
    };
    loadAgents();
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top agents by conversion</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {ranked.map((r, i) => (
            <Link
              key={r.a.id}
              to="/agents"
              className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-xs font-bold text-muted-foreground">#{i + 1}</span>
                <span className="font-medium">{r.a.fullName}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{r.m.calls30d} calls</span>
                <Badge>{r.m.conversion}%</Badge>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}