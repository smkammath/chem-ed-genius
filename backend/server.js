require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const axios = require('axios');
const {balance} = require('./stoich');
const prompts = require('./prompt_templates');
const { searchRelevant } = require('./embeddings');
const { gradeAnswer } = require('./auto_grade');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const RDKit_URL = process.env.RDKit_URL || '';
const RENDER_ORIGIN = process.env.RENDER_ORIGIN || '*';
const MODEL = process.env.MODEL_NAME || 'gpt-5-thinking-mini';
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

app.use(cors({ origin: RENDER_ORIGIN }));

app.use(rateLimit({
  windowMs: 60*1000,
  max: 60
}));

if (!OPENAI_KEY) {
  console.warn('OPENAI_API_KEY not set. Set it in Render env vars.');
}

async function callOpenAI(messages, maxTokens=800) {
  if (!OPENAI_KEY) throw new Error('OpenAI API key not configured on server.');
  const payload = {
    model: MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: 0.0
  };
  const res = await axios.post(OPENAI_API, payload, {
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data;
}

app.post('/api/chat', async (req, res) => {
  try {
    const {prompt, grade='12th', mode='explain'} = req.body || {};
    if (!prompt || typeof prompt !== 'string') return res.status(400).send('Invalid prompt');

    const lower = prompt.toLowerCase();
    if (lower.includes('how to make') || lower.includes('how to synthesize') || lower.includes('explode') || lower.includes('detonate')) {
      return res.status(403).json({error: 'Request blocked for safety. I can explain theory but not give experimental instructions.'});
    }

    const messages = [
      {role:'system', content: prompts.system},
      {role:'user', content: `User level: ${grade}. Mode: ${mode}. Query:\n${prompt}`}
    ];

    const aiResp = await callOpenAI(messages);
    const assistantText = aiResp.choices?.[0]?.message?.content || '';

    // Balance detection
    const balanceMatch = prompt.match(/balance[:]? (.*)/i) || prompt.match(/balance this[:]? (.*)/i);
    let finalAnswer = assistantText;
    let imageUrl = null;
    let keytakeaways = '';

    if (balanceMatch) {
      const reaction = balanceMatch[1].trim();
      const parsed = balance(reaction);
      if (parsed) {
        const left = parsed.left.map(p => (p.coef>1? p.coef+' ':'')+p.formula).join(' + ');
        const right = parsed.right.map(p => (p.coef>1? p.coef+' ':'')+p.formula).join(' + ');
        finalAnswer = `Balanced reaction:\n${left} -> ${right}\n\n(Verified server-side)`;
        keytakeaways = 'Balanced using server-side integer-coefficient search (limits applied).';
      } else {
        finalAnswer = assistantText + `\n\n⚠️ Server attempted to balance but could not find small integer coefficients within search limits.`;
      }
    }

    // If visualize / structure asked and RDKit available
    if (/bohr model|structure|show.*(molecule|structure)|draw|diagram|visual/i.test(prompt)) {
      const nameMatch = prompt.match(/(?:of|for|:)\s*([A-Za-z0-9\-\_\(\)\s]+)$/i);
      const name = nameMatch ? nameMatch[1].trim() : null;
      if (name && RDKit_URL) {
        try {
          const rr = await axios.get(`${RDKit_URL}/render`, { params: { name } });
          if (rr.data && rr.data.url) imageUrl = rr.data.url;
        } catch (e) {
          console.warn('RDKit render failed', e.message);
        }
      }
    }

    res.json({
      answer: finalAnswer,
      image: imageUrl,
      keytakeaways
    });

  } catch (err) {
    console.error(err && err.message);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.get("/api/reference", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).send("Missing ?q=");
    const results = await searchRelevant(q);
    res.json(results.map(r => ({ text: r.text, score: r.score })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/grade", async (req, res) => {
  try {
    const { question, expected, student } = req.body;
    if (!question || !expected || !student)
      return res.status(400).send("Missing fields");
    const result = await gradeAnswer(question, expected, student);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req,res)=> res.json({ok:true}));

app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
