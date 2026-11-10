import test from 'node:test';import assert from 'node:assert/strict';
import {scenarios} from '../../ambertime-small-memory-lab/fixture.mjs';
import {packageArt} from '../../ambertime/release-package.mjs';
import {memoryCatalog,recallWine,compareMemory,selectImportantWines,referencedReleaseIds} from './memory.mjs';
const source=scenarios[1].source;
test('A/B/C explicitly compare arbitrary forgotten wine and protected references',()=>{
 const rows=compareMemory(source,{importantIds:[1],pendingIds:[2],recallIds:[3]});
 assert.equal(rows[0].identities,source.releases.length);assert.equal(rows[1].identities,3);assert.equal(rows[2].identities,source.releases.length);
 for(const row of rows)for(const id of [2,3])assert.ok(row.memory.details[id]);
 assert.equal(recallWine(rows[1].memory,4).status,'missing');assert.equal(recallWine(rows[2].memory,4).coverage.flavor,false);
});
test('compact visual stays byte-identical without creating flavor data',()=>{
 const m=memoryCatalog(source,{importantIds:[]});for(const r of source.releases){const v=recallWine(m,r.id);assert.equal(v.svg,packageArt(r.profile,source.brands[0],'standard'));assert.equal(v.detail,null);}
 assert.deepEqual(JSON.parse(JSON.stringify(m)),m);
});
test('future explicit favorite can retain detail only before it was discarded',()=>{
 const m=memoryCatalog(source,{favoriteIds:[4]});assert.ok(recallWine(m,4).detail.profile);
 const old=memoryCatalog(source,{importantIds:[]});assert.equal(recallWine(old,4).detail,null);
});
test('brand appearance and tier remain distinct; missing flavor never invented',()=>{
 const s=structuredClone(source);s.productsById={1:{selectedPrice:'high'}};s.brands[0].label='dark';delete s.releases[1].profile;
 const m=memoryCatalog(s,{importantIds:[2]});assert.equal(recallWine(m,2).coverage.flavor,false);assert.equal(m.visuals[m.catalog[0].visualKey].tier,'high');
});

test('important selection uses actual store and region facts, not oldest-only',()=>{const reasons=selectImportantWines(source);assert.ok(reasons[1].includes('first-bottling'));assert.ok(Object.values(reasons).flat().some(x=>x.startsWith('first-store:')));assert.ok(Object.values(reasons).flat().some(x=>x.startsWith('regional-milestone:')));assert.ok(Object.values(reasons).flat().includes('first-36-month-aging'));});

test('frozen links protect background release references as well as foreground',()=>{const s=structuredClone(source);s.recallFacts.push({id:'older-background',ids:{releaseId:4}});const refs=referencedReleaseIds(s,[{scenes:[{event:{ids:{releaseId:1}},links:[{sourceId:'older-background'}]}],dependencies:[{ids:{productId:3}}]}]);assert.deepEqual(new Set(refs),new Set([1,3,4]));});
