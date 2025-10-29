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
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false },
        ],
      });
    }
  }

  function addMessage(role, message, type = "normal") {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("msg");

    const meta = document.createElement("div");
    meta.classList.add("meta");
    meta.innerHTML = `<b>${role}:</b>`;

    const body = document.createElement("div");
    body.classList.add("body");
    body.innerHTML = message?.replace(/\\n/g, "<br>").trim();

    if (type === "out-of-scope") {
      body.style.background = "#fff9e6";
      body.style.border = "1px solid #e0c800";
    }

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
        <div class="body">🧪 Thinking deeply...</div>`;
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

        const msg = data.message.trim();

        if (
          msg.toLowerCase().includes("biology") ||
          msg.toLowerCase().includes("out of scope")
        ) {
          addMessage(
            "Chem-Ed Genius",
            "⚠️ I'm Chem-Ed Genius 🔬 — I specialize only in chemistry-related topics!",
            "out-of-scope"
          );
        } else {
          addMessage("Chem-Ed Genius", msg);
        }
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
