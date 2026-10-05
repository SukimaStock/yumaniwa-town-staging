import { validateEntry } from './detection.mjs';
export const STORAGE_KEY='sukimastock.mixed-note.v1';
export const initialState=()=>({version:1,source:'',draft:'',dictionary:[],memory:{},lastSource:''});
export function readState(storage) {
  const empty=initialState();
  try {
    const raw=storage.getItem(STORAGE_KEY);
    if(!raw) return {state:empty,error:null};
    const data=JSON.parse(raw);
    if(data?.version!==1 || typeof data.source!=='string' || typeof data.draft!=='string' || !Array.isArray(data.dictionary) || !data.memory || typeof data.memory!=='object' || Array.isArray(data.memory)) throw Error('invalid');
    return {state:{...empty, source:data.source,draft:data.draft,lastSource:typeof data.lastSource==='string'?data.lastSource:'',
      dictionary:data.dictionary.filter(e=>e&&typeof e.raw==='string'&&typeof e.value==='string'&&!validateEntry(e.raw,e.value)).slice(0,500),
      memory:Object.fromEntries(Object.entries(data.memory).filter(([k,v])=>/^[a-z]{2,64}$/.test(k)&&['en','ja'].includes(v)).slice(-500))},error:null};
  } catch { return {state:empty,error:'保存済みデータを読めません。新しい入力は自動保存せず、書き出して保管してください。'}; }
}
export function writeState(storage,state) {
  try { storage.setItem(STORAGE_KEY,JSON.stringify(state)); return null; }
  catch { return 'このブラウザに保存できません。コピーか書き出しで保管してください。'; }
}
