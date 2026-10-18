'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const tool=require('../tools/shinpo-migrate.cjs'),root=path.resolve(__dirname,'..');
const hashes=['1a720343d2bfec982bd9c0aba98382b55afbbf22a9eab9f939fdc9dbf7959c09','61cca8f020c8e28e5b5032c1530e44be41af7d6e61c9b99d86ec2e4f87ca0610','cccb0989306579f5b235b6c64ec23e8345ecdd780c684e9cc2fdcb67d47f0879','959d85d130321ee420480c20bc10fab4575185bac65604b29c4f9b82a500b883','16f8b22d30a6a1b6d08fa688de80d2c3cce71017e2715a7bd3bb4ef94c9b187d','d66a03f19aa78f7052cbd73761d494b0350f2764dac2e554ef2c7337833625cb'];
function webp(b){
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.readUInt32LE(4)+8,b.length);
 let width,height,frames=0;
 for(let i=12;i+8<=b.length;){const kind=b.toString('ascii',i,i+4),size=b.readUInt32LE(i+4),d=i+8;assert(d+size<=b.length);
  if(kind==='VP8X'){width=b.readUIntLE(d+4,3)+1;height=b.readUIntLE(d+7,3)+1;}
  if(kind==='VP8 ' && !width){assert.equal(b.toString('hex',d+3,d+6),'9d012a');width=b.readUInt16LE(d+6)&16383;height=b.readUInt16LE(d+8)&16383;}
  if(kind==='VP8L' && !width){assert.equal(b[d],47);const v=b.readUInt32LE(d+1);width=(v&16383)+1;height=((v>>>14)&16383)+1;}
  if(kind==='ANMF')frames++;i=d+size+(size%2);
 }return {width,height,frames:frames||1};
}
test('six source media bytes retain dimensions, frames, provenance and exact insertion positions',()=>{
 const board=tool.load('95d48e6613ce4037907364809ee3359f'),town=tool.load('note-20260717-153a44e0');
 assert.equal(board.source.media.length,5);assert.equal(town.source.media.length,1);
 const anchors=['資源が増えるようにし、電線を引けるようにする。','すると、急に情報が頭に入ってくるようになりました。','手触りとして繋がらないものは、だいたい消えていきました。','なぜか「二人で焼き鳥を焼き合う」謎のゲームでした。','「自分が触っていて納得出来るもの」だったようです。','名前は、「湯間庭町（ゆまにわちょう）」。'];
 const captions=['','','プロトタイプ','ドット化一段階目','ドット化二段階目',''];
 [...board.source.media,...town.source.media].forEach((m,i)=>{
  const a=i===5?town:board,b=fs.readFileSync(path.join(root,m.path));
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hashes[i]);assert.equal(m.sha256,hashes[i]);
  assert.deepEqual(webp(b),i===5?{width:480,height:854,frames:69}:{width:887,height:1920,frames:1});
  assert.equal(m.after,anchors[i]);assert.equal(m.caption,captions[i]);assert.match(m.sourceUrl,/^https:\/\/assets\.st-note\.com\/img\//);
  const anchor=a.blocks.findIndex(x=>x.html.includes(anchors[i]));assert(anchor>=0);
  const figure=a.blocks[anchor+1];assert.equal(figure.origin,'source');assert(figure.html.includes('src="../../'+m.path+'"'));
  assert.equal((figure.html.match(/<figcaption>(.*?)<\/figcaption>/)||[])[1]||'',captions[i]);
 });
 assert.equal(board.blocks.filter(b=>b.html.startsWith('<figure>')).length,5);assert.equal(town.blocks.filter(b=>b.html.startsWith('<figure>')).length,1);
 assert(board.cover.includes('backnumber/board-game-cover.png'));assert(town.cover.includes('town-beginning/cover.png'));
 assert.deepEqual(board.source.missingMedia,[]);assert.deepEqual(town.source.missingMedia,[]);
 assert(!board.blocks.some(b=>b.origin==='editorial-media-note'));
});
test('source external links and three canonical X posts are retained without injected embeds',()=>{
 const town=tool.load('note-20260717-153a44e0'),game=tool.load('31beb527cad14b72a2afdc57f4b986b4');
 const body=town.blocks.map(b=>b.html).join('\n');
 for(const url of ['https://sukimastock.itch.io/yakitori-wars','https://sukimastock.itch.io/midnight-cola','https://sukimastock.github.io/yumaniwa-town/'])assert(body.includes('href="'+url+'"'));
 assert(town.afterword.includes('../../?place=shinpo_board'));
 const citations=game.blocks.filter(b=>b.html.includes('video-citation'));assert.equal(citations.length,3);
 ['2053552847078170744','2056457725253427457','2054447396487102904'].forEach((id,i)=>assert(citations[i].html.includes('href="https://x.com/sukimastock/status/'+id+'"')));
 assert(!game.blocks.some(b=>/<(?:img|iframe|script|video)\b/.test(b.html)));
});
