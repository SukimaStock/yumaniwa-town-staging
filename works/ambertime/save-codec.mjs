// Formal session v3 changes the wire representation only. Runtime arrivals stay
// ordinary complete objects and the existing formal reader remains authoritative.
import {PARALLEL_PARAMETERS as P} from './economy-parameters.mjs';
export const MAX_FORMAL_CODE_UNITS=P.maxSaveBytes*4+16384;
export const MAX_SESSION_CODE_UNITS=MAX_FORMAL_CODE_UNITS+1024;
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function townOf(game){
 assert(object(game)&&game.version===20&&object(game.labConnection)&&object(game.labConnection.town),'到達記録を確認できません。元の記録を残して停止しています。');
 return game.labConnection.town;
}
function arrivalEvents(town){
 assert(Array.isArray(town.events),'町の記録を確認できません。');const seen=new Set(),arrivals=[];
 for(const event of town.events){
  assert(object(event)&&typeof event.id==='string'&&event.id.length>0&&typeof event.type==='string'&&!seen.has(event.id),'町の記録のIDを確認できません。');
  seen.add(event.id);if(event.type==='arrival')arrivals.push(event);
 }
 return arrivals;
}
export function assertFormalSize(raw){
 assert(typeof raw==='string'&&raw.length<MAX_FORMAL_CODE_UNITS,'保存が大きすぎます。元の記録を残して停止しています。');
 return raw;
}
export function compactFormalGame(raw){
 assertFormalSize(raw);let game;try{game=JSON.parse(raw);}catch{throw Error('保存を読み取れません。');}
 assert(JSON.stringify(game)===raw,'正式な記録の文字列を確認できません。');
 const town=townOf(game),derived=arrivalEvents(town);
 assert(Array.isArray(town.arrivals)&&JSON.stringify(town.arrivals)===JSON.stringify(derived),'到達記録の内容・件数・順序を確認できません。元の記録を残して停止しています。');
 // Keep the original property position, without keeping a second event body.
 town.arrivals=null;return game;
}
export function expandFormalGame(compact){
 const town=townOf(compact);assert(Object.hasOwn(town,'arrivals')&&town.arrivals===null,'新しい保存の到達記録を確認できません。');
 const arrivalsText=JSON.stringify(arrivalEvents(town)),base=JSON.stringify(compact);
 // Check the exact eventual JSON length before constructing the arrival clone.
 assert(base.length-4+arrivalsText.length<MAX_FORMAL_CODE_UNITS,'保存が大きすぎます。元の記録を残して停止しています。');
 const game={...compact,labConnection:{...compact.labConnection,town:{...town,arrivals:JSON.parse(arrivalsText)}}};
 return assertFormalSize(JSON.stringify(game));
}
