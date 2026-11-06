// Presentation metadata only. Internal cask IDs and the formal game are unchanged.
export const CASK_SLOT_COUNT=4;
const assert=(ok)=>{if(!ok)throw Error('たるの場所を確認できません。元の記録を残して停止しています。');};
function liveCasks(game){
 const casks=game?.core?.casks;
 assert(Array.isArray(casks)&&casks.length<=CASK_SLOT_COUNT);
 const ids=casks.map(c=>c?.id);
 assert(ids.every(id=>Number.isSafeInteger(id)&&id>0)&&new Set(ids).size===ids.length);
 return casks;
}
function assertShape(slots){
 assert(Array.isArray(slots)&&slots.length===CASK_SLOT_COUNT&&Array.from(slots).every(id=>id===null||Number.isSafeInteger(id)&&id>0));
 const ids=slots.filter(id=>id!==null);assert(new Set(ids).size===ids.length);
}
const ordered=casks=>casks.slice().sort((a,b)=>(a.filledMonth??a.batchMonth??0)-(b.filledMonth??b.batchMonth??0)||a.id-b.id);
export function initializeCaskSlots(game){
 const slots=Array(CASK_SLOT_COUNT).fill(null);
 ordered(liveCasks(game)).forEach((c,i)=>{slots[i]=c.id;});return slots;
}
export function assertCaskSlots(game,slots){
 const ids=liveCasks(game).map(c=>c.id);assertShape(slots);
 assert(slots.filter(id=>id!==null).length===ids.length&&ids.every(id=>slots.includes(id)));
 return slots;
}
// Used only at a candidate transaction boundary. Reconciliation never mutates
// the committed array; a failed save leaves game and presentation together.
export function reconcileCaskSlots(game,slots){
 const casks=liveCasks(game);assertShape(slots);const live=new Set(casks.map(c=>c.id));
 const next=slots.map(id=>live.has(id)?id:null);
 for(const c of ordered(casks))if(!next.includes(c.id)){const index=next.indexOf(null);assert(index!==-1);next[index]=c.id;}
 return assertCaskSlots(game,next);
}
export function caskSlotMap(slots){assertShape(slots);return new Map(slots.flatMap((id,index)=>id===null?[]:[[id,index+1]]));}
