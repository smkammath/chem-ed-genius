// ==============================
// ✅ CHEM-ED GENIUS FINAL BACKEND
// ==============================

import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ====== CORS for Render ======
const allowedOrigin = process.env.RENDER_ORIGIN || "*";
app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

const PORT = process.env.PORT || 10000;

// ===================================
// 🧠 Helper: Determine query category
// ===================================
function detectQueryType(prompt) {
  const lower = prompt.toLowerCase();

  if (/\b(reaction|reacts with|product|equation|combine|reaction between)\b/.test(lower))
    return "reaction";
  if (/\b(structure|molecule|geometry|bond|hybridization|3d|model|shape)\b/.test(lower))
    return "molecule";
  return "concept";
}

// ===================================
// 🧪 Helper: Extract chemical keywords
// ===================================
function extractChemicals(prompt) {
  const cleaned = prompt
    .replace(
      /explain|show|reaction|structure|molecular|of|between|and|3d|model|the|what|is|chemical/gi,
      ""
    )
    .trim()
    .replace(/\s{2,}/g, " ");
  return cleaned || "unknown";
}

// ===================================
// ⚗️ Reaction database (expandable)
// ===================================
const reactionDB = {
  "copper and hcl": {
    equation: "Cu + 2HCl → CuCl₂ + H₂↑",
    explanation:
      "Copper reacts with hydrochloric acid to produce copper(II) chloride and hydrogen gas. This is a single displacement reaction where hydrogen is released as a gas.",
  },
  "zinc and hcl": {
    equation: "Zn + 2HCl → ZnCl₂ + H₂↑",
    explanation:
      "Zinc reacts vigorously with hydrochloric acid forming zinc chloride and hydrogen gas.",
  },
  "iron and hcl": {
    equation: "Fe + 2HCl → FeCl₂ + H₂↑",
    explanation:
      "Iron reacts slowly with dilute hydrochloric acid forming ferrous chloride and hydrogen gas.",
  },
  "sodium and water": {
    equation: "2Na + 2H₂O → 2NaOH + H₂↑",
    explanation:
      "Sodium reacts violently with water to form sodium hydroxide and hydrogen gas. It’s a highly exothermic reaction.",
  },
  "magnesium and hcl": {
    equation: "Mg + 2HCl → MgCl₂ + H₂↑",
    explanation:
      "Magnesium reacts with hydrochloric acid to produce magnesium chloride and hydrogen gas.",
  },
};

// ===================================
// 💬 MAIN CHAT ROUTE
// ===================================
app.post("/api/chat", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const queryType = detectQueryType(prompt);
    const subject = extractChemicals(prompt);
    let replyText = "";

    if (queryType === "reaction") {
      // --- Handle chemical reactions ---
      const reaction = reactionDB[subject.toLowerCase()];
      if (reaction) {
        replyText = `
          **Chemical Reaction:**<br>${reaction.equation}<br><br>
          **Explanation:** ${reaction.explanation}
        `;
      } else {
        replyText = `
          **Explanation:** I couldn’t find this exact reaction in my database. However, reactions like "${subject}" generally follow predictable patterns — such as combination, decomposition, displacement, or neutralization — depending on the reactants involved.
        `;
      }
    } else if (queryType === "molecule") {
      // --- Handle molecular structure queries ---
      replyText = `
        **Explanation:** The molecule **${subject}** involves covalent bonding and exhibits characteristic molecular geometry. It typically follows valence bond and hybridization principles.
      `;

      // Add 3D visualization button
      replyText += `
        <br><br><button class="view3d" onclick="show3DModel('${subject}')">View 3D</button>
      `;
    } else {
      // --- Handle conceptual chemistry queries ---
      replyText = `
        **Explanation:** The topic **${subject}** can be understood using fundamental chemistry principles such as atomic structure, electron configuration, bonding, and periodic properties.
      `;
    }

    res.json({ text: replyText });
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ===================================
// 🩺 Health Check Routes (Render Safe)
// ===================================
app.get("/", (req, res) => res.json({ status: "✅ Chem-Ed Genius backend is live" }));
app.get("/healthz", (req, res) => res.sendStatus(200));

// ===================================
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
