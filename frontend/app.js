// frontend/app.js - resilient client for chat + 3D visualization
const chatBox = document.getElementById("chat");
const chatForm = document.getElementById("chatForm");
const input = document.getElementById("promptInput");
const modal = document.getElementById("viewerModal");
const closeModal = document.getElementById("closeModal");
const viewerDiv = document.getElementById("viewer");
const viewerCID = document.getElementById("viewerCID");
const downloadBtn = document.getElementById("downloadSdf");
const fitBtn = document.getElementById("fitModel");

let currentSdf = null;
let currentCid = null;
let viewerInstance = null;

// helper to append message
function appendMessage(who, html) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${who==='you' ? 'you' : 'assistant'}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = html;
  wrap.appendChild(bubble);
  chatBox.appendChild(wrap);
  chatBox.scrollTop = chatBox.scrollHeight;
  renderKaTeXIn(bubble);
  return bubble;
}

function renderKaTeXIn(el){
  // render any katex placeholders or math delimiters
  // We replace math in inline $...$ and display $$...$$ using katex.renderToString
  // This is simple and safe for our needs.
  try {
    // display first
    el.querySelectorAll("code.katex-display").forEach(node=>{
      try { katex.render(node.textContent, node, {displayMode:true, throwOnError:false, trust:true}); }
      catch(e) {}
    });
    // then inline spans marked by data-latex (we don't use here)
  } catch(e){ /* swallow */ }
}

// safe fetchJSON wrapper
async function fetchJSON(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 20000);
  try {
    const r = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timeout);
    const text = await r.text().catch(()=>"");
    try {
      return { ok: true, status: r.status, json: JSON.parse(text) };
    } catch(parseErr) {
      return { ok: false, status: r.status, error: `Invalid JSON received (${parseErr.message})`, raw: text };
    }
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err.message || String(err) };
  }
}

// submit handler
chatForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const prompt = input.value.trim();
  if (!prompt) return;
  input.value = "";
  appendMessage("you", escapeHtml(prompt));

  // show temporary assistant message
  const thinkingBubble = appendMessage("assistant", `<em>Thinking…</em>`);

  const resp = await fetchJSON("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  thinkingBubble.remove();

  if (!resp.ok) {
    appendMessage("assistant", `Network/server error: ${escapeHtml(resp.error || resp.raw || 'unknown')}`);
    return;
  }
  const payload = resp.json;
  if (!payload) {
    appendMessage("assistant", `Empty response from server (status ${resp.status})`);
    return;
  }

  if (!payload.ok) {
    appendMessage("assistant", `Error: ${escapeHtml(payload.error || 'unknown')}`);
    return;
  }

  // message field contains model answer
  const message = payload.message || "No response";
  const bubble = appendMessage("assistant", formatMessageHtml(message));

  // if model produced \ce{...}, add a View 3D button that calls visualize
  const ceMatch = message.match(/\\ce\{([^}]+)\}/);
  if (ceMatch) {
    const mol = ceMatch[1];
    const btn = document.createElement("button");
    btn.textContent = "View 3D";
    btn.style.marginLeft = "12px";
    btn.onclick = () => visualizeMolecule(mol);
    bubble.appendChild(btn);
  } else {
    // also support plain formulas like CH3OH (simple heuristic)
    const simpleMol = (message.match(/\b([A-Z][a-z]?\d*[CHONPS]{0,1}\d*){1,6}\b/));
    if (simpleMol) {
      const mol = simpleMol[0];
      const btn = document.createElement("button");
      btn.textContent = "Visualize";
      btn.style.marginLeft = "12px";
      btn.onclick = () => visualizeMolecule(mol);
      bubble.appendChild(btn);
    }
  }
});

// visualize molecule: call backend /api/visualize
async function visualizeMolecule(molecule) {
  const b = appendMessage("assistant", `Requesting 3D for <strong>${escapeHtml(molecule)}</strong>...`);
  const resp = await fetchJSON("/api/visualize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ molecule })
  });
  b.remove();
  if (!resp.ok) {
    appendMessage("assistant", `3D visualization error: ${escapeHtml(resp.error || resp.raw || resp.status || 'unknown')}`);
    return;
  }
  const payload = resp.json;
  if (!payload.ok) {
    appendMessage("assistant", `Visualization failed: ${escapeHtml(payload.error || 'unknown')}`);
    return;
  }
  // got sdf text
  currentSdf = payload.sdf;
  currentCid = payload.cid || molecule;
  showModalWithSdf(currentSdf, currentCid);
}

function showModalWithSdf(sdf, cid) {
  viewerCID.textContent = `CID / name: ${cid}`;
  currentSdf = sdf;
  currentCid = cid;

  // init viewer safely
  try {
    viewerDiv.innerHTML = "";
    // 3Dmol expects a div and global $3Dmol
    viewerInstance = $3Dmol.createViewer(viewerDiv, { backgroundColor: "white" });
    viewerInstance.addModel(sdf, "sdf");
    viewerInstance.setStyle({}, { stick: { radius: 0.15 }, sphere: { radius: 0.33 } });
    viewerInstance.zoomTo();
    viewerInstance.render();
  } catch (e) {
    appendMessage("assistant", `Viewer init error: ${escapeHtml(e.message || e)}`);
    return;
  }

  modal.classList.remove("hidden");
  chatBox.scrollTop = chatBox.scrollHeight;
}

closeModal.addEventListener("click", () => {
  modal.classList.add("hidden");
  if (viewerInstance) { viewerInstance.clear(); viewerInstance = null; }
});

// close modal on outside click or Escape
modal.addEventListener("click", (e)=> {
  if (e.target === modal) {
    closeModal.click();
  }
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal.click();
});

// download & fit handlers
downloadBtn.addEventListener("click", () => {
  if (!currentSdf) return appendMessage("assistant", "No SDF available to download");
  const blob = new Blob([currentSdf], { type: "chemical/x-mdl-sdfile" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `molecule_${currentCid}.sdf`;
  a.click();
});
fitBtn.addEventListener("click", () => {
  if (viewerInstance) { viewerInstance.zoomTo(); viewerInstance.render(); }
});

// minimal HTML-safe escape
function escapeHtml(s = "") {
  return s.replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}

// simple formatting: preserve newlines, keep \\ce{...} as-is for KaTeX mhchem
function formatMessageHtml(text = "") {
  // convert markdown-like headings to bold
  let out = escapeHtml(text);
  out = out.replace(/####\s*(.+)/g, "<strong>$1</strong>");
  out = out.replace(/\n/g, "<br>");
  // leave \ce{} and $...$ intact for KaTeX render
  // for display math $$...$$ replace with code tag which renderKaTeXIn may process (we keep simple)
  return out;
}
