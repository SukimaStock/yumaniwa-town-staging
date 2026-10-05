let worker=null,sequence=0;const pending=new Map();
export function convertKana(kana){
  if(!worker){
    worker=new Worker(new URL('./mozc-worker.mjs',import.meta.url));
    worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;clearTimeout(p.timer);pending.delete(data.id);data.error?p.reject(new Error(data.error)):p.resolve(data.result);};
    worker.onerror=()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('漢字変換を読み込めませんでした。候補を更新して再試行してください。'));}pending.clear();worker.terminate();worker=null;};
  }
  const id=++sequence;
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('漢字変換の読み込みが時間切れになりました。候補を更新して再試行してください。'));},90000);pending.set(id,{resolve,reject,timer});worker.postMessage({id,kana});});
}
