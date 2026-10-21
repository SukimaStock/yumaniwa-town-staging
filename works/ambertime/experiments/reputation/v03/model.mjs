// Pure Lab model. No main save, demand, price or approval imports.
export const VERSION='reputation/0.3';
export const SEEDS=[20261021,42];
export const SHOPS=[
 {id:'town',name:'町の酒店',region:'旧市街',x:90,y:110,taste:[.4,.7,.2],age:24,price:27},
 {id:'diner',name:'食堂',region:'旧市街',x:80,y:235,taste:[.55,.8,.1],age:12,price:22},
 {id:'bar',name:'路地のバー',region:'旧市街',x:205,y:195,taste:[.65,.65,.5],age:12,price:32},
 {id:'super',name:'スーパー',region:'駅前',x:300,y:90,taste:[.15,.45,.15],age:24,price:22},
 {id:'restaurant',name:'レストラン',region:'駅前',x:310,y:250,taste:[.15,.65,.55],age:48,price:44},
 {id:'specialist',name:'専門酒店',region:'川向こう',x:100,y:380,taste:[.3,.95,.25],age:24,price:36},
 {id:'department',name:'デパート',region:'川向こう',x:300,y:400,taste:[.08,.55,.8],age:72,price:60},
 {id:'hill',name:'丘の宿',region:'丘',x:205,y:535,taste:[.1,.65,.7],age:72,price:52}
];
// Undirected experimental roads: distance units and strength of shop relationships.
export const ROADS=[['town','diner',1,.9],['town','bar',1,.85],['town','super',2,.6],['diner','specialist',3,.65],['bar','restaurant',2,.6],['super','restaurant',1,.7],['specialist','department',3,.45],['restaurant','department',3,.45],['department','hill',5,.3],['specialist','hill',5,.25]];
export const STRATEGIES=[['A','酒店へ少量継続'],['B','大店へ集中'],['C','複数店舗へ分散'],['D','若い商品・分散'],['E','長期熟成・分散'],['F','30年で商品・納品先変更']];
// Representative frozen releases in native roughness/character/wood units; hypotheses,
// not native recipe replay. One brand AmberTime; serial changes every 18 months.
export const PRODUCTS={standard:{age:24,roughness:.3,character:.78,wood:.3,price:30},young:{age:12,roughness:.68,character:.85,wood:.08,price:22},long:{age:72,roughness:.08,character:.52,wood:.78,price:58}};
const clamp=n=>Math.max(0,Math.min(1,n));
export function unit(seed,key){let h=seed>>>0;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h=Math.imul(h^(h>>>16),2246822507);return ((h^(h>>>13))>>>0)/4294967296;}
export function affinity(shop,p){const target=shop.taste;const axes=[p.roughness,p.character,p.wood];const taste=Math.exp(-axes.reduce((s,v,i)=>s+Math.abs(v-target[i])*[1.1,1.3,1][i],0));const age=Math.exp(-Math.abs(Math.log((p.age+12)/(shop.age+12)))*.7);const price=Math.exp(-Math.abs(Math.log(p.price/shop.price))*1.4);return {taste,age,price,fit:taste*age*price};}
export function create({seed=SEEDS[0],strategy='C',affinityOn=true,continuityOn=true,propagationOn=true,supply=24,quantityScale=1}={}){
 if(!Number.isInteger(seed)||seed<1||seed>4294967295||!STRATEGIES.some(x=>x[0]===strategy)||!Number.isInteger(supply)||supply<0||supply>24||!Number.isFinite(quantityScale)||quantityScale<0||quantityScale>4)throw Error('Invalid experiment conditions');
 const initialProduct={...PRODUCTS[strategy==='D'?'young':strategy==='E'?'long':'standard'],brand:'AmberTime',release:1};
 return {lots:[{stock:supply,product:initialProduct}],version:VERSION,seed,strategy,affinityOn,continuityOn,propagationOn,supply,quantityScale,month:0,generation:1,inventory:supply,produced:supply,delivered:0,shipments:[],packets:[],routes:[],handovers:[],nodes:Object.fromEntries(SHOPS.map(n=>[n.id,{awareness:0,interest:0,tie:0,periods:0,lastDelivery:null,received:0,accepted:n.id==='town',firstKnown:null,firstCandidate:null,firstDelivery:null}]))};
}
export function productAt(s){return {...PRODUCTS[s.strategy==='D'?'young':s.strategy==='E'||s.strategy==='F'&&s.month>360?'long':'standard'],brand:'AmberTime',release:Math.floor(s.month/18)+1};}
export function candidate(n){return n.awareness>=.18&&n.interest>=.035;}
export function handover(s){const before=JSON.stringify(s.nodes);s.generation++;s.handovers.push({month:s.month,generation:s.generation,preserved:before===JSON.stringify(s.nodes)});}
function delivery(s,id,q,p){
 for(const lot of [...s.lots].reverse()){if(q<=0)break;const count=Math.min(q,lot.stock,s.inventory);if(!count)continue;deliverLot(s,id,count,lot.product);lot.stock-=count;q-=count;}
}
function deliverLot(s,id,q,p){if(!q)return;const n=s.nodes[id];q=Math.min(q,s.inventory);if(!q)return;s.inventory-=q;s.delivered+=q;n.received+=q;n.firstDelivery??=s.month;if(n.lastDelivery!==s.month){n.periods++;n.tie=s.continuityOn?Math.min(1,n.tie+.018):0;}n.lastDelivery=s.month;
 const event={id:s.shipments.length,month:s.month,to:id,count:q,product:{...p}};s.shipments.push(event);
 // Bulk saturates within one delivery; separate months sustain local relationships.
 s.packets.push({delivery:event.id,node:id,path:[id],due:s.month,strength:1-Math.exp(-q/4),hop:0});
}
function distribute(s,p){if(s.month%3!==0)return;
 // Common one-year bootstrap at town. Experimental autoaccept only after candidate.
 const reached=SHOPS.filter(n=>s.nodes[n.id].accepted).map(n=>n.id);let destinations;
 if(s.month<=12||s.strategy==='A'||s.strategy==='F'&&s.month<=360)destinations=['town'];
 else if(s.strategy==='B'||s.strategy==='F')destinations=['department','super','restaurant'].filter(id=>reached.includes(id)).slice(0,1);
 else destinations=reached;
 if(destinations.length===0)destinations=['town'];
 // Same 12 bottles/year requested: A,C quarter3; B annual12. Unreachable recipients wait.
 const bulk=s.strategy==='B'||s.strategy==='F'&&s.month>360;
 if(bulk&&s.month>12&&s.month%12!==0)return;
 const q=Math.floor((bulk&&s.month>12?12:3)*s.quantityScale);
 if(destinations.length){const index=Math.floor(s.month/3)-1;delivery(s,destinations[index%destinations.length],q,p);}
}
export function step(s){s.month++;if(s.month%18===0){s.inventory+=s.supply;s.produced+=s.supply;s.lots.push({stock:s.supply,product:productAt(s)});}
 const p=productAt(s);for(const n of Object.values(s.nodes)){n.interest*=.998;n.tie*=.999;if(candidate(n))n.accepted=true;}
 distribute(s,p);
 const due=s.packets.filter(x=>x.due<=s.month);s.packets=s.packets.filter(x=>x.due>s.month);
 // A receipt cohort reaches each shop only through its first/strongest earliest path.
 const byDelivery=new Map();for(const packet of due){const key=packet.delivery+':'+packet.node;const old=byDelivery.get(key);if(!old||old.strength<packet.strength)byDelivery.set(key,packet);}
 for(const packet of byDelivery.values()){
  if(s.routes.some(r=>r.delivery===packet.delivery&&r.to===packet.node))continue;
  const n=s.nodes[packet.node],shop=SHOPS.find(x=>x.id===packet.node),release=s.shipments[packet.delivery].product,fit=s.affinityOn?affinity(shop,release).fit:1;
  // Local repeated contacts persist in local roads. Not a store-specific multiplier.
  const origin=s.nodes[s.shipments[packet.delivery].to],sameRegion=shop.region===SHOPS.find(x=>x.id===s.shipments[packet.delivery].to).region;
  const continuity=s.continuityOn&&sameRegion?1+origin.tie:1;
  const signal=packet.strength*continuity;
  n.awareness=clamp(n.awareness+.04*signal*(1-n.awareness));n.interest=clamp(n.interest+.022*signal*fit*(1-n.interest));
  if(n.awareness>=.12)n.firstKnown??=s.month;if(candidate(n))n.firstCandidate??=s.month;
  s.routes.push({delivery:packet.delivery,month:s.month,to:packet.node,path:packet.path,strength:packet.strength,fit});
  if(!s.propagationOn)continue;
  for(const [a,b,distance,relation] of ROADS){const next=a===packet.node?b:b===packet.node?a:null;if(!next||packet.path.includes(next))continue;const attenuation=.68*relation*(.9+.2*unit(s.seed,packet.delivery+':'+a+':'+b));const strength=packet.strength*attenuation;if(strength<.002)continue;
   s.packets.push({delivery:packet.delivery,node:next,path:[...packet.path,next],due:s.month+Math.ceil(distance*6),strength,hop:packet.hop+1});
  }
 }
 if(s.month%360===0)handover(s);return s;
}
export function summary(s){return {month:s.month,years:s.month/12,generation:s.generation,produced:s.produced,delivered:s.delivered,inventory:s.inventory,known:SHOPS.filter(x=>s.nodes[x.id].awareness>=.12).map(x=>x.id),regions:[...new Set(SHOPS.filter(x=>s.nodes[x.id].awareness>=.12).map(x=>x.region))],interested:SHOPS.filter(x=>s.nodes[x.id].interest>=.035).map(x=>x.id),candidates:SHOPS.filter(x=>candidate(s.nodes[x.id])&&!s.nodes[x.id].received).map(x=>x.id),trading:SHOPS.filter(x=>s.nodes[x.id].received>0).map(x=>x.id),nodes:structuredClone(s.nodes),handovers:structuredClone(s.handovers)};}
export function run(options={},years=60){const s=create(options);for(let m=0;m<years*12;m++)step(s);return s;}

// Feasibility witness, separate from demand. One 32L cask per 18 months,
// <=24 bottles reserved after evaporation (conservative for <=72-month refill).
// Negative start dates explicitly represent common prepared production history.
export function productionCalendar(strategy,years=90){return Array.from({length:Math.floor(years*12/18)+1},(_,i)=>{const harvest=i*18,age=PRODUCTS[strategy==='D'?'young':strategy==='E'||strategy==='F'&&harvest>360?'long':'standard'].age;return {release:i+1,start:harvest-age,harvest,age,bottles:24};});}
export function peakCasks(calendar){let peak=0;for(let m=-72;m<=Math.max(...calendar.map(x=>x.harvest));m++)peak=Math.max(peak,calendar.filter(x=>x.start<=m&&m<x.harvest).length);return peak;}
