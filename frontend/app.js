// ========================================
//  CHEM-ED GENIUS FRONTEND ⚗️
//  FINAL CLEAN + FORMATTED OUTPUT VERSION
// ========================================

const promptForm = document.getElementById("promptForm");
const promptInput = document.getElementById("prompt");
const conversation = document.getElementById("conversation");
const gradeSelect = document.getElementById("grade");
const modeSelect = document.getElementById("mode");
const apiInput = document.getElementById("apiUrl");

// === BACKEND CONFIG ===
let backendBase = "https://chem-ed-genius.onrender.com";
apiInput.value = backendBase;
apiInput.readOnly = true;
apiInput.style.background = "#f7f7f7";
apiInput.style.color = "#666";
apiInput.style.cursor = "not-allowed";

// === CHAT HANDLER ===
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
    appendMessage("Chem-Ed Genius", beautifyChemistryText(data.message));

    if (data.summary) appendSummary(data.summary);
  } catch (err) {
    removeLastBotMessage();
    appendMessage("Chem-Ed Genius", `❌ Error: ${err.message}`);
  }
});

// === UI HELPERS ===
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = "msg";
  msg.innerHTML = `<div class="meta"><b>${sender}:</b></div>
                   <div class="body">${text}</div>`;
  conversation.appendChild(msg);
  conversation.scrollTop = conversation.scrollHeight;
}

function appendSummary(summary) {
  const msg = document.createElement("div");
  msg.className = "msg";
  msg.innerHTML = `<div class="meta"><b>Key Points:</b></div>
                   <div class="summary">${beautifyChemistryText(summary)}</div>`;
  conversation.appendChild(msg);
  conversation.scrollTop = conversation.scrollHeight;
}

function removeLastBotMessage() {
  const messages = conversation.querySelectorAll(".msg");
  if (messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.textContent.includes("Thinking")) lastMsg.remove();
  }
}

// ==========================================
// ✨ BEAUTIFIER: MAKES OUTPUT NEAT & READABLE
// ==========================================
function beautifyChemistryText(text) {
  if (!text) return "";

  return (
    text
      // Remove markdown clutter
      .replace(/^#+\s*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      // Convert latex arrows & symbols
      .replace(/\\rightarrow|->/g, "→")
      .replace(/\\leftarrow|<-/g, "←")
      .replace(/\\leftrightarrow|<->/g, "⇌")
      // Superscripts and subscripts
      .replace(/\^(\{[^}]+\}|\S)/g, (_, m) => `<sup>${m.replace(/[{}]/g, "")}</sup>`)
      .replace(/_(\{[^}]+\}|\S)/g, (_, m) => `<sub>${m.replace(/[{}]/g, "")}</sub>`)
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/[{}]/g, "")
      // Math block cleanup
      .replace(/\\\[|\\\]/g, "")
      // Bullet points: clean format
      .replace(/^- /gm, "• ")
      // Add spacing before list points or sections
      .replace(/(Example:)/g, "<br><b>$1</b>")
      .replace(/(Oxidation:)/g, "<br><b>$1</b>")
      .replace(/(Reduction:)/g, "<br><b>$1</b>")
      .replace(/(Equation:)/g, "<br><b>$1</b>")
      .replace(/(Visual Representation|Visual Diagram|Representation)/g, "<br><b>$1</b>")
      // Space after punctuation
      .replace(/([.?!])(\S)/g, "$1 $2")
      // Newline formatting
      .replace(/\n\s*\n/g, "<br><br>")
      .replace(/\n/g, "<br>")
      // Center equations for better clarity
      .replace(
        /([A-Z][a-z]?\d*(?:\s?[+→⇌−]\s?[A-Z][a-z]?\d*)+)/g,
        "<div style='text-align:center;font-family:monospace;margin:6px 0;'>$1</div>"
      )
      // Extra line spacing
      .replace(/(<br>){3,}/g, "<br><br>")
      // Trim
      .trim()
  );
}
