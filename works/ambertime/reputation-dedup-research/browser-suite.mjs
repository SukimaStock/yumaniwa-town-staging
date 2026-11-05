// H1-B1 IO only: never access the game's key or shared user profile.
export const KEY='ambertime-h1-b1-research-save';
export const sha=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function read(){const raw=localStorage.getItem(KEY);return {exists:raw!==null,hash:raw===null?null:await sha(raw),codeUnits:raw?.length??0};}
export async function save(url){
 const wire=await(await fetch(url)).text(),text=JSON.stringify({version:2,game:JSON.parse(wire),userPaused:false,elapsed:0});
 const old=localStorage.getItem(KEY);let error=null;const begin=performance.now();try{localStorage.setItem(KEY,text);}catch(e){error={name:e.name,message:e.message};}const setMs=performance.now()-begin,t=performance.now(),got=localStorage.getItem(KEY),getMs=performance.now()-t;
 return {success:error===null&&got===text,error,setMs,getMs,oldRetained:error?got===old:null,hash:await sha(text),readHash:got===null?null:await sha(got),codeUnits:text.length,utf8Bytes:new TextEncoder().encode(text).length,estimate:await navigator.storage?.estimate?.()};
}
export async function quota(){
 let low=0,high=8*1024*1024;const attempts=[];while(high-low>1024){const n=Math.floor((low+high)/2),before=localStorage.getItem(KEY);let error=null;try{localStorage.setItem(KEY,'x'.repeat(n));}catch(e){error=e.name;}const got=localStorage.getItem(KEY);if(error){if(got!==before)throw Error('failed native write lost old value');high=n;}else{if(got.length!==n)throw Error('native write mismatch');low=n;}attempts.push({codeUnits:n,error});}return {largestSuccessCodeUnits:low,smallestFailureCodeUnits:high,keyCodeUnits:KEY.length,precisionCodeUnits:1024,nativeQuotaExceeded:attempts.some(x=>x.error==='QuotaExceededError'),attempts};
}
