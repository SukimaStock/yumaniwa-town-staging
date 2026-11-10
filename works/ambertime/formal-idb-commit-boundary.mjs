// AmberTime #889 phase 2: isolated async commit boundary.
// NOT wired into shop-app.mjs yet. This does not read/write either storage API.
// Future callers must build a detached candidate and publish it only in apply().
const error=(code,message)=>Object.assign(new Error(message),{code});
const validRevision=revision=>Number.isSafeInteger(revision)&&revision>=0;

export class FormalIdbCommitBoundary {
 #write;
 #onHalt;
 #revision;
 #busy=false;
 #state='ready';
 #fault=null;
 #epoch=0;

 constructor({write,revision,onHalt=()=>{}}={}){
  if(typeof write!=='function'||!validRevision(revision)||typeof onHalt!=='function')
   throw error('invalid-boundary','保存制御の初期状態を確認できません。');
  this.#write=write;
  this.#revision=revision;
  this.#onHalt=onHalt;
 }

 get status(){
  return Object.freeze({state:this.#state,busy:this.#busy,revision:this.#revision,
    fault:this.#fault&&Object.freeze({code:this.#fault.code??'error',message:this.#fault.message})});
 }

 halt(reason=error('interrupted','保存の確認が必要です。')){
  if(this.#state==='halted')return;
  const fault=reason instanceof Error?reason:error('interrupted',String(reason));
  this.#state='halted';
  this.#fault=fault;
  this.#epoch++;
  try{this.#onHalt(fault);}catch{ /* never hide the storage failure */ }
 }

 // A save is a single action transaction, not a queue of possibly stale actions.
 // prepare MUST be synchronous and must not mutate the currently committed game.
 // write MUST resolve only after the native IDB transaction and exact readback.
 // apply MUST synchronously publish the detached candidate once.
 async commit({prepare,apply}={}){
  if(this.#state!=='ready')throw error('storage-halted','保存を再確認してください。');
  if(this.#busy)throw error('pending-save','保存が完了していません。');
  if(typeof prepare!=='function'||typeof apply!=='function')
   throw error('invalid-action','保存の操作を確認できません。');

  this.#busy=true;
  const epoch=this.#epoch;
  const expectedRevision=this.#revision;
  try{
   const candidate=prepare();
   if(!candidate||typeof candidate!=='object'||typeof candidate.then==='function'||
      typeof candidate.text!=='string'||candidate.text.length===0)
    throw error('invalid-candidate','保存候補が不正です。');
   const receipt=await this.#write(candidate.text,{expectedRevision});
   if(this.#state!=='ready'||epoch!==this.#epoch)
    throw error('interrupted','保存中に画面が中断されました。最新の記録を読み直してください。');
   if(!receipt||receipt.revision!==expectedRevision+1||!validRevision(receipt.revision))
    throw error('invalid-receipt','保存世代の確定を確認できません。');
   // At this point the stored record exists. Do not roll back IDB if UI apply fails.
   this.#revision=receipt.revision;
   const result=apply(candidate,receipt);
   if(result&&typeof result.then==='function')
    throw error('async-apply','保存結果を同期的に反映できませんでした。');
   return receipt;
  }catch(cause){
   this.halt(cause);
   throw cause;
  }finally{
   this.#busy=false;
  }
 }
}
