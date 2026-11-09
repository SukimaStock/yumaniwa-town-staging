// Issue #889 stage 1. Only explicit user-selected files enter staging-only IDB.
// The existing browser save is not accessed, changed or deleted.
import {readSession,serializeSession} from './development-save.mjs?v=bar-v01-1';
import * as D from './partner-orders.mjs?v=all-stores-s2-1';
import {PARALLEL_PARAMETERS as T} from './economy-parameters.mjs?v=0.7';
import {openStagingIdb,closeStagingIdb,readStagingRecord,writeStagingRecord} from './formal-idb-storage.mjs?v=p0-1';
const $=id=>document.getElementById(id);
const status=$('status');
let busy=false;
const setStatus=text=>{status.textContent=text;};
const options={enabled:true,restore:D.restoreDistillery,monthMs:T.monthMs,stepMs:T.distillStepMs};
function verifyFormalRecord(text){
 const session=readSession(text,options);
 const next=serializeSession(session.game,{
  userPaused:session.userPaused,elapsed:session.elapsed,caskSlots:session.caskSlots,
  recentLedger:session.recentLedger,historyRecord:session.historyRecord,recallRecord:session.recallRecord
 },{...options,serialize:D.serializeDistillery});
 if(next!==text)throw new Error('正式な保存データに復元した結果が一致しません。');
 return session.game.core.month;
}
async function withDb(callback){
 const db=await openStagingIdb({onBlocked:()=>setStatus('別の画面がデータベースを使用しています。そちらを閉じてください。')});
 try{return await callback(db);}finally{closeStagingIdb(db);}
}
async function run(action){
 if(busy)return;busy=true;
 $('write').disabled=true;$('verify').disabled=true;
 try{await action();}
 catch(error){setStatus('検証を完了できませんでした。\n'+(error?.message??'予期しないエラー')+'\n元の記録と現在のゲームは変更していません。');}
 finally{busy=false;$('write').disabled=false;$('verify').disabled=false;}
}
$('write').addEventListener('click',()=>run(async()=>{
 const file=$('file').files?.[0];
 if(!file){setStatus('まず元のv8 JSONファイルを選んでください。');return;}
 setStatus('元の記録を検証しています。端末内だけで処理します。');
 const raw=await file.text();
 const month=verifyFormalRecord(raw);
 setStatus('正式な記録を確認しました。\nIndexedDBへコピーして読み戻します。');
 await withDb(async db=>{
  const previous=await readStagingRecord(db,{reader:verifyFormalRecord});
  if(previous?.record.text===raw){
   setStatus('保存済みの検証用記録と完全一致しました。\n'+month+'か月目 / 世代 '+previous.record.revision+'\n元のゲームの保存は変更していません。');
   return;
  }
  if(previous&&!$('replace').checked){
   setStatus('別の検証用記録がすでにあります。\n更新する場合は確認欄をチェックしてください。\n元のゲームの保存は変更していません。');return;
  }
  const result=await writeStagingRecord(db,raw,{expectedRevision:previous?.record.revision??0,reader:verifyFormalRecord});
  setStatus('IndexedDBへの書込み・読戻しが一致しました。\n'+month+'か月目 / 世代 '+result.revision+'\nページを閉じて再び開き、「保存済み記録を読み直す」でcold確認してください。\nゲーム本編の保存先はまだ変更していません。');
 });
}));
$('verify').addEventListener('click',()=>run(async()=>{
 setStatus('IndexedDBの記録を正式readerで検証しています。');
 await withDb(async db=>{
  const current=await readStagingRecord(db,{reader:verifyFormalRecord,allowPrevious:true});
  if(!current){setStatus('検証用IndexedDBに記録はありません。');return;}
  const month=verifyFormalRecord(current.record.text);
  setStatus((current.source==='previous'?'注意：最新世代が不正なため、ひとつ前の正常記録を読めました。現在の保存は変更していません。':'保存されたv8記録の完全照合が成功しました。')+
   '\n'+month+'か月目 / 世代 '+current.record.revision+
   '\n原文・hash・正式reader・再シリアライズが一致しました。\nゲーム本編の保存先はまだ変更していません。');
 });
}));
