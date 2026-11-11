import {FORMAL_SAVE_KEY} from './development-save.mjs?v=bar-v01-1';

const prefix=FORMAL_SAVE_KEY+'.before-market-rules.v1.';
const require=(value,message)=>{if(!value)throw Error(message);};
export const isProtectedBackupKey=key=>typeof key==='string'&&key.startsWith(prefix)&&/^\d+\.[0-9a-f]+$/.test(key.slice(prefix.length));
// This controller never writes a replacement save. Removal is limited to one
// existing backup, after exact external-file proof and a separate user choice.
export function createVerifiedBackupCleanup({storage,key}){
 require(isProtectedBackupKey(key),'この記録は整理対象ではありません。');
 const expected=storage.getItem(key);
 require(typeof expected==='string','保護した原文を確認できません。');
 let epoch=0,verified=false,removed=false;
 const cancel=()=>{epoch++;verified=false;};
 async function verify(file){
  cancel();const own=epoch;
  require(file&&typeof file.text==='function','書き出したファイルを選んでください。');
  const text=await file.text();
  if(own!==epoch)return false;
  require(storage.getItem(key)===expected,'保護記録が変わりました。もう一度開いてください。');
  require(text===expected,'この保護記録とファイルの原文が一致しません。削除していません。');
  verified=true;return true;
 }
 function remove(confirm){
  require(!removed&&verified,'書出しファイルとの一致を先に確認してください。');
  require(storage.getItem(key)===expected,'保護記録が変わりました。削除していません。');
  const own=epoch;
  if(!confirm('書出しファイルと一致した保護記録（'+expected.length+'文字）を、この端末から削除します。ファイルは保管してください。今の正式保存は変更しません。'))return false;
  // Confirmation may yield to other tabs. Compare again immediately before the
  // one permitted removal. Never remove formal, legacy or another work's key.
  require(verified&&own===epoch,'照合が取り消されました。削除していません。');
  require(storage.getItem(key)===expected,'保護記録が変わりました。削除していません。');
  verified=false;epoch++;
  storage.removeItem(key);
  require(storage.getItem(key)===null,'削除結果を確認できません。照合済みファイルは保管してください。');
  removed=true;return true;
 }
 return {verify,remove,cancel,get verified(){return verified;},characters:expected.length};
}

export function appendVerifiedBackupCleanup({document:doc,parent,storage,key,confirm}){
 if(!isProtectedBackupKey(key))return null;
 const controller=createVerifiedBackupCleanup({storage,key}),details=doc.createElement('details'),summary=doc.createElement('summary');
 summary.textContent='書出しを確認して、この保護記録を整理';details.className='protected-record-cleanup';details.append(summary);
 const copy=doc.createElement('p');copy.textContent='上のボタンで書き出したファイルを選び、原文の一致を確認します。';
 const choose=doc.createElement('button');choose.type='button';choose.textContent='書出したファイルを選んで照合';
 const input=doc.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;
 const status=doc.createElement('p');status.setAttribute('role','status');
 const remove=doc.createElement('button');remove.type='button';remove.textContent='照合済みの保護記録を端末から削除';remove.disabled=true;
 let request=0;
 choose.addEventListener('click',()=>input.click());
 input.addEventListener('change',async()=>{
  const own=++request,file=input.files?.[0];input.value='';remove.disabled=true;
  if(!file){controller.cancel();return;}
  status.textContent='ファイルの原文を照合しています。';
  try{if(await controller.verify(file)&&own===request){status.textContent=controller.characters+'文字の原文が一致しました。ファイルを保管してください。';remove.disabled=false;}}
  catch(error){if(own===request)status.textContent=error.message;}
 });
 details.addEventListener('toggle',()=>{if(!details.open){request++;controller.cancel();remove.disabled=true;status.textContent='';}});
 remove.addEventListener('click',()=>{
  try{
   if(controller.remove(confirm)){status.textContent='端末のこの保護記録を整理しました。ファイルは保管してください。「はじめから」で再確認できます。';remove.disabled=true;choose.disabled=true;}
   else status.textContent='削除を取り消しました。';
  }catch(error){remove.disabled=true;status.textContent=error.message;}
 });
 details.append(copy,choose,input,status,remove);parent.append(details);
 return {controller,details,input,choose,remove,status};
}
