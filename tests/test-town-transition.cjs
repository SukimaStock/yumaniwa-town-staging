// Real transition implementation, controlled timers/RAF, including forcibly delivered
// cleared callbacks. No immediate-fade substitute. Canonical stays deep frozen.
const assert=require('node:assert/strict');
const {c,api,clone,canonical,original,document,runtimeFunctions}=require('./test-editor-session.cjs');
c.showMessage=runtimeFunctions.showMessage;
c.updateControlVisibility=runtimeFunctions.updateControlVisibility;
const transition=c.YUMANIWA_TOWN_TRANSITION, interaction=c.YUMANIWA_TOWN_INTERACTION;
let now=0, serial=0, jobs=[];
c.setTimeout=(fn,delay=0)=>{const job={id:++serial,fn,at:now+delay,cancelled:false,ran:false};jobs.push(job);return job.id;};
c.clearTimeout=id=>{const job=jobs.find(j=>j.id===id);if(job)job.cancelled=true;};
c.requestAnimationFrame=fn=>c.setTimeout(fn,16);
c.cancelAnimationFrame=c.clearTimeout;
function tick(ms){const end=now+ms;let count=0;while(true){const job=jobs.filter(j=>!j.cancelled&&!j.ran&&j.at<=end).sort((a,b)=>a.at-b.at||a.id-b.id)[0];if(!job)break;assert(++count<1000);now=job.at;job.ran=true;job.fn();}now=end;}
function fade(){return document.body.children.find(e=>e.id==='town-rpg-fade-transition')||null;}
function pending(delay){return jobs.filter(j=>!j.cancelled&&!j.ran&&j.at===now+delay);}
function at(x,y){c.player.x=x*16;c.player.y=y*16+8-13;}
let ready=[];
// Only replace network delivery, not waitForTownSceneBackground or any fade API.
c.preloadTownSceneBackgroundAsset=(path,callback)=>{if(callback)ready.push(callback);return {loaded:false,error:false};};
function reset(){
    transition.cancel();interaction.cancel();if(api.current()){c.discardTownEditorChanges();api.end();}
    c.currentScene='station_plaza';c.isEditMode=false;c.debugMode=false;c.isMessageOpen=false;
    c.isWorkPlayerOpen=false;c.isStationGuideMapOpen=false;c.pendingWarp=null;c.keys={};c.clearDpadInput();
    c.MAP_WIDTH=24;c.MAP_HEIGHT=24;c.TILE_SIZE=16;c.player.speed=2;
    c.activeTownSceneDef=clone(canonical.station_plaza);c.activeTownSceneDef.props=[];
    c.activeTownSceneDef.edgeWarps=[{side:'right',min:8,max:12,target:'tomogushi_alley_map',targetSpawn:'default'}];
    c.triggers=[];c.areaZones=[];c.collisionGrid=Array.from({length:24},()=>Array(24).fill(1));c.baseCollisionGrid=clone(c.collisionGrid);
    at(2,10);now=0;jobs=[];ready=[];
}
let checks=0;
function check(name,fn){reset();fn();assert.equal(JSON.stringify(canonical),original);checks++;console.log('PASS '+name);}
function finishTown(){tick(440);assert(transition.isActive());ready.at(-1)();tick(70+460+80);assert(!transition.isActive());assert.equal(fade(),null);}
check('held edge key queues one commit; fade blocks manual and new requests',()=>{
    at(22,10);c.keys.ArrowRight=true;for(let i=0;i<10;i++)c.update();
    assert(transition.isActive());assert.equal(pending(440).length,1);
    const x=c.player.x;for(let i=0;i<20;i++)c.update();assert.equal(c.player.x,x);
    assert(!interaction.requestGroundMove(2,2));assert(!c.changeSceneWithTownFade('yumado_street_map'));
    const oldCommit=pending(440)[0];finishTown();assert.equal(c.currentScene,'tomogushi_alley_map');
    assert(c.changeTownScene('leisure_center_map'));oldCommit.fn();assert.equal(c.currentScene,'leisure_center_map');
});
check('direct town change invalidates even forcibly delivered cleared timers/RAF',()=>{
    c.changeSceneWithTownFade('tomogushi_alley_map');const old=jobs.slice();const oldFade=fade();
    assert(c.changeTownScene('leisure_center_map'));assert(!transition.isActive());assert(!document.body.children.includes(oldFade));
    assert(old.every(j=>j.cancelled));old.forEach(j=>j.fn());assert.equal(c.currentScene,'leisure_center_map');assert.equal(fade(),null);
});
check('direct destination and direct scene application invalidate pending fade',()=>{
    c.changeSceneWithTownFade('tomogushi_alley_map');let old=jobs.slice();c.changeScene('shinpo_board');old.forEach(j=>j.fn());assert.equal(c.currentScene,'shinpo_board');
    c.changeTownScene('station_plaza');c.changeSceneWithTownFade('tomogushi_alley_map');old=jobs.filter(j=>!j.ran&&!j.cancelled);
    c.applyTownSceneDefinition('station_plaza','default');old.forEach(j=>j.fn());assert.equal(c.currentScene,'station_plaza');assert(!transition.isActive());
});
check('cancel prevents commit and removes fade',()=>{
    c.changeSceneWithTownFade('tomogushi_alley_map');const old=jobs.slice();transition.cancel();old.forEach(j=>j.fn());tick(5000);
    assert.equal(c.currentScene,'station_plaza');assert.equal(fade(),null);
});
check('cancel A then request B: only B commits, old cleanup cannot remove B',()=>{
    c.changeSceneWithTownFade('tomogushi_alley_map');tick(440);ready.at(-1)();tick(70);
    const old=jobs.slice();transition.cancel();c.changeSceneWithTownFade('leisure_center_map');const fresh=fade();
    old.forEach(j=>j.fn());assert.equal(fade(),fresh);assert(transition.isActive());finishTown();assert.equal(c.currentScene,'leisure_center_map');
});
function guide(target){c.isStationGuideMapOpen=true;c.pendingStationGuideMapSpot={kind:'place',target};c.confirmStationGuideMapMove();}
check('guide remains open until black; commits once and finishes shared lifecycle',()=>{
    guide('tomogushi_alley_map');assert(transition.isActive());assert(c.isStationGuideMapOpen);assert(!c.changeSceneWithTownFade('leisure_center_map'));
    tick(419);assert.equal(c.currentScene,'station_plaza');tick(1);assert.equal(c.currentScene,'tomogushi_alley_map');assert(!c.isStationGuideMapOpen);
    const callbacks=jobs.slice();tick(70+430+80);assert(!transition.isActive());assert.equal(fade(),null);
    c.changeTownScene('leisure_center_map');callbacks.forEach(j=>j.fn());assert.equal(c.currentScene,'leisure_center_map');
});
check('guide destination path uses same lifecycle and keeps direct menu behavior',()=>{
    guide('tomogushi_game_board');
    assert(transition.isActive());tick(420);assert(!c.isStationGuideMapOpen);assert.equal(c.currentScene,'tomogushi_game_board');assert.equal(c.destinationViewMode,'menu');tick(580);assert(!transition.isActive());
});
check('direct change invalidates old guide callback',()=>{
    guide('tomogushi_alley_map');const old=jobs.slice();c.changeTownScene('leisure_center_map');old.forEach(j=>j.fn());assert.equal(c.currentScene,'leisure_center_map');assert.equal(fade(),null);
});
check('old background completion/timeout cannot reveal a new generation',()=>{
    c.changeSceneWithTownFade('tomogushi_alley_map');tick(440);const oldReady=ready.at(-1), old=jobs.slice();
    transition.cancel();c.changeSceneWithTownFade('leisure_center_map');const fresh=fade();tick(32);assert.equal(fresh.style.opacity,'1');
    oldReady();old.forEach(j=>j.fn());assert.equal(fresh.style.opacity,'1');assert.equal(fade(),fresh);assert(transition.isActive());
});
check('background timeout reveals once; late ready has no effect',()=>{
    c.changeSceneWithTownFade('tomogushi_alley_map');tick(440);const callback=ready.at(-1);tick(2199);assert(transition.isActive());
    tick(1+70+540);assert(!transition.isActive());callback();tick(5000);assert.equal(fade(),null);
});
check('synchronous background ready completes normally',()=>{
    const loader=c.preloadTownSceneBackgroundAsset;c.preloadTownSceneBackgroundAsset=(path,done)=>{if(done)done();return {loaded:true};};
    try {c.changeSceneWithTownFade('tomogushi_alley_map');tick(440+70+540);assert(!transition.isActive());assert.equal(c.currentScene,'tomogushi_alley_map');}
    finally {c.preloadTownSceneBackgroundAsset=loader;}
});
for(const field of ['isWorkPlayerOpen','isStationGuideMapOpen','isMessageOpen','isEditMode'])check(field+' blocks both manual and tap movement',()=>{
    c[field]=true;c.keys.ArrowRight=true;const before={x:c.player.x,y:c.player.y};for(let i=0;i<10;i++)c.update();
    assert.equal(c.player.x,before.x);assert.equal(c.player.y,before.y);assert(!interaction.requestGroundMove(5,10));
});
check('non-town scene blocks shared predicate',()=>{c.currentScene='shinpo_board';assert(!c.canControlTownPlayer());assert(!interaction.requestGroundMove(5,10));});
check('transition cancels tap request permanently, then permits fresh input',()=>{
    assert(interaction.requestGroundMove(15,10));assert(interaction.getRequest());c.changeSceneWithTownFade('tomogushi_alley_map');assert.equal(interaction.getRequest(),null);
    finishTown();assert.equal(interaction.getRequest(),null);assert(c.canControlTownPlayer());c.collisionGrid=Array.from({length:24},()=>Array(24).fill(1));at(2,10);assert(interaction.requestGroundMove(5,10));
});
check('warp second action schedules one transition; normal close schedules none',()=>{
    c.triggers=[{id:'warp',type:'warp',target:'tomogushi_alley_map',text:'go',area:{x:3,y:10,w:1,h:1}}];
    assert(interaction.activateTrigger('warp'));assert(c.pendingWarp);assert(!transition.isActive());assert(interaction.handleAction());
    assert(transition.isActive());assert.equal(c.pendingWarp,null);assert(!interaction.handleAction());assert.equal(pending(440).length,1);finishTown();
    c.changeTownScene('station_plaza');c.triggers=[{id:'warp',type:'warp',target:'tomogushi_alley_map',text:'go',area:{x:3,y:10,w:1,h:1}}];at(2,10);
    assert(interaction.activateTrigger('warp'));c.closeMessage();assert(!transition.isActive());assert.equal(c.pendingWarp,null);
});
check('control visibility shares eligibility without changing movement state',()=>{
    assert(interaction.requestGroundMove(15,10));const before=JSON.stringify(interaction.getRequest());
    c.updateControlVisibility();assert.equal(JSON.stringify(interaction.getRequest()),before);
    c.changeSceneWithTownFade('tomogushi_alley_map');
    assert(document.getElementById('mobile-controls').classList.contains('disabled'));
    finishTown();assert(!document.getElementById('mobile-controls').classList.contains('disabled'));
});
check('failed commit cleans lifecycle and restores input',()=>{
    assert(c.playTownRpgFadeTransition(()=>false));tick(440);assert(!transition.isActive());assert.equal(fade(),null);assert(c.canControlTownPlayer());
});
check('dirty transition rejection preserves session and cancels movement',()=>{
    c.openTownEditorSession();api.current().draft.props[0].x+=1;c.closeTownEditor();
    assert(!c.changeSceneWithTownFade('tomogushi_alley_map'));assert(api.isDirty());assert.equal(interaction.getRequest(),null);assert(!transition.isActive());
});
transition.cancel();console.log(`${checks} Phase 5 transition regression groups passed; frozen canonical unchanged.`);
