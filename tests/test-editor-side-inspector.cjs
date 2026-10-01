'use strict';
// Static layout contracts and real-function unit checks, not browser rendering.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const css=read('style.css'), main=read('main.js');
const media='@media (min-width: 820px) and (min-height: 600px)';
const compact=s=>s.replace(/\s+/g,'').toLowerCase();
// Scope declarations by balanced blocks; ignore comments and quoted braces.
function rules(source) {
    const clean=source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\//g,
        s=>s.startsWith('/*')?s.replace(/[^\r\n]/g,' '):s);
    const stack=[],out=[];let start=0;
    for(const m of clean.matchAll(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[{}]/g)) {
        if(m[0]==='{') {
            if(stack.length) stack.at(-1).nested=true;
            stack.push({header:clean.slice(start,m.index).trim(),start:m.index+1});start=m.index+1;
        } else if(m[0]==='}') {
            const b=stack.pop();assert(b);
            if(!b.nested&&!b.header.startsWith('@')) out.push({selector:b.header,parents:stack.map(p=>p.header),body:clean.slice(b.start,m.index)});
            start=m.index+1;
        }
    }
    assert.equal(stack.length,0);return out;
}
const parsed=rules(css);
function decl(blocks) {
    return Object.fromEntries(blocks.flatMap(b=>b.body.split(';').filter(s=>s.includes(':')).map(s=>{
        const i=s.indexOf(':');return [s.slice(0,i).trim(),compact(s.slice(i+1))];
    })));
}
const wide=parsed.filter(r=>r.parents.length===1&&compact(r.parents[0])===compact(media));
const base=selector=>decl(parsed.filter(r=>!r.parents.length&&r.selector.split(',').map(s=>s.trim()).includes(selector)));

test('wide override affects only Editor and preserves inherited sizing/scroll',()=>{
    assert.equal(wide.length,1);
    assert.equal(wide[0].selector,'#editor-panel');
    assert.deepEqual(decl(wide),{position:'relative',top:'auto',right:'auto',flex:'00auto','margin-left':'16px'});
    assert.equal(base('#editor-panel').width,'280px');
    assert.equal(base('#editor-panel').position,'absolute');
    assert.equal(base('#editor-panel')['flex-direction'],'column');
    assert(base('#editor-panel')['max-height'].includes('100dvh'));
    assert.equal(base('.editor-content')['overflow-y'],'auto');
    assert.equal(base('.editor-content')['min-height'],'0');
    assert.equal(base('.editor-header')['flex-shrink'],'0');
    // No later base absolute declaration may undo the wide override.
    assert.equal(parsed.at(-1),wide[0]);
});

test('available-size boundary excludes narrow/short viewports and fits maximum workspace',()=>{
    const match=wide[0].parents[0].match(/^@media\s*\(min-width:\s*(\d+)px\)\s*and\s*\(min-height:\s*(\d+)px\)$/);
    assert(match);const [,w,h]=match.map(Number);
    for(const [width,height,side] of [[390,844,false],[430,932,false],[768,1024,false],[819,900,false],[820,600,true],[821,599,false],[1024,768,true],[1280,800,true],[1440,900,true],[844,390,false]]) {
        assert.equal(width>=w&&height>=h,side,`${width}x${height}`);
    }
    const townMax=parseFloat(base(':root')['--town-screen-max-w']);
    const panel=base('#editor-panel');
    const workspace=townMax+parseFloat(panel.width)+2*parseFloat(panel.border)+parseFloat(decl(wide)['margin-left']);
    assert.equal(workspace,770);assert(w-workspace>=50);
});

test('existing centered flex parent and nonshrinking town need no reserved workspace',()=>{
    const parent=base('#game-container');
    assert.equal(parent.display,'flex');assert.equal(parent['justify-content'],'center');assert.equal(parent['align-items'],'center');
    assert.equal(base('#town-screen').flex,'00auto');
    assert(!('display' in decl(wide))); // inline display:none removes inspector AND its margin.
    assert(!wide.some(r=>r.selector.includes('#game-container')||r.selector.includes('#town-screen')));
});

function realFunction(name,next) {
    const start=main.indexOf('function '+name+'('),end=main.indexOf('\nfunction '+next+'(',start);
    assert(start>=0&&end>start);return main.slice(start,end);
}
test('pointer conversion follows shifted canvas rect without changing logical point',()=>{
    const c={canvas:{width:390,height:780}};vm.createContext(c);
    vm.runInContext(realFunction('getCanvasPointerPoint','getPointerTile'),c);
    for(const left of [445,295]) {
        c.canvas.getBoundingClientRect=()=>({left,top:20,width:390,height:780});
        const point=c.getCanvasPointerPoint({clientX:left+123,clientY:20+456});
        assert.equal(point.x,123);assert.equal(point.y,456);
    }
});

test('real collapse handler clears inline height limits and restores body on reopen',()=>{
    const body={style:{}},panel={style:{},classList:{toggle(){}},querySelector:()=>body};
    const c={document:{getElementById:id=>id==='editor-panel'?panel:null}};vm.createContext(c);
    // Function ends immediately before the next declaration in the existing source.
    const start=main.indexOf('function setEditorPanelCollapsed(');
    const end=main.indexOf('\nfunction ',start+1);assert(end>start);
    vm.runInContext(main.slice(start,end),c);
    c.setEditorPanelCollapsed(true);assert.equal(body.style.display,'none');assert.equal(panel.style.maxHeight,'none');
    c.setEditorPanelCollapsed(false);assert.equal(body.style.display,'');assert.equal(panel.style.maxHeight,'');assert.equal(panel.style.height,'');
    assert.equal(panel.style.position,undefined);assert.equal(panel.style.display,undefined);
});
