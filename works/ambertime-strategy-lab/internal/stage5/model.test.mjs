import test from 'node:test';
import assert from 'node:assert/strict';
import * as legacy from '../model.mjs';
import * as next from './model.mjs';
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
const release=(id,month=0,bottles=54,extra={})=>({id,productId:`p:${id}`,brandId:'house',caskId:'cask',generation:1,bottledMonth:month,bottles,age:12,price:20,profile:{smoke:2},appearance:{bottle:'round'},...extra});
function harness(){let a=legacy.createModel(),b=next.createModel();return {get state(){return b;},run(type,...args){const previous=next.canonical(b);freeze(b);a=legacy[type](a,...args);const old=b;b=next.applyCommand(b,{type,args});assert.equal(next.canonical(old),previous,'old snapshot immutable');assert.deepEqual(b,a,`${type} parity`);return b;}};}
const event=(seq,releaseId,month,kind,count=1,shopId='town')=>({seq,releaseId,month,kind,count,shopId,status:'completed',revenueCents:count*1200});
for(const seed of [1,42,781])for(const pattern of ['concentrated','distributed','small-continuous','large-rest','reappear'])test(`exact incremental parity seed ${seed} ${pattern}`,()=>{
 const h=harness();let rng=seed,seq=0;const random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
 for(const shop of ['town','supermarket','bar','department'])h.run('setContract',shop,'house',0);
 for(let step=0;step<36;step++){
  const month=pattern==='large-rest'?step*12:pattern==='reappear'?(step<18?step:step+240):step;
  const id=`r:${month}`;h.run('registerRelease',release(id,month,54,{age:12+month,brandId:month%2?'house':'second',generation:1+Math.floor(month/12)}));
  let left=54;
  while(left){const count=pattern==='small-continuous'?1:Math.min(left,1+Math.floor(random()*12)),shop=pattern==='concentrated'?'town':['town','supermarket','bar','department'][Math.floor(random()*4)];
   const kind=shop==='department'?'paid-procurement':random()<.3?'retail-sale':'store-sell-through';
   if(kind==='store-sell-through')h.run('assignStock',id,shop,count);
   h.run('applyTransaction',event(++seq,id,month,kind,count,shop));left-=count;
  }
  assert.deepEqual(next.readRelease(h.state,id),legacy.readRelease(h.state,id));h.run('compactRelease',id);
 }
 for(const shop of ['town','supermarket','bar','department'])for(const basis of ['sale','delivery'])assert.deepEqual(next.storeRelation(h.state,shop,'house',{basis}),legacy.storeRelation(h.state,shop,'house',{basis}));
});
test('54 one-bottle releases retain distinct legacy IDs and shared descriptors',()=>{
 const h=harness();for(let i=0;i<54;i++){h.run('registerRelease',release(`split:${i}`,0,1));h.run('applyTransaction',event(i+1,`split:${i}`,0,'retail-sale'));h.run('compactRelease',`split:${i}`);}
 assert.equal(Object.keys(h.state.identities).length,54);assert.equal(Object.keys(h.state.wines).length,1);assert.equal(h.state.completed.bottles,54);
});
test('same release multiple months, long pause, repeat delivery and unknown sales',()=>{
 const h=harness();h.run('registerRelease',release('old'));let seq=0;
 for(const month of [0,0,1,2,120,120])h.run('applyTransaction',event(++seq,'old',month,'paid-procurement'));
 const s=next.storeRecord(h.state,'town','house');assert.equal(s.delivery.months,4);assert.equal(s.delivery.streak,1);assert.equal(s.sale.bottles,0);assert.equal(s.unknownSaleReceipts,6);assert.deepEqual(s.perRelease.old.lastMonths,[2,120]);
 h.run('assignStock','old','town',1);h.run('applyTransaction',event(++seq,'old',121,'store-sell-through'));assert.equal(next.storeRecord(h.state,'town','house').sale.bottles,1);
});
test('eight active products, stock reservation and source ownership',()=>{
 const h=harness(),input=release('r0');h.run('registerRelease',input);input.profile.smoke=999;assert.equal(next.readRelease(h.state,'r0').profile.smoke,2);
 for(let i=1;i<8;i++)h.run('registerRelease',release(`r${i}`));assert.throws(()=>next.registerRelease(h.state,release('ninth')),/Eight/);
 h.run('assignStock','r0','bar',54);assert.throws(()=>next.applyTransaction(h.state,event(1,'r0',0,'retail-sale')),/reserved/);assert.throws(()=>next.assignStock(h.state,'r0','town',1),/Reservation/);
});
test('untouched rows share identity; copied payload excludes model serialization',()=>{
 let m=next.createModel();m=next.registerRelease(m,release('one'));m=next.registerRelease(m,release('two'));m=next.setContract(m,'bar','house',0);freeze(m);next.resetMetrics();const n=next.applyTransaction(m,event(1,'one',0,'retail-sale'));
 assert.equal(n.releases.two,m.releases.two);assert.equal(n.wines,m.wines);assert.equal(n.identities,m.identities);assert.equal(n.stores,m.stores);assert.notEqual(n.releases.one,m.releases.one);assert.equal(next.getMetrics().copiedPayloadBytes,0);assert.equal(next.getMetrics().shallowIndexEntriesCopied,2);assert.equal(next.getMetrics().recalculations,1);
});
test('latest retry strict, older cursor trusted source and pending do not mutate',()=>{
 const h=harness();h.run('registerRelease',release('r'));const e=event(1,'r',0,'paid-procurement');h.run('applyTransaction',e);h.run('applyTransaction',e);assert.throws(()=>next.applyTransaction(h.state,{...e,count:2}),/Changed transaction/);
 h.run('applyTransaction',event(2,'r',0,'retail-sale'));h.run('applyTransaction',e);h.run('applyTransaction',{...event(3,'r',0,'retail-sale'),status:'pending'});assert.equal(h.state.cursor.seq,2);assert.throws(()=>next.applyTransaction(h.state,event(4,'r',0,'retail-sale')),/sequence gap/);
});
test('references and frozen recall survive JSON restart without fabricated facts',()=>{
 const h=harness();h.run('registerRelease',release('ancestral',0,1));h.run('applyTransaction',event(1,'ancestral',0,'retail-sale'));h.run('setReference','ancestral','pending-inquiry','inquiry:1');assert.throws(()=>next.compactRelease(h.state,'ancestral'),/references/);h.run('setReference','ancestral','pending-inquiry','inquiry:1',false);
 h.run('freezeRecall','generation:1',{text:'Selected exact text',month:0},['ancestral']);h.run('freezeRecall','generation:1',{text:'Selected exact text',month:0},['ancestral']);assert.throws(()=>next.freezeRecall(h.state,'generation:1',{text:'changed'},['ancestral']),/immutable/);assert.throws(()=>next.compactRelease(h.state,'ancestral'),/references/);
 const restored=JSON.parse(JSON.stringify(h.state));assert.deepEqual(next.applyCommand(restored,{type:'setContract',args:['town','house',0]}),legacy.setContract(h.state,'town','house',0));assert.throws(()=>next.applyCommand(restored,{type:'__proto__',args:[]}),/Unknown/);
});
test('current casks replaced safely; unknown fields and fractional prices retain parity',()=>{
 const h=harness();h.run('registerRelease',release('r',0,54,{price:20.125,custom:{label:'kept'}}),{cask:{id:'cask',volume:100,profile:{oak:3}}});h.run('setCurrentCasks',[{id:'cask',volume:90}]);assert.equal(next.readRelease(h.state,'r').custom.label,'kept');assert.throws(()=>next.setCurrentCasks(h.state,[{id:'x'},{id:'x'}]),/Unique/);
});
test('capacity policies preserve exact candidate evaluation and unknown is not observed zero',()=>{
 const h=harness();h.run('registerRelease',release('policy',0,54));h.run('applyTransaction',event(1,'policy',0,'paid-procurement',12,'department'));
 for(const capacity of [1,4,54,100])for(const basis of ['sale','delivery']){
  const options={capacity,basis,target:12,month:120};assert.deepEqual(next.storeRelation(h.state,'department','house',options),legacy.storeRelation(h.state,'department','house',options));
 }
 const unknown=next.storeRelation(h.state,'department','house',{basis:'sale'}),absent=next.storeRelation(h.state,'bar','house',{basis:'sale'});
 assert.equal(unknown.bottles,0);assert.equal(unknown.coverage,'partial');assert.equal(absent.bottles,0);assert.equal(absent.coverage,'complete');
 assert.ok(next.storeRelation(h.state,'department','house',{basis:'delivery',capacity:1}).score>next.storeRelation(h.state,'department','house',{basis:'delivery',capacity:54}).score);
});
