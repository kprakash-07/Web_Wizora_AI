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
  orderBy
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
  X
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
  const [examDate, setExamDate] = useState("");
  const [subjects, setSubjects] = useState("");
  const [hours, setHours] = useState("4");
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [userStats, setUserStats] = useState<any>({ xp: 0, streak: 0, level: 1 });
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "stats">("daily");

  // Manual Task Entry State
  const [manualSubject, setManualSubject] = useState("");
  const [manualTopic, setManualTopic] = useState("");
  const [manualTime, setManualTime] = useState("60");
  const [manualDay, setManualDay] = useState("");
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [timerTick, setTimerTick] = useState(0);

  const ai = useMemo(() => {
    const key = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    return new GoogleGenAI({ apiKey: key });
  }, []);

  useEffect(() => {
    let interval: any;
    const activeTask = tasks.find(t => t.status === "studying");
    if (activeTask) {
      interval = setInterval(() => {
        setTimerTick(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
    if (!user) return;

    // Listen to user stats
    const unsubStats = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        setUserStats(doc.data());
      }
    });

    // Listen to tasks for today
    const today = new Date().toISOString().split("T")[0];
    const qTasks = query(
      collection(db, "study_tasks"), 
      where("userId", "==", user.uid),
      where("date", "==", today)
    );
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyTask));
      setTasks(taskList.sort((a, b) => a.time.localeCompare(b.time)));
    });

    // Listen to plan
    const unsubPlan = onSnapshot(doc(db, "study_plans", user.uid), (doc) => {
      if (doc.exists()) {
        setPlan(doc.data());
      }
    });

    // Auto-rescheduling logic
    const rescheduleMissedTasks = async () => {
      const today = new Date().toISOString().split("T")[0];
      const qMissed = query(
        collection(db, "study_tasks"),
        where("userId", "==", user.uid),
        where("status", "==", "pending"),
        where("date", "<", today)
      );
      
      const snapshot = await getDocs(qMissed);
      for (const taskDoc of snapshot.docs) {
        const taskData = taskDoc.data();
        // Move to today and mark as high priority
        await updateDoc(doc(db, "study_tasks", taskDoc.id), {
          date: today,
          priority: "high",
          rescheduled: true,
          originalDate: taskData.date
        });
      }
    };

    rescheduleMissedTasks();

    return () => {
      unsubStats();
      unsubTasks();
      unsubPlan();
    };
  }, [user]);

  const generateAIPlan = async () => {
    if (!examDate || !subjects || !user) return;
    setLoading(true);
    setError(null);
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured. Please check your environment settings.");
      }

      const subjectList = subjects.split(",").map(s => s.trim());
      const prompt = `Create a highly optimized study plan for a student.
        Exam Date: ${examDate}
        Subjects: ${subjectList.join(", ")}
        Weak Subjects: ${weakSubjects.join(", ")}
        Available Hours per Day: ${hours}
        
        Requirements:
        1. Divide subjects based on difficulty (Weak subjects get 1.5x more time).
        2. Include 15-minute breaks every 90 minutes.
        3. Add a 30-minute revision session at the end of each day.
        4. Generate a daily timeline (e.g., 08:00 - 09:30) and a weekly roadmap.
        5. Assign a priority (high, medium, low) to each task.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dailyPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    task: { type: Type.STRING },
                    subject: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["high", "medium", "low"] },
                    duration: { type: Type.NUMBER }
                  },
                  required: ["time", "task", "subject", "priority", "duration"]
                }
              },
              weeklyRoadmap: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    focus: { type: Type.STRING }
                  },
                  required: ["day", "focus"]
                }
              },
              aiSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["dailyPlan", "weeklyRoadmap", "aiSuggestions"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      
      // Save plan to Firestore
      try {
        await setDoc(doc(db, "study_plans", user.uid), {
          ...data,
          examDate,
          subjects: subjectList,
          hoursPerDay: hours,
          updatedAt: Timestamp.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `study_plans/${user.uid}`);
      }

      // Initialize today's tasks
      const today = new Date().toISOString().split("T")[0];
      for (const item of data.dailyPlan) {
        try {
          await addDoc(collection(db, "study_tasks"), {
            userId: user.uid,
            ...item,
            topic: item.task,
            plannedTime: item.duration,
            actualTime: 0,
            status: "pending",
            date: today,
            createdAt: Timestamp.now()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, "study_tasks");
        }
      }

      setPlan(data);
    } catch (err: any) {
      console.error("AI Plan generation failed:", err);
      setError(err.message || "Failed to call the Gemini API. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const addManualTask = async () => {
    if (!user || !manualSubject || !manualTopic || !manualTime) return;

    const timeInMins = parseInt(manualTime);
    const tasksToCreate: any[] = [];

    // Smart Splitting Logic
    if (timeInMins > 300) { // 5 hours
      let remainingTime = timeInMins;
      let dayOffset = 0;
      while (remainingTime > 0) {
        const chunkTime = Math.min(remainingTime, 120); // 2 hours chunks
        tasksToCreate.push({
          subject: manualSubject,
          topic: manualTopic,
          task: `${manualTopic} (Part ${dayOffset + 1})`,
          plannedTime: chunkTime,
          actualTime: 0,
          status: "pending",
          priority: "medium",
          dayOffset
        });
        remainingTime -= chunkTime;
        dayOffset++;
      }
    } else {
      tasksToCreate.push({
        subject: manualSubject,
        topic: manualTopic,
        task: manualTopic,
        plannedTime: timeInMins,
        actualTime: 0,
        status: "pending",
        priority: "medium",
        dayOffset: 0
      });
    }

    // Smart Scheduling Logic
    const today = new Date();
    for (const task of tasksToCreate) {
      let targetDate = new Date(today);
      if (manualDay) {
        targetDate = new Date(manualDay);
        targetDate.setDate(targetDate.getDate() + task.dayOffset);
      } else {
        // Automatically distribute: find day with least workload
        // For simplicity in this demo, we'll just offset from today
        targetDate.setDate(today.getDate() + task.dayOffset);
      }

      const dateStr = targetDate.toISOString().split("T")[0];
      
      try {
        await addDoc(collection(db, "study_tasks"), {
          userId: user.uid,
          ...task,
          time: "Flexible",
          duration: task.plannedTime,
          date: dateStr,
          createdAt: Timestamp.now()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, "study_tasks");
      }
    }

    // Reset form
    setManualSubject("");
    setManualTopic("");
    setManualTime("60");
    setManualDay("");
  };

  const startStudy = async (taskId: string) => {
    try {
      await updateDoc(doc(db, "study_tasks", taskId), {
        status: "studying",
        startTime: Date.now()
      });
    } catch (error) {
      console.error("Failed to start study:", error);
    }
  };

  const pauseStudy = async (task: StudyTask) => {
    if (!task.startTime) return;
    const elapsedMins = Math.floor((Date.now() - task.startTime) / 60000);
    try {
      await updateDoc(doc(db, "study_tasks", task.id), {
        status: "pending",
        actualTime: (task.actualTime || 0) + elapsedMins,
        startTime: null
      });
    } catch (error) {
      console.error("Failed to pause study:", error);
    }
  };

  const completeTask = async (task: StudyTask) => {
    if (!user || task.status === "completed") return;

    let finalActualTime = task.actualTime;
    if (task.status === "studying" && task.startTime) {
      finalActualTime += Math.floor((Date.now() - task.startTime) / 60000);
    }

    try {
      await updateDoc(doc(db, "study_tasks", task.id), {
        status: "completed",
        actualTime: finalActualTime,
        completedAt: Timestamp.now(),
        startTime: null
      });

      // Update XP and Streak
      const xpGain = task.priority === "high" ? 50 : task.priority === "medium" ? 30 : 20;
      await updateDoc(doc(db, "users", user.uid), {
        xp: increment(xpGain),
        totalTasksCompleted: increment(1)
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#6366F1", "#10B981", "#F59E0B"]
      });
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const updateTask = async () => {
    if (!editingTask) return;
    try {
      await updateDoc(doc(db, "study_tasks", editingTask.id), {
        topic: editingTask.topic,
        task: editingTask.topic,
        plannedTime: editingTask.plannedTime,
        date: editingTask.date
      });
      setEditingTask(null);
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const dailyProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const totalPlanned = tasks.reduce((acc, t) => acc + t.plannedTime, 0);
    const totalActual = tasks.reduce((acc, t) => {
      let time = t.actualTime || 0;
      if (t.status === "studying" && t.startTime) {
        time += Math.floor((Date.now() - t.startTime) / 60000);
      } else if (t.status === "completed" && t.actualTime === 0) {
        // Fallback for tasks completed without timer
        time = t.plannedTime;
      }
      return acc + time;
    }, 0);
    
    if (totalPlanned === 0) return 0;
    return Math.min(100, Math.round((totalActual / totalPlanned) * 100));
  }, [tasks, timerTick]);

  const subjectProgress = useMemo(() => {
    const progress: Record<string, { total: number; completed: number }> = {};
    tasks.forEach(t => {
      if (!progress[t.subject]) progress[t.subject] = { total: 0, completed: 0 };
      progress[t.subject].total += t.plannedTime;
      if (t.status === "completed") {
        progress[t.subject].completed += t.plannedTime;
      } else if (t.status === "studying" && t.startTime) {
        progress[t.subject].completed += Math.floor((Date.now() - t.startTime) / 60000);
      } else {
        progress[t.subject].completed += t.actualTime || 0;
      }
    });
    return progress;
  }, [tasks, timerTick]);

  const nextTask = useMemo(() => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    return tasks.find(t => {
      const startTime = t.time.split(" - ")[0];
      const [hours, minutes] = startTime.split(":").map(Number);
      const taskStartTime = hours * 60 + minutes;
      return taskStartTime > currentTime && t.status === "pending";
    });
  }, [tasks]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header with Gamification Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <CalendarDays className="h-10 w-10 text-primary" />
            AI Study Coach
          </h1>
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-none font-black px-3 py-1 rounded-lg">
              Level {Math.floor(userStats.xp / 1000) + 1}
            </Badge>
            <p className="text-muted-foreground font-bold">{userStats.xp % 1000}/1000 XP to next level</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 bg-orange-500/10 text-orange-500 px-6 py-3 rounded-2xl font-black border border-orange-500/20 shadow-lg shadow-orange-500/5 cursor-default"
          >
            <Flame className="h-6 w-6 fill-orange-500" />
            <span className="text-xl">{userStats.streak || 0} Day Streak</span>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 bg-yellow-500/10 text-yellow-500 px-6 py-3 rounded-2xl font-black border border-yellow-500/20 shadow-lg shadow-yellow-500/5 cursor-default"
          >
            <Trophy className="h-6 w-6" />
            <span className="text-xl">{userStats.xp || 0} XP</span>
          </motion.div>
        </div>
      </div>

      {/* Smart Notifications / Reminders */}
      <AnimatePresence>
        {nextTask && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-primary/10 border-2 border-primary/20 rounded-[2rem] p-6 flex items-center justify-between shadow-xl shadow-primary/5"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                <Clock className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-primary/70">Next Session Reminder</p>
                <h3 className="text-xl font-black">Time to study {nextTask.subject}: {nextTask.task}</h3>
                <p className="text-muted-foreground font-bold">Starting at {nextTask.time.split(" - ")[0]}</p>
              </div>
            </div>
            <Button 
              className="rounded-xl font-black gap-2 h-12 px-6"
              onClick={() => setActiveTab("daily")}
            >
              View Timeline
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Task Modal Overlay */}
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
                    <Label className="text-xs font-black uppercase tracking-widest opacity-50">Topic</Label>
                    <Input 
                      value={editingTask.topic}
                      onChange={(e) => setEditingTask({...editingTask, topic: e.target.value})}
                      className="rounded-xl h-12 border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-50">Planned Time (mins)</Label>
                    <Input 
                      type="number"
                      value={editingTask.plannedTime}
                      onChange={(e) => setEditingTask({...editingTask, plannedTime: parseInt(e.target.value)})}
                      className="rounded-xl h-12 border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-50">Date</Label>
                    <Input 
                      type="date"
                      value={editingTask.date}
                      onChange={(e) => setEditingTask({...editingTask, date: e.target.value})}
                      className="rounded-xl h-12 border-2"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1 h-12 rounded-xl font-black" onClick={() => setEditingTask(null)}>
                    Cancel
                  </Button>
                  <Button className="flex-1 h-12 rounded-xl font-black" onClick={updateTask}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Setup & Stats */}
        <div className="lg:col-span-4 space-y-8">
          {/* Plan Setup */}
          <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-primary/5 pb-6">
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-6 w-6 text-primary" />
                Coach Setup
              </CardTitle>
              <CardDescription>Configure your study goals</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-black uppercase tracking-wider opacity-70">Exam Date</Label>
                <Input 
                  type="date" 
                  className="rounded-2xl h-14 bg-background/50 border-2 focus:ring-primary"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-black uppercase tracking-wider opacity-70">Subjects</Label>
                <Input 
                  placeholder="Math, Physics, Chemistry..." 
                  className="rounded-2xl h-14 bg-background/50 border-2"
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-black uppercase tracking-wider opacity-70">Weak Subjects</Label>
                <div className="flex flex-wrap gap-2">
                  {subjects.split(",").filter(s => s.trim()).map((s, i) => (
                    <Badge 
                      key={i}
                      variant={weakSubjects.includes(s.trim()) ? "default" : "outline"}
                      className="cursor-pointer rounded-xl px-4 py-2 font-bold transition-all"
                      onClick={() => {
                        const trimmed = s.trim();
                        setWeakSubjects(prev => 
                          prev.includes(trimmed) ? prev.filter(x => x !== trimmed) : [...prev, trimmed]
                        );
                      }}
                    >
                      {s.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-black uppercase tracking-wider opacity-70">Study Hours / Day</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    type="range" 
                    min="1" 
                    max="16" 
                    step="1"
                    className="flex-1 accent-primary"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                  <span className="text-2xl font-black text-primary w-12">{hours}h</span>
                </div>
              </div>
              <Button 
                className="w-full h-16 rounded-[1.5rem] font-black text-lg gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={generateAIPlan}
                disabled={loading || !examDate || !subjects}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
                Generate AI Plan
              </Button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-bold">Or Add Manual Task</span></div>
              </div>

              <div className="space-y-4">
                <Input 
                  placeholder="Subject (e.g. Maths)" 
                  className="rounded-xl h-12 bg-background/50 border-2"
                  value={manualSubject}
                  onChange={(e) => setManualSubject(e.target.value)}
                />
                <Input 
                  placeholder="Topic (e.g. Calculus)" 
                  className="rounded-xl h-12 bg-background/50 border-2"
                  value={manualTopic}
                  onChange={(e) => setManualTopic(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    type="number"
                    placeholder="Time (mins)" 
                    className="rounded-xl h-12 bg-background/50 border-2"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                  />
                  <Input 
                    type="date"
                    className="rounded-xl h-12 bg-background/50 border-2"
                    value={manualDay}
                    onChange={(e) => setManualDay(e.target.value)}
                  />
                </div>
                <Button 
                  variant="outline"
                  className="w-full h-12 rounded-xl font-black border-2"
                  onClick={addManualTask}
                  disabled={!manualSubject || !manualTopic || !manualTime}
                >
                  Add to Planner
                </Button>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 rounded-2xl bg-destructive/10 text-destructive text-sm font-bold flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Progress Overview */}
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-6 w-6 text-emerald-500" />
                Daily Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-4xl font-black">{dailyProgress}%</span>
                  <span className="text-muted-foreground font-bold">Today's Goal</span>
                </div>
                <Progress value={dailyProgress} className="h-4 rounded-full bg-muted" />
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest opacity-50">Subject Breakdown</Label>
                <div className="space-y-4">
                  {Object.entries(subjectProgress).map(([subject, stats]) => (
                    <div key={subject} className="space-y-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span>{subject}</span>
                        <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
                      </div>
                      <Progress value={(stats.completed / stats.total) * 100} className="h-2 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          {plan?.aiSuggestions && (
            <Card className="border-none shadow-xl bg-indigo-600 text-white rounded-[2.5rem] overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black">
                  <Zap className="h-6 w-6 fill-white" />
                  Coach Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-4 relative z-10">
                {plan.aiSuggestions.map((suggestion: string, i: number) => (
                  <div key={i} className="flex gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <Star className="h-5 w-5 shrink-0 text-yellow-300 fill-yellow-300" />
                    <p className="text-sm font-bold leading-relaxed">{suggestion}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Timeline & Roadmap */}
        <div className="lg:col-span-8 space-y-8">
          {/* Navigation Tabs */}
          <div className="flex p-2 bg-card/50 backdrop-blur-md rounded-[2rem] w-fit shadow-lg border border-border/50">
            {[
              { id: "daily", label: "Daily Timeline", icon: Clock },
              { id: "weekly", label: "Weekly Roadmap", icon: Calendar },
              { id: "stats", label: "Study History", icon: History }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-8 py-4 rounded-[1.5rem] font-black transition-all ${
                  activeTab === tab.id 
                    ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105" 
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "daily" && (
              <motion.div
                key="daily"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {tasks.length === 0 ? (
                  <div className="h-[600px] flex flex-col items-center justify-center text-center p-12 rounded-[3rem] border-4 border-dashed border-muted/30 bg-card/20">
                    <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                      <LayoutDashboard className="h-12 w-12 text-primary opacity-40" />
                    </div>
                    <h3 className="text-3xl font-black text-foreground mb-4">No tasks for today</h3>
                    <p className="text-muted-foreground text-lg max-w-md font-medium">Generate a smart plan to see your daily timeline and start studying!</p>
                  </div>
                ) : (
                  <div className="relative space-y-4">
                    <div className="absolute left-[31px] top-8 bottom-8 w-1 bg-gradient-to-b from-primary via-primary/20 to-transparent rounded-full hidden md:block" />
                    {tasks.map((task, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={task.id}
                        className="relative flex flex-col md:flex-row gap-6 group"
                      >
                        {/* Time Marker */}
                        <div className="flex items-center gap-4 md:w-40 shrink-0">
                          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-sm font-black z-10 shadow-xl transition-all group-hover:scale-110 ${
                            task.status === "completed" 
                              ? "bg-emerald-500 text-white" 
                              : task.status === "missed"
                              ? "bg-destructive text-white"
                              : "bg-card border-4 border-background text-primary"
                          }`}>
                            {task.time.split(" - ")[0]}
                          </div>
                          <div className="md:hidden h-1 flex-1 bg-muted rounded-full" />
                        </div>

                        {/* Task Card */}
                        <Card className={`flex-1 border-none shadow-xl transition-all rounded-[2rem] overflow-hidden group-hover:translate-x-2 ${
                          task.status === "completed" ? "bg-emerald-500/5 border-2 border-emerald-500/20" : 
                          task.status === "studying" ? "bg-primary/5 border-2 border-primary/20 ring-2 ring-primary/20 ring-offset-2" :
                          "bg-card/50 backdrop-blur-sm"
                        }`}>
                          <CardContent className="p-8 flex items-center justify-between gap-6">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className={`text-2xl font-black ${task.status === "completed" ? "line-through opacity-50" : ""}`}>
                                  {task.topic || task.task}
                                </h3>
                                {task.priority === "high" && (
                                  <Badge className="bg-destructive/10 text-destructive border-none font-black rounded-lg">High Priority</Badge>
                                )}
                                {task.status === "studying" && (
                                  <Badge className="bg-primary text-white border-none font-black rounded-lg animate-pulse">Studying...</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2 text-muted-foreground font-bold">
                                  <BookOpen className="h-4 w-4" />
                                  {task.subject}
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground font-bold">
                                  <Clock className="h-4 w-4" />
                                  {task.plannedTime}m planned
                                </div>
                                {task.actualTime > 0 && (
                                  <div className="flex items-center gap-2 text-emerald-500 font-bold">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {task.actualTime}m spent
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {task.status === "pending" && (
                                <>
                                  <Button 
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingTask(task)}
                                    className="h-14 w-14 rounded-2xl hover:bg-primary/10 text-primary"
                                  >
                                    <Edit2 className="h-5 w-5" />
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    onClick={() => startStudy(task.id)}
                                    className="h-14 px-6 rounded-2xl font-black border-2 gap-2"
                                  >
                                    <Zap className="h-5 w-5" />
                                    Start Study
                                  </Button>
                                  <Button 
                                    onClick={() => completeTask(task)}
                                    className="h-14 px-6 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 gap-2"
                                  >
                                    <CheckCircle2 className="h-5 w-5" />
                                    Done
                                  </Button>
                                </>
                              )}
                              {task.status === "studying" && (
                                <>
                                  <Button 
                                    variant="outline"
                                    onClick={() => pauseStudy(task)}
                                    className="h-14 px-6 rounded-2xl font-black border-2 gap-2"
                                  >
                                    <Clock className="h-5 w-5" />
                                    Pause
                                  </Button>
                                  <Button 
                                    onClick={() => completeTask(task)}
                                    className="h-14 px-6 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 gap-2"
                                  >
                                    <CheckCircle2 className="h-5 w-5" />
                                    Finish
                                  </Button>
                                </>
                              )}
                              {task.status === "completed" && (
                                <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                                  <CheckCircle2 className="h-8 w-8" />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "weekly" && (
              <motion.div
                key="weekly"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {plan?.weeklyRoadmap?.map((item: any, i: number) => (
                  <Card key={i} className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden group hover:scale-[1.02] transition-all">
                    <CardHeader className="bg-primary/5 pb-4">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-2xl font-black">{item.day}</CardTitle>
                        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                          {i + 1}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8">
                      <p className="text-lg font-medium text-muted-foreground leading-relaxed">
                        {item.focus}
                      </p>
                      <div className="mt-8 flex items-center justify-between">
                        <Badge variant="secondary" className="rounded-lg font-bold">Week 1</Badge>
                        <Button variant="ghost" className="font-black gap-2 text-primary hover:bg-primary/10 rounded-xl">
                          View Details
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}

            {activeTab === "stats" && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: "Total XP", value: userStats.xp, icon: Zap, color: "text-yellow-500" },
                    { label: "Current Streak", value: `${userStats.streak} Days`, icon: Flame, color: "text-orange-500" },
                    { label: "Tasks Done", value: userStats.totalTasksCompleted || 0, icon: CheckCircle2, color: "text-emerald-500" }
                  ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2rem] p-8 flex items-center gap-6">
                      <div className={`h-16 w-16 rounded-2xl bg-background flex items-center justify-center ${stat.color} shadow-inner`}>
                        <stat.icon className="h-8 w-8" />
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase tracking-widest opacity-50">{stat.label}</p>
                        <p className="text-3xl font-black">{stat.value}</p>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[3rem] p-12 text-center">
                  <div className="h-32 w-32 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                    <History className="h-16 w-16 text-primary opacity-40" />
                  </div>
                  <h3 className="text-3xl font-black mb-4">Study History</h3>
                  <p className="text-muted-foreground text-lg max-w-xl mx-auto font-medium">
                    Detailed analytics and history of your study sessions will appear here as you complete more tasks.
                  </p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
