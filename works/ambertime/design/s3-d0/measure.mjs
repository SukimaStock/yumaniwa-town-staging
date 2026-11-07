// D0 capacity accounting only. No runtime adapter, writer or validator.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export const jsonSize=x=>({utf16:JSON.stringify(x).length,utf8:Buffer.byteLength(JSON.stringify(x))});
export const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function measure(input){
 const {game,...sessionFields}=input; const town=game.labConnection.town;
 const arrivalPositions=town.events.flatMap((e,i)=>e.type==='arrival'?[i]:[]);
 if(JSON.stringify(arrivalPositions.map(i=>town.events[i]))!==JSON.stringify(town.arrivals))throw Error('arrival content/order mismatch');
 // Do not mutate fixture. Separate capacity buckets are NOT yet playable state.
 const active=structuredClone(game); delete active.labConnection.town.events;delete active.labConnection.town.attempts;delete active.labConnection.town.arrivals;
 const archive={events:town.events,attempts:town.attempts,arrivalPositions};
 const separated={active,archive,sessionFields};
 // B: lossless key/presence/order tables, only for measuring representation cost.
 const table=rows=>{const schemas=[], lookup=new Map();const data=rows.map(row=>{const keys=Object.keys(row), key=JSON.stringify(keys);let id=lookup.get(key);if(id===undefined){id=schemas.length;schemas.push(keys);lookup.set(key,id);}return [id,...keys.map(k=>row[k])];});const decoded=data.map(([id,...values])=>Object.fromEntries(schemas[id].map((k,i)=>[k,values[i]])));if(JSON.stringify(decoded)!==JSON.stringify(rows))throw Error('table roundtrip');return {schemas,rows:data};};
 const canonical={active,archive:{events:table(town.events),attempts:table(town.attempts),arrivalPositions},sessionFields};
 const restored=structuredClone(active);Object.assign(restored.labConnection.town,{events:archive.events,attempts:archive.attempts,arrivals:arrivalPositions.map(i=>archive.events[i])});
 for(const k of Object.keys(town))if(JSON.stringify(restored.labConnection.town[k])!==JSON.stringify(town[k]))throw Error('bucket roundtrip '+k);
 const component={active:jsonSize(active),events:jsonSize(town.events),attempts:jsonSize(town.attempts),arrivalPositions:jsonSize(arrivalPositions),sessionFields:jsonSize(sessionFields)};
 const partition=(rows,n)=>Array.from({length:Math.ceil(rows.length/n)},(_,i)=>rows.slice(i*n,(i+1)*n));
 const chunks=[...partition(town.events,512).map((records,i)=>({kind:'events',ordinal:i,records})),...partition(town.attempts,512).map((records,i)=>({kind:'attempts',ordinal:i,records}))];
 const chunkSizes=chunks.map(jsonSize);const chunkUnits=chunkSizes.reduce((a,b)=>a+b.utf16,0);const chunkBytes=chunkSizes.reduce((a,b)=>a+b.utf8,0);
 return {schema:'s3-d0-capacity/1',gameSha256:digest(game),game:jsonSize(game),town:jsonSize(town),counts:{events:town.events.length,attempts:town.attempts.length,arrivals:town.arrivals.length},component,A:{combinedRepresentation:jsonSize(separated),note:'capacity-only logical buckets; not a formal save or a playable hot-state proof'},B:{schemaTableRepresentation:jsonSize(canonical),note:'schema per ordered property set; exact JSON roundtrip checked; size-only prototype, not a formal codec'},C:{chunks:chunks.length,chunkPayload:{utf16:chunkUnits,utf8:chunkBytes},largestChunk:{utf16:Math.max(0,...chunkSizes.map(s=>s.utf16)),utf8:Math.max(0,...chunkSizes.map(s=>s.utf8))},chunkWrapperOverhead:{utf16:chunkUnits-component.events.utf16-component.attempts.utf16,utf8:chunkBytes-component.events.utf8-component.attempts.utf8},note:'excludes unmeasured checkpoint, manifest, driver overhead; physical quota unmeasured'},envelope:jsonSize(input)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=measure(JSON.parse(readFileSync(process.argv[2],'utf8')));const out=JSON.stringify(r,null,2)+'\n';if(process.argv[3])writeFileSync(process.argv[3],out);else process.stdout.write(out);}
