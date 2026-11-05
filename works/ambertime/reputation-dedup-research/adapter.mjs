// H1-B1 research wire codec only. No formal reader, writer, model or storage key.
// Decode restores ordinary JSON objects, not shared event aliases or a live index.
export const SCHEMA='ambertime-h1-b1-arrival-wire/1';
const fail=message=>{throw Error('H1-B1: '+message);};
const assert=(condition,message)=>{if(!condition)fail(message);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>JSON.parse(JSON.stringify(value));
const exactKeys=(value,keys)=>object(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
function parse(text){assert(typeof text==='string','text required');let value;try{value=JSON.parse(text);}catch{fail('invalid JSON');}assert(JSON.stringify(value)===text,'canonical JSON required');return value;}
function townOf(game){assert(object(game)&&game.version===20&&object(game.labConnection)&&object(game.labConnection.town),'formal v20 town required');return game.labConnection.town;}
function eventIndex(town){
 assert(Array.isArray(town.events),'events array required');const byId=new Map();
 for(const event of town.events){assert(object(event)&&typeof event.id==='string'&&event.id.length>0&&typeof event.type==='string','invalid event');assert(!byId.has(event.id),'duplicate event ID '+event.id);byId.set(event.id,event);}
 return byId;
}
function arrivalIds(town,byId){
 assert(Array.isArray(town.arrivals),'arrivals array required');const ids=[],seen=new Set();
 for(const arrival of town.arrivals){assert(object(arrival)&&typeof arrival.id==='string','arrival object required');assert(!seen.has(arrival.id),'duplicate arrival ID '+arrival.id);const original=byId.get(arrival.id);assert(original&&original.type==='arrival','missing or non-arrival event '+arrival.id);assert(JSON.stringify(original)===JSON.stringify(arrival),'arrival event mismatch '+arrival.id);seen.add(arrival.id);ids.push(arrival.id);}
 return ids;
}
export function encode(raw,variant='A'){
 assert(['A','B','C'].includes(variant),'unknown variant');const game=parse(raw),town=townOf(game),byId=eventIndex(town),ids=arrivalIds(town,byId);
 if(variant==='A')return raw;
 const arrivalsKeyIndex=Object.keys(town).indexOf('arrivals');assert(arrivalsKeyIndex>=0,'own arrivals property required');
 if(variant==='B')town.arrivals=ids;
 else{
  const derived=town.events.filter(event=>event.type==='arrival');
  assert(JSON.stringify(derived)===JSON.stringify(town.arrivals),'C requires complete event-order arrivals');
  delete town.arrivals;
 }
 return JSON.stringify({schema:SCHEMA,variant,arrivalsKeyIndex,game});
}
export function decode(text){
 const value=parse(text);
 if(!Object.hasOwn(value,'schema')){const town=townOf(value);arrivalIds(town,eventIndex(town));return text;}
 assert(exactKeys(value,['schema','variant','arrivalsKeyIndex','game'])&&value.schema===SCHEMA&&['B','C'].includes(value.variant),'unknown or malformed research envelope');
 const {game,variant,arrivalsKeyIndex}=value,town=townOf(game),byId=eventIndex(town),keys=Object.keys(town);
 assert(Number.isInteger(arrivalsKeyIndex)&&arrivalsKeyIndex>=0,'invalid arrivals key position');
 if(variant==='B'){
  assert(keys.indexOf('arrivals')===arrivalsKeyIndex&&Array.isArray(town.arrivals),'B arrivals/key position mismatch');const seen=new Set();
  town.arrivals=town.arrivals.map(id=>{assert(typeof id==='string'&&!seen.has(id),'invalid or duplicate arrival reference');const event=byId.get(id);assert(event&&event.type==='arrival','missing or non-arrival reference '+id);seen.add(id);return clone(event);});
 }else{
  assert(!Object.hasOwn(town,'arrivals')&&arrivalsKeyIndex<=keys.length,'C arrivals/key position mismatch');
  const entries=Object.entries(town),arrivals=town.events.filter(event=>event.type==='arrival').map(clone);entries.splice(arrivalsKeyIndex,0,['arrivals',arrivals]);game.labConnection.town=Object.fromEntries(entries);
 }
 const output=JSON.stringify(game);arrivalIds(townOf(game),eventIndex(townOf(game)));return output;
}
export function inspect(text){
 const value=parse(text),variant=Object.hasOwn(value,'schema')?value.variant:'A',game=JSON.parse(decode(text)),town=townOf(game);
 return {variant,events:town.events.length,arrivals:town.arrivals.length,arrivalsKeyIndex:Object.keys(town).indexOf('arrivals')};
}
