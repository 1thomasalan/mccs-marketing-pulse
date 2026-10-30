// Pulse UI
const P=Pulse,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const DEF={theme:'dusk',compare:'prior',rStyle:'navy',rTitle:'Digital Marketing Report',rHead:'MCCS OKINAWA',rOrg:'MCCS Okinawa',rSec:{summary:1,chart:1,eff:1,top:1,web:1,email:1,watch:1,team:1},watch:['Meta replaces Facebook Reach with Viewers on Oct 31, 2026, so we report Views.','Confirm the Instagram account is linked to the Meta business portfolio.','Post metrics are lifetime to date; the newest posts are still growing.']};
let CFG;try{CFG=Object.assign({},DEF,JSON.parse(localStorage.pulseCfg||'{}'));CFG.rSec=Object.assign({},DEF.rSec,CFG.rSec||{});}catch(e){CFG={...DEF}}
if(CFG.rTitle==='Social Media Report')CFG.rTitle=DEF.rTitle;if(CFG.rHead==='DIGITAL MARKETING')CFG.rHead=DEF.rHead;
const saveCfg=()=>localStorage.pulseCfg=JSON.stringify(CFG);
const S={posts:[],preset:localStorage.pulsePreset||'30',s:null,e:null,plat:'all',view:'overview',metric:'v',q:'',acct:'all',sort:'v',dir:'desc',limit:40,web:[],email:[],mode:localStorage.pulseMode||'social',wq:'',wlimit:15};
const M={v:['Views','views'],e:['Engagement','engagements'],lc:['Link clicks','clicks'],n:['Posts','posts'],fo:['IG follows','follows'],sh:['Shares','shares'],cm:['Comments','comments'],sv:['Saves','saves'],rx:['Reactions & likes','reactions']};
// ---- storage ----
const DB={open(){return new Promise((ok,no)=>{const r=indexedDB.open('pulse',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})},
 async get(k){const d=await this.open();return new Promise(ok=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>ok(q.result);q.onerror=()=>ok(null)})},
 async set(k,v){const d=await this.open();return new Promise(ok=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=ok})}};
// ---- helpers ----
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nf=n=>Math.round(n).toLocaleString('en-US');
const acctName=(plat,page)=>plat==='ig'?'@'+page:P.short(page);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2800)}
function openSheet(html,wide,share){S.share=share||null;$('#shareSheet').hidden=!share;$('#sheetBody').innerHTML=html;$('#sheet').classList.toggle('wide',!!wide);$('#sheet').classList.add('show');$('#scrim').classList.add('show');$('#sheet').scrollTop=0}
function closeSheet(){$('#sheet').classList.remove('show');$('#scrim').classList.remove('show');if(typeof closeSettings==='function')closeSettings(true)}
$('#closeSheet').onclick=closeSheet;$('#shareSheet').onclick=()=>S.share&&window.PulseShare&&PulseShare.open(S.share);
const dd=(a,b,has)=>{const p=P.pct(a,b);if(!has||p==null||!isFinite(p))return null;return {txt:`${p>=0?'▲':'▼'} ${Math.abs(p).toFixed(1)}%`,up:p>=0}};
const shPost=r=>({rank:0,title:P.label(r),meta:`${r.plat==='fb'?'FB':'IG'} · ${acctName(r.plat,r.page)} · ${P.fmtDate(r.d)}`,v:P.fmt(r.v),plat:r.plat});
const shShow=both=>({fb:both||S.plat==='all'||S.plat==='fb',ig:both||S.plat==='all'||S.plat==='ig'});$('#scrim').onclick=closeSheet;
function topMix(L,n){const s=[...L].sort((a,b)=>b.v-a.v);const pick=[];['fb','ig'].forEach(p=>{const r=s.find(x=>x.plat===p);if(r)pick.push(r)});for(const r of s){if(pick.length>=n)break;if(!pick.includes(r))pick.push(r)}return pick.slice(0,n).sort((a,b)=>b.v-a.v)}
const dataEnd=()=>S.posts.reduce((m,r)=>r.d>m?r.d:m,'');
const PRESETS=[['lastweek','Last week'],['7','7 days'],['30','30 days'],['month','This month'],['lastmonth','Last month'],['ytd','Year to date'],['custom','Custom']];
function setRange(){if(!(S.preset==='custom'&&S.s)){const r=P.preset(S.preset);S.s=r.s;S.e=r.e;S.cs=r.cs;S.ce=r.ce;}
  if(CFG.compare==='yoy'){const c=P.yoy(S.s,S.e);S.cs=c.cs;S.ce=c.ce}else if(S.preset==='custom'||!['month','lastmonth','ytd'].includes(S.preset)){const c=P.compareFor(S.s,S.e);S.cs=c.cs;S.ce=c.ce}
  else if(S.preset==='ytd'){const c=P.yoy(S.s,S.e);S.cs=c.cs;S.ce=c.ce}}
function ctx(plat){plat=plat||S.plat;setRange();const L=P.filter(S.posts,S.s,S.e,plat),C=P.filter(S.posts,S.cs,S.ce,plat);return {L,C,t:P.totals(L),c:P.totals(C)}}
const dl=(a,b,has)=>{const p=P.pct(a,b);if(!has||p==null||!isFinite(p))return '<span class="mut">no comparison data</span>';return `<span class="${p>=0?'up':'down'}">${p>=0?'▲':'▼'} ${Math.abs(p).toFixed(1)}%</span>`};
const cmpLabel=()=>CFG.compare==='yoy'||S.preset==='ytd'?'same period last year':'prior period';
function greet(){const h=+new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',hour:'numeric',hour12:false}).format(new Date());return (h<12?'Good morning':h<18?'Good afternoon':'Good evening')}
const ICON={gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
 imp:'<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>'};
// ---- chart ----
function chartSVG(ser,w,h,opt){opt=opt||{};const pts=ser.pts;if(pts.length<2)return '<p class="mut">Not enough data points to chart.</p>';
  const max=Math.max(1,...pts.map(p=>Math.max(p.fb,p.ig)));const px=i=>i/(pts.length-1)*w,py=v=>h-6-(v/max)*(h-24);
  const line=k=>pts.map((p,i)=>`${i?'L':'M'}${px(i).toFixed(1)},${py(p[k]).toFixed(1)}`).join('');const area=k=>line(k)+`L${w},${h}L0,${h}Z`;
  const fs=opt.fs||11;const ticks=[0,Math.floor((pts.length-1)/2),pts.length-1].map(i=>`<text x="${px(i)}" y="${h+fs+6}" text-anchor="${i?i===pts.length-1?'end':'middle':'start'}" fill="rgba(238,241,246,.5)" font-size="${fs}">${P.fmtDate(pts[i].k)}</text>`).join('');
  const show=k=>S.plat==='all'||S.plat===k||opt.both;
  return `<svg class="chart" viewBox="0 0 ${w} ${h+fs+8}" data-w="${w}" style="width:100%;height:auto;overflow:visible"><defs>
   <linearGradient id="gf${opt.id||''}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fb)" stop-opacity=".32"/><stop offset="1" stop-color="var(--fb)" stop-opacity="0"/></linearGradient>
   <linearGradient id="gi${opt.id||''}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ig)" stop-opacity=".32"/><stop offset="1" stop-color="var(--ig)" stop-opacity="0"/></linearGradient>
   <filter id="gl${opt.id||''}"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <text x="0" y="${fs}" fill="rgba(238,241,246,.5)" font-size="${fs}">${P.fmt(max)}</text>
   ${show('fb')?`<path d="${area('fb')}" fill="url(#gf${opt.id||''})"/>`:''}${show('ig')?`<path d="${area('ig')}" fill="url(#gi${opt.id||''})"/>`:''}
   ${show('fb')?`<path d="${line('fb')}" fill="none" stroke="var(--fb)" stroke-width="${opt.sw||2}" filter="url(#gl${opt.id||''})"/>`:''}${show('ig')?`<path d="${line('ig')}" fill="none" stroke="var(--ig)" stroke-width="${opt.sw||2}" filter="url(#gl${opt.id||''})"/>`:''}
   <line class="cur" x1="0" x2="0" y1="0" y2="${h}" stroke="var(--glow)" stroke-width="1" opacity="0"/>${ticks}</svg>`;}
function bindChart(box,ser,m){const svg=box.querySelector('svg.chart');if(!svg)return;const tip=box.querySelector('.tip');const pts=ser.pts;const w=+svg.dataset.w;
  const mv=e=>{const r=svg.getBoundingClientRect();const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left;const i=Math.max(0,Math.min(pts.length-1,Math.round(x/r.width*(pts.length-1))));const p=pts[i];
    const cur=svg.querySelector('.cur');cur.setAttribute('x1',i/(pts.length-1)*w);cur.setAttribute('x2',i/(pts.length-1)*w);cur.setAttribute('opacity',.7);
    const lab=ser.step==='day'?P.fmtDate(p.k,{weekday:'short'}):ser.step==='week'?'Week of '+P.fmtDate(p.k):P.fmtDate(p.k,{month:'long',day:undefined});
    tip.innerHTML=`<b>${lab}</b><span style="color:var(--fb)">FB ${nf(p.fb)}</span><span style="color:var(--ig)">IG ${nf(p.ig)}</span>`;tip.style.opacity=1;
    const tx=x/r.width;tip.style.left=Math.min(Math.max(tx*100,12),88)+'%';};
  svg.addEventListener('pointermove',mv);svg.addEventListener('touchmove',mv,{passive:true});svg.addEventListener('pointerleave',()=>{tip.style.opacity=0;svg.querySelector('.cur').setAttribute('opacity',0)})}
// ---- shared header ----
function header(accts,web){const end=dataEnd();const wEnd=S.web.reduce((m,x)=>x.end>m?x.end:m,'');const stale=web?(wEnd?`Website data through ${P.fmtDate(wEnd,{year:'numeric'})}`:'No website data yet'):S.e>end?`Data through ${P.fmtDate(end,{year:'numeric'})} · Meta lags ~2 days`:`vs ${P.rangeLabel(S.cs,S.ce)}`;
  return `<div class="ctl"><div class="range presets">${PRESETS.map(([k,l])=>`<button data-p="${k}" class="${S.preset===k?'on':''}">${l}</button>`).join('')}</div>
  <div class="rlabel">${P.rangeLabel(S.s,S.e)}<small>${stale}</small></div>
  ${web?'':`<div class="range plats">`}${web?'':[['all','All'],['fb','Facebook'],['ig','Instagram']].map(([k,l])=>`<button data-f="${k}" class="chip ${S.plat===k?'on':''}">${l}</button>`).join('')}${accts?`<label class="chip acctpick ${S.acct!=='all'?'on':''}"><select id="hAcct" aria-label="Account"><option value="all">All accounts</option>${accts.map(g=>`<option value="${g.plat}|${esc(g.page)}" ${S.acct===g.plat+'|'+g.page?'selected':''}>${g.plat.toUpperCase()} · ${esc(acctName(g.plat,g.page))}</option>`).join('')}</select></label>`:''}${web?'':'</div>'}</div>`}
function topbar(){return `<div class="top"><span>MCCS Pulse</span><span class="tbtns">${gsAvail()?`<button class="icon" id="gbtn" aria-label="Search everything" title="Search everything (/ or ${/Mac|iP/.test(navigator.platform)?'⌘':'Ctrl+'}K)"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg></button>`:''}<button class="icon" id="gear" aria-label="Settings">${ICON.gear}</button></span></div>`}
// ---- render ----
function render(){const app=$('#app');if(TV.on)return TV.render();
  if(S.locked&&SYNC.meta){$('#dock').style.display='none';app.innerHTML=topbar()+lockScreen();bindTop();bindLock();return;}
  if(!S.posts.length){$('#dock').style.display='none';app.innerHTML=`${topbar()}<div class="empty"><div class="orb"></div><h1>Marketing metrics,<br>at a glance.</h1><p>Waiting for data. Drop in your Meta Business Suite exports (Facebook and Instagram, Post level, Lifetime). Everything stays on this device.</p><div class="drop" id="drop" style="margin-top:24px">Drop CSV files here<br>or<br><button class="btn" id="pick" style="margin-top:10px">Choose files</button></div></div>`;bindDrop();bindTop();return;}
  $('#dock').style.display='flex';if(S.view==='explore'&&S.socSub!=='programs'&&!['social','web','email'].includes(S.mode))S.mode='social';
  let {L,C,t,c}=ctx();let accts=null;
  {accts=P.byPage(L);if(S.acct!=='all'&&!accts.some(g=>g.plat+'|'+g.page===S.acct))S.acct='all';
    if(S.acct!=='all'){const m=r=>r.plat+'|'+r.page===S.acct;L=L.filter(m);C=C.filter(m);t=P.totals(L);c=P.totals(C)}}
  const WEBV=S.view==='explore'&&S.mode==='web'&&S.web.length,EMV=S.view==='explore'&&S.mode==='email'&&S.email.length,PROGV=S.view==='explore'&&!WEBV&&!EMV&&S.socSub==='programs';
  if(S.view==='signage'){app.innerHTML=topbar()+hubPills('signage')+signageView();bindTop();bindSignage();hubAfterSignage();hubDock();return}
  if(S.view==='events'){app.innerHTML=topbar()+hubEventsView();bindTop();bindHub();return}
  if(S.view==='programs'){setRange();app.innerHTML=topbar()+progView();bindTop();bindProg();bindHub();return}
  app.innerHTML=topbar()+(S.view==='explore'?(EMV?exploreEmail():WEBV?exploreWeb():PROGV?hubPrograms():explore(L,C,t,c,accts)):hubToday());
  $$('[data-mode]').forEach(b=>b.onclick=()=>{S.mode=b.dataset.mode;localStorage.pulseMode=S.mode;render()});[['#toWeb','web'],['#toEmail','email']].forEach(([id,m])=>{const tw=$(id);if(tw)tw.onclick=()=>{S.view='explore';S.mode=m;localStorage.pulseMode=m;render();scrollTo(0,0)}});if(EMV)$$('[data-ecamp]').forEach(b=>b.onclick=()=>emailCampSheet(b.dataset.ecamp));
  if(WEBV){const wq=$('#wq');if(wq)wq.oninput=()=>{S.wq=wq.value;S.wlimit=15;renderWebPages()};renderWebPages()}
  {const ha=$('#hAcct');if(ha)ha.onchange=e=>{S.acct=e.target.value;S.limit=40;render()}}
  bindTop();
  {const pr=$('.range.presets'),on=pr&&pr.querySelector('.on');if(on&&pr.scrollWidth>pr.clientWidth)pr.scrollLeft=on.offsetLeft-(pr.clientWidth-on.offsetWidth)/2}
  $$('[data-p]').forEach(b=>b.onclick=()=>{if(b.dataset.p==='custom')return rangeSheet();S.preset=b.dataset.p;localStorage.pulsePreset=S.preset;render()});
  $$('[data-f]').forEach(b=>b.onclick=()=>{S.plat=b.dataset.f;S.acct='all';render()});
  $$('[data-m]').forEach(b=>b.onclick=()=>{S.metric=b.dataset.m;render()});
  $$('[data-k]').forEach(b=>b.onclick=()=>metricSheet(b.dataset.k));
  $$('[data-post]').forEach(b=>b.onclick=e=>{if(e.target.closest('a'))return;postSheet(b.dataset.post)});
  $$('[data-acct]').forEach(b=>b.onclick=()=>accountSheet(b.dataset.acct));
  const cb=$('.chartbox');if(cb)bindChart(cb,P.series(L,S.s,S.e,S.metric),S.metric);
  if(S.view==='explore'&&!WEBV&&!EMV&&!PROGV){(window.requestIdleCallback||setTimeout)(()=>P.searchIndex(S.posts,PF));const q=$('#q');q.oninput=()=>{const was=S.q.trim();S.q=q.value;S.limit=40;const sel=$('#sortSel');if(!was&&S.q.trim()&&S.sort==='v'){S.sort='r';S.dir='desc'}else if(was&&!S.q.trim()&&S.sort==='r')S.sort='v';sel.value=S.sort;renderList(L)};$('#acctSel').onchange=e=>{S.acct=e.target.value;S.limit=40;render()};$('#sortSel').onchange=e=>{S.sort=e.target.value;S.dir='desc';$('#dirBtn').textContent=S.sort==='d'?'↓ Newest first':'↓ High to low';renderList(L)};$('#dirBtn').onclick=e=>{S.dir=S.dir==='asc'?'desc':'asc';e.target.textContent=S.dir==='asc'?(S.sort==='d'?'↑ Oldest first':'↑ Low to high'):(S.sort==='d'?'↓ Newest first':'↓ High to low');renderList(L)};renderList(L);
    $$('.hm td[data-h]').forEach(td=>td.onclick=()=>{const [w,h]=td.dataset.h.split(',').map(Number);const list=L.filter(r=>{const d=new Date(r.t+9*3600e3);return (d.getUTCDay()+6)%7===w&&Math.floor(d.getUTCHours()/3)===h});listSheet(`${WD[w]} ${hb(h)}`,list)})}
  bindHub();
}
function bindTop(){$('#gear').onclick=settings;const gb=$('#gbtn');if(gb){gb.onclick=()=>gsOpen('');gb.onpointerenter=gb.onfocus=gsWarm;gb.addEventListener('touchstart',gsWarm,{passive:true})}}
// ---- viewport intelligence: tier changes re-render so charts get the right aspect ----
const vpTier=()=>{const w=innerWidth;return w<700?'phone':w<1100?'tablet':w<1600?'laptop':w<2400?'wide':'wall'};
const chartW=()=>({laptop:820,wide:1000,wall:1000}[vpTier()]||640);
const chartH=()=>({laptop:230,wide:360,wall:290}[vpTier()]||190);
{let tier=vpTier(),h;addEventListener('resize',()=>{clearTimeout(h);h=setTimeout(()=>{const t=vpTier();document.documentElement.dataset.tier=t;if(t!==tier){tier=t;if(!TV.on&&!$('#sheet').classList.contains('show')&&!$('#report').classList.contains('show'))render()}},200)});document.documentElement.dataset.tier=tier}
const kpi=(k,l,v,d,s)=>`<button class="card kpi" data-k="${k}"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div><div class="s">${s}</div></button>`;
function overview(L,C,t,c,accts){const has=c.n>0;const top=[...L].sort((a,b)=>b.v-a.v).slice(0,5),pages=P.byPage(L),ser=P.series(L,S.s,S.e,S.metric);
  return `<div class="lead"><div class="hero"><h1>${greet()}</h1><button class="big" data-k="v">${P.fmt(t.v)}</button><div class="sub">views · ${t.n} posts</div><div class="delta">${dl(t.v,c.v,has)} <span class="mut">vs ${cmpLabel()}</span></div></div>
  ${header(accts)}
  <div class="grid">${kpi('e','Engagement',P.fmt(t.e),dl(t.e,c.e,has),'reactions, comments, shares, saves')}${kpi('lc','Link clicks',nf(t.lc),dl(t.lc,c.lc,has),'Facebook')}${kpi('epk','Eng. per 1K views',t.epk.toFixed(1),dl(t.epk,c.epk,has),'how hard content works')}${kpi('fo','IG follows',nf(t.fo),dl(t.fo,c.fo,has),'from posts')}</div></div>${(()=>{const a=webTodayCard(),b=emailTodayCard();return `<div class="mid ${a&&b?'two':a||b?'one':'none'}">${a?`<div class="ma">${a}</div>`:''}${b?`<div class="mb">${b}</div>`:''}`})()}
  <div class="card chartbox mchart"><h2>${M[S.metric][0]} over time<small>by ${ser.step} · tap the line</small></h2><div class="range left" style="margin:0 0 12px">${['v','e','lc','n'].map(m=>`<button class="chip sm ${S.metric===m?'on':''}" data-m="${m}">${M[m][0]}</button>`).join('')}</div><div style="position:relative">${chartSVG(ser,chartW(),chartH())}<div class="tip"></div></div><div class="legend">${S.plat!=='ig'?`<span><i style="background:var(--fb)"></i>Facebook ${P.fmt(ser.pts.reduce((a,p)=>a+p.fb,0))}</span>`:''}${S.plat!=='fb'?`<span><i style="background:var(--ig)"></i>Instagram ${P.fmt(ser.pts.reduce((a,p)=>a+p.ig,0))}</span>`:''}</div></div>
   <div class="card mbal"><h2>Platform balance<small>Instagram share</small></h2>${balance(t)}<p class="mut sm">Median post: Instagram ${P.fmt(P.median(L.filter(r=>r.plat==='ig').map(r=>r.v)))} views, Facebook ${P.fmt(P.median(L.filter(r=>r.plat==='fb').map(r=>r.v)))}.</p></div></div>
  <div class="cols tpa"><div class="card cq"><h2>Top posts<small>tap for detail</small></h2><div class="tposts">${(()=>{const pl=['fb','ig'].filter(p=>S.plat==='all'||S.plat===p);const grp=pl.map(p=>({p,l:[...L].filter(r=>r.plat===p).sort((a,b)=>b.v-a.v).slice(0,5)})).filter(g=>g.l.length);if(!grp.length)return '<p class="mut">No posts in this range.</p>';return grp.map(g=>`<div class="tgrp">${pl.length>1?`<div class="tsec ${g.p}">${g.p==='fb'?'Facebook':'Instagram'}</div>`:''}${g.l.map((r,i)=>postRow(r,i+1)).join('')}</div>`).join('')})()}</div></div>
   <div class="card"><h2>Accounts<small>tap to explore</small></h2>${pages.slice(0,8).map(g=>`<button class="arow" data-acct="${g.plat}|${esc(g.page)}"><span><span class="tag ${g.plat}">${g.plat.toUpperCase()}</span>${esc(acctName(g.plat,g.page))}</span><span class="mut">${g.n} posts</span><b>${P.fmt(g.v)}</b></button>`).join('')}${pages.length>8?`<button class="more" id="allAccts" onclick="S.view='explore';render();scrollTo(0,0)">All ${pages.length} accounts in Explore</button>`:''}</div></div>
  <p class="note">${nf(S.posts.length)} posts stored on this device · metrics are lifetime to date, so recent posts are still growing</p>`}
function balance(t){return [['Posts',t.ig.n,t.n],['Views',t.ig.v,t.v],['Engagement',t.ig.e,t.e]].map(([l,a,b])=>`<div class="share"><div class="row"><span>${l}</span><b>${b?Math.round(a/b*100):0}%</b></div><div class="bar"><span style="width:${b?a/b*100:0}%"></span></div></div>`).join('')}
// search: when the matched words aren't in the visible first line, say where they matched (hashtag, caption, or account/date)
const qWhy=(r,hit)=>{const has=x=>P.sNorm(x,1).split(' ').some(w=>hit.has(w));if(has(P.label(r)))return '';const tg=(String(r.cap).match(/#\w+/g)||[]).filter(has);return tg.length?' · '+tg.slice(0,2).map(t=>'<mark>'+esc(t)+'</mark>').join(' '):has(r.cap)?' · in caption':' · account / date'};
function postRow(r,rank,show,hit){return `<div class="post" data-post="${esc(r.id)}">${rank?`<div class="rank">${rank}</div>`:''}<div class="pb"><div class="t">${hit?P.hl(P.label(r),hit,esc):esc(P.label(r))}</div><div class="m"><span class="tag ${r.plat}">${r.plat==='fb'?'FB':'IG'}</span>${esc(acctName(r.plat,r.page))} · ${P.fmtDate(r.d)} · ${P.fmt(P.eng(r))} eng${r.lc&&show!=='lc'?` · ${r.lc} clicks`:''}${hit&&hit.size?qWhy(r,hit):''}${typeof evTag==='function'?evTag('so:'+r.id):''}</div></div>${postNum(r,show)}</div>`}
function postNum(r,k){const x={e:[P.fmt(P.eng(r)),'engagement'],lc:r.plat==='ig'?['—','no link clicks']:[P.fmt(r.lc),'clicks'],epk:[r.v>=200?(P.eng(r)/r.v*100).toFixed(1)+'%':'—','eng. rate']}[k]||[P.fmt(r.v),'views'];return `<div class="n"><b>${x[0]}</b><span>${x[1]}</span></div>`}
const WD=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];const hb=h=>['12–3a','3–6a','6–9a','9a–12','12–3p','3–6p','6–9p','9p–12'][h];
function explore(L,C,t,c,accts){const has=c.n>0;const days=P.daysBetween(S.s,S.e);const pages=P.byPage(L),types=P.byType(L),heat=P.heat(L);
  const hmMax=Math.max(1,...heat.flat().filter(x=>x.n>=2).map(x=>x.med));
  let best=null;heat.forEach((row,w)=>row.forEach((x,h)=>{if(x.n>=3&&(!best||x.med>best.med))best={w,h,...x}}));
  const mini=(k,l,v,d)=>`<button class="card kpi mini" data-k="${k}"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div></button>`;
  return `<div class="xlead"><div class="hero small"><h1>Social</h1><div class="sub">Facebook and Instagram · every account, every post</div></div>${modeSwitch()}${header(accts)}</div>${hubSocSub()}
  <div class="grid g4">${mini('v','Views',P.fmt(t.v),dl(t.v,c.v,has))}${mini('rx','Reactions & likes',P.fmt(t.rx),dl(t.rx,c.rx,has))}${mini('cm','Comments',P.fmt(t.cm),dl(t.cm,c.cm,has))}${mini('sh','Shares',P.fmt(t.sh),dl(t.sh,c.sh,has))}
  ${mini('sv','Saves (IG)',P.fmt(t.sv),dl(t.sv,c.sv,has))}${mini('n','Posts',nf(t.n),dl(t.n,c.n,has))}${mini('avg','Avg views / post',P.fmt(t.n?t.v/t.n:0),dl(t.n?t.v/t.n:0,c.n?c.v/c.n:0,has))}${mini('ppd','Posts per day',(t.n/days).toFixed(1),dl(t.n/days,c.n/days,has))}</div>
  <div class="cols"><div class="card"><h2>Best time to post<small>median views · JST</small></h2>${best?`<p class="mut sm" style="margin-top:-4px">Sweet spot: <b style="color:var(--glow)">${WD[best.w]} ${hb(best.h)}</b>, ${P.fmt(best.med)} median views across ${best.n} posts.</p>`:''}
   <div class="scroll"><table class="hm"><tr><th></th>${[0,1,2,3,4,5,6,7].map(h=>`<th>${hb(h)}</th>`).join('')}</tr>${heat.map((row,w)=>`<tr><th>${WD[w]}</th>${row.map((x,h)=>`<td data-h="${w},${h}" style="--a:${x.n?Math.min(1,x.med/hmMax):0}" title="${x.n} posts">${x.n?P.fmt(x.med):''}</td>`).join('')}</tr>`).join('')}</table></div><p class="mut sm">Tap a cell to see its posts. Cells with one post can mislead.</p></div>
   <div class="card"><h2>What works<small>by format</small></h2><table><tr><th>Format</th><th>Posts</th><th>Median</th><th>Eng/1K</th></tr>${types.map(x=>`<tr><td><span class="tag ${x.plat}">${x.plat.toUpperCase()}</span>${esc(x.type.replace(/^IG /,''))}</td><td>${x.n}</td><td>${P.fmt(x.med)}</td><td>${x.epk.toFixed(1)}</td></tr>`).join('')}</table></div></div>
  <div class="cols xa"><div class="card"><h2>Every account<small>${pages.length} active · tap a row</small></h2><div class="scroll"><table><tr><th>Account</th><th>Posts</th><th>Views</th><th>Median</th><th>Eng.</th><th>Eng/1K</th><th>Clicks</th></tr>${pages.map(g=>`<tr class="tap" data-acct="${g.plat}|${esc(g.page)}"><td><span class="tag ${g.plat}">${g.plat.toUpperCase()}</span>${esc(acctName(g.plat,g.page))}</td><td>${g.n}</td><td>${nf(g.v)}</td><td>${P.fmt(g.med)}</td><td>${P.fmt(g.e)}</td><td>${g.epk.toFixed(1)}</td><td>${g.lc||''}</td></tr>`).join('')}</table></div></div>
  <div class="card cq"><h2>All posts<span class="h2r"><button class="chip sm on" id="campBtn" hidden>Campaign report</button><small id="cnt"></small></span></h2><div class="filters"><input id="q" type="search" placeholder="Search posts or a campaign, e.g. Ages & Stages" value="${esc(S.q)}"><select id="acctSel"><option value="all">All accounts</option>${(accts||pages).map(g=>`<option value="${g.plat}|${esc(g.page)}" ${S.acct===g.plat+'|'+g.page?'selected':''}>${esc(acctName(g.plat,g.page))}</option>`).join('')}</select><select id="sortSel">${[['r','Best match'],['v','Most views'],['e','Most engagement'],['lc','Most clicks'],['epk','Best eng. rate'],['d','Newest']].map(([k,l])=>`<option value="${k}" ${S.sort===k?'selected':''}>${l}</option>`).join('')}</select><button class="chip sm sortDir" id="dirBtn" title="Change sort order">${S.sort==='d'?(S.dir==='asc'?'↑ Oldest first':'↓ Newest first'):(S.dir==='asc'?'↑ Low to high':'↓ High to low')}</button></div><div id="evfso"></div><p id="qhint" class="mut sm qhint" hidden></p><div id="plist"></div></div></div>`}
function renderList(L){let list=L,hits=null,fz=[];if(S.acct!=='all')list=list.filter(r=>r.plat+'|'+r.page===S.acct);
  {const ef=$('#evfso');if(ef){ef.innerHTML=hubEvFilter('so',list.map(r=>'so:'+r.id));bindEvFilter(()=>{S.limit=40;renderList(L)})}}if(S.evF.so)list=list.filter(r=>evPass('so','so:'+r.id));
  if(S.q.trim()){const res=postSearch(S.q),inL=new Set(list);hits=new Map();res.forEach(x=>{if(inL.has(x.item))hits.set(x.item,x)});list=[...hits.keys()];fz=res.fuzzy}
  const sort=S.sort==='r'&&!hits?'v':S.sort;const key={r:r=>hits.get(r).score,v:r=>r.v,e:r=>P.eng(r),lc:r=>r.lc,epk:r=>r.v>=200?P.eng(r)/r.v:0,d:r=>r.t}[sort];const sg=S.dir==='asc'?1:-1,noLc=r=>sort==='lc'&&r.plat==='ig'?1:0;list=[...list].sort((a,b)=>noLc(a)-noLc(b)||sg*(key(a)-key(b))||(hits&&b.t-a.t));
  const qh=$('#qhint');if(qh){qh.hidden=!(hits&&fz.length);qh.innerHTML=fz.length?`Includes close spellings: ${fz.slice(0,3).map(([a,b])=>`<b>${esc(b)}</b> for “${esc(a)}”`).join(', ')}`:''}
  $('#cnt').textContent=`${list.length} posts`;const cb=$('#campBtn');if(cb){cb.hidden=!(S.q.trim()&&list.length);cb.onclick=()=>campaignSheet(S.q.trim(),L)}$('#plist').innerHTML=list.slice(0,S.limit).map(r=>postRow(r,0,sort,hits&&hits.get(r).hit)).join('')+(list.length>S.limit?`<button class="more" id="moreBtn">Show more</button>`:'')||'<p class="mut">No posts match.</p>';
  $$('#plist [data-post]').forEach(b=>b.onclick=()=>postSheet(b.dataset.post));const mb=$('#moreBtn');if(mb)mb.onclick=()=>{S.limit+=40;renderList(L)}}
// ---- drill-down sheets ----
function postSheet(id){const r=S.posts.find(x=>x.id===id);if(!r)return;const peers=S.posts.filter(x=>x.plat===r.plat&&x.page===r.page&&x.d>=P.addDays(r.d,-60)&&x.d<=P.addDays(r.d,60));const med=P.median(peers.map(x=>x.v));const x=med?r.v/med:0;
  const cell=(l,v)=>`<div><b>${v}</b><span>${l}</span></div>`;
  const shSt=[{l:r.plat==='ig'?'Likes':'Reactions',v:nf(r.rx)},{l:'Comments',v:nf(r.cm)},{l:'Shares',v:nf(r.sh)},...(r.plat==='ig'?[{l:'Saves',v:nf(r.sv)},{l:'Follows',v:nf(r.fo)}]:[{l:'Link clicks',v:nf(r.lc)}]),{l:'Eng / 1K',v:r.v?(P.eng(r)/r.v*1000).toFixed(1):'–'}];
  const share={kind:'post',plat:r.plat,kicker:`${acctName(r.plat,r.page)} · ${new Date(r.t).toLocaleTimeString('en-US',{timeZone:'Asia/Tokyo',hour:'numeric',minute:'2-digit'})} JST · ${r.type}`,range:P.fmtDate(r.d,{weekday:'short',year:'numeric'}),title:P.label(r),big:{v:P.fmt(r.v),l:'views'},note:x?{hi:x.toFixed(1)+'×',up:x>=1,rest:` the typical ${acctName(r.plat,r.page)} post around then`}:null,stats:shSt,caption:r.cap?(r.cap.length>=279?r.cap.replace(/\s+\S*$/,'')+'…':r.cap):'',thumb:r.id};
  openSheet(`<div class="mut sm"><span class="tag ${r.plat}">${r.plat==='fb'?'FACEBOOK':'INSTAGRAM'}</span>${esc(acctName(r.plat,r.page))} · ${P.fmtDate(r.d,{weekday:'short',year:'numeric'})} · ${new Date(r.t).toLocaleTimeString('en-US',{timeZone:'Asia/Tokyo',hour:'numeric',minute:'2-digit'})} JST · ${esc(r.type)}</div>
  <h3 style="margin-top:10px">${esc(P.label(r))}</h3><div class="bigline">${P.fmt(r.v)}<small>views</small></div>
  <p class="mut sm" style="margin:2px 0 14px">${x?`<b class="${x>=1?'up':'down'}">${x.toFixed(1)}×</b> the typical ${esc(acctName(r.plat,r.page))} post around then (median ${P.fmt(med)})`:''}</p>
  <div class="stats">${cell(r.plat==='ig'?'Likes':'Reactions',nf(r.rx))}${cell('Comments',nf(r.cm))}${cell('Shares',nf(r.sh))}${r.plat==='ig'?cell('Saves',nf(r.sv))+cell('Follows',nf(r.fo)):cell('Link clicks',nf(r.lc))}${cell('Eng / 1K',r.v?(P.eng(r)/r.v*1000).toFixed(1):'–')}${r.re?cell('Reach',nf(r.re)):''}</div>
  <div class="sec">Caption</div><p class="cap">${esc(r.cap||'No caption')}${r.cap.length>=279?'…':''}</p>${r.link?`<a class="btn" href="${esc(r.link)}" target="_blank" rel="noopener" style="margin-top:16px">Open the post</a>`:''}`,0,share)}
function accountSheet(key){const [plat,...rest]=key.split('|');const page=rest.join('|');const {L,C}=ctx(plat);const l=L.filter(r=>r.page===page),c=C.filter(r=>r.page===page);const t=P.totals(l),pc=P.totals(c);const ser=P.series(l,S.s,S.e,'v');const has=pc.n>0;
  const share={kind:'account',plat,kicker:'Account performance',range:P.rangeLabel(S.s,S.e),title:plat==='ig'?'@'+page:page,big:{v:P.fmt(t.v),l:'views',d:dd(t.v,pc.v,has)},stats:[{l:'Posts',v:nf(t.n),d:dd(t.n,pc.n,has)},{l:'Engagement',v:P.fmt(t.e),d:dd(t.e,pc.e,has)},plat==='ig'?{l:'Follows',v:nf(t.fo),d:dd(t.fo,pc.fo,has)}:{l:'Link clicks',v:nf(t.lc),d:dd(t.lc,pc.lc,has)},{l:'Eng / 1K',v:t.v?(t.e/t.v*1000).toFixed(1):'–'}],cmp:has?cmpLabel():null,chart:{pts:ser.pts,show:{fb:plat==='fb',ig:plat==='ig'}},chartTitle:'Daily views',list:[...l].sort((a,b)=>b.v-a.v).slice(0,6).map((r,i)=>({...shPost(r),rank:i+1})),listTitle:'Top posts'};
  openSheet(`<div class="mut sm"><span class="tag ${plat}">${plat==='fb'?'FACEBOOK PAGE':'INSTAGRAM'}</span>${P.rangeLabel(S.s,S.e)}</div><h3 style="margin-top:8px">${esc(plat==='ig'?'@'+page:page)}</h3>
  <div class="grid g4 tight">${[['Views',P.fmt(t.v),dl(t.v,pc.v,has)],['Posts',t.n,dl(t.n,pc.n,has)],['Engagement',P.fmt(t.e),dl(t.e,pc.e,has)],[plat==='ig'?'Follows':'Link clicks',nf(plat==='ig'?t.fo:t.lc),plat==='ig'?dl(t.fo,pc.fo,has):dl(t.lc,pc.lc,has)]].map(([a,b,d])=>`<div class="card kpi mini"><div class="l">${a}</div><div class="v">${b}</div><div class="d">${d}</div></div>`).join('')}</div>
  <div class="card chartbox" style="margin-top:12px"><div style="position:relative">${chartSVG(ser,600,150,{id:'a',both:1})}<div class="tip"></div></div></div>
  <div class="sec">Top posts</div>${[...l].sort((a,b)=>b.v-a.v).slice(0,6).map((r,i)=>postRow(r,i+1)).join('')||'<p class="mut">No posts in this range.</p>'}`,1,share);
  bindChart($('#sheet .chartbox'),ser,'v');$$('#sheet [data-post]').forEach(b=>b.onclick=()=>postSheet(b.dataset.post))}
function metricSheet(k){const {L,C:CL,t,c}=ctx();const val=r=>k==='epk'||k==='avg'||k==='ppd'?r.v:P.metric(r,k);const mk=['epk','avg','ppd'].includes(k)?'v':k;const name=(M[k]||{epk:['Engagement per 1K views'],avg:['Average views per post'],ppd:['Posts per day']}[k])[0];
  const pages=P.byPage(L).map(g=>({...g,val:k==='epk'?g.epk:k==='avg'?(g.n?g.v/g.n:0):k==='ppd'?g.n:g.rows.reduce((a,r)=>a+P.metric(r,mk),0)})).filter(g=>g.val>0).sort((a,b)=>b.val-a.val);const mx=Math.max(1,...pages.map(g=>g.val));
  const ser=P.series(L,S.s,S.e,mk);const top=[...L].sort((a,b)=>val(b)-val(a)).slice(0,5);
  const days=Math.max(1,Math.round((new Date(S.e)-new Date(S.s))/864e5)+1),cdays=Math.max(1,Math.round((new Date(S.ce)-new Date(S.cs))/864e5)+1);const hasC=c.n>0;
  const tot=k==='epk'?(t.v?t.e/t.v*1000:0):k==='avg'?(t.n?t.v/t.n:0):k==='ppd'?t.n/days:L.reduce((a,r)=>a+P.metric(r,k),0);const ctot=k==='epk'?(c.v?c.e/c.v*1000:0):k==='avg'?(c.n?c.v/c.n:0):k==='ppd'?c.n/cdays:CL.reduce((a,r)=>a+P.metric(r,k),0);
  const share={kind:'metric',plat:S.plat==='all'?null:S.plat,kicker:S.plat==='all'?'All accounts · Facebook + Instagram':(S.plat==='fb'?'Facebook':'Instagram')+' accounts',range:P.rangeLabel(S.s,S.e),title:name,big:{v:k==='epk'||k==='ppd'?tot.toFixed(1):P.fmt(tot),l:k==='epk'?'per 1K views':k==='ppd'?'posts / day':(M[k]?M[k][1]:'views'),d:dd(tot,ctot,hasC)},cmp:hasC?cmpLabel():null,stats:[],chart:{pts:ser.pts,show:shShow(0)},chartTitle:'Daily '+(M[mk]?M[mk][1]:'views'),bars:pages.slice(0,8).map(g=>({name:acctName(g.plat,g.page),plat:g.plat,val:k==='epk'?g.val.toFixed(1):P.fmt(g.val),frac:g.val/mx})),barsTitle:'By account'};
  openSheet(`<div class="mut sm">${P.rangeLabel(S.s,S.e)}</div><h3 style="margin-top:8px">${name}</h3>
  <div class="card chartbox"><div style="position:relative">${chartSVG(ser,600,150,{id:'m'})}<div class="tip"></div></div></div>
  <div class="sec">By account</div>${pages.map(g=>`<button class="hbar" data-acct="${g.plat}|${esc(g.page)}"><span class="nm"><span class="tag ${g.plat}">${g.plat.toUpperCase()}</span>${esc(acctName(g.plat,g.page))}</span><span class="tr"><span class="${g.plat}" style="width:${g.val/mx*100}%"></span></span><b>${k==='epk'?g.val.toFixed(1):P.fmt(g.val)}</b></button>`).join('')}
  ${['epk','avg','ppd'].includes(k)?'':`<div class="sec">Top posts by ${name.toLowerCase()}</div>${top.map((r,i)=>postRow(r,i+1,{e:'e',lc:'lc',v:'v'}[k])).join('')}`}`,1,share);
  bindChart($('#sheet .chartbox'),ser,mk);$$('#sheet [data-acct]').forEach(b=>b.onclick=()=>accountSheet(b.dataset.acct));$$('#sheet [data-post]').forEach(b=>b.onclick=()=>postSheet(b.dataset.post))}
function listSheet(title,list){const sorted=[...list].sort((a,b)=>b.v-a.v);const share={kind:'list',kicker:'Post group',range:P.rangeLabel(S.s,S.e),title,big:{v:nf(list.length),l:'posts'},note:{rest:`Median ${P.fmt(P.median(list.map(r=>r.v)))} views · ${P.fmt(list.reduce((a,r)=>a+r.v,0))} total views`},stats:[],list:sorted.slice(0,10).map((r,i)=>({...shPost(r),rank:i+1})),listTitle:'Top posts'};openSheet(`<h3>${esc(title)}</h3><p class="mut sm">${list.length} posts · median ${P.fmt(P.median(list.map(r=>r.v)))} views</p>${[...list].sort((a,b)=>b.v-a.v).map(r=>postRow(r)).join('')}`,1,share);$$('#sheet [data-post]').forEach(b=>b.onclick=()=>postSheet(b.dataset.post))}
// ---- campaign search + report ----
// One shared engine (core.js P.searchIndex / P.search) behind every search box. Field weights: titles/hashtags 1, caption .75, metadata .5.
const PF={cap:[.75,r=>r.cap,{lead:12}],tags:[1,r=>(String(r.cap).match(/#\w+/g)||[]).join(' '),{sub:1}],acct:[.5,r=>`${r.plat==='ig'?'instagram ig @'+r.page:'facebook fb '+r.page} ${r.type}`],date:[.5,r=>P.dateWords(r.d)]};
const postSearch=(q,o)=>P.search(P.searchIndex(S.posts,PF),q,Object.assign({tie:r=>r.t,cap:1e5},o));
// commas or | separate alternatives; within one, every word must match (& = and, typos and partial words allowed). Returns a test on a post.
function qMatch(q){if(!String(q).trim())return ()=>true;const ids=new Set(postSearch(q).map(x=>x.item.id));return r=>ids.has(r.id)}
const EF={name:[1,c=>c.name],links:[.75,c=>Object.values(c.titles||{}).join(' · ')],meta:[.5,c=>`email newsletter ${c.full||''} ${c.subject||''} ${P.dateWords(c.date)}`]};
const emSearch=q=>{const cs=emCamps();return P.search(P.searchIndex(cs,EF,'em|'+cs.map(c=>c.id).join()),q,{cap:1e4}).map(x=>Object.assign(x,{item:cs[x.i]}))};
const WF={title:[1,p=>wTitle(p[0])],path:[.8,p=>p[0],{sub:1}]};
const QSTOP=new Set('and the of a an at in on for to with by annual mccs okinawa event events our your you we'.split(' '));
// campaign-to-website matching skips generic words (annual, mccs, okinawa, event, 16th) so only the event name has to match a page
function pageMatch(q,pages){const qq=String(q).split(/[,|]/).map(a=>P.sNorm(a).split(' ').filter(w=>w&&!QSTOP.has(w)&&!/^\d+(st|nd|rd|th)?$/.test(w)).join(' ')).filter(Boolean).join(',');if(!qq)return null;
  const ids=new Set(P.search(P.searchIndex(pages,WF,'wc|'+pages.length+'|'+(pages[0]||[])[0]+'|'+pages.map(p=>p[1]).join()),qq,{cap:1e4}).map(x=>pages[x.i]));return p=>ids.has(p)}
function campaignSheet(q,L){const m=qMatch(q);const af=r=>S.acct==='all'||r.plat+'|'+r.page===S.acct;
  const inR=L.filter(r=>af(r)&&m(r)),all=P.filter(S.posts,'1900-01-01','2999-12-31',S.plat).filter(r=>af(r)&&m(r));
  const more=all.length>inR.length,useAll=(S.campAll&&more)||!inR.length;const list=(useAll?all:inR).slice().sort((a,b)=>b.v-a.v);if(!list.length)return;
  const ds=list.map(r=>r.d).sort(),s=ds[0],e=ds[ds.length-1];const t=P.totals(list);const fb=P.totals(list.filter(r=>r.plat==='fb')),ig=P.totals(list.filter(r=>r.plat==='ig'));
  const span=P.daysBetween(s,e),pad=span<10?3:0;const ser=P.series(list,P.addDays(s,-pad),P.addDays(e,pad),'v');
  const pages=P.byPage(list).map(g=>({...g,v:g.rows.reduce((a,r)=>a+r.v,0)})).sort((a,b)=>b.v-a.v);const mx=Math.max(1,...pages.map(g=>g.v));
  let web=null;if(S.web.length){const ws=P.addDays(s,-14),we=P.addDays(e,7);const wr=P.webRange(S.web,ws,we);const pm=wr&&wr.pgDays&&pageMatch(q,wr.pages);if(pm){const pg=wr.pages.filter(pm);web={s:ws,e:we,pages:pg,v:pg.reduce((a,p)=>a+p[1],0),u:pg.reduce((a,p)=>a+p[2],0)}}}
  const rangeTxt=P.rangeLabel(s,e),epk=t.v?(t.e/t.v*1000).toFixed(1):'–';
  const kp=[['Avg views / post',P.fmt(t.n?t.v/t.n:0)],['Engagement',P.fmt(t.e)],['Posts',nf(t.n)],['Eng / 1K',epk],['Shares',nf(t.sh)],['Link clicks (FB)',nf(t.lc)],['Saves (IG)',nf(t.sv)],web&&web.v?['Website page views',P.fmt(web.v)]:['Accounts',nf(pages.length)]];
  const plat=[['fb','Facebook',fb],['ig','Instagram',ig]].filter(x=>x[2].n);const pmx=Math.max(1,...plat.map(x=>x[2].v));
  const share={kind:'campaign',plat:plat.length===1?plat[0][0]:null,kicker:'Campaign report · '+nf(t.n)+' posts · '+pages.length+' accounts',range:rangeTxt,title:q,big:{v:P.fmt(t.v),l:'views'},note:{rest:`${plat.map(x=>`${x[1]} ${P.fmt(x[2].v)}`).join(' · ')}${web&&web.v?` · Website ${P.fmt(web.v)} page views`:''}`},
    stats:[{l:'Posts',v:nf(t.n)},{l:'Engagement',v:P.fmt(t.e)},{l:'Eng / 1K',v:epk},{l:'Shares',v:nf(t.sh)},web&&web.v?{l:'Web page views',v:P.fmt(web.v)}:{l:'Avg views / post',v:P.fmt(t.n?t.v/t.n:0)},{l:'Accounts',v:nf(pages.length)}],
    chart:{pts:ser.pts,show:{fb:!!fb.n,ig:!!ig.n}},chartTitle:'Views by posting day',bars:pages.slice(0,6).map(g=>({name:acctName(g.plat,g.page),plat:g.plat,val:P.fmt(g.v),frac:g.v/mx})),barsTitle:'By account',list:list.slice(0,6).map((r,i)=>({...shPost(r),rank:i+1})),listTitle:'Top posts'};
  openSheet(`<div class="mut sm"><span class="tag camp">CAMPAIGN</span>${rangeTxt} · ${nf(t.n)} posts · ${pages.length} account${pages.length===1?'':'s'}${S.acct!=='all'?' (filtered)':''}</div>
  <h3 style="margin-top:8px">“${esc(q)}”</h3>
  ${more?`<div class="seg" style="margin:6px 0 4px"><button class="chip sm ${useAll?'':'on'}" data-ca="0" ${inR.length?'':'disabled'}>This date range · ${inR.length}</button><button class="chip sm ${useAll?'on':''}" data-ca="1">All dates · ${all.length}</button></div>`:''}
  <div class="bigline">${P.fmt(t.v)}<small>views</small></div>
  <div class="grid g4 tight">${kp.map(([a,b])=>`<div class="card kpi mini"><div class="l">${a}</div><div class="v">${b}</div></div>`).join('')}</div>
  ${plat.length>1?`<div class="sec">Facebook vs Instagram</div>${plat.map(([k,n,x])=>`<div class="hbar"><span class="nm"><span class="tag ${k}">${k.toUpperCase()}</span>${n} · ${x.n}</span><span class="tr"><span class="${k}" style="width:${x.v/pmx*100}%"></span></span><b>${P.fmt(x.v)}</b></div>`).join('')}`:''}
  <div class="sec">Views by posting day</div><div class="card chartbox"><div style="position:relative">${chartSVG(ser,600,150,{id:'cp',both:1})}<div class="tip"></div></div></div>
  <div class="sec">By account</div>${pages.map(g=>`<button class="hbar" data-acct="${g.plat}|${esc(g.page)}"><span class="nm"><span class="tag ${g.plat}">${g.plat.toUpperCase()}</span>${esc(acctName(g.plat,g.page))} · ${g.rows.length}</span><span class="tr"><span class="${g.plat}" style="width:${g.v/mx*100}%"></span></span><b>${P.fmt(g.v)}</b></button>`).join('')}
  ${S.web.length?`<div class="sec">Website pages</div>${web?(web.pages.length?`<p class="mut sm" style="margin-top:-4px">Pages whose address matches, ${P.rangeLabel(web.s,web.e)} (2 weeks before the first post to 1 week after the last).</p><div class="scroll"><table><tr><th>Page</th><th>Views</th><th>Users</th><th>Avg time</th></tr>${web.pages.slice(0,12).map(p=>`<tr><td class="path">${esc(p[0])}</td><td>${nf(p[1])}</td><td>${nf(p[2])}</td><td>${p[3]?Math.round(p[3])+'s':'–'}</td></tr>`).join('')}</table></div>`:'<p class="mut sm">No website page address matches this search for those dates.</p>'):`<p class="mut sm">${pm?'No daily website page data covers these dates yet.':'Search words are too general to match website pages.'}</p>`}`:''}
  ${(()=>{const em=emSearch(q).map(x=>x.item).sort((a,b)=>a.date<b.date?1:-1);return em.length?`<div class="sec">Email newsletter</div>${em.map(x=>`<button class="hbar" data-ecamp="${esc(x.id)}"><span class="nm"><span class="tag em">EMAIL</span>${esc(x.name)} · ${P.fmtDate(x.date)}</span><span class="tr"><span style="width:${x.openRate||0}%;background:${EMC}"></span></span><b>${pct1(x.openRate)}</b></button>`).join('')}`:''})()}<div class="sec">All matching posts</div>${list.slice(0,S.campLim||25).map((r,i)=>postRow(r,i+1)).join('')}${list.length>(S.campLim||25)?`<button class="more" id="campMore">Show all ${list.length}</button>`:''}`,1,share);
  bindChart($('#sheet .chartbox'),ser,'v');$$('#sheet [data-acct]').forEach(b=>b.onclick=()=>accountSheet(b.dataset.acct));$$('#sheet [data-post]').forEach(b=>b.onclick=()=>postSheet(b.dataset.post));$$('#sheet [data-ecamp]').forEach(b=>b.onclick=()=>emailCampSheet(b.dataset.ecamp));
  $$('#sheet [data-ca]').forEach(b=>b.onclick=()=>{S.campAll=b.dataset.ca==='1';S.campLim=25;campaignSheet(q,L)});const cm=$('#campMore');if(cm)cm.onclick=()=>{S.campLim=1e4;campaignSheet(q,L);S.campLim=25}}
// ---- import ----
function bindDrop(){const d=$('#drop');if(!d)return;$('#pick').onclick=()=>$('#file').click();d.ondragover=e=>{e.preventDefault();d.classList.add('over')};d.ondragleave=()=>d.classList.remove('over');d.ondrop=e=>{e.preventDefault();d.classList.remove('over');importFiles(e.dataTransfer.files)}}
document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer.files.length)importFiles(e.dataTransfer.files)});
$('#file').onchange=e=>{importFiles(e.target.files);e.target.value=''};
async function importFiles(files){files=[...files];const msgs=[];for(const f of files){try{const txt=await f.text();if(P.emailKind(txt)){S.email=P.mergeEmail(S.email,P.parseEmail(txt,f.name));const n=S.email.note;delete S.email.note;await DB.set('email',S.email);impMark('email',f.name);msgs.push(n==='hub'?'Email: year-to-date report added':n.startsWith('links:')?`Email link clicks added to ${n.slice(6)}`:`Email campaign added: ${n}`);continue}if(P.isGA4(txt)){const w=P.parseGA4(txt);S.web=P.mergeWeb(S.web,w);await DB.set('web',S.web);impMark('web',f.name);msgs.push(`Website${w.kind==='ch'?' traffic by day':w.kind==='pg'?' pages by day':''}: ${P.rangeLabel(w.start,w.end)} added`);continue}const m=P.mapRows(P.parseCSV(txt));const r=P.merge(S.posts,m.rows);S.posts=dropExcluded(r.posts);impMark(m.plat,f.name);msgs.push(`${m.plat==='fb'?'Facebook':'Instagram'}: ${r.add} new, ${r.upd} updated`)}catch(err){msgs.push(`${f.name}: ${err.message}`)}}
  await DB.set('posts',S.posts);closeSheet();render();toast(msgs.join(' · '))}
function importSheet(){closeSettings(false);openSheet(`<button class="back" id="toSet">‹ Data &amp; sync</button><h3>Import exports</h3><div class="drop" id="drop">Drop Facebook, Instagram, GA4 website, or Constant Contact email CSVs here<br><button class="btn" id="pick" style="margin-top:12px">Choose files</button></div><div class="sec">How to export</div><p class="mut" style="font-size:14px;line-height:1.6;margin:0">Meta Business Suite › Insights › Content › Export data. Facebook tab, all Pages, Content level Post, Data view Lifetime, Filter Creation date. Repeat on the Instagram tab. Re-importing updates metrics; nothing is duplicated.</p><p class="mut" style="font-size:14px;line-height:1.6">Website: Google Analytics › Reports snapshot › pick the date range › Share › Download CSV. Weekly (Monday, last week) works best. For day-by-day pages and sources, also export Traffic acquisition and Pages and screens with Date added as a second column.</p>`);bindDrop();$('#toSet').onclick=()=>settings('data')}
function rangeSheet(){const end=dataEnd()||P.todayKey();openSheet(`<h3>Choose a range</h3><div class="range left">${PRESETS.filter(p=>p[0]!=='custom').map(([k,l])=>`<button data-sp="${k}" class="${S.preset===k?'on':''}">${l}</button>`).join('')}</div>
 <div class="sec">Custom</div><div class="opt"><span>From</span><input type="date" id="ds" value="${S.s||P.addDays(end,-29)}"></div><div class="opt"><span>To</span><input type="date" id="de" value="${S.e||end}"></div><button class="btn wide" id="apply">Apply</button>`);
 $$('[data-sp]').forEach(b=>b.onclick=()=>{S.preset=b.dataset.sp;localStorage.pulsePreset=S.preset;closeSheet();render()});
 $('#apply').onclick=()=>{let s=$('#ds').value,e=$('#de').value;if(!s||!e)return;if(s>e)[s,e]=[e,s];S.preset='custom';S.s=s;S.e=e;closeSheet();render()}}
// ---- settings ----
function seg(name,opts,val){return `<div class="seg" data-seg="${name}">${opts.map(([k,l])=>`<button data-val="${k}" class="${String(val)===String(k)?'on':''}">${l}</button>`).join('')}</div>`}
// ---- data status: what each source holds and when it last arrived ----
function impMark(k,file){let o={};try{o=JSON.parse(localStorage.pulseImp||'{}')}catch(e){}o[k]={file,at:new Date().toISOString()};localStorage.pulseImp=JSON.stringify(o)}
const socSrc=p=>{const l=S.posts.filter(r=>r.plat===p);if(!l.length)return null;const ds=l.map(r=>r.d).sort();return {lab:'Posts through',through:ds[ds.length-1],what:`${nf(l.length)} posts, ${P.rangeLabel(ds[0],ds[ds.length-1])}`}};
const webSrc=()=>{if(!S.web.length)return null;const st=S.web.map(x=>x.start).sort()[0],en=S.web.map(x=>x.end).sort().pop(),k=new Set(S.web.map(x=>x.kind||'snap'));return {through:en,what:`${[k.has('ch')||k.has('pg')?'daily traffic & pages':'',k.has('snap')||[...k].some(x=>!['ch','pg'].includes(x))?'weekly snapshots':''].filter(Boolean).join(' + ')}, ${P.rangeLabel(st,en)}`}};
const emSrc=()=>{const h=emHub(),cs=emCamps();if(!h&&!cs.length)return null;const en=[h&&h.end,...cs.map(c=>c.date)].filter(Boolean).sort().pop();return {through:en,what:[h?`year-to-date summary through ${P.fmtDate(h.end)}`:'',cs.length?`${cs.length} campaign report${cs.length>1?'s':''}, latest ${cs[0].name} (${P.fmtDate(cs[0].date)})`:''].filter(Boolean).join(' · ')}};
// Signage (signage.js): SG.meta is the plaintext signage.json the GitHub Action writes about every 15 min
// ({checked: ISO time of the last ScreenCloud check, updated: when the screens last changed}); SG.data is the decrypted
// signage.bin ({total, live, offline, groups[], items[]}). Read-only here.
const sgSrc=()=>{const d=SG.data,m=SG.meta||{},at=m.checked||(d&&d.checked);if(!d||!at)return null;const g=d.groups||[],n=(d.items||[]).length;
  return {lab:'Last synced',through:at,time:1,what:`${nf(d.total)} screens (${nf(d.live)} live) · ${g.length} location${g.length===1?'':'s'} · ${nf(n)} in rotation`,how:'Syncs from ScreenCloud by itself about every 15 minutes'}};
const sgEmptyTxt=()=>!localStorage.pulsePass?'Unlock Pulse with your passcode to load signage.':SG.err==='nodata'?'Signage has not been published yet.':SG.err==='fail'?'Signage could not be loaded. It retries on the next check.':'Checking ScreenCloud…';
// Every data source Pulse knows about, in display order. Data & sync and the health summary are built from this list,
// so adding a source is a one-entry change. Fields: k, l (label), short (used in sentences), due (days a source stays
// "Current"), late (extra days before "Out of date", default 7), auto (syncs by itself; ages in hours), get() returning
// {lab, through, what, how?, time?} or null, empty() for the no-data line. planned:true shows "Not set up yet · coming
// soon" with a neutral chip and never counts as an update due.
// Next: Strategic Events from its Google Sheet, published encrypted like the other sources (see /mockup/hub/ and
// files/hub-mockup/design-notes.md). When it ships, replace the planned entry with {k:'events', ..., due, get:evSrc}.
// v36: the Strategic Events entry below is replaced by a live source in hub.js (evSrc)
const SOURCES=[
 {k:'fb',l:'Facebook',due:8,get:()=>socSrc('fb')},
 {k:'ig',l:'Instagram',due:8,get:()=>socSrc('ig')},
 {k:'web',l:'Website (GA4)',short:'Website',due:8,get:webSrc},
 {k:'email',l:'Email (Constant Contact)',short:'Email',due:10,get:emSrc},
 {k:'signage',l:'Digital Signage (ScreenCloud)',short:'Signage',due:2,late:5,auto:1,get:sgSrc,empty:sgEmptyTxt},
 {k:'events',l:'Strategic Events',short:'Events',planned:1,note:'Not set up yet · coming soon'}
];
function dataStatus(){let src={},imp={};try{src=JSON.parse(localStorage.pulseSrc||'{}')}catch(e){}try{imp=JSON.parse(localStorage.pulseImp||'{}')}catch(e){}
 const today=P.todayKey(),age=d=>d?Math.round((new Date(today)-new Date(d))/864e5):null;
 return SOURCES.map(s=>{const base={k:s.k,l:s.l,short:s.short||s.l,auto:!!s.auto};
  if(s.planned)return Object.assign(base,{planned:1,note:s.note,stt:['plan','Coming soon']});
  const d=s.get(),a=d?(s.auto?(Date.now()-new Date(d.through))/864e5:age(d.through)):null,late=s.late==null?7:s.late;
  const stt=!d?['none','No data']:a<=s.due?['ok','Current']:a<=s.due+late?['due',s.auto?'Sync late':'Update due']:['old','Out of date'];
  if(d&&d.how)return Object.assign(base,{d,a,stt,file:null,when:null,how:d.how});
  const r=src[s.k]||{},i=imp[s.k];const pub=r.published||null,loc=i&&(!pub||i.at>pub)?i:null;
  return Object.assign(base,{d,a,stt,empty:s.empty?s.empty():'Nothing loaded yet.',file:loc?loc.file:r.file||null,when:loc?loc.at:pub||(d&&localStorage.pulseSynced)||null,how:loc?'imported on this device':pub||localStorage.pulseSynced?'published by Hark':''})})}
const fdtJ=t=>new Date(t).toLocaleString('en-US',{timeZone:'Asia/Tokyo',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const fTimeJ=t=>{const d=new Date(t),k=x=>x.toLocaleDateString('en-CA',{timeZone:'Asia/Tokyo'});return k(d)===k(new Date())?d.toLocaleTimeString('en-US',{timeZone:'Asia/Tokyo',hour:'numeric',minute:'2-digit'}):fdtJ(t)};
const agoTxt=x=>{if(x.a==null)return '';if(x.auto){const h=x.a*24;return h<1?'under an hour ago':h<36?Math.round(h)+(Math.round(h)===1?' hour ago':' hours ago'):Math.round(x.a)+' days ago'}return x.a===0?'today':x.a===1?'1 day ago':x.a+' days ago'};
function statusRows(){return dataStatus().map(x=>{
 if(x.planned)return `<div class="ssrc"><div class="ssh"><b>${esc(x.l)}</b><span class="spill plan">${x.stt[1]}</span></div><p>${esc(x.note)}</p></div>`;
 return `<div class="ssrc"><div class="ssh"><b>${esc(x.l)}</b><span class="spill ${x.stt[0]}">${x.stt[1]}</span></div>${x.d?`<p>${x.d.lab||'Data through'} <b>${x.d.time?fdtJ(x.d.through)+' JST':P.fmtDate(x.d.through,{year:'numeric'})}</b>${x.a!=null?' · '+agoTxt(x):''}</p><p>${esc(x.d.what)}</p>${x.when?`<p class="f">Updated ${fdtJ(x.when)} JST${x.how?' · '+x.how:''}</p>`:x.how?`<p class="f">${esc(x.how)}</p>`:''}${x.file?`<p class="f">${esc(x.file)}</p>`:''}`:`<p class="f">${esc(x.empty)}</p>`}</div>`}).join('')}
function healthHTML(open){const rows=dataStatus().filter(x=>!x.planned),bad=rows.filter(x=>x.stt[0]==='due'||x.stt[0]==='old'),none=rows.filter(x=>x.stt[0]==='none');
 const why=x=>x.auto?`${x.short} last synced ${agoTxt(x)}`:`${x.short} is ${x.a} day${x.a===1?'':'s'} old`;
 const head=bad.length?`${bad.length} update${bad.length===1?'':'s'} due`:none.length===rows.length?'No data loaded yet':'All sources current';
 const sub=bad.length?bad.slice(0,2).map(why).join('. ')+'.'+(bad.length+none.length<rows.length?' Others current.':''):none.length&&none.length<rows.length?`${none.map(x=>x.short).join(', ')}: nothing loaded yet.`:none.length?'Import exports or unlock to sync.':'Everything is up to date.';
 const dot=bad.some(x=>x.stt[0]==='old')?'old':bad.length?'due':none.length===rows.length?'none':'ok';
 return `<button class="shhb" id="spHb" aria-expanded="${open?'true':'false'}" aria-controls="spHl"><span class="shdot ${dot}" aria-hidden="true"></span><span class="shtxt"><b>${head}</b><span>${sub}</span></span>${SI('chev','schev')}</button>
 <div class="shl" id="spHl">${rows.map(x=>`<div class="shsrc"><span>${esc(x.short)}<small>${x.d?(x.d.time?'Synced '+fTimeJ(x.d.through):'Through '+P.fmtDate(x.d.through)):'Nothing loaded'}</small></span><span class="spill ${x.stt[0]}">${x.stt[1]}</span></div>`).join('')}<button class="shmore" data-go="data">Details in Data &amp; sync ${SI('chev')}</button></div>`}
// ---- settings: grouped list with drill-in pages (phone) / two panes (desktop 1100px+) ----
const SI=(id,c)=>`<svg class="si${c?' '+c:''}" aria-hidden="true"><use href="#si-${id}"/></svg>`;
const SPRITE=`<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="si-chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></symbol><symbol id="si-chevL" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></symbol>
<symbol id="si-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
<symbol id="si-cmp" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></symbol>
<symbol id="si-doc" viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></symbol>
<symbol id="si-tv" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></symbol>
<symbol id="si-sync" viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/></symbol>
<symbol id="si-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.7"/><path d="M12 17.2v.1"/></symbol>
<symbol id="si-trash" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/></symbol>
<symbol id="si-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></symbol>
<symbol id="si-key" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/></symbol>
<symbol id="si-imp" viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M4 19h16"/></symbol>
<symbol id="si-exp" viewBox="0 0 24 24"><path d="M12 15V4M7 9l5-5 5 5"/><path d="M4 19h16"/></symbol>
<symbol id="si-rst" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></symbol>
<symbol id="si-out" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></symbol>
<symbol id="si-eye" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
<symbol id="si-list" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></symbol>
<symbol id="si-warn" viewBox="0 0 24 24"><path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.1"/></symbol></svg>`;
const THM=[['dusk','Dusk','#c98f6b 0%,#6d5a7a 28%,#2b3352 55%,#0e1420 85%'],['dawn','Dawn','#ffd3a5 0%,#f2a7a0 26%,#8f8bc6 56%,#34416e 92%'],['ocean','Ocean','#6fd6d6 0%,#2b7a9e 28%,#173a5e 58%,#07142a 90%'],['forest','Forest','#b9cc8c 0%,#55806a 28%,#1f3b33 58%,#0a1613 90%'],['midnight','Midnight','#1b2131 0%,#090b11 50%,#000 85%']];
const RSN={navy:'Navy',light:'Clean',dusk:'Dusk'};
const RSEC=[['summary','Executive summary'],['chart','Views chart'],['eff','Platform efficiency'],['top','Top 3 posts'],['web','Website at a glance'],['email','Email at a glance'],['watch','Watch list'],['team','Page 2: account detail']];
const TVD={all:'Every channel on one screen',signage:'Screens live and what is playing',social:'Facebook and Instagram',web:'GA4 traffic and top pages',cycle:'Cycles through each view'};
const SOP_URL='https://docs.google.com/document/d/1G-gQ9kEomm7TqIuzi4PqhZOfnoUY9KYRUoqqWHcylog/edit?usp=drivesdk';
const secOn=()=>RSEC.filter(([k])=>CFG.rSec[k]).length;
const radioRow=(attr,k,on,label,sub)=>`<div class="srow" role="radio" tabindex="${on?0:-1}" aria-checked="${on}" data-${attr}="${k}"><span class="slb">${label}${sub?`<small>${sub}</small>`:''}</span>${SI('check','stick')}</div>`;
function cmpRanges(){const keep=CFG.compare,out={};for(const k of ['prior','yoy']){CFG.compare=k;setRange();out[k]=`${P.rangeLabel(S.s,S.e)} vs ${P.rangeLabel(S.cs,S.ce)}`}CFG.compare=keep;setRange();return out}
// Settings groups: one row on the top level and one drill-in page each. sec puts rows into the same inset list;
// parent marks a deeper page (no top-level row). To add a group later (e.g. "Events": event matching and the review
// queue), add one entry here with its page() and bind(); the list, navigation and desktop panes pick it up as is.
const SET_GROUPS=[
 {id:'appearance',sec:1,title:'Appearance',icon:'<span class="smsky"></span>',val:()=>(THM.find(t=>t[0]===CFG.theme)||THM[0])[1],
  page:()=>`<div class="sgt">App theme</div><div class="slist"><div class="sthemes" role="radiogroup" aria-label="App theme">${THM.map(([k,l,g])=>`<button class="sth" role="radio" aria-checked="${CFG.theme===k}" tabindex="${CFG.theme===k?0:-1}" data-th="${k}"><span class="ssk" style="background:radial-gradient(130% 80% at 50% 110%,${g})"><span class="sck">${SI('check')}</span></span>${l}</button>`).join('')}</div></div><p class="sfoot">Pulse changes the moment you choose. The PDF report has its own style under Report.</p>`,
  bind:()=>spRadios('[data-th]','th',v=>{CFG.theme=v;document.body.dataset.theme=v})},
 {id:'compare',sec:1,title:'Comparisons',icon:SI('cmp'),val:()=>CFG.compare==='yoy'?'Last year':'Previous period',
  page:()=>{const r=cmpRanges();return `<div class="sgt">Compare each range against</div><div class="slist noic" role="radiogroup" aria-label="Compare against">${radioRow('cmp','prior',CFG.compare!=='yoy','Previous period',r.prior)}${radioRow('cmp','yoy',CFG.compare==='yoy','Same period last year',r.yoy)}</div><p class="sfoot">Sets every “vs” figure on the home screen and in the PDF report. Year to date always compares with the same period last year.</p>`},
  bind:()=>spRadios('[data-cmp]','cmp',v=>{CFG.compare=v;render()})},
 {id:'report',sec:2,title:'Report',icon:SI('doc'),val:()=>`${RSN[CFG.rStyle]||'Navy'} · ${secOn()} of ${RSEC.length}`,
  page:()=>`<div class="sgt">Style</div><div class="slist"><div class="srstyles" role="radiogroup" aria-label="PDF report style">${Object.entries(RSN).map(([k,l])=>`<button class="srs" role="radio" aria-checked="${CFG.rStyle===k}" tabindex="${CFG.rStyle===k?0:-1}" data-rsty="${k}"><span class="sa4 sst-${k}" aria-hidden="true"><span class="h"></span><span class="t"></span><span class="k"><i></i><i></i><i></i><i></i></span><span class="c"><svg viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M0 32 L18 26 L34 29 L52 15 L70 19 L86 8 L100 12" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/></svg></span><span class="c2"><i></i><i></i></span></span>${l}</button>`).join('')}</div>
   <button class="srow sline" id="spPrev"><span class="sic">${SI('eye')}</span><span class="slb">Preview report</span>${SI('chev','schev')}</button></div>
   <div class="sgt">Text on the cover</div><div class="slist"><label class="sfld"><span>Title</span><input data-cf="rTitle" value="${esc(CFG.rTitle)}"></label><label class="sfld"><span>Header</span><input data-cf="rHead" value="${esc(CFG.rHead)}"></label><label class="sfld"><span>Organization</span><input data-cf="rOrg" value="${esc(CFG.rOrg)}"></label></div>
   <div class="sgt">Sections</div><div class="slist noic">${RSEC.map(([k,l])=>`<label class="srow"><span class="slb">${l}</span><span class="ssw"><input type="checkbox" role="switch" data-rsec="${k}" ${CFG.rSec[k]?'checked':''}><i></i></span></label>`).join('')}</div><p class="sfoot" id="spSecFoot">${secOn()} of ${RSEC.length} sections on. Page 2 adds an account scorecard for the team.</p>
   <div class="sgt">Watch list</div><div class="slist"><button class="srow" data-go="watch"><span class="sic">${SI('list')}</span><span class="slb">Default lines<small>Pre-filled on every report; edit per report too</small></span><span class="sval" data-v="watch">${CFG.watch.filter(Boolean).length}</span>${SI('chev','schev')}</button></div>`,
  bind:()=>{spRadios('[data-rsty]','rsty',v=>CFG.rStyle=v);
   $$('#setp [data-cf]').forEach(i=>i.oninput=()=>{CFG[i.dataset.cf]=i.value;spSave(true)});
   $$('#setp [data-rsec]').forEach(i=>i.onchange=()=>{CFG.rSec[i.dataset.rsec]=i.checked?1:0;spSave();$('#spSecFoot').textContent=`${secOn()} of ${RSEC.length} sections on. Page 2 adds an account scorecard for the team.`});
   $('#spPrev').onclick=()=>{closeSettings(false);buildReport()}}},
 {id:'watch',parent:'report',title:'Watch list',
  page:()=>`<p class="splede">These lines start every report’s Watch list. One idea per line.</p><div class="slist">${CFG.watch.map((w,i)=>`<label class="sfld"><span>Line ${i+1}</span><textarea rows="2" data-wl="${i}">${esc(w)}</textarea></label>`).join('')}</div>`,
  bind:()=>$$('#setp [data-wl]').forEach(t=>t.oninput=()=>{CFG.watch[+t.dataset.wl]=t.value;spSave(true)})},
 {id:'tv',sec:2,title:'TV & signage',icon:SI('tv'),val:()=>`${TVS.length} views`,
  page:()=>`<p class="splede">Full-screen dashboards for an office TV. Open one in the TV’s browser, unlock once, and it refreshes itself.</p><div class="slist">${TVS.map(([k,l])=>`<a class="srow" href="?tv=${k}" target="_blank" rel="noopener"><span class="sic">${SI(k==='cycle'?'sync':'tv')}</span><span class="slb">${l}<small>${TVD[k]||''}</small></span>${SI('out','schev sout')}<span class="sr">(opens in a new tab)</span></a>`).join('')}</div><p class="sfoot">On the TV, double-click anywhere to go full screen.</p>`},
 {id:'data',sec:3,title:'Data & sync',icon:SI('sync'),val:()=>localStorage.pulseSynced?'Synced '+fTimeJ(localStorage.pulseSynced):`${nf(S.posts.length)} posts`,
  page:()=>{const end=dataEnd();return `<div class="sgt">Sources</div><div class="slist" id="spSrc">${statusRows()}</div><p class="sfoot">Social and website exports are due weekly on Monday. Current means data within 8 days (email, 10). Signage syncs by itself, so it is current when under 2 days old.</p>
   <div class="sgt">Sync</div><div class="slist">${localStorage.pulseSynced?`<div class="srow"><span class="sic">${SI('sync')}</span><span class="slb">Synced from Hark<small id="spWhen">${fdtJ(localStorage.pulseSynced)} JST</small></span><button class="sact" id="spCheck">Check now</button></div>`:`<div class="srow"><span class="sic">${SI('sync')}</span><span class="slb">Not synced from Hark<small>Unlock with the passcode to get published data</small></span></div>`}${localStorage.pulsePass?`<div class="srow"><span class="sic">${SI('key')}</span><span class="slb">Passcode<small>Saved on this device</small></span><button class="stxt" id="spForget">Forget</button></div>`:''}</div>
   <div class="sgt">On this device</div><div class="slist"><div class="sstat"><b>${nf(S.posts.length)}</b><span>posts${end?' · through '+P.fmtDate(end,{year:'numeric'}):''}</span></div>
   <button class="srow sline" id="spImp"><span class="sic">${SI('imp')}</span><span class="slb">Import CSV exports<small>Facebook, Instagram, GA4 website, Constant Contact email</small></span>${SI('chev','schev')}</button>
   <button class="srow" id="spBk"><span class="sic">${SI('exp')}</span><span class="slb">Back up to a file</span>${SI('chev','schev')}</button>
   <button class="srow" id="spRs"><span class="sic">${SI('rst')}</span><span class="slb">Restore a backup</span>${SI('chev','schev')}</button></div><p class="sfoot">To remove everything, use Danger zone at the bottom of Settings.</p>`},
  bind:()=>{$('#spImp').onclick=importSheet;$('#spBk').onclick=backupFile;$('#spRs').onclick=()=>$('#bfile').click();
   const c=$('#spCheck');if(c)c.onclick=async()=>{c.textContent='Checking…';c.disabled=true;localStorage.pulseSynced='';await sync();await sgLoad(true);spRefreshData();const w=$('#spWhen');if(w)w.textContent='Just now · up to date';toast('Up to date')};
   const f=$('#spForget');if(f)f.onclick=()=>{delete localStorage.pulsePass;delete localStorage.pulseSynced;closeSettings(true);toast('Passcode forgotten on this device')}}},
 {id:'help',sec:3,title:'Help',icon:SI('help'),val:()=>'Staff guide',
  page:()=>`<div class="sgt">Staff guide</div><div class="slist"><a class="srow" href="${SOP_URL}" target="_blank" rel="noopener"><span class="sic">${SI('doc')}</span><span class="slb">Open the Pulse SOP<small>What Pulse is, how the weekly update works, and what to do if the Admin is away</small></span>${SI('out','schev sout')}<span class="sr">(opens in a new tab)</span></a></div><p class="sprivacy">${SI('lock')}<span>MCCS Pulse never uploads your data. It lives only in this browser.</span></p>`}
];
const SP={stack:['root'],dirty:false,st:0,y0:null};
const spDesk=()=>matchMedia('(min-width:1100px)').matches;
const spG=id=>SET_GROUPS.find(g=>g.id===id);
const spTitle=id=>id==='root'?'Settings':spG(id).title;
function backupFile(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S.posts)],{type:'application/json'}));a.download=`mccs-pulse-backup-${P.todayKey()}.json`;a.click()}
function spSave(quiet){saveCfg();SP.dirty=true;spVals();clearTimeout(SP.st);SP.st=setTimeout(()=>{const s=$('#spSaved');if(!s)return;s.classList.add('on');$('#spSavedT').textContent='Saved';SP.st=setTimeout(()=>{s.classList.remove('on');$('#spSavedT').textContent='Saves as you go'},1700)},quiet?500:0)}
function spVals(){SET_GROUPS.forEach(g=>{const v=$(`#setp .sroot [data-v="${g.id}"]`);if(v&&g.val)v.textContent=g.val()});const w=$('#setp [data-v=watch]');if(w)w.textContent=CFG.watch.filter(Boolean).length}
function spRadios(sel,attr,apply){const items=$$('#setp '+sel);items.forEach((b,i)=>{
 b.onclick=()=>{items.forEach(x=>{x.setAttribute('aria-checked',x===b);x.tabIndex=x===b?0:-1});apply(b.dataset[attr]);spSave()};
 b.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();b.click();return}const d={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key];if(!d)return;e.preventDefault();const n=items[(i+d+items.length)%items.length];n.focus();n.click()}})}
function spPage(g){return `<section class="spane spage" id="sp-${g.id}" aria-labelledby="spt-${g.id}"><div class="swrap">${g.parent?`<button class="spback" data-go="${g.parent}">${SI('chevL')}${esc(spTitle(g.parent))}</button>`:''}<h2 class="sptitle" id="spt-${g.id}" tabindex="-1">${esc(g.title)}</h2>${g.page()}</div></section>`}
function spRoot(){const secs=[...new Set(SET_GROUPS.filter(g=>!g.parent).map(g=>g.sec))];
 return `<nav class="spane sroot" id="sp-root" aria-label="Settings groups"><div class="shealth" id="spHealth">${healthHTML(false)}</div>
 ${secs.map(s=>`<div class="slist">${SET_GROUPS.filter(g=>g.sec===s&&!g.parent).map(g=>`<button class="srow" data-go="${g.id}"><span class="sic">${g.icon}</span><span class="slb">${esc(g.title)}</span><span class="sval" data-v="${g.id}">${esc(g.val())}</span>${SI('chev','schev')}</button>`).join('')}</div>`).join('')}
 <div class="sgt sdgt">Danger zone</div><div class="slist sdanger"><button class="srow" id="spErRow"><span class="sic">${SI('trash')}</span><span class="slb">Erase all data on this device</span></button></div><p class="sfoot">Asks first, and offers a backup before anything is removed.</p>
 <p class="sprivacy">${SI('lock')}<span>MCCS Pulse never uploads your data. It lives only in this browser.</span></p></nav>`}
function spEraseHTML(){const pass=!!localStorage.pulsePass;return `<div class="sconf"><div class="swi" aria-hidden="true">${SI('warn')}</div><h2 id="spETitle">Erase all data on this device?</h2><p id="spEBody">This removes everything Pulse holds in this browser. It can’t be undone.</p>
 <ul><li><span>Posts</span><b>${nf(S.posts.length)}</b></li><li><span>Website, email and signage data</span><b>Removed</b></li><li><span>Saved passcode</span><b>${pass?'Forgotten':'None saved'}</b></li></ul>
 <p class="ssm">Data Hark publishes syncs back after you unlock again. CSV files imported only on this device do not.</p>
 <div class="scbtns"><button class="sb-back" id="spEBk">Back up first</button><button class="sb-erase" id="spEGo">Erase all data</button><button class="sb-cancel" id="spECancel">Cancel</button></div></div>`}
async function eraseAll(){S.posts=[];S.web=[];S.email=[];S.ev=null;SG.data=null;SG.meta=null;SG.priv=null;
 await DB.set('posts',[]);await DB.set('web',[]);await DB.set('email',[]);await DB.set('events',null);await DB.set('sg:data',null);
 ['pulseImp','pulsePass','pulseSynced','pulseWebSynced','pulseEmailSynced','pulseEventsSynced','pulseEvDec','pulseSgLog'].forEach(k=>localStorage.removeItem(k));
 closeSettings(false);render();toast('Erased everything Pulse held on this device')}
function spNav(focus){const desk=spDesk(),cur=SP.stack[SP.stack.length-1],page=desk&&cur==='root'?'appearance':cur,par=spG(page)&&spG(page).parent;
 $$('#setp .spage').forEach(p=>{const id=p.id.slice(3);p.classList.toggle('cur',id===page);p.classList.toggle('under',!desk&&SP.stack.includes(id)&&id!==page)});
 $('#sp-root').classList.toggle('under',!desk&&cur!=='root');
 $$('#setp .sroot .srow[data-go]').forEach(r=>{const on=desk&&(r.dataset.go===page||r.dataset.go===par);r.classList.toggle('sel',on);if(on)r.setAttribute('aria-current','page');else r.removeAttribute('aria-current')});
 $('#spTitle').textContent=desk?'Settings':spTitle(cur);
 const prev=SP.stack[SP.stack.length-2]||'root',b=$('#spBack');b.classList.toggle('show',!desk&&cur!=='root');$('#spBackL').textContent=spTitle(prev);b.setAttribute('aria-label','Back to '+spTitle(prev));
 spLined();if(focus){const t=desk||cur!=='root'?$('#spt-'+page):null;if(t)t.focus({preventScroll:true})}}
function spGo(id){const g=spG(id);if(spDesk())SP.stack=g&&g.parent?['root',g.parent,id]:['root',id];else SP.stack.push(id);const p=$('#sp-'+id);if(p)p.scrollTop=0;spNav(true)}
function spBack(){if(SP.stack.length>1&&!spDesk()){SP.stack.pop();spNav(true);return true}return false}
function spLined(){const p=$$('#setp .spane').find(x=>getComputedStyle(x).visibility!=='hidden'&&(x.classList.contains('cur')||(x.id==='sp-root'&&!x.classList.contains('under'))));$('#spHead').classList.toggle('lined',spDesk()||!!(p&&p.scrollTop>4))}
function spBindGo(root){(root||$('#setp')).querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>spGo(b.dataset.go))}
function spBindHealth(){const hb=$('#spHb');hb.onclick=()=>{const h=$('#spHealth'),x=!h.classList.contains('exp');h.classList.toggle('exp',x);hb.setAttribute('aria-expanded',x)};spBindGo($('#spHealth'))}
function spRefreshData(){if(!$('#setp')||!$('#setp').classList.contains('show'))return;const h=$('#spHealth'),open=h.classList.contains('exp');h.innerHTML=healthHTML(open);spBindHealth();
 const g=spG('data'),p=$('#sp-data');if(p){const top=p.scrollTop;p.outerHTML=spPage(g);spBindGo($('#sp-data'));g.bind();$('#sp-data').addEventListener('scroll',spLined,{passive:true});spNav();$('#sp-data').scrollTop=top}spVals()}
function settings(start){start=typeof start==='string'?start:null;closeSheet();let p=$('#setp');
 if(!p){p=document.createElement('section');p.id='setp';p.className='setp';p.setAttribute('role','dialog');p.setAttribute('aria-modal','true');p.setAttribute('aria-labelledby','spTitle');p.tabIndex=-1;document.body.appendChild(p);
  const ed=document.createElement('dialog');ed.id='spErase';ed.className='serase';ed.setAttribute('aria-labelledby','spETitle');ed.setAttribute('aria-describedby','spEBody');document.body.appendChild(ed);
  ed.addEventListener('click',e=>{if(e.target===ed)ed.close()});addEventListener('resize',()=>{if($('#setp').classList.contains('show'))spNav()})}
 SP.dirty=false;SP.stack=start?(spG(start)&&spG(start).parent?['root',spG(start).parent,start]:['root',start]):['root'];
 p.innerHTML=`${SPRITE}<header class="shead" id="spHead"><span class="sgrab" aria-hidden="true"></span><div class="shrow">
  <button class="sback" id="spBack" aria-label="Back to Settings">${SI('chevL')}<span id="spBackL">Settings</span></button>
  <div class="shtitle"><b id="spTitle">Settings</b><div class="ssaved" id="spSaved" aria-live="polite">${SI('check')}<span id="spSavedT">Saves as you go</span></div></div>
  <div class="shside"><span class="skbd" aria-hidden="true">esc</span><button class="sdone" id="spDone">Done</button></div></div></header>
  <div class="sstage">${spRoot()}${SET_GROUPS.map(spPage).join('')}</div>`;
 spBindGo();spBindHealth();SET_GROUPS.forEach(g=>g.bind&&g.bind());
 $$('#setp .spane').forEach(x=>x.addEventListener('scroll',spLined,{passive:true}));
 $('#spBack').onclick=spBack;$('#spDone').onclick=()=>closeSettings(true);
 $('#spErRow').onclick=()=>{const d=$('#spErase');d.innerHTML=spEraseHTML();d.showModal();$('#spECancel').focus();
  $('#spECancel').onclick=()=>{d.close();$('#spErRow').focus()};$('#spEBk').onclick=()=>{d.close();backupFile();toast('Backup saved. Erase is still here if you want it.')};$('#spEGo').onclick=()=>{d.close();eraseAll()}};
 // swipe down on the header to close (phone and tablet)
 const hd=$('#spHead');
 hd.onpointerdown=e=>{if(spDesk()||e.target.closest('button'))return;SP.y0=e.clientY;p.classList.add('drag');hd.setPointerCapture(e.pointerId)};
 hd.onpointermove=e=>{if(SP.y0==null)return;p.style.transform=`translateY(${Math.max(0,e.clientY-SP.y0)}px)`};
 hd.onpointerup=hd.onpointercancel=e=>{if(SP.y0==null)return;const d=e.clientY-SP.y0;SP.y0=null;p.classList.remove('drag');p.style.transform='';if(d>110)closeSettings(true)};
 spNav();$('#app').inert=true;$('#dock').inert=true;$('#scrim').classList.add('show');requestAnimationFrame(()=>{p.classList.add('show');setTimeout(()=>{if(start)spNav(true);else p.focus({preventScroll:true})},60)});
 // signage status comes from signage.js; load it if this device has not checked in the last 10 minutes
 if(localStorage.pulsePass&&!SG.loading&&(!SG.meta||Date.now()-new Date(SG.meta.checked)>10*6e4))sgLoad().then(()=>spRefreshData())}
function closeSettings(done){const p=$('#setp');if(!p||!p.classList.contains('show'))return;const d=$('#spErase');if(d&&d.open)d.close();
 p.classList.remove('show');p.style.transform='';if(!$('#sheet').classList.contains('show'))$('#scrim').classList.remove('show');$('#app').inert=false;$('#dock').inert=false;
 if(done){render();if(SP.dirty)toast('Settings saved');const g=$('#gear');if(g)g.focus({preventScroll:true})}SP.dirty=false}
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const p=$('#setp');
 if(p&&p.classList.contains('show')){const d=$('#spErase');if(d&&d.open)return;e.preventDefault();if(!spBack())closeSettings(true);return}
 if($('#sheet').classList.contains('show'))closeSheet()});
$('#bfile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const arr=JSON.parse(await f.text());const r=P.merge(S.posts,arr);S.posts=r.posts;await DB.set('posts',S.posts);closeSheet();render();toast(`Restored ${arr.length} posts`)}catch(err){toast('That file is not an MCCS Pulse backup')}e.target.value=''};
// ---- report ----
function buildReport(){const {L,C,t,c}=ctx('all');const sm=P.summary(t,c,L,S.s,S.e),top=topMix(L,3),pages=P.byPage(L),rl=P.rangeLabel(S.s,S.e),R=CFG.rSec;
 const dd=(a,b)=>{const p=P.pct(a,b);if(p==null||!isFinite(p)||!c.n)return ['—','var(--sub)'];return [(p>=0?'+':'−')+Math.abs(p).toFixed(1)+'%',p>=0?'#16b85c':'#f0363b']};
 const K=[['Views',P.fmt(t.v),`FB ${P.fmt(t.fb.v)} · IG ${P.fmt(t.ig.v)}`,dd(t.v,c.v)],['Engagement',P.fmt(t.e),'reactions, comments, shares, saves',dd(t.e,c.e)],['Link Clicks',nf(t.lc),'Facebook, all Pages',dd(t.lc,c.lc)],['IG Follows',nf(t.fo),'from Instagram posts',dd(t.fo,c.fo)]];
 const ser=P.series(L,S.s,S.e,'v');const pts=ser.pts,mx=Math.max(1,...pts.map(p=>Math.max(p.fb,p.ig)));const W=300,H=110;
 const ln=k=>pts.map((p,i)=>`${i?'L':'M'}${(pts.length>1?i/(pts.length-1)*W:0).toFixed(1)},${(H-(p[k]/mx)*(H-12)).toFixed(1)}`).join('');
 const why=r=>[r.lc>50?`${r.lc} link clicks`:'',P.eng(r)>200?`${P.fmt(P.eng(r))} engagements`:'',r.plat==='ig'?'Instagram '+(r.type||'').replace('IG ',''):(r.type||'')].filter(Boolean).slice(0,2).join(' · ');
 const chart=`<div class="wc"><span class="pill" style="min-width:40%">Views by ${ser.step}</span><svg viewBox="-4 -4 ${W+8} ${H+22}" style="width:100%"><path d="${ln('fb')}" fill="none" stroke="var(--cfb)" stroke-width="2.2"/><path d="${ln('ig')}" fill="none" stroke="var(--cig)" stroke-width="2.2"/>${pts.length?`<text x="0" y="${H+14}" font-size="7" fill="currentColor" opacity=".6">${P.fmtDate(pts[0].k)}</text><text x="${W}" y="${H+14}" font-size="7" fill="currentColor" opacity=".6" text-anchor="end">${P.fmtDate(pts[pts.length-1].k)}</text>`:''}<text x="0" y="4" font-size="7" fill="currentColor" opacity=".6">${P.fmt(mx)}</text></svg><div style="font-size:7pt;display:flex;gap:5mm;justify-content:center"><span style="color:var(--cfb);font-weight:700">● Facebook ${P.fmt(t.fb.v)}</span><span style="color:var(--cig);font-weight:700">● Instagram ${P.fmt(t.ig.v)}</span></div></div>`;
 const eff=`<div class="wc eff"><span class="pill">Platform Efficiency</span><div style="font-size:8pt;font-weight:700">Instagram share of the total</div>${[['Posts',t.ig.n,t.n],['Views',t.ig.v,t.v],['Engagement',t.ig.e,t.e]].map(([l,a,b])=>`<div class="row"><span>${l}</span><b>IG ${b?Math.round(a/b*100):0}%</b></div><div class="bar"><span style="width:${b?a/b*100:0}%"></span></div>`).join('')}</div>`;
 const summ=`<div class="wc"><h4>Executive Summary</h4><p class="lab">What happened</p><ul contenteditable>${sm.out.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="lab">What we'll do next</p><ul contenteditable>${(sm.next.length?sm.next:['Add a next action']).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
 const tops=`<div class="wc"><span class="pill" style="min-width:55%">Top Performing Posts</span><div class="tp">${top.map(r=>`<div class="it"><div class="ph" data-th="${esc(r.id)}" title="Tap to replace the image"><span class="cap">${esc(P.label(r))}</span></div><div class="vp">${P.fmt(r.v)}</div><div class="wy"><b><i class="rtag ${r.plat}">${r.plat==='fb'?'FB':'IG'}</i>${esc(acctName(r.plat,r.page))}</b><span contenteditable>${esc(why(r))}</span></div></div>`).join('')}</div></div>`;
 const WX=wctx(),wr=WX.wr,wHas=webHas(wr)&&R.web;const wp=wHas?wr.pages.filter(p=>!P.NOISE_PAGES.includes(p[0])):[];
 const insL=WX.ins.lift&&WX.ins.lift.pct>0?`Strong social days brought ${WX.ins.lift.pct.toFixed(0)}% more website visitors.`:WX.ins.sends?`Social media sent ${P.fmt(WX.ins.sends.social)} visits, ${(WX.ins.sends.share*100).toFixed(1)}% of all website visits.`:'';
 const wband=wHas?`<div class="wc wband"><span class="pill" style="min-width:40%">Website at a Glance</span><div class="w5"><div><b>${P.fmt(wr.t.users)}</b><small>visitors</small></div><div><b>${P.fmt(wr.t.sessions)}</b><small>visits</small></div><div><b>${secs(wr.t.eng)}</b><small>avg time on site</small></div><div><b>${P.fmt(wr.t.social)}</b><small>visits from social</small></div><div class="wins" contenteditable>${insL?`<b>Insight:</b> ${esc(insL)}`:`<b>Top page:</b> ${esc(wTitle((wp[0]||['—'])[0]))}`}</div></div>${wr.exact?'':`<div class="wnote">Website figures cover ${wr.covered} of ${wr.days} days in this range.</div>`}</div>`:'';
 const eH=emHub(),eIn=emCamps().filter(x=>x.date>=S.s&&x.date<=S.e),eHas=R.email&&(eIn.length||eH);let eband='';
 if(eHas){const sum=k=>eIn.reduce((a,x)=>a+(x[k]||0),0);let cells,ins,note;
  if(eIn.length){const dl=sum('delivered'),best=[...eIn].sort((a,b)=>b.openRate-a.openRate)[0];cells=[[nf(sum('sends')),'emails sent'],[pct1(dl?eIn.reduce((a,x)=>a+x.openRate*(x.delivered||0),0)/dl:null),'open rate'],[pct1(dl?eIn.reduce((a,x)=>a+x.clickRate*(x.delivered||0),0)/dl:null),'click rate'],[nf(sum('clicks')),'clicks']];
   ins=eIn.length>1?`<b>Best send:</b> ${esc(best.name)}, ${pct1(best.openRate)} opened`:`<b>${esc(best.name)}</b> (${P.fmtDate(best.date)}): ${pct1(best.openRate)} opened${best.links&&best.links.length?`, top link ${esc(((best.titles||{})[best.links[0][0]])||'clicked '+best.links[0][1]+'x')}`:''}`;
   note=`${eIn.length} newsletter campaign${eIn.length>1?'s':''} sent in this range.`}
  else{const lc=emCamps()[0];cells=[[P.fmt(eH.sent),'emails sent'],[eH.openRate+'%','open rate'],[eH.clickRate+'%','click rate'],[nf(eH.unsubs),'unsubscribes']];
   ins=lc?`<b>Latest:</b> ${esc(lc.name)}, ${pct1(lc.openRate)} opened`:`<b>Opens:</b> ${eH.dev.openMobile}% on mobile`;note=`Year to date, ${P.rangeLabel(eH.start,eH.end)}. No campaign reports in this range.`}
  eband=`<div class="wc wband eband"><span class="pill" style="min-width:40%">Email at a Glance</span><div class="w5">${cells.map(([v,l])=>`<div><b>${v}</b><small>${l}</small></div>`).join('')}<div class="wins" contenteditable>${ins}</div></div><div class="wnote">${note}</div></div>`}
 const pair=(a,b,cls)=>a&&b?`<div class="${cls}">${a}${b}</div>`:(a||b?`<div class="r1">${a||b}</div>`:'');
 const fbN=new Set(L.filter(r=>r.plat==='fb').map(r=>r.page)).size,igN=new Set(L.filter(r=>r.plat==='ig').map(r=>r.page)).size;
 $('#pages').innerHTML=`<div class="a4 st-${CFG.rStyle}${wHas||eHas?' hasweb':''}${wHas&&eHas?' hasem':''}"><div class="hd"><b>${esc(CFG.rHead)}</b><span>${rl}</span></div><div class="ttl">${esc(CFG.rTitle)}</div><div class="st">${esc(CFG.rOrg)} · ${fbN} Facebook Pages · ${igN} Instagram accounts · ${t.n} posts${wHas?' · website':''}${eHas?' · newsletter':''}</div>
 <div class="k4">${K.map(([l,v,s,[d,col]])=>`<div class="wc"><span class="pill" style="min-width:80%">${l}</span><div class="bv">${v}</div><div class="bs">${s}</div><div class="bd" style="color:${col}">${d}</div><div class="bds">vs ${P.rangeLabel(S.cs,S.ce)}</div></div>`).join('')}</div>
 ${pair(R.chart?chart:'',R.eff?eff:'','r2')}${pair(R.summary?summ:'',R.top?tops:'','r3')}${wband}${eband}
 ${R.watch?`<div class="wc wl"><h4 style="font-size:11pt">Watch List</h4><div class="g3" contenteditable>${CFG.watch.filter(Boolean).map(w=>`<div>${esc(w)}</div>`).join('')}</div></div>`:''}
 <div class="ft">Source: Meta Business Suite post exports${wHas?' · Google Analytics 4':''}${eHas?' · Constant Contact':''} · ${rl} · generated ${P.fmtDate(P.todayKey(),{year:'numeric'})}</div></div>
 ${R.team?`<div class="a4 st-${CFG.rStyle}${wHas?' hasweb':''}"><div class="hd"><b>${esc(CFG.rHead)}</b><span>${rl}</span></div><div class="ttl" style="font-size:28pt">Account Detail</div><div class="st">Team page</div>
 <div class="wc"><span class="pill" style="min-width:30%">Account Scorecard</span><table><tr><th style="text-align:left">Account</th><th>Posts</th><th>Views</th><th>Median</th><th>Engagement</th><th>Eng/1K</th><th>Link clicks</th></tr>${pages.slice(0,wHas?12:15).map(g=>`<tr><td>${g.plat==='ig'?'IG @'+esc(g.page):'FB '+esc(P.short(g.page))}</td><td>${g.n}</td><td>${nf(g.v)}</td><td>${P.fmt(g.med)}</td><td>${nf(g.e)}</td><td>${g.epk.toFixed(1)}</td><td>${g.lc||'–'}</td></tr>`).join('')}</table></div>
 <div class="wc" style="margin-top:3mm"><span class="pill" style="min-width:30%">Top ${wHas?8:10} Posts</span><table><tr><th style="text-align:left">Post</th><th>Account</th><th>Date</th><th>Views</th><th>Eng.</th><th>Clicks</th></tr>${[...L].sort((a,b)=>b.v-a.v).slice(0,wHas?8:10).map(r=>`<tr><td>${esc(P.label(r))}</td><td>${esc(acctName(r.plat,r.page))}</td><td>${P.fmtDate(r.d)}</td><td>${nf(r.v)}</td><td>${P.eng(r)}</td><td>${r.lc||'–'}</td></tr>`).join('')}</table></div>${wHas?`<div class="r2" style="margin-top:3mm"><div class="wc"><span class="pill" style="min-width:40%">Top Website Pages</span><table><tr><th style="text-align:left">Page</th><th>Views</th><th>${wr.src==='daily'?'Avg time':'Users'}</th></tr>${wp.slice(0,6).map(p=>`<tr><td>${esc(wTitle(p[0]))}</td><td>${nf(p[1])}</td><td>${wr.src==='daily'?secs(p[3]):nf(p[2])}</td></tr>`).join('')}</table></div><div class="wc"><span class="pill" style="min-width:50%">Where Visits Come From</span><table><tr><th style="text-align:left">Source</th><th>Visits</th><th>Share</th></tr>${wr.srcList.filter(([k])=>wr.groups[k]).map(([k,l])=>`<tr><td>${l}</td><td>${nf(wr.groups[k])}</td><td>${(wr.groups[k]/wr.t.sessions*100).toFixed(0)}%</td></tr>`).join('')}</table></div></div>`:''}
 <div class="ft">Source: Meta Business Suite post exports · team use</div></div>`:''}`;
 $$('.tp .ph').forEach(ph=>ph.onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>{const f=i.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{ph.style.backgroundImage=`url(${rd.result})`;ph.classList.add('img')};rd.readAsDataURL(f)};i.click()});
 $$('.tp .ph[data-th]').forEach(async ph=>{const u=await thumbFor(ph.dataset.th);if(u&&!ph.classList.contains('img')){ph.style.backgroundImage=`url(${u})`;ph.classList.add('img')}});
 $('#rStyleBar').innerHTML=[['navy','Navy'],['light','Clean'],['dusk','Dusk']].map(([k,l])=>`<button data-rsb="${k}" class="${CFG.rStyle===k?'on':''}">${l}</button>`).join('');
 $$('[data-rsb]').forEach(b=>b.onclick=()=>{CFG.rStyle=b.dataset.rsb;saveCfg();$$('.a4').forEach(a=>a.className='a4 st-'+CFG.rStyle+(a.classList.contains('hasweb')?' hasweb':'')+(a.classList.contains('hasem')?' hasem':''));$$('[data-rsb]').forEach(x=>x.classList.toggle('on',x===b))});
 $('#report').classList.add('show');fit()}
function fit(){const w=Math.min(window.innerWidth-20,794);$$('.a4').forEach(a=>{const s=w/794;a.style.transform=s<1?`scale(${s})`:'';a.style.marginBottom=s<1?`${-(1-s)*1123+16}px`:'16px'})}
window.addEventListener('resize',()=>{if($('#report').classList.contains('show'))fit()});
window.addEventListener('beforeprint',()=>$$('.a4').forEach(a=>{a.style.transform='';a.style.marginBottom='0'}));window.addEventListener('afterprint',fit);
$('#rBack').onclick=()=>$('#report').classList.remove('show');$('#rPrint').onclick=()=>window.print();
// ---- dock ----
$$('#dock [data-v]').forEach(b=>b.onclick=()=>{if(b.dataset.dm){S.mode=b.dataset.dm;localStorage.pulseMode=S.mode;if(S.mode==='social'){S.socSub='posts';localStorage.pulseSocSub='posts'}}if(b.dataset.v==='events')S.evSub='list';if(b.dataset.v==='programs')S.progSub='list';S.view=b.dataset.v;render();scrollTo({top:0,behavior:'smooth'})});
{const bc=$('#bChan');if(bc)bc.onclick=()=>hubChannels()}
$('#bReport').onclick=buildReport;
// ---- website (GA4) ----
const WEBC='#9fe3c4';
function wctx(){setRange();const wr=P.webRange(S.web,S.s,S.e),wc=P.webRange(S.web,S.cs,S.ce);const ins=P.webInsights(S.posts,wr,S.s,S.e);return {wr,wc,ins}}
const webHas=wr=>!!(wr&&wr.t&&wr.set&&wr.set.length);
const dailySum=wr=>wr?wr.daily.reduce((a,d)=>a+d[1]+d[2],0):0;
const wdl=(a,b,ok)=>ok?dl(a,b,true):'<span class="mut">&nbsp;</span>';
const wcmp=(wr,wc)=>webHas(wr)&&webHas(wc)&&wr.src===wc.src&&wr.coverage>=.8&&wc.coverage>=.8;
const wCap=x=>decodeURIComponent(x).replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const wTitle=t=>{if(t==='MCCS Okinawa')return 'MCCS Okinawa (home)';if(t[0]!=='/')return t.replace(/^MCCS\s+/,'');const g=t.split(/[?#]/)[0].split('/').filter(Boolean);if(!g.length)return 'Home page';
  const last=g[g.length-1];if(/^[0-9a-f-]{20,}$/i.test(last))return wCap(g[g.length-2]||'page')+' (event page)';return g.length>1?`${wCap(last)} · ${wCap(g[g.length-2])}`:wCap(last)};
const wSoc=wr=>wr&&wr.src==='daily'?'social media':'Facebook & Instagram';
const secs=v=>v>=60?`${Math.floor(v/60)}m ${Math.round(v%60)}s`:`${Math.round(v)}s`;
function buckets(daily,s,e,fn){const n=P.daysBetween(s,e);const step=n>92?7:1;const out=[];
  for(let k=s,i=0;k<=e;k=P.addDays(k,step),i++){const ke=P.addDays(k,step-1);out.push({k,v:fn(k,ke<e?ke:e)})}return {pts:out,step:step===7?'week':'day'}}
function lineSVG(series,w,h){const n=series[0].pts.length;if(n<2)return '<p class="mut sm">Not enough days to chart yet.</p>';
  const path=(pts,mx)=>pts.map((p,i)=>`${i?'L':'M'}${(i/(n-1)*w).toFixed(1)},${(h-(p.v/mx)*(h-14)-2).toFixed(1)}`).join('');
  return `<svg class="wline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:auto">${series.map((s,j)=>{const mx=Math.max(1,...s.pts.map(p=>p.v));const d=path(s.pts,mx);
    return (s.fill?`<path d="${d}L${w},${h}L0,${h}Z" fill="${s.c}" opacity=".14"/>`:'')+`<path d="${d}" fill="none" stroke="${s.c}" stroke-width="2.2" vector-effect="non-scaling-stroke"/>`}).join('')}
    </svg><div class="wax"><span>${P.fmtDate(series[0].pts[0].k)}</span><span>${P.fmtDate(series[0].pts[n-1].k)}</span></div>`}
function webVisitSeries(wr){const dm=new Map(wr.daily.map(d=>[d[0],d[1]+d[2]]));return buckets(wr.daily,S.s,S.e,(a,b)=>{let t=0;for(let k=a;k<=b;k=P.addDays(k,1))t+=dm.get(k)||0;return t})}
function srcStack(g,L){L=L||P.SRC;const tot=L.reduce((a,[k])=>a+(g[k]||0),0)||1;
  return `<div class="wstack">${L.map(([k,,c])=>g[k]?`<i style="flex:${g[k]};background:${c}"></i>`:'').join('')}</div>
  <div class="wleg">${L.filter(([k])=>g[k]).map(([k,l,c])=>`<span><i style="background:${c}"></i>${l}<b>${P.fmt(g[k])}</b><em>${Math.round(g[k]/tot*100)}%</em></span>`).join('')}</div>`}
function insightCards(ins){const c=[];
  if(ins.lift&&isFinite(ins.lift.pct))c.push(['Big post days',ins.lift.pct>=0?`+${ins.lift.pct.toFixed(0)}% website visitors on strong social days`:`Strong social days didn't lift the website (${ins.lift.pct.toFixed(0)}%)`,`The top 20% of social days averaged ${nf(ins.lift.big)} visitors a day, vs ${nf(ins.lift.other)} on other days. An association, not proof.`]);
  if(ins.sends&&ins.sends.social)c.push(['Social sends',`${P.fmt(ins.sends.social)} visits came from social media`,`${(ins.sends.share*100).toFixed(1)}% of all visits.${ins.sends.fb!=null?` Facebook ${P.fmt(ins.sends.fb)}, Instagram ${P.fmt(ins.sends.ig)}.`:' Facebook and Instagram are counted together in daily data.'}`]);
  if(ins.follow&&ins.follow.length>=2){const f=ins.follow,mx=f[0].per;c.push(['Who follows through',`${f[0].label} fans click through most${f[f.length-1].per<f[0].per/3?`, ${f[f.length-1].label} fans the least`:''}`,`<div class="wcmp">${f.slice(0,8).map(r=>`<span>${esc(r.label)}</span><div class="wbar"><i style="width:${Math.max(3,r.per/mx*100)}%"></i></div><b>${Math.round(r.per)}</b>`).join('')}</div>Website page views per 1,000 social views.`,1]);}
  if(ins.timing){const t=ins.timing;c.push(['Timing',t.peakSocial===t.peakWeb?`Social and the website both peak on ${WD[t.peakWeb]}`:`Social peaks ${WD[t.peakSocial]}, the website peaks ${WD[t.peakWeb]}`,`Average website visitors by day: ${t.avg.map((x,i)=>`${WD[i]} ${P.fmt(x.w)}`).join(' · ')}.${t.peakSocial!==t.peakWeb?` Post website-driving content on ${WD[t.peakWeb]}.`:''}`]);}
  return c.map(([t,h,s,raw])=>`<div class="card ins"><div class="it">${t}</div><div class="ih">${esc(h)}</div><div class="is">${raw?s:esc(s)}</div></div>`).join('')}
function webSwitch(){return `<div class="wswitch"><button data-mode="social" class="${S.mode!=='web'?'on':''}">Social</button><button data-mode="web" class="${S.mode==='web'?'on':''}">Web</button></div>`}
function exploreWeb(){const {wr,wc,ins}=wctx();const head=`<div class="xlead"><div class="hero small"><h1>Web</h1><div class="sub">your website, by the numbers</div></div>${modeSwitch()}${header(null,true)}</div>`;
  if(!S.web.length)return head+`<div class="card" style="margin-top:20px"><h2>No website data yet</h2><p class="mut">Upload a GA4 Reports snapshot CSV in Settings › Import, or wait for Monday's sync.</p></div>`;
  if(!wr||(!webHas(wr)&&!wr.daily.length))return head+`<div class="card" style="margin-top:20px"><h2>No website data for this range</h2><p class="mut">Website data covers ${S.web.map(x=>P.rangeLabel(x.start,x.end)).join(', ')}.</p></div>`;
  const has=webHas(wr),ok=wcmp(wr,wc),t=has?wr.t:null,ct=ok?wc.t:{};
  const mini=(l,v,d,s)=>`<div class="card kpi mini nt"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div>${s?`<div class="s">${s}</div>`:''}</div>`;
  const ser=webVisitSeries(wr),soc=buckets(wr.daily,S.s,S.e,(a,b)=>S.posts.reduce((x,r)=>x+(r.d>=a&&r.d<=b?r.v:0),0));
  const pages=has?wr.pages.filter(p=>!P.NOISE_PAGES.includes(p[0])):[];
  return head+`${has&&!wr.exact?`<p class="mut sm" style="text-align:center;margin:-4px 0 0">Website data covers ${wr.covered} of ${wr.days} days in this range</p>`:''}
  <div class="grid g4">${has?mini('Visitors',P.fmt(t.users),wdl(t.users,ct.users,ok),wr.src==='daily'?`${P.fmt(t.newUsers)} new · daily counts added`:`${P.fmt(t.newUsers)} new`)+mini('Visits',P.fmt(t.sessions),wdl(t.sessions,ct.sessions,ok),'sessions')+mini('Time on site',secs(t.eng),wdl(t.eng,ct.eng,ok),wr.src==='daily'?'avg per visit':'avg per visitor')+mini('From social',P.fmt(t.social),wdl(t.social,ct.social,ok),wr.src==='daily'?'social media visits':'Facebook + Instagram visits')
    :mini('Daily visitors',P.fmt(dailySum(wr)),'','sum of daily visitors')}</div>
  <div class="cols"><div class="card nt"><h2>Visitors over time<small>by ${ser.step}</small></h2>${lineSVG([{pts:ser.pts,c:WEBC,fill:1}],640,170)}</div>
   <div class="card nt"><h2>Where visits come from<small>sessions</small></h2>${has?srcStack(wr.groups,wr.srcList)+(wr.src==='daily'?`<p class="mut sm">Other sites includes the 192.0.2.1 placeholder address, which sends a large share of referral visits. Worth a look with the web team.</p>`:`<p class="mut sm">192.0.2.1 is a placeholder address, not a real site, so it's kept apart. Worth a look with the web team.</p>`):'<p class="mut">Arrives with an upload covering this range.</p>'}</div></div>
  ${has?`<div class="card nt" style="margin-top:14px"><h2>Pages<small>${nf(pages.length)} shown · search</small></h2><div class="filters"><input id="wq" type="search" placeholder="Search pages" value="${esc(S.wq||'')}"></div><div id="evfwe"></div><div id="wplist"></div><p class="mut sm">${(()=>{const nz=wr.pages.find(p=>P.NOISE_PAGES.includes(p[0]));return nz&&nz[1]?`The “fb” page (${P.fmt(nz[1])} views) looks like a tracking artifact and is left out.`:''})()}${wr.src==='daily'&&wr.pgDays<wr.days?` Pages cover ${wr.pgDays} of ${wr.days} days.`:''}</p></div>`:''}
  <div class="sec" style="margin-top:28px">Social × Web</div>
  <div class="cols"><div class="card nt"><h2>Social vs website<small>by ${ser.step}</small></h2>${lineSVG([{pts:soc.pts,c:'var(--fb)'},{pts:ser.pts,c:WEBC}],640,150)}<div class="legend"><span><i style="background:var(--fb)"></i>Social views</span><span><i style="background:${WEBC}"></i>Website visitors</span></div></div>
   <div class="insg">${insightCards(ins)||'<p class="mut">Insights appear once a few weeks of website data line up with your posts.</p>'}</div></div>`}
function renderWebPages(){const box=$('#wplist');if(!box)return;const {wr}=wctx();const q=(S.wq||'').trim(),pg0=wr.pages.filter(p=>!P.NOISE_PAGES.includes(p[0]));{const ef=$('#evfwe');if(ef){ef.innerHTML=hubEvFilter('we',pg0.map(p=>'we:'+p[0]));bindEvFilter(()=>{S.wlimit=15;renderWebPages()})}}const pg=S.evF.we?pg0.filter(p=>evPass('we','we:'+p[0])):pg0,res=q?P.search(P.searchIndex(pg,WF,'w|'+S.s+'|'+S.e+'|'+pg.length+'|'+pg.slice(0,5).map(p=>p[1]).join()),q,{tie:p=>p[1],cap:1e4}):null,hm=res&&new Map(res.map(x=>[pg[x.i],x.hit]));const list=res?res.map(x=>pg[x.i]):pg;const mx=Math.max(1,...list.slice(0,1).map(p=>p[1]));
  box.innerHTML=list.slice(0,S.wlimit||15).map((p,i)=>`<div class="wprow"><span class="rank">${i+1}</span><span class="wt">${hm?P.hl(wTitle(p[0]),hm.get(p),esc):esc(wTitle(p[0]))}<i style="width:${p[1]/mx*100}%"></i></span>${evTag('we:'+p[0])?`<span class="wtag">${evTag('we:'+p[0])}</span>`:''}<span class="mut">${wr.src==='daily'?secs(p[3])+' avg':P.fmt(p[2])+' users'}</span><b>${P.fmt(p[1])}</b></div>`).join('')||'<p class="mut">No pages match.</p>';
  if(list.length>(S.wlimit||15))box.insertAdjacentHTML('beforeend',`<button class="more" id="wmore">Show more (${list.length-(S.wlimit||15)} left)</button>`);const m=$('#wmore');if(m)m.onclick=()=>{S.wlimit=(S.wlimit||15)+30;renderWebPages()}}
function webTodayCard(){const {wr,ins}=wctx();if(!webHas(wr))return '';const t=wr.t;
  return `<button class="card wtoday" id="toWeb"><h2>Social → Website<small>${wr.exact?'this period':`${wr.covered} of ${wr.days} days`}</small></h2><div class="wbr"><div class="wic">↗</div><div><div class="wbn">${P.fmt(t.social)} visits</div><div class="mut sm">came to the website from ${wr.src==='daily'?'social media':'Facebook &amp; Instagram'}, ${(t.sessions?t.social/t.sessions*100:0).toFixed(1)}% of all visits</div></div></div>
  <div class="wrow"><span>Website visitors</span><b>${P.fmt(t.users)}</b></div>${ins.lift&&ins.lift.pct>0?`<div class="wrow"><span>Strong social days</span><b>+${ins.lift.pct.toFixed(0)}% visitors</b></div>`:''}</button>`}
// ---- email newsletter (Constant Contact) ----
const EMC='#f3d9a4';
const emHub=()=>S.email.filter(x=>x.kind==='hub').sort((a,b)=>a.end<b.end?1:-1)[0]||null;
const emCamps=()=>S.email.filter(x=>x.kind==='camp').sort((a,b)=>a.date<b.date?1:-1);
const pct1=v=>v==null?'–':(Math.round(v*10)/10)+'%';
const emD=(v,unit,good)=>{if(v==null)return '<span class="mut">&nbsp;</span>';const up=v>=0,ok=good==null?up:(good?up:!up);return `<span class="${ok?'up':'down'}">${up?'▲':'▼'} ${unit==='n'?nf(Math.abs(v)):Math.abs(v)+'%'}</span>`};
const emLink=(u,c)=>{const tt=c&&c.titles&&c.titles[u];if(tt)return tt+' (event page)';try{const x=new URL(u);const h=x.hostname.replace(/^www\./,'');if(/facebook/.test(h))return 'Facebook page';if(/instagram/.test(h))return 'Instagram profile';if(/youtube/.test(h))return 'YouTube channel';if(/^careers\./.test(h))return 'MCCS Careers';
  if(/okinawa\.usmc-mccs/.test(h))return wTitle(x.pathname.replace(/\/$/,'')||'/');return h}catch(e){return u}};
function emFunnel(rows){const mx=Math.max(1,...rows.map(r=>r[1]));return rows.map(([l,v,s])=>`<div class="hbar"><span class="nm">${l}</span><span class="tr"><span style="width:${Math.max(1.5,v/mx*100)}%;background:${EMC};box-shadow:0 0 10px ${EMC}"></span></span><b>${P.fmt(v)}${s?`<small class="mut"> ${s}</small>`:''}</b></div>`).join('')}
function emSplit(a,b,la,lb){return `<div class="wstack"><i style="flex:${a};background:${EMC}"></i><i style="flex:${b};background:var(--fb)"></i></div><div class="wleg"><span><i style="background:${EMC}"></i>${la}<b>${a}%</b><em></em></span><span><i style="background:var(--fb)"></i>${lb}<b>${b}%</b><em></em></span></div>`}
function emRateList(L,mx){return L.map(c=>`<div class="hbar"><span class="nm" title="${esc(c.full||c.name)}">${esc(c.name)} <small class="mut">· ${c.date?P.fmtDate(c.date):''}</small></span><span class="tr"><span style="width:${c.rate/mx*100}%;background:${EMC}"></span></span><b>${c.rate}%</b></div>`).join('')}
function modeSwitch(){return hubPills(S.mode==='web'||S.mode==='email'?S.mode:'social');const m=[];if(m.length<2)return '';
  return `<div class="wswitch">${m.map(([k,l])=>`<button data-mode="${k}" class="${(S.mode===k||(k==='social'&&!['web','email'].includes(S.mode)))?'on':''}">${l}</button>`).join('')}</div>`}
function exploreEmail(){setRange();const h=emHub(),cs=emCamps();const end=[h&&h.end,...cs.map(c=>c.date)].filter(Boolean).sort().pop();
  const head=`<div class="xlead"><div class="hero small"><h1>Email</h1><div class="sub">your newsletter, by the numbers</div></div>${modeSwitch()}</div>`;
  if(!h&&!cs.length)return head+`<div class="card" style="margin-top:20px"><h2>No email data yet</h2><p class="mut">Upload a Constant Contact Email Hub report CSV in Settings › Import.</p></div>`;
  const mini=(l,v,d,s)=>`<div class="card kpi mini nt"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d}</div>${s?`<div class="s">${s}</div>`:''}</div>`;
  let o=head;
  if(h){const mxT=Math.max(...h.top.map(c=>c.rate),...h.low.map(c=>c.rate),1);
    o+=`<div class="rlabel">Year to date<small>${P.rangeLabel(h.start,h.end)} · Constant Contact · vs the same period last year</small></div>
    <div class="grid g4">${mini('Emails sent',P.fmt(h.sent),emD(h.vsPrev.sent,'n'),`${P.fmt(h.delivered)} delivered (${Math.round(h.delivered/h.sent*100)}%)`)
      +mini('Open rate',h.openRate+'%',emD(h.vsPrev.openRate),h.vsInd.openRate!=null?`${h.vsInd.openRate>=0?h.vsInd.openRate+'% above':Math.abs(h.vsInd.openRate)+'% below'} industry average`:'')
      +mini('Click rate',h.clickRate+'%',emD(h.vsPrev.clickRate),`${h.ctor}% of openers clicked`)
      +mini('Unsubscribed',nf(h.unsubs),emD(h.vsPrev.unsubs,'n',false),`${P.fmt(h.bounced)} bounced`)}</div>
    <div class="cols"><div class="card nt"><h2>Email funnel<small>year to date</small></h2>${emFunnel([['Sent',h.sent],['Delivered',h.delivered,Math.round(h.delivered/h.sent*100)+'%'],['Opened',h.opened,h.openRate+'%'],['Clicked',h.clicked,h.clickRate+'%']])}<p class="mut sm">Opens include Apple Mail privacy “proxy” opens, so the open rate runs high. Clicks are the steadier signal.</p></div>
     <div class="card nt"><h2>Devices<small>year to date</small></h2><p class="mut sm" style="margin:0 0 2px">Opens · ${P.fmt(h.opened)}</p>${emSplit(h.dev.openMobile,h.dev.openDesktop,'Mobile','Desktop')}<p class="mut sm" style="margin:14px 0 2px">Clicks · ${P.fmt(h.clicked)}</p>${emSplit(h.dev.clickMobile,h.dev.clickDesktop,'Mobile','Desktop')}<p class="mut sm">Most people read on phones, but most clicks come from desktop.</p></div></div>
    <div class="cols e2"><div class="card nt"><h2>Best open rates<small>top 5</small></h2>${emRateList(h.top,mxT)}</div><div class="card nt"><h2>Lowest open rates<small>bottom 5</small></h2>${emRateList(h.low,mxT)}</div></div>`}
  o+=`<div class="sec" style="margin-top:28px">Campaigns</div>`;
  if(!cs.length)o+=`<div class="card nt"><p class="mut">Campaign reports appear here as you add them.</p></div>`;
  else{const c=cs[0];o+=`<button class="card nt ecamp" data-ecamp="${esc(c.id)}"><div class="mut sm"><span class="tag em">LATEST</span>${P.fmtDate(c.date,{year:'numeric'})}${c.time?' · '+fmtT(c.time)+' JST':''}</div><h2 style="margin-top:8px">${esc(c.name)}</h2>${evTag('em:'+c.id)?`<div class="wtag">${evTag('em:'+c.id)}</div>`:''}
      <div class="grid g4 tight">${[['Sends',nf(c.sends)],['Open rate',pct1(c.openRate),c.vs10?emD(c.vs10.openRate):''],['Click rate',pct1(c.clickRate),c.vs10?emD(c.vs10.clickRate):''],['Link clicks',c.linksTotal!=null?nf(c.linksTotal):nf(c.clicks)]].map(([a,b,d])=>`<div class="card kpi mini"><div class="l">${a}</div><div class="v">${b}</div>${d?`<div class="d">${d} <small class="mut">vs last 10</small></div>`:''}</div>`).join('')}</div>
      ${c.links&&c.links.length?`<p class="mut sm" style="margin:12px 0 2px">Top link: ${esc(emLink(c.links[0][0],c))} · ${c.links[0][1]} clicks</p>`:''}<p class="mut sm" style="margin-top:6px">Tap for the full campaign report</p></button>
      ${cs.length>1?`<div class="card nt" style="margin-top:14px"><h2>All campaigns<small>${cs.length}</small></h2>${cs.map(x=>`<button class="hbar" data-ecamp="${esc(x.id)}"><span class="nm">${esc(x.name)} <small class="mut">· ${P.fmtDate(x.date)}</small>${evTag('em:'+x.id)}</span><span class="tr"><span style="width:${x.openRate||0}%;background:${EMC}"></span></span><b>${pct1(x.openRate)}</b></button>`).join('')}</div>`:''}`}
  return o+`<p class="mut sm" style="text-align:center;margin-top:18px">Email data through ${P.fmtDate(end,{year:'numeric'})}. Email doesn't follow the date range yet; it needs one export per campaign.</p>`}
const fmtT=t=>{const [h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`};
function emailCampSheet(id){const c=S.email.find(x=>x.kind==='camp'&&x.id===id);if(!c)return;const r=c.resend;
  const posts=P.filter(S.posts,P.addDays(c.date,-30),P.addDays(c.date,30),'all').filter(qMatch(c.name));const pt=P.totals(posts);
  const lk=c.links||[],lmx=Math.max(1,...lk.map(l=>l[1]));const dlv=c.delivered/c.sends*100;
  const row=(l,k)=>`<tr><td>${l}</td><td>${nf(c[k])}</td>${r?`<td>${nf(r[k])}</td><td>${nf(c[k]+r[k])}</td>`:''}</tr>`;
  const share={kind:'campaign',plat:null,kicker:'Email newsletter · '+P.fmtDate(c.date,{year:'numeric'}),range:'Sent '+P.fmtDate(c.date,{year:'numeric'})+(c.time?' · '+fmtT(c.time)+' JST':''),title:c.name,big:{v:pct1(c.openRate),l:'open rate'},
    note:{rest:`${nf(c.sends)} sent · ${pct1(c.clickRate)} click rate${c.vs10?` · open rate ${c.vs10.openRate>=0?'+':''}${c.vs10.openRate}% vs last 10 campaigns`:''}`},
    stats:[{l:'Sends',v:nf(c.sends)},{l:'Delivered',v:nf(c.delivered)},{l:'Opens',v:nf(c.opens)},{l:'Clicks',v:nf(c.clicks)},{l:'Confirmed open rate',v:pct1(c.confirmedRate)},{l:'Unsubscribes',v:nf(c.unsubs)}],
    bars:lk.slice(0,6).map(l=>({name:emLink(l[0],c),plat:'em',val:nf(l[1]),frac:l[1]/lmx})),barsTitle:'Top links'};
  openSheet(`<div class="mut sm"><span class="tag em">EMAIL</span>Sent ${P.fmtDate(c.date,{year:'numeric'})}${c.time?' · '+fmtT(c.time)+' JST':''}</div>
  <h3 style="margin-top:8px">${esc(c.name)}</h3>
  <div class="bigline">${pct1(c.openRate)}<small>open rate</small></div>${c.vs10?`<p class="sm" style="margin:6px 0 0">${emD(c.vs10.openRate)} open rate, ${emD(c.vs10.clickRate)} click rate <span class="mut">vs the last 10 campaigns</span></p>`:''}
  <div class="grid g4 tight">${[['Sends',nf(c.sends)],['Delivered',nf(c.delivered),dlv.toFixed(1)+'%'],['Click rate',pct1(c.clickRate),nf(c.clicks)+' clicks'],['Confirmed opens',nf(c.confirmed),pct1(c.confirmedRate)+' rate'],['All opens',nf(c.opens),nf(c.proxy)+' proxy'],['Bounces',nf(c.bounces)],['Unsubscribes',nf(c.unsubs)],['Spam reports',nf(c.spam||0)]].map(([a,b,s])=>`<div class="card kpi mini"><div class="l">${a}</div><div class="v">${b}</div>${s?`<div class="s">${s}</div>`:''}</div>`).join('')}</div>
  <div class="sec">Funnel</div>${emFunnel([['Sent',c.sends],['Delivered',c.delivered,dlv.toFixed(0)+'%'],['Opened',c.opens],['Confirmed opens',c.confirmed],['Clicked',c.clicks]])}
  <p class="mut sm">Confirmed opens are people who loaded images or clicked. Proxy opens are mostly Apple Mail privacy pre-loads, so they may not be real reads.</p>
  ${r?`<div class="sec">Original vs resend to non-openers</div><div class="scroll"><table><tr><th></th><th>Original</th><th>Resend</th><th>Combined</th></tr>${row('Emails sent','sends')}${row('Delivered','delivered')}${row('Confirmed opens','confirmed')}${row('Proxy opens','proxy')}${row('All opens','opens')}${row('Clicks','clicks')}${row('Did not open','didNotOpen')}${row('Bounces','bounces')}${row('Unsubscribes','unsubs')}</table></div>
   <p class="mut sm">The resend reached ${nf(r.opens)} more readers and ${nf(r.clicks)} more clicks.</p>`:''}
  ${lk.length?`<div class="sec">Link clicks<small class="mut"> · ${nf(c.linksTotal)} total, original send</small></div>${lk.map(l=>`<a class="hbar" href="${esc(l[0])}" target="_blank" rel="noopener"><span class="nm" title="${esc(l[0])}">${esc(emLink(l[0],c))}</span><span class="tr"><span style="width:${l[1]/lmx*100}%;background:${EMC}"></span></span><b>${l[1]}</b></a>`).join('')}`:''}
  <div class="sec">Social posts for this event</div>${posts.length?`<p class="sm" style="margin:0 0 6px">${nf(posts.length)} posts within a month of the send, ${P.fmt(pt.v)} views.</p><button class="chip" id="emSoc">Open the campaign report</button>`:`<p class="mut sm">No social posts mention “${esc(c.name)}” within a month of the send.</p>`}`,1,share);
  const b=$('#emSoc');if(b)b.onclick=()=>{S.campAll=1;campaignSheet(c.name,P.filter(S.posts,S.s,S.e,S.plat))}}
function emailTodayCard(){const cs=emCamps(),h=emHub();if(!cs.length&&!h)return '';const c=cs[0];
  return `<button class="card wtoday etoday" id="toEmail"><h2>Newsletter<small>${c?'latest send':'year to date'}</small></h2><div class="wbr"><div class="wic">✉</div><div><div class="wbn">${c?pct1(c.openRate)+' opened':h.openRate+'% open rate'}</div><div class="mut sm">${c?`${esc(c.name)} · ${P.fmtDate(c.date)} · ${nf(c.sends)} sent`:`${P.fmt(h.sent)} emails sent this year`}</div></div></div>
  ${c?`<div class="wrow"><span>Click rate</span><b>${pct1(c.clickRate)}</b></div>`:''}${h?`<div class="wrow"><span>Year-to-date open rate</span><b>${h.openRate}%</b></div>`:''}</button>`}
// ---- synced data from Hark ----
// ---- post thumbnails (encrypted, one file per post; published by the MCCS Social Media project) ----
// meta.thumbs = {v:1, dir:'t/', kdf:{salt,iterations}, nsalt, ids?} ; file name = sha256(nsalt+postId) hex[0:24] + '.bin' ; file = iv(12) || AES-GCM(ciphertext of JPEG)
const TH={key:null,ksig:'',mem:new Map()};
function thMeta(){if(SYNC.meta&&SYNC.meta.thumbs)return SYNC.meta.thumbs;try{return JSON.parse(localStorage.pulseThumbs||'null')}catch(e){return null}}
async function thKey(m){const pass=localStorage.pulsePass;if(!pass||!m)return null;const sig=m.kdf.salt+m.kdf.iterations;if(TH.key&&TH.ksig===sig)return TH.key;
  const b=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
  TH.key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b(m.kdf.salt),iterations:m.kdf.iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);TH.ksig=sig;return TH.key}
async function thumbFor(id){if(TH.mem.has(id))return TH.mem.get(id);const cached=await DB.get('th:'+id);if(cached){const u=URL.createObjectURL(cached);TH.mem.set(id,u);return u}
  const m=thMeta();if(!m)return null;try{const key=await thKey(m);if(!key)return null;
    const h=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(m.nsalt+id)));const name=[...h].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);
    const r=await fetch((m.dir||'t/')+name+'.bin');if(!r.ok)return null;const buf=new Uint8Array(await r.arrayBuffer());
    const jpg=await crypto.subtle.decrypt({name:'AES-GCM',iv:buf.slice(0,12)},key,buf.slice(12));const blob=new Blob([jpg],{type:'image/jpeg'});
    DB.set('th:'+id,blob);const u=URL.createObjectURL(blob);TH.mem.set(id,u);return u}catch(e){return null}}
const EXCLUDE_BUILTIN=['mccs_hq','starsandstripespacific','okilivingmag'];// collaborator accounts, hidden even before the first sync
function dropExcluded(a){let x=[];try{x=JSON.parse(localStorage.pulseExclude||'[]')}catch(e){}x=[...new Set([...EXCLUDE_BUILTIN,...x])].map(v=>String(v).toLowerCase());return a.filter(r=>!x.includes(String(r.page).toLowerCase()))}
const SYNC={meta:null};
async function decryptRemote(meta,pass){const b=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));const enc=new TextEncoder();
  const base=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b(meta.kdf.salt),iterations:meta.kdf.iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
  let ct;if(meta.parts){const bufs=await Promise.all(meta.parts.map(n=>fetch(n+'?u='+encodeURIComponent(meta.updated),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('missing part');return r.arrayBuffer()})));ct=new Uint8Array(bufs.reduce((a,x)=>a+x.byteLength,0));let o=0;for(const x of bufs){ct.set(new Uint8Array(x),o);o+=x.byteLength}}else ct=b(meta.data);
  let pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b(meta.iv)},key,ct);
  if(meta.gzip)pt=await new Response(new Blob([pt]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  return JSON.parse(new TextDecoder().decode(pt))}
async function applyRemote(meta,pass){const arr=await decryptRemote(meta,pass);if(meta.web&&meta.web.parts){try{const wl=await decryptRemote(Object.assign({},meta,{iv:meta.web.iv,parts:meta.web.parts,gzip:true}),pass);for(const w of wl)S.web=P.mergeWeb(S.web,w);await DB.set('web',S.web);localStorage.pulseWebSynced=meta.web.iv}catch(e){console.warn('web data',e)}}if(meta.email&&meta.email.parts){try{const el=await decryptRemote(Object.assign({},meta,{iv:meta.email.iv,parts:meta.email.parts,gzip:true}),pass);S.email=P.mergeEmail(S.email,el);delete S.email.note;await DB.set('email',S.email);localStorage.pulseEmailSynced=meta.email.iv}catch(e){console.warn('email data',e)}}if(meta.events&&meta.events.parts){try{const ev=await decryptRemote(Object.assign({},meta,{iv:meta.events.iv,parts:meta.events.parts,gzip:true}),pass);if(ev&&Array.isArray(ev.events)){S.ev=ev;await DB.set('events',ev);localStorage.pulseEventsSynced=meta.events.iv}}catch(e){console.warn('events data',e)}}if(meta.exclude)localStorage.pulseExclude=JSON.stringify(meta.exclude);S.posts=dropExcluded(P.merge(S.posts,arr).posts);await DB.set('posts',S.posts);localStorage.pulsePass=pass;localStorage.pulseSynced=meta.updated;localStorage.pulseSrc=JSON.stringify(meta.sources||{});localStorage.pulseThrough=meta.through;if(meta.thumbs)localStorage.pulseThumbs=JSON.stringify(meta.thumbs);S.locked=false}
async function sync(){let meta;try{const r=await fetch('data.enc.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;meta=await r.json()}catch(e){return}
  SYNC.meta=meta;const pass=localStorage.pulsePass;
  if(pass){if(localStorage.pulseSynced===meta.updated&&S.posts.length&&(!meta.web||localStorage.pulseWebSynced===meta.web.iv)&&(!meta.email||localStorage.pulseEmailSynced===meta.email.iv)&&(!meta.events||localStorage.pulseEventsSynced===meta.events.iv))return;try{await applyRemote(meta,pass);render();toast(`Latest data loaded · through ${P.fmtDate(meta.through,{year:'numeric'})}`)}catch(e){delete localStorage.pulsePass;S.locked=!S.posts.length;render()}}
  else{S.locked=true;render()}}
function lockScreen(){return `<div class="empty lock"><div class="orb"></div><h1>Marketing metrics,<br>at a glance.</h1><p>Enter your MCCS Pulse passcode to load the latest ${esc(CFG.rOrg)} metrics. You only do this once on each device.</p>
  <form id="unlock" class="unlock"><input id="pass" type="password" autocomplete="current-password" placeholder="Passcode" autocapitalize="none" spellcheck="false"><button class="btn" type="submit">Unlock</button></form><p class="mut sm" id="lockErr" style="min-height:20px"></p>
  ${S.posts.length?'<button class="more" id="skipLock" style="max-width:320px">Not now, use data on this device</button>':''}</div>`}
function bindLock(){const f=$('#unlock');if(!f)return;f.onsubmit=async e=>{e.preventDefault();const p=$('#pass').value.trim();if(!p)return;$('#lockErr').textContent='Unlocking…';
  try{await applyRemote(SYNC.meta,p);render();toast(`Unlocked · data through ${P.fmtDate(SYNC.meta.through,{year:'numeric'})}`)}catch(err){$('#lockErr').textContent="That passcode didn't work. Try again.";f.classList.remove('shake');void f.offsetWidth;f.classList.add('shake')}};
  const sk=$('#skipLock');if(sk)sk.onclick=()=>{S.locked=false;render()}}
// ---- global search: header icon (also / and Ctrl/Cmd-K on desktop) opens one sheet over posts, web pages, email campaigns and signage ----
// Uses only the shared engine (P.searchIndex / P.search), one cached index per dataset, built lazily at idle time when the sheet is about to open.
const gsAvail=()=>!TV.on&&!(S.locked&&SYNC.meta)&&S.posts.length>0;
const GSI={post:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 15l3-3 2 2 3-4"/></svg>',web:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/></svg>',email:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/></svg>',sign:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>'};
// posts: the same array Explore searches (excluded collaborator accounts dropped), so the index is shared with Explore when nothing extra is excluded
let GSP={src:null,n:-1,ex:null,out:[]};
function gsPosts(){const ex=localStorage.pulseExclude||'';if(GSP.src!==S.posts||GSP.n!==S.posts.length||GSP.ex!==ex){const f=dropExcluded(S.posts);GSP={src:S.posts,n:S.posts.length,ex,out:f.length===S.posts.length?S.posts:f}}return GSP.out}
// web pages: the pages of the current date range, same list and cache key as Explore › Web › Pages
function gsWebPages(){if(!S.web.length)return null;setRange();const wr=P.webRange(S.web,S.s,S.e);if(!webHas(wr))return null;const pg=wr.pages.filter(p=>!P.NOISE_PAGES.includes(p[0]));return {wr,pg,key:'w|'+S.s+'|'+S.e+'|'+pg.length+'|'+pg.slice(0,5).map(p=>p[1]).join()}}
// signage: read-only view of SG.data (slides, playlists, locations, offline screens); signage.js is untouched
const SGF={name:[1,s=>s.name],sub:[.6,s=>`${s.kind} ${s.sub}`]};const GSG=new WeakMap();
function gsSign(){const d=SG.data;if(!d)return [];let l=GSG.get(d);if(l)return l;const pl=n=>(SGC[n]||[n])[0];l=[];
  (d.items||[]).forEach(i=>l.push({k:'slide',name:sgName(i.name),raw:i.name,kind:i.kind==='video'?'Video':'Still',sub:i.playlist?pl(i.playlist)+' playlist':'In rotation'}));
  (d.playlists||[]).forEach(p=>l.push({k:'pl',name:pl(p.name),kind:'Playlist',sub:`${p.count} pieces in rotation`}));
  (d.groups||[]).forEach(g=>{l.push({k:'loc',loc:g.name,name:g.name,kind:'Location',sub:`${g.total} screens${g.off.length?` · ${g.off.length} offline`:' · all online'}`});(g.off||[]).forEach(s=>l.push({k:'scr',loc:g.name,name:sgName(s.name),kind:'Screen',sub:`${g.name} · offline ${sgAgo(s.since)}`}))});
  GSG.set(d,l);return l}
const GS={open:{},warm:0};
const GROUPS=[
 {k:'posts',label:'Posts',run:q=>{const it=gsPosts();return P.search(P.searchIndex(it,PF),q,{tie:r=>r.t,cap:1e5})},
  row:(r,h)=>[GSI.post,P.hl(P.label(r),h,esc),`${r.plat==='fb'?'Facebook':'Instagram'} · ${esc(acctName(r.plat,r.page))} · ${r.d.slice(0,4)===P.todayKey().slice(0,4)?P.fmtDate(r.d):P.fmtDate(r.d,{year:'numeric'})}${qWhy(r,h)}`,P.fmt(r.v),'views'],see:'See all in Social'},
 {k:'web',label:'Web pages',run:q=>{const w=gsWebPages();if(!w)return [];const res=P.search(P.searchIndex(w.pg,WF,w.key),q,{tie:p=>p[1],cap:1e4});res.forEach(x=>x.item=w.pg[x.i]);return res},
  row:(p,h)=>[GSI.web,P.hl(wTitle(p[0]),h,esc),(p[0][0]==='/'?esc(p[0])+' · ':'')+esc(P.rangeLabel(S.s,S.e)),P.fmt(p[1]),'views'],see:'See all in Web'},
 {k:'email',label:'Email campaigns',run:q=>S.email.length?emSearch(q):[],
  row:(c,h)=>{const lt=Object.values(c.titles||{}).slice(0,2);return [GSI.email,P.hl(c.name,h,esc),`Sent ${c.date?P.fmtDate(c.date,{year:'numeric'}):'–'}${lt.length?' · links: '+esc(lt.join(', ')):''}`,c.openRate!=null?pct1(c.openRate):'',c.openRate!=null?'opened':'']}},
 {k:'sign',label:'Signage',run:q=>{const l=gsSign();return l.length?P.search(P.searchIndex(l,SGF),q,{cap:1e4}):[]},
  row:(s,h)=>[GSI.sign,P.hl(s.name,h,esc),`${esc(s.kind)} · ${esc(s.sub)}`,'','']}];
// build the indexes one at a time in idle time (lazy: nothing is built until the search is about to be used)
function gsWarm(){if(GS.warm||!gsAvail())return;GS.warm=1;const idle=window.requestIdleCallback||(f=>setTimeout(f,30));
  const jobs=[()=>P.searchIndex(gsPosts(),PF),()=>{const w=gsWebPages();if(w)P.searchIndex(w.pg,WF,w.key)},()=>{if(S.email.length)emSearch('warm')},()=>{const l=gsSign();if(l.length)P.searchIndex(l,SGF)}];
  const next=()=>{const j=jobs.shift();if(!j){GS.warm=0;return}idle(()=>{try{j()}catch(e){}next()})};next();
  if(!SG.data&&localStorage.pulsePass&&typeof sgLoad==='function')sgLoad().then(ch=>{if(ch&&$('#gs').classList.contains('show'))gsRender()})}
const gsHint=fz=>fz.length?`Includes close spellings: ${fz.slice(0,3).map(([a,b])=>`<b>${esc(b)}</b> for “${esc(a)}”`).join(', ')}`:'';
function gsRender(){const q=$('#gq').value,box=$('#gbody');$('#gclr').hidden=!q;
  if(!q.trim()){box.innerHTML=`<p class="gempty">Search posts, web pages, email campaigns and signage at once. Typos, “&amp;” vs “and”, and word order are fine.</p><div class="gtry">${['ages & stages','halloween','golf course','summer camp, swim'].map(t=>`<button class="chip sm" data-try="${esc(t)}">${esc(t)}</button>`).join('')}</div><p class="gkeys">Press <kbd>/</kbd> or <kbd>${/Mac|iP/.test(navigator.platform)?'⌘':'Ctrl'} K</kbd> to open · <kbd>Esc</kbd> to close</p>`;
    box.querySelectorAll('[data-try]').forEach(b=>b.onclick=()=>{$('#gq').value=b.dataset.try;GS.open={};gsRender()});return}
  const R=GROUPS.map(g=>{let res=[];try{res=g.run(q)}catch(e){console.warn('search',g.k,e)}return {g,res}});
  const fz=[...new Map(R.flatMap(x=>x.res.fuzzy||[]).map(f=>[f[0],f])).values()],total=R.reduce((a,x)=>a+x.res.length,0),empty=R.filter(x=>!x.res.length).map(x=>x.g.label);
  GS.last={q,R};
  box.innerHTML=`<p class="gsum">${total?`<b>${nf(total)}</b> ${total===1?'match':'matches'}`:'No matches'} for “${esc(q)}”${fz.length?` · ${gsHint(fz)}`:''}</p>`+
   R.filter(x=>x.res.length).map(({g,res})=>{const open=GS.open[g.k],n=open?Math.min(res.length,50):Math.min(3,res.length);
    const btn=g.see?`<button data-see="${g.k}">${g.see}</button>`:res.length>3?`<button data-more="${g.k}">${open?'Show fewer':`Show all ${res.length}`}</button>`:'';
    return `<section class="ggrp"><div class="gh"><span>${g.label}<b>${nf(res.length)}</b></span>${btn}</div>${res.slice(0,n).map((x,j)=>{const [ic,t,m,num,u]=g.row(x.item,x.hit);return `<button class="gres" data-g="${g.k}" data-j="${j}"><span class="gi">${ic}</span><span class="gb"><span class="gt">${t}</span><span class="gm">${m}</span></span>${num?`<span class="gn">${num}<small>${u}</small></span>`:''}</button>`}).join('')}${open&&res.length>50?`<p class="gnone">Showing the best 50.</p>`:''}</section>`}).join('')+
   (empty.length&&total?`<p class="gnone">Nothing in ${empty.join(' or ')}.</p>`:'')+(!total?`<p class="gempty">Try fewer words, or separate options with a comma.</p>`:'');
  box.querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>{GS.open[b.dataset.more]=!GS.open[b.dataset.more];gsRender()});
  box.querySelectorAll('[data-see]').forEach(b=>b.onclick=()=>gsSeeAll(b.dataset.see,q));
  box.querySelectorAll('.gres').forEach(b=>b.onclick=()=>{const x=R.find(r=>r.g.k===b.dataset.g).res[+b.dataset.j];if(x)gsGo(b.dataset.g,x.item)})}
function gsFlash(el){if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('gflash');setTimeout(()=>el.classList.remove('gflash'),2200)}
function gsGo(k,it){gsClose(true);
  if(k==='posts')return postSheet(it.id);
  if(k==='email')return emailCampSheet(it.id);
  if(k==='web'){S.view='explore';S.mode='web';localStorage.pulseMode='web';S.wq=wTitle(it[0]);S.wlimit=15;render();const wq=$('#wq');gsFlash(wq?wq.closest('.card'):null);return}
  if(k==='sign'){S.view='signage';render();scrollTo(0,0);setTimeout(()=>{let el=null;if(it.k==='slide')el=$$('.sgth').find(e=>e.title===it.raw);else if(it.k==='pl')el=$('.sgrot');else el=$$('.sgloc').find(e=>e.querySelector('b')&&e.querySelector('b').textContent===it.loc)||$('.sgneed');gsFlash(el||$('.sgplay'))},120)}}
function gsSeeAll(k,q){gsClose(true);S.view='explore';
  if(k==='web'){S.mode='web';localStorage.pulseMode='web';S.wq=q;S.wlimit=15;render();const wq=$('#wq');gsFlash(wq?wq.closest('.card'):null);return}
  // posts: Explore › Social with the query. If some matches fall outside the current range, widen it to a custom range that holds them all.
  S.mode='social';localStorage.pulseMode='social';S.socSub='posts';S.plat='all';S.acct='all';S.limit=40;const was=S.q.trim();S.q=q;if(!was&&S.sort==='v'){S.sort='r';S.dir='desc'}
  const res=GROUPS[0].run(q);setRange();const ds=res.map(x=>x.item.d).sort();let note='';
  if(ds.length&&(ds[0]<S.s||ds[ds.length-1]>S.e)){S.preset='custom';S.s=ds[0]<S.s?ds[0]:S.s;S.e=ds[ds.length-1]>S.e?ds[ds.length-1]:S.e;note=`Range set to ${P.rangeLabel(S.s,S.e)} so all ${nf(res.length)} matches show`}
  render();const qi=$('#q');gsFlash(qi?qi.closest('.card'):null);if(note)toast(note)}
function gsOpen(q){if(!gsAvail())return;const s=$('#setp');if(s&&s.classList.contains('show'))closeSettings(false);if($('#sheet').classList.contains('show'))closeSheet();
  gsWarm();$('#gs').classList.add('show');$('#gscrim').classList.add('show');$('#app').inert=true;$('#dock').inert=true;$('#gq').value=q||'';GS.open={};gsRender();setTimeout(()=>$('#gq').focus(),60)}
function gsClose(nav){const g=$('#gs');if(!g||!g.classList.contains('show'))return;g.classList.remove('show');$('#gscrim').classList.remove('show');$('#app').inert=false;$('#dock').inert=false;if(!nav){const b=$('#gbtn');if(b)b.focus({preventScroll:true})}}
$('#gscrim').onclick=()=>gsClose();$('#gdone').onclick=()=>gsClose();$('#gq').oninput=()=>{GS.open={};gsRender()};
$('#gclr').onclick=e=>{e.preventDefault();$('#gq').value='';gsRender();$('#gq').focus()};
$('#gs').addEventListener('scroll',()=>$('.gsin').classList.toggle('lined',$('#gs').scrollTop>4));
// capture phase so Esc closes the search before the sheet/settings handlers see it
window.addEventListener('keydown',e=>{if(TV.on)return;const open=$('#gs').classList.contains('show');
  if(e.key==='Escape'&&open){e.preventDefault();e.stopImmediatePropagation();gsClose();return}
  const a=document.activeElement,typing=a&&(/INPUT|SELECT|TEXTAREA/.test(a.tagName)||a.isContentEditable);
  if((e.key==='k'||e.key==='K')&&(e.metaKey||e.ctrlKey)&&!e.altKey){if(!gsAvail())return;e.preventDefault();open?$('#gq').focus():gsOpen('');return}
  if(e.key==='/'&&!typing&&!open&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&gsAvail()){e.preventDefault();gsOpen('')}},true);
// ---- boot ----
(async()=>{document.body.dataset.theme=CFG.theme;S.posts=dropExcluded((await DB.get('posts'))||[]);S.web=(await DB.get('web'))||[];S.email=(await DB.get('email'))||[];S.ev=(await DB.get('events'))||null;if(document.readyState==='loading')await new Promise(r=>addEventListener('DOMContentLoaded',r,{once:true}));render();sync();if(TV.on)TV.start();if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{})})();
