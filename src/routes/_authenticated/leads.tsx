import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { store, useStoreVersion, newId } from "@/lib/mock-store";
import { visibleAgents, visibleLeads } from "@/lib/perf";
import type { Lead, LeadStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Download, Phone } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leads")({
  component: LeadsPage,
});

function LeadsPage() {
  useStoreVersion();
  const { user } = useAuth();
  
  // ALL STATE HOOKS FIRST
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [agentF, setAgentF] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAgent, setBulkAgent] = useState("");
  const [preview, setPreview] = useState<any[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ALL EFFECTS SECOND
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [leadsData, agentsData] = await Promise.all([
          visibleLeads(user),
          visibleAgents(user)
        ]);
        setLeads(leadsData);
        setAgents(agentsData);
      } catch (error) {
        console.error('Error loading leads data:', error);
        toast.error('Failed to load leads');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  // ALL MEMO HOOKS THIRD
  const filtered = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    return leads.filter((l) => {
      const m = !q ||
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(q.toLowerCase()) ||
        l.phone.includes(q) ||
        (l.email || "").toLowerCase().includes(q.toLowerCase());
      const ms = statusF === "all" || l.status === statusF;
      const ma = agentF === "all" || l.assignedTo === agentF;
      return m && ms && ma;
    });
  }, [leads, q, statusF, agentF]);

  // CONDITIONAL RETURNS AFTER ALL HOOKS
  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading leads...</p>
      </div>
    );
  }

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const rows = text.split(/\r?\n/).filter(Boolean);
      const [head, ...rest] = rows;
      const cols = head.split(",").map((s) => s.trim().toLowerCase());
      const idx = (n: string) => cols.indexOf(n);
      const parsed = rest.map((r) => {
        const c = r.split(",");
        return {
          firstName: c[idx("first name")] || c[0] || "",
          lastName: c[idx("last name")] || c[1] || "",
          phone: c[idx("phone")] || c[2] || "",
          email: c[idx("email")] || c[3] || "",
          company: c[idx("company")] || c[4] || "",
          notes: c[idx("notes")] || c[5] || "",
        };
      });
      setPreview(parsed);
    };
    reader.readAsText(file);
  };

  const importPreview = () => {
    if (!preview) return;
    const newLeads: Lead[] = preview.map((p) => ({
      id: newId("l"),
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      email: p.email,
      company: p.company,
      notes: p.notes,
      status: "new" as LeadStatus,
      assignedTo: null,
      createdBy: user.id,
      createdAt: Date.now(),
    }));
    store.upsertLeads(newLeads);
    toast.success(`Imported ${newLeads.length} leads`);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    // Refresh leads
    visibleLeads(user).then(setLeads);
  };

  const exportCsv = () => {
    const header = "Name,Phone,Email,Status,Assigned,Created\n";
    const body = filtered
      .map(
        (l) =>
          `${l.firstName} ${l.lastName},${l.phone},${l.email || ""},${l.status},${
            l.assignedTo || ""
          },${format(l.createdAt, "yyyy-MM-dd")}`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Import, assign and track leads through the pipeline.
        </p>
      </div>

      {(user.role === "super_admin" || user.role === "admin" || user.role === "manager") && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Bulk import (CSV)</h2>
                <p className="text-xs text-muted-foreground">
                  Columns: First Name, Last Name, Phone, Email, Company, Notes
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob(
                    ["First Name,Last Name,Phone,Email,Company,Notes\nJane,Doe,+15551234567,jane@x.com,Acme,Initial outreach"],
                    { type: "text/csv" },
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "leads-template.csv";
                  a.click();
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/50">
              <Upload className="mb-2 h-6 w-6" />
              <span>Drop CSV here or click to upload</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
            {preview && (
              <div className="space-y-2">
                <p className="text-sm">Preview ({preview.length} rows):</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 5).map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {p.firstName} {p.lastName}
                        </TableCell>
                        <TableCell>{p.phone}</TableCell>
                        <TableCell>{p.email}</TableCell>
                        <TableCell>{p.company}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex gap-2">
                  <Button onClick={importPreview}>Import {preview.length} leads</Button>
                  <Button variant="outline" onClick={() => setPreview(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search name, phone, email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agentF} onValueChange={setAgentF}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm">
              <span>{selected.size} selected</span>
              <Select value={bulkAgent} onValueChange={setBulkAgent}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Assign to agent…" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!bulkAgent}
                onClick={() => {
                  store.assignLeads(Array.from(selected), bulkAgent, user.id);
                  toast.success("Assigned");
                  setSelected(new Set());
                  setBulkAgent("");
                  // Refresh leads
                  visibleLeads(user).then(setLeads);
                }}
              >
                Confirm
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map((l) => {
                const agent = agents.find((a) => a.id === l.assignedTo);
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(l.id)}
                        onCheckedChange={(v) => {
                          const s = new Set(selected);
                          v ? s.add(l.id) : s.delete(l.id);
                          setSelected(s);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {l.firstName} {l.lastName}
                    </TableCell>
                    <TableCell>{l.phone}</TableCell>
                    <TableCell>{l.email}</TableCell>
                    <TableCell>
                      <Select
                        value={l.status}
                        onValueChange={async (v) => {
                          await store.upsertLead({ ...l, status: v as LeadStatus });
                          // Refresh leads
                          const newLeads = await visibleLeads(user);
                          setLeads(newLeads);
                        }}
                      >
                        <SelectTrigger className="h-7 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="proposal">Proposal</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{agent?.fullName || <Badge variant="outline">Unassigned</Badge>}</TableCell>
                    <TableCell>{format(l.createdAt, "MMM d")}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}