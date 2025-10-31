// frontend/app.js — FINAL CLEAN VERSION
(() => {
  const convo = document.getElementById("conversation");
  const form = document.getElementById("askForm");
  const input = document.getElementById("promptInput");
  const sendBtn = document.getElementById("sendButton");

  function bubble(type, html) {
    const div = document.createElement("div");
    div.className = `bubble ${type}`;
    div.innerHTML = html;
    convo.appendChild(div);
    convo.scrollTop = convo.scrollHeight;
    return div;
  }

  convo.addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".view3d");
    if (!btn) return;
    const mol = decodeURIComponent(btn.dataset.mol || "").trim();
    if (!mol) return alert("Molecule not found.");
    await show3D(mol);
  });

  async function show3D(molecule) {
    try {
      const res = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(
          molecule
        )}/property/CanonicalSMILES/JSON`
      );
      const data = await res.json();
      const smiles = data?.PropertyTable?.Properties?.[0]?.CanonicalSMILES;
      if (!smiles) {
        alert("Molecule not found in PubChem.");
        return;
      }
      const url = `https://embed.molview.org/v1/?mode=balls&smiles=${encodeURIComponent(
        smiles
      )}`;
      window.open(url, "_blank");
    } catch (e) {
      alert("Failed to fetch 3D model.");
    }
  }

  async function sendPrompt(prompt) {
    bubble("user", prompt);
    const thinking = bubble("bot", "<i>Thinking...</i>");
    sendBtn.disabled = input.disabled = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      thinking.remove();
      bubble("bot", data.reply || "⚠️ No AI response.");
    } catch {
      thinking.remove();
      bubble("bot", "⚠️ Server unreachable. Try again later.");
    } finally {
      sendBtn.disabled = input.disabled = false;
      input.value = "";
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) sendPrompt(text);
  });

  bubble("bot", "<strong>Hi, I'm Chem-Ed Genius 🧪</strong><br>Ask me about molecules, reactions, or visualize 3D structures!");
})();
