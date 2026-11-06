// Research adapter: execute the unchanged H3-1 C selector, without its A/B work.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {editionVersion} from '../chronicle-lab/edition-d.mjs';
import {order,before,position} from '../h3-1/selection.mjs';
const url=new URL('../h3-1/selection.mjs',import.meta.url),source=readFileSync(url,'utf8');
export const selectionSourceSha256=createHash('sha256').update(source).digest('hex');
const implementation=await import('data:text/javascript;base64,'+Buffer.from(source.replace(/from '([.][^']+)'/gu,(_,p)=>'from '+JSON.stringify(new URL(p,url).href))+'\nexport {select,scene};').toString('base64'));
export function selectionSeed(gameSeed,boundary){
 const text=JSON.stringify([gameSeed,boundary.ids.toGeneration,boundary.operationIndex,boundary.month,position(boundary),editionVersion]);let h=2166136261;
 for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return h>>>0;
}
export function selectC({events,current,boundary,startMonth,seed}){
 if(events.some(e=>!before(e,boundary)))throw Error('Future fact in selection');
 const ctx={events:[...events].sort(order),current:[...current].sort(order),boundary,startMonth};
 const {selected,reason}=implementation.select(ctx,'C',seed);
 return selected.map(e=>implementation.scene(e,ctx,'C',selected,reason.get(e.id)));
}
