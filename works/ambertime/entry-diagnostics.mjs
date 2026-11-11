// A failure-only projection. Never serialize a session or expose its raw fields.
export const ENTRY_DIAGNOSTIC_BUILD='entry-diagnostics-20261111-r4';
const formalKey='sukimastock.ambertime.main.v1';
const legacyKeys=['sukimastock.ambertime.placement-trial.v1','sukimastock.ambertime.wholesale.v20'];
const backupPrefix=formalKey+'.before-market-rules.v1.';
const operations={
 'new-title':'はじめから','new-menu':'ゲーム内からの新規開始',new:'はじめから',
 continue:'つづきから','title-inspect':'起動時の記録確認',preview:'試遊の新規開始',
};
const stages={
 'record-check':'記録確認','record-recheck':'正式領域の再照合','candidate-create':'候補作成',
 'candidate-validation':'候補検証','continue-restore':'継続復元','backup-check':'バックアップ確認',
 'backup-write':'バックアップ書込み','backup-readback':'バックアップ読戻し',
 'formal-write':'正式書込み','formal-readback':'正式読戻し',install:'本編適用',apply:'本編適用','session-apply':'本編適用',
 'preparation-ui':'準備画面の表示','writing-ui':'保存中画面の表示','completion-ui':'終了画面の表示',finalize:'終了処理',
};
const stateLabels={unchanged:'処理前と同じ原文（復元可能とは限りません）',uncertain:'書込み結果が不確実',unavailable:'確認不能','candidate-verified':'候補の書込み・読戻し一致を確認'};
const moduleFiles={app:'shop-app.mjs',sessionEntry:'session-entry.mjs',diagnostics:'entry-diagnostics.mjs',model:'partner-orders.mjs',save:'development-save.mjs',recallOperations:'recall/operations.mjs',recallCollector:'recall/collector.mjs'};
// These are code-controlled dependency identifiers, never session values.
// Keep them exact even if a player's name happens to be "age" or "stage7".
const queryValues={
 night:['stage1'],reactions:['s1-1'],dialogue:['a6-1'],hiring:['s2-1'],staff:['s3-1'],package:['c1l-1'],'h4-2':['1'],'h3-3a':['1'],
 v:['market-layout-r1','all-stores-s2-1','bar-v01-1','entry-diagnostics-20261111-r1','entry-diagnostics-20261111-r2','entry-diagnostics-20261111-r4'],rooms:['stage3-r1'],touch:['1'],status:['1'],aging:['1'],
 readout:['r1-1'],geometry:['r2-1'],preparation:['r3-1'],warehouse:['r4-1'],history:['r5-1'],experience:['a2-2'],quantity:['a3-1'],
 save:['h1-b2-2'],startup:['s1-slots-1'],ledger:['s2-1'],saveDev:['s4-1'],debug:['a4-2'],firstBottle:['a5-1','a5-1\\'],bar:['1'],scroll:['s1-1'],
 'dialogue-s2':['1'],fix:['ui-dialogue-notices-20261108'],m0:['m09-corners-r1'],m07:['map-stability-r1'],daily:['v01'],motion:['v02'],traffic:['1'],
 regional:['regional-v01'],delivery:['regional-delivery-v01'],map:['map-partners-v01'],scenery:['map-scenery-v01'],world:['world-network-v01'],restore:['stage7-v01'],
 repair:['ui4-20261111','entry-diagnostics-20261111-r1','entry-diagnostics-20261111-r2','entry-diagnostics-20261111-r4'],
};
function safeVersion(key,value){
 if(key==='formalFormat')return Number.isInteger(value)&&value>=1&&value<=99?value:undefined;
 if(key==='worldCreatorPresent')return typeof value==='boolean'?value:undefined;
 if(['appBuild','sessionEntryBuild','diagnosticsBuild'].includes(key))return typeof value==='string'&&/^(?:entry-diagnostics-\d{8}-r\d+|ui[34]-\d{8})$/.test(value)?value:undefined;
 if(!Object.hasOwn(moduleFiles,key)||typeof value!=='string'||value.length>2000)return undefined;
 try{
  const url=new URL(value),host=url.hostname;
  if(url.username||url.password||url.hash||!['https:','http:'].includes(url.protocol))return undefined;
  const base=host==='sukimastock.github.io'&&url.protocol==='https:'?'/yumaniwa-town-staging/works/ambertime/':host==='localhost'||host==='127.0.0.1'?'/works/ambertime/':null;
  if(!base||url.pathname!==base+moduleFiles[key])return undefined;
  for(const [name,version] of url.searchParams)if(!Object.hasOwn(queryValues,name)||!queryValues[name].includes(version))return undefined;
  return value;
 }catch{return undefined;}
}
const get=(value,key,fallback='')=>{try{return value?.[key]??fallback;}catch{return fallback;}};
const text=value=>typeof value==='string'?value:typeof value==='number'?String(value):'';

function privateStrings(raw,message){
 if(typeof raw!=='string')return [];
 const found=[];
 if(raw&&message.includes(raw))found.push(raw);
 try{
  const pending=[JSON.parse(raw)];
  while(pending.length){
   const value=pending.pop();
   if(typeof value==='string'){if(value&&message.includes(value))found.push(value);}
   else if(value&&typeof value==='object')for(const child of Object.values(value))pending.push(child);
  }
 }catch{
  // Even an invalid envelope can contain a complete quoted player name that
  // a parser reports without quotes. Extract strings without repairing input.
  for(const match of raw.matchAll(/"(?:\\.|[^"\\])*"/g))try{const value=JSON.parse(match[0]);if(value&&message.includes(value))found.push(value);}catch{}
 }
 return found;
}
function redact(value,secrets,limit=600){
 let message=text(value);
 for(const secret of secrets)message=message.split(secret).join('[記録の文字列]');
 // Browser JSON errors may include a quoted fragment of otherwise unreadable
 // input. Stack output is omitted entirely, including its repeated first line.
 message=message.replace(/(["'`「『]).*?(?:["'`」』]|$)/gs,'[引用部分省略]');
 message=message.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
 return message.length>limit?message.slice(0,limit)+'…':message;
}
function sizes(snapshot,storage){
 let raw,readable=false;try{if(snapshot&&Object.hasOwn(snapshot,'raw')){raw=snapshot.raw;readable=true;}}catch{}
 const legacy=get(snapshot,'legacy',[]),known=readable&&(raw===null||typeof raw==='string');
 const summary={beforeCharacters:known?(typeof raw==='string'?raw.length:0):null,legacyRecords:known?0:null,legacyCharacters:known?0:null,backupRecords:null,backupCharacters:null,inspection:'not-requested'};
 if(Array.isArray(legacy))for(const row of legacy){if(legacyKeys.includes(get(row,'key'))&&typeof get(row,'raw',null)==='string'){summary.legacyRecords++;summary.legacyCharacters+=row.raw.length;}}
 if(!storage)return summary;
 try{
  const length=storage.length;
  if(!Number.isInteger(length)||length<0){summary.inspection='unavailable';return summary;}
  let count=0,characters=0;
  for(let i=0;i<length;i++){
   const key=storage.key(i);
   if(typeof key!=='string'||!key.startsWith(backupPrefix))continue;
   const value=storage.getItem(key);if(typeof value!=='string')throw Error('unavailable');
   count++;characters+=value.length;
  }
  summary.backupRecords=count;summary.backupCharacters=characters;summary.inspection='complete';
 }catch{summary.inspection='unavailable';}
 return summary;
}
export function makeEntryDiagnostic({operation,stage,error,formalState='unavailable',backupPresent=false,backupVerified=false,writeVerified=false,restoreValidated=false,versions={},snapshot=null,candidateText=null,storage=null}={}){
 const legacy=get(snapshot,'legacy',[]),raws=[get(snapshot,'raw',null),candidateText,...(Array.isArray(legacy)?legacy.filter(row=>legacyKeys.includes(get(row,'key'))).map(row=>get(row,'raw',null)):[])];
 const original={name:text(get(error,'name','Error')),code:text(get(error,'code','')),message:text(get(error,'message','エラーの詳細を取得できません。'))};
 const combined=[original.name,original.code,original.message].join('\n');
 const secrets=[...new Set(raws.flatMap(raw=>privateStrings(raw,combined)))].sort((a,b)=>b.length-a.length);
 const safeVersions={diagnosticsBuild:ENTRY_DIAGNOSTIC_BUILD};
 for(const [key,value] of Object.entries(versions??{})){const safe=safeVersion(key,value);if(safe!==undefined)safeVersions[key]=safe;}
 const name=redact(original.name,secrets,80),code=redact(original.code,secrets,80);
 return {
  version:1,operation:Object.hasOwn(operations,operation)?operation:'unknown',stage:Object.hasOwn(stages,stage)?stage:'unknown',
  exception:{name:name||'Error',code,message:redact(original.message,secrets)},
  versions:safeVersions,formalState:Object.hasOwn(stateLabels,formalState)?formalState:'unavailable',
  protection:{backupPresent:!!backupPresent,readbackMatched:!!backupVerified},
  writeVerified:!!writeVerified,restoreValidated:!!restoreValidated,sizes:sizes(snapshot,storage),
 };
}
export function formatEntryDiagnostic(diagnostic){
 const d=diagnostic,e=d.exception;
 return [
  '操作: '+(operations[d.operation]??'不明'),
  '失敗段階: '+(stages[d.stage]??'不明')+' ['+d.stage+']',
  '例外 name: '+e.name,'例外 code: '+(e.code||'なし'),'例外 message: '+e.message,
  '保存状態: '+stateLabels[d.formalState],
  (d.operation==='continue'?'継続記録の正式reader検証完了: ':'新規候補の正式保存検証完了: ')+(d.restoreValidated?'はい':'いいえ'),
  '候補の正式書込み・読戻し一致: '+(d.writeVerified?'確認済み':'未確認'),
  '原文バックアップ: '+(d.protection.backupPresent?'あり':'未確認'),
  'バックアップ読戻し一致: '+(d.protection.readbackMatched?'確認済み':'未確認'),
  '処理前の正式原文: '+(d.sizes.beforeCharacters===null?'確認不能':d.sizes.beforeCharacters+'文字'),
  '旧開発版の原文: '+(d.sizes.legacyRecords===null?'確認不能':d.sizes.legacyRecords+'件 / '+d.sizes.legacyCharacters+'文字'),
  '保護済み原文: '+(d.sizes.inspection==='complete'?d.sizes.backupRecords+'件 / '+d.sizes.backupCharacters+'文字':'件数・文字数は確認できません'),
  '実行版:',...Object.entries(d.versions).map(([key,value])=>key+': '+value),
 ].join('\n');
}
