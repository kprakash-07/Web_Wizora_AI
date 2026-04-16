import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import multer from "multer";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.post("/api/upload-pdf", upload.single("pdf"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const data = await pdf(req.file.buffer);
      res.json({ text: data.text });
    } catch (error: any) {
      console.error("PDF Extraction Error:", error);
      res.status(500).json({ error: "Failed to extract text from PDF" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model = "llama-3.3-70b-versatile" } = req.body;
      
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
      }

      const completion = await groq.chat.completions.create({
        messages,
        model,
        temperature: 0.7,
        max_tokens: 1024,
      });

      res.json(completion.choices[0].message);
    } catch (error: any) {
      console.error("Groq API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/summarize", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
      }

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful study assistant. Summarize the following text into key points and create 3 flashcards (Question/Answer). Format as JSON: { \"summary\": \"...\", \"keyPoints\": [\"...\"], \"flashcards\": [{ \"q\": \"...\", \"a\": \"...\" }] }",
          },
          {
            role: "user",
            content: text,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      res.json(JSON.parse(completion.choices[0].message.content || "{}"));
    } catch (error: any) {
      console.error("Groq API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/quiz", async (req, res) => {
    try {
      const { topic } = req.body;
      
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
      }

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a quiz generator. Generate 5 multiple choice questions about the given topic. Format as JSON: { \"questions\": [{ \"q\": \"...\", \"options\": [\"...\"], \"correct\": 0 }] }",
          },
          {
            role: "user",
            content: topic,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      res.json(JSON.parse(completion.choices[0].message.content || "{}"));
    } catch (error: any) {
      console.error("Groq API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/planner", async (req, res) => {
    try {
      const { examDate, subjects, hoursPerDay } = req.body;
      
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
      }

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a study planner. Create a daily study schedule and a weekly roadmap based on the exam date, subjects, and available hours. Format as JSON: { \"dailyPlan\": [{ \"time\": \"...\", \"task\": \"...\" }], \"weeklyRoadmap\": [{ \"day\": \"...\", \"focus\": \"...\" }] }",
          },
          {
            role: "user",
            content: `Exam Date: ${examDate}, Subjects: ${subjects.join(", ")}, Hours/Day: ${hoursPerDay}`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      res.json(JSON.parse(completion.choices[0].message.content || "{}"));
    } catch (error: any) {
      console.error("Groq API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer();

export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
