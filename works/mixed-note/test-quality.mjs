import test from 'node:test';
import assert from 'node:assert/strict';
import {detect,compose,remember,validateEntry} from './detection.mjs';
import {readState,writeState,STORAGE_KEY,initialState} from './state.mjs';

// Independently written corpus for this writing workflow, not copied from upstream.
const corpus={
  japanese:[['sakuhinwotsukurimasu','さくひんをつくります'],['yohakugaaru','よはくがある'],['shizukanayorudesu','しずかなよるです'],['kittoumakuiku','きっとうまくいく'],["shin'ya",'しんや'],['kyouhaame.','きょうはあめ。']],
  english:[['This is my new game.','This is my new game.'],['I want to write a note.','I want to write a note.'],['make sure you have time','make sure you have time'],['hello Safari','hello Safari'],['touch feeling','touch feeling']],
  mixed:[['PUMPOKOwotsukutta','PUMPOKOをつくった'],['sakuhinno staging','さくひんの staging'],['GitHubnikomittoshita','GitHubにこみっとした'],['kyouhaSukimaStocknokijiwokaita','きょうはSukimaStockのきじをかいた'],['Pythonwotsukau','Pythonをつかう'],['prototypewotameshita','prototypeをためした'],['kyouhanotewokaita','きょうはnoteをかいた']],
  ambiguous:[['sake','さけ'],['I love sake','I love sake'],['same','さめ'],['same game','same game'],['no','no'],['nihongo','にほんご'],['makenaide','まけないで']],
  literal:[['## 見出し\n\n静かな夜。','## 見出し\n\n静かな夜。'],['https://example.com/kyouha','https://example.com/kyouha'],['hello@example.com','hello@example.com'],['@hamayan','@hamayan'],['`const x = 1;`','`const x = 1;`'],['my_draft_02','my_draft_02'],['PUMPOKO 02','PUMPOKO 02'],['  \n\n','  \n\n']],
  unknown:[['xyzzy','xyzzy'],['k','k'],['qwert','qwert']]
};
for(const [category,cases] of Object.entries(corpus))test(`quality: ${category}`,()=>{
  const failures=[];
  for(const [source,expected] of cases){const actual=compose(detect(source));if(actual!==expected)failures.push({source,expected,actual});}
  assert.deepEqual(failures,[],`${category}: independent ideal expectations`);
  console.log(`${category}: ${cases.length}/${cases.length}`);
});
test('lossless source offsets, including mixed run, emoji, native text and protected punctuation',()=>{
  for(const source of [...Object.values(corpus).flat().map(c=>c[0]),'🌙 PUMPOKOwotsukutta\n終わり']){
    const segments=detect(source);assert.equal(segments.map(s=>s.raw).join(''),source);
    let end=0;for(const s of segments){assert.equal(s.start,end);assert.equal(source.slice(s.start,s.end),s.raw);end=s.end;}assert.equal(end,source.length);
  }
});
test('custom terms and longest overlapping reading win',()=>{
  const dictionary=[{raw:'yumaniwa',value:'湯間庭'},{raw:'yumaniwatown',value:'湯間庭町'}];
  assert.equal(compose(detect('yumaniwatownwotsukutta',{dictionary})),'湯間庭町をつくった');
  assert.equal(compose(detect('yumaniwa',{dictionary})),'湯間庭');
  assert.ok(validateEntry('a','愛'));assert.ok(validateEntry('x y','x'));assert.ok(validateEntry('abc','x\ny'));
});
test('explicit corrections only affect whole segments, never nihongo via go',()=>{
  const memory=remember({},'sake','en');assert.equal(compose(detect('sake',{memory})),'sake');
  assert.equal(compose(detect('sake',{memory:remember(memory,'sake','ja')})),'さけ');
  assert.equal(compose(detect('nihongo',{memory:remember({},'go','en')})),'にほんご');
  assert.deepEqual(remember({},'a','en'),{});
  assert.equal(compose(detect('sake'),{0:{text:'酒'}}),'酒');
});
test('long unknown input retained without combinatorial work',()=>{
  const source='a'.repeat(30000);assert.equal(compose(detect(source)),source);
});
test('storage roundtrip includes uncommitted source and correction memory',()=>{
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const state={...initialState(),source:'sake',draft:'原稿',memory:{sake:'en'},dictionary:[{raw:'yumaniwa',value:'湯間庭町'}]};
  assert.equal(writeState(storage,state),null);assert.deepEqual(readState(storage).state,state);
  storage.setItem(STORAGE_KEY,'{broken');assert.ok(readState(storage).error);
  const denied={getItem(){throw Error('blocked')},setItem(){throw Error('quota')}};assert.ok(readState(denied).error);assert.ok(writeState(denied,state));
});
test('hostile/corrupt dictionary entries and inherited names not applied',()=>{
  assert.doesNotThrow(()=>detect('hello',{dictionary:[null,{}, {raw:5,value:'a'}]}));
  assert.equal(compose(detect('constructor',{memory:{}})),'constructor');
});
