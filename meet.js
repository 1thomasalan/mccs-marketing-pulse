// MCCS Digital Pulse v81 "Meeting brief": one page for a department meeting (a branch from the Programs list, a program group, or one program).
// Loaded after programs.js / prod.js. Uses only existing data paths: pgRows()/progData() (P.progChannels), hubCov() (P.progCoverage),
// evData()/evRoll() (strategic events), prodData()/prodM()/prodByEv() (Wrike production calendar), emCamps(), gsPosts(), sgAll(), pgTitle().
// Print A4 uses the Clean report style (#report / #pages, .a4.st-light), two pages at most.
Object.assign(S,{mb:(()=>{try{return Object.assign({br:'',grp:'',id:'',from:''},JSON.parse(localStorage.pulseMb||'{}'))}catch(e){return {br:'',grp:'',id:'',from:''}}})()});
const MB_DAYS=60;
const mbSave=()=>{try{localStorage.pulseMb=JSON.stringify({br:S.mb.br,grp:S.mb.grp,id:S.mb.id})}catch(e){}};
const mbN=x=>P.sNorm(String(x||'')).replace(/\bops\b/g,'operations');
// which programs the brief covers
function mbSel(A){A=A||pgRows()||[];const m=S.mb;
 if(m.id){const o=A.find(z=>z.r.id===m.id);if(o)return {L:[o],label:o.r.name,kind:'program',br:o.r.branch}}
 if(!m.br||!A.some(o=>o.r.branch===m.br))return null;
 if(m.grp){const L=A.filter(o=>o.r.branch===m.br&&o.r.program===m.grp);if(L.length)return {L,label:m.grp,kind:'group',br:m.br}}
 return {L:A.filter(o=>o.r.branch===m.br),label:brName(m.br),kind:'branch',br:m.br}}
// the comparison window run through the same matchers, so social views and web users can be de-duplicated across programs
const MBP={k:'',X:null};
function mbPrev(){const d=evData();if(!d||!S.cs)return null;const ps=gsPosts(),k=[S.cs,S.ce,ps.length,S.web.length,PGC.key].join('~');if(MBP.k===k)return MBP.X;let X=null;
 try{const C=P.progCoverage({programs:d.programs,posts:ps,events:d.events,s:S.cs,e:S.ce,days:CFG.weakDays,today:P.todayKey()});
  X=P.progChannels({cov:C,posts:ps,web:S.web,email:[],signage:[],events:[],s:S.cs,e:S.ce,ds:S.cs,today:P.todayKey(),conn:typeof cnApplied==='function'?cnApplied():null})}catch(e){console.warn('brief compare',e)}
 MBP.k=k;MBP.X=X;return X}
// Wrike status for one strategic event (same rules as the event page's "In production" card)
function mbWk(e){const p=prodData();if(!p||!e.s)return null;const M=prodM(),L=prodByEv(e.id)||[];
 const k=L.length?'ok':(M.last&&e.s>P.addDays(M.last,3))?'beyond':/other service/i.test(e.type||'')?'other':'gap';return {k,L}}
// Wrike rows that belong to this selection: linked to one of its events, the same division (whole branch), or a program/facility name match
function mbProdRows(sel,evIds){const p=prodData();if(!p)return [];prodM();const names=[...new Set(sel.L.flatMap(o=>[o.r.program,o.r.facility]).filter(Boolean).map(mbN).filter(x=>x.length>=3))];
 const bn=mbN(brName(sel.br)),hit=r=>{const pr=mbN(r.prog);if(pr&&names.some(n=>(' '+pr+' ').includes(' '+n+' ')||(' '+n+' ').includes(' '+pr+' ')))return true;
  if(sel.kind==='branch'){const dv=mbN(r.div);if(dv&&bn&&(dv===bn||dv.startsWith(bn+' ')||bn.startsWith(dv+' ')))return true}return false};
 return p.rows.filter(r=>(r._ev&&evIds.has(r._ev))||hit(r))}
function mbCalc(sel){const today=P.todayKey(),L=sel.L,fs=fairCmp(['fb','ig']),fw=S.web.length?fairCmp(['we']):{ok:false,why:'no web data'};
 const posts=new Map(),web=new Map(),camps=new Map(),slides=new Set(),now=new Set(),evs=new Map();
 for(const {x} of L){x.so.list.forEach(q=>posts.set(q.id,q));x.we.pages.forEach(p=>{const w=web.get(p[0]);if(!w||w[2]<p[2])web.set(p[0],p)});x.em.camps.forEach(c=>camps.set(c.id,c));
  x.sg.slides.forEach(s=>slides.add(s));(x.sg.now||[]).forEach(s=>now.add(s));x.ev.forEach(e=>evs.set(e.id,e))}
 const pl=[...posts.values()].sort((a,b)=>b.v-a.v),wl=[...web.values()].sort((a,b)=>b[2]-a[2]),cl=[...camps.values()].sort((a,b)=>(b.opens||0)-(a.opens||0));
 const so=pl.reduce((a,q)=>a+q.v,0),we=wl.reduce((a,p)=>a+p[2],0),op=cl.reduce((a,c)=>a+(c.opens||0),0);
 let pso=null,pwe=null;const PX=mbPrev();if(PX){const ids=new Set(L.map(o=>o.r.id)),pp=new Map(),pw=new Map();for(const [id,R] of PX){if(!ids.has(id))continue;R.so.list.forEach(q=>pp.set(q.id,q.v));R.we.pages.forEach(p=>pw.set(p[0],Math.max(pw.get(p[0])||0,p[2])))}
  pso=[...pp.values()].reduce((a,v)=>a+v,0);pwe=[...pw.values()].reduce((a,v)=>a+v,0)}
 const dSo=fs.ok&&pso?pgPct(so,pso):null,dWe=fw.ok&&pwe?pgPct(we,pwe):null;
 const EV=[...evs.values()].filter(e=>e.s&&!/cancel/i.test(e.status||''));
 const up=EV.filter(e=>e.s>=today&&e.s<=P.addDays(today,MB_DAYS)).sort((a,b)=>a.s<b.s?-1:1);
 const past=EV.filter(e=>e.s<today&&e.s<=S.e&&(e.e||e.s)>=S.s).sort((a,b)=>a.s<b.s?1:-1);
 const prows=mbProdRows(sel,new Set(EV.map(e=>e.id))),until=P.addDays(today,MB_DAYS);
 const campM=new Map();prows.filter(r=>r.camp&&r.d&&r.d>=P.addDays(today,-30)).forEach(r=>{const c=campM.get(r.camp)||{name:r.camp,n:0,a:r.d,b:r.d};c.n++;if(r.d<c.a)c.a=r.d;if(r.d>c.b)c.b=r.d;campM.set(r.camp,c)});
 const wkOnly=prows.filter(r=>!r._ev&&r.d&&r.d>=today&&r.d<=until).sort((a,b)=>a.d<b.d?-1:1);
 // gaps: coverage flags first (silent, behind, an event with no posts), then cross-channel warnings from the Programs health check
 const gaps=[];for(const o of L){const r=o.r;if(r.exp===0)continue;r.flags.forEach(f=>gaps.push({sev:(r.sev||0)+(['never','quiet'].includes(f[0])?500:0),t:`${r.name}: ${f[1]}`,b:['never','quiet'].includes(f[0])}));
  if(!r.flags.length&&o.h.c==='w')gaps.push({sev:100,t:`${r.name}: ${o.h.t}`})}
 gaps.sort((a,b)=>b.sev-a.sev);
 const C=hubCov(),gen=sel.kind==='branch'&&C?((C.branches.find(b=>b.branch===sel.br)||{}).general||[]).reduce((a,g)=>a+g.n,0):0;
 return {L,fs,fw,pl,wl,cl,so,we,op,slides,now,dSo,dWe,up,past,campM:[...campM.values()].sort((a,b)=>b.n-a.n),wkOnly,gaps,gen,today,until,prodOn:!!prodData()}}
// ---------- wording shared by screen and print ----------
const mbPctTxt=p=>p==null||!isFinite(p)?'':`${p>=0?'▲':'▼'} ${Math.min(999,Math.abs(p)).toFixed(0)}%`;
const mbPlat=q=>q.plat==='fb'?'Facebook':'Instagram';
function mbScope(sel,B){const days=P.daysBetween(S.s,S.e),u=updOf(['fb','ig','web','email']);
 return [`${esc(P.rangeLabel(S.s,S.e))} (${days} day${days===1?'':'s'})`,B.fs.ok?'vs '+esc(cmpLabel()):{t:esc(B.fs.why),w:1},'Facebook + Instagram, website (GA4), email (Constant Contact), signage (ScreenCloud)',
  `counted when it’s connected to ${sel.kind==='program'?'this program':`a ${esc(sel.label)} program`} (its own page, a keyword, a web path or a team link)`,`${B.L.length} program${B.L.length===1?'':'s'}`,
  B.gen?{t:`${B.gen} post${B.gen===1?'':'s'} on shared pages not tied to a program yet (see Programs)`,w:1}:'',exclSlot(),u?'data updated '+esc(u):'']}
function mbTiles(sel,B){const short=sel.kind==='program'?'its':esc(sel.label);
 return [[hk(B.so),'Social views',`${B.pl.length} post${B.pl.length===1?'':'s'}${B.dSo!=null?' · '+mbPctTxt(B.dSo)+' vs before':B.fs.ok?'':' · no % change'}`,B.dSo],
  [S.web.length?hk(B.we):'—',`Web users on ${short} pages`,S.web.length?`${B.wl.length} page${B.wl.length===1?'':'s'} · GA4 page users added up${B.dWe!=null?' · '+mbPctTxt(B.dWe):''}`:'no web data on this device',B.dWe],
  [S.email.length?nf(B.cl.length):'—',`Emails featuring ${sel.kind==='program'?'it':short}`,S.email.length?`${nf(B.op)} opens of those issues`:'no email data on this device',null],
  [SG.data||(typeof SPL==='object'&&SPL.data)?nf(B.slides.size):'—','Signage slides',SG.data?`played in these dates · ${B.now.size} in rotation now`:'signage not loaded',null]]}
function mbWorked(B){const out=[];const q=B.pl[0],c=B.cl.slice().sort((a,b)=>(b.openRate||0)-(a.openRate||0))[0],w=B.wl[0];
 if(q)out.push(`Top post: “${esc(P.label(q).slice(0,70))}” (${mbPlat(q)}, ${hd(q.d)}), ${nf(q.v)} views.`);
 if(c)out.push(`Best email: ${esc(c.name)} (${hd(c.date)}), ${c.openRate!=null?c.openRate+'% opened, ':''}${nf(c.opens||0)} opens.`);
 if(w)out.push(`Top web page: ${esc(pgTitle(w[0]))}, ${nf(w[2])} users (GA4).`);return out}
function mbWkTxt(e){const w=mbWk(e);if(!w)return '';return w.k==='ok'?`In production in Wrike (${w.L.length} project${w.L.length===1?'':'s'})`:PST[w.k][0]}
function mbComing(B){return B.up.slice(0,6).map(e=>{const R=evRoll(e),wk=mbWkTxt(e);return {e,R,wk,w:mbWk(e)}})}
function mbProdAsOf(){const p=prodData(),d=evData();return p?`Wrike export “${esc(p.file||'Event Calendar')}”, published ${esc(hTime(d.updated))}`:''}
// ---------- screen ----------
function mbView(){const A=pgRows();if(!A)return progEmpty();const sel=mbSel(A);
 if(!sel)return `<button class="hback" data-nav="programs">${hic('back',15)}All programs</button><div class="dh"><div><h1>Meeting brief</h1><p class="mbsub2">One page for a department meeting. Pick a branch or program, pick dates, print.</p></div><div class="acts"><button class="hbtn" id="mbChange">Choose a department</button></div></div>`;
 const B=mbCalc(sel),back=S.mb.from&&S.mb.id?`program:${S.mb.id}`:'programs',T=mbTiles(sel,B),W=mbWorked(B),CU=mbComing(B);
 const dcls=p=>p==null?'':p>=0?'up':'down';
 const prow=o=>{const {r,x}=o,q=r.flags.some(f=>['never','quiet'].includes(f[0]));const d=B.fs.ok?pgDelta(x.so.v,x.so.pv):'';
  return `<tr class="tap" data-nav="program:${esc(r.id)}"><td class="l"><b>${esc(r.name)}</b>${sel.kind==='branch'&&r.facility?`<small>${esc(r.program)}</small>`:''}</td><td class="pnum">${x.so.n}</td><td class="pnum">${x.so.n?hk(x.so.v):'—'} ${d}</td><td class="pnum">${S.web.length?(x.we.users?hk(x.we.users):'—'):'—'}</td><td class="pnum mbhp">${x.em.camps.length||'—'}</td><td class="pnum ${q?'mbq':''}">${r.last?esc(hd(r.last)):'No posts'}</td></tr>`};
 const rows=B.L.slice().sort((a,b)=>b.x.so.v-a.x.so.v||b.x.we.users-a.x.we.users||a.r.name.localeCompare(b.r.name));
 const tp=(c,t,body)=>`<div class="mbtp"><span class="dot ${c}"></span><div><div class="t">${t}</div><div class="m">${body}</div></div></div>`;
 const coming=CU.length?CU.map(c=>`${esc(evShort(c.e))} (${esc(hd(c.e.s))}): ${c.R.so.n} post${c.R.so.n===1?'':'s'} linked so far${c.wk?' · '+esc(c.wk):''}.`).join('<br>'):`No strategic event for ${sel.kind==='program'?'this program':'these programs'} in the next ${MB_DAYS} days.`;
 const wko=B.wkOnly.length?`<br><span class="mut">Also in Wrike, not on the Strategic list: ${B.wkOnly.slice(0,4).map(r=>`${esc(r.nm)} (${esc(hd(r.d))})`).join(', ')}${B.wkOnly.length>4?` and ${B.wkOnly.length-4} more`:''}.</span>`:'';
 const tc=[];B.pl.slice(0,3).forEach(q=>tc.push(`<div class="mbit" data-post="${esc(q.id)}"><span class="th t-so"><img data-th="${esc(q.id)}" alt=""></span><span class="tt">${esc(P.label(q).slice(0,90))}<small><i class="chm">${mbPlat(q)} · </i>${esc(hd(q.d))} · ${esc(acctName(q.plat,q.page))}</small></span><span class="ch so">${mbPlat(q)}</span><b>${hk(q.v)}<small>views</small></b></div>`));
 B.cl.slice(0,2).forEach(c=>tc.push(`<div class="mbit" data-ecamp="${esc(c.id)}"><span class="th t-em">${hic('mail',16)}</span><span class="tt">${esc(c.name)}<small><i class="chm">Email · </i>Sent ${esc(hd(c.date))}${c.openRate!=null?' · '+c.openRate+'% opened':''}</small></span><span class="ch em">Email</span><b>${hk(c.opens||0)}<small>opens</small></b></div>`));
 B.wl.slice(0,3).forEach(p=>tc.push(`<div class="mbit"><span class="th t-we">${hic('web',16)}</span><span class="tt">${esc(pgTitle(p[0]))}<small><i class="chm">Web · </i>${esc(p[0].length>48?p[0].slice(0,46)+'…':p[0])}</small></span><span class="ch we">Web</span><b>${hk(p[2])}<small>users</small></b></div>`));
 const evRow=(e,up)=>{const R=evRoll(e),w=up?mbWk(e):null,n=R?R.items.length:0;return `<button class="mbev" data-nav="event:${esc(e.id)}"><span><b>${esc(e.name)}</b><small>${esc(hrng(e.s,e.e))} · ${up?'coming up':'in these dates'}${w?' · '+esc(mbWkTxt(e)):''}</small></span><span class="chip sm ${n?'ok':'no'}">${n} linked${R&&R.so.n?` · ${R.so.n} post${R.so.n===1?'':'s'}`:''}</span></button>`};
 const evl=[...B.past.slice(0,4).map(e=>evRow(e,0)),...B.up.slice(0,5).map(e=>evRow(e,1))];
 const camps=B.campM.map(c=>`<div class="mbev"><span><b>${esc(c.name)}</b><small>Wrike campaign tag · ${esc(hd(c.a))}${c.b!==c.a?' – '+esc(hd(c.b)):''}</small></span><span class="chip sm q">${c.n} Wrike project${c.n===1?'':'s'}</span></div>`).join('');
 return `<button class="hback" data-nav="${back}">${hic('back',15)}${back==='programs'?'All programs':esc(sel.label)}</button>
 <div class="dh mbh"><div><div class="pgk">${sel.kind==='branch'?'Branch':sel.kind==='group'?esc(brName(sel.br))+' · program group':esc(brName(sel.br))+' · one program'}</div><h1>Meeting brief · ${esc(sel.label)}</h1><p class="mbsub2">One page for a department meeting. Pick a branch or program, pick dates, print.</p></div>
  <div class="acts"><button class="hbtn ghost" id="mbChange">Change department</button><button class="hbtn" id="mbPrint">${hic('sheet',16)}Print A4</button></div></div>
 <div class="ctl mbctl"><div class="range presets">${PRESETS.map(([k,l])=>`<button data-p="${k}" class="${S.preset===k?'on':''}">${l}</button>`).join('')}</div>${scopeLine(mbScope(sel,B))}${freshPill(['fb','ig','web','email','signage'])}</div>
 <div class="kg mbk">${T.map(([v,l,s,p])=>`<div class="card"><div class="v">${v}</div><div class="l">${l}</div><div class="d mut ${dcls(p)}">${s}</div></div>`).join('')}</div>
 <div class="mbg"><div class="card"><h2>Programs <small>${B.L.length}</small></h2><p class="mut sm mbcap">In ${esc(P.rangeLabel(S.s,S.e))}. Social views are Facebook + Instagram (lifetime to date). Web users are GA4 page users. Emails are newsletters that mention the program. Last post is the newest post found, any date; red means quiet for ${CFG.weakDays}+ days or none found.</p>
  <div class="mbtw"><table class="pgt mbt"><thead><tr><th class="l">Program</th><th>Posts</th><th>Social views</th><th>Web users</th><th class="mbhp">Emails</th><th>Last post</th></tr></thead><tbody>${rows.map(prow).join('')}</tbody></table></div></div>
  <div class="card"><h2>Talking points</h2><p class="mut sm mbcap">From these dates. Gaps use the Programs checks (posts in the last ${CFG.weakDays} days, expected posts a month, branch median). Coming up is the next ${MB_DAYS} days from today${B.prodOn?' with the Wrike production calendar':''}.</p>
  ${tp('g','What worked',W.join('<br>')||'Nothing posted, sent or visited in these dates.')}
  ${tp('r','Gaps',B.gaps.length?B.gaps.slice(0,5).map(g=>esc(g.t)+'.').join('<br>')+(B.gaps.length>5?`<br><span class="mut">and ${B.gaps.length-5} more on the Programs page.</span>`:''):'Nothing stands out.')}
  ${tp('a',`Coming up · next ${MB_DAYS} days`,coming+wko)}
  ${B.prodOn?`<p class="mut sm" style="margin:8px 0 0">${mbProdAsOf()}.</p>`:''}</div></div>
 <div class="mbg"><div class="card"><h2>Top content</h2><p class="mut sm mbcap">Each row says its channel. Social: views. Email: opens of the whole issue (Constant Contact). Web: page users (GA4). Same dates as above.</p><div class="mbl">${tc.join('')||'<p class="mut">Nothing in these dates.</p>'}</div></div>
  <div class="card"><h2>Events${B.campM.length?' &amp; campaigns':''}</h2><p class="mut sm mbcap">Strategic events for these programs in these dates and the next ${MB_DAYS} days. Linked = posts, pages, newsletters and slides matched to the event’s promo window.${B.campM.length?' Campaigns are tags already in the Wrike production calendar.':''}</p><div class="mbl">${evl.join('')||'<p class="mut">No strategic event for these programs in these dates or coming up.</p>'}${camps}</div></div></div>`}
// department chooser: branch, program group (2+ programs), or one program
function mbPick(){const A=pgRows()||[];const brs=[...new Set(A.map(o=>o.r.branch))].map(b=>({b,L:A.filter(o=>o.r.branch===b)})).sort((a,b)=>b.L.length-a.L.length);
 const cur=S.mb,on=(b,g,i)=>cur.br===b&&(cur.grp||'')===(g||'')&&(cur.id||'')===(i||'')?'on':'';
 openSheet(`<h3>Choose a department</h3><p class="mut sm" style="margin:-4px 0 12px">A whole branch, a group of programs, or one program.</p>${brs.map(({b,L})=>{const gr=[...new Set(L.map(o=>o.r.program))].map(g=>[g,L.filter(o=>o.r.program===g).length]).filter(g=>g[1]>1);
  return `<div class="mbpk"><button class="chip ${on(b,'','')}" data-mbb="${esc(b)}"><b>${esc(brName(b))}</b> · ${L.length} program${L.length===1?'':'s'}</button>${gr.length?`<div class="mbsub">${gr.map(([g,n])=>`<button class="chip sm ${on(b,g,'')}" data-mbb="${esc(b)}" data-mbg="${esc(g)}">${esc(g)} · ${n}</button>`).join('')}</div>`:''}<div class="mbsub">${L.slice().sort((a,b)=>a.r.name.localeCompare(b.r.name)).map(o=>`<button class="chip sm ${on(b,'',o.r.id)}" data-mbb="${esc(b)}" data-mbi="${esc(o.r.id)}">${esc(o.r.name)}</button>`).join('')}</div></div>`}).join('')}`);
 $$('[data-mbb]').forEach(x=>x.onclick=()=>{S.mb={br:x.dataset.mbb,grp:x.dataset.mbg||'',id:x.dataset.mbi||'',from:''};mbSave();closeSheet();mbGo();const s=mbSel();toast(s?`Meeting brief · ${s.label}`:'Meeting brief')})}
function mbGo(){S.view='programs';S.progSub='brief';render();scrollTo(0,0)}
// ---------- print: Clean A4, two pages at most ----------
function mbPrint(){const sel=mbSel();if(!sel)return;const B=mbCalc(sel),T=mbTiles(sel,B),W=mbWorked(B),CU=mbComing(B),rl=P.rangeLabel(S.s,S.e),dc=p=>p==null?'#5b6478':p>=0?'#16b85c':'#f0363b';
 const rows=B.L.slice().sort((a,b)=>b.x.so.v-a.x.so.v||b.x.we.users-a.x.we.users||a.r.name.localeCompare(b.r.name));const NMAX=60;
 const tr=o=>{const {r,x}=o,q=r.flags.some(f=>['never','quiet'].includes(f[0])),d=B.fs.ok?pgPct(x.so.v,x.so.pv):null;return `<tr><td>${esc(r.name.slice(0,34))}</td><td>${x.so.n}</td><td>${x.so.n?nf(x.so.v):'—'}${d!=null&&isFinite(d)&&x.so.n?` <small style="color:${dc(d)}">${mbPctTxt(d)}</small>`:''}</td><td>${S.web.length&&x.we.users?nf(x.we.users):'—'}</td><td>${x.em.camps.length||'—'}</td><td style="${q?'color:#c8102e;font-weight:700':''}">${r.last?P.fmtDate(r.last):'No posts'}</td></tr>`};
 const ptab=L=>`<table class="mbprog"><tr><th style="text-align:left">Program</th><th>Posts</th><th>Social views</th><th>Web users</th><th>Emails</th><th>Last post</th></tr>${L.map(tr).join('')}</table>`;
 const tpl=(t,c,b)=>`<p class="lab" style="color:${c}">${t}</p><div class="mbpt">${b}</div>`;
 const coming=CU.length?CU.slice(0,5).map(c=>`${esc(evShort(c.e))} (${P.fmtDate(c.e.s)}): ${c.R.so.n} post${c.R.so.n===1?'':'s'} linked${c.wk?' · '+esc(c.wk):''}.`).join('<br>'):`No strategic event in the next ${MB_DAYS} days.`;
 const wko=B.wkOnly.length?`<br>Also in Wrike: ${B.wkOnly.slice(0,3).map(r=>`${esc(r.nm.slice(0,40))} (${P.fmtDate(r.d)})`).join(', ')}${B.wkOnly.length>3?` and ${B.wkOnly.length-3} more`:''}.`:'';
 const talk=`<div class="wc"><span class="pill">Talking points</span>${tpl('What worked','#16803f',W.join('<br>')||'Nothing posted, sent or visited in these dates.')}${tpl('Gaps','#c8102e',B.gaps.slice(0,4).map(g=>esc(g.t)+'.').join('<br>')+(B.gaps.length>4?`<br>And ${B.gaps.length-4} more on the Programs page.`:'')||'Nothing stands out.')}${tpl(`Coming up · next ${MB_DAYS} days`,'#a8650b',coming+wko)}</div>`;
 const top=`<div class="wc"><span class="pill">Top content</span>
  <table><tr><th style="text-align:left">Social post</th><th>Date</th><th>Views</th></tr>${B.pl.slice(0,4).map(q=>`<tr><td>${esc(P.label(q).slice(0,60))}<br><small style="color:var(--sub)">${mbPlat(q)} · ${esc(acctName(q.plat,q.page))}</small></td><td>${P.fmtDate(q.d)}</td><td>${nf(q.v)}</td></tr>`).join('')||'<tr><td colspan="3">No posts in these dates</td></tr>'}</table>
  ${S.email.length?`<table class="mbsp"><tr><th style="text-align:left">Newsletter</th><th>Sent</th><th>Opens</th></tr>${B.cl.slice(0,3).map(c=>`<tr><td>${esc(c.name.slice(0,52))}<br><small style="color:var(--sub)">Email · ${c.openRate!=null?c.openRate+'% opened':''}</small></td><td>${P.fmtDate(c.date)}</td><td>${nf(c.opens||0)}</td></tr>`).join('')||'<tr><td colspan="3">No newsletter mentions these programs</td></tr>'}</table>`:''}
  ${S.web.length?`<table class="mbsp"><tr><th style="text-align:left">Web page</th><th>Users (GA4)</th></tr>${B.wl.slice(0,4).map(p=>`<tr><td>${esc(pgTitle(p[0]).slice(0,56))}<br><small style="color:var(--sub)">Web · ${esc(p[0].length>50?p[0].slice(0,48)+'…':p[0])}</small></td><td>${nf(p[2])}</td></tr>`).join('')||'<tr><td colspan="2">No web pages matched</td></tr>'}</table>`:''}</div>`;
 const evr=(e,up)=>{const R=evRoll(e),n=R?R.items.length:0;return `<tr><td>${esc(e.name.slice(0,44))}<br><small style="color:var(--sub)">${up?'Coming up':'In these dates'}${up&&mbWk(e)?' · '+esc(mbWkTxt(e)):''}</small></td><td>${esc(hrng(e.s,e.e))}</td><td style="${n?'':'color:#c8102e;font-weight:700'}">${n}</td><td>${R?R.so.n:0}</td></tr>`};
 const evt=`<div class="wc"><span class="pill">Events${B.campM.length?' &amp; campaigns':''}</span><table><tr><th style="text-align:left">Strategic event</th><th>Dates</th><th>Linked</th><th>Posts</th></tr>${[...B.past.slice(0,4).map(e=>evr(e,0)),...B.up.slice(0,5).map(e=>evr(e,1))].join('')||'<tr><td colspan="4">No strategic event in these dates or coming up</td></tr>'}</table>
  ${B.campM.length?`<table class="mbsp"><tr><th style="text-align:left">Wrike campaign tag</th><th>Dates</th><th>Wrike projects</th></tr>${B.campM.slice(0,3).map(c=>`<tr><td>${esc(c.name)}</td><td>${P.fmtDate(c.a)}${c.b!==c.a?' – '+P.fmtDate(c.b):''}</td><td>${c.n}</td></tr>`).join('')}</table>`:''}
  <p class="mbpn">Linked = posts, pages, newsletters and slides matched to the event’s promo window.${B.prodOn?' '+mbProdAsOf()+'.':''}</p></div>`;
 const sc=mbScope(sel,B).filter(Boolean).map(x=>typeof x==='string'?x:x.t).join(' · ');
 const src=`Sources: Meta Business Suite (Facebook + Instagram, social views lifetime to date) · Google Analytics 4 (page users added up) · Constant Contact (opens of the whole issue) · ScreenCloud (slides, not added in)${B.prodOn?' · Wrike production calendar':''} · ${esc(rl)} · ${exclSlot()||'no accounts excluded'} · generated ${P.fmtDate(P.todayKey(),{year:'numeric'})}`;
 const hd_=`<div class="hd"><b>${esc(CFG.rHead)}</b><span>${esc(rl)}</span></div>`;
 const p1=`<div class="a4 st-light mbA4">${hd_}<div class="ttl">Meeting brief</div><div class="st">${esc(sel.label)} · ${sel.kind==='branch'?'branch':sel.kind==='group'?'program group':'one program'} · ${esc(CFG.rOrg)}</div><div class="scope rscope">${sc}</div>
  <div class="k4">${T.map(([v,l,s,p])=>`<div class="wc"><span class="pill" style="min-width:80%">${l}</span><div class="bv">${v}</div><div class="bs" style="color:${p==null?'var(--muted)':dc(p)}">${s}</div></div>`).join('')}</div>
  <div class="r2 mbr">${`<div class="wc"><span class="pill">Programs · ${B.L.length}</span>${ptab(rows.slice(0,NMAX))}<p class="mbpn mbn1"></p><p class="mbpn">Red last post = quiet ${CFG.weakDays}+ days or none found. Last post is the newest post found, any date.</p></div>`}${talk}</div><div class="ft">${src}</div></div>`;
 const p2=`<div class="a4 st-light mbA4">${hd_}<div class="ttl" style="font-size:22pt">${esc(sel.label)} · details</div><div class="st">Same dates and rules as page 1</div>
  <div class="r2 mbr2">${top}${evt}</div><div class="wc mbmore" style="margin-top:3mm"><span class="pill">More programs</span>${ptab([])}<p class="mbpn mbn2"></p></div><div class="ft">${src}</div></div>`;
 $('#pages').innerHTML=p1+p2;closeSheet();$('#rStyleBar').innerHTML='<span class="srclean">Clean style</span>';$('#report').classList.add('show');$$('#pages .a4').forEach(x=>x.style.transform='');mbFitPages(Math.max(0,rows.length-NMAX));scrollTo(0,0);$('#report').scrollTop=0;fit();toast('A4 brief ready · tap Save as PDF')}
// keep the print to two A4 pages: programs that don't fit on page 1 move to page 2; whatever still doesn't fit is counted, not cut off
function mbFitPages(extra){const [a,b]=$$('#pages .a4.mbA4');if(!a||!b)return;const over=pg=>{const ft=pg.querySelector('.ft'),lim=1122-(pg.offsetHeight-ft.offsetTop)-6;return [...pg.children].some(c=>c!==ft&&c.offsetTop+c.offsetHeight>lim)};
 a.querySelector('.mbn1').textContent='99 more on page 2.';b.querySelector('.mbn2').textContent='Plus 99 more programs, all on the Programs page.';
 const dr=t=>[...t.querySelectorAll('tr')].filter(r=>r.querySelector('td')),t1=a.querySelector('table.mbprog'),t2=b.querySelector('table.mbprog'),moved=[];
 while(over(a)&&dr(t1).length>3){const r=dr(t1).pop();moved.unshift(r);r.remove()}
 const h2=t2.querySelector('tr');moved.forEach(r=>h2.parentNode.appendChild(r));let cut=extra;
 while(over(b)&&dr(t2).length){dr(t2).pop().remove();cut++}
 for(const t of b.querySelectorAll('.mbr2 table')){while(over(b)&&dr(t).length>1)dr(t).pop().remove()}
 const n2=dr(t2).length;a.querySelector('.mbn1').textContent=n2?`${n2} more on page 2.`:cut?`${cut} more on the Programs page.`:'';
 b.querySelector('.mbn2').textContent=cut?`Plus ${cut} more program${cut===1?'':'s'}, all on the Programs page.`:'';if(!n2)b.querySelector('.mbmore').remove()}
// ---------- hooks into programs.js ----------
{const _view=progView;progView=function(){if(S.progSub==='brief'&&evData()&&hubCov())return mbView();return _view.apply(this,arguments)};
 const _list=progList;progList=function(){return _list.apply(this,arguments).replace('<div class="pgfind">',`<div class="pgfind"><button class="hbtn sm" id="mbFromList" title="One page for a department meeting">${hic('sheet',15)}Meeting brief</button>`)};
 const _det=progDetail;progDetail=function(o){return _det.apply(this,arguments).replace('<div class="acts">',`<div class="acts"><button class="hbtn ghost" id="mbFromProg" data-mbid="${esc(o.r.id)}">${hic('sheet',16)}Meeting brief</button>`)};
 const _bind=bindProg;bindProg=function(){_bind.apply(this,arguments);
  const a=$('#mbFromList');if(a)a.onclick=()=>{if(S.pg.br){S.mb={br:S.pg.br,grp:'',id:'',from:''};mbSave();mbGo();toast(`Meeting brief · ${brName(S.pg.br)}`)}else{mbPick();toast('Pick a department for the brief')}};
  const b=$('#mbFromProg');if(b)b.onclick=()=>{const o=(pgRows()||[]).find(z=>z.r.id===b.dataset.mbid);if(!o)return;S.mb={br:o.r.branch,grp:'',id:o.r.id,from:'prog'};mbSave();mbGo();toast(`Meeting brief · ${o.r.name}`)};
  if(S.progSub!=='brief')return;{const ac=$('#app .accard');if(ac)ac.remove()}
  const c=$('#mbChange');if(c)c.onclick=()=>mbPick();const p=$('#mbPrint');if(p)p.onclick=()=>{toast('Building the A4 brief…');setTimeout(mbPrint,30)};
  $$('.mbctl [data-p]').forEach(x=>x.onclick=()=>{if(x.dataset.p==='custom')return rangeSheet();S.preset=x.dataset.p;localStorage.pulsePreset=S.preset;setRange();render();toast(`Brief for ${P.rangeLabel(S.s,S.e)}`)});
  $$('.mbl [data-ecamp]').forEach(x=>x.onclick=()=>emailCampSheet(x.dataset.ecamp));hubThumbs()}}
(function(){const st=document.createElement('style');st.textContent=`
.mbh{margin-top:10px}.mbh h1{font-family:var(--serif);font-weight:400;font-size:clamp(26px,3vw,40px);margin:4px 0}.mbsub2{font-size:14px;color:var(--mut);margin:2px 0 0;line-height:1.45}.mbh .acts{display:flex;gap:8px;flex-wrap:wrap}
.mbctl{margin-top:12px}.mbctl .range,.mbctl .scope{justify-content:flex-start;text-align:left}.mbctl .scope{margin-left:0;max-width:none}
.mbk .card .v{font-family:var(--serif);font-weight:400;font-size:clamp(28px,2.4vw,40px);margin:0 0 4px}.mbk .card .l{font-size:14px;color:var(--txt)}.mbk .card .d{margin-top:4px}
.mbg{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;margin-top:14px}.mbg>.card{min-width:0}.mbtw{overflow-x:auto;max-width:100%}@media(min-width:1000px){.mbg{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start}}
.mbcap{margin:-6px 0 10px;line-height:1.5}
.mbt td.mbq{color:var(--bad)}.mbt td{padding:9px 8px}.mbt th{padding:0 8px 8px}.mbt .up,.mbt .down{font-size:11px;margin-left:4px}
.mbtp{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-top:1px solid var(--line)}.mbtp:first-of-type{border-top:0}
.mbtp .dot{width:10px;height:10px;border-radius:50%;margin-top:6px;flex:none}.mbtp .dot.g{background:var(--good)}.mbtp .dot.r{background:var(--bad)}.mbtp .dot.a{background:var(--warn)}
.mbtp .t{font-size:15px;font-weight:600}.mbtp .m{font-size:13px;color:var(--mut2,var(--mut));margin-top:3px;line-height:1.5}
.mbit{display:grid;grid-template-columns:48px minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--line);font-size:14px}.mbit:first-child{border-top:0}.mbit[data-post],.mbit[data-ecamp]{cursor:pointer}
.mbit .th{width:48px;height:32px;border-radius:7px;overflow:hidden;display:grid;place-items:center;background:rgba(255,255,255,.06)}.mbit .th img{width:100%;height:100%;object-fit:cover;opacity:0}.mbit .th img.in{opacity:1}
.mbit .tt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mbit .tt small{display:block;font-size:11.5px;color:var(--mut)}.mbit b{font-weight:500;text-align:right;white-space:nowrap}.mbit b small{font-weight:400;font-size:11px;color:var(--mut);margin-left:4px}
.mbit .chm{display:none;font-style:normal}.mbit .ch{font-size:10.5px;padding:2px 7px;border-radius:99px;border:1px solid var(--line)}.mbit .ch.so{color:var(--ig)}.mbit .ch.we{color:var(--fb)}.mbit .ch.em{color:#c7b3ff}
.mbev{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;padding:10px 0;border-top:1px solid var(--line);text-align:left;font-size:14px}.mbl>.mbev:first-child{border-top:0}.mbev b{font-weight:500}.mbev small{display:block;color:var(--mut);font-size:12px;margin-top:2px}
.mbev .chip{flex:none;white-space:nowrap}.mbev .chip.ok{color:var(--good);border-color:rgba(158,230,180,.4)}.mbev .chip.no{color:var(--bad);border-color:rgba(255,176,168,.45)}.mbev .chip.q{color:var(--warn);border-color:rgba(243,200,96,.45)}
.mbpk{padding:10px 0;border-top:1px solid var(--line)}.mbpk:first-of-type{border-top:0}.mbsub{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.mbpk>.chip b{font-weight:600}
@media(max-width:699px){.mbt.pgt{display:table;font-size:13px}.mbt td{padding:8px 4px}.mbt th{padding:0 4px 8px;letter-spacing:0;font-size:10px;white-space:normal;vertical-align:bottom}.mbt td.l b{font-size:14px}.mbit .chm{display:inline}.mbt .mbhp{display:none}.mbit{grid-template-columns:40px minmax(0,1fr) auto}.mbit .ch{display:none}.mbit .th{width:40px;height:28px}.mbev{flex-wrap:wrap}.mbev .chip{white-space:normal}.mbh .acts{width:100%}}
.a4.mbA4 .ttl{font-size:28pt;margin:4mm 0 1mm}.a4.mbA4 .st{margin-bottom:5mm}.a4.mbA4 .scope.rscope{margin:-3mm auto 3mm}
.a4.mbA4 .k4 .bv{font-size:20pt}.a4.mbA4 .k4 .pill{font-size:7.6pt}.a4.mbA4 .pill{font-size:8pt}
.a4.mbA4 .mbr,.a4.mbA4 .mbr2{display:grid;grid-template-columns:1.25fr 1fr;gap:3mm;margin-top:3mm;align-items:start}.a4.mbA4 .mbr2{grid-template-columns:1fr 1fr}
.a4.mbA4 table{font-size:7.2pt}.a4.mbA4 td:not(:first-child){white-space:nowrap}.a4.mbA4 table small{font-size:6.2pt}.a4.mbA4 table.mbsp{margin-top:2.5mm}
.a4.mbA4 .lab{margin:2.2mm 0 .8mm}.a4.mbA4 .mbpt{font-size:7.4pt;line-height:1.42}.a4.mbA4 .mbpn{font-size:6.4pt;color:var(--muted);margin:1.6mm 0 0;line-height:1.35}
`;document.head.appendChild(st)})();
