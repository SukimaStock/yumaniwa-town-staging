// The scene is plain data. No DOM, drawing APIs, timers or external resources.
export const VERSION = '0.1';
export const PALETTES = [
  {id:'harbor',name:'青と朱',sky:'#8ac8d4',water:'#17678a',walls:['#f2c850','#e9734e','#f8ebce','#c34c47','#327f88','#a1c9bd'],roofs:['#b84736','#de6b3e','#274e62'],ink:'#244c60',light:'#fff0cf',quay:'#e8d6a4',terraces:['#739f9a','#c09b74','#e0be83'],ripple:'#77b6c0',accent:'#e4543e'},
  {id:'apricot',name:'桃と群青',sky:'#f7dcba',water:'#284e75',walls:['#eea17f','#e9c467','#f7ebcd','#bc5a64','#567f9c','#c5cbbb'],roofs:['#ae4b47','#d37b53','#3a5874'],ink:'#334962',light:'#fff0d3',quay:'#e6be8d',terraces:['#9da9a8','#c8a295','#e4b48c'],ripple:'#748fa5',accent:'#e17652'},
  {id:'garden',name:'緑と黄',sky:'#c9ddd2',water:'#367b7d',walls:['#e2b94e','#c56449','#f2e6c9','#738a66','#dd9771','#719f9c'],roofs:['#9c4738','#c47746','#42675e'],ink:'#334f48',light:'#f9ebca',quay:'#daca9d',terraces:['#8da98e','#b4a77f','#c9bc8d'],ripple:'#83b8ac',accent:'#cd5b3f'}
];
export const COMPOSITIONS = ['hill','valley','slope','twin'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const round=v=>Math.round(v*100)/100;
export function randomStream(seed,domain='layout') {
  let h=2166136261;
  for(const c of `${String(seed)}|${domain}`) h=Math.imul(h^c.charCodeAt(0),16777619);
  return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
export function normalizeSettings(settings={}) {
  return {palette:PALETTES.some(p=>p.id===settings.palette)?settings.palette:'auto',density:['open','normal','dense'].includes(settings.density)?settings.density:'normal',composition:COMPOSITIONS.includes(settings.composition)?settings.composition:'auto'};
}
const pick=(r,items)=>items[Math.floor(r()*items.length)];
const mix=(a,b,t)=>a+(b-a)*t;
function luminance(hex) {return [1,3,5].reduce((s,i,j)=>s+parseInt(hex.slice(i,i+2),16)*[.2126,.7152,.0722][j],0);}
function contour(mode,x,phase,amplitude,direction) {
  const t=x/800;
  if(mode==='hill') return -Math.exp(-(((t-phase)/.3)**2))*amplitude;
  if(mode==='valley') return -Math.abs(t-phase)*amplitude*1.7;
  if(mode==='slope') return (t-.5)*amplitude*direction;
  return -Math.max(Math.exp(-(((t-.23)/.2)**2)),Math.exp(-(((t-.77)/.19)**2)))*amplitude;
}
export function generateScene(seed='harbor-01',settings={}) {
  seed=String(seed).slice(0,120)||'harbor-01';settings=normalizeSettings(settings);
  const layout=randomStream(seed,'composition'),buildingRng=randomStream(seed,'buildings'),color=randomStream(seed,'color'),detail=randomStream(seed,'waterfront');
  const palette=PALETTES.find(p=>p.id===settings.palette)||pick(randomStream(seed,'palette'),PALETTES);
  const composition=settings.composition==='auto'?pick(layout,COMPOSITIONS):settings.composition;
  const shoreY=round(660+layout()*65),phase=.32+layout()*.36,amplitude=145+layout()*100,direction=layout()<.5?-1:1;
  const layerCount=layout()<.28?4:3;
  const blocks=[];
  for(let layer=0;layer<layerCount;layer++) {
    const depth=layer/(layerCount-1),step=layerCount===4?76:110;
    const base=shoreY-(layerCount-1-layer)*step;
    const meanWidth=mix(49,88,depth)*({open:1.2,normal:1,dense:.83}[settings.density]);
    const heightPhrases=Array.from({length:4},()=>buildingRng());
    let x=0,index=0,previousColor=-1;
    const buildings=[];
    while(x<799) {
      let width=clamp(meanWidth*(.72+buildingRng()*.6),34,125);
      if(800-x<width+30) width=800-x;
      const cx=x+width/2;
      const type=width<52?'slender':width>99?'wide':pick(buildingRng,['house','house','arcade']);
      // Neighboring buildings share a height phrase; the variation belongs to a block.
      const phrase=heightPhrases[Math.min(3,Math.floor(cx/200))];
      const height=round(mix(92,102,depth)+buildingRng()*35+phrase*mix(28,92,depth)+(type==='slender'?18:0)-(type==='wide'?12:0));
      const roof=pick(buildingRng,['gable','hip','flat']);
      const roofHeight=round(roof==='flat'?7:width*(.14+buildingRng()*.12));
      const ground=round(Math.max(height+roofHeight+100,base+contour(composition,cx,phase,amplitude,direction)*(1-depth)));
      const cols=clamp(Math.floor(width/(depth<.4?20:24)),1,4);
      const rows=clamp(Math.floor(height/(depth<.4?32:42)),2,5);
      // A block has a preferred color, but neighbors never repeat exactly.
      const blockPreference=(layer*2+Math.floor(cx/210))%palette.walls.length;
      const options=palette.walls.map((_,i)=>i).filter(i=>i!==previousColor);
      const wallIndex=color()<.35&&blockPreference!==previousColor?blockPreference:pick(color,options);
      previousColor=wallIndex;
      const wall=palette.walls[wallIndex];
      const roofOptions=palette.roofs.filter(c=>Math.abs(luminance(c)-luminance(wall))>28);
      const roofColor=pick(color,roofOptions.length?roofOptions:palette.roofs);
      const windowColor=luminance(wall)<135?palette.light:palette.ink;
      const building={id:`b${layer}-${index++}`,layer,x:round(x),y:round(ground-height),width:round(width),height,base:ground,type,roof,roofHeight,wall,wallIndex,roofColor,windowColor,cols,rows,windowShape:buildingRng()<.23?'arch':'rect',balcony:depth>.4&&buildingRng()<.28,trim:palette.light};
      buildings.push(building);x+=width;
    }
    const ground=[];
    for(const b of buildings) ground.push([b.x,b.base],[round(b.x+b.width),b.base]);
    blocks.push({layer,depth,ground,groundColor:palette.terraces[Math.min(layer,2)],buildings});
  }
  // The tower belongs to a rear block; its cap is constrained to clear all foreground roofs.
  const towerX=round(112+layout()*574),towerWidth=34+layout()*13;
  const frontRoofs=blocks.flatMap(b=>b.buildings).filter(b=>b.x<towerX+towerWidth+45&&b.x+b.width>towerX-45).map(b=>b.y-b.roofHeight);
  const towerBase=blocks[0].buildings.find(b=>b.x<=towerX&&b.x+b.width>=towerX).base;
  const towerTop=round(clamp(Math.min(...frontRoofs)-64-layout()*32,42,280));
  const landmark={type:'tower',x:towerX,y:towerTop,width:round(towerWidth),height:round(towerBase-towerTop),base:towerBase,wall:palette.walls[2],roofColor:palette.roofs[0],windowColor:palette.ink};
  const boats=[];const count=detail()<.55?2:1;
  const boatSlots=count===2?[{x:80+detail()*110,y:shoreY+120+detail()*20,scale:.66},{x:400+detail()*90,y:shoreY+175+detail()*20,scale:1}]:[{x:190+detail()*270,y:shoreY+143+detail()*35,scale:.95}];
  for(const slot of boatSlots) boats.push({...slot,x:round(slot.x),y:round(slot.y),width:round(164*slot.scale),height:round(66*slot.scale),sail:detail()<.55,hull:palette.accent,deck:palette.light});
  const waterlines=Array.from({length:16},()=>{const x=round(35+detail()*680);return {x,y:round(shoreY+58+detail()*(920-shoreY)),width:round(Math.min(780-x,18+detail()*78))};});
  const people=Array.from({length:6+Math.floor(detail()*8)},()=>({x:round(25+detail()*750),y:round(shoreY+17+detail()*7),color:pick(detail,[palette.ink,palette.accent,palette.ink])}));
  return {version:VERSION,seed,settings,palette,composition,width:800,height:1000,shoreY,layerCount,blocks,landmark,boats,people,waterlines};
}
export function validateScene(scene) {
  const errors=[],warnings=[];
  function finite(value,path) {if(typeof value==='number'&&!Number.isFinite(value))errors.push(`non-finite:${path}`);else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))finite(v,`${path}.${k}`);}
  finite(scene,'scene');
  const buildings=scene.blocks.flatMap(b=>b.buildings),heights=buildings.map(b=>b.height),colors={};
  for(const block of scene.blocks) {
    if(block.buildings.length<5) errors.push(`sparse-layer:${block.layer}`);
    for(let i=0;i<block.buildings.length;i++) {
      const b=block.buildings[i];
      if(b.width<=0||b.height<=0||b.cols<1||b.rows<1)errors.push(`dimensions:${b.id}`);
      if(b.x<0||b.x+b.width>800.02||b.y-b.roofHeight<32||b.base>scene.shoreY+.02)errors.push(`bounds:${b.id}`);
      if(Math.abs(b.y+b.height-b.base)>.03)errors.push(`unsupported:${b.id}`);
      if(i&&Math.abs(block.buildings[i-1].x+block.buildings[i-1].width-b.x)>.03)errors.push(`gap:${b.id}`);
      if(i&&block.buildings[i-1].wall===b.wall)errors.push(`same-neighbor:${b.id}`);
      colors[b.wall]=(colors[b.wall]||0)+b.width*b.height;
    }
  }
  const total=Object.values(colors).reduce((s,v)=>s+v,0),maxColorShare=Math.max(...Object.values(colors))/total;
  if(maxColorShare>.48)warnings.push('color-area-concentration');
  const tower=scene.landmark;
  const occluders=buildings.filter(b=>b.x<tower.x+tower.width+45&&b.x+b.width>tower.x-45);
  const visibleTower=round(Math.min(...occluders.map(b=>b.y-b.roofHeight))-tower.y);
  if(visibleTower<50)errors.push('hidden-landmark');
  for(const b of scene.boats)if(b.x<0||b.x+b.width>800||b.y-b.height*(b.sail?1.62:.79)<scene.shoreY+37||b.y+19>975)errors.push('boat-bounds');
  for(const r of scene.waterlines)if(r.x<0||r.x+r.width>800||r.y<scene.shoreY+37||r.y>1000)errors.push('waterline-bounds');
  if(Math.max(...heights)-Math.min(...heights)<45)errors.push('flat-heights');
  return {errors,warnings,metrics:{buildings:buildings.length,layers:scene.blocks.length,heightRange:round(Math.max(...heights)-Math.min(...heights)),maxColorShare:round(maxColorShare),visibleTower,estimatedElements:buildings.reduce((s,b)=>s+4+b.rows*b.cols*(b.balcony?3:1),0)+100}};
}
