import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const allowedOrigin = process.env.RENDER_ORIGIN || "*";
app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.json({ status: "✅ Chem-Ed Genius backend is live" });
});

// Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    // Determine if 3D model needed
    const wants3D = /\b(3d|structure|diagram|show)\b/i.test(prompt);

    let replyText = `**Explanation:** The molecule ${prompt
      .replace(/Explain|structure|molecular|of|show/gi, "")
      .trim()} involves covalent bonding and exhibits characteristic molecular geometry. It typically follows valence bond and hybridization principles.`;

    if (wants3D) {
      replyText += `<br><br><button class="view3d" onclick="show3DModel('${prompt}')">View 3D</button>`;
    }

    res.json({ text: replyText });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
