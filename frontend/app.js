// frontend/app.js
const API_URL = window.location.origin.replace(/\/$/, "") ; // will call same origin if proxied; or set explicitly: "https://chem-ed-genius.onrender.com"

const chatBox = document.querySelector("#chat");
const form = document.querySelector("#chatForm");
const promptEl = document.querySelector("#prompt");

// append message helper
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

// render Markdown-ish & KaTeX
function renderMarkdownInto(el, text) {
  if (!text) { el.innerText = ""; return; }
  // Basic transforms for readability (keep it simple):
  let html = text
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^\s*-\s+(.*)/gim, "<li>$1</li>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");

  // Wrap list items into <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gms, (m) => "<ul>" + m + "</ul>");

  el.innerHTML = html;

  // Let KaTeX auto-render (already loaded in index.html)
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

// Detect visualization requests and call /api/visualize
async function detectAndMaybeVisualize(userText, containerEl) {
  const lower = userText.toLowerCase();
  if (lower.includes("visualize") || lower.includes("visualisation") || lower.includes("3d") || lower.includes("structure")) {
    // Attempt to extract name: simple heuristics
    let match = userText.match(/visualize(?:\s+structure)?(?:\s+of)?\s+(.+)/i) ||
                userText.match(/structure of\s+(.+)/i) ||
                userText.match(/visualize\s+(.+)/i);
    if (!match) return;
    let name = (match[1] || "").trim();
    // remove trailing punctuation
    name = name.replace(/[?.!]+$/, "").trim();
    if (!name) return;

    // Create visualization container
    const visWrap = document.createElement("div");
    visWrap.style = "display:block;margin-top:12px;border-radius:10px;overflow:hidden;";
    const viewerDiv = document.createElement("div");
    viewerDiv.style = "height:360px;width:100%;";
    visWrap.appendChild(viewerDiv);
    containerEl.parentNode.appendChild(visWrap);

    // Call backend to get SDF or PDB
    try {
      const resp = await fetch(`${API_URL}/api/visualize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pubchem-name", value: name }),
      });
      const json = await resp.json();
      if (!json || json.error) {
        viewerDiv.innerText = "Visualization not available: " + (json?.error || "");
        return;
      }
      const format = json.format || "sdf";
      const raw = json.data || "";

      // Render using 3Dmol
      const viewer = $3Dmol.createViewer(viewerDiv, { backgroundColor: "white" });
      viewer.addModel(raw, format); // format: 'sdf' or 'pdb'
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

// handle chat form submit
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

    // If user explicitly requested visualization, render it
    await detectAndMaybeVisualize(prompt, botContainer);
  } catch (err) {
    console.error(err);
    botContainer.innerText = "Server error. Try again later.";
  }
});
