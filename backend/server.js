/**
 * server.js - Chem-Ed Genius backend (rectified)
 *
 * - Loads chemistry keywords from chem_keywords.txt (one per line).
 * - /api/chat: checks if prompt is chemistry-related. If not -> polite out-of-scope reply.
 * - /api/chat: if chemistry-related -> queries OpenAI and returns plain text (no extra escaping).
 * - /api/visualize: accepts { molecule: "<name or SMILES>" } -> queries PubChem for 3D SDF and returns { sdf }.
 *
 * Notes:
 *  - Requires environment variable OPENAI_API_KEY set in your Render service / .env.
 *  - Expects chem_keywords.txt in the same backend directory (you already have one).
 */

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // Node 18+ may have global fetch; keep this require if using older runtime
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;

// -----------------------------
// Load chemistry keywords
// -----------------------------
const KEYWORDS_FILE = path.join(process.cwd(), "backend", "chem_keywords.txt");
let chemKeywords = new Set();

try {
  const raw = fs.readFileSync(KEYWORDS_FILE, "utf8");
  raw
    .split(/\r?\n/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .forEach((kw) => chemKeywords.add(kw));
  console.log(`Loaded ${chemKeywords.size} chemistry keywords from ${KEYWORDS_FILE}`);
} catch (err) {
  console.warn(
    `Warning: could not read chem_keywords.txt at ${KEYWORDS_FILE}. Falling back to a small built-in list.`
  );
  // minimal fallback list (keeps server usable)
  ["atom", "molecule", "reaction", "oxidation", "bond", "acid", "base", "ion", "chemical", "formula"].forEach(
    (k) => chemKeywords.add(k)
  );
  console.log(`Fallback keywords loaded: ${chemKeywords.size}`);
}

// -----------------------------
// Helper: isChemistryRelated
// -----------------------------
// Strategy: normalize prompt -> check for any keyword presence (word boundary aware).
// Also check for simple chemical formula patterns (e.g., C6H6, H2O, CH3OH).
function isChemistryRelated(prompt) {
  if (!prompt || typeof prompt !== "string") return false;
  const text = prompt.toLowerCase();

  // 1) quick keyword check
  for (const kw of chemKeywords) {
    // ensure simple substring or word boundary match (to avoid long false matches)
    const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
    if (re.test(text)) return true;
  }

  // 2) detect common chemical formula patterns: e.g., H2O, C6H6, CH3OH, NaCl
  // pattern: one or more letters with optional digits, repeated at least twice (heuristic)
  const formulaLike = /\b([A-Za-z]{1,3}\d{0,3}){2,}\b/;
  if (formulaLike.test(prompt)) return true;

  // 3) detect SMILES-ish tokens (contains '=' '#' or lowercase letters after uppercase etc.)
  const smilesHint = /[#=\/\\@]|[A-Z][a-z]/;
  if (smilesHint.test(prompt)) return true;

  return false;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// -----------------------------
// OpenAI client
// -----------------------------
if (!process.env.OPENAI_API_KEY) {
  console.warn("Warning: OPENAI_API_KEY not set. /api/chat will fail until the key is provided.");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// -----------------------------
// Endpoint: health
// -----------------------------
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// -----------------------------
// Endpoint: /api/chat
// - payload: { prompt: string }
// - response: { ok: true, message: string }
// -----------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ ok: false, error: "Missing 'prompt' in request body." });
    }

    // Check scope
    const chemRelated = isChemistryRelated(prompt);
    if (!chemRelated) {
      const outOfScope = `⚠️ I'm Chem-Ed Genius 🧪 — I only answer chemistry-related topics: atoms, molecules, reactions, bonding, chemical engineering, spectroscopy, formulas, balancing, and related subjects. Please ask a chemistry question.`;
      return res.json({ ok: true, message: outOfScope });
    }

    // Compose system prompt to instruct model to return plain text with LaTeX (no html)
    const systemPrompt = [
      {
        role: "system",
        content:
          "You are Chem-Ed Genius, a helpful chemistry tutor. Answer clearly and concisely. Use LaTeX (KaTeX) inline when returning formulas (e.g., $H_2O$ or \\ce{CH3OH}) for equations. DO NOT wrap output in HTML. Return plain text. If you include chemical equations, use \\ce{...} notation for mhchem.",
      },
    ];

    // Message from user
    const userMsg = { role: "user", content: prompt };

    // Call OpenAI ChatCompletion (new "openai" package interface)
    // Note: choose model appropriate to your account, e.g., "gpt-4o-mini", "gpt-4o", or "gpt-4".
    // If you have rate/credit limitations, consider "gpt-3.5-turbo".
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini"; // change if needed

    // Use streaming disabled - simple request/response
    const chatResponse = await openai.chat.completions.create({
      model,
      messages: [...systemPrompt, userMsg],
      temperature: 0.2,
      max_tokens: 1300,
    });

    // Extract assistant reply
    const message = chatResponse?.choices?.[0]?.message?.content ?? "";
    // Ensure we return plain text and avoid double-escaping from server side.
    return res.json({ ok: true, message });
  } catch (err) {
    console.error("Error /api/chat:", err?.message ?? err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// -----------------------------
// Endpoint: /api/visualize
// - payload: { molecule: "<name or SMILES or InChI>" }
// - returns: { ok: true, sdf: "<SDF text>" } or error
// -----------------------------
app.post("/api/visualize", async (req, res) => {
  try {
    const { molecule } = req.body || {};
    if (!molecule || typeof molecule !== "string") {
      return res.status(400).json({ ok: false, error: "Missing 'molecule' in request body." });
    }

    // Use PubChem PUG REST to get SDF (3D) by name or SMILES
    // First try lookup by name:
    const name = encodeURIComponent(molecule.trim());

    // PubChem endpoints:
    // 1) By name -> CID
    const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${name}/cids/JSON`;
    const cidResp = await fetch(cidUrl);
    if (!cidResp.ok) {
      // fallback: if molecule string looks like SMILES we can use /compound/smiles/{smiles}/cids/JSON
      // but for simplicity, return error
      return res.status(502).json({ ok: false, error: "Failed to query PubChem for CID." });
    }
    const cidJson = await cidResp.json();
    const cids = cidJson?.IdentifierList?.CID || [];
    if (!Array.isArray(cids) || cids.length === 0) {
      return res.status(404).json({ ok: false, error: "No PubChem compound found for that name." });
    }
    const cid = cids[0];

    // 2) Retrieve 3D SDF for the CID (record_type=3d)
    const sdfUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`;
    const sdfResp = await fetch(sdfUrl);
    if (!sdfResp.ok) {
      return res.status(502).json({ ok: false, error: "Failed to fetch SDF from PubChem." });
    }
    const sdfText = await sdfResp.text();

    return res.json({ ok: true, sdf: sdfText });
  } catch (err) {
    console.error("Error /api/visualize:", err?.message ?? err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
