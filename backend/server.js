import express from "express";
import cors from "cors";
import path from "path";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const __dirname = path.resolve();
const frontendPath = path.join(__dirname, "frontend");
app.use(express.static(frontendPath));

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// 🧠 Chat logic
app.post("/api/chat", async (req, res) => {
  try {
    const prompt = req.body.prompt?.trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    console.log("🧠 Query:", prompt);

    // ✅ Detect if user explicitly wants 3D visualization
    const wants3D = /(3d|diagram|structure|visualize|model|geometry)/i.test(prompt);

    // ✅ Identify known molecules or compounds from the text
    const knownMolecules = {
      "ethanol": "C2H5OH",
      "methanol": "CH3OH",
      "dimethyl alcohol": "CH3OH",
      "methyl alcohol": "CH3OH",
      "water": "H2O",
      "ammonia": "NH3",
      "methane": "CH4",
      "carbon dioxide": "CO2",
      "oxygen": "O2",
      "hydrogen": "H2",
      "glucose": "C6H12O6"
    };

    let molecule = null;
    for (const [name, formula] of Object.entries(knownMolecules)) {
      if (prompt.toLowerCase().includes(name)) {
        molecule = { name, formula };
        break;
      }
    }

    // ✅ Build explanation
    let explanation = "";

    if (molecule) {
      explanation = `**Explanation:** The molecule **${molecule.name} (${molecule.formula})** involves covalent bonding and exhibits characteristic molecular geometry. It typically follows the valence bond and hybridization principles.`;
    } else {
      explanation = `**Explanation:** ${prompt.charAt(0).toUpperCase() + prompt.slice(1)} involves chemical interactions explained by covalent or ionic bonding concepts, depending on the compound and context.`;
    }

    // ✅ Add 3D only when explicitly requested
    if (wants3D && molecule) {
      explanation += `  
You can visualize the molecular geometry interactively below.  
View 3D`;
    }

    res.json({ answer: explanation, molecule: wants3D && molecule ? molecule.formula : null });
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Chem-Ed Genius running on port ${PORT}`));
