import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Smarter chemistry relevance filter
function isChemistryRelated(question) {
  const chemKeywords = [
    "atom",
    "molecule",
    "compound",
    "bond",
    "reaction",
    "oxidation",
    "acid",
    "base",
    "salt",
    "catalyst",
    "enthalpy",
    "organic",
    "inorganic",
    "periodic",
    "ion",
    "electron",
    "valence",
    "orbitals",
    "hybridization",
    "isomer",
    "stoichiometry",
    "chemical",
    "bonding",
    "atomic",
    "molecular",
    "equation",
    "balance",
    "formula",
    "mass",
    "energy",
    "chemistry",
  ];

  const lowerQ = question.toLowerCase();
  const hasSymbols = /[A-Z][a-z]?\d*/.test(question); // detects chemical symbols like C2H6
  return chemKeywords.some((word) => lowerQ.includes(word)) || hasSymbols;
}

// ✅ Chat route
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ message: "No question provided." });

  if (!isChemistryRelated(prompt)) {
    return res.json({
      message:
        "⚠️ I'm Chem-Ed Genius 🔬 — I only answer chemistry-related questions (atoms, molecules, reactions, bonding, and chemical engineering).",
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Chem-Ed Genius, a professional chemistry AI tutor. Answer only chemistry-related questions. When a chemical equation is given, balance it and explain it in LaTeX format. Keep answers clear and educational.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 900,
    });

    res.json({ message: response.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
