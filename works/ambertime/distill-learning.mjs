// Read-only tutorial projection from an already validated formal game journal.
// Manual completion records `stop`. Automatic distillation removes its internal
// stop/fill records and records `complete-usual` instead. Migration resets only
// the new journal and retains the prior one verbatim in origin; generation
// handover keeps the journal. No preference, counter, replay or storage is used.
export function manualCompletedRuns(state){
 let count=0;const seen=new Set();
 for(let s=state;s;s=s.origin){
  if(seen.has(s)||!Array.isArray(s.operations))throw Error('手動蒸留の正式な履歴を確認できません。');
  seen.add(s);
  for(const operation of s.operations)if(operation.key==='stop'&&++count===3)return 3;
 }
 return count; // 0, 1, 2, or exactly the tutorial threshold 3 (three or more).
}
