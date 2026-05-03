# Real Forio Depth Chart — Setup & Deploy

A shared online depth chart, hosted on Vercel, backed by Supabase. Anyone with the link sees and edits the same roster live.

## 1. Database setup (one-time, ~5 min)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/01-schema.sql` → **Run**. Creates the `players` and `meta` tables, enables RLS with public access, turns on Realtime.
3. New query → paste `supabase/02-seed.sql` → **Run**. Inserts the starting roster.
4. Confirm in **Table Editor** → `players` shows 5 rows.
5. (Optional) Confirm Realtime is on: **Database → Replication → supabase_realtime** lists `players` and `meta`.

## 2. Local test

Open `Depth Chart.html` in any browser served over a local server (file:// won't work for Supabase websockets). Quickest:

```bash
cd <project-folder>
python3 -m http.server 8080
# open http://localhost:8080/Depth%20Chart.html
```

You should see:
- A green pulsing dot next to "Lavagna Tattica" → connected & syncing.
- The 5 seeded players in their depth lists.
- "✎ Modifica rosa" button in the formation strip.

Open the same URL in a second tab — make a change in one, watch it appear in the other within ~200ms.

## 3. Deploy to Vercel (~3 min)

### Option A — drag & drop (no CLI)
1. Go to **vercel.com/new** → **Import → Upload**.
2. Zip the project folder (or drag the folder).
3. Project name: `real-forio-depth`. Framework preset: **Other**. Output directory: leave blank.
4. Deploy. You get a URL like `https://real-forio-depth.vercel.app`.

### Option B — CLI
```bash
npm i -g vercel
cd <project-folder>
vercel deploy --prod
```
First run asks a few yes/no questions; accept defaults. The `vercel.json` already in the project pins it to a static deployment.

### Make `Depth Chart.html` the default page

Vercel serves `index.html` by default. Either:
- Rename `Depth Chart.html` → `index.html` before deploying, **or**
- Keep the filename and share the URL `https://your-app.vercel.app/Depth%20Chart.html`.

The `vercel.json` config rewrites `/` → `Depth Chart.html` automatically, so the root URL works either way.

## 4. Sharing

Send the Vercel URL. Anyone who opens it can:
- See the live roster + depth chart.
- Click a player to promote them to starter.
- Click **✎ Modifica rosa** → add, edit, remove players, change positions.
- Tweaks panel for personalization (local to their device).

All edits are persisted to Supabase and propagated live to every other open tab.

## 5. What's where

| File | Purpose |
|---|---|
| `Depth Chart.html` | Main page |
| `app.jsx` | React UI (depth list, pitch, modals) |
| `roster.jsx` | Position layout (static) |
| `supabase-client.js` | Cloud helpers (`SB.fetchAll`, `SB.addPlayer`, etc.) |
| `tweaks-panel.jsx` | Personalize panel (local) |
| `styles.css` | All styling |
| `logo-data.js` | Logo as inline data URL |
| `assets/realforio-logo.png` | Source logo (also used as favicon) |
| `supabase/01-schema.sql` | DB tables + RLS + Realtime |
| `supabase/02-seed.sql` | Starting roster |
| `vercel.json` | Static deploy config |

## 6. Security notes (Option A: open access)

The anon key + RLS policies allow anyone with the URL to read & write. Acceptable for a small private group sharing a private link. **Do not post the URL publicly.**

To lock it down later:
- Add a password gate (single shared secret stored in localStorage; RLS policy requires the secret in a custom JWT claim). ~½ day extra.
- Or migrate to real auth (Supabase Auth + per-user roles). ~1–2 days.

## 7. Common issues

| Symptom | Fix |
|---|---|
| Live dot stays orange ("connecting") | Realtime not enabled — re-run `alter publication supabase_realtime add table public.players;` |
| `relation "players" does not exist` | Schema SQL didn't run; rerun `01-schema.sql` |
| Edits don't appear in other tabs | RLS off or Realtime not subscribed — check Replication panel |
| Player added but appears at wrong position | The `position` field uses fixed codes: `GK, RB, RCB, LCB, LB, RCM, CM, LCM, RW, ST, LW`. Check the CHECK constraint in the schema |
| 401 on requests | Anon key wrong — re-copy from Supabase → Settings → API → "anon public" |
