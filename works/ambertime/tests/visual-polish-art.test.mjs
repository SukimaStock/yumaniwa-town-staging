import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {stillArt,glass,bottleArt,brandArt} from '../room-object-art.mjs';
import {barrel,glass as caskGlass} from '../cask-glass-art.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const group=(svg,name)=>{const start=svg.indexOf(`<g class="${name}"`);assert(start>=0);return svg.slice(start,svg.indexOf('</g>',start)+4);};
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,k,v])=>[k,v]));
const rects=svg=>[...svg.matchAll(/<rect\b[^>]*\/>/g)].map(([tag])=>attrs(tag));
const colors=svg=>new Set(rects(svg).map(r=>r.fill));

test('accepted native pot markup is unchanged while the compact pipe meets its cap',()=>{
 const s=stillArt();assert.equal(hash(group(s,'still-pot')),'e9afd160e49e511edfec826a3eb386f3a5cbce58c1e97b706b8565e490a8ac65');
 const pipe=rects(group(s,'still-pipe')),pixels=new Set();
 for(const r of pipe)for(let y=+r.y;y<+r.y + +r.height;y++)for(let x=+r.x;x<+r.x + +r.width;x++)pixels.add(`${x},${y}`);
 const visited=new Set(),queue=[...pixels].slice(0,1);while(queue.length){const p=queue.pop();if(visited.has(p))continue;visited.add(p);const[x,y]=p.split(',').map(Number);for(const n of [`${x-1},${y}`,`${x+1},${y}`,`${x},${y-1}`,`${x},${y+1}`])if(pixels.has(n)&&!visited.has(n))queue.push(n);}
 assert.equal(visited.size,pixels.size,'no disconnected pipe segment');assert(pixels.has('17,20'),'pipe meets unchanged cap');
 assert.equal(Math.min(...pipe.map(r=>+r.y)),15);assert.equal(Math.max(...pipe.map(r=>+r.x + +r.width)),35);assert.doesNotMatch(group(s,'still-pipe'),/transform=|opacity=|stroke=/);
});

test('receiver fits native body, catches aligned drops and leaves sample glasses unchanged',()=>{
 const s=stillArt(),walls=rects(s).filter(r=>r.fill==='#b9c0aa');
 assert.equal(Math.min(...walls.map(r=>+r.x)),29);assert.equal(Math.max(...walls.map(r=>+r.x + +r.width)),39);
 assert.equal(Math.min(...walls.map(r=>+r.y)),27);assert.equal(Math.max(...walls.map(r=>+r.y + +r.height)),36);
 for(const r of rects(group(s,'distill-stream'))){assert.equal(+r.x,34);assert(+r.y>=24&&+r.y<27);}
 assert.match(s,/class="receiver-liquid" data-liquid-bottom="34"/);assert.equal(rects(group(s,'still-steam')).length,3);
 const room=['a5a9279ac4adf02112da72e267448b79e7586f407be5ca1e3d7e1348c5905270','8436ae8b0dfb71d5c405cb2aa247fbd48fccd84731cdca2e4276c500aa9b084e','de15a78060a4196d43a97dc2607441845c6d31f4e81f19cc6e5bfd346b05b1ea'];
 const older=['75c4acb326eca903f1efc14919fe4d04c9849b12b002a3cf796fed3c76669633','2b61d883e303dc8b0539110879218361a4fb3931da6ef3cd8fe0b76c63e91e40','f50b41300c95152447c5b95ce1d7f7172c909aef0a58b1f1ef8fd249869c7e85'];
 [0,.4,.9].forEach((wood,i)=>{assert.equal(hash(glass(wood,{sample:true})),room[i]);assert.equal(hash(caskGlass(wood,{sample:true})),older[i]);});
});

test('pot retains accepted palette while casks and bottles use source grids',()=>{
 const pot=group(stillArt(),'still-pot');assert(!colors(pot).has('#19141e'));
 for(const c of ['#b87333','#a3632d','#29adff','#ffff64','#5a5a64','#3c281e','#ab5236'])assert(colors(pot).has(c));
 for(const type of ['bourbon','refill']){assert.match(barrel(type),/viewBox="0 0 16 16"/);assert(!colors(barrel(type)).has('#19141e'));assert(colors(barrel(type)).has('#282832'));}
 for(const bottle of ['standard','slender']){const art=brandArt(.4,{bottle});assert.match(art,/viewBox="0 0 12 12"/);assert.doesNotMatch(art,/opacity=|stroke=/);assert(colors(art).has('#8f9a7d'));assert(!colors(art).has('#29adff'));}
});

test('every authored variant remains bounded integer rect cells with deterministic rendering',()=>{
 const examples=[[stillArt(),60,36],...[barrel('bourbon'),barrel('refill')].map(art=>[art,16,16]),[bottleArt(.4),12,12],...['standard','slender'].flatMap(bottle=>['paper','dark'].map(label=>[brandArt(.4,{bottle,label}),12,12]))];
 for(const [art,width,height]of examples){assert.doesNotMatch(art,/<(?:path|circle|ellipse|image|text|filter|animate|script)\b|transform=|\bon\w+=/);for(const r of rects(art)){const [x,y,w,h]=['x','y','width','height'].map(k=>Number(r[k]));assert([x,y,w,h].every(Number.isInteger));assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=width&&y+h<=height);}}
 assert.equal(stillArt(),stillArt());assert.equal(brandArt(.4,{bottle:'slender',label:'dark'}),brandArt(.4,{bottle:'slender',label:'dark'}));
});

// Integer coordinates alone do not preserve source pixels: require native1×1.
test('pot keeps its native16x16 grid with every source cell1x1',()=>{
 const rs=rects(group(stillArt(),'still-pot'));assert(rs.length>100);
 for(const r of rs){assert.equal(Number(r.width),1);assert.equal(Number(r.height),1);assert(Number(r.x)>=10&&Number(r.x)<26);assert(Number(r.y)>=20&&Number(r.y)<36);}
 assert.equal(Math.max(...rs.map(r=>Number(r.y)+Number(r.height))),36);
 const yellow=rs.filter(r=>r.fill==='#ffff64');assert.equal(yellow.length,5);
 assert.equal(Math.max(...yellow.map(r=>Number(r.x)))-Math.min(...yellow.map(r=>Number(r.x))),2);
 assert.equal(Math.max(...yellow.map(r=>Number(r.y)))-Math.min(...yellow.map(r=>Number(r.y))),2);
});
