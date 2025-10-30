// backend/server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import OpenAI from "openai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "6mb" }));

// === Resolve directories robustly (works when render's CWD is /app or /app/backend) ===
const THIS_FILE = fileURLToPath(import.meta.url);
const THIS_DIR = path.dirname(THIS_FILE);          // e.g. /app/backend
const REPO_ROOT = path.resolve(THIS_DIR, "..");    // e.g. /app
const BACKEND_DIR = THIS_DIR;                      // /app/backend
const FRONTEND_DIR = path.join(REPO_ROOT, "frontend"); // /app/frontend (sibling)

// === OpenAI setup ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// === Load chemistry keywords ===
let chemKeywords = new Set();
const chemKeywordsPath = path.join(BACKEND_DIR, "chem_keywords.txt");
try {
  const raw = fs.readFileSync(chemKeywordsPath, "utf8");
  raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(k => chemKeywords.add(k.toLowerCase()));
  console.log(`✅ Loaded ${chemKeywords.size} chemistry keywords from ${chemKeywordsPath}`);
} catch (err) {
  console.warn(`⚠️ chem_keywords.txt missing at ${chemKeywordsPath}. Falling back to small built-in list.`);
  ["atom","molecule","reaction","acid","base","bond","chemical","oxidation","formula","structure"].forEach(k => chemKeywords.add(k));
}

// === Helper: determine if query is chemistry related ===
function isChemQuery(q = "") {
  if (!q) return false;
  const lower = q.toLowerCase();
  for (const k of chemKeywords) if (lower.includes(k)) return true;
  // allow common chemistry forms (SMILES, CeX LaTeX \ce{})
  if (/^[A-Za-z0-9@+\-\[\]\(\)=#\\/]+$/.test(q) && q.length < 100 && /[A-Za-z].*\d/.test(q)) return true; // simple SMILES-ish heuristic
  if (/\\ce\{.*\}/.test(q) || /[A-Z][a-z]?\d+/.test(q)) return true;
  return false;
}

// === Endpoints ===
app.get("/healthz", (_, res) => res.json({ ok: true }));

// Chat endpoint -> OpenAI
app.post("/api/chat", async (req, res) => {
  try {
    const prompt = (req.body?.prompt || "").trim();
    if (!prompt) return res.status(400).json({ ok: false, error: "Missing prompt" });

    if (!isChemQuery(prompt)) {
      return res.json({
        ok: true,
        message:
          "⚠️ I'm Chem-Ed Genius 🧪 — I only answer chemistry-related topics (atoms, molecules, reactions, bonding, chemical engineering, spectroscopy, formulas)."
      });
    }

    // Send to OpenAI (chat completion)
    const system = "You are Chem-Ed Genius, a friendly expert chemistry tutor. Use LaTeX/KaTeX and \\ce{...} for chemical formulas when appropriate.";
    const chat = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 900
    });

    const message = chat?.choices?.[0]?.message?.content || "No response from model.";
    return res.json({ ok: true, message });
  } catch (err) {
    console.error("Chat endpoint error:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Chat failed" });
  }
});

// Visualization endpoint -> fetch 3D SDF from PubChem (returns SDF text)
app.post("/api/visualize", async (req, res) => {
  try {
    const molecule = (req.body?.molecule || "").trim();
    if (!molecule) return res.status(400).json({ ok: false, error: "Missing molecule name/identifier" });

    // 1) get CID by name
    const nameEnc = encodeURIComponent(molecule);
    const cidResp = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${nameEnc}/cids/JSON`, { timeout: 15000 });
    if (!cidResp.ok) {
      const text = await cidResp.text().catch(() => "");
      return res.status(502).json({ ok: false, error: `PubChem CID lookup failed (${cidResp.status})`, body: text });
    }
    const cidJson = await cidResp.json().catch(() => null);
    const cid = cidJson?.IdentifierList?.CID?.[0];
    if (!cid) return res.json({ ok: false, error: "No PubChem CID found for that name" });

    // 2) get 3D SDF
    const sdfResp = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`, { timeout: 20000 });
    if (!sdfResp.ok) {
      const t = await sdfResp.text().catch(() => "");
      return res.status(502).json({ ok: false, error: `PubChem SDF fetch failed (${sdfResp.status})`, body: t });
    }
    const sdfText = await sdfResp.text();
    if (!sdfText || sdfText.length < 32) return res.json({ ok: false, error: "Invalid/empty SDF received" });

    return res.json({ ok: true, cid, sdf: sdfText });
  } catch (err) {
    console.error("Visualization error:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Visualization failed" });
  }
});

// Serve frontend static files if folder exists
if (fs.existsSync(FRONTEND_DIR) && fs.statSync(FRONTEND_DIR).isDirectory()) {
  console.log(`📁 Serving frontend from: ${FRONTEND_DIR}`);
  app.use(express.static(FRONTEND_DIR));
  app.get("*", (_, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));
} else {
  console.warn(`⚠️ Frontend directory not found at: ${FRONTEND_DIR}`);
}

// Global error guards to keep process alive and log
process.on("uncaughtException", e => console.error("Uncaught Exception:", e));
process.on("unhandledRejection", e => console.error("Unhandled Rejection:", e));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Chem-Ed Genius running on port ${PORT}`));
