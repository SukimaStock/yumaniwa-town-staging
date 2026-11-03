import * as pw from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const u=new URL(process.env.HTTPS_PROXY??process.env.HTTP_PROXY);
const proxy={server:u.protocol+'//'+u.host,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})};
const published=new Map();export const transportDiagnostics=[];
async function launch(kind,options){
 const b=await pw[kind].launch({...options,proxy});const newPage=b.newPage.bind(b);
 b.newPage=async options=>{const page=await newPage(options);page.setDefaultNavigationTimeout(120000);await page.context().route('https://sukimastock.github.io/**',async route=>{
  const url=route.request().url();let pending=published.get(url);
  try{if(!pending){pending=(async()=>{const response=await route.fetch({timeout:90000});const body=await response.body(),headers={...response.headers()};delete headers['content-encoding'];delete headers['content-length'];delete headers['transfer-encoding'];return{status:response.status(),headers,body};})();published.set(url,pending);}
   await route.fulfill(await pending);
  }catch(error){if(published.get(url)===pending)published.delete(url);transportDiagnostics.push({engine:kind,url,error:String(error).split('\n')[0]});try{await route.abort();}catch{}}
 });return page;};return b;
}
export const chromium={launch:options=>launch('chromium',options)};export const webkit={launch:options=>launch('webkit',options)};
