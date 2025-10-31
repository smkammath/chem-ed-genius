import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const __dirname = path.resolve();
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// 🔹 Core API endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const prompt = req.body.prompt?.trim();
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    console.log("🧠 User query:", prompt);

    // Detect if the question explicitly requests 3D visualization
    const wants3D = /(3d|diagram|visualize|structure|model|view)/i.test(prompt);

    // Extract possible molecule or reaction keywords
    const match = prompt.match(/[A-Z][a-z]?\d*|[a-z]+/gi);
    const rawTerm = match ? match.join(" ").trim() : "";

    // Clean unwanted words
    const cleaned = rawTerm
      .replace(/explain|molecular|structure|diagram|give|show|3d|visualize|model/gi, "")
      .trim();

    // Common molecule dictionary
    const known = {
      "dimethyl alcohol": "CH3OH",
      "methyl alcohol": "CH3OH",
      methanol: "CH3OH",
      ethanol: "C2H5OH",
      water: "H2O",
      methane: "CH4",
      ammonia: "NH3",
      carbon: "C",
      oxygen: "O2",
      hydrogen: "H2",
      glucose: "C6H12O6",
    };

    const molecule = known[cleaned.toLowerCase()] || cleaned || "unknown compound";

    // 🔹 Generate base explanation
    let responseText = `
**Explanation**: The molecule ${molecule} involves covalent bonding, specific hybridization, and characteristic geometry. 
It can be described by the valence bond theory and electron-pair repulsion model.
`;

    // If 3D is explicitly requested, append visualization option
    if (wants3D) {
      responseText += `  
You can visualize the molecular geometry interactively below.  
View 3D`;
    }

    res.json({ answer: responseText, molecule: wants3D ? molecule : null });
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fallback route for frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Chem-Ed Genius running on port ${PORT}`));
