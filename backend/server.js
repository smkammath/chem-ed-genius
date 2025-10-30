/**
 * server.js
 * Backend for Chem-Ed Genius
 *
 * - /api/chat   POST { prompt } -> returns JSON { message }
 * - /api/visualize POST { type, value, mode? } -> returns { format, data } for 3Dmol.js
 *
 * Requirements:
 *  - Node 18+ (global fetch available)
 *  - npm install express cors body-parser dotenv openai
 *  - Put your OpenAI key into OPENAI_API_KEY (env)
 *
 * Place your chemistry keywords (one per line) in backend/chem_keywords.txt
 */

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));

// Read keywords from file
const KEYWORDS_PATH = path.join(process.cwd(), "chem_keywords.txt");
let chemKeywords = [];
try {
  const raw = fs.readFileSync(KEYWORDS_PATH, "utf8");
  chemKeywords = raw
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
  console.log(`Loaded ${chemKeywords.length} chemistry keywords.`);
} catch (err) {
  console.warn(
    "chem_keywords.txt not found or unreadable. Please create backend/chem_keywords.txt and paste your list (one term per line)."
  );
}

// Build a regex to test question relevance (word boundary)
const chemRegex = new RegExp(
  "\\b(" + chemKeywords.map((k) => escapeRegex(k)).join("|") + ")\\b",
  "i"
);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isChemistryRelated(text) {
  if (!text || !chemKeywords.length) return false;
  // quick lower-case test for single-word keywords
  return chemRegex.test(text);
}

// Setup OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. Set it in env before using /api/chat.");
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility: sanitize model output (no HTML, prefer Markdown)
function sanitizeResponse(text) {
  if (!text) return "";
  // Remove script/style tags and reduce malicious html
  return text
    .replace(/<\s*\/?script[^>]*>/gi, "")
    .replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "") // strip tags; we expect markdown/latex
    .trim();
}

// ----------------- Chat endpoint -----------------
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt." });
  }

  // Check scope
  if (!isChemistryRelated(prompt)) {
    // Out of scope message
    const outMsg =
      "⚠️ I'm Chem-Ed Genius — I only answer chemistry-related topics: atoms, molecules, reactions, bonding, chemical engineering, spectroscopy, formulas, balancing, and related subjects. Please ask a chemistry question.";
    return res.json({ message: outMsg });
  }

  try {
    // Use OpenAI ChatCompletion
    // Provide system instruction to respond in Markdown, allow Latex (KaTeX)
    const systemPrompt = `You are Chem-Ed Genius, a concise helpful chemistry tutor. Answer the user's chemistry question clearly and in structured Markdown.
- Use headings (###) for sections.
- Use bullet lists and numbered steps for procedures.
- For chemical equations, prefer LaTeX inline (e.g., $\\ce{H2 + O2 -> H2O}$ or simple $C_2H_6 + O_2 \\to CO_2 + H2O$).
- If the user asks for visualization, do not attempt to render images — instead include a short line like "Visualize: <compound>" or "Visualize-Reaction: <smiles1>-><smiles2>" if you can provide a canonical name or identifiers (PubChem name or PDB ID).
- Avoid including raw HTML tags in your output. Output must be plain Markdown text with LaTeX allowed.`;

    const userPrompt = `User: ${prompt}\n\nPlease answer.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or your preferred model available on your account
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 800,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const clean = sanitizeResponse(raw);

    return res.json({ message: clean });
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: "OpenAI error" });
  }
});

// ----------------- Visualize endpoint -----------------
// POST { type: 'pubchem-name' | 'pdb' | 'smiles', value: string, mode?: 'reaction' }
// returns { format: 'sdf'|'pdb'|'mol' ,'data': 'raw file string' }
app.post("/api/visualize", async (req, res) => {
  const { type, value, mode } = req.body || {};
  if (!type || !value) return res.status(400).json({ error: "Missing type/value" });

  try {
    if (type === "pubchem-name") {
      // Try to fetch 3D SDF for name via PubChem PUG REST
      const name = encodeURIComponent(value);
      // First try 3D SDF
      let url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${name}/SDF?record_type=3d`;
      let r = await fetch(url);
      if (!r.ok) {
        // try 2D SDF
        url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${name}/SDF`;
        r = await fetch(url);
      }
      if (!r.ok) {
        return res.status(404).json({ error: "Not found on PubChem" });
      }
      const sdf = await r.text();
      return res.json({ format: "sdf", data: sdf });
    } else if (type === "pdb") {
      const pdbId = value.trim().toUpperCase();
      const r = await fetch(`https://files.rcsb.org/download/${pdbId}.pdb`);
      if (!r.ok) return res.status(404).json({ error: "PDB not found" });
      const pdb = await r.text();
      return res.json({ format: "pdb", data: pdb });
    } else if (type === "smiles") {
      // convert SMILES to SDF via PubChem (submit identifier)
      const smiles = encodeURIComponent(value);
      // PubChem Identifier Exchange: get CID from SMILES
      const fetchCid = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${smiles}/cids/TXT`
      );
      if (!fetchCid.ok) return res.status(404).json({ error: "SMILES not found" });
      const cid = (await fetchCid.text()).split(/\r?\n/)[0].trim();
      if (!cid) return res.status(404).json({ error: "CID not found" });
      const sdfResp = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`
      );
      const sdf = await sdfResp.text();
      return res.json({ format: "sdf", data: sdf });
    } else if (type === "reaction") {
      // Reaction visualization: expects { value: { reactantSmiles: "...", productSmiles: "..." } }
      // We will return separate sdf/pdb for left/right if available.
      const { reactantSmiles, productSmiles } = value || {};
      if (!reactantSmiles || !productSmiles)
        return res.status(400).json({ error: "Missing reactantSmiles/productSmiles" });

      const left = await fetchSmilesAsSDF(reactantSmiles);
      const right = await fetchSmilesAsSDF(productSmiles);
      return res.json({ format: "reaction", data: { left, right } });
    } else {
      return res.status(400).json({ error: "Unsupported visualize type" });
    }
  } catch (err) {
    console.error("visualize error:", err);
    return res.status(500).json({ error: "Visualization fetch error" });
  }
});

async function fetchSmilesAsSDF(smiles) {
  // Convert SMILES -> CID -> SDF (PubChem)
  const s = encodeURIComponent(smiles);
  const fetchCid = await fetch(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${s}/cids/TXT`
  );
  if (!fetchCid.ok) return null;
  const cid = (await fetchCid.text()).split(/\r?\n/)[0].trim();
  if (!cid) return null;
  const sdfResp = await fetch(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`
  );
  if (!sdfResp.ok) {
    const sdfResp2 = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF`
    );
    if (!sdfResp2.ok) return null;
    return await sdfResp2.text();
  }
  return await sdfResp.text();
}

// health check
app.get("/healthz", (_, res) => res.send("ok"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
