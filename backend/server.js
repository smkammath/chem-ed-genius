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

function isChemistryRelated(question) {
  const chemKeywords = [
    "atom", "molecule", "compound", "reaction", "oxidation", "bond",
    "acid", "base", "ion", "electron", "valence", "hybridization",
    "chemical", "equation", "balance", "formula", "structure",
    "organic", "inorganic", "enthalpy", "chemistry",
  ];

  const lowerQ = question.toLowerCase();
  const hasSymbols = /[A-Z][a-z]?\d*/.test(question);
  return chemKeywords.some((word) => lowerQ.includes(word)) || hasSymbols;
}

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
          content: `
            You are Chem-Ed Genius, an expert chemistry tutor.
            You only answer chemistry-related questions.
            Always write all chemical equations and symbols using KaTeX syntax, enclosed in $ or $$.
            Example: "To balance $$C_2H_6 + O_2 \\rightarrow CO_2 + H_2O$$"
            Avoid using \\text{} for chemical symbols. 
            Keep responses neatly formatted in Markdown + KaTeX.
          `,
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
