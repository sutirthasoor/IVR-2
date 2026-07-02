import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { visibleAgents, visibleCalls, visibleLeads, agentMetrics, fmtDuration } from "@/lib/perf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Download, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = useAuth();
  const [type, setType] = useState("agent");
  const [agents, setAgents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentMetricsMap, setAgentMetricsMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [agentsData, leadsData, callsData] = await Promise.all([
          visibleAgents(user),
          visibleLeads(user),
          visibleCalls(user)
        ]);
        
        setAgents(agentsData);
        setLeads(leadsData);
        setCalls(callsData);
        
        // Load metrics for all agents
        const metricsMap = new Map();
        for (const agent of agentsData) {
          const metrics = await agentMetrics(agent.id);
          metricsMap.set(agent.id, metrics);
        }
        setAgentMetricsMap(metricsMap);
      } catch (error) {
        console.error('Error loading reports data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  const reports: Record<string, { title: string; rows: any[]; cols: string[] }> = {
    agent: {
      title: "Agent Performance",
      cols: ["Agent", "Leads", "Calls (30d)", "Conversion", "Avg duration", "Answer rate"],
      rows: agents.map((a) => {
        const m = agentMetricsMap.get(a.id) || { leadsAssigned: 0, calls30d: 0, conversion: 0, avgDuration: 0, answerRate: 0 };
        return [a.fullName, m.leadsAssigned, m.calls30d, `${m.conversion}%`, fmtDuration(m.avgDuration), `${m.answerRate}%`];
      }),
    },
    conversion: {
      title: "Lead Conversion",
      cols: ["Status", "Count", "Share"],
      rows: ["new", "contacted", "proposal", "won", "lost"].map((s) => {
        const n = leads.filter((l) => l.status === s).length;
        return [s, n, leads.length ? `${Math.round((n / leads.length) * 100)}%` : "0%"];
      }),
    },
    volume: {
      title: "Call Volume",
      cols: ["Status", "Count"],
      rows: ["answered", "voicemail", "no_answer", "busy"].map((s) => [
        s,
        calls.filter((c) => c.status === s).length,
      ]),
    },
    activity: {
      title: "Daily Activity",
      cols: ["Agent", "Calls today", "Status"],
      rows: agents.map((a) => {
        const m = agentMetricsMap.get(a.id) || { callsToday: 0 };
        return [a.fullName, m.callsToday, a.status];
      }),
    },
  };

  const r = reports[type];

  const exportCsv = () => {
    const csv = [r.cols.join(","), ...r.rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${r.title}</title>
      <style>body{font-family:sans-serif;padding:40px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}</style>
      </head><body><h1>${r.title}</h1><table><thead><tr>${r.cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${r.rows.map((row) => `<tr>${row.map((v: any) => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate performance and activity reports.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent Performance</SelectItem>
                <SelectItem value="conversion">Lead Conversion</SelectItem>
                <SelectItem value="volume">Call Volume</SelectItem>
                <SelectItem value="activity">Daily Activity</SelectItem>
              </SelectContent>
            </Select>
            <CardTitle className="text-base">{r.title}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportPdf}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success("Report emailed")}>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {r.cols.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((v: any, j: number) => (
                    <TableCell key={j}>{String(v)}</TableCell>
                  ))}
                </TableRow>
              ))}
              {r.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={r.cols.length} className="text-center text-muted-foreground">
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}