import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;

// ✅ Trust Render's proxy
app.set("trust proxy", 1);

app.use(cors());
app.use(bodyParser.json());

// === Rate limiter to prevent abuse ===
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
});
app.use(limiter);

// === Health check endpoint ===
app.get("/api/health", (req, res) => res.json({ ok: true }));

// === OpenAI setup ===
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === Utility: detect if a query is chemistry-related ===
function isChemistryRelated(prompt) {
  const chemistryKeywords = [
    "atom", "bond", "molecule", "reaction", "oxidation", "reduction", "acid",
    "base", "ph", "periodic", "ionic", "covalent", "hybridization", "stoichiometry",
    "chemical", "element", "compound", "equilibrium", "redox", "catalyst",
    "orbitals", "valence", "organic", "inorganic", "physical chemistry",
    "reaction mechanism", "molar", "atomic", "ion", "electron", "gas law",
    "thermodynamics", "enthalpy", "entropy", "kinetics"
  ];

  const normalized = prompt.toLowerCase();
  return chemistryKeywords.some(keyword => normalized.includes(keyword));
}

// === Chat route ===
app.post("/api/chat", async (req, res) => {
  try {
    const { grade, mode, prompt } = req.body;

    // === Out-of-scope detection ===
    if (!isChemistryRelated(prompt)) {
      return res.json({
        message: `👋 Hey! I’m Chem-Ed Genius 🔬 — your chemistry learning buddy.  
I’m trained specifically for **Chemistry concepts**, not general topics like animals, history, or memes 😅  
Try asking me something like:
- “Explain ionic bonding.”  
- “Balance H₂ + O₂ → H₂O.”  
- “What is hybridization?”  
I’ll make it fun and visual! ⚗️`,
      });
    }

    // === Chemistry queries: call OpenAI ===
    const systemPrompt = `
You are Chem-Ed Genius 🔬 — an AI tutor that explains chemistry topics clearly, visually, and accurately.
Be friendly, Gen-Z relatable, and accurate. Avoid HTML tags. Format using simple text with line breaks.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Grade: ${grade}, Mode: ${mode}, Question: ${prompt}` },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const answer = completion.choices[0].message.content;

    res.json({ message: answer });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error while processing your request." });
  }
});

// === Default fallback ===
app.get("/", (req, res) => {
  res.send("Chem-Ed Genius backend is running!");
});

// === Start server ===
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
