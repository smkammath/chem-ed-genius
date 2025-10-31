// ✅ backend/server.js — Final CommonJS version with fail-safe JSON
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fetch = require("node-fetch");

const app = express();

// --- Env config ---
const PORT = process.env.PORT || 10000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL_NAME || "gpt-4o-mini";
const FRONTEND_ORIGIN =
  process.env.RENDER_ORIGIN || "https://chem-ed-genius-frontend.onrender.com";

// --- Middleware ---
app.use(bodyParser.json());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

// --- Static Frontend ---
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));

// --- Helper: detect if user asked for 3D ---
function detect3D(text) {
  const t = text.toLowerCase();
  return /3d|3-d|structure|visualize|view.*3d/.test(t);
}

// --- /api/chat endpoint ---
app.post("/api/chat", async (req, res) => {
  try {
    const question = (req.body?.question || "").trim();
    if (!question)
      return res.status(400).json({ ok: false, error: "Empty question" });

    if (!OPENAI_KEY)
      return res.status(500).json({ ok: false, error: "Missing API key" });

    const show3d = detect3D(question);

    const messages = [
      {
        role: "system",
        content:
          "You are Chem-Ed Genius, an expert chemistry tutor. Explain precisely in short text. If the user mentions 3D or visualize, describe molecular shape briefly.",
      },
      { role: "user", content: question },
    ];

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errTxt = await response.text().catch(() => "<no-body>");
      return res
        .status(response.status)
        .json({ ok: false, error: "OpenAI Error", details: errTxt });
    }

    const data = await response.json().catch(() => null);
    if (!data || !data.choices || !data.choices[0]) {
      return res.status(502).json({ ok: false, error: "Empty AI response" });
    }

    const answer = data.choices[0].message.content.trim();

    // Guess molecule name for 3D
    let molQuery = null;
    if (show3d) {
      const words = question.split(/\s+/);
      molQuery = words[words.length - 1].replace(/[^A-Za-z0-9]/g, "");
    }

    return res.json({ ok: true, answer, show3d, molQuery });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
      details: err.message || "unknown",
    });
  }
});

// --- Fallback: serve frontend ---
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () =>
  console.log(`🚀 Chem-Ed Genius backend running on ${PORT}`)
);
