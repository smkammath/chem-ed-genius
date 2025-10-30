/**
 * server.js - Rectified for path and runtime issues
 * - Robust chem_keywords.txt discovery (tries multiple locations).
 * - Uses global fetch (Node 18+). No node-fetch import required.
 * - Keeps /api/chat, /api/visualize, /healthz endpoints.
 *
 * After replacing this file: commit, push, wait for Render auto-redeploy.
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
app.use(bodyParser.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;

// OpenAI client
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️ Warning: OPENAI_API_KEY not set. /api/chat will fail until provided in environment.");
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

// ---------- chem keywords loader (robust) ----------
const candidates = [];

// 1) process cwd
candidates.push(path.join(process.cwd(), "chem_keywords.txt"));
candidates.push(path.join(process.cwd(), "backend", "chem_keywords.txt"));

// 2) file-relative to this module (works if server.js sits in backend/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
candidates.push(path.join(__dirname, "chem_keywords.txt"));
candidates.push(path.join(__dirname, "..", "chem_keywords.txt"));

// 3) repository-style common places
candidates.push(path.join(process.cwd(), "data", "chem_keywords.txt"));
candidates.push(path.join(process.cwd(), "backend", "data", "chem_keywords.txt"));

let chemKeywords = new Set();
let loadedFrom = null;

for (const candidate of candidates) {
  try {
    if (fs.existsSync(candidate)) {
      const raw = fs.readFileSync(candidate, "utf8");
      raw
        .split(/\r?\n/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .forEach((kw) => chemKeywords.add(kw));
      loadedFrom = candidate;
      console.log(`Loaded ${chemKeywords.size} chemistry keywords from: ${candidate}`);
      break;
    }
  } catch (err) {
    // keep trying other candidates
    console.warn(`Error reading ${candidate}: ${err?.message ?? err}`);
  }
}

if (!loadedFrom) {
  // fallback minimal set (keeps features working)
  const fallback = [
    "atom",
    "molecule",
    "reaction",
    "oxidation",
    "bond",
    "acid",
    "base",
    "ion",
    "chemical",
    "formula",
  ];
  fallback.forEach((k) => chemKeywords.add(k));
  console.warn(
    "Warning: chem_keywords.txt not found in any candidate locations. Falling back to built-in minimal keyword list."
  );
  console.log("Tried candidates:\n", candidates.join("\n"));
} else {
  console.log("chem_keywords.txt successfully loaded from:", loadedFrom);
}

// ---------- Helpers ----------
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isChemistryRelated(prompt) {
  if (!prompt || typeof prompt !== "string") return false;
  const text = prompt.toLowerCase();

  // keyword-based detection
  for (const kw of chemKeywords) {
    const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
    if (re.test(text)) return true;
  }

  // chemical formula heuristic (e.g., H2O, C6H6, CH3OH)
  const formulaLike = /\b([A-Za-z]{1,3}\d{0,3}){2,}\b/;
  if (formulaLike.test(prompt)) return true;

  // SMILES-ish hint
  const smilesHint = /[#=\/\\@]|[A-Z][a-z]/;
  if (smilesHint.test(prompt)) return true;

  return false;
}

// ---------- Endpoints ----------

// health
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// /api/chat
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ ok: false, error: "Missing 'prompt' (string) in request body." });
    }

    // scope check
    const related = isChemistryRelated(prompt);
    if (!related) {
      const outOfScope = `⚠️ I'm Chem-Ed Genius 🧪 — I only answer chemistry-related topics (atoms, molecules, reactions, bonding, chemical engineering, spectroscopy, formulas, balancing). Please ask a chemistry question.`;
      return res.json({ ok: true, message: outOfScope });
    }

    // Compose system prompt; instruct model to use LaTeX/mhchem inline and return plain text.
    const systemPrompt = {
      role: "system",
      content:
        "You are Chem-Ed Genius, a concise, accurate chemistry tutor. Use plain text only (no HTML). Use LaTeX inline or \\ce{...} (mhchem) for chemical formulas/equations when helpful. Keep tone helpful and clear.",
    };

    const userMsg = { role: "user", content: prompt };

    const model = DEFAULT_MODEL;
    console.log(`Calling OpenAI model=${model} for prompt (truncated): ${prompt.slice(0, 200)}`);

    const completion = await openai.chat.completions.create({
      model,
      messages: [systemPrompt, userMsg],
      temperature: 0.15,
      max_tokens: 1200,
    });

    const assistantText = completion?.choices?.[0]?.message?.content ?? "";
    return res.json({ ok: true, message: assistantText });
  } catch (err) {
    console.error("Error in /api/chat:", err?.message ?? err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// /api/visualize - fetch SDF (3D) from PubChem by name/identifier
app.post("/api/visualize", async (req, res) => {
  try {
    const { molecule } = req.body || {};
    if (!molecule || typeof molecule !== "string") {
      return res.status(400).json({ ok: false, error: "Missing 'molecule' (string) in request body." });
    }

    const name = encodeURIComponent(molecule.trim());
    // try name -> CID
    const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${name}/cids/JSON`;

    // use global fetch (Node 18+). If your runtime lacks fetch, enable node-fetch dependency.
    let cidResp = await fetch(cidUrl);
    if (!cidResp.ok) {
      // try as SMILES (common fallback)
      const smilesUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${name}/cids/JSON`;
      cidResp = await fetch(smilesUrl);
      if (!cidResp.ok) {
        return res.status(502).json({ ok: false, error: "PubChem lookup failed for name/SMILES." });
      }
    }

    const cidJson = await cidResp.json();
    const cids = cidJson?.IdentifierList?.CID || [];
    if (!Array.isArray(cids) || cids.length === 0) {
      return res.status(404).json({ ok: false, error: "No PubChem compound found for that query." });
    }
    const cid = cids[0];
    // fetch 3D SDF
    const sdfUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`;
    const sdfResp = await fetch(sdfUrl);
    if (!sdfResp.ok) {
      return res.status(502).json({ ok: false, error: "Failed to fetch SDF from PubChem." });
    }
    const sdfText = await sdfResp.text();

    return res.json({ ok: true, cid, sdf: sdfText });
  } catch (err) {
    console.error("Error in /api/visualize:", err?.message ?? err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// start
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
