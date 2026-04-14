import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2,
  Loader2,
  CalendarDays,
  Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Planner() {
  const [examDate, setExamDate] = useState("");
  const [subjects, setSubjects] = useState("");
  const [hours, setHours] = useState("4");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const generatePlan = async () => {
    if (!examDate || !subjects) return;
    setLoading(true);
    try {
      const response = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDate,
          subjects: subjects.split(",").map(s => s.trim()),
          hoursPerDay: hours
        })
      });
      const data = await response.json();
      setPlan(data);
    } catch (error) {
      console.error("Planner generation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            Smart Study Planner
          </h1>
          <p className="text-muted-foreground">AI-optimized schedule to help you ace your exams.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Form */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm h-fit">
          <CardHeader>
            <CardTitle>Plan Setup</CardTitle>
            <CardDescription>Tell us about your goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Exam Date</Label>
              <Input 
                type="date" 
                className="rounded-xl h-12"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subjects (comma separated)</Label>
              <Input 
                placeholder="Math, Physics, Chemistry..." 
                className="rounded-xl h-12"
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Study Hours per Day</Label>
              <Input 
                type="number" 
                min="1" 
                max="24" 
                className="rounded-xl h-12"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <Button 
              className="w-full h-12 rounded-xl font-bold gap-2"
              onClick={generatePlan}
              disabled={loading || !examDate || !subjects}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate My Plan
            </Button>
          </CardContent>
        </Card>

        {/* Plan Display */}
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {!plan ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[400px] flex flex-col items-center justify-center text-center p-8 rounded-[2rem] border-2 border-dashed"
              >
                <Target className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <h3 className="text-xl font-bold text-muted-foreground">No plan generated yet</h3>
                <p className="text-muted-foreground max-w-xs">Fill out the form to create your personalized AI study schedule.</p>
              </motion.div>
            ) : (
              <motion.div
                key="plan"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Daily Timeline */}
                <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-3 text-2xl font-black">
                      <Clock className="h-7 w-7 text-primary" />
                      Daily Schedule
                    </CardTitle>
                    <CardDescription className="font-medium">Your optimized study routine</CardDescription>
                  </CardHeader>
                  <CardContent className="relative pt-6">
                    <div className="absolute left-12 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent rounded-full" />
                    <div className="space-y-8">
                      {plan?.dailyPlan?.map((item: any, i: number) => (
                        <div key={i} className="relative flex gap-8 pl-4 group">
                          <div className="h-16 w-16 rounded-2xl bg-card border-4 border-background flex items-center justify-center text-xs font-black text-primary z-10 shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                            {item.time}
                          </div>
                          <div className="flex-1 p-6 rounded-[1.5rem] bg-background/40 border-2 border-transparent hover:border-primary/30 transition-all shadow-sm group-hover:bg-background/60">
                            <p className="font-black text-lg text-foreground">{item.task}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant="secondary" className="rounded-lg font-bold bg-primary/10 text-primary border-none">
                                {item.task.toLowerCase().includes("break") ? "Rest" : "Focus"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Roadmap */}
                <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-[2rem] overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-3 text-2xl font-black">
                      <Calendar className="h-7 w-7 text-primary" />
                      Weekly Roadmap
                    </CardTitle>
                    <CardDescription className="font-medium">Long-term study milestones</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {plan?.weeklyRoadmap?.map((item: any, i: number) => (
                        <div key={i} className="p-6 rounded-[1.5rem] bg-background/40 border-2 border-transparent hover:border-primary/30 transition-all shadow-sm flex items-start gap-5 group">
                          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                            <span className="font-black text-sm uppercase">{item.day.substring(0, 3)}</span>
                          </div>
                          <div>
                            <p className="text-lg font-black text-foreground">{item.day}</p>
                            <p className="text-sm text-muted-foreground font-medium leading-relaxed">{item.focus}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
