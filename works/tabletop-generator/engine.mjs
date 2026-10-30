export const VERSION=1;
export const PALETTES={
 cream:{name:'クリームと青緑',background:'#e9dfc8',table:'#d6bd8b',vessel:'#f9f0da',rim:'#d4c9a7',dark:'#276566',cloth:'#7caaa3',fruit:'#dc633d',yellow:'#e7b746',green:'#577b58',bottle:'#307a74'},
 teal:{name:'青緑と朱',background:'#517f7a',table:'#7da69a',vessel:'#f3e8cc',rim:'#c8cfaf',dark:'#254e50',cloth:'#e4b35d',fruit:'#d65a3b',yellow:'#edcd69',green:'#456f53',bottle:'#294f56'},
 rust:{name:'朱とクリーム',background:'#ce6e50',table:'#db9474',vessel:'#f4e5c7',rim:'#d7bd9b',dark:'#435d60',cloth:'#729a98',fruit:'#b83e32',yellow:'#e8b751',green:'#5d7356',bottle:'#496e67'},
 olive:{name:'黄土とオリーブ',background:'#ddd3ac',table:'#b6ba8c',vessel:'#f6ebcc',rim:'#d4c6a0',dark:'#586750',cloth:'#d3975b',fruit:'#c6573e',yellow:'#e6b64e',green:'#6e834d',bottle:'#5a7052'},
 blue:{name:'群青と桃',background:'#4d6987',table:'#829caf',vessel:'#f1dfc4',rim:'#cfc5b6',dark:'#314d69',cloth:'#d79e85',fruit:'#c55c49',yellow:'#e7ba62',green:'#677f60',bottle:'#3a696e'}
};
const choices={composition:['top','side'],palette:Object.keys(PALETTES),density:['few','normal','many'],texture:['original','print','watercolor']};
export function normalizeSettings(input={}){const out={version:1,seed:String(input.seed??'table-01').trim().slice(0,80)||'table-01'};for(const [k,v]of Object.entries(choices))out[k]=v.includes(input[k])?input[k]:v[k==='density'?1:0];return out;}
export function random(seed){let h=2166136261;for(const c of String(seed)){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return()=>{h+=0x6d2b79f5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function generateScene(input={}){
 const settings=normalizeSettings(input),p=PALETTES[settings.palette],r=random(settings.seed+':layout');
 const between=(a,b)=>a+(b-a)*r(),pick=a=>a[Math.floor(r()*a.length)],objects=[];
 let serial=0;const add=(kind,data)=>{const o={id:`o${serial++}`,kind,z:objects.length,...data};objects.push(o);return o;};
 const fruit=(x,y,size,parent=null,shape=null)=>({kind:shape||pick(['round','round','lemon','pear']),x,y,size,angle:between(-25,25),color:pick([p.fruit,p.yellow]),leaf:r()>.45,parent});
 const count=settings.density==='few'?2:settings.density==='normal'?3:5;
 const mirror=r()>.5,variant=Math.floor(r()*4),mx=x=>mirror?900-x:x;
 if(settings.composition==='top'){
  // Four designed arrangements vary the empty area, crop and dominant mass.
  const layouts=[{x:340,y:405,rx:163,ry:159,crop:false},{x:115,y:380,rx:185,ry:182,crop:true},{x:385,y:260,rx:174,ry:169,crop:false},{x:335,y:475,rx:174,ry:170,crop:false}];
  const a=layouts[variant],dx=between(-15,15),dy=between(-16,16),scale=between(.90,1.055);
  add('cloth',{x:mx(a.x+120),y:a.y+10,w:410,h:510,angle:mirror?-18:18,color:p.cloth});
  const main=add('plate',{x:mx(a.x+dx),y:a.y+dy,rx:a.rx*scale,ry:a.ry*scale,color:p.vessel,rim:p.rim,intentionalCrop:a.crop,children:[]});
  const angles=count===2?[-119,-34]:count===3?[-100,24,145]:[-100,-28,44,116,188];
  main.children=angles.map((angle,i)=>{const a=(angle+between(-2,2))*Math.PI/180, radius=between(.485,.50);return fruit(main.x+Math.cos(a)*main.rx*radius,main.y+Math.sin(a)*main.ry*radius,between(28,33)*scale,main.id,i===1?'lemon':null);});
  const cupY=variant===2?535:180,cupX=variant===2?590:650;
  add('cup',{x:mx(cupX),y:cupY,rx:between(53,61),ry:between(53,61),color:p.dark,inside:p.fruit,handleSide:mirror?-1:1});
  if(settings.density!=='few'){
   const b=add('bowl',{x:mx(variant===2?720:715),y:variant===2?300:425,rx:between(95,105),ry:between(94,101),color:p.dark,rim:p.cloth,children:[]});
   b.children=[fruit(b.x-21,b.y-10,25,b.id,'round'),fruit(b.x+23,b.y+10,25,b.id,'pear')];
  }
  if(settings.density==='many'){
   add('plate',{x:mx(variant===2?100:710),y:variant===2?70:695,rx:83,ry:82,color:p.vessel,rim:p.rim,intentionalCrop:true,children:[]});
   add('fruit',{...fruit(mx(variant===2?140:130),variant===2?610:135,38,null,'pear'),kind:'fruit',fruitKind:'pear'});
  }
 }else{
  const ground=575+between(-12,12),shift=between(-25,25),compact=variant===1;
  add('cloth',{x:mx(540),y:ground+27,w:470,h:200,angle:mirror?-7:7,color:p.cloth});
  add('bottle',{x:mx(195+shift),base:ground-21,w:between(compact?96:82,compact?108:96),h:(variant===3?250:310)*between(.9,1.06),color:p.bottle,mouth:p.dark,variant:variant%2});
  const bowl=add('bowl',{x:mx(465+shift),base:ground+3,w:between(262,286),h:between(122,139),color:p.vessel,rim:p.rim,children:[]});
  const positions=[[-55,-bowl.h-7],[21,-bowl.h-10],[65,-bowl.h-5],[-15,-bowl.h-58],[47,-bowl.h-56]];
  bowl.children=positions.slice(0,count).map(([x,y],i)=>fruit(bowl.x+x,bowl.base+y,between(33,40),bowl.id,i===1?'lemon':null));
  if(settings.density!=='few'){
   add('cup',{x:mx(735+shift*.2),base:ground+13,w:112,h:112,color:p.dark,inside:p.fruit,handleSide:mirror?-1:1});
   add('plate',{x:mx(665),base:ground+64,w:260,h:28,color:p.vessel,rim:p.rim,children:[]});
   add('fruit',{...fruit(mx(660),ground+22,34,null,'lemon'),kind:'fruit',fruitKind:'lemon',base:ground+61});
  }
  if(settings.density==='many'){
   add('fruit',{...fruit(mx(153),ground+63-35,35,null,'round'),kind:'fruit',fruitKind:'round',base:ground+63});
   add('fruit',{...fruit(mx(244),ground+77-37,37,null,'pear'),kind:'fruit',fruitKind:'pear',base:ground+77});
  }
 }
 return{settings,width:900,height:720,palette:{...p},tableY:settings.composition==='side'?380:0,variant,mirror,objects};
}
