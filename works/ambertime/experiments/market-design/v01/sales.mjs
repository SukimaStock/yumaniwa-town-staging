// Candidate-only pure monthly market. No native saves, money or inventory writes.
export const RULES='ambertime-market-design/1';
export const VENUES=Object.freeze([
 Object.freeze({id:'retail',name:'直販売',opportunities:6,preference:'少量を直接売る'}),
 Object.freeze({id:'town-liquor',name:'町の酒店',opportunities:8,preference:'煙・味の厚み'}),
 Object.freeze({id:'supermarket',name:'町のスーパー',opportunities:12,preference:'麦・果実'})
]);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const assert=(ok,s)=>{if(!ok)throw Error(s);};
const axes=['roughness','character','wood'];
const flavorKeys=['fruit','grain','smoke','body','rough','spice','wood','vanilla'];
const num=x=>Number.isFinite(x)?x:0;
const flavorOf=item=>item.flavor?.profile??item.flavor??{};
export function profileKey(item){return JSON.stringify([num(item.age),...axes.map(k=>num(item[k])),...flavorKeys.map(k=>num(flavorOf(item)[k])),num(item.price),num(item.referencePrice)]);}
export function affinity(venue,item){
 assert(VENUES.some(v=>v.id===venue),'Unknown venue');
 if(venue==='retail')return 1;
 const f=flavorOf(item),sum=['fruit','grain','smoke','body'].reduce((n,k)=>n+num(f[k]),0);
 // Legacy axis-only fixtures remain usable; no invented aroma is persisted.
 const favored=sum>0?(venue==='town-liquor'?(num(f.smoke)+num(f.body))/sum:(num(f.fruit)+num(f.grain))/sum):venue==='town-liquor'?clamp(.7*num(item.character)+.3*num(item.wood)):clamp(1-num(item.roughness));
 return clamp((favored-.15)/.65);
}
export function acceptance(venue,item,multiplier=1){
 if(venue==='supermarket'&&item.age<12)return 0;
 const fit=affinity(venue,item),reference=item.referencePrice??(venue==='retail'?item.price:venue==='town-liquor'?16:20),priceFactor=Math.sqrt(reference/Math.max(.01,item.price));
 const base=venue==='retail'?(item.age<6?.26:.84):.025+.925*fit**3;
 return clamp(base*priceFactor*multiplier);
}
export function unit(seed,key){let h=seed>>>0;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h=Math.imul(h^(h>>>16),2246822507);return ((h^(h>>>13))>>>0)/4294967296;}
// sales are proposals; caller must atomically persist state before announcing them.
// Ledger caches one accepted month; retries cannot create extra opportunities.
export function planSales(items,venue,ledger={},options={}){
 const definition=VENUES.find(v=>v.id===venue);assert(definition,'Unknown venue');
 const month=options.month??((ledger.month??0)+1),seed=options.seed??42,multiplier=options.multiplier??1,method=options.method??'carry';
 assert(Number.isInteger(month)&&month>=0&&Number.isFinite(multiplier)&&multiplier>=0&&['carry','seeded'].includes(method),'Invalid monthly options');
 assert(Array.isArray(items),'Items required');
 assert(ledger.version===undefined||ledger.version===2,'Unsupported candidate opportunity ledger');
 const ids=new Set();for(const i of items){assert((typeof i.id==='string'||Number.isInteger(i.id))&&!ids.has(i.id),'Unique item IDs required');ids.add(i.id);assert(Number.isInteger(i.count)&&i.count>=0&&Number.isFinite(i.price)&&i.price>0&&Number.isFinite(i.age)&&i.age>=0,'Invalid item');}
 const fingerprint=JSON.stringify([venue,month,seed,multiplier,method,items.map(i=>[i.id,i.count,profileKey(i)]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))]);
 if(ledger.month===month){assert(ledger.fingerprint===fingerprint,'This month was already planned with different conditions');return {...structuredClone(ledger.result),ledger:structuredClone(ledger)};}
 assert(ledger.month===undefined||month>ledger.month,'Cannot replay an earlier month');
 const grouped=new Map();for(const i of items.filter(i=>i.count>0)){const key=profileKey(i);let g=grouped.get(key);if(!g){g={key,item:i,count:0,items:[]};grouped.set(key,g);}g.count+=i.count;g.items.push(i);}
 const groups=[...grouped.values()].sort((a,b)=>a.key.localeCompare(b.key)),total=groups.reduce((n,g)=>n+g.count,0),opportunities=Math.min(definition.opportunities,total);
 // Persistent deficit scheduling carries fractional CUSTOMER opportunities too.
 // Monthly largest remainders alone can permanently starve a small profile.
 // Center retained deficits after a profile appears/disappears; common shifts
 // preserve priority while preventing absent shelves from banking entitlement.
 const center=groups.length?groups.reduce((n,g)=>n+num(ledger.opportunityCredits?.[g.key]),0)/groups.length:0;
 for(const g of groups){g.attempts=0;g.opportunityCredit=num(ledger.opportunityCredits?.[g.key])-center+opportunities*g.count/total;}
 for(let i=0;i<opportunities;i++){const eligible=groups.filter(g=>g.attempts<g.count).sort((a,b)=>b.opportunityCredit-a.opportunityCredit||a.key.localeCompare(b.key));assert(eligible.length>0,'Customer opportunity exceeds physical stock');const g=eligible[0];g.attempts++;g.opportunityCredit-=1;}
 const sales=[],credits={},opportunityCredits={},details=[];let slot=0;
 for(const g of groups){const probability=acceptance(venue,g.item,multiplier),prior=clamp(num(ledger.credits?.[g.key]),0,.999999999999),raw=prior+g.attempts*probability;let sold;
  if(method==='carry')sold=Math.min(g.count,Math.floor(raw+1e-10));else{sold=0;for(let i=0;i<g.attempts;i++)if(unit(seed,`${RULES}:${venue}:${month}:${slot+i}`)<probability)sold++;}
  slot+=g.attempts;const credit=method==='carry'?Math.max(0,raw-Math.floor(raw+1e-10)):0;
  // Credits never exceed one and disappear with a depleted/absent profile.
  if(sold<g.count){if(credit>0)credits[g.key]=credit;opportunityCredits[g.key]=g.opportunityCredit;}
  let remaining=sold;for(const i of g.items.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id),undefined,{numeric:true}))){const count=Math.min(i.count,remaining);if(count)sales.push({id:i.id,count});remaining-=count;}
  details.push({key:g.key,fit:affinity(venue,g.item),probability,attempts:g.attempts,sold,credit:credits[g.key]??0,opportunityCredit:opportunityCredits[g.key]??0});
 }
 const result={venue,month,opportunities,attempted:slot,sold:sales.reduce((n,s)=>n+s.count,0),sales,groups:details};
 const next={version:2,month,credits,opportunityCredits,fingerprint,result:structuredClone(result)};
 return {...result,ledger:next};
}
