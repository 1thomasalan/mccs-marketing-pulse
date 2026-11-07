#!/usr/bin/env python3
"""MCCS Pulse - ScreenCloud proof-of-play publisher (slide plays per day).

Runs in GitHub Actions (.github/workflows/signage-plays.yml):
  mode=daily    (schedule ~01:20 JST): re-pull the last 3 complete JST days, then continue any unfinished backfill
  mode=backfill (manual / self-chained): pull missing days back to BACKFILL_FROM within a time budget
Source: getPlaybackLogs (Studio GraphQL). Each row = one "Start playback" event (timestamp ms, screenId,
contentId, contentType file|app, name, zoneid). No duration field. Max 5000 rows/call, newest first,
so a JST day is paged backwards by moving endTime below the oldest row returned (~65 calls/day).

Outputs (repo root):
  signage-plays.bin    encrypted for Pulse (same ECDH P-256 + AES-GCM scheme as signage.bin):
     {"v":1,"from","through","pulled","days":{"YYYY-MM-DD":{"t","ta","sc","s":{name:[plays,screens]},"g":{group:plays}}}}
     sg = {name: {group: plays}} per-slide location breakdown (file plays; added 2026-11-02)
     t = plays of file content (slides/videos/PDFs), ta = all plays incl. apps, sc = screens with file plays,
     s = file plays by content name (signage.json item names), g = file plays by screen group (signage.json group names)
  signage-plays.state  same days, AES-GCM with a key derived from SCREENCLOUD_API_KEY, so Actions can merge
                       (Pulse cannot read it; if the API key changes, the state resets and backfill restarts)
  signage-plays.json   plaintext status {v, file, from, through, pulled, checked, err, done} (signage.json is not touched)
PUBLIC LOGS: print counts and dates only, never content or screen names.
"""
import base64, datetime, hashlib, json, os, subprocess, sys, time, urllib.request

ROOT = os.environ.get('PULSE_ROOT', os.getcwd())
API = 'https://graphql.eu.screencloud.com/graphql'
JST = datetime.timezone(datetime.timedelta(hours=9))
BACKFILL_FROM = datetime.date(2026, 1, 1)
RECHECK_DAYS = 3
BUDGET_MIN = float(os.environ.get('PLAYS_BUDGET_MIN', '30'))
CHECKPOINT_MIN = float(os.environ.get('PLAYS_CHECKPOINT_MIN', '0'))  # >0: commit+push progress this often (Actions only)
T0 = time.time()

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import serialization

KEY = os.environ.get('SCREENCLOUD_API_KEY', '').strip()
PUB = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), base64.b64decode(json.load(open(os.path.join(ROOT, 'signage-key.json')))['pub']))
SKEY = hashlib.sha256(b'pulse-plays-state:' + KEY.encode()).digest()


def seal(data):
    eph = ec.generate_private_key(ec.SECP256R1()); iv = os.urandom(12)
    epub = eph.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return epub + iv + AESGCM(eph.exchange(ec.ECDH(), PUB)).encrypt(iv, data, None)


def state_load():
    p = os.path.join(ROOT, 'signage-plays.state')
    if not os.path.exists(p):
        return {}
    b = open(p, 'rb').read()
    try:
        return json.loads(AESGCM(SKEY).decrypt(b[:12], b[12:], None))
    except Exception:
        print('::warning::plays state unreadable (key changed?) - starting fresh')
        return {}


def state_save(days):
    iv = os.urandom(12)
    open(os.path.join(ROOT, 'signage-plays.state'), 'wb').write(iv + AESGCM(SKEY).encrypt(iv, json.dumps(days, separators=(',', ':')).encode(), None))


def gql(q, tries=4):
    for i in range(tries):
        try:
            r = urllib.request.Request(API, data=json.dumps({'query': q}).encode(),
                                       headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY})
            o = json.load(urllib.request.urlopen(r, timeout=180))
            if o.get('errors'):
                raise RuntimeError('graphql error')
            return o['data']
        except Exception as e:
            if i == tries - 1:
                raise RuntimeError('ScreenCloud request failed: %s' % type(e).__name__)
            time.sleep(10 * (i + 1))


def page(start_ms, end_ms):
    d = gql('{ getPlaybackLogs(input:{limit:5000, startTime:"%d", endTime:"%d"}){ status data } }' % (start_ms * 10**6, end_ms * 10**6))
    x = d['getPlaybackLogs']['data']
    if isinstance(x, str):
        x = json.loads(x)
    if isinstance(x, dict):
        x = next((v for v in x.values() if isinstance(v, list)), [])
    return x


def pull_day(day, screen_group):
    s0 = int(datetime.datetime(day.year, day.month, day.day, tzinfo=JST).timestamp() * 1000)
    e0 = s0 + 86400000
    end, seen, calls = e0, set(), 0
    t = ta = 0
    scr, s, g, sgl = set(), {}, {}, {}
    while True:
        rows = page(s0, end); calls += 1
        for r in rows:
            ts = r.get('timestamp')
            if not isinstance(ts, int) or not (s0 <= ts < e0):
                continue
            k = (ts, r.get('screenId'), r.get('contentId'), r.get('zoneid'))
            if k in seen:
                continue
            seen.add(k)
            ta += 1
            if r.get('contentType') != 'file':
                continue
            t += 1
            sid = r.get('screenId'); nm = r.get('name') or '?'
            scr.add(sid)
            e = s.setdefault(nm, [0, set()]); e[0] += 1; e[1].add(sid)
            gn = screen_group.get(sid, 'Other')
            g[gn] = g.get(gn, 0) + 1
            m = sgl.setdefault(nm, {}); m[gn] = m.get(gn, 0) + 1
        if len(rows) < 5000 or calls > 400:
            break
        end = min(r['timestamp'] for r in rows if isinstance(r.get('timestamp'), int)) - 1
        if end <= s0:
            break
    out = {'t': t, 'ta': ta, 'sc': len(scr), 's': {k: [v[0], len(v[1])] for k, v in s.items()}, 'g': g, 'sg': sgl}
    print('day %s: %d file plays, %d all, %d screens, %d calls' % (day, t, ta, len(scr), calls), flush=True)
    return out


def write_out(days, pl, err, remaining):
    """Write state + encrypted bin + status file. Called after every day so a lost runner loses at most one day."""
    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    if days:
        state_save(days)
        keys = sorted(days)
        body = {'v': 1, 'from': keys[0], 'through': keys[-1], 'pulled': now, 'days': {k: days[k] for k in keys}}
        open(os.path.join(ROOT, 'signage-plays.bin'), 'wb').write(seal(json.dumps(body, separators=(',', ':')).encode()))
        pl.update({'v': 1, 'file': 'signage-plays.bin', 'from': keys[0], 'through': keys[-1], 'pulled': now})
    pl['checked'] = now
    pl['err'] = err
    pl['done'] = not remaining
    json.dump(pl, open(os.path.join(ROOT, 'signage-plays.json'), 'w'))


def checkpoint_push():
    """Commit and push progress mid-run (only when PLAYS_CHECKPOINT_MIN > 0, i.e. in Actions)."""
    def run(*a):
        return subprocess.run(list(a), cwd=ROOT, capture_output=True, text=True).returncode
    run('git', 'add', '-A', 'signage-plays.json', 'signage-plays.bin', 'signage-plays.state')
    if run('git', 'diff', '--cached', '--quiet') == 0:
        return
    run('git', '-c', 'user.name=Pulse Signage Bot', '-c', 'user.email=actions@users.noreply.github.com',
        'commit', '-qm', 'Signage plays checkpoint')
    # This job owns the signage-plays.* files, so instead of rebasing (which can stop half-way and
    # block every later git step), put our files on top of the newest main and push.
    import shutil, tempfile
    names = ['signage-plays.json', 'signage-plays.bin', 'signage-plays.state']
    tmp = tempfile.mkdtemp()
    for n in names:
        if os.path.exists(os.path.join(ROOT, n)):
            shutil.copy2(os.path.join(ROOT, n), tmp)
    for _ in range(4):
        run('git', 'rebase', '--abort')
        if run('git', 'fetch', '-q', 'origin', 'main') == 0 and run('git', 'reset', '-q', '--hard', 'origin/main') == 0:
            for n in names:
                if os.path.exists(os.path.join(tmp, n)):
                    shutil.copy2(os.path.join(tmp, n), ROOT)
            run('git', 'add', '-A', *names)
            if run('git', 'diff', '--cached', '--quiet') == 0:
                print('checkpoint: nothing new'); return
            run('git', '-c', 'user.name=Pulse Signage Bot', '-c', 'user.email=actions@users.noreply.github.com',
                'commit', '-qm', 'Signage plays checkpoint')
            if run('git', 'push', '-q', 'origin', 'HEAD:main') == 0:
                print('checkpoint pushed'); return
        time.sleep(5)
    print('::warning::checkpoint push failed (will retry at next checkpoint)')


def main():
    mode = (sys.argv[1] if len(sys.argv) > 1 else '') or 'daily'
    if not KEY:
        print('::notice::SCREENCLOUD_API_KEY not set; skipping'); return
    mf = os.path.join(ROOT, 'signage-plays.json')
    pl = json.load(open(mf)) if os.path.exists(mf) else {}
    days = state_load()
    today = datetime.datetime.now(JST).date()
    yday = today - datetime.timedelta(days=1)
    todo = []
    if mode in ('daily', 'recheck'):
        todo += [yday - datetime.timedelta(days=i) for i in range(RECHECK_DAYS)]
    missing = []
    d = yday
    while d >= BACKFILL_FROM:
        if (d.isoformat() not in days or 'sg' not in days[d.isoformat()]) and d not in todo:
            missing.append(d)
        d -= datetime.timedelta(days=1)
    todo += missing  # newest first, so history grows backwards
    err = None
    done_n = 0
    try:
        g = gql('{ allScreenGroups(first:100){ nodes{ name screensByScreenGroupId(first:200){ nodes{ id } } } } }')
        sg = {sc['id']: n['name'] for n in g['allScreenGroups']['nodes'] for sc in n['screensByScreenGroupId']['nodes']}
        last_cp = time.time()
        for d in todo:
            if (time.time() - T0) / 60 > BUDGET_MIN:
                break
            t1 = time.time()
            days[d.isoformat()] = pull_day(d, sg); done_n += 1
            print('  (%.1f min, %.1f min elapsed)' % ((time.time() - t1) / 60, (time.time() - T0) / 60), flush=True)
            write_out(days, pl, None, [x for x in todo[done_n:]])
            if CHECKPOINT_MIN > 0 and (time.time() - last_cp) / 60 >= CHECKPOINT_MIN:
                checkpoint_push(); last_cp = time.time()
    except Exception as e:
        err = str(e)[:160]
        print('::warning::plays pull failed:', err)
    remaining = [d for d in todo[done_n:] if d.isoformat() not in days or 'sg' not in days[d.isoformat()]]
    if done_n and not (err and mode in ('daily', 'recheck') and done_n < RECHECK_DAYS):
        write_out(days, pl, err, remaining)
    else:
        pl['checked'] = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
        pl['err'] = err; pl['done'] = not remaining
        json.dump(pl, open(mf, 'w'))
    print('plays: %d days pulled this run, %d stored (%s..%s), %d remaining, err=%s' % (
        done_n, len(days), min(days) if days else '-', max(days) if days else '-', len(remaining), bool(err)))
    with open(os.environ.get('GITHUB_OUTPUT', os.devnull), 'a') as f:
        f.write('more=%s\n' % ('true' if remaining and not err else 'false'))


if __name__ == '__main__':
    main()
