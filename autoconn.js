// ---- v46 auto-connect helpers ----
// 1) every slide gets a Connect button (slide sheet; Most played rows and What's playing tiles show one when nothing is connected)
// 2) "Connected" score + "Not connected" lists: Programs tab (posts, newsletters, slides in the range) and Signage tab (slides)
// A thing counts as connected when it has any program or event: auto (keywords, page, web paths, family tree), a rule, or a person's link.
const AC={k:'',R:null};
var acHas=function(key){try{if(key.startsWith('sg:')){cnItems();if(!CN.Imap.has(key))CN.Imap.set(key,P.connDesc('sg',key.slice(3)))}return cnConns(key).filter(c=>c.tt==='program'||c.tt==='event')}catch(e){return []}};
function acSlides(){const n=new Set(((SG.data&&SG.data.items)||[]).map(i=>i.name));const R=typeof spRange==='function'?spRange(S.s,S.e):null;if(R)for(const x of R.slides)n.add(x.name);return [...n]}
function acScore(){setRange();const k=[S.s,S.e,typeof cnStamp==='function'?cnStamp():'',typeof cnItemsKey==='function'?cnItemsKey():'',SPL.meta&&SPL.meta.pulled,(evData()||{}).updated].join('~');if(AC.k===k&&AC.R)return AC.R;
  const posts=gsPosts().filter(r=>r.d>=S.s&&r.d<=S.e),ems=(typeof emCamps==='function'?emCamps():[]).filter(c=>c.date&&c.date>=S.s&&c.date<=S.e),sl=acSlides();
  const part=(arr,key)=>{const miss=[];let n=0;for(const x of arr){const kk=key(x);if(acHas(kk).length)n++;else miss.push(x)}return {n,of:arr.length,miss}};
  AC.R={so:part(posts,r=>'so:'+r.id),em:part(ems,c=>'em:'+c.id),sg:part(sl,n=>'sg:'+n)};AC.k=k;return AC.R}
const acPct=o=>o.of?Math.round(o.n/o.of*100):null;
const acBar=(lab,o,ch)=>{const p=acPct(o);return `<button class="acrow" data-acmiss="${ch}" ${o.miss.length?'':'disabled'}><span class="acl">${lab}</span><span class="acb"><i style="width:${p==null?0:p}%" class="${p==null?'':p>=80?'acok':p>=50?'acmid':'aclow'}"></i></span><span class="acv">${p==null?'—':p+'%'}</span><span class="acm">${o.miss.length?`${nf(o.miss.length)} not connected ›`:o.of?'all connected':'none in range'}</span></button>`};
function acCard(which){const R=acScore();const rows=(which==='sg'?[['Slides · in rotation now',R.sg,'sg']]:[['Posts',R.so,'so'],['Newsletters',R.em,'em'],['Slides · in rotation now',R.sg,'sg']]);
  const tot=rows.reduce((a,[, o])=>[a[0]+o.n,a[1]+o.of],[0,0]),p=tot[1]?Math.round(tot[0]/tot[1]*100):null;
  return `<div class="card accard"><h2>Connected to a program, event or sponsor<small>${which==='sg'?'slides in rotation now':`${esc(P.rangeLabel(S.s,S.e))}${p!=null?` · ${p}% overall`:''}`}</small></h2>${which==='sg'?'':scopeLine([`posts and newsletters: ${esc(P.rangeLabel(S.s,S.e))}`,{t:'slides: in rotation now, not date-based',w:1}],'bscope')}${rows.map(([l,o,c])=>acBar(l,o,c)).join('')}<p class="mut sm" style="margin:8px 0 0">Goal: 80% or more connect on their own. Tap a row to connect the rest.</p></div>`}
function acMissSheet(ch){const R=acScore(),o=R[ch];if(!o)return;const L=o.miss;
  const row=(key,title,sub,th)=>`<div class="acit"><button class="acopen" data-acopen="${esc(key)}">${th||''}<span><b>${esc(title)}</b><small>${esc(sub)}</small></span></button><button class="hbtn ghost sm" data-cn="${esc(key)}">${hic('link',13)}Connect</button></div>`;
  const items=ch==='so'?L.slice().sort((a,b)=>b.v-a.v).slice(0,150).map(r=>row('so:'+r.id,P.label(r),`${r.plat==='ig'?'Instagram':'Facebook'} · ${acctName(r.plat,r.page)} · ${P.fmtDate(r.d)} · ${P.fmt(r.v)} views`))
    :ch==='em'?L.map(c=>row('em:'+c.id,c.name,`Newsletter · sent ${P.fmtDate(c.date,{year:'numeric'})}`))
    :L.map(n=>{const it=((SG.data&&SG.data.items)||[]).find(i=>i.name===n);return row('sg:'+n,sgName(n),it?'Slide · in rotation now':'Slide · played in this range',it&&it.t?`<span class="acth"><img data-sg="${it.t}" alt=""></span>`:'<span class="acth"></span>')});
  openSheet(`<h3>Not connected · ${ch==='so'?'posts':ch==='em'?'newsletters':'slides'}</h3><p class="mut sm" style="margin:-6px 0 12px">${esc(P.rangeLabel(S.s,S.e))} · ${nf(L.length)} item${L.length===1?'':'s'}${ch==='so'&&L.length>150?' · top 150 by views':''}. Connect each one, or add its key word to the program's Keywords in the Programs sheet so it connects on its own next time.</p><div class="aclist">${items.join('')}</div>`);
  const b=$('#sheetBody');if(typeof sgFill==='function')sgFill(b);
  b.querySelectorAll('[data-acopen]').forEach(x=>x.onclick=()=>{const k=x.dataset.acopen,id=k.slice(3);if(k.startsWith('so:'))postSheet(id);else if(k.startsWith('em:'))emailCampSheet(id);else spSlideSheet(id)})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-acmiss]');if(!b||b.disabled)return;e.preventDefault();acMissSheet(b.dataset.acmiss)});
// refresh scores after a connect (the drawer closes back to the page)
if(typeof cnCloseDrawer==='function'){const _c=cnCloseDrawer;cnCloseDrawer=function(){_c.apply(this,arguments);AC.k='';const sh=$('#sheet');if(!sh||!sh.classList.contains('show'))return;const h=$('#sheetBody h3');if(h&&/^Not connected/.test(h.textContent)){const ch=/posts/.test(h.textContent)?'so':/newsletters/.test(h.textContent)?'em':'sg';acMissSheet(ch)}else if(sh.dataset.acslide)spSlideSheet(sh.dataset.acslide)}}
// slide sheet: what it's connected to + Connect button
if(typeof spSlideSheet==='function'){const _s=spSlideSheet;spSlideSheet=function(name){_s.apply(this,arguments);const body=$('#sheetBody'),sh=$('#sheet');if(!body||!sh.classList.contains('show'))return;sh.dataset.acslide=name;
  const c=acHas('sg:'+name),w=document.createElement('div');w.className='cn-sheetbtn acsl';
  w.innerHTML=`${c.length?`<div class="acon"><span class="mut sm">Connected to</span>${c.slice(0,6).map(x=>x.tt==='sponsor'?`<span class="acpd" style="margin:0">${hic('tag',11)}Paid ad · ${esc(x.label||x.tid)}</span>`:`<span class="chip sm">${esc(x.label||x.tid)}</span>`).join('')}</div>`:'<div class="acon"><span class="acwarn">Not connected yet</span></div>'}<button class="hbtn ghost sm" data-cn="sg:${esc(name)}">${hic('link',14)}${c.length?'Edit connections':'Connect to programs, events…'}</button>`;
  const p=body.querySelector('h3+p')||body.querySelector('h3');if(p)p.after(w);else body.prepend(w)}}
if(typeof closeSheet==='function'){const _cs=closeSheet;closeSheet=function(){const sh=$('#sheet');if(sh)delete sh.dataset.acslide;return _cs.apply(this,arguments)}}
// tiles and rows: a small Connect button only on slides with nothing connected
if(typeof spBindTiles==='function'){const _b=spBindTiles;spBindTiles=function(){_b.apply(this,arguments);if(typeof TV!=='undefined'&&TV.on)return;
  $$('.sprow[data-slide]').forEach(el=>{if(el.querySelector('.acnc'))return;const n=el.dataset.slide;if(acHas('sg:'+n).length)return;const s=el.querySelector('.spn span');if(s)s.insertAdjacentHTML('beforeend',` <button class="acnc" data-cn="sg:${esc(n)}">${hic('link',11)}Connect</button>`)});
  $$('.sgplay .sgth[title]').forEach(el=>{if(el.querySelector('.acnc'))return;const n=el.title;if(acHas('sg:'+n).length)return;el.insertAdjacentHTML('beforeend',`<button class="acnc on" data-cn="sg:${esc(n)}" aria-label="Connect this slide">${hic('link',11)}Connect</button>`)})}}
// Signage tab: slide score under Slide plays
if(typeof spSection==='function'){const _ss=spSection;spSection=function(){const h=_ss();if(!localStorage.pulsePass||!evData()||(!SG.data&&!SPL.data))return h;let c='';try{c=acCard('sg')}catch(e){console.warn('connect score',e)}return h.replace(/<\/section>\s*$/,c+'</section>')}}
// Programs tab (list): the three channel scores above the list
if(typeof bindProg==='function'){const _bp=bindProg;bindProg=function(){_bp.apply(this,arguments);if(S.progSub==='detail'||$('#app .accard')||!evData())return;const anchor=$('#app .ctl');if(!anchor)return;
  const d=document.createElement('div');try{d.innerHTML=acCard('all')}catch(e){console.warn('connect score',e);return}anchor.parentNode.insertBefore(d.firstElementChild,anchor.nextSibling)}}
// ---- v48 paid ads: outside sponsors (Sponsors tab) as a connection target, kept apart from MCCS promotions ----
HI.tag='<path d="M3 12V4h8l9 9-8 8-9-9z"/><circle cx="7.5" cy="8.5" r="1.4"/>';
CNT.sponsor={l:'Sponsor (paid ad)',g:'Paid ads',i:'tag',c:'spo'};
const acSpons=()=>{const d=evData();const L=(d&&Array.isArray(d.sponsors)&&d.sponsors.length)?d.sponsors:P.spoParse(null);return L.some(x=>x.id==='paid-other')?L:[...L,...P.spoParse(null)]};
{const _t=cnTargets;cnTargets=function(){const T=_t();if(!T._sp){for(const s of acSpons())T.push({tt:'sponsor',id:s.id,label:s.name,sub:'Paid ad'+(s.cat?' · '+s.cat:'')});T._sp=1}return T}}
{const _l=cnTLabel;cnTLabel=function(tt,tid,fb){if(tt==='sponsor'){const s=acSpons().find(x=>x.id===tid);return s?s.name:fb||tid}return _l.apply(this,arguments)}}
// automatic sponsor match: sponsor name or keyword in the item's text (for slides, the file name plus the words read off the slide), inside the contract dates when given
{const _c=cnConns;cnConns=function(key){const out=_c(key);try{const K='\u0001',have=new Set(out.map(o=>o.tt+K+o.tid));const blocked=new Set(P.connOf(cnApplied(),key).filter(c=>c.state==='blocked').map(c=>c.ttype+K+c.tid));
  const d=cnDesc(key)||(key.startsWith('sg:')?P.connDesc('sg',key.slice(3)):null);if(!d)return out;const it=cnInfo(key),dt=it&&it.d;
  for(const s of acSpons()){if(have.has('sponsor'+K+s.id)||blocked.has('sponsor'+K+s.id))continue;if(dt&&((s.s&&dt<s.s)||(s.e&&dt>s.e)))continue;const k=P.spoKw(s).find(k=>d.text.includes(' '+k+' '));if(k)out.push({tt:'sponsor',tid:s.id,label:s.name,src:'auto',why:'sponsor name “'+k+'”',rm:1})}}catch(e){console.warn('sponsor match',e)}return out}}
const acPaid=key=>{try{return acHas(key).filter(c=>c.tt==='sponsor')}catch(e){return []}};
// a sponsor counts as connected too
acHas=function(key){try{if(key.startsWith('sg:')){cnItems();if(!CN.Imap.has(key))CN.Imap.set(key,P.connDesc('sg',key.slice(3)))}return cnConns(key).filter(c=>c.tt==='program'||c.tt==='event'||c.tt==='sponsor')}catch(e){return []}};
// Signage tab: paid ads vs MCCS promotions, by slide plays in the range
function acPaidCard(){const R=typeof spRange==='function'?spRange(S.s,S.e):null;if(!R||!R.slides||!R.slides.length)return '';let pp=0,mp=0,pn=0,mn=0;const by=new Map();
  for(const x of R.slides){const ps=acPaid('sg:'+x.name);if(ps.length){pp+=x.p;pn++;const s=ps[0];const o=by.get(s.tid)||{l:s.label,p:0,n:0};o.p+=x.p;o.n++;by.set(s.tid,o)}else{mp+=x.p;mn++}}
  const tot=pp+mp||1,pct=Math.round(pp/tot*100),L=[...by.values()].sort((a,b)=>b.p-a.p).slice(0,6);
  return `<div class="card accard acpaid"><h2>MCCS promotions vs paid ads<small>${esc(P.rangeLabel(S.s,S.e))} · slide plays</small></h2>
   <div class="acsplit"><i style="width:${100-pct}%"></i><b style="width:${pct}%"></b></div>
   <div class="acleg"><span><i class="m"></i>MCCS promotions <em>${hk(mp)} plays · ${nf(mn)} slide${mn===1?'':'s'} · ${100-pct}%</em></span><span><i class="p"></i>Paid ads <em>${hk(pp)} plays · ${nf(pn)} slide${pn===1?'':'s'} · ${pct}%</em></span></div>
   ${Math.abs(pp+mp-R.t)>R.t*.01?`<p class="mut sm" style="margin:8px 0 0">This split adds up each slide's own plays (${hk(pp+mp)}). “In this range” (${hk(R.t)}) is ScreenCloud's daily file-play total, a separate count in the play logs, so the two can differ.</p>`:''}
   ${L.length?`<div class="acspl">${L.map(o=>`<div class="spl"><span>${esc(o.l)}</span><div class="spb"><i style="width:${Math.max(2,o.p/L[0].p*100)}%;background:#c9b6ff"></i></div><em>${hk(o.p)}</em></div>`).join('')}</div>`:`<p class="mut sm" style="margin:8px 0 0">No slides are tagged as paid ads yet. Add sponsors to the Sponsors tab, or tap Connect on a slide and pick a sponsor.</p>`}</div>`}
if(typeof spSection==='function'){const _ss2=spSection;spSection=function(){const h=_ss2();if(!localStorage.pulsePass||(!SG.data&&!SPL.data))return h;let c='';try{c=acPaidCard()}catch(e){console.warn('paid card',e)}return c?h.replace(/(<div class="card accard">)/,c+'$1').replace(/<\/section>\s*$/,m=>h.includes('class="card accard"')?m:c+m):h}}
// slide rows and tiles: a "Paid ad" badge
{const _b2=spBindTiles;spBindTiles=function(){_b2.apply(this,arguments);if(typeof TV!=='undefined'&&TV.on)return;
  $$('.sprow[data-slide]').forEach(el=>{if(el.querySelector('.acpd'))return;const ps=acPaid('sg:'+el.dataset.slide);if(!ps.length)return;const s=el.querySelector('.spn span');if(s)s.insertAdjacentHTML('beforeend',` <span class="acpd">${hic('tag',11)}Paid ad · ${esc(ps[0].label)}</span>`)});
  $$('.sgplay .sgth[title]').forEach(el=>{if(el.querySelector('.acpd'))return;if(acPaid('sg:'+el.title).length)el.insertAdjacentHTML('beforeend',`<span class="acpd on">${hic('tag',11)}Paid ad</span>`)})}}
// ---- v49 feedback: every action answers right away, where the finger is, with Undo when it can be undone ----
const FX={last:null};
const fxFresh=k=>FX.last&&Date.now()-FX.last.t<6000&&(!k||FX.last.item===k);
const fxBuzz=t=>{try{if(navigator.vibrate)navigator.vibrate(t==='err'?[20,40,20]:12)}catch(e){}};
toast=function(m,o){o=o||{};m=String(m);const t=$('#toast');if(!t)return;
  const type=o.type||(/^(Not saved|Could ?n|Couldn|Error|Failed|That item is not)/i.test(m)?'err':/^(Connected|Linked|Saved|Settings saved|Removed|Kept|Got it|Backup saved|Erased|Copied|Done|Your change|Passcode forgotten|\d+ earlier)/i.test(m)?'ok':'info');
  t.className='toast t-'+type;t.setAttribute('role',type==='err'?'alert':'status');t.setAttribute('aria-live',type==='err'?'assertive':'polite');
  t.innerHTML=`<span class="ti">${hic(type==='err'?'alert':type==='ok'?'check':'pulse',16)}</span><span class="tm"></span>${o.undo?`<button class="tu" type="button">${esc(o.act||'Undo')}</button>`:''}`;t.querySelector('.tm').textContent=m;
  if(o.undo)t.querySelector('.tu').onclick=()=>{clearTimeout(t._h);t.classList.remove('show');o.undo()};
  t.classList.remove('show');void t.offsetWidth;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),o.undo?6000:type==='err'?5000:2800);if(type!=='info')fxBuzz(type)};
// remember the last connect/remove so the drawer, toast and page can show it
{const _ch=cnChange;cnChange=function(c,o){const lid=_ch.apply(this,arguments);if(c&&(c.act==='link'||c.act==='unlink')&&c.src!=='undo'&&c.src!=='rule')FX.last={t:Date.now(),lid,item:c.item,tt:c.ttype,tid:String(c.tid),label:c.tlabel||cnTLabel(c.ttype,c.tid),act:c.act};
  setTimeout(()=>fxPage(c&&c.item),0);return lid}}
function fxUndo(){const f=FX.last;if(!f)return;FX.last=null;const r=cnRowByLid(f.lid);
  const go=()=>{if(r)cnUndo(r);else cnChange({item:f.item,ttype:f.tt,tid:f.tid,tlabel:f.label,act:f.act==='link'?'unlink':'link',src:'undo'});
   if(CN.d)cnDrawer();fxPage(f.item);toast((f.act==='link'?'Undone · '+f.label+' removed':'Undone · '+f.label+' is back'),{type:'ok'})};
  typeof cnAskName==='function'?cnAskName(go):go()}
// the old one-line toasts for connect/remove become specific, with Undo. In the drawer the answer shows in the drawer instead.
{const _t=toast;toast=function(m,o){if(/^(Connected|Removed) · /.test(String(m))&&fxFresh()){const f=FX.last,said=String(m).split(' · ').slice(1).join(' · ');if(CN.d&&CN.d.key===f.item){fxBuzz('ok');return}
  return _t((f.act==='link'?'Connected to ':'Removed ')+f.label+(said?' · '+said:''),{type:'ok',undo:fxUndo})}return _t(m,o)}}
// drawer: a banner at the top and the new chip pops
{const _d=cnDrawer;cnDrawer=function(){const r=_d.apply(this,arguments);try{const d=CN.d,el=$('#cnd');if(!d||!el||!fxFresh(d.key))return r;const f=FX.last,b=el.querySelector('.dr-b');
  if(b&&!b.querySelector('.acfx')){b.insertAdjacentHTML('afterbegin',`<div class="acfx ${f.act==='link'?'ok':'rm'}" role="status" aria-live="polite"><span class="ck">${hic(f.act==='link'?'check':'link',16)}</span><span class="tx">${f.act==='link'?'Connected to':'Removed'} <b></b></span><button class="tu" type="button">Undo</button></div>`);
   const x=b.querySelector('.acfx');x.querySelector('b').textContent=f.label;x.querySelector('.tu').onclick=fxUndo;if(Date.now()-f.t<700)b.scrollTop=0}
  if(f.act==='link'){const c=el.querySelector(`[data-cnchip="${CSS.escape(f.tt+'|'+f.tid)}"]`);const tc=c&&c.closest('.cn-tc');if(tc&&Date.now()-f.t<1500)tc.classList.add('just')}}catch(e){console.warn('fx drawer',e)}return r}}
// the page behind: the open sheet and the row update in place, with a short green confirmation
function fxPage(key){if(!key)return;try{const sh=$('#sheet');
  if(sh&&sh.classList.contains('show')){const n=sh.dataset.acslide;if(n&&'sg:'+n===key&&typeof spSlideSheet==='function'){const b=$('#sheetBody'),y=b?b.scrollTop:0;spSlideSheet(n);const b2=$('#sheetBody');if(b2)b2.scrollTop=y;const a=b2&&b2.querySelector('.acsl');if(a)a.classList.add('fxok')}
   else $$(`#sheetBody [data-cn="${CSS.escape(key)}"]`).forEach(btn=>{const has=acHas(key).length||cnConns(key).length;btn.innerHTML=`${hic(has?'check':'link',14)}${has?'Connected · edit':'Connect'}`;btn.classList.toggle('fxok',!!has)})}
  const has=acHas(key).length;
  $$(`.acnc[data-cn="${CSS.escape(key)}"]`).forEach(b=>{if(!has)return;b.outerHTML=`<span class="acok${b.classList.contains('on')?' on':''}">${hic('check',11)}Connected</span>`});
  $$(`.cn-cbtn[data-cn="${CSS.escape(key)}"]`).forEach(b=>{b.classList.remove('fxok');void b.offsetWidth;b.classList.add('fxok')});
  setTimeout(()=>$$('.acok').forEach(x=>x.classList.add('gone')),2600);setTimeout(()=>$$('.acok.gone').forEach(x=>x.remove()),3200)}catch(e){console.warn('fx page',e)}}
{const _c=cnCloseDrawer;cnCloseDrawer=function(){const k=CN.d&&CN.d.key;const r=_c.apply(this,arguments);if(k)fxPage(k);return r}}
// ---- v50 Connect buttons say what they do: "Connect" when nothing is linked, "Edit connections" (with a check) when something is ----
function fxConnN(key){try{return cnConns(key).filter(c=>c.tt!=='fb_account'&&c.tt!=='ig_account').length}catch(e){return 0}}
function fxLabelBtns(root){try{(root||document).querySelectorAll('.cn-cbtn[data-cn]').forEach(b=>{const n=fxConnN(b.dataset.cn);const st=n?'on':'off';if(b.dataset.st===st)return;b.dataset.st=st;b.classList.toggle('has',!!n);
   b.innerHTML=n?hic('check',12)+'Edit connections':hic('link',12)+'Connect';b.setAttribute('aria-label',n?`Edit connections (${n} connected)`:'Connect')});
  (root||document).querySelectorAll('.cn-sheetbtn > [data-cn]').forEach(b=>{if(b.closest('.acsl'))return;const n=fxConnN(b.dataset.cn);b.classList.toggle('has',!!n);b.innerHTML=n?`${hic('check',14)}Edit connections · ${n} connected`:`${hic('link',14)}Connect to programs, events…`})}catch(e){console.warn('fx labels',e)}}
{const _dc=cnDecorate;cnDecorate=function(root){const r=_dc.apply(this,arguments);fxLabelBtns(root);return r}}
{const _p=postSheet;postSheet=function(){const r=_p.apply(this,arguments);fxLabelBtns($('#sheetBody'));return r}}
{const _e=emailCampSheet;emailCampSheet=function(){const r=_e.apply(this,arguments);fxLabelBtns($('#sheetBody'));return r}}
{const _fp=fxPage;fxPage=function(k){_fp(k);$$('.cn-cbtn[data-cn]').forEach(b=>{if(b.dataset.cn===k)delete b.dataset.st});fxLabelBtns()}}
