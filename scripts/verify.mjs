import { readdir,readFile } from 'node:fs/promises';
import { join } from 'node:path';
async function walk(dir){const paths=[];for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name);paths.push(...e.isDirectory()?await walk(path):[path]);}return paths;}
const files=await walk('dist');
const pages=new Map();
for(const file of files.filter(f=>f.endsWith('.html'))){const route='/'+file.replaceAll('\\','/').replace(/^dist\//,'').replace(/index\.html$/,'');pages.set(route,await readFile(file,'utf8'));}
const errors=[];
for(const [route,html] of pages){for(const match of html.matchAll(/href="(\/[^"\s]*)"/g)){
 const target=match[1];const [path,hash]=target.split('#');const clean=path.split('?')[0];
 const doc=pages.get(clean)||pages.get(clean+'/');
 if(!doc&&!files.some(f=>'/'+f.replaceAll('\\','/').replace(/^dist\//,'')===clean))errors.push(`${route}: broken link ${target}`);
 if(hash&&doc&&!doc.includes(`id="${hash}"`))errors.push(`${route}: missing anchor ${target}`);
}}
for(const route of ['/','/saga/','/characters/','/world/','/development/','/projects/god-loves-man-kills/','/characters/angel/','/characters/magneto/','/characters/rogue/','/characters/gambit/','/factions/acolytes/','/factions/x-men/','/world/movement-kelly/','/world/church-stryker/','/world/friends-of-humanity/'])if(!pages.has(route))errors.push(`Missing route: ${route}`);
const mustLink=(from,to)=>{if(!pages.get(from)?.includes(`href="${to}"`))errors.push(`Missing exploration path: ${from} → ${to}`);};
mustLink('/projects/god-loves-man-kills/','/characters/angel/');
mustLink('/characters/angel/','/projects/god-loves-man-kills/');
mustLink('/projects/god-loves-man-kills/','/characters/magneto/');
mustLink('/characters/magneto/','/factions/acolytes/');
for(const name of ['rogue','gambit']){mustLink('/factions/acolytes/',`/characters/${name}/`);mustLink(`/characters/${name}/`,'/factions/x-men/');}
const angel=pages.get('/characters/angel/')??'',gambit=pages.get('/characters/gambit/')??'',film4=pages.get('/projects/god-loves-man-kills/')??'',development=pages.get('/development/')??'';
for(const id of ['first-class','leaving','family','sinister','relationships','journey','timeline','film5-ending'])if(!angel.includes(`id="${id}"`))errors.push(`Angel biography missing ${id}`);
if(!angel.includes('Horseman'))errors.push('Angel Horseman role missing');
const paragraphText=html=>[...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m=>m[1].replace(/<[^>]*>/g,'')).join(' ');
if(paragraphText(angel).length<paragraphText(gambit).length*2)errors.push('Angel biography not substantially deeper than Gambit');
for(const id of ['opening','xavier','cerebro','alliance','ending','setup','themes'])if(!film4.includes(`id="${id}"`))errors.push(`Film 4 treatment missing ${id}`);
const newCharacters=['cyclops','jean-grey','beast','iceman','professor-xavier','domino','blob','toad','pyro','avalanche'];
for(const name of newCharacters)if(!pages.has(`/characters/${name}/`))errors.push(`Missing character: ${name}`);
for(const [route,html] of pages){
 if(route.startsWith('/events/')||/href="\/events(?:\/|#|")/.test(html))errors.push(`${route}: discontinued event destination remains`);
 if(/beat-matrix|Saga Beat-Sheet Matrix|class="trajectory|Major milestones|Read this event/.test(html))errors.push(`${route}: removed public event/matrix module remains`);
 if(html.includes('Film undefined'))errors.push(`${route}: invalid entity metadata`);
 let depth=0;for(const anchor of html.matchAll(/<a\b[^>]*>|<\/a>/g)){depth+=anchor[0].startsWith('</')?-1:1;if(depth>1)errors.push(`${route}: nested clickable links`);}
 if(route.startsWith('/characters/')&&route!=='/characters/'){
  for(const id of ['journey','timeline'])if(!html.includes(`id="${id}"`))errors.push(`${route}: missing character core section ${id}`);
  if(html.indexOf('id="journey"')>html.indexOf('id="timeline"')||!html.includes('<h2>Character Timeline</h2>'))errors.push(`${route}: incorrect V3 hierarchy`);
  if(html.includes('id="latest-status"')||html.includes('Chronological milestones')||html.includes('Timeline / Character arc')||html.includes('Where the story leaves')||html.includes('<h2>Biography</h2>'))errors.push(`${route}: redundant character module remains`);
  if(/No (?:later|confirmed|further)|not (?:established|documented|described|developed)|remains (?:undecided|unfinished)|Coming soon|TBD|No information available/.test(paragraphText(html)))errors.push(`${route}: absence filler remains`);
 }
 if(html.includes('id="story-connections"')||/class="connections(?:\s|")/.test(html)||/<h[1-6][^>]*>Connections<\//.test(html))errors.push(`${route}: standalone Connections view remains`);
}
const film1=pages.get('/projects/x-men/')??'';
for(const id of ['institute','training','brotherhood','party','first-battle','prison','ending','post-credits','themes','cast'])if(!film1.includes(`id="${id}"`))errors.push(`Film 1 treatment missing ${id}`);
for(const name of [...newCharacters,'angel'])mustLink('/projects/x-men/',`/characters/${name}/`);
for(const faction of ['brotherhood','mrd','x-men'])mustLink('/projects/x-men/',`/factions/${faction}/`);
for(const name of ['domino','blob','toad','pyro','avalanche'])mustLink('/factions/brotherhood/',`/characters/${name}/`);
for(const film of [['/projects/x-men/','cyclops','#D80215'],['/projects/god-loves-man-kills/','glmk','#4B207D']])if(!pages.get(film[0])?.includes(`/images/${film[1]}.png`)||!pages.get(film[0])?.includes(film[2]))errors.push(`Treatment logo/color mismatch: ${film[0]}`);
const cyclops=pages.get('/characters/cyclops/')??'';
for(const film of [1,2,3,4,5])if(!cyclops.includes(`<span>Film ${film}</span>`))errors.push(`Cyclops missing Film ${film} journey`);
const iceman=pages.get('/characters/iceman/')??'';
if(iceman.includes('<span>Film 4</span>'))errors.push('Iceman has an unsupported Film 4 appearance');
if([...pages.keys()].filter(route=>route.startsWith('/projects/')).length!==5)errors.push('Expected five full film treatments');
if([...pages.keys()].filter(route=>route.startsWith('/characters/')&&route!=='/characters/').length!==35)errors.push('Expected thirty-five character biographies');
if(!development.includes('Frequently asked questions')||development.includes('issue-panel')||development.includes('father-agency'))errors.push('Development is not curated creator commentary');
const identities=JSON.parse(await readFile('src/content/film-identity.json','utf8'));
const main=html=>html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1]??'';
const home=main(pages.get('/')??''),saga=main(pages.get('/saga/')??'');
if(home.includes('Featured treatment')||home.includes('home-hero" style=')||/class="film-stop active"/.test(home+saga))errors.push('A film is selected or featured by default');
for(const target of ['/saga/','/characters/','/world/','/development/'])if(!home.includes(`href="${target}"`))errors.push(`Home missing primary entry ${target}`);
for(const [html,label] of [[home,'Home'],[saga,'Saga']]){
 const logoOrder=['cyclops','beast','mojo','glmk','apocalypse'].map(name=>html.indexOf(`src="/images/${name}.png"`));
 if(logoOrder.some((position,i)=>position<0||i>0&&position<=logoOrder[i-1]))errors.push(`${label}: five film identities not in order`);
}
for(const [route,id] of [['/characters/gambit/','background'],['/characters/gambit/','film5'],['/characters/angel/','film5-ending'],['/characters/magneto/','later']]){
 const section=(pages.get(route)??'').match(new RegExp(`<article[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/article>`))?.[1]??'';
 if(!/<div class="section-content">\s*<\/div>/.test(section))errors.push(`${route}#${id}: intentionally empty content is not blank`);
}
function orderedLinks(html,selector,expected){const actual=[...html.matchAll(selector)].map(m=>m[1]);return JSON.stringify(actual)===JSON.stringify(expected);}
const expectedCharacters=['cyclops','jean-grey','angel','beast','iceman','professor-xavier','storm','magneto','wolverine','havok','polaris','shadowcat','nightcrawler','colossus','forge','rogue','gambit','domino','blob','toad','pyro','avalanche','william-stryker','robert-kelly','warren-worthington-ii','bolivar-trask','mr-sinister','apocalypse','mojo','callisto','caliban','leech','madin','artie','longshot'];
const characterDirectory=pages.get('/characters/')??'',world=pages.get('/world/')??'';
if(!orderedLinks(characterDirectory,/class="directory-entry" href="\/characters\/([^/]+)\//g,expectedCharacters))errors.push('Character directory grouping or narrative order differs');
const directoryIds=html=>[...html.matchAll(/class="directory-entry"[^>]*data-entity-id="([^"]+)"/g)].map(m=>m[1]);
const characterIds=directoryIds(characterDirectory),worldIds=directoryIds(world);
if(characterIds.length!==35||new Set(characterIds).size!==35)errors.push('Each of 35 characters must occur exactly once');
if(worldIds.length!==20||new Set(worldIds).size!==20)errors.push('Each retained World entry must occur exactly once');
for(const id of ['x-men','original-members','founder-mentor','later-recruits','adversaries','brotherhood','anti-mutant-figures','marauders','other-antagonists','allies','morlocks','independent-allies'])if(!new RegExp(`<details[^>]*id="${id}"`).test(characterDirectory))errors.push(`Missing collapsible character group ${id}`);
for(const id of ['organizations','institutions','locations','lore'])if(!new RegExp(`<details[^>]*id="${id}"`).test(world))errors.push(`Missing collapsible World group ${id}`);
for(const path of [...pages.keys()].filter(p=>/^\/(characters|factions|locations|lore|world)\/[^/]+\/$/.test(p)))mustLink(path.startsWith('/characters/')?'/characters/':'/world/',path);
if(!orderedLinks(world,/class="directory-entry" href="\/factions\/([^/]+)\//g,['x-men','morlocks','brotherhood','marauders','mojo-production','acolytes','four-horsemen','new-mutants','mrd','sentinel-program']))errors.push('World faction grouping or narrative order differs');
for(const [html,expected] of [[film1,['cyclops','professor-xavier','iceman','jean-grey','angel','domino','beast','blob','toad','pyro','avalanche','robert-kelly','warren-worthington-ii','bolivar-trask']],[film4,['cyclops','shadowcat','magneto','storm','angel','william-stryker','robert-kelly','professor-xavier','rogue','jean-grey','wolverine','nightcrawler','colossus','gambit','warren-worthington-ii','bolivar-trask','forge','beast','mr-sinister']]]){
 if(!orderedLinks(html,/class="cast-row" href="\/characters\/([^/]+)\//g,expected))errors.push('Film-specific cast order differs');
}
const expectedColors=['#D80215','#04479E','#FBCC16','#4B207D','#5F7E9B'];
const expectedImages=['cyclops','beast','mojo','glmk','apocalypse'];
for(let i=0;i<5;i++){
 const identity=identities.films[i];if(identity.projectId!==`F${i+1}`||identity.color!==expectedColors[i]||identity.assetId!==expectedImages[i])errors.push(`Film ${i+1} identity mismatch`);
 const chapter=(pages.get('/saga/')??'').match(new RegExp(`<a id="F${i+1}"[\\s\\S]*?<\\/a>`))?.[0]??'';
 if(!chapter.includes(`/images/${expectedImages[i]}.png`)||!chapter.includes(expectedColors[i]))errors.push(`Film ${i+1} rendered logo/color mismatch`);
}
// The approved review independently defines the expected mapping; these checks do
// not infer structural presence from prose length or from the site's own labels.
const review=await readFile('../PROJECT_RESEARCH/BEAT_SHEET_REVIEW.md','utf8');
const unescapeHtml=text=>text.replace(/&#39;|&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
for(let film=1;film<=5;film++){
 const raw=await readFile(`src/content/entities/F${film}.md`,'utf8');
 const data=Object.fromEntries(raw.split('---')[1].trim().split(/\n(?=[A-Za-z]\w*:)/).map(line=>{const i=line.indexOf(':');return [line.slice(0,i),JSON.parse(line.slice(i+1))];}));
 const route=`/projects/${data.slug}/`,html=pages.get(route)??'';
 const rows=review.split(new RegExp(`## Film ${film}[^\\n]*\\n`))[1].split('\n## ')[0].split('\n').filter(line=>/^\| \d+ \|/.test(line)).map(line=>line.split('|').slice(1,-1).map(s=>s.trim()));
 const articles=[...html.matchAll(/<article\b[^>]*\bdata-beat="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
 if(rows.length!==15||data.beats?.length!==15||articles.length!==15){errors.push(`Film ${film}: expected exactly fifteen approved beats`);continue;}
 for(const act of ['act-i','act-ii','act-iii'])if(!html.includes(`id="${act}"`))errors.push(`${route}: missing ${act}`);
 for(const [index,row] of rows.entries()){
  const id=row[1].toLowerCase().replace(/[^a-z0-9]+/g,'-'),status=row[4]==='PRESENT'?'present':'not-established';
  const dataBeat=data.beats[index],article=articles[index];
  if(dataBeat.id!==id||dataBeat.title!==row[2]||dataBeat.status!==status)errors.push(`Film ${film}/${id}: differs from approved mapping`);
  if(article[1]!==id||!article[0].includes(`id="beat-${id}"`)||!article[0].includes(`data-beat-status="${status}"`))errors.push(`${route}: rendered beat/order/status mismatch at ${id}`);
  const title=unescapeHtml(article[2].match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]??'');
  if(title!==row[2])errors.push(`${route}: heading differs from approval at ${id}`);
  if(status==='not-established'){
   if(!/<div class="beat-content">\s*<\/div>/.test(article[2])||dataBeat.paragraphs.length||dataBeat.eventIds.length)errors.push(`${route}#beat-${id}: unsupported beat is not genuinely blank`);
  }else if(!dataBeat.paragraphs.length||!/<p[\s>]/.test(article[2].split('class="beat-content"')[1]??''))errors.push(`${route}#beat-${id}: populated content missing`);
  if(!dataBeat.sourceRefs.length||!dataBeat.sourceNote)errors.push(`Film ${film}/${id}: provenance missing`);
 }
 const identity=identities.films[film-1];
 if(!html.includes(`/images/${identity.assetId}.png`)||!html.includes(identity.color))errors.push(`${route}: film identity changed`);
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)errors.push(`${route}: duplicate anchor IDs`);
}
if(/ribbon-detail|saga-selection|<button[^>]*class="film-stop/.test(saga))errors.push('Saga still uses an intermediate film selection');
if([...saga.matchAll(/class="film-stop" href="\/projects\//g)].length!==5)errors.push('Expected five directly linked film ribbon cards');
const search=JSON.parse(await readFile('dist/search.json','utf8'));
if(search.some(e=>e.kind==='event'||e.url.startsWith('/events/')))errors.push('Removed event destinations remain in search');
for(const [route,html] of pages){if(!/^\/(characters|factions|locations|lore|projects|world)\/[^/]+\/$/.test(route))continue;
 if(!search.some(e=>e.url===route))errors.push(`Search missing ${route}`);
 if(!html.includes('href="/saga/"'))errors.push(`No return to saga: ${route}`);
}
for(const [route,id] of [['/factions/four-horsemen/','outcomes']]){
 const section=(pages.get(route)??'').match(new RegExp(`<article[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/article>`))?.[1]??'';
 if(!/<div class="section-content">\s*<\/div>/.test(section))errors.push(`${route}#${id}: open mechanics must remain blank`);
}
for(const route of ['/locations/xavier-institute/','/locations/morlock-tunnels/','/locations/sinister-laboratory/','/locations/mojoworld/','/lore/cerebro/','/lore/mutation-research/','/lore/mutant-public-awareness/']){if(!pages.has(route))errors.push(`Missing world route ${route}`);mustLink('/world/',route);}
if([...pages.keys()].filter(r=>r.startsWith('/factions/')).length!==10||[...pages.keys()].some(r=>r.startsWith('/events/')))errors.push('Expected ten factions and no public event pages');
mustLink('/characters/beast/','/projects/evolution/');mustLink('/projects/exile/','/locations/mojoworld/');
const f5Text=paragraphText(pages.get('/projects/genesis/')??'');if(!f5Text.includes('definitively defeated')||!f5Text.includes('mass awakening'))errors.push('Owner-approved Film 5 ending missing');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log(`PASS: ${pages.size} pages; all internal links/anchors; no public events or matrix; 75 approved beats preserved; 35 characters and 20 World entries grouped once; direct film cards; search coverage and narrative ordering.`);
