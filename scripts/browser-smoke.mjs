// Local Chromium smoke checks, using Node's built-in WebSocket (no test dependency).
import { spawn } from 'node:child_process';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
const binary=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if(!binary)throw Error('Chrome or Edge is required for this optional browser check.');
const origin=process.env.SITE_URL??'http://localhost:4321';
const output=resolve('.preview');await mkdir(output,{recursive:true});
// Keep Chromium's changing/locked profile files outside the Astro file watcher.
const profile=resolve(tmpdir(),`x-men-browser-${Date.now()}`);
const browser=spawn(binary,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-allow-origins=*','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let ws;
try{
 let port;
 for(let i=0;i<120;i++){try{port=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await pause(250);}}
 if(!port)throw Error('Browser debugging connection unavailable.');
 const tabs=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
 const tab=tabs.find(t=>t.type==='page');ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let serial=0;const pending=new Map();const consoleErrors=[];
 ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(Error(m.error.message)):p?.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')consoleErrors.push(m.params.exceptionDetails.text);};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timeout=setTimeout(()=>reject(Error(`Browser command timed out: ${method}`)),30000);pending.set(id,{resolve:r=>{clearTimeout(timeout);resolve(r);},reject:e=>{clearTimeout(timeout);reject(e);}});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
 await call('Page.enable');await call('Runtime.enable');await call('Page.bringToFront');
 async function wait(expression){for(let i=0;i<120;i++){if(await evaluate(expression))return;await pause(150);}throw Error(`Timed out: ${expression}`);}
 const ready=path=>{const target=new URL(path,origin);return `location.pathname === ${JSON.stringify(target.pathname)} && ${target.hash?`location.hash === ${JSON.stringify(target.hash)}`:'true'} && new URL(performance.getEntriesByType('navigation')[0].name).pathname === ${JSON.stringify(target.pathname)} && document.readyState === 'complete' && document.querySelector('main h1') && !document.querySelector('astro-island[ssr]')`;};
 async function go(path){await call('Page.navigate',{url:`${origin}${path}`});await wait(ready(path));}
 async function clickLink(path){await evaluate(`document.querySelector('a[href="${path}"]').click()`);await wait(ready(path));}
 async function press(key,code,number){await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:number,text:key==='Enter'?'\r':key===' '?' ':undefined});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:number});}
 async function activate(selector,mode='mouse'){
  if(mode==='keyboard'){await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await press('Enter','Enter',13);return;}
  const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({behavior:'instant',block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  if(mode==='touch'){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,radiusX:1,radiusY:1,force:1}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else {await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});}
 }
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await go('/');
 await writeFile(resolve(output,'home-desktop.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 if(!await evaluate(`document.querySelector('h1').textContent.includes('Universe') && document.querySelectorAll('.film-access a').length===5 && !document.querySelector('.home-hero').textContent.includes('Film 4')`))throw Error('Home still favors a single film.');
 await activate('.film-access a[href="/projects/x-men/"] img');await wait(ready('/projects/x-men/'));
 await go('/saga/');
 if(!await evaluate(`document.querySelectorAll('a.film-stop').length===5 && !document.querySelector('.ribbon-detail,#beat-matrix,.beat-matrix,button.film-stop')`))throw Error('Saga retains an intermediate selection or matrix.');
 await activate('.film-stop[href="/projects/evolution/"] img');await wait(ready('/projects/evolution/'));
 await go('/saga/');await activate('#F4 .chapter-art');await wait(ready('/projects/god-loves-man-kills/'));
 await clickLink('/characters/angel/');await clickLink('/projects/god-loves-man-kills/');
 await go('/characters/');
 if(!await evaluate(`document.querySelectorAll('.directory-entry').length===35 && [...document.querySelectorAll('.directory-subgroup')].every(d=>!d.open)`))throw Error('Character directory is incomplete or initially overwhelming.');
 await activate('#original-members > summary');await wait(`document.querySelector('#original-members').open`);
 await activate('#later-recruits > summary','keyboard');await wait(`document.querySelector('#later-recruits').open && document.querySelector('#original-members').open`);
 await evaluate(`document.querySelector('#original-members > summary').focus()`);await press(' ','Space',32);await wait(`!document.querySelector('#original-members').open`);await press(' ','Space',32);await wait(`document.querySelector('#original-members').open`);
 await writeFile(resolve(output,'characters-desktop.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await activate('.directory-entry[href="/characters/cyclops/"]');await wait(ready('/characters/cyclops/'));
 await go('/characters/');
 for(const id of ['adversaries','allies']){await activate('#'+id+' > summary');await wait(`document.getElementById(${JSON.stringify(id)}).open`);}
 for(const id of ['original-members','founder-mentor','later-recruits','brotherhood','anti-mutant-figures','marauders','other-antagonists','morlocks','independent-allies']){await activate('#'+id+' > summary');await wait(`document.getElementById(${JSON.stringify(id)}).open`);}
 if(!await evaluate(`[...document.querySelectorAll('.directory-entry')].filter(a=>a.getClientRects().length>0).length===35`))throw Error('A character is hidden or omitted after expanding groups.');
 await go('/world/');
 if(!await evaluate(`document.querySelectorAll('.directory-entry').length===20 && [...document.querySelectorAll('.directory-group')].every(d=>!d.open) && !document.querySelector('.event-list,.trajectory')`))throw Error('World directory content/collapse state incorrect.');
 for(const id of ['organizations','institutions','locations','lore']){await activate('#'+id+' > summary',id==='institutions'?'keyboard':'mouse');await wait(`document.getElementById(${JSON.stringify(id)}).open`);}
 if(!await evaluate(`[...document.querySelectorAll('.directory-entry')].filter(a=>a.getClientRects().length>0).length===20`))throw Error('World entries missing after expansion.');
 await activate('.directory-entry[href="/factions/mrd/"] p');await wait(ready('/factions/mrd/'));
 const index=await fetch(`${origin}/search.json`).then(r=>r.json());
 if(index.some(e=>e.kind==='event'||e.url.startsWith('/events/')))throw Error('Search exposes removed events.');
 for(const path of ['/events/','/events/angel-amputation/','/events/apocalypse-defeat-awakening/'])if((await fetch(origin+path)).status!==404)throw Error('Removed event route still responds: '+path);
 await go('/projects/x-men/');
 if(!await evaluate(`document.querySelector('#post-credits').textContent.includes('SENTINEL') && document.querySelector('#prison') && document.querySelector('.hero').style.getPropertyValue('--film-color')==='#D80215' && document.querySelector('.hero-art img').src.endsWith('/images/cyclops.png') && getComputedStyle(document.querySelector('.hero-art img')).objectFit==='contain'`))throw Error('Film 1 treatment or identity missing.');
 await writeFile(resolve(output,'film1-desktop.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await clickLink('/characters/cyclops/');
 if(!await evaluate(`document.querySelector('#journey').textContent.includes('Film 5') && document.querySelector('#timeline').textContent.includes('Havok')`))throw Error('Cyclops journey is not saga-wide.');
 await go('/projects/x-men/');await clickLink('/characters/domino/');await clickLink('/factions/brotherhood/');await clickLink('/characters/toad/');
 for(const name of (await fetch(`${origin}/search.json`).then(r=>r.json())).filter(e=>e.kind==='character').map(e=>e.url.split('/')[2])){await go(`/characters/${name}/`);if(!await evaluate(`['journey','timeline'].every(id=>document.getElementById(id)) && Boolean(document.getElementById('journey').compareDocumentPosition(document.getElementById('timeline')) & Node.DOCUMENT_POSITION_FOLLOWING) && document.querySelector('#timeline h2').textContent==='Character Timeline' && !document.querySelector('#story-connections,.connections,#latest-status,.character-timeline')`))throw Error(`Character sections or redundant graph: ${name}`);}
 for(const [path,logo,color] of [['/projects/evolution/','beast','#04479E'],['/projects/exile/','mojo','#FBCC16'],['/projects/genesis/','apocalypse','#5F7E9B']]){await go(path);if(!await evaluate(`document.querySelector('#cast') && document.querySelector('.hero').style.getPropertyValue('--film-color')===${JSON.stringify(color)} && document.querySelector('.hero-art img').src.endsWith('/images/'+${JSON.stringify(logo)}+'.png') && getComputedStyle(document.querySelector('.hero-art img')).objectFit==='contain'`))throw Error('New film treatment/identity missing: '+path);}
 for(const path of ['/projects/x-men/','/projects/evolution/','/projects/exile/','/projects/god-loves-man-kills/','/projects/genesis/']){
  await go(path);
  if(!await evaluate(`document.querySelectorAll('.story-beat').length===15 && document.querySelectorAll('.film-act').length===3 && [...document.querySelectorAll('.story-beat[data-beat-status="not-established"] .beat-content')].every(el=>el.innerHTML.trim()==='') && !document.querySelector('.story-beat .issue-panel')`))throw Error('Beat structure/blank content failed: '+path);
 }
 await go('/projects/exile/');if(!await evaluate(`document.querySelector('#beat-finale .beat-content').innerHTML.trim()===''`))throw Error('Film 3 Finale is populated.');
 await go('/projects/genesis/');if(!await evaluate(`document.querySelectorAll('.story-beat[data-beat-status="present"]').length===1 && document.querySelector('#beat-final-image').textContent.includes('awakening')`))throw Error('Film 5 acquired unsupported beats.');
 for(const path of ['/characters/storm/','/characters/mr-sinister/','/characters/apocalypse/','/locations/mojoworld/','/lore/cerebro/','/world/movement-kelly/','/world/church-stryker/','/world/friends-of-humanity/','/characters/','/world/']){await go(path);if(!await evaluate(`document.querySelector('main h1') && !document.querySelector('astro-error-overlay') && !document.querySelector('a[href^="/events/"],#beat-matrix,.trajectory') && !document.querySelector('main').textContent.includes('Film undefined')`))throw Error('Retained route or retired navigation failed: '+path);}
 await go('/projects/god-loves-man-kills/');
 await clickLink('/characters/magneto/');await clickLink('/factions/acolytes/');await clickLink('/characters/rogue/');await clickLink('/factions/x-men/');
 await go('/factions/acolytes/');await clickLink('/characters/gambit/');await clickLink('/factions/x-men/');
 await go('/characters/angel/');
 if(!await evaluate(`document.querySelector('#first-class') && document.querySelector('#journey').textContent.includes('Film 1') && document.querySelector('#journey').textContent.includes('Film 5') && document.querySelector('#film5-ending .section-content').textContent.trim()===''`))throw Error('Saga-wide Angel biography or blank ending section missing.');
 if(await evaluate(`Boolean(document.querySelector('.development-button'))`))throw Error('Private research toggle is still published.');
 await go('/saga/');
 if(!await evaluate(`JSON.stringify([...document.querySelectorAll('.saga-ribbon img')].map(img=>new URL(img.src).pathname))===JSON.stringify(['/images/cyclops.png','/images/beast.png','/images/mojo.png','/images/glmk.png','/images/apocalypse.png']) && [...document.querySelectorAll('.film-logo')].every(img=>img.complete&&img.naturalWidth>0&&getComputedStyle(img).objectFit==='contain')`))throw Error('Film logos not mapped or contained correctly.');
 await writeFile(resolve(output,'saga-desktop.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await go('/characters/gambit/');
 if(!await evaluate(`document.querySelector('#background .section-content').innerHTML.trim()==='' && document.querySelector('#film5 .section-content').innerHTML.trim()===''`))throw Error('Gambit has filler in blank sections.');
 await go('/development/');
 if(!await evaluate(`document.querySelector('h1').textContent.includes("Creator's notes") && document.querySelector('.faq') && !document.querySelector('.issue-panel')`))throw Error('Development still exposes research issues.');
 if(!await evaluate(`JSON.stringify([...document.querySelectorAll('.site-header nav a')].map(a=>a.textContent))===JSON.stringify(['Saga','Characters','World','Development'])`))throw Error('Main navigation order changed.');
 await go('/characters/angel/');
 await evaluate(`document.querySelector('.search-button').click()`);await wait(`document.querySelector('#universe-search') !== null`);
 await evaluate(`const input=document.querySelector('#universe-search'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'GLMK');input.dispatchEvent(new Event('input',{bubbles:true}));`);
 await wait(`document.querySelector('.search-popover a[href="/projects/god-loves-man-kills/"]') !== null`);
 await evaluate(`(()=>{const input=document.querySelector('#universe-search');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Callisto');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await wait(`document.querySelector('.search-popover a[href="/characters/callisto/"]') !== null`);
 await evaluate(`document.querySelector('button[aria-label="Close search"]').click()`);
 await writeFile(resolve(output,'angel-desktop.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 for(const path of ['/','/saga/','/characters/','/world/','/projects/x-men/','/projects/god-loves-man-kills/','/characters/angel/','/characters/cyclops/','/characters/professor-xavier/','/characters/gambit/','/factions/acolytes/','/factions/mrd/','/projects/evolution/','/projects/exile/','/projects/genesis/','/characters/storm/','/characters/apocalypse/','/locations/mojoworld/','/lore/cerebro/','/world/friends-of-humanity/','/development/']){await go(path);if(!await evaluate('document.documentElement.scrollWidth <= window.innerWidth'))throw Error(`Mobile overflow: ${path}`);}
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await go('/characters/');await activate('#original-members > summary','touch');await wait(`document.querySelector('#original-members').open`);
 await evaluate(`document.querySelector('.entity-directory').scrollIntoView({behavior:'instant',block:'start'})`);
 await writeFile(resolve(output,'characters-mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await activate('.directory-entry[href="/characters/iceman/"]','touch');await wait(ready('/characters/iceman/'));
 await go('/world/');await activate('#institutions > summary','touch');await wait(`document.querySelector('#institutions').open`);
 if(!await evaluate(`document.documentElement.scrollWidth<=innerWidth`))throw Error('Expanded World group overflows on mobile.');
 await evaluate(`document.querySelector('.entity-directory').scrollIntoView({behavior:'instant',block:'start'})`);
 await writeFile(resolve(output,'world-mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await activate('.directory-entry[href="/world/friends-of-humanity/"]','touch');await wait(ready('/world/friends-of-humanity/'));
 await go('/saga/');await activate('.film-stop[href="/projects/x-men/"] img','touch');await wait(ready('/projects/x-men/'));
 await go('/projects/x-men/');await evaluate(`document.querySelector('#beat-set-up').scrollIntoView({behavior:'instant',block:'start'})`);
 await writeFile(resolve(output,'film1-beats-mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await go('/characters/gambit/');await writeFile(resolve(output,'gambit-mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:390,height:2400,scale:1}})).data,'base64'));
 await go('/');await writeFile(resolve(output,'home-mobile.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 if(consoleErrors.length)throw Error(`Browser exceptions: ${consoleErrors.join(', ')}`);
 console.log('PASS: direct film/logo/entity navigation; mouse, keyboard and touch directory controls; all 35 characters and 20 World entries; removed event routes return 404; no event search results or public matrix; preserved 75 beats, biographies, creator FAQ and mobile layouts; no browser exceptions.');
 await call('Browser.close');
}finally{ws?.close();browser.kill();}
