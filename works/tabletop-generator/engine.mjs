import * as legacy from './versions/0.1/engine.mjs';
export const VERSION=2;
export const PALETTES=legacy.PALETTES;
export const random=legacy.random;
const finishes=['original','print','watercolor'];
export function normalizeSettings(input={}) {
 if(input.version===1||input.version==='1'||input.v==='1')return legacy.normalizeSettings(input);
 return {version:2,study:'lemon-01',texture:finishes.includes(input.texture)?input.texture:'original'};
}
export function generateScene(input={}) {
 const settings=normalizeSettings(input);
 if(settings.version===1)return legacy.generateScene(settings);
 // One authored composition. Geometry, subject and colors do not consume a seed.
 return {settings,study:true,width:900,height:720,
  colors:{paper:'#eee6d3',table:'#ce937a',cloth:'#7d9f96',fold:'#71938b',bottle:'#315f70',bottleSide:'#2c5665',bottleMouth:'#244c5b',bowl:'#f7efd9',inside:'#d7d0b7',rim:'#fff7e4',lemon:'#e4b444',lemonLight:'#edc453',leaf:'#5d7453'},
  objects:[
   {id:'cloth',kind:'cloth',z:0,outline:'M343 485 L769 505 L876 720 L399 720 Z',fold:'M754 505 L769 505 L876 720 L856 720 Z'},
   {id:'bottle',kind:'bottle',z:1,mouth:{x:257,y:148,rx:24,ry:7},base:580,outline:'M233 148 L281 148 L282 255 C282 281 303 295 325 319 C340 335 346 353 346 377 L346 559 Q346 580 325 580 L191 580 Q171 580 171 559 L171 378 C171 352 178 334 195 316 C216 295 233 279 233 255 Z',side:'M315 308 C335 329 346 348 346 377 L346 559 Q346 580 325 580 L315 580 Z'},
   {id:'bowl-back',kind:'ellipse',z:2,x:550,y:466,rx:174,ry:33,color:'inside'},
   {id:'lemon-in-left',kind:'lemon',z:3,x:479,y:449,rx:62,ry:43,angle:-22,color:'lemonLight',parent:'bowl-back',leaf:true},
   {id:'lemon-in-right',kind:'lemon',z:4,x:608,y:442,rx:62,ry:43,angle:21,color:'lemon',parent:'bowl-back'},
   {id:'bowl-front',kind:'bowl',z:5,base:613,outline:'M376 466 C391 493 467 505 550 505 C634 505 709 493 724 466 C713 541 673 600 608 613 L492 613 C426 599 388 541 376 466 Z',rim:'M376 466 C398 490 470 500 550 500 C631 500 702 490 724 466 L722 474 C694 499 625 510 550 510 C475 510 406 499 378 474 Z'},
   {id:'lemon-front',kind:'lemon',z:6,x:715,y:630,rx:66,ry:43,angle:-16,color:'lemonLight',support:'table',base:674}
  ]};
}
