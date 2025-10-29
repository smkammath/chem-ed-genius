const chatForm = document.querySelector("#chatForm");
const promptInput = document.querySelector("#prompt");
const conversationDiv = document.querySelector("#conversation");
const gradeSelect = document.querySelector("#grade");
const modeSelect = document.querySelector("#mode");

// 🧠 Change this to your backend URL
const BACKEND_URL = "https://chem-ed-genius.onrender.com/api/chat";

// 🧩 Helper: Add message to chat (supports HTML)
function addMessage(role, message) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("msg");

  const meta = document.createElement("div");
  meta.classList.add("meta");
  meta.innerHTML = `<b>${role}:</b>`;

  const body = document.createElement("div");
  body.classList.add("body");

  // ✅ Render safe HTML instead of raw text
  // but strip out any potentially unsafe tags first
  const safeMessage = message
    .replace(/<script.*?>.*?<\/script>/gi, "")
    .replace(/<iframe.*?>.*?<\/iframe>/gi, "")
    .replace(/<style.*?>.*?<\/style>/gi, "");

  body.innerHTML = safeMessage;

  msgDiv.appendChild(meta);
  msgDiv.appendChild(body);
  conversationDiv.appendChild(msgDiv);
  conversationDiv.scrollTop = conversationDiv.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  addMessage("You", prompt);
  promptInput.value = "";

  // Add typing indicator
  const loadingMsg = document.createElement("div");
  loadingMsg.classList.add("msg");
  loadingMsg.innerHTML = `<div class="meta"><b>Chem-Ed Genius:</b></div><div class="body">🧠 Thinking...</div>`;
  conversationDiv.appendChild(loadingMsg);
  conversationDiv.scrollTop = conversationDiv.scrollHeight;

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grade: gradeSelect.value,
        mode: modeSelect.value,
        prompt: prompt,
      }),
    });

    const data = await response.json();
    loadingMsg.remove();

    if (data.message) {
      addMessage("Chem-Ed Genius", data.message);
    } else {
      addMessage("Chem-Ed Genius", "⚠️ No response received. Try again!");
    }
  } catch (error) {
    console.error(error);
    loadingMsg.remove();
    addMessage("Chem-Ed Genius", "❌ Error connecting to the server.");
  }
});
