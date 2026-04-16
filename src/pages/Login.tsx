import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from "firebase/auth";
import { auth, googleProvider, db } from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { GraduationCap, Chrome, Mail, Lock, ArrowRight, User, CheckCircle2, AlertTriangle, Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showResend, setShowResend] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setShowResend(false);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Force reload to get latest verification status
        await user.reload();

        if (!user.emailVerified) {
          setError("Please verify your email before logging in.");
          setShowResend(true);
          await signOut(auth); // Sign out immediately as requested
          return;
        }
        
        navigate("/dashboard");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Send verification email immediately
        await sendEmailVerification(user);
        
        // Update profile
        await updateProfile(user, {
          displayName: username
        });

        // Create user doc
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: username || "Student",
          photoURL: user.photoURL || "",
          streak: 0,
          lastActive: new Date().toISOString(),
          goals: []
        });

        setSuccess("Verification email sent. Please check your inbox.");
        
        // Sign out immediately after signup to prevent access
        await signOut(auth);

        // Switch to login after a delay
        setTimeout(() => {
          setIsLogin(true);
          setSuccess("");
        }, 6000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendAfterLoginFail = async () => {
    setResending(true);
    setError("");
    try {
      // To resend, we must sign in again briefly
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      setSuccess("Verification email resent! Please check your inbox.");
      await signOut(auth);
      setShowResend(false);
    } catch (err: any) {
      setError("Failed to resend: " + err.message);
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Google users are usually verified, but we check anyway
      if (!user.emailVerified) {
        setError("Your Google account email is not verified. Please verify it in your Google settings.");
        await signOut(auth);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          streak: 0,
          lastActive: new Date().toISOString(),
          goals: []
        });
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden transition-colors duration-300">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <Link to="/" className="flex flex-col items-center group">
            <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/40 mb-4 group-hover:scale-110 transition-transform">
              <GraduationCap className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-500 to-secondary">Wizora AI</h1>
            <p className="text-muted-foreground font-medium">Your personal AI study companion</p>
          </Link>
        </div>

        <Card className="border-border/50 shadow-2xl bg-card/50 backdrop-blur-2xl text-card-foreground rounded-[2.5rem] overflow-hidden">
          <CardHeader className="space-y-2 pb-8">
            <CardTitle className="text-3xl font-black tracking-tight">{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
            <CardDescription className="text-muted-foreground text-base font-medium">
              {isLogin ? "Enter your credentials to access your dashboard" : "Sign up to start your personalized learning journey"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground/70 ml-1 font-bold">Username</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                    <Input 
                      id="username" 
                      type="text" 
                      placeholder="Your Name" 
                      className="h-14 pl-12 bg-background/50 border-border rounded-2xl focus:ring-primary focus:border-primary text-lg font-medium"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground/70 ml-1 font-bold">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    className="h-14 pl-12 bg-background/50 border-border rounded-2xl focus:ring-primary focus:border-primary text-lg font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground/70 ml-1 font-bold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="h-14 pl-12 bg-background/50 border-border rounded-2xl focus:ring-primary focus:border-primary text-lg font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-destructive font-bold bg-destructive/10 p-4 rounded-2xl border border-destructive/20 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                  {showResend && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleResendAfterLoginFail}
                      disabled={resending}
                      className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all font-bold gap-2"
                    >
                      {resending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Resend Verification Email
                    </Button>
                  )}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 text-sm text-emerald-500 font-bold bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <p>{success}</p>
                </motion.div>
              )}
              <Button type="submit" className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-muted-foreground/50 font-black tracking-widest">Or continue with</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl border-border bg-background/50 hover:bg-accent text-foreground font-black text-lg transition-all" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <Chrome className="mr-3 h-5 w-5" />
              Google
            </Button>
          </CardContent>
          <CardFooter className="pb-8">
            <Button 
              variant="link" 
              className="w-full text-muted-foreground hover:text-primary transition-colors font-bold"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
