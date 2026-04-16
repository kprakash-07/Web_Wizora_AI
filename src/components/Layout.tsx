import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "./ui/button";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Calendar, 
  BookOpen, 
  BrainCircuit, 
  LogOut, 
  Sun, 
  Moon,
  Menu,
  X,
  GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "../lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: MessageSquare, label: "AI Chat", path: "/chat" },
  { icon: Calendar, label: "Planner", path: "/planner" },
  { icon: BookOpen, label: "Notes", path: "/notes" },
  { icon: BrainCircuit, label: "Quiz", path: "/quiz" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, reloadUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Enforce email verification
  React.useEffect(() => {
    const checkVerification = async () => {
      if (user) {
        await user.reload();
        if (!user.emailVerified) {
          await auth.signOut();
          navigate("/login");
        }
      }
    };
    
    checkVerification();
    
    // Optional: check periodically or on window focus
    window.addEventListener('focus', checkVerification);
    return () => window.removeEventListener('focus', checkVerification);
  }, [user, navigate]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-300">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b bg-card/80 backdrop-blur-md z-50 flex items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-500 to-secondary font-black">Wizora AI</span>
          </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar (Desktop) */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 88 }}
        className="hidden lg:flex relative flex-col border-r bg-card transition-all duration-300 ease-in-out z-40"
      >
        <div className="flex h-20 items-center justify-between px-6">
          <Link to="/dashboard" className="flex items-center gap-3 font-black group">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              <GraduationCap className="h-7 w-7" />
            </div>
            {isSidebarOpen && <span className="text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-500 to-secondary">Wizora AI</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
          >
            {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-bold transition-all group",
                  isActive 
                    ? "bg-primary text-white shadow-xl shadow-primary/40 scale-[1.02] glow-primary" 
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
              >
                <item.icon className={cn("h-6 w-6 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                {isSidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-6 space-y-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-4 px-4 h-12 rounded-2xl font-bold text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all"
            onClick={toggleTheme}
          >
            {theme === "light" ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
            {isSidebarOpen && <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-4 px-4 h-12 rounded-2xl font-bold text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
            onClick={handleLogout}
          >
            <LogOut className="h-6 w-6" />
            {isSidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </motion.aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[80%] max-w-sm bg-card z-[70] flex flex-col shadow-2xl"
            >
              <div className="flex h-20 items-center justify-between px-6 border-b">
                <div className="flex items-center gap-3 font-black">
                  <GraduationCap className="h-8 w-8 text-primary" />
                  <span className="text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-500 to-secondary">Wizora AI</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <nav className="flex-1 px-4 py-8 space-y-3">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-4 rounded-2xl px-6 py-4 text-lg font-bold transition-all",
                        isActive 
                          ? "bg-primary text-white shadow-xl shadow-primary/25" 
                          : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                      )}
                    >
                      <item.icon className="h-6 w-6" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-6 border-t space-y-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-4 px-6 h-14 rounded-2xl font-bold text-muted-foreground"
                  onClick={toggleTheme}
                >
                  {theme === "light" ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
                  <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-4 px-6 h-14 rounded-2xl font-bold text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-6 w-6" />
                  <span>Logout</span>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background/50 relative pt-16 lg:pt-0 chat-scrollbar">
        <div className="min-h-full mx-auto max-w-7xl p-4 md:p-8 lg:p-10 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
