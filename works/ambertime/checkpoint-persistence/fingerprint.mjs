// Conservative cache contract. Include dynamically loaded collector bodies and
// every recall/caption dependency, not only the formal replay model imports.
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../checkpoint-research/prototype.mjs';
const defaultRoot=fileURLToPath(new URL('../',import.meta.url));
export function dependencyManifest({root=defaultRoot}={}){
 const entries=[];
 function walk(directory,prefix=''){
  for(const item of readdirSync(directory,{withFileTypes:true})){
   if(item.name==='node_modules'||item.name==='.git')continue;
   const relative=prefix+item.name,path=resolve(directory,item.name);
   if(item.isDirectory())walk(path,relative+'/');
   else if(item.isFile()&&(item.name.endsWith('.mjs')||(relative.startsWith('chronicle-lab/')&&item.name.endsWith('.json'))||['save-audit/results.json','checkpoint-research/results.json'].includes(relative)))entries.push([relative,hash(readFileSync(path,'utf8'))]);
  }
 }
 walk(root);return entries.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
}
export const dependencyFingerprint=(modelFingerprint,options={})=>hash({schema:'ambertime-h1-a3-dependency-fingerprint/1',modelFingerprint,dependencies:dependencyManifest(options)});
