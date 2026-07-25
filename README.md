# cycle

A cycle-tracking app for couples — a tracker and a supporter pair up to share where they are in the cycle, send nudges and gifts, chat, and understand each other better. Built with React + Vite + TypeScript, Tailwind + shadcn/ui, and Supabase.

## Tech stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Radix)
- **Supabase** (auth, Postgres, realtime, RLS)

## Local development

```bash
npm install
cp .env.example .env   # then fill in your Supabase values
npm run dev
```

### Environment variables

Both are required (find them in Supabase → Project Settings → API):

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

### Database

Apply the SQL in `supabase/migrations/` to your Supabase project (in order), e.g. via the Supabase SQL editor or the Supabase CLI (`supabase db push`).

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** this GitHub repo. Vercel auto-detects Vite (build `npm run build`, output `dist`).
3. Add the two environment variables above under **Settings → Environment Variables** (Production + Preview).
4. **Deploy.**

## Scripts

```bash
npm run dev        # start dev server
npm run build      # typecheck + production build
npm run preview    # preview the production build
npm run typecheck  # types only
```
