// frontend/app.js (plain JS)
(function () {
  // helpers
  function el(tag, cls) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    return d;
  }

  // build UI
  const root = document.getElementById("root");
  root.innerHTML = "";

  const container = el("div", "chat-container");
  const header = el("div", "chat-header");
  header.innerHTML = `<h1>Chem-Ed Genius <span>🧪</span></h1><p>Explain. Visualize. Ace the exam — chemistry only.</p>`;
  container.appendChild(header);

  const box = el("div", "chat-box");
  const messagesEl = el("div", "messages");
  box.appendChild(messagesEl);

  // input area
  const inputWrap = el("div", "input-wrap");
  const input = el("input", "chat-input");
  input.placeholder = "Ask a chemistry question (e.g., 'Explain CH3OH with 3D')";
  const btn = el("button", "send-btn");
  btn.textContent = "Send";
  inputWrap.appendChild(input);
  inputWrap.appendChild(btn);

  container.appendChild(box);
  container.appendChild(inputWrap);
  root.appendChild(container);

  // utilities to render messages
  function addUserMsg(text) {
    const m = el("div", "msg user");
    m.textContent = text;
    messagesEl.appendChild(m);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function addBotMsg(text) {
    const m = el("div", "msg bot");
    m.innerHTML = text;
    messagesEl.appendChild(m);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function addWarning(text) {
    const m = el("div", "msg warn");
    m.textContent = text;
    messagesEl.appendChild(m);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function addIframe(url) {
    const wrap = el("div", "iframe-wrap");
    const iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.width = "100%";
    iframe.height = "360";
    iframe.frameBorder = "0";
    iframe.allowFullscreen = true;
    wrap.appendChild(iframe);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // send handler
  async function sendQuestion(q) {
    if (!q || !q.trim()) return;
    addUserMsg(q);
    input.value = "";
    addBotMsg("<em>Thinking...</em>");

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      // remove the "Thinking..." node (last bot with <em>)
      const last = messagesEl.querySelector(".msg.bot:last-of-type");
      if (last && /Thinking/.test(last.innerHTML)) last.remove();

      if (!resp.ok) {
        addWarning("⚠️ Server unreachable. Try again later.");
        return;
      }
      const data = await resp.json();
      if (!data.ok) {
        addWarning("⚠️ No AI response.");
        if (data.error) addWarning("Error: " + data.error);
        return;
      }

      // show answer
      const safeAnswer = (data.answer || "").replace(/\n/g, "<br/>");
      addBotMsg(`<strong>Explanation:</strong> ${safeAnswer}`);

      // show 3D only when backend returns show3d:true and molQuery present
      if (data.show3d && data.molQuery) {
        // prefer molview.org query (works more reliably)
        const qEnc = encodeURIComponent(String(data.molQuery));
        const molviewUrl = `https://molview.org/?q=${qEnc}`;
        // embed in iframe — note remote site may show popup; user can close on first load.
        addIframe(molviewUrl);
      }
    } catch (err) {
      console.error("Fetch error", err);
      const last = messagesEl.querySelector(".msg.bot:last-of-type");
      if (last && /Thinking/.test(last.innerHTML)) last.remove();
      addWarning("⚠️ Network error. Try again later.");
    }
  }

  // hook send events
  btn.addEventListener("click", () => sendQuestion(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendQuestion(input.value);
    }
  });

  // show a welcome message
  addBotMsg("Hi, I'm Chem-Ed Genius 🧪 — ask me about molecules, reactions, or visualize 3D structures!");
})();
