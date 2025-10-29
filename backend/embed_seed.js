/**
 * embed_seed.js
 * Usage: set OPENAI_API_KEY in env then run `npm run seed-embeddings`
 * This will replace embeddings_data.json contents with real embeddings for seed texts.
 */
const { embedText } = require("./embeddings");
const fs = require("fs");
const path = require("path");

const EMB_FILE = path.join(__dirname, "embeddings_data.json");

const seedTexts = [
  "Atoms consist of a nucleus containing protons and neutrons, with electrons occupying orbitals.",
  "Oxidation involves loss of electrons; reduction involves gain of electrons.",
  "pH measures hydrogen ion concentration; lower pH means higher acidity.",
  "Ionic bonds form through electrostatic attraction between oppositely charged ions.",
  "Covalent bonds form when atoms share electron pairs to achieve stable electronic configurations."
];

(async () => {
  try {
    const out = [];
    for (const t of seedTexts) {
      const emb = await embedText(t);
      out.push({ text: t, embedding: emb });
      console.log("Seeded:", t.slice(0,40));
    }
    fs.writeFileSync(EMB_FILE, JSON.stringify(out, null, 2), "utf8");
    console.log("Embeddings seeded to", EMB_FILE);
  } catch (e) {
    console.error("Error seeding:", e.message);
  }
})();
