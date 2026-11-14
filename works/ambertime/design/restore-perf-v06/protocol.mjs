// Portable successor to preserved v05 protocol. Frozen original oracles are read,
// never regenerated. No product instrumentation or persistent cache is added.
import {register} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
const [mode,repoArg,fixtureArg,outArg,name]=process.argv.slice(2);
assert(['save','cold1','cold2','baseline','profile'].includes(mode),'mode save|cold1|cold2|baseline|profile');
assert(repoArg&&fixtureArg&&outArg&&name,'arguments: MODE REPO FIXTURES OUTPUT STRATEGY');
const repo=path.resolve(repoArg),fixtures=path.resolve(fixtureArg),out=path.resolve(outArg),prefix=path.join(out,name);
fs.mkdirSync(out,{recursive:true});
const sha=s=>createHash('sha256').update(s).digest('hex'),json=JSON.stringify;
let phases={},copies={},operations=0;
const copyDetail=mode==='profile';
globalThis.__amberMeasure=(key,fn)=>{const t=performance.now();try{return fn();}finally{const p=phases[key]??={calls:0,ms:0};p.calls++;p.ms+=performance.now()-t;}};
globalThis.__amberOperation=n=>{operations+=n;};
globalThis.__amberCopy=(key,value,fn)=>{
 const c=copies[key]??={calls:0,ms:0,logicalJSONCodeUnits:0,unserializable:0};c.calls++;
 // Detailed volume adds a complete JSON traversal, so it is a separate profiling
 // run and must not be used for uninstrumented speed comparisons or heap claims.
 if(copyDetail){try{c.logicalJSONCodeUnits+=(json(value)?.length??0);}catch{c.unserializable++;}}
 const t=performance.now();try{return fn();}finally{c.ms+=performance.now()-t;}
};
const nativeClone=globalThis.structuredClone;
globalThis.structuredClone=(value,...args)=>globalThis.__amberCopy('nativeStructuredClone',value,()=>nativeClone(value,...args));
register(new URL('./phase-loader.mjs',import.meta.url),import.meta.url);
const u=n=>pathToFileURL(path.join(repo,'works/ambertime',n)).href;
const m={D:await import(u('partner-orders.mjs')),S:await import(u('development-save.mjs')),P:(await import(u('economy-parameters.mjs'))).PARALLEL_PARAMETERS,C:await import(u('cask-slots.mjs')),L:await import(u('recent-ledger.mjs')),H:await import(u('history-record.mjs')),R:await import(u('recall/collector.mjs')),O:await import(u('recall/operations.mjs'))};
const options={enabled:true,serialize:m.D.serializeDistillery,restore:m.D.restoreDistillery,monthMs:m.P.monthMs,stepMs:m.P.distillStepMs,encoding:'lossless-v1'};
const measured=(key,fn)=>globalThis.__amberMeasure(key,fn);
const memory=()=>({current:process.memoryUsage(),peakRSSKiB:process.resourceUsage().maxRSS});
function snapshot(){return {phases:nativeClone(phases),copies:nativeClone(copies),operations,memory:memory()};}
function reset(){phases={};copies={};operations=0;}
function equal(actual,expected){assert.equal(json(actual),json(expected),'whole game and every session/sidecar key must match');}
function advance(s){let recall=s.recallRecord;const D=m.O.createObservedModel(m.D,({before,after})=>{recall=m.R.advanceRecall(before,after,recall);});let g=s.game,guard=0;
 while(g.decisions.length){assert(++guard<100);const d=g.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');assert(o);g=D.chooseDistillery(g,d.caskId,o.id);}
 if(g.trade.offer)g=D.declineOffer(g);while(g.shop.offer){assert(++guard<100);const o=g.shop.offer;g=(o.shopId==='department'?D.declineShop:D.acceptShop)(g,o.shopId,o.id);}
 for(const o of D.regionalOffers(g))g=D.acceptRegionalOffer(g,o.partnerId,o.id);if(g.generations.active.phase==='review')g=D.handoverGeneration(g,g.generations.active.id);
 g=D.tickDistillery(g);assert.equal(g.core.month,s.game.core.month+1);
 return {game:g,userPaused:s.userPaused,elapsed:s.elapsed,caskSlots:m.C.reconcileCaskSlots(g,s.caskSlots),recentLedger:m.L.advanceRecentLedger(s.game,g,s.recentLedger),historyRecord:m.H.advanceHistoryRecord(s.game,g,s.historyRecord),recallRecord:recall};
}
function git(...args){return execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();}
const result={schema:'ambertime-perf-v06/1',mode,name,command:[process.execPath,...process.argv.slice(1)],node:process.version,platform:process.platform,arch:process.arch,repo,commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),worktreeStatus:git('status','--porcelain'),instrumentation:'nested synchronous phase and copy timings; logical JSON code units only in separate profile mode; not allocated bytes',copyDetail,fixtureManifestSHA256:sha(fs.readFileSync(path.join(fixtures,'SHA256SUMS.json'))),scriptSHA256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),loaderSHA256:sha(fs.readFileSync(new URL('./phase-loader.mjs',import.meta.url))),environment:'Node process; no native IndexedDB/browser/iPhone'};
if(mode==='save'){
 const expectedText=fs.readFileSync(path.join(fixtures,'expected',name+'-1200.json'),'utf8'),expected=JSON.parse(expectedText);
 reset();const t=performance.now(),wire=measured('formalSerialize',()=>m.S.serializeSession(expected.game,expected,options));result.serializeMs=performance.now()-t;result.serialization=snapshot();
 assert.equal(json(expected),expectedText,'serialization must not mutate original');
 const originalWire=fs.readFileSync(path.join(fixtures,'protocol',name+'.formal9.json'),'utf8');assert.equal(wire,originalWire,'canonical initial wire differs from original');
 fs.writeFileSync(prefix+'.formal9.json',wire,{flag:'wx'});
 Object.assign(result,{wireSHA256:sha(wire),wireUnits:wire.length,wireUtf8:Buffer.byteLength(wire),expectedSHA256:sha(expectedText),career:'frozen original a210 1200-month trajectory, not rerun',canonicalOriginalWire:true,inputUnchanged:true});
}else{
 const original=mode==='baseline'||mode==='profile';
 const input=original?path.join(fixtures,'protocol',name+'.formal9.json'):prefix+(mode==='cold2'?'.next.formal9.json':'.formal9.json');
 reset();const raw=measured('fileRead',()=>fs.readFileSync(input,'utf8'));result.beforeRestoreMemory=memory();
 const t=performance.now(),s=measured('wholeOfficialRead',()=>m.S.readSession(raw,options));result.coldMs=performance.now()-t;
 result.restoreBeforeOracle=snapshot(); // Oracle file has not yet been opened in this process.
 result.month=s.game.core.month;result.wireSHA256=sha(raw);result.wireUnits=raw.length;
 const expectedFile=path.join(fixtures,mode==='cold2'?'protocol':'expected',name+(mode==='cold2'?'.next.expected.json':'-1200.json'));
 const expectedText=fs.readFileSync(expectedFile,'utf8');equal(s,JSON.parse(expectedText));result.expectedSHA256=sha(expectedText);result.fullSessionEquality=true;
 reset();
 if(mode==='cold1'){
  const next=measured('nextMonth',()=>advance(s));
  const nextText=fs.readFileSync(path.join(fixtures,'protocol',name+'.next.expected.json'),'utf8');equal(next,JSON.parse(nextText));result.nextExpectedSHA256=sha(nextText);result.nextMonthFullSessionEquality=true;
  const wire=measured('firstSaveAfterRestore',()=>m.S.serializeSession(next.game,next,options));
  assert.equal(wire,fs.readFileSync(path.join(fixtures,'protocol',name+'.next.formal9.json'),'utf8'),'canonical next wire differs');
  fs.writeFileSync(prefix+'.next.formal9.json',wire,{flag:'wx'});result.canonicalNextWire=true;
 }else{
  assert.equal(measured('canonicalResave',()=>m.S.serializeSession(s.game,s,options)),raw);result.canonicalResaveEquality=true;
 }
 result.afterOracleAndContinuation=snapshot();
}
result.completed=true;
fs.writeFileSync(prefix+'.'+mode+'.result.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
