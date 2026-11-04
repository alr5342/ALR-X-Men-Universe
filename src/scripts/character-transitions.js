// Progressive enhancement: links remain ordinary links; no DOM swaps or router.
const directoryPath=new URL(document.documentElement.dataset.characterDirectoryUrl,location.href).pathname;
const stateKey='x-men-character-directory';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const directory=()=>document.querySelector('[data-character-directory]');
const profile=()=>document.querySelector('[data-character-profile]');
const path=url=>new URL(url,location.href).pathname.replace(/\/?$/,'/');
function pair(from,to){
  const a=path(from),b=path(to);
  const detail=a===directoryPath?b:b===directoryPath?a:null;
  if(!detail?.startsWith(directoryPath))return null;
  const slug=detail.slice(directoryPath.length).replace(/\/$/,'');
  if(!slug||slug.includes('/'))return null;
  return {id:`character-${slug}`,direction:a===directoryPath?'expand':'return'};
}
function saveDirectory(){
  if(!directory())return;
  try{sessionStorage.setItem(stateKey,JSON.stringify({open:[...directory().querySelectorAll('details[open]')].map(el=>el.id),scroll:scrollY}));}catch{/* Navigation works without storage. */}
}
function restoreDirectory(){
  if(!directory())return;
  try{
    const state=JSON.parse(sessionStorage.getItem(stateKey)||'null');
    if(!state)return;
    for(const el of directory().querySelectorAll('details'))el.open=state.open.includes(el.id);
    window.scrollTo({top:state.scroll,behavior:'instant'});
  }catch{/* Browser history restoration remains available. */}
}
function clear(){
  document.querySelectorAll('[data-character-image],[data-character-name],[data-character-description]').forEach(el=>el.style.removeProperty('view-transition-name'));
  delete document.documentElement.dataset.characterTransition;
}
function nameElements(id,direction){
  clear();
  const holder=directory()?.querySelector(`[data-entity-id="${id}"]`)||(profile()?.dataset.characterProfile===id?profile():null);
  if(!holder)return false;
  document.documentElement.dataset.characterTransition=direction;
  for(const part of ['image','name','description']){
    const el=holder.querySelector(`[data-character-${part}]`);
    if(el)el.style.viewTransitionName=`character-${part}`;
  }
  return true;
}
addEventListener('pageswap',event=>{
  saveDirectory();
  const transition=event.viewTransition;
  if(!transition)return;
  const target=event.activation?.entry?.url;
  const matched=target?pair(location.href,target):null;
  if(reduced()||!matched||!nameElements(matched.id,matched.direction)){transition.skipTransition();return;}
  transition.finished.then(clear,clear);
});
addEventListener('pagereveal',event=>{
  const transition=event.viewTransition;
  const from=window.navigation?.activation?.from?.url;
  const matched=from?pair(from,location.href):null;
  if(matched?.direction==='return')restoreDirectory();
  if(!transition)return;
  if(reduced()||!matched||!nameElements(matched.id,matched.direction)){transition.skipTransition();clear();return;}
  transition.finished.then(()=>{
    clear();
    if(matched.direction==='return')directory()?.querySelector(`[data-entity-id="${matched.id}"]`)?.focus({preventScroll:true});
  },clear);
});
// Preserve directory context on browsers with ordinary document navigation too.
addEventListener('pagehide',saveDirectory);
addEventListener('pageshow',()=>{
  if(directory()&&document.referrer&&pair(document.referrer,location.href)?.direction==='return')restoreDirectory();
});
