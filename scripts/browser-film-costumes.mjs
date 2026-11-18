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
 const ready=path=>{const target=new URL(`${origin}${path}`);return `location.pathname === ${JSON.stringify(target.pathname)} && ${target.hash?`location.hash === ${JSON.stringify(target.hash)}`:'true'} && new URL(performance.getEntriesByType('navigation')[0].name).pathname === ${JSON.stringify(target.pathname)} && document.readyState === 'complete' && document.querySelector('main h1') && !document.querySelector('astro-island[ssr]') && !document.documentElement.hasAttribute('data-character-transition')`;};
 async function go(path){await call('Page.navigate',{url:`${origin}${path}`});await wait(ready(path));}
 async function press(key,code,number){await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:number,text:key==='Enter'?'\r':key===' '?' ':undefined});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:number});}
 async function activate(selector,mode='mouse'){
  if(mode==='keyboard'){await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await press('Enter','Enter',13);return;}
  const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({behavior:'instant',block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  if(mode==='touch'){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,radiusX:1,radiusY:1,force:1}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else {await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});}
 }
 const assert=async(expression,message)=>{if(!await evaluate(expression))throw Error(message);};
 const pairs=text=>text.split(' ').map(s=>s.split(':'));
 // Independent expectations transcribed from the owner's five-film costume table.
 const films=[
  {slug:'x-men',groups:[{title:'X-Men',items:pairs('cyclops:Black_Cyclops.jpg jean-grey:Jean_Black.jpg iceman:iceman-black-uniform.webp angel:angel-training-uniform.webp beast:beast-film-uniform.webp'),rows:[5]}]},
  {slug:'evolution',groups:[{title:'X-Men',items:pairs('cyclops:OG_Cyclops.jpg jean-grey:OG_Jean.jpg iceman:iceman-uniform.webp beast:beast-film-uniform.webp havok:havok-training-uniform.webp'),rows:[5]}]},
  {slug:'exile',groups:[
   {title:'X-Men',items:pairs('cyclops:Cyclops.jpg jean-grey:JeanGrey.jpg iceman:iceman-uniform.webp beast:beast-film-uniform.webp havok:havok-uniform.webp'),rows:[5]},
   {title:'Recruits',items:pairs('storm:storm-uniform.webp wolverine:wolverine-uniform.webp nightcrawler:nightcrawler-uniform.webp colossus:colossus-uniform.webp forge:forge-uniform.webp'),rows:[5]},
  ]},
  {slug:'god-loves-man-kills',groups:[{title:'X-Men',items:pairs('cyclops:Cyclops.jpg beast:beast-film-uniform.webp angel:angel-uniform.webp storm:storm-uniform.webp wolverine:wolverine-uniform.webp nightcrawler:nightcrawler-uniform.webp colossus:colossus-uniform.webp forge:forge-uniform.webp rogue:rogue-uniform.webp gambit:gambit-uniform.webp shadowcat:shadowcat-training-uniform.webp'),rows:[6,5]}]},
  {slug:'genesis',groups:[
   {title:'X-Men',items:pairs('cyclops:Cyclops.jpg havok:havok-uniform.webp storm:storm-uniform.webp wolverine:wolverine-uniform.webp nightcrawler:nightcrawler-uniform.webp colossus:colossus-uniform.webp forge:forge-uniform.webp rogue:rogue-uniform.webp gambit:gambit-uniform.webp shadowcat:shadowcat-uniform.webp'),rows:[5,5]},
   {title:'Horsemen of Apocalypse',names:['Pestilence','Famine','War'],items:pairs('jean-grey:jean-pestilence-uniform.webp iceman:iceman-famine-uniform.webp beast:beast-war-uniform.webp'),rows:[3]},
  ]},
 ];
 const publicRoot='https://alr5342.github.io/ALR-X-Men-Universe';
 const baselines=new Map();
 for(const film of films){const r=await fetch(`${publicRoot}/projects/${film.slug}/`);if(!r.ok)throw Error('Baseline unavailable');baselines.set(film.slug,await r.text());}
 const results=[];
 const frames=[];
 for(const [device,width,height,columns] of [['desktop',1440,1000,null],['tablet',900,1100,3],['mobile',390,844,2]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:device==='mobile'});
  await call('Emulation.setTouchEmulationEnabled',{enabled:device==='mobile',maxTouchPoints:1});
  for(const film of films){
   const route=`/projects/${film.slug}/`;await go(route);await evaluate('document.fonts.ready');
   await assert("document.documentElement.scrollWidth<=innerWidth",'Horizontal overflow: '+film.slug);
   const expectedIds=film.groups.flatMap(g=>g.items.map(([slug])=>'character-'+slug));
   await assert(`JSON.stringify([...document.querySelectorAll('#cast .film-cast-group-title')].filter(el=>el.closest('.film-cast-group')).map(e=>e.textContent))===${JSON.stringify(JSON.stringify(film.groups.map(g=>g.title)))}`,'Affiliation headings differ: '+film.slug);
   for(let index=0;index<film.groups.length;index++){
    const group=film.groups[index];
    // Locate groups by their list order rather than relying on surrounding section tags.
    const entries=await evaluate(`Array.from(document.querySelectorAll('#cast .film-cast-group')[${index}].querySelectorAll('.film-cast-card')).map(a=>({id:a.dataset.characterId,file:a.querySelector('img').src.split('/').pop(),name:a.querySelector('figcaption').textContent,path:new URL(a.href).pathname,imageLink:a.querySelector('img').closest('a')===a,captionLink:a.querySelector('figcaption').closest('a')===a}))`);
    const expected=group.items.map(([slug,file],i)=>({id:'character-'+slug,file,name:group.names?.[i]??(slug==='jean-grey'?'Jean Grey':slug[0].toUpperCase()+slug.slice(1)),path:new URL(origin).pathname.replace(/\/$/,'')+'/characters/'+slug+'/',imageLink:true,captionLink:true}));
    if(JSON.stringify(entries)!==JSON.stringify(expected))throw Error('Character/costume/order/link mismatch: '+film.slug+' '+group.title+' '+JSON.stringify(entries));
    await evaluate(`document.querySelectorAll('#cast .film-cast-group')[${index}].scrollIntoView({behavior:'instant',block:'start'})`);
    await evaluate(`Promise.all([...document.querySelectorAll('#cast .film-cast-group')[${index}].querySelectorAll('img')].map(async img=>{img.loading='eager';await img.decode();}))`);
    const rows=await evaluate(`(()=>{const rows=new Map();for(const li of document.querySelectorAll('#cast .film-cast-group')[${index}].querySelectorAll('li')){const top=Math.round(li.getBoundingClientRect().top);rows.set(top,(rows.get(top)||0)+1)}return [...rows.values()]})()`);
    const wanted=columns?Array.from({length:Math.ceil(group.items.length/columns)},(_,i)=>Math.min(columns,group.items.length-i*columns)):group.rows;
    if(JSON.stringify(rows)!==JSON.stringify(wanted))throw Error('Rows differ: '+film.slug+' '+group.title+' '+device+' '+JSON.stringify(rows));
    await assert(`(()=>{const list=document.querySelectorAll('#cast .film-cast-group')[${index}].querySelector('ul'),r=list.getBoundingClientRect(),rows=new Map();for(const li of list.children){const box=li.getBoundingClientRect(),key=Math.round(box.top);const row=rows.get(key)||[];row.push(box);rows.set(key,row)}return [...rows.values()].every(row=>Math.abs((row[0].left+row.at(-1).right)/2-(r.left+r.right)/2)<1)})()`,'Row is not independently centered: '+film.slug+' '+group.title+' '+device);
   }
   await assert("[...document.querySelectorAll('#cast img')].every(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).objectFit==='contain'&&getComputedStyle(i).filter==='none')",'Artwork loading/full-body treatment failed');
   await assert("(()=>{const widths=[...document.querySelectorAll('#cast img')].map(i=>i.getBoundingClientRect().width);return Math.max(...widths)-Math.min(...widths)<1})()",'Image widths differ between affiliations: '+film.slug);
   await assert("[...document.querySelectorAll('#cast .film-cast-art')].every(frame=>{const border=getComputedStyle(frame,'::after');return ['Top','Right','Bottom','Left'].every(side=>border['border'+side+'Width']==='1px'&&border['border'+side+'Style']==='solid')})",'Default inset border must be 1px on every side');
   frames.push({film:film.slug,device,images:await evaluate("[...document.querySelectorAll('#cast .film-cast-card')].map(a=>{const r=a.querySelector('img').getBoundingClientRect();return {id:a.dataset.characterId,width:r.width,height:r.height}})")});
   const beforeHighlight=await evaluate("(()=>{const a=document.querySelector('#cast .film-cast-card');return JSON.stringify([a,a.querySelector('img')].map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height}}))})()");
   await evaluate("document.querySelector('#cast .film-cast-card').focus({preventScroll:true})");
   await assert("getComputedStyle(document.querySelector('#cast .film-cast-art'),'::after').borderTopWidth==='3px'",'Keyboard focus did not thicken the inset border');
   await assert(`(()=>{const a=document.querySelector('#cast .film-cast-card');return JSON.stringify([a,a.querySelector('img')].map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height}}))===${JSON.stringify(beforeHighlight)}})()`,'Focus border shifted card or artwork dimensions');
   await evaluate('document.activeElement?.blur()');
   if(device!=='mobile'){
    const point=await evaluate("(()=>{const el=document.querySelector('#cast .film-cast-card');el.scrollIntoView({behavior:'instant',block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+20}})()");
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
    await assert("getComputedStyle(document.querySelector('#cast .film-cast-art'),'::after').borderLeftWidth==='3px'",'Mouse hover did not thicken the border');
    await assert(`(()=>{const a=document.querySelector('#cast .film-cast-card');return JSON.stringify([a,a.querySelector('img')].map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height}}))===${JSON.stringify(beforeHighlight)}})()`,'Hover border shifted dimensions');
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
   }
   const parity=await evaluate(`(()=>{const old=new DOMParser().parseFromString(${JSON.stringify(baselines.get(film.slug))},'text/html');const pictured=${JSON.stringify(expectedIds)};const original=[...old.querySelectorAll('#cast .cast-row')].map(a=>({path:new URL(a.getAttribute('href'),location.origin).pathname,label:a.querySelector('p').textContent}));const text=[...document.querySelectorAll('#cast .cast-row')].map(a=>({path:new URL(a.href).pathname,label:a.querySelector('p').textContent}));const expectedText=original.filter(a=>!pictured.includes('character-'+a.path.split('/').filter(Boolean).pop()));const ids=[...document.querySelectorAll('#cast [data-character-id]')].map(e=>e.dataset.characterId);const normalize=main=>{main.querySelector('#cast')?.remove();main.querySelectorAll('style,script').forEach(e=>e.remove());return main.textContent.replace(/\s+/g,' ').trim()};return {textPreserved:JSON.stringify(text)===JSON.stringify(expectedText),unique:new Set(ids).size===ids.length,allOriginal:original.every(a=>ids.includes('character-'+a.path.split('/').filter(Boolean).pop())),restUnchanged:normalize(old.querySelector('main'))===normalize(document.querySelector('main').cloneNode(true)),additional:text.length};})()`);
   if(!parity.textPreserved||!parity.unique||!parity.allOriginal||!parity.restUnchanged)throw Error('Existing content/cast preservation failed: '+film.slug+' '+JSON.stringify(parity));
   await evaluate('document.activeElement?.blur()');
   const bounds=await evaluate("(()=>{const section=document.querySelector('#cast'),r=section.getBoundingClientRect(),last=[...section.querySelectorAll('.film-cast-group')].at(-1).getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:last.bottom-r.top+20}})()");
   await writeFile(resolve(output,`film-costumes-${film.slug}-${device}.png`),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...bounds,scale:1}})).data,'base64'));
   await activate('#cast .film-cast-card',device==='mobile'?'touch':'keyboard');await wait(ready('/characters/cyclops/'));
   results.push({film:film.slug,device,additionalCharacters:parity.additional});
  }
 }
 if(consoleErrors.length)throw Error('Browser exceptions: '+consoleErrors.join(', '));
 await writeFile(resolve(output,'film-costume-results.json'),JSON.stringify(results,null,2));
 await writeFile(resolve(output,process.argv.includes('--record-frames')?'film-costume-frames-before.json':'film-costume-frames-after.json'),JSON.stringify(frames,null,2));
 if(!process.argv.includes('--record-frames')&&existsSync(resolve(output,'film-costume-frames-before.json'))){
  const before=JSON.parse(await readFile(resolve(output,'film-costume-frames-before.json'),'utf8'));
  for(let i=0;i<frames.length;i++)for(let j=0;j<frames[i].images.length;j++){
   const a=before[i].images[j],b=frames[i].images[j];
   if(a.id!==b.id||Math.abs(a.width-b.width)>.1||Math.abs(a.height-b.height)>.1)throw Error('Artwork dimensions changed: '+frames[i].film+' '+frames[i].device+' '+b.id);
  }
 }
 console.log('PASS: five films at desktop/tablet/mobile; exact costumes, affiliation/name order and rows; full-body artwork and biography links; all original additional cast and non-cast film content preserved.');
 await call('Browser.close');
}finally{ws?.close();browser.kill();}

