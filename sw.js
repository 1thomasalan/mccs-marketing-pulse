const C='pulse-v83',AI='pulse-ai-v1';const F=['./','index.html','core.js','app.js','hub.js','programs.js','connections.js','autoconn.js','prod.js','about.js','changelog.js','brief.js','fol.js','share.js','searchrep.js','meet.js','plan.js','smart.js','signage.js','plays.js','loader.js','tv.js','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==AI).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
 // v56 smart search model + runtime (~33 MB): not precached; cached on first use, cache-first, kept across version bumps
 if(e.request.method==='GET'&&e.request.url.startsWith(self.location.origin)&&/\/ai\/(models\/|[^/]+\.wasm$|transformers\.min\.js$)/.test(e.request.url)){e.respondWith(caches.open(AI).then(c=>c.match(e.request).then(h=>h||fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r}))));return}
 if(e.request.url.match(/(data|web|email|events)\.(enc\.json|\d+\.bin)|\/t\/|signage|\/sg\//))return;if(e.request.method!=='GET'||!e.request.url.startsWith(self.location.origin))return;
 // v82: app files open straight from this device's copy and refresh in the background (stale-while-revalidate); a new version arrives with the next sw.js
 const u=new URL(e.request.url),net=()=>fetch(e.request.url,{cache:'no-cache'}).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r});
 if(u.search){e.respondWith(net().catch(()=>caches.match(e.request)));return}
 e.respondWith(caches.match(e.request).then(h=>{const n=net();if(h){e.waitUntil(n.catch(()=>{}));return h}return n.catch(()=>caches.match('index.html'))}))});
