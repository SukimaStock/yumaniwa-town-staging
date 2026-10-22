import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../model.mjs';
import {profile as characterProfile} from '../character.mjs';
import * as F from '../lab-flavor.mjs';
import * as Lab from '../../ambertime-flavor-lab-v02/model.mjs';
const choice=(changes={})=>({malt:'plain',ferment:'long',start:.12,end:.40,cask:'refill',...changes});
function filled(recipe=choice(),type='refill'){
 let s=M.distill(M.newGame(42),.4);s.spirit=F.setFlavorCask(F.attachFlavor(s.spirit,recipe),type);return M.fillCask(s,type);
}
const quantized=p=>Object.fromEntries(F.FLAVOR_KEYS.map(k=>[k,Math.round(p[k]*1e12)/1e12]));

test('new recipe uses adopted eight features while projected axes remain bounded',()=>{
 const raw={id:7,litres:30,age:0,cut:.4},before=JSON.stringify(raw);
 const recipes=[choice(),choice({ferment:'short',start:.30,end:.65}),choice({malt:'peat',start:.10,end:.90}),choice({ferment:'short',start:.63,end:.89})];
 assert.deepEqual(recipes.map(c=>F.attachFlavor(raw,c).flavor.primary),['fruit','grain','smoke','body']);
 for(const c of recipes){const s=F.attachFlavor(raw,c);assert.deepEqual(s.flavor.spirit,quantized(Lab.distill(c)));assert.deepEqual(s.flavor.profile,s.flavor.spirit);assert.equal(s.flavor.label,Lab.expression(s.flavor.profile,s.flavor.spirit));assert.equal(s.litres,30);assert.equal(s.id,7);assert.deepEqual(F.flavorSummary(s).map(x=>x.key),['character','roughness','wood']);assert.equal(F.flavorName(s),s.flavor.label);assert(F.flavorSummary(s).every(x=>x.value>=0&&x.value<=1));}
 assert.equal(JSON.stringify(raw),before);assert.throws(()=>F.attachFlavor(raw,choice({end:.13})));assert.throws(()=>F.attachFlavor(raw,choice({malt:'unknown'})));assert.equal(F.flavorProfile(raw),null);
});

test('monthly name hold and history match the adopted Lab while volume keeps main rules',()=>{
 const s=filled(),original=structuredClone(s.core??s),start=s.casks[0];let c=start,legacy=structuredClone(start);delete legacy.flavor;
 let lab={months:0,barrels:[{id:c.id,choice:structuredClone(c.flavor.choice),spirit:structuredClone(c.flavor.spirit),months:0,label:c.flavor.label,history:structuredClone(c.flavor.history),pending:null,held:0}]};
 for(let month=1;month<=120;month++){
  const before=c;c=M.ageCask(c);legacy=M.ageCask(legacy);lab=Lab.advance(lab,1);
  assert.equal(c.age,month);assert.equal(c.flavor.months,month);assert.equal(c.flavor.label,lab.barrels[0].label);assert.deepEqual(c.flavor.history,lab.barrels[0].history);assert.equal(c.flavor.pending,lab.barrels[0].pending);assert.equal(c.flavor.held,lab.barrels[0].held);assert.deepEqual(c.flavor.profile,quantized(Lab.profileFor(lab.barrels[0])));assert.equal(c.litres,legacy.litres);
  if(c.flavor.label!==before.flavor.label){assert.equal(before.flavor.held,2);assert.equal(c.flavor.held,0);}
 }
 assert.deepEqual(s,original);assert.equal(c.flavor.history.length,2);assert.equal(c.flavor.primary,'fruit');
});

test('cask selection changes wood and bottled snapshots do not follow the source',()=>{
 let s=filled();const source=s.casks[0],first=F.setFlavorCask(source,'bourbon');let refill=source,bourbon=first;
 for(let m=0;m<36;m++){refill=M.ageCask(refill);bourbon=M.ageCask(bourbon);}
 assert(bourbon.flavor.profile.wood>refill.flavor.profile.wood);assert.equal(refill.flavor.choice.cask,'refill');assert.equal(bourbon.flavor.choice.cask,'first');assert.throws(()=>F.setFlavorCask(refill,'bourbon'));
 for(let month=0;month<36;month++)s=M.advanceMonth(s);
 const bottled=M.bottle(s,source.id,3),p=bottled.products.at(-1),snapshot=JSON.stringify(p.flavor),profile=characterProfile(s.casks[0]);
 assert(Object.isFrozen(p.flavor));assert(Object.isFrozen(p.flavor.profile));assert.equal(p.flavor.months,36);assert.equal(p.flavor.label,s.casks[0].flavor.label);assert.notEqual(p.flavor,s.casks[0].flavor);assert.deepEqual(p.flavor.profile,refill.flavor.profile);assert.deepEqual(profile.flavor.profile,p.flavor.profile);
 profile.flavor.profile.fruit=0;assert.notEqual(profile.flavor.profile.fruit,s.casks[0].flavor.profile.fruit);
 let next=bottled;for(let month=0;month<12;month++)next=M.advanceMonth(next);assert.equal(JSON.stringify(next.products.find(x=>x.id===p.id).flavor),snapshot);assert.notEqual(next.casks[0].flavor.months,p.flavor.months);assert.equal(JSON.stringify(p.flavor),snapshot);assert.deepEqual(M.restore(M.serialize(next)),next);
});

test('unmarked legacy spirit, cask and sample keep original shapes and chemistry',()=>{
 let s=M.fillCask(M.distill(M.newGame(42),.4),'bourbon'),c=s.casks[0],before=JSON.stringify(s),next=M.ageCask(c);
 assert.equal(F.ageFlavor(c),c);assert.equal(F.setFlavorCask(c,'bourbon'),c);assert.equal(F.freezeFlavor(c),null);assert.equal(F.flavorSummary(c),null);assert.equal(next.flavor,undefined);assert.equal(next.age,c.age+1);assert(next.roughness<c.roughness);assert(next.wood>c.wood);assert.deepEqual(Object.keys(characterProfile(c)),['roughness','character','wood','litres']);assert.equal(JSON.stringify(s),before);
 const b=M.bottle(s,c.id,3);assert.equal(b.products[0].flavor,undefined);assert.deepEqual(M.restore(M.serialize(b)),b);
});

test('primary-family comparison uses the same value for current and previous sample',async()=>{
 const {flavorMeter}=await import('../flavor-view.mjs');
 const c=F.attachFlavor({id:1,litres:30},{malt:'peat',ferment:'long',start:.12,end:.4,cask:'refill'});
 assert.match(flavorMeter(c,'character',{previousProfile:c}),/前回と同じ/);
});
