// ===============================
// ✅ FINAL WORKING SERVER.JS
// ===============================
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// === Directory setup ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, "frontend"); // now inside container
const KEYWORDS_FILE = path.join(__dirname, "chem_keywords.txt");

// === Initialize OpenAI ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// === Load chemistry keywords ===
let chemKeywords = new Set();
try {
  const data = fs.readFileSync(KEYWORDS_FILE, "utf8");
  data.split(/\r?\n/).forEach(line => {
    if (line.trim()) chemKeywords.add(line.trim().toLowerCase());
  });
  console.log(`✅ Loaded ${chemKeywords.size} chemistry keywords.`);
} catch (err) {
  console.warn("⚠️ chem_keywords.txt not found, using fallback list.");
  ["molecule", "reaction", "acid", "base", "bond", "oxidation", "formula", "chemical"].forEach(k =>
    chemKeywords.add(k)
  );
}

// === Helper function to check if query is chemistry-related ===
function isChemQuery(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  for (const k of chemKeywords) if (lower.includes(k)) return true;
  if (/\\ce\{.*\}/.test(lower)) return true;
  if (/[A-Z][a-z]?\d+/.test(lower)) return true;
  return false;
}

// === Health check ===
app.get("/healthz", (req, res) => res.json({ ok: true }));

// === Chat endpoint ===
app.post("/api/chat", async (req, res) => {
  try {
    const prompt = (req.body?.prompt || "").trim();
    if (!prompt) return res.status(400).json({ ok: false, error: "Missing prompt" });

    if (!isChemQuery(prompt)) {
      return res.json({
        ok: true,
        message:
          "⚠️ I'm Chem-Ed Genius 🧪 — I only answer chemistry-related topics like atoms, molecules, reactions, bonding, spectroscopy, etc."
      });
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are Chem-Ed Genius, an expert chemistry tutor who provides detailed but concise explanations. Use proper LaTeX and \\ce{} for chemical notation."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    const reply = completion.choices[0].message.content;
    res.json({ ok: true, message: reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ ok: false, error: "AI response failed." });
  }
});

// === Visualization endpoint (3D molecules) ===
app.post("/api/visualize", async (req, res) => {
  try {
    const molecule = (req.body?.molecule || "").trim();
    if (!molecule) return res.status(400).json({ ok: false, error: "Missing molecule name" });

    const encoded = encodeURIComponent(molecule);
    const cidResp = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`);
    if (!cidResp.ok) throw new Error(`CID lookup failed: ${cidResp.status}`);
    const cidJson = await cidResp.json();
    const cid = cidJson?.IdentifierList?.CID?.[0];
    if (!cid) throw new Error("No PubChem CID found.");

    const sdfResp = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`
    );
    if (!sdfResp.ok) throw new Error(`3D fetch failed: ${sdfResp.status}`);

    const sdfText = await sdfResp.text();
    if (!sdfText || sdfText.length < 20) throw new Error("Empty or invalid SDF file.");

    res.json({ ok: true, cid, sdf: sdfText });
  } catch (err) {
    console.error("Visualization error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === Serve frontend (works in Render) ===
if (fs.existsSync(FRONTEND_DIR)) {
  console.log(`📁 Serving frontend from: ${FRONTEND_DIR}`);
  app.use(express.static(FRONTEND_DIR));
  app.get("*", (_, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));
} else {
  console.warn(`⚠️ Frontend directory not found at: ${FRONTEND_DIR}`);
}

// === Error safety ===
process.on("uncaughtException", e => console.error("Uncaught Exception:", e));
process.on("unhandledRejection", e => console.error("Unhandled Rejection:", e));

// === Start server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Chem-Ed Genius running on port ${PORT}`));
