import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {dependencyFingerprint} from '../checkpoint-persistence/fingerprint.mjs';
import {loadAdapter} from '../checkpoint-research/prototype.mjs';
const [fixtureFile,output]=process.argv.slice(2);assert(fixtureFile&&output,'p2-run.mjs <generated-fixture.json> <output.json>');
const root=fileURLToPath(new URL('../../../',import.meta.url)),raw=readFileSync(fixtureFile,'utf8'),fixture=JSON.parse(raw),adapter=await loadAdapter();
const hash=value=>createHash('sha256').update(value).digest('hex');const fingerprint=()=>hash(JSON.stringify({dependencies:dependencyFingerprint(adapter.fingerprint),fixtureHash:hash(raw),harness:hash(readFileSync(new URL('./harness.html',import.meta.url),'utf8'))})),codeFingerprint=fingerprint();
const require=createRequire(resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/package.json')),{chromium}=require('playwright');
const server=createServer((req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!path.startsWith(root)){res.writeHead(403);res.end();return;}res.writeHead(200,{'Content-Type':extname(path)==='.mjs'?'text/javascript':'text/html','Cache-Control':'no-store'});res.end(readFileSync(path));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{browser=await chromium.launch({headless:true,executablePath:process.env.AMBER_BROWSER_EXECUTABLE??'/tmp/amber-h0-browser/chromium',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer']});const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/works/ambertime/checkpoint-idb-research/harness.html`);
 const run=await page.evaluate(async fixture=>(await import('./p2-suite.mjs')).runP2(fixture),fixture);assert.equal(fingerprint(),codeFingerprint,'Research code changed during targeted validation');const result={schema:'ambertime-h1-a4-p2-browser-results/1',status:run.failed?'failed':'complete',codeFingerprint,fixtureHash:hash(raw),browser:browser.version(),...run};mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,passed:run.passed,failed:run.failed,codeFingerprint}));assert.equal(run.failed,0,JSON.stringify([...run.base.cases,...run.cases].filter(c=>c.status==='fail')));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
