'use strict';
const fs=require('node:fs'),path=require('node:path');
const BASE='https://sukimastock.github.io/yumaniwa-town/';
function readStandalonePages(root){
 const file=path.join(root,'data/standalone-pages.json');if(!fs.existsSync(file))return [];
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 if(data.schema!=='yumaniwa-standalone-pages/1'||!Array.isArray(data.pages))throw new Error('invalid standalone publication manifest');
 const seen=new Set();
 return data.pages.map(p=>{
  if(!p||!/^[-a-z0-9]+$/.test(p.id)||p.path!=='works/'+p.id||seen.has(p.id)||!['candidate','released'].includes(p.status)||!/^[a-f0-9]{40}$/.test(p.sourceSha)||typeof p.candidateDecision!=='string'||!p.candidateDecision.trim()||typeof p.productionInstruction!=='string'||!p.productionInstruction.trim()||p.candidateDecision.trim()===p.productionInstruction.trim())throw new Error('invalid or unauthorized standalone page');
  seen.add(p.id);return {...p,url:BASE+p.path+'/'};
 });
}
function validateStandaloneHtml(root,p){
 const file=path.join(root,p.path,'index.html');if(!fs.existsSync(file))throw new Error('missing standalone HTML: '+p.path);
 const html=fs.readFileSync(file,'utf8'),head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
 const canonical=[...head.matchAll(/<link\b[^>]*>/gi)].filter(m=>/rel=["']canonical["']/i.test(m[0]));
 if(canonical.length!==1||!canonical[0][0].includes('href="'+p.url+'"'))throw new Error('standalone canonical mismatch: '+p.id);
 if(/<meta\b[^>]*(?:name=["'](?:robots|googlebot)["'][^>]*content=["'][^"']*noindex|content=["'][^"']*noindex[^>]*name=["'](?:robots|googlebot)["'])/i.test(head))throw new Error('standalone noindex: '+p.id);
 if(!/<title>[^<]+<\/title>/i.test(head)||!/<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(head))throw new Error('standalone metadata missing: '+p.id);
}
module.exports={readStandalonePages,validateStandaloneHtml};
