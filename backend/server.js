// ====================================
// ✅ FINAL BACKEND for Chem-Ed Genius
// Render + OpenAI + MolView Safe
// ====================================

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || "gpt-5-thinking-mini";
const RENDER_ORIGIN = process.env.RENDER_ORIGIN || "*";

// --- Allow frontend ---
app.use(
  cors({
    origin: RENDER_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

// --- Health check ---
app.get("/ping", (req, res) => res.json({ ok: true }));
app.get("/healthz", (req, res) => res.sendStatus(200));

// --- Utility to clean molecule names ---
function extractMolecule(prompt) {
  return prompt
    .replace(/(give|show|explain|structure|molecular|3d|of|the|for|model|visualize|view|draw)/gi, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// --- Chemical reaction examples ---
const reactions = {
  "copper and hcl": {
    eq: "Cu + 2HCl → CuCl₂ + H₂↑",
    info: "Copper reacts with hydrochloric acid forming copper(II) chloride and hydrogen gas.",
  },
  "zinc and hcl": {
    eq: "Zn + 2HCl → ZnCl₂ + H₂↑",
    info: "Zinc reacts with hydrochloric acid to form zinc chloride and hydrogen gas.",
  },
  "iron and hcl": {
    eq: "Fe + 2HCl → FeCl₂ + H₂↑",
    info: "Iron slowly reacts with dilute HCl forming ferrous chloride and hydrogen gas.",
  },
  "sodium and water": {
    eq: "2Na + 2H₂O → 2NaOH + H₂↑",
    info: "Sodium reacts violently with water forming sodium hydroxide and hydrogen gas.",
  },
};

// --- Main Chat Endpoint ---
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string")
    return res.status(400).json({ ok: false, error: "Missing or invalid prompt" });

  const query = prompt.toLowerCase();
  let reply = "";

  try {
    // Reaction intent
    if (query.includes("reaction")) {
      const key = Object.keys(reactions).find((r) => query.includes(r));
      if (key) {
        const r = reactions[key];
        reply = `**Reaction:** ${r.eq}<br><br>**Explanation:** ${r.info}`;
      } else {
        reply = `**Explanation:** I couldn’t find that exact reaction. However, reactions like "${prompt}" typically follow patterns like combination, displacement, or decomposition depending on the reactants.`;
      }
    }
    // Molecular structure intent
    else if (/structure|molecule|geometry|3d|bond|model/.test(query)) {
      const mol = extractMolecule(prompt);
      reply = `**Explanation:** The molecule **${mol}** involves covalent bonding and exhibits characteristic molecular geometry following valence bond and hybridization principles.<br><br><button class="view3d" onclick="open3D('${mol}')">View 3D</button>`;
    }
    // Generic chemistry explanation
    else {
      const data = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            {
              role: "system",
              content: "You are Chem-Ed Genius, a concise but detailed chemistry explainer.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      const json = await data.json();
      const text = json?.choices?.[0]?.message?.content || null;
      reply = text
        ? text
        : "⚠️ The AI didn’t return a valid answer. Try rephrasing your question.";
    }

    res.json({ ok: true, reply });
  } catch (err) {
    console.error("❌ Backend error:", err);
    res.status(500).json({
      ok: false,
      error: "Internal server error while processing your request.",
    });
  }
});

// --- Default route ---
app.get("/", (_, res) => res.json({ status: "✅ Chem-Ed Genius backend active" }));

app.listen(PORT, () =>
  console.log(`🚀 Chem-Ed Genius running on port ${PORT}`)
);
