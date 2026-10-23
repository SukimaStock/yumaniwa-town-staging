import test from 'node:test';
import assert from 'node:assert/strict';
import {caskDetailProfile} from '../cask-detail-view.mjs';
import {flavorMeter,flavorPhrase} from '../flavor-view.mjs';
const profile={roughness:.4,character:.5,wood:.1,flavor:{version:1,label:'果実のかおり豊か',primary:'fruit',profile:{fruit:.5,grain:.2,smoke:0,body:.1,rough:.4,spice:.1,wood:.1,vanilla:.1},history:[]}};
test('cask detail presents one summary, two headings and one strength per axis in the requested order',()=>{
 const before=JSON.stringify(profile),html=caskDetailProfile(profile);
 assert.equal((html.match(/class="flavor-type"/g)||[]).length,1);
 assert.equal((html.match(/<h3>原酒のかおり<\/h3>/g)||[]).length,1);
 assert.equal((html.match(/<h3>シゲキ・口当たり<\/h3>/g)||[]).length,1);
 assert.equal((html.match(/role="meter"/g)||[]).length,2);
 assert.equal((html.match(/class="flavor-phrase"/g)||[]).length,2);
 assert.ok(html.indexOf('flavor-type')<html.indexOf('<h3>原酒のかおり'));
 assert.ok(html.indexOf('<h3>原酒のかおり')<html.indexOf('<h3>シゲキ・口当たり'));
 assert.ok(!html.includes('原酒：')&&!html.includes('前：'));
 assert.equal(JSON.stringify(profile),before);
});
test('detail strength descriptions retain the existing value scale and thresholds without repeating headings',()=>{
 for(const [value,text] of [[.29,'ひかえめ'],[.3,'ほどよく感じる'],[.64,'ほどよく感じる'],[.65,'豊か']]){
  const p=structuredClone(profile);p.flavor.profile.fruit=value;
  const html=caskDetailProfile(p);assert.ok(html.includes('<small class="flavor-phrase">'+text+'</small>'));
  assert.ok(html.includes('aria-valuenow="'+value+'"'));assert.ok(html.includes('width:'+value/1.35*100+'%'));
 }
});
test('default tasting and comparison descriptions and prior markers remain unchanged',()=>{
 assert.equal(flavorPhrase(profile,'character'),'原酒：果実の香り · ほどよく感じる');
 const html=flavorMeter(profile,'character',{previousProfile:{...profile,flavor:{...profile.flavor,profile:{...profile.flavor.profile,fruit:.4}}}});
 assert.ok(html.includes('原酒：果実の香り · ほどよく感じる'));assert.ok(html.includes('flavor-previous'));assert.ok(html.includes('前回より増加'));
});
