window.addEventListener("load", () => {
  const chatForm = document.querySelector("#chatForm");
  const promptInput = document.querySelector("#prompt");
  const conversationDiv = document.querySelector("#conversation");
  const gradeSelect = document.querySelector("#grade");
  const modeSelect = document.querySelector("#mode");

  const BACKEND_URL = "https://chem-ed-genius.onrender.com/api/chat";

  function renderLatex(element) {
    if (window.renderMathInElement) {
      renderMathInElement(element, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
      });
    }
  }

  function addMessage(role, text, type = "normal") {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("msg");

    const meta = document.createElement("div");
    meta.classList.add("meta");
    meta.innerHTML = `<b>${role}:</b>`;

    const body = document.createElement("div");
    body.classList.add("body");

    const cleanedText = text
      .replaceAll("###", "####")
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
    body.innerHTML = marked.parse(cleanedText);

    msgDiv.appendChild(meta);
    msgDiv.appendChild(body);
    conversationDiv.appendChild(msgDiv);
    conversationDiv.scrollTop = conversationDiv.scrollHeight;

    renderLatex(body);
  }

  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const prompt = promptInput.value.trim();
      if (!prompt) return;

      addMessage("You", prompt);
      promptInput.value = "";

      const loadingMsg = document.createElement("div");
      loadingMsg.classList.add("msg");
      loadingMsg.innerHTML = `
        <div class="meta"><b>Chem-Ed Genius:</b></div>
        <div class="body">🧪 Processing your chemistry question...</div>`;
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

        if (!data || !data.message) {
          addMessage("Chem-Ed Genius", "⚠️ No response from the server.");
          return;
        }

        addMessage("Chem-Ed Genius", data.message);
      } catch (err) {
        console.error("Error:", err);
        loadingMsg.remove();
        addMessage(
          "Chem-Ed Genius",
          "❌ Connection error. Please try again later."
        );
      }
    });
  } else {
    console.error("❌ chatForm not found in DOM!");
  }
});
