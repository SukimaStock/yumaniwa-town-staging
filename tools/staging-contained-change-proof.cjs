#!/usr/bin/env node
'use strict';

// Proof only. NEVER a permission decision. Treat candidate changes as Git data.
// Keep this classifier entirely separate from the pinned new-work fast path.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {TextDecoder}=require('node:util');
const decoder=new TextDecoder('utf-8',{fatal:true});
const SHA=/^[0-9a-f]{40}$/i;
const WORK_ID=/^[a-z][a-z0-9-]{2,48}$/;
const SAFE_PART=/^[a-zA-Z0-9_.-]+$/;
const MAX_FILES=4;
const MAX_OLD_BYTES=512*1024;
const MAX_NEW_BYTES=2*1024*1024;
const MAX_TOTAL_BYTES=4*1024*1024;
const MAX_MODIFIED_LINES=120;
const MAX_MODIFIED_PATCH=16*1024;
const HISTORY_LIMIT=24;
const MAX_REGISTRY_BYTES=256*1024;

// Packaging/export, work registration and executable lifecycle files are not
// an innocent local animation/level tweak. Fall back to the full Plan path.
const PROTECTED_BASENAMES=/^(?:build[-_.].*|export[-_.].*|package\.json|package-lock\.json|manifest\.(?:json|webmanifest)|service-worker\.(?:js|mjs)|sw\.(?:js|mjs)|work-meta\.js|standalone-export\.json|ARCHIVE\.md|README\.md)$/i;
function git(root,args){
  const result=spawnSync('git',['-C',root,...args],{shell:false,maxBuffer:8*1024*1024});
  if(result.error||result.status!==0)throw new Error('GIT_COMMAND_FAILED');
  return result.stdout;
}
function readZ(buffer){
  let out=[],start=0;
  for(let i=0;i<buffer.length;i++){
    if(buffer[i]!==0)continue;
    out.push(decoder.decode(buffer.subarray(start,i)));
    start=i+1;
  }
  if(start!==buffer.length)throw new Error('UNTERMINATED_GIT_RECORD');
  return out;
}
function safeRelative(name){
  return name.split('/').every(piece=>piece&&piece!=='.'&&piece!=='..'&&
    !piece.startsWith('.')&&SAFE_PART.test(piece));
}
function blobEntry(root,commit,file){
  const raw=readZ(git(root,['ls-tree','-z','--full-tree',commit,'--',file]));
  if(raw.length!==1)return null;
  const tab=raw[0].indexOf('\t');
  if(tab<0||raw[0].slice(tab+1)!==file)throw new Error('BAD_TREE_ENTRY');
  const match=/^(100644|100755|120000|160000) (blob|commit) ([0-9a-f]{40})$/.exec(raw[0].slice(0,tab));
  if(!match)throw new Error('BAD_TREE_MODE');
  return {mode:match[1],type:match[2],oid:match[3]};
}
function byteSize(root,oid){
  const size=Number(git(root,['cat-file','-s',oid]).toString('ascii').trim());
  if(!Number.isSafeInteger(size)||size<0)throw new Error('BAD_BLOB_SIZE');
  return size;
}
function activeLifecycleAtBase(root,base,id){
  const entry=blobEntry(root,base,'data/work-lifecycle.json');
  if(!entry||entry.type!=='blob'||entry.mode!=='100644')return 'INVALID_LIFECYCLE';
  if(byteSize(root,entry.oid)>MAX_REGISTRY_BYTES)return 'INVALID_LIFECYCLE';
  let registry;
  try{
    registry=JSON.parse(decoder.decode(git(root,['cat-file','blob',entry.oid])));
  }catch(_){return 'INVALID_LIFECYCLE';}
  if(!registry||registry.schema!=='sukimastock-work-lifecycle/1'||
     !Array.isArray(registry.works)||registry.works.length>128)return 'INVALID_LIFECYCLE';
  const seenIds=new Set(),seenPaths=new Set();
  let record=null;
  for(const work of registry.works){
    if(!work||typeof work.id!=='string'||typeof work.path!=='string'||
       seenIds.has(work.id)||seenPaths.has(work.path))return 'INVALID_LIFECYCLE';
    seenIds.add(work.id);seenPaths.add(work.path);
    if(work.id===id||work.path==='works/'+id){
      if(record||work.id!==id||work.path!=='works/'+id)return 'INVALID_LIFECYCLE';
      record=work;
    }
  }
  if(!record||record.status!=='active')return 'WORK_NOT_ACTIVE';
  return null;
}
function classify({root,baseSha,headSha}){
  const deny=reason=>({eligible:false,reason});
  try{
    if(typeof root!=='string'||!root||!fs.statSync(root).isDirectory())return deny('INVALID_ROOT');
    if(!SHA.test(baseSha||'')||!SHA.test(headSha||'')||baseSha===headSha)return deny('INVALID_SHA');
    const base=git(root,['rev-parse','--verify',baseSha+'^{commit}']).toString('ascii').trim();
    const head=git(root,['rev-parse','--verify',headSha+'^{commit}']).toString('ascii').trim();
    if(base!==baseSha.toLowerCase()||head!==headSha.toLowerCase())return deny('SHA_MISMATCH');
    const ancestry=spawnSync('git',['-C',root,'merge-base','--is-ancestor',base,head],{shell:false});
    if(ancestry.status!==0)return deny('BASE_NOT_ANCESTOR');
    const status=readZ(git(root,['diff','--name-status','-z','--no-renames',base,head,'--']));
    if(status.length<2||status.length%2!==0)return deny('EMPTY_OR_MALFORMED_DIFF');
    if(status.length/2>MAX_FILES)return deny('TOO_MANY_FILES');

    const changed=[];
    let id=null,total=0;
    for(let i=0;i<status.length;i+=2){
      const action=status[i],filename=status[i+1];
      if(action!=='M'&&action!=='A')return deny('UNSAFE_DIFF_ACTION');
      const m=/^works\/([^/]+)\/(.+)$/.exec(filename);
      if(!m||!WORK_ID.test(m[1])||!safeRelative(m[2]))return deny('OUTSIDE_SINGLE_WORK');
      if(id&&id!==m[1])return deny('MULTIPLE_WORKS');
      id=m[1];
      const baseName=m[2].split('/').at(-1);
      if(PROTECTED_BASENAMES.test(baseName))return deny('PROTECTED_WORK_FILE');
      const after=blobEntry(root,head,filename);
      const before=blobEntry(root,base,filename);
      if(!after||after.mode!=='100644'||after.type!=='blob')return deny('NON_REGULAR_NEW_FILE');
      if(action==='M'&&(!before||before.mode!=='100644'||before.type!=='blob'))return deny('NON_REGULAR_OLD_FILE');
      if(action==='A'&&before)return deny('ADD_OVER_EXISTING_FILE');
      const beforeSize=before?byteSize(root,before.oid):0;
      const afterSize=byteSize(root,after.oid);
      if(beforeSize>MAX_OLD_BYTES||afterSize>(action==='A'?MAX_NEW_BYTES:MAX_OLD_BYTES))return deny('FILE_TOO_LARGE');
      total+=beforeSize+afterSize;
      if(total>MAX_TOTAL_BYTES)return deny('TOTAL_TOO_LARGE');
      changed.push({path:filename,action,before:before?.oid||null,after:after.oid});
    }
    if(!id||!blobEntry(root,base,'works/'+id+'/index.html'))return deny('NOT_AN_EXISTING_WORK');
    const workEntry=blobEntry(root,base,'works/'+id+'/index.html');
    if(workEntry.mode!=='100644'||workEntry.type!=='blob')return deny('UNSAFE_WORK_ENTRY');
    const lifecycleDenial=activeLifecycleAtBase(root,base,id);
    if(lifecycleDenial)return deny(lifecycleDenial);
    // Prevent small *file* size being a disguise for a sweeping whole-file rewrite.
    // Binary modifications are refused; binary additions stay scoped and size-limited.
    const stats=readZ(git(root,['diff','--numstat','-z','--no-renames',base,head,'--']));
    if(stats.length!==changed.length)return deny('NUMSTAT_COUNT_MISMATCH');
    const statsByFile=new Map();
    for(const row of stats){
      const m=/^(\d+|-)\t(\d+|-)\t(.+)$/.exec(row);
      if(!m||statsByFile.has(m[3]))return deny('BAD_NUMSTAT');
      statsByFile.set(m[3],{adds:m[1],dels:m[2]});
    }
    for(const item of changed){
      const s=statsByFile.get(item.path);
      if(!s)return deny('MISSING_NUMSTAT');
      if(item.action==='M'){
        if(s.adds==='-'||s.dels==='-')return deny('BINARY_MODIFICATION');
        if(Number(s.adds)>MAX_MODIFIED_LINES||Number(s.dels)>MAX_MODIFIED_LINES)return deny('BROAD_REWRITE');
        // A minified one-line source can hide an entire game rewrite behind
        // a tiny numstat. Bound the actual rendered diff, not just line count.
        const patch=git(root,['diff','--no-ext-diff','--no-color','--no-renames','--unified=0',base,head,'--',item.path]);
        if(patch.length>MAX_MODIFIED_PATCH)return deny('BROAD_PATCH');
      }
    }
    // Historical matches are *observations*, not authorization to change common UI.
    const ancestorList=git(root,['rev-list','--first-parent','--max-count='+HISTORY_LIMIT,base])
      .toString('ascii').trim().split('\n').filter(Boolean);
    const restores=[];
    for(const item of changed){
      if(item.action!=='M')continue;
      for(const ancestor of ancestorList.slice(1)){
        const historical=blobEntry(root,ancestor,item.path);
        if(historical?.mode==='100644'&&historical.type==='blob'&&historical.oid===item.after){
          restores.push(item.path);break;
        }
      }
    }
    return {eligible:true,reason:'BOUNDED_EXISTING_WORK',workId:id,files:changed.length,
      restoredPaths:restores,totalBytesInspected:total};
  }catch(_){
    return deny('GIT_OR_INPUT_ERROR');
  }
}
function main(args){
  const map={};
  if(args.length!==6)return 2;
  for(let i=0;i<args.length;i+=2){
    if(!['--root','--base','--head'].includes(args[i])||!args[i+1]||map[args[i]])return 2;
    map[args[i]]=args[i+1];
  }
  if(!map['--root']||!map['--base']||!map['--head'])return 2;
  const result=classify({root:path.resolve(map['--root']),baseSha:map['--base'],headSha:map['--head']});
  process.stdout.write(JSON.stringify(result)+'\n');
  return result.eligible?0:1;
}
if(require.main===module)process.exitCode=main(process.argv.slice(2));
module.exports={classify,main,safeRelative};
