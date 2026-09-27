// Run actual pathfinding, movement, input handlers and activation modules in Node.
// Rendering and fade timing are outside this state test; canonical is frozen.
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'),vm=require('node:vm');
const {c,api,clone,el,document,canonical,original,runtimeFunctions}=require('./test-editor-session.cjs');
const root=path.resolve(__dirname,'..'), interaction=c.YUMANIWA_TOWN_INTERACTION;
const logs=[],accepted=[],messages=[],transitions=[],inputs={};
c.console={...console,info:(...args)=>logs.push(args)};
for(const f of ['town-analytics.js'])vm.runInContext('"use strict";\n'+fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});
const memoryHook=c.YumaniwaMemory.onTriggerActivated;
c.YumaniwaMemory.onTriggerActivated=t=>{accepted.push(t.id);memoryHook(t);};
c.showMessage=text=>{messages.push(text);return runtimeFunctions.showMessage(text);};
c.updateInteractionHint=runtimeFunctions.updateInteractionHint;
c.renderDestination=()=>{};
c.playTownRpgFadeTransition=fn=>{transitions.push('fade');return fn();};
c.addEventListener=(name,fn)=>(inputs[name]||=[]).push(fn);
c.canvas=el('game-canvas');c.setupEvents();c.setupMessageLayerEvents();
const fireKey=key=>(inputs.keydown||[]).forEach(fn=>fn({key,target:document.body,preventDefault(){},stopPropagation(){}}));
function at(x,y){c.player.x=x*c.TILE_SIZE+c.TILE_SIZE/2-8;c.player.y=y*c.TILE_SIZE+c.TILE_SIZE/2-13;}
function trigger(id,x,y,extra={}){return {id,label:id,text:id,type:'inspect',area:{x,y,w:1,h:1},...extra};}
function reset(){
    interaction.cancel();if(api.current()){c.discardTownEditorChanges();api.end();}
    c.currentScene='station_plaza';c.isEditMode=false;c.debugMode=false;c.isWorkPlayerOpen=false;c.isStationGuideMapOpen=false;c.isMessageOpen=false;c.pendingWarp=null;
    c.MAP_WIDTH=24;c.MAP_HEIGHT=24;c.TILE_SIZE=16;c.player.speed=4;c.keys={};c.clearDpadInput();
    c.activeTownSceneDef=clone(canonical.station_plaza);c.activeTownSceneDef.props=[];
    c.triggers=[trigger('A',10,10),trigger('B',17,10)];c.activeTownSceneDef.triggers=c.triggers;
    c.areaZones=[];c.activeTownSceneDef.areaZones=[];
    c.activeTownSceneDef.edgeWarps=[{side:'right',min:8,max:12,target:'tomogushi_alley_map',targetSpawn:'default'}];
    c.collisionGrid=Array.from({length:24},()=>Array(24).fill(1));
    c.baseCollisionGrid=clone(c.collisionGrid);at(2,10);c.player.dir='right';
    logs.length=0;accepted.length=0;messages.length=0;transitions.length=0;
}
function drain(hints=false){for(let i=0;i<2000&&interaction.getRequest();i++){if(hints){const before=JSON.stringify(interaction.getRequest());for(let j=0;j<3;j++)c.updateInteractionHint();assert.equal(JSON.stringify(interaction.getRequest()),before);}interaction.update();}assert.equal(interaction.getRequest(),null);}
let checks=0;
function check(name,fn){reset();fn();assert.equal(JSON.stringify(canonical),original);checks++;console.log('PASS '+name);}
function edge(){return {side:'right',tile:{x:23,y:10}};}
check('A replaced by B executes only B',()=>{assert(interaction.requestTrigger('A'));assert(interaction.requestTrigger('B'));drain();assert.deepEqual(accepted,['B']);});
check('A replaced by ground never activates A',()=>{interaction.requestTrigger('A');interaction.requestGroundMove(3,5);drain();assert.deepEqual(accepted,[]);});
check('unreachable B destroys old path and arrival A',()=>{interaction.requestTrigger('A');for(let y=0;y<24;y++)c.collisionGrid[y][13]=2;assert(!interaction.requestTrigger('B'));drain();assert.deepEqual(accepted,[]);});
check('unwalkable ground destroys old request',()=>{interaction.requestTrigger('A');c.collisionGrid[5][5]=2;assert(!interaction.requestGroundMove(5,5));drain();assert.deepEqual(accepted,[]);});
check('edge request replaced by trigger cannot warp',()=>{interaction.requestEdgeWarp(edge());interaction.requestTrigger('A');drain();assert.deepEqual(accepted,['A']);assert.equal(transitions.length,0);});
check('trigger request replaced by edge cannot activate old trigger',()=>{interaction.requestTrigger('A');assert(interaction.requestEdgeWarp(edge()));drain();assert.deepEqual(accepted,[]);assert.equal(transitions.length,1);assert.equal(c.currentScene,'tomogushi_alley_map');});
check('empty trigger path activates once via arrival',()=>{at(9,10);assert(interaction.requestTrigger('A'));for(let i=0;i<5;i++)interaction.update();assert.deepEqual(accepted,['A']);});
check('empty edge path warps once via arrival',()=>{at(23,10);assert(interaction.requestEdgeWarp(edge()));for(let i=0;i<5;i++)interaction.update();assert.equal(transitions.length,1);});
check('empty ground path creates no delayed action',()=>{assert(interaction.requestGroundMove(2,10));assert.equal(interaction.getRequest(),null);assert.deepEqual(accepted,[]);});
check('deleted trigger is not activated on arrival',()=>{interaction.requestTrigger('A');c.triggers.splice(0,1);drain();assert.deepEqual(accepted,[]);});
check('disabled trigger is not activated on arrival',()=>{interaction.requestTrigger('A');c.triggers[0].enabled=false;drain();assert.deepEqual(accepted,[]);});
check('scene mismatch cancels on next update',()=>{interaction.requestTrigger('A');c.currentScene='tomogushi_alley_map';drain();assert.deepEqual(accepted,[]);});
check('moved trigger outside arrival range is not activated',()=>{interaction.requestTrigger('A');c.triggers[0].area={x:22,y:22,w:1,h:1};drain();assert.deepEqual(accepted,[]);});
check('arrival resolves replacement object by ID',()=>{interaction.requestTrigger('A');c.triggers[0]={...c.triggers[0],text:'replacement'};drain();assert.deepEqual(messages,['replacement']);assert.deepEqual(accepted,['A']);});
check('request snapshot exposes no trigger reference or second owner',()=>{interaction.requestTrigger('A');const req=interaction.getRequest();assert.deepEqual(Object.keys(req).sort(),['arrival','path','pathIndex','sceneId']);assert.deepEqual(req.arrival,{type:'trigger',triggerId:'A'});req.arrival.triggerId='B';req.path.length=0;drain();assert.deepEqual(accepted,['A']);});
check('keyboard movement cancels immediately',()=>{interaction.requestTrigger('A');fireKey('ArrowUp');assert.equal(interaction.getRequest(),null);drain();assert.deepEqual(accepted,[]);});
check('D-pad cancels immediately',()=>{interaction.requestTrigger('A');el('btn-up').dispatch('pointerdown');assert.equal(interaction.getRequest(),null);el('btn-up').dispatch('pointerup');drain();assert.deepEqual(accepted,[]);});
check('message display cancels movement and stale confirmation',()=>{interaction.requestTrigger('A');c.pendingWarp='old';c.showMessage('hello');assert.equal(c.pendingWarp,null);c.closeMessage();drain();assert.deepEqual(accepted,[]);});
check('scene change cancels movement',()=>{interaction.requestTrigger('A');c.changeTownScene('tomogushi_alley_map','default');drain();assert.deepEqual(accepted,[]);});
check('rejected scene request also cancels movement',()=>{interaction.requestTrigger('A');assert(!c.changeTownScene('invalid_scene','default'));assert.equal(interaction.getRequest(),null);});
check('Editor open and close never resume request',()=>{interaction.requestTrigger('A');c.openTownEditorSession();assert.equal(interaction.getRequest(),null);c.closeTownEditor();drain();assert.deepEqual(accepted,[]);assert(!api.isDirty());assert.equal(api.current().history.length,0);});
check('dirty scene rejection preserves Editor state but cancels request',()=>{c.openTownEditorSession();c.closeTownEditor();api.current().draft.props[0].x+=0.0625;const before=JSON.stringify(api.current());const t=c.triggers.find(t=>t.id!=='station_ghost_npc_trigger');at(1,1);interaction.requestTrigger(t.id);assert(!c.changeTownScene('tomogushi_alley_map','default'));assert.equal(interaction.getRequest(),null);assert.equal(JSON.stringify(api.current()),before);});
check('cancelled edge cannot warp later',()=>{interaction.requestEdgeWarp(edge());interaction.cancel();at(23,10);for(let i=0;i<5;i++)interaction.update();assert.equal(transitions.length,0);});
check('hint is read-only and cannot change activation result',()=>{interaction.requestTrigger('A');drain(true);const withHints=accepted.slice();reset();interaction.requestTrigger('A');drain(false);assert.deepEqual(accepted,withHints);});
check('tap, action button and keyboard share accepted activation',()=>{at(9,10);interaction.requestTrigger('A');c.closeMessage();at(9,10);c.player.dir='right';el('btn-action').dispatch('pointerup');c.closeMessage();fireKey('Enter');assert.deepEqual(accepted,['A','A','A']);});
check('canvas input uses direct target then ground',()=>{const point=c.getPointerTile;c.getPointerTile=()=>({x:10,y:10});c.canvas.dispatch('pointerdown');assert.equal(interaction.getRequest().arrival.triggerId,'A');c.getPointerTile=()=>({x:2,y:2});c.canvas.dispatch('pointerdown');assert.equal(interaction.getRequest().arrival.type,'none');drain();assert.deepEqual(accepted,[]);c.getPointerTile=point;});
check('memory only notified after accepted activation',()=>{c.triggers[0].id='town_feedback_box_trigger';interaction.requestTrigger(c.triggers[0].id);assert.deepEqual(accepted,[]);interaction.cancel();assert.deepEqual(accepted,[]);at(9,10);assert(interaction.activateTrigger(c.triggers[0].id));assert(c.YumaniwaMemory.hasFlag('feedbackBoxSeen'));assert.deepEqual(accepted,['town_feedback_box_trigger']);});
check('update sign memory hook notified once',()=>{c.triggers[0].id='town_update_history_sign';at(9,10);assert(interaction.activateTrigger(c.triggers[0].id));assert(c.YumaniwaMemory.hasFlag('updateHistorySeen'));assert.equal(accepted.length,1);});
check('venue analytics recorded once only after acceptance',()=>{c.triggers[0]=trigger('venue',10,10,{type:'menu',target:'tomogushi_game_board'});interaction.requestTrigger('venue');interaction.cancel();assert.equal(logs.length,0);at(9,10);assert(interaction.activateTrigger('venue'));assert.equal(logs.filter(row=>String(row[1]).startsWith('Venue Open')).length,1);assert.equal(logs[0][2].scene,'station_plaza');assert.deepEqual(accepted,['venue']);});
check('failed menu target produces no memory or analytics activation',()=>{c.triggers[0]=trigger('venue',10,10,{type:'menu',target:'invalid'});at(9,10);assert(!interaction.activateTrigger('venue'));assert.deepEqual(accepted,[]);assert.equal(logs.length,0);});
check('tourist map uses existing map API',()=>{c.triggers[0].id='tourist_map';const fn=c.openStationGuideMap;let n=0;c.openStationGuideMap=()=>n++;at(9,10);assert(interaction.activateTrigger('tourist_map'));assert.equal(n,1);c.openStationGuideMap=fn;});
check('work launches through existing API, missing work displays message',()=>{const fn=c.launchWork;let n=0;c.launchWork=()=>n++;const work=c.WORKS[0];c.triggers[0]=trigger('work',10,10,{type:'work',workId:work.id});at(9,10);assert(interaction.activateTrigger('work'));assert.equal(n,1);c.triggers[0].workId='missing';assert(interaction.activateTrigger('work'));assert.equal(n,1);assert.equal(messages.length,1);c.launchWork=fn;});
check('warp description and second action transition exactly once',()=>{c.triggers[0]=trigger('warp',10,10,{type:'warp',target:'tomogushi_alley_map'});at(9,10);assert(interaction.activateTrigger('warp'));assert(c.isMessageOpen);assert.equal(c.pendingWarp,'tomogushi_alley_map');assert.equal(interaction.getRequest(),null);assert.equal(transitions.length,0);assert(interaction.handleAction());assert.equal(transitions.length,1);assert.equal(c.pendingWarp,null);assert.deepEqual(accepted,['warp']);});
check('normal message close discards warp confirmation',()=>{c.triggers[0]=trigger('warp',10,10,{type:'warp',target:'tomogushi_alley_map'});at(9,10);interaction.activateTrigger('warp');c.closeMessage();assert.equal(c.pendingWarp,null);at(2,2);interaction.handleAction();assert.equal(transitions.length,0);});
check('message tap confirmation uses the same action controller',()=>{c.triggers[0]=trigger('warp',10,10,{type:'warp',target:'tomogushi_alley_map'});at(9,10);interaction.activateTrigger('warp');el('message-window').dispatch('pointerdown');assert.equal(transitions.length,1);});
check('ghost dialogue never changes canonical/draft or Editor diff',()=>{c.applyTownSceneDefinition('station_plaza','default');c.openTownEditorSession();c.closeTownEditor();const before=JSON.stringify(api.current());const t=c.triggers.find(t=>t.id==='station_ghost_npc_trigger');for(let i=0;i<3;i++){at(t.area.x,t.area.y);assert(interaction.activateTrigger(t.id));c.closeMessage();}assert.equal(JSON.stringify(api.current()),before);assert.equal(t.text,'……');assert(messages.every(t=>t!=='……'));assert(!api.isDirty());assert.equal(c.YUMANIWA_EDITOR_BUILD_DIFF().changes.triggers.length,0);});
check('manual edge warp still works',()=>{at(22,10);c.keys.ArrowRight=true;for(let i=0;i<8&&!transitions.length;i++)c.update();assert.equal(transitions.length,1);});
check('game update loop performs arrival once and stops walking for message',()=>{interaction.requestTrigger('A');for(let i=0;i<2000&&interaction.getRequest();i++)c.update();assert.deepEqual(accepted,['A']);assert.equal(c.player.isMoving,false);for(let i=0;i<5;i++)c.update();assert.deepEqual(accepted,['A']);});
check('ground path to edge does not dispatch an implicit second warp',()=>{interaction.requestGroundMove(23,10);for(let i=0;i<2000&&interaction.getRequest();i++)c.update();assert.equal(interaction.getRequest(),null);assert.equal(transitions.length,0);});
check('movement cancel alone does not consume message confirmation',()=>{c.triggers[0]=trigger('warp',10,10,{type:'warp',target:'tomogushi_alley_map'});at(9,10);interaction.activateTrigger('warp');interaction.cancel();assert.equal(c.pendingWarp,'tomogushi_alley_map');assert(!interaction.requestGroundMove(1,1));assert.equal(c.pendingWarp,'tomogushi_alley_map');c.closeMessage();assert.equal(c.pendingWarp,null);});
check('dedicated tap false keeps trigger out of broad fallback',()=>{c.activeTownSceneDef.props=[{id:'p',x:10,y:10,w:1,h:1,tap:false,interaction:{enabled:true,triggerId:'A'}}];interaction.requestTap(10,10);assert.equal(interaction.getRequest().arrival.type,'none');drain();assert.deepEqual(accepted,[]);});
check('old state and global replacement routes are absent' ,()=>{const source=['main.js','town-interaction-flow.js','town-ghost-npc.js','town-memory.js','town-analytics.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');assert(!/tapMovePath|tapMoveTargetTile|tapMoveTargetTrigger|tapFocusedTrigger|tapMoveRequestedWarpSide|tapAutoActionTrigger|tapAutoWarpSide/.test(source));assert(!/window\.(startTapMoveTo|startTapMoveToTrigger|updateTapMove|cancelTapMove|handleAction|activateTownTrigger)\s*=/.test(source));for(const name of ['startTapMoveTo','startTapMoveToTrigger','updateTapMove','cancelTapMove','handleAction','activateTownTrigger'])assert.equal(c[name],undefined);});
console.log(`${checks} Phase 4 interaction regression groups passed; frozen canonical unchanged.`);
