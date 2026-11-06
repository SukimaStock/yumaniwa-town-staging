// Isolated research representations. Never import this module from the game.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assertFormalSize} from '../save-codec.mjs';
export const text = value => JSON.stringify(value);
export const hash = value => createHash('sha256').update(typeof value==='string'?value:text(value)).digest('hex');
const copy = value => JSON.parse(text(value));
const groups=['events','attempts','shipments'];
const town = game => game.labConnection.town;
export function packRecords(records){
 const schemas=[],ids=new Map(),rows=[];
 for(const record of records){assert(record&&typeof record==='object'&&!Array.isArray(record));const keys=Object.keys(record),key=text(keys);let id=ids.get(key);if(id===undefined){id=schemas.length;ids.set(key,id);schemas.push(keys);}rows.push([id,...keys.map(k=>record[k])]);}
 return {schemas,rows};
}
export function unpackRecords(packed){
 assert(packed&&Array.isArray(packed.schemas)&&Array.isArray(packed.rows),'record schema');
 for(const keys of packed.schemas){assert(Array.isArray(keys)&&keys.every(k=>typeof k==='string')&&new Set(keys).size===keys.length,'record keys');}
 return packed.rows.map(row=>{assert(Array.isArray(row)&&Number.isSafeInteger(row[0]),'record row');const keys=packed.schemas[row[0]];assert(keys&&row.length===keys.length+1,'record shape');return Object.fromEntries(keys.map((k,i)=>[k,row[i+1]]));});
}
function seal(payload,blobs={}){return {payload,integrity:hash(payload),blobs};}
function checked(encoded){assert.equal(hash(encoded.payload),encoded.integrity,'manifest integrity');assert.equal(encoded.payload.research,'l100-4a/1');return encoded.payload;}
export function encode(game,method){
 assert(['A','B','C','D'].includes(method));const original=text(game);assertFormalSize(original);
 const g=copy(game),t=town(g);assert.equal(text(t.arrivals),text(t.events.filter(e=>e.type==='arrival')),'derived arrivals mismatch');
 const payload={research:'l100-4a/1',method,sourceHash:hash(original),game:g};
 if(method==='A')return seal(payload);
 t.arrivals=null;
 if(method==='C'){for(const key of groups)t[key]=packRecords(t[key]);}
 const blobs={};
 if(method==='D'){
  payload.archives={};
  for(const key of groups){const records=t[key],chunks=[];for(let start=0;start<records.length;start+=256){const data=packRecords(records.slice(start,start+256)),raw=text(data),digest=hash(raw);blobs[digest]=raw;chunks.push({start,count:data.rows.length,hash:digest});}payload.archives[key]={count:records.length,chunks};t[key]=null;}
 }
 return seal(payload,blobs);
}
function readChunk(encoded,key,entry){const raw=encoded.blobs[entry.hash];assert.equal(typeof raw,'string','missing archive');assert.equal(hash(raw),entry.hash,'archive hash');const records=unpackRecords(JSON.parse(raw));assert.equal(records.length,entry.count,'archive count');return records;}
function checkManifest(p,key){const manifest=p.archives[key];assert(manifest&&Number.isSafeInteger(manifest.count)&&manifest.count>=0&&Array.isArray(manifest.chunks),'archive manifest');let offset=0;for(const chunk of manifest.chunks){assert.equal(chunk.start,offset,'archive order');assert(Number.isSafeInteger(chunk.count)&&chunk.count>0&&chunk.count<=256,'chunk size');offset+=chunk.count;}assert.equal(offset,manifest.count,'manifest count');return manifest;}
// Reads only one selected chunk after manifest validation. Does not validate all
// unread chunks or establish that a complete recoverable snapshot is available.
export function lookup(encoded,key,index){const p=checked(encoded);assert.equal(p.method,'D');assert(groups.includes(key));const m=checkManifest(p,key);assert(Number.isSafeInteger(index)&&index>=0&&index<m.count,'archive index');const c=m.chunks.find(c=>index>=c.start&&index<c.start+c.count);return readChunk(encoded,key,c)[index-c.start];}
export function hydrate(encoded){
 const p=checked(encoded),g=copy(p.game),t=town(g);assert(['A','B','C','D'].includes(p.method),'method');
 if(p.method==='C')for(const key of groups)t[key]=unpackRecords(t[key]);
 if(p.method==='D')for(const key of groups){const m=checkManifest(p,key);t[key]=m.chunks.flatMap(c=>readChunk(encoded,key,c));}
 if(p.method!=='A'){assert.equal(t.arrivals,null);t.arrivals=copy(t.events.filter(e=>e.type==='arrival'));}
 const raw=text(g);assertFormalSize(raw);assert.equal(hash(raw),p.sourceHash,'restored source mismatch');return g;
}
export function sizes(encoded){const current=text({payload:encoded.payload,integrity:encoded.integrity}),blobs=Object.values(encoded.blobs),transport=text(encoded);const archiveUnits=blobs.reduce((n,s)=>n+s.length,0),archiveBytes=blobs.reduce((n,s)=>n+Buffer.byteLength(s),0);return {currentUnits:current.length,currentBytes:Buffer.byteLength(current),archiveUnits,archiveBytes,totalUnits:current.length+archiveUnits,totalBytes:Buffer.byteLength(current)+archiveBytes,transportUnits:transport.length,transportBytes:Buffer.byteLength(transport),blobCount:blobs.length};}
