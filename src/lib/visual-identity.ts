// V6.2 presentation data. Story/canon data remains in src/content/ unchanged.
import characterPalettes from '../design/character-palettes.json';
import uniformArt from '../design/uniform-art.json';
export type ConceptArt = {file:string;label:string;alt:string;width:number;height:number;preparedHeader?:boolean};
export type VisualIdentity = {
  kind:'character'|'film'|'faction';
  motif:'portrait'|'editorial'|'visor'|'broadcast'|'emblem';
  primary:string;secondary:string;accent?:string;colorField?:'primary'|'secondary';
  headerArt?:ConceptArt;
  costumes?:ConceptArt[];
};
const costume=(file:string,label:string,name:string):ConceptArt=>({file:`/images/concepts/${file}`,label,alt:`${name}, full-body ${label.toLowerCase()} costume concept`,width:1080,height:1440});
const cyclops=[costume('Black_Cyclops.jpg','Black','Cyclops'),costume('OG_Cyclops.jpg','OG','Cyclops'),costume('Cyclops.jpg','Standard','Cyclops')];
const jean=[costume('Jean_Black.jpg','Black','Jean Grey'),costume('OG_Jean.jpg','OG','Jean Grey'),costume('JeanGrey.jpg','Standard','Jean Grey')];
const characterIdentities:Record<string,VisualIdentity>=Object.fromEntries(Object.entries(characterPalettes.palettes).map(([slug,palette])=>[
  `character-${slug}`,
  {kind:'character',motif:'editorial',primary:palette.primary,secondary:palette.secondary,
    ...(palette.accent?{accent:palette.accent}:{}),
    ...(palette.primary==='#161616'?{colorField:'secondary'}:{}),
  } satisfies VisualIdentity,
]));
const uniformIdentities:Record<string,VisualIdentity>=Object.fromEntries(uniformArt.artwork.map(({character,costumes,headerCrop})=>{
  const slug=character.toLowerCase();
  const gallery:ConceptArt[]=costumes.map(({file,label,width,height})=>({file:`/images/uniforms/${file}`,label,width,height,alt:`${character}, full-body ${label.toLowerCase()} costume concept`}));
  const art=gallery.find(art=>art.label==='Standard')??gallery[0];
  return [`character-${slug}`,{...characterIdentities[`character-${slug}`],motif:'portrait',costumes:gallery,
    headerArt:{...art,file:`/images/uniforms/${slug}-header.webp`,width:headerCrop.width,height:headerCrop.height,preparedHeader:true,alt:`${character}, upper-body crop of the supplied uniform concept`},
  } satisfies VisualIdentity];
}));
const identities:Record<string,VisualIdentity>={
  ...characterIdentities,
  ...uniformIdentities,
  'character-cyclops':{...characterIdentities['character-cyclops'],motif:'portrait',headerArt:{...cyclops[2],alt:'Cyclops in his standard costume, original illustration in the approved header crop'},costumes:cyclops},
  'character-jean-grey':{...characterIdentities['character-jean-grey'],motif:'portrait',headerArt:{...jean[2],alt:'Jean Grey in her standard costume, original illustration in the approved header crop'},costumes:jean},
  F1:{kind:'film',motif:'visor',primary:'#D80215',secondary:'#D80215'},
  F3:{kind:'film',motif:'broadcast',primary:'#FBCC16',secondary:'#FBCC16'},
  'faction-x-men':{kind:'faction',motif:'emblem',primary:'#D80215',secondary:'#EFEFEF',headerArt:{file:'/images/concepts/x-logo.png',label:'X-Men',alt:'Red and black X-Men team emblem',width:1179,height:1192}},
};
export const getVisualIdentity=(id:string):VisualIdentity|undefined=>identities[id];
export function identityStyle(identity:VisualIdentity){return `--identity-primary:${identity.primary};--identity-secondary:${identity.secondary};${identity.accent?`--identity-accent:${identity.accent};`:''}${identity.colorField?`--character-field:var(--identity-${identity.colorField});`:''}`;}
