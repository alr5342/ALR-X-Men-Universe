// Standalone deployment audit: no private research files or credentials required.
import {readdir,readFile,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const base='/ALR-X-Men-Universe/';
const origin='https://alr5342.github.io';
async function walk(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const file=join(dir,entry.name);result.push(...entry.isDirectory()?await walk(file):[file]);}return result;}
const files=await walk('dist');
const pages=new Map();
for(const file of files.filter(f=>f.endsWith('.html'))){const path=file.replaceAll('\\','/').replace(/^dist\//,'').replace(/index\.html$/,'');pages.set(base+path,await readFile(file,'utf8'));}
let links=0;
for(const [path,html] of pages){
  for(const match of html.matchAll(/(?:href|src|component-url|renderer-url)="([^"]+)"/g)){
    const url=new URL(match[1].replaceAll('&amp;','&'),origin+path);
    if(url.origin!==origin)continue;
    if(!url.pathname.startsWith(base))throw Error(`${path}: URL escapes repository prefix: ${url.pathname}`);
    const relative=decodeURIComponent(url.pathname.slice(base.length));
    const target=resolve('dist',relative);
    if(!target.startsWith(resolve('dist')))throw Error('URL escapes static output');
    let entry;try{entry=await stat(target);}catch{throw Error(`${path}: missing target ${url.pathname}`);}
    if(entry.isDirectory())await stat(join(target,'index.html'));
    const doc=pages.get(url.pathname)||pages.get(url.pathname+'/');
    if(url.hash&&doc&&!doc.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`))throw Error(`${path}: missing anchor ${url.href}`);
    links++;
  }
}
const films=['x-men','evolution','exile','god-loves-man-kills','genesis'];
for(const [i,slug] of films.entries()){
  const html=pages.get(`${base}projects/${slug}/`)??'';
  if([...html.matchAll(/class="story-beat\b/g)].length!==15)throw Error(`${slug}: expected fifteen beats`);
  const logo=['cyclops','beast','mojo','glmk','apocalypse'][i];
  if(!html.includes(`${base}images/${logo}.png`))throw Error(`${slug}: missing film logo`);
}
const search=JSON.parse(await readFile('dist/search.json','utf8'));
for(const entity of search)if(!pages.has(new URL(entity.url,origin).pathname)||!entity.url.startsWith(base))throw Error(`Invalid search destination: ${entity.url}`);
if(pages.size!==65||search.filter(e=>e.kind==='character').length!==35)throw Error('Unexpected page/character coverage');
if([...pages.keys()].some(p=>p.includes('/events/')))throw Error('Retired event routes generated');
console.log(`PASS: ${pages.size} pages; ${links} prefixed links/assets/anchors; five films with fifteen beats; ${search.length} search destinations.`);
