// Presentation only. Thresholds describe this game's axes, not whisky origin,
// ingredients, production certification or quality. No state, RNG or hysteresis.
// Broad intermediate regions prevent close contenders from trading strong labels.
export function flavorType(profile){
 if(!profile||!['roughness','character','wood'].every(k=>typeof profile[k]==='number'&&Number.isFinite(profile[k])&&profile[k]>=0&&profile[k]<=(k==='wood'?1.35:1)))return null;
 const {roughness:r,character:c,wood:w}=profile;
 let id='layered',label='刺激と香りが重なる',association=null;
 // Bitter wood takes precedence over fruit, softness and strong spirit.
 if(w>.85||w>.66&&w>=r){id='dry-wood';label='木の渋みが強い';}
 else if(r>.6&&w<=.66){id='young';label='若く力強い';}
 else if(r<=.27&&w>.40&&w<=.66&&w>=c*.75){id='oak';label='樽香が豊か';}
 else if(r<=.27&&c>.60&&w<=.36&&c-w>=.30){id='fruit';label='果実香が豊か';}
 else if(r<=.18&&w<=.25&&c<=.52){id='light';label='軽やか';
  // Only a light/smooth style association; no assertion about all Irish whiskey.
  if(r<=.12&&w>=.05&&w<=.20&&c>=.35&&c<=.57)association='軽やかなアイリッシュを思わせる口当たり';
 }
 else if(r<=.27&&c>.60&&w>.40&&w<=.66){id='fruit-oak';label='果実と樽香が重なる';}
 return {id,label,association};
}
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function flavorTypeView(profile){
 const t=flavorType(profile);return t?'<div class="flavor-type" data-flavor-type="'+t.id+'"><strong>'+esc(t.label)+'</strong>'+(t.association?'<small>'+esc(t.association)+'</small>':'')+'</div>':'';
}
