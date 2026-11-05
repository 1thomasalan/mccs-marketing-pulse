// ---- v53 search report ----
// "Create report" in global search: one options sheet (channels, exact vs close spellings, dates, compare, detail),
// then either the on-screen report (sheet, shareable) or the printer-friendly Clean A4 report (#report, Save as PDF).
// Uses the same search indexes as global search and P.evRoll (the Strategic Events roll-up) on the chosen items.
if(typeof HI==='object'){HI.doc=HI.doc||'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>';HI.chart=HI.chart||'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'}
const SR={q:'',o:null,drop:new Set(),rev:0,B:null};
const SRD={exact:1,dates:'around',cmp:1,detail:'hi',ch:{so:1,we:1,em:1,sg:1}};
function srOpt(){let s={};try{s=JSON.parse(localStorage.pulseSrOpt||'{}')}catch(e){}return Object.assign({},SRD,s,{ch:Object.assign({},SRD.ch,s.ch||{})})}
function srSave(){const o=SR.o;try{localStorage.pulseSrOpt=JSON.stringify({exact:o.exact,dates:o.dates==='custom'?'around':o.dates,cmp:o.cmp,detail:o.detail,ch:o.ch})}catch(e){}}
const srSens=o=>o.exact?{sens:{fzDf:0}}:{};
const srCH=k=>({so:'Social',we:'Web',em:'Email',sg:'Signage'})[k];
function srFind(q,o){const sn=srSens(o),F={so:[],em:[],sg:[]};
  try{F.so=P.search(P.searchIndex(gsPosts(),PF),q,Object.assign({cap:1e5},sn)).map(x=>x.item)}catch(e){console.warn('sr posts',e)}
  try{const cs=emCamps();if(cs.length)F.em=P.search(P.searchIndex(cs,EF,'em|'+cs.map(c=>c.id).join()),q,Object.assign({cap:1e4},sn)).map(x=>cs[x.i])}catch(e){console.warn('sr email',e)}
  try{const sl=gsSign().filter(s=>s.k==='slide');if(sl.length)F.sg=P.search(P.searchIndex(sl,SGF,'srsg|'+sl.length+'|'+sl.map(s=>s.raw).join()),q,Object.assign({cap:1e4},sn)).map(x=>sl[x.i])}catch(e){console.warn('sr signage',e)}
  return F}
// web pages that match, for one window (page lists are per date range)
function srWeb(q,o,ws,we){if(!S.web.length)return [];const wr=P.webRange(S.web,ws,we);if(!wr||!wr.pgDays)return [];
  const pages=wr.pages.filter(p=>!P.NOISE_PAGES.includes(p[0]));if(!pages.length)return [];
  const qq=String(q).split(/[,|]/).map(a=>P.sNorm(a).split(' ').filter(w=>w&&!QSTOP.has(w)&&!/^\d+(st|nd|rd|th)?$/.test(w)).join(' ')).filter(Boolean).join(',');if(!qq)return [];
  return P.search(P.searchIndex(pages,WF,'sr|'+ws+'|'+we+'|'+pages.length),qq,Object.assign({cap:1e4},srSens(o))).map(x=>pages[x.i][0])}
function srWin(F,o){const t=P.todayKey();setRange();
  if(o.dates==='range')return {ws:S.s,we:S.e,how:'the current date range'};
  if(o.dates==='custom'&&o.cs&&o.ce&&o.cs<=o.ce)return {ws:o.cs,we:o.ce,how:'custom dates'};
  const ds=[...F.so.map(r=>r.d),...F.em.map(c=>c.date)].filter(Boolean).sort();
  if(!ds.length)return {ws:S.s,we:S.e,how:'the current date range (no dated matches)'};
  // the latest burst of activity: matches no more than 60 days apart
  let a=ds.length-1;while(a>0&&P.daysBetween(ds[a-1],ds[a])<=61)a--;
  let we=P.addDays(ds[ds.length-1],7);if(we>t)we=t;return {ws:P.addDays(ds[a],-30),we,how:'the latest matches, 30 days before to 7 after',older:a>0}}
function srBuild(q,o){const F=srFind(q,o),W=srWin(F,o),{ws,we}=W,inW=d=>d&&d>=ws&&d<=we,ctx={postById:evById(),web:S.web,email:emCamps()};
  const keys={so:F.so.filter(r=>inW(r.d)).map(r=>'so:'+r.id),we:srWeb(q,o,ws,we).map(p=>'we:'+p),em:F.em.filter(c=>inW(c.date)).map(c=>'em:'+c.id),sg:F.sg.map(s=>'sg:'+s.raw)};
  const items=[];HCH.forEach(k=>{if(o.ch[k])keys[k].forEach(key=>{if(!SR.drop.has(key))items.push({key,ch:k,state:'manual'})})});
  const R=P.evRoll({id:'sr',name:q,ps:ws,pe:we},items,ctx);
  let plays=null;if(o.ch.sg&&R.sg.slides.length&&typeof spSlide==='function'&&typeof SPL!=='undefined'&&SPL.data){plays=0;for(const s of R.sg.slides){const x=spSlide(s,ws,we);if(x)plays+=x.p}}
  let C=null;if(o.cmp){const cs=P.addDays(ws,-364),ce=P.addDays(we,-364),inC=d=>d&&d>=cs&&d<=ce;
    const ci=[...(o.ch.so?F.so.filter(r=>inC(r.d)).map(r=>({key:'so:'+r.id,ch:'so'})):[]),...(o.ch.we?srWeb(q,o,cs,ce).map(p=>({key:'we:'+p,ch:'we'})):[]),...(o.ch.em?F.em.filter(c=>inC(c.date)).map(c=>({key:'em:'+c.id,ch:'em'})):[])];
    C=P.evRoll({id:'sr~',ps:cs,pe:ce},ci,ctx);C.n=ci.length;C.covered=gsPosts().reduce((m,r)=>r.d<m?r.d:m,'9')<=P.addDays(cs,14)}
  return {q,o,F,W,keys,items,R,C,plays}}
function srEvent(q){if(typeof evList!=='function')return null;const L=evList().filter(e=>e.s);if(!L.length)return null;
  let res=[];try{res=P.search(P.searchIndex(L,{n:[1,e=>e.name]},'srev|'+L.length+'|'+L.map(e=>e.id).join()),q,{cap:50,sens:{fzDf:0}}).filter(x=>x.strong)}catch(e){return null}
  if(!res.length)return null;const t=P.todayKey(),top=res[0].score,c=res.filter(x=>x.score>=top*.9).map(x=>x.item);
  return c.filter(e=>e.s<=t).sort((a,b)=>a.s<b.s?1:-1)[0]||c.sort((a,b)=>a.s<b.s?-1:1)[0]}
function srInfo(key,B){const ch=key.slice(0,2),id=key.slice(3);
  if(ch==='we'){const p=B&&B.R.we.pages.find(x=>x[0]===id);return {ch,t:pgTitle(id),s:`Web page · ${id.length>42?id.slice(0,40)+'…':id}`,v:p?hk(p[2]):'',u:p?'users':'',n:p?p[2]:0}}
  return itemInfo(key)}
const srPct=(a,b)=>{const p=b?P.pct(a,b):null;return p==null||!isFinite(p)?null:p};
// ---------- options sheet ----------
function srOpen(q){q=String(q||'').trim();if(!q)return;if(SR.q!==q){SR.drop=new Set();SR.rev=0;SR.o=null}SR.q=q;if(!SR.o)SR.o=srOpt();
  if(typeof gsClose==='function')gsClose(true);srPaint(true)}
function srPaint(first){const o=SR.o,q=SR.q;let B;try{B=srBuild(q,o)}catch(e){console.error(e);toast("Couldn't build this report. Try a shorter search.",{type:'err'});return}SR.B=B;
  const alt=srBuild(q,Object.assign({},o,{exact:o.exact?0:1,cmp:0})),altN=alt.items.length,n=B.items.length,ev=srEvent(q);
  const cnt=k=>B.keys[k].filter(x=>!SR.drop.has(x)).length,{ws,we}=B.W,dropN=HCH.reduce((a,k)=>a+B.keys[k].filter(x=>SR.drop.has(x)).length,0);
  const chip=(on,attr,label,dis)=>`<button class="chip sm ${on?'on':''}" ${attr} ${dis?'disabled':''} aria-pressed="${on?'true':'false'}">${label}</button>`;
  const all=HCH.flatMap(k=>B.keys[k]);
  const rev=SR.rev?`<div class="srrev">${all.length?all.map(key=>{const i=srInfo(key,B);if(!i)return '';const off=SR.drop.has(key)||!o.ch[i.ch];
      return `<button class="srit ${off?'off':''}" data-srk="${esc(key)}" ${!o.ch[i.ch]?'disabled':''} aria-pressed="${off?'false':'true'}"><span class="srbox">${off?'':hic('check',13)}</span><span class="ib"><span class="t">${esc(i.t)}</span><span class="s"><span class="cb ${i.ch}">${HN[i.ch]}</span>${esc(i.s)}</span></span><span class="n"><b>${i.v}</b><small>${i.u}</small></span></button>`}).join(''):'<p class="mut sm">Nothing matched in these dates.</p>'}</div>`:'';
  const html=`<div class="srop"><div class="mut sm"><span class="tag camp">REPORT</span>Built from your search</div><h3 style="margin-top:8px">“${esc(q)}”</h3>
   ${ev?`<div class="srev"><span class="ic">${hic('flag',16)}</span><span class="t"><b>${esc(ev.name)}</b> is a Strategic Event<small>${esc(hrng(ev.s,ev.e))} · uses its hand-checked connections</small></span><button class="hbtn sm ghost" data-nav="event:${esc(ev.id)}">Event report</button></div>`:''}
   <div class="sro"><h4>Channels</h4><div class="chips">${HCH.map(k=>chip(o.ch[k]&&B.keys[k].length,`data-src="${k}"`,`<i class="dot ${k}"></i>${HN[k]} ${cnt(k)}`,!B.keys[k].length)).join('')}</div></div>
   <div class="sro"><h4>Matches</h4><div class="chips">${chip(o.exact,'data-srx="1"',`Exact matches only · ${o.exact?n:altN}`)}${chip(!o.exact,'data-srx="0"',`Include close spellings · ${o.exact?altN:n}`)}</div>
    <p class="mut sm" style="margin:8px 0 0">${altN===n?'This search has no close-spelling matches.':o.exact?`${Math.abs(altN-n)} more would come in with close spellings (typos and similar words).`:`Close spellings add ${Math.abs(n-altN)} item${Math.abs(n-altN)===1?'':'s'}. Check them in the list.`}</p>
    <button class="srlink" id="srRev">${SR.rev?'Hide the list':`Review the ${n} item${n===1?'':'s'}${dropN?` · ${dropN} removed`:''} · remove any that don't belong`} ›</button>${rev}</div>
   <div class="sro"><h4>Dates</h4><div class="chips">${chip(o.dates==='around','data-srd="around"','Around the matches')}${chip(o.dates==='range','data-srd="range"','Current range')}${chip(o.dates==='custom','data-srd="custom"','Custom')}</div>
    ${o.dates==='custom'?`<div class="srdt"><label>From<input type="date" id="srCs" value="${esc(o.cs||ws)}"></label><label>To<input type="date" id="srCe" value="${esc(o.ce||we)}"></label></div>`:''}
    <p class="mut sm" style="margin:8px 0 0">${esc(P.rangeLabel(ws,we))} · ${esc(B.W.how)}${B.W.older?`. Older matches are left out${o.cmp?' here and used for the comparison':''}; use Custom to include them.`:''}</p></div>
   <div class="sro"><h4>Compare</h4><div class="chips">${chip(!o.cmp,'data-src2="0"','No comparison')}${chip(o.cmp,'data-src2="1"','vs. the same dates last year')}</div>
    ${o.cmp&&B.C?`<p class="mut sm" style="margin:8px 0 0">${esc(P.rangeLabel(P.addDays(ws,-364),P.addDays(we,-364)))} · ${B.C.n} matching item${B.C.n===1?'':'s'}${B.C.covered?'':' · Pulse has no social data that far back'}. Web and email history starts in 2026.</p>`:''}</div>
   <div class="sro"><h4>Detail</h4><div class="chips">${chip(o.detail==='hi','data-srl="hi"','Highlights')}${chip(o.detail==='full','data-srl="full"','Full detail')}</div></div>
   <div class="sro"><h4>Open as</h4><div class="srout"><button class="srbig" id="srScreen" ${n?'':'disabled'}><span>${hic('chart',20)}</span><b>On-screen report</b><small>Interactive, in Pulse · share as an image</small></button><button class="srbig" id="srPrint" ${n?'':'disabled'}><span>${hic('doc',20)}</span><b>Printer-friendly report</b><small>Clean style, A4 · print or save as PDF</small></button></div>
    ${n?'':'<p class="srerr">Nothing is left in this report. Turn a channel back on, widen the dates, or include close spellings.</p>'}</div></div>`;
  const sh=$('#sheet'),top=first?0:sh.scrollTop;openSheet(html,false);if(!first)sh.scrollTop=top;srBind()}
function srBind(){const o=SR.o,re=()=>{srSave();srPaint()};
  $$('[data-src]').forEach(b=>b.onclick=()=>{const k=b.dataset.src;o.ch[k]=o.ch[k]?0:1;re()});
  $$('[data-srx]').forEach(b=>b.onclick=()=>{o.exact=+b.dataset.srx;re()});
  $$('[data-srd]').forEach(b=>b.onclick=()=>{o.dates=b.dataset.srd;if(o.dates==='custom'&&!o.cs&&SR.B){o.cs=SR.B.W.ws;o.ce=SR.B.W.we}re()});
  $$('[data-src2]').forEach(b=>b.onclick=()=>{o.cmp=+b.dataset.src2;re()});
  $$('[data-srl]').forEach(b=>b.onclick=()=>{o.detail=b.dataset.srl;re()});
  const dt=()=>{const a=$('#srCs').value,b=$('#srCe').value;if(a&&b&&a>b){toast('The From date is after the To date.',{type:'err'});return}o.cs=a;o.ce=b;srPaint()};
  if($('#srCs')){$('#srCs').onchange=dt;$('#srCe').onchange=dt}
  $('#srRev').onclick=()=>{SR.rev=SR.rev?0:1;srPaint()};
  $$('[data-srk]').forEach(b=>b.onclick=()=>{const k=b.dataset.srk,was=SR.drop.has(k);was?SR.drop.delete(k):SR.drop.add(k);srPaint();
    if(!was)toast('Removed from this report',{undo:()=>{SR.drop.delete(k);srPaint()}})});
  $('#srScreen').onclick=()=>srScreen();$('#srPrint').onclick=()=>srPrint()}
// ---------- on-screen report ----------
function srPeak(R){let pk=null,mx=-1;for(const [d,v] of R.daily){const t=v.so+v.we+v.em;if(t>mx){mx=t;pk=d}}return pk}
function srScreen(){const B=SR.B;if(!B||!B.items.length)return;const {R,C,o,W}=B,full=o.detail==='full',q=B.q;
  const chs=HCH.filter(k=>o.ch[k]&&B.keys[k].length),yo=C&&C.covered?srPct(R.touch,C.touch):null,ys=C&&C.covered?srPct(R.so.v,C.so.v):null,ly=P.addDays(W.ws,-364).slice(0,4);
  const items=B.items.map(x=>({x,i:srInfo(x.key,B)})).filter(z=>z.i).sort((a,b)=>b.i.n-a.i.n),shown=full?items:items.slice(0,6);
  const pk=srPeak(R);
  const card=k=>k==='so'?`<div class="card so"><h3>Social <small>${R.so.n} posts · FB ${R.so.fb} · IG ${R.so.ig}</small></h3><div class="kv"><div><b>${hk(R.so.v)}</b><span>views</span></div><div><b>${hk(R.so.e)}</b><span>engagements</span></div><div><b>${nf(R.so.lc)}</b><span>link clicks</span></div></div>${ys!=null?`<div class="cnote">${ys>=0?'Up':'Down'} ${Math.abs(ys).toFixed(0)}% on the same dates in ${ly} (${hk(C.so.v)} views).</div>`:''}</div>`
   :k==='we'?`<div class="card we"><h3>Web <small>${R.we.pages.length} page${R.we.pages.length===1?'':'s'}</small></h3><div class="kv"><div><b>${hk(R.we.users)}</b><span>users</span></div><div><b>${hk(R.we.views)}</b><span>page views</span></div><div><b>${R.we.pages.length}</b><span>pages</span></div></div>${R.we.pages.length?`<div class="srcbars">${R.we.pages.slice(0,full?8:3).map(p=>`<div class="r"><span title="${esc(p[0])}">${esc(pgTitle(p[0]))}</span><i><span style="width:${R.we.pages[0][2]?p[2]/R.we.pages[0][2]*100:0}%"></span></i><b>${hk(p[2])}</b></div>`).join('')}</div>`:''}</div>`
   :k==='em'?`<div class="card em"><h3>Email <small>${R.em.camps.length} issue${R.em.camps.length===1?'':'s'}</small></h3><div class="kv"><div><b>${hk(R.em.opens)}</b><span>issue opens</span></div><div><b>${nf(R.em.clicks)}</b><span>clicks</span></div><div><b>${R.em.camps.length?R.em.camps.slice(0,2).map(c=>Math.round(c.openRate)+'%').join(', '):'—'}</b><span>open rate</span></div></div><div class="cnote">${R.em.camps.map(c=>esc(c.name)+' ('+hd(c.date)+')').join(', ')}. Opens are for the whole issue.</div></div>`
   :`<div class="card sg"><h3>Signage <small>${R.sg.slides.length} slide${R.sg.slides.length===1?'':'s'}</small></h3><div class="kv"><div><b>${R.sg.slides.length}</b><span>in rotation</span></div><div><b>${B.plays!=null?hk(B.plays):'—'}</b><span>slide plays</span></div><div><b>${SG.data?SG.data.live:'—'}</b><span>screens live</span></div></div><div class="cnote">Slide plays count each time a slide started on a screen, not people, so they sit beside the total.</div></div>`;
  const chart=pk?hubEvChart({s:pk,e:pk},R).replace('>Event</text>','>Peak day</text>'):'';
  const share={kind:'campaign',plat:null,kicker:'Search report · '+chs.map(srCH).join(', '),range:P.rangeLabel(W.ws,W.we),title:q,big:{v:hk(R.touch),l:'touchpoints'},note:{rest:`Social ${hk(R.so.v)} views · Web ${hk(R.we.users)} users · Email ${hk(R.em.opens)} opens${yo!=null?` · ${yo>=0?'+':''}${yo.toFixed(0)}% vs ${ly}`:''}`},
    stats:[{l:'Items',v:nf(B.items.length)},{l:'Engagement',v:hk(R.eng)},{l:'Posts',v:nf(R.so.n)}],list:R.so.list.slice().sort((a,b)=>b.v-a.v).slice(0,5).map((r,i)=>({...shPost(r),rank:i+1})),listTitle:'Top posts'};
  const html=`<div class="srrep"><button class="hback" id="srBack">${hic('back',15)}Report options</button>
   <div class="mut sm" style="margin-top:6px"><span class="tag camp">SEARCH REPORT</span>${chs.map(srCH).join(' · ')} · ${nf(B.items.length)} items · ${o.exact?'exact matches':'includes close spellings'}</div>
   <h3 style="margin-top:8px">“${esc(q)}”</h3><p class="mut sm" style="margin:2px 0 0">${esc(P.rangeLabel(W.ws,W.we))}${SR.drop.size?` · ${SR.drop.size} removed by hand`:''}</p>
   <div class="hl4"><div class="card lead2"><div class="l">Touchpoints</div><div class="v">${hk(R.touch)}</div><div class="s">social views + web users + email opens</div></div>
    <div class="card"><div class="l">Engagement</div><div class="v">${hk(R.eng)}</div><div class="s">social engagements + email clicks</div></div>
    <div class="card"><div class="l">vs last year</div>${yo!=null?`<div class="v ${yo>=0?'up':'down'}">${yo>=0?'+':'−'}${Math.abs(yo).toFixed(0)}%</div><div class="s">${hk(C.touch)} on the same dates in ${ly}</div>`:`<div class="v mut">—</div><div class="s">${o.cmp?(C&&!C.covered?'No data from that far back':'No matches on those dates last year'):'Comparison is off'}</div>`}</div>
    <div class="card"><div class="l">${B.plays!=null?'Slide plays':'Items'}</div><div class="v">${B.plays!=null?hk(B.plays):nf(B.items.length)}</div><div class="s">${B.plays!=null?'beside the total, not people':'posts, pages, issues and slides'}</div></div></div>
   <div class="pc">${chs.map(card).join('')}</div>
   ${chart?`<div class="card chartwrap"><h2>Daily touchpoints by channel <small>${hd(W.ws)} → ${hd(W.we)}</small></h2><div class="chartscroll"><div>${chart}</div></div><div class="hlegend"><span><i style="background:${HC.so}"></i>Social views (by post date)</span><span><i style="background:${HC.we}"></i>Web users</span><span><i style="background:${HC.em}"></i>Email opens</span></div></div>`:''}
   <div class="card items"><h2>${full?'Everything in this report':'Top items'} <small>${items.length} items</small></h2>${shown.map(z=>`<div class="it"><div class="th t-${z.i.ch}">${z.i.th?`<img data-th="${esc(z.i.th)}" alt="">`:hic(CHI[z.i.ch],18)}</div><div class="ib"><div class="t">${esc(z.i.t)}</div><div class="s"><span class="cb ${z.i.ch}">${HN[z.i.ch]}</span>${esc(z.i.s)}</div></div><div class="n"><b>${z.i.v}</b><span>${z.i.u}</span></div></div>`).join('')}${!full&&items.length>6?`<button class="more" id="srFull">Show all ${items.length}</button>`:''}</div>
   <p class="mut sm">Found by searching “${esc(q)}” (${o.exact?'exact matches':'with close spellings'}) in ${esc(B.W.how)}. Matches are by keyword, so check the list before sharing.</p>
   <div class="srout"><button class="srbig" id="srPrint2"><span>${hic('doc',20)}</span><b>Printer-friendly report</b><small>Clean style, A4 · print or save as PDF</small></button></div></div>`;
  openSheet(html,true,share);$('#sheet').scrollTop=0;hubThumbs();
  $('#srBack').onclick=()=>srPaint(true);$('#srPrint2').onclick=()=>srPrint();const f=$('#srFull');if(f)f.onclick=()=>{SR.o.detail='full';srSave();srScreen()}}
// ---------- printer-friendly Clean A4 ----------
function srBars(R,ws,we){const ks=[];for(let k=ws;k<=we;k=P.addDays(k,1))ks.push(k);const n=ks.length;if(!n)return '';const W=640,H=120,val=k=>R.daily.get(k)||{so:0,we:0,em:0};
  const mx=Math.max(1,...ks.map(k=>{const v=val(k);return v.so+v.we+v.em})),bw=W/n,col={so:'#d9577a',we:'#3d6fd6',em:'#8a63d2'};let b='';
  ks.forEach((k,i)=>{let y=H;const v=val(k);['em','we','so'].forEach(c=>{if(!v[c])return;const h=v[c]/mx*(H-8);y-=h;b+=`<rect x="${(i*bw).toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(.6,bw-.6).toFixed(2)}" height="${h.toFixed(2)}" fill="${col[c]}"/>`})});
  return `<svg viewBox="0 -4 ${W} ${H+18}" style="width:100%"><line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="#dfe3ec"/>${b}<text x="0" y="${H+12}" font-size="10" fill="#5b6478">${P.fmtDate(ws)}</text><text x="${W}" y="${H+12}" font-size="10" fill="#5b6478" text-anchor="end">${P.fmtDate(we)}</text><text x="0" y="6" font-size="10" fill="#5b6478">${hk(mx)}</text></svg>`}
function srPrint(){const B=SR.B;if(!B||!B.items.length)return;const {R,C,o,W}=B,full=o.detail==='full',q=B.q,rl=P.rangeLabel(W.ws,W.we),ly=P.addDays(W.ws,-364).slice(0,4);
  const chs=HCH.filter(k=>o.ch[k]&&B.keys[k].length),yo=C&&C.covered?srPct(R.touch,C.touch):null,dd=p=>p==null?['—','#5b6478']:[(p>=0?'+':'−')+Math.abs(p).toFixed(0)+'%',p>=0?'#16b85c':'#f0363b'];
  const cmpD=p=>o.cmp?(C&&C.covered?dd(p):['—','#5b6478',`no ${ly} data`]):null;
  const K=[['Touchpoints',hk(R.touch),'social views + web users + email opens',cmpD(yo)]];
  if(chs.includes('so'))K.push(['Social views',hk(R.so.v),`${R.so.n} posts · ${hk(R.so.e)} engagements`,cmpD(C&&C.covered?srPct(R.so.v,C.so.v):null)]);
  if(chs.includes('we'))K.push(['Web users',hk(R.we.users),`${R.we.pages.length} page${R.we.pages.length===1?'':'s'} · ${hk(R.we.views)} views`,null]);
  if(chs.includes('em'))K.push(['Email opens',hk(R.em.opens),`${R.em.camps.length} issue${R.em.camps.length===1?'':'s'} · ${nf(R.em.clicks)} clicks`,null]);
  if(K.length<4)K.push(['Engagement',hk(R.eng),'social engagements + email clicks',null]);
  if(K.length<4&&chs.includes('sg'))K.push(['Slide plays',B.plays!=null?hk(B.plays):'—',`${R.sg.slides.length} slide${R.sg.slides.length===1?'':'s'} · not in the total`,null]);
  if(K.length<4)K.push(['Items',nf(B.items.length),'posts, pages, issues, slides',null]);
  const posts=R.so.list.slice().sort((a,b)=>b.v-a.v);
  const pt=`<div class="wc"><span class="pill" style="min-width:50%">Top Posts</span><table><tr><th style="text-align:left">Post</th><th>Date</th><th>Views</th><th>Eng.</th></tr>${posts.slice(0,7).map(r=>`<tr><td>${esc(P.label(r).slice(0,58))}<br><small style="color:var(--sub)">${r.plat==='fb'?'FB':'IG'} · ${esc(acctName(r.plat,r.page))}</small></td><td>${P.fmtDate(r.d)}</td><td>${nf(r.v)}</td><td>${nf(P.eng(r))}</td></tr>`).join('')||'<tr><td colspan="4">No posts in this report</td></tr>'}</table></div>`;
  const side=`<div class="wc"><span class="pill" style="min-width:50%">Web &amp; Email</span><table><tr><th style="text-align:left">Item</th><th>Users / opens</th></tr>${R.we.pages.slice(0,5).map(p=>`<tr><td>${esc(pgTitle(p[0]).slice(0,48))}</td><td>${nf(p[2])}</td></tr>`).join('')}${R.em.camps.map(c=>`<tr><td>${esc(c.name.slice(0,48))}<br><small style="color:var(--sub)">Newsletter · ${P.fmtDate(c.date)} · ${c.openRate}% opened</small></td><td>${nf(c.opens||0)}</td></tr>`).join('')}${!R.we.pages.length&&!R.em.camps.length?'<tr><td colspan="2">No web pages or newsletters matched</td></tr>':''}</table>
    ${R.sg.slides.length?`<div class="srsg"><b>Signage:</b> ${R.sg.slides.length} slide${R.sg.slides.length===1?'':'s'} in rotation${B.plays!=null?` · ${nf(B.plays)} slide plays (not people, not in the total)`:''}</div>`:''}</div>`;
  const how=`Found by searching “${esc(q)}” (${o.exact?'exact matches':'with close spellings'}) in ${esc(B.W.how)}${SR.drop.size?`; ${SR.drop.size} item${SR.drop.size===1?'':'s'} removed by hand`:''}.${o.cmp?` Compared with ${esc(P.rangeLabel(P.addDays(W.ws,-364),P.addDays(W.we,-364)))}${C&&!C.covered?' (no data that far back)':''}.`:''}`;
  const src=`Source: Meta Business Suite${chs.includes('we')?' · Google Analytics 4':''}${chs.includes('em')?' · Constant Contact':''}${chs.includes('sg')?' · ScreenCloud':''} · ${rl} · generated ${P.fmtDate(P.todayKey(),{year:'numeric'})}`;
  const all=B.items.map(x=>srInfo(x.key,B)).filter(Boolean).sort((a,b)=>b.n-a.n);
  const pg2=full?`<div class="a4 st-light srA4"><div class="hd"><b>${esc(CFG.rHead)}</b><span>${rl}</span></div><div class="ttl" style="font-size:24pt">Everything in this report</div><div class="st">“${esc(q)}” · ${all.length} items</div>
    <div class="wc"><table><tr><th style="text-align:left">Item</th><th style="text-align:left">Channel</th><th>Result</th></tr>${all.slice(0,34).map(i=>`<tr><td>${esc(i.t.slice(0,70))}<br><small style="color:var(--sub)">${esc(i.s.slice(0,80))}</small></td><td style="text-align:left">${HN[i.ch]}</td><td>${i.v} ${i.u}</td></tr>`).join('')}</table>${all.length>34?`<p class="srsg">Plus ${all.length-34} smaller items.</p>`:''}</div><div class="ft">${src}</div></div>`:'';
  $('#pages').innerHTML=`<div class="a4 st-light srA4"><div class="hd"><b>${esc(CFG.rHead)}</b><span>${rl}</span></div><div class="ttl" style="font-size:${q.length>22?24:32}pt">${esc(q)}</div><div class="st">Search report · ${esc(CFG.rOrg)} · ${chs.map(srCH).join(', ')} · ${nf(B.items.length)} items</div>
   <div class="k4">${K.map(([l,v,s,d])=>`<div class="wc"><span class="pill" style="min-width:80%">${l}</span><div class="bv">${v}</div><div class="bs">${s}</div>${d?`<div class="bd" style="color:${d[1]}">${d[0]}</div><div class="bds">${d[2]||'vs same dates '+ly}</div>`:''}</div>`).join('')}</div>
   <div class="wc srch"><span class="pill" style="min-width:40%">Daily touchpoints</span>${srBars(R,W.ws,W.we)}<div class="srlg">${chs.includes('so')?'<span style="color:#d9577a">● Social views</span>':''}${chs.includes('we')?'<span style="color:#3d6fd6">● Web users</span>':''}${chs.includes('em')?'<span style="color:#8a63d2">● Email opens</span>':''}</div></div>
   <div class="r2 srr2">${pt}${side}</div><p class="srhow" contenteditable>${how}</p><div class="ft">${src}</div></div>${pg2}`;
  closeSheet();$('#rStyleBar').innerHTML='<span class="srclean">Clean style</span>';$('#report').classList.add('show');scrollTo(0,0);$('#report').scrollTop=0;fit()}
// ---------- hook into global search ----------
(function(){if(typeof gsRender!=='function')return;const _gr=gsRender;
  gsRender=function(){_gr.apply(this,arguments);const L=GS.last,s=$('#gbody .gsum');if(!L||!s||!L.q.trim())return;const tot=L.R.reduce((a,x)=>a+x.res.length,0);if(!tot)return;
    const b=document.createElement('button');b.className='gsrep';b.innerHTML=`${hic('doc',15)}Create report`;b.onclick=e=>{e.preventDefault();srOpen(L.q)};
    const w=document.createElement('div');w.className='gsumrow';s.parentNode.insertBefore(w,s);w.appendChild(s);w.appendChild(b);
    const ev=srEvent(L.q);if(ev){const d=document.createElement('div');d.className='srev gs';d.innerHTML=`<span class="ic">${hic('flag',16)}</span><span class="t"><b>${esc(ev.name)}</b> is a Strategic Event<small>${esc(hrng(ev.s,ev.e))} · hand-checked connections</small></span><button class="hbtn sm ghost" data-nav="event:${esc(ev.id)}">Event report</button>`;w.parentNode.insertBefore(d,w)}}})();
