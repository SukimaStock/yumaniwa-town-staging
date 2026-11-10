import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMemory,remember} from './memory.mjs';
import {packageArt} from '../../../ambertime/release-package.mjs';
import {releasePriceTier} from '../../../ambertime/brand-identity.mjs';
const source=()=>({core:{month:1200,products:[]},brands:[{id:1,name:'昔の酒'},{id:2,name:'別ブランド'}],releases:[1,2,3].map(id=>({id,productId:id+10,brandId:id===3?2:1,caskId:id,bottledMonth:id,age:24,sourceGeneration:1,bottles:54,sold:54,revenue:540,price:id===3?20:10,profile:{age:24,character:.7,wood:.3,roughness:.2,type:'refill'},recipe:{cut:.5},status:'sold-out'})),shop:{deliveries:[]}});
test('ordinary wine decades later retains exact art, flavor and old IDs without invented detail or stock',()=>{
 const s=source(),before=structuredClone(s),m=buildMemory(s),r=remember(JSON.parse(JSON.stringify(m)),2);
 assert.equal(r.id,2);assert.equal(r.productId,12);assert.equal(r.sourceGeneration,1);assert.equal(r.detail,null);assert.equal(r.stock,null);
 assert.equal(r.svg,packageArt(s.releases[1].profile,s.brands[0],releasePriceTier(s,12)));
 assert.equal(r.coverage.flavor,true);assert.equal(r.coverage.recipe,false);assert.equal(r.coverage.collector,false);assert.deepEqual(s,before);
 assert.equal(remember(m,999).status,'missing');
});
test('shared traits never combine releases, origins, brands or prices; important and protected detail stays',()=>{
 const s=source(),m=buildMemory(s,{pendingIds:[3]});assert.equal(Object.keys(m.traits).length,1);assert.equal(m.catalog.length,3);
 assert.deepEqual(m.reasons[1],['first-bottling']);assert(m.details[1]);assert(m.details[3]);assert.equal(m.details[2],undefined);
 assert.notEqual(m.catalog[1].caskId,m.catalog[2].caskId);assert.notEqual(m.catalog[1].brandId,m.catalog[2].brandId);assert.notEqual(m.catalog[1].price,m.catalog[2].price);
 s.releases[2].age=36;assert.equal(Object.keys(buildMemory(s).traits).length,2);
});
test('missing flavor stays unknown and later interest cannot create old recipe',()=>{const s=source();delete s.releases[1].profile;const m=buildMemory(s),r=remember(m,2);assert.equal(r.coverage.flavor,false);assert.equal(r.detail,null);assert.equal(r.coverage.transactions,false);});
