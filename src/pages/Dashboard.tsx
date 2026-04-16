import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, orderBy, limit, increment } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { 
  Flame, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Plus, 
  Trash2,
  BrainCircuit,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Send,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { sendEmailVerification } from "firebase/auth";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [studySessions, setStudySessions] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen to user data
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (doc) => {
      setUserData(doc.data());
      setLoading(false);
    }, (err) => {
      console.error("User snapshot error:", err);
      setLoading(false);
    });

    // Listen to tasks
    const qTasks = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const tasksList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksList);
    }, (err) => {
      console.error("Tasks snapshot error:", err);
    });

    // Listen to study sessions
    const qSessions = query(collection(db, "study_sessions"), where("userId", "==", user.uid));
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data());
      setStudySessions(sessions);
    }, (err) => {
      console.error("Sessions snapshot error:", err);
    });

    // Listen to quiz results
    const qQuizzes = query(
      collection(db, "quizzes"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const unsubQuizzes = onSnapshot(qQuizzes, (snapshot) => {
      const results = snapshot.docs.map(doc => doc.data());
      setQuizResults(results);
      setLoading(false);
    }, (err) => {
      console.error("Quizzes snapshot error:", err);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubTasks();
      unsubSessions();
      unsubQuizzes();
    };
  }, [user]);

  const totalStudyMins = (studySessions.reduce((acc, session) => acc + (Number(session.duration) || 0), 0)) + (Number(userData?.totalStudyTime || 0));
  const totalStudyHours = Math.floor(totalStudyMins / 60);
  const remainingMins = totalStudyMins % 60;
  const studyTimeDisplay = totalStudyHours > 0 ? `${totalStudyHours}h ${remainingMins}m` : `${remainingMins}m`;
  
  const averageQuizScore = quizResults.length > 0 
    ? Math.round((quizResults.reduce((acc, q) => acc + ((Number(q.score) || 0) / (Number(q.total) || 1)), 0) / quizResults.length) * 100)
    : 0;

  const chartData = quizResults.slice().reverse().map(q => {
    let date;
    if (q.createdAt?.toDate) {
      date = q.createdAt.toDate();
    } else if (q.createdAt) {
      date = new Date(q.createdAt);
    } else {
      date = new Date();
    }

    return {
      day: date instanceof Date && !isNaN(date.getTime()) 
        ? date.toLocaleDateString(undefined, { weekday: 'short' }) 
        : '?',
      score: Math.round(((Number(q.score) || 0) / (Number(q.total) || 1)) * 100)
    };
  });

  const handleResendVerification = async () => {
    if (!user) return;
    setResending(true);
    try {
      await sendEmailVerification(user);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error) {
      console.error("Error resending verification:", error);
    } finally {
      setResending(false);
    }
  };

  const addTask = async () => {
    if (!newTask.trim() || !user) return;
    await addDoc(collection(db, "tasks"), {
      userId: user.uid,
      title: newTask,
      completed: false,
      date: new Date().toISOString().split("T")[0]
    });
    setNewTask("");
  };

  const toggleTask = async (task: any) => {
    const newStatus = !task.completed;
    await updateDoc(doc(db, "tasks", task.id), { completed: newStatus });

    if (newStatus && user) {
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

      const userRef = doc(db, "users", user.uid);
      updateDoc(userRef, {
        totalStudyTime: increment(timeInMins),
        xp: increment(20),
        totalTasksCompleted: increment(1)
      }).catch(err => console.error("Error updating user stats:", err));
    }
  };

  const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, "tasks", taskId));
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-bold animate-pulse">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Email Verification Banner */}
      {user && !user.emailVerified && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border-2 border-amber-500/20 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-amber-500/5"
        >
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-amber-500">Verify your email</h3>
              <p className="text-amber-500/70 font-medium">Please check your inbox for a verification link to secure your account.</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white transition-all font-bold gap-2"
            onClick={handleResendVerification}
            disabled={resending || resendSuccess}
          >
            {resending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : resendSuccess ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {resendSuccess ? "Sent!" : "Resend Email"}
          </Button>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            Good {new Date().getHours() < 12 ? "Morning" : "Evening"}, {user?.displayName?.split(" ")[0] || "Student"} 👋
          </h1>
          <p className="text-muted-foreground text-lg font-medium">
            You're making progress — keep going 💪
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-orange-500/10 text-orange-500 px-5 py-2.5 rounded-2xl font-bold border border-orange-500/20 shadow-lg shadow-orange-500/5">
            <Flame className="h-6 w-6 fill-orange-500" />
            <span className="text-lg">{userData?.streak || 0} Day Streak</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Study Progress", value: `${Math.round(progress)}%`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10", gradient: "from-blue-500/20 to-transparent" },
          { label: "Tasks Completed", value: `${completedTasks}/${tasks.length}`, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", gradient: "from-emerald-500/20 to-transparent" },
          { label: "Study Time", value: studyTimeDisplay, icon: Clock, color: "text-indigo-500", bg: "bg-indigo-500/10", gradient: "from-indigo-500/20 to-transparent" },
          { label: "Quiz Avg", value: `${averageQuizScore}%`, icon: BrainCircuit, color: "text-purple-500", bg: "bg-purple-500/10", gradient: "from-purple-500/20 to-transparent" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-lg bg-card/50 backdrop-blur-sm card-hover overflow-hidden relative group">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <CardContent className="p-6 flex items-center gap-4 relative z-10">
              <div className={`h-14 w-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-black">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tasks Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Focus */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent" />
              Today's Focus
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tasks.filter(t => !t.completed).slice(0, 3).map((task, i) => (
                <div key={task.id} className="p-5 rounded-2xl bg-card/40 border-2 border-accent/20 hover:border-accent/50 transition-colors shadow-sm">
                  <p className="font-black text-foreground mb-1 truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground font-bold uppercase">Priority Task</p>
                </div>
              ))}
              {tasks.filter(t => !t.completed).length === 0 && (
                <div className="md:col-span-3 p-5 rounded-2xl bg-accent/5 border-2 border-dashed border-accent/20 text-center">
                  <p className="text-accent font-bold">All caught up! Time to relax or start a new goal. ✨</p>
                </div>
              )}
            </div>
          </div>

          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-2xl font-black">Today's Tasks</CardTitle>
                <CardDescription className="font-medium">Stay on top of your study schedule</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="New task..." 
                  className="bg-background/50 border-2 border-border/50 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all w-48 md:w-64"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTask()}
                />
                <Button size="icon" className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={addTask}>
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 px-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-black uppercase tracking-wider text-muted-foreground">Daily Goal</span>
                  <span className="text-primary font-black">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3 rounded-full bg-muted" />
              </div>

              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-10 w-10 opacity-20" />
                    </div>
                    <p className="text-lg font-bold">No tasks for today</p>
                    <p className="text-sm">Add one to get started!</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <motion.div
                      layout
                      key={task.id}
                      className="flex items-center justify-between p-5 rounded-2xl bg-background/40 border-2 border-transparent hover:border-primary/20 hover:bg-background/60 transition-all group shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => toggleTask(task)}
                          className={`h-7 w-7 rounded-xl border-2 flex items-center justify-center transition-all ${
                            task.completed ? "bg-primary border-primary text-white scale-110" : "border-muted-foreground/30 hover:border-primary"
                          }`}
                        >
                          {task.completed && <CheckCircle2 className="h-5 w-5" />}
                        </button>
                        <div className="flex flex-col">
                          {task.subject && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-0.5">{task.subject}</span>
                          )}
                          <span className={`text-lg font-bold transition-all ${task.completed ? "line-through text-muted-foreground/50" : "text-foreground"}`}>
                            {task.title}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* AI Recommendations */}
          <Card className="border-none shadow-2xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white overflow-hidden relative rounded-[2rem] group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-400/20 rounded-full -ml-20 -mb-20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-3 text-2xl font-black">
                <BrainCircuit className="h-7 w-7" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="bg-white/15 rounded-2xl p-5 backdrop-blur-md border border-white/10 shadow-inner">
                <p className="text-sm font-black uppercase tracking-widest mb-2 opacity-80">Recommended for you</p>
                <p className="text-lg font-medium leading-relaxed">"You've been doing great in Physics! Try a quick quiz on Thermodynamics to solidify your knowledge."</p>
              </div>
              <Button 
                variant="secondary" 
                className="w-full h-14 rounded-2xl font-black text-lg bg-white text-indigo-600 hover:bg-white/90 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => navigate("/quiz")}
              >
                Start Quiz
              </Button>
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Performance</CardTitle>
              <CardDescription>Weekly quiz average</CardDescription>
            </CardHeader>
            <CardContent className="h-[200px] p-0 pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.length > 0 ? chartData : [{ day: 'None', score: 0 }]}>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--card)", borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                    itemStyle={{ color: "var(--primary)" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="var(--primary)" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: "var(--primary)" }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
