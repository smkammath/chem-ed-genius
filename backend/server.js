/**
 * server.js - stable production-ready backend for Chem-Ed Genius
 *
 * - Node 18+/20+ (Render uses Node 20)
 * - Expects OPENAI_API_KEY in env
 * - Always responds with JSON { ok: boolean, ... }
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini" /* or gpt-3.5-turbo */;

// Load chem keywords file if available (fallback to a small set)
let chemKeywords = new Set();
const possible = [
  path.join(__dirname, "chem_keywords.txt"),
  path.join(__dirname, "..", "chem_keywords.txt"),
  path.join(process.cwd(), "backend", "chem_keywords.txt"),
];
let loaded = false;
for (const p of possible) {
  if (fs.existsSync(p)) {
    try {
      const raw = fs.readFileSync(p, "utf8");
      raw.split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(Boolean).forEach(k => chemKeywords.add(k));
      console.log(`Loaded chemistry keywords from ${p} (${chemKeywords.size})`);
      loaded = true;
      break;
    } catch (e) {
      console.warn("Could not read keywords file", e);
    }
  }
}
if (!loaded) {
  ["atom","molecule","reaction","bond","acid","base","chemical","oxidation","stoichiometry","spectroscopy"].forEach(k => chemKeywords.add(k));
  console.warn("chem_keywords.txt not found — using small fallback keyword set");
}

// helper: is chem question
const escapeRE = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function isChemQuestion(text = "") {
  const t = (text || "").toLowerCase();
  for (const k of chemKeywords) {
    if (new RegExp(`\\b${escapeRE(k)}\\b`, "i").test(t)) return true;
  }
  // also accept typical chemical notation like C2H6, H2O, or \ce{...}
  if (/[A-Za-z]{1,3}\d+/.test(text) || /\\ce\{/.test(text) || /[=#@\/\\]/.test(text)) return true;
  return false;
}

/** Health */
app.get("/healthz", (_, res) => res.json({ ok: true, uptime: process.uptime() }));

/** Chat endpoint */
app.post("/api/chat", async (req, res) => {
  try {
    const prompt = (req.body && req.body.prompt) ? String(req.body.prompt) : "";
    if (!prompt) return res.json({ ok: false, error: "Missing 'prompt' in request body" });

    if (!isChemQuestion(prompt)) {
      return res.json({
        ok: true,
        message: "⚠️ I'm Chem-Ed Genius 🧪 — I only answer chemistry-related topics (atoms, molecules, reactions, bonding, spectroscopy, formulas, balancing). Please ask a chemistry question.",
        meta: { outOfScope: true }
      });
    }

    // system instructions: ask model to prefer KaTeX and \ce{}
    const system = `You are Chem-Ed Genius, a concise chemistry tutor. Use Markdown headings, use KaTeX inline/display for math, and use \\ce{...} for chemical formulas when appropriate. Keep answers educational and focused.`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 900
    });

    const msg = completion?.choices?.[0]?.message?.content || "No response from model.";
    return res.json({ ok: true, message: msg });
  } catch (err) {
    console.error("API /api/chat error:", err);
    return res.json({ ok: false, error: (err && err.message) ? err.message : String(err) });
  }
});

/**
 * /api/visualize
 * Accepts: { molecule: "CH3OH" } or common name
 * Returns: { ok: true, cid, sdf } or { ok:false, error }
 */
app.post("/api/visualize", async (req, res) => {
  try {
    const molecule = (req.body && req.body.molecule) ? String(req.body.molecule).trim() : "";
    if (!molecule) return res.json({ ok: false, error: "Missing 'molecule' field" });

    // 1) name -> CID
    const encoded = encodeURIComponent(molecule);
    const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`;
    const cidResp = await fetch(cidUrl, { method: "GET", headers: { "User-Agent": "chem-ed-genius/1.0" } });
    if (!cidResp.ok) return res.json({ ok: false, error: `PubChem CID lookup failed (${cidResp.status})` });
    const cidJson = await cidResp.json().catch(() => null);
    const cid = cidJson?.IdentifierList?.CID?.[0];
    if (!cid) return res.json({ ok: false, error: "No CID found on PubChem for that molecule" });

    // 2) CID -> 3D SDF
    const sdfUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`;
    const sdfResp = await fetch(sdfUrl, { method: "GET", headers: { "User-Agent": "chem-ed-genius/1.0" } });
    if (!sdfResp.ok) return res.json({ ok: false, error: `PubChem SDF fetch failed (${sdfResp.status})` });
    const sdfText = await sdfResp.text();
    if (!sdfText || sdfText.length < 20) return res.json({ ok: false, error: "Empty SDF returned" });

    return res.json({ ok: true, cid, sdf: sdfText });
  } catch (err) {
    console.error("/api/visualize error:", err);
    return res.json({ ok: false, error: err.message || String(err) });
  }
});

app.use((req, res) => res.status(404).json({ ok: false, error: "Not found" }));

// safety
process.on("unhandledRejection", (r) => console.error("UnhandledRejection:", r));
process.on("uncaughtException", (e) => console.error("UncaughtException:", e));

app.listen(PORT, () => console.log(`✅ Server listening on ${PORT}`));
