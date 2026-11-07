import {packageArt} from './release-package.mjs?v=package-c1l-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dialogueMarkup(entry,state,{heading=false}={}){
 if(!entry)return '';
 const release=entry.kind==='memory'?state.releases?.find(r=>r.id===entry.releaseId&&r.productId===entry.productId&&r.brandId===entry.brandId):null;
 const brand=release?state.brands?.find(b=>b.id===release.brandId):null;
 // Bottling creates selectedPrice=standard. Reconstruct that original package,
 // not today's mutable sale-price cap. Box colors use the frozen release profile.
 const art=release?packageArt(release.profile,brand??{},'standard'):'';
 return `<div class="shop-dialogue-line" data-dialogue-id="${esc(entry.id)}" data-dialogue-kind="${esc(entry.kind)}">${heading?'<div class="shop-dialogue-store">町の酒店</div>':''}<div class="shop-dialogue-content">${art?`<span class="shop-dialogue-package" aria-hidden="true">${art}</span>`:''}<p>${esc(entry.text)}</p></div></div>`;
}
// Transient notification only; no storage, RNG, timer-based game changes or backlog.
export function createDialogueNotice({show,hide,safe,setTimer=setTimeout,clearTimer=clearTimeout,duration=6500}){
 let pending=null,current=null,timer=null,token=0;
 const clear=()=>{if(timer!==null)clearTimer(timer);timer=null;};
 function poll(){clear();if(!pending&&!current)return;if(!safe()){
  if(current){if(!pending||current.month>=pending.month)pending=current;current=null;hide();}timer=setTimer(poll,250);return;
 }
 if(!current&&pending){current=pending;pending=null;show(current);const epoch=token;timer=setTimer(()=>{if(epoch!==token)return;current=null;hide();poll();},duration);}}
 return {commit(before,after,entry){if(!before||!after||after.core.month<=before.core.month||!entry||entry.month<=before.core.month)return;pending=entry;if(!current){clear();timer=setTimer(poll,0);}},update(){if(current&&!safe()){clear();if(!pending||current.month>=pending.month)pending=current;current=null;hide();}if(!current&&pending)poll();},reset(){token++;clear();pending=null;current=null;hide();}};
}
