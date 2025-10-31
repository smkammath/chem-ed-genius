// ✅ frontend/app.js — Network-safe version
(function () {
  const root = document.getElementById("root");
  root.innerHTML = `
    <div class="chat-container">
      <div class="chat-header">
        <h1>Chem-Ed Genius 🧪</h1>
        <p>Explain. Visualize. Ace the exam — chemistry only.</p>
      </div>
      <div class="chat-box">
        <div id="messages" class="messages"></div>
        <div class="input-wrap">
          <input id="chat-input" class="chat-input" placeholder="Ask a chemistry question (e.g., 'Explain CH3OH with 3D')" />
          <button id="send-btn" class="send-btn">Send</button>
        </div>
      </div>
    </div>
  `;

  const input = document.getElementById("chat-input");
  const btn = document.getElementById("send-btn");
  const messages = document.getElementById("messages");

  const addMsg = (text, cls = "bot") => {
    const m = document.createElement("div");
    m.className = `msg ${cls}`;
    m.innerHTML = text;
    messages.appendChild(m);
    messages.scrollTop = messages.scrollHeight;
  };

  const addIframe = (url) => {
    const div = document.createElement("div");
    div.className = "iframe-wrap";
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.width = "100%";
    iframe.height = "320";
    iframe.style.border = "none";
    div.appendChild(iframe);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  };

  const send = async () => {
    const question = input.value.trim();
    if (!question) return;
    addMsg(question, "user");
    input.value = "";

    addMsg("<em>Thinking...</em>", "bot");

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      // Remove "Thinking..."
      const last = messages.querySelector(".msg.bot:last-of-type");
      if (last && /Thinking/.test(last.innerHTML)) last.remove();

      if (!resp.ok) {
        addMsg("⚠️ Server unreachable. Try again later.", "warn");
        return;
      }

      let data = null;
      try {
        data = await resp.json();
      } catch (e) {
        addMsg("⚠️ Invalid response from server.", "warn");
        return;
      }

      if (!data || !data.ok) {
        addMsg(`⚠️ ${data?.error || "No AI response."}`, "warn");
        return;
      }

      addMsg(`<strong>Explanation:</strong> ${data.answer}`, "bot");

      if (data.show3d && data.molQuery) {
        const qEnc = encodeURIComponent(data.molQuery);
        const molView = `https://molview.org/?q=${qEnc}`;
        addIframe(molView);
      }
    } catch (err) {
      console.error(err);
      addMsg("⚠️ Network error. Try again later.", "warn");
    }
  };

  btn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => e.key === "Enter" && send());

  addMsg("Hi, I'm Chem-Ed Genius 🧪 — ask me about molecules or visualize 3D structures!");
})();
