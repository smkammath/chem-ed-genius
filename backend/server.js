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
  if (/[A-Z][a-z]?\d+/.test(q)
