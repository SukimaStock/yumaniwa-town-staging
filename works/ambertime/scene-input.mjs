// Browser gestures belong to the scene or to the scrollable window, never both.
export const DRAG_SLOP=10;
export function moved(a,b){return Math.hypot(b.x-a.x,b.y-a.y)>DRAG_SLOP;}
export function canScroll(top,height,client,delta){return delta<0?top<height-client-1:delta>0?top>0:false;}
export function installSceneInput(root,dialog,onDrag=()=>{}){
 let gesture=null,blocked=null,touch=null;
 const zoomed=()=> (window.visualViewport?.scale??1)>1.01;
 const point=e=>({x:e.clientX,y:e.clientY});
 // touch-action is the primary policy; this scoped fallback also contains old Safari bounce.
 root.addEventListener('touchmove',e=>{if(e.touches.length===1&&!zoomed()&&e.cancelable)e.preventDefault();},{passive:false});
 root.addEventListener('pointerdown',e=>{if(!e.isPrimary){if(gesture)gesture.drag=true;return;}blocked=null;gesture={id:e.pointerId,start:point(e),target:e.target,drag:false};});
 root.addEventListener('pointermove',e=>{if(gesture?.id===e.pointerId&&moved(gesture.start,point(e))){gesture.drag=true;onDrag();}});
 const end=e=>{if(gesture?.id!==e.pointerId)return;blocked=gesture.drag?gesture.target:null;gesture=null;};
 root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);
 root.addEventListener('click',e=>{if(e.detail&&blocked){e.preventDefault();e.stopImmediatePropagation();blocked=null;}},true);
 dialog.addEventListener('touchstart',e=>{touch=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
 dialog.addEventListener('touchmove',e=>{
  if(!touch||e.touches.length!==1||zoomed())return;
  const next={x:e.touches[0].clientX,y:e.touches[0].clientY},dy=next.y-touch.y,dx=next.x-touch.x;touch=next;
  if(e.target.closest('input,textarea,select'))return;
  // Permit the nearest scrolling content that can consume this direction.
  let n=e.target instanceof Element?e.target:null,consume=false;
  while(n&&n!==dialog){const s=getComputedStyle(n);if(/auto|scroll/.test(s.overflowY)&&canScroll(n.scrollTop,n.scrollHeight,n.clientHeight,dy)){consume=true;break;}n=n.parentElement;}
  if((Math.abs(dx)>Math.abs(dy)||!consume)&&e.cancelable)e.preventDefault();
 },{passive:false});
 dialog.addEventListener('touchend',()=>{touch=null;},{passive:true});
}
