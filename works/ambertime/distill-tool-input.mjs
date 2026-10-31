// Transient pointer state only. The caller owns every game operation and save.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const point=e=>({x:e.clientX,y:e.clientY});
const stateKey=v=>JSON.stringify([!!v?.visible,!!v?.leverEnabled,!!v?.glassEnabled,v?.glassMode,!!v?.leverDown,v?.glassPosition]);
export class DistillToolInput{
 constructor({root,lever,glass,read,onAction=()=>{},onChange=()=>{}}){
  Object.assign(this,{root,lever,glass,read,onAction,onChange});
  this.gesture=null;this.keyboardStep=null;this.disposers=[];this.destroyed=false;this.lastKey=stateKey(read());
  const listen=(node,type,fn,options)=>{if(!node?.addEventListener)return;node.addEventListener(type,fn,options);this.disposers.push(()=>node.removeEventListener(type,fn,options));};
  // A second finger anywhere in the scene cancels an uncommitted operation.
  listen(root,'pointerdown',e=>{if(e.isPrimary===false&&this.gesture)this.cancel();},true);
  for(const [kind,node] of [['lever',lever],['glass',glass]]){
   listen(node,'pointerdown',e=>this.down(kind,node,e));
   listen(node,'pointermove',e=>this.move(e));
   listen(node,'pointerup',e=>this.up(e));
   listen(node,'pointercancel',e=>{if(this.gesture?.id===e.pointerId)this.cancel();});
   listen(node,'lostpointercapture',e=>{if(this.gesture?.id===e.pointerId)this.cancel();});
   // Pointer-up already decides tap versus drag. Never replay the compatibility
   // click, including the click that follows a successful slide.
   listen(node,'click',e=>{e.preventDefault();e.stopPropagation();if(e.detail===0&&!e.pointerType&&!e.sourceCapabilities?.firesTouchEvents&&kind==='glass'&&!this.gesture)this.commit('glass');});
   listen(node,'keydown',e=>this.key(kind,e));
   listen(node,'blur',()=>{if(kind==='lever'&&this.keyboardStep!==null)this.cancel();});
  }
  const doc=root?.ownerDocument,win=doc?.defaultView;
  listen(doc,'visibilitychange',()=>{if(doc.hidden)this.cancel();});
  listen(win,'pagehide',()=>this.cancel());listen(win,'resize',()=>this.cancel());
  listen(win?.visualViewport,'resize',()=>this.cancel());listen(win?.visualViewport,'scroll',()=>this.cancel());
 }
 allowed(kind,v=this.read()){
  return !this.destroyed&&!!v?.visible&&(kind==='lever'?v.leverEnabled&&!v.leverDown:v.glassEnabled&&['start','stop'].includes(v.glassMode));
 }
 emit(leverStep=null,glassOffset=null){this.onChange({leverStep,glassOffset});}
 release(g){try{if(g?.node.hasPointerCapture?.(g.id))g.node.releasePointerCapture(g.id);}catch{}}
 cancel(){
  const g=this.gesture,changed=!!g||this.keyboardStep!==null;this.gesture=null;this.keyboardStep=null;this.release(g);if(changed)this.emit();
 }
 update(view=this.read()){
  const key=stateKey(view);if(key!==this.lastKey){this.lastKey=key;this.cancel();}
 }
 down(kind,node,e){
  if(this.gesture){if(e.pointerId!==this.gesture.id)this.cancel();return;}
  if(e.isPrimary===false||e.button!==0||!this.allowed(kind))return;
  e.preventDefault();this.keyboardStep=null;
  const v=this.read(),travel=Number.isFinite(v.glassTravel)&&v.glassTravel>0?v.glassTravel:63;
  this.gesture={kind,node,id:e.pointerId,start:point(e),dx:0,dy:0,drag:false,mode:v.glassMode,travel,key:stateKey(v)};
  try{node.setPointerCapture(e.pointerId);}catch{}
  this.emit(kind==='lever'?0:null,kind==='glass'?0:null);
 }
 move(e){
  const g=this.gesture;if(!g||g.id!==e.pointerId)return;
  if(!this.allowed(g.kind)||stateKey(this.read())!==g.key){this.cancel();return;}
  e.preventDefault();g.dx=e.clientX-g.start.x;g.dy=e.clientY-g.start.y;
  g.drag ||= Math.hypot(g.dx,g.dy)>8;
  if(g.kind==='lever')this.emit(g.dy>=36?2:g.dy>=18?1:0,null);
  else this.emit(null,g.mode==='start'?clamp(g.dx,-g.travel,0):clamp(g.dx,0,g.travel));
 }
 up(e){
  const g=this.gesture;if(!g||g.id!==e.pointerId)return;
  this.move(e);if(this.gesture!==g)return;
  const direction=g.mode==='start'?-g.dx:g.dx;
  const valid=g.kind==='lever'?g.dy>=36&&g.dy>Math.abs(g.dx):!g.drag||direction>=Math.min(24,g.travel*.45)&&Math.abs(g.dx)>Math.abs(g.dy);
  // Clear capture before invoking application code: synchronous rendering and
  // lostpointercapture cannot commit this operation a second time.
  this.gesture=null;this.release(g);this.emit();
  if(valid&&this.allowed(g.kind)&&stateKey(this.read())===g.key)this.onAction(g.kind);
 }
 commit(kind){if(this.allowed(kind))this.onAction(kind);}
 key(kind,e){
  if(kind!=='lever'||!this.allowed('lever')||this.gesture)return;
  if(e.key==='Escape'){e.preventDefault();this.cancel();return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault();if(e.repeat)return;
   this.keyboardStep=clamp((this.keyboardStep??0)+(e.key==='ArrowDown'?1:-1),0,2);this.emit(this.keyboardStep,null);return;
  }
  if(e.key==='Enter'&&this.keyboardStep===2){e.preventDefault();this.keyboardStep=null;this.emit();this.commit('lever');}
 }
 destroy(){this.cancel();this.destroyed=true;for(const dispose of this.disposers.splice(0))dispose();}
}
