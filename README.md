# Hind — co-pilot för mäklare (clickable demo)

A mobile-first, AI-native co-pilot for Swedish real-estate agents (_mäklare_).
This is the **clickable demo** for the Antler sprint: it makes the core product
bet tangible — the **self-filling loop** where the agent voice-debriefs a showing
and the app structures it into a spekulant profile + next step, lands it on the
object timeline, and "syncs to Vitec".

> The voice-debrief loop is real (mic → Whisper → Claude). Everything else runs
> on seeded Swedish demo data. The Vitec sync is a believable **mock** — Vitec
> Connect access is unverified and is the real product risk.

## Run it (demo mode — zero config)

```bash
npm install
npm run dev
```

Open the printed URL and view it in a **mobile viewport** (DevTools device
toolbar, or your phone on the same network). With no keys configured the voice
loop plays a scripted Swedish debrief, so the whole flow is clickable offline.

Screens: **Hem** (nästa drag) · **Objekt** → tidslinje · **Spekulanter** →
profil · **Röstdebrief** (the centerpiece) · **Synka till Vitec** · **Profil**.

## Turn on real voice + AI

1. **Create a Supabase project** named `hind`.
2. **Front-end env** — copy `.env.example` → `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon/publishable key>
   ```
3. **Database** — push the schema + Swedish seed:
   ```bash
   supabase link --project-ref <ref>
   supabase db push        # applies supabase/migrations/0001_init.sql
   ```
4. **Secrets** (server-side only — never in the client or the repo):
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-... ANTHROPIC_API_KEY=sk-ant-...
   ```
5. **Deploy the Edge Functions:**
   ```bash
   supabase functions deploy transcribe
   supabase functions deploy structure
   ```

Restart `npm run dev`. The header flips from **Demoläge** to **AI live**; the
mic now records real audio → Whisper (`whisper-1`, `language=sv`) → Claude
(`claude-sonnet-4-6`, forced tool-call JSON). Saved debriefs are written to the
`speculant` / `timeline_event` / `next_step` / `debrief` tables.

If a key is missing or a call fails, each function returns a scripted Swedish
result (`source: "demo"`) so the demo never breaks mid-pitch.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn-style UI,
  `react-router-dom`, `zustand`. `src/screens/` = screens, `src/components/` =
  shared UI, `src/lib/` = types, seed, store, api, supabase.
- **Backend:** Supabase Postgres (`supabase/migrations/`) + two Edge Functions
  (`supabase/functions/`) that proxy OpenAI Whisper and Anthropic Claude.

## Data/feedback loop (designed in, not built yet)

`objekt` carries nullable outcome labels (`sald`, `slutpris`,
`dagar_pa_marknaden`) and every debrief is captured to `debrief` (transcript +
structured JSON). That's the capture half — later, joining captured comms to
closed-deal outcomes is what trains prospect-fit prediction.

## Out of scope (v2+)

KYC/FMI automation · real Vitec read/write · iMessage/e-mail capture ·
cross-agent lead routing · trained ML models · auth/multi-tenant.
