// ✅ Use the full backend URL explicitly
const API_URL = "https://chem-ed-genius.onrender.com/api/chat";

const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  userInput.value = "";
  addMessage("bot", "🧠 Thinking...");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text }),
    });

    if (!res.ok) {
      throw new Error(`Server responded with status ${res.status}`);
    }

    const data = await res.json();
    chatWindow.removeChild(chatWindow.lastChild);

    if (data.error) {
      addMessage("bot", `⚠️ ${data.error}`);
      return;
    }

    addMessage("bot", data.answer);

    if (data.visualize3D) {
      render3D(data.visualize3D);
    }
  } catch (err) {
    chatWindow.removeChild(chatWindow.lastChild);
    console.error("❌ Connection error:", err);
    addMessage("bot", "❌ Server error: Unable to connect to backend.");
  }
}

function addMessage(sender, text) {
  const div = document.createElement("div");
  div.classList.add(sender === "user" ? "user-message" : "bot-message");

  if (text.includes("View 3D")) {
    const parts = text.split("View 3D")[0];
    div.innerHTML = `${parts}<button class="view3d-btn">View 3D</button>`;
    div.querySelector(".view3d-btn").addEventListener("click", () => {
      const mol = extractMolecule(parts);
      if (mol) fetch3DStructure(mol);
    });
  } else {
    div.innerHTML = text;
  }

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  renderMath();
}

function extractMolecule(text) {
  const match = text.match(/[A-Z][a-z]?\d*/g);
  return match ? match.join("") : null;
}

async function fetch3DStructure(molecule) {
  addMessage("bot", `Fetching 3D model for ${molecule}...`);
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${molecule}/SDF?record_type=3d`
    );
    const sdf = await res.text();
    render3D(sdf);
  } catch {
    addMessage("bot", "❌ Failed to fetch 3D structure.");
  }
}

function render3D(sdf) {
  const viewerDiv = document.createElement("div");
  viewerDiv.id = "viewer3d";
  chatWindow.appendChild(viewerDiv);

  const viewer = $3Dmol.createViewer(viewerDiv, { backgroundColor: "white" });
  viewer.addModel(sdf, "sdf");
  viewer.setStyle({}, { stick: {}, sphere: { scale: 0.3 } });
  viewer.zoomTo();
  viewer.render();
}
