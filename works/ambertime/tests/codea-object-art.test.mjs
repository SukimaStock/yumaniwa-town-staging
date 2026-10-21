import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {Cask,BottleStandard,BottleFancy,BottleSquare,BottleTall,sourcePalette,caskPalettes,codeaCask,codeaBottle} from '../codea-object-art.mjs';
const reference=JSON.parse(fs.readFileSync(new URL('../design/codea-cask-bottles/source-reference.json',import.meta.url)));
const matrices={Cask,BottleStandard,BottleFancy,BottleSquare,BottleTall};
const sourceRows=name=>matrices[name];
function actual(svg){return [...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="([^"]+)"\/>/g)].map(([,x,y,w,h,color])=>{assert.equal(+w,1);assert.equal(+h,1);return [+x,+y,color];});}
const expected=(rows,palette)=>rows.flatMap((row,y)=>row.flatMap((index,x)=>index?[[x,y,palette[index]]]:[]));
const original={4:'#32ff32',6:'#ffc832',7:'#646464',9:'#29adff',10:'#3c281e',11:'#644632',12:'#a0785a',13:'#282832',14:'#5a5a64',16:'#19141e',17:'#f0e6c8',18:'#28285a',19:'#c8c8dc',20:'#b87333',21:'#c89632',22:'#ffff64'};
test('all five matrices including transparent borders match independent Lua extraction digests',()=>{
 for(const [name,rows]of Object.entries({Cask,BottleStandard,BottleFancy,BottleSquare,BottleTall})){assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),reference.assets.find(x=>x.name===name).matrixSha256,name);assert.equal(rows.length,name==='Cask'?16:12);assert(rows.every(r=>r.length===rows.length));assert(Object.isFrozen(rows)&&rows.every(Object.isFrozen));}
 assert.deepEqual(sourcePalette,original);
});
test('every rendered cask cell matches the source and its original wood palette swap',()=>{
 const palettes={bourbon:{10:'#503214',11:'#b46e28',12:'#dca050'},refill:{10:'#463c32',11:'#a09678',12:'#c8beaa'}};
 assert.deepEqual(caskPalettes,palettes);
 for(const type of Object.keys(palettes)){const svg=codeaCask(type);assert.deepEqual(actual(svg),expected(sourceRows('Cask'),{...original,...palettes[type]}));assert.match(svg,/data-content-bottom="15"/);assert.doesNotMatch(svg,/stroke=|opacity=|transform=|#19141e/);}
});
test('bottle source cells are preserved with muted glass and the author-requested Fancy label center',()=>{
 for(const shape of ['standard','fancy','square','tall']){const name='Bottle'+shape[0].toUpperCase()+shape.slice(1),rows=sourceRows(name),svg=codeaBottle(shape);const cells=expected(rows,{...original,9:'#8f9a7d'}).map(([x,y,color])=>[x,y,shape==='fancy'&&x===5&&y===6?original[6]:color]);assert.deepEqual(actual(svg),cells);assert.match(svg,/viewBox="0 0 12 12" width="12" height="12"/);assert.match(svg,new RegExp('data-content-bottom="'+(shape==='square'?10:11)+'"'));assert.doesNotMatch(svg,/stroke=|opacity=|transform=|#29adff/);}
});
