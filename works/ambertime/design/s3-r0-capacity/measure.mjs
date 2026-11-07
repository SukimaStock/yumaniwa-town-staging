// Research metrics only. Does not call or replace any official size guard.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function size(value){const s=JSON.stringify(value);return {utf16:s.length,utf8:Buffer.byteLength(s),count:Array.isArray(value)?value.length:value&&typeof value==='object'?Object.keys(value).length:null};}
export function measureGame(game,records){
 const town=game.labConnection.town;
 const arrivals=town.events.filter(e=>e.type==='arrival');
 assert.equal(JSON.stringify(town.arrivals),JSON.stringify(arrivals),'C derivation must be exact before theoretical estimate');
 const compact=JSON.parse(JSON.stringify(game));compact.labConnection.town.arrivals=null;
 const session={version:8,game:compact,...records};
 const groups={game:size(game),compactGame:size(compact),theoreticalSession:size(session),town:size(town),gameTopLevel:Object.fromEntries(Object.entries(game).map(([k,v])=>[k,size(v)])),townFields:Object.fromEntries(Object.entries(town).map(([k,v])=>[k,size(v)])),shopFields:Object.fromEntries(Object.entries(game.shop).map(([k,v])=>[k,size(v)])),sessionRecords:Object.fromEntries(Object.entries(records).map(([k,v])=>[k,size(v)]))};
 return groups;
}
