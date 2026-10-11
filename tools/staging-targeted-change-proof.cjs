'use strict';

// Machine evidence only: neither a user decision nor a proof of game quality.
// Dependencies are pinned alongside this file in BOTH base-owned workflows.
const {classify:contained}=require('./staging-contained-change-proof.cjs');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {TextDecoder}=require('node:util');
const utf8=new TextDecoder('utf-8',{fatal:true});
const SHA=/^[a-f0-9]{40}$/;
const SAFE=/^works\/[a-z][a-z0-9-]{2,48}\/(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/;
// A conservative fallback signal, NOT a JavaScript semantic verifier. Review
// aliases/dynamic behavior in the actual diff; don't claim isolation proves them.
const CONTRACT=/(?:\b(?:localStorage|sessionStorage|indexedDB|cookie|caches|serviceWorker|fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|postMessage|parent|top|opener|eval|Function|import|export|require|Worker)\b|(?:save|storage|schema|migrat|persist|api|endpoint|token|auth)[\w-]*|https?:|\.\.\/|<script|\bon\w+\s*=|@import|url\s*\()/i;
const PACKAGING=/(?:^|\/)(?:build|export|package|manifest|service-worker|sw|work-meta|standalone-export|ARCHIVE|README)(?:[.-]|$)|\.(?:zip|tar|gz|webmanifest|py|sh|yml|yaml)$/i;
function git(root,args,input,env){
  const r=spawnSync('git',['-C',root,...args],{input,shell:false,maxBuffer:4*1024*1024,env:env?{...process.env,...env}:process.env});
  if(r.error||r.status!==0)throw new Error('GIT_FAILED');
  return utf8.decode(r.stdout);
}
function changed(root,base,head){
  const rows=git(root,['diff','--name-status','-z','--no-renames',base,head]).split('\0');
  if(rows.pop()!==''||rows.length%2)throw new Error('BAD_DIFF');
  return Array.from({length:rows.length/2},(_,i)=>({action:rows[2*i],path:rows[2*i+1]}));
}
function patch(root,base,head,file){
  return git(root,['diff','--no-ext-diff','--no-textconv','--no-color','--no-renames','--unified=0',base,head,'--',file]);
}
function changedText(diff){
  return diff.split('\n').filter(l=>/^[+-]/.test(l)&&!/^--- |^\+\+\+ /.test(l)).map(l=>l.slice(1)).join('\n');
}
function entry(root,sha,file){
  const row=git(root,['ls-tree',sha,'--',file]).trim();
  const m=/^100644 blob ([a-f0-9]{40})\t(.+)$/.exec(row);
  if(!m||m[2]!==file)throw new Error('UNSAFE_TREE_ENTRY');
  const size=Number(git(root,['cat-file','-s',m[1]]).trim());
  if(size>512*1024)throw new Error('BLOB_TOO_LARGE');
  const text=git(root,['cat-file','blob',m[1]]);
  if(text.includes('\0'))throw new Error('UNSUPPORTED_TEXT');
  return {oid:m[1],lines:text.replace(/\n$/,'').split('\n'),finalNewline:text.endsWith('\n')};
}
function parseHunks(diff){
  if(diff.includes('Binary files')||diff.includes('GIT binary patch')||diff.includes('No newline'))throw new Error('UNSUPPORTED_PATCH');
  const result=[];
  for(const line of diff.split('\n')){
    const m=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if(m)result.push({oldStart:+m[1],oldCount:m[2]===undefined?1:+m[2],newStart:+m[3],newCount:m[4]===undefined?1:+m[4]});
  }
  return result;
}
function reverseHunk(file,h,beforeEntry,afterEntry){
  const before=beforeEntry.lines,after=afterEntry.lines;
  const oldAt=h.oldCount?h.oldStart-1:h.oldStart;
  const newAt=h.newCount?h.newStart-1:h.newStart;
  const pre=Math.min(3,oldAt,newAt);
  const post=Math.min(3,before.length-oldAt-h.oldCount,after.length-newAt-h.newCount);
  const oldContext=before.slice(oldAt-pre,oldAt).concat(before.slice(oldAt+h.oldCount,oldAt+h.oldCount+post));
  const newContext=after.slice(newAt-pre,newAt).concat(after.slice(newAt+h.newCount,newAt+h.newCount+post));
  if(JSON.stringify(oldContext)!==JSON.stringify(newContext)||pre+post<2)throw new Error('AMBIGUOUS_CONTEXT');
  // Direct reverse patch: current side is the source's after, target is before.
  const section=(entry,start,count,prefix)=>entry.lines.slice(start,start+count).flatMap((l,i)=>[
    prefix+l,...(!entry.finalNewline&&start+i===entry.lines.length-1?['\\ No newline at end of file']:[])
  ]);
  const lines=[...section(afterEntry,newAt-pre,pre,' '),...section(afterEntry,newAt,h.newCount,'-'),...section(beforeEntry,oldAt,h.oldCount,'+'),...section(afterEntry,newAt+h.newCount,post,' ')];
  return `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -${newAt-pre+1},${h.newCount+pre+post} +${oldAt-pre+1},${h.oldCount+pre+post} @@\n${lines.join('\n')}\n`;
}
function restore({root,baseSha,headSha}){
  const deny=reason=>({eligible:false,reason});
  let temp;
  try{
    if(!SHA.test(baseSha)||!SHA.test(headSha)||baseSha===headSha)return deny('INVALID_SHA');
    git(root,['merge-base','--is-ancestor',baseSha,headSha]);
    const message=git(root,['show','-s','--format=%B',headSha]);
    const sources=[...message.matchAll(/^Restore-Source: ([a-f0-9]{40})$/gm)];
    const selections=[...message.matchAll(/^Restore-Hunks: (.+)$/gm)];
    if(sources.length!==1||selections.length!==1)return deny('NO_EXACT_RESTORE_REFERENCE');
    const source=sources[0][1],selected=JSON.parse(selections[0][1]);
    git(root,['merge-base','--is-ancestor',source,baseSha]);
    const parents=git(root,['rev-list','--parents','-n','1',source]).trim().split(' ');
    if(parents.length!==2)return deny('SOURCE_NOT_SINGLE_PARENT');
    if(!selected||Array.isArray(selected)||typeof selected!=='object')return deny('INVALID_HUNK_SELECTION');
    const files=Object.keys(selected).sort(),diff=changed(root,baseSha,headSha);
    if(!files.length||files.length>4||JSON.stringify(files)!==JSON.stringify(diff.map(x=>x.path).sort()))return deny('RESTORE_SCOPE_MISMATCH');
    if(diff.some(x=>x.action!=='M'))return deny('RESTORE_REQUIRES_EXISTING_FILES');
    const shared=files.some(f=>f==='index.html'||f==='style.css');
    if(shared&&files.some(f=>f!=='index.html'&&f!=='style.css'))return deny('MIXED_RESTORE_BOUNDARIES');
    if(!shared){
      const locality=contained({root,baseSha,headSha});
      if(!locality.eligible)return deny(locality.reason);
    }
    temp=fs.mkdtempSync(path.join(os.tmpdir(),'targeted-restore-'));
    const env={GIT_INDEX_FILE:path.join(temp,'index')};
    git(root,['read-tree',baseSha],undefined,env);
    let count=0;
    for(const file of files){
      if(!shared&&(!SAFE.test(file)||PACKAGING.test(file)))return deny('PROTECTED_RESTORE_PATH');
      const actual=patch(root,baseSha,headSha,file);
      if(actual.length>64*1024||CONTRACT.test(changedText(actual)))return deny('CONTRACT_REVIEW_REQUIRED');
      const before=entry(root,parents[1],file),after=entry(root,source,file);
      entry(root,baseSha,file);entry(root,headSha,file);
      const hunks=parseHunks(patch(root,parents[1],source,file)),ids=selected[file];
      if(!Array.isArray(ids)||!ids.length||ids.length>32||new Set(ids).size!==ids.length)return deny('INVALID_HUNK_SELECTION');
      for(const id of [...ids].sort((a,b)=>b-a)){
        if(!Number.isInteger(id)||id<1||id>hunks.length)return deny('INVALID_HUNK_SELECTION');
        const h=hunks[id-1];
        if(h.oldCount+h.newCount>240)return deny('BROAD_RESTORE');
        const reverse=reverseHunk(file,h,before,after);
        git(root,['-c','core.hooksPath=/dev/null','apply','--cached','--whitespace=nowarn','-'],reverse,env);
        count++;
      }
    }
    const expected=git(root,['write-tree'],undefined,env).trim();
    const actual=git(root,['rev-parse',headSha+'^{tree}']).trim();
    if(expected!==actual)return deny('NOT_EXACT_SELECTED_REVERSE');
    return {eligible:true,reason:'EXACT_TARGETED_RESTORE',sourceSha:source,paths:files,hunks:count,verificationState:'UNVERIFIED'};
  }catch(_){return deny('RESTORE_CONFLICT_OR_INVALID_INPUT');}
  finally{if(temp)fs.rmSync(temp,{recursive:true,force:true});}
}
function classify(args){
  try{
    if(SHA.test(args.headSha)&&/^Restore-(?:Source|Hunks):/m.test(git(args.root,['show','-s','--format=%B',args.headSha])))return restore(args);
  }catch(_){return {eligible:false,reason:'INVALID_RESTORE_REFERENCE'};}
  const local=contained(args);
  if(local.eligible){
    try{
      for(const file of changed(args.root,args.baseSha,args.headSha)){
        if(PACKAGING.test(file.path)||CONTRACT.test(changedText(patch(args.root,args.baseSha,args.headSha,file.path))))return {eligible:false,reason:'CONTRACT_REVIEW_REQUIRED'};
      }
      return {...local,verificationState:'UNVERIFIED'};
    }catch(_){return {eligible:false,reason:'LOCAL_DIFF_ERROR'};}
  }
  return restore(args);
}
function main(args){
  const opts={};
  if(args.length!==6)return 2;
  for(let i=0;i<6;i+=2){if(!['--root','--base','--head'].includes(args[i])||opts[args[i]])return 2;opts[args[i]]=args[i+1];}
  const result=classify({root:path.resolve(opts['--root']),baseSha:opts['--base'],headSha:opts['--head']});
  process.stdout.write(JSON.stringify(result)+'\n');return result.eligible?0:1;
}
if(require.main===module)process.exitCode=main(process.argv.slice(2));
module.exports={classify,restore,CONTRACT};
