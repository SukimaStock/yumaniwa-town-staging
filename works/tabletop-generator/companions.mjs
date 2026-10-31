import {mealScene} from './meals.mjs';
const path=(d,color,extra={})=>({d,color,...extra});
const oval=(x,y,rx,ry,color)=>({ellipse:[x,y,rx,ry],color});
const surface=(id,z,surfaces,extra={})=>({id,kind:'surface',z,surfaces,...extra});
export function companionScene(settings,base){
 const scene={...base,settings,objects:base.objects.filter(o=>o.kind==='cloth')},c=scene.colors;
 Object.assign(c,{plateWell:c.rim,pretzel:'#b4773e',pretzelLight:'#ce9250',salt:'#f8edcc',mustard:'#cba33c',stem:'#637857',flower:settings.palette==='dusk'?'#e5a17c':'#c56d53',flowerCenter:'#8b553c'});
 if(settings.study==='pretzel-beer-01'){
  scene.title='プレッツェルとビール';scene.objects.push(...base.objects.filter(o=>['bottle','beer-glass','cap'].includes(o.kind)));
  scene.objects.push(surface('plate',3,[oval(443,554,218,60,'inside'),oval(443,547,218,60,'bowl'),oval(443,545,198,50,'plateWell')],{support:'table',contact:{x:443,y:614},inner:{x:443,y:545,rx:198,ry:50}}));
  const outline='M370 507 C330 481 334 436 367 422 C401 406 425 438 441 466 C458 440 479 411 511 420 C551 430 558 475 527 503 C509 520 480 531 447 532 C416 532 389 523 370 507 Z M384 475 C369 470 366 450 379 445 C393 438 405 459 415 478 C402 482 392 480 384 475 Z M474 479 C487 454 499 439 512 447 C529 461 511 479 499 483 C488 485 481 483 474 479 Z M414 502 Q444 512 474 501 L444 484 Z';
  scene.objects.push(surface('pretzel',4,[path(outline,'pretzel',{fillRule:'evenodd'}),path('M382 424 Q410 439 459 488 L477 501 L466 508 Q425 464 377 434 Z','pretzelLight'),path('M505 425 Q485 444 463 469 L455 461 Q476 436 498 420 Z','pretzelLight'),path('M366 450 L374 447 L376 454 L368 457 Z M397 430 L404 434 L400 441 L393 437 Z M513 475 L520 471 L523 477 L516 481 Z M429 519 L437 519 L437 525 L429 525 Z','salt')],{support:'plate',contact:{x:448,y:578.2},frame:{scale:1.15,scaleY:.76,x:-66.05,y:173.88},holeCenters:[[389,459],[503,462],[444,500]]}));
  scene.objects.push(surface('mustard-dish',5,[oval(635,615,43,16,'inside'),oval(635,610,43,16,'bowl'),oval(635,609,32,10,'mustard')],{support:'table',contact:{x:635,y:631}}));
 }else{
  scene.title='花のある食卓';
  const coffee=mealScene({...settings,study:'bread-coffee-01'},base);
  scene.objects.push(...coffee.objects.filter(o=>['saucer','coffee-cup'].includes(o.id)));
  const stems=[
   {id:'stem-left',outline:'M309 393 C313 330 286 269 267 216 L272 214 C292 270 319 330 315 393 Z',root:[312,380],tip:[270,216],bloom:'flower-left'},
   {id:'stem-middle',outline:'M320 391 C325 335 321 286 319 244 L324 243 C327 285 331 338 326 391 Z',root:[323,380],tip:[322,244],bloom:'flower-middle'},
   {id:'stem-right',outline:'M328 391 C325 338 355 306 374 274 L379 277 C360 308 331 341 334 391 Z',root:[331,380],tip:[377,276],bloom:'flower-right'}
  ];
  for(const stem of stems)scene.objects.push(surface(stem.id,0.5,[path(stem.outline,'stem')],{anchoredTo:'vase',root:stem.root,tip:stem.tip,bloom:stem.bloom}));
  const blooms=[
   {id:'flower-left',x:270,y:211,d:'M244 201 Q244 184 259 193 Q271 177 282 194 Q300 186 297 205 Q296 224 273 229 Q252 226 244 201 Z'},
   {id:'flower-middle',x:322,y:242,d:'M298 231 Q294 214 309 221 Q320 207 333 222 Q349 215 347 233 Q343 251 323 255 Q302 250 298 231 Z'},
   {id:'flower-right',x:377,y:273,d:'M353 266 Q349 250 365 256 Q379 242 390 258 Q407 252 402 271 Q394 287 377 287 Q360 282 353 266 Z'}
  ];
  for(const b of blooms)scene.objects.push(surface(b.id,1,[path(b.d,'flower'),oval(b.x,b.y,6,4,'flowerCenter')],{attachedTo:stems.find(s=>s.bloom===b.id).id,center:{x:b.x,y:b.y},bounds:{left:b.x-28,right:b.x+28,top:b.y-32,bottom:b.y+18}}));
  scene.objects.push(surface('vase',3,[path('M303 366 L341 366 L343 426 C343 443 373 471 374 498 L368 549 Q366 564 351 564 H292 Q277 564 276 549 L270 503 C269 478 300 446 301 427 Z','bottle'),oval(322,366,21,6,'bottleLip'),oval(322,367,16,3,'bottleMouth')],{support:'table',contact:{x:322,y:564},mouth:{left:301,right:343,top:360,bottom:393}}));
  scene.objects.push(surface('empty-plate',4,[oval(480,607,185,50,'inside'),oval(480,600,185,50,'bowl'),oval(480,598,165,40,'plateWell')],{support:'table',contact:{x:480,y:657}}));
 }
 scene.objects.sort((a,b)=>a.z-b.z);return scene;
}
