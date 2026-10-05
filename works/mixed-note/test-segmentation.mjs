import test from 'node:test';
import assert from 'node:assert/strict';
import {segment,segmentCandidates} from './segmentation.mjs';
import {reading,japaneseReading} from './composition.mjs';
import {convertSource,rankSegmentation} from './conversion.mjs';
import {formatText} from './formatting.mjs';
import {evaluatePath} from './research/adapters.mjs';
import {references} from './research/references.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import Module from 'node:module';
const refs=references(process.env.MIXED_NOTE_REFERENCES);
const file=refs.hechima.dir+'/site/public/vendor/hechima-wasm/hechima-wasm.js';
const glue=new Module(file);glue.filename=file;glue.paths=Module._nodeModulePaths(refs.hechima.dir);glue._compile(refs.hechima.files['site/public/vendor/hechima-wasm/hechima-wasm.js'].toString(),file);
const m=await glue.exports({wasmBinary:refs.hechima.files['site/public/vendor/hechima-wasm/hechima-wasm.wasm'],printErr:()=>{}});m.FS.writeFile('/mozc.data',refs.hechima.files['site/public/vendor/hechima-wasm/mozc.data']);assert.equal(m.ccall('hechima_init','number',['string'],['/mozc.data']),0);
const convert=kana=>JSON.parse(m.ccall('hechima_convert','string',['string','number'],[kana,20]));

const results=[];
const cases=[
 ['recent','saikinntyousihadou?','最近調子はどう？'],
 ['goal','demogoalkimetatokiha','でもgoal決めたときは'],
 ['name','kyouhaPUMPOKOwotukutta','今日はPUMPOKOを作った'],
 ['staff','mouiiya staff to isshoni','もういいやstaffと一緒に'],
 ['accidental','ashitahadaka',null],
 ['question','anatahadaredesuka','あなたは誰ですか'],
 ['question-2','korehadaredesuka','これは誰ですか'],
 ['check','korehashirabetai','これは調べたい'],
 ['praise','hometehoshii','褒めてほしい'],
 ['barefoot','hadashidearuita',null],
 ['english','I had a good day.','I had a good day.'],
 ['english-2','This is my goal.','This is my goal.'],
 ['english-3','Hello, world!','Hello, world!'],
 ['english-island','kyouhaplanwokimeta',null],
 ['readable-English','kyouhagamewotukutta','今日はgameを作った'],
 ['unknown','mouiiya frindle to isshoni','もういいやfrindleと一緒に'],
 ['acronym','ashitahaMTGgaaru','明日はMTGがある'],
 ['short-accidental','hashi',null],
 ['verb-accidental','hashitteita','走っていた'],
 ['Japanese-study','nihongowobenkyoushiteimasu','日本語を勉強しています'],
 ['Japanese-breakfast','mainichiasagohanwotabemasu','毎日朝ごはんを食べます'],
];
for(const [id,input,target] of cases)test(id,async()=>{
 const started=performance.now(),rank=await rankSegmentation(input,{},convert),output=await convertSource(input,{},convert);
 assert.equal(output.map(s=>s.raw).join(''),input);
 if(target)assert.equal(formatText(output),target);
 if(['accidental','barefoot','short-accidental','verb-accidental'].includes(id))assert(!rank.ranked[0].parts.some(s=>s.language==='en'));
 if(id==='english-island')assert(rank.ranked[0].parts.some(s=>s.raw==='plan'&&s.language==='en'));
 for(const s of output)assert.equal(input.slice(s.start,s.end),s.raw);
 assert(rank.ranked.length<=12);assert(rank.conversionCalls<=48);
 results.push({id,input,output:formatText(output),conversionCalls:rank.conversionCalls,elapsedMs:performance.now()-started,paths:rank.ranked.map(p=>({score:p.score,languageScore:p.languageScore,conversion:p.conversion,continuity:p.continuity,context:p.context,parts:p.parts.map(s=>({raw:s.raw,language:s.language,evidence:s.evidence}))}))});
});
test('had alternative competes with the intact Japanese route',async()=>{
 const r=await rankSegmentation('saikinntyousihadou',{},convert);
 assert(r.ranked.some(p=>p.parts.some(s=>s.raw==='had'&&s.language==='en')));
 assert.deepEqual(r.ranked[0].parts.map(s=>[s.language,s.raw]),[['ja','saikinntyousihadou']]);
});
test('conversion evidence participates in the mixed route',async()=>{
 const input='demogoalkimetatokiha',after=await rankSegmentation(input,{},convert);
 assert.deepEqual(after.ranked[0].parts.map(s=>[s.language,s.raw]),[['ja','demo'],['en','goal'],['ja','kimetatokiha']]);
 assert(after.ranked[0].conversion>0);
});
test('kanji support reranks an accidental readable English split',async()=>{
 const input='hometehoshii',before=segmentCandidates(input),after=await rankSegmentation(input,{},convert);
 assert.equal(before[0].parts[0].raw,'home');assert.equal(before[0].parts[0].language,'en');
 assert.deepEqual(after.ranked[0].parts.map(s=>[s.language,s.raw]),[['ja',input]]);
 assert(after.ranked.some(p=>p.continuity<0));
});
test('standalone English words are not banned by accidental-match safeguards',async()=>{
 for(const raw of ['had','has','have','goal','plan','home'])assert.equal(formatText(await convertSource(raw,{},convert)),raw);
});
test('user dictionary and explicit memory retain precedence',async()=>{
 const state={dictionary:[{raw:'mybrand',value:'MyBrand'}],memory:{sushi:'en'}};
 const a=await convertSource('kyouhamybrandwotsukutta',state,convert);assert.equal(formatText(a),'今日はMyBrandを作った');
 assert.equal(formatText(await convertSource('sushi',state,convert)),'sushi');
 const b=await convertSource('myBrand',{},convert);assert.equal(formatText(b),'myBrand');
});
test('protected URL/email/code remain unchanged',async()=>{
 const input='今日は https://example.com/had?goal=1 と a.b@example.com と `had goal` を見る.';
 const output=formatText(await convertSource(input,{},convert));assert.equal(output,'今日はhttps://example.com/had?goal=1とa.b@example.comと`had goal`を見る。');
});
test('conversion cache is per request, failure is not an English fallback',async()=>{
 const reads=new Set();let calls=0;
 const r=await rankSegmentation('saikinntyousihadou',{},kana=>{assert(!reads.has(kana));reads.add(kana);calls++;return convert(kana);});
 assert.equal(calls,r.conversionCalls);assert(calls<=3);
 await assert.rejects(convertSource('saikinntyousihadou',{},()=>{throw Error('unavailable')}),/unavailable/);
});
test('path search is bounded for adversarial and large input',()=>{
 for(const input of ['had'.repeat(85),'game'.repeat(64),'a'.repeat(1000)]){const p=segmentCandidates(input);assert(p.length<=12);assert.equal(p[0].parts.map(s=>s.raw).join(''),input);}
});
test.after(()=>{if(process.env.MIXED_NOTE_SEGMENT_RESULTS)writeFileSync(process.env.MIXED_NOTE_SEGMENT_RESULTS,JSON.stringify({physicalIphoneSafari:'UNVERIFIED',cases:results},null,2)+'\n');});
