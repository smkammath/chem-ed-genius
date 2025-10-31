// ✅ Chem-Ed Genius — Backend Server (ESM version)
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 10000;

// Enable CORS for your frontend
app.use(
  cors({
    origin: process.env.RENDER_ORIGIN || "*",
  })
);

app.use(bodyParser.json());

// Initialize OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get("/", (req, res) => {
  res.send("✅ Chem-Ed Genius backend is live!");
});

// Main API endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ ok: false, error: "Missing 'question' field." });
    }

    const moleculeMatch = question.match(/show\s+3d\s+structure\s+of\s+([A-Za-z0-9]+)/i);
    const show3d = !!moleculeMatch;
    const molQuery = moleculeMatch ? moleculeMatch[1] : null;

    const prompt = `
You are Chem-Ed Genius, an AI chemistry tutor.
Provide clear, exam-level explanations for chemistry questions.
If user asks for a molecule visualization, mention it can be seen in 3D via MolView.
Question: ${question}
`;

    const completion = await openai.chat.completions.create({
      model: process.env.MODEL_NAME || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || "No response generated.";

    res.json({
      ok: true,
      answer,
      show3d,
      molQuery,
    });
  } catch (err) {
    console.error("🔥 Server error:", err);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: err.message,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Chem-Ed Genius backend running on port ${PORT}`);
});
