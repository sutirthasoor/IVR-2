import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { store, useStoreVersion, newId } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Send, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Trash2,
  Copy
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc, where } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDqDnTWFf0xluB_U41GXxCYfKsGK5QX9Ag",
  authDomain: "luxe-b95d0.firebaseapp.com",
  projectId: "luxe-b95d0",
  storageBucket: "luxe-b95d0.firebasestorage.app",
  messagingSenderId: "217781331790",
  appId: "1:217781331790:web:881aee2b3ace08f297201f",
  measurementId: "G-BJGZTH01TH",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
});

interface Message {
  id: string;
  title: string;
  content: string;
  type: 'notification' | 'alert' | 'reminder';
  targetAudience: 'all' | 'agents' | 'managers' | 'specific';
  targetUserIds?: string[];
  status: 'draft' | 'sent' | 'failed';
  sentAt?: number;
  sentBy: string;
  createdAt: number;
  deliveredTo?: string[];
}

function MessagesPage() {
  useStoreVersion();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<Message['type']>('notification');
  const [targetAudience, setTargetAudience] = useState<Message['targetAudience']>('all');
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadMessages();
    loadUsers();
  }, [user]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "messages"), orderBy("sentAt", "desc"));
      const querySnapshot = await getDocs(q);
      const messagesData: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messagesData.push({
          id: doc.id,
          title: data.title || "",
          content: data.content || "",
          type: data.type || "notification",
          targetAudience: data.targetAudience || "all",
          targetUserIds: data.targetUserIds || [],
          status: data.status || "draft",
          sentAt: data.sentAt?.toMillis?.() || data.sentAt || Date.now(),
          sentBy: data.sentBy || user.id,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        });
      });
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const allUsers = await store.listUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSendNow = async () => {
  if (!title || !content) {
    toast.error("Please fill in title and content");
    return;
  }

  // Create the message object
  const newMessage: any = {
    title: title.trim(),
    content: content.trim(),
    type: type,
    targetAudience: targetAudience,
    status: 'sent',
    sentAt: Date.now(),
    sentBy: user!.id,
    createdAt: Date.now(),
  };

  // Only add targetUserIds if it's 'specific' and has values
  if (targetAudience === 'specific' && targetUsers.length > 0) {
    newMessage.targetUserIds = targetUsers;
  }

  // Log what we're sending
  console.log('Sending message:', newMessage);

  try {
    let docRef;
    if (editingMessage) {
      docRef = await updateDoc(doc(db, "messages", editingMessage.id), newMessage);
      console.log('Updated message:', editingMessage.id);
      toast.success("Message updated and sent!");
    } else {
      docRef = await addDoc(collection(db, "messages"), newMessage);
      console.log('Message sent with ID:', docRef.id);
      toast.success("Message sent to mobile app!");
    }
    resetForm();
    setOpenCreate(false);
    loadMessages();
  } catch (error) {
    console.error('Error sending message:', error);
    toast.error("Failed to send message: " + (error as any).message);
  }
};

  const handleSaveDraft = async () => {
    if (!title || !content) {
      toast.error("Please fill in title and content");
      return;
    }

    const draft: any = {
      title,
      content,
      type,
      targetAudience,
      status: 'draft',
      sentBy: user!.id,
      createdAt: Date.now(),
    };

    // Only add targetUserIds if it's 'specific' and has values
    if (targetAudience === 'specific' && targetUsers.length > 0) {
      draft.targetUserIds = targetUsers;
    } else {
      // If not specific, remove the field entirely
      draft.targetUserIds = null;
    }

    try {
      if (editingMessage) {
        await updateDoc(doc(db, "messages", editingMessage.id), draft);
        toast.success("Draft updated");
      } else {
        await addDoc(collection(db, "messages"), draft);
        toast.success("Draft saved");
      }
      resetForm();
      setOpenCreate(false);
      loadMessages();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error("Failed to save draft");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this message?")) {
      try {
        await deleteDoc(doc(db, "messages", id));
        toast.success("Message deleted");
        loadMessages();
      } catch (error) {
        console.error('Error deleting message:', error);
        toast.error("Failed to delete message");
      }
    }
  };

  const handleResend = async (message: Message) => {
    try {
      await updateDoc(doc(db, "messages", message.id), {
        status: 'sent',
        sentAt: Date.now()
      });
      toast.success("Message resent!");
      loadMessages();
    } catch (error) {
      console.error('Error resending:', error);
      toast.error("Failed to resend");
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setType('notification');
    setTargetAudience('all');
    setTargetUsers([]);
    setEditingMessage(null);
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'draft': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      notification: 'bg-blue-500',
      alert: 'bg-red-500',
      reminder: 'bg-yellow-500'
    };
    return <Badge className={colors[type as keyof typeof colors]}>{type}</Badge>;
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Message Center</h1>
          <p className="text-sm text-muted-foreground">
            Create and send messages to connected mobile apps
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setOpenCreate(true);
        }}>
          <Send className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Messages</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <MessageList 
            messages={messages} 
            onDelete={handleDelete}
            onResend={handleResend}
            getStatusIcon={getStatusIcon}
            getTypeBadge={getTypeBadge}
          />
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <MessageList 
            messages={messages.filter(m => m.status === 'sent')}
            onDelete={handleDelete}
            onResend={handleResend}
            getStatusIcon={getStatusIcon}
            getTypeBadge={getTypeBadge}
          />
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <MessageList 
            messages={messages.filter(m => m.status === 'draft')}
            onDelete={handleDelete}
            onResend={handleResend}
            getStatusIcon={getStatusIcon}
            getTypeBadge={getTypeBadge}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMessage ? "Edit Message" : "Create New Message"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Message title"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notification">Notification</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Audience</Label>
              <Select value={targetAudience} onValueChange={(v) => setTargetAudience(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="agents">Agents Only</SelectItem>
                  <SelectItem value="managers">Managers Only</SelectItem>
                  <SelectItem value="specific">Specific Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {targetAudience === 'specific' && (
              <div>
                <Label>Select Users</Label>
                <Select onValueChange={(v) => setTargetUsers([...targetUsers, v])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add users" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 flex flex-wrap gap-1">
                  {targetUsers.map(uid => {
                    const u = users.find(u => u.id === uid);
                    return u ? (
                      <Badge key={uid} variant="secondary" className="gap-1">
                        {u.fullName}
                        <button onClick={() => setTargetUsers(targetUsers.filter(id => id !== uid))}>
                          ×
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            <div>
              <Label>Content</Label>
              <Textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)}
                placeholder="Message content..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button onClick={handleSendNow}>
              <Send className="mr-2 h-4 w-4" />
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageList({ messages, onDelete, onResend, getStatusIcon, getTypeBadge }: any) {
  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No messages found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message: any) => (
        <Card key={message.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(message.status)}
                  {getTypeBadge(message.type)}
                  <span className="text-xs text-muted-foreground">
                    {message.sentAt ? format(message.sentAt, "MMM d, yyyy h:mm a") : "Draft"}
                  </span>
                </div>
                <h3 className="font-semibold">{message.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{message.content}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span>Target: {message.targetAudience}</span>
                  {message.deliveredTo && (
                    <span>Delivered to: {message.deliveredTo.length} devices</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {message.status === 'draft' && (
                  <Button size="sm" variant="ghost" onClick={() => onResend(message)}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                {message.status === 'sent' && (
                  <Button size="sm" variant="ghost" onClick={() => onResend(message)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => onDelete(message.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}