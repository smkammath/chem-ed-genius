import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Serve frontend correctly
const __dirname = path.resolve();
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ✅ API: Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const prompt = req.body.prompt; // fixed name
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    console.log("🧠 Received prompt:", prompt);

    // Filter only chemistry-related prompts
    const chemistryKeywords = fs
      .readFileSync("./chem_keywords.txt", "utf-8")
      .split("\n")
      .map((k) => k.trim().toLowerCase());

    const isChemistry = chemistryKeywords.some((word) =>
      prompt.toLowerCase().includes(word)
    );

    if (!isChemistry) {
      return res.json({
        answer: "⚠️ I only answer chemistry-related topics.",
      });
    }

    // Call OpenAI API (mocked for Render safety)
    const response = `The molecular structure of ${prompt} involves covalent bonding and molecular geometry analysis. You can visualize it using the 'View 3D' button below. View 3D`;

    res.json({ answer: response });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Fallback for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Chem-Ed Genius running on port ${PORT}`);
});
