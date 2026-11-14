import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {ArrivalView} from './adapter.mjs';
const url=new URL('../world-map-view.mjs',import.meta.url),source=fs.readFileSync(url,'utf8');
const guard='Array.isArray(town?.arrivals)?town.arrivals:[]';
assert.equal(source.split(guard).length,2,'exact reviewed guard required');
// Replace only the reader guard, preserving all map calculations and render functions.
const rewritten=source.replace(guard,"(Array.isArray(town?.arrivals)||town?.arrivals?.[Symbol.iterator])?town.arrivals:[]").replace(/from '(\.\/?[^']+)'/g,(_,path)=>`from '${new URL(path,url).href}'`);
export const mapSourceSha256=createHash('sha256').update(source).digest('hex');
export const adapted=await import('data:text/javascript;base64,'+Buffer.from(rewritten).toString('base64'));
export function readMap(game,mode='iterator'){
 const view=game.labConnection.town.arrivals;assert(view instanceof ArrivalView);view.validate();
 if(mode==='iterator')return adapted.mapProgress(game);
 assert.equal(mode,'accessor');
 // No arrival cache/array. Independent narrow readonly display adapter.
 const accessor={*[Symbol.iterator](){for(let i=0;i<view.length;i++)yield view.at(i);}};
 return adapted.mapProgress({...game,labConnection:{...game.labConnection,town:{...game.labConnection.town,arrivals:accessor}}});
}
