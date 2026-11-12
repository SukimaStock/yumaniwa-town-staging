// Exact source-gated Node experiment; original runtime files remain unchanged.
import {createHash} from 'node:crypto';
const adapter=JSON.stringify(new URL('./adapter.mjs',import.meta.url).href);
const gates={
 'clone-data.mjs':{
  hash:'b668df5935a1f09c933dc82631cf828ab5b1532cdf531a91a3dcef1ebecc98d3',
  needle:'export function cloneReplayState(value){',
  suffix:'\n const __labHit=__tryForwardClone(value);if(__labHit)return __labHit.value;',
  prefix:`import {tryForwardClone as __tryForwardClone} from ${adapter};\n`
 },
 'partner-orders.mjs':{
  hash:'72a73307f3938046ece2c87912dc13f95bdf0e47f9cf74a79a90828ed411a27f',
  needle:'let j=E.economicMonthly(s,expectedMonth,reputationMode(s)?retailReputationFactors(s):null,timing);',
  suffix:'__labPhase("afterEconomy");',
  prefix:`import {observePhase as __labPhase} from ${adapter};\n`
 },
 'regional-consignment.mjs':{
  hash:'a595033f2c3649eed17ae65bb464b2a1284f21f07793ef5387f5f6c0781681f2',
  needle:'st.settledMonth=month;',
  suffix:'__labPhase("afterConsignment");',
  prefix:`import {observePhase as __labPhase} from ${adapter};\n`
 }
};
export async function load(url,context,next) {
 const out=await next(url,context),pathname=new URL(url).pathname;
 for(const [name,gate] of Object.entries(gates)) if(pathname.endsWith('/works/ambertime/'+name)) {
  const text=String(out.source),hash=createHash('sha256').update(text).digest('hex');
  if(hash!==gate.hash)throw Error(name+' source SHA differs from reviewed Lab baseline');
  if(text.split(gate.needle).length!==2)throw Error(name+' exact hook count mismatch');
  return {...out,source:gate.prefix+text.replace(gate.needle,gate.needle+gate.suffix)};
 }
 return out;
}
