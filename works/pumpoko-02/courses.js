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
  // Rigid socket shoulders and final pocket surround new, attainable terrain.
  const original=clone(four),layers=['surface','underground','return','underground2','finish'];
  const ends=[four.holes[0].x,11240,18600,27430,38030];
  const offsets={surface:0,underground:0,return:4750,underground2:9690,finish:16680};
  const exitOffsets=[0,4750,9690,16680];
  const move=(points,dx)=>points.map(p=>[p[0]+dx,p[1],p[2]]);
  const layouts=[
    {stage:2,layer:'underground',base:100,gaps:[[1850,110,-65],[3900,120,-50]],kind:'rutabaga'},
    {stage:3,layer:'return',base:220,gaps:[[1800,160,15],[3700,180,25],[5000,140,-25]],kind:'pumpkin'},
    {stage:4,layer:'underground2',base:-120,gaps:[[1700,125,-60],[3600,140,-55],[4900,130,-40],[6700,150,-55]],kind:'rutabaga'},
    {stage:5,layer:'finish',base:100,gaps:[[1800,180,25],[3700,190,20],[5000,165,-60],[7200,200,20],[9000,200,20]],kind:'pumpkin'}
  ];
  for(const layout of layouts){
    const {stage,layer,base,kind}=layout,start=ends[stage-2],end=ends[stage-1];
    const points=original.curves[layer],prefix=move(points.slice(0,3),offsets[layer]);
    const tail=stage===5?move(points.slice(2),end-original.goal.x):move(points.slice(-3),exitOffsets[stage-1]);
    const middle=[];
    for(const [distance,width,rise]of layout.gaps){
      const a=start+distance,b=a+width;
      if(kind==='rutabaga')middle.push([a-650,base+100,0],[a-360,base,0],[a-180,base+40,0],
        [a,base+40,0],[b,base+40+rise,0],[b+300,base+10,0]);
      else middle.push([a-650,base+130,0],[a-360,base-25,0],[a-180,base+5,.35],
        [a,base+70,.5],[b,base+70+rise,0],[b+300,base+40,0]);
      four.gaps.push({id:'stage'+stage+'-'+(four.gaps.filter(g=>g.stage===stage).length+1),stage,layer,a,b,runup:650,
        preview:kind==='rutabaga'?220:285,approach:1000,referenceSpeed:kind==='rutabaga'?350:500});
    }
    // Small swells join the challenges, each within about 1.5 game screens.
    const all=[...prefix,...middle,...tail].sort((a,b)=>a[0]-b[0]),filled=[];
    for(const point of all){const prev=filled.at(-1);if(prev&&point[0]-prev[0]>800){
      const n=Math.ceil((point[0]-prev[0])/650);
      for(let k=1;k<n;k++){const t=k/n;filled.push([prev[0]+(point[0]-prev[0])*t,prev[1]+(point[1]-prev[1])*t+(k%2?24:-12),0]);}
    }filled.push(point);}
    four.curves[layer]=filled;
  }
  // STAGE 3: keep the first runup and the third gap. The second gap moves
  // onto a short, rounded receiving bank: arrive early enough to use its rise.
  // Too much speed carries the pumpkin past the valley and off the next lip
  // without a useful upward tangent. Opposite input in flight lets it settle
  // and roll up again. These are ordinary Hermite points, shared by draw/contact.
  const first3=four.gaps.find(g=>g.id==='stage3-1'),second3=four.gaps.find(g=>g.id==='stage3-2');
  const bank3=first3.b;
  Object.assign(second3,{a:bank3+300,b:bank3+440,runup:300});
  four.curves.return=[...four.curves.return.filter(p=>p[0]<bank3),
    [bank3,290,0],[bank3+105,240,0],[bank3+200,260,.6],
    [bank3+300,310,1],[bank3+440,290,0],[bank3+740,260,0],
    [14290,350,0],[14940,326,0],
    ...four.curves.return.filter(p=>p[0]>15420)];
  // One phrase per remaining stage, using existing gaps and ordinary banks.
  // STAGE 1 keeps a generous drive-through: a smoother rise and lower catch.
  four.curves.surface=four.curves.surface.map(p=>p[0]===3270?[3270,385,.35]:p[0]===3580?[3580,425,0]:p);
  // STAGE 2: a level bank lets the first bounce decay. A fresh landing push
  // carries the rutabaga to the slightly higher second bank.
  const first2=four.gaps.find(g=>g.id==='stage2-1'),second2=four.gaps.find(g=>g.id==='stage2-2'),bank2=first2.b;
  Object.assign(second2,{a:bank2+650,b:bank2+770,runup:650});
  four.curves.underground=[...four.curves.underground.filter(p=>p[0]<bank2),
    [bank2,75,0],[bank2+320,75,0],[bank2+650,75,0],
    [bank2+770,110,0],[bank2+1070,110,0],[8350,200,0],
    ...four.curves.underground.filter(p=>p[0]>9120)];
  // STAGE 4: the longer, shallow receiving basin needs two renewed bounces
  // before its higher exit. It also leaves room to settle and start again.
  const first4=four.gaps.find(g=>g.id==='stage4-2'),second4=four.gaps.find(g=>g.id==='stage4-3'),bank4=first4.b;
  Object.assign(second4,{a:bank4+1200,b:bank4+1330,runup:1200});
  four.curves.underground2=[...four.curves.underground2.filter(p=>p[0]<bank4),
    [bank4,-135,0],[bank4+460,-150,0],[bank4+1200,-135,0],
    [bank4+1330,-65,0],[bank4+1630,-110,0],
    ...four.curves.underground2.filter(p=>p[0]>23930)];
  // STAGE 5: countersteer on the first rise to catch the valley earlier,
  // then roll into a new upward launch. Later gaps and the quiet goal stay.
  const first5=four.gaps.find(g=>g.id==='stage5-2'),second5=four.gaps.find(g=>g.id==='stage5-3');
  four.curves.finish=four.curves.finish.map(p=>p[0]===first5.a?[p[0],p[1],.7]:p);
  first5.b=first5.a+160;const bank5=first5.b;
  Object.assign(second5,{a:bank5+300,b:bank5+440,runup:300});
  four.curves.finish=[...four.curves.finish.filter(p=>p[0]<bank5),
    [bank5,170,0],[bank5+105,120,0],[bank5+200,140,.6],
    [bank5+300,190,1],[bank5+440,150,0],[bank5+765,140,0],
    ...four.curves.finish.filter(p=>p[0]>32595)];
  four.holes=original.holes.map((h,i)=>({...h,x:h.x+exitOffsets[i]}));
  four.cellars=original.cellars.map((cell,i)=>{const stage=i?4:2,end=ends[stage-1],layer=layers[stage-1],points=four.curves[layer];
    return {...cell,left:points[0][0],right:points.at(-1)[0],roofStart:end-(i?1690:1240),roofHeight:cell.roofHeight,exitX:end,entryRoof:{until:ends[stage-2]+500,roofStart:cell.roofStart+offsets[layer],height:cell.roofHeight,exitX:cell.exitX+offsets[layer],exitRoof:cell.exitRoof}};});
  // Retain the visible STAGE 1 bridge, then keep a level overhead clearance
  // through each bouncing challenge. A descending roof must not carry fruit
  // across several gaps via the existing roof constraint.
  four.surfaceBridges=original.surfaces.slice(0,-1).map((layer,i)=>{
    const oldEnd=original.curves[layer].at(-1),oldNext=original.curves[original.surfaces[i+1]][0];
    return {layer,a:four.curves[layer].at(-1)[0],b:four.curves[original.surfaces[i+1]][0][0],
      y:oldEnd[1],slope:(oldNext[1]-oldEnd[1])/(oldNext[0]-oldEnd[0]),plateau:i?300:500,endY:oldNext[1]};
  });
  four.goal={...original.goal,x:ends[4]};four.finishX=original.finishX+(ends[4]-original.goal.x);
  four.crestStart=original.crestStart+offsets.return;
  four.offsets=offsets;four.exitOffsets=exitOffsets;four.goalOffset=ends[4]-original.goal.x;
  // The accepted short closing tableau is presentation data only. Extended
  // gameplay/checkpoints keep their real positions; its pocket is identical.
  four.finale=clone(original);
  for(const points of Object.values(four.finale.curves))for(const p of points)p[0]+=four.goalOffset;
  for(const h of four.finale.holes)h.x+=four.goalOffset;
  for(const cell of four.finale.cellars)for(const k of ['left','right','roofStart','exitX'])cell[k]+=four.goalOffset;
  four.finale.goal.x+=four.goalOffset;four.finale.finishX+=four.goalOffset;
  four.finale.gaps=four.finale.gaps.map(g=>({...g,a:g.a+four.goalOffset,b:g.b+four.goalOffset}));
  four.stages=layers.map((layer,i)=>({id:i+1,layer,kind:i%2?'rutabaga':'pumpkin',
    startX:i?ends[i-1]:four.stage1.startX,spawnX:i?(i%2?four.curves[layer][1][0]:ends[i-1]+180):null,endX:ends[i],
    cameraFloor:i?Math.min(...four.curves[layer].map(p=>p[1]))+45:four.stage1.cameraFloor,
    failY:i?Math.min(...four.curves[layer].map(p=>p[1]))-720:four.stage1.failY,retrySeconds:four.stage1.retrySeconds}));
  function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  const courses=freeze({world2:two,world4:four});
  function get(id){const c=courses[id];if(!c)throw Error('Unknown comparison course');return c;}
  return {get,courses};
});
