import test from'node:test';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import{bottles,codeaBottle}from'../codea-object-art.mjs';import{brandArt,stillArt,glass}from'../room-object-art.mjs';import{IDENTITY_BOTTLES,IDENTITY_LABELS,CAP_COLORS}from'../brand-identity.mjs';
const pixels=svg=>new Map([...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="1" height="1" fill="(#[a-f\d]+)"\/>/g)].map(([,x,y,c])=>[x+','+y,c]));
test('every shape/label/tier keeps exactly the source opaque cells; caps only replace their original top cells',()=>{
 for(const b of IDENTITY_BOTTLES)for(const label of IDENTITY_LABELS){const source=pixels(codeaBottle(b.shape));for(const [tier,color]of Object.entries(CAP_COLORS)){const svg=brandArt(0,{bottle:b.id,label:label.id},tier),actual=pixels(svg);assert.deepEqual([...actual.keys()],[...source.keys()]);assert.match(svg,/viewBox="0 0 12 12"/);assert.doesNotMatch(svg,/stroke=|opacity=|transform=/);for(const [key,value]of actual){const[x,y]=key.split(',').map(Number),index=bottles[b.shape][y][x];if(y>=1&&y<=(b.shape==='tall'?2:1))assert.equal(value,color);else if(index===6||index===7)assert.equal(value,label.color);else if(b.shape==='fancy'&&x===5&&y===6)assert.equal(value,label.detail);else assert.equal(value,source.get(key));}
  const standard=pixels(brandArt(0,{bottle:b.id,label:label.id},'standard'));for(const [key,value]of actual)if(standard.get(key)!==value){const y=+key.split(',')[1];assert(y>=1&&y<=(b.shape==='tall'?2:1));}
 }}
});
test('player names never enter SVG and protected apparatus/sample glasses remain byte exact',async()=>{
 assert.equal(brandArt(0,{name:'<script>x</script>',bottle:'fancy',label:'dark'}),brandArt(0,{bottle:'fancy',label:'dark'}));
 const text=execFileSync('git',['show','0aa346d6479177df4d39f7db100e72acbb577b8d:works/ambertime/room-object-art.mjs'],{encoding:'utf8'}).replace(/from '\.\/codea-object-art[^']+'/g,`from '${new URL('../codea-object-art.mjs',import.meta.url).href}'`).replace(/from '\.\/brand-identity[^']+'/g,`from '${new URL('../brand-identity.mjs',import.meta.url).href}'`),base=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
 const hash=x=>createHash('sha256').update(x).digest('hex');assert.equal(hash(stillArt()),hash(base.stillArt()));for(const n of [0,.4,.9])assert.equal(glass(n,{sample:true}),base.glass(n,{sample:true}));
});
