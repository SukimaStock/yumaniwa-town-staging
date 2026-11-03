import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'),game=read('shop-app.mjs'),debug=read('debug.html'),script=read('debug.mjs');

test('normal game has ledger but no visible save entry',()=>{
 assert.match(html,/<div class="book-entries"><button id="open-ledger" type="button">帳面<\/button><\/div>/);
 assert.doesNotMatch(html,/<div class="book-entries">[^<]*<button[^>]*id="open-settings"/);
 assert.match(html,/<button id="open-settings" type="button" hidden>デバッグ<\/button>/);
 assert.match(game,/\$\('open-settings'\)\.hidden=query\.get\('debug'\)!=='1'/);
});
test('recovery, old-source adoption and existing management actions remain',()=>{
 for(const id of ['save-choice','save-sources','save-source-confirm','save-source-new','retry-save','recovery','reset','save-status']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 for(const name of ['copyToFormal','writeCandidate','readSession','formalSources','settings-reset','market-rules-adopt','connected-export']){
  assert.ok(game.includes(name),name);
 }
});
test('debug page is independent and opt-in',()=>{
 assert.match(debug,/<title>AmberTime｜デバッグ<\/title>/);
 assert.match(debug,/<script type="module" src="\.\/debug\.mjs\?v=a4-debug-1"><\/script>/);
 assert.match(debug,/href="\.\/\?debug=1"/);
 assert.match(debug,/name="viewport"/);
 assert.match(debug,/name="robots" content="noindex,nofollow"/);
 assert.doesNotMatch(debug,/shop-app\.mjs/);
});
test('debug record handling never writes or removes stored progress',()=>{
 assert.match(script,/FORMAL_SAVE_KEY,FORMAL_SOURCES/);
 assert.match(script,/localStorage\.getItem\(item\.key\)/);
 assert.match(script,/download\(raw,item\.filename\)/);
 assert.doesNotMatch(script,/localStorage\.(?:setItem|removeItem|clear)\s*\(/);
 assert.doesNotMatch(script,/writeCandidate|copyToFormal|newMarketRulesDistillery/);
 assert.match(script,/if\(current!==raw\)\{/);
});
