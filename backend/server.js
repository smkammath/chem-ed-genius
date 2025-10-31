// backend/server.js (ESM version - works with "type": "module")
import path from "path";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

// Needed for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// ENV
const PORT = process.env.PORT || 10000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL_NAME = process.env.MODEL_NAME || "gpt-5-thinking-mini";
const RENDER_ORIGIN = process.env.RENDER_ORIGIN || "*";

// CORS
app.use(
  cors({
    origin: RENDER_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

// Serve frontend (copied by Dockerfile)
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));

app.get("/healthz", (req, res) => res.send("✅ OK"));

// Helpers
function safeText(s) {
  return s ? String(s).trim() : "";
}

function userAsked3D(prompt) {
  if (!prompt) return false;
  const q = prompt.toLowerCase();
  return /\b(3d|3-d|view 3d|show 3d|show the 3d|view3d|view 3-d)\b/.test(q);
}

const reactionsDB = {
  "copper and hcl": {
    eq: "Cu + 2HCl → CuCl₂ + H₂↑",
    info: "Copper reacts with hydrochloric acid to form copper(II) chloride and hydrogen gas.",
  },
  "zinc and hcl": {
    eq: "Zn + 2HCl → ZnCl₂ + H₂↑",
    info: "Zinc reacts with hydrochloric acid producing zinc chloride and hydrogen gas.",
  },
  "iron and hcl": {
    eq: "Fe + 2HCl → FeCl₂ + H₂↑",
    info: "Iron reacts with dilute hydrochloric acid to form ferrous chloride and hydrogen gas.",
  },
};

// Main API
app.post("/api/chat", async (req, res) => {
  try {
    const raw = safeText(req.body?.prompt || "");
    if (!raw) return res.status(400).json({ ok: false, error: "Missing prompt" });

    const q = raw.toLowerCase();

    // Reaction from DB
    const reactionKey = Object.keys(reactionsDB).find((k) => q.includes(k));
    if (q.includes("reaction") && reactionKey) {
      const r = reactionsDB[reactionKey];
      const html = `**Reaction:** ${r.eq}<br><br>**Explanation:** ${r.info}`;
      return res.json({ ok: true, reply: html });
    }

    // 3D request
    if (userAsked3D(q)) {
      let mol = raw;
      const ofIdx = raw.toLowerCase().lastIndexOf(" of ");
      if (ofIdx !== -1) mol = raw.slice(ofIdx + 4).trim();
      mol = mol.split("?")[0].split(".")[0].trim() || raw;

      const html = `**Explanation:** The molecule <strong>${mol}</strong> can be visualized in 3D.<br><br><button class="view3d" data-mol="${encodeURIComponent(
        mol
      )}">View 3D</button>`;
      return res.json({ ok: true, reply: html });
    }

    // OpenAI fallback
    if (!OPENAI_API_KEY) {
      return res.json({
        ok: true,
        reply:
          "⚠️ OPENAI_API_KEY missing — AI explanations unavailable. Please set it in Render environment variables.",
      });
    }

    const payload = {
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content:
            "You are Chem-Ed Genius, an AI chemistry tutor. Be concise, clear, and scientific.",
        },
        { role: "user", content: raw },
      ],
      temperature: 0.4,
      max_tokens: 350,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "⚠️ No AI response.";
    res.json({ ok: true, reply: text });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Chem-Ed Genius running on port ${PORT}`);
});
