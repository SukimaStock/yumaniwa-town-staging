// Debug-only clock acceleration. No money, operation, generation or save shortcuts.
export const DEBUG_SKIP_YEARS=Object.freeze([10,20,30]);

export function monthsForDebugSkip(years){
 if(!DEBUG_SKIP_YEARS.includes(years))throw Error('年送りの期間を確認できません。');
 return years*12;
}

export function debugSkipBarrier(game,model){
 if(!game?.core||!Number.isInteger(game.core.month))return 'ゲームを開始してください。';
 if(game.tastingId!==null)return '試飲を終えてください。';
 if(game.decisions?.length)return 'たるの判断が必要です。';
 if(game.trade?.offer||game.shop?.offer||game.shop?.pendingOffers?.length)return '取扱いなどの申し出を確認してください。';
 if(model.generationStatus(game)?.phase!=='working')return '世代交代の確認が必要です。';
 if(game.still?.phase!=='ready'||game.core.spirit)return '蒸留またはたる詰めを終えてください。';
 if(['queued','active'].includes(game.usual?.reservation?.status)||model.canBeginUsual(game)?.ok)return '担当者の仕込みを確認してください。';
 return null;
}

// One and only one formally recorded monthly operation, preserving native order.
// The caller is responsible for saving this result before using it as current game.
export function debugSkipMonth(game,model){
 const barrier=debugSkipBarrier(game,model);
 if(barrier)return {next:game,advanced:false,reason:barrier};
 const next=model.tickDistillery(game,game.core.month);
 if(next===game)return {next,advanced:false,reason:'月次処理が停止しました。'};
 if(!Array.isArray(next.operations)||next.operations.length!==game.operations.length+1)
  throw Error('月次の正式操作が1件であることを確認できません。');
 const delta=next.core.month-game.core.month;
 if(delta!==0&&delta!==1)throw Error('月次進行の増分が不正です。');
 return {next,advanced:delta===1,reason:delta===0?'資金などの条件により月が進みませんでした。':null};
}
