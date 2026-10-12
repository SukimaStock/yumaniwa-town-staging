// Pointer events unify touch, pen and mouse; one captured primary pointer.
export class TouchInput {
 constructor(canvas,body,pick,onTouch=()=>{}) {
  this.canvas=canvas;this.body=body;this.pick=pick;this.onTouch=onTouch;this.pointer=null;
  this.listeners={pointerdown:e=>this.down(e),pointermove:e=>this.move(e),pointerup:e=>this.up(e),pointercancel:e=>this.cancel(e.pointerId),lostpointercapture:e=>this.cancel(e.pointerId),contextmenu:e=>e.preventDefault()};
  for(const [type,fn] of Object.entries(this.listeners))canvas.addEventListener(type,fn);
 }
 down(e){
  if(this.pointer||e.button!==0||e.isPrimary===false)return;
  const hit=this.pick(e.clientX,e.clientY);if(!hit)return;
  e.preventDefault();this.canvas.focus({preventScroll:true});
  this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,time:e.timeStamp,lastMove:e.timeStamp,downAt:e.timeStamp,drag:false};
  this.body.press(hit);this.canvas.setPointerCapture(e.pointerId);this.canvas.classList.add('held');this.onTouch();
 }
 move(e){
  const p=this.pointer;if(!p||p.id!==e.pointerId)return;
  e.preventDefault();let dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(!p.drag){
   if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<7)return;
   p.drag=true;this.body.beginDrag();
   dx=e.clientX-p.startX;dy=e.clientY-p.startY;
  }
  if(dx||dy){const rect=this.canvas.getBoundingClientRect();this.body.drag(dx,dy,(e.timeStamp-p.time)/1000,Math.min(rect.width,rect.height));p.lastMove=e.timeStamp;}
  p.x=e.clientX;p.y=e.clientY;p.time=e.timeStamp;
 }
 up(e){
  const p=this.pointer;if(!p||e.pointerId!==p.id)return;
  // Include the final sample but do not invent a flick after a held pause.
  this.move(e);if(!p.drag||e.timeStamp-p.lastMove>85)this.body.velocity=[0,0,0];
  this.finish((e.timeStamp-p.downAt)/1000);
 }
 finish(duration){
  const id=this.pointer?.id;this.pointer=null;this.body.release(duration);this.canvas.classList.remove('held');
  if(id!==undefined&&this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);
 }
 cancel(pointerId){if(this.pointer&&(pointerId===undefined||pointerId===this.pointer.id)){this.body.cancel();this.finish();}}
 destroy(){this.cancel();for(const [type,fn] of Object.entries(this.listeners))this.canvas.removeEventListener(type,fn);}
}
