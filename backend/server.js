// backend/server.js — FINAL ESM version for Render + FastAPI-safe backend
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// 🔧 Environment Config
const PORT = process.env.PORT || 10000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL_NAME = process.env.MODEL_NAME || "gpt-4o-mini";
const RENDER_ORIGIN = process.env.RENDER_ORIGIN || "*";

// 🧩 CORS setup for frontend
app.use(
  cors({
    origin: RENDER_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

// Serve frontend
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));

// ✅ Health check
app.get("/healthz", (req, res) => res.send("✅ Chem-Ed Genius backend running fine!"));

// Helper: Clean text
function sanitize(s) {
  return s ? String(s).trim() : "";
}

// 🔬 Local chemistry DB (for instant lookups)
const reactionsDB = {
  "zinc and hcl": {
    eq: "Zn + 2HCl → ZnCl₂ + H₂↑",
    info: "Zinc reacts with hydrochloric acid to form zinc chloride and hydrogen gas.",
  },
  "iron and hcl": {
    eq: "Fe + 2HCl → FeCl₂ + H₂↑",
    info: "Iron reacts with hydrochloric acid to form ferrous chloride and hydrogen gas.",
  },
  "copper and hcl": {
    eq: "No visible reaction",
    info: "Copper does not react with dilute hydrochloric acid under normal conditions because it lies below hydrogen in the reactivity series.",
  },
};

// 🧠 Chat route
app.post("/api/chat", async (req, res) => {
  try {
    const prompt = sanitize(req.body?.prompt || "");
    if (!prompt) return res.status(400).json({ ok: false, error: "Missing prompt" });

    const lower = prompt.toLowerCase();

    // Direct DB match
    const reactionKey = Object.keys(reactionsDB).find((k) => lower.includes(k));
    if (reactionKey) {
      const { eq, info } = reactionsDB[reactionKey];
      return res.json({
        ok: true,
        reply: `**Reaction:** ${eq}<br><br>**Explanation:** ${info}`,
      });
    }

    // Detect 3D request
    const is3D = /\b(3d|show 3d|view 3d|molecular structure)\b/i.test(prompt);
    if (is3D) {
      const molName = prompt.split("of").pop().trim();
      const html = `**Explanation:** The molecule <strong>${molName}</strong> can be visualized in 3D.<br><br><button class="view3d" data-mol="${encodeURIComponent(
        molName
      )}">View 3D</button>`;
      return res.json({ ok: true, reply: html });
    }

    // AI fallback (OpenAI)
    if (!OPENAI_API_KEY)
      return res.json({
        ok: true,
        reply:
          "⚠️ AI not active — please configure OPENAI_API_KEY in Render environment variables.",
      });

    const payload = {
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content:
            "You are Chem-Ed Genius, an AI chemistry tutor. Explain clearly, step-by-step, with equations and hybridization details.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 300,
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() || "⚠️ No AI response.";
    return res.json({ ok: true, reply: answer });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

// Frontend fallback
app.get("*", (req, res) => res.sendFile(path.join(frontendPath, "index.html")));

app.listen(PORT, () => console.log(`🚀 Chem-Ed Genius running on port ${PORT}`));
