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

app.get("/", (req, res) => res.send("✅ Chem-Ed Genius backend is live."));

app.post("/api/chat", async (req, res) => {
  try {
    const question = req.body?.question?.trim();
    if (!question) return res.status(400).json({ ok: false, error: "Missing 'question'." });

    // Call OpenAI API
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
              "You are Chem-Ed Genius, a chemistry tutor AI. Answer with accuracy and clarity. If asked for 3D, provide molecular info."
          },
          { role: "user", content: question }
        ]
      })
    });

    const data = await openaiRes.json();
    const aiAnswer = data?.choices?.[0]?.message?.content?.trim() || "I couldn’t process that question.";

    // Detect molecular query for 3D rendering
    const show3d =
      /(show|display|structure|geometry|3d|visualize|model)/i.test(question) &&
      /[A-Z][a-z]?\d*/.test(question);
    const molMatch = question.match(/[A-Z][a-z]?\d*/g);
    const molQuery = show3d && molMatch ? molMatch.join("") : null;

    res.json({
      ok: true,
      answer: aiAnswer,
      show3d,
      molQuery
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ ok: false, error: "Internal server error", details: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Chem-Ed Genius backend running on port ${PORT}`));
