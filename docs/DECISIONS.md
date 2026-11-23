# Decisions

Newest first. One entry per real decision: what, why, and what we gave up.

## 2026-11-24 Test vs Live guardrails (Wave 1 pilot)
- What: Issues + pull requests for all code changes, an automated `Checks` workflow, protected `main`, and a preview link per PR (planned on Cloudflare Pages).
- Why: keep the live app safe while several AI agents work on it, and let another person carry Pulse on.
- Exception: data publishes (Signage bots, weekly Hark publish) keep writing data files straight to `main`, so `main` protection must let them through.
- Plan doc: "Test vs Live Rollout Plan" Google Doc, Drive Agent Hub > Builds & Ideas.

## 2026-10-24 Encrypted data on a public repo
- What: all metrics are encrypted with a passcode before publishing; the app decrypts on the device.
- Why: the repo and GitHub Pages site are public.
