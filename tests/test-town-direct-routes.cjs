const path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const {c,api}=require(path.join(root,'tests/test-editor-session.cjs'));
for(const file of ['data/work-guide-meta.js','work-guide-terminal.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
let checks=0;
function reset(){if(api.isDirty())c.discardTownEditorChanges();api.end();c.isEditMode=false;c.isMessageOpen=false;c.isWorkPlayerOpen=false;c.townWindowReturnPoint=null;c.location.search='';assert(c.changeTownScene('station_plaza','default'));}
function check(name,fn){reset();fn();checks++;console.log('PASS '+name);}
check('direct guide enters its authored return scene and exits there',()=>{
 assert(c.openTownPlaceFromRoute('leisure_catalog'));
 assert.equal(c.activeTownSceneDef.id,'leisure_center_map');
 assert.equal(c.townWindowReturnPoint.sceneId,'leisure_center_map');
 c.backToDestinationReturnScene('leisure_catalog');
 assert.equal(c.currentScene,'leisure_center_map');
});
check('all configured destination routes use their authored return scene',()=>{
 for(const [id,dest] of Object.entries(c.DESTINATIONS)){
  if(c.isTownScene(id)||!c.isTownScene(dest.returnScene))continue;
  reset();assert(c.openTownPlaceFromRoute(id));assert.equal(c.activeTownSceneDef.id,dest.returnScene,id);
  c.backToDestinationReturnScene(id);assert.equal(c.currentScene,dest.returnScene,id);
 }
});
check('physical guide entry retains the exact entry position',()=>{
 assert(c.changeTownScene('leisure_center_map','default'));
 c.player.x=12*c.TILE_SIZE;c.player.y=16*c.TILE_SIZE;c.player.dir='left';
 const position={x:c.player.x,y:c.player.y,dir:c.player.dir};
 assert(c.changeScene('leisure_catalog'));c.backToDestinationReturnScene('leisure_catalog');
 assert.equal(c.currentScene,'leisure_center_map');
 assert.deepEqual({x:c.player.x,y:c.player.y,dir:c.player.dir},position);
});
check('place/dest/destination URL aliases retain the correct guide exit',()=>{
 for(const key of ['place','dest','destination']){
  reset();c.location.search='?'+key+'=leisure_catalog';c.openInitialTownRouteFromUrl();
  assert.equal(c.currentDestinationId,'leisure_catalog');c.backToDestinationReturnScene('leisure_catalog');
  assert.equal(c.currentScene,'leisure_center_map',key);
 }
});
check('direct physical scene routes and invalid destinations are unchanged',()=>{
 assert(c.openTownPlaceFromRoute('tomogushi_alley_map'));assert.equal(c.currentScene,'tomogushi_alley_map');
 const before=c.currentScene;assert.equal(c.openTownPlaceFromRoute('missing_destination'),false);assert.equal(c.currentScene,before);
});
check('missing or invalid returnScene retains the current town entry',()=>{
 const id=Object.keys(c.DESTINATIONS).find(id=>!c.isTownScene(id)&&!c.DESTINATIONS[id].returnScene);
 assert(id);
 const dest=c.DESTINATIONS[id],hadReturn=Object.hasOwn(dest,'returnScene'),original=dest.returnScene;
 try{
  for(const returnScene of [undefined,'missing_scene']){
   reset();dest.returnScene=returnScene;assert(c.changeTownScene('onsen_slope_map','default'));
   assert(c.openTownPlaceFromRoute(id));assert.equal(c.townWindowReturnPoint.sceneId,'onsen_slope_map');
   c.backToDestinationReturnScene(id);assert.equal(c.currentScene,'onsen_slope_map');
  }
 }finally{if(hadReturn)dest.returnScene=original;else delete dest.returnScene;}
});
check('dirty Editor blocks direct destination routing without losing draft',()=>{
 c.openTownEditorSession();api.current().draft.props[0].x+=0.0625;assert(api.isDirty());
 const before=JSON.stringify(api.current());assert.equal(c.openTownPlaceFromRoute('leisure_catalog'),false);
 assert.equal(c.currentScene,'station_plaza');assert.equal(JSON.stringify(api.current()),before);
 c.discardTownEditorChanges();api.end();
});
reset();console.log(`${checks} direct destination route regression groups passed.`);
