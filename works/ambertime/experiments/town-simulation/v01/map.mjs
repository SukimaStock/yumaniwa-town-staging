// Provisional schematic buildings, authored for this experiment only.
// No existing sprite is redrawn, rescaled, or assigned a formal town location.
export const POSITIONS={distillery:[55,117],town:[88,117],diner:[24,110],bar:[119,111],super:[110,88],restaurant:[82,88],specialist:[49,87],department:[23,83],hill:[122,64],'near-local':[40,62],'near-wide':[82,62],'national-food':[32,37],'national-craft':[105,37],'overseas-food':[38,16],'overseas-craft':[104,16]};
const P={ground:'#263b37',road:'#78836b',edge:'#17262a',wall:'#b4ae8a',roof:'#8f6248',light:'#efe6c8',sky:'#79a5ae',amber:'#d1a45c',ink:'#33483e',water:'#355657'};
const links={town:'distillery',diner:'town',bar:'town',super:'town',restaurant:'bar',specialist:'diner',department:'specialist',hill:'department','near-local':'specialist','near-wide':'super','national-food':'near-local','national-craft':'near-wide','overseas-food':'national-food','overseas-craft':'national-craft'};
function box(ctx,x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function path(ctx,a,b,color,width=2){const[x,y]=a,[u,v]=b;box(ctx,Math.min(x,u),y,Math.abs(x-u)+width,width,color);box(ctx,u,Math.min(y,v),width,Math.abs(y-v)+width,color);}
function house(ctx,id,x,y,state){
 const big=id==='department'||id==='super',dist=id==='distillery',w=big?16:14;
 box(ctx,x-w/2,y+2,w+1,3,P.edge);box(ctx,x-w/2,y-9,w,12,P.edge);box(ctx,x-w/2+1,y-8,w-2,10,P.wall);
 if(big){box(ctx,x-w/2-1,y-10,w+2,3,P.edge);box(ctx,x-w/2,y-10,w,2,P.roof);}
 else{box(ctx,x-8,y-9,16,2,P.edge);box(ctx,x-6,y-11,12,2,P.edge);box(ctx,x-4,y-13,8,2,P.edge);box(ctx,x-6,y-9,12,1,P.roof);box(ctx,x-4,y-11,8,2,P.roof);box(ctx,x-2,y-12,4,1,P.roof);}
 box(ctx,x-2,y-3,3,5,P.edge);box(ctx,x-5,y-6,2,2,P.sky);box(ctx,x+3,y-6,2,2,P.sky);
 if(dist){box(ctx,x+4,y-16,3,10,P.edge);box(ctx,x+5,y-15,1,6,P.roof);box(ctx,x-5,y+1,2,2,P.amber);}
 else if(state?.trading){box(ctx,x-5,y-1,2,2,P.light);box(ctx,x+3,y-1,2,2,P.light);}
}
function person(ctx,x,y,frame){box(ctx,x,y-5,2,2,P.light);box(ctx,x-1,y-3,4,3,P.amber);box(ctx,x+(frame?1:-1),y,1,2,P.edge);box(ctx,x+(frame?-1:2),y+1,1,1,P.edge);}
export function drawMap(canvas,state,{frame=0,selected='distillery',motion=0}={}){
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;box(ctx,0,0,144,144,P.ground);
 // Only known nodes exist visually; there are no empty locked-place placeholders.
 const visible=id=>id==='distillery'||id==='town'||state.nodes[id]?.discovered||state.nodes[id]?.awareness>0;
 const contact=id=>id==='distillery'||id==='town'||state.nodes[id]?.contact;
 path(ctx,POSITIONS.distillery,POSITIONS.town,P.road,3);
 for(const[id,parent]of Object.entries(links)){if(id==='town'||!visible(id)||!contact(id))continue;const from=contact(parent)?parent:'town';if(id.startsWith('overseas')){const a=POSITIONS[from],b=POSITIONS[id];for(let y=b[1]+6;y<a[1]-10;y+=4)box(ctx,b[0],y,1,2,P.sky);}else path(ctx,POSITIONS[from],POSITIONS[id],P.road,2);}
 for(const[id,[x,y]]of Object.entries(POSITIONS)){
  if(!visible(id))continue;const n=state.nodes[id];
  if(id==='distillery'||id==='town'||n?.discovered)house(ctx,id,x,y,n);else{box(ctx,x-1,y-1,3,3,P.sky);box(ctx,x,y,1,1,P.light);}
  if(n?.contact)box(ctx,x+7,y+2,2,2,n.trading?P.light:P.amber);
  if(id===selected){box(ctx,x-10,y+6,20,1,P.amber);box(ctx,x-10,y+4,1,2,P.amber);box(ctx,x+9,y+4,1,2,P.amber);}
 }
 const recent=state.events.slice(-100).filter(e=>state.month-e.month<=3);
 const shipment=recent.findLast(e=>e.type==='shipment'&&POSITIONS[e.to]);
 if(shipment){const a=POSITIONS.distillery,b=POSITIONS[shipment.to],t=(motion%16)/16,x=Math.round(a[0]+(b[0]-a[0])*t),y=Math.round(a[1]+(b[1]-a[1])*t);box(ctx,x,y+5,3,3,P.edge);box(ctx,x,y+5,2,2,P.amber);}
 const visit=recent.findLast(e=>e.type==='visit');
 if(visit)person(ctx,59+(frame?1:0),127,frame);
 if(state.month>0)person(ctx,88+(frame?1:0),126,frame);
 return Object.keys(POSITIONS).filter(visible);
}
export function hitPlace(canvas,event,state){const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)*144/r.width,y=(event.clientY-r.top)*144/r.height;return Object.entries(POSITIONS).filter(([id])=>id==='distillery'||id==='town'||state.nodes[id]?.discovered||state.nodes[id]?.awareness>0).map(([id,[px,py]])=>({id,d:Math.hypot(x-px,y-(py-5))})).filter(p=>p.d<14).sort((a,b)=>a.d-b.d)[0]?.id;}
