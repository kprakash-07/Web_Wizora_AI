import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  FileText, 
  Sparkles, 
  Trash2, 
  Lightbulb, 
  Plus,
  Loader2,
  Calendar,
  Save,
  PenLine,
  Search,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Sub-components ---

const NoteCard = ({ note, isActive, onClick, onDelete }: any) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    onClick={onClick}
    className={`p-4 rounded-[16px] cursor-pointer transition-all duration-200 border group relative ${
      isActive 
        ? "bg-white dark:bg-[#1E293B] shadow-soft gradient-border" 
        : "bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-white/5"
    }`}
  >
    <div className="flex justify-between items-start mb-2">
      <h3 className={`font-bold text-base truncate pr-6 ${isActive ? "text-primary" : "text-slate-900 dark:text-slate-100"}`}>
        {note.title || "Untitled Note"}
      </h3>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
      {note.summary || note.content || "No content yet..."}
    </p>
    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
      <Clock className="h-3 w-3" />
      {new Date(note.createdAt).toLocaleDateString()}
    </div>
  </motion.div>
);

const NotesList = ({ notes, selectedNoteId, onSelect, onCreate, onDelete, loading }: any) => {
  const [search, setSearch] = useState("");
  const filteredNotes = notes.filter((n: any) => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Notes</h1>
        <Button 
          onClick={onCreate}
          disabled={loading}
          className="h-10 w-10 rounded-xl gradient-primary text-white shadow-lg hover:brightness-110 transition-all"
          size="icon"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Search notes..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-800 focus:ring-primary/20"
        />
      </div>

      <ScrollArea className="flex-1 -mx-1 px-1 chat-scrollbar">
        <div className="space-y-3 pb-4">
          {filteredNotes.map((note: any) => (
            <NoteCard 
              key={note.id}
              note={note}
              isActive={selectedNoteId === note.id}
              onClick={() => onSelect(note.id)}
              onDelete={onDelete}
            />
          ))}
          {filteredNotes.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                <FileText className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-slate-500">No notes found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const NoteEditor = ({ 
  note, 
  editTitle, 
  setEditTitle, 
  editContent, 
  setEditContent, 
  onSave, 
  onSummarize, 
  loading,
  onClose
}: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-soft bg-white dark:bg-[#1E1E1E] rounded-[20px]">
        <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <input 
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-3xl font-bold bg-transparent border-none p-0 h-auto focus:outline-none w-full text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                placeholder="Note Title"
              />
              <div className="flex items-center gap-2 mt-2 text-slate-400 font-medium text-sm">
                <Calendar className="h-4 w-4" />
                {new Date(note?.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="rounded-xl h-10 px-4 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={onSave}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button 
                className="rounded-xl h-10 px-5 font-bold gradient-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                onClick={onSummarize}
                disabled={loading || !editContent.trim()}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI Summarize
              </Button>
            </div>
          </div>
        </CardHeader>

        <Tabs defaultValue="edit" className="flex-1 flex flex-col">
          <div className="px-6 border-b border-slate-100 dark:border-slate-800">
            <TabsList className="bg-transparent h-14 gap-6">
              {["edit", "summary", "points", "flashcards"].map((tab) => (
                (tab === "edit" || note?.summary) && (
                  <TabsTrigger 
                    key={tab}
                    value={tab} 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-sm font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-primary transition-all"
                  >
                    {tab === "edit" ? "Editor" : tab === "points" ? "Key Points" : tab}
                  </TabsTrigger>
                )
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-6 chat-scrollbar">
            <TabsContent value="edit" className="mt-0 focus-visible:ring-0 h-full">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Start writing your study notes..."
                className="w-full h-full min-h-[400px] bg-transparent border-none p-0 focus:outline-none resize-none text-lg leading-relaxed font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-700"
              />
            </TabsContent>

            <TabsContent value="summary" className="mt-0 focus-visible:ring-0">
              <div className="bg-slate-50 dark:bg-slate-900/50 border-l-4 border-primary p-6 rounded-xl">
                <p className="text-lg leading-relaxed font-medium text-slate-700 dark:text-slate-300 italic">
                  "{note?.summary}"
                </p>
              </div>
            </TabsContent>

            <TabsContent value="points" className="mt-0 focus-visible:ring-0">
              <div className="space-y-3">
                {note?.keyPoints?.map((point: string, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Lightbulb className="h-5 w-5" />
                    </div>
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300 self-center">{point}</p>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="flashcards" className="mt-0 focus-visible:ring-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {note?.flashcards?.map((card: any, i: number) => (
                  <div key={i} className="group h-48 perspective-1000">
                    <div className="relative h-full w-full transition-all duration-500 transform-style-3d group-hover:rotate-y-180">
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl backface-hidden shadow-sm">
                        <Badge className="mb-3 bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-wider">Question</Badge>
                        <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">{card.q}</p>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-primary text-white rounded-2xl backface-hidden rotate-y-180 shadow-lg shadow-primary/20">
                        <Badge variant="outline" className="mb-3 border-white/30 text-white text-[10px] font-bold uppercase tracking-wider">Answer</Badge>
                        <p className="text-base font-semibold leading-relaxed">{card.a}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </Card>
    </motion.div>
  );
};

// --- Main Page ---

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notes"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(fetchedNotes);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
    } else {
      setEditTitle("");
      setEditContent("");
    }
  }, [selectedNoteId, selectedNote]);

  const handleCreateNewNote = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const newNote = {
        userId: user.uid,
        title: "New Note",
        content: "",
        summary: "",
        keyPoints: [],
        flashcards: [],
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, "notes"), newNote);
      setSelectedNoteId(docRef.id);
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedNoteId || !user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "notes", selectedNoteId), {
        title: editTitle,
        content: editContent,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note.");
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!selectedNoteId || !editContent.trim() || !user) {
      alert("Please add some content to summarize.");
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, "notes", selectedNoteId), {
        title: editTitle,
        content: editContent,
      });

      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editContent })
      });
      
      if (!response.ok) throw new Error("AI Service Error");
      const aiData = await response.json();
      
      await updateDoc(doc(db, "notes", selectedNoteId), {
        summary: aiData.summary,
        keyPoints: aiData.keyPoints,
        flashcards: aiData.flashcards,
      });
    } catch (error) {
      console.error("Summarization failed:", error);
      alert("AI Summarization failed. The text might be too short or there was a server error.");
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notes", id));
      if (selectedNoteId === id) setSelectedNoteId(null);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-8rem)] p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
        {/* Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 h-full overflow-hidden">
          <NotesList 
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelect={setSelectedNoteId}
            onCreate={handleCreateNewNote}
            onDelete={deleteNote}
            loading={loading}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-8 xl:col-span-9 h-full overflow-hidden">
          <AnimatePresence mode="wait">
            {!selectedNoteId ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full flex flex-col items-center justify-center text-center bg-white/30 dark:bg-slate-900/30 rounded-[20px] border border-dashed border-slate-200 dark:border-slate-800 p-12"
              >
                <div className="h-24 w-24 bg-primary/5 rounded-[2rem] flex items-center justify-center text-primary mb-6">
                  <PenLine className="h-12 w-12" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Select a note</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8">
                  Choose a note from the sidebar or create a new one to start your AI study session.
                </p>
                <Button 
                  onClick={handleCreateNewNote}
                  className="h-14 px-8 rounded-2xl font-bold text-lg gradient-primary text-white shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New Note
                </Button>
              </motion.div>
            ) : (
              <NoteEditor 
                key={selectedNoteId}
                note={selectedNote}
                editTitle={editTitle}
                setEditTitle={setEditTitle}
                editContent={editContent}
                setEditContent={setEditContent}
                onSave={handleSaveNote}
                onSummarize={handleSummarize}
                loading={loading}
                onClose={() => setSelectedNoteId(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
