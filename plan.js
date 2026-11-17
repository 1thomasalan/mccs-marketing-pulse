// MCCS Pulse v83: Social plan (Wrike Social Calendar) + planning runway.
//  Data: evData().social = {asof,name,since,layers,items:[{id,t,s,e,st,layers,first,base,ready,moved}],hist:[{d,w[6],r[6]}]}
//  published (encrypted, inside the events payload) by the MCCS Social Media project from the Wrike public shared calendar, daily.
//  - Plan vs posted: each planned item matched to Facebook MCCS Okinawa / Instagram @mccsoki posts (3 days before to 5 days after,
//    title key words). Other MCCS pages count as "on another page".
//  - Planning runway: weeks ahead that are planned (75%+ of the usual weekly pace) and how much of the next 7 days is ready.
//    Targets agreed with Alan 2026-11-17: everything ready (Scheduled/Completed) 7 days ahead; 3 weeks planned.
//  - Lead time: days between an item first appearing in the calendar and its post date. Only known for items added after
//    daily tracking began (social.since); earlier items are the baseline.
// Loaded after brief.js. Uses app globals only at call time.
const SPN={k:'',R:null,f:'all',rng:'14',n:25};
const SP_TGT={ready:7,weeks:3};
const spSoc=()=>{const d=evData();return d&&d.social&&Array.isArray(d.social.items)&&d.social.items.length?d.social:null};
const SP_READY=/^(complete|scheduled|approved|published|posted)/i,SP_CANC=/^cancel/i;
const SP_LAY={'[MCCS Okinawa] FB & IG':'FB & IG','[MCCS Okinawa] FB Only':'FB only','[MCCS Oki] Instagram Only':'IG only','[okilivingmag] Instagram':'Okilivingmag IG','FB Insertion Orders':'Paid insertion','Stories':'Stories','FB Cover Image':'FB cover'};
const SP_MAIN={fb:'MCCS Okinawa',ig:'mccsoki'};
const SP_STOP=new Set(['social','media','post','posts','graphic','recording','copy','evergreen','sale','release','sold','out','promo','reel','flyer','class','busops','week','month','olm','oct','nov','dec','lto','sm','2nd','there','better','time','year','here']);
const spWords=t=>{t=String(t||'');if(/^26P-/i.test(t)){t=t.replace(/^26P-\d+\s*/i,'').replace(/\(.*$/,'').replace(/[\d/]+/g,'');return bfWords(t).filter(w=>!SP_STOP.has(w)).slice(0,1)}
  t=t.replace(/\d+\/\d+/g,' ');const m=[...t.matchAll(/\[([^\]]+)\]/g)].map(x=>x[1]);let s=m.length?m.join(' '):t;const np=s.replace(/\(.*?\)/g,' ');if(bfWords(np).length)s=np;
  return bfWords(s.replace(/_/g,' ')).filter(w=>!SP_STOP.has(w))};
const spNeed=n=>n<=2?n:n<=4?2:Math.ceil(n/2);
const spClean=t=>String(t||'').replace(/\]\s*(Social Media Post|Social Media|SM post)\s*/gi,'] ').replace(/[[\]]/g,'').replace(/\s+/g,' ').replace(/^[\s-]+|[\s-]+$/g,'');
function spKind(x){const L=x.layers.join('|');if(/Test MSR|Special Consideration/i.test(L))return 'skip';if(/Insertion/i.test(L)||/^26P-/i.test(x.t))return 'paid';
  if(/okilivingmag/i.test(L))return 'olm';if(/^Stories$|FB Cover/i.test(L))return 'other';return 'organic'}
function spWant(x){const L=x.layers.join('|');if(x.kind==='paid')return ['fb'];if(x.kind!=='organic')return [];return /Instagram Only/i.test(L)?['ig']:/FB Only/i.test(L)?['fb']:['fb','ig']}
// every item with its match; cached on social + posts
function spRows(){const so=spSoc();if(!so)return null;const posts=gsPosts();let pe='';for(const r of posts)if(r.d>pe)pe=r.d;
  const k=[so.asof,posts.length,pe,P.todayKey()].join('~');if(SPN.k===k&&SPN.R)return SPN.R;
  const t=P.todayKey(),from=P.addDays(t,-400),ix=bfIx(posts),rows=[];
  for(const x0 of so.items){const x={...x0};x.kind=spKind(x);if(x.kind==='skip')continue;x.canc=SP_CANC.test(x.st);x.rdy=SP_READY.test(x.st);x.want=spWant(x);x.w=spWords(x.t);x.lay=SP_LAY[(x.layers||[])[0]]||(x.layers||[])[0]||'';
    x.posts=[];x.other=[];
    if(x.s>=from&&x.s<=t&&!x.canc&&x.w.length){const lo=P.addDays(x.s,-3),hi=P.addDays(x.e||x.s,5),need=spNeed(x.w.length),cnt=new Map();
      for(const w of x.w)for(const i of ix.get(w)||[])cnt.set(i,(cnt.get(i)||0)+1);
      for(const [i,c] of cnt){if(c<need)continue;const r=posts[i];if(r.d<lo||r.d>hi)continue;(r.page===SP_MAIN[r.plat]?x.posts:x.other).push(r)}
      x.posts.sort((a,b)=>(b.v||0)-(a.v||0));x.other.sort((a,b)=>(b.v||0)-(a.v||0))}
    const got=new Set(x.posts.map(r=>r.plat));x.got=got;x.views=x.posts.reduce((a,r)=>a+(+r.v||0),0);
    x.state=x.canc?'canc':x.s>t?'up':x.kind==='olm'||x.kind==='other'?'nt':x.s>pe||(!x.posts.length&&!x.other.length&&x.s>=P.addDays(pe,-1))?'wait':x.posts.length?(x.want.some(c=>!got.has(c))?'part':'ok'):x.other.length?'else':'miss';
    rows.push(x)}
  SPN.R={rows,pe,t,so};SPN.k=k;return SPN.R}
// usual pace: planned items a week over the last 8 full weeks (canceled and skipped left out)
function spPace(R){const t=R.t,a=P.addDays(t,-56);const n=R.rows.filter(x=>!x.canc&&x.s>=a&&x.s<t).length;return n/8}
function spRunway(R){const t=R.t,pace=spPace(R),wk=[];for(let i=0;i<6;i++){const a=P.addDays(t,i*7),b=P.addDays(t,i*7+6);const L=R.rows.filter(x=>!x.canc&&x.s>=a&&x.s<=b);
    wk.push({a,b,n:L.length,r:L.filter(x=>x.rdy).length,L})}
  let weeks=0;for(const w of wk){if(pace&&w.n>=pace*.75)weeks++;else break}
  const lt=R.rows.filter(x=>!x.canc&&!x.base&&x.first&&x.s>=x.first).map(x=>P.daysBetween(x.first,x.s)-1).sort((a,b)=>a-b);
  const rl=R.rows.filter(x=>!x.canc&&!x.base&&x.ready&&x.s>=x.ready).map(x=>P.daysBetween(x.ready,x.s)-1).sort((a,b)=>a-b);
  const med=a=>a.length?a[Math.floor(a.length/2)]:null;
  return {pace,wk,weeks,ready:wk[0],lt:med(lt),ltN:lt.length,rl:med(rl),rlN:rl.length,since:R.so.since,hist:R.so.hist||[]}}
const spDue=x=>{const d=P.daysBetween(P.todayKey(),x.s)-1;return d<=0?'today':d===1?'tomorrow':'in '+d+' days'};
const SPST={ok:['g','Went out'],part:['a','Facebook only, Instagram not found'],miss:['r','Not found in posts'],else:['a','Found on another MCCS page'],canc:['m','Canceled in Wrike'],nt:['m','Not tracked in Pulse'],up:['b','Planned'],wait:['m','Post data not in yet']};
function spChans(x){if(!x.want.length)return '';return x.want.map(c=>{const l=c==='fb'?'FB':'IG';const cls=x.state==='up'||x.state==='canc'||x.state==='wait'?'b':x.got.has(c)?'g':'r';return `<span class="pnch ${cls}">${l}${cls==='g'?' ✓':cls==='r'?' –':''}</span>`}).join('')}
function spRow(x){const [c,l]=SPST[x.state];let res;
  if(x.state==='ok'||x.state==='part'){const p=x.posts[0];res=`<b>${hk(x.views)}</b> views<small>${hd(p.d)}${x.posts.length>1?' · '+x.posts.length+' posts':''}</small>`}
  else if(x.state==='else'){const p=x.other[0];res=`${esc(String(p.page).replace(/^MCCS Okinawa - /,''))}<small>${hd(p.d)}</small>`}
  else if(x.state==='up'){const late=!x.rdy&&x.kind!=='paid'&&P.daysBetween(P.todayKey(),x.s)-1<=SP_TGT.ready;res=`<span class="${late?'pnw':''}">${esc(x.st)}</span><small>${spDue(x)}</small>`}
  else res=`<span>${esc(x.st)}</span>`;
  const link=(x.posts[0]||x.other[0]||{}).link;
  return `<div class="pnrw"><div class="pnd">${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+x.s.slice(5,7)-1]}<b>${+x.s.slice(8)}</b></div><div class="pnm"><div class="pnt" title="${esc(x.t)}">${esc(spClean(x.t))}</div>
   <div class="pns"><i class="pndot ${c}"></i>${l} · ${esc(x.lay)} ${spChans(x)}</div></div><div class="pnr">${res}${link?`<a class="wlink" href="${esc(link)}" target="_blank" rel="noopener">Open post ↗</a>`:''}<a class="wlink" href="https://www.wrike.com/open.htm?id=${encodeURIComponent(x.id)}" target="_blank" rel="noopener">Wrike ↗</a></div></div>`}
// runway bars: each week ahead, planned vs the usual pace, ready part filled
function spBars(W){const max=Math.max(W.pace,...W.wk.map(w=>w.n),1);
  return `<div class="pnbars">${W.wk.map((w,i)=>{const h=w.n/max*100,hr=w.r/max*100,ok=W.pace&&w.n>=W.pace*.75;
    return `<div class="pnb" title="${esc(hd(w.a))} – ${esc(hd(w.b))}: ${w.n} planned, ${w.r} ready"><div class="pnbc"><i class="pace" style="bottom:${W.pace/max*100}%"></i><span class="${ok?'':'thin'}" style="height:${h}%"><em style="height:${w.n?w.r/w.n*100:0}%"></em></span></div><b>${w.n}</b><small>${i?'+'+i+' wk':'7 days'}</small></div>`}).join('')}</div>`}
function spRunwayCard(W,full){const r=W.ready,pct=r.n?Math.round(r.r/r.n*100):100;
  const trend=W.hist.length>=2?`<div class="pntr">${W.hist.slice(-30).map(h=>{const p=h.w[0]?h.r[0]/h.w[0]:1;return `<i title="${esc(hd(h.d))}: ${h.r[0]} of ${h.w[0]} ready" style="height:${Math.max(6,p*100)}%" class="${p>=1?'g':p>=.5?'a':'r'}"></i>`}).join('')}</div><small class="mut">Ready share of the next 7 days, each day since ${esc(hd(W.hist[0].d))}</small>`:'';
  return `<div class="pnrun"><div class="pnkp"><div class="${W.weeks>=SP_TGT.weeks?'g':'a'}"><b>${W.weeks} of ${SP_TGT.weeks}</b><span>weeks planned ahead<br><small>goal 3 weeks at the usual pace (${Math.round(W.pace)} a week)</small></span></div>
   <div class="${pct>=100?'g':pct>=50?'a':'r'}"><b>${r.r} of ${r.n}</b><span>ready for the next 7 days<br><small>goal: all Scheduled or Completed 7 days out</small></span></div>
   ${full?`<div><b>${W.ltN>=5?W.lt+' days':'—'}</b><span>typical lead time<br><small>${W.ltN>=5?`added to Wrike to post date, ${W.ltN} items since ${esc(hd(W.since))}`:`measuring since ${esc(hd(W.since))}, shows after 5 new items`}</small></span></div>
   <div><b>${W.rlN>=5?W.rl+' days':'—'}</b><span>ready ahead<br><small>${W.rlN>=5?`ready to post date, ${W.rlN} items`:`measuring since ${esc(hd(W.since))}`}</small></span></div>`:''}</div>
   ${spBars(W)}<p class="mut sm spfn">Bars: planned posts each week from today. Filled part is ready. The line is the usual pace. A week counts as planned at 75% of the pace.</p>${full?trend:''}</div>`}
// ---------- Today ----------
function spToday(){const R=spRows();if(!R)return '';const W=spRunway(R),t=R.t;
  const due=R.rows.filter(x=>x.state==='up'&&!x.rdy&&x.kind!=='paid'&&P.daysBetween(t,x.s)-1<=3).slice(0,6);
  return `<section class="pntoday"><div class="card"><h2 class="bfh">Social plan <small>Wrike Social Calendar · read ${esc(hd(R.so.asof.slice(0,10)))}</small><button class="hbtn sm ghost bfopen" data-nav="plan">Social plan ›</button></h2>
   ${spRunwayCard(W,false)}
   ${due.length?`<div class="pndue"><h3><i class="pndot a"></i>${due.length} due in 3 days ${due.length>1?'are':'is'} not ready yet</h3>${due.map(x=>`<div class="pndr"><span>${esc(spClean(x.t))}</span><small>${esc(hd(x.s))} · ${esc(x.lay)} · ${esc(x.st)}</small></div>`).join('')}</div>`:''}</div></section>`}
// ---------- Social plan view ----------
const SP_RNG=[['14','Last 2 weeks'],['30','Last 30 days'],['90','Last 90 days'],['ytd','This year']];
function spView(){const R=spRows();if(!R)return `<div class="pnv"><div class="hbtn ghost sm" data-nav="overview">‹ Today</div><h1>Social plan</h1><p class="mut">No social plan data yet. It arrives with the next data publish.</p></div>`;
  const t=R.t,W=spRunway(R),end=R.pe<t?R.pe:t,a=SPN.rng==='ytd'?t.slice(0,4)+'-01-01':P.addDays(end,-(+SPN.rng-1));
  const inR=R.rows.filter(x=>x.s>=a&&x.s<=end),act=inR.filter(x=>x.state!=='canc'),org=act.filter(x=>x.kind==='organic');
  const n=s=>org.filter(x=>x.state===s).length,views=org.reduce((s,x)=>s+(x.state==='ok'||x.state==='part'?x.views:0),0);
  const F={all:x=>true,miss:x=>x.state==='miss'||x.state==='else',part:x=>x.state==='part',paid:x=>x.kind==='paid',canc:x=>x.state==='canc'};
  let L=inR.filter(F[SPN.f]).sort((x,y)=>x.s<y.s?1:x.s>y.s?-1:0);
  const up=R.rows.filter(x=>x.state==='up'&&x.s<=P.addDays(t,13)).sort((x,y)=>x.s<y.s?-1:1);
  const best=org.filter(x=>x.views).sort((x,y)=>y.views-x.views).slice(0,5);
  const paid=act.filter(x=>x.kind==='paid'),pf=paid.filter(x=>x.posts.length).length;
  return `<div class="pnv"><button class="hbtn ghost sm" data-nav="overview">‹ Today</button><h1>Social plan</h1>
   ${scopeLine(['Wrike Social Calendar (shared link), read '+hd(R.so.asof.slice(0,10),{year:'numeric'}),`compared with Facebook MCCS Okinawa and Instagram @mccsoki posts through ${hd(R.pe,{year:'numeric'})}`,'a match is a post 3 days before to 5 days after the planned date that shares the title’s key words','Test and Special Consideration items left out'])}
   <div class="card"><h2>Planning runway <small>from today, ${esc(hd(t))}</small></h2>${spRunwayCard(W,true)}</div>
   <div class="range presets pnrng">${SP_RNG.map(([k,l])=>`<button data-sprng="${k}" class="${SPN.rng===k?'on':''}">${l}</button>`).join('')}</div>
   <div class="pnk4"><div><b>${org.length}</b><span>planned posts<br><small>${esc(hd(a))} – ${esc(hd(end))}, canceled left out</small></span></div><div class="g"><b>${n('ok')+n('part')}</b><span>went out<br><small>${hk(views)} views on the matched posts</small></span></div>
    <div class="a"><b>${n('part')}</b><span>Facebook only<br><small>planned FB &amp; IG, Instagram post not found</small></span></div><div class="r"><b>${n('miss')+n('else')}</b><span>not found<br><small>${n('else')} on another MCCS page${n('wait')?` · ${n('wait')} waiting for post data`:''}</small></span></div></div>
   <div class="pngrid"><div><div class="card"><h2>Plan vs posted <small>${esc(hd(a))} – ${esc(hd(end))}, newest first</small></h2>
    <div class="range presets pnf">${[['all','All '+inR.length],['miss','Not found'],['part','Facebook only'],['paid','Paid'],['canc','Canceled']].map(([k,l])=>`<button data-spf="${k}" class="${SPN.f===k?'on':''}">${l}</button>`).join('')}</div>
    ${L.length?L.slice(0,SPN.n).map(spRow).join(''):'<p class="mut">Nothing here.</p>'}${L.length>SPN.n?`<button class="hbtn sm ghost" id="spMore">Show ${Math.min(25,L.length-SPN.n)} more of ${L.length-SPN.n}</button>`:''}</div></div>
   <div><div class="card"><h2>Coming up on social <small>next 14 days · ${up.length} planned</small></h2>${up.length?up.map(spRow).join(''):'<p class="mut">Nothing planned in the next 14 days.</p>'}</div>
    ${best.length?`<div class="card"><h2>Best planned posts <small>${esc(hd(a))} – ${esc(hd(end))}</small></h2>${best.map(x=>`<div class="pnbest"><span>${esc(spClean(x.t))}</span><b>${hk(x.views)}</b></div>`).join('')}<p class="mut sm spfn">Views add up the matched Facebook and Instagram posts.</p></div>`:''}
    ${paid.length?`<div class="card"><h2>Paid insertion orders <small>${esc(hd(a))} – ${esc(hd(end))}</small></h2><div class="pnbig">${pf} of ${paid.length}</div><p class="mut sm spfn">found as page posts. Others may have run as ads, which aren’t in the page export. Check those in Ads Manager.</p></div>`:''}</div></div></div>`}
function bindPlan(){$$('[data-sprng]').forEach(b=>b.onclick=()=>{SPN.rng=b.dataset.pnrng;SPN.n=25;render()});$$('[data-spf]').forEach(b=>b.onclick=()=>{SPN.f=b.dataset.pnf;SPN.n=25;render()});
  const m=$('#spMore');if(m)m.onclick=()=>{SPN.n+=25;render()};$$('.pnv [data-nav]').forEach(b=>b.onclick=()=>hubNav(b.dataset.nav))}
{const _n=hubNav;hubNav=function(t){if(t==='plan'){if(typeof gsClose==='function')gsClose(true);if($('#sheet').classList.contains('show'))closeSheet();S.view='plan';render();scrollTo(0,0);return}return _n.apply(this,arguments)};
 const _r=render;render=function(){if(S.view==='plan'&&!TV.on&&!(S.locked&&SYNC.meta)&&S.posts.length){const app=$('#app');$('#dock').style.display='flex';app.innerHTML=topbar()+spView();bindTop();bindPlan();hubDock();return}return _r.apply(this,arguments)};
 const _t=hubToday;hubToday=function(){const h=_t.apply(this,arguments);let x='';try{x=spToday()}catch(e){console.warn('social plan',e)}return x?h.replace('<section class="hbot">',x+'<section class="hbot">'):h}}
(function(){const st=document.createElement('style');st.textContent=`
.pnv h1{font-family:var(--serif);font-weight:400;font-size:clamp(30px,4.6vw,52px);margin:10px 0 4px}.pnv>.card{margin:14px 0}
.pngrid{display:grid;grid-template-columns:1fr;gap:14px}.pngrid>div>.card{margin:0 0 14px}@media(min-width:1100px){.pngrid{grid-template-columns:1.25fr 1fr}}
.pnk4,.pnkp{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:10px 0 14px}@media(min-width:900px){.pnk4{grid-template-columns:repeat(4,1fr)}.pnv .pnkp{grid-template-columns:repeat(4,1fr)}}
.pnk4>div,.pnkp>div{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:12px 14px;display:flex;gap:12px;align-items:center}.pnkp>div{background:transparent}
.pnk4 b,.pnkp b{font-family:var(--serif);font-weight:400;font-size:32px;white-space:nowrap}.pnk4 span,.pnkp span{font-size:13.5px;line-height:1.3}.pnk4 small,.pnkp small{color:var(--mut);font-size:11.5px}
.pnk4 .g b,.pnkp .g b{color:#9ee6b4}.pnk4 .a b,.pnkp .a b{color:#f3c860}.pnk4 .r b,.pnkp .r b{color:#ffb0a8}
.pnrw{display:flex;gap:12px;align-items:center;padding:9px 0;border-top:1px solid var(--line)}.pnd{width:38px;text-align:center;color:var(--mut);font-size:10.5px;text-transform:uppercase;line-height:1.1;flex:none}.pnd b{display:block;font-size:18px;color:var(--txt);font-weight:600}
.pnm{flex:1;min-width:0}.pnt{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pns{font-size:12px;color:var(--mut);margin-top:3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pndot{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none;background:rgba(255,255,255,.3)}.pndot.g{background:#9ee6b4}.pndot.a{background:#f3c860}.pndot.r{background:#ffb0a8}.pndot.b{background:#8fb4ff}
.pnch{font-size:10.5px;border-radius:6px;padding:1px 6px;border:1px solid var(--line)}.pnch.g{color:#9ee6b4;border-color:rgba(158,230,180,.35)}.pnch.r{color:#ffb0a8;border-color:rgba(255,176,168,.35)}.pnch.b{color:#8fb4ff;border-color:rgba(143,180,255,.35)}
.pnr{text-align:right;font-size:13px;min-width:104px;flex:none}.pnr b{font-size:15.5px}.pnr small{display:block;color:var(--mut);font-size:11.5px}.pnr .wlink{display:inline-block;font-size:11.5px;margin-left:8px;color:var(--glow);text-decoration:none}.pnw{color:#f3c860}
.pnbars{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;align-items:end;margin:6px 0 2px}.pnb{text-align:center}.pnbc{position:relative;height:92px;display:flex;align-items:flex-end;justify-content:center}
.pnbc span{width:62%;max-width:44px;border-radius:8px 8px 3px 3px;background:rgba(143,180,255,.28);position:relative;overflow:hidden;min-height:3px}.pnbc span.thin{background:rgba(255,176,168,.25)}
.pnbc em{position:absolute;left:0;right:0;bottom:0;background:#9ee6b4;opacity:.85}.pnbc .pace{position:absolute;left:4%;right:4%;border-top:1px dashed rgba(255,255,255,.45)}.pnb b{display:block;font-size:15px;margin-top:5px}.pnb small{font-size:11px;color:var(--mut)}
.pntr{display:flex;gap:3px;align-items:flex-end;height:38px;margin:12px 0 4px}.pntr i{flex:1;max-width:14px;border-radius:3px;background:#ffb0a8}.pntr i.g{background:#9ee6b4}.pntr i.a{background:#f3c860}
.pndue{margin-top:10px;border-top:1px solid var(--line);padding-top:10px}.pndue h3{font-size:14.5px;font-weight:500;margin:0 0 4px;display:flex;gap:8px;align-items:center}.pndr{padding:6px 0 6px 16px;border-top:1px solid rgba(255,255,255,.05)}.pndr span{display:block;font-size:14px}.pndr small{color:var(--mut);font-size:12px}
.pnbest{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--line);font-size:14px}.pnbest b{color:#9ee6b4}.pnbig{font-family:var(--serif);font-size:34px}
.pntoday{margin:0 0 14px}.pnrng{margin:4px 0 0}.pnf{margin:2px 0 8px}#spMore{margin-top:10px}
@media(max-width:700px){.pnr .wlink{display:block;margin:2px 0 0}.pnbars{gap:6px}.pnk4 b,.pnkp b{font-size:26px}.pnkp>div,.pnk4>div{flex-direction:column;align-items:flex-start;gap:2px}}
`;document.head.appendChild(st)})();
