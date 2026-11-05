// Explicit reviewed B2-only inverse for historical refactoring proofs. Current
// behavior has separate actual-codec, app-failure and browser coverage. No prior
// immutable hash or source oracle is changed; unrelated bytes flow to old pins.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const deltas=JSON.parse(readFileSync(new URL('./h1-b2-source-inverse.json',import.meta.url),'utf8'));
export function beforeB2(source,name){
 const marker=name==='shop-app.mjs'?'placement-save.mjs?v=h1-b2-1':name==='index.html'?'save=h1-b2-1':null;
 if(!marker||!source.includes(marker))return source;
 for(const {before,after}of deltas[name].hunks){assert.equal(source.split(after).length-1,1,'exact reviewed B2 hunk: '+name);source=source.replace(after,before);}
 return source;
}
