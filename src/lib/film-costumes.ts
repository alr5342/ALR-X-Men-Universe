import {existsSync} from 'node:fs';
import type {Entity} from './universe';
import {getVisualIdentity, type ConceptArt} from './visual-identity';
const beastFilmArt:ConceptArt={file:'/images/uniforms/beast-film-uniform.webp',label:'Standard',alt:'Beast, full-body standard costume in the original composition',width:1080,height:1440};

type Group={title:string;characters:[slug:string,file:string][];labels?:Record<string,string>};
// Owner-approved film assignments. Exact existing gallery files, never a fallback outfit.
export const filmCostumes:Record<string,Group[]>={
  F1:[{title:'X-Men',characters:[
    ['cyclops','Black_Cyclops.jpg'],['jean-grey','Jean_Black.jpg'],['iceman','iceman-black-uniform.webp'],['angel','angel-training-uniform.webp'],['beast','beast-film-uniform.webp'],
  ]}],
  F2:[{title:'X-Men',characters:[
    ['cyclops','OG_Cyclops.jpg'],['jean-grey','OG_Jean.jpg'],['iceman','iceman-uniform.webp'],['beast','beast-film-uniform.webp'],['havok','havok-training-uniform.webp'],
  ]}],
  F3:[{title:'X-Men',characters:[
    ['cyclops','Cyclops.jpg'],['jean-grey','JeanGrey.jpg'],['iceman','iceman-uniform.webp'],['beast','beast-film-uniform.webp'],['havok','havok-uniform.webp'],
  ]},{title:'Recruits',characters:[
    ['storm','storm-uniform.webp'],['wolverine','wolverine-uniform.webp'],['nightcrawler','nightcrawler-uniform.webp'],['colossus','colossus-uniform.webp'],['forge','forge-uniform.webp'],
  ]}],
  F4:[{title:'X-Men',characters:[
    ['cyclops','Cyclops.jpg'],['beast','beast-film-uniform.webp'],['angel','angel-uniform.webp'],['storm','storm-uniform.webp'],['wolverine','wolverine-uniform.webp'],['nightcrawler','nightcrawler-uniform.webp'],['colossus','colossus-uniform.webp'],['forge','forge-uniform.webp'],['rogue','rogue-uniform.webp'],['gambit','gambit-uniform.webp'],['shadowcat','shadowcat-training-uniform.webp'],
  ]}],
  F5:[{title:'X-Men',characters:[
    ['cyclops','Cyclops.jpg'],['havok','havok-uniform.webp'],['storm','storm-uniform.webp'],['wolverine','wolverine-uniform.webp'],['nightcrawler','nightcrawler-uniform.webp'],['colossus','colossus-uniform.webp'],['forge','forge-uniform.webp'],['rogue','rogue-uniform.webp'],['gambit','gambit-uniform.webp'],['shadowcat','shadowcat-uniform.webp'],
  ]},{title:'Horsemen of Apocalypse',labels:{'jean-grey':'Pestilence',iceman:'Famine',beast:'War'},characters:[
    ['jean-grey','jean-pestilence-uniform.webp'],['iceman','iceman-famine-uniform.webp'],['beast','beast-war-uniform.webp'],
  ]}],
};

export function getFilmCostumes(filmId:string,entities:Entity[]){
  const seen=new Set<string>();
  return (filmCostumes[filmId]??[]).map(group=>({
    title:group.title,
    // Prefer five; use six when it avoids a trailing row of only one or two.
    columns:group.characters.length>5&&[1,2].includes(group.characters.length%5)&&![1,2].includes(group.characters.length%6)?6:5,
    entries:group.characters.map(([slug,file])=>{
      const id=`character-${slug}`;
      const entity=entities.find(e=>e.id===id&&e.kind==='character');
      const art=slug==='beast'&&file==='beast-film-uniform.webp'?beastFilmArt:getVisualIdentity(id)?.costumes?.find(a=>a.file.split('/').at(-1)===file);
      if(!entity||!art||!existsSync(`public${art.file}`))throw Error(`${filmId}: missing requested character/costume ${slug} / ${file}`);
      if(seen.has(id))throw Error(`${filmId}: duplicate illustrated character ${id}`);
      seen.add(id);
      return {entity,art,label:group.labels?.[slug]??entity.title};
    }),
  }));
}
