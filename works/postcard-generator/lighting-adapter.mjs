/* Optional Postcard Generator 0.2 adapter.
 * Uses actual generated geometry, not color/edge detection on finished SVG.
 * It neither changes generator input nor mutates its scene or renderer.
 */
import "../../engine/sukimastock-lighting.v0.1.0.js";

const Lighting = globalThis.SukimaStockLighting;
if (!Lighting || Lighting.CONTRACT !== "sukimastock-material-lightmap/0.2") {
  throw new Error("Optional SukimaStock lighting runtime is unavailable");
}
const n = x => Math.round(x * 100) / 100;

function windowLayout(b) {
  const w = b.width, h = b.height, margin = w * .18, gap = (w-margin*2)/b.cols;
  const ww = Math.min(w > 180 ? 33 : 19, gap * .47);
  const wh = Math.min(w > 180 ? 56 : 29, h / (b.rows+1) * .5);
  const offset = Math.max(16, h * .13), top = b.y + offset;
  const doorHeight = b.groundFloor?.height ?? Math.min(78, h * .22);
  const rowGap = (h-offset-doorHeight-18-wh)/Math.max(1,b.rows-1);
  return {margin,gap,ww,wh,top,rowGap};
}

function roofGeometry(b) {
  const {x,y,width:w,roofHeight:h} = b;
  if (b.roof === "flat") return {type:"rect",x,y:y-h,w,h};
  if (b.roof === "hip") return {type:"polygon",points:[[x,y],[x+w*.22,y-h],[x+w*.76,y-h],[x+w,y]]};
  if (b.roof === "shed") return {type:"polygon",points:[[x,y],[x,y-h],[x+w,y-h*.2],[x+w,y]]};
  if (b.roof === "round") {
    const points=[[x,y]];
    // Quadratic curve exactly as renderSVG: (x,y) Q(x+w/2,y-2h) (x+w,y)
    for (let i=1;i<=20;i++){
      const t=i/20, a=1-t;
      points.push([a*a*x+2*a*t*(x+w/2)+t*t*(x+w),
                   a*a*y+2*a*t*(y-h*2)+t*t*y]);
    }
    return {type:"polygon",points};
  }
  return {type:"polygon",points:[[x,y],[x+w*.5,y-h],[x+w,y]]};
}

function scaleShape(shape,sx,sy) {
  const o={...shape};
  if (o.type==="polygon") o.points=o.points.map(p=>[n(p[0]*sx),n(p[1]*sy)]);
  else if (o.type==="ellipse") {o.cx=n(o.cx*sx);o.cy=n(o.cy*sy);o.rx=n(o.rx*sx);o.ry=n(o.ry*sy);}
  else {o.x=n(o.x*sx);o.y=n(o.y*sy);o.w=n(o.w*sx);o.h=n(o.h*sy);}
  return o;
}

function groundWindows(b) {
  const {margin,gap,ww,wh,top,rowGap} = windowLayout(b),out=[];
  for (let r=0;r<b.rows;r++)for(let col=0;col<b.cols;col++){
    const x=b.x+margin+gap*(col+.5)-ww/2,y=top+r*rowGap;
    if(b.windowShape==="paired"){
      out.push({type:"rect",x:x-ww*.11,y,w:ww*.48,h:wh});
      out.push({type:"rect",x:x+ww*.63,y,w:ww*.48,h:wh});
    }else{
      out.push({type:b.windowShape==="arch"?"arch":"rect",x,y,w:ww,h:wh});
    }
  }
  return out;
}

/** The only output is the common v0.2 pixel map and optional contact/cast geometry. */
export function makePostcardLightMap(scene, options={}) {
  if(!scene || scene.version!=="0.2" || !Array.isArray(scene.blocks))
    throw new TypeError("Postcard Generator 0.2 scene required");
  const width=options.width??192,height=options.height??240;
  const sourceWidth=scene.width??800,sourceHeight=scene.height??1000;
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)
    throw new RangeError("Invalid logical dimensions");
  const sx=width/sourceWidth,sy=height/sourceHeight;
  const shapes=[],buildings=[];
  for (const block of scene.blocks) for(const b of block.buildings||[]) {
    if(!Number.isFinite(b.x)||!Number.isFinite(b.y)||!Number.isFinite(b.width)||
       !Number.isFinite(b.height)||!Number.isFinite(b.base)||!Number.isFinite(b.roofHeight))
      throw new TypeError("Invalid building geometry");
    const id=String(b.id);
    const heightValue=Math.max(0,Math.min(255,Math.round(b.height/(sourceHeight)*255)));
    const add=(shape,surface,value=heightValue)=>shapes.push(scaleShape({...shape,surface,heightValue:value},sx,sy));
    if(b.corner){
      const c=b.corner,dir=c.side==="right"?1:-1;
      const seam=dir===1?b.x+b.width:b.x,outer=seam+dir*c.width;
      add({type:"polygon",points:[[seam,b.y],[outer,b.y+c.rise],[outer,b.base],[seam,b.base]]},"side");
    }
    add({type:"rect",x:b.x,y:b.y,w:b.width,h:b.height},"wall");
    add(roofGeometry(b),"roof",Math.min(255,heightValue+20));
    for(const win of groundWindows(b))add(win,"window");
    // A separate contact footprint in the same source logical coordinates.
    // Directional projection is calculated by the renderer, never baked into SVG.
    const foot=scaleShape({type:"ellipse",cx:b.x+b.width/2,cy:b.base+8,
      rx:Math.max(4,b.width*.4),ry:Math.max(3,b.width*.045)},sx,sy);
    shapes.push({...foot,shape:"ellipse",kind:"shadow",id:"foot-"+id});
    buildings.push({id,base:b.base,x:b.x,y:b.y,width:b.width,height:b.height});
  }
  if(scene.lamps?.length){
    for(const lamp of scene.lamps) shapes.push(scaleShape({
      type:"ellipse",surface:"window",cx:lamp.x,cy:lamp.y-lamp.height-6,
      rx:12,ry:6,emissionValue:255},sx,sy));
  }
  const map=Lighting.paint(width,height,shapes);
  return {...map,source:"postcard-generator-0.2",buildings,worldSize:{width:sourceWidth,height:sourceHeight}};
}
