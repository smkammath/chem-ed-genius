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

    const data = await res.json();
    chatWindow.removeChild(chatWindow.lastChild);

    if (data.error) {
      addMessage("bot", `⚠️ ${data.error}`);
      return;
    }

    addMessage("bot", data.answer, data.molecule);
  } catch (err) {
    chatWindow.removeChild(chatWindow.lastChild);
    addMessage("bot", "❌ Server error: Unable to connect to backend.");
  }
}

function addMessage(sender, text, molecule = null) {
  const div = document.createElement("div");
  div.classList.add(sender === "user" ? "user-message" : "bot-message");

  if (text.includes("View 3D")) {
    const content = text.replace("View 3D", "");
    div.innerHTML = `${content}<button class="view3d-btn">View 3D</button>`;
    div.querySelector(".view3d-btn").addEventListener("click", () => {
      if (molecule) fetch3DStructure(molecule);
    });
  } else {
    div.innerHTML = text;
  }

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  renderMath();
}

async function fetch3DStructure(molecule) {
  addMessage("bot", `Fetching 3D model for ${molecule}...`);
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${molecule}/SDF?record_type=3d`
    );
    const sdf = await res.text();
    if (!sdf || sdf.length < 100) throw new Error("Invalid structure");
    render3D(sdf, molecule);
  } catch {
    addMessage("bot", `⚠️ 3D structure not available for ${molecule}.`);
  }
}

function render3D(sdf, molecule) {
  const viewerDiv = document.createElement("div");
  viewerDiv.id = `viewer3d-${molecule}`;
  viewerDiv.style.width = "100%";
  viewerDiv.style.height = "400px";
  viewerDiv.style.marginTop = "10px";
  chatWindow.appendChild(viewerDiv);

  const viewer = $3Dmol.createViewer(viewerDiv, { backgroundColor: "white" });
  viewer.addModel(sdf, "sdf");
  viewer.setStyle({}, { stick: {}, sphere: { scale: 0.3 } });
  viewer.zoomTo();
  viewer.render();
}

function renderMath() {
  if (window.MathJax) MathJax.typesetPromise();
}
