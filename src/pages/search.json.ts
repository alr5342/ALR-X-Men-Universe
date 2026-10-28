import {getUniverse,isPublicEntity} from '../lib/universe';
export async function GET(){const {entities}=await getUniverse();return new Response(JSON.stringify(entities.filter(isPublicEntity).map(({title,aliases,summary,kind,status,url})=>({title,aliases,summary,kind,status,url}))),{headers:{'Content-Type':'application/json'}});}
