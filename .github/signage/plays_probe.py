#!/usr/bin/env python3
"""Probe ScreenCloud playback-log API shape. PUBLIC LOGS: prints only field names, types, counts, dates.
Never prints content names, screen names, spaces or messages verbatim."""
import collections, datetime, json, os, re, sys, urllib.request

API = 'https://graphql.eu.screencloud.com/graphql'


def gql(query, variables=None):
    h = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + os.environ['SCREENCLOUD_API_KEY'].strip()}
    r = urllib.request.Request(API, data=json.dumps({'query': query, 'variables': variables or {}}).encode(), headers=h)
    try:
        return json.load(urllib.request.urlopen(r, timeout=120))
    except urllib.error.HTTPError as e:
        return {'errors': [{'message': 'HTTP %s' % e.code}]}


def errs(o):
    return [re.sub(r'"[^"]{0,200}"', '"…"', (e.get('message') or '')[:200]) for e in o.get('errors') or []]


def typ(t):
    s = ''
    while t:
        s += t['kind'][0] if t['kind'] in ('NON_NULL', 'LIST') else ''
        if t.get('name'):
            return s + ':' + t['name']
        t = t.get('ofType')
    return s


T = '{ kind name ofType { kind name ofType { kind name ofType { kind name } } } }'
for nm in ['GetPlaybackLogsInput', 'GetLogsFilterParams', 'ExportPlaybackLogsInput']:
    o = gql('{ __type(name:"%s"){ name inputFields { name type %s } } }' % (nm, T))
    t = (o.get('data') or {}).get('__type')
    print('INPUT', nm, [(f['name'], typ(f['type'])) for f in t['inputFields']] if t else errs(o))
o = gql('{ __schema { queryType { fields { name args { name type %s } type %s } } } }' % (T, T))
for f in o['data']['__schema']['queryType']['fields']:
    if 'log' in f['name'].lower() or 'playback' in f['name'].lower() or 'proof' in f['name'].lower():
        print('QUERY', f['name'], [(a['name'], typ(a['type'])) for a in f['args']], '->', typ(f['type']))
o = gql('{ __type(name:"PlaybackLogsResponse"){ fields { name type %s } } }' % T)
print('RESP PlaybackLogsResponse', errs(o) or [(f['name'], typ(f['type'])) for f in ((o.get('data') or {}).get('__type') or {}).get('fields') or []])


def anon(rows):
    keys = collections.Counter()
    for r in rows:
        keys.update(r.keys() if isinstance(r, dict) else ['<non-dict>'])
    return dict(keys)


def summarize(label, data):
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            print(label, 'string len', len(data)); return None
    if isinstance(data, dict):
        print(label, 'dict keys', list(data.keys())[:30])
        for k, v in data.items():
            if isinstance(v, list):
                print(label, 'list under', k, 'len', len(v)); data = v; break
    if not isinstance(data, list):
        print(label, 'type', type(data).__name__); return None
    print(label, 'rows', len(data), 'row keys', anon(data[:2000]))
    if data and isinstance(data[0], dict):
        r0 = data[0]
        print(label, 'value types', {k: type(v).__name__ for k, v in r0.items()})
        for k in ('type', 'message', 'source', 'contentType', 'playbackType', 'consumer', 'platform', 'level'):
            if k in r0:
                c = collections.Counter(' '.join(str(r.get(k))[:40].split()[:2]) for r in data)
                print(label, 'top', k, c.most_common(8))
        for k in ('timestamp', 'time', 'createdAt', '@timestamp'):
            if k in r0:
                ts = [str(r.get(k)) for r in data]
                print(label, k, 'first', ts[0], 'last', ts[-1])
        for k in ('screenId', 'contentId', 'name', 'screenName', 'spaceName', 'playlistName'):
            if k in r0:
                print(label, 'distinct', k, len({r.get(k) for r in data}))
        for k in ('duration', 'durationMs', 'playDuration'):
            if k in r0:
                print(label, 'has', k)
    return data


now = datetime.datetime.now(datetime.timezone.utc)
ns = lambda d: str(int(d.timestamp() * 1e9))
day0 = (now - datetime.timedelta(days=2)).replace(hour=15, minute=0, second=0, microsecond=0)  # 00:00 JST
for lbl, inp in [('default-500', '{limit:500}'),
                 ('one-day', '{limit:5000, startTime:"%s", endTime:"%s", direction:"forward"}' % (ns(day0), ns(day0 + datetime.timedelta(days=1)))),
                 ('one-day-start', '{limit:5000, startTime:"%s", endTime:"%s", direction:"forward", filterParams:{message:["start"]}}' % (ns(day0), ns(day0 + datetime.timedelta(days=1))))]:
    o = gql('{ getPlaybackLogs(input:%s){ status data } }' % inp)
    if o.get('errors'):
        print(lbl, 'ERR', errs(o)); continue
    print(lbl, 'status', o['data']['getPlaybackLogs']['status'])
    summarize(lbl, o['data']['getPlaybackLogs']['data'])

# retention: earliest log at/after a set of start dates
for start in ['2025-01-01', '2026-01-01', '2026-04-01', '2026-07-01', '2026-09-01', '2026-10-01', '2026-10-20']:
    d = datetime.datetime.fromisoformat(start + 'T00:00:00+00:00')
    o = gql('{ getPlaybackLogs(input:{limit:3, startTime:"%s", endTime:"%s", direction:"forward"}){ status data } }' % (ns(d), ns(now)))
    if o.get('errors'):
        print('RET', start, 'ERR', errs(o)); continue
    d2 = o['data']['getPlaybackLogs']['data']
    if isinstance(d2, str):
        try: d2 = json.loads(d2)
        except Exception: pass
    if isinstance(d2, dict):
        d2 = next((v for v in d2.values() if isinstance(v, list)), d2)
    first = None
    if isinstance(d2, list) and d2 and isinstance(d2[0], dict):
        first = d2[0].get('timestamp') or d2[0].get('time')
    print('RET from', start, 'rows', len(d2) if isinstance(d2, list) else '?', 'first ts', first)
