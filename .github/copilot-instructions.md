# Tennis Scorecard: instructions for Copilot

A tennis scoring web app. Installable (PWA), works offline, **no sign-in, no backend**. All user data stays on the device.

## Stack
React 19, TypeScript, Vite 7, Tailwind 4, Radix UI (shadcn-style components in `src/components/ui`), Zustand, TanStack Query, Recharts, React Router (HashRouter so any static host works).

## Commands
- `npm install`
- `npm run dev` runs locally.
- `npm run typecheck` must pass before every commit.
- `npm run build` writes `dist/` and generates `dist/sw.js` (offline cache) via the `offlineWorker` plugin in `vite.config.ts`.
- `npm run single` builds one self-contained `tennis-scorecard.html` (needs Python 3). It must stay working: it is used for opening from a local file.

## Layout
- `src/lib/tennis.ts`: scoring engine and types (Match, events, formats, replay). Keep it pure and test any change by replaying events.
- `src/lib/match-store.ts`: Zustand store. Persists to `localStorage` key `tennis-scorecard-v1` (matches, coach entries, settings, `lastSetup`, recent names). Also `exportBackup` / `importBackup`.
- `src/lib/weather.ts`: Open-Meteo (free, no key). Geocoding then current conditions.
- `src/components/`: `match-setup`, `scoreboard`, `court`, `match-stats`, `court-map` (own SVG map, no tiles), `settings-sheet`, `match-weather`.
- `src/pages/`: `home` (Score), `history`, `coach`, `guide`.
- `public/`: manifest, icons. `public-sw.js` is the service-worker template.

## Rules
- Keep data local-first. Never add analytics, tracking or a required account.
- Never commit secrets, tokens or personal data. If GitHub sync is added, the token must be entered by the user at runtime and kept only in their browser, with a fine-grained token limited to one private data repository.
- Keep `base: "./"` and HashRouter, so the app works under a GitHub Pages sub-path and from a file.
- Do not break old saved data: changes to the stored shape must still load data saved by earlier versions (see `sanitize` and `isLastSetup` in `match-store.ts`).
- Small, focused changes. Run `npm run typecheck` and `npm run build` and say what you could not test.

## Known limits
- Weather needs a connection. Geolocation and the Share button may be refused when opened from a local file.
- Data is per browser and per device. Users move it with Settings, Save backup / Import backup.
- The service worker only runs on https or localhost, not from `file://`.

## Backlog (not built)
1. Export matches to CSV and Excel (one row per match; Coach entries on a second sheet).
2. Optional "Sync with GitHub": read and write one JSON file in a private repository with the GitHub contents API. Save locally first, sync when online, resolve conflicts by match id and `updatedAt`.
3. Custom rulebook: let the user add their own rules document to the Guide.
4. Automatic save to a chosen file on desktop Chrome and Edge (File System Access API), with a manual export elsewhere.
5. Automated tests for the scoring engine.
