// MCCS Pulse v38 "Connections": tie every post, web page, newsletter and slide to any mix of programs, events, accounts,
// web pages, newsletters and slides; share every answer with the whole team; teach Pulse with rules.
// Loaded after programs.js; uses app + hub globals (S, P, SG, $, $$, esc, nf, hk, hd, hic, evM, evGet, evList, evData, emCamps, gsPosts, pgTitle, sgName, ...).
// Maths live in core.js (P.connApply, P.connRuleHit, P.connRuleGuess), node-testable.
// Sharing: a Google Apps Script web app on the Strategic Events sheet (Connections + Rules tabs). Its URL + team key come from the
// ENCRYPTED events payload (S.ev.sync = {url, key}) or are pasted in Settings > Data & sync and kept on this device only.
// Nothing about the endpoint, names or answers is in this public file.
const CNI={plus:'<path d="M12 5v14M5 12h14"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',hash:'<path d="M5 9h15M4 15h15M10 4L8 20M16 4l-2 16"/>',quote:'<path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"/>',
 path:'<path d="M4 17l6-10 4 6 2-3 4 7z"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',nl:'<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 8v4l3 2"/>',
 play:'<path d="M8 5l11 7-11 7z" fill="currentColor"/>',grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',cloud:'<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/>',off:'<path d="M3 3l18 18"/><path d="M8.5 8.6A5 5 0 0 0 7 18h10.5M19.6 16.9A4 4 0 0 0 18 10a6 6 0 0 0-8-4.3"/>',
 alert:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'};
const cic=(n,s)=>CNI[n]?`<svg class="hi" viewBox="0 0 24 24" aria-hidden="true"${s?` style="width:${s}px;height:${s}px"`:''}>${CNI[n]}</svg>`:hic(n,s);
// target types: label, plural group, icon, chip color class
const CNT={program:{l:'Program',g:'Program',i:'grid',c:'prog'},event:{l:'Event',g:'Event',i:'flag',c:'event'},fb_account:{l:'FB account',g:'Accounts',i:'social',c:'acct'},ig_account:{l:'IG account',g:'Accounts',i:'social',c:'acct'},
 web_page:{l:'Web page',g:'Web pages',i:'web',c:'web'},newsletter:{l:'Newsletter',g:'Newsletters',i:'mail',c:'nl'},slide:{l:'Slide',g:'Slides',i:'screen',c:'slide'}};
const CN_GROUPS=['Program','Event','Accounts','Web pages','Newsletters','Slides'];
const CN_RT={hashtag:['Hashtag','hash'],phrase:['Phrase','quote'],webpath:['Web path','path'],account:['Account','user'],'newsletter-link':['Newsletter link','nl']};
const CN_SRC={review:'from Review',manual:'added by hand',rule:'by rule',undo:'by Undo'};
Object.assign(S,{cnSub:['review','changes','rules','how'].includes(localStorage.pulseCnSub)?localStorage.pulseCnSub:'review',cnSel:null,cnDone:{},cnFeedN:30,cnEvery:{},cnPick:{},cnAdd:false,cnRF:{type:'hashtag',pattern:'',t:null,q:''}});
const cnLS=(k,d)=>{try{const v=JSON.parse(localStorage[k]||'null');return v==null?d:v}catch(e){return d}};
const CN={cache:cnLS('pulseConnCache',{version:0,rows:[],rules:[],at:0}),queue:cnLS('pulseConnQueue',[]),net:'',err:'',busy:false,conflict:null,d:null,A:null,Ak:'',I:null,Ik:'',T:null,Tk:'',timer:null};
if(!Array.isArray(CN.cache.rows))CN.cache={version:0,rows:[],rules:[],at:0};
function cnSave(){try{localStorage.pulseConnCache=JSON.stringify(CN.cache);localStorage.pulseConnQueue=JSON.stringify(CN.queue)}catch(e){console.warn('connections save',e)}CN.Ak='';if(typeof EVC!=='undefined')EVC.key='';if(typeof PGC!=='undefined')PGC.key=''}
// ---------- endpoint + who ----------
function cnCfg(){const s=S.ev&&S.ev.sync;if(s&&s.url&&s.key)return {url:String(s.url),key:String(s.key),src:'data'};const l=cnLS('pulseConnSync',null);return l&&l.url&&l.key?{url:l.url,key:l.key,src:'device'}:null}
const cnName=()=>String(localStorage.pulseConnName||'').trim();
const cnIni=w=>{const p=String(w||'?').replace(/^rule:/,'').trim().split(/\s+/);return ((p[0]||'?')[0]+(p[1]?p[1][0]:'')).toUpperCase()};
const cnAvC=w=>['a','j','s','r','b'][[...String(w||'')].reduce((a,c)=>a+c.charCodeAt(0),0)%5];
const cnAv=w=>`<span class="cn-av ${/^rule:|^R-/.test(String(w))?'bot':cnAvC(w)}" aria-hidden="true">${/^rule:|^R-/.test(String(w))?cic('spark',14):esc(cnIni(w))}</span>`;
function cnState(){const c=cnCfg(),q=CN.queue.length;if(CN.conflict)return ['conflict','Needs your answer'];if(!c)return q?['local','Saved on this device']:['off','Sharing not set up'];
 if(CN.busy)return ['busy','Saving…'];if(CN.net==='offline'||CN.net==='bad')return q?['offline','Offline, will sync']:['offline',CN.net==='bad'?'Key not accepted':'Offline'];return q?['busy','Saving…']:['ok','Saved for everyone']}
function cnPill(small){const [k,t]=cnState();const ic=k==='ok'?'check':k==='busy'?'refresh':k==='conflict'?'alert':k==='off'||k==='local'?'lock':'off';return `<span class="cn-sync ${k}${small?' sm':''}" id="${small?'':'cnPill'}" role="status">${cic(ic,14)}<span>${esc(t)}</span></span>`}
function cnPaint(){$$('.cn-sync').forEach(el=>{const sm=el.classList.contains('sm');const t=document.createElement('div');t.innerHTML=cnPill(sm);const n=t.firstElementChild;if(el.id)n.id=el.id;el.replaceWith(n)});const sp=$('#cnSetStat');if(sp)sp.outerHTML=cnSetStat(sp.closest('#setp')?'Status':'')}
// ---------- items (what can be connected) + targets (what they connect to) ----------
const CN_ITYPE=k=>{const ch=k.slice(0,2);if(ch==='so'){const r=evById().get(k.slice(3));return r&&r.plat==='ig'?'ig_post':'fb_post'}return {we:'web_page',em:'newsletter',sg:'slide'}[ch]||''};
function cnWebTotals(){if(CN.WT&&CN.WTn===S.web.length)return CN.WT;const m=new Map();if(S.web.length){const D=P.webDaily(S.web);for(const a of D.pg.values())for(const [p,v,u] of a){if(!p||p[0]!=='/')continue;const o=m.get(p)||[0,0];o[0]+=v;o[1]+=u;m.set(p,o)}}CN.WT=m;CN.WTn=S.web.length;return m}
function cnItemsKey(){const ps=gsPosts();return [ps.length,ps[0]&&ps[0].id,S.web.length,S.email.length,SG.data&&SG.data.items?SG.data.items.length+'|'+SG.data.checked:''].join('~')}
function cnItems(){const k=cnItemsKey();if(CN.Ik===k&&CN.I)return CN.I;const out=[];let tt={};try{tt=evTitles()}catch(e){}
 for(const r of gsPosts())out.push(P.connDesc('so',r));for(const p of cnWebTotals().keys())out.push(P.connDesc('we',p,tt[p.toLowerCase().replace(/\/$/,'')]||''));
 for(const c of emCamps())out.push(P.connDesc('em',c));for(const it of (SG.data&&SG.data.items)||[])out.push(P.connDesc('sg',it));CN.I=out.filter(Boolean);CN.Ik=k;CN.Imap=new Map(CN.I.map(x=>[x.key,x]));return CN.I}
const cnDesc=key=>{cnItems();return CN.Imap.get(key)||(key.slice(0,3)==='we:'?P.connDesc('we',key.slice(3)):null)};
function cnLedger(){return [...CN.cache.rows,...CN.queue.filter(q=>q.kind==='change').map(q=>Object.assign({},q.change,{who:q.who,time:q.at,pending:1,lid:q.lid}))]}
function cnRules(){const out=(CN.cache.rules||[]).map(r=>Object.assign({},r));for(const q of CN.queue){if(q.kind!=='rule')continue;if(q.rule.id){const r=out.find(x=>x.id===q.rule.id);if(r){r.on=q.rule.on;r.pending=1}}else out.push(Object.assign({},q.rule,{id:q.lid,by:q.who,created:String(q.at).slice(0,10),on:true,pending:1,lid:q.lid}))}return out}
function cnStamp(){return [CN.cache.version,CN.cache.rows.length,(CN.cache.rules||[]).map(r=>r.id+(r.on?1:0)).join(','),CN.queue.length,CN.queue.map(q=>q.lid).join(',').length].join('/')}
function cnApplied(){const k=cnStamp()+'#'+cnItemsKey();if(CN.Ak===k&&CN.A)return CN.A;try{CN.A=P.connApply(cnLedger(),cnRules(),cnItems())}catch(e){console.warn('connections',e);CN.A={byItem:new Map(),byTarget:new Map(),ruleHits:new Map(),state:new Map()}}CN.Ak=k;return CN.A}
const cnProgs=()=>((evData()||{}).programs||[]).filter(p=>!/^\(/.test(p.branch||''));
function cnTargets(){const k=cnItemsKey()+'|'+((evData()||{}).updated||'');if(CN.Tk===k&&CN.T)return CN.T;const T=[];
 for(const p of cnProgs())T.push({tt:'program',id:p.id,label:p.facility||p.program,sub:brName(p.branch)});
 for(const e of evList())T.push({tt:'event',id:e.id,label:e.name,sub:e.s?hrng(e.s,e.e):(e.status||'Date needed')});
 const seen=new Set();for(const r of gsPosts()){const kk=r.plat+'|'+r.page;if(seen.has(kk))continue;seen.add(kk);T.push({tt:r.plat==='ig'?'ig_account':'fb_account',id:r.page,label:(r.plat==='ig'?'IG · @':'FB · ')+(r.plat==='ig'?r.page:P.short(r.page)),sub:r.plat==='ig'?'Instagram account':'Facebook page'})}
 for(const [p,v] of [...cnWebTotals()].sort((a,b)=>b[1][1]-a[1][1]).slice(0,800))T.push({tt:'web_page',id:'we:'+p,label:pgTitle(p),sub:p});
 for(const c of emCamps())T.push({tt:'newsletter',id:'em:'+c.id,label:c.name,sub:'Sent '+hd(c.date)});
 for(const it of (SG.data&&SG.data.items)||[])T.push({tt:'slide',id:'sg:'+it.name,label:sgName(it.name),sub:'Slide · '+(it.playlist||'in rotation')});
 CN.T=T;CN.Tk=k;return T}
const CNTF={l:[1,t=>t.label],s:[.55,t=>t.sub+' '+CNT[t.tt].l+' '+CNT[t.tt].g,{sub:1}]};
function cnSearch(q,n){const T=cnTargets();if(!String(q||'').trim())return [];return P.search(P.searchIndex(T,CNTF,'cnT|'+CN.Tk),q,{cap:n||8}).map(h=>h.item)}
function cnTLabel(tt,tid,fb){if(tt==='program'){const p=cnProgs().find(x=>x.id===tid);return p?p.facility||p.program:fb||tid}if(tt==='event'){const e=evGet(tid);return e?e.name:fb||tid}
 if(tt==='fb_account')return 'FB · '+P.short(tid);if(tt==='ig_account')return 'IG · @'+String(tid).replace(/^@/,'');const id=String(tid).slice(3);
 if(tt==='web_page')return fb&&!/^\//.test(fb)?fb:pgTitle(id);if(tt==='newsletter'){const c=emCamps().find(x=>x.id===id);return c?c.name:fb||id}if(tt==='slide')return sgName(id);return fb||tid}
// ---------- one item: what it is, how to preview it, how to open it ----------
const CN_GR={so:['#3a1428','#9b2f4f','#f0a868'],we:['#14223f','#2c5aa0','#8fb4ff'],em:['#241838','#6b2a85','#c7b3ff'],sg:['#0f2a22','#2f7a5a','#9ee6b4']};
const cnGrad=(key)=>{const g=CN_GR[key.slice(0,2)]||CN_GR.so,h=[...key].reduce((a,c)=>(a*31+c.charCodeAt(0))%360,7);return `linear-gradient(${120+h%80}deg,${g[0]},${g[1]} 55%,${g[2]})`};
function cnInfo(key){const ch=key.slice(0,2),id=key.slice(3);
 if(ch==='so'){const r=evById().get(id)||S.posts.find(x=>x.id===id);if(!r)return null;const ty=String(r.type||'post').replace(/^IG /,'').toLowerCase();const reel=/reel|video/.test(ty);const eng=P.eng(r);
  return {key,ch,kind:(r.plat==='ig'?'IG ':'FB ')+(reel?'reel':ty.includes('carousel')?'carousel':'post'),title:P.label(r),cap:r.cap||'',acct:(r.plat==='ig'?'IG · @'+r.page:'FB · '+P.short(r.page)),date:r.t?fdtJ(r.t):hd(r.d,{year:'numeric'}),d:r.d,th:r.id,reel,
   m:[['Views',hk(r.v),'reach'],['Engagement',hk(eng),r.v?(eng/r.v*100).toFixed(1)+'% rate':''],r.plat==='ig'?['Saves',nf(r.sv||0),'']:['Link clicks',nf(r.lc||0),'']],open:r.link?{href:r.link,l:r.plat==='ig'?'Open on Instagram':'Open on Facebook'}:null}}
 if(ch==='we'){const t=cnWebTotals().get(id)||[0,0];return {key,ch,kind:'Web page',title:pgTitle(id),cap:'',path:id,acct:'okinawa.usmc-mccs.org',date:'',m:[['Users',hk(t[1]),'all loaded data'],['Page views',hk(t[0]),''],['Views / user',t[1]?(t[0]/t[1]).toFixed(1):'—','']],open:{href:'https://www.okinawa.usmc-mccs.org'+(id[0]==='/'?id:'/'+id),l:'Open the web page'}}}
 if(ch==='em'){const c=emCamps().find(x=>x.id===id);if(!c)return null;const t=Object.values(c.titles||{});return {key,ch,kind:'Newsletter',title:c.name,cap:[c.subject&&c.subject!==c.name?'Subject: '+c.subject:'',t.length?'Stories linked: '+t.slice(0,8).join(' · '):''].filter(Boolean).join('\n'),acct:'Constant Contact',date:'Sent '+hd(c.date,{year:'numeric'}),d:c.date,
  m:[['Sent',hk(c.sends||c.delivered||0),'subscribers'],['Opens',hk(c.opens||0),c.openRate!=null?c.openRate+'% rate':''],['Clicks',nf(c.clicks||0),c.clickRate!=null?c.clickRate+'% rate':'']],open:{fn:'em',id:c.id,l:'Open newsletter'}}}
 if(ch==='sg'){const it=((SG.data&&SG.data.items)||[]).find(x=>x.name===id);return {key,ch,kind:'Signage slide',title:sgName(id),cap:it?`${it.kind==='video'?'Video':'Still'} · ${it.playlist||''} playlist`:'Not in rotation right now',acct:it&&it.playlist||'ScreenCloud',date:it?'In rotation now':'',sgt:it&&it.t,
  m:[['Status',it?'Live':'—',''],['Type',it?(it.kind==='video'?'Video':'Still'):'—',''],['Screens',SG.data?nf(SG.data.live):'—','live now']],open:{fn:'sg',id,l:'Open slide'}}}
 return null}
const cnBadge=i=>`<span class="cb ${i.ch}">${hic(CHI[i.ch],11)}${esc(i.kind)}</span>`;
function cnThumb(i,size){return `<div class="cn-th" style="background:${cnGrad(i.key)}">${i.th?`<img data-th="${esc(i.th)}" alt="">`:i.sgt?`<img data-sg="${esc(i.sgt)}" alt="">`:''}${hic(i.ch==='so'?(i.reel?'pulse':'social'):CHI[i.ch],size||20)}</div>`}
function cnPreview(i){const g=cnGrad(i.key),t=esc(i.title);
 if(i.ch==='so')return `<div class="cn-prev ${i.reel?'p-reel':'p-post'}" style="background:${g}">${i.th?`<img data-th="${esc(i.th)}" alt="">`:''}<span class="cb so tag">${hic('social',11)}${i.kind.startsWith('IG')?'Instagram':'Facebook'} ${esc(i.kind.split(' ')[1])}</span>${i.reel?`<span class="play">${cic('play',22)}</span>`:''}<div class="ov"><b>${t}</b><small>${esc(i.date)}</small></div></div>`;
 if(i.ch==='we')return `<div class="cn-prev p-web"><div class="bar"><i></i><i></i><i></i><span>okinawa.usmc-mccs.org${esc(i.path)}</span></div><div class="hero" style="background:${g}"><b>${t}</b></div><div class="body"><div class="ln m"></div><div class="ln"></div><div class="ln s"></div></div></div>`;
 if(i.ch==='em')return `<div class="cn-prev p-mail"><div class="hd"><b>MCCS Okinawa newsletter</b><br>Subject: <b>${t}</b></div><div class="banner" style="background:${g}"><b>${t}</b></div><div class="body"><div class="ln m"></div><div class="ln"></div><div class="ln s"></div></div></div>`;
 return `<div class="cn-prev p-sign" style="background:${g}">${i.sgt?`<img data-sg="${esc(i.sgt)}" alt="">`:''}<span class="cb sg tag">${hic('screen',11)}Signage</span><div class="ov"><b>${t}</b><small>${esc(i.date)}</small></div></div>`}
function cnOpenBtn(i){const o=i.open;if(!o)return '';if(o.href)return `<a class="cn-btn ghost" href="${esc(o.href)}" target="_blank" rel="noopener">${hic('out',16)}${esc(o.l)}</a>`;return `<button class="cn-btn ghost" data-cnopen="${esc(o.fn+'|'+o.id)}">${hic('out',16)}${esc(o.l)}</button>`}
function cnOpen(v){const [fn,...r]=v.split('|'),id=r.join('|');if(fn==='em')return emailCampSheet(id);if(fn==='sg'){const it=((SG.data&&SG.data.items)||[]).find(x=>x.name===id);
 openSheet(`<h3>${esc(sgName(id))}</h3><div class="cn-slidebig">${it&&it.t?`<img data-sg="${esc(it.t)}" alt="${esc(sgName(id))}">`:`<div class="cn-prev p-sign" style="background:${cnGrad('sg:'+id)}"><div class="ov"><b>${esc(sgName(id))}</b></div></div>`}</div><p class="mut sm">${it?`${it.kind==='video'?'Video':'Still'} · ${esc(it.playlist||'')} playlist · in rotation now`:'Not in rotation right now'}<br>File: ${esc(id)}</p><button class="hbtn" data-nav="signage">${hic('screen',15)}Go to Signage</button>`);if(typeof sgFill==='function')sgFill($('#sheetBody'))}}
const cnCapHtml=(t,mk)=>{let h=esc(t).replace(/(#\w+)/g,'<span class="ht">$1</span>');if(mk&&mk.length>2){const re=new RegExp('('+mk.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');h=h.replace(re,'<mark>$1</mark>')}return h};
// ---------- current connections for an item (team + automatic) ----------
function cnConns(key){const A=cnApplied(),out=new Map(),K='\u0001';const add=(o)=>{const tk=o.tt+K+o.tid;if(!out.has(tk))out.set(tk,o)};
 const blocked=new Set(P.connOf(A,key).filter(c=>c.state==='blocked').map(c=>c.ttype+K+c.tid));
 for(const c of P.connOf(A,key))if(c.state!=='blocked')add({tt:c.ttype,tid:c.tid,label:cnTLabel(c.ttype,c.tid,c.tlabel),src:c.state==='rule'?'rule':'person',c,rm:1});
 const M=evM();if(M){for(const x of (M.byItem.get(key)||[]))if(x.state==='auto'&&!blocked.has('event'+K+x.ev))add({tt:'event',tid:x.ev,label:cnTLabel('event',x.ev),src:'auto',why:x.why+' · '+x.score+'%',rm:1})}
 const d=cnDesc(key),ch=key.slice(0,2);
 if(d){const own=ch==='so'?(P.progPages((evData()||{}).programs||[]).own.get(d.acct.replace(':','|'))||[]):[];for(const p of cnProgs()){if(blocked.has('program'+K+p.id))continue;const kw=P.progKw(p);let why='';
   if(own.length===1&&own[0].id===p.id)why='posted from its page'
   if(!why&&ch==='we'&&(p.web||[]).length){if(p.web.some(w=>{w=w.replace(/\/$/,'');return w&&(d.path===w||d.path.startsWith(w+'/'))}))why='its Web paths'}else if(!why){const k=kw.find(k=>d.text.includes(' '+k+' '));if(k)why='keyword “'+k+'”'}
   if(why)add({tt:'program',tid:p.id,label:p.facility||p.program,src:'auto',why,rm:1})}
  if(ch==='so'){const r=evById().get(key.slice(3));if(r)add({tt:r.plat==='ig'?'ig_account':'fb_account',tid:r.page,label:cnTLabel(r.plat==='ig'?'ig_account':'fb_account',r.page),src:'own',why:'posted from this account'})}}
 return [...out.values()]}
function cnSuggest(key,has){const out=[],K='\u0001',M=evM();const push=(tt,tid,label)=>{const tk=tt+K+tid;if(has.has(tk)||out.some(o=>o.tt+K+o.tid===tk))return;out.push({tt,tid,label})};
 if(M)for(const x of (M.byItem.get(key)||[]).filter(x=>x.state==='review'||x.state==='weak').sort((a,b)=>b.score-a.score))push('event',x.ev,cnTLabel('event',x.ev));
 const d=cnDesc(key),WT=cnWebTotals(),low=new Map([...WT.keys()].map(p=>[p.toLowerCase().replace(/\/$/,''),p]));
 if(d&&key.startsWith('em:'))for(const p of d.paths){const raw=low.get(p);if(raw)push('web_page','we:'+raw,pgTitle(raw))}
 if(d&&key.startsWith('we:'))for(const c of emCamps()){const dc=cnDesc('em:'+c.id);if(dc&&dc.paths.includes(d.path))push('newsletter','em:'+c.id,c.name)}
 if(d&&key.startsWith('so:'))for(const p of d.paths){const raw=low.get(p);if(raw)push('web_page','we:'+raw,pgTitle(raw))}
 return out.slice(0,5)}
// ---------- changes: queue locally, share when possible ----------
function cnAskName(then){if(cnName())return then();const m=$('#cnmod');m.innerHTML=`<div class="cn-modal" role="dialog" aria-modal="true" aria-labelledby="cnmT"><h3 id="cnmT">What should Pulse call you?</h3><p>Your name goes next to the changes you make, so the team knows who linked what. It stays on this device and in the team’s private sheet.</p>
 <div class="cn-row2"><label class="cn-fld"><span>First name</span><input id="cnmF" autocomplete="given-name" maxlength="24"></label><label class="cn-fld"><span>Last initial</span><input id="cnmL" maxlength="2"></label></div>
 <div class="cn-acts"><button class="cn-btn ghost" id="cnmX">Cancel</button><button class="cn-btn" id="cnmOk">Save</button></div></div>`;m.classList.add('show');setTimeout(()=>$('#cnmF').focus(),50);
 const ok=()=>{const f=$('#cnmF').value.trim(),l=$('#cnmL').value.trim().replace(/\./g,'');if(!f){$('#cnmF').focus();return}localStorage.pulseConnName=(f[0].toUpperCase()+f.slice(1))+(l?' '+l[0].toUpperCase()+'.':'');m.classList.remove('show');m.innerHTML='';then()};
 $('#cnmOk').onclick=ok;$('#cnmL').onkeydown=$('#cnmF').onkeydown=e=>{if(e.key==='Enter')ok()};$('#cnmX').onclick=()=>{m.classList.remove('show');m.innerHTML=''}}
const cnLid=()=>'L'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function cnChange(c,o){const q={kind:'change',lid:cnLid(),who:cnName()||'Pulse user',at:new Date().toISOString(),base:CN.cache.version||0,change:Object.assign({itype:CN_ITYPE(c.item),ilabel:(cnInfo(c.item)||{}).title||c.item.slice(3)},c)};
 q.change.ilabel=String(q.change.ilabel).slice(0,200);q.change.tlabel=String(q.change.tlabel||cnTLabel(c.ttype,c.tid)).slice(0,200);CN.queue.push(q);cnSave();cnPaint();if(!(o&&o.noflush))setTimeout(cnFlush,0);return q.lid}
function cnRule(rule){const q={kind:'rule',lid:cnLid(),who:cnName()||'Pulse user',at:new Date().toISOString(),base:CN.cache.version||0,rule};
 if(rule.id){const old=CN.queue.findIndex(x=>x.kind==='rule'&&x.rule.id===rule.id);if(old>=0)CN.queue.splice(old,1);const srv=(CN.cache.rules||[]).find(r=>r.id===rule.id);if(srv&&!!srv.on===!!rule.on){cnSave();cnPaint();return}}
 CN.queue.push(q);cnSave();cnPaint();setTimeout(cnFlush,0);return q.lid}
const cnSaid=()=>cnCfg()?'saved for everyone':'saved on this device';
async function cnFetch(url,opt){const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),20000);try{const r=await fetch(url,Object.assign({redirect:'follow',cache:'no-store',signal:ctl.signal},opt||{}));return await r.json()}finally{clearTimeout(t)}}
async function cnPull(){const c=cnCfg();if(!c)return false;let changed=false;
 try{const j=await cnFetch(c.url+(c.url.includes('?')?'&':'?')+'key='+encodeURIComponent(c.key)+'&since='+(CN.cache.version||0));
  if(!j||!j.ok){CN.net=j&&/key/i.test(j.error||'')?'bad':'offline';CN.err=j&&j.error||'';cnPaint();return false}
  const have=new Set(CN.cache.rows.map(r=>r.version));for(const r of j.changes||[])if(!have.has(r.version)){CN.cache.rows.push(r);changed=true}
  const rs=JSON.stringify(j.rules||[]);if(rs!==JSON.stringify(CN.cache.rules||[])){CN.cache.rules=j.rules||[];changed=true}
  if(j.version!==CN.cache.version)changed=true;CN.cache.version=Math.max(CN.cache.version||0,+j.version||0);CN.cache.at=Date.now();CN.net='ok';CN.err='';cnSave()}
 catch(e){CN.net='offline';CN.err=String(e.message||e)}
 cnPaint();if(changed)cnRefresh();return changed}
async function cnFlush(){const c=cnCfg();if(!c||CN.busy||CN.conflict||!CN.queue.length)return;CN.busy=true;cnPaint();let did=0;
 try{while(CN.queue.length&&!CN.conflict){const q=CN.queue[0];const body={key:c.key,who:q.who||cnName()||'Pulse user',baseVersion:q.base||0};if(q.kind==='rule')body.rule=q.rule;else body.change=q.change;if(q.force)body.force=true;
   let j;try{j=await cnFetch(c.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)})}catch(e){CN.net='offline';CN.err=String(e.message||e);break}
   if(j&&j.conflict){CN.conflict={lid:q.lid,theirs:j.theirs};CN.net='ok';cnSave();break}
   if(j&&j.busy){CN.net='offline';break}
   CN.queue.shift();did++;
   if(j&&j.ok){CN.net='ok';
    if(j.row){if(!CN.cache.rows.some(r=>r.version===j.row.version))CN.cache.rows.push(Object.assign({},j.row,{lid:q.lid}))}
    if(j.rule){const rr=CN.cache.rules||(CN.cache.rules=[]);const i=rr.findIndex(r=>r.id===j.rule.id);if(i>=0)rr[i]=j.rule;else rr.push(j.rule);
     if(!q.rule.id)for(const z of CN.queue)if(z.kind==='rule'&&z.rule.id===q.lid)z.rule.id=j.rule.id}}
   else{CN.net=j&&/key/i.test(j.error||'')?'bad':CN.net;toast('Not saved: '+((j&&j.error)||'the sheet refused the change'))}
   cnSave()}}
 finally{CN.busy=false;cnPaint();if(CN.conflict||did)cnRefresh()}
 if(did&&!CN.conflict)cnPull()}
function cnRefresh(){CN.Ak='';if(typeof EVC!=='undefined')EVC.key='';if(typeof PGC!=='undefined')PGC.key='';
 const typing=document.activeElement&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
 if(CN.d&&$('#cnd').classList.contains('show')){if(!typing)cnDrawer()}
 else if(['connections','events','programs'].includes(S.view)&&!typing&&!$('#setp.show')&&!$('#sheet.show')){const y=scrollY;render();scrollTo(0,y)}}
function cnTick(){if(!cnCfg()||S.locked||document.visibilityState==='hidden')return;cnMigrate();cnPull().then(()=>cnFlush())}
// move this device's old review answers (v36/v37, localStorage) into the shared queue, once
function cnMigrate(){if(localStorage.pulseConnMigrated||!cnCfg()||!cnName())return 0;const old=EVD.get();let n=0;
 for(const x of old){if(!x||!x.key||!x.ev)continue;CN.queue.push({kind:'change',lid:cnLid(),who:cnName(),at:x.at||new Date().toISOString(),base:CN.cache.version||0,change:{item:x.key,itype:CN_ITYPE(x.key),ilabel:((cnInfo(x.key)||{}).title||x.key.slice(3)).slice(0,200),ttype:'event',tid:x.ev,tlabel:cnTLabel('event',x.ev),act:x.act==='link'?'link':'not-this',src:'review'}});n++}
 if(old.length)localStorage.pulseEvDecBackup=JSON.stringify(old);localStorage.pulseConnMigrated=new Date().toISOString();EVD.set([]);cnSave();if(n)toast(`${n} earlier answer${n===1?'':'s'} from this device shared with the team`);return n}
// undo = a new row: the pair's previous state, or 'clear' (back to automatic) when there was none
function cnUndo(row){if(row.pending){const i=CN.queue.findIndex(q=>q.lid===row.lid);if(i>=0){CN.queue.splice(i,1);cnSave();cnPaint();return 'removed'}}
 const st=P.connSort(CN.cache.rows.filter(r=>r.item===row.item&&r.ttype===row.ttype&&String(r.tid)===String(row.tid)&&(+r.version||0)<(+row.version||0)));const prev=st[st.length-1];
 cnChange({item:row.item,itype:row.itype,ilabel:row.ilabel,ttype:row.ttype,tid:row.tid,tlabel:row.tlabel,act:prev?P.connAct(prev.act):'clear',src:'undo',replaces:row.row||''});return 'undone'}
function cnRowByLid(lid){return CN.cache.rows.find(r=>r.lid===lid)||cnLedger().find(r=>r.lid===lid)}
function cnResolve(how){const C=CN.conflict;if(!C)return;const q=CN.queue.find(x=>x.lid===C.lid);CN.conflict=null;if(C.theirs&&C.theirs.version&&!CN.cache.rows.some(r=>r.version===C.theirs.version))CN.cache.rows.push(C.theirs);
 if(how==='theirs'){CN.queue=CN.queue.filter(x=>x.lid!==C.lid);cnSave();toast('Kept their change');}
 else if(q){q.force=true;q.base=Math.max(q.base||0,+C.theirs.version||0);
  if(how==='mine'&&C.theirs&&P.connAct(C.theirs.act)==='link'&&String(C.theirs.tid)!==String(q.change.tid)&&q.change.act==='link'){const i=CN.queue.indexOf(q);CN.queue.splice(i+1,0,{kind:'change',lid:cnLid(),who:q.who,at:new Date().toISOString(),base:q.base,force:true,change:{item:C.theirs.item,itype:C.theirs.itype,ilabel:C.theirs.ilabel,ttype:C.theirs.ttype,tid:C.theirs.tid,tlabel:C.theirs.tlabel,act:'unlink',src:'manual',replaces:C.theirs.row}})}
  cnSave();toast(how==='both'?'Linked both':'Your change replaces theirs. Theirs stays in the history')}
 cnRefresh();cnFlush()}
const cnAgo=t=>{const ms=hT(t);if(isNaN(ms))return '';const m=Math.round((Date.now()-ms)/6e4);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':fdtJ(ms)};
const CN_ACT={link:'linked',unlink:'removed','not-this':'marked Not this:',clear:'undid'};
function cnConflictHtml(){const C=CN.conflict;if(!C)return '';const q=CN.queue.find(x=>x.lid===C.lid);if(!q){CN.conflict=null;return ''}const th=C.theirs||{},mine=q.change,ago=cnAgo(th.time);
 const verb=a=>({link:'linked to','not-this':'marked Not this for',unlink:'removed',clear:'reset'}[P.connAct(a)]);
 return `<div class="cn-ban" role="alert"><div class="hd">${cnAv(th.who)}<p><b>${esc(th.who||'Someone')} changed this${ago?' '+ago:''}:</b> ${verb(th.act)} <b>${esc(cnTLabel(th.ttype,th.tid,th.tlabel))}</b>. You were about to ${({link:'link it to','not-this':'mark Not this for',unlink:'remove',clear:'reset'})[mine.act]||'change'} ${esc(cnTLabel(mine.ttype,mine.tid,mine.tlabel))}.</p></div>
  <div class="diff"><div><span>Theirs · ${esc(th.who||'')}</span><b>${esc(cnTLabel(th.ttype,th.tid,th.tlabel))}</b><small>${esc(CN_ACT[P.connAct(th.act)]||'')} · ${esc(mine.ilabel||'')}</small></div><div><span>Yours · not saved</span><b>${esc(cnTLabel(mine.ttype,mine.tid,mine.tlabel))}</b><small>${esc(CN_ACT[mine.act]||'')}</small></div></div>
  <div class="cn-acts"><button class="cn-btn sm ok" data-cnres="theirs">Keep theirs</button><button class="cn-btn sm ghost" data-cnres="mine">Use mine</button>${mine.act==='link'&&P.connAct(th.act)==='link'&&String(th.tid)!==String(mine.tid)?`<button class="cn-btn sm ghost" data-cnres="both">Link both</button>`:''}</div>
  <div class="cn-help">Nothing is overwritten silently. Someone changed this item after you opened it, so Pulse asks first.</div></div>`}
// ---------- view ----------
function cnView(){const M=evM(),rv=M?M.review.length:0;const tabs=[['review','Review matches',rv],['changes','Recent changes',CN.queue.length?CN.queue.length:null],['rules','Teach Pulse'],['how','How sharing works']];
 const body=S.cnSub==='changes'?cnChanges():S.cnSub==='rules'?cnRulesView():S.cnSub==='how'?cnHow():cnReview();
 return `<div class="cn"><div class="hph cn-ph"><div><h1>Connections</h1><p>Tie every post, page, newsletter and slide to the programs, events and accounts it promotes. Answers are shared with the whole team.</p></div><div class="acts">${cnPill()}</div></div>
 <div class="cn-seg" role="tablist" aria-label="Connections">${tabs.map(([k,l,n])=>`<button role="tab" aria-selected="${S.cnSub===k}" class="${S.cnSub===k?'on':''}" data-cnsub="${k}">${l}${n!=null?` <span class="ct">${n}</span>`:''}</button>`).join('')}</div>
 ${cnConflictHtml()}${body}</div>`}
function cnQueue(){const M=evM();if(!M)return [];const L=M.review.slice(0,80).map(r=>r.key);for(const k of Object.keys(S.cnDone))if(!L.includes(k))L.push(k);return L}
function cnReview(){const M=evM();if(!M)return `<div class="card cn-empty"><h2>Waiting for the events list</h2><p class="mut">Review matches needs the Strategic Events list, which arrives encrypted with the rest of your data once this device is unlocked.</p></div>`;
 const Q=cnQueue();if(!S.cnSel||!Q.includes(S.cnSel))S.cnSel=Q.find(k=>!S.cnDone[k])||Q[0]||null;
 const qi=k=>{const i=cnInfo(k);if(!i)return '';const r=M.review.find(x=>x.key===k),dn=S.cnDone[k];const close=r&&r.alts[0]&&r.best.score-r.alts[0].score<=P.CONN.close;
  return `<button class="qc ${S.cnSel===k?'on':''} ${dn?'done':''}" data-cnq="${esc(k)}">${cnThumb(i)}<div style="min-width:0"><div class="t">${esc(i.title)}</div><div class="s">${cnBadge(i)}${dn?`<span class="dn">${esc(dn.txt)}</span>`:close?`<span class="warn">${r.alts.filter(a=>r.best.score-a.score<=P.CONN.close).length+1} close matches</span>`:r?`<span>${r.best.score}%</span>`:''}</div></div></button>`};
 const left=Q.filter(k=>!S.cnDone[k]).length;
 if(!Q.length)return `<div class="cn-rv"><div class="card cn-empty"><h2>Nothing to review</h2><p class="mut">Every likely match is linked or answered. Pulse links what it is sure about (90% and up) and what a rule covers by itself.</p><button class="cn-btn ghost" data-cnsub="changes">${cic('history',15)}See recent changes</button></div></div>`;
 return `<div class="cn-rv"><div class="card queue"><div class="qh"><h2>Queue <small>${left} to review${M.review.length>80?' · first 80':''}</small></h2></div><div class="ql">${Q.map(qi).join('')}</div></div>${S.cnSel?cnDetail(S.cnSel):''}</div>`}
function cnDetail(key){const M=evM(),i=cnInfo(key);if(!i)return '<div class="card"></div>';const r=M.review.find(x=>x.key===key),dn=S.cnDone[key];
 const cands=r?[r.best,...r.alts.filter(a=>r.best.score-a.score<=P.CONN.close)]:[];const amb=cands.length>1;
 const pick=amb?(cands.find(c=>c.ev===S.cnPick[key])||cands[0]):r&&r.best;const e=pick&&evGet(pick.ev);
 const mk=pick&&(String(pick.why).match(/[“"]([^”"]+)[”"]/)||[])[1];
 let sug='';if(r&&e){if(amb)sug=`<div class="cn-sug"><div class="lk">Too close to call</div><div class="why" style="margin-top:6px">${cands.length} events fit. Pick the one this promotes, or link more than one from Connect.</div><div class="alt">${cands.map(c=>{const ev=evGet(c.ev)||{name:c.ev};return `<label class="${c===pick?'on':''}"><div><input type="radio" name="cnamb" data-cnpick="${esc(c.ev)}" ${c===pick?'checked':''}><span class="n">${esc(ev.name)}</span></div><div class="pct"><span class="cbar"><span style="width:${c.score}%"></span></span>Event · ${c.score}%</div><div class="w">${esc(c.why)}${ev.s?' · '+esc(hrng(ev.s,ev.e)):''}</div></label>`}).join('')}</div></div>`;
  else sug=`<div class="cn-sug"><div class="lk">Likely</div><div class="to">${esc(e.name)}<span class="ty">Event · ${pick.score}%</span></div><div class="pct"><span class="cbar" style="width:120px"><span style="width:${pick.score}%"></span></span>${pick.score}% confident</div><div class="why">Matched: <b>${esc(pick.why)}</b>${e.s?` · campaign window ${esc(hd(P.evWindow(e).ws))} – ${esc(hd(P.evWindow(e).we))}`:''}</div></div>`}
 let every='';const g=e&&P.connRuleGuess(cnDesc(key),{tags:e.tags,phrases:P.evPhrases(e),paths:e.paths},pick.why);
 if(g&&!dn){const n=P.connRuleCount({type:g.type,pattern:g.pattern},cnItems(),key).all,on=!!S.cnEvery[key];
  every=`<div class="cn-every ${on?'':'off'}"><label><input type="checkbox" data-cnevery="${esc(key)}" ${on?'checked':''}>Do this every time</label><div class="rp">${cic('spark',14)}<span>${({hashtag:'Posts with',webpath:'Pages and links with',phrase:'Anything that says'})[g.type]} <code>${esc(g.pattern)}</code> → <b>${esc(e.name)}</b></span><span class="mut" style="display:block">${CN_RT[g.type][0]} rule · would also link ${n} other item${n===1?'':'s'}</span></div></div>`}
 const acts=dn?`<div class="cn-saved"><span class="ck">${hic('check',18)}</span><div><b>${esc(dn.txt)}</b><small>${esc(cnCfg()?'Shared with everyone':'Saved on this device')} by ${esc(cnName()||'you')} · just now</small></div><button class="cn-btn sm ghost" data-cnundo="${esc(key)}">${cic('undo',14)}Undo</button></div>`
  :`<div class="cn-acts">${e?`<button class="cn-btn ok" data-cnact="link">${hic('link',16)}Link${amb?' to '+esc(evShort(e)):''}</button><button class="cn-btn ghost" data-cnact="no">${cic('x',16)}Not this</button>`:''}<button class="cn-btn ghost wide" data-cn="${esc(key)}">${cic('plus',16)}Connect to something else…</button></div>${every}`;
 return `<div class="card cn-pv"><div class="pvg"><div class="media">${cnPreview(i)}<div class="kv">${i.m.map(([l,v,s])=>`<div><span>${esc(l)}</span><b>${esc(v)}</b>${s?`<small>${esc(s)}</small>`:''}</div>`).join('')}</div>${cnOpenBtn(i)}</div>
 <div class="detail"><div class="meta">${cnBadge(i)}<span>${esc(i.acct)}</span>${i.date?`<span class="mut">· ${esc(i.date)}</span>`:''}</div><h3 class="ttl1">${esc(i.title)}</h3>${i.path?`<div class="cn-path">${esc(i.path)}</div>`:''}${i.cap?`<p class="cap">${cnCapHtml(i.cap,mk)}</p>`:''}
 ${sug}${acts}</div></div></div>`}
function cnChanges(){const L=P.connSort(cnLedger()).reverse(),st=P.connState(cnLedger()),c=cnCfg();const cur=r=>st.get(P.connPair(r.item,r.ttype,String(r.tid)))===r;
 const fi=r=>{const a=P.connAct(r.act),i=cnInfo(r.item);const what=r.itype==='ig_post'?'IG post':r.itype==='fb_post'?'FB post':r.itype==='web_page'?'web page':r.itype==='newsletter'?'newsletter':r.itype==='slide'?'slide':'item';
  return `<div class="fi ${cur(r)?'':'old'}">${cnAv(r.who)}<div><div class="tx"><b>${esc(r.who||'Someone')}</b> ${CN_ACT[a]||a} ${what} <q>${esc(i?i.title:r.ilabel||r.item)}</q> ${a==='link'?'→':a==='clear'?'·':'≠'} <b>${esc(cnTLabel(r.ttype,r.tid,r.tlabel))}</b></div><div class="wh">${hic('clock',12)}${esc(cnAgo(r.time))}${r.src?' · '+esc(CN_SRC[r.src]||r.src):''}${r.pending?` · <span class="warn">${c?'sharing…':'on this device only'}</span>`:''}</div></div>${cur(r)&&a!=='clear'?`<button class="un" data-cnfeed="${esc(r.lid||String(r.version))}">Undo</button>`:'<span class="mut sm">'+(cur(r)?'':'replaced')+'</span>'}</div>`};
 return `<div class="cn-cf"><div class="cn-col">${c?`<div class="cn-saved"><span class="ck">${hic(CN.conflict||CN.net==='offline'?'alert':'check',18)}</span><div><b>${CN.conflict?'Waiting for your answer above':CN.queue.length?'Saving '+CN.queue.length+' change'+(CN.queue.length===1?'':'s')+'…':CN.net==='offline'?'Offline, will sync':'Saved for everyone'}</b><small>Shared through the Strategic Events sheet · Connections tab${CN.cache.at?' · checked '+esc(cnAgo(new Date(CN.cache.at).toISOString())):''}</small></div><span class="mut sm cn-ver">v ${nf(CN.cache.version||0)}</span></div>`
  :`<div class="cn-saved off"><span class="ck">${cic('lock',18)}</span><div><b>Sharing is not set up on this device</b><small>Your answers are kept here and shared the moment sharing is set up.</small></div><button class="cn-btn sm ghost" id="cnSetGo">Set up</button></div>`}
  <div class="card cn-mine"><h2>Your name on changes <small>${esc(cnName()||'not set yet')}</small></h2><p class="mut sm" style="margin:0">Pulse puts your name next to what you change, so the team can see who linked what. Change it in Settings › Data &amp; sync.</p></div></div>
 <div class="card feed"><h2>Recent changes <small>everyone · newest first</small></h2>${L.length?L.slice(0,S.cnFeedN).map(fi).join(''):'<p class="mut">No changes yet. Link something in Review matches or from any item’s Connect button.</p>'}${L.length>S.cnFeedN?`<button class="more" id="cnMore">Show more</button>`:''}<div class="cn-help">Undo adds a new row that reverses the change. History is never deleted.</div></div></div>`}
function cnRulesView(){const R=cnRules().slice().reverse(),A=cnApplied(),on=R.filter(r=>r.on).length;
 const tchip=r=>{const t=CNT[r.ttype]||CNT.event;return `<span class="cn-tc ty-${t.c} nox">${cic(t.i,14)}<span class="lb">${esc(cnTLabel(r.ttype,r.tid,r.tlabel))}</span></span>`};
 const ty=r=>{const t=CN_RT[r.type]||[r.type,'spark'];return `<span class="rtype">${cic(t[1],15)}${esc(t[0])}</span>`};
 const sw=r=>`<button class="cn-sw ${r.on?'on':''}" role="switch" aria-checked="${!!r.on}" aria-label="Rule ${esc(r.id)} on or off" data-cntog="${esc(r.id)}"></button>`;
 const F=S.cnRF,prev=F.pattern&&F.t?P.connRuleCount({type:F.type,pattern:F.pattern},cnItems()):F.pattern?P.connRuleCount({type:F.type,pattern:F.pattern},cnItems()):null;
 const add=S.cnAdd?`<div class="card cn-addc"><div class="addf"><label class="cn-fld"><span>Type</span><select id="cnRT">${Object.entries(CN_RT).map(([k,[l]])=>`<option value="${k}" ${F.type===k?'selected':''}>${l}</option>`).join('')}</select></label>
  <label class="cn-fld"><span>Pattern</span><input id="cnRP" value="${esc(F.pattern)}" placeholder="${({hashtag:'#OkiNapa',phrase:'turkey trot',webpath:'/okinapa-wine-festival',account:'ig:mccsokinawa',  'newsletter-link':'/comic-con'})[F.type]}" autocomplete="off"></label>
  <div class="cn-fld"><span>Connect to</span>${F.t?`<span class="cn-tc ty-${CNT[F.t.tt].c}">${cic(CNT[F.t.tt].i,14)}<span class="lb">${esc(F.t.label)}</span><button class="x" id="cnRTx" aria-label="Change">${cic('x',13)}</button></span>`:`<div class="cn-srch sm">${cic('search',15)}<input id="cnRQ" value="${esc(F.q)}" placeholder="Program, event, page…" autocomplete="off"></div><div id="cnRRes">${cnResList(cnSearch(F.q,6),'cnrt')}</div>`}</div>
  <button class="cn-btn" id="cnRSave" ${F.pattern.trim()&&F.t?'':'disabled'}>Save rule</button></div>
  <div class="pvw" id="cnRPv">${cic('spark',14)} ${prev?`Would match <b>${prev.all} item${prev.all===1?'':'s'}</b> (${prev.so} social, ${prev.we} web, ${prev.em} email, ${prev.sg} slides).`:'Type a pattern to see what it would match.'} Rules link at 95%; a person’s answer still wins.</div></div>`:'';
 return `<div class="cn-rlay"><div class="card"><h2>Learned rules <small>${on} on · ${R.length} total · shared with everyone</small></h2>
  <div class="cn-rbar"><button class="cn-btn sm" id="cnAddR">${cic(S.cnAdd?'x':'plus',15)}${S.cnAdd?'Close':'Add rule'}</button></div>${add}
  ${R.length?`<table class="rtbl"><thead><tr><th>Rule</th><th>Type</th><th>Pattern</th><th>Connects to</th><th>Created by</th><th style="text-align:right">Items matched</th><th>On</th></tr></thead><tbody>
  ${R.map(r=>`<tr class="${r.on?'':'off'}"><td class="mut num">${r.pending?'new':esc(r.id)}</td><td>${ty(r)}</td><td><code>${esc(r.pattern)}</code>${r.pending?`<div class="cn-help">${cnCfg()?'sharing…':'on this device only'}</div>`:''}</td><td>${tchip(r)}</td><td class="mut2">${esc(r.by||'')}<div class="cn-help" style="margin-top:2px">${esc(r.created?hd(String(r.created).slice(0,10)):'')}</div></td><td class="num" style="text-align:right">${nf(A.ruleHits.get(r.id)||0)}</td><td>${sw(r)}</td></tr>`).join('')}</tbody></table>
  <div class="rcards">${R.map(r=>`<div class="rc ${r.on?'':'off'}"><div class="r1"><div>${ty(r)} <code>${esc(r.pattern)}</code></div>${sw(r)}</div><div class="r2">→ ${tchip(r)}</div><div class="r3">${r.pending?'new':esc(r.id)} · ${esc(r.by||'')} · ${esc(r.created?hd(String(r.created).slice(0,10)):'')} · ${nf(A.ruleHits.get(r.id)||0)} items matched</div></div>`).join('')}</div>`
  :'<p class="mut">No rules yet. Tick “Do this every time” when you link something in Review matches, or add one here.</p>'}
  <div class="cn-help" style="margin-top:10px">Rule matches are linked at 95% confidence. A person’s answer always beats a rule, and “Not this” on a rule match tells Pulse to skip that item. Rules are never deleted; turn one off instead.</div></div>
 <div class="card"><h2>How an answer becomes a rule</h2><div class="cn-flow"><div class="st"><div class="n">1 · Review</div><h5>Someone links an item</h5><p>In Review matches they confirm a post belongs to an event and tick <b>Do this every time</b>.</p></div><div class="ar">${cic('arrow',20)}</div>
  <div class="st"><div class="n">2 · Rule saved</div><h5>A hashtag, path or phrase</h5><p>Written to the sheet’s Rules tab with who and when. Everyone’s Pulse picks it up within a minute.</p></div><div class="ar">${cic('arrow',20)}</div>
  <div class="st"><div class="n">3 · Pulse learns</div><h5>Matching items link at 95%</h5><p>Past and new items that match link on their own and skip the review queue. Turn the rule off any time.</p></div></div></div></div>`}
function cnHow(){const c=cnCfg();return `<div class="cn-how"><div class="card"><h2>How sharing works <small>one master copy</small></h2>
 <div class="diag"><div class="nd">Your Pulse<small>tap Link</small></div><span class="arr">→</span><div class="nd">Apps Script<small>checks version</small></div><span class="arr">→</span><div class="nd m">Google Sheet<small>master copy</small></div><span class="arr">→</span><div class="nd">Everyone’s Pulse<small>about 1 min</small></div></div><div class="rule"></div>
 <ul class="pts"><li><span class="ic">${hic('sheet')}</span><div><b>Answers go to the Connections tab</b><span>Every Link, Not this and Remove is a new row, never an edit. The newest row wins; older rows stay as history, so any change can be undone.</span></div></li>
 <li><span class="ic">${cic('spark')}</span><div><b>Rules go to the Rules tab</b><span>“Do this every time” saves a rule with who made it. Turning a rule off flips its On column; it is never deleted.</span></div></li>
 <li><span class="ic">${cic('refresh')}</span><div><b>Everyone refreshes within about a minute</b><span>Pulse asks the sheet what changed since its last check while it is open. If someone changed the same item first, you get Keep theirs / Use mine instead of a silent overwrite.</span></div></li>
 <li><span class="ic">${cic('lock')}</span><div><b>Names stay private</b><span>Who changed what lives only in the team’s sheet and on your devices. It is never published on the public site.</span></div></li>
 <li><span class="ic">${cic('cloud')}</span><div><b>The sheet is the master copy</b><span>Strategic Events, Links, Connections and Rules live in one Google Sheet. The Links tab still works as a manual override.</span></div></li></ul></div>
 <div class="cn-col"><div class="card"><h2>On this device</h2><div class="cn-stat">${cnSetStat()}</div><p class="mut sm" style="line-height:1.55">${c?(c.src==='data'?'Sharing was set up by the published data.':'Sharing was set up in Settings on this device.'):'Sharing is not set up yet. Until it is, your answers are kept on this device and shared the moment it is set up.'}</p><button class="cn-btn ghost sm" id="cnSetGo">${hic('sync',15)}Settings › Data &amp; sync</button></div>
 <div class="card"><h2>Connections tab <small>columns</small></h2><div class="scroll"><table class="cn-cols"><tbody>${[['Time','set by the sheet'],['Who','first name + last initial'],['Item key','so: post · we: page · em: newsletter · sg: slide'],['Item type / label','what was connected'],['Target type / ID / label','program · event · account · web page · newsletter · slide'],['Action','link · unlink · not-this · clear (undo)'],['Source','review · manual · rule · undo'],['Replaces row','the row this one changes'],['Version','counts every change']].map(([a,b])=>`<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</tbody></table></div></div>
 <div class="cn-priv">${cic('lock')}<span>The web app address and team key are private. They come only from the encrypted data or from Settings on this device, never from the public site.</span></div></div></div>`}
// ---------- connect drawer (side drawer on desktop, bottom sheet on phones) ----------
function cnOpenDrawer(key){if(!cnInfo(key))return toast('That item is not loaded on this device');CN.d={key,q:'',chip:null};cnDrawer();$('#cnd').classList.add('show');$('#cnscrim').classList.add('show');$('#cnd').setAttribute('aria-hidden','false');setTimeout(()=>{const x=$('#cndq');if(x&&matchMedia('(min-width:700px)').matches)x.focus()},60)}
function cnCloseDrawer(){if(!CN.d)return;CN.d=null;$('#cnd').classList.remove('show');$('#cnscrim').classList.remove('show');$('#cnd').setAttribute('aria-hidden','true');if(S.view==='connections'||S.view==='events'||S.view==='programs')render()}
function cnResList(res,attr,has){return res.length?`<div class="res">${res.map(x=>{const t=CNT[x.tt],h=has&&has.has(x.tt+'\u0001'+x.id);return `<button class="ty-${t.c}" data-${attr}="${esc(x.tt+'|'+x.id)}"><span class="ico">${cic(t.i,15)}</span><span style="min-width:0"><div class="nm">${esc(x.label)}</div><div class="tp">${esc(t.l)}${x.sub?' · '+esc(x.sub):''}</div></span>${h?`<span class="in">${hic('check',14)} added</span>`:`<span class="mut">${cic('plus',16)}</span>`}</button>`}).join('')}</div>`:''}
function cnChip(o,key,open){const t=CNT[o.tt]||CNT.event,k=o.tt+'|'+o.tid;return `<div class="cn-chipw"><span class="cn-tc ty-${t.c} ${o.rm?'':'nox'} ${o.src==='auto'||o.src==='own'?'auto':''}"><button class="tcm" data-cnchip="${esc(k)}" aria-expanded="${!!open}">${cic(t.i,14)}<span class="lb">${esc(o.label)}</span></button>${o.rm?`<button class="x" data-cnrm="${esc(k)}" aria-label="Remove ${esc(o.label)}">${cic('x',13)}</button>`:''}</span>
 ${open?`<div class="who">${cic('history',13)}${o.src==='person'?(o.c.row&&o.c.row.pending?`Linked by <b>${esc(o.c.who||'you')}</b> · ${esc(cnCfg()?'sharing…':'on this device only')}`:`Linked by <b>${esc(o.c.who||'someone')}</b> · ${esc(cnAgo(o.c.time))} · ${esc(CN_SRC[o.c.src]||'')}`):o.src==='rule'?`By rule <b>${esc(o.c.rule||'')}</b>${o.c.who?' · made by '+esc(o.c.who):''}`:o.src==='own'?'Automatic: posted from this account':`Automatic: ${esc(o.why||'keyword match')}`}</div>`:''}</div>`}
function cnDrawer(){const d=CN.d;if(!d)return;const i=cnInfo(d.key);if(!i)return;const cs=cnConns(d.key),has=new Set(cs.map(c=>c.tt+'\u0001'+c.tid));
 const groups=CN_GROUPS.map(g=>({g,l:cs.filter(c=>CNT[c.tt].g===g)})).filter(x=>x.l.length);const res=cnSearch(d.q,8),sug=cnSuggest(d.key,has);const gc={Program:'prog',Event:'event',Accounts:'acct','Web pages':'web',Newsletters:'nl',Slides:'slide'};
 const el=$('#cnd'),qEl=$('#cndq'),pos=qEl&&document.activeElement===qEl?qEl.selectionStart:null,sc=$('#cnd .dr-b')?$('#cnd .dr-b').scrollTop:0;
 el.innerHTML=`<div class="dr-h"><div class="grab"></div><div class="row">${cnThumb(i,20).replace('cn-th','cn-th mini')}<div style="min-width:0"><div class="meta">${cnBadge(i)}<span>${cs.length} connection${cs.length===1?'':'s'}</span></div><h3 id="cndT">${esc(i.title)}</h3></div><button class="cn-ibtn close" id="cndX" aria-label="Close">${cic('x')}</button></div></div>
 <div class="dr-b"><div><label class="cn-srch">${cic('search',17)}<input id="cndq" placeholder="Search programs, events, pages…" value="${esc(d.q)}" autocomplete="off" aria-label="Search programs, events, accounts, pages, newsletters and slides"></label>
  <div id="cndRes">${d.q.trim()?(res.length?cnResList(res,'cnadd',has):'<div class="cn-help">No matches. Try a program, event, account, page path or newsletter date.</div>'):''}</div></div>
  ${sug.length?`<div class="grp"><h4>${cic('spark',13)} Suggested</h4><div class="chips">${sug.map(s=>{const t=CNT[s.tt];return `<button class="cn-tc add ty-${t.c}" data-cnadd="${esc(s.tt+'|'+s.tid)}"><span class="pl">+</span>${cic(t.i,14)}<span class="lb">${esc(s.label)}</span></button>`}).join('')}</div></div>`:''}
  ${groups.length?groups.map(x=>`<div class="grp ty-${gc[x.g]}"><h4><i></i>${x.g}</h4><div class="chips">${x.l.map(c=>cnChip(c,d.key,d.chip===c.tt+'|'+c.tid)).join('')}</div></div>`).join(''):'<div class="cn-help">Not connected to anything yet.</div>'}
  <div class="cn-help">Tap a connection to see who added it. Removing one is shared too, and can be undone from Recent changes. Dashed chips are automatic matches.</div></div>
 <div class="dr-f">${cnPill(true)}<button class="cn-btn" id="cndDone">Done</button></div>`;
 el.setAttribute('aria-labelledby','cndT');const b=$('#cnd .dr-b');if(b)b.scrollTop=sc;
 if(pos!=null){const x=$('#cndq');x.focus();x.setSelectionRange(pos,pos)}hubThumbs();if(typeof sgFill==='function')sgFill(el);cnBindDrawer()}
function cnBindDrawer(){const d=CN.d;$('#cndX').onclick=$('#cndDone').onclick=cnCloseDrawer;
 $('#cndq').oninput=e=>{d.q=e.target.value;const cs=cnConns(d.key),has=new Set(cs.map(c=>c.tt+'\u0001'+c.tid)),res=cnSearch(d.q,8);$('#cndRes').innerHTML=d.q.trim()?(res.length?cnResList(res,'cnadd',has):'<div class="cn-help">No matches. Try a program, event, account, page path or newsletter date.</div>'):'';bindAdd()};
 const bindAdd=()=>$$('#cnd [data-cnadd]').forEach(b=>b.onclick=()=>{const [tt,...r]=b.dataset.cnadd.split('|'),tid=r.join('|');if(cnConns(d.key).some(c=>c.tt===tt&&c.tid===tid&&c.src!=='auto'))return;
  cnAskName(()=>{cnChange({item:d.key,ttype:tt,tid,tlabel:cnTLabel(tt,tid),act:'link',src:'manual'});d.q='';toast('Connected · '+cnSaid());cnDrawer()})});bindAdd();
 $$('#cnd [data-cnchip]').forEach(b=>b.onclick=()=>{d.chip=d.chip===b.dataset.cnchip?null:b.dataset.cnchip;cnDrawer()});
 $$('#cnd [data-cnrm]').forEach(b=>b.onclick=()=>{const [tt,...r]=b.dataset.cnrm.split('|'),tid=r.join('|');cnAskName(()=>{cnChange({item:d.key,ttype:tt,tid,tlabel:cnTLabel(tt,tid),act:'unlink',src:'manual'});toast('Removed · '+cnSaid());cnDrawer()})})}
// ---------- connected by team (program + event detail) ----------
function cnTeamCard(tt,id){const A=cnApplied(),keys=[...(A.byTarget.get(tt+'\u0001'+id)||[])];const L=keys.map(k=>{const c=A.byItem.get(k).get(tt+'\u0001'+id);return {k,c,i:cnInfo(k)}}).filter(x=>x.i).sort((a,b)=>String(b.c.time).localeCompare(String(a.c.time)));
 const others=k=>P.connOf(A,k).filter(c=>c.state!=='blocked'&&!(c.ttype===tt&&c.tid===id)&&['fb_account','ig_account','web_page','newsletter','slide','program','event'].includes(c.ttype)).slice(0,4);
 return `<div class="card cn-team"><h2>Connected by team <small>${L.length} item${L.length===1?'':'s'}</small></h2>${L.length?L.slice(0,8).map(({k,c,i})=>`<div class="cn-trow">${cnThumb(i,16)}<div style="min-width:0"><div class="t">${esc(i.title)}</div><div class="s">${cnBadge(i)}<span>${c.state==='rule'?'rule '+esc(c.rule||''):'by '+esc(c.who||'someone')}</span>${others(k).map(o=>`<span class="cn-tc ty-${CNT[o.ttype].c} nox mini">${cic(CNT[o.ttype].i,12)}<span class="lb">${esc(cnTLabel(o.ttype,o.tid,o.tlabel))}</span></span>`).join('')}</div></div><button class="cn-cbtn" data-cn="${esc(k)}" aria-label="Connect ${esc(i.title)}">${hic('link',13)}Connect</button></div>`).join('')+(L.length>8?`<p class="mut sm">and ${L.length-8} more</p>`:'')
  :`<p class="mut sm" style="margin:0">Nothing linked by hand or by a rule yet. Use <b>Connect</b> on any item to tie it here, or teach Pulse a rule.</p>`}</div>`}
// small Connect buttons on item rows elsewhere (event detail, program detail)
function cnDecorate(root){(root||document).querySelectorAll('.it[data-key]').forEach(it=>{if(it.querySelector('.cn-cbtn'))return;const s=it.querySelector('.ib .s')||it.querySelector('.ib');if(!s)return;const b=document.createElement('button');b.className='cn-cbtn';b.dataset.cn=it.dataset.key;b.setAttribute('aria-label','Connect');b.innerHTML=hic('link',12)+'Connect';s.appendChild(b)})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cn]');if(!b||TV.on)return;e.preventDefault();e.stopPropagation();cnOpenDrawer(b.dataset.cn)},true);
// post + newsletter sheets get a Connect button
{const ps=postSheet;postSheet=function(id){ps(id);const body=$('#sheetBody');if(!body||!$('#sheet').classList.contains('show')||body.querySelector('.cn-sheetbtn'))return;const w=document.createElement('div');w.className='cn-sheetbtn';w.innerHTML=`<button class="hbtn ghost sm" data-cn="so:${esc(id)}">${hic('link',14)}Connect to programs, events…</button>`;const h=body.querySelector('h3');if(h)h.after(w);else body.prepend(w)}}
{const es=emailCampSheet;emailCampSheet=function(id){es(id);const body=$('#sheetBody');if(!body||!$('#sheet').classList.contains('show')||body.querySelector('.cn-sheetbtn'))return;const w=document.createElement('div');w.className='cn-sheetbtn';w.innerHTML=`<button class="hbtn ghost sm" data-cn="em:${esc(id)}">${hic('link',14)}Connect to programs, events…</button>`;const h=body.querySelector('h3');if(h)h.after(w);else body.prepend(w)}}
// ---------- binding ----------
function bindCn(){$$('[data-cnsub]').forEach(b=>b.onclick=()=>{S.cnSub=b.dataset.cnsub;localStorage.pulseCnSub=S.cnSub;render()});
 $$('[data-cnres]').forEach(b=>b.onclick=()=>cnResolve(b.dataset.cnres));const sg=$('.cn-seg'),on=sg&&sg.querySelector('.on');if(on&&sg.scrollWidth>sg.clientWidth)sg.scrollLeft=on.offsetLeft-24;
 $$('[data-cnopen]').forEach(b=>b.onclick=()=>cnOpen(b.dataset.cnopen));const sg2=$('#cnSetGo');if(sg2)sg2.onclick=()=>settings('data');
 if(S.cnSub==='review'){const keep=()=>{const y=scrollY;render();scrollTo(0,y)};
  $$('[data-cnq]').forEach(b=>b.onclick=()=>{S.cnSel=b.dataset.cnq;keep();if(!matchMedia('(min-width:1000px)').matches){const p=$('.cn .cn-pv');if(p)p.scrollIntoView({block:'start',behavior:'smooth'})}});
  $$('[data-cnpick]').forEach(b=>b.onchange=()=>{S.cnPick[S.cnSel]=b.dataset.cnpick;keep()});
  $$('[data-cnevery]').forEach(b=>b.onchange=()=>{S.cnEvery[b.dataset.cnevery]=b.checked;keep()});
  $$('[data-cnact]').forEach(b=>b.onclick=()=>cnAskName(()=>cnDecide(S.cnSel,b.dataset.cnact)));
  $$('[data-cnundo]').forEach(b=>b.onclick=()=>{const k=b.dataset.cnundo,dn=S.cnDone[k];if(dn)dn.lids.slice().reverse().forEach(l=>{const r=cnRowByLid(l);if(r)cnUndo(r)});delete S.cnDone[k];S.cnSel=k;toast('Undone · '+cnSaid());keep()})}
 if(S.cnSub==='changes'){$$('[data-cnfeed]').forEach(b=>b.onclick=()=>cnAskName(()=>{const v=b.dataset.cnfeed,r=cnLedger().find(x=>(x.lid&&x.lid===v)||String(x.version)===v);if(r){const how=cnUndo(r);toast(how==='removed'?'Removed before it was shared':'Undone · '+cnSaid());render()}}));const m=$('#cnMore');if(m)m.onclick=()=>{S.cnFeedN+=50;render()}}
 if(S.cnSub==='rules')cnBindRules()}
function cnDecide(key,act){const M=evM(),r=M&&M.review.find(x=>x.key===key);if(!r)return;const cands=[r.best,...r.alts.filter(a=>r.best.score-a.score<=P.CONN.close)];const pick=cands.length>1?(cands.find(c=>c.ev===S.cnPick[key])||cands[0]):r.best;const e=evGet(pick.ev);if(!e)return;
 const lids=[cnChange({item:key,ttype:'event',tid:e.id,tlabel:e.name,act:act==='link'?'link':'not-this',src:'review'},{noflush:1})];let ruled='';
 if(act==='link'&&S.cnEvery[key]){const g=P.connRuleGuess(cnDesc(key),{tags:e.tags,phrases:P.evPhrases(e),paths:e.paths},pick.why);if(g){cnRule({type:g.type,pattern:P.connRuleNorm(g.type,g.pattern),ttype:'event',tid:e.id,tlabel:e.name});ruled=' · rule added'}}
 S.cnDone[key]={txt:act==='link'?'Linked → '+evShort(e):'Not '+evShort(e),lids};cnFlush();
 toast((act==='link'?'Linked · ':'Got it · Pulse won’t suggest that again · ')+cnSaid()+ruled);const y=scrollY;render();scrollTo(0,y);
 setTimeout(()=>{if(S.view!=='connections'||S.cnSub!=='review'||S.cnSel!==key)return;const nx=cnQueue().find(k=>!S.cnDone[k]);if(nx){S.cnSel=nx;const yy=scrollY;render();scrollTo(0,yy)}},900)}
function cnBindRules(){const F=S.cnRF;const keep=()=>{const y=scrollY;render();scrollTo(0,y)};
 const a=$('#cnAddR');if(a)a.onclick=()=>{S.cnAdd=!S.cnAdd;keep()};
 $$('[data-cntog]').forEach(b=>b.onclick=()=>cnAskName(()=>{const id=b.dataset.cntog,r=cnRules().find(x=>x.id===id);if(!r)return;
  if(r.pending&&r.lid===id&&!(CN.cache.rules||[]).some(x=>x.id===id)){CN.queue=CN.queue.filter(q=>q.lid!==id);cnSave();toast('Rule removed (it was not shared yet)');return keep()}
  cnRule({id,on:!r.on});toast(`Rule ${id} ${!r.on?'on':'off'} · ${cnSaid()}`);keep()}));
 const rt=$('#cnRT');if(rt)rt.onchange=()=>{F.type=rt.value;keep()};
 const rp=$('#cnRP');if(rp)rp.oninput=()=>{F.pattern=rp.value;const n=P.connRuleCount({type:F.type,pattern:F.pattern},cnItems());$('#cnRPv').innerHTML=`${cic('spark',14)} ${F.pattern.trim()?`Would match <b>${n.all} item${n.all===1?'':'s'}</b> (${n.so} social, ${n.we} web, ${n.em} email, ${n.sg} slides).`:'Type a pattern to see what it would match.'} Rules link at 95%; a person’s answer still wins.`;const s=$('#cnRSave');if(s)s.disabled=!(F.pattern.trim()&&F.t)};
 const bindRes=()=>$$('[data-cnrt]').forEach(b=>b.onclick=()=>{const [tt,...r]=b.dataset.cnrt.split('|'),id=r.join('|');F.t={tt,id,label:cnTLabel(tt,id)};F.q='';keep()});
 const rq=$('#cnRQ');if(rq)rq.oninput=()=>{F.q=rq.value;$('#cnRRes').innerHTML=cnResList(cnSearch(F.q,6),'cnrt');bindRes()};bindRes();
 const rx=$('#cnRTx');if(rx)rx.onclick=()=>{F.t=null;keep()};
 const sv=$('#cnRSave');if(sv)sv.onclick=()=>cnAskName(()=>{const p=P.connRuleNorm(F.type,F.pattern);if(!p||!F.t)return;cnRule({type:F.type,pattern:p,ttype:F.t.tt,tid:F.t.id,tlabel:F.t.label});const n=P.connRuleCount({type:F.type,pattern:p},cnItems()).all;S.cnRF={type:F.type,pattern:'',t:null,q:''};S.cnAdd=false;toast(`Rule added · ${n} item${n===1?'':'s'} linked · ${cnSaid()}`);keep()})}
// ---------- settings: Data & sync › Shared connections ----------
function cnSetStat(lab){const c=cnCfg(),[k]=cnState();const st=!c?['none','Not set up']:CN.net==='offline'||CN.net==='bad'?['old',CN.net==='bad'?'Key not accepted':'Offline']:CN.net==='ok'?['ok','Connected']:['due','Checking…'];
 return `<div class="srow" id="cnSetStat"><span class="sic">${SI('sync')}</span><span class="slb">${lab||'Shared connections'}<small>${!c?'Answers stay on this device until sharing is set up':c.src==='data'?'Set up by the published data'+(CN.cache.at?' · checked '+esc(cnAgo(new Date(CN.cache.at).toISOString())):''):'Set up on this device'+(CN.cache.at?' · checked '+esc(cnAgo(new Date(CN.cache.at).toISOString())):'')}${CN.queue.length?` · ${CN.queue.length} waiting to share`:''}</small></span><span class="spill ${st[0]}">${st[1]}</span></div>`}
function cnSettingsHtml(){const c=cnCfg(),l=cnLS('pulseConnSync',{})||{};return `<div class="sgt">Shared connections</div><div class="slist">${cnSetStat('Status')}
 ${c&&c.src==='data'?'':`<label class="sfld"><span>Web app URL</span><input id="cnUrl" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(l.url||'')}"></label><label class="sfld"><span>Team key</span><input id="cnKey" type="password" autocomplete="off" spellcheck="false" placeholder="From the person who set up sharing" value="${esc(l.key||'')}"></label>`}
 <label class="sfld"><span>Your name on changes</span><input id="cnWho" autocomplete="off" maxlength="30" placeholder="First name and last initial" value="${esc(cnName())}"></label>
 <div class="srow cn-setacts">${c&&c.src==='data'?'':`<button class="sact" id="cnSetSave">${c?'Save':'Connect'}</button>`}${c?'<button class="sact" id="cnSetTest">Check now</button>':''}${c&&c.src!=='data'?'<button class="stxt" id="cnSetForget">Forget</button>':''}</div></div>
 <p class="sfoot">Links, Not this answers and rules made in Connections are shared with everyone through the Strategic Events sheet. The address and key stay on this device; they are never part of the public site.</p>`}
function cnSettingsBind(){const w=$('#cnWho');if(w)w.onchange=()=>{const v=w.value.trim().slice(0,30);if(v){localStorage.pulseConnName=v;toast('Name saved')}};
 const s=$('#cnSetSave');if(s)s.onclick=async()=>{const u=$('#cnUrl').value.trim(),k=$('#cnKey').value.trim(),nm=$('#cnWho').value.trim();if(!/^https:\/\/|^http:\/\/(127\.0\.0\.1|localhost)/.test(u)){toast('Paste the web app URL (https://…)');return}if(!k){toast('Paste the team key');return}if(!nm){toast('Add your name first');$('#cnWho').focus();return}
  localStorage.pulseConnName=nm;localStorage.pulseConnSync=JSON.stringify({url:u,key:k});CN.net='';s.textContent='Connecting…';s.disabled=true;cnMigrate();await cnPull();await cnFlush();s.disabled=false;s.textContent='Save';const x=$('#cnSetStat');if(x)x.outerHTML=cnSetStat('Status');toast(CN.net==='ok'?'Connected · sharing with everyone':CN.net==='bad'?'The key was not accepted':'Could not reach it. Pulse will keep trying')};
 const t=$('#cnSetTest');if(t)t.onclick=async()=>{t.textContent='Checking…';await cnPull();await cnFlush();t.textContent='Check now';const x=$('#cnSetStat');if(x)x.outerHTML=cnSetStat()};
 const f=$('#cnSetForget');if(f)f.onclick=()=>{delete localStorage.pulseConnSync;CN.net='';toast('Sharing turned off on this device');spRefreshCn()}}
function spRefreshCn(){try{closeSettings(true);settings('data')}catch(e){}}
{const g=SET_GROUPS.find(x=>x.id==='data');if(g){const p0=g.page,b0=g.bind;g.page=()=>p0()+cnSettingsHtml();g.bind=()=>{if(b0)b0();cnSettingsBind()}}}
// ---------- start ----------
(function(){const d=document.createElement('div');d.innerHTML=`<div class="scrim cn-scrim" id="cnscrim"></div><aside class="cn-drawer" id="cnd" role="dialog" aria-modal="true" aria-hidden="true"></aside><div class="cn-mod" id="cnmod"></div>`;while(d.firstChild)document.body.appendChild(d.firstChild);
 $('#cnscrim').onclick=cnCloseDrawer;$('#cnmod').onclick=e=>{if(e.target.id==='cnmod'){e.target.classList.remove('show');e.target.innerHTML=''}};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#cnmod').classList.contains('show')){$('#cnmod').classList.remove('show');$('#cnmod').innerHTML=''}else if(CN.d)cnCloseDrawer()}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')cnTick()});
 CN.timer=setInterval(cnTick,60000);setTimeout(cnTick,1500)})();
