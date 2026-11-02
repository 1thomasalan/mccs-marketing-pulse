// MCCS Pulse - Signage slide plays (ScreenCloud proof-of-play), v43.
// Published by the Digital Signage project's workflow .github/workflows/signage-plays.yml:
//   signage-plays.json  plaintext status {v,file,from,through,pulled,checked,err,done}
//   signage-plays.bin   ECDH+AES-GCM (same key as signage.bin) of
//     {v:1,from,through,pulled,days:{'YYYY-MM-DD' (JST):{t,ta,sc,s:{fileName:[plays,screens]},g:{group:plays}}}}
// t = file plays (images, video, PDF), ta = all plays incl. apps, sc = screens with file plays.
// Plays are play STARTS (no duration) and multi-zone layouts/short loops inflate them: trend and share only, never people.
// Loaded after signage.js and before app.js; uses app globals only at call time.
const SPL={meta:null,data:null,err:'',loading:null,at:0};
// "checked"/"pulled" may be ISO or "Mon 2026-11-02 2:32 PM JST (UTC+09:00)"
function spTime(x){if(!x)return NaN;const t=Date.parse(x);if(!isNaN(t))return t;
  const m=String(x).match(/(\d{4})-(\d\d)-(\d\d)\D+(\d{1,2}):(\d\d)\s*(AM|PM)?/i);if(!m)return NaN;let h=+m[4];if(m[6]){h%=12;if(/pm/i.test(m[6]))h+=12}
  return Date.UTC(+m[1],+m[2]-1,+m[3],h,+m[5])-9*36e5}
async function spLoad(force){if(SPL.loading)return SPL.loading;SPL.loading=(async()=>{try{
    SPL.at=Date.now();
    const r=await fetch('signage-plays.json?t='+Date.now(),{cache:'no-store'});if(!r.ok){SPL.err='nodata';return false}
    const m=await r.json();const key=m.pulled||m.through||'';
    if(!force&&SPL.data&&SPL.meta&&(SPL.meta.pulled||SPL.meta.through)===key){SPL.meta=m;return false}
    const c=await DB.get('spl:data');
    if(c&&c.key===key){SPL.data=c.d;SPL.meta=m;SPL.err='';return true}
    const b=await fetch((m.file||'signage-plays.bin')+'?c='+encodeURIComponent(key),{cache:'no-store'});if(!b.ok)throw new Error('bin '+b.status);
    SPL.data=JSON.parse(new TextDecoder().decode(await sgOpen(await b.arrayBuffer())));SPL.meta=m;SPL.err='';await DB.set('spl:data',{key,d:SPL.data});return true}
  catch(e){console.warn('signage plays',e);if(!SPL.data){const c=await DB.get('spl:data');if(c){SPL.data=c.d;return true}}SPL.err=e.message==='locked'?'locked':'fail';return false}
  finally{SPL.loading=null}})();return SPL.loading}
// keep both signage feeds fresh from any view; re-render only when something new arrived
function spKick(view){if(!localStorage.pulsePass||typeof sgLoad!=='function')return;const jobs=[];
  if(!SG.loading&&(!SG.meta||Date.now()-new Date(SG.meta.checked)>10*6e4))jobs.push(sgLoad());
  if(!SPL.loading&&Date.now()-SPL.at>30*6e4)jobs.push(spLoad());
  if(jobs.length)Promise.all(jobs).then(r=>{if(r.some(Boolean)&&S.view===view&&!document.querySelector('.sheet.show'))render()})}
// range rollup. Returns null when no plays data covers any of [s,e].
function spRange(s,e){const D=SPL.data;if(!D||!D.days)return null;const from=D.from||Object.keys(D.days).sort()[0],thru=D.through||Object.keys(D.days).sort().pop();
  const a=s<from?from:s,b=e>thru?thru:e;if(a>b)return null;
  let t=0,ta=0,scSum=0,scMax=0,nd=0;const sl=new Map(),gr=new Map(),daily=[];
  for(let k=a;k<=b;k=P.addDays(k,1)){const d=D.days[k];daily.push([k,d?d.t||0:0]);if(!d)continue;nd++;t+=d.t||0;ta+=d.ta||0;scSum+=d.sc||0;scMax=Math.max(scMax,d.sc||0);
    for(const n in d.s||{}){const v=d.s[n],o=sl.get(n)||{p:0,sc:0,days:0};o.p+=v[0]||0;o.sc=Math.max(o.sc,v[1]||0);o.days++;sl.set(n,o)}
    for(const g in d.g||{})gr.set(g,(gr.get(g)||0)+d.g[g])}
  const items=(SG.data&&SG.data.items)||[],byName=new Map(items.map(i=>[i.name,i]));
  const slides=[...sl].map(([n,o])=>({name:n,...o,item:byName.get(n)||null})).sort((x,y)=>y.p-x.p);
  return {s:a,e:b,since:s<from?from:null,cut:e>thru?thru:null,t,ta,nd,scSum,scMax,perScreen:scSum?t/scSum:0,slides,groups:[...gr].sort((x,y)=>y[1]-x[1]),daily}}
// comparison only when the earlier range is fully covered by the log
function spCmp(){const D=SPL.data;if(!D||!S.cs||S.cs<(D.from||'9'))return null;const r=spRange(S.cs,S.ce);return r&&!r.since&&!r.cut?r:null}
function spSrc(){const m=SPL.meta;if(!m)return null;const at=spTime(m.checked||m.pulled);if(isNaN(at))return null;
  return {lab:'Last synced',through:new Date(at).toISOString(),time:1,err:m.err||null,
    what:`Plays ${m.from?P.fmtDate(m.from,{year:'numeric'}):''} to ${m.through?P.fmtDate(m.through,{year:'numeric'}):''}${m.done===false?' · history still loading':''}`,
    how:m.err?'Last pull failed: '+m.err:'Syncs from ScreenCloud play logs once a day (about 1:20 AM JST)'}}
const spEmptyTxt=()=>!localStorage.pulsePass?'Unlock Pulse with your passcode to load slide plays.':SPL.err==='nodata'?'Slide plays have not been published yet.':SPL.err==='fail'?'Slide plays could not be loaded. They retry on the next check.':'Checking ScreenCloud play logs…';
const spNote='Counts each time a slide starts on a screen (layouts with several zones count each zone), so use them for trend and share, not people reached.';
// ---- Signage tab section ----
function spSection(){setRange();const R=spRange(S.s,S.e),C=R?spCmp():null,pr=`<div class="range presets sprange">${PRESETS.map(([k,l])=>`<button data-spp="${k}" class="${S.preset===k?'on':''}">${l}</button>`).join('')}</div>`;
  const head=`<div class="sphead"><h2>Slide plays<small>${esc(P.rangeLabel(S.s,S.e))}${R&&R.since?` · plays since ${P.fmtDate(R.since,{year:'numeric'})}`:''}${R&&R.cut?` · through ${P.fmtDate(R.cut)}`:''}</small></h2>${pr}</div>`;
  if(!SPL.data)return `<section class="spsec">${head}<div class="card"><p class="mut" style="margin:0">${esc(spEmptyTxt())}</p></div></section>`;
  if(!R||!R.t)return `<section class="spsec">${head}<div class="card"><p class="mut" style="margin:0">No slide plays logged in this range. Play history starts ${P.fmtDate(SPL.data.from,{year:'numeric'})}.</p></div></section>`;
  const dlt=C?dl(R.t,C.t,true):'',played=R.slides.length,inRot=R.slides.filter(x=>x.item).length;
  const top=R.slides.slice(0,8),mx=top[0]?top[0].p:1,gmx=R.groups[0]?R.groups[0][1]:1;
  const row=x=>`<div class="sprow" role="button" tabindex="0" data-slide="${esc(x.name)}"><div class="spth">${x.item&&x.item.t?`<img data-sg="${x.item.t}" alt="">`:''}</div><div class="spn"><b title="${esc(x.name)}">${esc(sgName(x.name))}</b><span>${x.item?'in rotation':'no longer in rotation'} · up to ${x.sc} screen${x.sc===1?'':'s'} · ${x.days} day${x.days===1?'':'s'}</span><div class="spb"><i style="width:${Math.max(2,x.p/mx*100)}%"></i></div></div><em>${hk(x.p)}</em></div>`;
  return `<section class="spsec">${head}<div class="spgrid">
   <div class="card spin"><h2>In this range</h2><div class="spk"><div><b>${hk(R.t)}</b><span>slide plays${dlt?' · '+dlt:''}</span></div><div><b>${nf(Math.round(R.perScreen))}</b><span>per screen daily</span></div><div><b>${nf(played)}</b><span>slides played${inRot<played?` · ${inRot} still in rotation`:''}</span></div><div><b>${nf(R.scMax)}</b><span>screens at peak</span></div></div>${spark(R.daily.map(x=>x[1]),HC.sg,54)}<p class="mut sm spfn">${spNote}${R.ta>R.t?` Apps (menus, feeds) add another ${hk(R.ta-R.t)} plays, not broken down.`:''}</p></div>
   <div class="card spmost"><h2>Most played<small>this range</small></h2>${top.map(row).join('')}</div>
   <div class="card sploc"><h2>Plays by location</h2>${R.groups.slice(0,10).map(([g,v])=>`<div class="spl"><span>${esc(g==='Other'?'Other (no group)':g)}</span><div class="spb"><i style="width:${Math.max(2,v/gmx*100)}%"></i></div><em>${hk(v)}</em></div>`).join('')}<p class="mut sm spfn">From ScreenCloud's play logs, synced daily. Locations use today's screen groups.</p></div>
  </div></section>`}
// ---- one slide's sheet (tap a Most played row or a What's playing tile) ----
function spSlide(name,s,e){const D=SPL.data;if(!D||!D.days)return null;const from=D.from,thru=D.through,a=s<from?from:s,b=e>thru?thru:e;if(a>b)return null;
  let p=0,all=0,sc=0,days=0,first='',last='',hasG=false,noG=0;const daily=[],g=new Map();
  for(let k=a;k<=b;k=P.addDays(k,1)){const d=D.days[k],v=d&&d.s&&d.s[name];all+=d?d.t||0:0;daily.push(v?v[0]:0);if(d&&d.sg)hasG=true;if(!v)continue;if(!d.sg)noG++;p+=v[0];sc=Math.max(sc,v[1]||0);days++;if(!first)first=k;last=k;
    const gg=d.sg&&d.sg[name];if(gg)for(const x in gg)g.set(x,(g.get(x)||0)+gg[x])}
  return {s:a,e:b,since:s<from?from:null,p,all,share:all?p/all:0,sc,days,span:Math.round((new Date(b)-new Date(a))/864e5)+1,first,last,daily,hasG,noG,groups:[...g].sort((x,y)=>y[1]-x[1])}}
function spSlideSheet(name){setRange();const R=spSlide(name,S.s,S.e),C=SPL.data&&S.cs>=(SPL.data.from||'9')?spSlide(name,S.cs,S.ce):null;
  const it=SG.data&&SG.data.items&&SG.data.items.find(i=>i.name===name),pl=it&&(SGC[it.playlist]||[it.playlist])[0];
  const evs=typeof evOf==='function'?evOf('sg:'+name).map(x=>evGet(x.ev)).filter(Boolean):[];
  const img=it&&it.t?`<div class="spsh"><img data-sg="${it.t}" alt=""></div>`:'';
  const top=`${img}<div class="mut sm">${esc(P.rangeLabel(S.s,S.e))}${R&&R.since?` · plays since ${P.fmtDate(R.since,{year:'numeric'})}`:''}</div><h3 style="margin-top:6px">${esc(sgName(name))}</h3><p class="mut sm" style="margin:-6px 0 12px">${it?`In rotation now${pl?' · '+esc(pl):''}${it.kind==='video'?' · video':''}`:'No longer in rotation'}</p>`;
  if(!R||!R.p){openSheet(top+`<div class="card"><p class="mut" style="margin:0">${SPL.data?'No plays logged for this slide in this range.':esc(spEmptyTxt())}</p></div>`);sgFill($('#sheetBody'));return}
  const dlt=C&&C.p?dl(R.p,C.p,true):C?'<span class="mut">new this period</span>':'';
  const gmx=R.groups[0]?R.groups[0][1]:1;
  openSheet(top+`<div class="spk spk4"><div><b>${hk(R.p)}</b><span>plays${dlt?' · '+dlt:''}</span></div><div><b>${(R.share*100).toFixed(R.share<.1?1:0)}%</b><span>of all slide plays</span></div><div><b>${R.days}<small> / ${R.span}</small></b><span>days on air</span></div><div><b>${nf(R.sc)}</b><span>screens at peak</span></div></div>
   <div class="card" style="margin-top:12px"><h2>Daily plays<small>${hd(R.first)} – ${hd(R.last)}</small></h2><div class="spdaily">${spark(R.daily,HC.sg,64)}</div></div>
   ${R.hasG?`<div class="card" style="margin-top:12px"><h2>Plays by location${R.noG?`<small>partial · ${R.days-R.noG} of ${R.days} days</small>`:''}</h2>${R.groups.length?R.groups.slice(0,10).map(([g,v])=>`<div class="spl"><span>${esc(g==='Other'?'Other (no group)':g)}</span><div class="spb"><i style="width:${Math.max(2,v/gmx*100)}%"></i></div><em>${hk(v)}</em></div>`).join(''):'<p class="mut sm">No location detail for these days yet.</p>'}</div>`:`<p class="mut sm spfn">Plays by location for each slide arrive with the next signage sync.</p>`}
   ${evs.length?`<div class="card" style="margin-top:12px"><h2>Linked event${evs.length>1?'s':''}</h2><div class="sgtv">${evs.map(e=>`<button class="chip" data-nav="event:${esc(e.id)}">${esc(e.name)} ›</button>`).join('')}</div></div>`:''}
   <p class="mut sm spfn">${spNote}</p>`);
  sgFill($('#sheetBody'));$$('#sheetBody [data-nav]').forEach(b=>b.onclick=()=>{closeSheet&&closeSheet();if(typeof hubNav==='function')hubNav(b.dataset.nav)})}
function spBindTiles(){$$('[data-slide]').forEach(el=>{el.onclick=()=>spSlideSheet(el.dataset.slide);el.onkeydown=e=>{if(e.key==='Enter')spSlideSheet(el.dataset.slide)}});
  $$('.sgth').forEach(el=>{el.style.cursor='pointer';el.onclick=e=>{if(e.target.closest('button'))return;spSlideSheet(el.title)}})}
function bindSpSection(){setTimeout(spBindTiles,0);$$('[data-spp]').forEach(b=>b.onclick=()=>{if(b.dataset.spp==='custom')return rangeSheet();S.preset=b.dataset.spp;localStorage.pulsePreset=S.preset;render()});if(typeof sgFill==='function')sgFill($('.spsec'))}
(function(){const st=document.createElement('style');st.textContent=`
.spsec{margin-top:18px}.sphead{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:10px;margin:0 2px 12px}.sphead h2{margin:0}.sphead h2 small{display:block;margin:4px 0 0}
.sprange{margin:0}
.spgrid{display:grid;grid-template-columns:1fr;gap:14px}
@media(min-width:1100px){.spgrid{grid-template-columns:1.1fr 1.3fr 1fr}}
.spk{display:grid;grid-template-columns:1fr 1fr;gap:14px 18px;margin:6px 0 10px}.spk b{display:block;font-size:30px;font-weight:300;letter-spacing:-.5px}.spk span{font-size:13px;color:var(--mut)}
.spfn{margin:10px 0 0;line-height:1.45}.sprow{cursor:pointer}.sprow:hover{background:rgba(255,255,255,.03)}.spsh{aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.06);margin:0 0 14px}.spsh img{width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s}.spsh img.in{opacity:1}.spdaily svg{width:100%;height:84px;display:block}.spk4 b small{font-size:.5em;color:var(--mut)}
.sprow{display:grid;grid-template-columns:64px 1fr auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}.sprow:last-child{border:0}
.spth{width:64px;aspect-ratio:16/9;border-radius:7px;overflow:hidden;background:rgba(255,255,255,.06)}.spth img{width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s}.spth img.in{opacity:1}
.spn{min-width:0}.spn b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.spn span{font-size:12px;color:var(--mut)}
.spb{height:6px;border-radius:6px;background:rgba(255,255,255,.07);margin-top:6px;overflow:hidden}.spb i{display:block;height:100%;border-radius:6px;background:${'#9ee6b4'}}
.sprow em,.spl em{font-style:normal;font-weight:500;white-space:nowrap}
.spl{display:grid;grid-template-columns:minmax(120px,1.4fr) 1fr auto;gap:12px;align-items:center;padding:8px 0}.spl span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.spl .spb{margin:0}`;document.head.appendChild(st)})();
