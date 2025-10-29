const chatForm = document.querySelector("#chatForm");
const promptInput = document.querySelector("#prompt");
const conversationDiv = document.querySelector("#conversation");
const gradeSelect = document.querySelector("#grade");
const modeSelect = document.querySelector("#mode");

const BACKEND_URL = "https://chem-ed-genius.onrender.com/api/chat";

// 🧩 Helper: Add chat message
function addMessage(role, message, type = "normal") {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("msg");

  const meta = document.createElement("div");
  meta.classList.add("meta");
  meta.innerHTML = `<b>${role}:</b>`;

  const body = document.createElement("div");
  body.classList.add("body");

  // 🎨 Different style for out-of-scope messages
  if (type === "out-of-scope") {
    body.style.backgroundColor = "#fff7d6";
    body.style.border = "1px solid #e6c200";
    body.style.borderRadius = "10px";
    body.style.padding = "8px";
  }

  // 🧠 Allow HTML for equations, remove unsafe tags
  const safeMessage = message
    .replace(/<script.*?>.*?<\/script>/gi, "")
    .replace(/<iframe.*?>.*?<\/iframe>/gi, "")
    .replace(/<style.*?>.*?<\/style>/gi, "");

  body.innerHTML = safeMessage.replace(/\n/g, "<br>");

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

  // Add loading indicator
  const loadingMsg = document.createElement("div");
  loadingMsg.classList.add("msg");
  loadingMsg.innerHTML = `<div class="meta"><b>Chem-Ed Genius:</b></div><div class="body">⚡ Thinking...</div>`;
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

    if (!data.message) {
      addMessage("Chem-Ed Genius", "⚠️ Hmm... I didn’t get that. Try again!");
      return;
    }

    // Detect out-of-scope messages by keywords
    if (data.message.includes("Chem-Ed Genius") && data.message.includes("Chemistry")) {
      addMessage("Chem-Ed Genius", data.message, "out-of-scope");
    } else {
      addMessage("Chem-Ed Genius", data.message);
    }
  } catch (error) {
    console.error(error);
    loadingMsg.remove();
    addMessage("Chem-Ed Genius", "❌ Server error. Try again in a moment.");
  }
});
