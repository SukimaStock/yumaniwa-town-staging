// Research launch only; never opens player origin, disables sandbox, or alters browser security.
import {createRequire} from 'node:module';
import {writeFileSync,existsSync} from 'node:fs';
const require=createRequire('/opt/codex/cua_node/lib/node_modules/playwright/package.json');
const {chromium,firefox,webkit}=require('playwright');
const output=process.argv[2];
const result={timestamp:new Date().toISOString(),node:process.version,platform:process.platform,attempts:[],scope:'Fresh isolated browser only, no game origin or player storage.'};
for(const [name,type,path] of [['chromium',chromium,'/usr/bin/chromium'],['firefox',firefox,firefox.executablePath()],['webkit',webkit,webkit.executablePath()]]){
 if(!existsSync(path)){result.attempts.push({name,path,status:'unavailable',reason:'Executable absent; no install attempted.'});continue;}
 let browser;
 try{
  browser=await type.launch({executablePath:path,headless:true,...(name==='chromium'?{chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings','--enable-unsafe-swiftshader']}:{})});
  const page=await browser.newPage();await page.goto('about:blank');
  result.attempts.push({name,path,status:'launched',version:browser.version(),page:page.url()});
 }catch(e){result.attempts.push({name,path,status:'blocked',error:String(e)});}finally{await browser?.close();}
}
result.browserStorageTests='NOT RUN by launch probe';
if(output)writeFileSync(output,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
