// Pure display geometry. Neither this module nor the renderer owns game time.
export const SCENE_WIDTH=360,SCENE_HEIGHT=640;
export function computeViewport({width,height,left=0,top=0,dpr=1}){
 const scale=Math.min(width/SCENE_WIDTH,height/SCENE_HEIGHT);
 return{width,height,left,top,dpr:Math.max(1,Math.min(3,dpr)),scale,offsetX:(width-SCENE_WIDTH*scale)/2,offsetY:(height-SCENE_HEIGHT*scale)/2,logicalWidth:SCENE_WIDTH,logicalHeight:SCENE_HEIGHT};
}
export function projectRect(v,r){return{x:v.offsetX+r.x*v.scale,y:v.offsetY+r.y*v.scale,width:r.w*v.scale,height:r.h*v.scale};}
export function toLogical(v,x,y){return{x:(x-v.left-v.offsetX)/v.scale,y:(y-v.top-v.offsetY)/v.scale};}
export function hitTest(controls,x,y){return controls.findLast(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)??null;}
export function layoutScene(view={}){
 const controls=[],add=(key,selector,x,y,w,h=45)=>controls.push({key,selector,x,y,w,h});
 for(const[name,i]of['distill','warehouse','sales'].map((n,i)=>[n,i]))add('room-'+name,'#room-nav [data-room="'+name+'"]',12+i*114,486,108);
 for(const[id,i]of['open-ledger','open-history','open-settings'].map((n,i)=>[n,i]))add(id,'#'+id,12+i*114,582,108);
 add('toggle-time','#toggle-time',12,66,165);add('skip','#skip',183,66,165);
 const caskSlots=Array.from({length:4},(_,i)=>({x:48+(i%2)*156,y:168+Math.floor(i/2)*156,w:108,h:132,base:234+Math.floor(i/2)*156}));
 const productSlots=caskSlots.map((s,i)=>({...s,y:168+Math.floor(i/2)*144,h:144,base:252+Math.floor(i/2)*144}));
 if(view.room==='warehouse'){
  (view.casks??[]).forEach((c,i)=>{const r=caskSlots[i];if(r)add('cask-'+c.id,'#cask-rack [data-cask-id="'+c.id+'"]',r.x,r.y,r.w,r.h);});
  if(!view.casks?.length)add('go-distill','#go-distill',90,420,180);
 }else if(view.room==='sales'){
  (view.products??[]).forEach((p,i)=>{const r=productSlots[i];if(r)add('product-'+p.id,'#product-shelf [data-product-id="'+p.id+'"]',r.x,r.y,r.w,r.h);});
  add('shelf-prev','#shelf-pages [data-page-step="-1"]',12,120,96);add('shelf-next','#shelf-pages [data-page-step="1"]',252,120,96);
  add('trade-info','#trade-info',12,534,162);add('shop-offer','#shop-offer',186,534,162);
 }else{
  for(const id of['start-distill','stop-distill','open-fill'])add(id,'#'+id,12,432,336);
  add('open-staff-panel','#open-staff-panel',12,534,153);
 }
 return{width:360,height:640,floorY:468,shelf:{x:24,y:138,w:312,h:330,rails:view.room==='sales'?[252,396]:[234,390]},equipment:{x:72,y:252,w:216,h:144,benchY:396},caskSlots,productSlots,controls};
}
