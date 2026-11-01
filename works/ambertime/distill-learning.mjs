// Presentation preference only. The host calls these methods after a successful
// manual start/result save; this module never reads or changes the game model.
const validKey=value=>typeof value==='string'&&value.length>0&&value.length<=512;
const empty=()=>({version:1,completedRuns:0,completedKeys:[],pending:null});
function readRecord(raw){
 if(typeof raw!=='string')return empty();
 try{
  const value=JSON.parse(raw);
  if(!value||value.version!==1||!Number.isInteger(value.completedRuns)||value.completedRuns<0||value.completedRuns>3||!Array.isArray(value.completedKeys)||value.completedKeys.length!==value.completedRuns||!value.completedKeys.every(validKey)||new Set(value.completedKeys).size!==value.completedKeys.length||value.pending!==null&&!validKey(value.pending)||value.completedKeys.includes(value.pending))return empty();
  return {version:1,completedRuns:value.completedRuns,completedKeys:[...value.completedKeys],pending:value.pending};
 }catch{return empty();}
}
export class DistillLearning{
 constructor({storage=null,key='sukimastock.ambertime.main.v1.distill-learning.v1',enabled=true}={}){
  this.enabled=enabled===true;this.storage=storage;this.key=validKey(key)?key:null;this.record=empty();
  if(this.enabled&&this.key){try{this.record=readRecord(this.storage?.getItem(this.key));}catch{/* Restricted storage must not block distillation. */}}
 }
 get completedRuns(){return this.enabled?this.record.completedRuns:0;}
 persist(){
  if(!this.enabled||!this.key)return;
  try{this.storage?.setItem(this.key,JSON.stringify(this.record));}catch{/* Keep this session's guidance usable without persistence. */}
 }
 start(batchKey){
  if(!this.enabled||!validKey(batchKey)||this.record.completedRuns>=3||this.record.completedKeys.includes(batchKey)||this.record.pending===batchKey)return false;
  this.record.pending=batchKey;this.persist();return true;
 }
 complete(batchKey){
  if(!this.enabled||!validKey(batchKey)||this.record.pending!==batchKey||this.record.completedKeys.includes(batchKey))return false;
  this.record.pending=null;
  if(this.record.completedRuns<3){this.record.completedKeys.push(batchKey);this.record.completedRuns=this.record.completedKeys.length;}
  this.persist();return true;
 }
 resetPending(){
  if(!this.enabled||this.record.pending===null)return false;
  this.record.pending=null;this.persist();return true;
 }
}
