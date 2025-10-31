const API_BASE = "https://chem-ed-genius.onrender.com";

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = userInput.value.trim();
  if (!question) return;

  addMessage(question, "user");
  userInput.value = "";
  await sendToAI(question);
});

function addMessage(text, type = "user") {
  const msg = document.createElement("div");
  msg.classList.add("message", type);
  msg.innerHTML = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addMolViewEmbed(molecule) {
  const iframe = document.createElement("iframe");
  iframe.classList.add("molview-embed");
  iframe.src = `https://embed.molview.org/v1/?mode=balls&smiles=${encodeURIComponent(molecule)}`;
  chatBox.appendChild(iframe);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendToAI(question) {
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    const data = await response.json();

    if (!data || typeof data.answer !== "string") {
      throw new Error("Invalid response from server");
    }

    addMessage(data.answer, "ai");

    if (data.show3d && data.molQuery) {
      addMolViewEmbed(data.molQuery);
    }
  } catch (err) {
    console.error("❌", err);
    addMessage("⚠️ Invalid response from server.", "error");
  }
}
