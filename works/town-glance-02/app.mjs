import {places,getPlace} from './places.mjs';
const shops=document.querySelector('#shops');
// Shops are separate from the fixed city artwork; selecting never replaces the city.
shops.innerHTML=places.map(p=>`<g data-shop="${p.id}"><ellipse class="halo" cx="${p.haloX}" cy="${p.haloY}" rx="28" ry="12"/><g class="building"><path class="front" d="${p.front}"/><path class="side" d="${p.side}"/><path class="roof" d="${p.roof}"/><path class="roof-light" d="${p.roofLight}"/><path class="door" d="${p.door}"/><path class="window" d="${p.window}"/><path class="awning" d="${p.awning}"/></g><text class="shop-name" x="${p.labelX}" y="${p.labelY}">${p.name}</text></g>`).join('');
let selected=null;
function choose(id){
 const place=getPlace(id);if(!place||id===selected)return;
 selected=id;
 for(const group of shops.querySelectorAll('[data-shop]')){
  const active=group.dataset.shop===id;group.classList.toggle('selected',active);
  group.querySelector('.building').classList.remove('arrival');
  if(active){void group.getBoundingClientRect();group.querySelector('.building').classList.add('arrival');}
 }
 for(const button of document.querySelectorAll('[data-place]'))button.setAttribute('aria-pressed',String(button.dataset.place===id));
 shops.setAttribute('aria-label',`選んだ${place.name}が街の中で色づいています`);
 document.querySelector('#selection').textContent=place.name;
}
document.querySelector('.choices').addEventListener('click',event=>{
 const button=event.target.closest('[data-place]');if(button)choose(button.dataset.place);
});
