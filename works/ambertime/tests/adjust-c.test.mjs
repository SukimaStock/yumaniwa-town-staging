import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../partner-orders.mjs';
import * as Lab from '../../ambertime-flavor-lab-v02/model.mjs';
import {BREWING_CARDS,longFermentationUnlocked,manualCards,chooseManualCard,drawBrewingIcon,brewingCardsMarkup} from '../brewing-cards.mjs';

const cold=s=>D.restoreDistillery(D.serializeDistillery(s));
function start(s){const cards=manualCards(s);if(cards.ferment!==s.labConnection.cards.ferment)s=D.selectFlavorCards(s,cards);return D.beginCollection(D.startRangeDistillation(s));}
function stop(s){for(let i=0;i<24;i++)s=D.distillStep(s);return D.stopDistillation(s);}

test('four exact 16x16 icons draw native integer pixels, ear silhouette and liquid line stay paired',()=>{
 assert.equal(BREWING_CARDS.length,4);
 for(const card of BREWING_CARDS){const cells=[];const ctx={clearRect(...r){assert.deepEqual(r,[0,0,16,16]);},fillRect(x,y,w,h){assert(x>=0&&x<16&&y>=0&&y<16);assert.equal(w,1);assert.equal(h,1);cells.push([x,y,this.fillStyle]);}};
  assert.equal(card.icon.rows.length,16);for(const row of card.icon.rows){assert.equal(row.length,16);for(const cell of row)assert(cell==='.'||card.icon.colors[cell]);}
  drawBrewingIcon(ctx,card.value);assert.equal(ctx.imageSmoothingEnabled,false);assert(cells.length>20);
 }
 const [plain,peat,short,long]=BREWING_CARDS.map(c=>c.icon);
 assert.deepEqual(plain.rows,peat.rows.map(r=>r.replaceAll('3','.')));
 assert.equal(peat.rows.join('').split('3').length-1,2);
 assert.equal(short.rows[10],long.rows[10]);assert.equal(short.rows[11],long.rows[11]);
 assert(short.rows.join('').split('3').length>long.rows.join('').split('3').length);
});

test('first manual UI is short without mutating default/old save; three usable cards and locked request rejected',()=>{
 const s=D.newConnectedDistillery(42),raw=D.serializeDistillery(s);
 assert.equal(s.labConnection.cards.ferment,'long','legacy model default is untouched');
 assert.equal(longFermentationUnlocked(s),false);assert.deepEqual(manualCards(s),{malt:'plain',ferment:'short'});
 assert.deepEqual(chooseManualCard(s,'malt','peat'),{malt:'peat',ferment:'short'});assert(chooseManualCard(s,'ferment','short'));
 assert.equal(chooseManualCard(s,'ferment','long'),null);assert.equal(chooseManualCard(s,'other','long'),null);
 const html=brewingCardsMarkup(s);assert.equal((html.match(/<button /g)||[]).length,4);assert.equal((html.match(/ disabled /g)||[]).length,1);assert.match(html,/card-lock/);assert.match(html,/data-id="short" aria-pressed="true"/);assert.match(html,/初めて自分でたる詰めすると解放/);
 assert.equal(D.serializeDistillery(s),raw);assert.equal(D.serializeDistillery(cold(s)),raw);
 const started=start(s);assert.equal(started.still.distillation.labChoice.ferment,'short');assert.equal(longFermentationUnlocked(started),false);
});

test('successful manual fill unlocks next selection, persists through cold replay, no unlock field added',()=>{
 const initial=D.newConnectedDistillery(42),stopped=stop(start(initial));assert.equal(longFermentationUnlocked(stopped),false);
 const filled=D.fillBarrel(stopped,'refill'),raw=D.serializeDistillery(filled),loaded=cold(filled);
 assert.equal(longFermentationUnlocked(filled),true);assert.equal(longFermentationUnlocked(loaded),true);
 assert.deepEqual(Object.keys(filled.labConnection).sort(),Object.keys(initial.labConnection).sort());
 const selected=D.selectFlavorCards(loaded,chooseManualCard(loaded,'ferment','long'));
 assert.equal(cold(selected).labConnection.cards.ferment,'long');assert.doesNotMatch(brewingCardsMarkup(selected),/ disabled |card-lock/);
 assert.equal(D.serializeDistillery(filled),raw);
 assert.equal(longFermentationUnlocked({operations:[{key:'complete-usual'}]}),false);
 assert.equal(longFermentationUnlocked({operations:[],origin:{operations:[],origin:{operations:[{key:'fill'}]}}}),true);
 assert.equal(longFermentationUnlocked({staffExperience:{manualFills:1},operations:[]}),true);
});

test('real legacy filled saves unlock without writing or reinterpreting their records',()=>{
 for(const name of ['v08-legal-funds.json','v09-initial.json','v09-due.json']){
  const s=D.restoreDistillery(fs.readFileSync(new URL('fixtures/'+name,import.meta.url),'utf8')),raw=D.serializeDistillery(s);
  assert.equal(longFermentationUnlocked(s),true,name);assert.equal(D.serializeDistillery(s),raw);
 }
});

test('four existing combinations still use the unchanged Lab calculation at the chosen range',()=>{
 const results=[];
 for(const malt of ['plain','peat'])for(const ferment of ['short','long']){
  // Model/recipe path deliberately accepts historical long before the manual UI unlock.
  const s=D.selectFlavorCards(D.newConnectedDistillery(42),{malt,ferment});
  let run=D.beginCollection(D.startRangeDistillation(s));run=stop(run);
  const f=run.core.spirit.flavor;assert.equal(f.choice.malt,malt);assert.equal(f.choice.ferment,ferment);
  for(const [key,v] of Object.entries(Lab.distill(f.choice)))assert.equal(f.spirit[key],Math.round(v*1e12)/1e12);
  assert.deepEqual(D.fillBarrel(run,'refill').core.casks[0].flavor.spirit,f.spirit);results.push(f.spirit);
 }
 assert.notDeepEqual(results[0],results[1]);assert.notDeepEqual(results[0],results[2]);
});
