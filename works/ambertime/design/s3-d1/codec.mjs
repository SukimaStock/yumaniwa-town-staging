// Isolated S3-D1-R research codec. No formal-game imports or save integration.
import {createHash} from 'node:crypto';
export const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const assert=(ok,message)=>{if(!ok)throw new Error(message)};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const own=(x,k)=>Object.hasOwn(x,k);
function jsonDomain(x){
 if(x===null||typeof x==='string'||typeof x==='boolean')return;
 if(typeof x==='number'){assert(Number.isFinite(x)&&!Object.is(x,-0),'non-JSON number');return}
 assert(typeof x==='object','non-JSON value');
 assert(Object.getPrototypeOf(x)===(Array.isArray(x)?Array.prototype:Object.prototype),'non-JSON prototype');
 assert(Reflect.ownKeys(x).length===Object.keys(x).length+(Array.isArray(x)?1:0),'non-JSON properties');
 if(Array.isArray(x))assert(Object.keys(x).length===x.length&&Object.keys(x).every((k,i)=>k===String(i)),'sparse/extended array');
 for(const k of Object.keys(x)){const d=Object.getOwnPropertyDescriptor(x,k);assert(own(d,'value'),'accessor');jsonDomain(d.value)}
}
function keys(x,expected,label){assert(object(x),label+' object');assert(Object.keys(x).length===expected.length&&expected.every(k=>own(x,k)),label+' fields')}
function table(rows){const schemas=[],lookup=new Map();return {schemas,rows:rows.map((row,i)=>{const names=Object.keys(row),key=JSON.stringify(names);if(!lookup.has(key)){lookup.set(key,schemas.length);schemas.push(names)}return [i,lookup.get(key),...names.map(k=>row[k])]})}}
function inspectTable(t,label){
 keys(t,['schemas','rows'],label);assert(Array.isArray(t.schemas)&&Array.isArray(t.rows),label+' arrays');
 const defs=new Set();for(const s of t.schemas){assert(Array.isArray(s)&&s.length>0&&s.every(k=>typeof k==='string')&&new Set(s).size===s.length,label+' schema');const text=JSON.stringify(s);assert(!defs.has(text),label+' duplicate schema');defs.add(text)}
 const used=new Set();for(let i=0;i<t.rows.length;i++){const r=t.rows[i];assert(Array.isArray(r)&&r[0]===i,label+' ordinal');assert(Number.isSafeInteger(r[1])&&r[1]>=0&&r[1]<t.schemas.length,label+' schema ID');const s=t.schemas[r[1]];assert(r.length===s.length+2,label+' columns');if(!used.has(r[1])){assert(r[1]===used.size,label+' schema first-use order');used.add(r[1])}}
 assert(used.size===t.schemas.length,label+' unused schema');
 return (i,k)=>{const r=t.rows[i],p=t.schemas[r[1]].indexOf(k);return p<0?undefined:r[p+2]};
}
function untab(t){return t.rows.map(r=>{const out={};t.schemas[r[1]].forEach((k,j)=>Object.defineProperty(out,k,{value:r[j+2],enumerable:true,writable:true,configurable:true}));return out})}
export function encode(input){
 jsonDomain(input);const active=clone(input),town=active.game.labConnection.town,townKeys=Object.keys(town);
 const events=table(town.events),attempts=table(town.attempts),arrivals=[];
 town.events.forEach((e,i)=>{if(e.type==='arrival')arrivals.push(i)});
 assert(JSON.stringify(arrivals.map(i=>town.events[i]))===JSON.stringify(town.arrivals),'arrival derivation');
 delete town.events;delete town.attempts;delete town.arrivals;
 const body={version:1,active,townKeys,events,attempts,arrivals};return {...body,integrity:hash(body)};
}
export function validateCandidate(candidate,expected){
 jsonDomain(candidate);keys(candidate,['version','active','townKeys','events','attempts','arrivals','integrity'],'candidate');
 assert(candidate.version===1,'version');const c=candidate;
 assert(object(c.active)&&object(c.active.game)&&object(c.active.game.labConnection)&&object(c.active.game.labConnection.town),'active path');
 const base=c.active.game.labConnection.town;
 for(const k of ['events','attempts','arrivals'])assert(!own(base,k),'active shadow '+k);
 const ev=inspectTable(c.events,'events'),at=inspectTable(c.attempts,'attempts');
 const ids=new Map(),arrivalPositions=[];
 for(let i=0;i<c.events.rows.length;i++){
  const id=ev(i,'id');assert(id==='e'+(i+1)&&!ids.has(id),'event identity/order');
  const source=ev(i,'sourceId');
  if(source!==null&&source!==undefined){assert(typeof source==='string'&&ids.has(source),'event source');const j=ids.get(source);const pm=ev(j,'month'),cm=ev(i,'month');assert(pm===undefined||cm===undefined||pm<=cm,'event source time');const pr=ev(j,'releaseId'),cr=ev(i,'releaseId');assert(pr==null||cr==null||pr===cr,'event source release')}
  ids.set(id,i);if(ev(i,'type')==='arrival')arrivalPositions.push(i);
 }
 for(let i=0;i<c.attempts.rows.length;i++){const s=at(i,'sourceId');assert(typeof s==='string'&&ids.has(s),'attempt source');const pm=ev(ids.get(s),'month'),cm=at(i,'month');assert(pm===undefined||cm===undefined||pm<=cm,'attempt source time')}
 assert(Array.isArray(c.arrivals)&&JSON.stringify(c.arrivals)===JSON.stringify(arrivalPositions),'arrival completeness/order');
 assert(Array.isArray(c.townKeys)&&c.townKeys.every(k=>typeof k==='string')&&new Set(c.townKeys).size===c.townKeys.length,'town keys');
 const all=[...Object.keys(base),'events','attempts','arrivals'];assert(c.townKeys.length===all.length&&all.every(k=>c.townKeys.includes(k)),'town fields');
 const {integrity,...body}=c;assert(typeof integrity==='string'&&hash(body)===integrity,'integrity');
 // Independent fixture anchor is required: never supplied by the untrusted candidate.
 assert(expected&&typeof expected.gameSha==='string'&&typeof expected.inputSha==='string'&&typeof expected.candidateSha==='string','independent anchors required');
 assert(hash(c)===expected.candidateSha,'independent candidate anchor');
 return true;
}
export function decode(candidate,expected){
 validateCandidate(candidate,expected); // No reconstructed history/game exists before this returns.
 const c=clone(candidate),events=untab(c.events),attempts=untab(c.attempts),x=c.active;
 const values={...x.game.labConnection.town,events,attempts,arrivals:c.arrivals.map(i=>clone(events[i]))};
 const town={};for(const k of c.townKeys)Object.defineProperty(town,k,{value:values[k],enumerable:true,writable:true,configurable:true});
 x.game.labConnection.town=town;assert(hash(x.game)===expected.gameSha,'game anchor');assert(hash(x)===expected.inputSha,'input anchor');return x;
}
export function anchor(input){return {gameSha:hash(input.game),inputSha:hash(input),candidateSha:hash(encode(input))}}
