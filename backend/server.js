import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME || "gpt-5-thinking-mini";
const RENDER_ORIGIN = process.env.RENDER_ORIGIN || "*";

app.use(
  cors({
    origin: RENDER_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

app.get("/ping", (_, res) => res.json({ ok: true }));
app.get("/healthz", (_, res) => res.send("✅ Backend is healthy"));

function extractMolecule(prompt) {
  return prompt
    .replace(/(give|show|draw|explain|3d|structure|model|of|the|molecular)/gi, "")
    .trim()
    .replace(/\s+/g, " ");
}

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
};

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ ok: false, error: "Missing prompt" });

  const q = prompt.toLowerCase();
  let reply = "";

  try {
    // Reaction-based
    if (q.includes("reaction")) {
      const key = Object.keys(reactions).find((r) => q.includes(r));
      if (key) {
        const r = reactions[key];
        reply = `**Reaction:** ${r.eq}<br><br>**Explanation:** ${r.info}`;
      } else {
        reply =
          "**Explanation:** I couldn’t find that exact reaction, but it likely involves standard chemical behavior such as combination, displacement, or neutralization.";
      }
    }
    // Structure-based
    else if (/structure|molecule|geometry|bond|3d|model/.test(q)) {
      const mol = extractMolecule(prompt);
      reply = `**Explanation:** The molecule **${mol}** involves covalent bonding and exhibits characteristic molecular geometry.<br><br><button class="view3d" onclick="open3D('${mol}')">View 3D</button>`;
    }
    // General chemistry prompt
    else {
      const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            {
              role: "system",
              content: "You are Chem-Ed Genius, a concise chemistry explainer.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 300,
        }),
      });

      const data = await apiRes.json();
      reply =
        data?.choices?.[0]?.message?.content ||
        "⚠️ AI response unavailable. Try again.";
    }

    res.json({ ok: true, reply });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ ok: false, error: "Internal error" });
  }
});

app.get("/", (_, res) => res.json({ status: "✅ Chem-Ed Genius active" }));
app.listen(PORT, () => console.log(`🚀 Backend on port ${PORT}`));
