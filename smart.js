// ---- v56 smart matches ("meaning" search) for global search ----
// Keyword results (core.js P.search) are never changed. This adds, below them, items that mean the same thing:
//  1. related words: SM_GROUPS in app.js plus an optional encrypted events payload field `related`
//     ([{words:[...], block:[...]}]). A query that contains one word of a group also looks for the others.
//  2. meaning: all-MiniLM-L6-v2 (quantized, self-hosted in ./ai/) runs in a Web Worker on this device.
//     Vectors are cached in IndexedDB 'pulse-ai' keyed by item key + text hash, so only new or changed items are embedded.
// Nothing is sent anywhere. Toggle: localStorage.pulseSmart ('0' = off). Model loads lazily when search opens.
const SM={TH:.42,MINQ:3,BATCH:16,MODEL:'minilm-l6-q1',st:'idle',pct:0,err:'',V:new Map(),H:new Map(),ver:0,qv:new Map(),qwait:new Set(),hits:new Map(),ph:new Map(),w:null,n:0,cb:new Map(),loadMs:null,busy:false};
SM.on=()=>localStorage.pulseSmart!=='0';
SM.set=v=>{localStorage.pulseSmart=v?'1':'0';if(v)SM.start()};
SM.ok=()=>typeof Worker!=='undefined'&&typeof WebAssembly==='object'&&typeof indexedDB!=='undefined';
// ---------- text per item (short lead text: long captions dilute the meaning) ----------
SM.lead=(s,n)=>{s=String(s||'').replace(/https?:\/\/\S+/g,' ').replace(/\s+/g,' ').trim();const w=s.split(' ');return w.length>n?w.slice(0,n).join(' '):s};
SM.urlWords=u=>String(u||'').replace(/^https?:\/\/[^/]+/,'').replace(/[?#].*$/,'').replace(/[\/_\-.=&+]+/g,' ').replace(/\b(html?|php|aspx?|index)\b/g,' ').replace(/\s+/g,' ').trim();
SM.hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)+'.'+s.length};
SM.txt={
 post:r=>SM.lead(String(r.cap||'').replace(/#(\w+)/g,'$1'),28),
 web:p=>{const t=typeof wTitle==='function'?wTitle(p[0]):p[0];const u=p[0][0]==='/'?SM.urlWords(p[0]):'';return SM.lead(t+(u&&P.sNorm(u)!==P.sNorm(t)?' · '+u:''),24)},
 email:c=>SM.lead([c.name,...(typeof emLinkNames==='function'?emLinkNames(c):Object.values(c.titles||{})),...(c.links||[]).map(l=>SM.urlWords(l[0]))].filter(Boolean).join(' · '),40),
 sign:s=>SM.lead(s.name,16)};
SM.key={post:r=>'p:'+r.id,web:p=>'w:'+p[0],email:c=>'e:'+c.id,sign:s=>'s:'+s.k+':'+(s.raw||s.name)};
// every item that can be searched, all dates (consumers filter by date)
SM.all=function(){const L=[];const add=(kind,arr)=>(arr||[]).forEach(x=>{const t=SM.txt[kind](x);if(t)L.push({k:SM.key[kind](x),t})});
  try{add('email',emCamps())}catch(e){}
  try{add('sign',gsSign())}catch(e){}
  try{if(S.web.length){const wr=P.webRange(S.web,'2020-01-01',P.todayKey());if(wr&&wr.pages)add('web',wr.pages.filter(p=>!P.NOISE_PAGES.includes(p[0])))}}catch(e){}
  try{add('post',[...gsPosts()].sort((a,b)=>a.d<b.d?1:-1))}catch(e){}   // newest first, so recent dates are ready first
  return L};
// ---------- IndexedDB vector cache ----------
SM.db=()=>SM._db||(SM._db=new Promise((ok,no)=>{const r=indexedDB.open('pulse-ai',1);r.onupgradeneeded=()=>r.result.createObjectStore('v');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}));
SM.loadAll=async function(){const db=await SM.db();return new Promise(ok=>{const tx=db.transaction('v'),st=tx.objectStore('v'),out=[];const c=st.openCursor();
  c.onsuccess=()=>{const cur=c.result;if(!cur)return ok(out);out.push([cur.key,cur.value]);cur.continue()};c.onerror=()=>ok(out)})};
SM.put=async function(rows){const db=await SM.db();return new Promise(ok=>{const tx=db.transaction('v','readwrite'),st=tx.objectStore('v');rows.forEach(([k,v])=>st.put(v,k));tx.oncomplete=()=>ok();tx.onerror=()=>ok();tx.onabort=()=>ok()})};
SM.wipe=async function(){SM.V.clear();SM.H.clear();SM.hits.clear();SM.ph.clear();SM.ver++;try{const db=await SM.db();await new Promise(ok=>{const tx=db.transaction('v','readwrite');tx.objectStore('v').clear();tx.oncomplete=ok;tx.onerror=ok})}catch(e){}};
// stored as Int8 (x127): 384 bytes per item; decoded to Float32 in memory
const smQ=v=>{const o=new Int8Array(v.length);for(let i=0;i<v.length;i++)o[i]=Math.max(-127,Math.min(127,Math.round(v[i]*127)));return o};
const smD=b=>{const o=new Float32Array(b.length);for(let i=0;i<b.length;i++)o[i]=b[i]/127;return o};
// ---------- worker ----------
SM.call=function(m){return new Promise((ok,no)=>{const id=++SM.n;SM.cb.set(id,{ok,no});SM.w.postMessage(Object.assign({id},m))})};
SM.fail=function(e){console.warn('smart matches unavailable',e);SM.st='fail';SM.err=String(e&&e.message||e);try{SM.w&&SM.w.terminate()}catch(x){}SM.w=null;SM.cb.forEach(c=>c.no(SM.err));SM.cb.clear();SM.paint();if(gsShown())gsRender()};
SM.start=function(){if(!SM.on()||SM.st==='fail')return;if(SM.st==='ready'||SM.st==='indexing'){SM.sync();return}if(SM.st==='loading')return;
  if(!SM.ok())return SM.fail('no Worker / WebAssembly / IndexedDB');
  SM.st='loading';SM.paint();const t0=performance.now();
  try{SM.w=new Worker(new URL('ai/worker.js',document.baseURI),{type:'module'})}catch(e){return SM.fail(e)}
  SM.w.onmessage=ev=>{const d=ev.data||{},c=SM.cb.get(d.id);if(!c)return;SM.cb.delete(d.id);d.ok?c.ok(d):c.no(d.err)};
  SM.w.onerror=ev=>{ev.preventDefault&&ev.preventDefault();SM.fail(ev.message||'worker error')};
  const to=setTimeout(()=>{if(SM.st==='loading')SM.fail('model load timed out')},150000);
  Promise.all([SM.call({op:'init'}),SM.loadAll()]).then(([r,rows])=>{clearTimeout(to);if(SM.st==='fail')return;SM.loadMs=Math.round(performance.now()-t0);
    rows.forEach(([k,v])=>{if(v&&v.m===SM.MODEL&&v.v){SM.V.set(k,smD(v.v));SM.H.set(k,v.h)}});SM.ver++;SM.st='indexing';SM.sync();SM.flushQ()}).catch(e=>{clearTimeout(to);SM.fail(e)})};
// embed only items that are new or whose text changed
SM.sync=async function(){if(SM.busy||!SM.w||SM.st==='fail')return;SM.busy=true;
  try{const L=SM.all(),todo=L.filter(x=>{const h=SM.hash(x.t);x.h=h;return SM.H.get(x.k)!==h});const N=todo.length;let done=0,lastPaint=0,lastR=0;
    if(N){SM.st='indexing';SM.pct=0;SM.paint()}
    for(let i=0;i<N;i+=SM.BATCH){if(SM.st==='fail'||!SM.on())break;const b=todo.slice(i,i+SM.BATCH);
      if(SM.qwait.size)await SM.flushQ();   // a waiting query goes first, so typing never waits for the backlog
      const r=await SM.call({op:'embed',texts:b.map(x=>x.t)}),D=r.dim,rows=[];
      b.forEach((x,j)=>{const v=r.vecs.slice(j*D,(j+1)*D);SM.V.set(x.k,v);SM.H.set(x.k,x.h);rows.push([x.k,{m:SM.MODEL,h:x.h,v:smQ(v)}])});
      await SM.put(rows);done+=b.length;SM.pct=Math.round(done/N*100);SM.ver++;SM.hits.clear();
      const now=Date.now();if(now-lastPaint>300){lastPaint=now;SM.paint()}
      if(now-lastR>4000&&gsShown()&&$('#gq').value.trim()){lastR=now;gsRender()}}   // partial results appear as they get ready
    if(SM.st!=='fail'){SM.st='ready';SM.pct=100;SM.paint();if(N&&gsShown())gsRender()}}
  catch(e){SM.fail(e)}finally{SM.busy=false}};
// ---------- query vectors (one per comma alternative) ----------
SM.alts=q=>String(q||'').split(/[,|]/).map(a=>a.trim()).filter(a=>{const n=P.sNorm(a);return n.replace(/ /g,'').length>=SM.MINQ&&!/^[\d\s\/-]+$/.test(n)&&n.split(' ').some(w=>w&&!P.STOP.has(w))});
SM.qvec=function(q){const A=SM.alts(q);if(!A.length)return [];const out=[];let miss=false;
  A.forEach(a=>{const k=P.sNorm(a),v=SM.qv.get(k);if(v)out.push(v);else{miss=true;SM.qwait.add(a)}});
  if(miss){clearTimeout(SM._qt);SM._qt=setTimeout(()=>SM.flushQ(),180);return null}return out};
SM.flushQ=async function(){if(!SM.w||SM.st==='loading'||SM.st==='fail'||!SM.qwait.size)return;const A=[...SM.qwait];SM.qwait.clear();
  try{const r=await SM.call({op:'embed',texts:A}),D=r.dim;A.forEach((a,j)=>SM.qv.set(P.sNorm(a),r.vecs.slice(j*D,(j+1)*D)));
    if(SM.qv.size>300)[...SM.qv.keys()].slice(0,100).forEach(k=>SM.qv.delete(k));
    if(gsShown()&&$('#gq').value.trim())gsRender()}catch(e){console.warn('smart query',e)}};
// cosine (vectors are normalized) of the query alternatives against every embedded item; cached per query + vector version
SM.scores=function(q){const Q=SM.qvec(q);if(!Q||!Q.length)return null;const ck=P.sNorm(q)+'|'+SM.ver;let m=SM.hits.get(ck);if(m)return m;m=new Map();
  for(const [k,v] of SM.V){let best=-1;for(const qv of Q){let s=0;for(let i=0;i<v.length;i++)s+=v[i]*qv[i];if(s>best)best=s}if(best>=SM.TH)m.set(k,best)}
  if(SM.hits.size>20)SM.hits.clear();SM.hits.set(ck,m);return m};
// ---------- related-word groups ----------
SM.groups=function(){const g=(typeof SM_GROUPS!=='undefined'?SM_GROUPS:[]).map(x=>({words:x.words||[],block:x.block||[]}));
  const ex=S.ev&&Array.isArray(S.ev.related)?S.ev.related:[];ex.forEach(x=>{if(x&&Array.isArray(x.words))g.push({words:x.words.map(String),block:Array.isArray(x.block)?x.block:[]})});return g};
const smHas=(hay,w)=>{const n=P.sNorm(w);if(!n)return false;return new RegExp('(^| )'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(s|es)?( |$)').test(hay)};
// which groups a query hits, the extra words to look for, and what to block
SM.expand=function(q){const alts=String(q||'').split(/[,|]/).map(a=>P.sNorm(a)).filter(Boolean),terms=new Set(),block=new Set(),gs=[];
  if(!alts.length)return {terms:[],block:[],gs};
  SM.groups().forEach(g=>{const hit=alts.some(a=>g.words.some(w=>smHas(a,w)));
    g.block.forEach(b=>{if(Array.isArray(b)&&b.length>=2){if(alts.some(a=>smHas(a,b[0])))block.add(P.sNorm(b[1]));if(alts.some(a=>smHas(a,b[1])))block.add(P.sNorm(b[0]))}else if(hit&&b)block.add(P.sNorm(b))});
    if(!hit)return;gs.push(g);g.words.forEach(w=>{const n=P.sNorm(w);if(n&&!alts.some(a=>smHas(a,w)))terms.add(n)})});
  return {terms:[...terms],block:[...block].filter(Boolean),gs}};
// ---------- the related list for one group ----------
// kind: post|web|email|sign · list: the group's own universe · kw: keyword results for it · idx: its keyword index · dateOf: item -> date key (null = no date filter)
SM.related=function(kind,list,kw,idx,q,dateOf){if(!SM.on()||!list||!list.length)return [];const kf=SM.key[kind],seen=new Set((kw||[]).map(x=>kf(x.item))),E=SM.expand(q),out=new Map();
  const blocked=it=>{if(!E.block.length)return false;const h=P.sNorm(SM.txt[kind](it));return E.block.some(b=>smHas(h,b))};
  const inR=it=>!dateOf||gsIn(dateOf(it));
  if(E.terms.length&&idx){let res=[];try{res=P.search(idx,E.terms.join(','),{cap:1e4,sens:{fz1:99,fz2:99,fzDf:0}})}catch(e){}
    res.forEach(x=>{const it=list[x.i];if(!it)return;const k=kf(it);if(seen.has(k)||out.has(k)||!inR(it)||blocked(it))return;const h=P.sNorm(SM.txt[kind](it));
      out.set(k,{item:it,i:x.i,score:1+x.score,hit:x.hit,rel:{by:'word',ph:E.terms.find(t=>smHas(h,t))||E.terms[0]}})})}
  const sc=SM.st==='ready'||SM.st==='indexing'?SM.scores(q):null;
  if(sc&&sc.size)list.forEach((it,i)=>{const k=kf(it),s=sc.get(k);if(s==null||seen.has(k)||out.has(k)||!inR(it)||blocked(it))return;out.set(k,{item:it,i,score:s,hit:new Set(),rel:{by:'meaning',s,k}})});
  return [...out.values()].sort((a,b)=>b.score-a.score).slice(0,200)};
// ---------- "the related phrase" for a meaning match: the 1-3 word run in the item closest to the query (lazy, visible rows only) ----------
SM.phrase=async function(q,key,text){const ck=P.sNorm(q)+'|'+key;if(SM.ph.has(ck))return SM.ph.get(ck);const Q=SM.qvec(q);if(!Q||!Q.length||!SM.w)return null;
  const w=String(text).replace(/[^\p{L}\p{N}&' ]+/gu,' ').split(/\s+/).filter(Boolean).slice(0,24),C=new Set();
  for(let n=1;n<=3;n++)for(let i=0;i+n<=w.length;i++){const g=w.slice(i,i+n);if(P.STOP.has(g[0].toLowerCase())||P.STOP.has(g[g.length-1].toLowerCase()))continue;if(g.join('').length<3)continue;C.add(g.join(' '))}
  const L=[...C].slice(0,48);if(!L.length){SM.ph.set(ck,'');return ''}
  try{const r=await SM.call({op:'embed',texts:L}),D=r.dim;let best=-1,bp='';L.forEach((p,j)=>{for(const qv of Q){let s=0;for(let i=0;i<D;i++)s+=r.vecs[j*D+i]*qv[i];if(s>best){best=s;bp=p}}});
    SM.ph.set(ck,bp);return bp}catch(e){return null}};
SM.fillPhrases=function(q){$$('#gbody [data-smph]').forEach(el=>{const k=el.dataset.smph,t=el.dataset.smt||'';SM.phrase(q,k,t).then(p=>{if(p&&el.isConnected&&$('#gq').value===q)el.innerHTML=`matched by meaning · “${esc(p)}”`})})};
// ---------- status line in the search sheet ----------
const gsShown=()=>{const g=$('#gs');return !!(g&&g.classList.contains('show'))};
SM.note=function(){if(!SM.on())return 'Keyword matches only';if(SM.st==='fail')return 'Smart matches unavailable on this device';if(SM.st==='loading')return 'Preparing smart search…';
  if(SM.st==='indexing')return `Preparing smart search… ${SM.pct}%`;if(SM.st==='ready')return 'Includes matches by meaning';return ''};
SM.bar=()=>`<div class="gsmart"><button class="gsmt" role="switch" aria-checked="${SM.on()}" id="gsmt"><i></i>Smart matches ${SM.on()?'on':'off'}</button><span class="gsmn${SM.st==='fail'&&SM.on()?' fail':''}" id="gsmn" aria-live="polite">${esc(SM.note())}</span></div>`;
SM.paint=function(){const n=$('#gsmn');if(!n)return;n.textContent=SM.note();n.classList.toggle('fail',SM.st==='fail'&&SM.on())};
SM.bind=function(){const b=$('#gsmt');if(!b)return;b.onclick=()=>{const v=!SM.on();SM.set(v);GS.open={};gsRender();toast(v?'Smart matches on: related items show below keyword matches':'Smart matches off: keyword matches only')}};
// erase all data also clears the vector cache
(function(){if(typeof eraseAll!=='function')return;const _e=eraseAll;eraseAll=async function(){await SM.wipe();return _e.apply(this,arguments)}})();
