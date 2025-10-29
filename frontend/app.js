// ========================================
//  CHEM-ED GENIUS FRONTEND ⚗️
//  Final Version: Clean readable chemistry text (no LaTeX, no markdown)
// ========================================

// === ELEMENTS ===
const promptForm = document.getElementById("promptForm");
const promptInput = document.getElementById("prompt");
const conversation = document.getElementById("conversation");
const gradeSelect = document.getElementById("grade");
const modeSelect = document.getElementById("mode");
const apiInput = document.getElementById("apiUrl");

// === CONFIG ===
let backendBase = "https://chem-ed-genius.onrender.com"; // your Render backend
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
    appendMessage("Chem-Ed Genius", cleanChemistryText(data.message));

    if (data.summary) appendSummary(data.summary);
  } catch (err) {
    removeLastBotMessage();
    appendMessage("Chem-Ed Genius", `❌ Error: ${err.message}`);
  }
});

// === MESSAGE HELPERS ===
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = "msg";
  msg.innerHTML = `<div class="meta"><b>${sender}:</b></div><div class="body">${text}</div>`;
  conversation.appendChild(msg);
  conversation.scrollTop = conversation.scrollHeight;
}

function appendSummary(summary) {
  const msg = document.createElement("div");
  msg.className = "msg";
  msg.innerHTML = `<div class="meta"><b>Key Points:</b></div><div class="summary">${cleanChemistryText(summary)}</div>`;
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

// === TEXT CLEANER (Magic Sauce) ===
function cleanChemistryText(text) {
  if (!text) return "";

  return (
    text
      // Remove Markdown headers (###, ##, #)
      .replace(/^#+\s*/gm, "")
      // Remove bold and italic markdown
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      // Replace LaTeX style arrows and operators
      .replace(/\\rightarrow|->/g, "→")
      .replace(/\\leftarrow|<-/g, "←")
      .replace(/\\leftrightarrow|<->/g, "⇌")
      // Replace superscripts and subscripts (^, _)
      .replace(/\^(\{[^}]+\}|\S)/g, (_, m) => `<sup>${m.replace(/[{}]/g, "")}</sup>`)
      .replace(/_(\{[^}]+\}|\S)/g, (_, m) => `<sub>${m.replace(/[{}]/g, "")}</sub>`)
      // Replace \text{} LaTeX tags
      .replace(/\\text\{([^}]+)\}/g, "$1")
      // Replace remaining LaTeX braces
      .replace(/[{}]/g, "")
      // Replace math block markers \[ and \]
      .replace(/\\\[|\\\]/g, "")
      // Clean up equations
      .replace(/\s{2,}/g, " ")
      // Line breaks
      .replace(/\n/g, "<br>")
      // Remove triple dots or backticks
      .replace(/```/g, "")
      .replace(/`/g, "")
      .trim()
  );
}
