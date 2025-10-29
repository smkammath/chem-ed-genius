// CHEM-ED GENIUS frontend
const conversation = document.getElementById('conversation');
const form = document.getElementById('promptForm');
const promptEl = document.getElementById('prompt');
const apiUrlEl = document.getElementById('apiUrl');
const gradeEl = document.getElementById('grade');
const modeEl = document.getElementById('mode');
const tpl = document.getElementById('msgTpl');

function addMessage(author, meta, bodyHTML, attachmentsHTML, summaryHTML) {
  const node = tpl.content.cloneNode(true);
  node.querySelector('.meta').textContent = `${author} · ${meta}`;
  node.querySelector('.body').innerHTML = bodyHTML;
  if (attachmentsHTML) node.querySelector('.attachments').innerHTML = attachmentsHTML;
  if (summaryHTML) node.querySelector('.summary').innerHTML = summaryHTML;
  conversation.appendChild(node);
  conversation.scrollTop = conversation.scrollHeight;
}

function formatMath(html) {
  // simple subscript formatting for formulas like H2O -> H<sub>2</sub>O
  return html.replace(/([A-Za-z\)\]])(\d+)/g, '$1<sub>$2</sub>');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = promptEl.value.trim();
  if (!text) return;
  const apiUrl = (apiUrlEl.value || '').trim();
  if (!apiUrl) {
    alert('Paste your Render backend URL in the API URL box once (e.g. https://your-service.onrender.com)');
    return;
  }

  addMessage('You', `${gradeEl.value} · ${modeEl.value}`, escapeHtml(text));
  promptEl.value = '';

  addMessage('Bot', 'thinking...', 'Let me synthesize that — short & clear 🔬');

  try {
    const resp = await fetch(apiUrl + '/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        prompt: text,
        grade: gradeEl.value,
        mode: modeEl.value
      })
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(txt || resp.statusText);
    }
    const data = await resp.json();
    // remove last thinking message
    conversation.lastElementChild.remove();

    // show bot outputs (body, attachments, summary)
    const bodyHtml = formatMath(escapeHtml(data.answer || 'No answer'));
    let attachments = '';
    if (data.image) attachments = `<img src="${data.image}" alt="diagram">`;
    const summary = (data.keytakeaways) ? `<strong>Key takeaways:</strong><br>${escapeHtml(data.keytakeaways)}` : '';
    addMessage('CHEM-ED GENIUS', data.hint || 'exam-friendly', bodyHtml, attachments, summary);
  } catch (err) {
    conversation.lastElementChild.remove();
    addMessage('System', 'error', '⚠️ Error: ' + escapeHtml(err.message));
  }
});

function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
