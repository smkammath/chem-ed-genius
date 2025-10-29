document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.querySelector("#chatForm");
  const promptInput = document.querySelector("#prompt");
  const conversationDiv = document.querySelector("#conversation");
  const gradeSelect = document.querySelector("#grade");
  const modeSelect = document.querySelector("#mode");

  // 🔗 Backend API
  const BACKEND_URL = "https://chem-ed-genius.onrender.com/api/chat";

  // ✅ Function to add messages neatly
  function addMessage(role, message, type = "normal") {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("msg");

    const meta = document.createElement("div");
    meta.classList.add("meta");
    meta.innerHTML = `<b>${role}:</b>`;

    const body = document.createElement("div");
    body.classList.add("body");

    // 🧠 Render HTML safely, don't escape tags
    const sanitized = message
      ?.replace(/\\n/g, "<br>")
      .replace(/\\t/g, "&emsp;")
      .replace(/\\\[/g, "[") // LaTeX fix
      .replace(/\\\]/g, "]") // LaTeX fix
      .trim();

    body.innerHTML = sanitized || "⚠️ No message received.";

    // Style for "out-of-scope" messages
    if (type === "out-of-scope") {
      body.style.background = "#fff9e6";
      body.style.border = "1px solid #e0c800";
    }

    msgDiv.appendChild(meta);
    msgDiv.appendChild(body);
    conversationDiv.appendChild(msgDiv);
    conversationDiv.scrollTop = conversationDiv.scrollHeight;
  }

  // ✅ Listen to form submit
  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const prompt = promptInput.value.trim();
      if (!prompt) return;

      addMessage("You", prompt);
      promptInput.value = "";

      // Loading message
      const loadingMsg = document.createElement("div");
      loadingMsg.classList.add("msg");
      loadingMsg.innerHTML = `
        <div class="meta"><b>Chem-Ed Genius:</b></div>
        <div class="body">🧪 Thinking deeply...</div>
      `;
      conversationDiv.appendChild(loadingMsg);
      conversationDiv.scrollTop = conversationDiv.scrollHeight;

      try {
        const response = await fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grade: gradeSelect.value,
            mode: modeSelect.value,
            prompt,
          }),
        });

        const data = await response.json();
        loadingMsg.remove();

        if (!data || !data.message) {
          addMessage("Chem-Ed Genius", "⚠️ No response from the server.");
          return;
        }

        // 🧠 Filter for “Out of scope” replies
        if (
          data.message.toLowerCase().includes("biology") ||
          data.message.toLowerCase().includes("not chemistry") ||
          data.message.toLowerCase().includes("out of scope")
        ) {
          addMessage(
            "Chem-Ed Genius",
            "⚠️ I'm Chem-Ed Genius 🔬 — specialized only in chemistry-related topics!",
            "out-of-scope"
          );
        } else {
          addMessage("Chem-Ed Genius", data.message);
        }
      } catch (err) {
        console.error("Error communicating with backend:", err);
        loadingMsg.remove();
        addMessage(
          "Chem-Ed Genius",
          "❌ Connection error. Please try again shortly."
        );
      }
    });
  } else {
    console.error("❌ chatForm not found in DOM!");
  }
});
