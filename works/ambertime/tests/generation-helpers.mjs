import * as D from '../partner-orders.mjs';
import {legacyOffered} from './department-helpers.mjs';
import {advance,resolve,release} from './brands-helpers.mjs';
const cache=new Map();
// A real v15 career, funded by four naturally produced and sold releases.
// Advancing its public monthly operations preserves every financial/replay rule.
export function legacyAtMonth(month=300){if(!cache.has(month)){let s=D.enableBottleStorage(legacyOffered());if(month<s.core.month)throw Error('Legacy career starts at month '+s.core.month);s=advance(s,month-s.core.month);cache.set(month,s);}return structuredClone(cache.get(month));}
export function generationAtMonth(month=300){return D.enableGenerations(legacyAtMonth(month));}
export function finishExtraction(s,progress=65,type='refill'){while(s.still.distillation.progress<progress)s=D.distillStep(s);return D.fillBarrel(D.stopDistillation(s),type);}
export function resolveWork(s){return resolve(s);}
export {advance};
// A long-lived named brand's next real release causes the late transition.
export function lateRelease(){let s=D.enableGenerations(legacyAtMonth(299));s=resolve(s);s=D.startDistillation(s);s=finishExtraction(s);s=advance(s,1);return D.bottleBranded(s,s.core.casks.at(-1).id,{brandId:1});}
export function fullEstate(){let s=D.enableBottleStorage(legacyOffered());for(let i=0;i<3;i++)s=release(s,{age:6,progress:65,selection:{brandId:1},tier:'low'});s=advance(s,356-s.core.month);for(let i=0;i<4;i++){s=resolve(s);s=D.startDistillation(s);s=finishExtraction(s);s=advance(s,1);}return D.enableGenerations(s);}
