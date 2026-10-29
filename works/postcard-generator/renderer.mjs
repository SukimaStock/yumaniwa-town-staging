import {renderSVG as renderLegacy} from './versions/0.1/renderer.mjs';
const n=v=>Number(v.toFixed(2)),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rect=(x,y,w,h,c)=>`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${c}"/>`;
const poly=(pts,c,opacity=1)=>`<polygon points="${pts.map(p=>p.map(n).join(',')).join(' ')}" fill="${c}"${opacity===1?'':` fill-opacity="${opacity}"`}/>`;
const path=(d,c,sw=2)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
const circle=(x,y,r,c)=>`<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${c}"/>`;
const arch=(x,y,w,h,c)=>`<path d="M${n(x)} ${n(y+h)}V${n(y+w/2)}a${n(w/2)} ${n(w/2)} 0 0 1 ${n(w)} 0V${n(y+h)}Z" fill="${c}"/>`;
function roof(b){const{x,y,width:w,roofHeight:h,roofColor:c}=b;
 if(b.roof==='flat')return rect(x,y-h,w,h,c);
 if(b.roof==='gable')return poly([[x,y],[x+w*.5,y-h],[x+w,y]],c);
 if(b.roof==='hip')return poly([[x,y],[x+w*.22,y-h],[x+w*.76,y-h],[x+w,y]],c);
 if(b.roof==='shed')return poly([[x,y],[x,y-h],[x+w,y-h*.2],[x+w,y]],c);
 if(b.roof==='round')return `<path d="M${n(x)} ${n(y)}Q${n(x+w*.5)} ${n(y-h*2)} ${n(x+w)} ${n(y)}Z" fill="${c}"/>`;
 return poly([[x,y],[x+w*.5,y-h],[x+w,y]],c);
}
function windowSVG(shape,x,y,w,h,b,plant=null){
 if(shape==='paired')return windowSVG('rect',x-w*.11,y,w*.48,h,b)+windowSVG('rect',x+w*.63,y,w*.48,h,b,plant);
 let out=shape==='arch'?arch(x,y,w,h,b.windowColor):rect(x,y,w,h,b.windowColor);
 if(plant){
  // Fit the whole pot and foliage into the straight portion of this pane.
  const size=Math.min(plant.size,w*.27,(h-(shape==='arch'?w/2:0)-2)/4.1);
  out+=plantSVG({...plant,size},x+w*.5,y+h-1);
 }
 if(b.windowGrid){
  const top=shape==='arch'?y+w/2:y,span=y+h-top;
  out+=rect(x+w*.46,top,w*.08,span,b.trim);
  for(let i=1;i<b.windowGrid;i++)out+=rect(x,top+span*i/b.windowGrid-h*.025,w,h*.05,b.trim);
 }
 return plant?`<g data-interior-window="${shape}" data-window-bounds="${[x,y,w,h].map(n).join(',')}">${out}</g>`:out;
}
function shadowSVG(b){return '<g data-wall-shadow="'+b.shade.direction+'" data-shadow-source="'+b.shade.source+'">'+poly(b.shade.points,b.shade.color,b.shade.opacity)+'</g>';}
function buildingSVG(b){const{x,y,width:w,height:h}=b;
 let out=rect(x,y,w,h,b.wall)+roof(b)+rect(x,y,w,Math.max(3,w*.015),b.trim);
 if(b.band)out+=rect(x,b.base-h*.26,w,h*.26,b.bandColor);
 if(b.shade?.source==='eave')out+=shadowSVG(b);
 const margin=w*.18,gap=(w-margin*2)/b.cols,ww=Math.min(w>180?33:19,gap*.47),wh=Math.min(w>180?56:29,h/(b.rows+1)*.5),offset=Math.max(16,h*.13),top=y+offset,doorHeight=b.groundFloor?.height??Math.min(78,h*.22),rowGap=(h-offset-doorHeight-18-wh)/Math.max(1,b.rows-1);
 for(let r=0;r<b.rows;r++)for(let c=0;c<b.cols;c++){
   const wx=x+margin+gap*(c+.5)-ww/2,wy=top+r*rowGap;
   const plant=(b.plants||[]).find(p=>p.row===r&&p.col===c);
   out+=windowSVG(b.windowShape,wx,wy,ww,wh,b,plant);
   if(b.balcony&&r===b.rows-2)out+=rect(wx-ww*.3,wy+wh+3,ww*1.6,3,b.windowColor)+path(`M${n(wx-ww*.25)} ${n(wy+wh-7)}v10m${n(ww*1.5)} -10v10`,b.windowColor,2);
 }
 if(b.terrace){
  const floor=top+(b.rows-2)*rowGap+wh+5,left=x+w*.1,right=x+w*.9,railHeight=Math.min(20,rowGap*.3);
  out+='<g data-terrace="true">'+rect(left-3,floor,right-left+6,5,b.trim)+path(`M${n(left)} ${n(floor-railHeight)}H${n(right)}`,b.windowColor,2);
  const posts=Math.max(4,b.cols*2);for(let i=0;i<=posts;i++)out+=path(`M${n(left+(right-left)*i/posts)} ${n(floor-railHeight)}V${n(floor)}`,b.windowColor,1.8);out+='</g>';
 }
 if(b.groundFloor){out+=groundFloorSVG(b);}
 else if(b.door!==false){const dw=Math.min(39,w*.18),dh=Math.min(78,h*.22);out+=arch(x+w*.5-dw/2,b.base-dh,dw,dh,b.windowColor);}
 if(b.shade?.source==='awning')out+=shadowSVG(b);
 return `<g data-building="${esc(b.id)}">${out}</g>`;
}
function plantSVG(p,x,y){
 const u=p.size;
 return `<g data-plant="inside">`+path(`M${n(x)} ${n(y-u*1.2)}V${n(y-u*3)}`,p.stem,n(u*.3))+circle(x,y-u*3,u*1.1,p.leaf)+circle(x-u*.8,y-u*2.5,u*.8,p.leaf)+circle(x+u*.8,y-u*2.5,u*.8,p.leaf)+poly([[x-u,y-u*1.3],[x+u,y-u*1.3],[x+u*.7,y],[x-u*.7,y]],p.pot)+'</g>';
}
function groundFloorSVG(b){
 const g=b.groundFloor,{x,width:w,base}=b,left=x+w*.1,span=w*.8;
 if(g.kind==='arcade'){
  const cell=span/g.count,opening=cell*.68;
  let out='<g data-ground-floor="arcade">';
  for(let i=0;i<g.count;i++)out+=arch(left+cell*i+(cell-opening)/2,base-g.height,opening,g.height,b.windowColor);
  return out+'</g>';
 }
 const door=Math.min(78,b.height*.22),canopy=Math.min(20,w*.065),top=base-g.height,frontX=x+w*.19,frontW=w*.62;
 let out='<g data-ground-floor="awning">'+rect(frontX,base-door,frontW,door,b.windowColor);
 // One shopfront, divided into equal panes; no side shutter ornaments.
 for(let i=1;i<3;i++)out+=rect(frontX+frontW*i/3-1,base-door,2,door,b.windowColor===b.trim?b.wall:b.trim);
 const count=g.striped?g.count*2:1;
 for(let i=0;i<count;i++)out+=poly([[left+2+(span-4)*i/count,top],[left+2+(span-4)*(i+1)/count,top],[left+span*(i+1)/count,top+canopy],[left+span*i/count,top+canopy]],i%2?g.light:g.color);
 out+=rect(left,top+canopy,span,4,g.color);
 return out+'</g>';
}
function tower(t){const{x,y,width:w,height:h}=t;return `<g data-landmark="tower">${rect(x,y+w*.7,w,h-w*.7,t.wall)+poly([[x-w*.08,y+w*.7],[x+w*.5,y],[x+w*1.08,y+w*.7]],t.roofColor)+arch(x+w*.32,y+w*.95,w*.36,w*.72,t.windowColor)+rect(x-w*.08,y+w*1.85,w*1.16,5,t.roofColor)+arch(x+w*.38,y+w*2.25,w*.24,w*.59,t.windowColor)}</g>`;}
function boat(b,p){const{x,y,width:w,height:h}=b;let out=poly([[x+8,y+13],[x+w*.8,y+13],[x+w*.96,y+7],[x+w*.83,y+19],[x+w*.2,y+19]],p.ink)+poly([[x,y-h*.25],[x+w*.87,y-h*.25],[x+w,y-h*.39],[x+w*.84,y],[x+w*.2,y]],b.hull)+poly([[x+5,y-h*.27],[x+w*.88,y-h*.27],[x+w*.94,y-h*.33],[x+14,y-h*.33]],b.deck);
 if(b.sail)out+=rect(x+w*.46,y-h*1.62,3,h*1.3,p.ink)+poly([[x+w*.45,y-h*1.58],[x+w*.45,y-h*.48],[x+w*.12,y-h*.48]],b.deck)+poly([[x+w*.5,y-h*1.45],[x+w*.5,y-h*.5],[x+w*.79,y-h*.5]],p.walls[0]);
 else out+=rect(x+w*.29,y-h*.73,w*.33,h*.4,p.walls[0])+rect(x+w*.25,y-h*.79,w*.41,h*.08,p.roofs[0])+rect(x+w*.35,y-h*.65,w*.1,h*.17,p.ink)+rect(x+w*.5,y-h*.65,w*.08,h*.17,p.ink);
 return `<g data-boat="true">${out}</g>`;
}
const names={waterfront:'水辺',closeup:'建物アップ',street:'道路沿い',square:'広場',hillside:'坂道'};
export function renderSVG(s){if(s.version==='0.1')return renderLegacy(s);const p=s.palette;
 let out=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" role="img" aria-label="${esc(names[s.mode]+'・'+s.seed)}"><title>${esc('Postcard '+s.seed)}</title><desc>${esc(names[s.mode]+'。図形と反復する窓で描いた街。'+p.name+'。')}</desc><metadata>${esc(JSON.stringify({version:s.version,seed:s.seed,settings:s.settings}))}</metadata>`+rect(0,0,800,1000,p.sky);
 for(const c of s.clouds||[]){const{x,y,width:w,height:h}=c;out+=`<g data-cloud="true">${rect(x,y+h*.55,w,h*.45,p.light)+circle(x+w*.22,y+h*.55,h*.45,p.light)+circle(x+w*.48,y+h*.48,h*.48,p.light)+circle(x+w*.73,y+h*.6,h*.4,p.light)}</g>`;}
 if(s.mode==='waterfront'){
  for(const b of s.blocks){out+=poly([...b.ground,[800,s.shoreY+1],[0,s.shoreY+1]],b.groundColor);for(const house of b.buildings)out+=buildingSVG(house);if(b.layer===0)out+=tower(s.landmark);}
  out+=rect(0,s.shoreY,800,35,p.quay)+rect(0,s.shoreY+30,800,7,p.ink)+rect(0,s.shoreY+37,800,1000-s.shoreY-37,p.water);
  for(const r of s.waterlines)out+=path(`M${n(r.x)} ${n(r.y)}h${n(r.width)}`,p.ripple,2);
  for(const b of s.boats)out+=boat(b,p);
 }else{
  for(const surface of s.surfaces){if(surface.type==='hill')out+=poly(surface.points,p.quay);else out+=rect(0,surface.y,800,surface.height,surface.type==='road'?p.roofs[2]:p.quay);}
  if(s.mode==='square'){
   out+=poly([[s.plaza.left,585],[s.plaza.right,585],[s.plaza.right+70,1000],[s.plaza.left-70,1000]],p.light);
   for(let y=650;y<1000;y+=67)out+=path(`M${n(s.plaza.left-(y-585)*.15)} ${y}H${n(s.plaza.right+(y-585)*.15)}`,p.quay,2);
  }
  for(const b of s.blocks){if(s.mode==='hillside')out+=poly([...b.ground,[800,1000],[0,1000]],p.quay);for(const house of b.buildings)out+=buildingSVG(house);}
  if(s.road){out+=rect(0,s.road.y-5,800,5,p.light);const y=s.road.y+(1000-s.road.y)*.55;for(let x=25;x<800;x+=150){if(s.road.crosswalk&&x<709&&x+80>601)continue;out+=rect(x,y,80,5,p.light);}if(s.road.crosswalk){const step=(1000-s.road.y-28)/5;out+='<g data-crosswalk="true">';for(let i=0;i<5;i++)out+=rect(601,s.road.y+14+i*step,108,Math.min(16,step*.5),p.quay);out+='</g>';}}
  if(s.stairs){const points=s.stairs.points;let d=`M${n(points[0][0])} ${n(points[0][1])}`;for(let i=1;i<points.length;i++){d+=`H${n(points[i][0])}V${n(points[i][1])}`;}out+=path(d,p.light,9);for(let i=1;i<points.length-1;i+=2){const a=points[i],b=points[i+1],steps=Math.max(2,Math.ceil(Math.abs(b[1]-a[1])/12));for(let j=1;j<steps;j++)out+=path(`M${n(a[0]-7)} ${n(a[1]+(b[1]-a[1])*j/steps)}h${n(b[0]-a[0]+14)}`,p.roofs[1],2);}}
 }
 for(const t of s.trees||[]){out+=rect(t.x-4,t.y-t.radius*1.2,8,t.radius*1.2,p.ink)+circle(t.x,t.y-t.radius*1.8,t.radius,p.walls[3])+circle(t.x-t.radius*.35,t.y-t.radius*1.95,t.radius*.65,p.terraces[0]);}
 for(const l of s.lamps||[])out+=rect(l.x-2,l.y-l.height,4,l.height,p.ink)+path(`M${n(l.x-18)} ${n(l.y-l.height)}h36`,p.ink,4)+rect(l.x-15,l.y-l.height-12,30,12,p.light);
 for(const b of s.benches||[])out+=rect(b.x,b.y,b.width,7,p.roofs[1])+rect(b.x+9,b.y+7,5,13,p.ink)+rect(b.x+b.width-14,b.y+7,5,13,p.ink)+rect(b.x,b.y-16,b.width,9,p.roofs[1]);
 for(const q of s.people){const scale=q.scale||1;out+=circle(q.x,q.y-6*scale,2*scale,q.color)+rect(q.x-1.6*scale,q.y-3*scale,3.2*scale,8*scale,q.color);}
 return out+'</svg>';
}
