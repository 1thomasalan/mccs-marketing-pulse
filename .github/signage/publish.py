#!/usr/bin/env python3
"""MCCS Pulse - ScreenCloud signage publisher.

Runs in GitHub Actions (.github/workflows/signage.yml) every ~15 minutes.
Reads ScreenCloud (key in the SCREENCLOUD_API_KEY repo secret), writes to the repo root:
  signage.json      plaintext meta: {v, checked, updated, h, file}
  signage.bin       encrypted status JSON (screens, offline, playlists, content list)
  sg/<name>.bin     encrypted thumbnail per content file (made once, reused)
  sg/ocr.state      encrypted OCR cache {thumb id: text}; key derived from the ScreenCloud secret
                    (Actions-only; Pulse reads the text from items[].ocr in signage.bin)
Encryption: ECDH P-256 to the public key in signage-key.json (the private key sits in that
file encrypted with the Pulse passcode, so only unlocked Pulse devices can read the data).
Blob = ephemeral public key (65 bytes) | IV (12) | AES-256-GCM ciphertext; AES key = ECDH shared x.
No secrets other than the ScreenCloud key are needed here.
"""
import base64, datetime, hashlib, json, os, re, subprocess, sys, tempfile, urllib.request

ROOT = os.environ.get('PULSE_ROOT', os.getcwd())
API = 'https://graphql.eu.screencloud.com/graphql'
PLAYLISTS = ['MCCS Program Ads', 'Sponsorship Ads', 'Green Side']
HEARTBEAT_MIN = 60  # rewrite at least this often even when nothing changed

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import serialization

KEYF = json.load(open(os.path.join(ROOT, 'signage-key.json')))
PUB = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), base64.b64decode(KEYF['pub']))


def seal(data: bytes) -> bytes:
    eph = ec.generate_private_key(ec.SECP256R1())
    shared = eph.exchange(ec.ECDH(), PUB)
    iv = os.urandom(12)
    epub = eph.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return epub + iv + AESGCM(shared).encrypt(iv, data, None)


def gql(query):
    key = os.environ.get('SCREENCLOUD_API_KEY', '').strip()
    h = {'Content-Type': 'application/json'}
    if key:
        h['Authorization'] = 'Bearer ' + key
    r = urllib.request.Request(API, data=json.dumps({'query': query}).encode(), headers=h)
    out = json.load(urllib.request.urlopen(r, timeout=60))
    if out.get('errors'):
        raise SystemExit('ScreenCloud error: ' + json.dumps(out['errors'])[:300])
    return out['data']


def thumb_name(fid):
    return hashlib.sha256(('pulse-sg:' + fid).encode()).hexdigest()[:24]


def make_thumb(f, out):
    with tempfile.TemporaryDirectory() as d:
        jpg = os.path.join(d, 't.jpg')
        mt = f.get('mimetype') or ''
        if 'pdf' in mt:
            src = os.path.join(d, 'x.pdf')
            urllib.request.urlretrieve(f['source'], src)
            subprocess.run(['pdftoppm', '-jpeg', '-f', '1', '-l', '1', '-scale-to-x', '480', '-scale-to-y', '-1', src, os.path.join(d, 'p')], check=True, capture_output=True)
            pages = [p for p in os.listdir(d) if p.startswith('p') and p.endswith('.jpg')]
            os.rename(os.path.join(d, pages[0]), jpg)
        else:
            cmd = ['ffmpeg', '-v', 'error', '-y']
            if 'video' in mt:
                cmd += ['-ss', '2']
            cmd += ['-i', f['source'], '-frames:v', '1', '-vf', 'scale=480:-2', '-q:v', '4', jpg]
            r = subprocess.run(cmd, capture_output=True, timeout=120)
            if r.returncode and 'video' in mt:  # very short clip: take the first frame
                cmd = ['ffmpeg', '-v', 'error', '-y', '-i', f['source'], '-frames:v', '1', '-vf', 'scale=480:-2', '-q:v', '4', jpg]
                r = subprocess.run(cmd, capture_output=True, timeout=120)
            if r.returncode:
                raise RuntimeError(r.stderr.decode()[:200])
        open(out, 'wb').write(seal(open(jpg, 'rb').read()))


OCR_MAX = 400


def ocr_key():
    return hashlib.sha256(('pulse-ocr-cache:' + os.environ.get('SCREENCLOUD_API_KEY', '').strip()).encode()).digest()


def ocr_load(path):
    try:
        b = open(path, 'rb').read()
        return json.loads(AESGCM(ocr_key()).decrypt(b[:12], b[12:], None))
    except Exception:
        return {}


def ocr_save(path, cache):
    iv = os.urandom(12)
    open(path, 'wb').write(iv + AESGCM(ocr_key()).encrypt(iv, json.dumps(cache, sort_keys=True).encode(), None))


def ocr_norm(txt):
    seen, out = set(), []
    for w in re.split(r'\s+', txt.lower()):
        w = re.sub(r"^[^a-z0-9$]+|[^a-z0-9%+]+$", '', w)
        if len(re.sub(r'[^a-z0-9]', '', w)) < 2 and not w.isdigit():
            continue
        if sum(c.isalnum() for c in w) < len(w) * 0.6:
            continue  # mostly symbols: OCR noise from artwork
        if w in seen:
            continue  # two OCR passes: keep each word once
        seen.add(w)
        out.append(w)
    s = ' '.join(out)
    return s[:OCR_MAX].rsplit(' ', 1)[0] if len(s) > OCR_MAX else s


def ocr_frames(f, d):
    """Large stills for OCR (not the 480px thumbnail): image as is, PDF page 1, video at 2s and 6s."""
    mt = f.get('mimetype') or ''
    if 'pdf' in mt:
        src = os.path.join(d, 'o.pdf')
        urllib.request.urlretrieve(f['source'], src)
        subprocess.run(['pdftoppm', '-png', '-f', '1', '-l', '1', '-scale-to', '2000', src, os.path.join(d, 'op')], check=True, capture_output=True)
        return [os.path.join(d, x) for x in os.listdir(d) if x.startswith('op') and x.endswith('.png')]
    outs = []
    for i, ss in enumerate(['2', '6'] if 'video' in mt else [None]):
        o = os.path.join(d, 'of%d.png' % i)
        cmd = ['ffmpeg', '-v', 'error', '-y'] + (['-ss', ss] if ss else []) + ['-i', f['source'], '-frames:v', '1',
               '-vf', "scale='max(iw,2000)':-2,format=gray", o]
        if subprocess.run(cmd, capture_output=True, timeout=120).returncode == 0 and os.path.exists(o):
            outs.append(o)
    if not outs and 'video' in mt:  # very short clip
        o = os.path.join(d, 'of0.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f['source'], '-frames:v', '1', '-vf', "scale='max(iw,2000)':-2,format=gray", o], capture_output=True, timeout=120)
        outs = [o] if os.path.exists(o) else []
    return outs


def read_text(f):
    with tempfile.TemporaryDirectory() as d:
        frames = ocr_frames(f, d)
        if not frames:
            raise RuntimeError('no frame')
        txt = []
        for fr in frames:
            for psm in ('11', '3'):
                r = subprocess.run(['tesseract', fr, '-', '-l', 'eng', '--psm', psm], capture_output=True, timeout=120)
                txt.append(r.stdout.decode('utf-8', 'ignore'))
        return ocr_norm(' '.join(txt))


def main():
    if not os.environ.get('SCREENCLOUD_API_KEY') and not os.environ.get('SG_LOCAL'):
        print('::notice::SCREENCLOUD_API_KEY secret not set yet; skipping.')
        return
    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    g = gql('{ allScreenGroups(first:100){ nodes{ name screensByScreenGroupId(first:200){ nodes{ id name isConnected disconnectedAt } } } } }')
    names = json.dumps(PLAYLISTS)
    p = gql('{ allPlaylists(filter:{name:{in:%s}}){ nodes{ id name filesByPlaylistId(first:200){ nodes{ id name mimetype source } } } } }' % names)

    groups = []
    for n in g['allScreenGroups']['nodes']:
        s = n['screensByScreenGroupId']['nodes']
        if not s:
            continue
        off = [{'name': x['name'], 'since': x['disconnectedAt']} for x in s if not x['isConnected']]
        off.sort(key=lambda x: x['since'] or '', reverse=True)
        groups.append({'name': n['name'], 'total': len(s), 'off': off})
    groups.sort(key=lambda x: (-len(x['off']), x['name']))
    total = sum(x['total'] for x in groups)
    offn = sum(len(x['off']) for x in groups)

    files, counts = {}, {}
    for pl in p['allPlaylists']['nodes']:
        for f in pl['filesByPlaylistId']['nodes']:
            if f['id'] not in files:
                files[f['id']] = dict(f, playlist=pl['name'])
    for f in files.values():
        counts[f['playlist']] = counts.get(f['playlist'], 0) + 1

    os.makedirs(os.path.join(ROOT, 'sg'), exist_ok=True)
    items, keep = [], set()
    ocr_path = os.path.join(ROOT, 'sg', 'ocr.state')
    ocr = ocr_load(ocr_path)
    ocr_n0 = len(ocr)
    thumb_new = thumb_fail = ocr_new = ocr_fail = 0
    order = {k: i for i, k in enumerate(PLAYLISTS)}
    for f in sorted(files.values(), key=lambda f: (order.get(f['playlist'], 9), f['name'].lower())):
        nm = thumb_name(f['id'])
        path = os.path.join(ROOT, 'sg', nm + '.bin')
        ok = os.path.exists(path)
        if not ok and f.get('source'):
            try:
                make_thumb(f, path)
                ok = True
                thumb_new += 1
            except Exception:
                thumb_fail += 1
        if nm not in ocr:
            ocr_new += 1
            try:
                ocr[nm] = read_text(f) if f.get('source') else ''
            except Exception:
                ocr_fail += 1
        keep.add(nm + '.bin')
        mt = f.get('mimetype') or ''
        items.append({'t': nm if ok else None, 'name': f['name'], 'playlist': f['playlist'],
                      'kind': 'video' if 'video' in mt else 'pdf' if 'pdf' in mt else 'image',
                      'ocr': ocr.get(nm, '')})
    if len(ocr) != ocr_n0:
        ocr_save(ocr_path, ocr)  # retired slides stay cached so a returning slide is not re-read
    # public log: counts only, never slide names or text
    print('thumbs: %d new, %d failed; ocr: %d slides, %d read now, %d cached, %d failed' % (
        thumb_new, thumb_fail, len(items), ocr_new - ocr_fail, len(items) - ocr_new, ocr_fail))
    for old in os.listdir(os.path.join(ROOT, 'sg')):
        if old.endswith('.bin') and old not in keep:
            os.remove(os.path.join(ROOT, 'sg', old))

    data = {'total': total, 'live': total - offn, 'offline': offn, 'groups': groups,
            'playlists': [{'name': k, 'count': counts.get(k, 0)} for k in PLAYLISTS], 'items': items}
    h = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()[:16]

    mf = os.path.join(ROOT, 'signage.json')
    old = json.load(open(mf)) if os.path.exists(mf) else {}
    checked = now.isoformat().replace('+00:00', 'Z')
    if old.get('h') == h and old.get('checked'):
        age = (now - datetime.datetime.fromisoformat(old['checked'].replace('Z', '+00:00'))).total_seconds() / 60
        if age < HEARTBEAT_MIN:
            print('no change (%d live / %d), last write %d min ago' % (total - offn, total, age))
            return
    data['checked'] = checked
    open(os.path.join(ROOT, 'signage.bin'), 'wb').write(seal(json.dumps(data, separators=(',', ':')).encode()))
    json.dump({'v': 1, 'checked': checked, 'updated': old.get('updated') if old.get('h') == h else checked,
               'h': h, 'file': 'signage.bin', 'thumbs': 'sg/'}, open(mf, 'w'))
    print('wrote signage: %d live / %d, %d items' % (total - offn, total, len(items)))


if __name__ == '__main__':
    main()
