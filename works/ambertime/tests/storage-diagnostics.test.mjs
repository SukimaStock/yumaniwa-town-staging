import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../storage-diagnostics.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);

function fixture(entries,{readDenied=false}={}){
  const nodes=new Map();
  const element=tag=>({tag,children:[],textContent:'',className:'',listeners:{},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},addEventListener(type,fn){this.listeners[type]=fn}});
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)},createElement:element};
  const writes=[];
  const storage={get length(){if(readDenied)throw Error('blocked');return entries.length},key(index){return entries[index]?.[0]??null},getItem(key){return entries.find(e=>e[0]===key)?.[1]??null},setItem(){writes.push('setItem');throw Error('write rejected')},removeItem(){writes.push('removeItem');throw Error('delete rejected')},clear(){writes.push('clear');throw Error('clear rejected')}};
  const context={document,window:{localStorage:storage},location:{origin:'https://sukimastock.github.io'},navigator:{clipboard:{writeText:async()=>{}}}};
  vm.runInNewContext(script,context);
  return {nodes,document,writes};
}

test('read-only scan measures the origin, all keys, and text lengths without exposing values',()=>{
  const f=fixture([['sukimastock.ambertime.main.v1','SUPER_SECRET'],['another.work','x'.repeat(31)]]);
  const get=id=>f.document.getElementById(id);
  assert.equal(get('total').textContent,'84 単位');
  assert.equal(get('count').textContent,'2 件のキー');
  assert.ok(get('report').textContent.includes('another.work'));
  assert.ok(!get('report').textContent.includes('SUPER_SECRET'));
  assert.deepEqual(f.writes,[]);
  assert.equal(get('keys').children[0].children[0].textContent,'another.work');
});

test('HTML-like key is kept as text and not interpreted as markup',()=>{
  const f=fixture([['<img src=x onerror=alert(1)>','secret_value']]);
  const item=f.document.getElementById('keys').children[0];
  assert.equal(item.children[0].textContent,'<img src=x onerror=alert(1)>');
  assert.deepEqual(f.writes,[]);
});

test('empty storage and read denial never write',()=>{
  const a=fixture([]);assert.equal(a.document.getElementById('total').textContent,'0 単位');
  const b=fixture([],{readDenied:true});assert.equal(b.document.getElementById('total').textContent,'読み取り不可');
  assert.deepEqual(a.writes,[]);assert.deepEqual(b.writes,[]);
});

test('page is self contained, blocks network connections, and contains no mutation APIs',()=>{
  assert.match(html,/connect-src 'none'/);
  assert.doesNotMatch(script,/\.\s*(?:setItem|removeItem|clear|fetch|sendBeacon|open)\s*\(/);
  assert.doesNotMatch(script,/\bindexedDB\b|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\.innerHTML\b/);
});
