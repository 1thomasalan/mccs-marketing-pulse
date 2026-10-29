// MCCS Pulse - TV views. Open index.html?tv=all|signage|social|web|cycle on an office TV browser.
// 1920x1080 stage scaled to the screen; refreshes data every 5 min, reloads the page every 6 h for app updates.
// Loaded before app.js; app.js render() hands off to TV.render() when TV.on. Uses app globals at call time.
const TV={v:(new URLSearchParams(location.search).get('tv')||'').toLowerCase(),on:false,i:0,timer:null};
TV.on=['all','signage','social','web','cycle'].includes(TV.v)||new URLSearchParams(location.search).has('tv');
if(TV.on&&!['all','signage','social','web','cycle'].includes(TV.v))TV.v='all';
TV.order=['all','signage','social','web'];
TV.title={all:'Overview',signage:'Digital signage',social:'Social media',web:'Website'};
TV.cur=()=>TV.v==='cycle'?TV.order[TV.i%TV.order.length]:TV.v;
TV.sRange=()=>{const end=dataEnd();S.preset='custom';S.e=end||P.todayKey();S.s=P.addDays(S.e,-29);S.plat='all';S.acct='all';setRange()};
TV.wRange=()=>{const wEnd=S.web.reduce((m,x)=>x.end>m?x.end:m,'');S.preset='custom';S.e=wEnd||P.todayKey();S.s=P.addDays(S.e,-29);setRange();return wEnd};
TV.clock=()=>new Date().toLocaleString('en-US',{timeZone:'Asia/Tokyo',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
TV.k=(l,v,d,s)=>`<div class="card tvk"><div class="l">${l}</div><div class="v">${v}</div>${d?`<div class="d">${d}</div>`:''}${s?`<div class="s">${s}</div>`:''}</div>`;
TV.split=t=>{const tv=t.v||1;return `<div class="card"><h2>Facebook vs Instagram<small>views · engagement</small></h2>${[['fb','Facebook'],['ig','Instagram']].map(([k,l])=>`<div class="tvsp"><div class="tvsph"><span><i style="background:var(--${k})"></i>${l}</span><b>${Math.round(t[k].v/tv*100)}%</b></div><div class="tvspb"><i style="width:${(t[k].v/tv*100).toFixed(1)}%;background:var(--${k})"></i></div><div class="mut sm">${P.fmt(t[k].v)} views · ${P.fmt(t[k].e)} engagements · ${t[k].n} posts</div></div>`).join('')}</div>`};
TV.posts=(L,n)=>[...L].sort((a,b)=>b.v-a.v).slice(0,n).map((r,i)=>`<div class="tvpost"><div class="tvpi"><img data-th="${esc(r.id)}" alt=""><span class="tag ${r.plat}">${r.plat==='fb'?'FB':'IG'}</span></div><div class="tvpt"><div class="t">${esc(P.label(r))}</div><div class="m">${esc(acctName(r.plat,r.page))} · ${P.fmtDate(r.d)}</div></div><div class="tvpn"><b>${P.fmt(r.v)}</b><span>views</span></div></div>`).join('');
// ---- views ----
TV.social=function(){TV.sRange();const {L,C,t,c}=ctx();const has=c.n>0;if(!S.posts.length)return `<div class="card tvmsg">No social data on this device yet.</div>`;
  const ser=P.series(L,S.s,S.e,'v');const pages=P.byPage(L).slice(0,9);const mx=Math.max(1,...pages.map(g=>g.v));
  return `<div class="tvg tvsoc"><div class="tvl"><div class="card tvhero"><h1>Social views · 30 days</h1><div class="tvbig">${P.fmt(t.v)}</div><div class="sub">${t.n} posts · ${P.rangeLabel(S.s,S.e)}</div><div class="delta">${dl(t.v,c.v,has)} <span class="mut">vs prior 30 days</span></div></div>
    <div class="tvk2">${TV.k('Engagement',P.fmt(t.e),dl(t.e,c.e,has))}${TV.k('Link clicks',nf(t.lc),dl(t.lc,c.lc,has))}${TV.k('Eng. per 1K',t.epk.toFixed(1),dl(t.epk,c.epk,has))}${TV.k('IG follows',nf(t.fo),dl(t.fo,c.fo,has))}</div>${TV.split(t)}</div>
   <div class="tvm"><div class="card tvchart"><h2>Views over time<small>by ${ser.step} · Facebook and Instagram</small></h2>${chartSVG(ser,1000,400,{both:1,fs:18,id:'tv'})}<div class="legend tvleg"><span><i style="background:var(--fb)"></i>Facebook ${P.fmt(t.fb.v)}</span><span><i style="background:var(--ig)"></i>Instagram ${P.fmt(t.ig.v)}</span></div></div>
    <div class="card tvacc"><h2>Top accounts<small>views</small></h2>${pages.map(g=>`<div class="tvbar"><span>${esc(acctName(g.plat,g.page))}</span><div><i style="width:${(g.v/mx*100).toFixed(1)}%;background:var(--${g.plat})"></i></div><b>${P.fmt(g.v)}</b></div>`).join('')}</div></div>
   <div class="card tvr"><h2>Top posts<small>by views</small></h2>${TV.posts(L,6)}</div></div>`};
TV.web=function(){const wEnd=TV.wRange();if(!S.web.length)return `<div class="card tvmsg">No website data on this device yet.</div>`;
  const {wr,wc}=wctx();const has=webHas(wr),ok=wcmp(wr,wc),t=has?wr.t:null,ct=ok?wc.t:{};
  if(!has)return `<div class="card tvmsg">Website data for this period arrives with the next weekly update.</div>`;
  const ser=webVisitSeries(wr);const pages=wr.pages.filter(p=>!P.NOISE_PAGES.includes(p[0])).slice(0,16);const pm=Math.max(1,...pages.map(p=>p[1]||0));
  return `<div class="tvg tvweb"><div class="tvl"><div class="card tvhero"><h1>Website visitors · 30 days</h1><div class="tvbig">${P.fmt(t.users)}</div><div class="sub">${P.rangeLabel(S.s,S.e)}${wr.exact?'':` · ${wr.covered} of ${wr.days} days`}</div><div class="delta">${ok?dl(t.users,ct.users,true)+' <span class="mut">vs prior 30 days</span>':'<span class="mut">data through '+P.fmtDate(wEnd,{year:'numeric'})+'</span>'}</div></div>
    <div class="tvk2">${TV.k('Visits',P.fmt(t.sessions),wdl(t.sessions,ct.sessions,ok))}${TV.k('From social',P.fmt(t.social),wdl(t.social,ct.social,ok))}${TV.k('Time on site',secs(t.eng),wdl(t.eng,ct.eng,ok))}${TV.k('New visitors',P.fmt(t.newUsers),'')}</div><div class="card"><h2>Social → website<small>this period</small></h2><div class="tvob" style="font-size:64px">${(t.sessions?t.social/t.sessions*100:0).toFixed(1)}%</div><div class="mut" style="font-size:16px;line-height:1.5">of all visits came from social media: ${P.fmt(t.social)} of ${P.fmt(t.sessions)}.</div></div></div>
   <div class="tvm"><div class="card tvchart"><h2>Visitors over time<small>by ${ser.step}</small></h2>${lineSVG([{pts:ser.pts,c:WEBC,fill:1}],1000,600)}</div>
    <div class="card"><h2>Where visits come from<small>sessions</small></h2>${srcStack(wr.groups,wr.srcList)}</div></div>
   <div class="card tvr"><h2>Top pages<small>views</small></h2>${pages.map(p=>`<div class="tvbar tvpg"><span>${esc(wTitle(p[0]))}</span><div><i style="width:${((p[1]||0)/pm*100).toFixed(1)}%;background:${WEBC}"></i></div><b>${P.fmt(p[1]||0)}</b></div>`).join('')}</div></div>`};
TV.signage=function(){const d=SG.data;if(!d)return `<div class="card tvmsg">${sgEmpty()}</div>`;const ct=d.items.length;
  return `<div class="tvg tvsg"><div class="tvl"><div class="card tvhero"><h1>Screens live right now</h1><div class="tvbig">${d.live}<small> / ${d.total}</small></div><div class="sub">${Math.round(d.live/d.total*100)}% of the island network online</div><div class="tvpills"><span><i class="g"></i>Live <b>${d.live}</b></span><span><i class="r"></i>Offline <b>${d.offline}</b></span><span>Locations <b>${d.groups.length}</b></span></div></div>
    <div class="card"><h2>Now in rotation<small>playlists</small></h2><div class="sgdn tvdn">${sgDonut(220,22,d.playlists)}<div class="sgdc"><div class="v">${ct}</div><div class="l">pieces</div></div></div><div class="sglg tvlg">${sgLegend(d.playlists)}</div></div></div>
   <div class="card tvwallc"><h2>What's playing<small>${ct} pieces · ▶ video</small></h2><div class="sgwall tvwall">${d.items.slice(0,48).map(sgTile).join('')}</div></div>
   <div class="card tvr"><h2>Needs attention<small>offline · time down</small></h2>${sgOffList(d.groups,2)}</div></div>`};
TV.all=function(){let soc='',web='',sg='';
  if(S.posts.length){TV.sRange();const {L,C,t,c}=ctx();const has=c.n>0;soc=`<div class="card tvo"><h2>Social media<small>last 30 days</small></h2><div class="tvob">${P.fmt(t.v)}</div><div class="sub">views · ${t.n} posts</div><div class="delta">${dl(t.v,c.v,has)} <span class="mut">vs prior</span></div>
    <div class="tvrow"><span>Engagement</span><b>${P.fmt(t.e)}</b></div><div class="tvrow"><span>Link clicks</span><b>${nf(t.lc)}</b></div><div class="tvrow"><span>IG follows</span><b>${nf(t.fo)}</b></div><div class="tvspark">${lineSVG([{pts:P.series(L,S.s,S.e,'v').pts.map(p=>({k:p.k,v:p.fb+p.ig})),c:'#8fb4ff',fill:1}],560,120)}</div><h3>Top posts</h3>${TV.posts(L,4)}</div>`}
  if(S.web.length){TV.wRange();const {wr,wc}=wctx();if(webHas(wr)){const t=wr.t,ok=wcmp(wr,wc);const pages=wr.pages.filter(p=>!P.NOISE_PAGES.includes(p[0])).slice(0,8);
    web=`<div class="card tvo"><h2>Website<small>last 30 days of data</small></h2><div class="tvob">${P.fmt(t.users)}</div><div class="sub">visitors</div><div class="delta">${ok?dl(t.users,wc.t.users,true)+' <span class="mut">vs prior</span>':'<span class="mut">'+P.rangeLabel(S.s,S.e)+'</span>'}</div>
    <div class="tvrow"><span>Visits</span><b>${P.fmt(t.sessions)}</b></div><div class="tvrow"><span>From social media</span><b>${P.fmt(t.social)}</b></div><div class="tvrow"><span>Time on site</span><b>${secs(t.eng)}</b></div><div class="tvspark">${lineSVG([{pts:webVisitSeries(wr).pts,c:WEBC,fill:1}],560,120)}</div><h3>Top pages</h3>${pages.map(p=>`<div class="tvrow"><span>${esc(wTitle(p[0]))}</span><b>${P.fmt(p[1]||0)}</b></div>`).join('')}</div>`}}
  const d=SG.data;if(d){sg=`<div class="card tvo"><h2>Digital signage<small>ScreenCloud · live</small></h2><div class="tvob">${d.live}<small> / ${d.total}</small></div><div class="sub">screens live</div><div class="delta"><span class="down">${d.offline} offline</span></div>
    ${d.groups.filter(g=>g.off.length).slice(0,7).map(g=>`<div class="tvrow"><span>${esc(g.name)}</span><b class="down">${g.off.length} of ${g.total}</b></div>`).join('')}<h3>In rotation · ${d.items.length}</h3><div class="sgwall tvmini">${d.items.slice(0,16).map(sgTile).join('')}</div></div>`}
  else sg=`<div class="card tvo"><h2>Digital signage</h2><p class="mut">${sgEmpty()}</p></div>`;
  return `<div class="tvg tvall">${soc||'<div class="card tvo"><h2>Social media</h2><p class="mut">No data yet.</p></div>'}${web||'<div class="card tvo"><h2>Website</h2><p class="mut">No data yet.</p></div>'}${sg}</div>`};
// ---- frame ----
TV.render=function(){const app=$('#app');if(!SG.data&&!SG.loading&&localStorage.pulsePass&&(SG.err===''||SG.err==='locked')&&!TV._sgTry){TV._sgTry=1;sgLoad().then(()=>{TV._sgTry=0;render()})}$('#dock').style.display='none';document.body.classList.add('tvmode');
  if(S.locked&&SYNC.meta){app.innerHTML=`<div class="tvlock">${topbar()}${lockScreen()}</div>`;bindLock();return}
  const v=TV.cur();const sub=v==='signage'&&SG.data?`Updated ${sgTime(SG.data.checked)}`:v==='social'?`Meta data through ${P.fmtDate(dataEnd(),{year:'numeric'})}`:'';
  app.innerHTML=`<div class="tvst" id="tvst"><div class="tvtop"><span>MCCS Pulse &nbsp;·&nbsp; ${TV.title[v]}</span><span>${sub?sub+' &nbsp;·&nbsp; ':''}${TV.clock()} JST</span></div>${TV[v]()}${TV.v==='cycle'?`<div class="tvdots">${TV.order.map(k=>`<i class="${k===v?'on':''}"></i>`).join('')}</div>`:''}</div>`;
  TV.fit();sgFill(app);app.querySelectorAll('img[data-th]').forEach(async im=>{const u=await thumbFor(im.dataset.th);if(u){im.src=u;im.classList.add('in')}else im.parentElement.classList.add('noimg')})};
TV.fit=function(){const st=$('#tvst');if(!st)return;const k=Math.min(innerWidth/1920,innerHeight/1080);st.style.transform=`translate(${(innerWidth-1920*k)/2}px,${(innerHeight-1080*k)/2}px) scale(${k})`};
TV.start=function(){addEventListener('resize',TV.fit);sgLoad().then(()=>render());
  setInterval(async()=>{await sync();const ch=await sgLoad();render()},5*6e4);
  if(TV.v==='cycle')setInterval(()=>{TV.i++;render()},45e3);
  setInterval(()=>{if(TV.v!=='cycle')render()},6e4);// keep the clock fresh
  setTimeout(()=>location.reload(),6*3600e3);
  document.addEventListener('dblclick',()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()})};
if(TV.on){const st=document.createElement('style');st.textContent=`
body.tvmode{overflow:hidden;height:100vh}body.tvmode .wrap{max-width:none;padding:0;margin:0}body.tvmode .toast{display:none}
.tvlock{max-width:520px;margin:0 auto;padding:30px}
.tvst{position:absolute;left:0;top:0;width:1920px;height:1080px;padding:34px 44px;transform-origin:0 0}
.tvtop{display:flex;justify-content:space-between;font-size:15px;letter-spacing:2.5px;text-transform:uppercase;color:var(--mut)}
.tvg{display:grid;gap:22px;margin-top:22px;height:966px}.tvg>.card,.tvl>.card,.tvm>.card{overflow:hidden}
.tvg h2{font-size:26px}.tvg h2 small{font-size:12px}
.tvsoc,.tvweb{grid-template-columns:440px 1fr 500px}.tvsg{grid-template-columns:430px 1fr 440px}.tvall{grid-template-columns:repeat(3,1fr)}
.tvl,.tvm{display:grid;gap:22px;grid-template-rows:auto 1fr;min-height:0}
.tvhero{text-align:center;padding:30px 20px}.tvhero h1{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--mut);margin:0;font-size:24px}
.tvbig{font-weight:200;font-size:124px;white-space:nowrap;line-height:1.05;margin:10px 0 6px;font-variant-numeric:tabular-nums;text-shadow:0 0 60px color-mix(in srgb,var(--glow) 35%,transparent)}.tvbig small,.tvob small{font-size:.32em;color:var(--mut);font-weight:300}
.tvg .sub{font-size:13px;letter-spacing:2.5px;text-transform:uppercase;color:var(--mut)}.tvg .delta{font-size:16px;margin-top:14px}
.tvk2{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-content:start}.tvk .l{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--mut)}.tvk .v{font-size:44px;font-weight:250;margin:8px 0 4px;font-variant-numeric:tabular-nums}.tvk .d{font-size:15px}
.tvleg{font-size:16px}.tvchart .chart{max-height:400px}
.tvbar{display:grid;grid-template-columns:200px 1fr 90px;gap:14px;align-items:center;font-size:18px;padding:10px 0}.tvbar span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tvbar div{height:10px;border-radius:10px;background:rgba(255,255,255,.07)}.tvbar i{display:block;height:100%;border-radius:10px}.tvbar b{text-align:right;font-weight:400}
.tvpg{grid-template-columns:1fr 110px 80px;padding:9px 0;font-size:17px;border-bottom:1px solid var(--line)}
.tvpost{display:grid;grid-template-columns:120px 1fr auto;gap:14px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}.tvpost:last-child{border:0}
.tvpi{position:relative;width:120px;height:120px;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.06)}.tvpi img{width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s}.tvpi img.in{opacity:1}.tvpi .tag{position:absolute;left:6px;top:6px}
.tvpt .t{font-size:17px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.tvpt .m{font-size:13px;color:var(--mut);margin-top:6px}
.tvpn{text-align:right}.tvpn b{display:block;font-size:24px;font-weight:300}.tvpn span{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--mut)}
.tvpills{display:flex;gap:8px;justify-content:center;margin-top:20px}.tvpills span{padding:8px 14px;border-radius:999px;border:1px solid var(--line);font-size:15px;color:var(--mut)}.tvpills b{color:var(--txt);margin-left:6px;font-weight:500}.tvpills i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px}.tvpills i.g{background:#9ee6b4}.tvpills i.r{background:#ffb0a8}
.tvdn{width:220px;height:220px}.tvlg div{font-size:17px}
.tvwall{grid-template-columns:repeat(6,1fr)}.sgloc .sglh{font-size:19px}
.tvo{display:flex;flex-direction:column}.tvo .delta{align-self:flex-start}.tvspark{margin:14px 0 0}.tvspark .wax{font-size:12px}
.tvsp{margin:10px 0 16px}.tvsph{display:flex;justify-content:space-between;font-size:18px}.tvsph i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px}.tvsph b{font-weight:400}.tvspb{height:10px;border-radius:10px;background:rgba(255,255,255,.07);margin:8px 0 6px}.tvspb i{display:block;height:100%;border-radius:10px}
.tvweb .wleg span,.tvweb .wleg{font-size:17px}.tvweb .wstack{height:16px}.tvob{font-weight:200;font-size:96px;line-height:1;margin:8px 0 6px;font-variant-numeric:tabular-nums}
.tvo h3{font-family:var(--serif);font-weight:400;font-size:20px;margin:22px 0 6px}
.tvrow{display:flex;justify-content:space-between;gap:12px;font-size:17px;padding:9px 0;border-bottom:1px solid var(--line)}.tvrow span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--mut)}.tvrow b{font-weight:400;white-space:nowrap}
.tvo .tvpost{grid-template-columns:84px 1fr auto;padding:8px 0}.tvo .tvpi{width:84px;height:84px}.tvo .tvpt .t{font-size:15px;-webkit-line-clamp:2}
.tvsoc .tvl,.tvweb .tvl{grid-template-rows:auto auto 1fr}.tvweb .tvm{grid-template-rows:1fr auto}
.tvmini{grid-template-columns:repeat(4,1fr);gap:8px}
.tvmsg{grid-column:1/-1;font-size:24px;color:var(--mut);display:grid;place-items:center}
.tvdots{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:8px}.tvdots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.25)}.tvdots i.on{background:var(--glow)}`;document.head.appendChild(st)}
