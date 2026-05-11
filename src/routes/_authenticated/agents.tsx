import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { store, useStoreVersion, newId } from "@/lib/mock-store";
import { agentMetrics, fmtDuration, tier, visibleAgents } from "@/lib/perf";
import type { AppUser, CallTask, Lead, Priority } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  RefreshCw,
  Download,
  Plus,
  Search,
  LayoutGrid,
  List,
  Phone,
  PhoneCall,
  UserPlus,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfDay } from "date-fns";

export const Route = createFileRoute("/_authenticated/agents")({
  component: AgentsPage,
});

function AgentsPage() {
  useStoreVersion();
  const { user } = useAuth();
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [perfFilter, setPerfFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bulkLeadsOpen, setBulkLeadsOpen] = useState(false);

  if (!user) return null;
  const all = visibleAgents(user);

  const filtered = useMemo(() => {
    let arr = all.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q || a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      const m = agentMetrics(a.id);
      const t = tier(m.conversion);
      const matchPerf = perfFilter === "all" || perfFilter === t;
      return matchSearch && matchStatus && matchPerf;
    });
    arr.sort((a, b) => {
      const ma = agentMetrics(a.id);
      const mb = agentMetrics(b.id);
      if (sort === "name") return a.fullName.localeCompare(b.fullName);
      if (sort === "leads") return mb.leadsAssigned - ma.leadsAssigned;
      if (sort === "conversion") return mb.conversion - ma.conversion;
      if (sort === "calls") return mb.calls30d - ma.calls30d;
      return 0;
    });
    return arr;
  }, [all, search, statusFilter, perfFilter, sort]);

  const active = activeId ? all.find((a) => a.id === activeId) : null;

  const totalActive = all.filter((a) => a.status === "active").length;
  const avgConv =
    all.length === 0
      ? 0
      : Math.round(
          all.reduce((s, a) => s + agentMetrics(a.id).conversion, 0) / all.length,
        );
  const totalCallsToday = all.reduce((s, a) => s + agentMetrics(a.id).callsToday, 0);
  const totalLeadsAssigned = all.reduce((s, a) => s + agentMetrics(a.id).leadsAssigned, 0);

  const exportCsv = (rows: AppUser[]) => {
    const header = "Name,Email,Phone,Status,Leads,Calls Today,Conversion %\n";
    const body = rows
      .map((a) => {
        const m = agentMetrics(a.id);
        return `${a.fullName},${a.email},${a.phone || ""},${a.status},${m.leadsAssigned},${m.callsToday},${m.conversion}`;
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agents.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">
            Manage agents, view performance and assign work.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => store.subscribe(() => {})()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCsv(all)}>
            <Download className="mr-2 h-4 w-4" />
            Export all
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add agent
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Active agents" value={totalActive} />
        <SummaryCard label="Avg conversion" value={`${avgConv}%`} />
        <SummaryCard label="Calls today" value={totalCallsToday} />
        <SummaryCard label="Leads assigned" value={totalLeadsAssigned} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_break">On break</SelectItem>
              </SelectContent>
            </Select>
            <Select value={perfFilter} onValueChange={setPerfFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All performance</SelectItem>
                <SelectItem value="high">High (&gt;70%)</SelectItem>
                <SelectItem value="medium">Medium (40–70%)</SelectItem>
                <SelectItem value="low">Low (&lt;40%)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort: Name</SelectItem>
                <SelectItem value="leads">Sort: Leads</SelectItem>
                <SelectItem value="conversion">Sort: Conversion</SelectItem>
                <SelectItem value="calls">Sort: Call volume</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex rounded-md border">
              <Button
                variant={view === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("table")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
              <span>{selected.size} selected</span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setBulkLeadsOpen(true)}>
                  Bulk assign leads
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportCsv(all.filter((a) => selected.has(a.id)))}
                >
                  Export selected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {view === "cards" ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((a) => (
                <AgentCard
                  key={a.id}
                  agent={a}
                  selected={selected.has(a.id)}
                  onSelect={(v) => {
                    const s = new Set(selected);
                    v ? s.add(a.id) : s.delete(a.id);
                    setSelected(s);
                  }}
                  onOpen={() => setActiveId(a.id)}
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground">No agents match.</p>
              )}
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Calls today</TableHead>
                    <TableHead>Conversion</TableHead>
                    <TableHead>Avg duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => {
                    const m = agentMetrics(a.id);
                    return (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer"
                        onClick={() => setActiveId(a.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.has(a.id)}
                            onCheckedChange={(v) => {
                              const s = new Set(selected);
                              v ? s.add(a.id) : s.delete(a.id);
                              setSelected(s);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{a.fullName}</TableCell>
                        <TableCell>{a.email}</TableCell>
                        <TableCell>
                          <StatusBadge status={a.status} />
                        </TableCell>
                        <TableCell>{m.leadsAssigned}</TableCell>
                        <TableCell>{m.callsToday}</TableCell>
                        <TableCell>{m.conversion}%</TableCell>
                        <TableCell>{fmtDuration(m.avgDuration)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {active && <AgentDetails agent={active} onClose={() => setActiveId(null)} />}

      <BulkAssignLeadsModal
        open={bulkLeadsOpen}
        onOpenChange={setBulkLeadsOpen}
        agentIds={Array.from(selected)}
        viewerId={user.id}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    inactive: "bg-muted text-muted-foreground",
    on_break: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${map[status] || ""}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function AgentCard({
  agent,
  selected,
  onSelect,
  onOpen,
}: {
  agent: AppUser;
  selected: boolean;
  onSelect: (v: boolean) => void;
  onOpen: () => void;
}) {
  const m = agentMetrics(agent.id);
  const t = tier(m.conversion);
  const colors = { high: "bg-emerald-500", medium: "bg-amber-500", low: "bg-rose-500" };
  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox checked={selected} onCheckedChange={(v) => onSelect(!!v)} />
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white ${colors[t]}`}
          >
            {agent.fullName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <button onClick={onOpen} className="block text-left">
              <div className="truncate font-semibold hover:underline">{agent.fullName}</div>
              <div className="truncate text-xs text-muted-foreground">{agent.email}</div>
              <div className="truncate text-xs text-muted-foreground">{agent.phone}</div>
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <StatusBadge status={agent.status} />
          <Badge variant="outline">Agent</Badge>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-muted p-2">
            <div className="font-semibold">{m.callsToday}</div>
            <div className="text-muted-foreground">calls today</div>
          </div>
          <div className="rounded-md bg-muted p-2">
            <div className="font-semibold">{m.conversion}%</div>
            <div className="text-muted-foreground">conv.</div>
          </div>
          <div className="rounded-md bg-muted p-2">
            <div className="font-semibold">{m.leadsAssigned}</div>
            <div className="text-muted-foreground">leads</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={onOpen}>
            Details
          </Button>
          <Button size="sm" variant="outline" onClick={onOpen}>
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Phone className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentDetails({ agent, onClose }: { agent: AppUser; onClose: () => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("leads");
  const [assignLeadsOpen, setAssignLeadsOpen] = useState(false);
  const [assignCallsOpen, setAssignCallsOpen] = useState(false);
  const m = agentMetrics(agent.id);
  const leads = store.listLeads().filter((l) => l.assignedTo === agent.id);
  const calls = store.listCalls().filter((c) => c.agentId === agent.id);
  const tasks = store.listTasks().filter((t) => t.assignedTo === agent.id);
  const activity = store.listActivity().filter((a) => a.userId === agent.id);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{agent.fullName}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {agent.email} • {agent.phone} • Joined{" "}
            {agent.createdAt ? format(agent.createdAt, "MMM d, yyyy") : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={agent.status}
            onValueChange={(v) => {
              store.upsertUser({ ...agent, status: v as any });
              toast.success("Status updated");
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_break">On break</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline">
            Reset password
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="leads">Assigned Leads</TabsTrigger>
            <TabsTrigger value="calls">Call History</TabsTrigger>
            <TabsTrigger value="perf">Performance</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-3 pt-4">
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setAssignLeadsOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign new lead
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last contacted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      {l.firstName} {l.lastName}
                    </TableCell>
                    <TableCell>{l.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{l.status}</Badge>
                    </TableCell>
                    <TableCell>{format(l.createdAt, "MMM d")}</TableCell>
                    <TableCell>
                      {l.lastContactedAt ? format(l.lastContactedAt, "MMM d") : "—"}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        <PhoneCall className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          store.upsertLead({ ...l, assignedTo: null });
                          toast.success("Unassigned");
                        }}
                      >
                        Unassign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {leads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No leads assigned.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="calls" className="space-y-3 pt-4">
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setAssignCallsOpen(true)}>
                <PhoneCall className="mr-2 h-4 w-4" />
                Assign call task
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recording</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.slice(0, 50).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{format(c.startTime, "MMM d, p")}</TableCell>
                    <TableCell>{c.leadName}</TableCell>
                    <TableCell>{c.leadPhone}</TableCell>
                    <TableCell>{fmtDuration(c.duration)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <audio controls className="h-8" src="" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="perf" className="pt-4">
            <PerfTab agentId={agent.id} />
          </TabsContent>

          <TabsContent value="tasks" className="pt-4">
            <div className="space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{t.leadName}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(t.scheduledTime, "MMM d, p")} • {t.priority}
                    </div>
                  </div>
                  <Badge>{t.status}</Badge>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-sm text-muted-foreground">No tasks.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="pt-4">
            <div className="space-y-2">
              {activity.slice(0, 50).map((a) => (
                <div key={a.id} className="flex justify-between border-b py-2 text-sm">
                  <div>
                    <div className="font-medium">{a.action}</div>
                    {a.details && (
                      <div className="text-xs text-muted-foreground">{a.details}</div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(a.timestamp, "MMM d, p")}
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <AssignLeadsModal
        open={assignLeadsOpen}
        onOpenChange={setAssignLeadsOpen}
        agentId={agent.id}
        viewerId={user?.id || ""}
      />
      <AssignCallsModal
        open={assignCallsOpen}
        onOpenChange={setAssignCallsOpen}
        agentId={agent.id}
        viewerId={user?.id || ""}
      />
    </Card>
  );
}

function PerfTab({ agentId }: { agentId: string }) {
  const m = agentMetrics(agentId);
  const calls = store.listCalls().filter((c) => c.agentId === agentId);
  const last30 = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => {
        const d = subDays(new Date(), 29 - i);
        const s = startOfDay(d).getTime();
        const e = s + 86400000;
        return {
          day: format(d, "MM/dd"),
          calls: calls.filter((c) => c.startTime >= s && c.startTime < e).length,
        };
      }),
    [calls],
  );
  const outcomes = ["answered", "voicemail", "no_answer", "busy"].map((s) => ({
    name: s,
    value: calls.filter((c) => c.status === s).length,
  }));
  const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1"];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Leads (30d)" value={m.leadsAssigned} />
        <Kpi label="Calls (30d)" value={m.calls30d} />
        <Kpi label="Conversion" value={`${m.conversion}%`} />
        <Kpi label="Avg duration" value={fmtDuration(m.avgDuration)} />
        <Kpi label="Answer rate" value={`${m.answerRate}%`} />
        <Kpi label="Won/Lost" value={`${m.won}/${m.lost}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily calls (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last30}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Call outcomes</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={outcomes} dataKey="value" nameKey="name" outerRadius={80} label>
                  {outcomes.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function AssignLeadsModal({
  open,
  onOpenChange,
  agentId,
  viewerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId: string;
  viewerId: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const unassigned = store
    .listLeads()
    .filter((l) => !l.assignedTo && l.status === "new")
    .filter(
      (l) =>
        !q ||
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(q.toLowerCase()) ||
        l.phone.includes(q),
    );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Assign leads</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Input
              placeholder="Search unassigned leads"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="mt-2 h-[300px] overflow-auto rounded-md border">
              {unassigned.map((l) => (
                <label
                  key={l.id}
                  className="flex cursor-pointer items-center gap-2 border-b p-2 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={selected.has(l.id)}
                    onCheckedChange={(v) => {
                      const s = new Set(selected);
                      v ? s.add(l.id) : s.delete(l.id);
                      setSelected(s);
                    }}
                  />
                  <div>
                    <div className="font-medium">
                      {l.firstName} {l.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{l.phone}</div>
                  </div>
                </label>
              ))}
              {unassigned.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No unassigned leads.</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Selected ({selected.size})</p>
            <div className="mt-2 h-[300px] overflow-auto rounded-md border p-2">
              {Array.from(selected).map((id) => {
                const l = store.listLeads().find((x) => x.id === id);
                if (!l) return null;
                return (
                  <div key={id} className="flex justify-between border-b py-1 text-sm">
                    <span>
                      {l.firstName} {l.lastName}
                    </span>
                    <button
                      onClick={() => {
                        const s = new Set(selected);
                        s.delete(id);
                        setSelected(s);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selected.size === 0}
            onClick={() => {
              store.assignLeads(Array.from(selected), agentId, viewerId);
              toast.success(`${selected.size} lead(s) assigned`);
              setSelected(new Set());
              onOpenChange(false);
            }}
          >
            Assign {selected.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkAssignLeadsModal({
  open,
  onOpenChange,
  agentIds,
  viewerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentIds: string[];
  viewerId: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const unassigned = store.listLeads().filter((l) => !l.assignedTo);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk assign leads</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Distribute selected leads round-robin across {agentIds.length} agent(s).
        </p>
        <div className="h-[300px] overflow-auto rounded-md border">
          {unassigned.map((l) => (
            <label
              key={l.id}
              className="flex cursor-pointer items-center gap-2 border-b p-2 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={selected.has(l.id)}
                onCheckedChange={(v) => {
                  const s = new Set(selected);
                  v ? s.add(l.id) : s.delete(l.id);
                  setSelected(s);
                }}
              />
              <span>
                {l.firstName} {l.lastName} — {l.phone}
              </span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selected.size === 0 || agentIds.length === 0}
            onClick={() => {
              const ids = Array.from(selected);
              ids.forEach((id, i) => {
                store.assignLeads([id], agentIds[i % agentIds.length], viewerId);
              });
              toast.success(`Distributed ${ids.length} leads to ${agentIds.length} agents`);
              setSelected(new Set());
              onOpenChange(false);
            }}
          >
            Distribute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignCallsModal({
  open,
  onOpenChange,
  agentId,
  viewerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId: string;
  viewerId: string;
}) {
  const [leadId, setLeadId] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [when, setWhen] = useState<string>(format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"));
  const [notes, setNotes] = useState("");
  const leads = store
    .listLeads()
    .filter((l) => l.assignedTo === agentId || !l.assignedTo);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule callback task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Lead</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.slice(0, 50).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.firstName} {l.lastName} — {l.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scheduled time</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!leadId}
            onClick={() => {
              const lead = store.listLeads().find((l) => l.id === leadId);
              if (!lead) return;
              const task: CallTask = {
                id: newId("t"),
                leadId,
                leadName: `${lead.firstName} ${lead.lastName}`,
                leadPhone: lead.phone,
                assignedTo: agentId,
                assignedBy: viewerId,
                priority,
                scheduledTime: new Date(when).getTime(),
                notes,
                status: "pending",
              };
              store.upsertTask(task);
              toast.success("Task scheduled");
              onOpenChange(false);
            }}
          >
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
