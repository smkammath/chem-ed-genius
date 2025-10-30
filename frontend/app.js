const API_URL = "https://chem-ed-genius.onrender.com";
const chatContainer = document.getElementById("chat-container");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("user-input");

/* ---------- KaTeX Rendering ---------- */
function renderKaTeX() {
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
    });
  }
}

/* ---------- Submit Handler ---------- */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = userInput.value.trim();
  if (!prompt) return;

  appendMessage("You", prompt, "user");
  userInput.value = "";

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    const formatted = formatResponse(data.message);
    appendMessage("Chem-Ed Genius", formatted, "bot");
    renderKaTeX();
    detectAndVisualize(formatted);
  } catch {
    appendMessage("Chem-Ed Genius", "⚠️ Server error. Try again later.", "bot");
  }
});

/* ---------- Display Message ---------- */
function appendMessage(sender, text, type) {
  const div = document.createElement("div");
  div.classList.add(type === "user" ? "user-message" : "bot-message");
  div.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* ---------- Markdown Formatter ---------- */
function formatResponse(text) {
  return text
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/####(.*?)<br>/g, "<h4>$1</h4>")
    .replace(/###(.*?)<br>/g, "<h3>$1</h3>")
    .replace(/##(.*?)<br>/g, "<h2>$1</h2>");
}

/* ---------- Formula Auto Detection ---------- */
async function detectAndVisualize(text) {
  // Capture \ce{...} and plain formulas like CH3OH
  const matches = [
    ...text.matchAll(/\\ce{([^}]*)}/g),
    ...text.matchAll(/\b([A-Z][a-z]?\d*){2,}\b/g),
  ];

  for (const m of matches) {
    const molecule = m[1] || m[0];
    await visualizeMolecule(molecule);
  }
}

/* ---------- Render Molecule in 3D ---------- */
async function visualizeMolecule(name) {
  try {
    const viewerDiv = document.createElement("div");
    viewerDiv.className = "mol-viewer";
    chatContainer.appendChild(viewerDiv);

    const response = await fetch(`${API_URL}/api/visualize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ molecule: name }),
    });

    const { sdf } = await response.json();

    const viewer = $3Dmol.createViewer(viewerDiv, { backgroundColor: "white" });
    viewer.addModel(sdf, "sdf");
    viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.25 } });
    viewer.zoomTo();
    viewer.render();
  } catch {
    appendMessage("Chem-Ed Genius", `Unable to visualize ${name}.`, "bot");
  }
}
