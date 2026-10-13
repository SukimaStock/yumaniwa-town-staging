/* Feel Bridge 1: optional transport only. The work owns its loop, input and renderer. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
function connect(api){
 let nonce=null,disposed=false,queue=Promise.resolve(),editing=false;
 const send=(type,data={})=>{if(nonce&&!disposed)root.parent.postMessage({protocol:'feel-frame/2',nonce,type,...data},'*');};
 const capabilities={play:typeof api.play==='function',pause:typeof api.pause==='function',reset:typeof api.reset==='function',state:typeof api.getState==='function'&&typeof api.restoreState==='function',edit:typeof api.getEditableElements==='function'&&typeof api.applyEdit==='function'&&typeof api.beginEdit==='function'&&typeof api.endEdit==='function'&&typeof api.getState==='function'&&typeof api.restoreState==='function',record:false};
 const elements=()=>capabilities.edit?clone(api.getEditableElements()):[];
 const changed=phase=>{if(!nonce||!capabilities.state)return;send(phase==='begin'?'edit-begin':phase==='end'?'edit-end':'edit',{config:clone(api.getState())});if(phase!=='begin')send('elements',{elements:elements()});};
 async function handle(m){
  if(m.type==='init'){if(nonce||typeof m.nonce!=='string'||m.nonce.length>100)return;nonce=m.nonce;if(capabilities.state)await api.restoreState(clone(m.config));send('ready',{capabilities,elements:elements(),comparison:api.getComparisonInfo?.()||''});return;}
  if(!nonce||m.nonce!==nonce)return;
  if(m.type==='pause'&&capabilities.pause){await api.pause(!!m.value);if(!m.value&&capabilities.play)await api.play();}
  if(m.type==='reset'&&capabilities.reset)await api.reset();
  if(m.type==='config'&&capabilities.state){await api.restoreState(clone(m.config));send('elements',{elements:elements()});}
  if(m.type==='get-state'&&capabilities.state)changed('end');
  if(m.type==='edit-mode'&&capabilities.edit){editing=!!m.value;if(editing)await api.beginEdit(null);else await api.endEdit(null);send('elements',{elements:elements()});}
  if(['begin-edit','apply-edit','end-edit'].includes(m.type)&&capabilities.edit&&editing){
   const target=elements().find(e=>e.id===m.id);if(!target)throw Error('編集対象がありません');
   if(m.type==='begin-edit'){await api.beginEdit(m.id);changed('begin');}
   if(m.type==='apply-edit'){await api.applyEdit(m.id,clone(m.change));changed('move');}
   if(m.type==='end-edit'){await api.endEdit(m.id);changed('end');}
  }
 }
 const listener=e=>{if(disposed||e.source!==root.parent||e.data?.protocol!=='feel-frame/2')return;queue=queue.then(()=>handle(e.data)).catch(error=>send('error',{message:String(error.message).slice(0,300)}));};
 root.addEventListener('message',listener);
 return{changed,dispose(){disposed=true;root.removeEventListener('message',listener);},isConnected:()=>nonce!==null};
}
const api={connect};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FeelBridge=api;
})(typeof window!=='undefined'?window:globalThis);
