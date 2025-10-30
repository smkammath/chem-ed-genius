// frontend/app.js (ES module)
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

// utility: escape HTML
function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}

// render LaTeX inline/display using KaTeX for any $...$ or $$...$$ patterns
function renderMathInElementSafe(container) {
  // inline $...$ (non-greedy)
  container.querySelectorAll("span.katex-placeholder").forEach(el => {
    const latex = el.dataset.latex;
    try {
      const html = katex.renderToString(latex, { throwOnError:false, trust: true, macros: {"\\ce": "\\ce"} });
      el.outerHTML = html;
    } catch (err) {
      el.textContent = latex;
    }
  });
}

// Convert raw assistant text into safe HTML with katex placeholders
function formatAssistantText(raw) {
  // escape first
  let s = esc(raw);

  // Convert $$...$$ -> display math block
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, latex) => {
    // placeholder span so we can render with katex later
    return `<div class="display-math katex-placeholder" data-latex="${esc(latex.trim())}"></div>`;
  });

  // Convert inline $...$ -> span placeholder
  s = s.replace(/\$([^\$]+?)\$/g, (m, latex) => {
    return `<span class="katex-placeholder" data-latex="${esc(latex.trim())}"></span>`;
  });

  // Convert newlines to <br> (preserve paragraphs)
  s = s.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>");
  s = `<p>${s}</p>`;

  // Also convert simple markdown-like bullets to ul (very small handling)
  s = s.replace(/(<p>)(?:- |• )(.+?)(<\/p>)/g, "<ul><li>$2</li></ul>");

  return s;
}

// append message to chat
function appendMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `msg ${role === "you" ? "you" : "assistant"}`;

  const roleLabel = role === "you" ? "You:" : "Chem-Ed Genius:";
  const content = document.createElement("div");
  content.className = "content";

  // build html
  if (role === "you") {
    content.innerHTML = `<div class="role">${esc(roleLabel)}</div><div class="bubble">${esc(text)}</div>`;
  } else {
    const formatted = formatAssistantText(text);
    content.innerHTML = `<div class="role">${esc(roleLabel)}</div><div class="bubble">${formatted}</div>`;
  }

  wrapper.appendChild(content);
  chatArea.appendChild(wrapper);
  chatArea.scrollTop = chatArea.scrollHeight;

  // after DOM inserted render math placeholders
  renderMathInElementSafe(wrapper);

  // Add "View 3D" button if a molecule name or \ce{...} is present
  if (role !== "you") {
    // try find \ce{...}
    const ceMatch = text.match(/\\ce\{([^}]+)\}/);
    const formulaMatch = text.match(/\b([A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)+)\b/); // crude formula detection
    const candidate = ceMatch ? ceMatch[1] : (formulaMatch ? formulaMatch[1] : null);
    if (candidate) {
      const btn = document.createElement("button");
      btn.className = "btn small";
      btn.textContent = "View 3D";
      btn.style.marginLeft = "12px";
      btn.onclick = () => visualizeMolecule(candidate);
      // append to last bubble
      wrapper.querySelector(".bubble").appendChild(btn);
    }
  }
}

// call backend /api/chat
async function sendPrompt(prompt) {
  appendMessage("you", prompt);
  appendMessage("assistant", "Thinking...");

  try {
    const res = await fetch("/api/chat", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ prompt })
    });
    const json = await res.json();
    // remove the "Thinking..." placeholder (last assistant message)
    const placeholders = Array.from(chatArea.querySelectorAll(".msg.assistant .bubble"));
    const lastBubble = placeholders[placeholders.length - 1];
    if (lastBubble) lastBubble.innerHTML = ""; // clear placeholder

    if (!json.ok) {
      appendMessage("assistant", "Error: " + (json.error || "Server error"));
      return;
    }
    // If server replied with message (out-of-scope or answer)
    appendMessage("assistant", json.message || json.result || "");
  } catch (err) {
    appendMessage("assistant", "Network / server error: " + (err?.message || err));
  }
}

// call API visualize -> show modal with 3Dmol
async function visualizeMolecule(moleculeName) {
  try {
    // call visualize endpoint
    const res = await fetch("/api/visualize", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ molecule: moleculeName })
    });
    const json = await res.json();
    if (!json.ok) {
      appendMessage("assistant", `Visualization failed: ${json.error || "unknown"}`);
      return;
    }

    currentSdf = json.sdf || null;
    currentCid = json.cid || null;
    viewerCIDSpan.textContent = currentCid ? `CID: ${currentCid}` : "";

    // show modal
    viewerModal.classList.remove("hidden");
    viewerModal.setAttribute("aria-hidden","false");

    // init 3Dmol viewer
    // clear previous
    viewerDiv.innerHTML = "";

    // viewer config
    glViewer = $3Dmol.createViewer(viewerDiv, {
      defaultcolors: $3Dmol.rasmolElementColors
    });

    // add model and style
    glViewer.addModel(currentSdf, "sdf");
    glViewer.setStyle({}, {stick:{radius:0.15}, sphere:{radius:0.3}});
    glViewer.zoomTo();
    glViewer.render();
  } catch (err) {
    appendMessage("assistant", "3D visualization error: " + (err?.message || err));
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

// wire up form
if (chatForm) {
  chatForm.addEventListener("submit", (evt) => {
    evt.preventDefault();
    const v = promptInput.value && promptInput.value.trim();
    if (!v) return;
    sendPrompt(v);
    promptInput.value = "";
  });
}

// modal close buttons
if (modalClose) modalClose.addEventListener("click", closeModal);
if (downloadSdfBtn) {
  downloadSdfBtn.addEventListener("click", () => {
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
}
if (fitModelBtn) {
  fitModelBtn.addEventListener("click", () => {
    if (glViewer) {
      glViewer.zoomTo();
      glViewer.render();
    }
  });
}

// initial focus
promptInput?.focus();
