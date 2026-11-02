// ---- v46 auto-connect helpers ----
// 1) every slide gets a Connect button (slide sheet; Most played rows and What's playing tiles show one when nothing is connected)
// 2) "Connected" score + "Not connected" lists: Programs tab (posts, newsletters, slides in the range) and Signage tab (slides)
// A thing counts as connected when it has any program or event: auto (keywords, page, web paths, family tree), a rule, or a person's link.
const AC={k:'',R:null};
function acHas(key){try{if(key.startsWith('sg:')){cnItems();if(!CN.Imap.has(key))CN.Imap.set(key,P.connDesc('sg',key.slice(3)))}return cnConns(key).filter(c=>c.tt==='program'||c.tt==='event')}catch(e){return []}}
function acSlides(){const n=new Set(((SG.data&&SG.data.items)||[]).map(i=>i.name));const R=typeof spRange==='function'?spRange(S.s,S.e):null;if(R)for(const x of R.slides)n.add(x.name);return [...n]}
function acScore(){setRange();const k=[S.s,S.e,typeof cnStamp==='function'?cnStamp():'',typeof cnItemsKey==='function'?cnItemsKey():'',SPL.meta&&SPL.meta.pulled,(evData()||{}).updated].join('~');if(AC.k===k&&AC.R)return AC.R;
  const posts=gsPosts().filter(r=>r.d>=S.s&&r.d<=S.e),ems=(typeof emCamps==='function'?emCamps():[]).filter(c=>c.date&&c.date>=S.s&&c.date<=S.e),sl=acSlides();
  const part=(arr,key)=>{const miss=[];let n=0;for(const x of arr){const kk=key(x);if(acHas(kk).length)n++;else miss.push(x)}return {n,of:arr.length,miss}};
  AC.R={so:part(posts,r=>'so:'+r.id),em:part(ems,c=>'em:'+c.id),sg:part(sl,n=>'sg:'+n)};AC.k=k;return AC.R}
const acPct=o=>o.of?Math.round(o.n/o.of*100):null;
const acBar=(lab,o,ch)=>{const p=acPct(o);return `<button class="acrow" data-acmiss="${ch}" ${o.miss.length?'':'disabled'}><span class="acl">${lab}</span><span class="acb"><i style="width:${p==null?0:p}%" class="${p==null?'':p>=80?'acok':p>=50?'acmid':'aclow'}"></i></span><span class="acv">${p==null?'—':p+'%'}</span><span class="acm">${o.miss.length?`${nf(o.miss.length)} not connected ›`:o.of?'all connected':'none in range'}</span></button>`};
function acCard(which){const R=acScore();const rows=(which==='sg'?[['Slides',R.sg,'sg']]:[['Posts',R.so,'so'],['Newsletters',R.em,'em'],['Slides',R.sg,'sg']]);
  const tot=rows.reduce((a,[, o])=>[a[0]+o.n,a[1]+o.of],[0,0]),p=tot[1]?Math.round(tot[0]/tot[1]*100):null;
  return `<div class="card accard"><h2>Connected to a program or event<small>${esc(P.rangeLabel(S.s,S.e))}${p!=null&&which!=='sg'?` · ${p}% overall`:''}</small></h2>${rows.map(([l,o,c])=>acBar(l,o,c)).join('')}<p class="mut sm" style="margin:8px 0 0">Goal: 80% or more connect on their own. Tap a row to connect the rest.</p></div>`}
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
if(typeof spSlideSheet==='function'){const _s=spSlideSheet;spSlideSheet=function(name){_s(name);const body=$('#sheetBody'),sh=$('#sheet');if(!body||!sh.classList.contains('show'))return;sh.dataset.acslide=name;
  const c=acHas('sg:'+name),w=document.createElement('div');w.className='cn-sheetbtn acsl';
  w.innerHTML=`${c.length?`<div class="acon"><span class="mut sm">Connected to</span>${c.slice(0,6).map(x=>`<span class="chip sm">${esc(x.label||x.tid)}</span>`).join('')}</div>`:'<div class="acon"><span class="acwarn">Not connected yet</span></div>'}<button class="hbtn ghost sm" data-cn="sg:${esc(name)}">${hic('link',14)}${c.length?'Edit connections':'Connect to programs, events…'}</button>`;
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
