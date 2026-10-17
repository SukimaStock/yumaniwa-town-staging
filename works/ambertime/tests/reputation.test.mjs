import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import * as E from '../economy.mjs';
import {ECONOMY_PARAMETERS as ECONOMY} from '../economy-parameters.mjs';
import {REPUTATION,brandStats,brandReputation,reputationFrom,latestReleaseBrand,retailReputationFactors} from '../brand-reputation.mjs';
import {advance,fill,release,exact} from './brands-helpers.mjs';
import {loadFixture} from './wholesale-care-helpers.mjs';
const fixtureURL=new URL('../design/reputation/v8-partial-sale.json',import.meta.url);
const round=n=>Math.round(n*100)/100;
const identity=s=>assert.equal(round(s.core.cash-(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep))||0,0);
const plain=s=>{const {version,rules,operations,brands,releases,...rest}=s;return rest;};
// Small ledger projections test the arithmetic independently of chemistry and
// transaction fixtures; they are not presented as valid saved games.
const ledger=(rows)=>({brands:[{id:1},{id:2}],releases:rows.map((r,i)=>({id:i+1,brandId:1,productId:100+i,bottledMonth:i,bottles:100,sold:0,revenue:0,listed:true,status:'selling',...r}))});

test('v9 is an explicit recorded boundary; v8 partial-sale save remains byte-for-byte reproducible',()=>{
 const raw=fs.readFileSync(fixtureURL,'utf8').trim(),old=D.restoreDistillery(raw),before=JSON.stringify(old),s=D.enableReputation(old);
 assert.equal(JSON.stringify(old),before);assert.equal(D.serializeDistillery(old),raw);assert.equal(s.version,9);assert.equal(s.rules,'retail-brand-reputation');assert.deepEqual(s.operations,[...old.operations,{key:'enable-brand-reputation'}]);
 assert.deepEqual(s.core,old.core);assert.deepEqual(s.brands,old.brands);assert.deepEqual(s.releases,old.releases);assert.deepEqual(s.records,old.records);assert.equal(D.enableReputation(s),s);assert.deepEqual(exact(s),s);assert.equal(brandStats(s,1).sold,12);assert(brandReputation(s,1).bonus>0);
 // A fresh process has no replay checkpoint, so migration must reproduce the
 // complete old execution prefix before reaching the new contract.
 const script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};const s=D.restoreDistillery(fs.readFileSync(0,'utf8'));process.stdout.write(D.serializeDistillery(s));`;
 const cold=execFileSync(process.execPath,['--input-type=module','-e',script],{input:D.serializeDistillery(s),encoding:'utf8'});assert.equal(cold,JSON.stringify(s));
});

test('enabling reputation cannot exceed the operation limit or mutate a v8 save',()=>{
 const old=D.newBrandedDistillery(1);old.operations=Array(12000).fill({key:'x'});const raw=JSON.stringify(old);assert.throws(()=>D.enableReputation(old),/帳面/);assert.equal(JSON.stringify(old),raw);
});

test('brand totals count release ledger once, separating listed stock from unlisted bottles',()=>{
 const s=ledger([{sold:100,revenue:1234.56,status:'sold-out'},{sold:30,revenue:123.45},{sold:20,revenue:41.99,listed:false},{brandId:2,sold:70,revenue:140}]);
 s.core={products:s.releases.map(r=>({...r,stock:r.bottles-r.sold}))};s.records=s.releases.map(r=>({...r}));
 assert.deepEqual(brandStats(s,1),{releases:3,sold:150,soldOut:1,revenue:1400,stock:150,sellingStock:70,sellingReleases:2+20/30});
 assert.equal(brandStats(s,2).sold,70);assert.equal(brandStats(s,2).revenue,140);assert.equal(brandStats(s,999).releases,0);
 // Removing product and completed-record mirrors cannot erase or duplicate
 // release history, including sold-out releases.
 const before=brandStats(s,1);s.core.products=[];s.records=[];assert.deepEqual(brandStats(s,1),before);
});

test('reputation grows from actual sales with gradual, monotone and bounded effects',()=>{
 let previous=0;
 for(const sold of [0,1,10,30,100,300,1000,3000,1000000]){
  const s=ledger([{bottles:1000000,sold,revenue:sold*10}]),r=brandReputation(s,1);
  assert(Number.isFinite(r.bonus));assert(r.bonus>=previous);assert(r.bonus<REPUTATION.maxBonus);assert.equal(r.multiplier,1+r.bonus);if(sold===0)assert.equal(r.bonus,0);previous=r.bonus;
 }
 assert(brandReputation(ledger([{sold:30}]),1).bonus<0.02,'one small release does not create a large bonus');
 const known=ledger([{sold:100,revenue:1000,status:'sold-out'},{sold:30,revenue:300}]),before=brandReputation(known,1);
 known.releases.push(...ledger(Array.from({length:60},()=>({sold:0}))).releases);assert.deepEqual(brandReputation(known,1),before,'bottling or listing unsold releases gives no reputation');
 const one=brandReputation(ledger([{sold:120}]),1),four=brandReputation(ledger(Array.from({length:4},()=>({sold:30}))),1);assert(four.bonus>one.bonus,'real repeat-release sales add modest continuity');assert(four.bonus-one.bonus<0.01);
 const tokens=brandReputation(ledger(Array.from({length:120},()=>({sold:1}))),1);assert.equal(tokens.bonus,four.bonus,'splitting the same sales into token releases does not inflate continuity');
});

test('only preceding releases of the same brand contribute demand; own and future sales cannot feed back',()=>{
 const s=ledger([{sold:60},{sold:15},{brandId:2,sold:100},{sold:0},{brandId:2,sold:0}]);
 const factors=retailReputationFactors(s);assert.equal(factors.get(100),1);assert.equal(factors.get(102),1);assert.equal(factors.get(101),brandReputation({...s,releases:[s.releases[0]]},1).multiplier);assert.equal(factors.get(103),brandReputation({...s,releases:s.releases.slice(0,2)},1).multiplier);assert.equal(factors.get(104),brandReputation({...s,releases:[s.releases[2]]},2).multiplier);
 s.releases[3].sold=100;s.releases[4].sold=100;const after=retailReputationFactors(s);assert.deepEqual(after,factors,'current release and future sales do not change their own or earlier factors');
 const more=ledger([{sold:0},{sold:0}]),initial=retailReputationFactors(more);more.releases[0].sold=30;const grown=retailReputationFactors(more);assert.equal(grown.get(100),initial.get(100));assert(grown.get(101)>initial.get(101),'previous release can keep building recognition for a later release');
});

test('latest brand follows release chronology, including same-month repeat releases of an older identity',()=>{
 assert.equal(latestReleaseBrand({brands:[],releases:[]}),null);
 const s=ledger([{brandId:1,bottledMonth:3},{brandId:2,bottledMonth:4},{brandId:1,bottledMonth:4}]);assert.equal(latestReleaseBrand(s).id,1);
 const shuffled={...s,releases:[s.releases[1],{...s.releases[0],bottledMonth:2}]};assert.equal(latestReleaseBrand(shuffled).id,2,'timestamps take precedence over source-array order across months');
});

test('legal repeated sales preserve source totals and reputation after product pruning and reload',()=>{
 for(const seed of [1,7,42]){
  let s=D.newReputationDistillery(seed);s=release(s,{selection:{name:'川霧',bottle:'slender',label:'dark'},tier:'high'});s=advance(s,2);const old=structuredClone(s.brands[0]);const first=structuredClone(s.releases[0]);
  assert(first.sold>0&&first.sold<first.bottles);s=release(s,{selection:{brandId:1},age:0,tier:'high'});s=advance(s,1);s=release(s,{selection:{name:'夕凪'},age:0,tier:'high'});
  assert.equal(s.releases.length,3);assert.equal(s.brands.length,2);assert(s.releases.filter(r=>r.brandId===1&&r.status==='selling').length>=2);s=advance(s,60);
  const stats=brandStats(s,1),rs=s.releases.filter(r=>r.brandId===1);assert.equal(stats.releases,2);assert.equal(stats.sold,rs.reduce((n,r)=>n+r.sold,0));assert.equal(stats.revenue,round(rs.reduce((n,r)=>n+r.revenue,0)));assert.equal(stats.soldOut,2);assert.deepEqual(s.brands[0],old);assert(brandReputation(s,1).bonus>0);
  const reputation=brandReputation(s,1);s=exact(s);assert.deepEqual(brandReputation(s,1),reputation);identity(s);
  // A later bottling prunes old product mirrors, while releases remain durable.
  s=advance(s,18);s=release(s,{selection:{brandId:1},age:0});assert(!s.core.products.some(p=>p.id===first.productId));assert.equal(s.releases[0].status,'sold-out');assert.equal(brandStats(s,1).releases,3);assert.equal(brandStats(s,1).sold,stats.sold);assert.deepEqual(exact(s),s);identity(s);
 }
});

test('bottling and listing alone do not build reputation; new identities start with the same base factor',()=>{
 let s=D.newReputationDistillery(42);for(let i=0;i<3;i++){if(i)s=advance(s,1);s=fill(s);s=D.bottleBranded(s,s.core.casks.at(-1).id,i?{brandId:1}:{});}for(const r of s.releases)s=D.listBottles(s,r.productId);
 assert.equal(brandStats(s,1).releases,3);assert.equal(brandStats(s,1).sold,0);assert.equal(brandReputation(s,1).bonus,0);assert([...retailReputationFactors(s).values()].every(n=>n===1));assert.deepEqual(exact(s),s);
});

test('regular wholesale and special-order execution stay equivalent and never create retail reputation',()=>{
 for(const name of ['partners-accepted.json','partners-due.json']){
  let old=D.enableBrands(loadFixture(name)),fresh=D.enableReputation(old);const before=old.core.totals.revenue;assert.deepEqual(plain(fresh),plain(old));
  for(let i=0;i<20;i++){old=advance(old,1);fresh=advance(fresh,1);assert.deepEqual(plain(fresh),plain(old));assert.deepEqual(fresh.brands,[]);assert.deepEqual(fresh.releases,[]);assert.equal(brandStats(fresh,1).sold,0);}
  assert(old.core.totals.revenue>before);assert(fresh.records.some(r=>r.channel==='wholesale'));if(name==='partners-due.json')assert(fresh.records.some(r=>r.order?.outcome==='fulfilled'));assert.deepEqual(exact(fresh),fresh);identity(fresh);
 }
});

test('strict saves reject edited release sales, brand identity, and reputation operation history',()=>{
 const s=D.enableReputation(D.restoreDistillery(fs.readFileSync(fixtureURL,'utf8')));
 for(const edit of [x=>x.releases[0].sold++,x=>x.releases[0].revenue++,x=>x.brands[0].label='cream',x=>x.operations.splice(-1,1)]){const bad=structuredClone(s);edit(bad);assert.throws(()=>D.restoreDistillery(JSON.stringify(bad)));}
 assert.deepEqual(exact(s),s);
});


test('real next-release demand is a modest improvement while price remains consequential',()=>{
 let s=D.newReputationDistillery(42);
 for(let i=0;i<8;i++){s=release(s,{selection:i?{brandId:1}:{},age:6,tier:'low'});s=advance(s,12);}
 const rep=brandReputation(s,1);assert(rep.bonus>0.05&&rep.bonus<0.1);s=fill(s);s=advance(s,6);const id=s.core.casks.at(-1).id;
 function branch(selection,tier){let j=D.bottleBranded(s,id,selection);j=D.setSalePrice(j,tier,j.result.productId);j=D.listBottles(j,j.result.productId);return j;}
 const known=branch({brandId:1},'standard'),unknown=branch({name:'新しい銘柄'},'standard'),expensive=branch({brandId:1},'high');assert.deepEqual(known.core,unknown.core);
 const a=advance(known,1),b=advance(unknown,1),c=advance(expensive,1),pid=known.result.productId;
 const sold=x=>x.core.products.find(p=>p.id===pid).sold;assert(sold(a)>sold(b),'actual monthly transaction applies the previous-release factor');assert(sold(a)-sold(b)<=2);assert(sold(c)<sold(b),'reputation does not outweigh the existing high-price penalty');assert(c.core.products.find(p=>p.id===pid).stock>0);assert.equal(c.releases.at(-1).price,expensive.releases.at(-1).price,'reputation never auto-reprices');
 assert.equal(retailReputationFactors(a).get(pid),retailReputationFactors(known).get(pid),'current sales cannot amplify their own demand');assert.deepEqual(exact(a),a);assert.deepEqual(exact(c),c);identity(a);identity(c);
});

test('shared monthly customer allowance is conserved when reputation changes preference between brands',()=>{
 // Controlled transaction boundary with equal products isolates allocation
 // from chemistry. This state is intentionally not used as a saved fixture.
 let s=release(D.newReputationDistillery(42),{tier:'standard'});const template=structuredClone(s.core.products[0]);
 s.core.products=[100,101].map(id=>({...structuredClone(template),id,age:60,character:0.9,roughness:0.1,wood:0.3,stock:57,originalStock:57,sold:0,revenue:0,lastSold:0,lastRevenue:0,price:16,bottledMonth:60,batchMonth:0}));s.core.month=60;s.core.nextId=102;s.core.lastMonth=null;s.productsById={100:{listed:true,selectedPrice:'standard'},101:{listed:true,selectedPrice:'standard'}};
 const base=E.economicMonthly(s,s.core.month),favored=E.economicMonthly(s,s.core.month,new Map([[100,1+REPUTATION.maxBonus],[101,1]]));
 assert.equal(base.core.lastMonth.bottles,ECONOMY.monthlyCustomers);assert.equal(favored.core.lastMonth.bottles,ECONOMY.monthlyCustomers);assert(favored.core.products[0].lastSold>base.core.products[0].lastSold);assert(favored.core.products[1].lastSold<base.core.products[1].lastSold);assert(favored.core.products[1].lastSold>0,'new brands remain viable beside recognized brands');
 assert.equal(favored.core.lastMonth.bottles,favored.core.lastMonth.sales.reduce((n,r)=>n+r.sold,0));assert.equal(favored.core.lastMonth.revenue,round(favored.core.lastMonth.sales.reduce((n,r)=>n+r.revenue,0)));
 const costly=structuredClone(s);for(const p of costly.core.products)p.price=160;const high=E.economicMonthly(costly,costly.core.month,new Map([[100,1+REPUTATION.maxBonus],[101,1]]));assert(high.core.lastMonth.bottles<favored.core.lastMonth.bottles/4,'capped reputation does not rescue arbitrary overpricing');assert(high.core.products.every(p=>p.stock>0));
});
