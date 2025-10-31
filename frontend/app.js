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
  };

  async function sendPrompt(prompt) {
    append("user", prompt);
    const thinking = append("bot", "<i>Thinking...</i>");
    send.disabled = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      thinking.remove();
      append("bot", data.ok ? data.reply.replace(/\n/g, "<br>") : `⚠️ ${data.error}`);
    } catch (e) {
      thinking.remove();
      append("bot", "❌ Connection failed. Try again.");
    } finally {
      send.disabled = false;
      input.value = "";
    }
  }

  window.open3D = (mol) => {
    const clean = mol.replace(/[^A-Za-z0-9]/g, "");
    if (!clean) return alert("Invalid molecule name");
    window.open(`https://molview.org/?q=${encodeURIComponent(clean)}`, "_blank");
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (val) sendPrompt(val);
  });
})();
