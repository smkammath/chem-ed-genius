// frontend/app.js
// Module-based frontend logic for Chem-Ed Genius
const chatWindow = document.getElementById('chat-window');
const form = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

const viewerModal = document.getElementById('viewer-modal');
const viewerBackdrop = document.getElementById('viewer-backdrop');
const viewerClose = document.getElementById('viewer-close');
const viewerContent = document.getElementById('viewer-content');
const viewerTitle = document.getElementById('viewer-title');

const API_BASE = window.location.origin; // same host; backend routes should be proxied to /api/*

/* ---------- Utilities ---------- */
function createMessageElement({ who = 'bot', text = '', meta = '' }) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('message', who === 'user' ? 'user' : 'bot');

  if (meta) {
    const m = document.createElement('div');
    m.className = 'msg-meta';
    m.textContent = meta;
    wrapper.appendChild(m);
  }

  // Render text as Markdown to allow formatting from backend
  const md = document.createElement('div');
  md.className = 'msg-body';
  md.innerHTML = marked.parseInline(text || '');
  wrapper.appendChild(md);

  // After inserting Markdown, run MathJax to render LaTeX if present
  if (window.MathJax) {
    // MathJax typesetting is async
    MathJax.typesetPromise([md]).catch((e) => {
      console.warn('MathJax typeset error', e);
    });
  }

  return wrapper;
}

function appendMessage(msgObj) {
  const el = createMessageElement(msgObj);
  chatWindow.appendChild(el);
  // scroll to bottom (smooth)
  el.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

/* ---------- 3D viewer control ---------- */
function openViewer(title = '3D Viewer', htmlContent = null) {
  viewerTitle.textContent = title;
  viewerContent.innerHTML = ''; // remove previous content

  if (!htmlContent) {
    const fallback = document.createElement('div');
    fallback.className = 'viewer-message';
    fallback.textContent = 'No 3D content returned.';
    viewerContent.appendChild(fallback);
  } else {
    // If backend returns HTML snippet, we inject. Otherwise treat as plain text.
    if (typeof htmlContent === 'string' && htmlContent.trim().startsWith('<')) {
      viewerContent.innerHTML = htmlContent;
    } else {
      const pre = document.createElement('div');
      pre.className = 'viewer-message';
      pre.innerHTML = marked.parse(htmlContent);
      viewerContent.appendChild(pre);
    }
  }

  viewerModal.style.display = 'block';
  viewerModal.setAttribute('aria-hidden', 'false');
  viewerBackdrop.addEventListener('click', closeViewer);
}

function closeViewer() {
  viewerModal.style.display = 'none';
  viewerModal.setAttribute('aria-hidden', 'true');
  viewerBackdrop.removeEventListener('click', closeViewer);
  viewerContent.innerHTML = '';
}
viewerClose.addEventListener('click', closeViewer);

/* ---------- 3D detection ---------- */
/* A robust check to determine whether the user's prompt asks for a 3D visualization.
   tweak the regex if you need more or fewer triggers. */
function asksFor3D(prompt) {
  if (!prompt) return false;
  const p = prompt.toLowerCase();
  // matches: "show 3d", "3d image", "3d structure", "visualize 3d", "view 3D", "display 3d", "3d model", "3-d"
  const re = /\b(3d|3-d|3 d)|(show|display|visuali[sz]e|view|present|render).{0,18}(3d|3-d|3 d|structure|model|image|visual)/i;
  return re.test(p);
}

/* ---------- Network helpers ---------- */
async function safeJsonFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    if (!res.ok) {
      // include body text if available
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }
    if (!text) {
      throw new Error('Empty response from server');
    }
    try {
      return JSON.parse(text);
    } catch (err) {
      // JSON parse error -> rethrow with helpful message and raw text
      throw new Error(`Invalid JSON received: ${err.message} — raw: ${text.slice(0, 300)}`);
    }
  } catch (err) {
    throw err;
  }
}

/* ---------- Chat flow ---------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = userInput.value?.trim();
  if (!prompt) return;

  appendMessage({ who: 'user', text: prompt, meta: 'You:' });
  userInput.value = '';
  userInput.disabled = true;
  sendBtn.disabled = true;

  // Always call /api/chat first to get explanation (backend expected)
  try {
    // show a "thinking" bot message placeholder
    const thinkingEl = createMessageElement({ who: 'bot', text: '*Thinking...*', meta: 'Chem-Ed Genius:' });
    chatWindow.appendChild(thinkingEl);
    thinkingEl.scrollIntoView({ behavior: 'smooth' });

    // POST to /api/chat
    const chatResp = await safeJsonFetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    // Remove thinking placeholder
    thinkingEl.remove();

    // chatResp expected shape: { text: "...markdown..." } or { text, show_3d_hint }
    const botText = chatResp?.text || chatResp?.message || 'No response';
    appendMessage({ who: 'bot', text: botText, meta: 'Chem-Ed Genius:' });

    // If user explicitly asked for 3D, call /api/visualize
    if (asksFor3D(prompt)) {
      // The backend /api/visualize should accept { query } and return { html: "<embed..>" } or { smiles, viewerHtml }
      appendMessage({ who: 'bot', text: 'Fetching 3D model...', meta: 'Chem-Ed Genius:' });

      try {
        const visResp = await safeJsonFetch(`${API_BASE}/api/visualize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: prompt })
        });

        // We expect either HTML content in visResp.html or a url to embed in visResp.embed_url
        const html = visResp?.html || visResp?.viewerHtml || null;
        const embed = visResp?.embed_url || null;

        if (embed && !html) {
          // embed iframe
          openViewer('3D Viewer', `<iframe src="${embed}" style="width:100%;height:100%;border:0"></iframe>`);
        } else if (html) {
          openViewer('3D Viewer', html);
        } else {
          // fallback: maybe server returned a SMILES string and we can call an external viewer? show fallback message.
          const fallback = visResp?.smiles ? `SMILES: ${visResp.smiles}` : (visResp?.message || 'No 3D data returned.');
          openViewer('3D Viewer', `<div class="viewer-message">${marked.parse(fallback)}</div>`);
        }
      } catch (err) {
        // Show friendly error in chat and in viewer
        appendMessage({ who: 'bot', text: `3D visualization error: ${err.message}`, meta: 'Chem-Ed Genius:' });
      }
    } else {
      // user didn't ask for 3D -> do nothing
    }

  } catch (err) {
    // Remove any thinking placeholder if present
    const placeholders = chatWindow.querySelectorAll('.msg-body');
    placeholders.forEach(node => {
      // no-op: we rely on removing the exact thinking element earlier - but safe to ignore
    });

    appendMessage({ who: 'bot', text: `Network/server error: ${err.message}`, meta: 'Chem-Ed Genius:' });
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});

/* Accessibility: allow Esc to close viewer */
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && viewerModal.style.display === 'block') {
    closeViewer();
  }
});

/* Initial focus */
userInput.focus();
