import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { store, useStoreVersion } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  useStoreVersion();
  const { user } = useAuth();
  const s = store.getSettings();
  const [companyName, setCompanyName] = useState(s.companyName);
  const [timezone, setTimezone] = useState(s.timezone);
  const [voipServer, setVoipServer] = useState(s.voipServer);
  const [voipPort, setVoipPort] = useState(s.voipPort);
  const [voipWs, setVoipWs] = useState(s.voipWebsocketUrl);
  const [autoRecord, setAutoRecord] = useState(s.autoRecord);
  const [retention, setRetention] = useState(String(s.recordingRetentionDays));

  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return <p className="text-sm text-muted-foreground">Not authorized.</p>;
  }

  const save = () => {
    store.updateSettings({
      companyName,
      timezone,
      voipServer,
      voipPort,
      voipWebsocketUrl: voipWs,
      autoRecord,
      recordingRetentionDays: Number(retention) || 90,
    });
    toast.success("Settings saved");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure the workspace.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="voip">VoIP</TabsTrigger>
          <TabsTrigger value="recording">Recording</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Company name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div>
                <Label>Logo</Label>
                <Input type="file" accept="image/*" />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </div>
              <Button onClick={save}>Save</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voip">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">VoIP / SIP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Asterisk server IP</Label>
                <Input value={voipServer} onChange={(e) => setVoipServer(e.target.value)} placeholder="sip.example.com" />
              </div>
              <div>
                <Label>SIP port</Label>
                <Input value={voipPort} onChange={(e) => setVoipPort(e.target.value)} />
              </div>
              <div>
                <Label>WebSocket URL</Label>
                <Input value={voipWs} onChange={(e) => setVoipWs(e.target.value)} placeholder="wss://sip.example.com:8089/ws" />
              </div>
              <Button onClick={save}>Save</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recording</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Auto-record calls</Label>
                <Switch checked={autoRecord} onCheckedChange={setAutoRecord} />
              </div>
              <div>
                <Label>Retention period (days)</Label>
                <Input value={retention} onChange={(e) => setRetention(e.target.value)} type="number" />
              </div>
              <Button onClick={save}>Save</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Generate keys for the mobile app to authenticate.
              </p>
              <div className="flex gap-2">
                <Input value="sk_live_demo_••••••••••••" readOnly />
                <Button variant="outline" onClick={() => toast.success("Key generated")}>
                  Generate new
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
