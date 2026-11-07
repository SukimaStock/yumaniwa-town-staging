// Room-owned presentation only. Eligibility remains in the existing model.
export function roomStaffAccess(room,{distill,bottling}){
 const job=room==='distill'?'distill':room==='warehouse'?'bottling':null;
 if(!job)return null;
 const status=job==='distill'?distill:bottling;
 if(!status?.unlocked)return null;
 return {job,label:job==='distill'?'蒸留担当者':'ビン詰め担当者',
  kind:status.hired?(job==='distill'?'staff-panel':'bottler-panel'):'staff-opportunity'};
}
