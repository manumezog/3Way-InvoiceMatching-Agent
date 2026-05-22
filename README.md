# FastPay AI — Autonomous 3-Way Invoice Reconciliation

> An agentic AI back-office worker that reads messy vendor invoices, cross-references them against Purchase Orders and Warehouse Receipts, and autonomously approves or flags them — with reasoning, confidence scores, and full traceability.

A learning side project exploring real-world **agentic workflows**, **document AI**, **LLM evaluation**, and **production-grade agent observability** — applied to a genuine supply chain pain point.

---

## Table of Contents

- [The Problem](#the-problem)
- [The Vision](#the-vision)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Feature Set](#feature-set)
- [The Invoice Gallery](#the-invoice-gallery)
- [UI Layout](#ui-layout)
- [Cost & Abuse Protection](#cost--abuse-protection)
- [Security & Workflow Rules](#security--workflow-rules)
- [Project Roadmap & Progress](#project-roadmap--progress)
- [Local Development](#local-development)

---

## The Problem

**3-Way Matching** is one of the most universally painful processes in Accounts Payable and supply chain operations. Every day, AP clerks manually cross-reference three documents for every single vendor invoice:

1. **Purchase Order (PO)** — what was ordered, at what price
2. **Warehouse Receipt (WMS)** — what physically arrived at the dock
3. **Vendor Invoice** — what the vendor is billing for

Mismatches (shortages, price gouging, duplicate billing, unauthorized line items, currency drift) must be caught manually. Enterprise AP teams spend thousands of hours per month on this. It's slow, error-prone, and a perfect fit for an autonomous agent.

## The Vision

Build a working MVP of an **autonomous AP back-office agent** that can:

- Ingest messy, real-world invoice PDFs (scans, photos, multi-line, foreign currency)
- Extract structured data using a vision LLM
- Use tools to query PO and WMS data sources
- Apply fuzzy matching for vendor and SKU mismatches
- Make a deterministic approve/flag/escalate decision
- Generate a natural-language explanation with a confidence score
- Surface a full evaluation dashboard proving the agent's reliability
- Be fully observable — every step, every tool call, every token cost traced

The end product is **frictionless**: a recruiter, hiring manager, or curious visitor lands on the page, clicks one button, and watches an agent reason through a batch of real invoices in real time.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Full-stack React in one repo; Vercel-native deployment |
| **Language** | TypeScript | Type safety for agent state, tool schemas, matching logic |
| **Styling** | Tailwind CSS + shadcn/ui | Clean, professional dashboard aesthetic with zero cost |
| **Database** | SQLite (`better-sqlite3`) → Neon Postgres | $0 locally; one env-var flip to scale to enterprise |
| **AI Model (Primary)** | Google **Gemini 2.5 Flash** | Generous free tier (15 RPM, 1M TPD); vision-capable |
| **AI Model (Fallback)** | OpenRouter (Llama / Gemini routes) | Provider redundancy |
| **PDF Vision Extraction** | Gemini 2.5 Flash multimodal | Native PDF + image understanding |
| **Embeddings** | Gemini `text-embedding-004` (free tier) | Fuzzy vendor and SKU matching |
| **Agent Observability** | Langfuse (free tier) | Trace every step, tool call, token, latency |
| **Rate Limiting** | Upstash Redis (free tier) | IP-based throttling at the edge |
| **Animation** | Framer Motion | Smooth trace reveal, batch processing animation |
| **Deployment** | Vercel (free tier) | Zero-config for Next.js |

**Total monthly cost at launch: $0.00**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App (Vercel)                   │
│                                                             │
│  /app (React UI)                /app/api                    │
│  ┌──────────────────────┐      ┌──────────────────────┐     │
│  │ Invoice Gallery      │      │ /api/agent/run       │     │
│  │ Batch Runner         │─────▶│ /api/agent/batch     │     │
│  │ Live Trace Panel     │      │ /api/evals/run       │     │
│  │ Eval Dashboard       │      └──────────┬───────────┘     │
│  └──────────────────────┘                 │                 │
│                                           ▼                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │             Agent Orchestrator                      │    │
│  │  - Plans the steps                                  │    │
│  │  - Calls tools in sequence                          │    │
│  │  - Maintains state & confidence                     │    │
│  │  - Streams trace events to the UI                   │    │
│  │  - Emits to Langfuse                                │    │
│  └────┬──────────────┬─────────────┬────────────┬──────┘    │
│       ▼              ▼             ▼            ▼           │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐     │
│  │ extract │  │ lookup_po │  │ query_   │  │ fuzzy_   │     │
│  │ _pdf    │  │           │  │ wms      │  │ match    │     │
│  └─────────┘  └───────────┘  └──────────┘  └──────────┘     │
│       ▼              ▼             ▼            ▼           │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐     │
│  │ currency│  │ check_    │  │ reason_  │  │ escalate │     │
│  │ _convert│  │ duplicate │  │ decide   │  │          │     │
│  └─────────┘  └───────────┘  └──────────┘  └──────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Repository Layer (db/repo.ts)                      │    │
│  │  SQLite (local) / Neon Postgres (prod)              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Design principles

- **Repository pattern** — every DB call goes through a repo interface; swapping SQLite for Postgres is one config line.
- **Tool-using agent** — the LLM never has direct DB access; it calls typed tools whose outputs are validated.
- **Structured outputs everywhere** — Zod schemas validate every LLM response.
- **Streaming traces** — agent steps stream to the UI via Server-Sent Events for the live "thinking" effect.
- **Frugal-by-default, scalable-by-design** — every component has a documented upgrade path.

---

## Feature Set

### Core Agentic Capabilities

- **Vision-based PDF extraction** — handles digital PDFs, scans, phone photos
- **Tool-using agent loop** — extract → lookup → query → fuzzy-match → reason → decide → escalate
- **Fuzzy vendor & SKU matching** via embeddings + cosine similarity
- **Currency conversion** tool with cached FX rates
- **Duplicate invoice detection** (fraud prevention)
- **Confidence scoring** with calibration
- **Human-in-the-loop escalation** for low-confidence cases
- **Natural language reasoning** for every decision

### Decision Logic (Deterministic Rules + LLM Reasoning)

| Condition | Status |
|---|---|
| All quantities and prices match across PO/WMS/Invoice | **APPROVED** |
| WMS qty < Invoice qty | **FLAGGED — SHORTAGE** |
| Invoice price > PO price | **FLAGGED — PRICE MISMATCH** |
| Vendor name doesn't match PO vendor (fuzzy threshold) | **FLAGGED — VENDOR MISMATCH** |
| Currency differs and conversion needed | **REVIEW — FX CONVERSION** |
| Invoice line items not in PO | **FLAGGED — UNAUTHORIZED ITEMS** |
| Hash matches a previously processed invoice | **FLAGGED — DUPLICATE** |
| Confidence < threshold | **ESCALATED — HUMAN REVIEW** |

---

## The Invoice Gallery

The gallery is the heart of the demo experience. 8-12 hand-crafted, real-looking PDF invoices, each curated to showcase a specific agent capability. Each card displays a PDF thumbnail, a difficulty badge, and a skill tag.

| # | Invoice Scenario | Skill Demonstrated | Expected Outcome |
|---|---|---|---|
| 1 | Clean digital PDF, all matches | Baseline happy path | APPROVED |
| 2 | Phone-photo of crumpled invoice | Vision OCR resilience | APPROVED |
| 3 | Vendor "ACME Corp." vs PO's "Acme Corporation Inc." | Fuzzy vendor matching (embeddings) | APPROVED with low-confidence flag |
| 4 | 12 line items, partial shortage on 2 SKUs | Multi-line reasoning | FLAGGED — SHORTAGE |
| 5 | EUR invoice against USD PO | Currency tool use | REVIEW — FX CONVERSION |
| 6 | Handwritten "discount applied" annotation | Vision + judgment | REVIEW — HUMAN |
| 7 | Duplicate of a previously paid invoice | Fraud / duplicate detection | FLAGGED — DUPLICATE |
| 8 | Vendor billed for SKUs not on PO | Unauthorized line detection | FLAGGED — UNAUTHORIZED |
| 9 | Tax calculation mismatch | Arithmetic reasoning | FLAGGED — TAX |
| 10 | Price 20% above PO | Price gouging detection | FLAGGED — PRICE MISMATCH |
| 11 | Adversarial: near-identical vendor name (typo) | Anti-fraud fuzzy logic | ESCALATED |
| 12 | Perfect match but late delivery date | Timeliness flagging | APPROVED with note |

Each invoice has a corresponding PO and WMS receipt seeded in the DB.

---

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ FastPay AI · Autonomous 3-Way Invoice Reconciliation    │
├─────────────────────────────────────────────────────────┤
│ [▶ Process Today's Batch]  [📊 Eval Mode]  [📤 Upload]  │
├─────────────────────────────────────────────────────────┤
│  Invoice Gallery (click to process individually)        │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                            │
│  │PDF1│ │PDF2│ │PDF3│ │PDF4│  ← thumbnails              │
│  │Easy│ │OCR │ │Fuzz│ │FX  │  ← skill badges            │
│  └────┘ └────┘ └────┘ └────┘                            │
├─────────────────────────────────────────────────────────┤
│  Agent Trace (live)         │  Decision Output          │
│  ▸ extract_pdf...     ✓     │  Status: FLAGGED          │
│  ▸ lookup_po(PO-887)  ✓     │  Confidence: 94%          │
│  ▸ query_wms...       ✓     │  Reason: Vendor billed    │
│  ▸ fuzzy_vendor_match ✓     │  $1,200 for 50 units but  │
│  ▸ reason_and_decide  ⏳    │  WMS only received 48...  │
└─────────────────────────────────────────────────────────┘
```

### The Three "Wow" Moves

1. **"Process Today's Batch" headline button** — agent autonomously processes all 12 invoices in sequence, with live trace, decisions populating one by one, and running totals (cost, latency, approvals).
2. **Live Eval Mode dashboard** — runs the agent against ground-truth labels; surfaces accuracy, precision, recall, confusion matrix, p50/p95 latency, cost per invoice, and a model-comparison view (Gemini Flash vs Claude Haiku vs Llama).
3. **Langfuse trace viewer** — "View Full Trace" link opens the Langfuse trace for the run, showing every prompt, tool call, and token cost.

### Optional features

- **"Adversarial Mode" toggle** — injects subtle errors into invoices on the fly (typos, swapped digits) to prove the agent reasons rather than memorizes.
- **"Bring Your Own Invoice"** — small upload link for power users.

---

## Cost & Abuse Protection

### Why this matters

Once the app is public on the internet, anyone can hammer the API endpoint and run up an LLM bill. Defense in depth is built in from day one.

### Layered defenses

| Layer | Mechanism | Effect |
|---|---|---|
| **1. Response caching** | SQLite cache keyed by `(scenario_id, model)` | After first run, repeat requests cost $0 |
| **2. Input locking** | API rejects any payload that isn't a known scenario ID or whitelisted upload | Blocks prompt injection and runaway-token attacks |
| **3. IP rate limiting** | Upstash Redis: 10 runs / IP / hour | Throttles abuse at the edge |
| **4. Vercel Edge Middleware** | Rate limit before serverless wakes up | Zero compute cost on blocked requests |
| **5. Daily budget guard** | Hard cap on total LLM calls per day | Catastrophic-failure safeguard |
| **6. Upload size & MIME validation** | Reject anything that isn't a small PDF | Blocks abusive uploads |
| **7. No secrets in client** | All LLM calls happen server-side only | API keys never reach the browser |

---

## Security & Workflow Rules

These are durable rules for all development on this repo:

- **No secrets in git.** Every commit and push is preceded by a sweep for API keys, env vars, or private data. `.env*` files are gitignored from day one.
- **Brief cybersecurity assessment before every commit.** Check for SQL injection (parameterized queries only), XSS (escape user content), insecure API routes (validate inputs), and supply-chain risk (lockfile committed).
- **All LLM I/O validated with Zod schemas.** No unchecked JSON parsing.
- **Server-side LLM calls only.** Client never holds an API key.
- **Parameterized DB queries only.** No string-concatenated SQL.
- **No destructive git operations without confirmation.** No `--force`, no `reset --hard`, no `--no-verify`.

---

## Project Roadmap & Progress

Phased plan. Each phase ends with a working, committable checkpoint.

### Phase 0 — Foundation ✅
- [x] Initialize Next.js 14 + TypeScript + Tailwind project
- [x] Set up shadcn/ui components
- [x] Configure ESLint, `.gitignore`, `.env.example`, `.gitattributes`
- [x] Initialize git, connect to GitHub repo
- [x] Set up SQLite + repository pattern abstraction
- [x] Define core data schemas (PO, WMS Receipt, Invoice, Match Result)

### Phase 1 — Static UI Skeleton ✅
- [x] Top nav with title and action buttons
- [x] Invoice gallery grid (12 cards with difficulty badges + skill tags)
- [x] Agent trace panel (animated step-by-step placeholder)
- [x] Decision output panel (status, confidence bar, reasoning)
- [x] Eval Mode tab with ground-truth summary stubs

### Phase 2 — Synthetic Data Pipeline ✅
We **generate everything ourselves** — full control over ground truth, no licensing or PII risk, tunable difficulty, and the pipeline itself becomes a portfolio signal ("built a synthetic eval dataset").

**Flow:**
1. Define all 12 scenarios as a single JSON file (POs, WMS receipts, invoices with planted mismatches + ground-truth labels). One source of truth that feeds both the demo and the eval suite.
2. Seed PO and WMS tables into SQLite from the JSON.
3. Render invoices as PDFs using HTML + Puppeteer, with 4-5 distinct vendor templates (different layouts, fonts, fake SVG logos, color schemes) so the vision model encounters real variety.
4. Post-process selected invoices with `sharp` to create messy variants:

| Variant | Transformation |
|---|---|
| Clean digital | None — straight HTML→PDF |
| Scanned | PNG conversion, noise, slight blur, off-white background |
| Phone photo | Rotation 3-7°, perspective skew, shadow gradient |
| Handwritten note | Overlay a pre-drawn PNG annotation |
| Crumpled | Apply paper-texture overlay |

5. Vendor names and logos are **fully fictional** (no trademark risk) — generated via Faker.js seeded for reproducibility. Logos are simple SVG (geometric shapes + vendor name).
6. Final PDFs saved to `/public/invoices/`.

**Tools:** Puppeteer (HTML→PDF), `sharp` (image effects), Faker.js (data generation).

**Tasks:**
- [x] Define scenario JSON schema (Zod) — POs, WMS receipts, invoices, ground-truth labels
- [x] Author the 12 scenarios JSON file (`data/scenarios.json` — single source of truth)
- [x] Build 5 HTML invoice templates with SVG logos (Apex, Northwind, EuroTech, Crestline, Generic)
- [x] Puppeteer rendering script — HTML → PNG → PDF
- [x] `sharp` post-processing for messy variants (scanned, phone-photo, handwritten, crumpled)
- [x] Seed script: `npm run seed` → inserts 12 POs + WMS receipts + invoices, renders 12 PDFs to `/public/invoices/`
- [x] Ground-truth labels in `data/scenarios.json` — same file feeds Eval Mode (Phase 6)

### Phase 3 — Agent Tools (Individual) ✅
- [x] `extract_pdf` — Gemini vision extraction with Zod schema validation
- [x] `lookup_po` — query PO from DB
- [x] `query_wms` — query WMS receipt from DB
- [x] `fuzzy_match_vendor` — embeddings + cosine similarity
- [x] `convert_currency` — FX rate lookup with 6h SQLite cache + free API fallback
- [x] `check_duplicate` — invoice_number-based duplicate detection against match_results
- [x] `reason_and_decide` — deterministic rule engine (shortage, price mismatch, unauthorized items, vendor mismatch, FX) + Gemini-generated natural language explanation
- [x] `escalate` — low-confidence escalation path
- [x] Full agent orchestrator loop (`orchestrator.ts`) with EmitFn trace event streaming
- [x] `POST /api/agent/run` — REST endpoint wrapping the orchestrator
- [x] `npm run test:agent <scenario-id>` — CLI smoke test runner
- [x] Smoke-tested: scenario-01 APPROVED ✓, scenario-04 FLAGGED/SHORTAGE ✓, scenario-07 FLAGGED/DUPLICATE ✓

### Phase 4 — SSE Streaming & Observability ✅
- [x] `POST /api/agent/stream` — Server-Sent Events endpoint; each trace step streamed as it fires
- [x] Langfuse integration — optional (activates when `LANGFUSE_*` env vars set); creates one trace per run with per-step spans
- [x] `trace_id` stored in `match_results` for Langfuse deep-link in Phase 7
- [x] Graceful no-op when Langfuse keys are absent (dev works without them)
- [x] SSE sentinel `{"type":"done"}` closes the stream cleanly on client side

### Phase 5 — Live UI Integration ✅
- [x] Gallery card click → real agent run via SSE (`/api/agent/stream`)
- [x] Live trace panel: each step appears as `▸ running` then flips to `✓ done` in-place; auto-scrolls
- [x] Decision panel reveals live result (status badge, confidence bar, agent reasoning, elapsed time)
- [x] Result dot on card shows actual agent outcome (emerald/red/amber), not static ground-truth
- [x] "Process Today's Batch" runs all 12 invoices sequentially; ActionBar shows live approved/flagged/escalated counters
- [x] Cards disabled while any run is in progress; gallery header shows "N/12 processed"

### Phase 6 — Eval Mode ✅
- [x] `POST /api/eval/run` — SSE eval endpoint: clears match_results, re-runs all 12 scenarios fresh, streams per-result events
- [x] Full metrics: accuracy, macro F1, per-class precision/recall/F1, confusion matrix (3×3), p50/p95 latency, avg confidence
- [x] `clearMatchResults()` + invoice status reset so eval always runs from a clean slate
- [x] EvalDashboard rewrite: progress bar, metric cards, confusion matrix, per-class table, per-scenario pass/fail table
- [x] Fixed embedding model: `text-embedding-004` → `gemini-embedding-001` (correct model ID for v1 API keys)
- [x] Baseline result: **73% accuracy (8/11)** — 3 documented gaps: ESCALATED scenarios misclassified (handwriting detection not yet implemented), fuzzy vendor threshold edge case, transient model 503

### Phase 7 — Polish & Wow Factor ✅
- [x] Real invoice thumbnails in gallery cards (Puppeteer crop → JPEG, icon fallback)
- [x] Framer Motion animations on trace steps and decision reveal
- [x] Langfuse trace deep-link in result panel
- [x] Loading states, empty states, error states (AnimatePresence transitions)
- [x] "Bring Your Own Invoice" upload — synthetic PO+WMS generated with injected discrepancy; supports PDF/JPEG/PNG/WEBP up to 10 MB
- [ ] "Adversarial Mode" toggle

### Phase 8 — Abuse Protection, CI/CD & Deployment
- [ ] Upstash Redis rate limiting middleware
- [ ] Daily budget guard
- [ ] Input schema validation on all API routes
- [ ] Pre-deploy security sweep (no secrets, no SQL injection, no XSS)
- [ ] `.github/workflows/ci.yml` — GitHub Actions CI: runs `lint` + `tsc --noEmit` + `npm run build` on every push/PR; blocks merge on failure
- [ ] Vercel GitHub integration — auto-deploys to production on merge to `main` (zero extra config)
- [ ] Deploy to Vercel
- [ ] Custom domain (optional)

### Phase 9 — Documentation & Showcase
- [ ] In-app "How it works" modal explaining the architecture
- [ ] README polish with screenshots and GIFs
- [ ] Architecture diagram in repo
- [ ] Public demo link

---

## Local Development

```bash
# clone
git clone https://github.com/manumezog/3Way-InvoiceMatching-Agent.git
cd 3Way-InvoiceMatching-Agent

# install
npm install

# environment
cp .env.example .env.local
# fill in: GEMINI_API_KEY, OPENROUTER_API_KEY (optional), LANGFUSE keys, UPSTASH keys

# seed the DB
npm run seed

# dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## License

MIT.
