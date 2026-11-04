// Local Chromium smoke checks, using Node's built-in WebSocket (no test dependency).
import { spawn } from 'node:child_process';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
const binary=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if(!binary)throw Error('Chrome or Edge is required for this optional browser check.');
const origin=(process.env.SITE_URL??'http://localhost:4322/ALR-X-Men-Universe').replace(/\/$/,'');
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
 const ready=path=>{const target=new URL(`${origin}${path}`);return `location.pathname === ${JSON.stringify(target.pathname)} && ${target.hash?`location.hash === ${JSON.stringify(target.hash)}`:'true'} && new URL(performance.getEntriesByType('navigation')[0].name).pathname === ${JSON.stringify(target.pathname)} && document.readyState === 'complete' && document.querySelector('main h1') && !document.querySelector('astro-island[ssr]')`;};
 async function go(path){await call('Page.navigate',{url:`${origin}${path}`});await wait(ready(path));}
 async function press(key,code,number){await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:number,text:key==='Enter'?'\r':key===' '?' ':undefined});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:number});}
 async function activate(selector,mode='mouse'){
  if(mode==='keyboard'){await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await press('Enter','Enter',13);return;}
  const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({behavior:'instant',block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  if(mode==='touch'){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,radiusX:1,radiusY:1,force:1}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else {await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});}
 }
 const assert=async(expression,message)=>{if(!await evaluate(expression))throw Error(message);};
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`
  addEventListener('pagereveal',event=>{
   const trace={path:location.pathname,transition:!!event.viewTransition};
   sessionStorage.setItem('transition-test',JSON.stringify(trace));
   if(!event.viewTransition)return;
   event.viewTransition.ready.then(()=>{
    trace.names=[...document.querySelectorAll('[style*="view-transition-name"]')].map(el=>el.style.viewTransitionName);
    trace.animations=document.getAnimations().map(a=>({name:a.animationName,pseudo:a.effect?.pseudoElement,frames:a.effect?.getKeyframes()}));
    trace.ready=true;sessionStorage.setItem('transition-test',JSON.stringify(trace));
   },()=>{trace.skipped=true;sessionStorage.setItem('transition-test',JSON.stringify(trace));});
   event.viewTransition.finished.then(()=>{trace.finished=true;sessionStorage.setItem('transition-test',JSON.stringify(trace));});
  });
 `});
 const reports=[];
 const art=JSON.parse(await readFile('src/design/uniform-art.json','utf8')).artwork;
 const slugs=process.argv.includes('--cyclops-only')?['cyclops']:['cyclops','jean-grey',...art.map(a=>a.character.toLowerCase()),'professor-xavier'];
 const base=new URL(origin).pathname.replace(/\/$/,'');
 async function openEntry(slug){
  await evaluate(`(()=>{const entry=document.querySelector('[data-entity-id="character-${slug}"]');for(let el=entry.parentElement;el;el=el.parentElement)if(el.tagName==='DETAILS')el.open=true;entry.scrollIntoView({behavior:'instant',block:'center'});})()`);
  await evaluate('document.fonts.ready');
  await wait(`Array.from(document.querySelectorAll('[data-entity-id="character-${slug}"] img')).every(i=>i.complete&&i.naturalWidth>0)`);
 }
 for(const mobile of [false,true]){
  await call('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:1000,deviceScaleFactor:1,mobile});
  await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
  await go('/characters/');
  await assert("JSON.stringify([...document.querySelectorAll('#original-members [data-entity-id]')].map(e=>e.dataset.entityId))===JSON.stringify(['character-cyclops','character-jean-grey','character-angel','character-beast','character-iceman','character-professor-xavier'])&&document.querySelector('#original-members > summary .directory-count').firstChild.textContent.trim()==='6'&&!document.querySelector('#founder-mentor')",'Original Members placement/count or removed Founder & Mentor category failed');
  if(process.argv.includes('--compare-layout')){
   const geometry=()=>evaluate(`(()=>{const selectors=['.entity-hero','.hero-copy','.hero-copy h1','.hero-deck','.identity-art','.hero-portrait','.hero-portrait img','.bio-facts','#journey','#timeline','#costumes'];return Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s);if(!e)return [s,null];const r=e.getBoundingClientRect(),c=getComputedStyle(e);return [s,{x:r.x,y:r.y,width:r.width,height:r.height,font:c.font,fontSize:c.fontSize,lineHeight:c.lineHeight,color:c.color,background:c.background,transform:c.transform,objectFit:c.objectFit,objectPosition:c.objectPosition}]}));})()`);
   for(const slug of ['cyclops','angel','gambit','professor-xavier']){
    await call('Page.navigate',{url:`https://alr5342.github.io/ALR-X-Men-Universe/characters/${slug}/`});
    await wait("document.readyState==='complete'&&!!document.querySelector('.entity-hero')");await evaluate('document.fonts.ready');
    const baseline=await geometry();
    await go(`/characters/${slug}/`);await evaluate('document.fonts.ready');
    const current=await geometry();
    if(JSON.stringify(baseline)!==JSON.stringify(current))throw Error('Existing biography layout changed: '+slug+' '+(mobile?'mobile':'desktop')+' '+JSON.stringify({baseline,current}));
   }
  }
  for(const slug of slugs){
   await go('/characters/');await openEntry(slug);
   await assert(`(()=>{const entry=document.querySelector('[data-entity-id="character-${slug}"]'),image=entry.querySelector('[data-character-image]');if(!image)return true;const r=image.getBoundingClientRect(),title=entry.querySelector('.directory-entry-title').getBoundingClientRect(),description=entry.querySelector('p').getBoundingClientRect();return r.width===88&&r.height===104&&r.left>=Math.max(title.right,description.right)+15&&entry.getBoundingClientRect().bottom>=r.bottom;})()`,'Thumbnail position, consistent dimensions or entry containment failed: '+slug);
   const original=await evaluate('({scroll:scrollY,open:[...document.querySelectorAll("details[open]")].map(e=>e.id)})');
   await writeFile(resolve(output,`transition-${slug}-${mobile?'mobile':'desktop'}-directory.png`),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
   await activate(`[data-entity-id="character-${slug}"]`,mobile?'touch':'keyboard');
   await wait(`location.pathname===${JSON.stringify(base+'/characters/'+slug+'/')}&&JSON.parse(sessionStorage.getItem('transition-test')||'{}').ready`);
   const trace=await evaluate("JSON.parse(sessionStorage.getItem('transition-test'))");
   const image=Boolean(await evaluate("document.querySelector('[data-character-image]')"));
   if(!trace.names.includes('character-name')||!trace.names.includes('character-description')||(image&&!trace.names.includes('character-image')))throw Error('Missing shared elements: '+slug+' '+JSON.stringify(trace));
   if(!trace.animations.length)throw Error('No shared-element animations: '+slug);
   await writeFile(resolve(output,`transition-${slug}-${mobile?'mobile':'desktop'}-mid.png`),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
   await wait("JSON.parse(sessionStorage.getItem('transition-test')||'{}').finished");
   await evaluate('document.fonts.ready');
   await writeFile(resolve(output,`transition-${slug}-${mobile?'mobile':'desktop'}-profile.png`),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
   const history=await call('Page.getNavigationHistory');
   await call('Page.navigateToHistoryEntry',{entryId:history.entries[history.currentIndex-1].id});
   await wait(`location.pathname===${JSON.stringify(base+'/characters/')}&&JSON.parse(sessionStorage.getItem('transition-test')||'{}').finished`);
   await assert(`document.querySelector('[data-entity-id="character-${slug}"]').getBoundingClientRect().top>=0&&Math.abs(scrollY-${original.scroll})<3`,'Directory scroll/context lost on Back: '+slug);
   await assert(`JSON.stringify([...document.querySelectorAll('details[open]')].map(e=>e.id))===${JSON.stringify(JSON.stringify(original.open))}`,'Open groups lost on Back');
   reports.push({slug,mobile,forward:trace,back:await evaluate("JSON.parse(sessionStorage.getItem('transition-test'))")});
  }
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await go('/characters/');await openEntry('cyclops');await activate('[data-entity-id="character-cyclops"]',mobile?'touch':'mouse');
  await wait(ready('/characters/cyclops/'));
  await assert("!document.documentElement.dataset.characterTransition",'Reduced-motion transition was active');
  await call('Emulation.setEmulatedMedia',{features:[]});
  await call('Page.reload');await wait(ready('/characters/cyclops/'));
  await assert("!document.documentElement.dataset.characterTransition",'Direct reload started a morph');
  await activate('.search-button',mobile?'touch':'mouse');await wait("document.querySelector('#universe-search')!==null");
  await evaluate("(()=>{const input=document.querySelector('#universe-search');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Jean');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
  const jeanLink='.search-popover a[href="'+base+'/characters/jean-grey/"]';
  await wait(`document.querySelector(${JSON.stringify(jeanLink)})!==null`);
  await activate(jeanLink,mobile?'touch':'mouse');await wait(ready('/characters/jean-grey/'));
  await assert("!document.documentElement.dataset.characterTransition",'Character-to-character navigation incorrectly reused directory elements');
  await activate('.back-link',mobile?'touch':'keyboard');await wait(ready('/characters/'));
  await wait("JSON.parse(sessionStorage.getItem('transition-test')||'{}').finished");
  await assert("document.querySelector('#original-members').open",'Directory return link lost its group context');
  // Simulate a browser that does ordinary document navigation without native VT.
  const fallback=await call('Page.addScriptToEvaluateOnNewDocument',{source:"addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='@view-transition{navigation:none}';document.head.append(style);});"});
  await go('/characters/');await openEntry('cyclops');await activate('[data-entity-id="character-cyclops"]',mobile?'touch':'mouse');
  await wait(ready('/characters/cyclops/'));
  await assert("!document.documentElement.dataset.characterTransition&&document.querySelector('#timeline')!==null",'Ordinary navigation fallback failed');
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:fallback.identifier});
 }
 await writeFile(resolve(output,'character-transition-results.json'),JSON.stringify(reports,null,2));
 if(consoleErrors.length)throw Error('Browser exceptions: '+consoleErrors.join(', '));
 console.log(`PASS: ${slugs.length} characters, forward and Back shared elements on desktop/mobile; accordion/scroll restoration; direct refresh; reduced motion; search.`);
 await call('Browser.close');
}finally{ws?.close();browser.kill();}

