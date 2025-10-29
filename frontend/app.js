// ========================================
//  CHEM-ED GENIUS FRONTEND LOGIC ⚗️
//  Updated: Auto-connect to backend URL
//  Author: Madhu (smkammath)
// ========================================

// === UI ELEMENTS ===
const promptForm = document.getElementById("promptForm");
const promptInput = document.getElementById("prompt");
const conversation = document.getElementById("conversation");
const gradeSelect = document.getElementById("grade");
const modeSelect = document.getElementById("mode");
const apiInput = document.getElementById("apiUrl");

// === AUTO-CONNECT BACKEND ===
// Automatically set the backend API URL (Render backend)
// Works on both GitHub Pages and Render Static Site
let backendBase = "https://chem-ed-genius.onrender.com"; // your backend URL

// If you ever host multiple backends, you can use this smarter rule:
if (window.location.hostname.includes("github.io") || window.location.hostname.includes("onrender.com")) {
  backendBase = "https://chem-ed-genius.onrender.com";
}

// Auto-fill the API field and disable editing
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

    // Clear "thinking" message
    removeLastBotMessage();

    // Display main text
    appendMessage("Chem-Ed Genius", data.message || "No reply received.");

    // If the backend includes any diagrams or summary
    if (data.image) appendImage(data.image);
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
  msg.innerHTML = `<div class="meta"><b>${sender}:</b></div><div class="body">${formatText(text)}</div>`;
  conversation.appendChild(msg);
  conversation.scrollTop = conversation.scrollHeight;
}

function appendImage(imgUrl) {
  const msg = document.createElement("div");
  msg.className = "msg";
  msg.innerHTML = `
    <div class="meta"><b>Visualization:</b></div>
    <div class="attachments"><img src="${imgUrl}" alt="chem-visual" style="max-width:100%;border-radius:8px;margin-top:6px;"/></div>
  `;
  conversation.appendChild(msg);
  conversation.scrollTop = conversation.scrollHeight;
}

function appendSummary(summary) {
  const msg = document.createElement("div");
  msg.className = "msg";
  msg.innerHTML = `
    <div class="meta"><b>Key Points:</b></div>
    <div class="summary">${formatText(summary)}</div>
  `;
  conversation.appendChild(msg);
  conversation.scrollTop = conversation.scrollHeight;
}

function removeLastBotMessage() {
  const messages = conversation.querySelectorAll(".msg");
  if (messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.textContent.includes("Thinking")) {
      lastMsg.remove();
    }
  }
}

function formatText(text) {
  // Simple markdown-like formatter for subscripts/superscripts
  return text
    .replace(/\n/g, "<br>")
    .replace(/(\d+)/g, "<sub>$1</sub>")
    .replace(/\^(\d+)/g, "<sup>$1</sup>");
}
