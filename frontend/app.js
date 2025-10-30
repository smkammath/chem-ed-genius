// ======================================================
// 🌟 Chem-Ed Genius 3D Frontend — Reaction Visualization Enabled
// ======================================================

const API_URL = "https://chem-ed-genius.onrender.com"; // Replace with your backend URL

const chatBox = document.querySelector("#chat");
const form = document.querySelector("#chatForm");
const promptEl = document.querySelector("#prompt");

// Append message helper
function appendMessage(sender, text, cls = "bot") {
  const wrapper = document.createElement("div");
  wrapper.className = "message " + (cls === "user" ? "user" : "bot");
  const strong = document.createElement("strong");
  strong.textContent = sender;
  const content = document.createElement("div");
  content.className = "content";
  content.innerText = text;
  wrapper.appendChild(strong);
  wrapper.appendChild(content);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
  return content;
}

// Render Markdown + KaTeX
function renderMarkdownInto(el, text) {
  if (!text) {
    el.innerText = "";
    return;
  }

  let html = text
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^\s*-\s+(.*)/gim, "<li>$1</li>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gms, (m) => "<ul>" + m + "</ul>");
  el.innerHTML = html;

  try {
    if (window.renderMathInElement) {
      window.renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
      });
    }
  } catch (err) {
    console.warn("KaTeX render error", err);
  }
}

// Detect and visualize molecules or reactions
async function detectAndMaybeVisualize(userText, containerEl) {
  const lower = userText.toLowerCase();

  // Case 1: Reaction detected (with arrow or 'react' keywords)
  if (lower.includes("->") || lower.includes("→") || lower.includes("reaction")) {
    await visualizeReaction(userText, containerEl);
    return;
  }

  // Case 2: Single molecule visualization
  if (
    lower.includes("visualize") ||
    lower.includes("visualisation") ||
    lower.includes("3d") ||
    lower.includes("structure")
  ) {
    let match =
      userText.match(/visualize(?:\s+structure)?(?:\s+of)?\s+(.+)/i) ||
      userText.match(/structure of\s+(.+)/i) ||
      userText.match(/visualize\s+(.+)/i);
    if (!match) return;
    let name = (match[1] || "").trim().replace(/[?.!]+$/, "");
    if (!name) return;

    const visWrap = document.createElement("div");
    visWrap.style =
      "display:block;margin-top:12px;border-radius:10px;overflow:hidden;background:rgba(255,255,255,0.95);padding:8px;";
    const viewerDiv = document.createElement("div");
    viewerDiv.style = "height:360px;width:100%;";
    visWrap.appendChild(viewerDiv);
    containerEl.parentNode.appendChild(visWrap);

    try {
      const resp = await fetch(`${API_URL}/api/visualize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pubchem-name", value: name }),
      });
      const json = await resp.json();
      if (!json || json.error) {
        viewerDiv.innerText =
          "Visualization not available: " + (json?.error || "");
        return;
      }
      const format = json.format || "sdf";
      const raw = json.data || "";

      const viewer = $3Dmol.createViewer(viewerDiv, { backgroundColor: "white" });
      viewer.addModel(raw, format);
      viewer.setStyle({}, { stick: {}, sphere: { scale: 0.25 } });
      viewer.zoomTo();
      viewer.render();
      viewer.rotate(90);
    } catch (err) {
      console.error("visualize error", err);
      viewerDiv.innerText = "Could not load 3D structure.";
    }
  }
}

// 🧪 Reaction Visualization
async function visualizeReaction(userText, containerEl) {
  // Try to extract reactants and products
  let match = userText.match(/(.+?)(?:->|→)(.+)/);
  if (!match) {
    // fallback heuristic
    const reactionWords = userText.split("react").filter(Boolean);
    if (reactionWords.length >= 2) {
      match = [null, reactionWords[0], reactionWords[1]];
    }
  }
  if (!match) return;

  const reactantsText = match[1].replace(/balance|visualize|reaction|between/gi, "").trim();
  const productsText = match[2].replace(/reaction|and|produce|form/gi, "").trim();

  if (!reactantsText || !productsText) return;

  // Helper to convert compound name to SMILES via PubChem REST
  async function nameToSmiles(name) {
    try {
      const encoded = encodeURIComponent(name.trim());
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/property/CanonicalSMILES/TXT`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const smiles = (await resp.text()).trim();
      return smiles || null;
    } catch {
      return null;
    }
  }

  // Convert each compound (split by +)
  async function convertSide(text) {
    const parts = text.split("+").map((x) => x.trim()).filter(Boolean);
    const smilesArr = [];
    for (const p of parts) {
      const s = await nameToSmiles(p);
      if (s) smilesArr.push(s);
    }
    return smilesArr.join(".");
  }

  const reactantSmiles = await convertSide(reactantsText);
  const productSmiles = await convertSide(productsText);

  if (!reactantSmiles || !productSmiles) {
    const warn = document.createElement("div");
    warn.innerText = "⚠️ Could not identify compounds for reaction visualization.";
    containerEl.parentNode.appendChild(warn);
    return;
  }

  // Container for the two viewers
  const wrap = document.createElement("div");
  wrap.style =
    "display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:12px;background:rgba(255,255,255,0.95);padding:8px;border-radius:10px;";
  const leftDiv = document.createElement("div");
  const rightDiv = document.createElement("div");
  leftDiv.style = rightDiv.style = "width:48%;height:320px;";
  wrap.appendChild(leftDiv);
  wrap.appendChild(rightDiv);
  containerEl.parentNode.appendChild(wrap);

  // Call backend /api/visualize type=reaction
  try {
    const resp = await fetch(`${API_URL}/api/visualize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "reaction",
        value: { reactantSmiles, productSmiles },
      }),
    });
    const json = await resp.json();
    if (!json || json.error) {
      leftDiv.innerText = rightDiv.innerText =
        "Reaction visualization failed: " + (json?.error || "");
      return;
    }
    const { left, right } = json.data || {};
    if (!left || !right) {
      leftDiv.innerText = rightDiv.innerText =
        "Reaction structures unavailable.";
      return;
    }

    const v1 = $3Dmol.createViewer(leftDiv, { backgroundColor: "white" });
    v1.addModel(left, "sdf");
    v1.setStyle({}, { stick: {}, sphere: { scale: 0.25 } });
    v1.zoomTo();
    v1.render();

    const v2 = $3Dmol.createViewer(rightDiv, { backgroundColor: "white" });
    v2.addModel(right, "sdf");
    v2.setStyle({}, { stick: {}, sphere: { scale: 0.25 } });
    v2.zoomTo();
    v2.render();

    // Arrow indicator between them
    const arrow = document.createElement("div");
    arrow.innerHTML = "&#x27A1;"; // →
    arrow.style =
      "font-size:48px;color:#0aa;text-align:center;width:4%;text-shadow:0 0 10px #0ff;";
    wrap.insertBefore(arrow, rightDiv);
  } catch (err) {
    console.error("Reaction visualize error:", err);
    leftDiv.innerText = rightDiv.innerText = "⚠️ Could not load reaction data.";
  }
}

// Handle chat form
form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const prompt = promptEl.value.trim();
  if (!prompt) return;

  const userEl = appendMessage("You", prompt, "user");
  promptEl.value = "";

  const botContainer = appendMessage("Chem-Ed Genius", "Thinking...", "bot");

  try {
    const r = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const json = await r.json();
    const msg = json.message || json.error || "No answer.";
    renderMarkdownInto(botContainer, msg);

    await detectAndMaybeVisualize(prompt, botContainer);
  } catch (err) {
    console.error(err);
    botContainer.innerText = "Server error. Try again later.";
  }
});
