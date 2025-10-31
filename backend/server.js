// backend/server.js
// CommonJS so it runs with default Node + package.json unchanged

const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());

// ENV
const PORT = process.env.PORT || 10000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL_NAME = process.env.MODEL_NAME || "gpt-5-thinking-mini";
const RENDER_ORIGIN = process.env.RENDER_ORIGIN || "*";

// CORS - allow your frontend origin (set in Render env)
app.use(
  cors({
    origin: RENDER_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

// Serve frontend static files (copied into /app/frontend by Dockerfile)
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));

// Simple health
app.get("/healthz", (req, res) => res.send("OK"));

// Utility: sanitize prompt
function safeText(s) {
  if (!s) return "";
  return String(s).trim();
}

function userAsked3D(prompt) {
  if (!prompt) return false;
  const q = prompt.toLowerCase();
  return /\b(3d|3-d|view 3d|show 3d|show the 3d|view3d|view 3-d)\b/.test(q);
}

// Small built-in reaction DB to answer simple reaction requests instantly
const reactionsDB = {
  "copper and hcl": {
    eq: "Cu + 2HCl → CuCl₂ + H₂↑",
    info: "Copper reacts with hydrochloric acid to form copper(II) chloride and hydrogen gas (evolution of H₂).",
  },
  "zinc and hcl": {
    eq: "Zn + 2HCl → ZnCl₂ + H₂↑",
    info: "Zinc reacts with hydrochloric acid producing zinc chloride and hydrogen gas.",
  },
  "iron and hcl": {
    eq: "Fe + 2HCl → FeCl₂ + H₂↑",
    info: "Iron reacts with dilute hydrochloric acid to form ferrous chloride and hydrogen gas (slowly).",
  },
};

// Main API: /api/chat
app.post("/api/chat", async (req, res) => {
  try {
    const raw = safeText(req.body?.prompt || "");
    if (!raw) return res.status(400).json({ ok: false, error: "Missing prompt" });

    const q = raw.toLowerCase();

    // If it's a reaction request and we have a quick DB hit:
    const reactionKey = Object.keys(reactionsDB).find((k) => q.includes(k));
    if (q.includes("reaction") && reactionKey) {
      const r = reactionsDB[reactionKey];
      const html = `**Reaction:** ${r.eq}<br><br>**Explanation:** ${r.info}`;
      return res.json({ ok: true, reply: html, requested3D: false });
    }

    // If user explicitly wants 3D for a molecule:
    if (userAsked3D(q) || /\b(view 3d|show 3d|3d structure|3-d structure)\b/.test(q)) {
      // try to extract a short molecule token (best effort): take last words after 'of'
      let mol = raw;
      const ofIdx = raw.toLowerCase().lastIndexOf(" of ");
      if (ofIdx !== -1) mol = raw.slice(ofIdx + 4).trim();
      // fallback to whole prompt cleaned
      mol = mol.split("?")[0].split(".")[0].trim();
      if (!mol) mol = raw;

      // Return a reply with a View 3D button; frontend will attach open3D()
      const html = `**Explanation:** The molecule <strong>${mol}</strong> can be visualized in 3D. <br><br><button class="view3d" data-mol="${encodeURIComponent(
        mol
      )}">View 3D</button>`;
      return res.json({ ok: true, reply: html, requested3D: true, mol: mol });
    }

    // Otherwise: call OpenAI Chat Completion (if API key present). If no key, give a fallback safe reply.
    if (!OPENAI_API_KEY) {
      const fallback = `**Explanation:** I don't have an OpenAI key configured on the server. Provide OPENAI_API_KEY in env to enable AI answers. Meanwhile: ${escapeHtml(
        raw.slice(0, 200)
      )}`;
      return res.json({ ok: true, reply: fallback, requested3D: false });
    }

    // Call OpenAI Chat Completion
    const payload = {
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content:
            "You are 'Chem-Ed Genius' — concise, accurate chemistry explanations. If the user asks to 'show 3D' or 'view 3D', produce a short explanation and include a 'View 3D' button markup (button class 'view3d' and data-mol attribute). Otherwise produce plain explanatory text. Keep answers short (<= 300 tokens).",
        },
        { role: "user", content: raw },
      ],
      temperature: 0.2,
      max_tokens: 350,
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      timeout: 60_000,
    });

    const data = await r.json();
    const aiText = data?.choices?.[0]?.message?.content || "";
    // If OpenAI injected a request for a 3D button, we keep as-is; otherwise requested3D = false
    const has3D = /\b(view 3d|show 3d|<button class="view3d")/i.test(aiText);

    return res.json({ ok: true, reply: aiText, requested3D: has3D });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// fallback: serve index
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// small helper
function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, function (m) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
  });
}

app.listen(PORT, () => {
  console.log(`✅ Chem-Ed Genius running on port ${PORT}`);
});
