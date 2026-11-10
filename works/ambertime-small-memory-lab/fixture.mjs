// Authored synthetic presentation facts. Not a save, player record, or simulated trajectory.
import {NODES} from '../ambertime/town-connection.mjs';
const clone=structuredClone;
const profile=smoke=>({roughness:.22,character:.64,wood:.52,flavor:{version:1,profile:{fruit:smoke?.12:.8,grain:.3,smoke:smoke?.9:.08,body:.5,rough:.2,spice:.2,wood:.5,vanilla:.3}}});
const gen=m=>Math.floor(m/360)+1;
function make(month,{gap=false,missing=false}={}){
 const brands=[{id:1,name:'石蔵',bottle:'standard',label:'cream'}];
 const releases=[{id:1,productId:1,caskId:1,brandId:1,bottledMonth:12,age:12,bottles:600,profile:profile(true),sourceGeneration:1,recipe:{cut:'middle',cask:'bourbon'}}];
 for(let m=72;m<month;m+=72){const id=releases.length+1;releases.push({id,productId:id,caskId:id,brandId:1,bottledMonth:m,age:36,bottles:240,profile:profile(id%2===1),sourceGeneration:gen(Math.max(0,m-36)),recipe:{cut:'middle',cask:'bourbon'}});}
 if(missing)delete releases[0].profile;
 const deliveries=[];
 const put=(shopId,m,releaseId,count=3)=>deliveries.push({id:'d'+(deliveries.length+1),shopId,month:m,brandId:1,releaseId,productId:releaseId,count,revenue:count*30});
 put('town-liquor',14,1);put('town-liquor',14,1,2);
 for(let m=20;m<month-(gap?48:4);m+=8){const r=releases.filter(r=>r.bottledMonth<m).at(-1);put('town-liquor',m,r.id);if(m>80)put('supermarket',m,r.id,2);}
 if(month>48&&!gap)put('town-liquor',month-1,1,2);
 const relations=[{shopId:'town-liquor',brandId:1,startedMonth:13,status:'active'},...(month>80?[{shopId:'supermarket',brandId:1,startedMonth:79,status:'active'}]:[])];
 const events=[],arrivals=[];
 const add=(type,m,to,releaseId=1,channel='road')=>{const e={id:'e'+(events.length+1),type,month:m,to,from:type==='visit'?to:'town',releaseId,mainReleaseId:releaseId,productId:releaseId,channel,sourceId:null};events.push(e);if(type==='arrival')arrivals.push(e);return e;};
 add('arrival',15,'town',1,'direct');
 if(month>24){add('arrival',24,'diner');add('arrival',40,'near-local');}
 if(month>120){add('arrival',110,'national-food');add('arrival',132,'overseas-food');}
 if(month>180)add('inquiry',180,'overseas-food');
 for(let m=60;m<month;m+=12)add('arrival',m,'near-local',releases.filter(r=>r.bottledMonth<m).at(-1).id);
 if(month>360){add('visit',390,'near-local',1);add('arrival',420,'overseas-food',1);}
 if(month>720){add('visit',735,'near-local',1);add('inquiry',744,'overseas-food',1);}
 events.sort((a,b)=>a.month-b.month||a.id.localeCompare(b.id));
 const nodes=Object.fromEntries(NODES.map(n=>{const es=events.filter(e=>(e.type==='visit'?e.from:e.to)===n.id),reach=es.some(e=>e.type==='arrival');return [n.id,{awareness:reach?.32:0,interest:reach?(gap?.01:.12):0,root:n.id==='town'?.25:0,trading:n.id==='town',firstArrival:es.find(e=>e.type==='arrival')?.month??null}];}));
 const facts=[];
 const fact=(kind,m,ids,scene={})=>facts.push({id:kind+':'+(facts.length+1),kind,month:m,operationIndex:0,ordinal:0,generationId:gen(m),ids,scene,label:'合成した出来事',evidence:{record:'synthetic'}});
 for(const r of releases){fact('fill',Math.max(0,r.bottledMonth-r.age),{caskId:r.caskId,brandId:1},{kind:'production',entity:{id:r.caskId,name:'貯蔵庫'}});fact('bottling',r.bottledMonth,{releaseId:r.id,productId:r.id,caskId:r.caskId,brandId:1,age:r.age,count:r.bottles},{kind:'production',entity:{id:'bottling',name:'瓶詰め'},bottle:clone(brands[0])});}
 for(const r of relations)fact('shop-start',r.startedMonth,{shopId:r.shopId,brandId:1},{kind:'shop',entity:{id:r.shopId,name:r.shopId==='town-liquor'?'町の酒店':'町のスーパー'}});
 for(const d of deliveries)fact('delivery',d.month,{shopId:d.shopId,brandId:1,releaseId:d.releaseId,productId:d.productId,count:d.count},{kind:'shop',entity:{id:d.shopId,name:d.shopId==='town-liquor'?'町の酒店':'町のスーパー'},bottle:clone(brands[0])});
 for(const e of events.filter(e=>e.channel!=='direct'))fact(e.type,e.month,{regionId:e.type==='visit'?e.from:e.to,level:NODES.find(n=>n.id===e.to)?.level,releaseId:e.mainReleaseId,productId:e.productId,townReleaseId:e.releaseId,townEventId:e.id},{kind:'reputation',entity:{id:e.to,name:NODES.find(n=>n.id===e.to)?.name},bottle:clone(brands[0])});
 facts.sort((a,b)=>a.month-b.month||a.id.localeCompare(b.id));facts.forEach((e,i)=>{e.operationIndex=i;e.ordinal=i;});
 const completed=[];for(let i=1;i<=Math.floor(month/360);i++)completed.push({id:i,startedMonth:(i-1)*360,endedMonth:i*360});
 return {synthetic:true,provenance:'合成した表示比較用データ。本編の経済・評判計算を通したプレイ記録ではありません。',seed:42,core:{month,cash:2000,casks:[],products:[]},brands,releases,shop:{relations,deliveries,pendingOffers:[]},storeMarket:{startedMonth:78},department:{interests:[],adoptions:[]},operations:[{key:'enable-shop-dialogue',value:{version:2,boundaryMonth:0}},...facts.map(e=>({key:'synthetic-'+e.kind,month:e.month}))],labConnection:{version:1,town:{month,nodes,events,arrivals,shipments:deliveries.map(d=>({id:d.id,count:d.count,month:d.month})),attempts:events.map(e=>({month:e.month,sourceId:e.id,type:'synthetic-observation',probability:null,roll:null}))}},generations:{completed,active:{id:completed.length+1,startedMonth:completed.length*360}},recallFacts:facts};
}
export const scenarios=[{id:'early',label:'初代・4年',source:make(48)},{id:'generations',label:'三代目・63年',source:make(756)},{id:'gaps',label:'納品の間隔・味の記録なし',source:make(756,{gap:true,missing:true})}];
