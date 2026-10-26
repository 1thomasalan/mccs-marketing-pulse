// MCCS Pulse share cards: vertical card (1080x1350 PNG) or slide (1920x1080 PNG + PowerPoint), drawn in the user's current theme.
(function(){
const THEMES={dusk:{s:[[0,'#c98f6b'],[.28,'#6d5a7a'],[.55,'#2b3352'],[.85,'#0e1420']],g:'#f3d9a4',n:'Dusk'},
 dawn:{s:[[0,'#ffd3a5'],[.26,'#f2a7a0'],[.56,'#8f8bc6'],[.92,'#34416e']],g:'#fff1d6',n:'Dawn'},
 ocean:{s:[[0,'#6fd6d6'],[.28,'#2b7a9e'],[.58,'#173a5e'],[.9,'#07142a']],g:'#c8f6f2',n:'Ocean'},
 forest:{s:[[0,'#b9cc8c'],[.28,'#55806a'],[.58,'#1f3b33'],[.9,'#0a1613']],g:'#e6f2c4',n:'Forest'},
 midnight:{s:[[0,'#1b2131'],[.5,'#090b11'],[.85,'#000000']],g:'#cfd8ec',n:'Midnight'}};
const SERIF='"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif',SANS='system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
const C={txt:'#eef1f6',mut:'rgba(238,241,246,.66)',line:'rgba(255,255,255,.16)',card:'rgba(10,14,26,.34)',fb:'#8fb4ff',ig:'#f3a6b8',up:'#9ee6b4',down:'#ffb0a8'};
const SH={fmt:localStorage.pulseShareFmt||'v',blob:null,model:null,busy:0};
const th=()=>THEMES[(typeof CFG!=='undefined'&&CFG.theme)||'dusk']||THEMES.dusk;

// ---------- drawing helpers ----------
function rr(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()}
function card(x,X,Y,w,h,r){rr(x,X,Y,w,h,r||28);x.fillStyle=C.card;x.fill();x.strokeStyle=C.line;x.lineWidth=2;x.stroke()}
function font(x,sz,o){o=o||{};x.font=`${o.it?'italic ':''}${o.w||400} ${sz}px ${o.serif?SERIF:SANS}`}
function spaced(x,t,X,Y,ls,align){// letter-spaced text
 const ws=[...t].map(c=>x.measureText(c).width);const tot=ws.reduce((a,b)=>a+b,0)+ls*(t.length-1);let cx=align==='right'?X-tot:X;
 [...t].forEach((c,i)=>{x.fillText(c,cx,Y);cx+=ws[i]+ls});return tot}
function wrap(x,t,w,max){const words=String(t||'').replace(/\s+/g,' ').trim().split(' ');const L=[];let cur='';
 for(const wd of words){const tryL=cur?cur+' '+wd:wd;if(x.measureText(tryL).width<=w)cur=tryL;else{if(cur)L.push(cur);cur=wd;while(x.measureText(cur).width>w&&cur.length>1){/* very long word */let k=cur.length;while(k>1&&x.measureText(cur.slice(0,k)).width>w)k--;L.push(cur.slice(0,k));cur=cur.slice(k)}}
  if(L.length>=max)break}
 if(cur&&L.length<max)L.push(cur);
 const used=L.join(' ').length;if(used<String(t||'').replace(/\s+/g,' ').trim().length&&L.length){let last=L[L.length-1];while(last&&x.measureText(last+'…').width>w)last=last.slice(0,-1);L[L.length-1]=last.replace(/[\s,.;:]+$/,'')+'…'}
 return L}
function fit(x,t,w){if(x.measureText(t).width<=w)return t;while(t&&x.measureText(t+'…').width>w)t=t.slice(0,-1);return t+'…'}
function bg(x,W,H){const t=th();x.fillStyle=t.s[t.s.length-1][1];x.fillRect(0,0,W,H);
 const rx=1.2*W,ry=.8*H;x.save();x.translate(W/2,H*1.1);x.scale(rx/ry,1);const g=x.createRadialGradient(0,0,0,0,0,ry);t.s.forEach(([o,c])=>g.addColorStop(o,c));x.fillStyle=g;x.fillRect(-W,-H*1.2,W*2,H*1.3);x.restore();
 // faint stars, as in the app
 x.fillStyle='rgba(255,255,255,.07)';let seed=7;const rnd=()=>(seed=(seed*9301+49297)%233280)/233280;for(let i=0;i<90;i++){x.beginPath();x.arc(rnd()*W,rnd()*H*.7,rnd()*1.6+.4,0,7);x.fill()}
 // soft legibility veil
 const v=x.createLinearGradient(0,0,0,H);v.addColorStop(0,'rgba(8,10,20,0)');v.addColorStop(1,'rgba(8,10,20,.28)');x.fillStyle=v;x.fillRect(0,0,W,H)}
function tag(x,plat,X,Y,sz){if(!plat)return 0;const t=plat==='fb'?'FACEBOOK':'INSTAGRAM';font(x,sz,{w:600});const w=x.measureText(t).width+1.2*(t.length-1)+sz*1.7;
 rr(x,X,Y-sz*1.15,w,sz*1.75,sz*.9);x.strokeStyle=plat==='fb'?'rgba(143,180,255,.6)':'rgba(243,166,184,.6)';x.lineWidth=2;x.stroke();x.fillStyle=plat==='fb'?C.fb:C.ig;spaced(x,t,X+sz*.85,Y,1.2);return w+sz*.6}
function header(x,m,X,Y,W,sz){const t=th();x.save();x.shadowColor=t.g;x.shadowBlur=sz;x.fillStyle=t.g;x.beginPath();x.arc(X+sz*.4,Y-sz*.36,sz*.32,0,7);x.fill();x.restore();
 font(x,sz,{w:600});x.fillStyle=C.txt;spaced(x,'MCCS PULSE',X+sz*1.3,Y,sz*.22);font(x,sz,{w:400});x.fillStyle=C.mut;x.textAlign='left';spaced(x,(m.range||'').toUpperCase(),X+W,Y,sz*.12,'right')}
function footer(x,X,Y,W,sz){const t=th();x.strokeStyle=C.line;x.lineWidth=2;x.beginPath();x.moveTo(X,Y-sz*1.6);x.lineTo(X+W,Y-sz*1.6);x.stroke();
 font(x,sz,{w:500});x.fillStyle=C.mut;spaced(x,((typeof CFG!=='undefined'&&CFG.rOrg)||'MCCS Okinawa').toUpperCase()+'  ·  DIGITAL MARKETING',X,Y,sz*.14);
 const d=new Date().toLocaleDateString('en-US',{timeZone:'Asia/Tokyo',month:'short',day:'numeric',year:'numeric'});x.fillStyle=t.g;font(x,sz,{w:400});spaced(x,'MCCS Pulse · '+d,X+W,Y,sz*.08,'right')}
function secTitle(x,t,X,Y,sz){font(x,sz,{w:600});x.fillStyle=th().g;spaced(x,t.toUpperCase(),X,Y,sz*.18)}
function stats(x,list,X,Y,W,cols,sz){if(!list||!list.length)return 0;const gap=sz*.7,cw=(W-gap*(cols-1))/cols,ch=sz*(list.some(s=>s.d)?5.1:4.1);const rows=Math.ceil(list.length/cols);
 list.forEach((s,i)=>{const cx=X+(i%cols)*(cw+gap),cy=Y+Math.floor(i/cols)*(ch+gap);card(x,cx,cy,cw,ch,sz*.9);
  font(x,sz*1.75,{w:300});x.fillStyle=C.txt;x.fillText(fit(x,String(s.v),cw-sz*1.6),cx+sz*.8,cy+sz*2.2);
  font(x,sz*.72,{w:600});x.fillStyle=C.mut;spaced(x,fit(x,s.l.toUpperCase(),cw-sz*2.2),cx+sz*.8,cy+sz*3.25,1.4);
  if(s.d){font(x,sz*.82,{w:600});x.fillStyle=s.d.up?C.up:C.down;x.fillText(s.d.txt,cx+sz*.8,cy+sz*4.4)}});
 return rows*ch+(rows-1)*gap}
function chart(x,ch,X,Y,W,H,sz){const pts=ch.pts;if(!pts||pts.length<2)return;const show=ch.show;const max=Math.max(1,...pts.map(p=>Math.max(show.fb?p.fb:0,show.ig?p.ig:0)));
 const top=Y+sz*2.2,bot=Y+H-sz*2,px=i=>X+i/(pts.length-1)*W,py=v=>bot-(v/max)*(bot-top);
 font(x,sz*.85);x.fillStyle=C.mut;x.fillText(Pulse.fmt(max),X,Y+sz*.9);
 // legend
 let lx=X+W;font(x,sz*.85,{w:500});[['ig','Instagram'],['fb','Facebook']].forEach(([k,l])=>{if(!show[k])return;const w=x.measureText(l).width;lx-=w;x.fillStyle=C.mut;x.fillText(l,lx,Y+sz*.9);lx-=sz*.9;x.fillStyle=C[k];x.beginPath();x.arc(lx+sz*.3,Y+sz*.6,sz*.3,0,7);x.fill();lx-=sz*1.2});
 x.strokeStyle='rgba(255,255,255,.08)';x.lineWidth=1.5;[0,.5,1].forEach(f=>{const yy=top+(bot-top)*f;x.beginPath();x.moveTo(X,yy);x.lineTo(X+W,yy);x.stroke()});
 ['fb','ig'].forEach(k=>{if(!show[k])return;const g=x.createLinearGradient(0,top,0,bot);g.addColorStop(0,k==='fb'?'rgba(143,180,255,.34)':'rgba(243,166,184,.34)');g.addColorStop(1,'rgba(0,0,0,0)');
  x.beginPath();pts.forEach((p,i)=>i?x.lineTo(px(i),py(p[k])):x.moveTo(px(i),py(p[k])));x.lineTo(X+W,bot);x.lineTo(X,bot);x.closePath();x.fillStyle=g;x.fill();
  x.save();x.shadowColor=C[k];x.shadowBlur=sz*.6;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(px(i),py(p[k])):x.moveTo(px(i),py(p[k])));x.strokeStyle=C[k];x.lineWidth=sz*.17;x.lineJoin='round';x.stroke();x.restore()});
 font(x,sz*.8);x.fillStyle=C.mut;const ix=[0,Math.floor((pts.length-1)/2),pts.length-1];ix.forEach((i,j)=>{x.textAlign=j===0?'left':j===2?'right':'center';x.fillText(Pulse.fmtDate(pts[i].k),px(i),Y+H-sz*.2)});x.textAlign='left'}
function bars(x,list,X,Y,W,maxH,sz){const rh=sz*2.3;const n=Math.max(0,Math.min(list.length,Math.floor(maxH/rh)));const nw=W*.42,vw=sz*4;
 list.slice(0,n).forEach((b,i)=>{const cy=Y+i*rh;font(x,sz,{w:400});x.fillStyle=C.txt;x.fillText(fit(x,b.name,nw-sz*2.4),X+sz*2,cy+sz*1.2);x.fillStyle=C[b.plat];x.beginPath();x.arc(X+sz*.6,cy+sz*.85,sz*.32,0,7);x.fill();
  const tx=X+nw,tw=W-nw-vw-sz;rr(x,tx,cy+sz*.55,tw,sz*.6,sz*.3);x.fillStyle='rgba(255,255,255,.08)';x.fill();if(b.frac>0){rr(x,tx,cy+sz*.55,Math.max(sz*.6,tw*b.frac),sz*.6,sz*.3);x.fillStyle=C[b.plat];x.fill()}
  font(x,sz,{w:600});x.fillStyle=C.txt;x.textAlign='right';x.fillText(b.val,X+W,cy+sz*1.2);x.textAlign='left'});return n*rh}
function plist(x,list,X,Y,W,maxH,sz){const rh=sz*3.2;const n=Math.max(0,Math.min(list.length,Math.floor(maxH/rh)));
 list.slice(0,n).forEach((r,i)=>{const cy=Y+i*rh;if(i){x.strokeStyle='rgba(255,255,255,.09)';x.lineWidth=1.5;x.beginPath();x.moveTo(X,cy-sz*.35);x.lineTo(X+W,cy-sz*.35);x.stroke()}
  font(x,sz*1.3,{serif:1,it:1});x.fillStyle=th().g;x.fillText(String(r.rank||i+1),X,cy+sz*1.45);
  const tx=X+sz*2.2,tw=W-sz*2.2-sz*5;font(x,sz,{w:500});x.fillStyle=C.txt;x.fillText(fit(x,r.title,tw),tx,cy+sz*1.1);
  font(x,sz*.78);x.fillStyle=C.mut;x.fillText(fit(x,r.meta,tw),tx,cy+sz*2.2);
  font(x,sz*1.15,{w:300});x.fillStyle=C.txt;x.textAlign='right';x.fillText(r.v,X+W,cy+sz*1.2);font(x,sz*.68,{w:600});x.fillStyle=C.mut;x.fillText('VIEWS',X+W,cy+sz*2.15);x.textAlign='left'});return n*rh}
function capFit(x,t,W,maxH,hi,lo){for(let s=hi;s>lo;s-=2){font(x,s,{serif:1});const lh=s*1.45;if(wrap(x,t,W,999).length*lh<=maxH)return s}return lo}
function caption(x,t,X,Y,W,maxH,sz){font(x,sz,{serif:1});x.fillStyle='rgba(238,241,246,.9)';const lh=sz*1.45;const L=wrap(x,t,W,Math.max(1,Math.floor(maxH/lh)));L.forEach((l,i)=>x.fillText(l,X,Y+sz+i*lh));return L.length*lh}
function thumbImg(img,x,X,Y,w,h,r){if(!img)return;x.save();rr(x,X,Y,w,h,r);x.clip();const s=Math.max(w/img.width,h/img.height);const iw=img.width*s,ih=img.height*s;x.drawImage(img,X+(w-iw)/2,Y+(h-ih)/2,iw,ih);x.restore();rr(x,X,Y,w,h,r);x.strokeStyle=C.line;x.lineWidth=2;x.stroke()}
function bigNum(x,m,X,Y,sz){if(!m.big)return 0;font(x,sz,{w:200});x.fillStyle=C.txt;x.save();x.shadowColor='rgba(255,255,255,.25)';x.shadowBlur=sz*.25;x.fillText(m.big.v,X,Y);x.restore();const w=x.measureText(m.big.v).width;
 font(x,sz*.24,{w:500});x.fillStyle=C.mut;spaced(x,(m.big.l||'').toUpperCase(),X+w+sz*.14,Y,sz*.02);
 if(m.big.d){font(x,sz*.22,{w:600});x.fillStyle=m.big.d.up?C.up:C.down;x.fillText(m.big.d.txt,X+w+sz*.14,Y-sz*.36)}return sz}
function note(x,m,X,Y,W,sz){if(!m.note)return 0;let cx=X;if(m.note.hi){font(x,sz,{w:700});x.fillStyle=m.note.up?C.up:C.down;x.fillText(m.note.hi,cx,Y);cx+=x.measureText(m.note.hi).width}
 font(x,sz,{w:400});x.fillStyle=C.mut;x.fillText(fit(x,m.note.rest||'',W-(cx-X)),cx,Y);return sz*1.6}
function kicker(x,m,X,Y,W,sz){const tw=tag(x,m.plat,X,Y,sz*.8);font(x,sz,{w:400});x.fillStyle=C.mut;x.fillText(fit(x,m.kicker||'',W-tw),X+tw,Y)}
function cmpNote(x,m,X,Y,sz){if(!m.cmp)return;font(x,sz,{it:1});x.fillStyle=C.mut;x.fillText('Change vs '+m.cmp,X,Y)}

// ---------- layouts ----------
function vertical(m,img){const W=1080,H=1350,P=72,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.textBaseline='alphabetic';bg(x,W,H);
 const cw=W-2*P;header(x,m,P,P+18,cw,22);let y=P+92;kicker(x,m,P,y,cw,24);y+=30;
 font(x,54,{serif:1});x.fillStyle=C.txt;const tl=wrap(x,m.title,cw,m.big?2:3);tl.forEach((l,i)=>x.fillText(l,P,y+54+i*64));y+=54+(tl.length-1)*64+28;
 if(m.big){y+=104;bigNum(x,m,P,y,116);y+=18}
 if(m.note){y+=36;note(x,m,P,y,cw,26);y+=10}
 y+=30;const vs=(m.stats||[]).slice(0,6);const sh=stats(x,vs,P,y,cw,vs.length===4?4:3,vs.length===4?22:24);y+=sh;if(sh&&m.cmp){y+=34;cmpNote(x,m,P,y,19)}y+=sh?40:0;
 const bottom=H-128;let avail=bottom-y;
 if(m.chart&&avail>220){const ch=Math.min(330,avail*(m.bars||m.list?.5:1));card(x,P,y,cw,ch,28);chart(x,m.chart,P+30,y+26,cw-60,ch-46,22);y+=ch+40;avail=bottom-y}
 if(m.thumb&&img&&avail>200){const s=Math.min(avail,300);thumbImg(img,x,P,y,s,s,24);if(m.caption){secTitle(x,'Caption',P+s+32,y+22,18);caption(x,m.caption,P+s+32,y+40,cw-s-32,s-40,24)}y+=s+40;avail=bottom-y}
 else if(m.caption&&avail>90){secTitle(x,'Caption',P,y+18,18);caption(x,m.caption,P,y+40,cw,avail-44,capFit(x,m.caption,cw,avail-44,32,24));y=bottom}
 if(m.bars&&m.bars.length&&avail>90){secTitle(x,m.barsTitle||'By account',P,y+18,18);bars(x,m.bars,P,y+40,cw,avail-40,24);y=bottom}
 else if(m.list&&m.list.length&&avail>100){secTitle(x,m.listTitle||'Top posts',P,y+18,18);plist(x,m.list,P,y+42,cw,avail-42,25);y=bottom}
 footer(x,P,H-56,cw,18);return cv}
function slide(m,img){const W=1920,H=1080,P=96,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');bg(x,W,H);
 header(x,m,P,P,W-2*P,24);const lw=780;let y=P+100;kicker(x,m,P,y,lw,26);y+=34;
 font(x,62,{serif:1});x.fillStyle=C.txt;const tl=wrap(x,m.title,lw,m.big?2:3);tl.forEach((l,i)=>x.fillText(l,P,y+62+i*74));y+=62+(tl.length-1)*74+30;
 if(m.big){y+=128;bigNum(x,m,P,y,140);y+=14}
 if(m.note){y+=40;note(x,m,P,y,lw,27);y+=6}
 y+=34;const st=(m.stats||[]).slice(0,6);const sh=stats(x,st,P,y,lw,st.length===4?2:3,24);y+=sh;if(sh&&m.cmp){y+=36;cmpNote(x,m,P,y,20)}
 // right panel
 const rx=P+lw+70,rw=W-P-rx,ry=P+60,rb=H-150,rh=rb-ry;card(x,rx,ry,rw,rh,32);const ix=rx+40,iw=rw-80;let yy=ry+40;
 const hasLow=(m.bars&&m.bars.length)||(m.list&&m.list.length);
 if(m.chart){const ch=hasLow?Math.min(380,rh*.46):rh-80;secTitle(x,m.chartTitle||'Trend',ix,yy+18,19);chart(x,m.chart,ix,yy+40,iw,ch-40,22);yy+=ch+40}
 if(m.thumb&&img){const s=Math.min(rh-80,420);thumbImg(img,x,ix,yy,s,s,24);if(m.caption){secTitle(x,'Caption',ix+s+36,yy+20,19);caption(x,m.caption,ix+s+36,yy+44,iw-s-36,rh-130,25)}yy=rb}
 else if(m.caption&&!m.chart){secTitle(x,'Caption',ix,yy+20,19);caption(x,m.caption,ix,yy+52,iw,rb-yy-90,capFit(x,m.caption,iw,rb-yy-90,40,26));yy=rb}
 if(m.bars&&m.bars.length){secTitle(x,m.barsTitle||'By account',ix,yy+18,19);bars(x,m.bars,ix,yy+44,iw,rb-yy-70,24)}
 else if(m.list&&m.list.length){secTitle(x,m.listTitle||'Top posts',ix,yy+18,19);plist(x,m.list,ix,yy+46,iw,rb-yy-70,24)}
 footer(x,P,H-58,W-2*P,20);return cv}

// ---------- render + deliver ----------
async function loadImg(id){try{if(!id||typeof thumbFor!=='function')return null;const u=await thumbFor(id);if(!u)return null;return await new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=u})}catch(e){return null}}
async function render(m,fmt){const img=m.thumb?await loadImg(m.thumb):null;return fmt==='s'?slide(m,img):vertical(m,img)}
const slug=t=>String(t||'pulse').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'pulse';
const fname=(m,ext)=>`MCCS-Pulse-${slug(m.title)}.${ext}`;
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
async function deliver(blob,name,type){const f=new File([blob],name,{type});
 try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name.replace(/\.\w+$/,'')});return 'shared'}}catch(e){if(e&&e.name==='AbortError')return 'cancel'}
 download(blob,name);return 'saved'}
const PPTX_PARTS=6;let pptxP=null;const loadPptx=()=>pptxP||(pptxP=(async()=>{if(window.PptxGenJS)return;try{const txt=(await Promise.all([...Array(PPTX_PARTS).keys()].map(i=>fetch('pptx.'+i+'.txt').then(r=>{if(!r.ok)throw 0;return r.text()})))).join('');
 await new Promise((ok,no)=>{const s=document.createElement('script');s.src=URL.createObjectURL(new Blob([txt],{type:'text/javascript'}));s.onload=ok;s.onerror=no;document.head.appendChild(s)});if(!window.PptxGenJS)throw 0}catch(e){pptxP=null;throw new Error('PowerPoint maker did not load. Check your connection.')}})());
async function pptx(m,cv){await loadPptx();const p=new PptxGenJS();p.layout='LAYOUT_WIDE';p.author='MCCS Pulse';p.company=(typeof CFG!=='undefined'&&CFG.rOrg)||'MCCS Okinawa';p.title=m.title;
 const s=p.addSlide();s.background={color:'0E1420'};s.addImage({data:cv.toDataURL('image/png'),x:0,y:0,w:13.333,h:7.5});
 s.addNotes([m.title,m.range,m.big?`${m.big.v} ${m.big.l}`:'',...(m.stats||[]).map(t=>`${t.l}: ${t.v}${t.d?' ('+t.d.txt+(m.cmp?' vs '+m.cmp:'')+')':''}`),m.note?(m.note.hi||'')+(m.note.rest||''):'','Source: MCCS Pulse'].filter(Boolean).join('\n'));
 return await p.write({outputType:'blob'})}

function box(){let b=document.getElementById('shareBox');if(b)return b;b=document.createElement('div');b.id='shareBox';b.className='shareBox';document.body.appendChild(b);return b}
async function paint(){const b=box(),m=SH.model,f=SH.fmt;const t=th();
 b.innerHTML=`<div class="shIn"><button class="close" id="shClose" aria-label="Close">×</button><h3>Share this view</h3>
  <div class="seg shSeg"><button data-f="v" class="${f==='v'?'on':''}">Vertical card</button><button data-f="s" class="${f==='s'?'on':''}">Slide 16:9</button></div>
  <div class="shPrev ${f}"><div class="shWait">Drawing…</div></div>
  <div class="shAct">${navigator.share?'<button class="btn" id="shGo">Share…</button>':''}<button class="btn" id="shImg">Save image</button>${f==='s'?'<button class="btn" id="shPpt">PowerPoint slide</button>':''}</div>
  <p class="mut sm" style="margin:12px 0 0">${f==='s'?'1920 × 1080 for Keynote, PowerPoint, or Google Slides.':'1080 × 1350, sized for phones and social posts.'} Uses your ${t.n} theme; change it in Settings.</p></div>`;
 b.classList.add('show');
 b.querySelector('#shClose').onclick=close;b.onclick=e=>{if(e.target===b)close()};
 b.querySelectorAll('[data-f]').forEach(x=>x.onclick=()=>{SH.fmt=x.dataset.f;localStorage.pulseShareFmt=SH.fmt;paint()});
 const cv=await render(m,f);if(SH.model!==m||SH.fmt!==f)return;SH.cv=cv;SH.blob=await new Promise(ok=>cv.toBlob(ok,'image/png'));
 const pv=b.querySelector('.shPrev');pv.innerHTML='';const im=new Image();im.src=URL.createObjectURL(SH.blob);im.alt='Share preview';pv.appendChild(im);
 const go=b.querySelector('#shGo');if(go)go.onclick=async()=>{const r=await deliver(SH.blob,fname(m,'png'),'image/png');if(r==='saved')toast('Image saved')};
 b.querySelector('#shImg').onclick=()=>{download(SH.blob,fname(m,'png'));toast('Image saved')};
 const pp=b.querySelector('#shPpt');if(pp)pp.onclick=async()=>{if(SH.busy)return;SH.busy=1;pp.textContent='Making slide…';try{const bl=await pptx(m,SH.cv);const r=await deliver(bl,fname(m,'pptx'),'application/vnd.openxmlformats-officedocument.presentationml.presentation');if(r!=='cancel')toast(r==='shared'?'Slide shared':'PowerPoint slide saved')}catch(e){toast(e.message||'Could not make the slide')}SH.busy=0;pp.textContent='PowerPoint slide'}}
function close(){const b=document.getElementById('shareBox');if(b)b.classList.remove('show')}
window.PulseShare={open(m){if(!m)return;SH.model=m;paint()},close,render,_vertical:vertical,_slide:slide};
})();
