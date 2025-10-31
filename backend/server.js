// ✅ backend/server.js — Final CommonJS Version for Render

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(bodyParser.json());

// --- CORS setup ---
const allowedOrigin = process.env.RENDER_ORIGIN || process.env.FRONTEND_ORIGIN || "*";
app.use(
  cors({
    origin: allowedOrigin === "*" ? "*" : allowedOrigin,
  })
);

// --- Serve frontend static files ---
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));

// --- Health check endpoint ---
app.get("/api/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// --- Helper functions ---
function wants3D(question) {
  if (!question || typeof question !== "string") return false;
  const q = question.toLowerCase();
  const re = /\b(3d|3-d|show\s+3d|view\s+3d|visualize\s+3d|display\s+3d|show\s+3-d|view\s+3-d)\b/i;
  if (re.test(q)) return true;
  if (q.includes("structure in 3d") || q.includes("structure 3d")) return true;
  return false;
}

function makeMolQuery(question) {
  if (!question) return null;
  const ofMatch = question.match(/(?:of|for)\s+([A-Za-z0-9\-+()]+)/i);
  if (ofMatch && ofMatch[1]) return ofMatch[1];
  const words = question.trim().split(/\s+/).map((w) => w.replace(/[^\w\-\+\(\)]/g, ""));
  if (words.length === 0) return null;
  return words.slice(-1)[0];
}

// --- Main AI Endpoint ---
app.post("/api/chat", async (req, res) => {
  try {
    const question = req.body?.question?.toString() || "";
    if (!question) return res.status(400).json({ error: "empty_question" });

    const show3d = wants3D(question);
    const molQuery = show3d ? makeMolQuery(question) : null;

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const MODEL_NAME = process.env.MODEL_NAME || "gpt-4o-mini";

    if (!OPENAI_KEY) {
      console.error("❌ Missing OPENAI_API_KEY");
      return res.status(500).json({ error: "server_misconfigured" });
    }

    const systemPrompt = `
You are Chem-Ed Genius — a chemistry AI tutor. 
Be accurate, brief, and respond only with chemistry explanations.
`;

    const payload = {
      model: MODEL_NAME,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "<no-body>");
      console.error("OpenAI error", r.status, text);
      return res.status(502).json({ error: "openai_error", status: r.status, body: text });
    }

    const json = await r.json().catch(() => null);
    let answer = "";

    if (json?.output?.length) {
      answer = json.output
        .map((o) => {
          if (typeof o === "string") return o;
          if (Array.isArray(o.content)) return o.content.map((c) => c.text || c).join(" ");
          return o.content?.text || JSON.stringify(o.content);
        })
        .join("\n\n")
        .trim();
    } else if (json?.choices?.[0]?.message?.content) {
      answer = json.choices[0].message.content;
    } else {
      answer = "Sorry — I couldn't parse the AI response.";
    }

    res.json({
      ok: true,
      answer,
      show3d,
      molQuery,
    });
  } catch (err) {
    console.error("Server error /api/chat", err);
    res.status(500).json({ error: "internal_error", message: err.message });
  }
});

// --- SPA fallback ---
app.get("*", (req, res) => {
  const indexPath = path.join(frontendPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).send("Frontend not deployed.");
  });
});

// --- Start server ---
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`🚀 Chem-Ed Genius running on port ${port}`));
