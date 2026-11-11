import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {noticePresentation,generationCaption,topGenerationNotice} from '../notice-motion.mjs';

test('daily event has a generation speaker while operations stay unstyled',()=>{
 assert.deepEqual(noticePresentation([{id:'daily-display:1',kind:'message',sourceLabel:'三代のひとこと'}]),{motion:'ambient',heading:'三代のひとこと'});
 assert.deepEqual(noticePresentation([{id:'market-message:10',kind:'message'}]),{motion:'operation',heading:''});
 assert.deepEqual(noticePresentation([{id:'sales:11',kind:'sales'},{id:'daily-display:9',kind:'message'}]),{motion:'operation',heading:''});
});
test('world message receives the news treatment',()=>{
 assert.deepEqual(noticePresentation([{id:'world-display:9',kind:'message',text:'知らせ'}]),{motion:'news',heading:'町の知らせ'});
});
test('generation top banner is a projection only when safe and not modal',()=>{
 const base={generation:{id:2,phase:'last-batch',deadlineLabel:'2030年3月'},modal:null,preview:false,canSave:true,runtimeHalted:false,documentHidden:false};
 assert.equal(topGenerationNotice(base)?.text,'二代の最後の仕込み · 2030年3月まで');
 for(const patch of [{modal:{kind:'shop-offer'}},{runtimeHalted:true},{documentHidden:true},{canSave:false},{generation:{...base.generation,phase:'review'}}])
  assert.equal(topGenerationNotice({...base,...patch}),null);
});
test('original generational display names do not require storage',()=>{
 assert.equal(generationCaption(1),'初代');assert.equal(generationCaption(2),'二代');assert.equal(generationCaption(11),'11代');
});

test('horizontal news keeps its duration and stepped motion with slightly more frames',()=>{
 const css=readFileSync(new URL('../notice-motion.css',import.meta.url),'utf8');
 assert.match(css,/amber-news-pass 240ms steps\(6,end\)/);
 assert.match(css,/amber-news-leave 180ms steps\(5,end\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
