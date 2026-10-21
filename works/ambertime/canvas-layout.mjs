import {textPieces} from './text-metrics.mjs?v=0.24-type-ui-1';
// Display geometry only. Neither layout nor the renderer owns game time.
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
 for(const[name,i]of['distill','warehouse','sales'].map((n,i)=>[n,i]))add('room-'+name,'#room-nav [data-room="'+name+'"]',12+i*114,582,108);
 add('toggle-time','#toggle-time',303,51,45,45);
 const management=['open-ledger',...(view.staffAvailable?['open-staff-panel']:[]),...(view.room==='sales'?['shop-offer']:[]),'open-aux-menu'];
 let nextX=18;
 for(const key of management){const w=66;add(key,'#'+key,nextX,520,w,54);nextX+=w;}
 const caskSlots=Array.from({length:4},(_,i)=>({x:60+(i%2)*132,y:180+Math.floor(i/2)*144,w:108,h:120,base:234+Math.floor(i/2)*144}));
 const productSlots=caskSlots.map((s,i)=>({...s,y:144+Math.floor(i/2)*144,h:144,base:234+Math.floor(i/2)*144}));
 if(view.room==='warehouse'){
  (view.casks??[]).forEach((c,i)=>{const r=caskSlots[i];if(r)add('cask-'+c.id,'#cask-rack [data-cask-id="'+c.id+'"]',r.x,r.y,r.w,r.h);});
  if(!view.casks?.length)add('go-distill','#go-distill',126,408,108);
 }else if(view.room==='sales'){
  (view.products??[]).forEach((p,i)=>{const r=productSlots[i];if(r)add('product-'+p.id,'#product-shelf [data-product-id="'+p.id+'"]',r.x,r.y,r.w,r.h);});
  add('shelf-prev','#shelf-pages [data-page-step="-1"]',12,111,96);add('shelf-next','#shelf-pages [data-page-step="1"]',252,111,96);
 }else{
  for(const id of['start-distill','stop-distill','open-fill'])add(id,'#'+id,126,414,108);
 }
 return{width:360,height:640,floorY:468,shelf:{x:48,y:165,w:264,h:267,rails:[234,378]},equipment:{x:90,y:270,w:180,h:108,benchY:378},caskSlots,productSlots,controls};
}

// Shared by the existing Canvas notice and native automatic notice. Width follows
// the actual font measure; long messages grow upward away from the controls.
export function noticeLayout(text,measure,{step=26,padding=9}={}){
 const maxWidth=318,lines=[];let line='';
 for(const piece of textPieces(text))for(const ch of measure(piece)>maxWidth?Array.from(piece):[piece]){
  if(ch==='\n'){lines.push(line);line='';continue;}
  if(line&&measure(line+ch)>maxWidth){lines.push(line);line='';}
  line+=ch;
 }
 if(line||!lines.length)lines.push(line);
 const w=Math.min(336,Math.max(36,Math.ceil(Math.max(...lines.map(measure)))+padding*2));
 const h=lines.length*step+padding*2;
 return{x:12,y:Math.min(460,514-h),w,h,lines,padding,step};
}
