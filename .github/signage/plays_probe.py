#!/usr/bin/env python3
"""Probe 2: paging, volume, retention, id matching. PUBLIC LOGS: counts/dates only."""
import collections, datetime, json, os, sys, time, urllib.request

API = 'https://graphql.eu.screencloud.com/graphql'
JST = datetime.timezone(datetime.timedelta(hours=9))


def gql(q):
    h = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + os.environ['SCREENCLOUD_API_KEY'].strip()}
    r = urllib.request.Request(API, data=json.dumps({'query': q}).encode(), headers=h)
    try:
        o = json.load(urllib.request.urlopen(r, timeout=180))
    except urllib.error.HTTPError as e:
        return None, 'HTTP %s %s' % (e.code, e.read().decode()[:150].replace('"', "'"))
    if o.get('errors'):
        return None, str([x.get('message', '')[:120] for x in o['errors']])
    return o['data'], None


def logs(start_ms, end_ms, limit=5000, extra=''):
    q = '{ getPlaybackLogs(input:{limit:%d, startTime:"%d", endTime:"%d"%s}){ status data } }' % (limit, start_ms * 1000000, end_ms * 1000000, extra)
    t = time.time(); d, e = gql(q); dt = time.time() - t
    if e: return None, e, dt
    x = d['getPlaybackLogs']['data']
    if isinstance(x, str): x = json.loads(x)
    if isinstance(x, dict): x = next((v for v in x.values() if isinstance(v, list)), [])
    return x, None, dt


iso = lambda ms: datetime.datetime.fromtimestamp(ms / 1000, JST).strftime('%Y-%m-%d %H:%M JST')
ms = lambda d: int(d.timestamp() * 1000)

# direction variants
now = datetime.datetime.now(datetime.timezone.utc)
a = ms(now - datetime.timedelta(hours=6)); b = ms(now - datetime.timedelta(hours=5))
for ex in ['', ', direction:"forward"', ', direction:"FORWARD"', ', direction:forward']:
    r, e, dt = logs(a, b, 20, ex)
    print('DIR', repr(ex), e or ('rows %d first %s last %s inwin %s %.1fs' % (len(r), iso(r[0]['timestamp']), iso(r[-1]['timestamp']), all(a <= x['timestamp'] <= b for x in r), dt) if r else 'rows 0'))

# retention: 1-day windows
for day in ['2025-06-01', '2026-01-05', '2026-03-02', '2026-05-04', '2026-07-06', '2026-08-03', '2026-09-07', '2026-10-05', '2026-10-19', '2026-10-26']:
    d = datetime.datetime.fromisoformat(day + 'T03:00:00+00:00')
    r, e, dt = logs(ms(d), ms(d + datetime.timedelta(hours=1)), 50)
    print('RET', day, e or ('rows %d inwin %s' % (len(r), all(ms(d) <= x['timestamp'] <= ms(d) + 3600000 for x in r)) if r is not None else 'none'))

# one full JST day volume by paging backwards (endTime = oldest - 1)
day = (now.astimezone(JST) - datetime.timedelta(days=2)).replace(hour=0, minute=0, second=0, microsecond=0)
s0, e0 = ms(day), ms(day + datetime.timedelta(days=1))
end, rows, calls, tsum = e0, [], 0, 0
while calls < 80:
    r, e, dt = logs(s0, end); calls += 1; tsum += dt
    if e: print('PAGE ERR', e); break
    rows += r
    if len(r) < 5000: break
    end = min(x['timestamp'] for x in r) - 1
print('DAY', day.date(), 'rows', len(rows), 'calls', calls, 'secs %.0f' % tsum)
ids = collections.Counter(x.get('contentId') for x in rows)
dupes = len(rows) - len({(x['timestamp'], x.get('screenId'), x.get('contentId'), x.get('zoneid')) for x in rows})
print('DAY distinct screens', len({x.get('screenId') for x in rows}), 'content', len(ids), 'dupe rows', dupes)
print('DAY contentType', collections.Counter(x.get('contentType') for x in rows).most_common())
print('DAY zones per screen max', max(collections.Counter((x.get('screenId'), x.get('zoneid')) for x in rows).values() or [0]))
hrs = collections.Counter(datetime.datetime.fromtimestamp(x['timestamp'] / 1000, JST).hour for x in rows)
print('DAY by JST hour', sorted(hrs.items()))
# per screen per hour max start count (sanity: plays per hour)
psh = collections.Counter((x.get('screenId'), datetime.datetime.fromtimestamp(x['timestamp'] / 1000, JST).hour) for x in rows)
print('DAY max plays per screen-hour', max(psh.values() or [0]), 'median', sorted(psh.values())[len(psh) // 2] if psh else 0)
# gap between consecutive starts on same screen (seconds)
by = collections.defaultdict(list)
for x in rows: by[x.get('screenId')].append(x['timestamp'])
gaps = []
for v in by.values():
    v.sort(); gaps += [(v[i + 1] - v[i]) / 1000 for i in range(len(v) - 1)]
gaps.sort()
if gaps: print('DAY gap secs p10 %.1f p50 %.1f p90 %.1f zero-gaps %d' % (gaps[len(gaps) // 10], gaps[len(gaps) // 2], gaps[len(gaps) * 9 // 10], sum(1 for g in gaps if g < 1)))

# match to playlist files + screen groups
pl, e = gql('{ allPlaylists(filter:{name:{in:["MCCS Program Ads","Sponsorship Ads","Green Side"]}}){ nodes{ id name filesByPlaylistId(first:200){ nodes{ id name } } } } }')
fids = {f['id'] for p in pl['allPlaylists']['nodes'] for f in p['filesByPlaylistId']['nodes']}
fnames = {f['name'] for p in pl['allPlaylists']['nodes'] for f in p['filesByPlaylistId']['nodes']}
pids = {p['id'] for p in pl['allPlaylists']['nodes']}
print('MATCH file rows by contentId', sum(c for i, c in ids.items() if i in fids), 'by name', sum(1 for x in rows if x.get('name') in fnames), 'of', len(rows))
print('MATCH files seen', len(fids & set(ids)), 'of', len(fids))
g, e = gql('{ allScreenGroups(first:100){ nodes{ name screensByScreenGroupId(first:200){ nodes{ id } } } } }')
sids = {s['id'] for n in g['allScreenGroups']['nodes'] for s in n['screensByScreenGroupId']['nodes']}
print('MATCH screens in groups', len({x.get('screenId') for x in rows} & sids), 'of', len({x.get('screenId') for x in rows}))
extra = [k for k in (rows[0].keys() if rows else []) if 'playlist' in k.lower() or 'source' in k.lower() or 'duration' in k.lower()]
print('FIELDS playlist/source/duration', extra)
