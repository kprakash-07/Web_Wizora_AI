import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Sparkles, 
  Brain, 
  Copy, 
  RefreshCcw,
  GraduationCap,
  Check,
  MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "assistant", 
      content: "Hello! I'm your Wizora AI tutor. How can I help you with your studies today? You can ask me to explain a concept, solve a problem, or help with code.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: isAdvanced ? `${m.content} (Provide a detailed, advanced explanation with technical terms)` : `${m.content} (Explain this simply as if to a high school student)`
          })),
          model: isAdvanced ? "mixtral-8x7b-32768" : "llama-3.3-70b-versatile"
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "assistant", content: data.content, timestamp: new Date() }]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${error.message || "Something went wrong"}. Please check your API keys and Vercel logs.`, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 shrink-0 border-b mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <Brain className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              AI Study Assistant
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold border-primary/20 text-primary">Live</Badge>
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Personalized 1-on-1 Tutoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card/50 backdrop-blur-md p-1.5 rounded-2xl border shadow-sm">
          <div className="flex items-center space-x-2 px-3">
            <Label htmlFor="mode-toggle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Simple</Label>
            <Switch 
              id="mode-toggle" 
              checked={isAdvanced}
              onCheckedChange={setIsAdvanced}
              className="data-[state=checked]:bg-primary"
            />
            <Label htmlFor="mode-toggle" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Advanced</Label>
          </div>
          <div className="h-8 w-px bg-border mx-1" />
          <Badge variant={isAdvanced ? "default" : "secondary"} className="rounded-xl px-3 py-1 font-bold">
            {isAdvanced ? "Mixtral 8x7B" : "Llama 3.3"}
          </Badge>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto chat-scrollbar px-2 pb-4 space-y-8"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-4 max-w-[85%] sm:max-w-[75%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    m.role === "user" 
                      ? "bg-gradient-to-br from-primary to-indigo-600 text-white" 
                      : "bg-card border text-primary"
                  }`}>
                    {m.role === "user" ? <UserIcon className="h-5 w-5" /> : <GraduationCap className="h-6 w-6" />}
                  </div>
                  
                  <div className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`group relative rounded-[2rem] px-6 py-4 shadow-lg transition-all border-2 ${
                      m.role === "user" 
                        ? "bg-gradient-to-br from-primary to-indigo-600 text-white border-transparent rounded-tr-none" 
                        : "bg-card border-border/50 text-foreground rounded-tl-none"
                    }`}>
                      <div className={`prose prose-sm max-w-none font-medium leading-relaxed ${m.role === "user" ? "prose-invert" : "dark:prose-invert"}`}>
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                      
                      {/* Action buttons on hover */}
                      <div className={`absolute top-2 ${m.role === "user" ? "-left-12" : "-right-12"} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2`}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm hover:bg-accent"
                          onClick={() => copyToClipboard(m.content, i)}
                        >
                          {copiedId === i ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-3">
                      {m.role === "user" ? "You" : "Wizora AI"} • {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-2xl bg-card border flex items-center justify-center text-primary shadow-md">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="bg-card border border-border/50 rounded-[2rem] rounded-tl-none px-6 py-4 flex flex-col gap-2 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 bg-primary/40 rounded-full animate-typing" />
                    <span className="h-2 w-2 bg-primary/40 rounded-full animate-typing [animation-delay:0.2s]" />
                    <span className="h-2 w-2 bg-primary/40 rounded-full animate-typing [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-primary/60">AI is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="pt-4 shrink-0">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[2.5rem] blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
          <div className="relative flex items-center bg-card border-2 border-border/50 rounded-[2rem] shadow-xl focus-within:border-primary/50 transition-all overflow-hidden">
            <Input
              placeholder="Ask Wizora anything..."
              className="flex-1 h-16 pl-8 pr-20 border-none bg-transparent text-lg focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
            />
            <div className="absolute right-3 flex items-center gap-2">
              <Button 
                size="icon" 
                className="h-11 w-11 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg glow-primary transition-all active:scale-95 disabled:opacity-50"
                onClick={handleSend}
                disabled={loading || !input.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
              Wizora AI can make mistakes • Verify important info
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
