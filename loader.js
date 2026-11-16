// ---- v45 loading indicator ----
// One thin progress bar under the header plus a small label naming the step ("Updating · Social posts").
// It only appears when work runs longer than 350 ms, stays at least 600 ms once shown, then fills and fades.
// While a source is still loading, cards waiting on it shimmer (body classes ld-data / ld-sg / ld-pl drive the CSS).
// Also: saved signage and slide plays come up from this device instantly (spWarm), and slide plays wait for the main data.
const LD={err:'',jobs:new Map(),done:0,total:0,shown:0,timer:0,hide:0,el:null,
  ui(){if(this.el)return this.el;const d=document.createElement('div');d.id='ldwrap';d.setAttribute('role','status');d.setAttribute('aria-live','polite');
    d.innerHTML='<div id="ldbar"><i></i></div><div id="ldtag"><span class="ldring" aria-hidden="true"></span><span class="ldok" aria-hidden="true">✓</span><span id="ldtxt">Updating</span><span id="ldn"></span></div>';document.body.appendChild(d);this.el=d;return d},
  tv(){return typeof TV!=='undefined'&&TV.on},
  go(k,label,steps){steps=steps||1;if(this.jobs.has(k)){const j=this.jobs.get(k);this.total+=Math.max(0,steps-j.steps);j.steps=Math.max(j.steps,steps);if(label)j.label=label;this.paint();return}
    if(!this.jobs.size&&!this.shown){this.done=0;this.total=0}
    this.jobs.set(k,{label,steps,did:0});this.total+=steps;document.body.classList.add('ld-'+k);clearTimeout(this.hide);
    if(!this.shown&&!this.timer)this.timer=setTimeout(()=>{this.timer=0;if(this.jobs.size&&!this.tv()){this.shown=Date.now();this.ui().classList.add('on')}this.paint()},350);
    this.paint()},
  step(k,label){const j=this.jobs.get(k);if(!j)return;if(j.did<j.steps-1){j.did++;this.done++}if(label)j.label=label;this.paint()},
  end(k){const j=this.jobs.get(k);if(!j)return;this.done+=j.steps-j.did;this.jobs.delete(k);document.body.classList.remove('ld-'+k);this.paint();
    if(!this.jobs.size){clearTimeout(this.timer);this.timer=0;if(!this.shown){this.done=this.total=0;return}
      const wait=Math.max(0,600-(Date.now()-this.shown));this.hide=setTimeout(()=>{if(this.jobs.size)return;this.el.classList.remove('on');this.shown=0;
        setTimeout(()=>{if(!this.jobs.size&&!this.shown){this.done=this.total=0;this.paint()}},450)},wait+(this.err?2400:1100))}},
  busy(k){return this.jobs.has(k)},
  idle(k){return new Promise(ok=>{const t=()=>this.jobs.has(k)?setTimeout(t,120):ok();t()})},
  paint(){if(!this.el)return;const p=this.total?this.done/this.total:0;const live=[...this.jobs.values()][0];
    this.el.querySelector('#ldbar i').style.transform=`scaleX(${this.jobs.size?Math.max(.08,Math.min(.94,p*.9+.06)):1})`;
    const busy=this.jobs.size>0,n=this.jobs.size;
    if(live&&live.label)this.el.querySelector('#ldtxt').textContent=(live.label.startsWith('Preparing')||live.label.startsWith('Matching')?'':'Updating · ')+live.label;else if(!busy)this.el.querySelector('#ldtxt').textContent=this.err?"Couldn't update · saved data showing":'Up to date';
    const c=this.el.querySelector('#ldn');if(c)c.textContent=busy&&n>1?`+${n-1} more`:'';
    this.el.classList.toggle('busy',busy);this.el.classList.toggle('done',!busy&&!this.err);this.el.classList.toggle('ldbad',!busy&&!!this.err)}};
// v82: show the pill straight away (used before heavy work that would otherwise freeze the screen before the 350 ms timer fires)
LD.now=function(k,label){this.go(k,label);clearTimeout(this.timer);this.timer=0;if(!this.shown&&!this.tv()){this.shown=Date.now();this.ui().classList.add('on')}this.paint()};
// paint the pill (and anything already on screen), then run fn on the next turn so the user sees what is happening
function paintThen(k,label,fn){LD.now(k,label);return new Promise(ok=>requestAnimationFrame(()=>setTimeout(()=>{try{fn()}catch(e){console.warn(e)}finally{LD.end(k);ok()}},30)))}
const viewCold=v=>v==='programs'?!(typeof PGC!=='undefined'&&PGC.X):v==='events'?!(typeof EVC!=='undefined'&&EVC.M):false;
// Today-shaped placeholder shown for the first moment after opening
function bootSkel(){const card=n=>`<div class="card skcard">${ldSkel(1,'sknum')}${ldSkel(n)}</div>`;
  return `<div class="bootsk" aria-label="Loading your dashboard"><div class="card skcard bshero">${ldSkel(1,'sknum')}${ldSkel(2)}</div><div class="bsgrid">${card(1)}${card(1)}${card(1)}${card(1)}</div><div class="bsgrid two">${card(4)}${card(4)}</div></div>`}

// wrap the two signage loaders (defined in signage.js and plays.js) without touching those files
if(typeof sgLoad==='function'){const _sg=sgLoad;sgLoad=function(f){if(SG.loading)return SG.loading;LD.go('sg','Signage screens');const p=_sg(f);p.then(ch=>{if(ch&&SG.meta)DB.set('sg:meta',SG.meta)}).catch(()=>{}).finally(()=>LD.end('sg'));return p}}
let LDsp=null;
if(typeof spLoad==='function'){const _sp=spLoad;spLoad=function(f){if(LDsp)return LDsp;if(SPL.loading)return SPL.loading;LD.go('pl','Slide plays');
    // plays are the heaviest file: let the main data finish first, then load them
    LDsp=(async()=>{if(LD.busy('data'))await LD.idle('data');return _sp(f)})();LDsp.finally(()=>{LD.end('pl');LDsp=null});return LDsp}}

// saved signage + plays straight from this device, before the network answers
async function spWarm(){try{const [a,b,m]=await Promise.all([DB.get('sg:data'),DB.get('spl:data'),DB.get('sg:meta')]);
  if(typeof SG!=='undefined'&&!SG.data&&a){SG.data=a;if(m&&m.checked===a.checked&&!SG.meta)SG.meta=m}
  // v82: keep the key of the warm copy so spLoad skips the reload (and the full re-render) when nothing new was published
  if(typeof SPL!=='undefined'&&!SPL.data&&b&&b.d){SPL.data=b.d;if(!SPL.meta)SPL.meta={pulled:b.key}}}catch(e){}}

// shimmer placeholders
const ldSkel=(n,cls)=>Array.from({length:n},(_,i)=>`<i class="skel ${cls||''}" style="width:${[92,74,84,66,88][i%5]}%"></i>`).join('');
const ldWaiting=o=>!!localStorage.pulsePass&&!o.data&&!o.err;
if(typeof spSection==='function'){const _ss=spSection;spSection=function(){const h=_ss();if(!ldWaiting(SPL))return h;
  return h.replace(/<div class="card"><p class="mut" style="margin:0">[^<]*<\/p><\/div>/,`<div class="card skcard" aria-label="Loading slide plays"><div class="skrow">${ldSkel(1,'sknum')}</div>${ldSkel(4)}</div>`)}}
if(typeof signageView==='function'){const _sv=signageView;signageView=function(){const h=_sv();if(!ldWaiting(SG))return h;
  return h.replace(/<div class="card" style="margin-top:20px"><p class="mut" style="margin:0">[^<]*<\/p><\/div>/,`<div class="card skcard" style="margin-top:20px" aria-label="Loading signage"><div class="skrow">${ldSkel(1,'sknum')}</div>${ldSkel(3)}</div><div class="skgrid">${'<div class="card skcard">'+ldSkel(1,'skimg')+ldSkel(2)+'</div>'}${'<div class="card skcard">'+ldSkel(1,'skimg')+ldSkel(2)+'</div>'}${'<div class="card skcard">'+ldSkel(1,'skimg')+ldSkel(2)+'</div>'}</div>`)}}
