import fs from 'node:fs';import assert from 'node:assert/strict';
const r=JSON.parse(fs.readFileSync(new URL('./results.json',import.meta.url)));assert.equal(r.complete,true);assert.equal(r.careers.length,3);assert.equal(r.static.legalPairs,3916);assert.equal(r.static.oldLitresMin,25.91);assert.equal(r.static.oldLitresMax,39.77);assert.equal(r.fixedLitres,34.35);assert.equal(r.adopted,false);
const standard=r.careers.find(c=>c.config.cutStart===0&&c.config.cutEnd===65);const{model,config,provenance,...oldRun}=standard.old;assert.deepEqual(standard.fixed,oldRun,'standard career must exactly match prior monthly and final native evidence');
for(const c of r.careers){assert.equal(c.fixed.months,c.fixed.monthly.at(-1).month);assert.equal(c.fixed.endCash,c.fixed.monthly.at(-1).cash);assert.equal(c.fixed.stock,c.fixed.monthly.at(-1).stock);}
console.log('PASS fixed quantity metadata, exact standard120month career identity, 3 result/trajectory consistency checks');
