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
  const four={id:'world4',title:'WORLD LOOP 4',curves:clone(W.CURVES),surfaces:['surface','return','finish'],cellars:[clone(cellar)],holes:clone(holes),crestStart:1750,finishX:3930,labels:clone(two.labels)};
  // Every control point through x=1750 is the two-swap course. After it, a
  // broader descent and another U let the same left/right pumping open up.
  four.curves.return.push([1900,345,0],[2140,155,0],[2430,250,0],[2560,230,-.35],[2650,215,0]);
  four.curves.underground2=[[2470,-65,-.5],[2800,-170,0],[3020,-105,0],[3260,-165,0],[3480,-75,0],[3600,-75,0],[3670,-68,.1]];
  four.curves.finish=two.curves.return.map(([x,y,t])=>[x+2360,y-200,t]);
  four.holes.push({id:'down-2',x:2560,y:220,direction:-1,entryLayer:'return',exitLayer:'underground2'},
    {id:'up-2',x:3600,y:30,direction:1,entryLayer:'underground2',exitLayer:'finish'});
  four.cellars.push({layer:'underground2',left:2470,right:3670,roofStart:2710,roofHeight:160,exitX:3600,exitRoof:15});
  four.labels.push([2130,105,'地上 · ころころ'],[3060,-220,'地下 · ぽよん'],[3850,-30,'地上 · ころころ']);
  function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  const courses=freeze({world2:two,world4:four});
  function get(id){const c=courses[id];if(!c)throw Error('Unknown comparison course');return c;}
  return {get,courses};
});
