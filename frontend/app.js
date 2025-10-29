// ========================================
//  CHEM-ED GENIUS FRONTEND LOGIC ⚗️
//  Final improved cleaner for LaTeX/markdown chemistry output
// ========================================

const promptForm = document.getElementById("promptForm");
const promptInput = document.getElementById("prompt");
const conversation = document.getElementById("conversation");
const gradeSelect = document.getElementById("grade");
const modeSelect = document.getElementById("mode");
const apiInput = document.getElementById("apiUrl");

// Auto-connect backend (edit if different)
let backendBase = "https://chem-ed-genius.onrender.com";
apiInput.value = backendBase;
apiInput.readOnly = true;
apiInput.style.background = "#f7f7f7";
apiInput.style.color = "#666";
apiInput.style.cursor = "not-allowed";

// Submit handler
promptForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userPrompt = promptInput.value.trim();
  if (!userPrompt) return;

  appendMessage("You", userPrompt);
  promptInput.value = "";

  const grade = gradeSelect.value;
  const mode = modeSelect.value;

  try {
    appendMessage("Chem-Ed Genius", "Thinking... 🧠");

    const res = await fetch(`${backendBase}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade, mode, prompt: userPrompt }),
    });

    if (!res.ok) throw new Error(`Server Error (${res.status})`);

    const data = await res.json();

    removeLastBotMessage();
    appendMessage("Chem-Ed Genius", polishedChemText(data.message || ""));
    if (data.summary) appendSummary(data.summary);
  } catch (err) {
    removeLastBotMessage();
    appendMessage("Chem-Ed Genius", `❌ Error: ${err.message}`);
  }
});

// UI helpers
function appendMessage(sender, htmlContent) {
  const msg = document.createElement("div");
  msg.className = "msg";
  msg.innerHTML = `<div class="meta"><b>${sender}:</b></div><div class="body">${htmlContent}</div>`;
  conversation.appendChild(msg);
  conversation.scrollTop = conversation.scrollHeight;
}

function appendSummary(summary) {
  const msg = document.createElement("div");
  msg.className = "msg";
  msg.innerHTML = `<div class="meta"><b>Key Points:</b></div><div class="summary">${polishedChemText(summary)}</div>`;
  conversation.appendChild(msg);
  conversation.scrollTop = conversation.scrollHeight;
}

function removeLastBotMessage() {
  const messages = conversation.querySelectorAll(".msg");
  if (messages.length) {
    const last = messages[messages.length - 1];
    if (last.textContent.includes("Thinking")) last.remove();
  }
}

// ---------- Text polishing pipeline ----------
function polishedChemText(raw) {
  if (!raw) return "";

  // 1) Basic cleanup: remove backticks, long code fences etc.
  let s = String(raw);
  s = s.replace(/```[\s\S]*?```/g, ""); // remove code blocks
  s = s.replace(/`/g, "");               // inline backticks
  s = s.replace(/\\,/g, " ");            // latex small spaces -> space
  s = s.replace(/\\;/g, " ");
  s = s.replace(/\\!/g, "!");
  s = s.replace(/\\:/g, ":");
  s = s.replace(/\\%/g, "%");

  // 2) Convert common LaTeX commands to readable forms
  s = s.replace(/\\xrightarrow\{([^}]*)\}/g, " —($1)→ "); // A \xrightarrow{enz} B -> A —(enz)→ B
  s = s.replace(/\\xrightarrow/g, " → ");
  s = s.replace(/\\rightarrow|\\to|->/g, " → ");
  s = s.replace(/\\leftarrow|<-/g, " ← ");
  s = s.replace(/\\leftrightarrow|<->/g, " ⇌ ");
  s = s.replace(/\\pm/g, " ± ");
  s = s.replace(/\\approx/g, " ≈ ");
  s = s.replace(/\\times/g, " × ");

  // 3) Remove \text{} \mathrm{} \ce{} wrappers
  s = s.replace(/\\text\{([^}]*)\}/g, "$1");
  s = s.replace(/\\mathrm\{([^}]*)\}/g, "$1");
  s = s.replace(/\\ce\{([^}]*)\}/g, "$1");

  // 4) Convert ^{...} and ^x into superscripts and _{...} / _x into subscripts
  // We'll keep <sup> and <sub> tags (renders clean)
  s = s.replace(/\^\{([^}]+)\}/g, (_, m) => `<sup>${escapeHtml(m)}</sup>`);
  s = s.replace(/\^([0-9+\-]+)/g, (_, m) => `<sup>${escapeHtml(m)}</sup>`);
  s = s.replace(/_\{([^}]+)\}/g, (_, m) => `<sub>${escapeHtml(m)}</sub>`);
  s = s.replace(/_(\d+)/g, (_, m) => `<sub>${escapeHtml(m)}</sub>`);

  // 5) Specific electron formatting e^- or e^{ - } -> e⁻ (use sup for minus)
  s = s.replace(/e\^?-?\{?-?(-)?\}?/gi, (match) => {
    // try to catch patterns like e^-, e^{-}, e^{ - }
    const m = match.match(/e\^?\{?\s*([+\-]?)\s*\}?/i);
    if (m) return `e<sup>${escapeHtml(m[1] || "")}</sup>`;
    return match;
  });

  // 6) Remove remaining stray backslashes
  s = s.replace(/\\(?![a-zA-Z])/g, "");

  // 7) Replace multiple spaces & tidy punctuation spacing
  s = s.replace(/\s{2,}/g, " ");
  s = s.replace(/([.,;:!?])([A-Za-z0-9(<])/g, "$1 $2"); // ensure space after punctuation

  // 8) Break into lines and format each line
  const lines = s.split(/\r?\n/).map((ln) => ln.trim());

  const formattedLines = [];
  for (let rawLine of lines) {
    if (!rawLine) {
      // preserve paragraph spacing
      formattedLines.push("<br>");
      continue;
    }

    // If the line contains an arrow or contains plus signs and chemical-like tokens,
    // treat it as an equation and center it (monospace)
    const eqIndicator = /→|<-|->|⇌|<->| \+ /;
    const chemLike = /([A-Za-z][a-z]?|\d)(?:[^\n]*)(→|\+|=)/;

    if (eqIndicator.test(rawLine) || chemLike.test(rawLine)) {
      // remove repeated surrounding words like "Equation:" that may prefix the line
      rawLine = rawLine.replace(/^Equation:\s*/i, "");
      rawLine = rawLine.replace(/^Eq:\s*/i, "");
      // ensure arrow and plus spacing is clean
      rawLine = rawLine.replace(/\s*→\s*/g, " → ").replace(/\s*\+\s*/g, " + ");
      formattedLines.push(
        `<div style="text-align:center;font-family:monospace;background:transparent;padding:6px 8px;border-radius:6px;margin:8px 0;">${rawLine}</div>`
      );
      continue;
    }

    // If the line is a small heading indicator (like "Oxidation:", "Reduction:", "Example:")
    if (/^(Oxidation|Reduction|Example|Breakdown|Visual|Representation|Key Points|Where)\b[:\-]?/i.test(rawLine)) {
      // Bold the heading word then keep the rest
      const m = rawLine.match(/^(Oxidation|Reduction|Example|Breakdown|Visual|Representation|Key Points|Where)\b[:\-]?\s*(.*)/i);
      if (m) {
        const heading = `<strong>${m[1]}:</strong>`;
        const rest = m[2] ? ` ${escapeHtml(m[2])}` : "";
        formattedLines.push(`<div style="margin-top:8px;margin-bottom:4px;">${heading}${rest}</div>`);
        continue;
      }
    }

    // Bulleted lists: lines starting with "-" or "*"
    if (/^[-*]\s+/.test(rawLine)) {
      const text = rawLine.replace(/^[-*]\s+/, "");
      formattedLines.push(`<div style="margin-left:12px;">• ${escapeHtml(text)}</div>`);
      continue;
    }

    // Normal paragraph line — escape and keep spacing
    formattedLines.push(`<div style="margin:6px 0;">${escapeHtml(rawLine)}</div>`);
  }

  // 9) Join, cleanup double breaks
  let out = formattedLines.join("");
  out = out.replace(/(<br>){3,}/g, "<br><br>");
  out = out.replace(/\s{2,}/g, " ");

  return out.trim();
}

// Small escaping helper for safety
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
