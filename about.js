// MCCS Digital Pulse v64: Settings › How Pulse works. A plain BLUF for leadership: what Pulse shows, where each number comes from,
// when it updates, who runs it, and links to every place the data lives (no black box). Edit ABOUT_* when a source or link changes.
const ABOUT_BLUF=[
 ['What it is','One place for MCCS Okinawa marketing results and event plans: social media, website, email, digital signage, strategic events and the Wrike production calendar.'],
 ['Read-only','Pulse only reads. It can’t post, change or delete anything in Facebook, Instagram, Google Analytics, Constant Contact, ScreenCloud or Wrike.'],
 ['Real numbers','Every figure comes from the platform’s own export or report. Pulse adds them up and compares them. It doesn’t estimate, and every screen says which data it shows.'],
 ['When','Weekly on Mondays for social, website, email, events and Wrike. Signage refreshes itself every 15 minutes, and slide plays nightly.'],
 ['Who','Alan exports the files Monday morning. An automated publish run by Hark, Alan’s AI assistant, checks, encrypts and posts them at 13:00, 15:00 and 17:00 JST.'],
 ['Secure','Data is encrypted (AES-256) before it’s stored online, so only devices unlocked with the team passcode can read it. The app’s code is public; the numbers aren’t.'],
 ['On this device','A copy is kept in this browser so Pulse opens fast. Settings › Danger zone erases it.']];
const ABOUT_SRC=[
 ['Facebook & Instagram','Meta Business Suite content exports, year to date','Alan, every Monday'],
 ['Website','Google Analytics 4 reports (traffic and pages)','Alan, every Monday'],
 ['Email','Constant Contact newsletter reports','Alan, after each send'],
 ['Digital signage','ScreenCloud, read automatically','Every 15 minutes; slide plays nightly 01:20 JST'],
 ['Strategic events & programs','The MCCS Pulse Strategic Events Google Sheet','Alan edits it; read at each publish'],
 ['Production calendar','Wrike Event Calendar export (Excel)','Alan, every Monday'],
 ['Event and program links','Strategic Events sheet, Links tab, plus your Review answers','Each publish; answers stay on your device']];
const ABOUT_LINKS=[
 ['Uploads folder (Google Drive)','Where the weekly export files are dropped','https://drive.google.com/drive/folders/1BA0BGich-ufoqrud8vIAoP0TEHk0B96t','g'],
 ['Published archive (Google Drive)','Export files after they’re published','https://drive.google.com/drive/folders/1POAbNW3DaBBjG9fnAP4VUeq_TFFI5WnP','g'],
 ['Strategic Events sheet','Events, Programs, Links and Sponsors tabs','https://docs.google.com/spreadsheets/d/111L92g2RNN98E456XxGar0R07dRMYYTelQwjcwlgfRU/edit','g'],
 ['Weekly update checklist','Which exports arrived and were published each week','https://docs.google.com/spreadsheets/d/1vprplexiIP7lqkCeFwiatNAWHLRnaqAG4M9SuQOLTBQ/edit','g'],
 ['Published data (GitHub)','The encrypted files Pulse downloads. Public, but unreadable without the passcode','https://github.com/1thomasalan/mccs-marketing-pulse',''],
 ['Automatic jobs (GitHub Actions)','Signage updates and their run history','https://github.com/1thomasalan/mccs-marketing-pulse/actions',''],
 ['Pulse app','The live app','https://1thomasalan.github.io/mccs-marketing-pulse/',''],
 ['Staff guide (SOP)','Step-by-step weekly routine and backup plan',typeof SOP_URL!=='undefined'?SOP_URL:'',''],
 ['Source platforms','Meta Business Suite · Google Analytics · Constant Contact · ScreenCloud · Wrike','https://business.facebook.com','']];
const ABOUT_PLAT=[['Meta Business Suite','https://business.facebook.com'],['Google Analytics','https://analytics.google.com'],['Constant Contact','https://www.constantcontact.com'],['ScreenCloud','https://studio.screencloud.com'],['Wrike','https://www.wrike.com']];
function aboutText(){return ['MCCS Digital Pulse: how it works','',...ABOUT_BLUF.map(([h,t])=>`• ${h}: ${t}`),'','Where the data comes from',...ABOUT_SRC.map(([a,b,c])=>`• ${a}: ${b} (${c})`),'','Where the data lives',...ABOUT_LINKS.filter(l=>l[2]&&l[0]!=='Source platforms').map(([a,b,u])=>`• ${a}: ${u}`),...ABOUT_PLAT.map(([a,u])=>`• ${a}: ${u}`)].join('\n')}
SET_GROUPS.unshift({id:'how',sec:0,title:'How Pulse works',icon:SI('help'),val:()=>'Sources',
 page:()=>`<p class="splede"><b>Bottom line:</b> Pulse is a read-only scoreboard. It shows real numbers from each platform’s own exports, updates weekly (signage every 15 minutes), and keeps the data encrypted so only our team can read it.</p>
 <div class="sgt">In short</div><div class="slist noic about">${ABOUT_BLUF.map(([h,t])=>`<div class="srow"><span class="slb"><b>${esc(h)}</b><small>${esc(t)}</small></span></div>`).join('')}</div>
 <div class="sgt">Where each number comes from</div><div class="slist noic about">${ABOUT_SRC.map(([a,b,c])=>`<div class="srow"><span class="slb">${esc(a)}<small>${esc(b)} · ${esc(c)}</small></span></div>`).join('')}</div>
 <p class="sfoot">To see when each source was last updated, open Data &amp; sync.</p>
 <div class="sgt">Where the data lives</div><div class="slist about">${ABOUT_LINKS.filter(l=>l[2]&&l[0]!=='Source platforms').map(([a,b,u,g])=>`<a class="srow" href="${esc(u)}" target="_blank" rel="noopener"><span class="sic">${SI(g?'doc':'out')}</span><span class="slb">${esc(a)}<small>${esc(b)}</small><small class="aurl">${esc(u.replace(/^https:\/\//,''))}</small></span>${SI('out','schev sout')}<span class="sr">(opens in a new tab)</span></a>`).join('')}</div>
 <p class="sfoot">The Google links open only for people Alan has shared them with. Ask Alan for view access.</p>
 <div class="sgt">Source platforms</div><div class="slist about">${ABOUT_PLAT.map(([a,u])=>`<a class="srow" href="${esc(u)}" target="_blank" rel="noopener"><span class="sic">${SI('out')}</span><span class="slb">${esc(a)}<small class="aurl">${esc(u.replace(/^https:\/\//,''))}</small></span>${SI('out','schev sout')}<span class="sr">(opens in a new tab)</span></a>`).join('')}</div>
 <div class="slist" style="margin-top:22px"><button class="srow" id="spAboutCopy"><span class="sic">${SI('doc')}</span><span class="slb">Copy this summary<small>Plain text with every link, ready to paste in an email</small></span></button><button class="srow" data-go="data"><span class="sic">${SI('sync')}</span><span class="slb">Open Data &amp; sync<small>Last update for each source</small></span>${SI('chev','schev')}</button></div>`,
 bind:()=>{const c=$('#spAboutCopy');if(c)c.onclick=async()=>{try{await navigator.clipboard.writeText(aboutText());c.querySelector('small').textContent='Copied. Paste it into an email or a doc.';toast('Summary copied')}catch(e){toast('Couldn’t copy. Select the text and copy it instead.',{type:'err'})}};}});
