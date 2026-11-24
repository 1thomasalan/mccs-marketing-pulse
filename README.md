# MCCS Marketing Pulse

MCCS Okinawa social, web, email, events and signage metrics viewer (PWA). Owner: Thomas Alan (1thomasalan).

- Live: https://1thomasalan.github.io/mccs-marketing-pulse/
- Data files (`*.bin`, `*.enc.json`, `sg/`) are encrypted. The passcode is never stored in this repo.
- Version history: `CHANGELOG.md` (every version is a git tag).

## How work flows here
1. Every code change starts as a GitHub Issue.
2. The change is made on a branch and opened as a pull request. Nothing reaches `main` without one.
3. The `Checks` workflow must pass and Alan approves the PR.
4. Merging to `main` publishes the live site.

Data publishing is the exception: the Signage bots and the weekly data publish write only data files straight to `main`. See `AGENTS.md`.

## Where things live
| What | Where |
|---|---|
| App code | repo root (`index.html`, `*.js`, `sw.js`) |
| Encrypted data | repo root `*.bin`, `data.enc.json`, `sg/` |
| Signage sync jobs | `.github/workflows/`, `.github/signage/` |
| Design mockups | `mockup/` |
| Decisions | `docs/DECISIONS.md` |
| Rules for AI agents | `AGENTS.md` |
| Test vs Live plan | Google Doc "Test vs Live Rollout Plan" (Drive: Agent Hub > Builds & Ideas) |
