import fs from 'node:fs';
export const HISTORY_IMPORT="import {ledgerProfile,caskTimeline,recordTimeline,recordText} from './ledger-history-view.mjs?v=refactor-r5-1';\n";
export function extractFunction(source,name){
 const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let depth=0,quote=null,escape=false,line=false,block=false;
 for(let i=source.indexOf('{',start);i<source.length;i++){const c=source[i],next=source[i+1];if(line){if(c==='\n')line=false;continue;}if(block){if(c==='*'&&next==='/'){block=false;i++;}continue;}if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}if(c==='/'&&next==='/'){line=true;i++;continue;}if(c==='/'&&next==='*'){block=true;i++;continue;}if(c==="'"||c==='"'||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return source.slice(start,i+1);}throw Error(name);
}
export const sourceConst=(source,name)=>source.split('\n').find(x=>x.startsWith('const '+name+'=')||x.startsWith('export const '+name+'=')).replace(/^export /,'');
// Compatibility adapter for the pre-existing immutable R4 whole-root proof.
// Reinsert actual moved source, not expectations copied from an oracle.
export function inlineHistory(source,module=fs.readFileSync(new URL('../ledger-history-view.mjs',import.meta.url),'utf8')){
 if(!source.startsWith(HISTORY_IMPORT))throw Error('R5 history import missing');
 return source.slice(HISTORY_IMPORT.length)
 .replace('function linkedReleases(',sourceConst(module,'knownProfile')+'\n'+extractFunction(module,'ledgerProfile')+'\nfunction linkedReleases(')
 .replace('function finishLedgerTasting(',extractFunction(module,'caskTimeline')+'\nfunction finishLedgerTasting(')
 .replace('// Ledger formatting reads existing records only; stored prose is never rewritten.\n','// Ledger formatting reads existing records only; stored prose is never rewritten.\n'+sourceConst(module,'recordText')+'\n'+extractFunction(module,'recordTimeline')+'\n');
}
