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
  Clock,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenAI, Type } from "@google/genai";

// --- Sub-components ---

const NoteCard = ({ note, isActive, onClick, onDelete }: any) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ translateY: -2 }}
    onClick={onClick}
    className={`p-3 rounded-[12px] cursor-pointer transition-all duration-200 border group relative mb-[10px] ${
      isActive 
        ? "bg-[#EEF2FF] border-[#6366F1] dark:bg-[#1E293B] dark:border-primary shadow-soft" 
        : "bg-white border-[#E2E8F0] hover:shadow-[0_6px_14px_rgba(0,0,0,0.06)] dark:bg-transparent dark:border-transparent dark:hover:bg-white/5"
    }`}
  >
    <div className="flex justify-between items-start mb-1">
      <h3 className={`font-bold text-sm truncate pr-6 ${isActive ? "text-[#6366F1] dark:text-primary" : "text-[#0F172A] dark:text-slate-100"}`}>
        {note.title || "Untitled Note"}
      </h3>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
        className="p-1 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
    <p className="text-[11px] text-[#64748B] dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
      {note.summary || note.content || "No content yet..."}
    </p>
    <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-400 uppercase tracking-wider">
      <Clock className="h-2.5 w-2.5" />
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
    <div className="flex flex-col h-full gap-4 bg-white dark:bg-transparent border-r border-[#E2E8F0] dark:border-transparent pr-4">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-bold text-[#0F172A] dark:text-white">My Notes</h1>
        <Button 
          onClick={onCreate}
          disabled={loading}
          className="h-9 w-9 rounded-[12px] bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white shadow-lg hover:scale-[1.05] transition-all border-none"
          size="icon"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Search notes..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-10 rounded-[12px] bg-[#F1F5F9] dark:bg-[#1E293B] border-none focus-visible:ring-2 focus-visible:ring-[#6366F1] dark:focus-visible:ring-primary"
        />
      </div>

      <ScrollArea className="flex-1 -mx-1 px-1 chat-scrollbar">
        <div className="pb-4">
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
              <div className="h-14 w-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                <FileText className="h-7 w-7" />
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
      <Card className="flex-1 flex flex-col overflow-hidden border-dashed border-[#CBD5F5] dark:border-none shadow-soft bg-white dark:bg-[#1E1E1E] rounded-[16px]">
        <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <input 
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-2xl font-bold bg-transparent border-none p-0 h-auto focus:outline-none w-full text-[#0F172A] dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                placeholder="Note Title"
              />
              <div className="flex items-center gap-2 mt-2 text-slate-400 font-medium text-xs">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(note?.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                className="rounded-xl h-9 px-4 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={onSave}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button 
                className="rounded-xl h-9 px-5 font-bold bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white shadow-lg hover:scale-[1.05] transition-all border-none"
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
            <TabsList className="bg-transparent h-12 gap-6">
              {["edit", "summary", "points", "flashcards"].map((tab) => (
                (tab === "edit" || note?.summary) && (
                  <TabsTrigger 
                    key={tab}
                    value={tab} 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#6366F1] dark:data-[state=active]:border-primary rounded-none h-full px-0 text-xs font-bold uppercase tracking-wider text-slate-400 data-[state=active]:text-[#6366F1] dark:data-[state=active]:text-primary transition-all"
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
                className="w-full h-full min-h-[400px] bg-transparent border-none p-0 focus:outline-none resize-none text-base leading-relaxed font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-700"
              />
            </TabsContent>

            <TabsContent value="summary" className="mt-0 focus-visible:ring-0">
              <div className="bg-[#EEF2FF] dark:bg-slate-900/50 border-l-4 border-[#6366F1] dark:border-primary p-6 rounded-xl">
                <p className="text-base leading-relaxed font-medium text-slate-700 dark:text-slate-300 italic">
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
                    <div className="h-7 w-7 rounded-lg bg-[#EEF2FF] dark:bg-primary/10 text-[#6366F1] dark:text-primary flex items-center justify-center shrink-0">
                      <Lightbulb className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 self-center">{point}</p>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="flashcards" className="mt-0 focus-visible:ring-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {note?.flashcards?.map((card: any, i: number) => (
                  <div key={i} className="group h-44 perspective-1000">
                    <div className="relative h-full w-full transition-all duration-500 transform-style-3d group-hover:rotate-y-180">
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl backface-hidden shadow-sm">
                        <Badge className="mb-2 bg-[#EEF2FF] dark:bg-primary/10 text-[#6366F1] dark:text-primary border-none text-[9px] font-bold uppercase tracking-wider">Question</Badge>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{card.q}</p>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#6366F1] dark:bg-primary text-white rounded-2xl backface-hidden rotate-y-180 shadow-lg shadow-[#6366F1]/20 dark:shadow-primary/20">
                        <Badge variant="outline" className="mb-2 border-white/30 text-white text-[9px] font-bold uppercase tracking-wider">Answer</Badge>
                        <p className="text-sm font-semibold leading-relaxed">{card.a}</p>
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

  const ai = React.useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" }), []);

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
      // First save current content
      await updateDoc(doc(db, "notes", selectedNoteId), {
        title: editTitle,
        content: editContent,
      });

      const prompt = `Summarize the following study notes and extract key points and flashcards. Note content: ${editContent}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              keyPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    q: { type: Type.STRING },
                    a: { type: Type.STRING }
                  },
                  required: ["q", "a"]
                }
              }
            },
            required: ["summary", "keyPoints", "flashcards"]
          }
        }
      });
      
      const aiData = JSON.parse(response.text || "{}");
      
      await updateDoc(doc(db, "notes", selectedNoteId), {
        summary: aiData.summary,
        keyPoints: aiData.keyPoints,
        flashcards: aiData.flashcards,
        updatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Summarization failed:", error);
      alert(`AI Summarization failed: ${error.message || "An unexpected error occurred."}`);
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
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-8rem)] p-4 md:p-6 bg-[#F8FAFC] dark:bg-transparent rounded-3xl">
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
                className="h-full flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900/30 rounded-[16px] border border-dashed border-[#CBD5F5] dark:border-slate-800 p-12"
              >
                <div className="h-20 w-20 bg-[#EEF2FF] dark:bg-primary/10 rounded-[2rem] flex items-center justify-center text-[#6366F1] dark:text-primary mb-6">
                  <PenLine className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white mb-2">Select a note</h2>
                <p className="text-[#64748B] dark:text-slate-400 max-w-sm mx-auto mb-8">
                  Choose a note from the sidebar or create a new one to start your AI study session.
                </p>
                <Button 
                  onClick={handleCreateNewNote}
                  className="h-12 px-8 rounded-[12px] font-bold text-base bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white shadow-xl hover:scale-[1.05] transition-all border-none"
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
