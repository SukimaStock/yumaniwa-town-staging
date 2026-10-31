// Global SVG surfaces and contact points are scene data, independent of rendering.
const surface=(id,z,surfaces,extra={})=>({id,kind:'surface',z,surfaces,...extra});
const path=(d,color)=>({d,color});
const oval=(x,y,rx,ry,color)=>({ellipse:[x,y,rx,ry],color});
function plate(x,y,rx,ry){return surface('plate',3,[oval(x,y+7,rx,ry,'inside'),oval(x,y,rx,ry,'bowl'),oval(x,y-2,rx-20,ry-10,'plateWell')],{support:'table',contact:{x,y:y+7+ry},inner:{x,y:y-2,rx:rx-20,ry:ry-10}});}
export function mealScene(settings,base){
 const scene={...base,settings,objects:base.objects.filter(o=>o.kind==='cloth')};
 const c=scene.colors;
 Object.assign(c,{plateWell:c.rim,cheese:'#e6bd62',cheeseCut:'#f1d48a',cheeseSide:'#cba255',cheeseRind:'#b98245',bread:'#b77a43',crust:'#8d5635',crumb:'#efd4a2',breadScore:'#dca86a',coffee:'#574034',coffeeEdge:'#8c6750',cup:c.bottle});
 if(settings.study==='wine-cheese-01'){
  scene.title='チーズとワイン';
  scene.objects.push(...base.objects.filter(o=>['bottle','glass','cork'].includes(o.kind)));
  scene.objects.find(o=>o.kind==='cork').x=229;
  scene.objects.push(plate(468,565,215,63));
  scene.objects.push(surface('cheese-wedge',4,[
   path('M382 520 L450 565 L450 599 L382 554 Z','cheeseSide'),
   path('M450 565 L575 527 L575 563 L450 599 Z','cheese'),
   path('M382 520 L484 466 Q535 480 575 527 L450 565 Z','cheeseCut'),
   path('M484 466 Q535 480 575 527 L571 534 Q531 488 478 472 Z','cheeseRind')
  ],{support:'plate',contact:{x:450,y:599}}));
  scene.objects.push(surface('cheese-slice',5,[
   path('M570 575 L626 552 L642 579 L586 602 L586 609 L570 582 Z','cheeseSide'),
   path('M586 602 L642 579 L642 586 L586 609 Z','cheese'),
   path('M570 575 L626 552 L642 579 L586 602 Z','cheeseCut')
  ],{support:'plate',cutFrom:'cheese-wedge',contact:{x:608,y:594}}));
 }else{
  scene.title='パンとコーヒー';
  scene.objects.push(surface('saucer',1,[oval(674,510,104,27,'inside'),oval(674,506,104,27,'bowl')],{support:'table',contact:{x:674,y:537}}));
  scene.objects.push(surface('coffee-cup',2,[
   path('M738 352 C802 340 811 447 743 465 L738 446 C780 447 782 364 741 370 Z','cup'),
   path('M594 340 L606 479 Q610 500 673 500 Q736 500 741 479 L750 340 Z','cup'),
   oval(672,340,78,20,'rim'),oval(672,341,65,13,'coffeeEdge'),oval(672,342,62,11,'coffee')
  ],{support:'saucer',contact:{x:673,y:500},handle:{join:[738,352],body:[594,750,340,500]}}));
  scene.objects.push(plate(393,563,205,55));
  scene.objects.push(surface('bread-loaf',4,[
   path('M278 538 C272 493 302 460 347 452 C382 444 419 454 445 477 L484 520 Q493 535 479 552 Q413 584 316 568 Q287 564 278 538 Z','bread'),
   path('M278 538 Q354 568 484 526 L479 552 Q413 584 316 568 Q287 564 278 538 Z','crust'),
   path('M332 461 Q316 480 320 499 Q324 503 330 498 Q325 477 340 458 Z','breadScore'),
   path('M378 454 Q360 475 365 497 Q370 503 375 496 Q371 475 388 456 Z','breadScore')
  ],{support:'plate',contact:{x:366,y:568}}));
  scene.objects.push(surface('torn-bread',5,[
   path('M473 533 L494 512 L507 518 L515 510 L535 518 L541 514 Q574 535 567 561 L549 583 Q511 590 479 571 Z','bread'),
   path('M475 533 L493 523 L500 529 L511 523 L528 532 L538 526 L546 535 L535 563 L516 571 L482 558 Z','crumb')
  ],{support:'plate',tornFrom:'bread-loaf',contact:{x:523,y:580}}));
 }
 scene.objects.sort((a,b)=>a.z-b.z);
 return scene;
}
