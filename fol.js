// MCCS Pulse v68: follower totals (weekly counts the team enters on the Followers tab; published encrypted as payload.followers)
// rows: [{d:'YYYY-MM-DD', pl:'fb'|'ig', page, n}]
const FOL={open:false};
function folRows(){const d=typeof evData==='function'&&evData();const r=d&&d.followers&&Array.isArray(d.followers.rows)?d.followers.rows:[];
  return r.filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.d)&&(x.pl==='fb'||x.pl==='ig')&&x.page&&isFinite(+x.n)&&+x.n>0)}
// one summary per page, as of `end` (inclusive); base = last count on or before `start` (period gain)
function folSum(end,start,plat){const R=folRows().filter(x=>(!plat||plat==='all'||x.pl===plat));if(!R.length)return null;
  const first=R.reduce((m,x)=>x.d<m?x.d:m,'9999'),last=R.reduce((m,x)=>x.d>m?x.d:m,'');
  const by={};R.forEach(x=>{(by[x.pl+'|'+x.page]=by[x.pl+'|'+x.page]||[]).push(x)});
  const pages=[];Object.values(by).forEach(L=>{L.sort((a,b)=>a.d<b.d?-1:1);const upto=L.filter(x=>!end||x.d<=end);if(!upto.length)return;
    const cur=upto[upto.length-1],prev=upto.length>1?upto[upto.length-2]:null,base=start?[...L].reverse().find(x=>x.d<=start&&x.d<cur.d):null;
    pages.push({pl:cur.pl,page:cur.page,n:+cur.n,d:cur.d,prev:prev&&{n:+prev.n,d:prev.d},base:base&&{n:+base.n,d:base.d}})});
  pages.sort((a,b)=>a.pl===b.pl?b.n-a.n:a.pl==='fb'?-1:1);
  const tot=pl=>{const P_=pages.filter(p=>p.pl===pl);if(!P_.length)return null;const wp=P_.filter(p=>p.prev),wb=P_.filter(p=>p.base);
    return {pl,n:P_.reduce((a,p)=>a+p.n,0),pages:P_.length,d:P_.reduce((m,p)=>p.d>m?p.d:m,''),
      gain:wp.length?wp.reduce((a,p)=>a+p.n-p.prev.n,0):null,gainPages:wp.length,
      pgain:wb.length?wb.reduce((a,p)=>a+p.n-p.base.n,0):null,pgainPages:wb.length}};
  return {pages,fb:tot('fb'),ig:tot('ig'),first,last,asOf:pages.reduce((m,p)=>p.d>m?p.d:m,'')}}
const folD=d=>{try{return hd(d)}catch(e){return d}};
const folG=(g,cls)=>g==null?'':`<span class="folg ${g>0?'up':g<0?'dn':'eq'}${cls?' '+cls:''}">${g>0?'+':g<0?'−':'±'}${nf(Math.abs(g))}</span>`;
function folScope(F){return `Total followers on each page, counted weekly by the team (Followers tab). Latest count ${folD(F.asOf)}; totals always show the latest count, and the change over your dates needs a count from before they start. The Facebook total adds up every page, so a person who follows three pages counts three times.`}
function folPageName(p){return typeof acctName==='function'?acctName(p.pl,p.page):p.page}
function folTile(T,F,lab){if(!T)return '';const allPrev=T.gainPages===T.pages;
  return `<div class="folt"><div class="l"><span class="tag ${T.pl}">${T.pl.toUpperCase()}</span>${lab}</div><div class="v">${nf(T.n)}</div>
  <div class="d">${T.gain!=null?`${folG(T.gain)} since the last count${allPrev?'':` <span class="mut">(${T.gainPages} of ${T.pages} pages have an earlier count)</span>`}`:'<span class="mut">First count, so no change yet</span>'}</div>
  <div class="s mut">${T.pages} page${T.pages>1?'s':''} · counted ${folD(T.d)}</div></div>`}
function folPeriod(F){const T=[F.fb,F.ig].filter(Boolean),wb=T.filter(t=>t.pgain!=null);
  if(!S.s)return '';if(!wb.length)return `<p class="mut sm folp">Change over ${esc(P.rangeLabel(S.s,S.e))}: not enough history yet. Counts start ${folD(F.first)}.</p>`;
  return `<p class="sm folp">Change over ${esc(P.rangeLabel(S.s,S.e))}: ${wb.map(t=>`${t.pl==='fb'?'Facebook':'Instagram'} ${folG(t.pgain)}${t.pgainPages<t.pages?` <span class="mut">(${t.pgainPages} of ${t.pages} pages)</span>`:''}`).join(' · ')}</p>`}
function folList(F){return `<div class="scroll"><table class="folt2"><tr><th>Page</th><th>Followers</th><th>Change</th><th>Counted</th></tr>${F.pages.map(p=>`<tr><td><span class="tag ${p.pl}">${p.pl.toUpperCase()}</span>${esc(folPageName(p))}</td><td>${nf(p.n)}</td><td>${p.prev?folG(p.n-p.prev.n)+` <span class="mut sm">since ${folD(p.prev.d)}</span>`:'<span class="mut sm">first count</span>'}</td><td class="mut">${folD(p.d)}</td></tr>`).join('')}</table></div>`}
// Today: compact card with FB and IG totals, pages behind a toggle
function folToday(){const F=folSum(null,S.s);if(!F){return ''}
  return `<div class="card folc" id="folCard"><h2>Followers<small>total per platform</small></h2><div class="folts">${folTile(F.fb,F,'Facebook')}${folTile(F.ig,F,'Instagram')}</div>${folPeriod(F)}
   <p class="scope sm mut">${esc(folScope(F))}</p>${F.pages.length<2?'':`<button class="hbtn sm ghost" id="folMore" data-n="${F.pages.length}" aria-expanded="${FOL.open}">${FOL.open?'Hide pages':'Show all '+F.pages.length+' pages'}</button><div class="folpg"${FOL.open?'':' hidden'}>${folList(F)}</div>`}</div>`}
// Social: full card, follows the Facebook / Instagram filter
function folSocial(){const F=folSum(null,S.s,S.plat);if(!F)return '';
  return `<div class="card folc" id="folCard"><h2>Followers<small>${F.pages.length} page${F.pages.length>1?'s':''}</small></h2><div class="folts">${folTile(F.fb,F,'Facebook')}${folTile(F.ig,F,'Instagram')}</div>${folPeriod(F)}${folList(F)}<p class="scope sm mut">${esc(folScope(F))}</p></div>`}
// TV social: totals plus the biggest pages
function folTV(){const F=folSum();if(!F)return '';const t=x=>x?`<div class="foltv1"><span class="tag ${x.pl}">${x.pl.toUpperCase()}</span><b>${nf(x.n)}</b>${x.gain!=null?folG(x.gain):''}</div>`:'';
  return `<div class="card tvfol"><h2>Followers<small>counted ${folD(F.asOf)}</small></h2><div class="foltvt">${t(F.fb)}${t(F.ig)}</div>${F.pages.slice(0,6).map(p=>`<div class="foltvr"><span>${esc(folPageName(p))}</span><b>${nf(p.n)}</b>${p.prev?folG(p.n-p.prev.n):'<i class="mut">first</i>'}</div>`).join('')}</div>`}
function bindFol(){const b=$('#folMore');if(b)b.onclick=()=>{FOL.open=!FOL.open;const pg=$('#folCard .folpg');if(pg)pg.hidden=!FOL.open;b.setAttribute('aria-expanded',FOL.open);b.textContent=FOL.open?'Hide pages':'Show all '+b.dataset.n+' pages'}}
// place cards after render (Today: under the channel tiles; Social: above "Every account")
function folPlace(){if(TV.on)return;const app=$('#app');if(!app||$('#folCard'))return;
  if(S.view==='overview'){const t=app.querySelector('.tiles');if(t){const h=folToday();if(h){t.insertAdjacentHTML('afterend',h);bindFol()}}}
  else if(S.view==='explore'&&S.mode==='social'&&S.socSub!=='programs'){const h2=[...app.querySelectorAll('.card h2')].find(h=>/^Every account/.test(h.textContent));const h=folSocial();if(h){if(h2)h2.closest('.card').insertAdjacentHTML('beforebegin',h);else app.insertAdjacentHTML('beforeend',h)}}}
(function(){const st=document.createElement('style');st.textContent=`
.folc{grid-column:1/-1}.folc .folts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:6px 0 8px}
.folt{border:1px solid var(--line,rgba(255,255,255,.12));border-radius:14px;padding:12px 14px}.folt .l{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--mut);display:flex;gap:6px;align-items:center}
.folt .v{font-size:32px;font-weight:300;margin:4px 0;font-variant-numeric:tabular-nums}.folt .d{font-size:13.5px}.folt .s{font-size:12px;margin-top:3px}
.folg{font-weight:600;font-variant-numeric:tabular-nums}.folg.up{color:var(--good,#5fd39a)}.folg.dn{color:var(--bad,#ff7a7a)}.folg.eq{color:var(--mut)}
.folp{margin:4px 0 6px}.folc .scope{margin:6px 0 8px}.folt2 td .tag{margin-right:6px}.folt2 td:nth-child(2){font-variant-numeric:tabular-nums}
.tvfol .foltvt{display:flex;gap:28px;margin:6px 0 12px}.foltv1{display:flex;gap:10px;align-items:baseline}.foltv1 b{font-size:40px;font-weight:250}.foltv1 .folg{font-size:18px}
.foltvr{display:grid;grid-template-columns:1fr auto 70px;gap:12px;font-size:17px;padding:5px 0;border-top:1px solid rgba(255,255,255,.07)}.foltvr b{font-weight:400;font-variant-numeric:tabular-nums}.foltvr .folg,.foltvr i{text-align:right}
`;document.head.appendChild(st)})();
if(typeof render==='function'){const _r=render;render=function(){const x=_r.apply(this,arguments);try{folPlace()}catch(e){console.warn('followers',e)}return x}}
