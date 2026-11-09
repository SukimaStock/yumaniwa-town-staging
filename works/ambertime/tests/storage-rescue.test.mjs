import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../storage-rescue.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);
const key='sukimastock.ambertime.wholesale.v20';
function setup(entries,{allowConfirm=true}={}){
 const values=new Map(entries);const nodes=new Map();const removed=[];const downloads=[];let currentBlob;
 function node(id){if(!nodes.has(id))nodes.set(id,{id,textContent:'',disabled:false,checked:false,value:'',files:[],listeners:{},addEventListener(event,fn){this.listeners[event]=fn},click(){if(this.id==='a')downloads.push({href:this.href,filename:this.download})}});return nodes.get(id)}
 const storage={getItem(k){return values.has(k)?values.get(k):null},removeItem(k){removed.push(k);values.delete(k)},setItem(){throw Error('unexpected setItem')},clear(){throw Error('unexpected clear')}};
 const doc={getElementById:node,createElement:tag=>node(tag)};
 const context={document:doc,window:{localStorage:storage},location:{origin:'https://sukimastock.github.io'},URL:{createObjectURL(blob){currentBlob=blob;return 'blob:dummy'},revokeObjectURL(){}},Blob,confirm:()=>allowConfirm,setTimeout:()=>0};
 vm.runInNewContext(script,context);
 return {node,storage,removed,downloads,values,getBlob:()=>currentBlob};
}
test('initial scan is read-only and only targets legacy wholesale key',()=>{
 const s=setup([[key,'before'],['sukimastock.ambertime.main.v1','current']]);
 assert.deepEqual(s.removed,[]);
 assert.equal(s.node('size').textContent,'現在の容量：41 UTF-16コード単位');
 assert.equal(s.node('download').disabled,false);
 assert.equal(s.node('remove').disabled,true);
});
test('can remove only the verified exact-value legacy key after distinct confirmations',async()=>{
 const s=setup([[key,'save text'],['sukimastock.ambertime.main.v1','current']]);
 s.node('download').listeners.click();
 assert.equal(s.downloads.length,1);
 assert.equal(s.downloads[0].filename,'ambertime-wholesale-v20-backup.json');
 const raw=await s.getBlob().text();const obj=JSON.parse(raw);
 assert.equal(obj.key,key);assert.equal(obj.value,'save text');
 const f=s.node('file');f.files=[{text:async()=>raw}];await f.listeners.change({target:f});
 assert.equal(s.node('confirmBackup').disabled,false);
 s.node('confirmBackup').checked=true;s.node('confirmBackup').listeners.change();
 assert.equal(s.node('remove').disabled,false);
 s.node('remove').listeners.click();
 assert.deepEqual(s.removed,[key]);
 assert.equal(s.values.get('sukimastock.ambertime.main.v1'),'current');
 assert.equal(s.values.has(key),false);
});
test('no deletion for mismatched backup, mutated value or missing explicit confirmation',async()=>{
 const s=setup([[key,'old']]);
 s.node('download').listeners.click();
 const bad=JSON.stringify({schema:'ambertime-localstorage-backup/1',origin:'https://sukimastock.github.io',key,value:'not old'});
 const f=s.node('file');f.files=[{text:async()=>bad}];await f.listeners.change({target:f});
 s.node('remove').listeners.click();assert.deepEqual(s.removed,[]);
 const good=await s.getBlob().text();f.files=[{text:async()=>good}];await f.listeners.change({target:f});
 s.node('confirmBackup').checked=true;s.node('confirmBackup').listeners.change();
 s.values.set(key,'changed-after-verification');s.node('remove').listeners.click();
 assert.deepEqual(s.removed,[]);
 assert.equal(s.values.get(key),'changed-after-verification');
});
test('no deletion if user cancels confirm or key absent',async()=>{
 const empty=setup([]);assert.equal(empty.node('download').disabled,true);
 const s=setup([[key,'old']],{allowConfirm:false});s.node('download').listeners.click();
 const file=s.node('file');file.files=[{text:async()=>await s.getBlob().text()}];await file.listeners.change({target:file});
 s.node('confirmBackup').checked=true;s.node('confirmBackup').listeners.change();s.node('remove').listeners.click();
 assert.deepEqual(s.removed,[]);
});
test('no outbound network calls or arbitrary key removal',()=>{
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(script,/\bfetch\b|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\bsendBeacon\b|\binnerHTML\b/);
 assert.doesNotMatch(script,/\.setItem\s*\(|\.clear\s*\(/);
 assert.match(script,/window\.localStorage\.removeItem\(KEY\)/);
});
