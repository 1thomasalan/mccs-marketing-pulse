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
G.Pulse=P;
})(typeof window!=='undefined'?window:globalThis);
