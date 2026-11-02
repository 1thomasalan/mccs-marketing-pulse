// ---- v45 loading indicator ----
// One thin progress bar under the header plus a small label naming the step ("Updating · Social posts").
// It only appears when work runs longer than 350 ms, stays at least 600 ms once shown, then fills and fades.
// While a source is still loading, cards waiting on it shimmer (body classes ld-data / ld-sg / ld-pl drive the CSS).
// Also: saved signage and slide plays come up from this device instantly (spWarm), and slide plays wait for the main data.
const LD={jobs:new Map(),done:0,total:0,shown:0,timer:0,hide:0,el:null,
  ui(){if(this.el)return this.el;const d=document.createElement('div');d.id='ldwrap';d.setAttribute('role','status');d.setAttribute('aria-live','polite');
    d.innerHTML='<div id="ldbar"><i></i></div><div id="ldtag"><span class="ldd"></span><span id="ldtxt">Updating</span></div>';document.body.appendChild(d);this.el=d;return d},
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
        setTimeout(()=>{if(!this.jobs.size&&!this.shown){this.done=this.total=0;this.paint()}},450)},wait+250)}},
  busy(k){return this.jobs.has(k)},
  idle(k){return new Promise(ok=>{const t=()=>this.jobs.has(k)?setTimeout(t,120):ok();t()})},
  paint(){if(!this.el)return;const p=this.total?this.done/this.total:0;const live=[...this.jobs.values()][0];
    this.el.querySelector('#ldbar i').style.transform=`scaleX(${this.jobs.size?Math.max(.08,Math.min(.94,p*.9+.06)):1})`;
    if(live&&live.label)this.el.querySelector('#ldtxt').textContent='Updating · '+live.label;else if(!this.jobs.size)this.el.querySelector('#ldtxt').textContent='Up to date'}};

// wrap the two signage loaders (defined in signage.js and plays.js) without touching those files
if(typeof sgLoad==='function'){const _sg=sgLoad;sgLoad=function(f){if(SG.loading)return SG.loading;LD.go('sg','Signage screens');const p=_sg(f);p.finally(()=>LD.end('sg'));return p}}
let LDsp=null;
if(typeof spLoad==='function'){const _sp=spLoad;spLoad=function(f){if(LDsp)return LDsp;if(SPL.loading)return SPL.loading;LD.go('pl','Slide plays');
    // plays are the heaviest file: let the main data finish first, then load them
    LDsp=(async()=>{if(LD.busy('data'))await LD.idle('data');return _sp(f)})();LDsp.finally(()=>{LD.end('pl');LDsp=null});return LDsp}}

// saved signage + plays straight from this device, before the network answers
async function spWarm(){try{if(typeof SG!=='undefined'&&!SG.data){const c=await DB.get('sg:data');if(c)SG.data=c}
  if(typeof SPL!=='undefined'&&!SPL.data){const c=await DB.get('spl:data');if(c&&c.d)SPL.data=c.d}}catch(e){}}

// shimmer placeholders
const ldSkel=(n,cls)=>Array.from({length:n},(_,i)=>`<i class="skel ${cls||''}" style="width:${[92,74,84,66,88][i%5]}%"></i>`).join('');
const ldWaiting=o=>!!localStorage.pulsePass&&!o.data&&!o.err;
if(typeof spSection==='function'){const _ss=spSection;spSection=function(){const h=_ss();if(!ldWaiting(SPL))return h;
  return h.replace(/<div class="card"><p class="mut" style="margin:0">[^<]*<\/p><\/div>/,`<div class="card skcard" aria-label="Loading slide plays"><div class="skrow">${ldSkel(1,'sknum')}</div>${ldSkel(4)}</div>`)}}
if(typeof signageView==='function'){const _sv=signageView;signageView=function(){const h=_sv();if(!ldWaiting(SG))return h;
  return h.replace(/<div class="card" style="margin-top:20px"><p class="mut" style="margin:0">[^<]*<\/p><\/div>/,`<div class="card skcard" style="margin-top:20px" aria-label="Loading signage"><div class="skrow">${ldSkel(1,'sknum')}</div>${ldSkel(3)}</div><div class="skgrid">${'<div class="card skcard">'+ldSkel(1,'skimg')+ldSkel(2)+'</div>'}${'<div class="card skcard">'+ldSkel(1,'skimg')+ldSkel(2)+'</div>'}${'<div class="card skcard">'+ldSkel(1,'skimg')+ldSkel(2)+'</div>'}</div>`)}}
