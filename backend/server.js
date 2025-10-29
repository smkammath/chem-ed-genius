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

// ✅ Chemistry-only topic filter
function isChemistryRelated(question) {
  const chemKeywords = [
    "atom",
    "molecule",
    "compound",
    "element",
    "bond",
    "reaction",
    "equation",
    "oxidation",
    "reduction",
    "acid",
    "base",
    "salt",
    "catalyst",
    "enthalpy",
    "entropy",
    "organic",
    "inorganic",
    "ion",
    "electron",
    "valence",
    "orbitals",
    "hybridization",
    "isomer",
    "stoichiometry",
    "chemical",
    "thermodynamics",
    "kinetics",
    "structure",
    "spectroscopy",
    "titration",
    "mole",
    "Avogadro",
    "mass",
    "energy",
    "bonding",
    "atomic",
    "molecular",
    "phase",
    "chemistry",
    "chemical engineering",
  ];

  const lowerQ = question.toLowerCase();
  return chemKeywords.some((word) => lowerQ.includes(word));
}

// ✅ POST /api/chat
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt)
    return res.status(400).json({ message: "No question provided." });

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
            "You are Chem-Ed Genius, an AI tutor that strictly answers chemistry-related questions. If a user asks anything outside chemistry or chemical engineering, respond with: '⚠️ I'm Chem-Ed Genius 🔬 — I only answer chemistry-related questions.'",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    res.json({ message: response.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
