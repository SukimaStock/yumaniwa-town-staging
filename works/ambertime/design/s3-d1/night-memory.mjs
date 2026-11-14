// Memory observations only: all codec checks retained, no official implementation changes.
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const [mode,file,out]=process.argv.slice(2),sha=s=>createHash('sha256').update(s).digest('hex'),samples=[];
globalThis.__nightMemory=name=>{const before=process.memoryUsage();global.gc?.();samples.push({name,beforeGC:before,afterGC:process.memoryUsage(),peakRssKiB:process.resourceUsage().maxRSS})};
const sample=globalThis.__nightMemory;sample('process-baseline');
let code=fs.readFileSync(new URL('./codec.mjs',import.meta.url),'utf8');assert.equal(sha(code),'f3e0748284b7e6f3e4dbed1bd7df94b37cf1e73934e33ac276800ace0ea124dd');
const replace=(a,b)=>{assert.equal(code.split(a).length,2);code=code.replace(a,b)};
replace('validateCandidate(candidate,expected); // No reconstructed history/game exists before this returns.',"validateCandidate(candidate,expected);globalThis.__nightMemory('validated-before-hydrate');");
replace("x.game.labConnection.town=town;assert(hash(x.game)","x.game.labConnection.town=town;globalThis.__nightMemory('hydrated-before-anchor-hashes');assert(hash(x.game)");
replace('return x;','globalThis.__nightMemory("checked-independent-anchors");return x;');
const C=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));sample('codec-loaded');let result;
if(mode==='encode'){let input=JSON.parse(fs.readFileSync(file));sample('input-held');let c=C.encode(input);sample('input-and-candidate-held');fs.writeFileSync(file+'.canonical',JSON.stringify(c));let a=C.anchor(input);fs.writeFileSync(file+'.anchor',JSON.stringify(a));sample('input-candidate-and-anchor-created');input=null;global.gc();sample('candidate-held-with-source-released');result={candidateSha:C.hash(c),candidateBytes:Buffer.byteLength(JSON.stringify(c))};}
else if(mode==='decode'){let c=JSON.parse(fs.readFileSync(file+'.canonical'));const a=JSON.parse(fs.readFileSync(file+'.anchor'));sample('candidate-and-anchor-held');const x=C.decode(c,a);sample('candidate-and-restored-held');result={gameSha:C.hash(x.game),inputSha:C.hash(x),candidateSha:C.hash(c)};c=null;sample('restored-held-candidate-released');}
else throw Error('mode');fs.writeFileSync(out,JSON.stringify({mode,node:process.version,samples,result,limitations:['beforeGC samples are boundary snapshots, not continuous peak sampling','maxRSS is cumulative within this fresh process','forced GC changes timings; use F timing results, not this memory pass for latency','known independent anchor from fixture; not persistent provenance authentication','official replay not repeated; official reader rejects this oversized state'],codecSha:sha(fs.readFileSync(new URL('./codec.mjs',import.meta.url)))},null,2));
