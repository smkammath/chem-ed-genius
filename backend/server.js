// =======================================
//  CHEM-ED GENIUS BACKEND ⚗️
//  Author: Madhu (smkammath)
//  Purpose: AI-powered Chemistry Education API
// =======================================

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Fix for Render reverse proxy (important!)
app.set("trust proxy", 1);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ✅ Health check route
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ✅ OpenAI Setup
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY in environment variables!");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Core Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { grade, mode, prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    // Create the system prompt dynamically
    const systemPrompt = `
    You are CHEM-ED GENIUS ⚗️, a friendly AI Chemistry tutor.
    Adapt your explanations based on the student's level: ${grade}.
    Focus mode: ${mode}.

    Objectives:
    - Explain chemistry clearly and visually.
    - Use analogies and diagrams when helpful.
    - Never hallucinate or give unsafe experimental info.
    - Equations must be IUPAC-compliant.
    - Show key points at the end if possible.
    `;

    // ✅ Call OpenAI model
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content.trim();

    res.json({
      message: reply,
      summary: "Explained by Chem-Ed Genius 🔬",
    });
  } catch (err) {
    console.error("❌ Chat endpoint error:", err.message);
    res.status(500).json({ error: "Server Error: " + err.message });
  }
});

// ✅ 404 fallback (optional)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
