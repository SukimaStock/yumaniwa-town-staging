import assert from "node:assert/strict";
import {fresh,addBarrel,tick,bottle,exclude,inspect,validate,updateDraft,createProfile} from "./model.mjs";

const recipes=[
 {malt:"plain",fermentation:"short",cask:"refill",stop:30},
 {malt:"plain",fermentation:"long",cask:"bourbon",stop:55},
 {malt:"peat",fermentation:"short",cask:"refill",stop:70},
 {malt:"peat",fermentation:"long",cask:"bourbon",stop:80}
];
let s=fresh();assert.equal(validate(s),true);
for(const recipe of recipes)s=addBarrel(s,recipe);
assert.equal(s.barrels.length,4);
assert.throws(()=>addBarrel(s),/満杯/);
assert.equal(new Set(s.barrels.map(b=>b.id)).size,4);
const before=s.barrels.map(b=>b.word);
s=tick(s,120);
assert.ok(s.barrels.some((b,i)=>b.word!==before[i]));
assert.deepEqual(tick(s,24),tick(s,24));
for(const b of s.barrels){
 for(let i=1;i<b.history.length;i++){
  assert.notEqual(b.history[i].word,b.history[i-1].word);
  assert.ok(b.history[i].age>=b.history[i-1].age);
 }
}
const target=s.barrels[0];
const swapped=exclude(s,target.word);
assert.ok(swapped.excluded.includes(target.word));
assert.deepEqual(swapped.barrels[0].profile,target.profile);
assert.notEqual(swapped.barrels[0].word,target.word);
assert.equal(inspect(swapped.barrels[0],swapped.excluded).text,swapped.barrels[0].word);
const done=bottle(swapped,target.id),later=tick(done,12);
assert.equal(done.barrels.length,3);
assert.equal(done.bottles.length,1);
assert.equal(later.bottles[0].word,done.bottles[0].word);
assert.deepEqual(later.bottles[0].profile,done.bottles[0].profile);
assert.equal(validate(later),true);
const change=updateDraft(fresh(),{stop:35});
assert.equal(change.draft.stop,35);
assert.throws(()=>updateDraft(change,{stop:101}),/不正/);
assert.notDeepEqual(createProfile({...recipes[0],malt:"plain"}),createProfile({...recipes[0],malt:"peat"}));
const distinct=new Set();
for(const malt of ["plain","peat"])
for(const fermentation of ["short","long"])
for(const cask of ["refill","bourbon"])
for(const stop of [15,40,65,90]){
 let v=addBarrel(fresh(),{malt,fermentation,cask,stop});
 for(let y=0;y<=20;y++){distinct.add(v.barrels[0].word);v=tick(v,12);}
}
assert.ok(distinct.size>=25,"Expression diversity too small: "+distinct.size);
console.log("AmberTime word-crafting Lab: model checks passed; distinct expressions:",distinct.size);