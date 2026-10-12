// Native Canvas render QA; not a browser or hardware touch test.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {RainGame} from '../game.mjs';
import {RainDrawing} from '../draw.mjs';
const require=createRequire(import.meta.url),{createCanvas}=require('@napi-rs/canvas');
const out=process.argv[2]||new URL('../visual-review/',import.meta.url).pathname;mkdirSync(out,{recursive:true});
for(const [name,level,wide] of [['opening',0,false],['roof-five',4,false],['landscape',4,true]]){
 const g=new RainGame();g.level=level;g.load();const d=new RainDrawing(wide),c=createCanvas(d.width,d.height);d.draw(c.getContext('2d'),g,level?0:1);writeFileSync(`${out}/${name}.png`,c.toBuffer('image/png'));
}
const g=new RainGame();g.level=4;g.load();g.phase='end';g.age=4;g.filled=5;const d=new RainDrawing(),c=createCanvas(400,760);d.draw(c.getContext('2d'),g,1);writeFileSync(`${out}/ending.png`,c.toBuffer('image/png'));
console.log('Native Canvas: opening / roof-five / landscape / ending.');
