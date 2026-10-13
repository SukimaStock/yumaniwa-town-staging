(function(root){'use strict';
const local=p=>typeof p==='string'&&/^(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.(?:html|js|css|json|png|jpg|svg|woff2)$/.test(p)&&!p.split('/').some(x=>x==='.'||x==='..');
function sourcePath(b){return b.source||b.url.replace('index.html','model.js');}
function validateBuild(b){
 if(!b||!/^[a-z0-9_-]{1,90}$/.test(b.id)||!/^[a-f0-9]{64}$/.test(b.codeHash))throw Error('未登録の実装です');
 if(b.runtime==='feel-frame/2.0.0')return /^builds\/[a-z0-9-]+\/index.html$/.test(b.url);
 if(!['feel-bridge/1','html-isolated/1'].includes(b.runtime)||!local(b.url)||!local(sourcePath(b))||!b.url.endsWith('/index.html')||!Array.isArray(b.dependencies)||b.dependencies.length>50||!/^\d+\.\d+\.\d+$/.test(b.version))return false;
 return b.dependencies.every(a=>local(a.path)&&/^[a-f0-9]{64}$/.test(a.sha256));
}
function elements(value){
 if(!Array.isArray(value)||value.length>30)throw Error('編集宣言が不正です');const seen=new Set();
 return value.map(e=>{if(!e||typeof e.id!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(e.id)||seen.has(e.id)||typeof e.label!=='string'||e.label.length>80)throw Error('編集宣言が不正です');seen.add(e.id);const apply=e.apply||'restart';if(!['live','restart','rebuild'].includes(apply))throw Error('適用方法が不正です');const meta={apply,group:String(e.group||'調整').slice(0,40),hint:String(e.hint||'').slice(0,150)};
  if(apply==='rebuild')return{...meta,id:e.id,label:e.label,type:'rebuild'};
  if(e.type==='boolean'){if(typeof e.value!=='boolean')throw Error('オン・オフの値が不正です');return{...meta,id:e.id,label:e.label,type:e.type,value:e.value};}
  if(e.type==='color'){if(!/^#[a-f0-9]{6}$/i.test(e.value))throw Error('色が不正です');return{...meta,id:e.id,label:e.label,type:e.type,value:e.value};}
  if(e.type==='choice'){if(!Array.isArray(e.options)||!e.options.length||e.options.length>20||!e.options.every(o=>o&&typeof o.value==='string'&&o.value.length<100&&typeof o.label==='string'&&o.label.length<80)||!e.options.some(o=>o.value===e.value))throw Error('選択肢が不正です');return{...meta,id:e.id,label:e.label,type:e.type,value:e.value,options:e.options.map(o=>({value:o.value,label:o.label}))};}
  if(e.control==='work')return{...meta,id:e.id,label:e.label,type:e.type,control:'work',hint:String(e.hint||'作品内で直接操作').slice(0,150)};
  if(e.type==='position'){if(!e.screen||![e.screen.x,e.screen.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('画面位置が不正です');return{...meta,id:e.id,label:e.label,type:e.type,screen:e.screen};}
  if(['range','timing','value'].includes(e.type)){if(![e.min,e.max,e.step,e.value].every(Number.isFinite)||e.max<=e.min||e.step<=0||e.value<e.min||e.value>e.max)throw Error('編集範囲が不正です');return{...meta,id:e.id,label:e.label,type:e.type,min:e.min,max:e.max,step:e.step,value:e.value,unit:String(e.unit||'').slice(0,10)};}
  return{...meta,id:e.id,label:e.label,type:'unsupported',hint:'この種類の共通操作UIは未対応です'};
 });
}
const api={local,sourcePath,validateBuild,elements};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FeelBridgeHost=api;
})(typeof window!=='undefined'?window:globalThis);
