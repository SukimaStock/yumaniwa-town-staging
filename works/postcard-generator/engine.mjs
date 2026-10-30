// Geometry is plain data. Rendering and exports do not participate in generation.
import * as legacy from './versions/0.1/engine.mjs';
export const VERSION='0.2';
export const PALETTES=[...legacy.PALETTES,
 {id:'clay',name:'赤土と青緑',sky:'#f0cba8',water:'#447c83',walls:['#b95543','#db8b69','#f0d4ad','#829b83','#d9b258','#ad6254'],roofs:['#75483f','#b65b42','#415d61'],ink:'#454e49',light:'#f8e5c4',quay:'#dfbb90',terraces:['#af9476','#caab83','#dfbb90'],ripple:'#8ab2ac',accent:'#b54837'},
 {id:'blue',name:'白と青',sky:'#d8e8e8',water:'#2b6e9d',walls:['#f4eee0','#a2cad7','#548fb2','#e2d1ae','#3c718f','#bfd8d9'],roofs:['#365c77','#698c9b','#b48867'],ink:'#284f6c',light:'#fff6e3',quay:'#ddd0b3',terraces:['#b9c9c5','#d1c9b5','#ddd0b3'],ripple:'#8cbed1',accent:'#db714f'},
 {id:'rose',name:'桃と赤茶',sky:'#eee0d4',water:'#6a8190',walls:['#e9b3a1','#b96158','#f6e7d3','#d49384','#c7c3af','#8c9994'],roofs:['#794d4b','#ac6357','#566b69'],ink:'#554f4d',light:'#fff0da',quay:'#d6bca2',terraces:['#b9afa0','#cdb39f','#d6bca2'],ripple:'#a5b9bd',accent:'#b55547'}].map(p=>({...p,tonal:({harbor:['#d4e8df','#afd1c9','#7ab0ad','#4a8a93'],apricot:['#f3d5be','#e8b99d','#d6957d','#b9766c'],garden:['#d9e2c8','#b8ccad','#97b191','#718e72'],clay:['#ecc4a0','#d7a57f','#bf8162','#a9654c'],blue:['#e5eef0','#bfd9e1','#8ab6cb','#5d91b1'],rose:['#f1dbcf','#dfbaaf','#cc9a91','#b87973']})[p.id]}));
export const SCENES=[{id:'waterfront',name:'水辺'},{id:'closeup',name:'建物アップ'},{id:'street',name:'道路沿い'},{id:'square',name:'広場'},{id:'hillside',name:'坂道'},{id:'alley',name:'路地'}];
export const COMPOSITIONS=legacy.COMPOSITIONS;
export const ROOFS=['gable','hip','flat','shed','round'];
export const WINDOWS=['rect','arch','paired'];
export const randomStream=legacy.randomStream;
const n=v=>Math.round(v*100)/100, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),pick=(r,a)=>a[Math.floor(r()*a.length)];
const lum=h=>[1,3,5].reduce((s,i,j)=>s+parseInt(h.slice(i,i+2),16)*[.2126,.7152,.0722][j],0);
export function normalizeSettings(s={}){
 if(s.version==='0.1'){const old=legacy.normalizeSettings(s);return {version:'0.1',scene:'waterfront',...old,roofs:'auto',windows:'auto',colorMode:'auto'};}
 return {reflection:['plain','short','varied','matched'].includes(s.reflection)?s.reflection:s.version==='0.2'&&s.reflection===undefined?'plain':'matched',corners:['plain','left','right'].includes(s.corners)?s.corners:s.version==='0.2'&&s.corners===undefined?'plain':'auto',accents:['plain','plants','shade','both'].includes(s.accents)?s.accents:s.version==='0.2'&&s.accents===undefined?'plain':'auto',groundFloor:['plain','arcade','awning'].includes(s.groundFloor)?s.groundFloor:s.version==='0.2'&&s.groundFloor===undefined?'plain':'auto',facade:['plain','grid','terrace'].includes(s.facade)?s.facade:'auto',sky:['clear','clouds'].includes(s.sky)?s.sky:'auto',version:s.version==='0.1'?'0.1':'0.2',scene:SCENES.some(x=>x.id===s.scene)?s.scene:'auto',palette:PALETTES.some(p=>p.id===s.palette)?s.palette:'auto',density:['open','normal','dense'].includes(s.density)?s.density:'normal',composition:COMPOSITIONS.includes(s.composition)?s.composition:'auto',roofs:s.roofs==='step'?'gable':ROOFS.includes(s.roofs)?s.roofs:'auto',windows:['round','shutters'].includes(s.windows)?'rect':WINDOWS.includes(s.windows)?s.windows:'auto',colorMode:['varied','tonal','accent'].includes(s.colorMode)?s.colorMode:'auto'};
}
function house(id,x,base,width,height,layer=0){
 width=n(width);height=n(height);base=n(base);
 return {id,layer,x:n(x),y:n(base-height),width,height,base,type:width>185?'wide':width<80?'slender':'house',roofHeight:n(Math.min(70,width*.24)),cols:clamp(Math.floor(width/(width>180?67:32)),2,5),rows:clamp(Math.floor(height/(width>180?105:63)),2,5),door:true,balcony:false};
}
function block(layer,buildings,groundColor=null){return {layer,depth:layer,buildings,ground:buildings.flatMap(b=>[[b.x,b.base],[n(b.x+b.width),b.base]]),groundColor};}
function row(r,count,left,right,base,minHeight,maxHeight,layer=0){
 const weights=Array.from({length:count},()=>.8+r()*.45),sum=weights.reduce((a,b)=>a+b,0);let x=left;
 return weights.map((w,i)=>{const width=i===count-1?right-x:(right-left)*w/sum;const b=house(`b${layer}-${i}`,x,base,width,minHeight+r()*(maxHeight-minHeight),layer);x+=width;return b;});
}
function style(scene,settings){
 const p=scene.palette,r=randomStream(scene.seed,'v02-colors'),roofR=randomStream(scene.seed,'v02-roofs'),winR=randomStream(scene.seed,'v02-windows');
 const familyRoof=pick(roofR,ROOFS),familyWindow=pick(winR,WINDOWS);
 const all=scene.blocks.flatMap(b=>b.buildings),accentIndex=Math.floor(r()*all.length);let previous=-1;
 scene.colorMode=settings.colorMode==='auto'?pick(randomStream(scene.seed,'v02-color-mode'),['varied','varied','varied','tonal','accent']):settings.colorMode;
 for(const [i,b]of all.entries()){
   const wallSet=scene.colorMode==='tonal'?p.tonal:scene.colorMode==='accent'?[p.light,p.quay,p.terraces[1]]:p.walls;
   let choices=wallSet.map((_,j)=>j);
   choices=choices.filter(j=>j!==previous);if(!choices.length)choices=[2];
   const index=pick(r,choices);previous=index;
   b.wallIndex=index;b.wall=scene.colorMode==='accent'&&i===accentIndex?p.accent:wallSet[index];b.roof=settings.roofs==='auto'?(roofR()<.62?familyRoof:pick(roofR,ROOFS)):settings.roofs;
   b.roofHeight=n(b.roof==='flat'?Math.min(12,b.width*.08):Math.min(70,b.width*.24));
   const roofChoices=p.roofs.filter(c=>Math.abs(lum(c)-lum(b.wall))>24);b.roofColor=scene.colorMode==='accent'&&i!==accentIndex?p.ink:pick(r,roofChoices.length?roofChoices:p.roofs);
   b.windowShape=settings.windows==='auto'?(winR()<.68?familyWindow:pick(winR,WINDOWS)):settings.windows;
   b.windowColor=lum(b.wall)<145?p.light:p.ink;b.trim=p.light;b.shutterColor=scene.colorMode==='accent'&&i!==accentIndex?p.ink:p.roofs[(i+1)%p.roofs.length];
   b.band=scene.mode==='closeup'&&randomStream(scene.seed,b.id+'-band')()<.48;b.bandColor=scene.colorMode==='accent'&&i===accentIndex?p.accent:wallSet[(index+1)%wallSet.length];
   b.balcony=scene.mode!=='waterfront'&&b.width>115&&winR()<.24;
 }
 for(const b of scene.blocks)b.groundColor=p.terraces[Math.min(b.layer,2)];
 if(scene.landmark){scene.landmark.wall=p.walls[2];scene.landmark.roofColor=p.roofs[0];scene.landmark.windowColor=p.ink;}
 for(const b of scene.boats){b.hull=p.accent;b.deck=p.light;}
 for(const q of scene.people)q.color=q.color===legacy.PALETTES[0].accent?p.accent:p.ink;
 return scene;
}
export function generateScene(seed,settings={}){
 settings=normalizeSettings(settings);
 if(settings.version==='0.1')return legacy.generateScene(seed,settings);
 seed=String(seed===undefined?'harbour-001':seed).slice(0,120)||'harbour-001';
 const layout=randomStream(seed,'v02-layout'),props=randomStream(seed,'v02-props'),mode=settings.scene==='auto'?pick(randomStream(seed,'v02-scene'),SCENES.filter(s=>s.id!=='alley')).id:settings.scene;
 const p=PALETTES.find(p=>p.id===settings.palette)||pick(randomStream(seed,'v02-palette'),PALETTES);
 let s={version:VERSION,seed,settings,mode,palette:p,width:800,height:1000,composition:settings.composition==='auto'?pick(randomStream(seed,'v02-contour'),COMPOSITIONS):settings.composition,blocks:[],landmark:null,boats:[],people:[],waterlines:[],surfaces:[],trees:[],lamps:[],benches:[],crop:false};
 if(mode==='waterfront'){
   const old=legacy.generateScene(seed,{palette:'harbor',density:settings.density,composition:settings.composition});
   s={...old,...s,shoreY:old.shoreY,layerCount:old.layerCount,blocks:old.blocks,landmark:old.landmark,boats:old.boats,people:old.people,waterlines:old.waterlines};
   // Reserve the full six-roof envelope so a roof override never moves walls or the tower.
   const nearest=s.blocks.flatMap(b=>b.buildings).filter(b=>b.x<s.landmark.x+s.landmark.width+45&&b.x+b.width>s.landmark.x-45);
   s.landmark.y=n(Math.max(35,Math.min(...nearest.map(b=>b.y-Math.min(70,b.width*.24)))-75));s.landmark.height=n(s.landmark.base-s.landmark.y);
 }else if(mode==='closeup'){
   const count=settings.density==='open'?2:settings.density==='dense'?4:3;
   const base=n(842+layout()*24),buildings=row(layout,count,-45,845,base,520,680);
   for(const b of buildings){b.rows=clamp(Math.floor(b.height/130),4,5);b.cols=clamp(Math.floor(b.width/78),2,4);}
   s.blocks=[block(0,buildings)];s.crop=true;s.shoreY=base;s.surfaces=[{type:'sidewalk',y:base,height:1000-base}];
   s.people=[{x:620,y:base+41,color:p.ink,scale:2.4},{x:659,y:base+43,color:p.accent,scale:2.4}];
 }else if(mode==='street'){
   const count={open:5,normal:6,dense:8}[settings.density],base=n(730+layout()*35);
   s.blocks=[block(0,row(layout,count,0,800,base,220,365))];s.shoreY=base;
   s.surfaces=[{type:'sidewalk',y:base,height:73},{type:'road',y:base+73,height:1000-base-73}];
   s.road={y:base+73,marks:true,crosswalk:layout()<.4};
   s.lamps=[{x:90,y:base+54,height:95},{x:698,y:base+54,height:95}];
   s.trees=[{x:565,y:base+56,radius:31}];s.people=[{x:258,y:base+44,color:p.ink,scale:1.5},{x:305,y:base+44,color:p.accent,scale:1.5}];
 }else if(mode==='square'){
   const back=row(layout,{open:4,normal:5,dense:6}[settings.density],0,800,550+layout()*35,170,265);
   const rear=block(0,back),left=house('b1-left',-8,799,155+layout()*28,330+layout()*60,1),right=house('b1-right',620+layout()*20,800,185,340+layout()*60,1);
   s.blocks=[rear,block(1,[left]),block(2,[right])];s.shoreY=560;s.crop=true;
   s.surfaces=[{type:'plaza',y:550,height:450}];s.plaza={left:n(left.x+left.width),right:n(right.x),top:585,bottom:970};
   s.trees=[{x:238,y:730,radius:43},{x:586,y:838,radius:39}];s.benches=[{x:211,y:803,width:90},{x:490,y:885,width:90}];
   s.people=[{x:409,y:764,color:p.ink,scale:1.7},{x:432,y:775,color:p.accent,scale:1.7},{x:346,y:900,color:p.ink,scale:1.7}];
 }else if(mode==='alley'){
   // Choose the corridor envelope first; two banks recede towards a smaller rear row.
   const farY=n(572+layout()*35),middleY=n(736+layout()*20),nearY=n(896+layout()*25);
   const farCenter=n(320+layout()*160),nearCenter=n(350+layout()*100);
   const farHalf=n(54+layout()*22),nearHalf=n(({open:182,normal:158,dense:134})[settings.density]+layout()*12);
   const t=(middleY-farY)/(nearY-farY),middleCenter=n(farCenter+(nearCenter-farCenter)*t),middleHalf=n(farHalf+(nearHalf-farHalf)*t);
   const back=row(layout,{open:3,normal:4,dense:5}[settings.density],0,800,farY,155,235);
   const banks=(layer,base,center,half,min,max)=>[house(`b${layer}-left`,-28,base,center-half+28,min+layout()*(max-min),layer),house(`b${layer}-right`,center+half,base,828-center-half,min+layout()*(max-min),layer)];
   const middle=banks(1,middleY,middleCenter,middleHalf,350,425),near=banks(2,nearY,nearCenter,nearHalf,590,690);
   for(const b of near){b.cols=clamp(Math.floor(b.width/75),2,4);b.rows=4;}
   s.blocks=[block(0,back),block(1,middle),block(2,near)];s.shoreY=farY;s.crop=true;
   const bottomHalf=n(nearHalf+22),bottomCenter=n(nearCenter+(nearCenter-farCenter)*.2);
   s.alley={farY,middleY,nearY,farCenter,nearCenter,farHalf,nearHalf,middleCenter,middleHalf,bottomCenter,bottomHalf};
   s.surfaces=[{type:'sidewalk',y:farY,height:1000-farY}];
   s.people=[{x:n(farCenter+12),y:farY+65,color:p.ink,scale:1.1},{x:n(nearCenter-24),y:nearY+30,color:p.accent,scale:2}];
 }else{
   const count={open:4,normal:5,dense:6}[settings.density],direction=layout()<.5?1:-1,left=25,gap=12,width=(750-gap*(count-1))/count;
   const low=810+layout()*35,high=535+layout()*40,buildings=[];
   for(let i=0;i<count;i++){const t=direction===1?i/(count-1):1-i/(count-1);buildings.push(house(`b0-${i}`,left+i*(width+gap),low-(low-high)*t,width,180+layout()*105));}
   s.blocks=[block(0,buildings)];s.shoreY=low;s.surfaces=[{type:'hill',points:[...buildings.flatMap(b=>[[b.x,b.base],[b.x+b.width,b.base]]),[800,1000],[0,1000]]}];
   s.stairs={direction,points:buildings.flatMap(b=>[[b.x,b.base+17],[b.x+b.width,b.base+17]])};
   s.trees=[{x:direction===1?67:725,y:934,radius:42}];s.people=[{x:390,y:n(buildings[Math.floor(count/2)].base+42),color:p.ink,scale:1.6}];
 }
 s.layerCount=s.blocks.length;return waterReflections(accents(groundDetails(details(cornerBuildings(style(s,settings),settings),settings),settings),settings));
}
// Sample only the shore-facing row. This stream never changes the city or boats.
function waterReflections(s){
 if(s.mode!=='waterfront'||s.settings.reflection==='plain')return s;
 const front=s.blocks[s.blocks.length-1].buildings,count=Math.min(7,front.length),waterTop=n(s.shoreY+37);
 if(s.settings.reflection==='matched'){
  // Preserve the whole row's proportions; never cap or randomize individual heights.
  const scale=Math.min(1,(975-waterTop)/Math.max(...front.map(b=>b.height)));
  s.reflections=front.map(b=>({source:b.id,x:b.x,y:waterTop,width:b.width,height:n(b.height*scale),color:b.wall,opacity:.3}));
  return s;
 }
 s.reflections=[];
 for(let i=0;i<count;i++){
  const b=front[Math.floor((i+.5)*front.length/count)],r=randomStream(s.seed,'water-reflection-'+b.id);
  const width=n(b.width*(.64+r()*.2)),x=n(b.x+(b.width-width)/2);
  const depth=s.settings.reflection==='short'?38+r()*30:64+r()*82;
  s.reflections.push({source:b.id,x,y:waterTop,width,height:n(Math.min(depth,975-waterTop)),color:b.wall,opacity:.3});
 }
 return s;
}
// One front/side split remains inside the original plot; ground and neighbors stay fixed.
const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
function cornerBuildings(s,settings){
 if(!['closeup','street','square','alley'].includes(s.mode)||settings.corners==='plain')return s;
 const r=randomStream(s.seed,'corner-selection');
 if(settings.corners==='auto'&&r()<.3)return s;
 const side=settings.corners==='auto'?(r()<.5?'left':'right'):settings.corners;
 const all=s.blocks.flatMap(block=>block.buildings),near=Math.max(...all.map(b=>b.layer));
 const eligible=all.filter(b=>(s.mode==='square'?b.layer>0:b.layer===near)&&b.width>=100&&b.height>=180).sort((a,b)=>a.x-b.x);
 if(!eligible.length)return s;
 // Face the open plaza/camera interior; street ends keep their outer side visible.
 const chooseFirst=s.mode==='street'?side==='left':side==='right';
 const b=eligible[chooseFirst?0:eligible.length-1],plotX=b.x,plotWidth=b.width,width=n(plotWidth*(.18+randomStream(s.seed,'corner-proportion')()*.08));
 b.corner={side,plotX,plotWidth,width,roofEnvelope:b.roofHeight,rise:n(Math.min(14,width*.23)),wall:mix(b.wall,s.palette.ink,.18),roof:mix(b.roofColor,s.palette.ink,.14),band:mix(b.bandColor||b.wall,s.palette.ink,.18)};
 b.width=n(plotWidth-width);if(side==='left')b.x=n(plotX+width);
 b.cols=clamp(Math.round(b.cols*b.width/plotWidth),2,5);
 b.roofHeight=n(b.roof==='flat'?Math.min(12,b.width*.08):Math.min(70,b.width*.24));
 return s;
}
// Detail streams never consume layout, palette or existing style random numbers.
function details(s,settings){
 const all=s.blocks.flatMap(b=>b.buildings),near=Math.max(...all.map(b=>b.layer));
 const family=randomStream(s.seed,'facade-family')(),kind=settings.facade==='auto'?(family<.35?'plain':family<.7?'grid':'terrace'):settings.facade;
 for(const b of all){
  const r=randomStream(s.seed,'facade-'+b.id),eligible=(s.mode==='square'?b.layer>0:b.layer===near)&&b.width>=90&&b.height>=170;
  b.windowGrid=eligible&&kind==='grid'?(r()<.5?2:3):0;
  b.terrace=eligible&&kind==='terrace'&&b.width>=115&&b.rows>=3;
  if(b.terrace)b.balcony=false;
 }
 s.clouds=[];
 const r=randomStream(s.seed,'sky-clouds'),enabled=settings.sky==='clouds'||settings.sky==='auto'&&r()<.6;
 // A conservative whole-scene skyline envelope leaves towers and roofs unobscured.
 const ceiling=Math.min(...all.map(b=>b.y-(b.corner?.roofEnvelope??b.roofHeight)),s.landmark?s.landmark.y:1000)-24;
 if(enabled&&ceiling>85){
  const count=1+Math.floor(r()*3),cell=740/count;
  for(let i=0;i<count;i++){
   const width=n(Math.min(150,cell*.7)*( .7+r()*.3)),height=n(18+r()*14);
   s.clouds.push({x:n(30+i*cell+(cell-width)*r()),y:n(32+r()*Math.max(0,ceiling-height-32)),width,height});
  }
 }
 return s;
}
// Ground floors use their own stream and reserve vertical space in the renderer.
function groundDetails(s,settings){
 const all=s.blocks.flatMap(b=>b.buildings),near=Math.max(...all.map(b=>b.layer));
 const family=pick(randomStream(s.seed,'ground-floor-family'),['arcade','awning']);
 for(const b of all){
  b.groundFloor=null;
  const r=randomStream(s.seed,'ground-floor-'+b.id),eligible=(s.mode==='square'?b.layer>0:b.layer===near)&&b.width>=110&&b.height>=180;
  const kind=settings.groundFloor==='auto'?(r()<.56?'plain':family):settings.groundFloor;
  if(!eligible||kind==='plain')continue;
  const doorHeight=Math.min(78,b.height*.22),count=clamp(Math.floor(b.width/60),2,5);
  b.groundFloor={kind,height:n(kind==='arcade'?Math.min(92,b.height*.24):doorHeight+Math.min(20,b.width*.065)+8),count,striped:kind==='awning'&&r()<.55,color:b.roofColor,light:b.trim};
 }
 return s;
}
// Local accents never consume another grammar's random stream.
function accents(s,settings){
 const all=s.blocks.flatMap(b=>b.buildings),near=Math.max(...all.map(b=>b.layer));
 const candidates=all.filter(b=>(s.mode==='square'?b.layer>0:b.layer===near)&&b.width>=110&&b.height>=180);
 const mode=settings.accents==='auto'?pick(randomStream(s.seed,'accent-mode'),['plain','plants','shade','both','both']):settings.accents;
 const leafy=['plants','both'].includes(mode),shady=['shade','both'].includes(mode);
 const leaf={harbor:'#53765e',apricot:'#61795a',garden:'#4c7050',clay:'#506d56',blue:'#597e69',rose:'#60745b'}[s.palette.id];
 s.lightDirection=randomStream(s.seed,'light-direction')()<.5?-1:1;
 for(const b of all){b.plants=[];b.shade=null;}
 const rank=stream=>[...candidates].sort((a,b)=>randomStream(s.seed,stream+a.id)()-randomStream(s.seed,stream+b.id)());
 if(leafy)for(const b of rank('plant-rank-').slice(0,3)){
  const r=randomStream(s.seed,'plant-anchor-'+b.id),row=b.terrace?b.rows-2:Math.floor(r()*(b.rows-1));
  b.plants=[{row,col:Math.floor(r()*b.cols),size:n(Math.min(5,b.width*.018)),placement:'inside',leaf,pot:s.palette.accent,stem:s.palette.ink}];
 }
 if(shady)for(const b of rank('shade-rank-').slice(0,3)){
  const r=randomStream(s.seed,'shade-shape-'+b.id),source=b.groundFloor?.kind==='awning'&&r()<.55?'awning':'eave';
  const edge=shadowEdge(b,source),depth=n(Math.min(source==='awning'?10:14,Math.max(5,b.width*.04)));
  b.shade={source,direction:s.lightDirection,points:[[n(edge.left),n(edge.top)],[n(edge.right),n(edge.top)],[n(edge.right-(s.lightDirection===1?depth:0)),n(edge.top+depth)],[n(edge.left+(s.lightDirection===-1?depth:0)),n(edge.top+depth)]],color:s.palette.ink,opacity:.14};
 }
 return s;
}
function shadowEdge(b,source){
 if(source==='awning')return {left:b.x+b.width*.1,right:b.x+b.width*.9,top:b.base-b.groundFloor.height+Math.min(20,b.width*.065)+4};
 return {left:b.x,right:b.x+b.width,top:b.y+Math.max(3,b.width*.015)};
}
export function validateScene(scene){
 if(scene.version==='0.1')return legacy.validateScene(scene);
 const errors=[],warnings=[];const finite=(v,path)=>{if(typeof v==='number'&&!Number.isFinite(v))errors.push(`non-finite:${path}`);else if(v&&typeof v==='object')for(const[k,x]of Object.entries(v))finite(x,`${path}.${k}`);};finite(scene,'scene');
 const all=scene.blocks.flatMap(b=>b.buildings),min={waterfront:20,closeup:2,street:5,square:6,hillside:4,alley:7}[scene.mode],max={waterfront:90,closeup:4,street:8,square:8,hillside:6,alley:9}[scene.mode];
 if(all.length<min||all.length>max)errors.push('building-count');
 for(const b of all){
   if(b.width<=0||b.height<=0||b.cols<1||b.cols>5||b.rows<1||b.rows>5)errors.push(`dimensions:${b.id}`);
   if(b.y-b.roofHeight<30||b.base>930||(!scene.crop&&(b.x<0||b.x+b.width>800.03)))errors.push(`bounds:${b.id}`);
   if(Math.abs(b.y+b.height-b.base)>.03)errors.push(`unsupported:${b.id}`);
   if(b.corner){const c=b.corner;if(!['closeup','street','square','alley'].includes(scene.mode)||!['left','right'].includes(c.side)||Math.abs(b.width+c.width-c.plotWidth)>.03||c.width/c.plotWidth<.179||c.width/c.plotWidth>.261||c.rise<=0||c.rise>14||Math.abs(b.x-(c.plotX+(c.side==='left'?c.width:0)))>.03||(!scene.crop&&(c.plotX<0||c.plotX+c.plotWidth>800.03)))errors.push(`corner-footprint:${b.id}`);}
   if(b.plants)for(const p of b.plants)if(!Number.isInteger(p.row)||!Number.isInteger(p.col)||p.row<0||p.row>=b.rows-1||p.col<0||p.col>=b.cols||p.size<=0||p.size>5||p.placement!=='inside')errors.push(`plant-anchor:${b.id}`);
   if(b.shade&&(![-1,1].includes(b.shade.direction)||b.shade.direction!==scene.lightDirection||b.shade.points.some(([x,y])=>x<b.x-.01||x>b.x+b.width+.01||y<b.y||y>b.base)||b.shade.opacity<=0||b.shade.opacity>.2))errors.push(`wall-shadow:${b.id}`);
   if(b.shade){
    const q=b.shade;
    if(!['eave','awning'].includes(q.source)||q.source==='awning'&&b.groundFloor?.kind!=='awning'||q.points.length!==4)errors.push(`shadow-source:${b.id}`);
    else {const edge=shadowEdge(b,q.source),[a,c,d,e]=q.points;if(Math.abs(a[0]-edge.left)>.03||Math.abs(c[0]-edge.right)>.03||Math.abs(a[1]-edge.top)>.03||Math.abs(c[1]-edge.top)>.03||d[1]<=edge.top||d[1]>edge.top+14.03||Math.abs(d[1]-e[1])>.03)errors.push(`shadow-source:${b.id}`);}
   }
   if(b.groundFloor){const g=b.groundFloor;if(!['arcade','awning'].includes(g.kind)||g.height<=0||g.height>b.height*.5||g.count<2||g.count>5||b.width<110||b.height<180)errors.push(`ground-floor:${b.id}`);}
   if(!ROOFS.includes(b.roof)||!WINDOWS.includes(b.windowShape))errors.push(`style:${b.id}`);
 }
 if(Array.isArray(scene.reflections)){
   const front=scene.blocks[scene.blocks.length-1].buildings,seen=new Set();
   if(scene.mode!=='waterfront'||scene.settings.reflection==='plain'||scene.reflections.length>(scene.settings.reflection==='matched'?front.length:7))errors.push('reflection-mode');
   const matched=scene.mode==='waterfront'&&scene.settings.reflection==='matched',scale=matched?Math.min(1,(975-n(scene.shoreY+37))/Math.max(...front.map(b=>b.height))):1;
   if(matched&&scene.reflections.length!==front.length)errors.push('reflection-count');
   for(const q of scene.reflections){
    const b=front.find(b=>b.id===q.source);
    if(!b||seen.has(q.source)||q.color!==b.wall)errors.push('reflection-source');
    seen.add(q.source);
    if(matched&&b&&(Math.abs(q.x-b.x)>.03||Math.abs(q.width-b.width)>.03||Math.abs(q.height-n(b.height*scale))>.03))errors.push('reflection-alignment');
    if(!b||q.x<b.x-.03||q.x+q.width>b.x+b.width+.03||q.width<=0||q.width>b.width||Math.abs(q.y-(scene.shoreY+37))>.03||q.height<=0||q.y+q.height>975.03||q.opacity<=0||q.opacity>.35)errors.push('reflection-bounds');
   }
 }
 if(all.filter(b=>b.corner).length>1)errors.push('corner-density');
 if(all.reduce((sum,b)=>sum+(b.plants?.length||0),0)>3||all.filter(b=>b.shade).length>3)errors.push('accent-density');
 for(const c of scene.clouds||[])if(c.x<0||c.x+c.width>800||c.y<0||c.y+c.height>Math.min(...all.map(b=>b.y-b.roofHeight),scene.landmark?.y??1000)-23)errors.push('cloud-bounds');
 if(scene.mode==='square'&&scene.plaza.right-scene.plaza.left<330)errors.push('plaza-closed');
 if(scene.mode==='alley'){
   const a=scene.alley;
   if(!a||scene.blocks.length!==3)errors.push('alley-layers');
   else {
    if(a.farHalf<50||a.nearHalf<130||a.nearHalf>200||a.farHalf>=a.nearHalf||a.farY>=a.middleY||a.middleY>=a.nearY||a.nearY>930||a.bottomCenter-a.bottomHalf<0||a.bottomCenter+a.bottomHalf>800)errors.push('alley-corridor');
    for(const [layer,center,half,base]of [[1,a.middleCenter,a.middleHalf,a.middleY],[2,a.nearCenter,a.nearHalf,a.nearY]]){
     const banks=scene.blocks[layer].buildings;
     if(banks.length!==2)errors.push('alley-banks');
     else {const [left,right]=banks,plot=b=>({x:b.corner?.plotX??b.x,width:b.corner?.plotWidth??b.width});
      if(Math.abs(plot(left).x+plot(left).width-(center-half))>.04||Math.abs(plot(right).x-(center+half))>.04||banks.some(b=>Math.abs(b.base-base)>.03))errors.push('alley-banks');
     }
    }
    const rear=scene.blocks[0].buildings,mid=scene.blocks[1].buildings,near=scene.blocks[2].buildings;
    if(Math.max(...rear.map(b=>b.height))>=Math.min(...mid.map(b=>b.height))||Math.max(...mid.map(b=>b.height))>=Math.min(...near.map(b=>b.height)))errors.push('alley-scale');
   }
 }
 if(scene.mode==='hillside'){
   const bases=all.map(b=>b.base);if(Math.max(...bases)-Math.min(...bases)<200)errors.push('flat-hillside');
   for(let i=1;i<all.length;i++)if(all[i].x<all[i-1].x+all[i-1].width)errors.push('hillside-overlap');
 }
 let visibleTower=null;if(scene.landmark){const t=scene.landmark;visibleTower=n(Math.min(...all.filter(b=>b.x<t.x+t.width+45&&b.x+b.width>t.x-45).map(b=>b.y-b.roofHeight))-t.y);if(visibleTower<50)errors.push('hidden-landmark');}
 for(const b of scene.boats)if(b.x<0||b.x+b.width>800||b.y-b.height*(b.sail?1.62:.79)<scene.shoreY+37||b.y+19>975)errors.push('boat-bounds');
 const counts={};for(const b of all)counts[b.wall]=(counts[b.wall]||0)+(b.corner?.plotWidth??b.width)*b.height;const total=Object.values(counts).reduce((a,b)=>a+b,0),maxColorShare=n(Math.max(...Object.values(counts))/total);
 return {errors,warnings,metrics:{buildings:all.length,layers:scene.blocks.length,visibleTower,maxColorShare,heightRange:n(Math.max(...all.map(b=>b.height))-Math.min(...all.map(b=>b.height))),estimatedElements:all.reduce((n,b)=>n+8+b.cols*b.rows*5,0)+150}};
}
