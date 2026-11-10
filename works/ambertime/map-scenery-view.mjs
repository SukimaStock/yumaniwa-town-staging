// Pixel placement only. Background flowers are authored scenery, never evidence.
// Anchors were checked against the existing 144px art and stay outside hit bounds.
const anchors={
 2:{'town-liquor':[[116,42],[[82,42],[106,60]],[116,30]],supermarket:[[128,102],[[94,98],[118,122]],[112,82]],bar:[[58,116],[[32,114],[58,124]],[58,104]]},
 3:{department:[[38,52],[[16,52],[28,68]],[38,40]],'town-liquor':[[104,48],[[78,50],[96,64]],[104,38]],supermarket:[[116,96],[[90,96],[106,112]],[116,86]],bar:[[32,104],[[46,108],[18,126]],[46,98]]},
 4:{'trial-region-desk':[[100,38],[[78,42],[94,50]],[100,28]]},
 5:{'national-specialist-desk':[[114,16],[[98,20],[114,24]],[106,26]]},
 6:{'overseas-import-desk':[[80,58],[[90,52],[84,68]],[80,50]]}
};
export function sceneryLayout(partner,stage){
 const a=anchors[stage]?.[partner?.id];
 return a?{box:[...a[0]],flowers:a[1].map(p=>[...p]),butterfly:[...a[2]]}:null;
}
export function drawMapScenery(ctx,scenery){
 const pixel=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 for(const partner of scenery?.partners??[]){
  const a=sceneryLayout(partner,scenery.stage);if(!a)continue;
  // Symbolic offices occupy unnamed map positions, not real prefectures/countries.
  if(scenery.stage>=5){const [x,y]=partner.bounds;pixel(x,y,6,2,'#9a6448');pixel(x,y+2,6,4,'#dbcca8');pixel(x+2,y+4,2,2,'#293a3b');}
  if(partner.box){const [x,y]=a.box;pixel(x,y,6,6,'#825b39');pixel(x,y,6,2,'#c69761');pixel(x+2,y,2,6,'#e2ba7c');pixel(x,y+4,2,2,'#ad7b4a');}
  const flowers=Number.isInteger(partner.flowerStage)?Math.max(0,Math.min(2,partner.flowerStage)):0;
  for(const [x,y] of a.flowers.slice(0,flowers)){
   pixel(x+2,y+2,2,4,'#35634d');pixel(x,y,2,2,'#e4a2b2');pixel(x+4,y,2,2,'#e4a2b2');pixel(x+2,y,2,2,'#f1d58b');pixel(x,y+4,2,2,'#35634d');
  }
 }
}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mapSceneryButterflies(scenery){
 return (scenery?.partners??[]).flatMap(partner=>{
  const a=sceneryLayout(partner,scenery.stage);if(!partner.butterfly||!a)return [];
  const [x,y]=a.butterfly;
  return [`<span class="map-scenery-butterfly" data-scenery-partner="${esc(partner.id)}" style="left:${x/144*100}%;top:${y/144*100}%;width:${8/144*100}%;height:${8/144*100}%"><svg viewBox="0 0 8 8" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><g class="map-scenery-drift"><g class="map-scenery-wings"><path fill="#eac17c" d="M0 0h2v2H0zM4 0h2v2H4zM0 2h2v2H0zM4 2h2v2H4z"/><path fill="#6e4560" d="M2 0h2v4H2z"/></g></g></svg></span>`];
 }).join('');
}
export function syncSceneryLayer(layer,scenery,active=true){
 if(!layer)return;
 const key=scenery?.motionKey??'';
 if(layer.dataset.motionKey!==key||layer.dataset.motionStage!==String(scenery?.stage)){layer.innerHTML=mapSceneryButterflies(scenery);layer.dataset.motionKey=key;layer.dataset.motionStage=String(scenery?.stage);}
 layer.dataset.active=String(!!active);layer.setAttribute('aria-hidden','true');
}
const motionDocuments=new WeakSet();
export function installSceneryMotion(doc){
 if(!doc||motionDocuments.has(doc))return;
 motionDocuments.add(doc);
 const sync=()=>{if(doc.documentElement)doc.documentElement.dataset.sceneryHidden=String(!!doc.hidden);};
 doc.addEventListener('visibilitychange',sync);sync();
}
