import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as D from '../partner-orders.mjs';
import {tasting} from '../model.mjs';
import {FLAVOR_AXES,distillationView,spiritProfile} from '../spirit-view.mjs';
import {advance,fill,release,exact} from './brands-helpers.mjs';

const seeds=[1,7,42,891,65537,20261015,2147483647,4294967295];
function atPosition(seed,position){let s=D.startDistillation(D.newUsualDistillery(seed));for(let i=0;i<position;i++)s=D.distillStep(s);return s;}
function sameSpirit(view,spirit){
 for(const key of ['roughness','character','litres'])assert.equal(view[key],spirit[key],key);
 assert.equal(view.axes.length,2);
 for(const axis of view.axes){assert.equal(axis.value,spirit[axis.id]);assert.equal(axis.ratio,axis.value/axis.maximum);assert(axis.ratio>=0&&axis.ratio<=1);}
 assert.equal(view.phrase,spiritProfile(spirit).phrase);
}
function freeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}

test('absolute axis scales keep separate meaning, including the future wood range',()=>{
 assert.deepEqual(FLAVOR_AXES,[{id:'roughness',label:'刺激',maximum:1},{id:'character',label:'原酒の香り',maximum:1},{id:'wood',label:'樽の香り',maximum:1.35}]);
 assert(Object.isFrozen(FLAVOR_AXES));assert(FLAVOR_AXES.every(Object.isFrozen));
 assert.equal(distillationView(D.newUsualDistillery(42)),null);
 for(const invalid of [null,{}, {roughness:NaN,character:.5,litres:30},{roughness:-.1,character:.5,litres:30},{roughness:.2,character:1.1,litres:30}])assert.equal(spiritProfile(invalid),null);
});

test('every legal position matches the actual stop outcome for multiple random seeds',()=>{
 const phrases=new Set();
 for(const seed of seeds){
  let s=D.startDistillation(D.newUsualDistillery(seed));let previous=null;
  for(let position=0;position<100;position++){
   assert.equal(s.still.distillation.progress,position);
   const before=JSON.stringify(s),view=distillationView(s);assert.equal(JSON.stringify(s),before);
   if(position<30){assert.equal(view.phase,'collecting');assert.deepEqual(view.axes,[]);assert.equal(view.litres,s.still.distillation.litres);assert(!Object.hasOwn(view,'roughness'));assert(!Object.hasOwn(view,'character'));}
   else{
    assert.equal(view.phase,'forecast');
    const stopped=D.stopDistillation(s);sameSpirit(view,stopped.core.spirit);const confirmed=distillationView(stopped);assert.equal(confirmed.phase,'confirmed');sameSpirit(confirmed,stopped.core.spirit);
    assert.deepEqual({...view,phase:'confirmed'},confirmed);phrases.add(view.phrase);
    if(previous){assert(view.roughness>previous.roughness);assert(view.character>previous.character);assert(view.litres>previous.litres);}previous=view;
   }
   if(position<99)s=D.distillStep(s);
  }
 }
 assert.equal(phrases.size,6,'the reachable extraction range has a small, visibly varied vocabulary');
});

test('repeated and frozen presentation reads never spend random draws, money or operations',()=>{
 for(const position of [0,29,30,50,70,90,99]){
  const s=freeze(atPosition(20261015,position)),before=JSON.stringify(s),first=distillationView(s);
  for(let i=0;i<20;i++)assert.deepEqual(distillationView(s),first);
  assert.equal(JSON.stringify(s),before);
  if(position>=30){const stopped=D.stopDistillation(s),unread=D.stopDistillation(atPosition(20261015,position));assert.deepEqual(stopped,unread);assert.deepEqual(exact(stopped),stopped);}
 }
});

test('short phrases agree with existing tasting words at every category boundary',()=>{
 const roughness=[0,.12,.1200001,.30,.3000001,.6,.6000001,1];
 const character=[0,.35,.3500001,.57,.5700001,.8,.8000001,1];
 const touch=[['舌に強い刺激が残る',/強い刺激|刺激は強い|荒々し/],['口当たりにまだ角がある',/角|少し.*刺激/],['刺激がほどけ、丸さが出てきた',/穏やか|丸さ/],['やわらかい口当たり',/柔らか|やわらか/]];
 const aroma=[['香りは控えめ',/控えめ/],['軽い果実、穀物の香り',/軽い果実|軽やか/],['果実と穀物の香りが広がる',/果実と穀物|香り.*広が/],['熟した果実と厚い穀物の香り',/熟した果実|厚い穀物/]];
 for(const r of roughness)for(const a of character){const source={roughness:r,character:a,litres:30,wood:0},text=tasting(source),profile=spiritProfile(source);assert.match(profile.phrase,aroma.find(([key])=>text.includes(key))[1]);assert.match(profile.phrase,touch.find(([key])=>text.includes(key))[1]);assert(!/undefined|NaN|成功|失敗|最適|品質|高級|上質|点|ランク/.test(profile.phrase));}
});

test('mid-distillation saves restore the same forecast and confirmed outcome without new fields',()=>{
 for(const position of [0,29,30,47,99]){
  const s=atPosition(20261015,position),raw=D.serializeDistillery(s),restored=D.restoreDistillery(raw);assert.equal(D.serializeDistillery(restored),raw);assert.deepEqual(distillationView(restored),distillationView(s));
  distillationView(restored);assert.equal(D.serializeDistillery(restored),raw);
  if(position>=30){const stopped=D.stopDistillation(restored);assert.equal(distillationView(stopped).phase,'confirmed');assert.deepEqual(distillationView(exact(stopped)),distillationView(stopped));}
 }
 const legacy=D.enableReputation(D.restoreDistillery(fs.readFileSync(new URL('./fixtures/v09-initial.json',import.meta.url),'utf8')));const raw=D.serializeDistillery(legacy);distillationView(legacy);assert.equal(D.serializeDistillery(legacy),raw);assert.equal(legacy.version,9);
 const partial=atPosition(20261015,47),script=`import fs from 'node:fs';import * as D from ${JSON.stringify(new URL('../partner-orders.mjs',import.meta.url).href)};import {distillationView} from ${JSON.stringify(new URL('../spirit-view.mjs',import.meta.url).href)};const s=D.restoreDistillery(fs.readFileSync(0,'utf8'));process.stdout.write(JSON.stringify({save:D.serializeDistillery(s),view:distillationView(s)}));`;
 const cold=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{input:D.serializeDistillery(partial),encoding:'utf8'}));assert.equal(cold.save,D.serializeDistillery(partial));assert.deepEqual(cold.view,distillationView(partial));
});

test('automatic extraction uses the same view and completion profile, captured before later aging',()=>{
 for(const stopAt of [30,50,70,90,99]){
  const base=advance(fill(D.newUsualDistillery(20261015),{progress:stopAt,type:'refill'}),1);let s=D.beginUsual(D.reserveUsual(base)),manual=D.startDistillation(base);
  for(let i=0;i<stopAt;i++){assert.deepEqual(distillationView(s),distillationView(manual));s=D.distillStep(s);manual=D.distillStep(manual);}
  const completed=s.core.casks.at(-1),profile=spiritProfile(completed),confirmed=distillationView(D.stopDistillation(manual));sameSpirit(confirmed,completed);assert.deepEqual(profile,spiritProfile(completed));assert.equal(distillationView(s),null);
  const snapshot=structuredClone(profile);s=advance(s,1);assert.deepEqual(profile,snapshot);assert.notEqual(s.core.casks.at(-1).roughness,profile.roughness);assert.notEqual(s.core.casks.at(-1).litres,profile.litres);assert.deepEqual(exact(s),s);
 }
});

test('presentation reads do not change concurrent aging, retail sales or brand records',()=>{
 let left=release(D.newUsualDistillery(42),{progress:80,type:'bourbon',tier:'high'});left=advance(left,1);left=fill(left,{progress:80,type:'bourbon'});left=advance(left,1);left=D.startDistillation(left);let right=structuredClone(left);
 for(let i=1;i<=80;i++){
  for(let repeat=0;repeat<3;repeat++)distillationView(left);
  left=D.distillStep(left);right=D.distillStep(right);
  if(i===60){left=advance(left,1);right=advance(right,1);assert(left.releases[0].sold>0);}
 }
 left=D.fillBarrel(D.stopDistillation(left),'bourbon');right=D.fillBarrel(D.stopDistillation(right),'bourbon');assert.deepEqual(left,right);assert.deepEqual(exact(left),left);
});
