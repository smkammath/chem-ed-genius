// frontend/app.js (overwrite file with this)
const chatArea = document.getElementById("chat");
const chatForm = document.getElementById("chatForm");
const promptInput = document.getElementById("promptInput");
const viewerModal = document.getElementById("viewerModal");
const modalClose = document.getElementById("modalClose");
const viewerDiv = document.getElementById("viewer");
const downloadSdfBtn = document.getElementById("downloadSdf");
const fitModelBtn = document.getElementById("fitModel");
const viewerTitle = document.getElementById("viewerTitle");
const viewerCIDSpan = document.getElementById("viewerCID");

let currentSdf = null;
let currentCid = null;
let glViewer = null;

// helpers
const esc = s => String(s || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

// katex rendering helpers (unchanged)
function renderMathInElementSafe(container) {
  container.querySelectorAll("span.katex-placeholder, div.katex-placeholder").forEach(el => {
    const latex = el.dataset.latex;
    try {
      const html = katex.renderToString(latex, { throwOnError:false, trust: true });
      el.outerHTML = html;
    } catch (err) {
      el.textContent = latex;
    }
  });
}

function formatAssistantText(raw) {
  let s = esc(raw);
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, latex) => `<div class="display-math katex-placeholder" data-latex="${esc(latex.trim())}"></div>`);
  s = s.replace(/\$([^\$]+?)\$/g, (m, latex) => `<span class="katex-placeholder" data-latex="${esc(latex.trim())}"></span>`);
  s = s.replace(/\n{2,}/g,"</p><p>").replace(/\n/g,"<br/>");
  s = `<p>${s}</p>`;
  s = s.replace(/(<p>)(?:- |• )(.+?)(<\/p>)/g, "<ul><li>$2</li></ul>");
  return s;
}

function appendMessage(role, text, opts = {}) {
  // remove any existing "Thinking..." placeholder if adding assistant real message
  if (role === "assistant") {
    // remove any previous assistant placeholder with exactly "Thinking..."
    Array.from(chatArea.querySelectorAll(".msg.assistant .bubble")).forEach(b => {
      if (b.textContent.trim() === "Thinking...") b.remove();
    });
  }

  const wrapper = document.createElement("div");
  wrapper.className = `msg ${role === "you" ? "you" : "assistant"}`;

  const roleLabel = role === "you" ? "You:" : "Chem-Ed Genius:";
  const content = document.createElement("div");
  content.className = "content";

  if (role === "you") {
    content.innerHTML = `<div class="role">${esc(roleLabel)}</div><div class="bubble">${esc(text)}</div>`;
  } else {
    const formatted = formatAssistantText(text);
    content.innerHTML = `<div class="role">${esc(roleLabel)}</div><div class="bubble">${formatted}</div>`;
  }

  wrapper.appendChild(content);
  chatArea.appendChild(wrapper);
  chatArea.scrollTop = chatArea.scrollHeight;

  renderMathInElementSafe(wrapper);

  // add View 3D if candidate exists
  if (role !== "you") {
    const ceMatch = text.match(/\\ce\{([^}]+)\}/);
    const formulaMatch = text.match(/\b([A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)+)\b/);
    const candidate = ceMatch ? ceMatch[1] : (formulaMatch ? formulaMatch[1] : null);
    if (candidate && !opts.no3dButton) {
      const btn = document.createElement("button");
      btn.className = "btn small";
      btn.textContent = "View 3D";
      btn.style.marginLeft = "12px";
      btn.onclick = () => visualizeMolecule(candidate);
      const bubble = wrapper.querySelector(".bubble");
      bubble.appendChild(btn);
    }
  }
}

// safe fetch-json: reads text then parse
async function safeFetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!text) {
    // empty body
    return { ok: false, status: res.status, error: `Empty response body (status ${res.status})` };
  }
  try {
    const data = JSON.parse(text);
    return { ok: true, status: res.status, data };
  } catch (err) {
    return { ok: false, status: res.status, error: `Failed to parse JSON (status ${res.status}): ${err.message}`, raw: text };
  }
}

// send prompt to backend /api/chat
async function sendPrompt(prompt) {
  // add user message and assistant thinking placeholder
  appendMessage("you", prompt);
  appendMessage("assistant", "Thinking...", { no3dButton:true });

  try {
    const result = await safeFetchJSON("/api/chat", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ prompt })
    });

    if (!result.ok) {
      appendMessage("assistant", `Network / server error: ${result.error || 'unknown'}${result.raw ? '\nRaw response: ' + result.raw : ''}`);
      return;
    }

    const json = result.data;
    if (!json) {
      appendMessage("assistant", "Server returned no JSON.");
      return;
    }
    if (json.ok === false) {
      appendMessage("assistant", `Server error: ${json.error || 'unknown'}`);
      return;
    }
    const message = json.message || json.result || "";
    appendMessage("assistant", message);
  } catch (err) {
    appendMessage("assistant", "Network error: " + (err.message || err));
  }
}

// visualize molecule (calls /api/visualize)
async function visualizeMolecule(moleculeName) {
  appendMessage("assistant", `Preparing 3D viewer for ${moleculeName}...`, { no3dButton:true });

  try {
    const result = await safeFetchJSON("/api/visualize", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ molecule: moleculeName })
    });

    if (!result.ok) {
      appendMessage("assistant", `3D visualization error: ${result.error || 'no-json'}`);
      return;
    }

    const json = result.data;
    if (!json.ok) {
      appendMessage("assistant", `Visualization failed: ${json.error || 'unknown'}`);
      return;
    }

    currentSdf = json.sdf || null;
    currentCid = json.cid || null;
    viewerCIDSpan.textContent = currentCid ? `CID: ${currentCid}` : "";

    if (!currentSdf) {
      appendMessage("assistant", "Visualization failed: no SDF returned by server.");
      return;
    }

    // show modal and render
    viewerModal.classList.remove("hidden");
    viewerModal.setAttribute("aria-hidden","false");
    viewerDiv.innerHTML = "";
    glViewer = $3Dmol.createViewer(viewerDiv, { defaultcolors: $3Dmol.rasmolElementColors });
    glViewer.addModel(currentSdf, "sdf");
    glViewer.setStyle({}, {stick:{radius:0.15}, sphere:{radius:0.3}});
    glViewer.zoomTo();
    glViewer.render();
  } catch (err) {
    appendMessage("assistant", "3D visualization error: " + (err.message || err));
  }
}

function closeModal() {
  viewerModal.classList.add("hidden");
  viewerModal.setAttribute("aria-hidden","true");
  viewerDiv.innerHTML = "";
  currentSdf = null;
  currentCid = null;
  glViewer = null;
}

// event wiring
if (chatForm) {
  chatForm.addEventListener("submit", (evt) => {
    evt.preventDefault();
    const v = promptInput.value && promptInput.value.trim();
    if (!v) return;
    sendPrompt(v);
    promptInput.value = "";
  });
}
if (modalClose) modalClose.addEventListener("click", closeModal);
if (downloadSdfBtn) downloadSdfBtn.addEventListener("click", () => {
  if (!currentSdf) return;
  const blob = new Blob([currentSdf], {type:"chemical/x-mdl-sdfile"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (currentCid ? `compound_${currentCid}.sdf` : "molecule.sdf");
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});
if (fitModelBtn) fitModelBtn.addEventListener("click", () => { if (glViewer) { glViewer.zoomTo(); glViewer.render(); } });

promptInput?.focus();
