import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useStoreVersion } from "@/lib/mock-store";
import { visibleAgents, visibleCalls, fmtDuration } from "@/lib/perf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calls")({
  component: CallsPage,
});

function CallsPage() {
  useStoreVersion();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [agentF, setAgentF] = useState("all");
  if (!user) return null;
  const calls = visibleCalls(user);
  const agents = visibleAgents(user);

  const filtered = useMemo(
    () =>
      calls.filter((c) => {
        const m =
          !q ||
          c.agentName.toLowerCase().includes(q.toLowerCase()) ||
          (c.leadName || "").toLowerCase().includes(q.toLowerCase()) ||
          c.leadPhone.includes(q);
        const ms = statusF === "all" || c.status === statusF;
        const ma = agentF === "all" || c.agentId === agentF;
        return m && ms && ma;
      }),
    [calls, q, statusF, agentF],
  );

  const totalDur = filtered.reduce((s, c) => s + c.duration, 0);
  const avgDur = filtered.length ? Math.round(totalDur / filtered.length) : 0;
  const answered = filtered.filter((c) => c.status === "answered").length;
  const answerRate = filtered.length ? Math.round((answered / filtered.length) * 100) : 0;
  const byAgent = agents
    .map((a) => ({ a, n: filtered.filter((c) => c.agentId === a.id).length }))
    .sort((x, y) => y.n - x.n)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Call Logs</h1>
        <p className="text-sm text-muted-foreground">
          Listen back, review transcripts and audit team activity.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Search agent, lead, phone"
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
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="no_answer">No answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
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
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recording</TableHead>
                  <TableHead>Transcript</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{format(c.startTime, "MMM d, p")}</TableCell>
                    <TableCell>{c.agentName}</TableCell>
                    <TableCell>{c.leadName}</TableCell>
                    <TableCell>{c.leadPhone}</TableCell>
                    <TableCell>{fmtDuration(c.duration)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <audio controls className="h-8" src="" />
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                      {c.transcript || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Total calls" value={filtered.length} />
            <Row label="Avg duration" value={fmtDuration(avgDur)} />
            <Row label="Answer rate" value={`${answerRate}%`} />
            <Row label="Most active" value={byAgent?.a.fullName || "—"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
