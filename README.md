# Polymath Dywan

Local-first Socratic knowledge explorer: map a topic as a 3D force graph, unlock nodes through mentoring dialogue, and expand the graph as you master concepts.

Graph state lives in the browser (`localStorage`). Mentoring and expansion call Google Gemini and/or OpenAI via Next.js API routes — no external database.

## Prerequisites

- Node.js **20+** (`engines.node` in `package.json`)
- A free [Google AI Studio API key](https://aistudio.google.com/apikey) **or** an [OpenAI API key](https://platform.openai.com/api-keys) (or both)

## Installation

### 1. Clone

```bash
git clone https://github.com/Lyam0udi/Polymath-Dywan.git
cd Polymath-Dywan
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the example file and set real values (never commit `.env.local`):

```bash
cp .env.example .env.local
```

All variables from the environment contract:

| Variable | Required | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | One of Google / OpenAI | _(none)_ | Server-only Google AI Studio key for `gemini-*` models |
| `OPENAI_API_KEY` | One of Google / OpenAI | _(none)_ | Server-only key for `gpt-*` / `o*` models |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public origin for sitemap absolute URLs and internal routing |
| `DEFAULT_MODEL` | No | `gemini-3.5-flash` | Model used by the Socratic mentor (`/api/mentor`) |
| `EXPANSION_MODEL` | No | `gemini-3.1-pro-preview` | Model used for semantic node branching (`/api/expand`) |
| `AI_PROVIDER` | No | _(inferred)_ | Optional force: `google` \| `openai` |

Placeholders live in [`.env.example`](.env.example). Defaults are also mirrored under `APP_CONFIG.env` in [`app.config.ts`](app.config.ts).

Provider is inferred from the model id (`gemini-*` → Google). Without the matching key, mentor and expand routes return **503** and the UI prompts you to open Settings / complete setup.

### 4. Develop locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — seed entry is [`app/page.tsx`](app/page.tsx); the 3D universe is [`app/universe/page.tsx`](app/universe/page.tsx).

### 5. Production build (local verify)

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this repo to GitHub (or connect an existing remote).
2. Import the project in [Vercel](https://vercel.com/new) (framework: Next.js; see [`vercel.json`](vercel.json)).
3. In **Project → Settings → Environment Variables**, set for Production (and Preview if needed):

   | Variable | Notes |
   | :--- | :--- |
   | `OPENAI_API_KEY` | **Required** — do not expose as `NEXT_PUBLIC_*` |
   | `NEXT_PUBLIC_APP_URL` | Set to your production origin, e.g. `https://your-app.vercel.app` |
   | `DEFAULT_MODEL` | Optional; defaults to `gpt-4o-mini` |
   | `EXPANSION_MODEL` | Optional; defaults to `gpt-4o` |

4. Deploy. Vercel runs `next build` automatically. API routes `app/api/mentor` and `app/api/expand` are configured with `maxDuration: 60` in `vercel.json`.

No database or Redis is required. Client graph persistence uses `localStorage` only.

## Production deployment verification

After deploy, confirm:

| Check | Path / URL |
| :--- | :--- |
| Favicon | [`app/favicon.ico`](app/favicon.ico) → `https://<host>/favicon.ico` |
| Seed / home | [`app/page.tsx`](app/page.tsx) → `https://<host>/` |
| Universe UI | [`app/universe/page.tsx`](app/universe/page.tsx) → `https://<host>/universe` |
| Mentor API | [`app/api/mentor/route.ts`](app/api/mentor/route.ts) → `POST /api/mentor` |
| Expand API | [`app/api/expand/route.ts`](app/api/expand/route.ts) → `POST /api/expand` |
| Robots | [`app/robots.txt`](app/robots.txt) → `https://<host>/robots.txt` |
| Sitemap | [`app/sitemap.ts`](app/sitemap.ts) → `https://<host>/sitemap.xml` (uses `NEXT_PUBLIC_APP_URL`) |
| Styles / layout | [`app/globals.css`](app/globals.css), [`app/layout.tsx`](app/layout.tsx) |

Smoke flow: seed a topic → Enter Universe → select a node → chat until mastery or Reveal → confirm child nodes appear after expand.

## Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` / `npm run e2e` | Playwright end-to-end tests |

## Architecture notes

- **Config SSOT:** [`app.config.ts`](app.config.ts)
- **Graph types:** `types/graph.ts`
- **Persistence:** `lib/persistence/local-storage.ts` via universe store hooks
- **3D engine:** `react-force-graph-3d` (no `@react-three/fiber`)
- **AI:** Vercel AI SDK — streamed mentor replies; JSON expand payload with schema-safe fallbacks
