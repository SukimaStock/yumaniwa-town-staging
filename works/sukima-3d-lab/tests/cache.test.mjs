import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),version=JSON.parse(readFileSync(new URL('package.json',root),'utf8')).version;
const deployed=new URL('https://lab.test/works/sukima-3d-lab/');
const imports=source=>[...source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);
const debugVersion='debug-20261015';
function validateGraph(entry,initial,freshDebug=false){
 const visited=new Set(),seenPaths=new Map(),queue=initial.map(src=>new URL(src,entry));
 while(queue.length){
  const url=queue.shift();if(visited.has(url.href))continue;visited.add(url.href);
  assert.equal(url.origin,deployed.origin);assert.ok(url.pathname.startsWith(deployed.pathname));
  const expected=freshDebug&&['app.js','debug.js'].includes(url.pathname.slice(deployed.pathname.length))?debugVersion:version;
  assert.equal(url.searchParams.get('v'),expected,`stale URL: ${url.href}`);
  assert.equal(url.search,`?v=${expected}`);assert.notEqual(url.href,new URL(url.pathname,url.origin).href,'warm unversioned cache cannot satisfy new module request');
  if(seenPaths.has(url.pathname))assert.equal(url.href,seenPaths.get(url.pathname),'one shared module URL');seenPaths.set(url.pathname,url.href);
  const relative=url.pathname.slice(deployed.pathname.length),source=readFileSync(new URL(relative,root),'utf8');
  for(const ref of imports(source))queue.push(new URL(ref,url));
 }
 return visited;
}
test('normal and debug fixture use a consistent fresh work-local module/CSS graph',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8'),script=html.match(/src="([^"]+\.js[^\"]*)"/)[1],style=html.match(/href="([^"]+\.css[^\"]*)"/)[1];
 assert.equal(new URL(style,deployed).search,`?v=${debugVersion}`);assert.ok(validateGraph(new URL('index.html',deployed),[script],true).size>=10);
 const fixture=readFileSync(new URL('tests/debug-fixture.html',root),'utf8'),fixtureUrl=new URL('tests/debug-fixture.html',deployed);
 assert.equal(new URL(fixture.match(/href="([^"]+)"/)[1],fixtureUrl).search,`?v=${version}`);assert.ok(validateGraph(fixtureUrl,imports(fixture)).size>=5);
 const motion=readFileSync(new URL('tests/motion-fixture.html',root),'utf8'),motionUrl=new URL('tests/motion-fixture.html',deployed);
 assert.equal(new URL(motion.match(/href="([^"]+)"/)[1],motionUrl).search,`?v=${version}`);assert.ok(validateGraph(motionUrl,imports(motion)).size>=5);
 const hands=readFileSync(new URL('tests/manipulation-fixture.html',root),'utf8'),handsUrl=new URL('tests/manipulation-fixture.html',deployed);
 assert.equal(new URL(hands.match(/href="([^"]+)"/)[1],handsUrl).search,`?v=${version}`);assert.ok(validateGraph(handsUrl,imports(hands)).size>=5);
 const combined=readFileSync(new URL('tests/combined-debug-fixture.html',root),'utf8'),combinedUrl=new URL('tests/combined-debug-fixture.html',deployed);
 assert.equal(new URL(combined.match(/href="([^"]+)"/)[1],combinedUrl).search,`?v=${debugVersion}`);assert.ok(validateGraph(combinedUrl,imports(combined),true).size>=5);
});
