export const beatDefinitions = [
  {id:'opening-image',label:'Opening Image'},
  {id:'theme-stated',label:'Theme Stated'},
  {id:'set-up',label:'Set-Up'},
  {id:'catalyst',label:'Catalyst'},
  {id:'debate',label:'Debate'},
  {id:'break-into-two',label:'Break into Two'},
  {id:'b-story',label:'B Story'},
  {id:'fun-and-games',label:'Fun and Games'},
  {id:'midpoint',label:'Midpoint'},
  {id:'bad-guys-close-in',label:'Bad Guys Close In'},
  {id:'all-is-lost',label:'All Is Lost'},
  {id:'dark-night-of-the-soul',label:'Dark Night of the Soul'},
  {id:'break-into-three',label:'Break into Three'},
  {id:'finale',label:'Finale'},
  {id:'final-image',label:'Final Image'},
] as const;
export const beatActs = [
  {id:'act-i',roman:'I',title:'Setup',start:0,end:5},
  {id:'act-ii',roman:'II',title:'Confrontation',start:5,end:12},
  {id:'act-iii',roman:'III',title:'Resolution',start:12,end:15},
] as const;
export const beatAnchor = (id:string) => `beat-${id}`;
