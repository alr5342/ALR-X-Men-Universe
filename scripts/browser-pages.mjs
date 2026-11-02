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
 async function clickLink(path){await evaluate(`document.querySelector('a[href="${path}"]').click()`);await wait(ready(path));}
 async function press(key,code,number){await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:number,text:key==='Enter'?'\r':key===' '?' ':undefined});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:number});}
 async function activate(selector,mode='mouse'){
  if(mode==='keyboard'){await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await press('Enter','Enter',13);return;}
  const point=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({behavior:'instant',block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  if(mode==='touch'){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,radiusX:1,radiusY:1,force:1}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else {await call('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});}
 }

 const base=new URL(origin).pathname.replace(/\/$/,'');
 const href=path=>base+path;
 const link=path=>'a[href='+JSON.stringify(href(path))+']';
 const assert=async (expression,message)=>{if(!await evaluate(expression))throw Error(message);};
 const search=await fetch(origin+'/search.json').then(r=>{if(!r.ok)throw Error('Search index request failed');return r.json();});
 const {palettes}=JSON.parse(await readFile('src/design/character-palettes.json','utf8'));
 for(const entity of search){const r=await fetch(new URL(entity.url,origin));if(!r.ok)throw Error('Broken public destination: '+entity.url);}
 const routes=[...new Set(['/','/saga/','/projects/x-men/','/projects/evolution/','/projects/exile/','/projects/god-loves-man-kills/','/projects/genesis/','/characters/','/characters/cyclops/','/characters/jean-grey/','/characters/angel/','/characters/gambit/','/world/','/factions/x-men/','/locations/mojoworld/','/lore/cerebro/','/world/friends-of-humanity/','/development/',...search.filter(e=>e.kind==='character').map(e=>new URL(e.url,origin).pathname.slice(base.length))])];
 for(const mobile of [false,true]){
  await call('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:1000,deviceScaleFactor:1,mobile});
  await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
  for(const path of routes){
   await go(path);
   await assert('document.documentElement.scrollWidth<=innerWidth','Horizontal overflow: '+path);
   await assert("getComputedStyle(document.querySelector('.site-header')).display==='flex'",'Stylesheet did not load');
   await assert("[...document.images].every(i=>i.loading==='lazy'||(i.complete&&i.naturalWidth>0))",'Image failed: '+path);
   if(path.startsWith('/projects/'))await assert("document.querySelectorAll('.story-beat').length===15",'Missing film beats');
   if(path.startsWith('/characters/')&&path!=='/characters/')await assert("document.querySelector('#journey')&&document.querySelector('#timeline')",'Missing biography sections');
   if(process.argv.includes('--v6')){
    const palette=path.startsWith('/characters/')?palettes[path.split('/')[2]]:undefined;
    const selected=Boolean(palette)||['/projects/x-men/','/projects/exile/','/factions/x-men/'].includes(path);
    await assert(`Boolean(document.querySelector('.v6-page'))===${selected}`,'V6 styling escaped selected scope: '+path);
    if(palette)await assert(`(()=>{const style=getComputedStyle(document.querySelector('.v6-character'));return style.getPropertyValue('--identity-primary').trim().toUpperCase()===${JSON.stringify(palette.primary)}&&style.getPropertyValue('--identity-secondary').trim().toUpperCase()===${JSON.stringify(palette.secondary)}&&style.getPropertyValue('--identity-accent').trim().toUpperCase()===${JSON.stringify(palette.accent??'')};})()`,'Rendered palette differs from approved data: '+path);
    if(selected){
     const name=path.split('/').filter(Boolean).join('-')+'-'+(mobile?'mobile':'desktop');
     const capture=!path.startsWith('/characters/')||['cyclops','jean-grey','angel','gambit','magneto','mr-sinister','apocalypse','mojo','storm','domino','pyro','avalanche'].includes(path.split('/')[2]);
     if(capture)await writeFile(resolve(output,'v6-'+name+'.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
     if(path==='/characters/cyclops/'||path==='/characters/jean-grey/'){
      const expected=path.includes('cyclops')?['Black_Cyclops.jpg','OG_Cyclops.jpg','Cyclops.jpg']:['Jean_Black.jpg','OG_Jean.jpg','JeanGrey.jpg'];
      await assert(`JSON.stringify([...document.querySelectorAll('.costume-plates img')].map(i=>new URL(i.src).pathname.split('/').pop()))===${JSON.stringify(JSON.stringify(expected))}`,'Incorrect creator-confirmed costume order');
      await assert("Boolean(document.querySelector('#timeline').compareDocumentPosition(document.querySelector('#costumes')) & Node.DOCUMENT_POSITION_FOLLOWING) && [...document.querySelectorAll('.costume-plates img')].every(i=>getComputedStyle(i).objectFit==='contain'&&getComputedStyle(i).filter==='none')",'Gallery order, full-body visibility or artwork colors failed');
      await assert("getComputedStyle(document.querySelector('.hero-portrait img')).objectFit==='cover'&&document.querySelector('.hero-portrait img').getBoundingClientRect().height>document.querySelector('.hero-portrait').getBoundingClientRect().height",'Header is not a closer hero crop');
      await assert("(()=>{const image=getComputedStyle(document.querySelector('.hero-portrait img'));const frame=document.querySelector('.hero-portrait');return image.filter==='none'&&image.mixBlendMode==='normal'&&image.maskImage==='none'&&getComputedStyle(frame,'::before').content==='none'&&getComputedStyle(frame,'::after').content==='none';})()",'Header artwork still has a filter, blending, mask or lighting overlay');
      for(let index=0;index<3;index++){
       await evaluate(`document.querySelectorAll('.costume-plates img')[${index}].scrollIntoView({behavior:'instant',block:'center'})`);
       await wait(`document.querySelectorAll('.costume-plates img')[${index}].complete&&document.querySelectorAll('.costume-plates img')[${index}].naturalWidth>0`);
      }
      await evaluate("document.querySelector('#costumes').scrollIntoView({behavior:'instant',block:'start'})");
      await writeFile(resolve(output,'v6-gallery-'+name+'.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
     }else if(path.startsWith('/characters/'))await assert("!document.querySelector('.identity-art,.hero-art img,.costume-gallery')",'Portrait invented for an image-free character');
     if(path.startsWith('/characters/')){
      await assert(`(()=>{
       const page=getComputedStyle(document.querySelector('.v6-character'));
       const ink=getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
       const field=page.getPropertyValue('--character-field').trim();
       const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
       const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};
       const lum=color=>rgb(color).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
       const bg=lum('color-mix(in srgb,'+field+' 20%,'+ink+')');
       return ['#timeline .story-prose p','#timeline .story-label .eyebrow'].every(selector=>{const fg=lum(getComputedStyle(document.querySelector(selector)).color);return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)>=4.5;});
      })()`,'Character prose contrast falls below 4.5:1');
      for(const section of capture?['journey','timeline']:[]){
       await evaluate(`document.getElementById('${section}').scrollIntoView({behavior:'instant',block:'start'})`);
       await writeFile(resolve(output,'v61-'+section+'-'+name+'.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
      }
     }
     if(path.startsWith('/projects/')){
      await evaluate("document.querySelector('#act-ii').scrollIntoView({behavior:'instant',block:'start'})");
      await writeFile(resolve(output,'v6-act-'+name+'.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
     }
    }
   }
  }
  await go('/');await activate('.film-access '+link('/projects/x-men/')+' img',mobile?'touch':'mouse');await wait(ready('/projects/x-men/'));
  await go('/saga/');await activate('.film-stop'+link('/projects/evolution/').slice(1)+' img',mobile?'touch':'mouse');await wait(ready('/projects/evolution/'));
  await go('/characters/');
  await activate('#original-members > summary',mobile?'touch':'keyboard');await wait("document.querySelector('#original-members').open");
  await activate('.directory-entry'+link('/characters/cyclops/').slice(1),mobile?'touch':'mouse');await wait(ready('/characters/cyclops/'));
  await activate('.journey-film'+link('/projects/x-men/').slice(1),mobile?'touch':'mouse');await wait(ready('/projects/x-men/'));
  await go('/world/');await activate('#institutions > summary',mobile?'touch':'keyboard');await wait("document.querySelector('#institutions').open");
  await activate('.directory-entry'+link('/factions/mrd/').slice(1),mobile?'touch':'mouse');await wait(ready('/factions/mrd/'));
  await go('/characters/angel/');await activate('.search-button',mobile?'touch':'mouse');await wait("document.querySelector('#universe-search')!==null");
  await evaluate("(()=>{const input=document.querySelector('#universe-search');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'GLMK');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await wait('document.querySelector('+JSON.stringify('.search-popover '+link('/projects/god-loves-man-kills/'))+')!==null');
  await activate('.search-popover '+link('/projects/god-loves-man-kills/'),mobile?'touch':'mouse');await wait(ready('/projects/god-loves-man-kills/'));
  await go('/');await writeFile(resolve(output,'pages-'+(mobile?'mobile':'desktop')+'.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 if(consoleErrors.length)throw Error('Browser exceptions: '+consoleErrors.join(', '));
 console.log('PASS: '+search.length+' public search destinations; all 35 biographies; 25 approved palettes and 10 neutral characters; five films; World; Development; original artwork and ordered galleries; keyboard/touch menus; search; desktop/mobile contrast/layouts; no browser exceptions.');
 await call('Browser.close');
}finally{ws?.close();browser.kill();}
