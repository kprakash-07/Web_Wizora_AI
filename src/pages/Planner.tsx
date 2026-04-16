import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
  getDocs,
  increment,
  Timestamp,
  orderBy,
  deleteDoc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2,
  Loader2,
  CalendarDays,
  Target,
  Trophy,
  Zap,
  AlertCircle,
  BrainCircuit,
  History,
  ArrowRight,
  Star,
  Flame,
  LayoutDashboard,
  ListTodo,
  Edit2,
  X,
  Plus,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenAI, Type } from "@google/genai";
import confetti from "canvas-confetti";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";

interface StudyTask {
  id: string;
  time: string;
  task: string;
  subject: string;
  topic: string;
  status: "pending" | "completed" | "missed" | "studying";
  priority: "high" | "medium" | "low";
  duration: number;
  plannedTime: number;
  actualTime: number;
  date: string;
  assignedDay?: string;
  startTime?: number; // timestamp when "Start Study" was clicked
}

export default function Planner() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<any>({ xp: 0, streak: 0, level: 1 });
  
  // New State for Planner
  const [tasks, setTasks] = useState<any[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newTimeUnit, setNewTimeUnit] = useState<"mins" | "hours">("mins");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" }), []);

  useEffect(() => {
    if (!user) return;

    // Listen to user stats
    const unsubStats = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        setUserStats(doc.data());
      }
    });

    // Listen to tasks collection
    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      orderBy("date", "asc")
    );

    const unsubTasks = onSnapshot(q, (snapshot) => {
      const tasksList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(tasksList);
      setLoading(false);
    }, (err) => {
      console.error("Planner tasks error:", err);
      setLoading(false);
    });

    return () => {
      unsubStats();
      unsubTasks();
    };
  }, [user]);

  const handleAddTask = async () => {
    if (!newSubject.trim() || !newTopic.trim() || !user) return;

    try {
      await addDoc(collection(db, "tasks"), {
        userId: user.uid,
        subject: newSubject,
        title: newTopic, // title is used by dashboard
        topic: newTopic,
        time: newTime ? `${newTime}${newTimeUnit === "hours" ? "h" : "m"}` : null,
        date: newDate,
        completed: false,
        createdAt: Timestamp.now()
      });

      // Clear inputs
      setNewTopic("");
      setNewTime("");
      setSuggestedTopics([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "tasks");
    }
  };

  const handleSuggestTopics = async () => {
    if (!newSubject.trim()) return;
    setSuggesting(true);
    setError(null);
    try {
      const prompt = `Suggest 5 important study topics for the subject: "${newSubject}". Return only a JSON array of strings.`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      const topics = JSON.parse(response.text || "[]");
      setSuggestedTopics(topics);
    } catch (err: any) {
      console.error("Topic suggestion failed:", err);
      setError("Failed to suggest topics. Please try again.");
    } finally {
      setSuggesting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, "tasks", taskId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  const [editingTask, setEditingTask] = useState<any | null>(null);

  const handleEditTask = async () => {
    if (!editingTask || !editingTask.topic.trim()) return;

    try {
      await updateDoc(doc(db, "tasks", editingTask.id), {
        topic: editingTask.topic,
        title: editingTask.topic,
        time: editingTask.time,
        date: editingTask.date
      });
      setEditingTask(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${editingTask.id}`);
    }
  };

  const handleAddSuggestedTopic = (topicName: string) => {
    setNewTopic(topicName);
    setSuggestedTopics([]);
  };

  const handleToggleTask = async (task: any) => {
    try {
      const newStatus = !task.completed;
      await updateDoc(doc(db, "tasks", task.id), {
        completed: newStatus
      });

      if (newStatus) {
        // Calculate time to add to stats
        let timeInMins = 0;
        if (task.time) {
          const value = parseInt(task.time);
          if (task.time.endsWith('h')) {
            timeInMins = value * 60;
          } else {
            timeInMins = value;
          }
        }

        // Update user stats in Firebase
        if (user) {
          const userRef = doc(db, "users", user.uid);
          updateDoc(userRef, {
            totalStudyTime: increment(timeInMins),
            xp: increment(20),
            totalTasksCompleted: increment(1)
          }).catch(err => console.error("Error updating user stats:", err));
        }

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#6366F1", "#10B981", "#F59E0B"]
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const groupedTasks = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    const groups: { [key: string]: any[] } = {
      "Today's Tasks": [],
      "Tomorrow's Tasks": [],
      "Upcoming Tasks": []
    };

    tasks.forEach(task => {
      if (task.date === today) {
        groups["Today's Tasks"].push(task);
      } else if (task.date === tomorrow) {
        groups["Tomorrow's Tasks"].push(task);
      } else {
        groups["Upcoming Tasks"].push(task);
      }
    });

    return groups;
  }, [tasks]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <CalendarDays className="h-10 w-10 text-primary" />
            Study Planner
          </h1>
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-none font-black px-3 py-1 rounded-lg">
              Level {Math.floor(userStats.xp / 1000) + 1}
            </Badge>
            <p className="text-muted-foreground font-bold">{userStats.xp % 1000}/1000 XP</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-orange-500/10 text-orange-500 px-5 py-2.5 rounded-2xl font-black border border-orange-500/20 shadow-sm">
            <Flame className="h-5 w-5 fill-orange-500" />
            <span>{userStats.streak || 0} Day Streak</span>
          </div>
          <div className="flex items-center gap-3 bg-yellow-500/10 text-yellow-500 px-5 py-2.5 rounded-2xl font-black border border-yellow-500/20 shadow-sm">
            <Trophy className="h-5 w-5" />
            <span>{userStats.xp || 0} XP</span>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <Card className="border-2 border-border shadow-xl bg-card/50 backdrop-blur-md rounded-[2rem] overflow-hidden">
        <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest opacity-60">Subject Name</Label>
              <Input 
                placeholder="e.g. Mathematics" 
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="rounded-xl h-12 border-2 focus:ring-primary bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest opacity-60">Topic Name</Label>
              <Input 
                placeholder="e.g. Calculus" 
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="rounded-xl h-12 border-2 focus:ring-primary bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest opacity-60">Study Date</Label>
              <Input 
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="rounded-xl h-12 border-2 focus:ring-primary bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest opacity-60">Study Time (Optional)</Label>
              <div className="flex gap-2">
                <Input 
                  type="number"
                  placeholder="Time" 
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="rounded-xl h-12 border-2 flex-1 bg-background/50"
                />
                <select 
                  value={newTimeUnit}
                  onChange={(e: any) => setNewTimeUnit(e.target.value)}
                  className="rounded-xl h-12 border-2 bg-background/50 px-3 font-bold text-sm"
                >
                  <option value="mins">Mins</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <Button 
              onClick={handleAddTask}
              className="h-12 px-8 rounded-xl font-black gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 bg-[#4F46E5] hover:bg-[#4338CA] dark:bg-gradient-to-r dark:from-[#6366F1] dark:to-[#8B5CF6] dark:hover:opacity-90 border-none text-white"
              disabled={!newSubject.trim() || !newTopic.trim()}
            >
              <Plus className="h-5 w-5" />
              Add Task
            </Button>
            <Button 
              variant="outline"
              onClick={handleSuggestTopics}
              className="h-12 px-8 rounded-xl font-black gap-2 border-2 hover:bg-primary/5 transition-all"
              disabled={suggesting || !newSubject.trim()}
            >
              {suggesting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5 text-primary" />}
              Suggest Topics
            </Button>
          </div>

          {suggestedTopics.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/10 space-y-3"
            >
              <p className="text-xs font-black uppercase tracking-widest text-primary">AI Suggested Topics</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.map((topic, i) => (
                  <Badge 
                    key={i} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-primary hover:text-white transition-colors py-1.5 px-3 rounded-lg font-bold"
                    onClick={() => handleAddSuggestedTopic(topic)}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks List Grouped by Date */}
      <div className="space-y-12">
        {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
          groupTasks.length > 0 && (
            <div key={groupName} className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="h-8 w-1 bg-primary rounded-full" />
                <h2 className="text-2xl font-black tracking-tight">{groupName}</h2>
                <Badge variant="secondary" className="rounded-lg font-bold">
                  {groupTasks.length}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {groupTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className={`border-2 transition-all duration-300 rounded-[1.5rem] overflow-hidden group hover:shadow-2xl hover:-translate-y-1 ${
                        task.completed 
                          ? "bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/10 dark:border-emerald-500/30" 
                          : "bg-card border-border shadow-lg"
                      }`}>
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-black uppercase tracking-widest text-primary">
                                  {task.subject}
                                </span>
                                {task.completed && (
                                  <Badge className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white border-none animate-pulse">
                                    Completed
                                  </Badge>
                                )}
                              </div>
                              <h3 className={`text-xl font-bold leading-tight transition-all ${task.completed ? "line-through opacity-50" : "text-foreground"}`}>
                                {task.topic}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setEditingTask(task)}
                                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteTask(task.id)}
                                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-primary/60" />
                                <span>{new Date(task.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              {task.time && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-4 w-4 text-primary/60" />
                                  <span>{task.time}</span>
                                </div>
                              )}
                            </div>
                            
                            <Button
                              onClick={() => handleToggleTask(task)}
                              variant={task.completed ? "secondary" : "default"}
                              className={`rounded-xl font-black gap-2 h-10 px-5 transition-all ${
                                task.completed 
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 border-none" 
                                  : "bg-[#4F46E5] hover:bg-[#4338CA] dark:bg-gradient-to-r dark:from-[#6366F1] dark:to-[#8B5CF6] text-white border-none shadow-md shadow-primary/20"
                              }`}
                            >
                              {task.completed ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4" />
                                  Done
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="h-4 w-4" />
                                  Complete
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-20 bg-card/20 rounded-[3rem] border-4 border-dashed border-muted/30">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ListTodo className="h-10 w-10 text-primary opacity-40" />
          </div>
          <h3 className="text-2xl font-black mb-2">Your Planner is Empty</h3>
          <p className="text-muted-foreground font-medium">Add your first subject and topics to get started!</p>
        </div>
      )}
      {/* Edit Task Modal */}
      <AnimatePresence>
        {editingTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border-2 border-border rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black">Edit Task</h3>
                  <Button variant="ghost" size="icon" onClick={() => setEditingTask(null)}>
                    <X className="h-6 w-6" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-50">Topic Name</Label>
                    <Input 
                      value={editingTask.topic}
                      onChange={(e) => setEditingTask({...editingTask, topic: e.target.value})}
                      className="rounded-xl h-12 border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-50">Study Date</Label>
                    <Input 
                      type="date"
                      value={editingTask.date}
                      onChange={(e) => setEditingTask({...editingTask, date: e.target.value})}
                      className="rounded-xl h-12 border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-50">Study Time</Label>
                    <Input 
                      value={editingTask.time}
                      onChange={(e) => setEditingTask({...editingTask, time: e.target.value})}
                      className="rounded-xl h-12 border-2"
                      placeholder="e.g. 45m or 1h"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl font-black" onClick={() => setEditingTask(null)}>
                    Cancel
                  </Button>
                  <Button className="flex-1 h-12 rounded-xl font-black" onClick={handleEditTask}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
