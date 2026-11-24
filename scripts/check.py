#!/usr/bin/env python3
"""Pulse safety checks. Runs in CI on every pull request and locally before pushing."""
import json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
fail = []

# 1. Every app JavaScript file parses.
for f in sorted(ROOT.glob("*.js")):
    r = subprocess.run(["node", "--check", str(f)], capture_output=True, text=True)
    if r.returncode:
        fail.append(f"JS syntax error in {f.name}: {r.stderr.strip().splitlines()[0] if r.stderr else ''}")

# 2. JSON files parse.
for f in [ROOT / "manifest.webmanifest", *ROOT.glob("*.json")]:
    try:
        json.loads(f.read_text())
    except Exception as e:
        fail.append(f"Bad JSON in {f.name}: {e}")

# 3. No plain data exports anywhere in the repo.
for f in ROOT.rglob("*"):
    if ".git" in f.parts or not f.is_file():
        continue
    if f.suffix.lower() in {".csv", ".xlsx", ".xls", ".tsv"}:
        fail.append(f"Unencrypted data file not allowed: {f.relative_to(ROOT)}")

# 4. No obvious secrets in app code.
pat = re.compile(r"(api[_-]?key|secret|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{20,}['\"]", re.I)
for f in ROOT.glob("*.js"):
    if pat.search(f.read_text(errors="ignore")):
        fail.append(f"Possible secret in {f.name}")

# 5. Service worker carries a version line.
if not re.search(r"v\d+", (ROOT / "sw.js").read_text()):
    fail.append("sw.js has no version marker")

if fail:
    print("Checks failed:")
    for x in fail:
        print(" -", x)
    sys.exit(1)
print("All Pulse checks passed.")
