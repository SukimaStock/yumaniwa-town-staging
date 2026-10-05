import test from 'node:test';
import assert from 'node:assert/strict';
import {formatParts,formatText} from './formatting.mjs';
import {convertSource} from './conversion.mjs';
const spans = text => [{language:'literal',text,raw:text}];
const cases = [
  ['Japanese gaps','今日も つかれた なぁ','今日もつかれたなぁ'],
  ['name and particles','今日 は PUMPOKO を 作った','今日はPUMPOKOを作った'],
  ['English island','もういいや staff と 一緒に','もういいやstaffと一緒に'],
  ['English name words','今日は New York へ 行く','今日はNew Yorkへ行く'],
  ['all typed marks','今日も, つかれた. そう? ほんと!','今日も、つかれた。そう？ほんと！'],
  ['marks after name','今日は PUMPOKO! 明日も staff?','今日はPUMPOKO！明日もstaff？'],
  ['pure English','I like the touch feeling. Hello, world! Really?','I like the touch feeling. Hello, world! Really?'],
  ['local English sentence','今日は疲れた。 I like this, really! 明日も書く.','今日は疲れた。I like this, really!明日も書く。'],
  ['English phrase after Japanese','今日は I like this, really!','今日はI like this, really!'],
  ['URL query punctuation','今日は https://example.com/a.b?x=1,2! を 見る.','今日はhttps://example.com/a.b?x=1,2!を見る。'],
  ['www and email','連絡は a.b+tag@example.com と www.example.com/a?b=1 へ.','連絡はa.b+tag@example.comとwww.example.com/a?b=1へ。'],
  ['decimals and thousands','値は 3.14, 金額は 1,234.56!','値は3.14、金額は1,234.56！'],
  ['English decimal','It costs 1,234.56, right?','It costs 1,234.56, right?'],
  ['inline code','今日は `foo.bar(x, y)!` を 書く.','今日は`foo.bar(x, y)!`を書く。'],
  ['linebreak and indentation','今日 は 書く.\n  明日 も 書く!\n\nI like it.','今日は書く。\n  明日も書く！\n\nI like it.'],
  ['no invented punctuation','今日はつかれたなぁ','今日はつかれたなぁ'],
  ['emoji and Unicode offsets','今日 😊 https://example.com/a.b?x=1 を 見る!','今日😊 https://example.com/a.b?x=1を見る！'],
];
for (const [name,input,expected] of cases) test(name,()=>assert.equal(formatText(spans(input)),expected));
test('engine boundaries remain immutable; preview parts equal final text',()=>{
  const input=[{language:'ja',text:'今日も',raw:'kyoumo',start:0,end:6,candidates:['今日も','今日モ']},{language:'ja',text:'つかれた',raw:'tukareta',start:6,end:14,candidates:['つかれた','疲れた']},{language:'ja',text:'なぁ',raw:'naa',start:14,end:17,candidates:['なぁ']}];
  const before=structuredClone(input),overrides={1:{text:'疲れた',language:'kanji'}};
  assert.deepEqual(formatParts(input,overrides),['今日も','疲れた','なぁ']);
  assert.equal(formatText(input,overrides),'今日も疲れたなぁ');assert.deepEqual(input,before);
});
test('protected literals work across engine/override boundaries',()=>{
  const input=spans('今日 ');input.push(...['https://example','.', 'com/a?x=1', ' を見る', '.'].map(text=>({text,language:'literal'})));
  assert.equal(formatText(input),'今日https://example.com/a?x=1を見る。');
  assert.equal(formatText(spans('今日 a を見る.'),{0:{text:'今日 a.b@example.com を見る.'}}),'今日a.b@example.comを見る。');
});
test('actual automatic detection path with supplied engine candidates',async()=>{
  // A deterministic engine boundary fixture; real Mozc quality is separately
  // tested unchanged in test-conversion.mjs, rather than mocked as quality proof.
  const input='mouiiya staff to isshoni!';
  const parts=await convertSource(input,{},kana=>({segments:[{key:kana,candidates:[kana==='もういいや'?'もういいや':'と一緒に']}]}));
  assert.equal(parts.map(s=>s.raw).join(''),input);
  assert.equal(formatText(parts),'もういいやstaffと一緒に！');
});
test('www URL path split by existing detection stays raw in final output',async()=>{
  const input='今日は www.example.com/a?b=1 を見る.';
  const parts=await convertSource(input,{},kana=>({segments:[{key:kana,candidates:[kana]}]}));
  const before=structuredClone(parts);
  assert.equal(formatText(parts),'今日はwww.example.com/a?b=1を見る。');
  assert.deepEqual(parts,before);
});
