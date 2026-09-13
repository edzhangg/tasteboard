# Tasteboard

A private, two-person restaurant journal. Jenn and Eddy each score a place 0–10
per visit; scores roll up to a personal average each, plus a combined average
that maps to an S/A/B/C/D/F tier. Once both have logged a place, a cached AI
"shared take" summarises agreement, disagreement and a verdict.

Built from the design handoff in [`design_handoff_tasteboard/`](design_handoff_tasteboard/).
Next.js (App Router) + TypeScript, mobile-first at a 430px viewport.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

With no environment variables set the app runs on an **in-memory store seeded
with the design's demo places**. That is fine for looking at it, but nothing
persists and nothing syncs between devices — the board shows a banner saying so.

```bash
npm run build      # production build
npm run lint
npm run typecheck
```

## What you need to set up

Copy `.env.example` to `.env.local` and fill in these three groups. Each one
degrades gracefully if left blank, so you can do them in any order.

### 1. Datastore — Upstash Redis (required for real use)

```
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

**Why this choice:** the accounts stay honor-system (no auth), but the board has
to sync across two phones. Upstash Redis speaks HTTP, so it works from Vercel's
serverless functions with no connection pooling, and its free tier is far above
what two people logging dinners will ever use. Add it from the Vercel
Marketplace (Storage → Upstash) and Vercel injects both variables for you.

The data is a few dozen small JSON documents — one per place, plus a set of ids
— so per-place writes never clobber each other when you both save at once.

*If you'd rather have realtime push than the app's focus/30s polling, Supabase
Postgres is the swap; it's a change to `src/lib/store.ts` only.*

### 2. Shared take — Anthropic API key

```
ANTHROPIC_API_KEY=
```

Server-side only — it is never sent to the browser. Uses **`claude-haiku-4-5`**,
the cheapest capable model; three bullets costs a fraction of a cent. Set a
spend cap in the Anthropic console as a backstop.

Without a key the app composes the same three bullets deterministically from the
scores and notes, so the feature is never blank.

### 3. Photos — Cloudinary

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=        # server-side only
```

The cloud name and API key are public by design (they appear in delivery and
upload requests); only the secret is server-side. Without these the "+" photo
tile reports that upload isn't set up yet and everything else still works.

## How the three stubbed pieces work

### Images

Uploads go **straight from the phone to Cloudinary** — the bytes never pass
through this server. `POST /api/cloudinary/sign` mints a short-lived signature,
the client compresses the image in a canvas (long edge 1600px, JPEG q0.82) and
posts it directly. Only the returned `secure_url` is stored.

Delivery uses a **fixed set of two transformations**, never per-viewport widths:

| Size    | Transformation                        | Used by                        |
| ------- | ------------------------------------- | ------------------------------ |
| `thumb` | `c_fill,g_auto,w_320,h_320,f_auto,q_auto` | history tiles, sheet grid  |
| `full`  | `c_limit,w_1080,f_auto,q_auto`            | lightbox                   |

Two URLs per photo means two derived images and a CDN cache that actually hits.
`f_auto`/`q_auto` still pick the best format and quality per browser.

See `src/lib/cloudinary.ts`.

### Shared take

Generated **server-side, in the background**, so it doesn't depend on the phone
staying open. Saving a visit returns immediately; the generation is handed to
`waitUntil()` and the place is marked pending, which is what drives the
"Rewriting the shared take…" state. By the next open it's ready.

The cache key is a hash of `id|by|date|score|note` across the place's visits —
**photos are deliberately excluded**, so a photo-only edit costs nothing, and a
mere reopen costs nothing. A score or note change, an added visit or a deleted
visit all change the hash and trigger exactly one regeneration.

Reads also self-heal: a both-logged place whose cached take is missing (it
predates the feature, or a background task was lost to a cold start) gets one
scheduled, with a 90-second window so a lost task is retried rather than leaving
the place pending forever.

See `src/lib/sharedTake.ts` and `src/lib/regenerate.ts`.

### Accounts

No authentication, by design. The app always opens on **Jenn**; the toggle in
the board and detail headers switches who a new visit is attributed to and which
visits show edit/delete. The server independently refuses a write whose claimed
author doesn't match the visit's author, so a stale tab can't rewrite the other
person's score.

## Layout

```
src/
  app/
    tokens.css              every design token; the tier system keyed on [data-tier]
    globals.css             reset, focus, animations
    layout.tsx              fonts, server-rendered initial board
    page.tsx                /            → board
    place/[id]/page.tsx     /place/:id   → detail
    api/                    places CRUD, Cloudinary signing
  components/               one component + one CSS module each
  lib/                      tiers, scores, formatting, store, shared take, Cloudinary
  state/BoardProvider.tsx   board data, active account, sheet, lightbox, toast
```

**Design tokens live in `src/app/tokens.css` and nowhere else.** Each tier
defines `--tier-band`, `--tier-ink`, `--tier-tint`, `--tier-tint-ink` and
`--tier-bar` under a `[data-tier="…"]` selector, so setting `data-tier` on an
element scopes the whole set to its subtree and a component can't pair one
tier's band with another's ink. `ink` is only ever used on the solid band and
`tintInk` only on the tint — that split is what keeps contrast passing.

Only display-size text sits on a solid band: the 40/42px tier letter, the 24px
bold card score, the 19px medallion score. Everything smaller (the 12px visit
chip, for instance) uses the light tint with `tintInk`.

## Deployment

Built for Vercel Hobby. Everything is a serverless function or static asset;
nothing assumes a paid tier, a cron, or an always-on process. Push the repo,
add the environment variables above, deploy.
