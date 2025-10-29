document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.querySelector("#chatForm");
  const promptInput = document.querySelector("#prompt");
  const conversationDiv = document.querySelector("#conversation");
  const gradeSelect = document.querySelector("#grade");
  const modeSelect = document.querySelector("#mode");

  // 🔗 Backend API URL
  const BACKEND_URL = "https://chem-ed-genius.onrender.com/api/chat";

  // Function to display messages neatly
  function addMessage(role, message, type = "normal") {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("msg");

    const meta = document.createElement("div");
    meta.classList.add("meta");
    meta.innerHTML = `<b>${role}:</b>`;

    const body = document.createElement("div");
    body.classList.add("body");

    if (type === "out-of-scope") {
      body.style.background = "#fff6cc";
      body.style.border = "1px solid #e6c200";
      body.style.borderRadius = "8px";
      body.style.padding = "8px";
    }

    const cleaned = (message || "")
      .replace(/<[^>]*>?/gm, "")
      .replace(/\n/g, "<br>");

    body.innerHTML = cleaned;
    msgDiv.appendChild(meta);
    msgDiv.appendChild(body);
    conversationDiv.appendChild(msgDiv);
    conversationDiv.scrollTop = conversationDiv.scrollHeight;
  }

  // ✅ Event listener only runs once DOM is ready
  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const prompt = promptInput.value.trim();
      if (!prompt) return;

      addMessage("You", prompt);
      promptInput.value = "";

      const loadingMsg = document.createElement("div");
      loadingMsg.classList.add("msg");
      loadingMsg.innerHTML =
        `<div class="meta"><b>Chem-Ed Genius:</b></div><div class="body">⏳ Thinking...</div>`;
      conversationDiv.appendChild(loadingMsg);
      conversationDiv.scrollTop = conversationDiv.scrollHeight;

      try {
        console.log("Sending request to backend:", BACKEND_URL);

        const response = await fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grade: gradeSelect.value,
            mode: modeSelect.value,
            prompt: prompt,
          }),
        });

        console.log("Response status:", response.status);
        const data = await response.json();
        console.log("Response from backend:", data);

        loadingMsg.remove();

        if (!data || !data.message) {
          addMessage("Chem-Ed Genius", "⚠️ No response from server.");
          return;
        }

        if (data.message.includes("Chem-Ed Genius 🔬") || data.message.includes("not biology")) {
          addMessage("Chem-Ed Genius", data.message, "out-of-scope");
        } else {
          addMessage("Chem-Ed Genius", data.message);
        }
      } catch (error) {
        console.error("Error occurred:", error);
        loadingMsg.remove();
        addMessage("Chem-Ed Genius", "❌ Server unreachable. Please try again.");
      }
    });
  } else {
    console.error("❌ chatForm not found in DOM!");
  }
});
