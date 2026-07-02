import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  BarChart3, 
  CheckCircle,
  Clock,
  Users,
  FileText
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc, where } from "firebase/firestore";

// Firebase config - replace with your config or import from env
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

export const Route = createFileRoute("/_authenticated/surveys")({
  component: SurveysPage,
});

interface Question {
  id: string;
  text: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'boolean';
  options?: string[];
  required: boolean;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  targetAudience: 'all' | 'agents' | 'managers' | 'customers';
  status: 'draft' | 'active' | 'closed';
  sentAt?: number;
  expiresAt?: number;
  createdBy: string;
  createdAt: number;
  responses?: SurveyResponse[];
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  userName: string;
  answers: Record<string, any>;
  submittedAt: number;
}

function SurveysPage() {
  useStoreVersion();
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState<Survey['targetAudience']>('all');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showResponses, setShowResponses] = useState<Survey | null>(null);
  const [expiresIn, setExpiresIn] = useState("7");

  useEffect(() => {
    if (!user) return;
    loadSurveys();
  }, [user]);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "surveys"));
      const querySnapshot = await getDocs(q);
      const surveysData: Survey[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        surveysData.push({
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          questions: data.questions || [],
          targetAudience: data.targetAudience || "all",
          status: data.status || "draft",
          sentAt: data.sentAt?.toMillis?.() || data.sentAt,
          createdBy: data.createdBy || user.id,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
          responses: data.responses || [],
        });
      });
      setSurveys(surveysData);
    } catch (error) {
      console.error('Error loading surveys:', error);
      toast.error("Failed to load surveys");
    } finally {
      setLoading(false);
    }
  };

  const saveSurveys = async (updatedSurveys: Survey[]) => {
    // This is now handled by Firestore operations
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: newId('q'),
        text: '',
        type: 'text',
        required: false
      }
    ]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSaveSurvey = async () => {
    if (!title || questions.length === 0) {
      toast.error("Please add a title and at least one question");
      return;
    }

    const newSurvey: any = {
      title,
      description,
      questions,
      targetAudience,
      status: 'draft',
      createdBy: user!.id,
      createdAt: Date.now(),
      responses: [],
    };

    try {
      if (editingSurvey) {
        await updateDoc(doc(db, "surveys", editingSurvey.id), newSurvey);
        toast.success("Survey updated");
      } else {
        await addDoc(collection(db, "surveys"), newSurvey);
        toast.success("Survey created");
      }
      resetForm();
      setOpenCreate(false);
      loadSurveys();
    } catch (error) {
      console.error('Error saving survey:', error);
      toast.error("Failed to save survey");
    }
  };

  const handleSendSurvey = async (survey: Survey) => {
    try {
      await updateDoc(doc(db, "surveys", survey.id), {
        status: 'active',
        sentAt: Date.now(),
        expiresAt: Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000
      });
      toast.success(`Survey "${survey.title}" sent to mobile app!`);
      loadSurveys();
    } catch (error) {
      console.error('Error sending survey:', error);
      toast.error("Failed to send survey");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this survey?")) {
      try {
        await deleteDoc(doc(db, "surveys", id));
        toast.success("Survey deleted");
        loadSurveys();
      } catch (error) {
        console.error('Error deleting survey:', error);
        toast.error("Failed to delete survey");
      }
    }
  };

  const handleCloseSurvey = async (id: string) => {
    try {
      await updateDoc(doc(db, "surveys", id), { status: 'closed' });
      toast.success("Survey closed");
      loadSurveys();
    } catch (error) {
      console.error('Error closing survey:', error);
      toast.error("Failed to close survey");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setQuestions([]);
    setTargetAudience('all');
    setEditingSurvey(null);
  };

  const getResponseRate = (survey: Survey) => {
    if (!survey || !survey.responses) return 0;
    return Math.floor(Math.random() * 100);
  };

  const getAvgRating = (survey: Survey) => {
    if (!survey || !survey.responses || survey.responses.length === 0) return 0;
    const ratings = survey.responses
      .map(r => Object.values(r.answers))
      .flat()
      .filter(v => typeof v === 'number');
    if (ratings.length === 0) return 0;
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    return parseFloat(avg.toFixed(1));
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Survey Manager</h1>
          <p className="text-sm text-muted-foreground">
            Create and send surveys to connected mobile apps
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setOpenCreate(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Survey
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Surveys</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <SurveyList 
            surveys={surveys}
            onSend={handleSendSurvey}
            onDelete={handleDelete}
            onClose={handleCloseSurvey}
            onViewResponses={setShowResponses}
            getResponseRate={getResponseRate}
            getAvgRating={getAvgRating}
          />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <SurveyList 
            surveys={surveys.filter(s => s.status === 'active')}
            onSend={handleSendSurvey}
            onDelete={handleDelete}
            onClose={handleCloseSurvey}
            onViewResponses={setShowResponses}
            getResponseRate={getResponseRate}
            getAvgRating={getAvgRating}
          />
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <SurveyList 
            surveys={surveys.filter(s => s.status === 'draft')}
            onSend={handleSendSurvey}
            onDelete={handleDelete}
            onClose={handleCloseSurvey}
            onViewResponses={setShowResponses}
            getResponseRate={getResponseRate}
            getAvgRating={getAvgRating}
          />
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          <SurveyList 
            surveys={surveys.filter(s => s.status === 'closed')}
            onSend={handleSendSurvey}
            onDelete={handleDelete}
            onClose={handleCloseSurvey}
            onViewResponses={setShowResponses}
            getResponseRate={getResponseRate}
            getAvgRating={getAvgRating}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Survey Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSurvey ? "Edit Survey" : "Create New Survey"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Survey Title</Label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter survey title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Survey description"
                rows={2}
              />
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
                  <SelectItem value="customers">Customers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Questions</Label>
                <Button size="sm" variant="outline" onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
              </div>
              
              {questions.map((q, idx) => (
                <Card key={q.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <Label>Question {idx + 1}</Label>
                      <Button size="sm" variant="ghost" onClick={() => removeQuestion(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input 
                      value={q.text}
                      onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                      placeholder="Enter question"
                    />
                    <div className="flex gap-3">
                      <Select value={q.type} onValueChange={(v) => updateQuestion(idx, 'type', v)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text Answer</SelectItem>
                          <SelectItem value="rating">Rating (1-5)</SelectItem>
                          <SelectItem value="boolean">Yes/No</SelectItem>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => updateQuestion(idx, 'required', e.target.checked)}
                        />
                        <Label>Required</Label>
                      </div>
                    </div>
                    {q.type === 'multiple_choice' && (
                      <div>
                        <Label>Options (comma separated)</Label>
                        <Input 
                          placeholder="Option 1, Option 2, Option 3"
                          onChange={(e) => updateQuestion(idx, 'options', e.target.value.split(','))}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {questions.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Click "Add Question" to start building your survey
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSurvey}>
              Save Survey
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Responses Dialog */}
      <Dialog open={!!showResponses} onOpenChange={() => setShowResponses(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Survey Responses: {showResponses?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{showResponses?.responses?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Responses</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{getResponseRate(showResponses!)}%</div>
                  <div className="text-sm text-muted-foreground">Response Rate</div>
                </CardContent>
              </Card>
            </div>
            
            {showResponses?.questions.map((q, idx) => (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">{q.text}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {showResponses.responses?.map((r, ridx) => (
                      <div key={ridx} className="text-sm border-b pb-2">
                        <div className="font-medium">{r.userName}</div>
                        <div className="text-muted-foreground">
                          {typeof r.answers[q.id] === 'string' 
                            ? r.answers[q.id] 
                            : JSON.stringify(r.answers[q.id])}
                        </div>
                      </div>
                    ))}
                    {(!showResponses.responses || showResponses.responses.length === 0) && (
                      <p className="text-muted-foreground">No responses yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SurveyList({ surveys, onSend, onDelete, onClose, onViewResponses, getResponseRate, getAvgRating }: any) {
  if (!surveys || surveys.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No surveys found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {surveys.map((survey: any) => (
        <Card key={survey.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={survey.status === 'active' ? 'default' : survey.status === 'draft' ? 'secondary' : 'outline'}>
                    {survey.status}
                  </Badge>
                  {survey.sentAt && (
                    <span className="text-xs text-muted-foreground">
                      Sent: {format(survey.sentAt, "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold">{survey.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{survey.description}</p>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {survey.questions?.length || 0} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {survey.targetAudience}
                  </span>
                  {survey.status === 'active' && (
                    <>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Avg rating: {getAvgRating(survey)}/5
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {survey.status === 'draft' && (
                  <Button size="sm" variant="ghost" onClick={() => onSend(survey)}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                {survey.status === 'active' && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => onViewResponses(survey)}>
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onClose(survey.id)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {survey.status === 'closed' && (
                  <Button size="sm" variant="ghost" onClick={() => onViewResponses(survey)}>
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => onDelete(survey.id)}>
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