import test from 'node:test';
import assert from 'node:assert/strict';
import {glassColor,GLASS_PALETTE} from '../flavor-color.mjs';
import {attachFlavor} from '../lab-flavor.mjs';
import {colorForProfile} from '../cut-bar.mjs';
test('color is deterministic, read-only and uses the adopted identity for every legal cut',()=>{
 let count=0,mixed=0;
 for(const malt of ['plain','peat'])for(const ferment of ['short','long'])for(let start=0;start<=87;start++)for(let end=start+12;end<=99;end++){
  const source=attachFlavor({id:1},{malt,ferment,cask:'refill',start:start/99,end:end/99}),p=source.flavor.profile,before=JSON.stringify(source);
  const result=glassColor(p);assert.equal(result.dominant,source.flavor.primary);assert.deepEqual(result,glassColor(p));assert.equal(glassColor(p,{variant:'continuous'}).color,colorForProfile(p));assert.equal(JSON.stringify(source),before);
  assert.equal(result.family==='mixed',result.margin<.05);assert.match(result.highlight,/^#[0-9a-f]{6}$/);assert.ok(GLASS_PALETTE[result.family]);mixed+=result.family==='mixed';count++;
 }
 assert.equal(count,15664);assert.ok(mixed>0&&mixed<count/4);
});
test('classification follows profile rather than cut position and validates unavailable data',()=>{
 for(const k of ['fruit','grain','smoke','body']){const p={fruit:.1,grain:.1,smoke:.1,body:.1,[k]:.9};assert.equal(glassColor(p).family,k);}
 assert.equal(glassColor({fruit:0,grain:0,smoke:0,body:0}).family,'mixed');
 assert.throws(()=>glassColor(null));assert.throws(()=>glassColor({fruit:NaN}));assert.throws(()=>glassColor({fruit:1,grain:0,smoke:0,body:0},{variant:'price'}));
});
