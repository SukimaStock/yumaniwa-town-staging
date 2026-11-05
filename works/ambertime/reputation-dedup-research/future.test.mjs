import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fingerprint} from './future-run.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('future evidence binds actual delivery, arrival/inquiry, generation and twelve long branches to the measured codec',()=>{
 const evidence=JSON.parse(readFileSync(new URL('./future-results.json',import.meta.url)));
 assert.equal(evidence.codeFingerprint,fingerprint());assert.equal(evidence.long.length,12);assert.equal(evidence.short.cases.length,5);
 const fixture=JSON.parse(readFileSync(new URL('../tests/fixtures/placement-established-six.json',import.meta.url))).raw;assert.equal(evidence.short.fixtureSha256,sha(fixture));
 const delivery=evidence.short.cases.find(c=>c.name==='formal-stockist-delivery');assert(delivery.allVariantsExact);assert.equal(delivery.steps[0].label,'deliver-one');assert.equal(delivery.steps[0].operationsAdded,1);assert.equal(delivery.steps.length,7);assert(delivery.steps.some(s=>s.newArrivals>0));
 const generation=evidence.short.cases.find(c=>c.name==='formal-generation-seed42');assert(generation.allVariantsExact);assert.equal(generation.final.generation,2);assert(generation.steps.some(s=>s.label==='handover-generation'));assert.equal(generation.scope,'full formal game');
 for(const seed of [42,314159,20261105]){const town=evidence.short.cases.find(c=>c.name==='town-seed-'+seed);assert(town.allVariantsExact);assert(town.final.counts.arrival>0);assert(town.final.counts.inquiry>0);assert(town.steps.some(s=>s.newInquiries>0));assert(town.scope.startsWith('town component only'));}
 const expected=[...readFileSync(new URL('../chronicle-lab/H24.md',import.meta.url),'utf8').matchAll(/\| (地元密着|広域展開|混合) \| (30|60|90|100) \| (\d+) \|.*?`([a-f0-9]{64})`/g)];
 for(const r of evidence.long){const [id,monthText]=r.name.split('-'),month=Number(monthText),label={local:'地元密着',wide:'広域展開',mixed:'混合'}[id];assert.equal(r.inputSha256,expected.find(x=>x[1]===label&&+x[2]*12===month)[4]);assert.equal(r.final.month,month+1);assert(r.allVariantsExact);assert.equal(r.steps.length,1);assert.equal(r.introductions.length,6);}
});
test('supplementary production career actually distills, fills, bottles, ages and sells through unchanged APIs',async()=>{
 const {productionFingerprint,runProduction}=await import('./future-production.mjs'),saved=JSON.parse(readFileSync(new URL('./future-production-results.json',import.meta.url)));assert.equal(saved.codeFingerprint,productionFingerprint());const current=runProduction();assert.deepEqual(current,saved);assert.equal(saved.seed,314159);assert(saved.formalEndValidation&&saved.allVariantsExact);assert(saved.final.bottlesSold>0);assert(saved.steps.some(s=>s.label==='bottle-five'));assert(saved.steps.some(s=>s.label==='monthly-sales-2'));assert.equal(saved.steps.length,45);
});
