// Only the transient warehouse selection. Formal tasting, modals and effects
// remain with the application and model; cask order and objects are read-only.
export function createWarehouseRoomController(){
 let selectedId=null;
 return {
  get selectedId(){return selectedId;},
  select(id){selectedId=id;},
  reconcile(casks,tastingId){
   if(!casks.find(c=>c.id===selectedId))selectedId=casks[0]?.id??null;
   if(tastingId!==null)selectedId=tastingId;
  }
 };
}
