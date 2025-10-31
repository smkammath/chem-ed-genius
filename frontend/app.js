(() => {
  const convo = document.querySelector("#conversation");
  const form = document.querySelector("#askForm");
  const input = document.querySelector("#promptInput");
  const send = document.querySelector("#sendButton");

  const append = (cls, msg) => {
    const div = document.createElement("div");
    div.className = `bubble ${cls}`;
    div.innerHTML = msg;
    convo.appendChild(div);
    convo.scrollTop = convo.scrollHeight;
    return div;
  };

  async function sendPrompt(prompt) {
    append("user", prompt);
    const bot = append("bot", "<i>Thinking...</i>");
    send.disabled = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      bot.remove();

      if (!data.ok) {
        append("bot", `⚠️ ${data.error || "Server error"}`);
      } else {
        const html = data.reply.replace(/\n/g, "<br>");
        const newBubble = append("bot", html);
      }
    } catch (err) {
      bot.remove();
      append("bot", "❌ Connection error. Try again.");
    } finally {
      send.disabled = false;
      input.value = "";
    }
  }

  window.open3D = (mol) => {
    const clean = mol.replace(/[^A-Za-z0-9]/g, "");
    if (!clean) return alert("Invalid molecule name!");
    window.open(`https://molview.org/?q=${encodeURIComponent(clean)}`, "_blank");
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;
    sendPrompt(prompt);
  });
})();
