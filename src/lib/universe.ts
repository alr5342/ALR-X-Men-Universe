import { getCollection, type CollectionEntry } from 'astro:content';
import { existsSync } from 'node:fs';
import assets from '../content/assets.json';
import evidence from '../content/evidence.json';
import {beatDefinitions} from './beats';
export type Entity = CollectionEntry<'entities'>['data'] & { paragraphs: string[]; url: string };
export type Link = CollectionEntry<'relationships'>['data'];
export type Issue = CollectionEntry<'issues'>['data'];
export type Neighbor = { entity: Entity; link: Link };
export const sectionFor = {project:'projects',character:'characters',faction:'factions',event:'events',context:'world',location:'locations',lore:'lore'};
export { assets, evidence };
export function isPublicEntity(entity:Pick<Entity,'kind'>) { return entity.kind!=='event'; }
let cached: ReturnType<typeof load> | undefined;
async function load() {
  const [records, edges, notes] = await Promise.all([getCollection('entities'),getCollection('relationships'),getCollection('issues')]);
  const entities: Entity[] = records.map(({data, body}) => ({...data, paragraphs:(body ?? '').trim().split(/\n\s*\n/).filter(Boolean),
    url:data.pageMode === 'preview' ? `/saga/#${data.id}` : data.pageMode === 'context' ? `/world/#${data.id}` : `/${sectionFor[data.kind]}/${data.slug}/`}));
  entities.sort(editorialOrder);
  const links = edges.map(e=>e.data), issues = notes.map(n=>n.data);
  const byId = new Map(entities.map(e=>[e.id,e]));
  if (byId.size !== entities.length) throw Error('Duplicate entity ID');
  const routes = entities.filter(e=>e.pageMode==='full'&&isPublicEntity(e)).map(e=>e.url);
  if (new Set(routes).size !== routes.length) throw Error('Duplicate route');
  const refs = (ids:string[]) => ids.forEach(id=>{if(!byId.has(id)) throw Error(`Dangling entity reference: ${id}`);});
  const sources = (ids:string[]) => ids.forEach(id=>{if(!(id in evidence)) throw Error(`Unknown evidence: ${id}`);});
  entities.forEach(e=>{sources(e.sourceRefs); if(e.projectId)refs([e.projectId]); e.imageIds.forEach(id=>{if(!(id in assets))throw Error(`Unknown asset: ${id}`);});
    refs(e.premiseEventIds);
    e.beats.forEach(b=>{sources(b.sourceRefs);refs(b.eventIds);});
    if(e.kind==='project'&&e.sagaOrder){
      if(e.beats.length!==15)throw Error(`${e.id}: expected fifteen story beats`);
      e.beats.forEach((b,i)=>{
        if(b.id!==beatDefinitions[i].id)throw Error(`${e.id}: incorrect beat order`);
        if(b.status==='not-established'&&(b.paragraphs.length||b.eventIds.length||b.title!==beatDefinitions[i].label))throw Error(`${e.id}/${b.id}: unsupported beat must be blank`);
        if(b.status==='present'&&!b.paragraphs.some(p=>p.trim()))throw Error(`${e.id}/${b.id}: present beat has no narrative`);
      });
    }
    e.sections.forEach(s=>{sources(s.sourceRefs);refs(s.eventIds);});
    e.journey.forEach(j=>{refs([j.projectId,...j.eventIds]);sources(j.sourceRefs);});
  });
  links.forEach(l=>{refs([l.fromId,l.toId,...l.eventIds]);sources(l.sourceRefs);
    if(l.kind==='member-of' && (byId.get(l.fromId)?.kind!=='character'||byId.get(l.toId)?.kind!=='faction')) throw Error(`Invalid membership: ${l.id}`);
    if(l.kind==='occurs-in' && (byId.get(l.fromId)?.kind!=='event'||byId.get(l.toId)?.kind!=='project')) throw Error(`Invalid event context: ${l.id}`);
  });
  issues.forEach(i=>{refs(i.subjectIds);sources(i.sourceRefs);});
  for(const asset of Object.values(assets)) if(!existsSync(`public${asset.path}`)) throw Error(`Missing image: ${asset.path}`);
  return { entities, links, issues, byId };
}
export function getUniverse() { return cached ??= load(); }
export function editorialOrder(a:Entity,b:Entity) { return (a.narrativeOrder??Infinity)-(b.narrativeOrder??Infinity); }
export function neighbors(id:string, entities:Entity[], links:Link[]): Neighbor[] {
  return links.filter(l=>l.fromId===id||l.toId===id).map(link=>({link,entity:entities.find(e=>e.id===(link.fromId===id?link.toId:link.fromId))!})).sort((a,b)=>editorialOrder(a.entity,b.entity));
}
export function milestones(id:string, entities:Entity[], links:Link[]) {
  const ids=new Set<string>();
  links.filter(l=>l.fromId===id||l.toId===id).forEach(l=>{ids.add(l.fromId);ids.add(l.toId);l.eventIds.forEach(e=>ids.add(e));});
  return entities.filter(e=>e.kind==='event'&&(e.projectId===id||ids.has(e.id))).sort((a,b)=>(entities.find(p=>p.id===a.projectId)?.sagaOrder??0)-(entities.find(p=>p.id===b.projectId)?.sagaOrder??0)||(a.order??0)-(b.order??0));
}
