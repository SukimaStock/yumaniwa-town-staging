const root='https://raw.githubusercontent.com/msonrm/hechima/5cab51b401b76d95aee1657eba2366cdc5d9bca5/site/public/vendor/hechima-wasm/';
const pins={
  'hechima-wasm.js':'919c95012901731ec490660b9e823d20998c658dba2d78a60119fa00438f8e7d',
  'hechima-wasm.wasm':'e0d3d7e7a84b8a4980626bf16f7404d7c65d67403b98da298f33690fd74a33a4',
  'mozc.data':'0a3eec3a34e7582c3519f05fb90d09158cd4b42d2668a7790288fb519b44b84f'
};
let engine=null;
async function asset(name){
  const response=await fetch(root+name,{credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw new Error('辞書・エンジンを読み込めません。通信を確認して候補を更新してください。');
  const bytes=await response.arrayBuffer();
  const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(sha!==pins[name])throw new Error('エンジンの整合性確認に失敗しました。');return bytes;
}
async function init(){
  const [js,wasm,data]=await Promise.all(Object.keys(pins).map(asset));
  // Classic worker loads only verified, pinned glue. No eval or input in asset URLs.
  const url=URL.createObjectURL(new Blob([js],{type:'text/javascript'}));
  try{importScripts(url);}finally{URL.revokeObjectURL(url);}
  const m=await self.HechimaModule({wasmBinary:wasm,printErr:()=>{}});
  m.FS.writeFile('/mozc.data',new Uint8Array(data));
  if(m.ccall('hechima_init','number',['string'],['/mozc.data'])!==0)throw new Error('漢字変換を起動できません。');
  return m;
}
self.onmessage=async({data:{id,kana}})=>{
  try{
    if(!engine)engine=init().catch(e=>{engine=null;throw e;});
    const m=await engine;
    const result=JSON.parse(m.ccall('hechima_convert','string',['string','number'],[kana,20]));
    self.postMessage({id,result});
  }catch(error){self.postMessage({id,error:error.message});}
};
