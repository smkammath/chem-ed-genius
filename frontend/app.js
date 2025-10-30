const chatBox = document.getElementById("chat");
const chatForm = document.getElementById("chatForm");
const input = document.getElementById("promptInput");
const modal = document.getElementById("viewerModal");
const closeModal = document.getElementById("closeModal");
const viewerDiv = document.getElementById("viewer");
const viewerCID = document.getElementById("viewerCID");
const downloadBtn = document.getElementById("downloadSdf");
const fitBtn = document.getElementById("fitModel");

let sdfData = null, cid = null, viewer = null;

function append(role, msg) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="bubble"><b>${role === "you" ? "You:" : "Chem-Ed Genius:"}</b> ${msg}</div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function fetchJSON(url, body) {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    const txt = await res.text();
    return JSON.parse(txt);
  } catch (e) {
    return { ok: false, error: "Invalid JSON received" };
  }
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = input.value.trim();
  if (!prompt) return;
  append("you", prompt);
  input.value = "";
  append("assistant", "<em>Thinking...</em>");

  const data = await fetchJSON("/api/chat", JSON.stringify({ prompt }));
  chatBox.lastChild.remove();
  if (!data.ok) return append("assistant", "Error: " + data.error);
  append("assistant", data.message);

  const match = data.message.match(/\\ce\{([^}]+)\}/);
  if (match) {
    const mol = match[1];
    const btn = document.createElement("button");
    btn.textContent = "View 3D";
    btn.onclick = () => visualize(mol);
    chatBox.lastChild.querySelector(".bubble").appendChild(btn);
  }
});

async function visualize(molecule) {
  append("assistant", `Fetching 3D for ${molecule}...`);
  const data = await fetchJSON("/api/visualize", JSON.stringify({ molecule }));
  if (!data.ok) return append("assistant", "Error: " + data.error);
  sdfData = data.sdf; cid = data.cid;
  openViewer();
}

function openViewer() {
  viewerCID.textContent = "CID: " + cid;
  modal.classList.remove("hidden");
  viewerDiv.innerHTML = "";
  viewer = $3Dmol.createViewer(viewerDiv);
  viewer.addModel(sdfData, "sdf");
  viewer.setStyle({}, { stick: {}, sphere: { radius: 0.3 } });
  viewer.zoomTo();
  viewer.render();
}
closeModal.onclick = () => modal.classList.add("hidden");
downloadBtn.onclick = () => {
  const blob = new Blob([sdfData], { type: "chemical/x-mdl-sdfile" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `molecule_${cid}.sdf`;
  a.click();
};
fitBtn.onclick = () => viewer.zoomTo();
