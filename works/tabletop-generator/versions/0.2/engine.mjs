import * as legacy from '../0.1/engine.mjs';
export const VERSION=2;
export const PALETTES=legacy.PALETTES;
export const random=legacy.random;
const finishes=['original','print','watercolor'];
export function normalizeSettings(input={}) {
 if(input.version===1||input.version==='1'||input.v==='1')return legacy.normalizeSettings(input);
 return {version:2,study:['lemon-01','wine-lemon-01'].includes(input.study)?input.study:'wine-lemon-02',texture:finishes.includes(input.texture)?input.texture:'original'};
}
export function generateScene(input={}) {
 const settings=normalizeSettings(input);
 if(settings.version===1)return legacy.generateScene(settings);
 // One authored composition. Geometry, subject and colors do not consume a seed.
 const scene={settings,study:true,width:900,height:720,
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
 if(settings.study==='wine-lemon-01'||settings.study==='wine-lemon-02'){
  Object.assign(scene.colors,{glass:'#eff0dd',glassLine:'#faf3de',wine:'#d7b96c',cork:'#b88b58',corkEnd:'#957047'});
  const object=id=>scene.objects.find(o=>o.id===id);
  object('bottle').opened=true;
  // The bowl's front is painted after the two lemons; their lower halves sit inside it.
  object('lemon-in-left').leaf=false;object('lemon-in-left').y=481;object('lemon-in-left').x=485;
  object('lemon-in-right').y=476;object('lemon-in-right').x=606;
  // One glass behind the bowl, a removed cork close to the opened bottle.
  scene.objects.splice(2,0,{id:'wine-glass',kind:'glass',bottle:'bottle',x:772,top:314,base:595,level:385,outline:'M718 314 C716 368 728 425 748 449 Q772 470 796 449 C816 425 828 368 826 314 Z',liquid:'M723 385 C729 416 738 439 752 450 Q772 464 792 450 C806 439 815 416 821 385 Z'});
  scene.objects.push({id:'removed-cork',kind:'cork',x:345,y:632,angle:14,bottle:'bottle',width:49,height:22});
  object('lemon-front').x=690;object('lemon-front').y=650;object('lemon-front').base=695;
  scene.objects.forEach((o,z)=>{o.z=z;});
 }
 if(settings.study==='wine-lemon-02'){
  const object=id=>scene.objects.find(o=>o.id===id);
  // Main mass: wider bowl and its contents move as one vessel, keeping occlusion intact.
  const bowlFrame={scale:1.08,x:-144,y:-33.28};
  for(const id of ['bowl-back','lemon-in-left','lemon-in-right','bowl-front'])object(id).frame={...bowlFrame};
  // Bottle recedes behind the bowl; the glass balances it without hugging the right edge.
  object('bottle').frame={scale:.78,x:29.54,y:87.6};
  object('wine-glass').frame={scale:.88,x:36.64,y:-3.6};
  object('cloth').outline='M244 490 L635 468 L760 720 L160 720 Z';
  object('cloth').fold='M622 469 L635 468 L760 720 L742 720 Z';
  Object.assign(object('lemon-front'),{x:600,y:654,rx:60,ry:40,angle:-25,base:699});
  Object.assign(object('removed-cork'),{x:277,y:606,angle:-18});
 }
 return scene;
}
