// Isolated research. Never imported by the app. Local consistency is NOT replay proof.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MAX_FORMAL_CODE_UNITS} from '../save-codec.mjs';
export function validateReferences(town,read={length:town.arrivals.length,at:i=>town.arrivals.at(i)}){
 assert(Array.isArray(town.events));const seen=new Set();let count=0;
 for(const event of town.events){
  assert(event!==null&&typeof event==='object'&&!Array.isArray(event)&&typeof event.id==='string'&&event.id.length&&typeof event.type==='string'&&!seen.has(event.id),'invalid event/duplicate ID');seen.add(event.id);
  if(event.type==='arrival'){
   const actual=read.at(count++);assert(actual!==undefined,'missing reference');
   // Identity proves membership for a reference view; exact JSON additionally
   // supports the ordinary-array oracle without copying individual objects.
   assert(actual===event||JSON.stringify(actual)===JSON.stringify(event),'arrival value/property/order mismatch');
  }
 }
 assert.equal(count,read.length,'arrival count');return {events:seen.size,arrivals:count};
}
export function indexedReader(events,index){return {length:index.length,at:i=>events[index[i]]};}
// Restricted to parsed JSON data graphs plus an explicit virtual arrivals slot.
// Native scalar stringify handles escaping, lone surrogates, number notation.
// Tokens are never split inside strings, so UTF8 byte sums are exact too.
export function* jsonTokens(root,{arrivals,wire=false}={}){
 const ancestors=new Set();
 function* visit(value,path){
  if(path.length===3&&path[0]==='labConnection'&&path[1]==='town'&&path[2]==='arrivals'&&arrivals){
   if(wire){yield 'null';return;}
   yield '[';for(let i=0;i<arrivals.length;i++){if(i)yield ',';yield* visit(arrivals.at(i),['@arrival']);}yield ']';return;
  }
  if(value===null){yield 'null';return;}
  const type=typeof value;
  if(type!=='object'){assert(['string','boolean','number'].includes(type)&&!(type==='number'&&!Number.isFinite(value)),'outside parsed JSON domain');yield JSON.stringify(value);return;}
  assert(!ancestors.has(value),'cycle');const proto=Object.getPrototypeOf(value);assert(proto===Object.prototype||proto===Array.prototype||proto===null,'custom prototype');
  for(const k of Reflect.ownKeys(value)){if(Array.isArray(value)&&k==='length')continue;const d=Object.getOwnPropertyDescriptor(value,k);assert(typeof k==='string'&&d.enumerable&&'value'in d,'non JSON descriptor');}
  assert(typeof value.toJSON!=='function','toJSON outside domain');ancestors.add(value);
  if(Array.isArray(value)){yield '[';for(let i=0;i<value.length;i++){if(i)yield ',';if(!Object.hasOwn(value,i))yield 'null';else yield* visit(value[i],[...path,String(i)]);}yield ']';}
  else{yield '{';let first=true;for(const k of Object.keys(value)){if(!first)yield ',';first=false;yield JSON.stringify(k);yield ':';yield* visit(value[k],[...path,k]);}yield '}';}
  ancestors.delete(value);
 }
 yield* visit(root,[]);
}
export function inspectTokens(tokens,{expected,limit=Infinity}={}){
 let units=0,bytes=0,chunks=0;const hash=createHash('sha256');
 for(const token of tokens){if(expected!==undefined)assert.equal(expected.slice(units,units+token.length),token,'exact JSON segment');units+=token.length;assert(units<limit,'formal cap');bytes+=Buffer.byteLength(token);hash.update(token);chunks++;}
 if(expected!==undefined)assert.equal(units,expected.length,'exact total JSON');return {utf16Units:units,utf8Bytes:bytes,sha256:hash.digest('hex'),chunks,exact:expected!==undefined};
}
export function inspectFormal(game,options={}){const town=game.labConnection.town;validateReferences(town);return inspectTokens(jsonTokens(game,{arrivals:{length:town.arrivals.length,at:i=>town.arrivals.at(i)}}),{...options,limit:Math.min(options.limit??Infinity,MAX_FORMAL_CODE_UNITS)});}
