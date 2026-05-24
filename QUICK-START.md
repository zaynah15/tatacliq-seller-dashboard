# ⚡ Quick Start — Two Independent AI Pipelines

The dashboard has **two separate workflows**:

| Pipeline | What it does | Where |
|----------|-------------|-------|
| 📊 **Catalog Enrichment** | Seller Excel/CSV → Gemini fills missing fields → enriched .xlsx | `/upload` |
| 🎨 **AI Image Studio** | Product image → smart aspect-ratio resize → no subject crop, no white padding | `/studio` |

Both feed the **Download Center** (`/downloads`) so all outputs are in one place.

---

## Run it (3 commands)

```bash
unzip tatacliq-seller-dashboard.zip
cd tatacliq-seller-dashboard/apps/web
npm install
npm run dev
```

Open **http://localhost:3000**.

---

## 📊 Try Pipeline A: Catalog Enrichment

1. Go to **Upload Catalog** in the sidebar (or `/upload`)
2. Drag in `sample-catalog-missing-data.csv` (in project root) — 10 real-style fashion products with HSN, fabric, sleeve, fit, etc. all intentionally blank
3. Click **Run AI Enrichment**
4. Watch all 30+ portal fields get filled in per product
5. Click **Download .xlsx** — get a portal-ready master sheet

Want even more realism? Drop in `sample-catalog.xlsx` (8 products) too.

---

## 🎨 Try Pipeline B: AI Image Studio

1. Go to **AI Image Studio** (or `/studio`)
2. Drop in any product image (JPG/PNG/WebP)
3. Pick a target dimension:
   - **Portrait 3:4** (1080×1440) — Marketplace standard
   - **Portrait 4:5** (1080×1350) — Instagram
   - **Square 1:1** (1080×1080)
   - **Landscape 16:9** (1920×1080)
   - **Story 9:16** (1080×1920)
   - **Custom** — your own dimensions
4. (Optional) Add product context: *"women's mustard kurta on female model"*
5. Click **Enhance**
6. See before/after, **crop-risk** scores for head/hands/feet/garment, regenerate, download

The AI:
- ✅ Preserves the subject 100% — heads, hands, feet, garment edges never cropped
- ✅ Extends the background using sampled tones (no white padding)
- ✅ Uses **Gemini 2.5 Flash Image** ("Nano Banana") for real outpainting when `GEMINI_API_KEY` is set
- ✅ Falls back to a deterministic smart-canvas engine otherwise

---

## 📦 Download Center (`/downloads`)

Every image you enhance and every sheet you enrich shows up here in one place. Filter by type, re-download anytime, clear when done.

---

## 🔑 Add your Gemini API key (optional)

Without it: deterministic fallback for both pipelines (works for demos).
With it: real Gemini Pro for text enrichment + Nano Banana for images.

1. Get a key: https://aistudio.google.com → **Get API key**
2. Create `apps/web/.env.local`:
   ```
   GEMINI_API_KEY=paste_your_key_here
   ```
3. Restart `npm run dev`

---

## 📂 Files in this repo

```
tatacliq-seller-dashboard/
├── apps/web/
│   ├── app/
│   │   ├── upload/page.tsx              ← Pipeline A: catalog
│   │   ├── studio/page.tsx              ← Pipeline B: images
│   │   ├── downloads/page.tsx           ← Download Center
│   │   ├── enrichment/page.tsx          ← Enrichment Preview
│   │   └── api/
│   │       ├── enrich-batch/route.ts    ← returns .xlsx
│   │       ├── enrich-preview/route.ts  ← returns JSON preview
│   │       └── enhance-image/route.ts   ← image AI
│   ├── lib/
│   │   ├── excel.ts                     ← Excel parse + generate
│   │   ├── gemini.ts                    ← text enrichment
│   │   ├── image-enhance.ts             ← image outpainting
│   │   └── downloads.ts                 ← download tracking
│   └── components/
├── sample-catalog.xlsx                   ← 8 products test set
├── sample-catalog-missing-data.csv       ← 10 products, lots missing
└── QUICK-START.md
```

---

## 🚀 Push to GitHub

```bash
cd tatacliq-seller-dashboard
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/tatacliq-seller-dashboard.git
git push -u origin main
```

`.env.local` is gitignored — your API key stays local.

---

## Common issues

| Problem | Fix |
|---------|-----|
| `npm install` errors on `sharp` | Use Node 20 (`node -v`). On Apple Silicon, `npm rebuild sharp` if needed. |
| Image enhance shows "smart canvas" not Gemini | Add `GEMINI_API_KEY` to `apps/web/.env.local` and restart. |
| Catalog upload says "Excel is empty" | The CSV/Excel needs a header row (col names). Sample files include them. |
| Browser shows old version | Hard refresh: Cmd/Ctrl + Shift + R |
