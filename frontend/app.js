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

  // 🧠 Handle 3D requests
  if (text.includes("View 3D")) {
    const content = text.replace("View 3D", "");
    div.innerHTML = `${content}<button class="view3d-btn">🔍 View 3D</button>`;
    const btn = div.querySelector(".view3d-btn");

    btn.addEventListener("click", async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = "⏳ Loading 3D...";
      if (molecule) await fetch3DStructure(molecule, btn, div);
    });
  } else {
    div.innerHTML = text;
  }

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  renderMath();
}

async function fetch3DStructure(molecule, btn, container) {
  // Create a loading message element that can be replaced later
  const loadingMsg = document.createElement("div");
  loadingMsg.classList.add("bot-message");
  loadingMsg.textContent = `Fetching 3D model for ${molecule}...`;
  chatWindow.appendChild(loadingMsg);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${molecule}/SDF?record_type=3d`
    );
    const sdf = await res.text();

    if (!sdf || sdf.length < 100) throw new Error("Invalid or missing data");

    // ✅ Replace the loading message with actual 3D model
    loadingMsg.remove();
    render3D(sdf, molecule, container);

    btn.textContent = "✅ View Again";
    btn.disabled = false;
  } catch (err) {
    loadingMsg.textContent = `⚠️ 3D structure not available for ${molecule}.`;
    btn.textContent = "⚠️ Unavailable";
  }
}

function render3D(sdf, molecule, container) {
  // Generate unique ID each time (prevents overwriting old 3D)
  const uniqueId = `viewer3d-${molecule}-${Date.now()}`;
  const viewerWrapper = document.createElement("div");
  viewerWrapper.classList.add("viewer-wrapper");

  const viewerDiv = document.createElement("div");
  viewerDiv.id = uniqueId;
  viewerDiv.classList.add("viewer3d-container");

  viewerWrapper.appendChild(viewerDiv);
  container.appendChild(viewerWrapper);

  // ✅ Create new 3Dmol instance fresh every time
  const viewer = $3Dmol.createViewer(viewerDiv, { backgroundColor: "white" });
  viewer.addModel(sdf, "sdf");
  viewer.setStyle({}, { stick: {}, sphere: { scale: 0.3 } });
  viewer.zoomTo();
  viewer.render();
  viewer.zoom(1.1, 500);
}

function renderMath() {
  if (window.MathJax) MathJax.typesetPromise();
}
