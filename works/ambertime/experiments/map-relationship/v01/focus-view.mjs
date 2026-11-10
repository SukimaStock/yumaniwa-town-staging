// M1-A read-only display projections; the base 144x144 town art is never changed.
export const MAP_SIZE = 144;
export const MAP_CELL = 2;
export const FOCUS_ZOOM = 2.85;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const snapped=value=>Math.round(value/MAP_CELL)*MAP_CELL;
function clipRect(x,y,w,h){
  const left=clamp(x,0,MAP_SIZE),top=clamp(y,0,MAP_SIZE);
  const right=clamp(x+w,0,MAP_SIZE),bottom=clamp(y+h,0,MAP_SIZE);
  if(right<=left||bottom<=top)return null;
  return {x:left,y:top,w:right-left,h:bottom-top};
}
// A large, stepped opening, not a selection border. Each band is authored on
// the native 2x2-pixel source grid; neighboring strips join without gaps.
export function steppedReveal(point){
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return [];
  const x=snapped(point.x),y=snapped(point.y);
  return [
    [-24,-14,28,4],[-20,-20,40,4],[-16,-24,48,32],
    [16,-20,40,4],[20,-14,28,4]
  ].map(([dy,dx,w,h])=>clipRect(x+dx,y+dy,w,h)).filter(Boolean);
}
export function paintTownContrast(ctx,points){
  ctx.clearRect(0,0,MAP_SIZE,MAP_SIZE);
  const valid=(points??[]).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y));
  if(!valid.length)return 0;
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='rgba(22,32,37,0.68)';
  ctx.fillRect(0,0,MAP_SIZE,MAP_SIZE);
  let count=0;
  for(const p of valid)for(const band of steppedReveal(p)){
    ctx.clearRect(band.x,band.y,band.w,band.h);
    count++;
  }
  return count;
}
export function focusViewport(point,width,height,zoom=FOCUS_ZOOM){
  const w=Math.max(0,Number.isFinite(width)?width:0);
  const h=Math.max(0,Number.isFinite(height)?height:0);
  const side=Math.min(w,h);
  const scale=clamp(zoom,1,3);
  const maxX=Math.max(0,(side*scale-w)/2),maxY=Math.max(0,(side*scale-h)/2);
  const x=Number.isFinite(point?.x)?point.x:MAP_SIZE/2;
  const y=Number.isFinite(point?.y)?point.y:MAP_SIZE/2;
  return {zoom:scale,pan:{
    x:clamp((MAP_SIZE/2-x)/MAP_SIZE*side*scale,-maxX,maxX),
    y:clamp((MAP_SIZE/2-y)/MAP_SIZE*side*scale,-maxY,maxY)
  }};
}
