import {dialogueShopName} from './shop-dialogue.mjs?v=bar-v01-1';
import {packageArt} from './release-package.mjs?v=package-c1l-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dialogueMarkup(entry,state,{heading=false}={}){
 if(!entry)return '';
 const release=entry.kind==='memory'?state.releases?.find(r=>r.id===entry.releaseId&&r.productId===entry.productId&&r.brandId===entry.brandId):null;
 const brand=release?state.brands?.find(b=>b.id===release.brandId):null;
 // Bottling creates selectedPrice=standard. Reconstruct that original package,
 // not today's mutable sale-price cap. Box colors use the frozen release profile.
 const art=release?packageArt(release.profile,brand??{},'standard'):'';
 return `<div class="shop-dialogue-line" data-dialogue-id="${esc(entry.id)}" data-dialogue-kind="${esc(entry.kind)}">${heading?'<div class="shop-dialogue-store">'+esc(dialogueShopName(entry.shopId??'town-liquor'))+'</div>':''}<div class="shop-dialogue-content">${art?`<span class="shop-dialogue-package" aria-hidden="true">${art}</span>`:''}<p>${esc(entry.text)}</p></div></div>`;
}
// Transient only. No saved state or RNG. The latest store entry is separate.
export function createDialogueNotice({show,hide,safe,inRoom=()=>true,setTimer=setTimeout,clearTimer=clearTimeout,duration=6500}){
 let pending=null,current=null,timer=null,token=0,lastMonth=-1,shownMonth=-1;
 const clear=()=>{if(timer!==null)clearTimer(timer);timer=null;token++;};
 function defer(){if(current){if(!pending||current.month>=pending.month)pending=current;current=null;hide();}}
 function poll(){
  clear();if(!pending&&!current)return;
  if(!inRoom()){if(current){current=null;hide();}return;}
  if(!safe(current??pending)){defer();timer=setTimer(poll,250);return;}
  if(!current&&pending){current=pending;pending=null;shownMonth=current.month;show(current);const epoch=token;
   timer=setTimer(()=>{if(epoch!==token)return;timer=null;current=null;hide();poll();},duration);
  }
 }
 return {
  commit(before,after,entry){
   if(!before||!after||after.core.month<=before.core.month||!entry||entry.month<=before.core.month||entry.month<=lastMonth)return;
   lastMonth=entry.month;pending=entry;
   // A newer letter replaces the old one; there is never a historical queue.
   if(current){current=null;hide();}clear();timer=setTimer(poll,0);
  },
  update(){if(!inRoom()){clear();if(pending?.month<=shownMonth)pending=null;if(current){current=null;hide();}return;}if(current&&!safe(current)){clear();defer();}if(!current&&pending)poll();},
  dismiss(){if(!current)return;clear();current=null;hide();if(pending)poll();},
  reset(){clear();pending=null;current=null;lastMonth=-1;shownMonth=-1;hide();}
 };
}
// Consume the entire pointer sequence locally; dismiss on click, not pointerdown,
// so the subsequent touch-generated click cannot hit the game behind the card.
export function installDialogueDismissal(element,dismiss){
 for(const type of ['pointerdown','pointerup','pointercancel'])element.addEventListener(type,e=>{
  e.stopPropagation();if(type==='pointerdown'&&e.isPrimary!==false)element.setPointerCapture?.(e.pointerId);
 });
 element.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();dismiss();});
 element.addEventListener('keydown',e=>{if(!['Enter',' ','Escape'].includes(e.key))return;e.preventDefault();e.stopPropagation();dismiss();});
}
