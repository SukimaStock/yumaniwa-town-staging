/* Authored comparison data, independent of fruit tuning and the adopted course. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./world.js'):root.FruitLabWorld);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FruitLabCourses=api;
})(typeof window!=='undefined'?window:globalThis,function(W){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const holes=[
    {id:'down',x:500,y:490,direction:-1,entryLayer:'surface',exitLayer:'underground'},
    {id:'up',x:1240,y:230,direction:1,entryLayer:'underground',exitLayer:'return'},
  ];
  const cellar={layer:'underground',left:410,right:1310,roofStart:650,roofHeight:430,exitX:1240,exitRoof:215};
  const two={id:'world2',title:'WORLD LOOP 2',curves:clone(W.CURVES),surfaces:['surface','return'],cellars:[clone(cellar)],holes:clone(holes),finishX:1570,labels:[[-110,380,'地上 · ころころ'],[850,45,'地下 · ぽよん'],[1490,170,'地上 · ころころ']]};
  // Five different phrases: rolling shoulders, shallow cellar, broad half-pipe,
  // deeper bouncing basin and a quiet catch. Y-up Hermite points adapt the
  // original's late-run undulations and rounded bowls, not its seed mechanics.
  const four={id:'world4',title:'PUMPOKO 02',curves:{},surfaces:['surface','return','finish'],cellars:[],holes:[],crestStart:4400,finishX:7380,labels:[]};
  four.curves.surface=[[-440,710,-.8],[0,420,0],
    [190,440,0],[380,413,0],[530,452,0],[710,410,0],[900,420,0],
    [1220,580,0],[1400,500,-.45],[1490,480,0]];
  four.curves.underground=[[1310,220,-.6],[1560,95,0],[1730,125,0],
    [1930,110,0],[2120,140,0],[2330,95,0],[2560,85,0],[2790,125,0],[2860,132,.1]];
  four.curves.return=[[2690,248,0],[2790,240,-.15],[3040,205,0],
    [3230,224,0],[3420,190,0],[3610,218,0],
    [3740,190,-.3],[3850,145,-.6],[3990,116,0],[4100,154,.6],[4200,228,.7],
    [4400,310,.7],[4550,345,0],[4790,155,0],[5080,250,0],[5210,230,-.35],[5300,215,0]];
  four.curves.underground2=[[5120,-65,-.5],[5450,-170,0],[5670,-105,0],
    [5870,-130,0],[6090,-195,0],[6310,-145,0],[6510,-110,0],
    [6710,-165,0],[6930,-75,0],[7050,-75,0],[7120,-68,.1]];
  // The fourth mouth and its landing shoulder are unchanged. The final rise
  // receives speed, then a shallow, rounded fruit-sized pocket receives fruit.
  four.curves.finish=[[6950,48,0],[7050,40,-.15],[7300,5,0],
    [7500,65,.42],[7620,115.4,.42],[7690,90,-1.0909090909],
    [7745,60,0],[7800,90,1.0909090909],[8300,750,1.5],[8540,950,0]];
  four.goal={layer:'finish',x:7745,halfWidth:16,bottom:60,depth:18,speed:150,dwell:.06};
  four.holes=[
    {id:'down',x:1400,y:490,direction:-1,entryLayer:'surface',exitLayer:'underground'},
    {id:'up',x:2790,y:230,direction:1,entryLayer:'underground',exitLayer:'return'},
    {id:'down-2',x:5210,y:220,direction:-1,entryLayer:'return',exitLayer:'underground2'},
    {id:'up-2',x:7050,y:30,direction:1,entryLayer:'underground2',exitLayer:'finish'}];
  four.cellars=[
    {layer:'underground',left:1310,right:2860,roofStart:1550,roofHeight:430,exitX:2790,exitRoof:215},
    {layer:'underground2',left:5120,right:7120,roofStart:5360,roofHeight:160,exitX:7050,exitRoof:15}];
  // One work-local extension. Every later phrase is a rigid x translation;
  // its height, derivative, clearance and mouth geometry stay authored above.
  const shift=3700;
  four.curves.surface=[...four.curves.surface.slice(0,8),
    [1380,490,-.7],[1500,360,0],[1600,375,.25],[1700,415,.4],
    [1800,365,-.08],[2100,350,0],[2380,380,.2],
    [2600,440,0],[2810,520,0],[3090,320,0],[3270,370,.4],[3400,430,.4],
    [3580,445,.05],[3890,460,0],[4130,440,0],[4500,520,0],[4920,580,0],
    ...four.curves.surface.slice(8).map(p=>[p[0]+shift,p[1],p[2]])];
  four.gaps=[{id:'first',layer:'surface',a:1700,b:1800,runup:320},
    {id:'second',layer:'surface',a:3400,b:3580,runup:590}];
  four.stage1={shift,startX:-250,endX:1400+shift,cameraFloor:320,failY:-300,retrySeconds:.65};
  for(const [layer,points]of Object.entries(four.curves))if(layer!=='surface')for(const p of points)p[0]+=shift;
  for(const h of four.holes)h.x+=shift;
  for(const cell of four.cellars)for(const key of ['left','right','roofStart','exitX'])cell[key]+=shift;
  four.crestStart+=shift;four.finishX+=shift;four.goal.x+=shift;
  function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  const courses=freeze({world2:two,world4:four});
  function get(id){const c=courses[id];if(!c)throw Error('Unknown comparison course');return c;}
  return {get,courses};
});
