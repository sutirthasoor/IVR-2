import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
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
import { Download, Play, Square, Loader2, AlertCircle, Phone, PhoneOff, Clock } from "lucide-react";
import type { CallRecord, AppUser } from "@/lib/types";

// Firebase config (same as Agent web)
const firebaseConfig = {
  apiKey: "AIzaSyDqDnTWFf0xluB_U41GXxCYfKsGK5QX9Ag",
  authDomain: "luxe-b95d0.firebaseapp.com",
  projectId: "luxe-b95d0",
  storageBucket: "luxe-b95d0.firebasestorage.app",
  messagingSenderId: "217781331790",
  appId: "1:217781331790:web:881aee2b3ace08f297201f",
  measurementId: "G-BJGZTH01TH",
};

export const Route = createFileRoute("/_authenticated/calls")({
  component: CallsPage,
});

function CallsPage() {
  useStoreVersion();
  const { user } = useAuth();
  
  // State
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [agents, setAgents] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [agentF, setAgentF] = useState("all");
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [recordingUrls, setRecordingUrls] = useState<Record<string, string>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [loadingRecordings, setLoadingRecordings] = useState<Record<string, boolean>>({});
  const [loadingTranscripts, setLoadingTranscripts] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load calls data from Firebase using the same pattern as Agent web
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get the user ID - handle both 'uid' and 'id' properties
        const userId = user.uid || user.id;
        
        if (!userId) {
          throw new Error('User ID not found');
        }

        // Use the visibleCalls and visibleAgents functions from perf.ts
        // These handle the Firebase queries with the same logic as Agent web
        const [callsData, agentsData] = await Promise.all([
          visibleCalls(user),
          visibleAgents(user)
        ]);

        // Sort calls by start time descending (newest first)
        const sortedCalls = [...callsData].sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        
        setCalls(sortedCalls);
        setAgents(agentsData);
      } catch (error) {
        console.error('Error loading calls data:', error);
        setError('Failed to load calls. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Get recording URL from Twilio
  const getRecordingUrl = async (recordingSid: string): Promise<string | null> => {
    try {
      // Use the same token endpoint as Agent web
      const response = await fetch(`/token?identity=admin&t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to get token');
      const tokenData = await response.json();
      
      // Fetch recording using Twilio API
      const recordingResponse = await fetch(`/api/recordings/${recordingSid}`, {
        headers: {
          'Authorization': `Bearer ${tokenData.token}`
        }
      });
      
      if (!recordingResponse.ok) throw new Error('Failed to fetch recording');
      const data = await recordingResponse.json();
      return data.url || null;
    } catch (error) {
      console.error('Error fetching recording:', error);
      return null;
    }
  };

  // Load recording for a specific call
  const loadRecording = async (callId: string, recordingSid: string) => {
    if (recordingUrls[callId]) return; // Already loaded
    
    setLoadingRecordings(prev => ({ ...prev, [callId]: true }));
    try {
      const url = await getRecordingUrl(recordingSid);
      if (url) {
        setRecordingUrls(prev => ({ ...prev, [callId]: url }));
      }
    } catch (error) {
      console.error('Error loading recording:', error);
    } finally {
      setLoadingRecordings(prev => ({ ...prev, [callId]: false }));
    }
  };

  // Load transcript for a call (from Firebase)
  const loadTranscript = async (callId: string) => {
    if (transcripts[callId]) return; // Already loaded
    
    setLoadingTranscripts(prev => ({ ...prev, [callId]: true }));
    try {
      // Find the call and get its transcript from the data
      const call = calls.find(c => c.id === callId);
      if (call && call.transcript) {
        setTranscripts(prev => ({ ...prev, [callId]: call.transcript! }));
      } else {
        // If not in the call data, try to fetch from Firebase directly
        // Using the same Firestore path as Agent web
        const db = firebase.firestore();
        const doc = await db.collection('calls').doc(callId).get();
        if (doc.exists) {
          const data = doc.data();
          if (data?.transcript) {
            setTranscripts(prev => ({ ...prev, [callId]: data.transcript }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading transcript:', error);
    } finally {
      setLoadingTranscripts(prev => ({ ...prev, [callId]: false }));
    }
  };

  // Play/pause audio
  const togglePlay = (callId: string, recordingUrl: string) => {
    if (playingCallId === callId) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingCallId(null);
    } else {
      // Play
      if (audioRef.current) {
        audioRef.current.src = recordingUrl;
        audioRef.current.play();
        setPlayingCallId(callId);
      }
    }
  };

  // Handle audio end
  const handleAudioEnd = () => {
    setPlayingCallId(null);
  };

  // Filter calls
  const filtered = useMemo(() => {
    if (!Array.isArray(calls)) return [];
    return calls.filter((c) => {
      const matchSearch = !q ||
        c.agentName?.toLowerCase().includes(q.toLowerCase()) ||
        (c.leadName || "").toLowerCase().includes(q.toLowerCase()) ||
        c.leadPhone.includes(q);
      const matchStatus = statusF === "all" || c.status === statusF;
      const matchAgent = agentF === "all" || c.agentId === agentF;
      
      // Date range filtering
      let matchDate = true;
      if (dateRange.from) {
        const callDate = new Date(c.startTime);
        matchDate = callDate >= dateRange.from;
      }
      if (dateRange.to && matchDate) {
        const callDate = new Date(c.startTime);
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        matchDate = callDate <= endDate;
      }
      
      return matchSearch && matchStatus && matchAgent && matchDate;
    });
  }, [calls, q, statusF, agentF, dateRange]);

  // Conditional returns after all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please sign in to view calls</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Stats
  const totalDur = filtered.reduce((s, c) => s + c.duration, 0);
  const avgDur = filtered.length ? Math.round(totalDur / filtered.length) : 0;
  const answered = filtered.filter((c) => c.status === "answered").length;
  const answerRate = filtered.length ? Math.round((answered / filtered.length) * 100) : 0;
  const byAgent = agents
    .map((a) => ({ a, n: filtered.filter((c) => c.agentId === a.id).length }))
    .sort((x, y) => y.n - x.n)[0];
  const withRecordings = filtered.filter(c => c.recordingSid).length;
  const withTranscripts = filtered.filter(c => c.transcript).length;

  // Export CSV
  const exportCsv = () => {
    const header = "Date,Agent,Lead,Phone,Duration,Status,HasRecording,HasTranscript,CallSID\n";
    const body = filtered
      .map((c) => {
        const hasRecording = c.recordingSid ? 'Yes' : 'No';
        const hasTranscript = c.transcript ? 'Yes' : 'No';
        return `${format(c.startTime, "yyyy-MM-dd HH:mm")},${c.agentName},${c.leadName || ''},${c.leadPhone},${fmtDuration(c.duration)},${c.status},${hasRecording},${hasTranscript},${c.id || ''}`;
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calls_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered': return 'border-green-500 text-green-600 bg-green-50';
      case 'voicemail': return 'border-yellow-500 text-yellow-600 bg-yellow-50';
      case 'no_answer': return 'border-gray-400 text-gray-500 bg-gray-50';
      case 'busy': return 'border-red-500 text-red-600 bg-red-50';
      case 'failed': return 'border-red-600 text-red-700 bg-red-50';
      default: return 'border-gray-400 text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <audio ref={audioRef} onEnded={handleAudioEnd} className="hidden" />
      
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
                  <SelectItem value="failed">Failed</SelectItem>
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
            
            <div className="rounded-md border">
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
                      <TableCell className="whitespace-nowrap">
                        {format(c.startTime, "MMM d, p")}
                      </TableCell>
                      <TableCell>{c.agentName}</TableCell>
                      <TableCell>{c.leadName || '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{c.leadPhone}</TableCell>
                      <TableCell className="font-mono text-sm">{fmtDuration(c.duration)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={getStatusColor(c.status)}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.recordingSid ? (
                          <div className="flex items-center gap-2">
                            {loadingRecordings[c.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : recordingUrls[c.id] ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePlay(c.id, recordingUrls[c.id])}
                                className="h-8 w-8 p-0"
                              >
                                {playingCallId === c.id ? (
                                  <Square className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => loadRecording(c.id, c.recordingSid!)}
                                className="h-8 px-2 text-xs"
                              >
                                Load
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.transcript ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadTranscript(c.id)}
                            className="h-8 px-2 text-xs"
                            disabled={loadingTranscripts[c.id]}
                          >
                            {loadingTranscripts[c.id] ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : transcripts[c.id] ? (
                              'View'
                            ) : (
                              'Load'
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No calls found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Showing {Math.min(filtered.length, 200)} of {filtered.length} calls
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Total calls" value={filtered.length} />
              <Row label="Avg duration" value={fmtDuration(avgDur)} />
              <Row label="Answer rate" value={`${answerRate}%`} />
              <Row label="Most active" value={byAgent?.a?.fullName || "—"} />
              <Row label="With recordings" value={`${withRecordings} (${filtered.length ? Math.round((withRecordings/filtered.length)*100) : 0}%)`} />
              <Row label="With transcripts" value={`${withTranscripts} (${filtered.length ? Math.round((withTranscripts/filtered.length)*100) : 0}%)`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {['answered', 'voicemail', 'no_answer', 'busy', 'failed'].map(status => {
                const count = filtered.filter(c => c.status === status).length;
                const pct = filtered.length ? Math.round((count/filtered.length)*100) : 0;
                return (
                  <div key={status} className="flex justify-between items-center">
                    <span className="text-muted-foreground capitalize">{status}</span>
                    <span className="font-semibold">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
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