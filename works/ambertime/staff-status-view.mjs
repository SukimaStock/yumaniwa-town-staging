// Presentation only. Formal start checks, reservations and saved records stay owned by the model.
export function staffStatusView({hired=false,reservation=null,automatic=false,full=false,judgment=false,cash,canBegin={}}={}){
 if(!reservation)return hired?{brief:'指示待ち',detail:'指示待ち',blockingReason:''}:{brief:'',detail:'',blockingReason:''};
 const brief=automatic?'仕込み中':full?'空き待ち':judgment?'判断待ち':cash<canBegin.minimum?'資金待ち':'依頼済み';
 const waiting=['空き待ち','資金待ち','判断待ち'].includes(brief);
 const blockingReason=waiting?(canBegin.reason||brief):'';
 const mode=reservation.mode==='three'?'3回まで\n残り'+reservation.remaining+'回':reservation.mode==='continuous'?'続ける':'1回';
 const detail=mode+'\n'+brief+(reservation.stopAfter?'\n今回で終了':'')+(blockingReason&&blockingReason!==brief?'\n'+blockingReason:'');
 return {brief,detail,blockingReason};
}
