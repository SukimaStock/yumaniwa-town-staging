// Presentation adapter: reads already selected scenes, never recalculates or saves a recall.
import {monthLabel} from '../model.mjs?v=stage4-r2';

const artFor=Object.freeze({
 bottling:'cask',fill:'cask',distillation:'cask',
 delivery:'shop','shop-start':'shop',
 sale:'counter',reaction:'counter',
 arrival:'distant',inquiry:'letter',visit:'visitor',
 handover:'visitor'
});

export function playbackScenes(edition){
 if(!edition||!Array.isArray(edition.scenes))throw Error('回想の場面を読み取れません。');
 return edition.scenes.map(item=>{
  if(!item||typeof item.sentence!=='string'||!Number.isInteger(item.month)||item.month<0||typeof item.event?.kind!=='string')throw Error('回想の場面を読み取れません。');
  return {
   date:monthLabel(item.month),
   sentence:item.sentence,
   scene:artFor[item.event.kind]??'distant'
  };
 });
}
