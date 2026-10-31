// Pulse core: pure data logic (CSV parse, Meta mapping, ranges, stats). No DOM.
(function(G){
const P={};
P.parseCSV=function(text){
  if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
  const rows=[];let row=[],f='',q=false,i=0,n=text.length;
  while(i<n){const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i+=2;continue;} q=false;i++;continue;} f+=c;i++;continue;}
    if(c==='"'){q=true;i++;continue;}
    if(c===','){row.push(f);f='';i++;continue;}
    if(c==='\r'){i++;continue;}
    if(c==='\n'){row.push(f);rows.push(row);row=[];f='';i++;continue;}
    f+=c;i++;}
  if(f!==''||row.length){row.push(f);rows.push(row);}
  return rows;
};
const num=v=>{if(v==null||v==='')return 0;const x=parseFloat(String(v).replace(/,/g,''));return isNaN(x)?0:x};
// Meta "MM/DD/YYYY HH:MM" in US Pacific -> UTC ms
function laOffsetMin(ms){
  const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(ms));
  const g=t=>+p.find(x=>x.type===t).value;
  const asUTC=Date.UTC(g('year'),g('month')-1,g('day'),g('hour')%24,g('minute'));
  return (asUTC-ms)/60000;
}
P.pacificToUTC=function(s){
  const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/.exec(s||'');if(!m)return null;
  const guess=Date.UTC(+m[3],+m[1]-1,+m[2],+m[4],+m[5]);
  let ms=guess-laOffsetMin(guess)*60000; ms=guess-laOffsetMin(ms)*60000; return ms;
};
const JSTD=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'});
P.jstKey=ms=>JSTD.format(new Date(ms));
P.todayKey=()=>P.jstKey(Date.now());
P.mapRows=function(rows){
  const h=rows[0].map(x=>x.trim());const ix=k=>h.indexOf(k);
  const plat=ix('Account username')>=0?'ig':(ix('Page name')>=0?'fb':null);
  if(!plat) throw new Error('Not a Meta Business Suite post export');
  const col=k=>{const j=ix(k);return r=>j>=0?r[j]:''};
  const id=col('Post ID'),page=plat==='ig'?col('Account username'):col('Page name'),link=col('Permalink'),type=col('Post type'),
    pt=col('Publish time'),title=col('Title'),desc=col('Description'),views=col('Views'),reach=col('Reach'),
    rx=plat==='ig'?col('Likes'):col('Reactions'),cm=col('Comments'),sh=col('Shares'),sv=col('Saves'),lc=col('Link Clicks'),fo=col('Follows'),tc=col('Total clicks');
  const out=[];
  for(let k=1;k<rows.length;k++){const r=rows[k];if(!r||r.length<3||!id(r))continue;
    const t=P.pacificToUTC(pt(r));if(t==null)continue;
    let cap=(title(r)||'');const d2=desc(r)||'';cap=cap&&d2?cap+' — '+d2:(cap||d2);
    out.push({id:id(r),plat,page:page(r)||'',link:link(r),type:type(r),t,d:P.jstKey(t),cap:cap.replace(/\s+/g,' ').trim().slice(0,280),
      v:num(views(r)),re:num(reach(r)),rx:num(rx(r)),cm:num(cm(r)),sh:num(sh(r)),sv:num(sv(r)),lc:num(lc(r)),tc:num(tc(r)),fo:num(fo(r))});
  }
  return {plat,rows:out};
};
P.merge=function(existing,incoming){const m=new Map(existing.map(r=>[r.id,r]));let add=0,upd=0;
  for(const r of incoming){if(m.has(r.id)){upd++;const o=m.get(r.id);if(!r.re&&o.re)r.re=o.re;}else add++;m.set(r.id,r);}
  return {posts:[...m.values()],add,upd};
};
// date keys
const toD=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))};
const toK=d=>d.toISOString().slice(0,10);
P.addDays=(k,n)=>{const d=toD(k);d.setUTCDate(d.getUTCDate()+n);return toK(d)};
P.daysBetween=(a,b)=>Math.round((toD(b)-toD(a))/864e5)+1;
P.preset=function(name,today){today=today||P.todayKey();const d=toD(today);const y=d.getUTCFullYear(),m=d.getUTCMonth();
  let s,e,cs,ce;
  if(name==='lastweek'){const dow=(d.getUTCDay()+6)%7;e=P.addDays(today,-dow-1);s=P.addDays(e,-6);}
  else if(name==='7'){e=P.addDays(today,-1);s=P.addDays(e,-6);}
  else if(name==='30'){e=P.addDays(today,-1);s=P.addDays(e,-29);}
  else if(name==='month'){s=toK(new Date(Date.UTC(y,m,1)));e=today;cs=toK(new Date(Date.UTC(y,m-1,1)));ce=toK(new Date(Date.UTC(y,m,0)));}
  else if(name==='lastmonth'){s=toK(new Date(Date.UTC(y,m-1,1)));e=toK(new Date(Date.UTC(y,m,0)));cs=toK(new Date(Date.UTC(y,m-2,1)));ce=toK(new Date(Date.UTC(y,m-1,0)));}
  else if(name==='ytd'){s=y+'-01-01';e=today;cs=(y-1)+'-01-01';ce=(y-1)+e.slice(4);}
  if(!cs){const n=P.daysBetween(s,e);ce=P.addDays(s,-1);cs=P.addDays(ce,-(n-1));}
  return {s,e,cs,ce};
};
P.yoy=function(s,e){const f=k=>(+k.slice(0,4)-1)+k.slice(4);return {cs:f(s),ce:f(e)}};
P.compareFor=function(s,e){const n=P.daysBetween(s,e);const ce=P.addDays(s,-1);return {cs:P.addDays(ce,-(n-1)),ce}};
P.eng=r=>r.rx+r.cm+r.sh+r.sv;
const med=a=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y);const h=b.length>>1;return b.length%2?b[h]:(b[h-1]+b[h])/2};
P.median=med;
P.filter=(posts,s,e,f)=>posts.filter(r=>r.d>=s&&r.d<=e&&(!f||f==='all'||r.plat===f));
P.totals=function(list){const t={n:list.length,v:0,e:0,lc:0,fo:0,rx:0,cm:0,sh:0,sv:0,fb:{n:0,v:0,e:0},ig:{n:0,v:0,e:0}};
  for(const r of list){const e=P.eng(r);t.v+=r.v;t.e+=e;t.lc+=r.lc;t.fo+=r.fo;t.rx+=r.rx;t.cm+=r.cm;t.sh+=r.sh;t.sv+=r.sv;const p=t[r.plat];p.n++;p.v+=r.v;p.e+=e;}
  t.med=med(list.map(r=>r.v));t.epk=t.v?t.e/t.v*1000:0;return t;};
P.metric=(r,m)=>m==='e'?P.eng(r):m==='n'?1:(r[m]||0);
P.series=function(list,s,e,m){m=m||'v';const n=P.daysBetween(s,e);const step=n>120?'month':(n>45?'week':'day');const b=new Map();
  const keyOf=d=>{if(step==='day')return d;if(step==='month')return d.slice(0,7)+'-01';const dt=toD(d);const dow=(dt.getUTCDay()+6)%7;return P.addDays(d,-dow)};
  let k=keyOf(s);while(k<=e){b.set(k,{k,fb:0,ig:0});k=step==='day'?P.addDays(k,1):step==='week'?P.addDays(k,7):(()=>{const d=toD(k);d.setUTCMonth(d.getUTCMonth()+1);return toK(d)})();}
  for(const r of list){const x=b.get(keyOf(r.d));if(x)x[r.plat]+=P.metric(r,m);}
  return {step,pts:[...b.values()]};};
P.byPage=function(list){const m=new Map();for(const r of list){const k=r.plat+'|'+r.page;if(!m.has(k))m.set(k,{plat:r.plat,page:r.page,rows:[]});m.get(k).rows.push(r);}
  return [...m.values()].map(g=>({...g,...P.totals(g.rows)})).sort((a,b)=>b.v-a.v);};
P.byType=function(list){const m=new Map();for(const r of list){const k=r.plat+'|'+r.type;if(!m.has(k))m.set(k,[]);m.get(k).push(r);}
  return [...m.entries()].map(([k,rows])=>({plat:k.split('|')[0],type:k.split('|')[1],n:rows.length,med:med(rows.map(r=>r.v)),epk:(()=>{const v=rows.reduce((a,r)=>a+r.v,0);return v?rows.reduce((a,r)=>a+P.eng(r),0)/v*1000:0})()})).filter(x=>x.n>=3).sort((a,b)=>b.med-a.med);};
P.fmt=n=>{n=+n||0;if(n>=1e6)return (n/1e6).toFixed(n>=1e7?1:2).replace(/\.?0+$/,'')+'M';if(n>=1e4)return Math.round(n/1e3)+'K';if(n>=1e3)return (n/1e3).toFixed(1).replace(/\.0$/,'')+'K';return Math.round(n).toLocaleString('en-US')};
P.pct=(a,b)=>b?((a-b)/b*100):null;
P.short=p=>(p||'').replace(/^MCCS Okinawa\s*-\s*/,'').replace(/^MCCS Okinawa /,'')||'MCCS Okinawa';
P.label=r=>{const c=(r.cap||'').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu,'').replace(/\s+/g,' ').trim();const s=c.split(/(?<=[.!?])\s|—/)[0]||c;return s.length>60?s.slice(0,58).trim()+'…':(s||'Untitled post')};
P.fmtDate=(k,o)=>toD(k).toLocaleDateString('en-US',Object.assign({timeZone:'UTC',month:'short',day:'numeric'},o||{}));
P.rangeLabel=(s,e)=>{const sy=s.slice(0,4),ey=e.slice(0,4);return sy===ey?`${P.fmtDate(s)} – ${P.fmtDate(e)}, ${ey}`:`${P.fmtDate(s,{year:'numeric'})} – ${P.fmtDate(e,{year:'numeric'})}`};
P.summary=function(cur,prev,list,s,e){const out=[],next=[];const d=P.pct(cur.v,prev.v);
  out.push(`Posts earned ${P.fmt(cur.v)} views across ${cur.n} posts${d!=null&&prev.n?`, ${d>=0?'up':'down'} ${Math.abs(d).toFixed(1)}% from the prior period`:''}.`);
  if(cur.ig.n&&cur.fb.n){const pp=cur.ig.n/cur.n*100,pe=cur.e?cur.ig.e/cur.e*100:0;out.push(`Instagram delivered ${pe.toFixed(0)}% of engagement from ${pp.toFixed(0)}% of posts.`);
    if(pe>pp*2)next.push('Move more effort to Instagram, especially carousels and reels.');}
  const top=[...list].sort((a,b)=>b.v-a.v)[0];if(top)out.push(`Top post: “${P.label(top)}” (${P.short(top.page)}) with ${P.fmt(top.v)} views.`);
  const lcTop=[...list].sort((a,b)=>b.lc-a.lc)[0];if(lcTop&&lcTop.lc>0&&cur.lc)out.push(`${cur.lc.toLocaleString('en-US')} link clicks; “${P.label(lcTop)}” drove ${Math.round(lcTop.lc/cur.lc*100)}% of them.`);
  const fb=list.filter(r=>r.plat==='fb').sort((a,b)=>b.v-a.v);if(fb.length>=20){const k=Math.ceil(fb.length/10);const sh=fb.slice(0,k).reduce((a,r)=>a+r.v,0)/(cur.fb.v||1)*100;if(sh>35)next.push(`Post fewer, stronger Facebook posts: the top 10% earned ${sh.toFixed(0)}% of views.`);}
  const ty=P.byType(list)[0];if(ty)next.push(`Lean into ${ty.type.replace(/^IG /,'Instagram ')}s: best median views (${P.fmt(ty.med)}).`);
  return {out:out.slice(0,3),next:next.slice(0,3)};
};
// heatmap: weekday (Mon=0) x 3-hour block in JST, median views
P.heat=function(list){const g=Array.from({length:7},()=>Array.from({length:8},()=>[]));
  for(const r of list){const d=new Date(r.t+9*3600e3);const wd=(d.getUTCDay()+6)%7,hb=Math.floor(d.getUTCHours()/3);g[wd][hb].push(r.v);}
  return g.map(row=>row.map(a=>({n:a.length,med:med(a)})));};
P.hourJST=r=>new Date(r.t+9*3600e3).getUTCHours();
// ---- website (GA4 "Reports snapshot" CSV export) ----
const ymd=s=>s&&s.length===8?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:'';
P.cleanTitle=t=>String(t||'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]\uFE0F?/gu,'').replace(/\s+/g,' ').trim();
P.isGA4=text=>/Nth day|Page title and screen class|Page path and screen class|Session source \/ medium|Session primary channel group/.test(text.slice(0,400000))&&/# Start date: \d{8}/.test(text);
P.parseGA4=function(text,opt){opt=opt||{};const maxPages=opt.maxPages||500,maxSrc=opt.maxSrc||200,maxCity=opt.maxCity||100;
  if(text.charCodeAt(0)===0xFEFF)text=text.slice(1);
  const lines=text.split(/\r?\n/);let start='',end='',prop='';const secs=[];let cur=null;
  for(const l of lines){if(l.startsWith('#')){const m=l.match(/# Start date: (\d{8})/),n=l.match(/# End date: (\d{8})/),p=l.match(/# Property: (.*)/);
      if(m&&!start)start=ymd(m[1]);if(n&&!end)end=ymd(n[1]);if(p)prop=p[1].trim();cur=null;continue}
    if(!l.trim()){cur=null;continue}
    if(!cur){cur=[];secs.push(cur)}cur.push(l)}
  if(!start||!end)throw new Error('No GA4 date range found in this file');
  // daily reports (a Date column): Traffic acquisition by channel, or Pages and screens by page path
  for(const s of secs){const h=P.parseCSV(s[0]+'\n')[0].map(x=>x.trim());if(h[1]!=='Date')continue;
    const rows=P.parseCSV(s.join('\n')+'\n').slice(1).filter(r=>r.length>=h.length&&r[0]!=='');const n=x=>+x||0,col=k=>h.indexOf(k);
    if(/^Session primary channel group/.test(h[0])){const c=[col('Sessions'),col('Engaged sessions'),col('Average engagement time per session'),col('Event count'),col('Key events')];
      const out=rows.map(r=>[ymd(r[1]),r[0],n(r[c[0]]),n(r[c[1]]),+n(r[c[2]]).toFixed(2),n(r[c[3]]),n(r[c[4]])]).filter(r=>r[0]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:b[2]-a[2]);
      return {v:3,kind:'ch',start,end,prop,rows:out,totals:{sessions:out.reduce((a,r)=>a+r[2],0)}}}
    if(h[0]==='Page path and screen class'){const c=[col('Views'),col('Active users'),col('Average engagement time per active user'),col('Key events')];const paths=[],pi=new Map();let views=0;
      const out=rows.map(r=>{let k=pi.get(r[0]);if(k==null){k=paths.length;paths.push(r[0]);pi.set(r[0],k)}views+=n(r[c[0]]);return [P.daysBetween(start,ymd(r[1]))-1,k,n(r[c[0]]),n(r[c[1]]),+n(r[c[2]]).toFixed(1),n(r[c[3]])]}).filter(r=>r[0]>=0);
      return {v:3,kind:'pg',start,end,prop,paths,rows:out,totals:{views}}}}
  const W={v:2,start,end,prop,totals:null,pages:[],pageCount:0,pageViews:0,first:[],sessions:[],sessionTotal:0,daily:[],keyEvents:0,cities:[]};
  for(const s of secs){const rows=P.parseCSV(s.join('\n')+'\n');const h=rows[0].map(x=>x.trim()),body=rows.slice(1).filter(r=>r.length>=h.length&&r[0]!=='');
    const n=x=>+x||0;
    if(h[0]==='Active users'&&h[1]==='New users'){const r=body[0]||[];W.totals={users:n(r[0]),newUsers:n(r[1]),eng:n(r[2]),events:n(r[3])}}
    else if(h[0]==='Page title and screen class'){const m=new Map();for(const r of body){const t=P.cleanTitle(r[0])||'(untitled)';const o=m.get(t)||[t,0,0,0,0];o[1]+=n(r[1]);o[2]+=n(r[2]);o[3]+=n(r[3]);o[4]+=n(r[4])*n(r[1]);m.set(t,o)}
      const all=[...m.values()].map(o=>[o[0],o[1],o[2],o[3],o[1]?+(o[4]/o[1]).toFixed(4):0]).sort((a,b)=>b[1]-a[1]);W.pageCount=all.length;W.pageViews=all.reduce((a,o)=>a+o[1],0);W.pages=all.slice(0,maxPages)}
    else if(h[0]==='First user source / medium')W.first=body.map(r=>[r[0],n(r[1])]).slice(0,maxSrc);
    else if(h[0]==='Session source / medium'){W.sessionTotal=body.reduce((a,r)=>a+n(r[1]),0);const g={};for(const r of body){const k=P.srcGroup(r[0]);g[k]=(g[k]||0)+n(r[1])}W.groups=g;W.sessions=body.map(r=>[r[0],n(r[1])]).slice(0,maxSrc)}
    else if(h[0]==='Nth day'){W.daily=body.map(r=>[P.addDays(start,+r[0]),n(r[1]),n(r[2])]).filter(r=>r[0]<=end);while(W.daily.length&&W.daily[W.daily.length-1][0]===end&&!W.daily[W.daily.length-1][1]&&!W.daily[W.daily.length-1][2])W.daily.pop()}
    else if(h[0]==='Platform'&&h[1]==='Key events')W.keyEvents=body.reduce((a,r)=>a+n(r[1]),0);
    else if(h[0]==='City')W.cities=body.map(r=>[r[0],n(r[1])]).slice(0,maxCity);}
  if(!W.totals)throw new Error('GA4 file has no summary totals');
  return W};
P.srcGroup=s=>{s=String(s||'').toLowerCase().trim();
  if(s.startsWith('192.0.2.1'))return 'unlabeled';
  if(/(^|\.)facebook\.com|^fb[ _/]|^fb$|facebook/.test(s))return 'facebook';
  if(/instagram|^ig[ _/]|^ig$|^ig_/.test(s))return 'instagram';
  if(s.startsWith('(direct)'))return 'direct';
  if(/organic|^(google|bing|yahoo|duckduckgo|baidu|yandex|naver|ecosia|yahoo\.co\.jp)\b/.test(s))return 'search';
  return 'other'};
P.SRC=[['search','Search','#9fe3c4'],['direct','Direct','#f3d9a4'],['facebook','Facebook','#8fb4ff'],['instagram','Instagram','#f3a6b8'],['other','Other sites','#c4a7e7'],['unlabeled','Unlabeled (192.0.2.1)','rgba(255,255,255,.28)']];
P.NOISE_PAGES=['fb','/more/fb','/robots.txt'];
P.CH=[['search','Search','#9fe3c4'],['direct','Direct','#f3d9a4'],['social','Social media','#8fb4ff'],['referral','Other sites','#c4a7e7'],['ai','AI assistants','#f3a6b8'],['other','Unassigned & other','rgba(255,255,255,.28)']];
P.chGroup=c=>{c=String(c||'');if(/Search/.test(c))return 'search';if(c==='Direct')return 'direct';if(/Social/.test(c))return 'social';if(c==='Referral')return 'referral';if(/AI Assistant/.test(c))return 'ai';return 'other'};
const SNAP2CH={search:'search',direct:'direct',facebook:'social',instagram:'social',other:'referral',unlabeled:'referral'};
P.mergeWeb=(list,w)=>{const id=x=>(x.kind||'snap')+'|'+x.start+'|'+x.end,k=id(w);return [...list.filter(x=>id(x)!==k),w].sort((a,b)=>a.start<b.start?-1:a.start>b.start?1:a.end<b.end?-1:1)};
// choose non-overlapping snapshots that best cover [s,e]
P.webPick=function(snaps,s,e){const ins=x=>{const a=x.start>s?x.start:s,b=x.end<e?x.end:e;return a>b?0:P.daysBetween(a,b)};
  const el=snaps.map(x=>({x,d:P.daysBetween(x.start,x.end),i:ins(x)})).filter(o=>o.i/o.d>=0.85).sort((a,b)=>a.x.end<b.x.end?-1:1);
  const best=[];for(let j=0;j<el.length;j++){let p=-1;for(let k=j-1;k>=0;k--)if(el[k].x.end<el[j].x.start){p=k;break}
    const take=el[j].i+(p>=0?best[p].v:0),skip=j?best[j-1].v:0;best.push(take>=skip?{v:take,set:[...(p>=0?best[p].set:[]),el[j].x]}:best[j-1])}
  const r=best.length?best[best.length-1]:{v:0,set:[]};return {set:r.set,covered:r.v,days:P.daysBetween(s,e)}};
P.snapRange=function(snaps,s,e){if(!snaps||!snaps.length)return null;const pk=P.webPick(snaps,s,e);
  const dm=new Map();for(const x of snaps)for(const d of x.daily||[])if(d[0]>=s&&d[0]<=e)dm.set(d[0],d);
  const daily=[...dm.values()].sort((a,b)=>a[0]<b[0]?-1:1);
  if(!pk.set.length)return daily.length?{set:[],coverage:0,daily,days:pk.days}:null;
  const t={users:0,newUsers:0,engW:0,events:0,sessions:0,keyEvents:0,pageViews:0};const pg=new Map(),g={},src=new Map();
  for(const x of pk.set){t.users+=x.totals.users;t.newUsers+=x.totals.newUsers;t.engW+=x.totals.eng*x.totals.users;t.events+=x.totals.events;t.sessions+=x.sessionTotal||0;t.keyEvents+=x.keyEvents||0;t.pageViews+=x.pageViews||0;
    for(const p of x.pages){const o=pg.get(p[0])||[p[0],0,0];o[1]+=p[1];o[2]+=p[2];pg.set(p[0],o)}
    for(const k in (x.groups||{}))g[k]=(g[k]||0)+x.groups[k];for(const [k,v] of x.sessions||[])src.set(k,(src.get(k)||0)+v)}
  t.eng=t.users?t.engW/t.users:0;t.social=(g.facebook||0)+(g.instagram||0);
  return {src:'snap',srcList:P.SRC,set:pk.set,exact:pk.set.length===1,coverage:pk.covered/pk.days,covered:pk.covered,days:pk.days,start:pk.set[0].start,end:pk.set[pk.set.length-1].end,
    t,pages:[...pg.values()].sort((a,b)=>b[1]-a[1]),groups:g,sources:[...src.entries()].sort((a,b)=>b[1]-a[1]),daily}};
// daily GA4 data (channel and page reports with a Date column), merged by date; later uploads win
const DCACHE=new WeakMap();
P.webDaily=function(all){if(DCACHE.has(all))return DCACHE.get(all);const ch=new Map(),pg=new Map();
  for(const x of all){if(x.kind==='ch'){const by=new Map();for(const r of x.rows){(by.get(r[0])||by.set(r[0],[]).get(r[0])).push(r)}for(const [d,a] of by)ch.set(d,a)}
    else if(x.kind==='pg'){const by=new Map();for(const r of x.rows){const d=P.addDays(x.start,r[0]);(by.get(d)||by.set(d,[]).get(d)).push([x.paths[r[1]],r[2],r[3],r[4],r[5]])}for(const [d,a] of by)pg.set(d,a)}}
  const ks=[...ch.keys()].sort();const o={ch,pg,min:ks[0]||'',max:ks[ks.length-1]||''};DCACHE.set(all,o);return o};
P.webRange=function(all,s,e){if(!all||!all.length)return null;const snaps=all.filter(x=>!x.kind),D=P.webDaily(all);
  const chDays=[];for(let k=s;k<=e;k=P.addDays(k,1))if(D.ch.has(k))chDays.push(k);
  if(!chDays.length||snaps.some(x=>x.start===s&&x.end===e))return P.snapRange(snaps,s,e);
  const base=P.snapRange(snaps,s,e)||{daily:[]};const dm=new Map(base.daily.map(d=>[d[0],d]));
  const out=snaps.filter(x=>x.end<D.min||x.start>D.max);const pk=out.length?P.webPick(out,s,e):{set:[],covered:0};
  const t={users:0,newUsers:0,engW:0,events:0,sessions:0,engaged:0,keyEvents:0,pageViews:0},g={},pg=new Map();let pgDays=0;
  for(const d of chDays){const u=dm.get(d);if(u){t.users+=u[1]+u[2];t.newUsers+=u[1]}
    for(const r of D.ch.get(d)){const k=P.chGroup(r[1]);g[k]=(g[k]||0)+r[2];t.sessions+=r[2];t.engaged+=r[3];t.engW+=r[4]*r[2];t.events+=r[5];t.keyEvents+=r[6]}}
  for(let k=s;k<=e;k=P.addDays(k,1)){const a=D.pg.get(k);if(!a)continue;pgDays++;for(const r of a){const o=pg.get(r[0])||[r[0],0,0,0];o[1]+=r[1];o[2]+=r[2];o[3]+=r[3]*r[2];pg.set(r[0],o);t.pageViews+=r[1]}}
  for(const x of pk.set){t.users+=x.totals.users;t.newUsers+=x.totals.newUsers;t.events+=x.totals.events;t.sessions+=x.sessionTotal||0;t.keyEvents+=x.keyEvents||0;t.engW+=x.totals.eng*(x.sessionTotal||0);
    for(const k in (x.groups||{})){const c=SNAP2CH[k]||'other';g[c]=(g[c]||0)+x.groups[k]}}
  t.eng=t.sessions?t.engW/t.sessions:0;t.social=g.social||0;const days=P.daysBetween(s,e),covered=chDays.length+pk.covered;
  return {src:'daily',srcList:P.CH,set:[{daily:1},...pk.set],exact:covered>=days,coverage:covered/days,covered,days,pgDays,start:chDays[0],end:pk.set.length?pk.set[pk.set.length-1].end:chDays[chDays.length-1],
    t,pages:[...pg.values()].map(o=>[o[0],o[1],o[2],o[2]?+(o[3]/o[2]).toFixed(1):0]).sort((a,b)=>b[1]-a[1]),groups:g,sources:[],daily:base.daily}};
// social account -> website page match, for "who follows through"
P.PROGRAMS=[['Tsunami Scuba',/tsunami scuba/i,/scuba/i],['Taiyo Golf',/golf/i,/golf/i],['Libraries',/librar/i,/librar/i],['Aquatics',/aquatic/i,/aquatic|pools?\b/i],['Semper Fit',/semper fit/i,/fitness|semper fit/i],['Tours+',/tours\+/i,/tour/i],['School Liaison',/school liaison/i,/school liaison/i],['Marine & Family',/marine & family/i,/family|relocation|single marine|transition readiness/i]];
P.webInsights=function(posts,wr,s,e){const out={};if(!wr)return out;
  const sv={};for(const r of posts)if(r.d>=s&&r.d<=e)sv[r.d]=(sv[r.d]||0)+r.v;
  const days=wr.daily.filter(d=>d[1]+d[2]>0&&sv[d[0]]!=null).map(d=>({d:d[0],w:d[1]+d[2],s:sv[d[0]]}));
  if(days.length>=21){const sorted=[...days].sort((a,b)=>b.s-a.s),k=Math.max(1,Math.round(days.length*.2)),top=sorted.slice(0,k),rest=sorted.slice(k);
    const av=a=>a.reduce((x,o)=>x+o.w,0)/a.length;const a=av(top),b=av(rest);out.lift={pct:(a/b-1)*100,big:a,other:b,n:days.length}}
  if(wr.t){const t=wr.t;out.sends={social:t.social,fb:wr.src==='snap'?wr.groups.facebook||0:null,ig:wr.src==='snap'?wr.groups.instagram||0:null,share:t.sessions?t.social/t.sessions:0};
    const rows=[];for(const [label,ar,pr] of P.PROGRAMS){const v=posts.filter(r=>r.d>=s&&r.d<=e&&r.plat==='fb'&&ar.test(r.page)).reduce((a,r)=>a+r.v,0);
      const pv=wr.pages.filter(p=>pr.test(p[0])&&!P.NOISE_PAGES.includes(p[0])).reduce((a,p)=>a+p[1],0);if(v>=5000&&pv>0)rows.push({label,v,pv,per:pv/v*1000})}
    out.follow=rows.sort((a,b)=>b.per-a.per)}
  if(days.length>=14){const W=Array.from({length:7},()=>({s:0,w:0,n:0}));for(const o of days){const wd=(new Date(o.d+'T00:00:00Z').getUTCDay()+6)%7;W[wd].s+=o.s;W[wd].w+=o.w;W[wd].n++}
    const avg=W.map(x=>({s:x.n?x.s/x.n:0,w:x.n?x.w/x.n:0}));const pS=avg.reduce((m,x,i)=>x.s>avg[m].s?i:m,0),pW=avg.reduce((m,x,i)=>x.w>avg[m].w?i:m,0);
    const wk=avg.slice(0,5).map((x,i)=>[x.w,i]).sort((a,b)=>a[0]-b[0]);out.timing={avg,peakSocial:pS,peakWeb:pW,lowWeekday:wk[0][1]}}
  return out};

// ---- email (Constant Contact) ----
const EMON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
const enum_=v=>{if(v==null)return null;const m=String(v).replace(/,/g,'').match(/-?\d+(\.\d+)?/);return m?+m[0]:null};
const epad2=n=>String(n).padStart(2,'0');
P.emDate=function(t){t=String(t||'');let m=t.match(/([A-Za-z]{3})[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})(?:,? (?:at )?(\d{1,2}):(\d{2}) ?([AP]M))?/);
  if(m&&EMON[m[1].toLowerCase()]){let h=m[4]?+m[4]%12+(m[6]==='PM'?12:0):null;return {d:`${m[3]}-${epad2(EMON[m[1].toLowerCase()])}-${epad2(m[2])}`,t:h==null?'':`${epad2(h)}:${m[5]}`}}
  m=t.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);if(m)return {d:`${m[3].length===2?'20'+m[3]:m[3]}-${epad2(m[1])}-${epad2(m[2])}`,t:''};return null};
P.emName=n=>String(n||'').replace(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*-\s*/,'').trim();
P.emailKind=function(text){const h=String(text).replace(/^\uFEFF/,'').slice(0,300);
  if(/^"?Section"?,"?Metric"?,"?Value"?/i.test(h)&&/Email Performance|Email marketing funnel/.test(text))return 'hub';
  if(/^"?Link"?,"?Unique Clicks"?/i.test(h))return 'links';
  if(/^\s*\{/.test(h)&&/"kind"\s*:\s*"camp"/.test(text))return 'camp';return null};
P.parseEmailHub=function(text,fname){const rows=P.parseCSV(String(text).replace(/^\uFEFF/,''));const g={};let blk=null;const top=[],low=[];
  for(const r of rows){const [sec,met,val,cmp]=r;if(!sec)continue;if(met==='Campaign'){blk=/Top/i.test(sec)?top:/Low/i.test(sec)?low:null;continue}
    if(/campaigns by/i.test(sec)){const L=/Top/i.test(sec)?top:low;const dt=P.emDate(val)||P.emDate(met)||{};L.push({name:P.emName(met)||'(untitled)',full:met,date:dt.d||'',time:dt.t||'',rate:enum_(cmp)});continue}
    g[sec.trim()+'|'+String(met).trim()]=[val,cmp]};
  const v=k=>g[k]?enum_(g[k][0]):null,c=k=>g[k]&&g[k][1]?enum_(g[k][1]):null;
  const fd=(String(fname||'').match(/(\d{2})-(\d{2})-(\d{4})/)||[]);const asOf=fd[3]?`${fd[3]}-${fd[1]}-${fd[2]}`:new Date().toISOString().slice(0,10);
  return {kind:'hub',start:asOf.slice(0,4)+'-01-01',end:asOf,
    sent:v('Email Performance|Emails sent'),delivered:v('Email Performance|Delivered'),openRate:v('Email Performance|Open rate'),clickRate:v('Email Performance|Click rate'),
    bounced:v('Email Performance|Bounced'),unsubs:v('Email Performance|Unsubscribed'),opened:v('Email marketing funnel|Opened'),clicked:v('Email marketing funnel|Clicked'),
    ctor:v('Email marketing funnel|Click-to-open rate'),
    vsPrev:{sent:c('Email Performance|Emails sent'),delivered:c('Email Performance|Delivered'),openRate:c('Email Performance|Open rate'),clickRate:c('Email Performance|Click rate'),bounced:c('Email Performance|Bounced'),unsubs:c('Email Performance|Unsubscribed')},
    vsInd:{openRate:c('Email marketing funnel|Open rate'),clickRate:c('Email marketing funnel|Click rate')},
    dev:{openMobile:v('Opens by Device|Mobile Opens'),openDesktop:v('Opens by Device|Desktop Opens'),clickMobile:v('Clicks by Device|Mobile Clicks'),clickDesktop:v('Clicks by Device|Desktop Clicks')},top,low}};
P.parseEmailLinks=function(text,fname){const rows=P.parseCSV(String(text).replace(/^\uFEFF/,''));const links=[];let total=null;
  for(const r of rows.slice(1)){if(!r[0])continue;if(/^Total/i.test(r[0])){total=enum_(r[1]);continue}links.push([r[0],enum_(r[1])||0])}
  const fd=String(fname||'').match(/(\d{4})-(\d{2})-(\d{2})/);return {kind:'links',exported:fd?fd.slice(1).join('-'):'',links,total:total==null?links.reduce((a,l)=>a+l[1],0):total}};
P.parseEmail=function(text,fname){const k=P.emailKind(text);if(k==='hub')return P.parseEmailHub(text,fname);if(k==='links')return P.parseEmailLinks(text,fname);
  if(k==='camp'){const o=JSON.parse(text);return Array.isArray(o)?o:[o]}return null};
// list holds one 'hub' per end date and 'camp' entries by id; a 'links' item attaches to the newest campaign sent on/before its export date that has no links yet
P.mergeEmail=function(list,item){list=(list||[]).slice();const items=Array.isArray(item)?item:[item];let note='';
  for(const it of items){if(!it)continue;
    if(it.kind==='hub'){list=list.filter(x=>!(x.kind==='hub'&&x.end===it.end));list.push(it);note='hub'}
    else if(it.kind==='camp'){it.id=it.id||it.date+'|'+it.name;const old=list.find(x=>x.kind==='camp'&&x.id===it.id);if(old&&old.links&&!it.links){it.links=old.links;it.linksTotal=old.linksTotal}list=list.filter(x=>!(x.kind==='camp'&&x.id===it.id));list.push(it);note=it.name}
    else if(it.kind==='links'){const cs=list.filter(x=>x.kind==='camp'&&(!it.exported||x.date<=it.exported)).sort((a,b)=>a.date<b.date?1:-1);const tg=cs.find(x=>!x.links)||cs[0];
      if(!tg)throw new Error('Link clicks need a campaign to attach to. Add the campaign first.');Object.assign(tg,{links:it.links,linksTotal:it.total});note='links:'+tg.name}}
  list.sort((a,b)=>(a.date||a.end)<(b.date||b.end)?-1:1);list.note=note;return list};
// ---- search: one shared engine for every search box (no dependencies, client-side, no AI) ----
// P.SEARCH is the sensitivity dial. Raise a number to make search looser, lower it to make it stricter.
P.SEARCH={
  q:{exact:1,stem:.92,join:.9,prefix:.75,sub:.45,fz1:.6,fz2:.45}, // quality of each kind of word match: exact word > plural/singular > joined words (#agesandstages) > start of a word > inside a word > typo
  fz1:4,      // typos allowed from this many letters: 1 edit (extra, missing, swapped or wrong letter) for 4-7 letters
  fz2:8,      // 2 edits from this many letters (also when a 6-7 letter typed word is checked against a word of 8+ letters: halowen -> halloween)
  fzDf:1,     // look for typos only when the typed word is in fewer than this many items (1 = only when it is nowhere in the data)
  sub:4,      // a typed word this long may also match inside a longer word (hashtags, url slugs)
  phrase:.2,  // bonus when the typed words sit next to each other, in order ("ages and stages")
  min:.3,     // results scoring under this are dropped
  rel:.62,    // weak results (typo, plural, inside-a-word or metadata-only) also need 62% of the best score, which stops floods.
              // Strong results (every word starts a word in the text, the old Pulse rule) are always kept.
  cap:400     // most results returned
};
P.STOP=new Set('a an and the of at in on for to with by or is it our your we you'.split(' '));
const MON='january february march april may june july august september october november december'.split(' ');
// normalize: lower case, accents off, & -> and, apostrophes dropped, other punctuation -> space.
// For indexing (idx) also: #CamelCaseTags split into words, hyphen/dot words kept joined too (t-shirt -> tshirt t shirt)
P.sNorm=function(s,idx){s=String(s||'');if(/[\u00c0-\u024f]/.test(s))s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(idx&&/[#.-]/.test(s))s=s.replace(/#(\w+)/g,(m,w)=>' '+w+' '+w.replace(/([a-z])([A-Z])/g,'$1 $2')+' ').replace(/\b(\w+)[-.](\w+)\b/g,'$1$2 $1 $2');
  return s.toLowerCase().replace(/&/g,' and ').replace(/['’`]/g,'').replace(/[^a-z0-9]+/g,' ').trim()};
const toks=s=>s?s.split(' '):[];
const stem=w=>w.length>4&&/ies$/.test(w)?w.slice(0,-3)+'y':w.length>3&&/[^s]s$/.test(w)?w.slice(0,-1):w;
// Damerau-Levenshtein (optimal string alignment); gives up early once the distance passes k
function dl(a,b,k){if(Math.abs(a.length-b.length)>k)return k+1;let p2=[],p=[],c;for(let j=0;j<=b.length;j++)p[j]=j;
  for(let i=1;i<=a.length;i++){c=[i];let lo=i;for(let j=1;j<=b.length;j++){c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])c[j]=Math.min(c[j],p2[j-2]+1);if(c[j]<lo)lo=c[j]}if(lo>k)return k+1;p2=p;p=c}return p[b.length]}
P.dl=dl;
P.dateWords=d=>{if(!d)return '';const [y,m,dd]=d.split('-');return `${MON[m-1]} ${MON[m-1].slice(0,3)} ${y} ${d} ${+m}/${+dd}`};
// fields: {name:[weight, item=>text, opts]} - weight 1 for titles/hashtags, ~.75 captions, ~.5 metadata.
// opts.lead:n gives the first n words weight 1 (a caption's opening line acts as its title); opts.sub:true lets a typed word match inside longer words of this field (hashtags, url slugs).
// The index is cached per (array, fields) and rebuilt when the array or its length changes. Pass key for lists that are rebuilt as new arrays on each render.
const SCACHE=new WeakMap(),KCACHE=new Map();
P.searchIndex=function(items,fields,key){const c=key?KCACHE.get(key):SCACHE.get(items);if(c&&c.fields===fields&&c.n===items.length)return c;
  const F=Object.values(fields),post=new Map(),stm=new Map(),memo=new Map(),norm=x=>{x=String(x||'');let t=memo.get(x);if(!t){t=toks(P.sNorm(x,1));if(x.length<60)memo.set(x,t)}return t};
  const docs=items.map((it,i)=>{const f=F.map(([w,get,o])=>({w,t:norm(get(it)),ln:o&&o.lead||0,s:o&&o.sub}));
    for(const x of f)for(const t of x.t){const l=post.get(t);if(!l){post.set(t,[i]);stm.set(t,stem(t))}else if(l[l.length-1]!==i)l.push(i)}return f});
  const ix={items,fields,n:items.length,docs,post,stm};if(key){if(KCACHE.size>7)KCACHE.delete(KCACHE.keys().next().value);KCACHE.set(key,ix)}else SCACHE.set(items,ix);return ix};
// one typed word against the vocabulary -> Map(word in data -> match quality)
function termMap(ix,t,S,fz){const m=new Map();m.s=new Set();const st=stem(t),Q=S.q,df=(ix.post.get(t)||[]).length;
  const k=t.length>=S.fz2?2:t.length>=S.fz1?1:0,useFz=k&&!/\d/.test(t)&&df<S.fzDf;
  for(const [v,l] of ix.post){let q=0;
    if(v===t)q=Q.exact;else if(ix.stm.get(v)===st)q=Q.stem;else if(t.length>1&&v.startsWith(t))q=Q.prefix*(.6+.4*t.length/v.length);
    else if(t.length>=S.sub&&v.includes(t))q=-Q.sub; // negative = only counts in fields with opts.sub
    else if(useFz&&v.length>=S.fz1&&!/\d/.test(v)){const kk=t.length>5&&v.length>=S.fz2?2:k,d=dl(t,v,kk);if(d<=kk){q=d<2?Q.fz1:Q.fz2;fz.push([t,v,l.length])}}
    if(q){m.set(v,q);if(q>0&&v.startsWith(t))m.s.add(v)}}return m}
// P.search(index, query, opts) -> [{item, i (its position in the indexed list), score, hit:Set(matched words)}] best first; .fuzzy = [[typed, matched]]
// Commas or | separate alternatives (OR). Within one, every word must match (AND). Stopwords drop out unless they are all you typed.
// opts: {stop:Set of extra words to ignore, all:true to skip the relative cut-off, cap, tie:item=>number for equal scores, sens:{...P.SEARCH overrides}}
P.search=function(ix,query,opts){opts=opts||{};const S=Object.assign({},P.SEARCH,opts.sens),best=new Map(),fzAll=[],X=opts.stop;
  for(const alt of String(query||'').split(/[,|]/)){const raw=toks(P.sNorm(alt)).filter(t=>!(X&&X.has(t)));if(!raw.length)continue;
    let ts=raw.filter(t=>!P.STOP.has(t));if(!ts.length)ts=raw;
    const fz=[],maps=ts.map(t=>termMap(ix,t,S,fz)),joins=ts.length>1?[...new Set([raw.join(''),ts.join('')])]:[];fzAll.push(...fz);
    // candidates: docs that hold a match for every word, or a joined form of the whole phrase
    const docsOf=m=>{const s=new Set();for(const v of m.keys())for(const i of ix.post.get(v))s.add(i);return s};
    const sets=maps.map(docsOf),jm=new Map();for(const [v] of ix.post)if(joins.some(j=>v.startsWith(j)))jm.set(v,S.q.join);
    const jset=docsOf(jm);let cand=sets.reduce((a,s)=>new Set([...a].filter(i=>s.has(i))));jset.forEach(i=>cand.add(i));
    for(const i of cand){const doc=ix.docs[i],hit=new Set();let sum=0,pairs=0;
      const jb=jset.has(i)?Math.max(...doc.map(f=>f.t.some(v=>jm.has(v)&&hit.add(v))?f.w:0))*S.q.join:0;
      let fail=0,strong=1;for(const m of maps){let b=0,st=0;for(const f of doc)f.t.forEach((v,x)=>{let q=m.get(v);if(q<0)q=f.s?-q:0;if(q){hit.add(v);if(f.w>=.7&&m.s.has(v))st=1;q*=x<f.ln?1:f.w;if(q>b)b=q}});
        if(!st&&!jb)strong=0;b=Math.max(b,jb);if(!b){fail=1;break}sum+=b}
      if(fail)continue;
      let sc=sum/ts.length;
      // adjacency: typed words next to each other (a stopword may sit between) earn the phrase bonus; reversed order earns half
      if(ts.length>1){const ok=(m,v)=>m.get(v)>=.6,nx=(m,t,x)=>ok(m,t[x+1])||(P.STOP.has(t[x+1])&&ok(m,t[x+2]));
        for(let a=0;a+1<ts.length;a++){let p=0;for(const f of doc){if(f.w<.7)continue;const t=f.t;
          for(let x=0;x<t.length&&p<1;x++){if(ok(maps[a],t[x])&&nx(maps[a+1],t,x))p=1;else if(ok(maps[a+1],t[x])&&nx(maps[a],t,x))p=.5}if(p>=1)break}pairs+=p}
        sc+=S.phrase*pairs/(ts.length-1)}
      if(sc>=S.min&&(!best.has(i)||best.get(i).score<sc))best.set(i,{item:ix.items[i],i,score:sc,hit,strong})}}
  let res=[...best.values()].sort((a,b)=>b.score-a.score||(opts.tie?opts.tie(b.item)-opts.tie(a.item):0));
  if(res.length&&!opts.all){const cut=res[0].score*S.rel;res=res.filter(r=>r.strong||r.score>=cut)}
  res=res.slice(0,opts.cap||S.cap);const seen=new Set();
  res.fuzzy=fzAll.sort((a,b)=>b[2]-a[2]).filter(([t])=>!seen.has(t)&&seen.add(t)).map(([t,v])=>[t,v]);return res};
// wrap the matched words of text in <mark>; esc is the caller's HTML escaper
P.hl=function(text,hit,esc){if(!hit||!hit.size)return esc(text);return String(text).split(/(\s+)/).map(w=>{if(!toks(P.sNorm(w,1)).some(x=>hit.has(x)))return esc(w);
  const m=w.match(/^([^\p{L}\p{N}#]*)(.*?)([^\p{L}\p{N}]*)$/u);return esc(m[1])+'<mark>'+esc(m[2])+'</mark>'+esc(m[3])}).join('')};
// ---- strategic events + program coverage (v36). Pure logic, no DOM. Data comes from the encrypted events payload
// {v, updated, events:[...], links:[...], programs:[...]} built by the publisher from the "MCCS Pulse Strategic Events" sheet.
// Matching reuses the search normalization (P.sNorm) for phrase checks and P.search for the looser all-words tier.
P.EV={promo:30,after:7,auto:90,review:50};
const MONS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
const pad2=n=>String(n).padStart(2,'0');
// 'Sun 8 Feb 2026', '8 Feb 2026', 'Feb 8, 2026', '2026-02-08', '2/8/2026' -> '2026-02-08' ('' when not a date)
P.evDate=function(v){v=String(v||'').trim();if(!v)return '';let m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
  m=v.match(/(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})/);if(m&&MONS[m[2].slice(0,3).toLowerCase()])return `${m[3]}-${pad2(MONS[m[2].slice(0,3).toLowerCase()])}-${pad2(m[1])}`;
  m=v.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/);if(m&&MONS[m[1].slice(0,3).toLowerCase()])return `${m[3]}-${pad2(MONS[m[1].slice(0,3).toLowerCase()])}-${pad2(m[2])}`;
  m=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return `${m[3]}-${pad2(m[1])}-${pad2(m[2])}`;return ''};
const splitList=v=>String(v||'').split(/[;\n]/).map(x=>x.trim()).filter(Boolean);
// header row -> column index by loose name ("Ent. Sat" == "ent sat", "Goal (total reach)" starts with "goal")
function cols(hdr){const n=hdr.map(h=>P.sNorm(h));return (...names)=>{for(const nm of names){const k=P.sNorm(nm);const i=n.findIndex(h=>h===k);if(i>=0)return i}for(const nm of names){const k=P.sNorm(nm);const i=n.findIndex(h=>h.startsWith(k));if(i>=0)return i}return -1}}
P.evParseSheet=function(values){if(!values||values.length<2)return [];const c=cols(values[0]),g=(r,...n)=>{const i=c(...n);return i<0?'':String(r[i]==null?'':r[i]).trim()};
  return values.slice(1).filter(r=>g(r,'Event ID')&&g(r,'Event')).map(r=>{const s=P.evDate(g(r,'Start date')),e=P.evDate(g(r,'End date'))||s;
    const goal=+String(g(r,'Goal')).replace(/[^\d.]/g,'')||null;
    return {id:g(r,'Event ID'),year:+g(r,'Year')||(s?+s.slice(0,4):null),name:g(r,'Event'),type:g(r,'Type'),status:g(r,'Status'),s,e:e<s?s:e,listed:g(r,'Date as listed'),prev:g(r,'Previous dates'),
      loc:g(r,'Location'),hours:g(r,'Hours'),lead:g(r,'Lead section'),ps:P.evDate(g(r,'Promo start')),pe:P.evDate(g(r,'Promo end')),aka:splitList(g(r,'Also known as')),
      tags:splitList(g(r,'Hashtags')).map(t=>t.replace(/^#/,'')),paths:splitList(g(r,'Web pages')).map(p=>p.replace(/^https?:\/\/[^/]+/,'')),goal,notes:g(r,'Notes')}})};
P.evLinksParse=function(values){if(!values||values.length<2)return [];const c=cols(values[0]),g=(r,n)=>{const i=c(n);return i<0?'':String(r[i]==null?'':r[i]).trim()};
  return values.slice(1).map(r=>({ev:g(r,'Event ID'),ch:g(r,'Channel').toLowerCase(),item:g(r,'Item'),act:/not/i.test(g(r,'Action'))?'no':'link',note:g(r,'Notes')}))
    .filter(x=>x.ev&&x.item&&!/^\(example\)/i.test(x.item))};
P.progParse=function(values){if(!values||values.length<2)return [];const c=cols(values[0]),g=(r,...n)=>{const i=c(...n);return i<0?'':String(r[i]==null?'':r[i]).trim()};
  return values.slice(1).filter(r=>g(r,'Program')).map(r=>{const ex=g(r,'Expected');return {branch:g(r,'Branch'),program:g(r,'Program'),facility:g(r,'Facility'),id:g(r,'Program ID')||P.sNorm(g(r,'Facility')||g(r,'Program')).replace(/ /g,'-'),
    fb:splitList(g(r,'FB pages')),ig:splitList(g(r,'IG accounts')).map(x=>x.replace(/^@/,'')),kw:splitList(g(r,'Keywords')),web:splitList(g(r,'Web paths','Web pages')).map(x=>x.replace(/^https?:\/\/[^/]+/,'').toLowerCase()),exp:ex===''?null:+ex,notes:g(r,'Notes')}})};
P.evWindow=e=>({ws:e.ps||(e.s?P.addDays(e.s,-P.EV.promo):''),we:e.pe||(e.e?P.addDays(e.e,P.EV.after):'')});
// status from dates (today = JST date key)
P.evStatus=function(e,today){today=today||P.todayKey();if(/cancel/i.test(e.status))return {k:'cancelled',label:'Cancelled'};if(!e.s)return {k:'undated',label:e.status||'Date needed'};
  const {ws,we}=P.evWindow(e),d=(a,b)=>P.daysBetween(a,b)-1;
  if(today<ws)return {k:'upcoming',label:'Upcoming',to:d(today,e.s),promoIn:d(today,ws)};
  if(today<e.s){const of=d(ws,e.s);return {k:'promoting',label:'Promoting',day:d(ws,today)+1,of,to:d(today,e.s)}}
  if(today<=e.e)return {k:'live',label:'Live',day:d(e.s,today)+1,of:d(e.s,e.e)+1};
  if(today<=we)return {k:'counting',label:'Wrapped',until:we,ago:d(e.e,today)};
  return {k:'wrapped',label:'Wrapped',ago:d(e.e,today)}};
// ---- phrases: name (parenthetical and " - " parts as weaker variants), aliases, hashtags, paths
const EVGEN=new Set('festival fest run race party night day days tournament classic fair expo event events camp lighting ceremony parade parades market show concert games competition challenge exclusive week weekend open house fun annual holiday sale'.split(' '));
const words=t=>t.split(' ').filter(w=>w&&!P.STOP.has(w));
const EVHOL=/^(independence day|fourth of july|4th of july|july 4th|christmas|halloween|thanksgiving|new years?( eve| day)?|memorial day|labor day|veterans day|valentines? day|easter|holidays?)$/;
P.evBase=function(t,kind){const w=words(t);let s;if(!w.length)return 0;if(EVHOL.test(t))return 70;
  if(w.length>=3)s=96;else if(w.length===2)s=w.every(x=>EVGEN.has(x)||/^\d+k?$/.test(x))?72:94;else{const x=w[0];s=EVGEN.has(x)||/^\d/.test(x)?0:x.length<=3?72:x.length<=5?86:91}
  return kind==='part'?Math.max(0,s-6):s};
P.evPhrases=function(e){const out=new Map(),add=(raw,kind)=>{const t=P.sNorm(raw);if(!t||t.length<3)return;const b=P.evBase(t,kind);if(b&&(!out.has(t)||out.get(t).b<b))out.set(t,{t,raw,kind,b})};
  const nm=String(e.name||'').replace(/\b(19|20)\d{2}\b/g,' ').replace(/\b\d+(st|nd|rd|th)\s+annual\b/ig,' ');add(nm.replace(/\([^)]*\)/g,' '),'name');
  (nm.match(/\(([^)]*)\)/g)||[]).forEach(x=>{const inner=x.slice(1,-1);if(!/^(name )?tbd$|stage \d/i.test(inner))add(inner,'part')});
  nm.replace(/\([^)]*\)/g,' ').split(/\s+-\s+|\s+–\s+/).forEach((p,i,a)=>{if(a.length>1)add(p,'part')});
  const base=P.sNorm(nm.replace(/\([^)]*\)/g,' ')),bw=base.split(' ');
  if(bw[0]==='camp'&&bw.length>=3)add(bw.slice(1).join(' '),'name');
  [base,bw[0]==='camp'?bw.slice(1).join(' '):''].forEach(t=>{if(t&&/\bfestival\b/.test(t))add(t.replace(/\bfestival\b/,'fest'),'name')});
  const core=bw.filter(w=>!P.STOP.has(w));if(core.length===2&&EVGEN.has(core[1])&&core[0].length>5&&!EVGEN.has(core[0]))add(core[0],'part');
  (e.aka||[]).forEach(a=>add(a,'aka'));return [...out.values()].sort((a,b)=>b.b-a.b)};
const NORM=new WeakMap();// post -> {t:' normalized text ', tags:Set, paths:[]}
function postNorm(r){let n=NORM.get(r);if(n)return n;const cap=String(r.cap||'');
  n={t:' '+P.sNorm(cap,1)+' ',tags:new Set((cap.match(/#\w+/g)||[]).map(x=>x.slice(1).toLowerCase())),paths:(cap.match(/usmc-mccs\.org(\/[^\s)"'<>]*)/gi)||[]).map(x=>x.replace(/^usmc-mccs\.org/i,'').split(/[?#]/)[0].replace(/[.,;:!]+$/,'').toLowerCase())};NORM.set(r,n);return n}
P.postNorm=postNorm;
const pathHit=(path,pats)=>{path=String(path).toLowerCase().replace(/\/$/,'')||'/';for(let p of pats){p=String(p).toLowerCase().trim();if(!p)continue;const star=/\/\*$/.test(p);p=p.replace(/\/\*$/,'').replace(/\/$/,'')||'/';if(path===p||(star||p.length>4)&&path.startsWith(p+'/'))return p}return null};
P.pathHit=pathHit;
const EVF={cap:[1,r=>r.cap,{sub:1}]};
const CAMPS=['foster','kinser','hansen','courtney','schwab','futenma','lester','mctureous','kadena','fuji','gonsalves','mujuk','blaz','tengan','zukeran'];
const campsIn=t=>new Set(CAMPS.filter(c=>t.includes(' '+c+' ')));
// text names a different camp than the event's (and not the event's own) -> it is probably the same-named event elsewhere
const campOff=(evC,t)=>{if(!evC.size)return 0;const c=campsIn(t);if(!c.size)return 0;for(const x of c)if(evC.has(x))return 0;return 25};
const lowerSorted=a=>{let lo=0,hi=a.length;return (k)=>{lo=0;hi=a.length;while(lo<hi){const m=(lo+hi)>>1;if(a[m].d<k)lo=m+1;else hi=m}return lo}};
// item keys: so:<post id> · we:<path> · em:<campaign id> · sg:<slide name>
// returns {byEvent: Map(evId -> [{key,ch,score,why,state}]), byItem: Map(key -> [{ev,score,why,state}]), review:[...], manual:n}
P.evMatch=function(o){const evs=(o.events||[]).filter(e=>e.s),posts=o.posts||[],today=o.today||P.todayKey(),links=o.links||[],titles=o.titles||{};
  const byItem=new Map(),put=(key,ch,ev,score,why)=>{let a=byItem.get(key);if(!a)byItem.set(key,a=[]);const x=a.find(y=>y.ev===ev.id);if(x){if(score>x.score){x.score=score;x.why=why}}else a.push({ev:ev.id,ch,score,why})};
  const sorted=posts.slice().sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0),lb=lowerSorted(sorted);
  const dataMin=sorted.length?sorted[0].d:'9',dataMax=sorted.length?sorted[sorted.length-1].d:'0';let ix=null;
  const D=o.web&&o.web.length?P.webDaily(o.web):null;const pathsIn=(ws,we)=>{const s=new Set();if(!D)return s;for(let k=ws;k<=we;k=P.addDays(k,1)){const a=D.pg.get(k);if(a)for(const r of a)s.add(r[0])}return s};
  for(const ev of evs){const {ws,we}=P.evWindow(ev);const ph=P.evPhrases(ev),tags=new Set((ev.tags||[]).map(t=>t.toLowerCase())),pats=ev.paths||[];
    const loc=P.sNorm(String(ev.loc||'').replace(/\bcamp\b/ig,'')).split(' ').filter(w=>w.length>4),evC=campsIn(' '+P.sNorm(ev.loc+' '+ev.id.replace(/-/g,' '))+' ');
    if(ws<=dataMax&&we>=dataMin){
      const inWin=[];for(let i=lb(ws);i<sorted.length&&sorted[i].d<=we;i++)inWin.push(sorted[i]);const winSet=new Set(inWin);
      for(const r of inWin){const n=postNorm(r);let best=0,why='';
        for(const t of n.tags)if(tags.has(t)&&97>best){best=97;why='#'+t}
        if(pats.length)for(const p of n.paths){const h=pathHit(p,pats);if(h&&96>best){best=96;why='links '+h}}
        for(const x of ph){if(x.b<=best)break;if(n.t.includes(' '+x.t+' ')){let s=x.b;if(loc.some(w=>n.t.includes(' '+w+' ')))s=Math.min(97,s+2);if(s>best){best=s;why='“'+x.raw.trim()+'”'}}}
        if(best){const off=campOff(evC,n.t);if(off){best-=off;why+=' · other camp'}put('so:'+r.id,'so',ev,best,why)}}
      // looser tier: every word of a multi-word phrase somewhere in the caption (any order, typo-tolerant) -> review
      ix=ix||P.searchIndex(posts,EVF);
      for(const x of ph){if(words(x.t).filter(w=>!EVGEN.has(w)).length<2||x.b<80)continue;for(const h of P.search(ix,x.t,{all:true,cap:2e4})){const r=h.item;if(!winSet.has(r))continue;const k='so:'+r.id,cur=byItem.get(k);if(cur&&cur.some(y=>y.ev===ev.id))continue;
        put(k,'so',ev,h.strong?72:58,(h.strong?'words of “':'close to “')+x.raw.trim()+'”')}}
      // web pages seen in the window: sheet paths, pages linked from the event's posts, newsletter link titles, or the phrase in the path
      if(D){const linkedPaths=new Map();for(const [k,a] of byItem){if(k.slice(0,3)!=='so:')continue;const it=a.find(y=>y.ev===ev.id&&y.score>=P.EV.auto);if(!it)continue;const r=o.postById&&o.postById.get(k.slice(3));if(r)postNorm(r).paths.forEach(p=>linkedPaths.set(p.replace(/\/$/,''),1))}
        for(const path of pathsIn(ws,we)){const lp=path.toLowerCase().replace(/\/$/,'');let best=0,why='';const h=pats.length&&pathHit(lp,pats);if(h){best=96;why='page '+h}
          const tt=titles[lp];if(tt){const tn=' '+P.sNorm(tt)+' ';for(const x of ph)if(x.b>best&&tn.includes(' '+x.t+' ')){best=Math.min(97,x.b+1);why='titled “'+tt+'”'}}
          if(linkedPaths.has(lp)&&lp.length>1&&91>best){best=91;why='linked from an event post'}
          const pn=' '+P.sNorm(lp.replace(/[-_/]+/g,' '))+' ';for(const x of ph)if(x.b>best&&!(x.kind==='part'&&words(x.t).length<2)&&pn.includes(' '+x.t+' ')){best=x.b;why='“'+x.raw.trim()+'” in the address'}
          if(best){const off=campOff(evC,pn+(tt?' '+P.sNorm(tt)+' ':''));if(off){best-=off;why+=' · other camp'}put('we:'+path,'we',ev,best,why)}}}}
    for(const c of o.email||[]){if(c.kind!=='camp'||!c.date||c.date<ws||c.date>we)continue;let best=0,why='';const nm=' '+P.sNorm(c.name+' '+(c.subject||''))+' ';
      for(const x of ph)if(x.b>best&&nm.includes(' '+x.t+' ')){best=Math.min(97,x.b+1);why='“'+x.raw.trim()+'” in the issue name'}
      for(const tt of Object.values(c.titles||{})){const tn=' '+P.sNorm(tt)+' ';for(const x of ph)if(x.b>best&&tn.includes(' '+x.t+' ')){best=x.b;why='story “'+tt+'”'}}
      if(best)put('em:'+c.id,'em',ev,best,why)}
    if(o.signage&&today>=ws&&today<=we)for(const it of o.signage){const nm=' '+P.sNorm(it.name,1)+' ';let best=0,why='';for(const x of ph)if(x.b>best&&nm.includes(' '+x.t+' ')){best=x.b;why='“'+x.raw.trim()+'” in the slide name'}if(best)put('sg:'+it.name,'sg',ev,best,why)}}
  // v38 Connections: an enabled rule links at 95% (a person's answer, applied after the Links tab, still wins)
  const CN=o.conn,evIds=new Set(evs.map(e=>e.id));
  if(CN)for(const [k,m] of CN.byItem)for(const c of m.values()){if(c.ttype!=='event'||c.state!=='rule'||!evIds.has(c.tid))continue;let a=byItem.get(k);if(!a)byItem.set(k,a=[]);let x=a.find(y=>y.ev===c.tid);
    if(!x)a.push(x={ev:c.tid,ch:k.slice(0,2),score:0,why:''});if(x.score<P.CONN.rule){x.score=P.CONN.rule;x.why='rule '+(c.rule||'')}else x.why+=' · rule '+(c.rule||'');x.rule=c.rule}
  // manual rows from the sheet's Links tab (and local decisions) always win
  let manual=0;const resolve=l=>{const ch=(l.ch||'').slice(0,2),it=String(l.item).trim();if(/^(so|we|em|sg):/.test(it))return it;
    if(ch==='so'||!ch){const id=(it.match(/(\d{8,})/)||[])[1];const r=o.postById&&(o.postById.get(it)||id&&o.postById.get(id)||[...o.postById.values()].find(p=>p.link&&p.link===it));if(r)return 'so:'+r.id}
    if(ch==='we')return 'we:'+it.replace(/^https?:\/\/[^/]+/,'');if(ch==='em'){const c=(o.email||[]).find(c=>c.id===it||c.name===it||c.full===it);return c?'em:'+c.id:null}if(ch==='si'||ch==='sg')return 'sg:'+it;return null};
  for(const l of links){const k=resolve(l);if(!k||!evs.some(e=>e.id===l.ev))continue;let a=byItem.get(k);if(!a)byItem.set(k,a=[]);let x=a.find(y=>y.ev===l.ev);
    if(l.act==='no'){if(x)x.state='no'}else{manual++;if(!x)a.push(x={ev:l.ev,ch:k.slice(0,2),score:100,why:''});x.state='manual';x.score=100;x.why=l.local?'confirmed in Pulse':'added in the sheet'}}
  if(CN)for(const [k,m] of CN.byItem)for(const c of m.values()){if(c.ttype!=='event'||c.state==='rule'||!evIds.has(c.tid))continue;let a=byItem.get(k);if(!a)byItem.set(k,a=[]);let x=a.find(y=>y.ev===c.tid);
    if(c.state==='blocked'){if(x){x.state='no';x.who=c.who}continue}
    if(!x)a.push(x={ev:c.tid,ch:k.slice(0,2),score:100,why:''});if(x.state!=='manual')manual++;x.state='manual';x.score=100;x.why=c.who?'confirmed by '+c.who:'confirmed in Pulse';x.team=1;x.who=c.who;x.time=c.time}
  const byEvent=new Map(),review=[];
  for(const [k,a] of byItem){const live=a.filter(x=>x.state!=='no').sort((p,q)=>q.score-p.score);if(!live.length)continue;const top=live[0].score;
    for(const x of live){if(!x.state)x.state=x.score>=P.EV.auto&&x.score>=top-3?'auto':x.score>=P.EV.review?'review':'weak';x.key=k;
      if(x.state==='auto'||x.state==='manual')(byEvent.get(x.ev)||byEvent.set(x.ev,[]).get(x.ev)).push(x)}
    const rv=live.filter(x=>x.state==='review');if(rv.length&&!live.some(x=>x.state==='manual'||x.state==='auto'))review.push({key:k,ch:k.slice(0,2),best:rv[0],alts:live.filter(x=>x!==rv[0]).slice(0,3)})}
  review.sort((a,b)=>b.best.score-a.best.score);return {byItem,byEvent,review,manual}};
// per-event totals. ctx: {posts by id, web, email, signage}. Touchpoints = social views + web users (linked pages) + email opens; signage is exposure, kept apart.
P.evRoll=function(ev,items,c){const {ws,we}=P.evWindow(ev),R={so:{n:0,v:0,e:0,lc:0,fb:0,ig:0,list:[]},we:{users:0,views:0,pages:[]},em:{opens:0,clicks:0,camps:[]},sg:{slides:[]},daily:new Map(),items:items||[]};
  const day=(d,k,v)=>{if(!d||d<ws||d>we)return;const o=R.daily.get(d)||{so:0,we:0,em:0};o[k]+=v;R.daily.set(d,o)};const paths=new Set();
  for(const x of items||[]){const id=x.key.slice(3);
    if(x.ch==='so'){const r=c.postById.get(id);if(!r)continue;R.so.n++;R.so.v+=r.v;R.so.e+=P.eng(r);R.so.lc+=r.lc||0;R.so[r.plat]++;R.so.list.push(r);day(r.d,'so',r.v)}
    else if(x.ch==='we')paths.add(id);
    else if(x.ch==='em'){const cm=(c.email||[]).find(e=>e.id===id);if(cm){R.em.camps.push(cm);R.em.opens+=cm.opens||0;R.em.clicks+=cm.clicks||0;day(cm.date,'em',cm.opens||0)}}
    else if(x.ch==='sg')R.sg.slides.push(id)}
  if(paths.size&&c.web&&c.web.length){const D=P.webDaily(c.web),pg=new Map();for(let k=ws;k<=we;k=P.addDays(k,1)){const a=D.pg.get(k);if(!a)continue;for(const r of a)if(paths.has(r[0])){R.we.views+=r[1];R.we.users+=r[2];day(k,'we',r[2]);const o=pg.get(r[0])||[r[0],0,0];o[1]+=r[1];o[2]+=r[2];pg.set(r[0],o)}}R.we.pages=[...pg.values()].sort((a,b)=>b[2]-a[2])}
  R.touch=R.so.v+R.we.users+R.em.opens;R.eng=R.so.e+R.em.clicks;R.ws=ws;R.we_=we;return R};
// same event a year earlier: a row with the same name in the prior year, else the dates moved back 364 days (same weekday)
P.evPrior=function(ev,events){const nm=P.sNorm(ev.name),y=(ev.year||+String(ev.s).slice(0,4))-1;const row=(events||[]).find(e=>e!==ev&&e.s&&P.sNorm(e.name)===nm&&+String(e.s).slice(0,4)===y);
  if(row)return Object.assign({},row,{approx:false});if(!ev.s)return null;const sh=k=>k?P.addDays(k,-364):'';return Object.assign({},ev,{id:ev.id+'~prior',s:sh(ev.s),e:sh(ev.e),ps:sh(ev.ps),pe:sh(ev.pe),approx:true})};
// ---- program coverage ("weak spots")
const isShared=p=>/^\(/.test(p.branch||'');
P.progPages=function(programs){const own=new Map(),shared=new Set();for(const p of programs||[]){const keys=[...p.fb.map(x=>'fb|'+x.toLowerCase()),...p.ig.map(x=>'ig|'+x.toLowerCase())];
  for(const k of keys){if(isShared(p)){shared.add(k);continue}(own.get(k)||own.set(k,[]).get(k)).push(p)}}return {own,shared}};
// o: {programs, posts (already account-filtered as needed), s, e, cs, ce, ref (date key for "days since"), days (N for 'no posts in N days')}
P.progCoverage=function(o){const progs=(o.programs||[]).filter(p=>!isShared(p)),{own,shared}=P.progPages(o.programs),N=o.days||45;let ref=o.ref;if(!ref){ref='';for(const r of o.posts||[])if(r.d>ref)ref=r.d}ref=ref||P.todayKey();const today=o.today||P.todayKey();
  const kw=new Map(progs.map(p=>[p.id,p.kw.map(k=>P.sNorm(k,1)).filter(k=>k.length>=3)]));
  const st=new Map(progs.map(p=>[p.id,{p,own:[],men:[],last:'',lastAll:'',prev:0,prevV:0}]));const general=new Map(),unmapped=new Map();
  const hit=(n,p)=>kw.get(p.id).some(k=>n.t.includes(' '+k+' '));
  for(const r of o.posts||[]){const pk=r.plat+'|'+String(r.page).toLowerCase(),owners=own.get(pk)||[],n=postNorm(r);const inR=r.d>=o.s&&r.d<=o.e,inC=o.cs&&r.d>=o.cs&&r.d<=o.ce;
    if(!owners.length&&!shared.has(pk)){const u=unmapped.get(pk)||{plat:r.plat,page:r.page,n:0,v:0};if(inR){u.n++;u.v+=r.v}unmapped.set(pk,u)}
    let ownBy=owners.length===1?owners:owners.filter(p=>hit(n,p));
    if(!ownBy.length&&owners.length>1){const pn=' '+P.sNorm(r.page)+' ',nm=owners.filter(p=>pn.includes(' '+P.sNorm(p.facility||p.program)+' '));if(nm.length===1)ownBy=nm;else{const g=general.get(pk)||{plat:r.plat,page:r.page,n:0,v:0,list:[],branches:new Set(owners.map(p=>p.branch))};if(inR){g.n++;g.v+=r.v;g.list.push(r)}general.set(pk,g)}}
    const tagged=new Set(ownBy.map(p=>p.id));
    for(const p of progs){const isOwn=tagged.has(p.id),isMen=!isOwn&&hit(n,p);if(!isOwn&&!isMen)continue;const s=st.get(p.id);if(r.d>s.lastAll)s.lastAll=r.d;
      if(inR)(isOwn?s.own:s.men).push(r);if(inC){s.prev++;s.prevV+=r.v}}}
  // festival-type programs ("Strategic Event" in the Programs tab's Notes) are judged by their event (keyword inside the event's name / other names), not by silence
  const evPh=(o.events||[]).filter(e=>e.s).map(e=>({e,t:' '+P.sNorm([e.name,...(e.aka||[])].join(' | ').replace(/[|]/g,' '))+' ',ph:new Set(P.evPhrases(e).map(x=>x.t))}));
  const seasonOf=p=>{const ks=p.kw.map(k=>P.sNorm(k)).filter(k=>k.split(' ').length>=2||k.length>=8);if(!/strategic event/i.test(p.notes||''))return [];return evPh.filter(x=>ks.some(k=>x.ph.has(k)||x.t.includes(' '+k+' '))).map(x=>x.e)};
  const isSeason=(p,evs)=>evs.length>0||/strategic event/i.test(p.notes||'');
  const days=P.daysBetween(o.s,o.e),rows=[],r30=P.addDays(ref,-29);
  for(const s of st.values()){const all=[...s.own,...s.men],n=all.length,v=all.reduce((a,r)=>a+r.v,0);const last=s.lastAll,since=last?Math.max(0,P.daysBetween(last,ref)-1):null;
    const evs=seasonOf(s.p),next=evs.filter(e=>e.s>=today).sort((a,b)=>a.s<b.s?-1:1)[0],recent=[...s.own,...s.men].filter(r=>r.d>=r30).length;
    rows.push({seasonal:isSeason(s.p,evs),next,recent,id:s.p.id,p:s.p,name:s.p.facility||s.p.program,branch:s.p.branch,program:s.p.program,facility:s.p.facility,own:s.own,men:s.men,n,v,last,since,prev:s.prev,prevV:s.prevV,trend:s.prev?(n/s.prev-1)*100:null,
      exp:s.p.exp,perMonth:n/days*30.4,flags:[]})}
  const byBr=new Map();rows.forEach(r=>(byBr.get(r.branch)||byBr.set(r.branch,[]).get(r.branch)).push(r));
  for(const [b,l] of byBr){const med=P.median(l.map(r=>r.n));for(const r of l){r.peer=med;if(r.exp===0)continue;
    if(r.seasonal){const to=r.next?P.daysBetween(today,r.next.s)-1:null;if(r.next&&to<=45&&!r.recent)r.flags.push(['event',`${r.next.name} in ${to} days, no posts in the last 30`]);continue}
    if(!r.last)r.flags.push(['never','No posts found']);else if(r.since>N)r.flags.push(['quiet',`No posts in ${r.since} days`]);
    if(r.exp>0&&r.perMonth<r.exp*.5)r.flags.push(['exp',`${r.perMonth.toFixed(1)}/mo vs ${r.exp} expected`]);
    if(med>=4&&r.n<=med*.25&&r.last)r.flags.push(['peer',`${r.n} posts vs ${med} branch median`])}}
  rows.forEach(r=>{r.weak=r.flags.length>0;r.sev=!r.weak?0:(r.flags.some(f=>f[0]==='never')?1000:0)+(r.flags.some(f=>f[0]==='event')?300:0)+(r.since||0)+(r.flags.some(f=>f[0]==='exp')?40:0)+(r.flags.some(f=>f[0]==='peer')?20:0)-r.n});
  const branches=[...byBr].map(([b,l])=>{const ids=new Set(),gen=[...general.values()].filter(g=>g.branches.has(b));let n=0,v=0;for(const r of l)for(const x of [...r.own,...r.men])if(!ids.has(x.id)){ids.add(x.id);n++;v+=x.v}
    return {branch:b,programs:l.length,n,v,weak:l.filter(r=>r.weak).length,posted:l.filter(r=>r.n).length,general:gen}}).sort((a,b)=>b.n-a.n);
  return {rows,branches,general:[...general.values()],unmapped:[...unmapped.values()].filter(u=>u.n||true),N,days}};
// ---- programs across channels (v37 Programs page)
// o: {cov (P.progCoverage result), web, email (campaigns), signage (items), events, s, e, cs, ce, ds (first day of the daily series), today}
// web: listed Web paths (prefix) win; else a program keyword found in the page address words. email: keyword in name/subject/link titles. signage: keyword in slide name.
// events: keyword (or the program/facility name) inside the event name / other names, or the event's lead section naming the program.
P.slideNorm=n=>' '+P.sNorm(String(n||'').replace(/\.(jpe?g|png|gif|mp4|mov|webm)$/i,'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_\-]+/g,' '),1)+' ';
P.progKw=p=>[...new Set([...(p.kw||[]),p.facility||p.program].map(k=>P.sNorm(k,1)).filter(k=>k.length>=3))];
P.progChannels=function(o){const rows=(o.cov&&o.cov.rows)||[],today=o.today||P.todayKey(),ds=o.ds||o.s,inR=d=>d>=o.s&&d<=o.e,inC=d=>o.cs&&d>=o.cs&&d<=o.ce,inD=d=>d>=ds&&d<=o.e;
  const kwOf=p=>{const a=[...(p.kw||[]),p.facility||p.program].map(k=>P.sNorm(k,1)).filter(k=>k.length>=3);return [...new Set(a)]};
  const K=new Map(rows.map(r=>[r.id,kwOf(r.p)])),hasKw=(id,t)=>K.get(id).some(k=>t.includes(' '+k+' '));
  const out=new Map(rows.map(r=>[r.id,{id:r.id,so:{n:0,v:0,e:0,pv:0,pn:0,list:[]},we:{users:0,views:0,pu:0,pages:[]},em:{opens:0,clicks:0,po:0,camps:[]},sg:{slides:[]},ev:[],daily:new Map()}]));
  const day=(R,d,k,v)=>{if(!inD(d))return;const x=R.daily.get(d)||{so:0,we:0,em:0};x[k]+=v;R.daily.set(d,x)};
  // v38 Connections: team links add an item to a program, a person's unlink / not-this (or blocked rule) takes it out
  const CN=o.conn,cl=new Map(),cb=new Set();if(CN)for(const [k,m] of CN.byItem)for(const c of m.values()){if(c.ttype!=='program'||!out.has(c.tid))continue;if(c.state==='blocked')cb.add(k+'|'+c.tid);else (cl.get(c.tid)||cl.set(c.tid,new Map()).get(c.tid)).set(k,c)}
  const blk=(k,id)=>cb.has(k+'|'+id),lnk=(k,id)=>{const m=cl.get(id);return !!(m&&m.has(k))};const byId=CN&&cl.size&&o.posts?new Map(o.posts.map(p=>[p.id,p])):null;
  for(const r of rows){const R=out.get(r.id);const seen=new Set();for(const x of [...r.own,...r.men]){if(seen.has(x.id)||blk('so:'+x.id,r.id))continue;seen.add(x.id);R.so.n++;R.so.v+=x.v;R.so.e+=P.eng(x);R.so.list.push(x)}R.so.pv=r.prevV;R.so.pn=r.prev;
    const tm=cl.get(r.id);R.team=tm?[...tm.entries()].map(([key,c])=>Object.assign({key},c)):[];R.so.team=0;
    if(tm&&byId)for(const k of tm.keys()){if(k.slice(0,3)!=='so:')continue;const x=byId.get(k.slice(3));if(!x||seen.has(x.id)||!inR(x.d))continue;seen.add(x.id);R.so.n++;R.so.v+=x.v;R.so.e+=P.eng(x);R.so.list.push(x);R.so.team++}}
  // social daily series reaches back past the range: walk the posts once
  if(o.posts){const own=new Map(),{own:pg}=P.progPages((o.cov&&o.cov.programs)||rows.map(r=>r.p));for(const r of o.posts){if(!inD(r.d))continue;const n=postNorm(r).t,owners=(pg.get(r.plat+'|'+String(r.page).toLowerCase())||[]).map(p=>p.id);
    for(const row of rows){const k='so:'+r.id;if((owners.length===1&&owners[0]===row.id||hasKw(row.id,n))&&!blk(k,row.id)||lnk(k,row.id))day(out.get(row.id),r.d,'so',r.v)}}}
  // web
  if(o.web&&o.web.length){const D=P.webDaily(o.web),pm=new Map();const match=path=>{let m=pm.get(path);if(m)return m;const lp=path.toLowerCase().replace(/\/$/,''),pn=' '+P.sNorm(lp.replace(/[-_/.]+/g,' '),1)+' ';m=[];
      const k='we:'+path;for(const r of rows){const ws=(r.p.web||[]).map(w=>w.replace(/\/$/,''));if((ws.length?ws.some(w=>w&&(lp===w||lp.startsWith(w+'/'))):hasKw(r.id,pn))&&!blk(k,r.id)||lnk(k,r.id))m.push(r.id)}pm.set(path,m);return m};
    const pages=new Map();for(const [d,a] of D.pg){const r_=inR(d),c_=inC(d),d_=inD(d);if(!r_&&!c_&&!d_)continue;for(const [path,views,users] of a){if(!path||path[0]!=='/')continue;const ids=match(path);if(!ids.length)continue;
      for(const id of ids){const R=out.get(id);if(r_){R.we.users+=users;R.we.views+=views;const k=id+'|'+path,q=pages.get(k)||{id,p:[path,0,0]};q.p[1]+=views;q.p[2]+=users;pages.set(k,q)}if(c_)R.we.pu+=users;if(d_)day(R,d,'we',users)}}}
    for(const q of pages.values())out.get(q.id).we.pages.push(q.p);for(const R of out.values())R.we.pages.sort((a,b)=>b[2]-a[2])}
  // email
  for(const c of o.email||[]){if(c.kind!=='camp'||!c.date)continue;const t=' '+P.sNorm([c.name,c.subject||'',...Object.values(c.titles||{})].join(' | ').replace(/[|]/g,' '),1)+' ';
    const ek='em:'+c.id;for(const r of rows){if(!(hasKw(r.id,t)&&!blk(ek,r.id)||lnk(ek,r.id)))continue;const R=out.get(r.id);if(inR(c.date)){R.em.opens+=c.opens||0;R.em.clicks+=c.clicks||0;R.em.camps.push(c)}if(inC(c.date))R.em.po+=c.opens||0;day(R,c.date,'em',c.opens||0)}}
  // signage (what is in rotation now)
  for(const it of o.signage||[]){const t=P.slideNorm(it.name),sk='sg:'+it.name;for(const r of rows)if(hasKw(r.id,t)&&!blk(sk,r.id)||lnk(sk,r.id))out.get(r.id).sg.slides.push(it.name)}
  // events
  for(const e of o.events||[]){if(!e.s)continue;const t=' '+P.sNorm([e.name,...(e.aka||[])].join(' '),1)+' ',lead=P.sNorm(e.lead||'',1);
    for(const r of rows){const nm=[r.p.program,r.p.facility].filter(Boolean).map(x=>P.sNorm(x,1));if(hasKw(r.id,t)||lead&&nm.includes(lead))out.get(r.id).ev.push(e)}}
  for(const r of rows){const R=out.get(r.id);R.ev.sort((a,b)=>a.s<b.s?-1:1);R.next=R.ev.find(e=>(e.e||e.s)>=today)||null;R.reach=R.so.v+R.we.users+R.em.opens;R.prev=R.so.pv+R.we.pu+R.em.po;
    R.on={so:R.so.n>0,we:R.we.users>0,em:R.em.camps.length>0,sg:R.sg.slides.length>0};R.chans=Object.values(R.on).filter(Boolean).length}
  return out};
// ---- Connections (v38): a shared, append-only ledger of people's answers + "Teach Pulse" rules, layered over the keyword matchers.
// Pure logic, no DOM. Order for every (item, target): a person's answer wins (link = 100%, unlink / not-this = blocked),
// then an enabled rule (95%), then the keyword matchers (P.evMatch / P.progChannels).
// ledger row: {row, version, time, who, item, itype, ilabel, ttype, tid, tlabel, act:'link'|'unlink'|'not-this'|'clear', src:'review'|'manual'|'rule'|'undo', replaces, pending}
//   'clear' is written only by Undo of a first answer: it puts the pair back to automatic matching.
// rule: {id, type:'hashtag'|'phrase'|'webpath'|'account'|'newsletter-link', pattern, ttype, tid, tlabel, by, created, on}
// item descriptor (P.connDesc): {key, ch, text:' normalized words ', tags:Set, path, paths:[], acct:'fb:page'|'ig:handle'}
// target types: program · event · fb_account · ig_account · web_page · newsletter · slide (item targets use the item key as Target ID)
P.CONN={rule:95,close:5};
P.CONN_TT=['program','event','fb_account','ig_account','web_page','newsletter','slide'];
P.connAct=a=>{a=String(a||'').toLowerCase().replace(/[\s_]+/g,'-');return a==='not-this'||a==='no'||a==='notthis'?'not-this':a==='unlink'||a==='remove'?'unlink':a==='clear'||a==='reset'?'clear':'link'};
P.connPair=(item,ttype,tid)=>item+'\u0001'+ttype+'\u0001'+tid;
// server rows by version (then row), pending local rows after them in the order they were made
P.connSort=rows=>rows.map((r,i)=>[r,i]).sort((a,b)=>{const x=a[0],y=b[0],pa=x.pending?1:0,pb=y.pending?1:0;if(pa!==pb)return pa-pb;
  const va=+x.version||0,vb=+y.version||0;if(va!==vb)return va-vb;const ra=+x.row||0,rb=+y.row||0;return ra!==rb?ra-rb:a[1]-b[1]}).map(z=>z[0]);
// newest row per (item, target type, target id)
P.connState=function(ledger){const m=new Map();for(const r of P.connSort((ledger||[]).filter(Boolean))){if(!r.item||!r.ttype||r.tid==null||r.tid==='')continue;m.set(P.connPair(r.item,r.ttype,String(r.tid)),r)}return m};
const linkPaths=urls=>[...new Set((urls||[]).map(u=>String(u||'').trim()).filter(u=>/^(https?:\/\/[^/]*usmc-mccs\.org|\/)/i.test(u)).map(u=>u.replace(/^https?:\/\/[^/]+/i,'').split(/[?#]/)[0].toLowerCase().replace(/\/+$/,'')||'/'))];
P.connDesc=function(ch,x,extra){if(x==null)return null;
  if(ch==='so'){const n=postNorm(x);return {key:'so:'+x.id,ch,text:n.t,tags:n.tags,paths:n.paths.map(p=>p.replace(/\/+$/,'')||'/'),acct:x.plat+':'+String(x.page||'').toLowerCase().replace(/^@/,'')}}
  if(ch==='we'){const p=String(x);const lp=p.toLowerCase().replace(/\/+$/,'')||'/';return {key:'we:'+p,ch,path:lp,paths:[lp],text:' '+P.sNorm(lp.replace(/[-_/.]+/g,' ')+' '+(extra||''),1)+' ',tags:new Set()}}
  if(ch==='em'){const t=[x.name,x.subject||'',...Object.values(x.titles||{})].join(' | ');const urls=[...Object.keys(x.titles||{}),...(x.links||[]).map(l=>Array.isArray(l)?l[0]:l&&(l.url||l.u)||'')];
    return {key:'em:'+x.id,ch,text:' '+P.sNorm(t.replace(/[|]/g,' '),1)+' ',tags:new Set((t.match(/#\w+/g)||[]).map(h=>h.slice(1).toLowerCase())),paths:linkPaths(urls)}}
  if(ch==='sg'){const nm=typeof x==='string'?x:x.name;return {key:'sg:'+nm,ch,text:P.slideNorm(nm)+P.sNorm(String(nm||'').replace(/\.(jpe?g|png|gif|mp4|mov|webm)$/i,'').replace(/[_\-]+/g,' '),1)+' ',tags:new Set(),paths:[]}}
  return null};
// patterns are stored lower-case; '#okinapa', 'turkey trot', '/okinapa-wine-festival', 'ig:mccsokinawa_fitness', '/comic-con'
P.connRuleNorm=function(type,pat){let p=String(pat||'').trim().toLowerCase();if(!p)return '';
  if(type==='hashtag')return '#'+p.replace(/^#+/,'').replace(/\s+/g,'');
  if(type==='webpath'||type==='newsletter-link'){p=p.replace(/^https?:\/\/[^/]+/,'').split(/[?#]/)[0];if(p[0]!=='/')p='/'+p;return p.replace(/\/+$/,'')||'/'}
  if(type==='account'){p=p.replace(/\s*[·|]\s*/,':').replace(/^(facebook|fb)\s*:\s*/,'fb:').replace(/^(instagram|ig)\s*:\s*/,'ig:').replace(/:\s*@/,':');if(p[0]==='@')p='ig:'+p.slice(1);return p}
  return p.replace(/\s+/g,' ')};
P.connRuleHit=function(r,it){if(!r||!it)return false;const t=r.type,p=P.connRuleNorm(t,r.pattern);if(!p)return false;
  if(t==='hashtag')return !!(it.tags&&it.tags.has(p.slice(1)));
  if(t==='phrase'){const q=P.sNorm(p,1);return q.length>=2&&it.text.includes(' '+q+' ')}
  if(t==='webpath'){if(p==='/')return false;const hit=x=>!!x&&x.includes(p);return it.ch==='we'?hit(it.path):(it.paths||[]).some(hit)}
  if(t==='account'){if(!it.acct)return false;return p.includes(':')?it.acct===p:it.acct.slice(3)===p}
  if(t==='newsletter-link')return it.ch==='em'&&p!=='/'&&(it.paths||[]).some(x=>x.includes(p));
  return false};
const ruleOn=r=>r&&r.on!==false&&!/^(false|0|no|off)$/i.test(String(r.on==null?'':r.on))&&r.ttype&&r.tid!=null&&r.tid!=='';
const ITEMT={we:'web_page',em:'newsletter',sg:'slide'};
P.connTypeOfKey=k=>ITEMT[String(k).slice(0,2)]||null;
// -> {byItem: Map(itemKey -> Map(ttype|tid -> entry)), byTarget: Map(ttype|tid -> Set(itemKey)), ruleHits: Map(ruleId -> n), state}
// entry: {ttype, tid, tlabel, state:'person'|'rule'|'blocked', act, score, who, time, src, rule, row, mirror}
P.connApply=function(ledger,rules,items){const st=P.connState(ledger),byItem=new Map(),byTarget=new Map(),ruleHits=new Map(),K='\u0001';
  const ent=k=>byItem.get(k)||byItem.set(k,new Map()).get(k);const on=(rules||[]).filter(ruleOn);
  for(const it of items||[]){if(!it)continue;for(const r of on){if(!P.connRuleHit(r,it))continue;ruleHits.set(r.id,(ruleHits.get(r.id)||0)+1);
    const tk=r.ttype+K+r.tid,m=ent(it.key);if(m.has(tk))continue;m.set(tk,{ttype:r.ttype,tid:String(r.tid),tlabel:r.tlabel||'',state:'rule',act:'link',score:P.CONN.rule,rule:r.id,who:r.by||'',time:r.created||'',src:'rule'})}}
  for(const row of st.values()){const tk=row.ttype+K+row.tid,m=ent(row.item),prev=m.get(tk),act=P.connAct(row.act);
    if(act==='clear'){if(prev&&prev.state!=='rule')m.delete(tk);continue}
    const base={ttype:row.ttype,tid:String(row.tid),tlabel:row.tlabel||(prev&&prev.tlabel)||'',act,who:row.who||'',time:row.time||'',src:row.src||'manual',row,rule:prev&&prev.rule};
    if(act==='link')m.set(tk,Object.assign(base,row.src==='rule'?{state:'rule',score:P.CONN.rule}:{state:'person',score:100}));
    else m.set(tk,Object.assign(base,{state:'blocked',score:0}))}
  // item-to-item connections (newsletter -> web page) are stored once and read both ways
  const mir=[];for(const [k,m] of byItem)for(const c of m.values()){if(c.state==='blocked'||c.mirror||!ITEMT[String(c.tid).slice(0,2)]||!/^(we|em|sg):/.test(c.tid))continue;const back=P.connTypeOfKey(k);if(back)mir.push([c.tid,back,k,c])}
  for(const [k,tt,tid,c] of mir){const m=ent(k),tk=tt+K+tid;if(!m.has(tk))m.set(tk,Object.assign({},c,{ttype:tt,tid,tlabel:'',mirror:1}))}
  for(const [k,m] of byItem)for(const c of m.values()){if(c.state==='blocked')continue;const tk=c.ttype+K+c.tid;(byTarget.get(tk)||byTarget.set(tk,new Set()).get(tk)).add(k)}
  return {byItem,byTarget,ruleHits,state:st}};
P.connOf=(A,key)=>{const m=A&&A.byItem.get(key);return m?[...m.values()]:[]};
// "Do this every time": the rule a confirmed answer would teach. tgt: {tags:[], phrases:[{t,raw}], paths:[]}; why = the matcher's reason.
// A hashtag the item has that matches the target, else a web path, else a phrase. Returns {type, pattern} or null.
P.connRuleGuess=function(it,tgt,why){if(!it)return null;tgt=tgt||{};const tags=new Set((tgt.tags||[]).map(t=>String(t).toLowerCase().replace(/^#/,''))),ph=(tgt.phrases||[]);
  const its=[...(it.tags||[])];let h=its.find(t=>tags.has(t));
  if(!h){const ws=new Set();ph.forEach(x=>P.sNorm(x.t||x.raw||x).split(' ').forEach(w=>{if(w.length>=5&&!P.STOP.has(w))ws.add(w)}));const joined=ph.map(x=>P.sNorm(x.t||x.raw||x).replace(/ /g,'')).filter(j=>j.length>=6);
    h=its.find(t=>joined.some(j=>t.includes(j)))||its.find(t=>[...ws].some(w=>t.includes(w)))}
  if(h)return {type:'hashtag',pattern:'#'+h};
  if(it.ch==='we'&&it.path&&it.path!=='/'){const seg=it.path.split('/').filter(Boolean).pop()||'';if(seg.length>=5)return {type:'webpath',pattern:'/'+seg}}
  const pats=(tgt.paths||[]).map(p=>String(p).toLowerCase().replace(/\/+$/,'')).filter(Boolean);const lp=(it.paths||[]).find(p=>pats.some(q=>p===q||p.startsWith(q+'/')));if(lp&&lp!=='/')return {type:'webpath',pattern:pats.find(q=>lp===q||lp.startsWith(q+'/'))};
  const q=String(why||'').match(/[“"]([^”"]{3,60})[”"]/);if(q&&it.text.includes(' '+P.sNorm(q[1],1)+' '))return {type:'phrase',pattern:P.sNorm(q[1])};
  for(const x of ph){const t=P.sNorm(x.t||x.raw||x,1);if(t.length>=4&&it.text.includes(' '+t+' '))return {type:'phrase',pattern:t}}
  return null};
// how many of the items a rule would match, by channel
P.connRuleCount=function(rule,items,skipKey){const n={all:0,so:0,we:0,em:0,sg:0};for(const it of items||[]){if(!it||it.key===skipKey)continue;if(P.connRuleHit(rule,it)){n.all++;n[it.ch]=(n[it.ch]||0)+1}}return n};
G.Pulse=P;
})(typeof window!=='undefined'?window:globalThis);
