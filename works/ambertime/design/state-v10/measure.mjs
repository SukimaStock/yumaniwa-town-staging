import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';import * as D from '../../partner-orders.mjs';import {partitionClone} from './partition.mjs';
const [fixtures,out,name,mode]=process.argv.slice(2);assert(fixtures&&out&&name&&mode);
const digest=x=>createHash('sha256').update(x).digest('hex');const manifest=JSON.parse(fs.readFileSync(path.join(fixtures,'SHA256SUMS.json')));const rel=`expected/${name}-1200.json`,raw=fs.readFileSync(path.join(fixtures,rel),'utf8');assert.equal(digest(raw),manifest[rel]);
const session=JSON.parse(raw),s=session.game,original=JSON.stringify(s);const result={name,mode,node:process.version,fixtureSHA256:digest(raw),scope:'Node offline transition on immutable century state; NOT cold restore, native storage, browser or integration',samples:[],sizes:{},completed:false};
function bytes(x){return Buffer.byteLength(JSON.stringify(x)??'null')};result.rootBytes=bytes(s);for(const [k,v] of Object.entries(s)){result.sizes[k]=bytes(v);if(k==='town'||k==='labConnection')result[k+'Fields']=Object.fromEntries(Object.entries(v).map(([a,b])=>[a,bytes(b)]));}result.sidecarBytes=Object.fromEntries(Object.entries(session).filter(([k])=>k!=='game').map(([k,v])=>[k,bytes(v)]));
// An adversarial graph proves cross-field alias preserved, not just JSON equality.
const shared={x:[1]},graph={a:shared,b:shared,c:{nested:shared}};const q=partitionClone(graph);assert(q.a===q.b&&q.c.nested===q.a&&q.a!==shared);q.a.x[0]=2;assert.equal(shared.x[0],1);shared.x.push(3);assert.deepEqual(q.a.x,[2]);
const p=partitionClone(s);assert.equal(JSON.stringify(p),original);const natives=structuredClone(s);
function aliasSignature(v){const seen=new Map(),aliases=[];function visit(x,p){if(!x||typeof x!=='object')return;if(seen.has(x)){aliases.push([p,seen.get(x)]);return;}seen.set(x,p);for(const k of Object.keys(x))visit(x[k],p+'.'+k);}visit(v,'$');return aliases;}
assert.deepEqual(aliasSignature(p),aliasSignature(natives));
// Full graph disjointness, stronger than checking a few selected fields.
function nodes(x,set=new Set()){if(!x||typeof x!=='object'||set.has(x))return set;set.add(x);for(const v of Object.values(x))nodes(v,set);return set;}
const oldNodes=nodes(s);for(const v of nodes(p))assert(!oldNodes.has(v));result.graphIsolation=true;
for(let i=0;i<5;i++){const start=performance.now();const next=D.tickDistillery(s);const ms=performance.now()-start;assert.equal(JSON.stringify(s),original);result.samples.push(ms);if(i===0){result.outputSHA256=digest(JSON.stringify(next));result.monthBefore=s.core.month;result.monthAfter=next.core.month;fs.writeFileSync(out+'.state.json',JSON.stringify(next));}}
const low=structuredClone(s);low.core.cash=-100000;const lowBefore=JSON.stringify(low);try{const v=D.tickDistillery(low);result.lowFundsOutputSHA256=digest(JSON.stringify(v));}catch(e){result.lowFundsException=e.message;}assert.equal(JSON.stringify(low),lowBefore);
assert.throws(()=>D.tickDistillery(s,-1));assert.equal(JSON.stringify(s),original);result.invalidMonthNoMutation=true;
result.peakRSSKiB=process.resourceUsage().maxRSS;result.heap=process.memoryUsage();result.completed=true;fs.writeFileSync(out+'.json',JSON.stringify(result,null,2));console.log(name,mode,result.samples);
