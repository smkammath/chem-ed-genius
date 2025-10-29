// ========================================
//  CHEM-ED GENIUS FRONTEND LOGIC ⚗️
//  Author: Madhu (smkammath)
//  Purpose: Clean text output, no raw HTML tags
// ========================================

// === UI ELEMENTS ===
const promptForm = document.getElementById("promptForm");
const promptInput = document.getElementById("prompt");
const conversation = document.getElementById("conversation");
const gradeSelect = document.getElementById("grade");
const modeSelect = document.getElementById("mode");
const apiInput = document.getElementById("apiUrl");

// === AUTO-CONNECT BACKEND ===
let backendBase = "https://chem-ed-genius.onrender.com"; // your backend URL
apiInput.value = backendBase;
apiInput.readOnly = true;
apiInput.style.background = "#f7f7f7";
apiInput.style.color = "#666";
apiInput.style.cursor = "not-allowed";

// === CHAT FUNCTION ===
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grade,
        mode,
        prompt: userPrompt,
      }),
    });

    if (!res.ok) throw new Error(`Server Error (${res.status})`);

    const data = await res.json();

    // Remove "Thinking..." placeholder
    removeLastBotMessage();

    // Display the response nicely formatted
    appendMessage("Chem-Ed Genius", formatText(data.message));

    // Add summary if available
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

  msg.innerHTML = `<div class="meta"><b>${sender}:</b></div>
                   <div class="body">${text}</div>`;
  conversation.appendChild(msg);
  conversation.scrollTop = conversation.scrollHeight;
}

function appendSummary(summary) {
  const msg = document.createElement("div");
  msg.className = "msg";
  msg.innerHTML = `<div class="meta"><b>Key Points:</b></div>
                   <div class="summary">${formatText(summary)}</div>`;
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

// === CLEAN TEXT FORMATTER ===
function formatText(text) {
  if (!text) return "";

  return (
    text
      // Replace markdown-style headers (###, ##, #) with plain text
      .replace(/^###\s*/gm, "")
      .replace(/^##\s*/gm, "")
      .replace(/^#\s*/gm, "")
      // Replace LaTeX blocks like \[...\] with plain equations
      .replace(/\\\[(.*?)\\\]/g, " $1 ")
      // Replace subscript and superscript patterns
      .replace(/(\d+)/g, "<sub>$1</sub>")
      .replace(/\^(\d+)/g, "<sup>$1</sup>")
      // Replace bold and italic markdown with plain text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      // Replace bullet points with dashes
      .replace(/^- /gm, "• ")
      // Convert newlines to <br> for readability
      .replace(/\n/g, "<br>")
  );
}
