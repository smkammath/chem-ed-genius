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
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// ---------- Chemistry keywords ----------
let chemKeywords = new Set();
try {
  const txt = fs.readFileSync(path.join(__dirname, "chem_keywords.txt"), "utf8");
  txt.split(/\r?\n/).forEach(k => k.trim() && chemKeywords.add(k.toLowerCase()));
  console.log(`✅ Loaded ${chemKeywords.size} chemistry keywords`);
} catch {
  chemKeywords = new Set(["atom", "molecule", "reaction", "bond", "acid", "base", "chemical"]);
  console.log("⚠️ chem_keywords.txt not found, using fallback keywords");
}

function isChemQuery(q = "") {
  const t = q.toLowerCase();
  for (const k of chemKeywords) if (t.includes(k)) return true;
  if (/[A-Z][a-z]?\d+/.test(q) || /\\ce\{/.test(q)) return true;
  return false;
}

// ---------- Routes ----------
app.get("/healthz", (_, res) => res.json({ ok: true }));

app.post("/api/chat", async (req, res) => {
  try {
    const prompt = (req.body && req.body.prompt) || "";
    if (!prompt) return res.json({ ok: false, error: "Missing prompt" });

    if (!isChemQuery(prompt)) {
      return res.json({
        ok: true,
        message: "⚠️ I'm Chem-Ed Genius 🧪 — I only answer chemistry-related topics."
      });
    }

    const system =
      "You are Chem-Ed Genius, a concise chemistry tutor. Use LaTeX for math and \\ce{...} for chemical notation.";
    const result = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 900
    });

    const msg = result.choices?.[0]?.message?.content || "No response.";
    res.json({ ok: true, message: msg });
  } catch (e) {
    console.error("Chat error:", e);
    res.json({ ok: false, error: e.message || "Chat failed" });
  }
});

app.post("/api/visualize", async (req, res) => {
  try {
    const molecule = (req.body && req.body.molecule) || "";
    if (!molecule) return res.json({ ok: false, error: "Missing molecule" });

    const name = encodeURIComponent(molecule.trim());
    const cidURL = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${name}/cids/JSON`;
    const cidResp = await fetch(cidURL);
    const cidJson = await cidResp.json().catch(() => null);
    const cid = cidJson?.IdentifierList?.CID?.[0];
    if (!cid) return res.json({ ok: false, error: "No CID found" });

    const sdfURL = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF?record_type=3d`;
    const sdfResp = await fetch(sdfURL);
    const sdfText = await sdfResp.text();
    if (!sdfText || sdfText.length < 20) return res.json({ ok: false, error: "Empty SDF" });

    res.json({ ok: true, cid, sdf: sdfText });
  } catch (e) {
    console.error("Visualize error:", e);
    res.json({ ok: false, error: e.message || "Visualization failed" });
  }
});

// ---------- Serve frontend ----------
const frontendDir = path.join(__dirname, "frontend");
app.use(express.static(frontendDir));
app.get("*", (_, res) => res.sendFile(path.join(frontendDir, "index.html")));
// ---------- Global error guard ----------
process.on("uncaughtException", e => console.error("Uncaught:", e));
process.on("unhandledRejection", e => console.error("Unhandled:", e));

app.listen(PORT, () => console.log(`✅ Chem-Ed Genius running at :${PORT}`));
