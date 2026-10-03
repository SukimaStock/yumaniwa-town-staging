// Real session/main/draft/ZIP code; state/security checks without browser rendering.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os');
const {execFileSync}=require('node:child_process'),{webcrypto}=require('node:crypto');
const {createDOM}=require('./editor-dom.cjs'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),{document,Element}=createDOM(html);
Element.prototype.replaceChildren=function(...children){for(const child of [...this.children])child.remove();for(const child of children)this.appendChild(child);};
const URLClass=URL,urls=new Map();let urlCounter=0;URLClass.createObjectURL=blob=>{const url='blob:local-'+urlCounter++;urls.set(url,blob);return url;};URLClass.revokeObjectURL=url=>urls.delete(url);
let nativeCanvas, imageRoot=root;
const nativeLoads=[];
if(process.argv.includes('--render-roundtrip'))nativeCanvas=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
class LocalImage {
 set src(value){this._src=value;if(nativeCanvas&&!value.startsWith('blob:')){const task=(async()=>{try{await this.decode();this.complete=true;if(this.onload)this.onload();}catch(_){if(this.onerror)this.onerror();}})();nativeLoads.push(task);}}
 get src(){return this._src;}
 async decode(){const bytes=this.src.startsWith('blob:')?new Uint8Array(await urls.get(this.src).arrayBuffer()):fs.readFileSync(path.join(imageRoot,this.src.split(/[?#]/)[0]));
  if(nativeCanvas){this.native=await nativeCanvas.loadImage(Buffer.from(bytes));this.naturalWidth=this.native.width;this.naturalHeight=this.native.height;}
  else{this.naturalWidth=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(16);this.naturalHeight=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(20);}
 }
}
const c={console,Date,Math,JSON,TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView,ArrayBuffer,Blob,URL:URLClass,URLSearchParams,crypto:webcrypto,document,Image:LocalImage,
 setTimeout:nativeCanvas?setTimeout:()=>0,clearTimeout,requestAnimationFrame:()=>0,cancelAnimationFrame(){},addEventListener(){},performance:{now:()=>0},
 location:{search:'?dev=1',pathname:'/',hostname:'localhost',origin:'http://localhost',href:'http://localhost/'},navigator:{},isSecureContext:true,
 innerWidth:800,innerHeight:600,devicePixelRatio:1,confirm:()=>true,alert(){},HTMLInputElement:Element,HTMLTextAreaElement:Element,HTMLSelectElement:Element};
c.window=c;vm.createContext(c);
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>({src:'http://localhost/'+m[1].replace(/^\.\//,'')}));
const originalQuery=document.querySelectorAll.bind(document);document.querySelectorAll=selector=>selector==='script[src]'?scripts:originalQuery(selector);
c.fetch=async url=>{const bytes=fs.readFileSync(path.join(root,new URL(url).pathname));return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
for(const file of ['data/world-objects.js','data/station-plaza.js','data/works.js','data/notes.js','data/places.js','data/town-maps.js','town-scene-validation.js','town-editor-session.js','main.js','developer-access.js','town-editor-upgrade.js','town-interaction-flow.js','town-memory.js','data/ghost-dialogue.js','town-ghost-npc.js','town-editor-spatial.js','town-editor-safe-export.js','tools/map-factory/zip.js','town-creation-draft.js','town-creation-draft-ui.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
c.loadTownSceneBackground=def=>{c.activeTownSceneDef=def;};c.updateInteractionHint=()=>{};c.updateControlVisibility=()=>{};
c.applyTownSceneDefinition('station_plaza','default');c.setupEditorEvents();document.getElementById('editor-panel').style.display='none';c.toggleDebugMode();
c.YUMANIWA_CREATION_UI.install();
const clone=v=>JSON.parse(JSON.stringify(v)),api=c.YUMANIWA_CREATION_DRAFT,session=c.YUMANIWA_EDITOR_SESSION;
const png=execFileSync('python3',['-B','-c',"import sys;sys.path.insert(0,'tests');from test_map_asset_registration import fixture_png;sys.stdout.buffer.write(fixture_png())"],{cwd:root});
const file=new Blob([png],{type:'image/png'});file.name='same.png';
(async()=>{
 const canonical=JSON.stringify(c.TOWN_SCENE_MAPS),originalDiff=clone(c.YUMANIWA_EDITOR_BUILD_DIFF());
 session.recordHistory();session.current().draft.props[0].x+=0.125;
 const diff=clone(c.YUMANIWA_EDITOR_BUILD_DIFF()),formalHistory=session.current().history.length;
 const secondPNG=execFileSync('python3',['-B','-c',"import sys;sys.path.insert(0,'tests');from test_map_asset_registration import fixture_png;sys.stdout.buffer.write(fixture_png(3))"],{cwd:root});
 const secondFile=new Blob([secondPNG],{type:'image/png'});secondFile.name='same.png';
 const first=await api.add(file),second=await api.add(secondFile);
 const metadataJSON=execFileSync('python3',['-B','-c',"import sys,json;sys.path.insert(0,'tests');from test_map_asset_registration import cleaner_sidecar;print(json.dumps(cleaner_sidecar()))"],{cwd:root});
 await api.metadata(new Blob([metadataJSON]));assert.notEqual(first,second);assert.notEqual(api.current().assets[0].key,api.current().assets[1].key);
 api.move(.25,.125);const before=clone(api.selectedPlacement()),cx=before.x+before.w/2;api.foot(-.25);const anchor=api.selectedPlacement().footY;
 api.resize(1.05);assert.equal(api.selectedPlacement().footY,anchor);assert(Math.abs(api.selectedPlacement().x+api.selectedPlacement().w/2-cx)<1e-12);
 api.undo();assert.equal(api.selectedPlacement(),undefined);api.select(second);assert.equal(api.selectedPlacement().footY,anchor);
 assert.deepEqual(clone(c.YUMANIWA_EDITOR_BUILD_DIFF()),diff);assert.equal(session.current().history.length,formalHistory);
 assert.equal(JSON.stringify(c.TOWN_SCENE_MAPS),canonical);assert(api.isDirty());
 const packed=await api.pack();const loaded=await api.read(packed.blob);
 for(const [i,a] of loaded.manifest.assets.entries())assert.deepEqual(Buffer.from(loaded.resources.get(a.key).bytes),i?secondPNG:png);
 loaded.resources.forEach(r=>URLClass.revokeObjectURL(r.url));
 await assert.rejects(()=>api.restore(packed.blob),/既存/);assert.deepEqual(clone(c.YUMANIWA_EDITOR_BUILD_DIFF()),diff);
 api.discard();c.discardTownEditorChanges();await api.restore(packed.blob);
 assert.deepEqual(clone(c.YUMANIWA_EDITOR_BUILD_DIFF()),diff);assert.equal(session.current().history.length,0);assert.equal(api.hasUndo(),false);assert.equal(api.isDirty(),false);
 // Actual local UI handlers (DOM adapter, not native file picker/layout).
 api.select(second);c.YUMANIWA_CREATION_UI.refresh();
 const footBefore=api.selectedPlacement().footY;
 document.getElementById('creation-foot-up').click();await new Promise(r=>setImmediate(r));
 assert.equal(api.selectedPlacement().footY,footBefore-1/16);
 document.getElementById('creation-undo').click();await new Promise(r=>setImmediate(r));api.select(second);
 const officialBefore=clone(c.YUMANIWA_EDITOR_BUILD_DIFF());
 document.getElementById('btn-editor-undo').click();assert.deepEqual(clone(c.YUMANIWA_EDITOR_BUILD_DIFF()),officialBefore);
 document.getElementById('creation-save').click();await new Promise(r=>setTimeout(r,25));
 assert(document.getElementById('creation-download-link').href.startsWith('blob:'));
 document.getElementById('creation-save-cancel').click();await new Promise(r=>setImmediate(r));assert(api.current());assert(api.isDirty());
 document.getElementById('creation-save').click();await new Promise(r=>setTimeout(r,25));
 document.getElementById('creation-saved').click();await new Promise(r=>setImmediate(r));assert.equal(api.isDirty(),false);
 const positions=clone(api.current().placements);c.currentScene='yokocho';assert.equal(api.renderItems().length,0);
 await assert.rejects(()=>api.add(file),/元のscene/);assert.deepEqual(clone(api.current().placements),positions);c.currentScene='station_plaza';assert.equal(api.renderItems().length,2);
 c.closeTownEditor();assert.equal(api.renderItems().length,2);assert.deepEqual(clone(api.current().placements),positions);c.toggleDebugMode();
 api.select(second);api.adopt(false);const adoption=await api.pack('adoption');assert.equal(adoption.manifest.placements.length,1);assert(adoption.manifest.formal);
 api.remove();assert.equal(api.current().placements.length,1);api.undo();assert.equal(api.current().placements.length,2);assert.deepEqual(clone(c.YUMANIWA_EDITOR_BUILD_DIFF()),diff);
 const statusBefore=JSON.stringify(api.current());await assert.rejects(()=>api.add(new Blob(['not png'])));assert.equal(JSON.stringify(api.current()),statusBefore);
 const oversized=new Blob([new Uint8Array(api.LIMITS.image+1)]);await assert.rejects(()=>api.add(oversized));assert.equal(JSON.stringify(api.current()),statusBefore);
 for(const mutate of [m=>m.placements[0].x=Infinity,m=>m.assets[0].path='../x.png',m=>m.assets[0].metadata={url:'https://example.test/a'},m=>m.placements[0].w=-1,m=>m.assets.push(...m.assets)]){
    const m=clone(packed.manifest);mutate(m);assert.throws(()=>api.validateManifest(m));}
 const corrupt=new Uint8Array(png);corrupt[33]^=1;assert.throws(()=>api.pngInfo(corrupt));
 if(nativeCanvas){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'creation-render-roundtrip-'));
  const bridge=mode=>JSON.parse(execFileSync('python3',['-B',path.join(root,'tests/test_creation_draft.py'),'--browser',mode,directory],{encoding:'utf8'}));
  const prepared=bridge('prepare');
  // Explicit renderer hook; native canvas supplies raster pixels, a simple player
  // marker makes foot ordering observable. This is not browser/character UI verification.
  vm.runInContext(fs.readFileSync(path.join(root,'data/station-plaza-props.js'),'utf8'),c);
  await Promise.all(nativeLoads);
  const ctx=nativeCanvas.createCanvas(512,512).getContext('2d');
  const proxy=new Proxy(ctx,{get(target,key){if(key==='drawImage')return(image,...args)=>target.drawImage(image.native||image,...args);const value=target[key];return typeof value==='function'?value.bind(target):value;},set(target,key,value){target[key]=value;return true;}});
  c.ctx=proxy;c.drawPlayerSprite=(x,y)=>{proxy.fillStyle='#da6050';proxy.fillRect(Math.round(x),Math.round(y),c.player.w,c.player.h);};
  const preserved=clone(api.current().placements);
  const capture=formal=>{c.activeTownSceneDef={props:formal||[]};const frames=[];for(const offset of [-.5,.5]){proxy.clearRect(0,0,512,512);c.player.x=preserved[0].x*16;c.player.y=(preserved[0].footY+offset)*16-c.player.h;c.YUMANIWA_STATION_PLAZA_PROPS.drawTownActorsAndProps();frames.push(Buffer.from(ctx.getImageData(0,0,512,512).data));}return frames;};
  const before=capture();assert.notDeepEqual(before[0],before[1]);
  api.select(second);api.adopt(true);const adopting=await api.pack('adoption');
  fs.writeFileSync(path.join(directory,'adoption.zip'),Buffer.from(await adopting.blob.arrayBuffer()));
  const applied=bridge('apply');assert.equal(applied.applied,true);assert(applied.formal.includes('パーツ更新'));
  imageRoot=prepared.root;vm.runInContext(fs.readFileSync(path.join(imageRoot,'data/world-objects.js'),'utf8'),c);
  const formalProps=applied.mapping.map(m=>m.prop);c.activeTownSceneDef={props:formalProps};
  assert.equal(api.renderItems().length,0,'provenance suppresses duplicate preview after adoption');
  await new Promise(resolve=>c.YUMANIWA_STATION_PLAZA_PROPS.preloadSceneProps({props:formalProps},{},resolve));
  for(let i=0;i<formalProps.length;i++)for(const field of ['x','y','w','h','footY'])assert.equal(formalProps[i][field],preserved[i][field]);
  const after=capture(formalProps);assert.deepEqual(after,before);
  fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify({result:'PASS',scope:'Node VM actual renderer + native raster canvas + actual Desk transaction; player is a marker; browser and physical devices unverified',geometry:formalProps,normalization:applied.images},null,2));
  console.log('PASS native raster/Desk combined roundtrip: exact two-foot-position pixels, 1x/3x original PNG bytes, independent formal edit, deterministic placement, duplicate preview suppression. Evidence '+directory);
  // Restore the original library for the remaining stale-source input checks.
  vm.runInContext(fs.readFileSync(path.join(root,'data/world-objects.js'),'utf8'),c);
 }
 api.discard();c.discardTownEditorChanges();assert.deepEqual(clone(c.YUMANIWA_EDITOR_BUILD_DIFF()),originalDiff);
 const thinPNG=execFileSync('python3',['-B','-c',"import io,sys;from PIL import Image;b=io.BytesIO();Image.new('RGBA',(2048,1),(255,0,0,255)).save(b,format='PNG');sys.stdout.buffer.write(b.getvalue())"],{cwd:root});
 const resourceCount=urls.size;await assert.rejects(()=>api.add(new Blob([thinPNG])),/縦横比/);assert.equal(api.current(),null);assert.equal(urls.size,resourceCount);
 const stale=clone(packed.manifest);stale.sources['data/world-objects.js']='0'.repeat(64);
 const bad=await c.MapFactoryZip.create([{name:'manifest.json',blob:new Blob([JSON.stringify(stale)])},...stale.assets.map((a,i)=>({name:a.path,blob:i?secondFile:file}))]);
 await assert.rejects(()=>api.restore(bad),/更新/);assert.equal(api.current(),null);assert.equal(session.isDirty(),false);
 console.log('PASS creation draft: independent owners/Undo/diff, same-name keys, foot-fixed resize, exact bytes, separate formal restore, scene lifetime, selected adoption, invalid input/CRC/size/source atomic rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
