/* Work-owned material model. Geometric input dose is independent of event frequency.
 * Direction targets persist; followDelay changes only how soon hairs reach them.
 */
(function(root){'use strict';
const Parameters=typeof module!=='undefined'&&module.exports?require('./parameters.js'):root.NadeatoParameters;
const W=640,H=560,spacing=3.8,SAMPLE=4,columns=Math.ceil(W/spacing),rows=Math.ceil(H/spacing);
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<100000&&Math.abs(p.y)<100000;
class Material{
 constructor(config=Parameters.defaults){
  this.config=Parameters.validate(config);this.hairs=[];this.active=new Set();this.gesture=null;this.dirty=null;
  let seed=137;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<H;y+=spacing)for(let x=0;x<W;x+=spacing){const jitterX=random(),jitterY=random(),tone=random();this.hairs.push({x:x+jitterX*spacing,y:y+jitterY*spacing,dx:.15,dy:.55,targetDx:.15,targetDy:.55,tone,length:3.5+random()*2.6});}
  this.invalidate();
 }
 invalidate(x=0,y=0,right=W,bottom=H){const d=this.dirty;this.dirty=d?{x:Math.min(d.x,x),y:Math.min(d.y,y),right:Math.max(d.right,right),bottom:Math.max(d.bottom,bottom)}:{x,y,right,bottom};}
 consumeDirty(){const d=this.dirty;this.dirty=null;return d;}
 visit(x,y,right,bottom,fn){
  const x0=Math.max(0,Math.floor(x/spacing)),x1=Math.min(columns-1,Math.floor(right/spacing)),y0=Math.max(0,Math.floor(y/spacing)),y1=Math.min(rows-1,Math.floor(bottom/spacing));
  for(let row=y0;row<=y1;row++)for(let col=x0;col<=x1;col++)fn(this.hairs[row*columns+col],row*columns+col);
 }
 get hasPendingResponse(){return this.active.size>0;}
 applyState(value){const next=Parameters.validate(value),previous=this.config;this.config=next;if(previous.contrast!==next.contrast)this.invalidate();if(next.followDelay===0)this.settle();}
 reset(){this.cancelStroke();this.active.clear();for(const h of this.hairs){h.dx=h.targetDx=.15;h.dy=h.targetDy=.55;}this.invalidate();}
 beginStroke(point,viewport={width:W,height:H}){
  if(!finitePoint(point)||!viewport||!Number.isFinite(viewport.width)||!Number.isFinite(viewport.height)||viewport.width<=0||viewport.height<=0)throw Error('入力座標が不正です');
  this.gesture={raw:{...point},applied:{...point},remainder:0,viewport:{width:viewport.width,height:viewport.height}};
 }
 moveStroke(point){
  if(!finitePoint(point))throw Error('入力座標が不正です');const g=this.gesture;if(!g)return;
  let a=g.raw,dx=point.x-a.x,dy=point.y-a.y,length=Math.hypot(dx,dy);
  if(length<1e-9){g.raw={...point};return;}
  const ux=dx/length,uy=dy/length;let consumed=0;
  while(length-consumed+g.remainder>=SAMPLE-1e-9){
   const advance=Math.max(0,SAMPLE-g.remainder);consumed+=advance;
   const sample={x:a.x+ux*consumed,y:a.y+uy*consumed};this.dose(g.applied,sample,g.viewport);g.applied=sample;g.remainder=0;
  }
  g.remainder+=Math.max(0,length-consumed);g.raw={...point};
 }
 endStroke(){const g=this.gesture;if(!g)return;if(Math.hypot(g.raw.x-g.applied.x,g.raw.y-g.applied.y)>1e-9)this.dose(g.applied,g.raw,g.viewport);this.gesture=null;}
 cancelStroke(){this.gesture=null;}
 stroke(a,b,viewport={width:W,height:H}){this.beginStroke(a,viewport);this.moveStroke(b);this.endStroke();}
 dose(a,b,viewport){
  const vx=b.x-a.x,vy=b.y-a.y,d=Math.hypot(vx,vy);if(d<.15)return;
  const rx=this.config.fingerWidth*.5*W/viewport.width,ry=this.config.fingerWidth*.5*H/viewport.height;
  const left=Math.min(a.x,b.x)-rx,top=Math.min(a.y,b.y)-ry,right=Math.max(a.x,b.x)+rx,bottom=Math.max(a.y,b.y)+ry;
  this.visit(left,top,right,bottom,(h,index)=>{
   const t=Math.max(0,Math.min(1,((h.x-a.x)*vx+(h.y-a.y)*vy)/(d*d))),distance=Math.hypot((h.x-a.x-vx*t)/rx,(h.y-a.y-vy*t)/ry);if(distance>=1)return;
   const influence=Math.min(1,d/8)*Math.pow(1-distance*distance,.65)/(1+4*this.config.resistance);
   h.targetDx+=(vx/d-h.targetDx)*influence;h.targetDy+=(vy/d-h.targetDy)*influence;
   if(this.config.followDelay===0){h.dx=h.targetDx;h.dy=h.targetDy;}else this.active.add(index);
  });
  this.invalidate(left-8,top-8,right+8,bottom+8);
 }
 step(dt){
  if(!Number.isFinite(dt)||dt<=0||!this.active.size)return false;
  const alpha=this.config.followDelay===0?1:-Math.expm1(-dt/this.config.followDelay);
  for(const index of this.active){const h=this.hairs[index];h.dx+=(h.targetDx-h.dx)*alpha;h.dy+=(h.targetDy-h.dy)*alpha;if(Math.hypot(h.targetDx-h.dx,h.targetDy-h.dy)<.0001){h.dx=h.targetDx;h.dy=h.targetDy;this.active.delete(index);}this.invalidate(h.x-8,h.y-8,h.x+8,h.y+8);}
  return true;
 }
 settle(){for(const index of this.active){const h=this.hairs[index];h.dx=h.targetDx;h.dy=h.targetDy;this.invalidate(h.x-8,h.y-8,h.x+8,h.y+8);}this.active.clear();}
 prepareScene(id){
  if(!['clean','fixedstroke'].includes(id))throw Error('テスト場面がありません');this.reset();
  if(id==='fixedstroke'){this.stroke({x:150,y:280},{x:490,y:280},{width:W,height:H});this.settle();}
 }
}
const api={Material,W,H,spacing,SAMPLE,columns,rows};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NadeatoModel=api;
})(typeof window!=='undefined'?window:globalThis);
