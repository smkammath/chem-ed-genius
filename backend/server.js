import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ======================================================
   HELPER: Chemistry filter
====================================================== */
function isChemistryRelated(prompt) {
  const chemKeywords = fs
    .readFileSync("chem_keywords.txt", "utf-8")
    .split("\n")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const lower = prompt.toLowerCase();

  // Match chemistry keywords
  const hasKeyword = chemKeywords.some((word) => lower.includes(word));

  // Match molecular formulas like H2O, CO2, CH3OH, NaCl, etc.
  const formulaPattern = /\b[A-Z][a-z]?\d*\b/g;
  const hasFormula = formulaPattern.test(prompt);

  return hasKeyword || hasFormula;
}

/* ======================================================
   ROUTE: /api/chat
====================================================== */
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.body;

    // Check chemistry relevance
    if (!isChemistryRelated(prompt)) {
      return res.json({
        message:
          "⚠️ I'm Chem-Ed Genius 🧪 — I only answer chemistry-related topics: atoms, molecules, reactions, bonding, chemical engineering, spectroscopy, formulas, balancing, and related subjects. Please ask a chemistry question.",
      });
    }

    // Generate chemistry-specific explanation
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are Chem-Ed Genius 🧪 — an AI chemistry tutor that explains chemistry clearly, using LaTeX for formulas and `\\ce{}` for chemical notation (KaTeX mhchem compatible).",
        },
        { role: "user", content: prompt },
      ],
    });

    let output = completion.choices[0].message.content;

    // Auto-convert plain formulas like CH3OH → \ce{CH3OH}
    output = output.replace(/\b([A-Z][a-z]?\d*)+\b/g, (match) =>
      match.length < 8 ? `\\ce{${match}}` : match
    );

    res.json({ message: output });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

/* ======================================================
   ROUTE: /api/visualize
   Fetch molecule SDF from PubChem
====================================================== */
app.post("/api/visualize", async (req, res) => {
  try {
    const { molecule } = req.body;

    const resp = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
        molecule
      )}/SDF?record_type=3d`
    );

    if (!resp.ok) throw new Error("PubChem fetch failed");
    const sdf = await resp.text();

    res.json({ sdf });
  } catch (err) {
    console.error("Visualization error:", err);
    res.status(500).json({ message: "Unable to fetch 3D structure." });
  }
});

/* ======================================================
   ROUTE: /healthz
====================================================== */
app.get("/healthz", (req, res) => res.status(200).send("OK"));

/* ======================================================
   START SERVER
====================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ Chem-Ed Genius backend running on port ${PORT}`)
);
