# CHEM-ED GENIUS

AI-powered chemistry tutor: Chat + Visuals + Teacher-mode (embeddings + auto-grading) + RDKit microservice.

---

## Quick overview
- Frontend: static site (`frontend/`) -> deploy on GitHub Pages or Render Static Sites.
- Backend: Node/Express (`backend/`) -> deploy on Render as a Web Service (Dockerfile included).
- RDKit microservice: Flask + RDKit (`rdkit_service/`) -> optional but recommended for molecule images.

---

## Step-by-step implementation (from start to finish)

### 0) Preparation
- You have:
  - OpenAI API key (keep it secret).
  - GitHub account.
  - Render account.
- Files: paste the repository structure above into a GitHub repo named `chem-ed-genius`.
- Add image: `frontend/assets/chem.jpg`.

---

### 1) Commit code to GitHub
- Create new repo `chem-ed-genius`.
- Add all files & folders above.
- Commit & push.

---

### 2) Deploy RDKit microservice (optional but recommended)
1. In Render: **New** → **Web Service**.
2. Connect to your GitHub repo.
3. Set Root Directory: `rdkit_service/`.
4. Environment: Docker (Render will use Dockerfile).
5. Set env var: none required (port handled by Dockerfile).
6. Deploy. After deploy, copy the service URL (e.g., `https://chem-rdkit.onrender.com`).

> Note: RDKit image build may take longer. If it fails, contact Render docs or skip RDKit and the backend will still work (no molecule images).

---

### 3) Deploy Backend on Render
1. In Render: **New** → **Web Service**.
2. Connect to GitHub repo.
3. Root Directory: `backend/`.
4. Render will use the `Dockerfile`.
5. In Environment (Render dashboard) set the following **Environment Variables**:
   - `OPENAI_API_KEY` = your OpenAI key
   - `MODEL_NAME` = `gpt-5-thinking-mini`
   - `EMBEDDING_MODEL` = `text-embedding-3-large`
   - `RDKit_URL` = (set to RDKit URL from step 2) *or leave blank*
   - `RENDER_ORIGIN` = your frontend origin (or `*`)
   - `PORT` = `3000`
6. Deploy.
7. When deploy succeeds, copy backend URL (e.g., `https://chem-backend.onrender.com`).

---

### 4) Seed embeddings (one-time)
- In Render, go to the backend service → Shell (or use Deploy Hook).
- Run: `npm run seed-embeddings`
- This will call the OpenAI Embeddings API and populate `embeddings_data.json` with real embeddings for the seed lines.

If you cannot run shell on Render, run locally once (requires Node + internet) and commit updated `embeddings_data.json`.

---

### 5) Deploy Frontend
Option A — **Render Static Site**
1. Render → New → **Static Site**
2. Connect to GitHub repo.
3. Root Directory: `frontend/`.
4. Set build/publish defaults (no build command).
5. Deploy. Copy frontend URL.

Option B — **GitHub Pages**
1. Move `frontend/` contents to repo root (or set Pages source accordingly).
2. Enable Pages in repo settings.
3. Copy Pages URL.

---

### 6) Configure CORS and frontend API URL
- In backend Render env, set `RENDER_ORIGIN` to your frontend URL (for CORS).
- Open frontend page; paste the backend URL in the **API URL** input inside the page (top-right box) — do this once.

---

### 7) Test flows (examples)
- Chat: `Explain hybridization of sp2 vs sp3` → should return exam-friendly explanation.
- Balance: `Balance: C2H6 + O2 -> CO2 + H2O` → backend will server-balance and return verified reaction.
- Structure: `Show structure of benzene` → if RDKit deployed and `RDKit_URL` set, you'll get an image.
- Teacher Reference: Open Teacher Mode → paste backend URL → Search `oxidation`.
- Auto-grade: In Teacher Mode, fill question/expected/student and click Grade.

---

## Troubleshooting
- **500 errors**: verify `OPENAI_API_KEY` is set and valid.
- **RDKit images missing**: confirm `RDKit_URL` env var in backend and RDKit service health (`/health`).
- **Embeddings empty**: run `npm run seed-embeddings` once (requires OPENAI key).
- **CORS**: set `RENDER_ORIGIN` to your frontend origin or `*` for testing.

---

## Security & safety notes
- Keep `OPENAI_API_KEY` only in Render env vars (do NOT commit to GitHub).
- Backend blocks unsafe experimental instructions; it will refuse harmful lab protocols.
- Stoichiometry balancer is basic and uses small integer brute-force; for complex organic systems, rely on model + human verification.

---

## Next steps (if you want)
- Add full NCERT content ingestion (PDF -> text -> embeddings).
- Add persistent vector DB (Pinecone / Weaviate) for larger indexes.
- Add teacher dashboard with student accounts and progress tracking.

---

Enjoy — paste everything, set env vars on Render, seed embeddings, and your CHEM-ED GENIUS will be live. Ping me if you want me to generate the full NCERT ingestion script next (I’ll include code to scrape/ingest NCERT chapters into embeddings). 🎓🔬
