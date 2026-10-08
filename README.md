# Stylzo

Server-rendered text-styling site. Node.js + Express + EJS + vanilla JS with bundled micro-libraries
(GSAP, React Three Fiber, Firebase). Deploys to Vercel.

Type text once, get 5,600+ Unicode styles you can paste anywhere — plus symbol, emoji and kaomoji
libraries, browser-based text tools, a font studio for shareable images, and a small community feed.

## Run it

```bash
npm install
cp .env.example .env     # optional, every feature degrades gracefully without it
npm run dev              # http://localhost:3000
npm test                 # 59 tests
```

Node 20+ required.

## Useful scripts

| Script | What it does |
| --- | --- |
| `npm run build` | All of the below, in order |
| `npm run build:styles` | Regenerates `data/fonts.json` (5,600+ styles) from the composition rules in `scripts/build-fonts.js` |
| `npm run sync:engine` | Copies `services/unicode/*` to `public/js/engine/` so the browser runs the exact same engine |
| `npm run build:js` | Bundles gsap/three/firebase entry points to `public/js/dist` with esbuild (minified when `NODE_ENV=production`) |

Run `npm test` after changing a mapping or a style rule — it fails when the browser copy of the
engine or the precomputed examples in the data go stale.

## How it fits together

- `services/unicode/` is the pure engine. `transform(text, pipeline)` runs ordered stages: case, map, combine, frame, flair, zalgo, fn. No I/O, so Node and the browser share it.
- `data/fonts.json` holds style records with resolved `pipeline`s — adding a style is data only.
- `services/catalog.js` is the data-access layer (catalog, categories, M3 libraries, community seed).
- Pages are fully rendered by EJS. `public/js/generator.js` adds live typing, style search and lazy pagination; `/js/dist/*` carries gsap, the three.js hero and Firebase auth.
- Feature flags are env-driven: without `AI_API_KEY` the AI stylist uses its rules engine, without `ADMIN_KEY` the dashboard stays closed.
- The 100 curated styles are indexable and in the sitemap. Composed combinations stay `noindex` and canonicalise to their parent.

## Routes

`/`, `/fancy-text-generator` (`?category=`, `?text=`), `/fonts`, `/fonts/:slug`, `/symbols`, `/emoji`, `/kaomoji`, `/tools`, `/studio`, `/community`, `/s/:id`, `/admin`, `/about`, `/privacy`, `/terms`, `/contact`, `/robots.txt`, `/sitemap.xml`, plus `GET /api/styles`, `/api/search`, `/api/ai/suggest`, `/api/health`, `/api/config`, `GET|POST /api/community`, `/api/community/:id/like`, `/api/beat`, `POST /api/generate`.

## Deploying to Vercel

`api/index.js` exports the Express app and `vercel.json` rewrites all paths to it. Set `SITE_URL` to your domain. The in-memory rate limiter and analytics counters are per instance; swap in a shared store before scaling beyond one instance.

## Privacy

No cookies, no analytics SDK. The beacon sends only a
path and an event name. Typed text never leaves the browser.
