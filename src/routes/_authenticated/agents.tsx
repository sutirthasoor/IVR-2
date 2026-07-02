import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
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
interface NewAgentData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}
export const Route = createFileRoute("/_authenticated/agents")({
  component: AgentsPage,
});
function AddAgentModal({ open, onOpenChange, onAgentAdded }: { 
  open: boolean; 
  onOpenChange: (v: boolean) => void;
  onAgentAdded: () => void;
}) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName || !email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Import Firebase auth
      const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');
      const { app } = await import('@/lib/firebase');
      const auth = getAuth(app);
      
      // Create user in Firebase Authentication
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create agent in Firestore
      const newAgent: AppUser = {
        id: userCred.user.uid,
        fullName,
        email,
        phone,
        role: 'agent',
        status: 'active',
        createdBy: user?.id || '',
        createdAt: Date.now(),
        managerId: user?.role === 'manager' ? user.id : null,
        adminId: user?.role === 'admin' ? user.id : null,
      };
      
      await store.upsertUser(newAgent);
      toast.success(`Agent "${fullName}" created successfully!`);
      onAgentAdded();
      onOpenChange(false);
      
      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
    } catch (error: any) {
      console.error('Error creating agent:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already in use. Please use a different email.');
      } else {
        toast.error(error?.message || 'Failed to create agent');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name *</Label>
            <Input 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div>
            <Label>Email *</Label>
            <Input 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@example.com"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
            />
          </div>
          <div>
            <Label>Password *</Label>
            <Input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a secure password"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Agent will use this password to login
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function AgentsPage() {
  useStoreVersion();
  const { user } = useAuth();
  
  const [agents, setAgents] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [perfFilter, setPerfFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [bulkLeadsOpen, setBulkLeadsOpen] = useState(false);
  const [agentMetricsMap, setAgentMetricsMap] = useState<Map<string, any>>(new Map());
const [addAgentOpen, setAddAgentOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const agentsList = await visibleAgents(user);
        setAgents(agentsList);
        
        const metricsMap = new Map();
        for (const agent of agentsList) {
          const metrics = await agentMetrics(agent.id);
          metricsMap.set(agent.id, metrics);
        }
        setAgentMetricsMap(metricsMap);
      } catch (error) {
        console.error('Error loading agents:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  const filtered = useMemo(() => {
    let arr = agents;
    return arr.filter((a) => {
      const m = agentMetricsMap.get(a.id) || { conversion: 0 };
      const q = search.toLowerCase();
      const matchSearch =
        !q || a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      const t = tier(m.conversion);
      const matchPerf = perfFilter === "all" || perfFilter === t;
      return matchSearch && matchStatus && matchPerf;
    }).sort((a, b) => {
      const ma = agentMetricsMap.get(a.id) || { leadsAssigned: 0, conversion: 0, calls30d: 0 };
      const mb = agentMetricsMap.get(b.id) || { leadsAssigned: 0, conversion: 0, calls30d: 0 };
      if (sort === "name") return a.fullName.localeCompare(b.fullName);
      if (sort === "leads") return mb.leadsAssigned - ma.leadsAssigned;
      if (sort === "conversion") return mb.conversion - ma.conversion;
      if (sort === "calls") return mb.calls30d - ma.calls30d;
      return 0;
    });
  }, [agents, agentMetricsMap, search, statusFilter, perfFilter, sort]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading agents...</p>
      </div>
    );
  }

  const totalActive = agents.filter((a) => a.status === "active").length;
  const avgConv = agents.length === 0
    ? 0
    : Math.round(
        agents.reduce((s, a) => s + (agentMetricsMap.get(a.id)?.conversion || 0), 0) / agents.length,
      );
  const totalCallsToday = agents.reduce((s, a) => s + (agentMetricsMap.get(a.id)?.callsToday || 0), 0);
  const totalLeadsAssigned = agents.reduce((s, a) => s + (agentMetricsMap.get(a.id)?.leadsAssigned || 0), 0);

  const exportCsv = (rows: AppUser[]) => {
    const header = "Name,Email,Phone,Status,Leads,Calls Today,Conversion %\n";
    const body = rows
      .map((a) => {
        const m = agentMetricsMap.get(a.id) || { leadsAssigned: 0, callsToday: 0, conversion: 0 };
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
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCsv(agents)}>
            <Download className="mr-2 h-4 w-4" />
            Export all
          </Button>
          <Button size="sm" onClick={() => setAddAgentOpen(true)}>
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
                  onClick={() => exportCsv(agents.filter((a) => selected.has(a.id)))}
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
                  metrics={agentMetricsMap.get(a.id)}
                  selected={selected.has(a.id)}
                  onSelect={(v: boolean) => {
                    const s = new Set(selected);
                    v ? s.add(a.id) : s.delete(a.id);
                    setSelected(s);
                  }}
                  onOpen={() => setActiveId(a.id)}
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-8">
                  No agents found.
                </p>
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
                    const m = agentMetricsMap.get(a.id) || { leadsAssigned: 0, callsToday: 0, conversion: 0, avgDuration: 0 };
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
                          <Button size="sm" variant="ghost" onClick={() => setActiveId(a.id)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No agents found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {activeId && (
        <AgentDetails 
          agent={agents.find(a => a.id === activeId)!} 
          onClose={() => setActiveId(null)} 
        />
      )}

      <BulkAssignLeadsModal
        open={bulkLeadsOpen}
        onOpenChange={setBulkLeadsOpen}
        agentIds={Array.from(selected)}
        viewerId={user.id}
      />
<AddAgentModal 
  open={addAgentOpen}
  onOpenChange={setAddAgentOpen}
  onAgentAdded={() => {
    // Refresh agents list
    const loadData = async () => {
      if (!user) return;
      const agentsList = await visibleAgents(user);
      setAgents(agentsList);
      
      const metricsMap = new Map();
      for (const agent of agentsList) {
        const metrics = await agentMetrics(agent.id);
        metricsMap.set(agent.id, metrics);
      }
      setAgentMetricsMap(metricsMap);
    };
    loadData();
  }}
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

function AgentCard({ agent, metrics, selected, onSelect, onOpen }: any) {
  const m = metrics || { conversion: 0 };
  const t = tier(m.conversion);
  const colors = { high: "bg-emerald-500", medium: "bg-amber-500", low: "bg-rose-500" };
  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox checked={selected} onCheckedChange={(v) => onSelect(!!v)} />
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
            <div className="font-semibold">{m.callsToday || 0}</div>
            <div className="text-muted-foreground">calls today</div>
          </div>
          <div className="rounded-md bg-muted p-2">
            <div className="font-semibold">{m.conversion || 0}%</div>
            <div className="text-muted-foreground">conv.</div>
          </div>
          <div className="rounded-md bg-muted p-2">
            <div className="font-semibold">{m.leadsAssigned || 0}</div>
            <div className="text-muted-foreground">leads</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={onOpen}>Details</Button>
          <Button size="sm" variant="outline" onClick={onOpen}><UserPlus className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline"><Phone className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline"><MessageSquare className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentDetails({ agent, onClose }: { agent: AppUser; onClose: () => void }) {
  const [tab, setTab] = useState("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    const loadAgentData = async () => {
      const allLeads = await store.listLeads();
      const allCalls = await store.listCalls();
      const allTasks = await store.listTasks();
      const allActivity = await store.listActivity();
      
      setLeads(allLeads.filter((l) => l.assignedTo === agent.id));
      setCalls(allCalls.filter((c) => c.agentId === agent.id));
      setTasks(allTasks.filter((t) => t.assignedTo === agent.id));
      setActivity(allActivity.filter((a) => a.userId === agent.id));
    };
    loadAgentData();
  }, [agent.id]);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agent.fullName} - Agent Details</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
            <TabsTrigger value="calls">Calls ({calls.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="leads" className="space-y-3 pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.firstName} {l.lastName}</TableCell>
                    <TableCell>{l.phone}</TableCell>
                    <TableCell><Badge>{l.status}</Badge></TableCell>
                    <TableCell>{format(l.createdAt, "MMM d, yyyy")}</TableCell>
                  </TableRow>
                ))}
                {leads.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center">No leads assigned</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="calls" className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{format(c.startTime, "MMM d, p")}</TableCell>
                    <TableCell>{c.leadName}</TableCell>
                    <TableCell>{fmtDuration(c.duration)}</TableCell>
                    <TableCell><Badge>{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="tasks" className="pt-4">
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="flex justify-between border-b py-2">
                  <div>{t.leadName}</div>
                  <div>{format(t.scheduledTime, "MMM d, p")}</div>
                  <Badge>{t.status}</Badge>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="activity" className="pt-4">
            <div className="space-y-2">
              {activity.map((a) => (
                <div key={a.id} className="flex justify-between border-b py-2 text-sm">
                  <div>{a.action}</div>
                  <div>{format(a.timestamp, "MMM d, p")}</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkAssignLeadsModal({ open, onOpenChange, agentIds, viewerId }: any) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unassigned, setUnassigned] = useState<Lead[]>([]);

  useEffect(() => {
    const loadUnassigned = async () => {
      const allLeads = await store.listLeads();
      setUnassigned(allLeads.filter((l) => !l.assignedTo));
    };
    if (open) loadUnassigned();
  }, [open]);

  const handleAssign = async () => {
    const leadArray = Array.from(selected);
    leadArray.forEach((id, i) => {
      store.assignLeads([id], agentIds[i % agentIds.length], viewerId);
    });
    toast.success(`Assigned ${leadArray.length} leads to ${agentIds.length} agents`);
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Assign Leads</DialogTitle>
        </DialogHeader>
        <div className="h-[300px] overflow-auto rounded-md border">
          {unassigned.map((l) => (
            <label key={l.id} className="flex items-center gap-2 border-b p-2 hover:bg-muted">
              <Checkbox
                checked={selected.has(l.id)}
                onCheckedChange={(v) => {
                  const s = new Set(selected);
                  v ? s.add(l.id) : s.delete(l.id);
                  setSelected(s);
                }}
              />
              <span>{l.firstName} {l.lastName} - {l.phone}</span>
            </label>
          ))}
          {unassigned.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">No unassigned leads</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.size === 0 || agentIds.length === 0}>
            Assign {selected.size} leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}