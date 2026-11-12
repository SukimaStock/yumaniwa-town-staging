// Test-only immutable oracle; never imported by the game.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const SHA='0ef9ba32c72e0fcb87f5ed748c47865db099adb6';
export async function load(url,context,nextLoad){
 const result=await nextLoad(url,context);if(!url.startsWith('file:')||result.format!=='module')return result;
 const u=new URL(url);let source=String(result.source),changed=false;
 if(u.pathname.endsWith('/works/ambertime/partner-orders.mjs')&&u.searchParams.has('copy-v07-baseline')){
  source=execFileSync('git',['show',SHA+':works/ambertime/partner-orders.mjs'],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});changed=true;
 }
 if(u.pathname.endsWith('/works/ambertime/economy.mjs')){
  for(const [name,marker] of [['fill','export function fillBarrel(s,type){'],['bottle','export function bottleNow(s,id,{automatic=false,directSale=false,count=null}={}){']]){
   if(!source.includes(marker))throw Error('copy-v07 injection anchor absent: '+name);
   source=source.replace(marker,marker+`globalThis.__copyV07Fault?.(${JSON.stringify(name)});`);changed=true;
  }
 }
 return changed?{...result,source}:result;
}
