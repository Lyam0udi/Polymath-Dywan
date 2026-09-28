# Polymath Dywan

Local-first Socratic knowledge explorer: map a topic as a 3D force graph, unlock nodes through mentoring dialogue, and expand the graph as you master concepts.

## Prerequisites

- Node.js **20+**
- An [OpenAI API key](https://platform.openai.com/api-keys)

## Getting started

### 1. Clone

```bash
git clone https://github.com/Lyam0udi/Polymath-Dywan.git
cd Polymath-Dywan
```

### 2. Install

```bash
npm install
```

### 3. Environment

Copy the example env file and fill in real values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | Yes | Server-only key for the Socratic mentor and node expansion APIs |
| `NEXT_PUBLIC_APP_URL` | No | App base URL (default `http://localhost:3000`) |
| `DEFAULT_MODEL` | No | Mentor model (default `gpt-4o-mini`) |
| `EXPANSION_MODEL` | No | Graph expansion model (default `gpt-4o`) |

See [`.env.example`](.env.example) for placeholders. Never commit `.env.local`.

### 4. Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Build & run production locally

```bash
npm run build
npm start
```

## Deploy (Vercel)

1. Push the repo to GitHub (already linked if you cloned from origin).
2. Import the project in [Vercel](https://vercel.com/new).
3. In **Project → Settings → Environment Variables**, set at least:
   - `OPENAI_API_KEY` (Production / Preview as needed)
   - Optionally `NEXT_PUBLIC_APP_URL`, `DEFAULT_MODEL`, `EXPANSION_MODEL`
4. Deploy. Vercel runs `next build` automatically.

Graph state persists in the browser via `localStorage` — no external database is required.

## Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
