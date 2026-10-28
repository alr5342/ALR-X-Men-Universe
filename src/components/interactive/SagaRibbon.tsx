import type {CSSProperties} from 'react';
import type {Entity} from '../../lib/universe';
type Logo={path:string;alt:string;width:number;height:number};
export default function SagaRibbon({projects,assets}:{projects:Entity[];assets:Record<string,Logo>}){
 const ordered=[...projects].sort((a,b)=>(a.sagaOrder??0)-(b.sagaOrder??0));
 return <div className="saga-experience"><div className="section-top"><p className="eyebrow">One story / Five chapters in order</p></div>
 <nav className="saga-ribbon" aria-label="The five film treatments">{ordered.map(p=>{const logo=assets[p.imageIds[0]];return <a className="film-stop" href={p.url} style={{'--film-color':p.filmColor} as CSSProperties} key={p.id}><span className="eyebrow">Film {p.sagaOrder}</span><img className="film-logo" src={logo.path} alt="" width={logo.width} height={logo.height}/><span className="eyebrow">{p.actRole}</span><strong>{p.title}</strong></a>;})}</nav></div>;
}
