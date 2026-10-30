import * as legacy from './versions/0.2/engine.mjs';
import {fruitForm} from './fruit-forms.mjs';
export const VERSION=3;
export const PALETTES=legacy.PALETTES;
export const random=legacy.random;
export const DRINKS=[{id:'white-wine',name:'白ワイン'},{id:'red-wine',name:'赤ワイン'},{id:'beer',name:'ビール'}];
export const FRUITS=[{id:'lemon',name:'レモン'},{id:'orange',name:'オレンジ'},{id:'pear',name:'洋梨'}];
export const TABLE_PALETTES={
 cream:{name:'クリームと青緑',paper:'#eee6d3',table:'#ce937a',cloth:'#7d9f96',fold:'#71938b',bottle:'#315f70',redBottle:'#435950',beerBottle:'#895733',bowl:'#f7efd9',inside:'#d7d0b7',rim:'#fff7e4',glass:'#eff0dd',glassLine:'#faf3de',lemon:'#e4b444',lemonLight:'#edc453',orange:'#d67839',orangeLight:'#e68f43',pear:'#9d9f56',pearLight:'#b9b568'},
 coast:{name:'青磁と杏',paper:'#e5e8dd',table:'#b3c8c3',cloth:'#ba846d',fold:'#a8735f',bottle:'#366b74',redBottle:'#3e5962',beerBottle:'#835432',bowl:'#faf3dd',inside:'#d5cfb6',rim:'#fff9e8',glass:'#eef3e5',glassLine:'#fff8e4',lemon:'#dfb344',lemonLight:'#ebc457',orange:'#d5733a',orangeLight:'#e99046',pear:'#9ba35c',pearLight:'#b7ba72'},
 olive:{name:'オリーブと赤土',paper:'#e9dfc4',table:'#a8ad87',cloth:'#a96d59',fold:'#935e4e',bottle:'#4f6555',redBottle:'#48543d',beerBottle:'#98623b',bowl:'#fbefd4',inside:'#d8cbaa',rim:'#fff5dc',glass:'#edf0d5',glassLine:'#fff4d9',lemon:'#e1b13e',lemonLight:'#efc45a',orange:'#cf6c35',orangeLight:'#e88e43',pear:'#9d9a4e',pearLight:'#bdb567'},
 dusk:{name:'藍と砂色',paper:'#384658',table:'#6c7b82',cloth:'#bd8e74',fold:'#aa7b64',bottle:'#9daead',redBottle:'#9ea88b',beerBottle:'#b27d4b',bowl:'#f2e4ca',inside:'#c8bca7',rim:'#f7ecd6',glass:'#e6e5d1',glassLine:'#f6ecd3',lemon:'#d9ac3c',lemonLight:'#ebc454',orange:'#d88241',orangeLight:'#eba455',pear:'#b4ae5c',pearLight:'#d0c17a'}
};
const finishes=['original','print','watercolor'];
const choose=(v,choices,fallback)=>choices.includes(v)?v:fallback;
const shade=(hex,k)=>'#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*k)).toString(16).padStart(2,'0')).join('');
export function normalizeSettings(input={}){
 if([1,2,'1','2'].includes(input.version)||input.v==='1')return legacy.normalizeSettings(input);
 return {version:3,study:'table-01',drink:choose(input.drink,DRINKS.map(d=>d.id),'white-wine'),fruit:choose(input.fruit,FRUITS.map(f=>f.id),'lemon'),palette:choose(input.palette,Object.keys(TABLE_PALETTES),'cream'),texture:choose(input.texture,finishes,'original')};
}
export function generateScene(input={}){
 const settings=normalizeSettings(input);
 if(settings.version<3)return legacy.generateScene(settings);
 const scene=legacy.generateScene({version:2,study:'wine-lemon-02',texture:settings.texture});
 scene.settings=settings;
 scene.title=`${DRINKS.find(d=>d.id===settings.drink).name}と${FRUITS.find(f=>f.id===settings.fruit).name}`;
 Object.assign(scene.colors,TABLE_PALETTES[settings.palette]);
 const c=scene.colors,object=id=>scene.objects.find(o=>o.id===id),bottle=object('bottle'),glass=object('wine-glass'),stopper=object('removed-cork');
 bottle.colorRole=settings.drink==='red-wine'?'redBottle':settings.drink==='beer'?'beerBottle':'bottle';
 c.bottle=c[bottle.colorRole];c.bottleSide=shade(c.bottle,.89);c.bottleMouth=shade(c.bottle,.68);c.bottleLip=shade(c.bottle,1.22);
 c.wine=settings.drink==='red-wine'?'#8f3543':settings.drink==='beer'?'#d39d3e':'#d7b96c';
 c.wineTop=settings.drink==='red-wine'?'#a94c58':settings.drink==='beer'?'#e3b55d':'#e6ce89';
 c.stem=shade(c[settings.fruit],.55);c.foam='#fff9eb';c.cork='#b88b58';c.corkEnd='#957047';c.cap='#d6c899';c.capEdge='#9f9472';
 glass.id='drink-glass';glass.drink=settings.drink;glass.sides=glass.outline.replace(/\s*Z\s*$/i,'');
 stopper.id='removed-stopper';stopper.drink=settings.drink;
 if(settings.drink==='beer'){
  bottle.mouth={x:257,y:218,rx:24,ry:7};bottle.frame={scale:.84,x:14.12,y:52.8};
  bottle.outline='M233 218 L281 218 L282 290 C282 310 305 327 327 342 C340 352 346 366 346 385 L346 559 Q346 580 325 580 L191 580 Q171 580 171 559 L171 385 C171 363 181 350 198 339 C218 325 233 308 233 290 Z';
  bottle.side='M315 333 C337 348 346 365 346 385 L346 559 Q346 580 325 580 L315 580 Z';
  glass.kind='beer-glass';glass.top=345;glass.level=390;
  glass.outline='M716 345 L828 345 L823 584 Q823 595 812 595 H732 Q721 595 720 584 Z';
  glass.sides='M716 345 L720 584 Q721 595 732 595 H812 Q823 595 823 584 L828 345';
  glass.liquid='M719 348 H825 L820 583 Q820 592 811 592 H733 Q724 592 723 583 Z';
  glass.foam='M719 348 H825 L824 380 Q772 390 720 380 Z';
  stopper.kind='cap';stopper.angle=0;stopper.base=615;
 }
 // Keep the slender bottle partly behind the bowl; label follows the bottle surface.
 bottle.widthScale=.72;bottle.frame.x+=16;
 bottle.label={x:190,y:settings.drink==='beer'?400:385,width:134,height:110};c.label=c.bowl;
 for(const [i,id]of ['lemon-in-left','lemon-in-right','lemon-front'].entries()){
  const fruit=object(id);fruit.id=['fruit-in-left','fruit-in-right','fruit-front'][i];fruit.kind='fruit';fruit.variety=settings.fruit;fruit.color=i===1?settings.fruit:settings.fruit+'Light';fruit.leaf=false;
  if(settings.fruit==='orange'){fruit.rx=i===2?49:52;fruit.ry=i===2?46:49;fruit.angle=i===0?-7:i===1?9:0;}
  if(settings.fruit==='pear'){fruit.rx=i===2?44:46;fruit.ry=i===2?54:61;fruit.angle=i===0?-10:i===1?11:-12;}
  const form=fruitForm(fruit.variety,fruit.rx,fruit.ry,fruit.angle);
  fruit.outline=form.path;fruit.stem=form.stemPath||'';fruit.bounds={left:form.left,right:form.right,top:form.top,bottom:form.bottom};
  if(i===2)fruit.y=fruit.base-form.bottom;
 }
 return scene;
}
