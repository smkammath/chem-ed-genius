// backend/server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";

dotenv.config();
const app = express();

// Allow CORS from anywhere (frontend hosted separately)
app.use(cors());
app.use(bodyParser.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Root health check ---
app.get("/", (req, res) => {
  res.json({ status: "✅ Chem-Ed Genius backend is live" });
});

// --- POST /api/chat ---
app.post("/api/chat", async (req, res) => {
  try {
    const userPrompt = req.body.prompt?.trim();
    if (!userPrompt) {
      return res.status(400).json({ text: "⚠️ Missing prompt input." });
    }

    console.log("🧠 Received prompt:", userPrompt);

    // OpenAI API call
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are Chem-Ed Genius, an expert chemistry explainer bot. Respond in detailed, clear explanations using chemistry terminology.",
        },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty response from OpenAI.");

    res.json({ text });
  } catch (error) {
    console.error("🔥 Error in /api/chat:", error);
    res
      .status(500)
      .json({ text: `⚠️ Server error: ${error.message || "Unknown error"}` });
  }
});

// --- POST /api/visualize ---
app.post("/api/visualize", async (req, res) => {
  try {
    const q = req.body.query?.toLowerCase() || "";

    const molecules = {
      methane: "CH4",
      ethane: "CC",
      propane: "CCC",
      butane: "CCCC",
      ethanol: "CCO",
      methanol: "CO",
      water: "O",
    };

    const match = Object.keys(molecules).find((k) => q.includes(k));
    if (!match)
      return res.json({
        html: "<p>❌ No 3D model found for that molecule.</p>",
      });

    const smiles = molecules[match];
    const html = `
      <iframe 
        src="https://embed.molview.org/v1/?mode=balls&smiles=${smiles}" 
        width="100%" height="100%" frameborder="0">
      </iframe>
    `;
    res.json({ html });
  } catch (error) {
    console.error("Error in /api/visualize:", error);
    res.status(500).json({ html: `<p>⚠️ Visualization error: ${error.message}</p>` });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Chem-Ed Genius backend running on port ${PORT}`);
});
