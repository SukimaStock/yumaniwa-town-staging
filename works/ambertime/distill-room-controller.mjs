// Transient brewing confirmation only. The application owns formal card choices,
// operations, saves, clock, countdown, modals and rendering.
export function createDistillRoomController(){
 let prepared=false,preparedForDistillation=null,confirmation=null;
 return {
  get confirmation(){return confirmation;},
  isPreparedFor(batch){return prepared&&preparedForDistillation===batch;},
  beginEdit(){const preparedAtOpen=prepared;prepared=false;return preparedAtOpen;},
  confirm(cards,batch){confirmation={...cards,batch};prepared=true;preparedForDistillation=batch;},
  cancelEdit(preparedAtOpen,choice,draft){prepared=!!(preparedAtOpen&&choice&&choice.malt===draft.malt&&choice.ferment===draft.ferment);},
  clearPrepared(){prepared=false;},
  invalidate(phase,batch){if(phase!=='ready'||confirmation?.batch!==batch)confirmation=null;},
  // As before, reset forgets the flags/label, not the dormant batch marker.
  reset(){prepared=false;confirmation=null;}
 };
}
