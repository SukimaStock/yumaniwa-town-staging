// Only two-finger camera ownership lives here. One pointer remains a miniature gesture.
export class PinchZoom {
 constructor({getZoom,setZoom,cancelObject}) {
  this.getZoom=getZoom;this.setZoom=setZoom;this.cancelObject=cancelObject;
  this.points=new Map();this.mode='idle';this.pair=[];this.previousDistance=0;
 }
 distance(){const [a,b]=this.pair.map(id=>this.points.get(id));return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;}
 down(event){
  if(event.pointerType!=='touch')return this.mode!=='idle';
  this.points.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(this.mode==='idle'&&this.points.size>=2){
   this.mode='pinch';this.pair=[...this.points.keys()].slice(0,2);
   this.previousDistance=Math.max(12,this.distance());this.cancelObject();
  }
  return this.mode!=='idle';
 }
 move(event){
  if(this.points.has(event.pointerId))this.points.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(this.mode==='pinch'&&this.pair.includes(event.pointerId)){
   const distance=Math.max(12,this.distance());
   this.setZoom(this.getZoom()*distance/this.previousDistance);
   // Rebase at stops: reversing the pinch responds immediately, even beyond a limit.
   this.previousDistance=distance;
  }
  return this.mode!=='idle';
 }
 end(event){
  const consumed=this.mode!=='idle',owned=this.points.delete(event.pointerId);
  if(owned&&this.mode==='pinch'&&this.pair.includes(event.pointerId))this.mode='drain';
  if(!this.points.size){this.mode='idle';this.pair=[];this.previousDistance=0;}
  return consumed;
 }
 cancel(){const ids=[...this.points.keys()];this.points.clear();this.mode='idle';this.pair=[];this.previousDistance=0;return ids;}
}
