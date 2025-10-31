// frontend/app.js - client logic (vanilla)
(() => {
  const convo = document.getElementById("conversation");
  const form = document.getElementById("askForm");
  const input = document.getElementById("promptInput");
  const sendBtn = document.getElementById("sendButton");

  function appendBubble(kind, html) {
    const d = document.createElement("div");
    d.className = "bubble " + (kind === "user" ? "user" : "bot");
    d.innerHTML = html;
    convo.appendChild(d);
    convo.scrollTop = convo.scrollHeight;
    return d;
  }

  // Attach event delegation for any .view3d button inside conversation
  convo.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".view3d");
    if (!btn) return;
    const molEncoded = btn.getAttribute("data-mol") || btn.dataset.mol || "";
    const mol = decodeURIComponent(molEncoded || "").trim();
    open3D(mol);
  });

  window.open3D = (mol) => {
    if (!mol) return alert("No molecule found to show in 3D.");
    // Try MolView with query parameter (MolView handles many names)
    const q = encodeURIComponent(mol);
    // MolView can be opened with a query to search name
    const url = `https://molview.org/?q=${q}`;
    window.open(url, "_blank", "noopener");
  };

  async function sendPrompt(prompt) {
    appendBubble("user", escapeHtml(prompt));
    const thinking = appendBubble("bot", "<i>Thinking…</i>");
    sendBtn.disabled = true;
    input.disabled = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      thinking.remove();

      if (!data.ok) {
        appendBubble("bot", `❌ Error: ${escapeHtml(data.error || "Unknown")}`);
      } else {
        // Insert reply as HTML (server controls safe content)
        const replyHtml = data.reply || "";
        const node = appendBubble("bot", replyHtml);

        // If server indicated a requested3D and didn't include data-mol attr (best-effort)
        // We rely on button elements server included; if not present, show quick View 3D button:
        if (data.requested3D && !node.querySelector(".view3d")) {
          const quickBtn = document.createElement("button");
          quickBtn.className = "view3d";
          quickBtn.textContent = "View 3D";
          quickBtn.onclick = () => open3D(data.mol || prompt);
          node.appendChild(quickBtn);
        }
      }
    } catch (err) {
      thinking.remove();
      appendBubble("bot", "❌ Server error: Unable to reach server.");
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      input.value = "";
      input.focus();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    sendPrompt(v);
  });

  // helper
  function escapeHtml(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // welcome message
  appendBubble("bot", "<strong>Welcome —</strong> Ask a chemistry question (e.g. 'Explain CH3OH with 3D').");
})();
