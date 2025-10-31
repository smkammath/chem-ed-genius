// backend/server.js (CommonJS)
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 10000;
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const MODEL_NAME = process.env.MODEL_NAME || "gpt-5-thinking-mini";
const RENDER_ORIGIN = process.env.RENDER_ORIGIN || "*";

// CORS: restrict if RENDER_ORIGIN provided else allow all
app.use(
  cors({
    origin: RENDER_ORIGIN === "*" ? true : RENDER_ORIGIN,
  })
);

app.use(bodyParser.json({ limit: "200kb" }));

// Serve frontend static files (assumes Dockerfile copied frontend to backend/frontend)
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));

// Utility: call OpenAI Chat Completions (simple REST)
async function callOpenAIChat(messages) {
  if (!OPENAI_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const url = "https://api.openai.com/v1/chat/completions";
  const payload = {
    model: MODEL_NAME,
    messages,
    max_tokens: 600,
    temperature: 0.2,
    stream: false,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  // defensive: pull message text
  const assistant = data?.choices?.[0]?.message?.content ?? "";
  return assistant;
}

// POST /api/chat
// body: { question: "..." }
app.post("/api/chat", async (req, res) => {
  try {
    const question = (req.body && String(req.body.question || "")).trim();
    if (!question) {
      return res.status(400).json({ ok: false, error: "Empty question" });
    }

    // Build system + user messages
    const systemMsg = {
      role: "system",
      content:
        "You are Chem-Ed Genius: Strictly chemistry. When user asks '3D' or 'show 3D' or 'visualize' return a short explanatory answer and add a JSON marker 'SHOW3D: <molecule>' at the end on a new line (for the frontend to show viewer). Otherwise only provide the explanation text.",
    };

    const userMsg = { role: "user", content: question };

    // call OpenAI
    let assistantText = "";
    try {
      assistantText = await callOpenAIChat([systemMsg, userMsg]);
    } catch (err) {
      console.error("OpenAI call error:", err?.message || err);
      return res
        .status(502)
        .json({ ok: false, error: "No AI response", details: err.message });
    }

    // Detect if user asked for 3D (simple heuristics)
    const lowerQ = question.toLowerCase();
    let wants3D = false;
    if (
      /3d|3-d|show.*3d|visualiz|visualise|visualize|mol(ecule)?.*3d|view.*3d/i.test(
        question
      ) ||
      /\bshow\b.*\bstructure\b/i.test(question)
    ) {
      wants3D = true;
    }

    // If wants 3D, attempt to extract a molecule query (simple heuristic)
    let molQuery = null;
    if (wants3D) {
      // Try to find a chemical formula or molecule name near the question
      // look for patterns like 'of ethanol', 'CH3OH', 'HCl', 'ethanol'
      const formulaMatch = question.match(
        /([A-Z][a-z]?[\d]*[A-Z]?[a-z]?\d*|[A-Za-z]+(?:-[A-Za-z]+)?)/g
      );
      if (formulaMatch && formulaMatch.length) {
        // choose last word (likely target) but filter common words
        const candidates = formulaMatch.filter(
          (w) =>
            !/^(explain|show|structure|the|of|in|molecular|give|visualize|display|3d|3-d|what|when|how|with|and|for)$/.test(
              w.toLowerCase()
            )
        );
        if (candidates.length) {
          // prefer ones containing letters/digits typical of formulas or names
          molQuery = candidates[candidates.length - 1];
        } else {
          molQuery = formulaMatch[formulaMatch.length - 1];
        }
      }
      if (!molQuery) molQuery = question.split(" ").slice(-1)[0];
    }

    // Final response
    const response = {
      ok: true,
      answer: assistantText.trim(),
      show3d: wants3D && Boolean(molQuery),
      molQuery: molQuery ? String(molQuery).trim() : null,
    };

    return res.json(response);
  } catch (err) {
    console.error("Server /api/chat err:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// fallback: serve index.html for frontend routes (SPA)
app.get("*", (req, res) => {
  const indexHtml = path.join(frontendPath, "index.html");
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(500).send("Frontend not found");
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Chem-Ed Genius running on port ${PORT}`);
});
