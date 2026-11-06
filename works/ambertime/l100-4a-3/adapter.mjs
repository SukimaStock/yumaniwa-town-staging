// Research only. Never imported by the application. No persistence serializer.
import assert from 'node:assert/strict';
export const nativeClone=globalThis.structuredClone;
export const metrics={cloneCalls:0,compactClones:0,fullExpansions:[],arrayMaterializations:[],indexBuilds:0};
let critical=false;
const materialized=(kind,n,total)=>{metrics.arrayMaterializations.push({kind,n,total,critical});if(critical&&n===total&&total>0)throw Error('full arrivals materialization during compact execution');};
export class ArrivalView {
 #events; #index; #count=0;
 constructor(events){assert(Array.isArray(events));this.#events=events;let n=0;for(let i=0;i<events.length;i++){assert.equal(events[i]?.id,'e'+(i+1));if(events[i].type==='arrival')n++;}this.#index=new Uint32Array(Math.max(64,2**Math.ceil(Math.log2(n||1))));for(let i=0;i<events.length;i++)if(events[i].type==='arrival')this.#index[this.#count++]=i;metrics.indexBuilds++;}
 get length(){return this.#count;}
 source(){return this.#events;}
 at(i){if(i<0)i+=this.length;if(i<0||i>=this.length)return undefined;const p=this.#index[i],e=this.#events[p];assert(e?.type==='arrival'&&e.id==='e'+(p+1),'broken arrival reference');return e;}
 *[Symbol.iterator](){for(let i=0;i<this.length;i++)yield this.at(i);}
 push(e){const p=Number(e?.id?.slice(1))-1;assert(this.#events[p]===e&&e.type==='arrival','event must already exist');assert(!this.length||p>this.#index[this.length-1],'duplicate/out-of-order append');if(this.length===this.#index.length){const a=new Uint32Array(this.#index.length*2);a.set(this.#index);this.#index=a;}this.#index[this.#count++]=p;return this.length;}
 find(fn){let i=0;for(const e of this)if(fn(e,i++,this))return e;}
 some(fn){return this.find(fn)!==undefined;}
 includes(x){for(const e of this)if(e===x)return true;return false;}
 slice(start=0,end=this.length){const norm=i=>Math.min(this.length,Math.max(0,i<0?this.length+i:i));start=norm(start);end=norm(end);materialized('slice',Math.max(0,end-start),this.length);const a=[];for(let i=start;i<end;i++)a.push(this.at(i));return a;}
 filter(fn){const a=[];let i=0;for(const e of this)if(fn(e,i++,this))a.push(e);materialized('filter',a.length,this.length);return a;}
 map(fn){materialized('map',this.length,this.length);const a=[];let i=0;for(const e of this)a.push(fn(e,i++,this));return a;}
 validate(){let n=0;for(const e of this.#events)if(e.type==='arrival')assert.equal(this.at(n++),e);assert.equal(n,this.length);return true;}
 stats(){return {count:this.length,indexBytes:this.#index.byteLength,packedIndexBytes:this.length*4};}
}
export function install(game){const t=game.labConnection.town;assert(Array.isArray(t.arrivals));let i=0;for(const e of t.events)if(e.type==='arrival')assert.deepEqual(t.arrivals[i++],e);assert.equal(i,t.arrivals.length);t.arrivals=new ArrivalView(t.events);return game;}
export function hydrate(game,reason='equality'){assert(!critical,'hydrate forbidden inside compact execution');const t=game.labConnection.town;metrics.fullExpansions.push({reason,records:t.arrivals.length});return {...game,labConnection:{...game.labConnection,town:{...t,arrivals:Array.from(t.arrivals)}}};}
// All current formal objects are enumerable data records/arrays, with no accessors.
// Unsupported prototypes reject, rather than silently differ from native clone.
function graph(value,onView,seen=new Map()){
 if(value===null||typeof value!=='object'){assert(!['function','symbol'].includes(typeof value));return value;}
 if(seen.has(value))return seen.get(value);
 if(value instanceof ArrivalView)return onView(value,seen);
 assert(!Object.hasOwn(value,'__L100_4A_3_VIEW__'),'reserved research marker in source');
 assert([Object.prototype,Array.prototype,null].includes(Object.getPrototypeOf(value)),'unsupported research clone prototype');
 const out=Array.isArray(value)?new Array(value.length):{};seen.set(value,out);
 for(const key of Reflect.ownKeys(value)){if(key==='length'&&Array.isArray(value))continue;assert(typeof key==='string','symbol unsupported');const d=Object.getOwnPropertyDescriptor(value,key);assert(d.enumerable&&'value'in d,'accessor/non-enumerable unsupported');const copied=graph(d.value,onView,seen);if(key==='__proto__')Object.defineProperty(out,key,{value:copied,writable:true,enumerable:true,configurable:true});else out[key]=copied;}return out;
}
export function cloneCompact(value,method='B'){
 assert(['B','C'].includes(method));metrics.cloneCalls++;
 if(method==='C')return graph(value,(view,seen)=>{view.validate();const events=graph(view.source(),(v,s)=>{throw Error('nested view in events');},seen);const result=new ArrivalView(events);seen.set(view,result);metrics.compactClones++;return result;});
 const marker='__L100_4A_3_VIEW__';
 const projected=graph(value,(view,seen)=>{view.validate();const result={[marker]:true};seen.set(view,result);result.events=graph(view.source(),()=>{throw Error('nested view in events');},seen);metrics.compactClones++;return result;});
 const copied=nativeClone(projected),seen=new Map();
 function rebuild(v){if(!v||typeof v!=='object')return v;if(seen.has(v))return seen.get(v);if(v[marker]===true){assert.deepEqual(Object.keys(v),[marker,'events']);const result=new ArrivalView(v.events);seen.set(v,result);return result;}seen.set(v,v);for(const key of Object.keys(v))v[key]=rebuild(v[key]);return v;}return rebuild(copied);
}
export function withCompactClone(method,fn){assert(!critical,'nested adapter');const before=globalThis.structuredClone;assert.equal(before,nativeClone);critical=true;globalThis.structuredClone=(v,options)=>{assert(options===undefined,'transfer/options unsupported');return cloneCompact(v,method);};try{const value=fn();assert(!value?.then,'synchronous adapter only');return value;}finally{globalThis.structuredClone=before;critical=false;}}
export function resetMetrics(){metrics.cloneCalls=0;metrics.compactClones=0;metrics.fullExpansions=[];metrics.arrayMaterializations=[];metrics.indexBuilds=0;}
