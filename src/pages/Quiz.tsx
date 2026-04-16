import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { 
  BrainCircuit, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  ArrowRight,
  Loader2,
  RefreshCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { GoogleGenAI, Type } from "@google/genai";

export default function Quiz() {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const ai = React.useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" }), []);

  const generateQuiz = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const prompt = `Generate 5 multiple choice questions about the topic: "${topic}". Return only a JSON object with questions array.`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    q: { type: Type.STRING },
                    options: { 
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    correct: { type: Type.NUMBER, description: "Index of the correct option (0-indexed)" }
                  },
                  required: ["q", "options", "correct"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });
      const data = JSON.parse(response.text || "{}");
      setQuestions(data.questions);
      setCurrentIdx(0);
      setScore(0);
      setShowResult(false);
    } catch (error: any) {
      console.error("Quiz generation failed:", error);
      alert(`AI Quiz generation failed: ${error.message || "An unexpected error occurred."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    const correct = idx === questions[currentIdx].correct;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);

    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(c => c + 1);
        setSelectedOption(null);
        setIsCorrect(null);
      } else {
        setShowResult(true);
        if (score + (correct ? 1 : 0) >= questions.length * 0.8) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#4f46e5", "#38bdf8", "#10b981"]
          });
        }
        // Save result
        if (user) {
          addDoc(collection(db, "quizzes"), {
            userId: user.uid,
            topic,
            score: score + (correct ? 1 : 0),
            total: questions.length,
            createdAt: new Date().toISOString()
          });
        }
      }
    }, 1500);
  };

  const reset = () => {
    setQuestions([]);
    setTopic("");
    setShowResult(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center justify-center gap-3">
          <BrainCircuit className="h-10 w-10 text-primary" />
          AI Quiz Master
        </h1>
        <p className="text-muted-foreground text-lg">Test your knowledge on any topic instantly.</p>
      </div>

      <AnimatePresence mode="wait">
        {questions.length === 0 ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl p-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Enter Study Topic</label>
                  <Input 
                    placeholder="e.g., Photosynthesis, World War II, React Hooks..." 
                    className="h-14 rounded-2xl text-lg px-6 border-none bg-background shadow-inner"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && generateQuiz()}
                  />
                </div>
                <Button 
                  className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
                  onClick={generateQuiz}
                  disabled={loading || !topic.trim()}
                >
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-5 w-5 mr-2" />
                  )}
                  Generate AI Quiz
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : showResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl p-12">
              <div className="flex justify-center mb-6">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Trophy className="h-12 w-12" />
                </div>
              </div>
              <h2 className="text-3xl font-bold">Quiz Completed!</h2>
              <div className="py-8">
                <p className="text-6xl font-black text-primary">{score} / {questions.length}</p>
                <p className="text-muted-foreground mt-2">Correct Answers</p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={reset}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Try Another
                </Button>
                <Button className="flex-1 h-12 rounded-xl" onClick={() => generateQuiz()}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Retake Quiz
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center px-4">
              <Badge variant="secondary" className="px-5 py-1.5 rounded-full font-black bg-primary/10 text-primary border-none text-sm uppercase tracking-wider">Question {currentIdx + 1} of {questions.length}</Badge>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-black text-xl text-primary">Score: {score}</span>
              </div>
            </div>
            
            <div className="px-4">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                <span>Progress</span>
                <span>{Math.round(((currentIdx + 1) / questions.length) * 100)}%</span>
              </div>
              <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-3 rounded-full bg-muted shadow-inner" />
            </div>
            
            <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-xl overflow-hidden rounded-[2.5rem]">
              <CardHeader className="p-10 pb-6">
                <CardTitle className="text-3xl font-black leading-tight tracking-tight text-foreground">{questions[currentIdx].q}</CardTitle>
              </CardHeader>
              <CardContent className="p-10 pt-4 space-y-4">
                {questions[currentIdx].options.map((option: string, i: number) => {
                  const isSelected = selectedOption === i;
                  const isCorrectOption = i === questions[currentIdx].correct;
                  
                  let className = "w-full h-20 justify-start px-8 text-xl rounded-2xl transition-all border-4 font-bold ";
                  
                  if (isSelected) {
                    if (isCorrect) {
                      className += "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 scale-[1.02] shadow-lg shadow-emerald-500/20";
                    } else {
                      className += "bg-destructive/10 border-destructive text-destructive scale-[1.02] shadow-lg shadow-destructive/20";
                    }
                  } else if (selectedOption !== null && isCorrectOption) {
                    className += "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400";
                  } else {
                    className += "border-border/50 bg-background/40 hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.01]";
                  }

                  return (
                    <Button
                      key={i}
                      variant="ghost"
                      className={className}
                      onClick={() => handleAnswer(i)}
                      disabled={selectedOption !== null}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-4">
                          <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-sm font-black text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                            {String.fromCharCode(65 + i)}
                          </span>
                          {option}
                        </span>
                        {isSelected && (
                          isCorrect ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />
                        )}
                        {!isSelected && selectedOption !== null && isCorrectOption && (
                          <CheckCircle2 className="h-8 w-8" />
                        )}
                      </div>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
