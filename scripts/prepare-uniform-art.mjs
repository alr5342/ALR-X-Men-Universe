// Deterministic, owner-approved background conversion. Never writes to sources.
// Uses sharp already supplied by Astro. Run manually with the original art folder.
import sharp from 'sharp';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const input=resolve(process.argv[2]??'../X-Men Uniforms');
const output=resolve('public/images/uniforms');
const crops={
  Angel:{left:650,top:440,width:800,height:840},
  Colossus:{left:450,top:0,width:1000,height:980},
  Beast:{left:189,top:520,width:682,height:562},
  Gambit:{left:210,top:0,width:660,height:693},
  Nightcrawler:{left:253,top:55,width:594,height:726},
  Rogue:{left:252,top:0,width:616,height:715},
  Shadowcat:{left:230,top:60,width:660,height:660},
  Storm:{left:274,top:5,width:572,height:693},
  Wolverine:{left:233,top:70,width:605,height:704},
  Iceman:{left:242,top:5,width:616,height:671},
  Iceman_Black:{left:242,top:5,width:616,height:671},
};
// Visually verified backdrop pockets in Beast's crouched pose.
const pocketSeeds={Beast:[[460,965],[510,1200]]};
const variants={
  Angel_Training:{character:'Angel',label:'Training Uniform',placement:'before',background:'white',seeds:[]},
  Colossus_Training:{character:'Colossus',label:'Training Uniform',placement:'before',background:'white',seeds:[]},
  Beast_War:{character:'Beast',label:'Horseman of War',seeds:[[475,960],[510,1210]]},
  Iceman_Famine:{character:'Iceman',label:'Horseman of Famine',seeds:[[760,300],[300,600],[500,1150]]},
  Jean_Pestilence:{character:'Jean Grey',label:'Horseman of Pestilence',source:'Jean_Pestilence_V2.png',background:'black',seeds:[],normalization:{height:1437,padding:{top:2,bottom:1,left:82,right:82},width:1080,canvasHeight:1440}},
  Shadowcat_Training:{character:'Shadowcat',label:'Training Uniform',placement:'before',seeds:[[295,350],[438,350]],normalization:{height:1440,padding:{top:0,bottom:0,left:0,right:0},width:1080,canvasHeight:1440}},
};
const angelCrop={left:420,top:400,width:1200,height:1600};
const colossusCrop={left:234,top:0,width:1407,height:1876};
const galleryCrops={Angel:angelCrop,Angel_Training:angelCrop,Colossus:colossusCrop,Colossus_Training:colossusCrop,Beast:{left:150,top:520,width:760,height:920},Beast_War:{left:150,top:450,width:760,height:1000}};
const whiteUniforms={
  Angel:{source:'Angel.png',seeds:[[1050,1330],[910,600],[1100,600]]},
  Angel_Training:{source:'Angel_Training.png',seeds:[[1050,1330],[910,600],[1100,600]]},
  Colossus:{source:'Colossus.jpg',seeds:[[1080,220],[900,1200],[670,550]]},
  Colossus_Training:{source:'Colossus_Training.png',seeds:[[1080,220],[900,1200],[670,550]]},
};
await mkdir(output,{recursive:true});
const records=[];
for(const [name,crop] of Object.entries({...crops,...Object.fromEntries(Object.keys(variants).map(name=>[name,null]))})){
  const variant=variants[name];
  const whiteUniform=whiteUniforms[name];
  const isIceman=name.startsWith('Iceman');
  const filename=whiteUniform?.source??variant?.source??name+(isIceman||variant?'.png':'.webp');
  const source=join(input,filename);
  const original=await readFile(source);
  const {data,info}=await sharp(original).flatten({background:'#000'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const {width,height}=info,total=width*height;
  const grey=!whiteUniform&&((Boolean(variant)&&variant.background!=='black')||isIceman||(data[0]===144&&data[1]===144&&data[2]===144));
  let backgroundPixels=0,holes=0;
  const result=Buffer.from(data);
  if(whiteUniform){
    // Flood only near-white paper connected to the canvas or reviewed gaps.
    // Feather shading, white costume panels and metal highlights stay intact.
    const mask=new Uint8Array(total),queue=new Int32Array(total);
    let start=0,end=0;
    const visit=p=>{if(mask[p])return;const i=p*3,x=p%width,y=Math.floor(p/width);
      const low=Math.min(data[i],data[i+1],data[i+2]),high=Math.max(data[i],data[i+1],data[i+2]);
      // The supplied Angel composite has neutral paper shading beside the collar.
      // Restrict that lower threshold to the reviewed gaps, outside the feathers.
      const collarPaper=name.startsWith('Angel')&&y>=615&&y<=710&&((x>=900&&x<=965)||(x>=1065&&x<=1120))&&low>=210&&high-low<=2;
      if(low<248&&!collarPaper)return;
      mask[p]=1;queue[end++]=p;
    };
    for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x);}
    for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1);}
    for(const [x,y] of whiteUniform.seeds)visit(y*width+x);
    while(start<end){const p=queue[start++],x=p%width,y=Math.floor(p/width);
      result.fill(0,p*3,p*3+3);backgroundPixels++;
      if(x)visit(p-1);if(x<width-1)visit(p+1);if(y)visit(p-width);if(y<height-1)visit(p+width);
    }
    // Remove a single neutral paper-matte fringe, never interior highlights.
    for(let p=0;p<total;p++)if(!mask[p]){
      const x=p%width,y=Math.floor(p/width),i=p*3,r=data[i],g=data[i+1],b=data[i+2];
      if(Math.min(r,g,b)<180||Math.max(r,g,b)-Math.min(r,g,b)>10)continue;
      if((x&&mask[p-1])||(x<width-1&&mask[p+1])||(y&&mask[p-width])||(y<height-1&&mask[p+width]))result.fill(0,i,i+3);
    }
  }else if(grey){
    const candidate=new Uint8Array(total),visited=new Uint8Array(total),mask=new Uint8Array(total),queue=new Int32Array(total);
    for(let p=0;p<total;p++){const i=p*3,r=data[i],g=data[i+1],b=data[i+2];candidate[p]=variant
      ?(Math.min(r,g,b)>=110&&Math.max(r,g,b)<=175&&Math.max(r,g,b)-Math.min(r,g,b)<=10&&(['Beast_War','Shadowcat_Training'].includes(name)||(r>=g&&b-g>=-2))?1:0)
      :isIceman
      ?(Math.min(r,g,b)>=90&&Math.max(r,g,b)<=180&&Math.max(r,g,b)-Math.min(r,g,b)<=10?1:0)
      :(Math.max(Math.abs(r-144),Math.abs(g-144),Math.abs(b-144))<=65&&Math.max(r,g,b)-Math.min(r,g,b)<=50?1:0);}
    for(let seed=0;seed<total;seed++){
      if(!candidate[seed]||visited[seed])continue;
      let start=0,end=1,touchesEdge=false,flat=0,confirmedPocket=false;queue[0]=seed;visited[seed]=1;
      while(start<end){const p=queue[start++],x=p%width,y=Math.floor(p/width),i=p*3;
        if(!x||!y||x===width-1||y===height-1)touchesEdge=true;
        if(Math.max(Math.abs(data[i]-144),Math.abs(data[i+1]-144),Math.abs(data[i+2]-144))<=2)flat++;
        if((variant?.seeds??pocketSeeds[name]??[]).some(([sx,sy])=>p===sy*width+sx))confirmedPocket=true;
        const next=[x>0?p-1:-1,x<width-1?p+1:-1,y>0?p-width:-1,y<height-1?p+width:-1];
        for(const q of next)if(q>=0&&candidate[q]&&!visited[q]){visited[q]=1;queue[end++]=q;}
      }
      // Include large flat backdrop pockets between limbs; not arbitrary grey suit details.
      // Grey boot armor can touch the bottom of the supplied canvas. An edge
      // contact alone is insufficient: genuine backdrop has a flat-grey core.
      if(variant?(touchesEdge||confirmedPocket):isIceman?(touchesEdge||end>=25):((touchesEdge&&flat/end>.4)||confirmedPocket||(end>=40&&flat/end>.7))){
        if(!touchesEdge)holes++;
        for(let j=0;j<end;j++){const p=queue[j];mask[p]=1;result.fill(0,p*3,p*3+3);backgroundPixels++;}
      }
    }
    // Neutral antialiased grey immediately outside the black linework becomes black.
    // Colored/opaque interior pixels remain unchanged, including metal, skin and hair.
    for(let p=0;p<total;p++)if(!mask[p]){
      const x=p%width,y=Math.floor(p/width),i=p*3,r=data[i],g=data[i+1],b=data[i+2];
      if(Math.max(r,g,b)-Math.min(r,g,b)>(variant?10:4)||r>(variant?175:144))continue;
      let edge=false;
      for(let dy=-1;dy<=1&&!edge;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<width&&ny>=0&&ny<height&&mask[ny*width+nx]){edge=true;break;}}
      if(edge)result.fill(0,i,i+3);
    }
  }
  // Remove only the neutral one-pixel scan border on the two new source canvases.
  if(['Jean_Pestilence','Shadowcat_Training'].includes(name))for(let p=0;p<total;p++){
    const x=p%width,y=Math.floor(p/width),i=p*3;
    if(x&&y&&x!==width-1&&y!==height-1)continue;
    const values=[data[i],data[i+1],data[i+2]];
    if(Math.max(...values)<60&&Math.max(...values)-Math.min(...values)<=1)result.fill(0,i,i+3);
  }
  const slug=name.toLowerCase().replace('_','-');
  const raw={raw:{width,height,channels:3}};
  const galleryCrop=galleryCrops[name];
  const gallery=sharp(result,raw);
  if(galleryCrop)gallery.extract(galleryCrop);
  // Match the existing concepts' full-body scale and 3:4 black canvas.
  // Full body stays visible; Angel's outer wings may extend beyond the frame.
  const normalization=whiteUniform?{height:1440,padding:{top:0,bottom:0,left:0,right:0},width:1080,canvasHeight:1440}:variant?.normalization;
  if(normalization)gallery.resize({height:normalization.height}).extend({...normalization.padding,background:'#000'});
  await gallery.webp({lossless:true}).toFile(join(output,slug+'-uniform.webp'));
  if(crop&&name!=='Iceman_Black')await sharp(result,raw).extract(crop).webp({lossless:true}).toFile(join(output,slug+'-header.webp'));
  records.push({character:name,source:`X-Men Uniforms/${filename}`,sourceSha256:createHash('sha256').update(original).digest('hex'),sourceSize:{width,height},gallerySize:normalization?{width:normalization.width,height:normalization.canvasHeight}:{width:galleryCrop?.width??width,height:galleryCrop?.height??height},...(galleryCrop?{galleryCrop}:{}),...(normalization?{normalization}:{}),background:whiteUniform?'white converted to black':grey?'grey converted to black':'already black; preserved',backgroundPixels,enclosedBackdropPockets:holes,...(crop?{headerCrop:crop}:{})});
}
const black=records.find(record=>record.character==='Iceman_Black');
const variantCostume=record=>({file:record.character.toLowerCase().replace('_','-')+'-uniform.webp',label:variants[record.character].label,...record.gallerySize});
const artwork=records.filter(record=>record!==black&&!variants[record.character]).map(record=>({...record,costumes:[
  ...records.filter(variant=>variants[variant.character]?.character===record.character&&variants[variant.character]?.placement==='before').map(variantCostume),
  ...(record.character==='Iceman'
  ?[{file:'iceman-black-uniform.webp',label:'Training Uniform',...black.gallerySize},{file:'iceman-uniform.webp',label:'Standard',...record.gallerySize}]
  :[{file:record.character.toLowerCase()+'-uniform.webp',label:whiteUniforms[record.character]?'Standard':'Uniform',...record.gallerySize}]),
  ...records.filter(variant=>variants[variant.character]?.character===record.character&&variants[variant.character]?.placement!=='before').map(variantCostume),
]}));
await mkdir('src/design',{recursive:true});
await writeFile('src/design/uniform-art.json',JSON.stringify({credit:{name:'Cody Conyers',handle:'art_by.coco',contribution:'Character concept art'},method:'Owner-approved deterministic masking of neutral grey backdrop; no generation, recoloring or filtering of character art. Header crops selected from character body landmarks.',artwork,additionalSources:[black,...records.filter(record=>variants[record.character])]},null,2)+'\n');
console.log(JSON.stringify(records.map(({character,background,backgroundPixels,enclosedBackdropPockets})=>({character,background,backgroundPixels,enclosedBackdropPockets})),null,2));
