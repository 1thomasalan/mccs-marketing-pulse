// MCCS Pulse v66: content gaps, Team brief, Slide history.
//  - Content gaps: strategic events, Wrike campaigns and Wrike items coming up soon, checked for recent posts, slides and emails.
//    They show in Today > Needs attention and in the Team brief.
//  - Team brief (view 'brief'): Daily standup (next 7 days) or Tuesday meeting (last 7 days + next 21). Ask the team, priorities,
//    last 7 days, fix this week. Copy questions, Save PDF, Full screen for the TV.
//  - Slide history (Signage tab): every slide in the ScreenCloud play log since it started, including ones no longer on screens.
// Loaded after prod.js. Uses app globals only at call time.
const BF={k:'',G:null,mode:localStorage.pulseBriefMode||(new Date().getDay()===2?'tue':'day'),hist:{f:'all',n:20,q:''}};
const BF_BACK=14;
const bfAhead=()=>BF.mode==='tue'?21:7;
const BF_STOP=new Set(['the','and','of','a','an','at','in','on','for','to','with','mccs','okinawa','camp','annual','event','events','day','night','our','your','you','new','2025','2026','2027','2028','is','by','from','all','more','fun','free']);
const bfWords=s=>[...new Set(P.sNorm(String(s||''),1).split(' ').filter(w=>w.length>=3&&!BF_STOP.has(w)&&!/^\d+$/.test(w)))];
// how many of the words must appear: all of 1-2, two-thirds of more
const bfNeed=w=>w.length<=2?w.length:Math.ceil(w.length*.66);
const bfHit=(t,w,need)=>{let n=0;for(const x of w)if(t.includes(' '+x+' '))n++;return n>=need};
const bfLoad=()=>{try{return JSON.parse(localStorage.pulseBriefHide||'{}')}catch(e){return {}}};
const bfDoneAll=()=>{try{return JSON.parse(localStorage.pulseBriefDone||'{}')}catch(e){return {}}};
// the latest day each source covers; 'recent' is the last 14 days of what that source has
function bfEnds(){const t=P.todayKey();let pe='';for(const r of gsPosts())if(r.d>pe)pe=r.d;const em=emCamps()[0];
  const pEnd=pe&&pe<t?pe:t,eEnd=em&&em.date?(em.date<t?em.date:t):'';return {t,pe,pEnd,eEnd,hasEm:!!eEnd,pFrom:P.addDays(pEnd,-(BF_BACK-1)),eFrom:eEnd?P.addDays(eEnd,-29):'9',sFrom:P.addDays(t,-(BF_BACK-1))}}
// content found for a set of words: posts (recent + last ever), slides playing now or recently, emails in the last 30 days of email data
function bfFind(w,E,posts){const need=bfNeed(w);const o={so:0,last:'',sg:0,sgNow:0,em:0};if(!w.length)return o;
  for(const r of posts){const n=P.postNorm(r).t;if(!bfHit(n,w,need))continue;if(r.d>=E.pFrom)o.so++;if(r.d>o.last)o.last=r.d}
  for(const it of sgAll()){if(!it.now&&!(it.last>=E.sFrom))continue;const t=P.slideNorm(it.name)+P.slideOcr(it);if(!bfHit(t,w,need))continue;o.sg++;if(it.now)o.sgNow++}
  for(const c of emCamps()){if(!c.date||c.date<E.eFrom)continue;const t=' '+P.sNorm([c.name,c.subject||'',...Object.values(c.titles||{})].join(' '),1)+' ';if(bfHit(t,w,need))o.em++}
  return o}
// one list of everything coming up, with what is out for each
function bfGaps(){const E=bfEnds(),M=evM(),PM=typeof prodM==='function'?prodM():null,ahead=21,lim=P.addDays(E.t,ahead);
  const k=[E.t,E.pe,SGA.k,emCamps().length,(evData()||{}).updated,M?M.byItem.size:0,PM?PM.rows.length:0].join('~');if(BF.k===k&&BF.G)return BF.G;
  const posts=gsPosts().filter(r=>r.d>=P.addDays(E.pEnd,-120)),byId=evById(),out=[];
  // strategic events: what the event matcher linked to them
  for(const e of evList()){if(!e.s||e.s<E.t||e.s>lim||/cancel/i.test(e.status||''))continue;const L=(M&&M.byEvent.get(e.id))||[];const o={so:0,last:'',sg:0,sgNow:0,em:0};
    for(const x of L){const id=x.key.slice(3);if(x.ch==='so'){const r=byId.get(id);if(r){if(r.d>=E.pFrom)o.so++;if(r.d>o.last)o.last=r.d}}
      else if(x.ch==='sg'){const it=sgAll().find(i=>i.name===id);if(it&&(it.now||it.last>=E.sFrom)){o.sg++;if(it.now)o.sgNow++}}
      else if(x.ch==='em'){const c=emCamps().find(c=>c.id===id);if(c&&c.date>=E.eFrom)o.em++}}
    const st=PM&&PM.st.find(s=>s.e.id===e.id);out.push({id:'ev:'+e.id,kind:'strategic',name:evShort(e),d:e.s,e,nav:'event:'+e.id,wrike:st?st.k:'',n:(PM&&PM.byEv.get(e.id)||[]).length,...o})}
  // Wrike: campaign umbrellas (e.g. Home for the Holidays) and each item not already tied to a strategic event
  if(PM){const camps=new Map();
    for(const r of PM.rows){if(!r.d||r.d<E.t||r.d>lim||r._ev)continue;if(r.camp){const c=camps.get(r.camp)||camps.set(r.camp,{rows:[]}).get(r.camp);c.rows.push(r)}
      const w=bfWords(r.nm);out.push({id:'wr:'+r.d+'|'+r.t,kind:'wrike',name:r.nm,d:r.d,r,camp:r.camp||'',nav:'prod',wrike:'ok',...bfFind(w,E,posts)})}
    for(const [nm,c] of camps){const all=PM.rows.filter(r=>r.camp===nm&&r.d),first=all.map(r=>r.d).sort()[0];if(first<E.t&&P.daysBetween(first,E.t)>3)continue;
      out.push({id:'cp:'+nm,kind:'campaign',name:nm,d:first,n:all.length,last_:all.map(r=>r.d).sort().pop(),nav:'prod',wrike:'ok',...bfFind(bfWords(nm),E,posts)})}}
  const hide=bfLoad();
  for(const g of out){g.to=P.daysBetween(E.t,g.d)-1;if(g.to<0)g.to=0;const ch=(g.so?1:0)+(g.sg?1:0)+(g.em?1:0);g.ch=ch;
    g.lvl=ch===0?'r':(g.kind==='strategic'&&g.wrike==='gap')||ch===1&&g.kind!=='wrike'?'a':'g';if(g.kind==='strategic'&&g.wrike==='gap'&&g.lvl==='g')g.lvl='a';g.hidden=!!hide[g.id]}
  const rank={r:0,a:1,g:2},kr={strategic:0,campaign:1,wrike:2};out.sort((a,b)=>rank[a.lvl]-rank[b.lvl]||kr[a.kind]-kr[b.kind]||(a.d<b.d?-1:a.d>b.d?1:0));
  BF.G={rows:out,E};BF.k=k;return BF.G}
const bfWhen=g=>`${hd(g.d,{weekday:'short',month:'short',day:'numeric'})}${g.kind==='campaign'&&g.last_&&g.last_!==g.d?' – '+hd(g.last_):''}`;
const bfAway=g=>g.to===0?'today':g.to===1?'tomorrow':g.to+' days away';
const bfHave=g=>[g.so?`${g.so} post${g.so>1?'s':''}`:'no posts',g.sgNow?`${g.sgNow} slide${g.sgNow>1?'s':''} playing`:g.sg?'slide played recently':'no slide',g.em?`${g.em} email${g.em>1?'s':''}`:S.email.length?'no email':''].filter(Boolean).join(', ');
const bfWhat=g=>g.kind==='strategic'?(g.wrike==='ok'?`Strategic event · in Wrike${g.n?' ('+g.n+')':''}`:g.wrike==='gap'?'Strategic event · no Wrike project yet':g.wrike==='other'?'Strategic event · run by another service':'Strategic event'):g.kind==='campaign'?`Campaign · ${g.n} Wrike item${g.n>1?'s':''}`:`In Wrike${g.r&&(g.r.prog||g.r.div)?' · '+(g.r.prog||g.r.div):''}${g.camp?' · '+g.camp:''}`;
function bfQuestion(g){const nm=`${g.name} (${hd(g.d)})`;
  if(g.kind==='strategic'&&g.wrike==='gap'&&g.ch===0)return `${nm}: strategic event with no Wrike project and nothing out yet. Has anyone requested it?`;
  if(g.kind==='strategic'&&g.wrike==='gap')return `${nm}: strategic event with no Wrike project. Has anyone requested it?`;
  if(g.lvl==='r')return `${nm}: ${g.kind==='campaign'?g.n+' items scheduled, but nothing out under the campaign name':g.wrike==='ok'?'in Wrike, but no posts, slide or email yet':'no posts, slide or email yet'}${g.last?` (last post ${hd(g.last)})`:''}. Who owns it, and when does it go out?`;
  const has=[g.so?`${g.so} post${g.so>1?'s':''}`:'',g.sgNow?`${g.sgNow} slide${g.sgNow>1?'s':''} playing`:g.sg?'a slide recently':'',g.em?`${g.em} email${g.em>1?'s':''}`:''].filter(Boolean),miss=[g.so?'':'posts',g.sg?'':'a slide',g.em||!S.email.length?'':'an email'].filter(Boolean);
  return `${nm}: ${has.join(' and ')||'little out'}${miss.length?', but no '+miss.join(' or '):''}. Is more planned before ${hd(g.d)}?`}
// things to fix: slides still playing for events that ended, screens offline 3+ days, stale data, matches to review
function bfFix(){const out=[],t=P.todayKey(),d=SG.data;
  if(d&&d.items&&evM()){const ended=new Map();for(const it of d.items){const L=evOf('sg:'+it.name).map(x=>evGet(x.ev)).filter(Boolean);if(!L.length||L.some(e=>(e.e||e.s)>=P.addDays(t,-1)))continue;const e=L.sort((a,b)=>(a.e||a.s)<(b.e||b.s)?1:-1)[0];(ended.get(e.id)||ended.set(e.id,{e,n:[]}).get(e.id)).n.push(it.name)}
    for(const {e,n} of ended.values())out.push({id:'end:'+e.id,lvl:'r',t:`${n.length} slide${n.length>1?'s':''} still playing for ${evShort(e)}`,s:`Event ended ${hd(e.e||e.s)} · ${n.slice(0,2).map(sgName).join(', ')}${n.length>2?' +'+(n.length-2):''}`,q:`${n.length} slide${n.length>1?'s are':' is'} still playing for ${evShort(e)}, which ended ${hd(e.e||e.s)}. Who's pulling ${n.length>1?'them':'it'}?`,nav:'signage'})}
  if(d&&d.groups){const old=[];for(const g of d.groups)for(const s of g.off||[])if(s.since&&Date.now()-new Date(s.since)>3*864e5)old.push(g.name);
    if(old.length){const u=[...new Set(old)];out.push({id:'off',lvl:'a',t:`${old.length} screen${old.length>1?'s':''} offline 3+ days`,s:u.slice(0,3).join(', ')+(u.length>3?' +'+(u.length-3):''),q:`${old.length} screen${old.length>1?'s have':' has'} been offline 3+ days (${u.slice(0,3).join(', ')}). Who's checking?`,nav:'signage'})}}
  if(typeof sgStale==='function'&&sgStale(d))out.push({id:'sgst',lvl:'a',t:'Signage numbers are out of date',s:`Last updated ${sgTime(d.checked)} JST`,nav:'signage'});
  const due=typeof dataStatus==='function'?dataStatus().filter(x=>!x.planned&&(x.stt[0]==='old'||x.stt[0]==='due')):[];if(due.length)out.push({id:'data',lvl:'a',t:`${due.map(x=>x.short).join(', ')} ${due.length>1?'need':'needs'} an update`,s:'Gaps for these sources may be out of date until the next export',nav:'settings:data'});
  const M=evM();if(M&&M.review.length)out.push({id:'rev',lvl:'',t:`${M.review.length} match${M.review.length>1?'es':''} to review`,s:'Posts, pages and slides that might belong to an event',nav:'review'});
  return out}
// ---------- Today › Needs attention: the top gaps, plus a way into the brief ----------
function bfAttn(){if(!evData())return [];const G=bfGaps(),near=7;const L=G.rows.filter(g=>!g.hidden&&(g.lvl==='r'&&(g.kind!=='wrike'||g.to<=near)||g.lvl==='a'&&g.kind==='strategic'));
  let wr=0;const L2=L.filter(g=>g.kind!=='wrike'||wr++<1);return L2.slice(0,3).map(g=>({t:`${esc(g.name)}, ${hd(g.d)}: ${g.lvl==='r'?'nothing out yet':g.wrike==='gap'&&g.ch>1?'no Wrike project':g.so?'no slide yet':'no posts yet'}`,s:`${esc(bfWhat(g))} · ${bfAway(g)} · ${bfHave(g)}${G.E.pe&&G.E.pe<G.E.t?` (posts through ${hd(G.E.pe)})`:''}`,lvl:g.lvl,nav:g.nav}))}
{const _a=hubAttention;hubAttention=function(B){let h=_a.apply(this,arguments);let L=[];try{L=bfAttn()}catch(e){console.warn('content gaps',e)}if(!L.length)return h;
  const rows=L.map(x=>`<button data-nav="${x.nav}"><span class="ic ${x.lvl==='r'?'down':'warn'}">${hic('flag')}</span><div><div class="t">${x.t}</div><div class="s">${x.s}</div></div><span class="go">${x.nav==='prod'?'Wrike':'Event'} ›</span></button>`).join('');
  if(/All clear\. Nothing needs a look/.test(h))h='';
  // keep Needs attention short: gaps first, then the rest, at most 6
  const evs=new Set(L.map(x=>x.nav)),parts=h.split(/(?=<button data-nav=)/).filter(Boolean).filter(p=>!evs.has((p.match(/data-nav="([^"]+)"/)||[])[1])),n=Math.max(0,6-L.length);setTimeout(()=>{const c=$('#attN');if(c)c.textContent=L.length+Math.min(n,parts.length)},0);
  return rows+parts.slice(0,n).join('')}
 const _t=hubToday;hubToday=function(){const h=_t.apply(this,arguments);return h.replace('<h2>Needs attention <small id="attN"></small></h2>','<h2 class="bfh">Needs attention <small id="attN"></small><button class="hbtn sm ghost bfopen" data-nav="brief">Team brief ›</button></h2>')}}
// ---------- Team brief view ----------
function bfView(){const tue=BF.mode==='tue',ahead=bfAhead(),t=P.todayKey(),lim=P.addDays(t,ahead);
  const head=`<div class="bfhead"><div><h1>Team brief · ${hd(t,{weekday:'long',month:'short',day:'numeric',year:'numeric'})}</h1><p class="mut">${tue?'For the Tuesday digital meeting. Looks back 7 days and ahead 21 days.':'For the morning standup. What is coming in the next 7 days and what needs fixing.'}</p></div>
   <div class="bfctl"><div class="range presets bfmode"><button data-bfm="day" class="${tue?'':'on'}">Daily standup</button><button data-bfm="tue" class="${tue?'on':''}">Tuesday meeting</button></div>
   <div class="bfacts"><button class="hbtn sm ghost" id="bfTv">${hic('screen',15)}Full screen</button><button class="hbtn sm ghost" id="bfPdf">${hic('doc',15)}Save PDF</button><button class="hbtn sm" id="bfCopy">${hic('check',15)}Copy questions</button></div></div></div>`;
  if(!evData())return head+`<div class="card"><p class="mut" style="margin:0">The brief needs the Strategic Events list. It arrives with the next encrypted publish.</p></div>`;
  const G=bfGaps(),E=G.E,done=(bfDoneAll()[t])||{};const rows=G.rows.filter(g=>!g.hidden&&g.d<=lim);
  const sc=scopeLine([`Posts through ${hd(E.pe||t,{year:'numeric'})}`,E.pe&&P.daysBetween(E.pe,t)>8?{t:`social is ${P.daysBetween(E.pe,t)-1} days old, so new posts may be missing`,w:1}:'',E.hasEm?`emails through ${hd(E.eEnd)}`:{t:'no email data on this device',w:1},SG.data?`signage live (checked ${sgTime(SG.data.checked)} JST)`:'signage not loaded',`events: Strategic list${prodData()?' + Wrike export':''}`,`"recent" = last ${BF_BACK} days of posts and slides, 30 days of email`]);
  // questions: red and amber gaps (strategic and campaigns first; Wrike items only inside 7 days in daily mode), then fixes
  const fix=bfFix(),gq=rows.filter(g=>g.lvl!=='g'&&(g.kind!=='wrike'||g.lvl==='r'&&(tue||g.to<=7))),max=tue?12:3;
  const Q=[...gq.map(g=>({id:g.id,q:bfQuestion(g),nav:g.nav,lvl:g.lvl,url:g.r&&g.r.url||''})),...fix.filter(f=>f.q).map(f=>({id:f.id,q:f.q,nav:f.nav,lvl:f.lvl}))].slice(0,max);
  BF.Q=Q;const qmore=gq.length+fix.filter(f=>f.q).length-Q.length;
  const qh=Q.length?`<ol class="bfq">${Q.map(x=>`<li class="${done[x.id]?'done':''}" data-q="${esc(x.id)}"><button class="bftick" data-bftick="${esc(x.id)}" aria-label="${done[x.id]?'Mark not asked':'Mark asked'}" aria-pressed="${done[x.id]?'true':'false'}">${hic('check',14)}</button><span>${esc(x.q)}</span><span class="bfqa">${x.url?`<a class="bfgo" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" title="Opens this task in Wrike in a new tab">Wrike ↗</a>`:`<button class="bfgo" data-nav="${esc(x.nav)}">Open ›</button>`}${/^(ev|cp|wr):/.test(x.id)?`<button class="bfno" data-bfhide="${esc(x.id)}">Not needed</button>`:''}</span></li>`).join('')}</ol>${qmore>0?`<p class="mut sm">${qmore} more in the list below.</p>`:''}`:'<p class="mut" style="margin:4px 0">Nothing to ask. Everything coming up has content out.</p>';
  const chip=(n,txt,no)=>`<span class="pchip ${n?'up':no?'down':'mut'}">${txt}</span>`;
  const pr=rows.filter(g=>g.kind!=='wrike'||tue||g.lvl!=='g').slice(0,tue?40:15);
  const prh=pr.length?`<div class="scroll"><table class="bft"><thead><tr><th>Date</th><th>What</th><th>Posts</th><th>Slides</th><th>Email</th><th>Status</th></tr></thead><tbody>${pr.map(g=>`<tr data-nav="${esc(g.nav)}" tabindex="0"><td>${bfWhen(g)}<small>${bfAway(g)}</small></td><td><b>${esc(g.name)}</b>${g.e&&typeof priChip==='function'?priChip(g.e):''}<small>${esc(bfWhat(g))}</small>${g.r&&g.r.url?wkLink(g.r):''}</td><td>${g.so||'–'}${g.last&&!g.so?`<small>last ${hd(g.last)}</small>`:''}</td><td>${g.sgNow?g.sgNow+' now':g.sg?'recent':'–'}</td><td>${g.em||'–'}</td><td>${g.lvl==='r'?chip(0,'Nothing out',1):g.lvl==='a'?`<span class="pchip warn">${g.wrike==='gap'?'Not in Wrike':'Thin'}</span>`:chip(1,'On air')}</td></tr>`).join('')}</tbody></table></div>`:`<p class="mut">Nothing on the Strategic list or in Wrike in the next ${ahead} days.</p>`;
  // last 7 days (Tuesday): posts and views from the social data's last 7 days, slide plays, emails, screens
  let last='';if(tue){const pe=E.pEnd,ps=gsPosts().filter(r=>r.d>P.addDays(pe,-7)&&r.d<=pe),v=ps.reduce((a,r)=>a+(r.v||0),0),top=ps.slice().sort((a,b)=>b.v-a.v)[0];
    const pr7=typeof spRange==='function'?spRange(P.addDays(t,-7),P.addDays(t,-1)):null,em7=E.hasEm?emCamps().filter(c=>c.date>P.addDays(E.eEnd,-7)&&c.date<=E.eEnd):[];const d=SG.data;
    last=`<div class="card"><h2>Last 7 days</h2><div class="bfk"><div><b>${hk(v)}</b><span>social views · ${hd(P.addDays(pe,-6))} – ${hd(pe)}</span></div><div><b>${nf(ps.length)}</b><span>posts published</span></div><div><b>${pr7&&pr7.t?hk(pr7.t):'—'}</b><span>slide plays (starts, not people)</span></div><div><b>${d?`${d.live}<small> / ${d.total}</small>`:'—'}</b><span>screens online now</span></div><div><b>${E.hasEm?nf(em7.length):'—'}</b><span>email${em7.length===1?'':'s'} sent${E.hasEm?' · to '+hd(E.eEnd):''}</span></div></div>${top?`<p class="mut sm" style="margin:10px 0 0">Top post: ${esc(P.label(top))} · ${hk(top.v)} views · ${hd(top.d)}</p>`:''}</div>`}
  const fh=fix.length?fix.map(f=>`<button class="bffix" data-nav="${esc(f.nav)}"><span class="dot ${f.lvl||'n'}"></span><span><b>${esc(f.t)}</b><small>${esc(f.s)}</small></span></button>`).join(''):'<p class="mut" style="margin:4px 0">Nothing broken.</p>';
  return `<div class="bf">${head}${sc}<div class="bfgrid"><div><div class="card"><h2>Ask the team <small>${Q.length} question${Q.length===1?'':'s'}</small></h2>${qh}</div>
    <div class="card"><h2>Coming up · next ${ahead} days <small>${pr.length} item${pr.length===1?'':'s'}</small></h2>${prh}</div></div>
    <div>${last}<div class="card"><h2>Fix ${tue?'this week':'today'}</h2>${fh}</div>
    <div class="card bfhow"><h2>How the brief decides</h2><p class="mut sm">It lists strategic events, Wrike campaigns and Wrike items in the next ${ahead} days. Posts, slides and emails count when they name the event (its name, other names, hashtags or connections) or most of the words in the Wrike item's name. Red means nothing found, amber means only one channel or no Wrike project. "Not needed" hides an item on this device.</p>${Object.keys(bfLoad()).length?`<button class="hbtn sm ghost" id="bfUnhide">Show ${Object.keys(bfLoad()).length} hidden</button>`:''}</div></div></div></div>`}
function bindBrief(){$$('[data-bfm]').forEach(b=>b.onclick=()=>{BF.mode=b.dataset.bfm;localStorage.pulseBriefMode=BF.mode;render()});
  $$('[data-bftick]').forEach(b=>b.onclick=e=>{e.stopPropagation();const id=b.dataset.bftick,t=P.todayKey(),A=bfDoneAll();A[t]=A[t]||{};const on=!A[t][id];if(on)A[t][id]=1;else delete A[t][id];
    for(const k of Object.keys(A))if(k<P.addDays(t,-14))delete A[k];localStorage.pulseBriefDone=JSON.stringify(A);const li=b.closest('li');li.classList.toggle('done',on);b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',on?'Mark not asked':'Mark asked');toast(on?'Done · marked as asked':'Marked as not asked',{type:'ok'})});
  $$('[data-bfhide]').forEach(b=>b.onclick=e=>{e.stopPropagation();const id=b.dataset.bfhide,H=bfLoad();H[id]=P.todayKey();localStorage.pulseBriefHide=JSON.stringify(H);BF.k='';const li=b.closest('li');li.style.opacity='.35';
    setTimeout(render,250);toast('Hidden from the brief on this device',{type:'ok',undo:()=>{const H2=bfLoad();delete H2[id];localStorage.pulseBriefHide=JSON.stringify(H2);BF.k='';render()}})});
  const u=$('#bfUnhide');if(u)u.onclick=()=>{const H=bfLoad();localStorage.pulseBriefHide='{}';BF.k='';render();toast(`Done · ${Object.keys(H).length} item${Object.keys(H).length>1?'s':''} back in the brief`,{type:'ok',undo:()=>{localStorage.pulseBriefHide=JSON.stringify(H);BF.k='';render()}})};
  $$('.bf [data-nav]').forEach(b=>{b.onclick=e=>{if(e.target.closest('[data-bftick],[data-bfhide],a[href]'))return;hubNav(b.dataset.nav)};if(b.tagName==='TR')b.onkeydown=e=>{if(e.key==='Enter')hubNav(b.dataset.nav)}});
  $('#bfCopy').onclick=async()=>{const t=P.todayKey(),Q=BF.Q||[];const txt=`MCCS Digital Pulse · Team brief · ${hd(t,{weekday:'long',month:'short',day:'numeric',year:'numeric'})}\n${BF.mode==='tue'?'Tuesday meeting':'Daily standup'}\n\nAsk the team:\n${Q.map((x,i)=>`${i+1}. ${x.q}`).join('\n')||'Nothing to ask.'}\n\nFrom ${location.origin+location.pathname}`;
    try{await navigator.clipboard.writeText(txt);toast(`Copied · ${Q.length} question${Q.length===1?'':'s'}`,{type:'ok'})}catch(e){toast("Couldn't copy. Select the questions and copy them instead.",{type:'err'})}};
  $('#bfPdf').onclick=()=>{document.body.classList.add('bfprint');toast('Opening print. Choose Save as PDF.',{type:'info'});setTimeout(()=>{window.print();setTimeout(()=>document.body.classList.remove('bfprint'),500)},150)};
  $('#bfTv').onclick=()=>{const on=!document.body.classList.contains('bftv');document.body.classList.toggle('bftv',on);const b=$('#bfTv');b.lastChild.textContent=on?'Exit full screen':'Full screen';
    try{if(on&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});else if(!on&&document.fullscreenElement)document.exitFullscreen()}catch(e){}}}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('bftv')){document.body.classList.remove('bftv');const b=$('#bfTv');if(b)b.lastChild.textContent='Full screen'}});
{const _n=hubNav;hubNav=function(t){if(t==='brief'){if(typeof gsClose==='function')gsClose(true);if($('#sheet').classList.contains('show'))closeSheet();S.view='brief';render();scrollTo(0,0);return}if(document.body.classList.contains('bftv')){document.body.classList.remove('bftv');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}return _n.apply(this,arguments)};
 const _r=render;render=function(){if(S.view==='brief'&&!TV.on&&!(S.locked&&SYNC.meta)&&S.posts.length){const app=$('#app');$('#dock').style.display='flex';app.innerHTML=topbar()+bfView();bindTop();bindBrief();hubDock();return}return _r.apply(this,arguments)}}
// ---------- Signage › Slide history ----------
function bfHistory(){const all=sgAll();if(!SPL.data||!all.length)return '';const D=SPL.data,from=D.from,thru=D.through,H=BF.hist,t=P.todayKey();
  const tot=P.daysBetween(from,thru)||1,pos=k=>Math.max(0,Math.min(100,(P.daysBetween(from,k<thru?k:thru)-1)/tot*100));
  const endEv=n=>{if(typeof evOf!=='function')return null;const L=evOf('sg:'+n).map(x=>evGet(x.ev)).filter(Boolean);return L.length?L.sort((a,b)=>(a.e||a.s)<(b.e||b.s)?1:-1)[0]:null};
  let L=all.filter(i=>i.p||i.now);const nNow=L.filter(i=>i.now).length,nEnd=L.length-nNow;
  if(H.f==='now')L=L.filter(i=>i.now);else if(H.f==='ended')L=L.filter(i=>!i.now);
  if(H.q){const w=bfWords(H.q);if(w.length)L=L.filter(i=>bfHit(P.slideNorm(i.name)+P.slideOcr(i),w,w.length))}
  L.sort((a,b)=>(a.now?t:a.last)<(b.now?t:b.last)?1:(a.now?t:a.last)>(b.now?t:b.last)?-1:b.p-a.p);
  const row=i=>{const e=endEv(i.name),late=i.now&&e&&(e.e||e.s)<P.addDays(t,-1),a=pos(i.first||t),b=pos(i.now?thru:i.last);
    return `<div class="sprow bfhr" role="button" tabindex="0" data-slideh="${esc(i.name)}"><div class="spth">${i.t?`<img data-sg="${i.t}" alt="">`:''}</div><div class="spn"><b title="${esc(i.name)}">${esc(sgName(i.name))}</b>
     <span>${i.first?`${hd(i.first)} – ${i.now?'now':hd(i.last,{year:'numeric'})}`:'In rotation now'}${i.days?` · ${i.days} day${i.days>1?'s':''} on air`:''}${i.sc?` · up to ${i.sc} screen${i.sc>1?'s':''}`:''}</span>
     <div class="bfbar"><i style="left:${a}%;width:${Math.max(1.5,b-a)}%"></i></div>
     <div class="bfchips"><span class="pchip ${i.now?'up':'mut'}">${i.now?'Playing now':'Ended '+hd(i.last)}</span>${late?`<span class="pchip warn">Event ended ${hd(e.e||e.s)}</span>`:''}${e&&!late?`<span class="pchip mut">${esc(evShort(e))}</span>`:''}</div></div><em>${i.p?hk(i.p):'–'}<small>plays</small></em></div>`};
  return `<section class="spsec bfhist"><div class="sphead"><h2>Slide history<small>Every slide in the play log, ${hd(from,{year:'numeric'})} to ${hd(thru,{year:'numeric'})}, including ones no longer on screens</small></h2></div>
   ${scopeLine(['ScreenCloud play logs','plays = slide starts on a screen, not people',`${nf(nNow+nEnd)} slides · ${nf(nNow)} playing now · ${nf(nEnd)} ended`,`bar = when it played, ${hd(from)} to ${hd(thru)}`])}
   <div class="card"><div class="bfhctl"><div class="range presets"><button data-bfh="all" class="${H.f==='all'?'on':''}">All</button><button data-bfh="now" class="${H.f==='now'?'on':''}">Playing now</button><button data-bfh="ended" class="${H.f==='ended'?'on':''}">Ended</button></div><input id="bfhq" type="search" placeholder="Find a slide" value="${esc(H.q)}" aria-label="Find a slide"></div>
   ${L.length?L.slice(0,H.n).map(row).join(''):'<p class="mut" style="margin:8px 0">No slides match.</p>'}${L.length>H.n?`<button class="hbtn sm ghost" id="bfhMore" style="margin-top:10px">Show ${Math.min(20,L.length-H.n)} more of ${L.length-H.n}</button>`:''}
   <p class="mut sm spfn">Tap a slide for plays by day and location across all the days it played. Date added to ScreenCloud is not in the data yet, so the first play stands in for it.</p></div></section>`}
function bindHistory(){$$('[data-bfh]').forEach(b=>b.onclick=()=>{BF.hist.f=b.dataset.bfh;BF.hist.n=20;bfHistRe()});
  const q=$('#bfhq');if(q)q.oninput=()=>{BF.hist.q=q.value;BF.hist.n=20;clearTimeout(q._t);q._t=setTimeout(()=>{bfHistRe();const q2=$('#bfhq');if(q2){q2.focus();q2.setSelectionRange(q2.value.length,q2.value.length)}},250)};
  const m=$('#bfhMore');if(m)m.onclick=()=>{BF.hist.n+=20;bfHistRe()};
  $$('[data-slideh]').forEach(el=>{const go=()=>{const i=sgAll().find(x=>x.name===el.dataset.slideh);spSlideSheet(el.dataset.slideh,i&&i.first,i&&(i.now?P.todayKey():i.last))};el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter')go()}});
  if(typeof sgFill==='function')sgFill($('.bfhist'))}
function bfHistRe(){const s=$('.bfhist');if(!s)return;const w=document.createElement('div');w.innerHTML=bfHistory();s.replaceWith(w.firstElementChild);bindHistory()}
{const _s=spSection;spSection=function(){const h=_s.apply(this,arguments);let x='';try{x=bfHistory()}catch(e){console.warn('slide history',e)}return h+x};
 const _b=bindSpSection;bindSpSection=function(){_b.apply(this,arguments);setTimeout(bindHistory,0)}}
(function(){const st=document.createElement('style');st.textContent=`
.bfh{display:flex;align-items:center;gap:8px}.bfh .bfopen{margin-left:auto;padding:5px 12px;font-size:12.5px}
.bf .bfhead{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:14px;margin:8px 2px 6px}.bf h1{font-family:var(--serif);font-weight:400;font-size:clamp(24px,3.4vw,38px);margin:0 0 4px}.bf .bfhead p{margin:0}
.bfctl{display:flex;flex-direction:column;align-items:flex-end;gap:8px}.bfmode{margin:0}.bfacts{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.bfacts .hbtn{padding:7px 13px;font-size:13px}
.bfgrid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:10px}.bfgrid>div>.card{margin:0 0 14px}
@media(min-width:1100px){.bfgrid{grid-template-columns:1.35fr 1fr}}
.bfq{margin:8px 0 0;padding:0;list-style:none;counter-reset:q}.bfq li{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--line);font-size:15px;line-height:1.45}.bfq li:first-child{border-top:0}
.bfq li>span:nth-child(2){flex:1}.bfq li.done>span:nth-child(2){opacity:.5;text-decoration:line-through}
.bftick{flex:none;width:28px;height:28px;border-radius:50%;border:1.5px solid var(--line);background:transparent;color:transparent;display:grid;place-items:center;cursor:pointer;margin-top:-2px}
.bftick svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.4}.bfq li.done .bftick{background:#5fd39a;border-color:#5fd39a;color:#0e1420}
.bfqa{display:flex;flex-direction:column;gap:4px;flex:none}.bfqa button{background:none;border:0;color:var(--mut);font-size:12.5px;cursor:pointer;padding:2px 4px;text-align:right}.bfqa .bfgo{color:var(--glow);text-decoration:none;font-size:12.5px;text-align:right}.bft .wlink{margin-top:5px}
.bft{width:100%;border-collapse:collapse;font-size:13.5px}.bf .bft td,.bf .bft th{text-align:left!important}.bft td:first-child{white-space:nowrap}.bft th{text-align:left;font-weight:500;color:var(--mut);font-size:12px;padding:6px}.bft td{padding:9px 6px;border-top:1px solid var(--line);vertical-align:top}
.bft td small{display:block;color:var(--mut);font-size:11.5px;margin-top:2px}.bft tr[data-nav]{cursor:pointer}.bft tr[data-nav]:hover td{background:rgba(255,255,255,.04)}
.pchip.warn{color:#ffd27a;background:rgba(255,210,122,.14)}
.bfk{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.bfk>div{border:1px solid var(--line);border-radius:14px;padding:10px 12px}.bfk b{display:block;font-family:var(--serif);font-weight:400;font-size:26px}.bfk span{font-size:12px;color:var(--mut)}
.bffix{display:flex;gap:10px;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--line);color:var(--txt);padding:10px 0;cursor:pointer;font:inherit}.bffix:first-of-type{border-top:0}
.bffix b{display:block;font-size:14px}.bffix small{display:block;color:var(--mut);font-size:12.5px;margin-top:2px}
.bf .dot{width:10px;height:10px;border-radius:50%;flex:none;margin-top:5px;background:var(--mut)}.bf .dot.r{background:#ff8a80}.bf .dot.a{background:#ffd27a}
.bfhist .card{padding-top:12px}.bfhctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:6px}.bfhctl .range{margin:0}
.bfhctl input{flex:1 1 160px;max-width:260px;background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:999px;padding:8px 13px;color:var(--txt);font:inherit;font-size:14px}
.bfbar{position:relative;height:5px;border-radius:3px;background:rgba(255,255,255,.1);margin:6px 0 4px}.bfbar i{position:absolute;top:0;bottom:0;border-radius:3px;background:var(--glow)}
.bfchips{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}.bfchips .pchip{font-size:11px;padding:2px 8px}.bfhr em small{display:block;font-size:10.5px;color:var(--mut);font-style:normal}
body.bftv .top,body.bftv #dock,body.bftv .bfctl .bfacts .hbtn:not(#bfTv),body.bftv .bfhow{display:none!important}
body.bftv .bf{font-size:1.15em}body.bftv .bfq li{font-size:20px}body.bftv .bf h1{font-size:44px}body.bftv .bft{font-size:16px}body.bftv #app{max-width:none;padding:24px 40px}
@media print{body.bfprint{background:#fff!important;color:#111!important}body.bfprint .top,body.bfprint #dock,body.bfprint .bfctl,body.bfprint .bfqa,body.bfprint .bftick,body.bfprint .bfhow,body.bfprint #toast{display:none!important}
 body.bfprint .card{background:#fff!important;border:1px solid #ccc!important;box-shadow:none!important;backdrop-filter:none!important;break-inside:avoid;color:#111}body.bfprint *{color:#111!important}body.bfprint .scope{color:#444!important}
 body.bfprint .bfgrid{grid-template-columns:1fr!important}body.bfprint .pchip{border:1px solid #999}}
`;document.head.appendChild(st)})();
