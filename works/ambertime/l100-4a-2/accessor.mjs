// Research only. Not an Array, formal save, or implicit JSON serializer.
const fail=message=>{throw new Error(message);};
export class ArrivalView {
 #events; #indices; #bytes; #count=0; #last=-1; #mode; #used=0;
 constructor(events,mode='B'){
  if(!Array.isArray(events)||!['B','C'].includes(mode))fail('invalid source/mode');
  this.#events=events;this.#mode=mode;this.#indices=new Uint32Array(mode==='B'?64:0);this.#bytes=new Uint8Array(mode==='C'?64:0);
  const ids=new Set();
  events.forEach((e,i)=>{if(!e||e.id!=='e'+(i+1)||ids.has(e.id))fail('invalid/duplicate event ID');ids.add(e.id);if(e.type==='arrival')this.#append(i);});
 }
 #byte(b){if(this.#used===this.#bytes.length){const next=new Uint8Array(this.#bytes.length*2);next.set(this.#bytes);this.#bytes=next;}this.#bytes[this.#used++]=b;}
 #append(i){if(i<=this.#last)fail('duplicate or unordered arrival');if(this.#mode==='B'){if(this.#count===this.#indices.length){const next=new Uint32Array(this.#indices.length*2);next.set(this.#indices);this.#indices=next;}this.#indices[this.#count]=i;}else{let n=i-this.#last;while(n>=128){this.#byte((n%128)+128);n=Math.floor(n/128);}this.#byte(n);}this.#last=i;this.#count++;}
 get length(){return this.#count;}
 get mode(){return this.#mode;}
 *#positions(){if(this.#mode==='B'){yield* this.#indices.subarray(0,this.#count);return;}let p=-1,n=0,power=1;for(const b of this.#bytes.subarray(0,this.#used)){n+=(b&127)*power;if(b&128)power*=128;else{p+=n;yield p;n=0;power=1;}}if(power!==1)fail('truncated index');}
 #read(p){const e=this.#events[p];if(!e||e.type!=='arrival'||e.id!=='e'+(p+1))fail('missing or changed reference');return e;}
 at(i){if(!Number.isInteger(i))fail('invalid index');if(i<0)i+=this.length;if(i<0||i>=this.length)return undefined;if(this.#mode==='B')return this.#read(this.#indices[i]);let n=0;for(const p of this.#positions())if(n++===i)return this.#read(p);fail('missing index');}
 byId(id){for(const e of this)if(e.id===id)return e;return undefined;}
 *[Symbol.iterator](){for(const p of this.#positions())yield this.#read(p);}
 push(e){const i=Number(e?.id?.slice(1))-1;if(this.#events[i]!==e||e.type!=='arrival')fail('append must reference an existing event');this.#append(i);return this.length;}
 filter(fn){return [...this].filter(fn);} // explicit caller allocation, never cached
 map(fn){return [...this].map(fn);} // explicit caller allocation, never cached
 includes(e){for(const item of this)if(item===e)return true;return false;}
 stats(){return {count:this.length,indexEntries:this.#indices.length,varintBytes:this.#used,cacheRecords:0,indexStorage:'TypedArray capacity included',allocatedIndexBytes:this.#indices.byteLength+this.#bytes.byteLength,packedIndexBytes:this.#mode==='B'?this.length*4:this.#used};}
 validate(){const expected=this.#events.filter(e=>e.type==='arrival');if(expected.length!==this.length)fail('missing arrivals');let i=0;for(const e of this)if(e!==expected[i++])fail('wrong order');return true;}
}
export function install(game,mode){const t=game.labConnection.town;t.arrivals=new ArrivalView(t.events,mode);return game;}
export function hydrate(game){const t=game.labConnection.town;return {...game,labConnection:{...game.labConnection,town:{...t,arrivals:[...t.arrivals]}}};}
