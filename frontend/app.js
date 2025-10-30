// ======================================================
// ⚛️ Chem-Ed Genius 3D Frontend — Reaction + Energy Visualization
// ======================================================

const API_URL = "https://chem-ed-genius.onrender.com"; // backend URL

const chatBox = document.querySelector("#chat");
const form = document.querySelector("#chatForm");
const promptEl = document.querySelector("#prompt");

// ---------- Utility UI ----------
function appendMessage(sender, text, cls = "bot") {
  const wrap = document.createElement("div");
  wrap.className = "message " + (cls === "user" ? "user" : "bot");
  const strong = document.createElement("strong");
  strong.textContent = sender;
  const content = document.createElement("div");
  content.className = "content";
  content.innerText = text;
  wrap.appendChild(strong);
  wrap.appendChild(content);
  chatBox.appendChild(wrap);
  chatBox.scrollTop = chatBox.scrollHeight;
  return content;
}

function renderMarkdownInto(el, text) {
  if (!text) return;
  let html = text
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
  el.innerHTML = html;
  try {
    if (window.renderMathInElement)
      window.renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
      });
  } catch {}
}

// ---------- 3D Visualization Dispatcher ----------
async function detectAndMaybeVisualize(userText, container) {
  const lower = userText.toLowerCase();
  if (lower.includes("->") || lower.includes("→") || lower.includes("reaction"))
    return visualizeReaction(userText, container);

  if (
    lower.includes("visualize") ||
    lower.includes("visualisation") ||
    lower.includes("3d") ||
    lower.includes("structure")
  )
    return visualizeMolecule(userText, container);
}

// ---------- Single Molecule ----------
async function visualizeMolecule(userText, container) {
  const match =
    userText.match(/visualize(?:\s+structure)?(?:\s+of)?\s+(.+)/i) ||
    userText.match(/structure of\s+(.+)/i);
  if (!match) return;
  let name = (match[1] || "").trim().replace(/[?.!]+$/, "");
  const frame = document.createElement("div");
  frame.style =
    "margin-top:10px;background:#fff;border-radius:10px;padding:8px;";
  const viewerDiv = document.createElement("div");
  viewerDiv.style = "height:340px;width:100%;";
  frame.appendChild(viewerDiv);
  container.parentNode.appendChild(frame);

  try {
    const r = await fetch(`${API_URL}/api/visualize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pubchem-name", value: name }),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    const viewer = $3Dmol.createViewer(viewerDiv, { backgroundColor: "white" });
    viewer.addModel(j.data, j.format);
    viewer.setStyle({}, { stick: {}, sphere: { scale: 0.25 } });
    viewer.zoomTo();
    viewer.render();
  } catch (e) {
    viewerDiv.textContent = "❌ Visualization failed: " + e.message;
  }
}

// ---------- Reaction Visualization + Energy ----------
async function visualizeReaction(userText, container) {
  const m = userText.match(/(.+?)(?:->|→)(.+)/);
  if (!m) return;
  const reactantsText = m[1].replace(/balance|visualize|reaction/gi, "").trim();
  const productsText = m[2].replace(/reaction|produce|form/gi, "").trim();

  async function nameToSmiles(name) {
    try {
      const r = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
          name
        )}/property/CanonicalSMILES/TXT`
      );
      return r.ok ? (await r.text()).trim() : null;
    } catch {
      return null;
    }
  }

  async function nameToEnthalpy(name) {
    try {
      const r = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
          name
        )}/property/EnthalpyOfFormation/TXT`
      );
      if (!r.ok) return null;
      const val = parseFloat((await r.text()).trim());
      return isNaN(val) ? null : val;
    } catch {
      return null;
    }
  }

  async function sideInfo(txt) {
    const parts = txt.split("+").map((x) => x.trim());
    let smiles = [];
    let enthalpySum = 0;
    for (const p of parts) {
      const s = await nameToSmiles(p);
      if (s) smiles.push(s);
      const h = await nameToEnthalpy(p);
      if (typeof h === "number") enthalpySum += h;
    }
    return { smiles: smiles.join("."), enthalpy: enthalpySum };
  }

  const left = await sideInfo(reactantsText);
  const right = await sideInfo(productsText);
  if (!left.smiles || !right.smiles)
    return container.insertAdjacentHTML(
      "afterend",
      `<div>⚠️ Could not find SMILES for reaction components.</div>`
    );

  const wrap = document.createElement("div");
  wrap.style =
    "display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;background:#fff;padding:10px;border-radius:12px;";
  const leftDiv = document.createElement("div"),
    rightDiv = document.createElement("div");
  leftDiv.style = rightDiv.style = "width:45%;height:300px;";
  const mid = document.createElement("div");
  mid.style = "width:8%;text-align:center;font-size:42px;";
  wrap.append(leftDiv, mid, rightDiv);
  container.parentNode.appendChild(wrap);

  // Request 3D SDFs
  const visResp = await fetch(`${API_URL}/api/visualize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "reaction",
      value: { reactantSmiles: left.smiles, productSmiles: right.smiles },
    }),
  });
  const vis = await visResp.json();
  if (vis.error) {
    leftDiv.textContent = rightDiv.textContent = vis.error;
    return;
  }

  const v1 = $3Dmol.createViewer(leftDiv, { backgroundColor: "white" });
  v1.addModel(vis.data.left, "sdf");
  v1.setStyle({}, { stick: {}, sphere: { scale: 0.25 } });
  v1.zoomTo();
  v1.render();

  const v2 = $3Dmol.createViewer(rightDiv, { backgroundColor: "white" });
  v2.addModel(vis.data.right, "sdf");
  v2.setStyle({}, { stick: {}, sphere: { scale: 0.25 } });
  v2.zoomTo();
  v2.render();

  // ---------- Energy calculation ----------
  const deltaH = right.enthalpy - left.enthalpy;
  let direction, color, label;
  if (!isNaN(deltaH)) {
    if (deltaH < 0) {
      direction = "down";
      color = "red";
      label = `Exothermic ΔH = ${deltaH.toFixed(1)} kJ/mol`;
    } else if (deltaH > 0) {
      direction = "up";
      color = "dodgerblue";
      label = `Endothermic ΔH = +${deltaH.toFixed(1)} kJ/mol`;
    } else {
      color = "gray";
      label = "ΔH ≈ 0 (kJ/mol)";
    }
    const arrow = document.createElement("div");
    arrow.innerHTML =
      direction === "down" ? "&#x2B07;" : direction === "up" ? "&#x2B06;" : "&#x2192;";
    arrow.style = `color:${color};animation:float 1.5s infinite alternate;text-shadow:0 0 10px ${color};`;
    mid.append(arrow);
    const txt = document.createElement("div");
    txt.textContent = label;
    txt.style = `font-size:14px;color:${color};margin-top:6px;`;
    mid.append(txt);
  } else {
    mid.innerHTML = "&#x27A1;";
  }
}

// ---------- Form submit ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = promptEl.value.trim();
  if (!q) return;
  appendMessage("You", q, "user");
  promptEl.value = "";
  const botCont = appendMessage("Chem-Ed Genius", "Thinking...", "bot");
  try {
    const r = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: q }),
    });
    const j = await r.json();
    renderMarkdownInto(botCont, j.message || j.error || "No answer.");
    await detectAndMaybeVisualize(q, botCont);
  } catch (err) {
    botCont.textContent = "Server error: " + err.message;
  }
});

// ---------- simple arrow animation ----------
const style = document.createElement("style");
style.textContent = `@keyframes float {from{transform:translateY(0)}to{transform:translateY(-6px)}}`;
document.head.append(style);
