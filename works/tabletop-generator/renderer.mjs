import {paperGrain,inkBreak} from './material-assets.mjs';
import {washLight,washDensity} from './watercolor-assets.mjs';
const n=x=>Number(x.toFixed(3));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function renderSVG(scene){
 const {settings:s,palette:p,width:w,height:h}=scene,top=s.composition==='top';let defs='',serial=0;
 const ellipse=(x,y,rx,ry)=>`<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}"/>`;
 const path=d=>`<path d="${d}"/>`;
 const materials={paperGrain,inkBreak,washLight,washDensity}, materialIds=new Map();
 const image=(href,opacity)=>{if(!materialIds.has(href)){const name=Object.keys(materials).find(key=>materials[key]===href),id=`material-${name}`;materialIds.set(href,id);defs+=`<image id="${id}" x="-80" y="-80" width="1060" height="880" preserveAspectRatio="none" xlink:href="${href}"/>`;}return `<use xlink:href="#${materialIds.get(href)}" opacity="${opacity}"/>`;};
 function paint(shape,color,textureTransform=''){const id=`shape-${serial++}`;defs+=`<clipPath id="${id}">${shape}</clipPath>`;let material='';
  if(s.texture==='print')material=image(inkBreak,.3);
  if(s.texture==='watercolor')material=image(washLight,.24)+image(washDensity,.06);
  return `<g fill="${color}">${shape}${material?`<g clip-path="url(#${id})"><g${textureTransform?` transform="${textureTransform}"`:''}>${material}</g></g>`:''}</g>`;
 }
 function ring(x,y,rx,ry,ix,iy){return `<path fill-rule="evenodd" d="M${n(x-rx)} ${n(y)}a${rx} ${ry} 0 1 0 ${rx*2} 0a${rx} ${ry} 0 1 0 ${-rx*2} 0 M${n(x-ix)} ${n(y)}a${ix} ${iy} 0 1 0 ${ix*2} 0a${ix} ${iy} 0 1 0 ${-ix*2} 0"/>`;}
 function fruit(f){const size=f.size,kind=f.fruitKind||f.kind;let body;
  if(kind==='pear')body=path(`M0 ${n(-size*1.13)} C${n(size*.52)} ${n(-size*1.16)} ${n(size*.2)} ${n(-size*.34)} ${n(size*.67)} ${n(size*.03)} C${n(size*1.2)} ${n(size*.78)} ${n(size*.51)} ${n(size*1.04)} 0 ${n(size*1.04)} C${n(-size*.74)} ${n(size*1.04)} ${n(-size*1.07)} ${n(size*.46)} ${n(-size*.64)} ${n(-size*.04)} C${n(-size*.27)} ${n(-size*.47)} ${n(-size*.43)} ${n(-size*1.13)} 0 ${n(-size*1.13)} Z`);
  else if(kind==='lemon')body=path(`M${n(-size*1.18)} 0 Q${n(-size*.62)} ${n(-size*.92)} 0 ${n(-size*.71)} Q${n(size*.65)} ${n(-size*.9)} ${n(size*1.18)} 0 Q${n(size*.62)} ${n(size*.92)} 0 ${n(size*.71)} Q${n(-size*.65)} ${n(size*.9)} ${n(-size*1.18)} 0Z`);
  else body=ellipse(0,0,size,size*.94);
  const leaf=f.leaf?`<path d="M0 ${n(-size*.82)}q${n(size*.15)} ${n(-size*.43)} ${n(size*.57)} ${n(-size*.29)}q${n(-size*.12)} ${n(size*.4)} ${n(-size*.57)} ${n(size*.29)}" fill="${p.green}"/>`:'';
  // Side-view free fruit use their explicit support plane, never float.
  const y=!top&&f.base!==undefined?f.base-(kind==='pear'?size*1.04:kind==='lemon'?size*.71:size*.94):f.y;
  return `<g transform="translate(${n(f.x)} ${n(y)}) rotate(${top?n(f.angle):0})">${paint(body,f.color)}${leaf}</g>`;
 }
 function draw(o){
  if(o.kind==='cloth')return `<g transform="translate(${n(o.x)} ${n(o.y)}) rotate(${o.angle})">${paint(`<rect x="${-o.w/2}" y="${-o.h/2}" width="${o.w}" height="${o.h}"/>`,o.color,'translate(-450 -360)')}</g>`;
  if(o.kind==='fruit')return fruit(o);
  if(top){
   if(o.kind==='cup'){const hx=o.x+o.handleSide*o.rx*.97;
    return paint(ring(hx,o.y,31,37,16,22),o.color)+paint(ellipse(o.x,o.y,o.rx,o.ry),o.color)+paint(ellipse(o.x,o.y,o.rx*.76,o.ry*.76),p.vessel)+paint(ellipse(o.x,o.y,o.rx*.64,o.ry*.64),o.inside);
   }
   return paint(ellipse(o.x,o.y,o.rx,o.ry),o.color)+paint(ellipse(o.x,o.y,o.rx*.86,o.ry*.86),o.rim)+paint(ellipse(o.x,o.y,o.rx*.81,o.ry*.81),o.color)+(o.children||[]).map(fruit).join('');
  }
  if(o.kind==='bottle'){const x=o.x,y=o.base,hw=o.w/2,neck=hw*.42,shoulder=y-o.h*.7,t=y-o.h;
   return paint(path(`M${n(x-hw)} ${n(y-8)}L${n(x-hw)} ${n(shoulder)}Q${n(x-hw)} ${n(shoulder-20)} ${n(x-neck)} ${n(shoulder-45)}L${n(x-neck)} ${n(t)}L${n(x+neck)} ${n(t)}L${n(x+neck)} ${n(shoulder-45)}Q${n(x+hw)} ${n(shoulder-20)} ${n(x+hw)} ${n(shoulder)}L${n(x+hw)} ${n(y-8)}Q${n(x+hw)} ${n(y)} ${n(x+hw-8)} ${n(y)}H${n(x-hw+8)}Q${n(x-hw)} ${n(y)} ${n(x-hw)} ${n(y-8)}Z`),o.color)+paint(ellipse(x,t,neck,7),o.mouth);
  }
  if(o.kind==='plate')return paint(ellipse(o.x,o.base-o.h/2,o.w/2,o.h/2),o.rim)+paint(ellipse(o.x,o.base-o.h*.62,o.w*.45,o.h*.3),o.color);
  if(o.kind==='cup'){const x=o.x,y=o.base,hw=o.w/2,cy=y-o.h*.58,hx=x+o.handleSide*hw*.94;
   return paint(ring(hx,cy,31,36,17,22),o.color)+paint(path(`M${n(x-hw)} ${n(y-o.h)}H${n(x+hw)}L${n(x+hw*.9)} ${n(y-18)}Q${n(x+hw*.8)} ${n(y)} ${n(x)} ${n(y)}Q${n(x-hw*.8)} ${n(y)} ${n(x-hw*.9)} ${n(y-18)}Z`),o.color)+paint(ellipse(x,y-o.h,hw,16),p.vessel)+paint(ellipse(x,y-o.h,hw*.8,10),o.inside);
  }
  // Back lip, fruit, front bowl: explicit painter order supports containment.
  const x=o.x,y=o.base,hw=o.w/2,t=y-o.h;
  return paint(ellipse(x,t,hw,28),o.rim)+(o.children||[]).map(fruit).join('')+paint(path(`M${n(x-hw)} ${n(t)}Q${n(x-hw*.92)} ${n(y-12)} ${n(x-hw*.25)} ${n(y)}H${n(x+hw*.25)}Q${n(x+hw*.92)} ${n(y-12)} ${n(x+hw)} ${n(t)}Q${n(x)} ${n(t+35)} ${n(x-hw)} ${n(t)}Z`),o.color);
 }
 let body=paint(`<rect width="${w}" height="${h}"/>`,p.background);
 if(!top)body+=paint(`<rect y="${scene.tableY}" width="${w}" height="${h-scene.tableY}"/>`,p.table);
 else body=paint(`<rect width="${w}" height="${h}"/>`,p.table);
 body+=scene.objects.map(draw).join('');
 if(s.texture!=='original')body+=image(paperGrain,s.texture==='print'?.19:.12);
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="art-title"><title id="art-title">器と食卓 · ${esc(s.seed)}</title><metadata>${esc(JSON.stringify(s))}</metadata><defs>${defs}</defs>${body}</svg>`;
}
