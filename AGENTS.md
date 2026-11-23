# Rules for AI agents working on Pulse

Read this before changing anything. Applies to Hark, Codex, Claude Code and any other agent or person.

## Never
- Never commit unencrypted MCCS data (CSV, XLSX, JSON exports, screenshots of dashboards). Only encrypted `*.bin` / `*.enc.json`.
- Never commit secrets, API keys, or the Pulse passcode. Secrets live in GitHub Actions secrets.
- Never show or store staff names. Programs, branches and facilities only.
- Never push code straight to `main`. Open a pull request.
- Never edit the bot-owned data files by hand (see below).

## Always
- Start from an Issue; link it in the PR ("Closes #N").
- Bump the version in `sw.js` and add a `CHANGELOG.md` entry for any user-facing change.
- Keep `Checks` green. Run `python3 scripts/check.py` before pushing.
- Record any real decision (a tradeoff, a new data source, a hosting change) in `docs/DECISIONS.md`.
- Work-facing changes that put MCCS data somewhere new need MCCS IT/HQ approval first.

## Bot-owned files (written straight to main, not via PR)
| Files | Writer |
|---|---|
| `signage.json`, `signage.bin`, `sg/` | `signage.yml` (every 15 min) |
| `signage-plays.json`, `signage-plays.bin`, `signage-plays.state` | `signage-plays.yml` (daily 01:20 JST) |
| `data.*.bin`, `web.*.bin`, `email.*.bin`, `events.*.bin`, `pptx.*.txt`, `data.enc.json` | Hark weekly data publish (Mondays) |

## App shape
- Plain JS PWA, no build step. `index.html` loads `loader.js` then the page modules (`app.js`, `core.js`, `hub.js`, ...).
- `sw.js` is the service worker; it serves app files stale-while-revalidate.
- `ai/` holds the on-device search model (~33 MB); cached on first use, not precached.
