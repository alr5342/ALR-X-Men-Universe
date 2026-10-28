import type {Entity,Link} from './universe';
export type DirectoryLeaf={id:string;title:string;items:Entity[]};
export type DirectoryGroup=DirectoryLeaf&{children?:DirectoryLeaf[];open?:boolean};
function validate(groups:DirectoryGroup[],expected:Entity[]){
  const ids=groups.flatMap(g=>[...g.items,...(g.children??[]).flatMap(child=>child.items)]).map(e=>e.id);
  if(new Set(ids).size!==ids.length||expected.some(e=>!ids.includes(e.id))||ids.length!==expected.length)throw Error('Directory must contain each entity exactly once');
  return groups;
}
export function characterDirectory(entities:Entity[],links:Link[]){
  const characters=entities.filter(e=>e.kind==='character');
  const select=(ids:string[])=>characters.filter(e=>ids.includes(e.id));
  const members=(faction:string)=>links.filter(l=>l.kind==='member-of'&&l.toId===faction).map(l=>l.fromId);
  const originals=['cyclops','jean-grey','angel','beast','iceman'].map(s=>'character-'+s);
  const mentor=['character-professor-xavier'];
  return validate([
    {id:'x-men',title:'X-Men',items:[],open:true,children:[
      {id:'original-members',title:'Original Members',items:select(originals)},
      {id:'founder-mentor',title:'Founder & Mentor',items:select(mentor)},
      {id:'later-recruits',title:'Later Recruits',items:select(members('faction-x-men').filter(id=>![...originals,...mentor].includes(id)))},
    ]},
    {id:'adversaries',title:'Adversaries',items:[],children:[
      {id:'brotherhood',title:'Brotherhood',items:select(members('faction-brotherhood'))},
      {id:'anti-mutant-figures',title:'Anti-Mutant Movement & Institutions',items:select(['william-stryker','robert-kelly','warren-worthington-ii','bolivar-trask'].map(s=>'character-'+s))},
      {id:'marauders',title:'Marauders',items:select(members('faction-marauders'))},
      {id:'other-antagonists',title:'Other Major Antagonists',items:select(['character-apocalypse','character-mojo'])},
    ]},
    {id:'allies',title:'Allies & Independent Figures',items:[],children:[
      {id:'morlocks',title:'Morlocks',items:select(members('faction-morlocks'))},
      {id:'independent-allies',title:'Independent Allies',items:select(['character-longshot'])},
    ]},
  ],characters);
}
export function worldDirectory(entities:Entity[]){
  const world=entities.filter(e=>['faction','context','location','lore'].includes(e.kind));
  const institutions=['faction-mrd','faction-sentinel-program'];
  return validate([
    {id:'organizations',title:'Teams & Organizations',items:world.filter(e=>e.kind==='faction'&&!institutions.includes(e.id))},
    {id:'institutions',title:'Institutions & Political Movements',items:world.filter(e=>institutions.includes(e.id)||e.kind==='context')},
    {id:'locations',title:'Locations',items:world.filter(e=>e.kind==='location')},
    {id:'lore',title:'Lore & Worldbuilding',items:world.filter(e=>e.kind==='lore')},
  ],world);
}
