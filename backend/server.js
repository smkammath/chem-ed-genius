// =========================================
// 🌟 CHEM-ED GENIUS — Backend Server
// =========================================

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch"; // only if Node < 20
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===========================================
// 🔬 Section A — Chemistry keyword matcher
// ===========================================
function isChemistryRelated(question) {
  const chemKeywords = [
    // --- Core baseline ---
    "atom","molecule","compound","reaction","oxidation","bond",
    "acid","base","ion","electron","valence","hybridization",
    "chemical","equation","balance","formula","structure",
    "organic","inorganic","enthalpy","chemistry",

    // --- Extended comprehensive list ---
    "absolute alcohol","absolute error","absolute temperature","absolute uncertainty","absolute zero",
    "absorbance","absorption","absorption spectroscopy","absorption spectrum","absorptivity",
    "acetals","acetylation","acid anhydride","acid-base indicator","acid-base titration",
    "acid dissociation constant","acidic solution","actinides","actinium","activated complex",
    "activation energy","active transport","activity series","actual yield","acute health effect",
    "acyl group","acylation","adsorption","addition reaction","adulterant","ai chemistry","aether","air",
    "alcohol","alcohols","aldehyde","aldol reaction","aliphatic","aliphatic amino acid","aliphatic compound",
    "aliphatic hydrocarbon","alkali metal","alkaline","alkalinity","alkene","alkenyl group","alkoxide",
    "alkoxy group","allotrope","alloy","alpha decay","alpha radiation","aluminum","aluminium","amalgam",
    "amide","aminals","amine","amine salts","amino acid","amorphous","amphiprotic","amphoteric",
    "amphoteric oxide","analytical chemistry","analytical laboratory","analytical testing","angstrom",
    "angular momentum quantum number","anhydride","anhydrous","anion","anode","anti-markovnikov addition",
    "anti-periplanar","antiaromaticity","antibonding orbital","antimony","aqua regia","aqueous",
    "aqueous solution","argon","aromatic compound","aromaticity","arsenic","aryl","asymmetric synthesis",
    "astatine","atomic mass","atomic mass unit","atomic number","atomic radius","atomic solid","atomic volume",
    "atomic weight","atmosphere","atp","aufbau principle","austenite","avogadro’s law","avogadro’s number",
    "azides","azeotrope","azimuthal quantum number",

    "back titration","balanced equation","balmer series","background radiation","barium","barometer",
    "base anhydride","base metal","basic","beer’s law","benzene derivatives","beryllium","beta decay",
    "beta particle","binary acid","binary compound","binding energy","biochemistry","bismuth","boiling point",
    "bond energy","boron","boyle’s law","bromine","brønsted–lowry acid","brønsted–lowry base","buffer",

    "cadmium","calcium","calorie","calorimeter","capillary action","carbamates","carbocation","carbon",
    "carbonate","carbonyl","carboxyl group","carboxylic acid","catalyst","cation","celsius","cerium","cesium",
    "chain reaction","charge","charles’s law","chelate","chemical analysis","chemical change","chemical energy",
    "chemical equilibrium","chemical kinetics","chemiluminescence","chromatography","chlorine","chromium",
    "closed system","cobalt","colligative properties","colloid","combination reaction","combustion",
    "common-ion effect","complex ion","concentration","condensation","coordinate bond","coordination compound",
    "copper","corrosion","covalent bond","crystal","crystallize","current","custom synthesis",

    "dalton’s law","de broglie equation","decomposition reaction","deflagration","dehydration reaction",
    "delocalized electron","density","deposition","diffusion","dipole","dipole moment","displacement reaction",
    "distillation","double bond","dry ice","dynamic equilibrium","dysprosium",

    "effective nuclear charge","effervescence","einsteinium","electrochemistry","electrolysis",
    "electrolyte","electrolytic cell","electron affinity","electron configuration","electronegativity",
    "element","empirical formula","endothermic","energy","enthalpy","entropy","enzyme","equilibrium constant",
    "ester","ether","evaporation","exothermic","exothermic reaction",

    "faraday constant","fatty acid","fission","flame test","fluorescence","fluorine","free radical",
    "freezing point","fusion",

    "gas","gay-lussac’s law","germanium","gibbs free energy","gold","grignard reaction","ground state",

    "haber process","half-life","halide","halogen","heat capacity","helium","henry’s law","hess’s law",
    "heterogeneous","homogeneous","hydration","hydrocarbon","hydrogen","hydrogen bond","hydrolysis",
    "hydroxyl group","hypothesis",

    "ideal gas law","immiscible","indicator","industrial chemistry","ionic bond","ionization energy",
    "isomer","isotopes","iupac","joule","kelvin","ketone","kinetic energy","lanthanides","lead",
    "le chatelier’s principle","lewis acid","lewis base","ligand","limiting reactant","lithium",
    "london dispersion force","magnesium","manganese","mass","matter","melting point","metal","mixture",
    "molar mass","mole","molecular formula","molecular orbital","molecule","monomer","neon","neutron",
    "nickel","nitrogen","noble gas","nonpolar","nuclear fission","nucleophile","nucleophilicity",
    "nucleus","octet rule","open system","orbital","organic compound","oxidation","oxide","oxygen",
    "palladium","paramagnetism","periodic table","ph","phosphorus","photon","pi bond","planck’s constant",
    "polar bond","polymer","polymerization","potassium","precipitate","pressure","product","proton",
    "quantum number","radioactivity","raoult’s law","reaction rate","reactant","reagent","redox reaction",
    "reduction","resonance","rhodium","rna","salt","samarium","scandium","science","scientific method",
    "selenium","sigma bond","single displacement reaction","sodium","solid","solubility","solute","solution",
    "solvent","specific heat","spectroscopy","spin quantum number","standard solution","stoichiometry",
    "strong acid","strong base","sublimation","substitution reaction","sulfur","surface tension",
    "synthesis reaction","tantalum","temperature","theoretical yield","thermodynamics","thiol","thorium",
    "tin","titanium","titration","transition metal","triple point","tungsten","ultraviolet radiation",
    "unit","unsaturated","uranium","valence bond theory","valence electron","vapor pressure","vsepr",
    "water","wavelength","weak acid","weak base","xenon","x-rays","yield","ytterbium","yttrium",
    "zinc","zirconium","zwitterion",
  ];

  const lowerQ = question.toLowerCase();
  const hasSymbols = /[A-Z][a-z]?\d*/.test(question);
  return chemKeywords.some((word) => lowerQ.includes(word)) || hasSymbols;
}

// ===========================================
// 🔹 Chemistry Q&A Endpoint (/api/chat)
// ===========================================
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ message: "No question provided." });

  if (!isChemistryRelated(prompt)) {
    return res.json({
      message:
        "⚠️ I'm Chem-Ed Genius 🔬 — I only answer chemistry-related questions (atoms, molecules, reactions, bonding, and chemical engineering).",
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
          You are Chem-Ed Genius, an expert chemistry tutor.
          You only answer chemistry-related questions.
          Use KaTeX-compatible LaTeX for chemical equations (inside $ or $$).
          Example: "To balance $$C_2H_6 + O_2 \\rightarrow CO_2 + H_2O$$"
          No \\text{} wrappers for elements.
          Keep format clean: Markdown + KaTeX.`,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 900,
    });

    res.json({ message: response.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===========================================
// 🔹 3D Visualization Endpoint (/api/visualize)
// ===========================================
async function fetchPubChemSdfByName(name) {
  const url3d = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/SDF?record_type=3d`;
  let resp = await fetch(url3d);
  if (resp.ok) return { format: "sdf", data: await resp.text() };

  const url2d = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/SDF`;
  resp = await fetch(url2d);
  if (resp.ok) return { format: "sdf", data: await resp.text() };

  throw new Error("PubChem: Not found");
}

async function fetchPubChemSdfByCid(cid) {
  const url3d = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${encodeURIComponent(cid)}/SDF?record_type=3d`;
  let resp = await fetch(url3d);
  if (resp.ok) return { format: "sdf", data: await resp.text() };

  const url2d = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${encodeURIComponent(cid)}/SDF`;
  resp = await fetch(url2d);
  if (resp.ok) return { format: "sdf", data: await resp.text() };

  throw new Error("PubChem: CID not found");
}

async function fetchPdb(pdbId) {
  const id = pdbId.trim().toUpperCase();
  const url = `https://files.rcsb.org/download/${id}.pdb`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("PDB not found");
  const pdbText = await resp.text();
  return { format: "pdb", data: pdbText };
}

async function generateSdfFromSmilesWithRdkit(smiles) {
  const rdkitUrl = process.env.RDKIT_URL;
  if (!rdkitUrl) throw new Error("RDKit URL not configured (optional).");

  const url = rdkitUrl.replace(/\/$/, "") + "/smiles_to_sdf";
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ smiles }),
  });

  if (!resp.ok) throw new Error("RDKit server conversion failed.");
  return { format: "sdf", data: await resp.text() };
}

app.post("/api/visualize", async (req, res) => {
  const { type, value } = req.body || {};
  if (!type || !value)
    return res.status(400).json({ error: "type & value required" });

  try {
    if (type === "pubchem-name") return res.json(await fetchPubChemSdfByName(value));
    if (type === "pubchem-cid") return res.json(await fetchPubChemSdfByCid(value));
    if (type === "pdb") return res.json(await fetchPdb(value));

    if (type === "smiles") {
      if (process.env.RDKIT_URL)
        return res.json(await generateSdfFromSmilesWithRdkit(value));

      // fallback: PubChem lookup
      const lookup = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(value)}/cids/JSON`;
      const r = await fetch(lookup);
      if (r.ok) {
        const json = await r.json();
        const cids = json?.IdentifierList?.CID;
        if (cids?.length) return res.json(await fetchPubChemSdfByCid(cids[0]));
      }
      throw new Error("Could not convert SMILES to 3D (no RDKit server).");
    }

    res.status(400).json({ error: "Unknown visualization type." });
  } catch (err) {
    console.error("Visualization error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===========================================
// 🚀 Server Startup
// ===========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Chem-Ed Genius backend running on port ${PORT}`));
