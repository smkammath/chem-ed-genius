/**
 * Chem-Ed Genius Backend — Final Rectified Build
 * Features:
 * - Fully JSON-safe responses (no empty body / no crashes)
 * - 3D visualization via PubChem SDF fetch
 * - Keyword detection for chemistry filtering
 * - Compatible with Render Free tier
 */

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));

// ---- Path constants ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// ---- OpenAI Setup ----
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy",
});
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

// ---- Keyword Loading ----
const candidatePaths = [
  path.join(__dirname, "chem_keywords.txt"),
  path.join(__dirname, "..", "chem_keywords.txt"),
  path.join(process.cwd(), "backend", "chem_keywords.txt"),
  path.join(process.cwd(), "chem_keywords.txt"),
];
let chemKeywords = new Set();
let loadedFile = null;

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    const raw = fs.readFileSync(p, "utf8");
    raw
      .split(/\r?\n/)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
      .forEach((x) => chemKeywords.add(x));
    loadedFile = p;
    break;
  }
}
if (!loadedFile) {
  chemKeywords = new Set(["atom", "molecule", "bond", "reaction", "acid", "base", "ion", "chemical"]);
  console.warn("⚠️ chem_keywords.txt not found — using fallback set.");
} else {
  console.log(`✅ Loaded ${chemKeywords.size} keywords from ${loadedFile}`);
}

// ---- Helper Functions ----
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function isChemistryPrompt(prompt = "") {
  const text = prompt.toLowerCase();
  for (const kw of chemKeywords) {
    if (new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i").test(text)) return true;
  }
  if (/\b([A-Za-z]{1,3}\d{0,3}){2,}\b/.test(prompt)) return true;
  if (/[#=\/\\@]/.test(prompt)) return true;
  return false;
}

// ---- Routes ----
app.get("/healthz", (_, res) => res.json({ ok: true }));

// ---------- /api/chat ----------
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.json({ ok: false, error: "Missing 'prompt' field." });

    if (!isChemistryPrompt(prompt)) {
      return res.json({
        ok: true,
        message:
          "⚠️ I'm Chem-Ed Genius 🧪 — I answer only chemistry-related topics like atoms, molecules, bonding, reactions, spectroscopy, and balancing.",
      });
    }

    const sys = {
      role: "system",
      content:
        "You are Chem-Ed Genius, a helpful, precise chemistry tutor. Use LaTeX for formulas and \\ce{...} for chemical notation. Keep responses compact and factual.",
    };

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [sys, { role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const text = completion?.choices?.[0]?.message?.content || "No response from model.";
    res.json({ ok: true, message: text });
  } catch (err) {
    console.error("Chat error:", err);
    res.json({ ok: false, error: err.message || "Chat failed." });
  }
});

// ---------- /api/visualize ----------
app.post("/api/visualize", async (req, res) => {
  try {
    const { molecule } = req.body || {};
    if (!molecule) return res.json({ ok: false, error: "Missing molecule name" });

    const encoded = encodeURIComponent(molecule.trim());
    const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`;
    let cidResp = await fetch(cidUrl);
    if (!cidResp.ok) {
      return res.json({ ok: false, error: `PubChem name lookup failed (${cidResp.status})` });
    }

    const cidJson = await cidResp.json();
    const cid = cidJson?.IdentifierList?.CID?.[0];
    if (!cid) return res.json({ ok: false, error: "No CID found for query" });

    const sdfUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`;
    const sdfResp = await fetch(sdfUrl);
    if (!sdfResp.ok) return res.json({ ok: false, error: "3D SDF fetch failed" });
    const sdf = await sdfResp.text();
    if (!sdf || sdf.length < 20) return res.json({ ok: false, error: "Empty SDF returned" });

    res.json({ ok: true, cid, sdf });
  } catch (err) {
    console.error("Visualize error:", err);
    res.json({ ok: false, error: err.message || "Visualization error" });
  }
});

// ---- Error Safety ----
process.on("unhandledRejection", (e) => console.error("Unhandled:", e));
process.on("uncaughtException", (e) => console.error("Uncaught:", e));

// ---- Start ----
app.listen(PORT, () => console.log(`✅ Chem-Ed Genius running on port ${PORT}`));
