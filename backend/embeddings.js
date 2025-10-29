const axios = require("axios");
const fs = require("fs");
const path = require("path");

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const EMB_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-large";
const EMB_FILE = path.join(__dirname, "embeddings_data.json");

async function embedText(text) {
  if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY not set");
  const res = await axios.post(
    "https://api.openai.com/v1/embeddings",
    { input: text, model: EMB_MODEL },
    { headers: { Authorization: `Bearer ${OPENAI_KEY}` } }
  );
  return res.data.data[0].embedding;
}

function cosineSim(a, b) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (magA * magB);
}

function loadStore() {
  try {
    if (fs.existsSync(EMB_FILE)) {
      return JSON.parse(fs.readFileSync(EMB_FILE, "utf8"));
    }
  } catch (e) {
    console.warn("Could not load embeddings_data.json:", e.message);
  }
  return [];
}

async function searchRelevant(query, topN = 3) {
  const qEmb = await embedText(query);
  const store = loadStore();
  const scored = store.map(e => ({
    ...e,
    score: cosineSim(qEmb, e.embedding)
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}

module.exports = { embedText, cosineSim, searchRelevant, loadStore };
