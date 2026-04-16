import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { motion } from "framer-motion";
import { GraduationCap, Sparkles, Brain, Rocket, BookOpen, Target } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 transition-colors duration-300">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-black text-2xl tracking-tighter">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-500 to-secondary">Wizora AI</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
              Login
            </Link>
            <Link to="/login">
              <Button className="rounded-full px-8 h-11 bg-primary text-white hover:bg-primary/90 font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-44 pb-32 px-6 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-bold backdrop-blur-sm"
          >
            <Sparkles className="h-4 w-4" />
            <span className="uppercase tracking-widest text-[10px]">The Future of Personalized Learning</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] text-foreground"
          >
            Master Any Subject <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-secondary">
              with AI Intelligence
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium"
          >
            Wizora AI is your personal tutor, study planner, and note-taker all in one. 
            Built for students who demand excellence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4"
          >
            <Link to="/login">
              <Button size="lg" className="rounded-full px-10 text-lg h-16 bg-primary hover:bg-primary/90 text-white font-bold shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95">
                Start Learning Free
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="rounded-full px-10 text-lg h-16 border-border hover:bg-accent text-foreground font-bold transition-all">
              Watch Demo
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Brain,
              title: "AI Study Assistant",
              desc: "Get instant, high-fidelity explanations for complex concepts using state-of-the-art AI models.",
              color: "from-primary/20 to-primary/5"
            },
            {
              icon: BookOpen,
              title: "Smart Notes",
              desc: "Transform your study material into instant summaries, key points, and interactive flashcards.",
              color: "from-secondary/20 to-secondary/5"
            },
            {
              icon: Target,
              title: "Quiz Generator",
              desc: "Challenge yourself with AI-generated assessments tailored to your specific learning goals.",
              color: "from-accent/20 to-accent/5"
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-10 rounded-[2.5rem] bg-card border border-border hover:border-primary/50 transition-all hover:-translate-y-2 relative overflow-hidden shadow-sm hover:shadow-xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-8 group-hover:scale-110 transition-transform shadow-inner">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto rounded-[4rem] bg-gradient-to-br from-primary to-indigo-700 p-16 md:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-primary/20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)]" />
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Ready to transform <br />your study routine?</h2>
            <p className="text-white/80 text-xl max-w-2xl mx-auto font-medium">Join thousands of elite students using Wizora AI to achieve their academic goals with surgical precision.</p>
            <Link to="/login">
              <Button size="lg" variant="secondary" className="rounded-full px-12 h-16 text-xl bg-white text-black hover:bg-white/90 font-black shadow-xl transition-all hover:scale-105 active:scale-95">
                Join Wizora Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-20 border-t border-border text-center">
        <div className="flex items-center justify-center gap-2 font-black mb-4 text-xl tracking-tighter">
          <GraduationCap className="h-7 w-7 text-primary" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-500 to-secondary">Wizora AI</span>
        </div>
        <p className="text-muted-foreground font-medium">© 2026 Wizora AI. Engineering the future of education.</p>
      </footer>
    </div>
  );
}
