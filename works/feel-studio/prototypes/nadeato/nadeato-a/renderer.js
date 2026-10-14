/* Original tiled hair renderer; parameters change only directional light contrast. */
(function(root){'use strict';
const {W,H}=root.NadeatoModel;
class Renderer{
 constructor(canvas,material){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.material=material;}
 resize(width,height,dpr=1){if(width<=0||height<=0)return;const w=Math.round(width*Math.min(dpr,2)),h=Math.round(height*Math.min(dpr,2));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.material.invalidate();}}
 draw(){const region=this.material.consumeDirty();if(!region)return;const tile=64;for(let y=Math.max(0,Math.floor(region.y/tile)*tile);y<Math.min(H,region.bottom);y+=tile)for(let x=Math.max(0,Math.floor(region.x/tile)*tile);x<Math.min(W,region.right);x+=tile)this.drawTile(x,y,Math.min(W,x+tile),Math.min(H,y+tile));}
 drawTile(left,top,edge,foot){
  const {canvas,ctx,material}=this,sx=canvas.width/W,sy=canvas.height/H;if(!sx||!sy)return;
  const x=Math.floor(left*sx)/sx,y=Math.floor(top*sy)/sy,right=edge===W?W:Math.floor(edge*sx)/sx,bottom=foot===H?H:Math.floor(foot*sy)/sy;
  ctx.setTransform(sx,0,0,sy,0,0);ctx.save();ctx.beginPath();ctx.rect(x,y,right-x,bottom-y);ctx.clip();ctx.fillStyle='#8d9873';ctx.fillRect(0,0,W,H);ctx.lineCap='round';
  const shades=Array.from({length:28},()=>new root.Path2D());
  material.visit(x-8,y-8,right+8,bottom+8,h=>{const light=h.dx*-.55+h.dy*-.83,l=48+light*17*material.config.contrast+(h.tone-.5)*6,path=shades[Math.max(0,Math.min(27,Math.round((l-26)/1.6)))];path.moveTo(h.x,h.y);path.lineTo(h.x+h.dx*h.length,h.y+h.dy*h.length);});
  for(let i=0;i<shades.length;i++){ctx.strokeStyle=`hsl(79 17% ${26+i*1.6}%)`;ctx.lineWidth=1.35;ctx.stroke(shades[i]);}
  const light=ctx.createRadialGradient(W*.35,H*.22,20,W*.5,H*.5,W*.7);light.addColorStop(0,'#eff0c30b');light.addColorStop(1,'#29361a30');ctx.fillStyle=light;ctx.fillRect(0,0,W,H);ctx.restore();
 }
}
root.NadeatoRenderer={Renderer};
})(typeof window!=='undefined'?window:globalThis);
