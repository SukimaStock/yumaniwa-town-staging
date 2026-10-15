import test from 'node:test';
import assert from 'node:assert/strict';
import {shortTaste,shortChange} from '../tasting-view.mjs';
import {tasting} from '../model.mjs';
const sample=(roughness,character,wood)=>({profile:{roughness,character,wood},text:tasting({roughness,character,wood}).split('。').filter(Boolean)});
test('concise tasting preserves three real flavor categories without changing sample',()=>{
 const s=sample(.7,.9,.9),before=JSON.stringify(s);assert.deepEqual(shortTaste(s),['強い刺激','熟した果実と穀物','乾いた木の苦み']);assert.equal(JSON.stringify(s),before);
});
test('comparison keeps declining aroma and increasing wood even if roughness improves',()=>{
 const text=shortChange(sample(.2,.5,.7),sample(.5,.8,.4));assert(text.includes('香りが落ち着いた'));assert(text.includes('木の余韻が増した'));assert(text.includes('刺激がやわらいだ'));
 assert.equal(shortChange(sample(.5,.5,.1)), '初めての試飲');assert.equal(shortChange(sample(.5,.5,.1),sample(.5,.5,.1)),'味わいの変化はわずか');
});
