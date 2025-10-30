import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const __dirname = path.resolve();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, "frontend"); // 👈 goes up from backend/ to sibling frontend/

// ---------- OpenAI Setup ----------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// ---------- Chemistry Keywords ----------
let chemKeywords = new Set();
try {
  const keywordPath = path.join(__dirname, "backend", "chem_keywords.txt");
  const data = fs.readFileSync(keywordPath, "utf8");
  data.split(/\r?\n/).forEach(k => k.trim() && chemKeywords.add(k.toLowerCase()));
  console.log(`✅ Loaded ${chemKeywords.size} chemistry keywords`);
} catch {
  console.warn("⚠️ chem_keywords.txt missing, using defaults");
  chemKeywords = new Set(["atom", "molecule", "reaction", "acid", "base", "bond", "compound"]);
}

// ---------- Helpers ----------
function isChemQuery(q = "") {
  const lower = q.toLowerCase();
  for (const k of chemKeywords) if (lower.includes(k)) return true;
  if (/[A-Z][a-z]?\d+/.test(q) || /\\ce\{/.test(q)) return true;
  return false;
}

// ---------- Routes ----------
app.get("/healthz", (_, res) => res.json({ ok: true }));

app.post("/api/chat", async (req, res) => {
  try {
    const prompt = req.body?.prompt || "";
    if (!prompt) return res.json({ ok: false, error: "Missing prompt" });

    if (!isChemQuery(prompt)) {
      return res.json({
        ok: true,
        message:
          "⚠️ I'm Chem-Ed Genius 🧪 — I only answer chemistry-related topics (atoms, bonding, reactions, molecular structures, etc.)."
      });
    }

    const system = "You are Chem-Ed Genius, a professional chemistry tutor. Use LaTeX and \\ce{...} for chemical formulas.";
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 900
    });

    const message = completion.choices?.[0]?.message?.content || "No response.";
    res.json({ ok: true, message });
  } catch (err) {
    console.error("Chat error:", err);
    res.json({ ok: false, error: err.message || "Chat failed" });
  }
});

app.post("/api/visualize", async (req, res) => {
  try {
    const molecule = req.body?.molecule?.trim();
    if (!molecule) return res.json({ ok: false, error: "Missing molecule" });

    const encoded = encodeURIComponent(molecule);
    const cidResp = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`);
    const cidJson = await cidResp.json().catch(() => null);
    const cid = cidJson?.IdentifierList?.CID?.[0];
    if (!cid) return res.json({ ok: false, error: "No PubChem CID found" });

    const sdfResp = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`);
    const sdfText = await sdfResp.text();
    if (!sdfText || sdfText.length < 50) return res.json({ ok: false, error: "Invalid or empty SDF" });

    res.json({ ok: true, cid, sdf: sdfText });
  } catch (err) {
    console.error("Visualization error:", err);
    res.json({ ok: false, error: err.message || "Visualization failed" });
  }
});

// ---------- Serve Frontend ----------
if (fs.existsSync(FRONTEND_DIR)) {
  console.log(`📁 Serving frontend from: ${FRONTEND_DIR}`);
  app.use(express.static(FRONTEND_DIR));
  app.get("*", (_, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));
} else {
  console.warn(`⚠️ Frontend directory not found at: ${FRONTEND_DIR}`);
}

// ---------- Error Guards ----------
process.on("uncaughtException", e => console.error("Uncaught Exception:", e));
process.on("unhandledRejection", e => console.error("Unhandled Rejection:", e));

app.listen(PORT, () => console.log(`✅ Chem-Ed Genius running on port ${PORT}`));
