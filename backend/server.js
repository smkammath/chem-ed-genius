import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: process.env.RENDER_ORIGIN || "*" }));
app.use(bodyParser.json());

app.get("/", (req, res) => res.send("✅ Chem-Ed Genius backend live."));

// Helper function: Convert chemical name/formula → PubChem SMILES
async function getSmiles(molecule) {
  try {
    const resp = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(molecule)}/property/CanonicalSMILES/JSON`);
    const data = await resp.json();
    return data?.PropertyTable?.Properties?.[0]?.CanonicalSMILES || null;
  } catch {
    return null;
  }
}

// --- Chat Endpoint ---
app.post("/api/chat", async (req, res) => {
  try {
    const question = req.body?.question?.trim();
    if (!question) return res.status(400).json({ ok: false, error: "Missing 'question'." });

    // Call OpenAI
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.MODEL_NAME || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Chem-Ed Genius, a chemistry AI. Explain reactions, molecular structures, and 3D geometry clearly and accurately."
          },
          { role: "user", content: question }
        ]
      })
    });

    const data = await openaiRes.json();
    const aiAnswer = data?.choices?.[0]?.message?.content?.trim() || "I couldn’t process that question.";

    // Detect molecular query
    const show3d = /(show|structure|geometry|3d|visualize|model)/i.test(question);
    const match = question.match(/[A-Z][a-z]?\d*/g);
    const molQuery = match ? match.join("") : null;

    let smiles = null;
    if (show3d && molQuery) {
      smiles = await getSmiles(molQuery);
    }

    res.json({
      ok: true,
      answer: aiAnswer,
      show3d: !!(show3d && smiles),
      molQuery: smiles || null
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ ok: false, error: "Internal server error", details: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Chem-Ed Genius backend running on port ${PORT}`));
