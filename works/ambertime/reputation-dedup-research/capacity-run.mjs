// H1-B1 offline copies only. Never changes an input or product save.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {encode,decode} from './adapter.mjs';
const [saves,output]=process.argv.slice(2);assert(saves&&output,'capacity-run.mjs <saves> <scratch-output>');mkdirSync(output,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex'),size=x=>({utf8Bytes:Buffer.byteLength(x),codeUnits:x.length});
const sources=['capacity-run.mjs','adapter.mjs'],fingerprint=()=>hash(sources.map(f=>readFileSync(new URL(f,import.meta.url),'utf8')).join('\n')),startFingerprint=fingerprint();
const h24=readFileSync(new URL('../chronicle-lab/H24.md',import.meta.url),'utf8'),expected=[...h24.matchAll(/\| (地元密着|広域展開|混合) \| (30|60|90|100) \| (\d+) \|.*?`([a-f0-9]{64})`/g)],labels={local:'地元密着',wide:'広域展開',mixed:'混合'};assert.equal(expected.length,12);
const rows=[];
for(const id of Object.keys(labels))for(const month of [360,720,1080,1200]){
 const file=resolve(saves,`${id}-${month}.json`),raw=readFileSync(file,'utf8'),sourceHash=hash(raw),e=expected.find(r=>r[1]===labels[id]&&+r[2]*12===month);assert.equal(sourceHash,e[4]);assert.equal(Buffer.byteLength(raw),+e[3]);
 const game=JSON.parse(raw),town=game.labConnection.town,baseline=size(raw),parts=Object.fromEntries(['events','arrivals','attempts'].map(k=>[k,{...size(JSON.stringify(town[k])),count:town[k].length,utf8Share:Buffer.byteLength(JSON.stringify(town[k]))/baseline.utf8Bytes}])),variants=[];
 for(const variant of ['A','B','C']){
  globalThis.gc?.();const before=process.memoryUsage(),t=performance.now(),wire=encode(raw,variant),encodeMs=performance.now()-t,encodedMemory=process.memoryUsage(),d=performance.now(),restored=decode(wire),decodeMs=performance.now()-d,decodedMemory=process.memoryUsage();assert.equal(restored,raw,'Formal JSON round trip must be byte identical');assert.equal(hash(readFileSync(file)),sourceHash);
  const measured=size(wire),wireObject=JSON.parse(wire),metadataBytes=variant==='A'?0:Buffer.byteLength(JSON.stringify(Object.fromEntries(Object.entries(wireObject).filter(([k])=>k!=='game')))),arrivalIndexBytes=variant==='B'?Buffer.byteLength(JSON.stringify(wireObject.game.labConnection.town.arrivals)):0;
  const session=JSON.stringify({version:2,game:wireObject,userPaused:false,elapsed:0}),out=resolve(output,`${id}-${month}-${variant}.json`);writeFileSync(out,wire);
  variants.push({variant,...measured,wireHash:hash(wire),sessionHash:hash(session),sessionSize:size(session),savedUtf8Bytes:baseline.utf8Bytes-measured.utf8Bytes,savedCodeUnits:baseline.codeUnits-measured.codeUnits,savedRatio:1-measured.utf8Bytes/baseline.utf8Bytes,arrivalsIndexBytes:arrivalIndexBytes,researchMetadataBytes:metadataBytes,encodeMs,decodeMs,before,encodedMemory,decodedMemory,observedProcessMaxRssBytes:process.resourceUsage().maxRSS*1024,roundTripExact:true});
 }
 rows.push({id,month,sourceHash,baseline,parts,variants});
}
assert.equal(fingerprint(),startFingerprint);const result={schema:'ambertime-h1-b1-capacity/1',baseSha:'fcc14b249733b6cccd598bcd2e567e64848bcd7f',node:process.version,platform:process.platform,codeFingerprint:startFingerprint,rows,limits:['Wire storage reduction only; official runtime state is fully reconstructed and memory is not reduced.','Before/after memory samples and process maxRSS include prior conditions/runtime; not isolated synchronous peak.','Research envelope and metadata included; no compatibility with existing official reader is claimed.']};writeFileSync(resolve(output,'capacity-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({conditions:rows.length,output}));
