// MCCS Pulse - Digital Signage (ScreenCloud). Data is published every ~15 min by the GitHub Action
// .github/workflows/signage.yml (publisher .github/signage/publish.py) into signage.json + signage.bin + sg/*.bin.
// Decryption: signage-key.json holds an ECDH P-256 private key encrypted with the Pulse passcode (PBKDF2 -> AES-GCM).
// Each blob = ephemeral public key (65) | IV (12) | AES-GCM ciphertext, AES key = ECDH shared secret.
// Loaded before app.js; uses app globals (S, DB, esc, nf, $, $$) only at call time.
const SG={meta:null,data:null,priv:null,psig:'',mem:new Map(),err:'',loading:null};
const SGC={'MCCS Program Ads':['Program','#8fb4ff'],'Sponsorship Ads':['Sponsorship','#f3d9a4'],'Green Side':['Green Side','#9fe3c4']};
const sgB64=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));
async function sgPriv(){const pass=localStorage.pulsePass;if(!pass)throw new Error('locked');if(SG.priv&&SG.psig===pass)return SG.priv;
  const kf=await (await fetch('signage-key.json',{cache:'no-store'})).json();
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
  const k=await crypto.subtle.deriveKey({name:'PBKDF2',salt:sgB64(kf.kdf.salt),iterations:kf.kdf.iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
  const pk8=await crypto.subtle.decrypt({name:'AES-GCM',iv:sgB64(kf.iv)},k,sgB64(kf.key));
  SG.priv=await crypto.subtle.importKey('pkcs8',pk8,{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);SG.psig=pass;return SG.priv}
async function sgOpen(buf){buf=new Uint8Array(buf);const priv=await sgPriv();
  const pub=await crypto.subtle.importKey('raw',buf.slice(0,65),{name:'ECDH',namedCurve:'P-256'},false,[]);
  const bits=await crypto.subtle.deriveBits({name:'ECDH',public:pub},priv,256);
  const key=await crypto.subtle.importKey('raw',bits,'AES-GCM',false,['decrypt']);
  return crypto.subtle.decrypt({name:'AES-GCM',iv:buf.slice(65,77)},key,buf.slice(77))}
async function sgLoad(force){if(SG.loading)return SG.loading;SG.loading=(async()=>{try{
    const r=await fetch('signage.json?t='+Date.now(),{cache:'no-store'});if(!r.ok){SG.err='nodata';return false}
    const m=await r.json();if(!force&&SG.data&&SG.meta&&SG.meta.checked===m.checked)return false;
    const cached=await DB.get('sg:data');
    if(cached&&cached.checked===m.checked){SG.data=cached;SG.meta=m;SG.err='';return true}
    const b=await fetch((m.file||'signage.bin')+'?c='+encodeURIComponent(m.checked),{cache:'no-store'});
    SG.data=JSON.parse(new TextDecoder().decode(await sgOpen(await b.arrayBuffer())));SG.meta=m;SG.err='';await DB.set('sg:data',SG.data);return true}
  catch(e){console.warn('signage',e);if(!SG.data){const c=await DB.get('sg:data');if(c){SG.data=c;return true}}SG.err=e.message==='locked'?'locked':'fail';return false}
  finally{SG.loading=null}})();return SG.loading}
async function sgThumb(t){if(!t)return null;if(SG.mem.has(t))return SG.mem.get(t);
  let blob=await DB.get('sgt:'+t);
  if(!blob){try{const r=await fetch(((SG.meta&&SG.meta.thumbs)||'sg/')+t+'.bin');if(!r.ok)return null;blob=new Blob([await sgOpen(await r.arrayBuffer())],{type:'image/jpeg'});DB.set('sgt:'+t,blob)}catch(e){return null}}
  const u=URL.createObjectURL(blob);SG.mem.set(t,u);return u}
function sgFill(root){(root||document).querySelectorAll('img[data-sg]').forEach(async im=>{const u=await sgThumb(im.dataset.sg);if(u){im.src=u;im.classList.add('in')}})}
const sgAgo=iso=>{if(!iso)return '';const s=(Date.now()-new Date(iso))/1e3;if(s<3600)return Math.max(1,Math.round(s/60))+'m';if(s<86400)return Math.round(s/3600)+'h';const d=Math.round(s/86400);return d<60?d+'d':d<365?Math.round(d/30)+' mo':(d/365).toFixed(1)+' yr'};
const sgName=n=>String(n).split(' - ')[0].replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
const sgTime=iso=>iso?new Date(iso).toLocaleString('en-US',{timeZone:'Asia/Tokyo',hour:'numeric',minute:'2-digit',weekday:'short',month:'short',day:'numeric'}):'';
function sgDonut(sz,st,pl){const tot=pl.reduce((a,p)=>a+p.count,0)||1,r=(sz-st)/2,C=2*Math.PI*r;let o=0;
  return `<svg width="${sz}" height="${sz}" style="overflow:visible"><circle r="${r}" cx="${sz/2}" cy="${sz/2}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="${st}"/>${pl.map(p=>{const c=(SGC[p.name]||[p.name,'#ccc'])[1],L=C*p.count/tot,s=`<circle r="${r}" cx="${sz/2}" cy="${sz/2}" fill="none" stroke="${c}" stroke-width="${st}" stroke-dasharray="${Math.max(0,L-3)} ${C}" stroke-dashoffset="${-o}" transform="rotate(-90 ${sz/2} ${sz/2})"/>`;o+=L;return p.count?s:''}).join('')}</svg>`}
function sgLegend(pl){return pl.map(p=>{const [l,c]=SGC[p.name]||[p.name,'#ccc'];return `<div><i style="background:${c}"></i>${esc(l)}<b>${p.count}</b></div>`}).join('')}
function sgTile(i){const c=(SGC[i.playlist]||['','#ccc'])[1];return `<div class="sgth" title="${esc(i.name)}"><img data-sg="${i.t||''}" alt="${esc(i.name)}"><i style="background:${c}"></i>${i.kind==='video'?'<b class="sgvid">▶</b>':''}</div>`}
function sgOffList(groups,n){const og=groups.filter(g=>g.off.length);if(!og.length)return '<p class="mut">Every screen is online.</p>';
  return og.map(g=>{const k=g.off.length;return `<div class="sgloc"><div class="sglh"><b>${esc(g.name)}</b><span class="down">${k} of ${g.total} offline</span></div><div class="sgpb"><span style="width:${Math.round(k/g.total*100)}%"></span></div>${g.off.slice(0,n).map(s=>`<div class="sgsn"><span>${esc(sgName(s.name))}</span><em>${sgAgo(s.since)}</em></div>`).join('')}${k>n?`<div class="sgsn sgmore">+${k-n} more</div>`:''}</div>`}).join('')}
function sgEmpty(){return SG.err==='locked'?'Unlock Pulse with your passcode to see signage.':SG.err==='nodata'?'Signage data starts arriving once the ScreenCloud key is added to GitHub and the first sync runs.':SG.err==='fail'?'Signage data could not be loaded. It will retry on the next refresh.':'Loading signage…'}
// ---- Pulse tab (responsive) ----
function signageView(){const d=SG.data;const head=`<div class="hero small"><h1>Signage</h1><div class="sub">ScreenCloud, across the island</div></div>`;
  if(!d)return head+`<div class="card" style="margin-top:20px"><p class="mut" style="margin:0">${sgEmpty()}</p></div>`;
  const ct=d.items.length,vids=d.items.filter(i=>i.kind==='video').length,on=d.total?Math.round(d.live/d.total*100):0;
  return `<div class="lead sglead"><div class="hero"><h1>Screens live right now</h1><div class="big sgbig">${d.live}<small> / ${d.total}</small></div><div class="sub">${d.offline} offline across ${d.groups.filter(g=>g.off.length).length} locations</div><div class="delta"><span class="mut">Updated ${sgTime(d.checked)} JST</span></div></div>
  <div class="grid">${[['Live',d.live,'up','screens playing now'],['Offline',d.offline,'down','need a look'],['Locations',d.groups.length,'','screen groups'],['In rotation',ct,'','pieces of content']].map(([l,v,c,s])=>`<div class="card kpi"><div class="l">${l}</div><div class="v ${c}">${v}</div><div class="s">${s}</div></div>`).join('')}</div><div class="card cq sgrot"><h2>Now in rotation<small>${ct} pieces</small></h2><div class="sgrb"><div class="sgdn">${sgDonut(170,18,d.playlists)}<div class="sgdc"><div class="v">${ct}</div><div class="l">pieces</div></div></div><div class="sglg">${sgLegend(d.playlists)}</div></div><div class="sgx"><div><b>${vids}</b><span>videos</span></div><div><b>${ct-vids}</b><span>stills</span></div><div><b class="${on>=90?'up':'down'}">${on}%</b><span>screens online</span></div></div><div class="sgob"><span style="width:${on}%"></span></div></div></div>
  <div class="cols sgcols sgmain"><div class="card cq sgplay"><h2>What's playing<small>${ct} pieces · ▶ video</small></h2><div class="sgwall">${d.items.map(sgTile).join('')}</div></div>
   <aside class="sgside"><div class="card cq sgneed"><h2>Needs attention<small>offline · time down</small></h2><div class="sgoff">${sgOffList(d.groups,3)}</div></div></aside></div>
  <div class="card" style="margin-top:14px"><h2>TV views<small>open on the office TV</small></h2><p class="mut sm" style="margin:0 0 12px">Full-screen dashboards that refresh themselves. Unlock once on the TV's browser.</p><div class="sgtv">${TVS.map(([k,l])=>`<a class="chip" href="?tv=${k}" target="_blank" rel="noopener">${l} ↗</a>`).join('')}</div></div>`}
const TVS=[['all','Overview'],['signage','Signage'],['social','Social'],['web','Website'],['cycle','Rotate all']];
function bindSignage(){sgFill();if(!SG.data||!SG.meta||Date.now()-new Date(SG.meta.checked)>10*6e4)sgLoad().then(ch=>{if(ch&&S.view==='signage')render()})}
(function(){const st=document.createElement('style');st.textContent=`
.sgbig small{font-size:.32em;color:var(--mut);font-weight:300;letter-spacing:0}
.sgwall{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.sgth{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:16/9;background:rgba(255,255,255,.06);border:1px solid var(--line)}
.sgth img{width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .4s}.sgth img.in{opacity:1}
.sgth i{position:absolute;left:0;top:0;bottom:0;width:4px}
.sgvid{position:absolute;right:6px;bottom:6px;font-size:10px;background:rgba(0,0,0,.6);border-radius:999px;padding:3px 7px;font-weight:400;color:#fff}
.sgloc{padding:12px 0;border-bottom:1px solid var(--line)}.sgloc:last-child{border:0}
.sglh{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.sglh b{font-weight:500}.sglh span{font-size:13px;white-space:nowrap}
.sgpb{height:7px;border-radius:7px;background:rgba(255,255,255,.08);margin:9px 0 7px;overflow:hidden}.sgpb span{display:block;height:100%;border-radius:7px;background:#ffb0a8}
.sgsn{display:flex;justify-content:space-between;gap:10px;font-size:13px;color:var(--mut);padding:2px 0}.sgsn em{font-style:normal;color:var(--glow);white-space:nowrap}.sgsn.sgmore{opacity:.75}
.sgdn{position:relative;width:170px;height:170px;margin:6px auto 14px}.sgdc{position:absolute;inset:0;display:grid;place-content:center;text-align:center}.sgdc .v{font-size:44px;font-weight:200}.sgdc .l{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--mut)}
.sglg div{display:flex;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)}.sglg div:last-child{border:0}.sglg i{width:10px;height:10px;border-radius:50%;margin-right:10px}.sglg b{margin-left:auto;font-weight:400}
.sgtv{display:flex;flex-wrap:wrap;gap:8px}.sgtv a{text-decoration:none;color:var(--txt)}
@media(max-width:520px){.sgwall{grid-template-columns:repeat(3,1fr);gap:6px}.dock{gap:4px}.dock button{padding:11px 12px;font-size:13px;gap:6px}}`;document.head.appendChild(st)})();
