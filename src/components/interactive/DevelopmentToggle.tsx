import { useEffect,useState } from 'react';
export default function DevelopmentToggle(){
 const [on,setOn]=useState(false);
 useEffect(()=>{try{const saved=localStorage.getItem('xmen-development')==='true';setOn(saved);document.documentElement.dataset.development=String(saved);}catch{}},[]);
 function toggle(){const next=!on;setOn(next);document.documentElement.dataset.development=String(next);try{localStorage.setItem('xmen-development',String(next));}catch{}window.dispatchEvent(new CustomEvent('development-change',{detail:next}));}
 return <button className="development-button" onClick={toggle} aria-pressed={on}><span aria-hidden="true">{on?'◉':'○'}</span> Notes <span className="sr-only">Development annotations</span></button>;
}
