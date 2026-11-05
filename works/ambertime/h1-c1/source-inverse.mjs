import assert from 'node:assert/strict';
// Restore only the reviewed C1 substitutions. Every other byte still reaches
// the existing immutable B2 oracle and unrelated changes cannot be hidden.
const changes={
 'shop-app.mjs':[
  ["import {createCaskSerials} from './cask-serials.mjs?v=market-rules-r1';","import {createCaskSerials} from './cask-serials.mjs?v=market-rules-r1&startup=h1-c1-2';"],
  ['const caskSerials=createCaskSerials();','const caskSerials=createCaskSerials({validate:D.validateDistillery});']
 ],
 'index.html':[['save=h1-b2-2&amp;debug=','save=h1-b2-2&amp;startup=h1-c1-2&amp;debug=']],
 'cask-serials.mjs':[
  ['export function createCaskSerials(){','// The app can share its strict validator. Replay stays in this module’s model\n// instance so validations of historical prefixes cannot replace the app cache.\nexport function createCaskSerials({validate=D.validateDistillery}={}){'],
  ['  D.validateDistillery(state);','  validate(state);']
 ]
};
export function beforeC1(source,name){
 for(const [before,after] of changes[name]??[]){
  assert.equal(source.split(after).length,2,'exact reviewed C1 hunk: '+name);
  source=source.replace(after,before);
 }
 return source;
}
