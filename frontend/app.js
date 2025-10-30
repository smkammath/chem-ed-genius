// FINAL stable frontend
const chatBox = document.getElementById("chat");
const chatForm = document.getElementById("chatForm");
const input = document.getElementById("promptInput");
const modal = document.getElementById("viewerModal");
const closeModal = document.getElementById("closeModal");
const viewerDiv = document.getElementById("viewer");
const viewerCID = document.getElementById("viewerCID");
const downloadBtn = document.getElementById("downloadSdf");
const fitBtn = document.getElementById("fitModel");
let viewer = null, sdfData = null, cid = null;

function append(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = role === "you" ? `<strong>You:</strong> ${text}` : `<strong>Chem-Ed Genius:</strong> ${format(text)}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  renderKatex(div);
}

function format(t) {
  let s = t.replace(/\$\$([\s\S]+?)\$\$/g, (_,x)=>`<div class='katex-placeholder' data-latex='${x}'></div>`);
  s = s.replace(/\$([^\$]+)\$/g, (_,x)=>`<span class='katex-placeholder' data-latex='${x}'></span>`);
  return s.replace(/\n/g,"<br>");
}

function renderKatex(el){
  el.querySelectorAll(".katex-placeholder").forEach(span=>{
    try{ span.outerHTML = katex.renderToString(span.dataset.latex,{throwOnError:false,trust:true}); }
    catch{}
  });
}

chatForm.addEventListener("submit", async e=>{
  e.preventDefault();
  const prompt = input.value.trim();
  if(!prompt) return;
  append("you", prompt);
  append("assistant", "Thinking...");

  const res = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
  const txt = await res.text();
  let data={};
  try{ data = JSON.parse(txt);}catch{}
  chatBox.lastChild.remove(); // remove Thinking
  append("assistant", data.message || data.error || "No response");

  if(/\\ce\{([^}]+)\}/.test(data.message)) {
    const mol = data.message.match(/\\ce\{([^}]+)\}/)[1];
    const btn = document.createElement("button");
    btn.textContent="View 3D";
    btn.onclick=()=>view3D(mol);
    btn.className="btn small";
    chatBox.lastChild.appendChild(btn);
  }
});

async function view3D(mol){
  const res = await fetch("/api/visualize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({molecule:mol})});
  const txt = await res.text(); let json={};
  try{ json=JSON.parse(txt);}catch{ append("assistant","Visualization failed."); return;}
  if(!json.ok){ append("assistant", json.error||"Visualization failed."); return;}
  sdfData=json.sdf; cid=json.cid;
  viewerCID.textContent="CID: "+cid;
  modal.classList.remove("hidden");
  viewerDiv.innerHTML="";
  viewer=$3Dmol.createViewer(viewerDiv,{backgroundColor:"white"});
  viewer.addModel(sdfData,"sdf");
  viewer.setStyle({},{stick:{radius:0.15},sphere:{radius:0.3}});
  viewer.zoomTo(); viewer.render();
}

closeModal.onclick=()=>{ modal.classList.add("hidden"); };
downloadBtn.onclick=()=>{
  if(!sdfData) return;
  const blob=new Blob([sdfData],{type:"chemical/x-mdl-sdfile"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`molecule_${cid||"unknown"}.sdf`;
  a.click();
};
fitBtn.onclick=()=>{ if(viewer){viewer.zoomTo();viewer.render();}};
