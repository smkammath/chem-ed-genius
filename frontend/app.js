window.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.querySelector("#chatForm");
  const promptInput = document.querySelector("#prompt");
  const conversationDiv = document.querySelector("#conversation");
  const gradeSelect = document.querySelector("#grade");
  const modeSelect = document.querySelector("#mode");

  const BACKEND_URL = "https://chem-ed-genius.onrender.com/api/chat";

  function renderMath() {
    if (window.renderMathInElement) {
      renderMathInElement(conversationDiv, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    }
  }

  function addMessage(role, text) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("msg");
    msgDiv.innerHTML = `
      <div class="meta"><b>${role}:</b></div>
      <div class="body">${marked.parse(text)}</div>
    `;
    conversationDiv.appendChild(msgDiv);
    conversationDiv.scrollTop = conversationDiv.scrollHeight;
    renderMath();
  }

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    addMessage("You", prompt);
    promptInput.value = "";

    const loadingMsg = document.createElement("div");
    loadingMsg.classList.add("msg");
    loadingMsg.innerHTML =
      "<div class='meta'><b>Chem-Ed Genius:</b></div><div class='body'>🧪 Analyzing your chemistry question...</div>";
    conversationDiv.appendChild(loadingMsg);
    conversationDiv.scrollTop = conversationDiv.scrollHeight;

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: gradeSelect.value,
          mode: modeSelect.value,
          prompt,
        }),
      });

      const data = await res.json();
      loadingMsg.remove();

      if (!data.message) {
        addMessage("Chem-Ed Genius", "⚠️ No response received.");
        return;
      }

      addMessage("Chem-Ed Genius", data.message);
    } catch (err) {
      console.error(err);
      loadingMsg.remove();
      addMessage("Chem-Ed Genius", "❌ Server error. Please try again later.");
    }
  });
});
