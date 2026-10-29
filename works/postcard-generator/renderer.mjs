const n=v=>Number(v.toFixed(2));
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rect=(x,y,w,h,fill)=>`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"/>`;
const line=(x1,y1,x2,y2,color,width=2)=>`<path d="M${n(x1)} ${n(y1)}H${n(x2)}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
const poly=(points,fill)=>`<polygon points="${points.map(p=>p.map(n).join(',')).join(' ')}" fill="${fill}"/>`;
const arch=(x,y,w,h,fill)=>`<path d="M${n(x)} ${n(y+h)}V${n(y+w/2)}a${n(w/2)} ${n(w/2)} 0 0 1 ${n(w)} 0V${n(y+h)}Z" fill="${fill}"/>`;
function buildingSVG(b) {
  const {x,y,width:w,height:h}=b;
  let out=rect(x,y,w,h,b.wall);
  if(b.roof==='gable')out+=poly([[x,y],[x+w*.5,y-b.roofHeight],[x+w,y]],b.roofColor);
  else if(b.roof==='hip')out+=poly([[x,y],[x+w*.2,y-b.roofHeight],[x+w*.76,y-b.roofHeight],[x+w,y]],b.roofColor);
  else out+=rect(x,y-b.roofHeight,w,b.roofHeight,b.roofColor);
  // One cornice separates simple roof and wall without outlining every shape.
  out+=rect(x,y,w,3,b.trim);
  const margin=w*.16,gap=(w-margin*2)/b.cols,ww=Math.min(13,gap*.48),wh=Math.min(23,h/(b.rows+1)*.51);
  const top=y+Math.max(13,h*.1),rowGap=(h-Math.max(28,h*.22))/(b.rows);
  for(let row=0;row<b.rows;row++)for(let col=0;col<b.cols;col++) {
    const wx=x+margin+gap*(col+.5)-ww/2,wy=top+row*rowGap;
    if(b.type==='arcade'&&row===b.rows-1)out+=arch(wx-2,wy,ww+4,Math.min(h*.2,b.base-wy),b.windowColor);
    else out+=b.windowShape==='arch'?arch(wx,wy,ww,wh,b.windowColor):rect(wx,wy,ww,wh,b.windowColor);
    if(b.balcony&&row===b.rows-2) {out+=rect(wx-4,wy+wh+2,ww+8,3,b.windowColor);out+=`<path d="M${n(wx-3)} ${n(wy+wh-4)}v6m${n(ww+6)} -6v6" stroke="${b.windowColor}" stroke-width="1.6"/>`;}
  }
  if(b.layer>0&&b.type!=='arcade')out+=arch(x+w*.42,b.base-24,w*.16,24,b.windowColor);
  return `<g data-building="${b.id}">${out}</g>`;
}
function towerSVG(t) {
  const {x,y,width:w,height:h}=t;let out=rect(x,y+w*.7,w,h-w*.7,t.wall);
  out+=rect(x-w*.11,y+w*.7,w*1.22,5,t.wall);
  out+=poly([[x-w*.08,y+w*.7],[x+w*.5,y],[x+w*1.08,y+w*.7]],t.roofColor);
  out+=arch(x+w*.32,y+w*.95,w*.36,w*.72,t.windowColor);
  out+=rect(x-w*.08,y+w*1.85,w*1.16,5,t.roofColor);
  out+=arch(x+w*.38,y+w*2.25,w*.24,w*.59,t.windowColor);
  return `<g data-landmark="tower">${out}</g>`;
}
function boatSVG(b,palette) {
  const x=b.x,y=b.y,w=b.width,h=b.height;
  let out=poly([[x+8,y+13],[x+w*.8,y+13],[x+w*.96,y+7],[x+w*.83,y+19],[x+w*.2,y+19]],palette.ink);
  out+=poly([[x,y-h*.25],[x+w*.87,y-h*.25],[x+w,y-h*.39],[x+w*.84,y],[x+w*.2,y]],b.hull);
  out+=poly([[x+5,y-h*.27],[x+w*.88,y-h*.27],[x+w*.94,y-h*.33],[x+14,y-h*.33]],b.deck);
  if(b.sail) {
    out+=rect(x+w*.46,y-h*1.62,3,h*1.3,palette.ink);
    out+=poly([[x+w*.45,y-h*1.58],[x+w*.45,y-h*.48],[x+w*.12,y-h*.48]],b.deck);
    out+=poly([[x+w*.5,y-h*1.45],[x+w*.5,y-h*.5],[x+w*.79,y-h*.5]],palette.walls[0]);
  } else {
    out+=rect(x+w*.29,y-h*.73,w*.33,h*.4,palette.walls[0]);
    out+=rect(x+w*.25,y-h*.79,w*.41,h*.08,palette.roofs[0]);
    out+=rect(x+w*.35,y-h*.65,w*.1,h*.17,palette.ink);
    out+=rect(x+w*.5,y-h*.65,w*.08,h*.17,palette.ink);
  }
  return `<g data-boat="true">${out}</g>`;
}
export function renderSVG(scene) {
  const p=scene.palette;
  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" role="img" aria-label="${esc(`水辺の街・${scene.seed}`)}"><title>${esc(`Postcard ${scene.seed}`)}</title><desc>基本図形と反復する窓で描いた水辺の街。seed ${esc(scene.seed)}。${esc(p.name)}。</desc><metadata>${esc(JSON.stringify({version:scene.version,seed:scene.seed,settings:scene.settings}))}</metadata>`;
  out+=rect(0,0,800,1000,p.sky);
  for(const block of scene.blocks) {
    out+=poly([...block.ground,[800,scene.shoreY+1],[0,scene.shoreY+1]],block.groundColor);
    for(const b of block.buildings)out+=buildingSVG(b);
    if(block.layer===0)out+=towerSVG(scene.landmark);
  }
  // The quay unifies the feet of all foreground buildings and keeps the water legible.
  out+=rect(0,scene.shoreY,800,35,p.quay);
  out+=rect(0,scene.shoreY+30,800,7,p.ink);
  out+=rect(0,scene.shoreY+37,800,1000-scene.shoreY-37,p.water);
  for(const q of scene.people) {out+=`<circle cx="${q.x}" cy="${n(q.y-6)}" r="2" fill="${q.color}"/>`;out+=rect(q.x-1.6,q.y-3,3.2,8,q.color);}
  for(const r of scene.waterlines)out+=line(r.x,r.y,r.x+r.width,r.y,p.ripple,2);
  for(const b of scene.boats)out+=boatSVG(b,p);
  return out+'</svg>';
}
