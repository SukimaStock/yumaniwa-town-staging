// Test-only browser dependency model; never imported by the game.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const origin='https://ambertime.invalid/';
const local=value=>value.startsWith('.')||value.startsWith('/');
const hash=source=>createHash('sha256').update(source).digest('hex');
const decode=value=>value.replaceAll('&amp;','&');

export function dependencies(source,path){
 source=String(source);
 const result=[];
 const add=(kind,spec)=>{if(local(spec))result.push({kind,spec:decode(spec),target:new URL(decode(spec),origin+path).pathname.slice(1)});};
 if(path.endsWith('.html')){
  for(const match of source.matchAll(/<(script|link)\b([^>]*)>/gi)){
   const attrs=Object.fromEntries([...match[2].matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)].map(m=>[m[1].toLowerCase(),m[3]]));
   if(match[1].toLowerCase()==='script'&&attrs.src)add('script',attrs.src);
   if(match[1].toLowerCase()==='link'&&['stylesheet','modulepreload'].includes(attrs.rel))add(attrs.rel,attrs.href??'');
  }
 }else if(path.endsWith('.css')){
  const clean=source.replace(/\/\*[\s\S]*?\*\//g,'');
  for(const m of clean.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g))add('style-import',m[1]);
  for(const m of clean.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g))if(!result.some(e=>e.spec===m[1]))add('asset',m[1]);
 }else if(/\.[cm]?js$/.test(path)){
  const tokens=moduleTokens(source);
  for(let i=0;i<tokens.length;i++){
   const token=tokens[i];if(token.type!=='word')continue;
   if(token.value==='import'&&tokens[i-1]?.value!=='.'){
    if(tokens[i+1]?.value==='.')continue; // import.meta
    if(tokens[i+1]?.value==='('){if(tokens[i+2]?.type==='string')add('dynamic-import',tokens[i+2].value);else assert.fail('nonliteral dynamic import requires cache graph review: '+path);}
    else if(tokens[i+1]?.type==='string')add('import',tokens[i+1].value);
    else for(let j=i+1;j<tokens.length&&tokens[j].value!==';';j++)if(tokens[j].value==='from'&&tokens[j+1]?.type==='string'){add('import',tokens[j+1].value);break;}
   }else if(token.value==='export'){
    for(let j=i+1;j<tokens.length&&tokens[j].value!==';';j++){if(tokens[j].value==='function'||tokens[j].value==='class'||tokens[j].value==='const'||tokens[j].value==='let')break;if(tokens[j].value==='from'&&tokens[j+1]?.type==='string'){add('export',tokens[j+1].value);break;}}
   }else if(token.value==='new'&&['Worker','SharedWorker'].includes(tokens[i+1]?.value)&&tokens[i+2]?.value==='('){
    const argument=tokens[i+3];if(argument?.type==='string')add('worker',argument.value);
    else if(argument?.value==='new'&&tokens[i+4]?.value==='URL'&&tokens[i+5]?.value==='('&&tokens[i+6]?.type==='string')add('worker',tokens[i+6].value);
    else assert.fail('nonliteral worker URL requires cache graph review: '+path);
   }
  }
 }
 return result.filter((edge,index)=>result.findIndex(other=>other.kind===edge.kind&&other.spec===edge.spec)===index);
}

// Small lexical reader for the literal module URLs used by this buildless app.
// Strings, templates, comments and regex literals are opaque; their text cannot
// invent edges. Computed imports/workers fail explicitly rather than disappearing.
function moduleTokens(source){
 const tokens=[];let i=0;
 const regexAfter=new Set(['(','[','{',',',';',':','=','!','?','&','|','+','-','*','%','^','~','return','throw','case','yield','=>']);
 while(i<source.length){
  const c=source[i],next=source[i+1];if(/\s/.test(c)){i++;continue;}
  if(c==='/'&&next==='/'){i=source.indexOf('\n',i+2);if(i<0)break;continue;}
  if(c==='/'&&next==='*'){const end=source.indexOf('*/',i+2);assert(end>=0,'unterminated module comment');i=end+2;continue;}
  if(c==='"'||c==="'"||c==='`'){
   const quote=c;let value='';i++;
   while(i<source.length&&source[i]!==quote){if(source[i]==='\\'){value+=source[i++];if(i<source.length)value+=source[i++];}else value+=source[i++];}
   assert(i<source.length,'unterminated module string');i++;
   // Do not silently omit executable imports hidden in template substitutions.
   // Other unfamiliar loader syntax needs an explicit graph-reader review.
   if(quote==='`'&&/\$\{[\s\S]*\b(?:import|Worker|SharedWorker)\b/.test(value))assert.fail('template loader expression requires cache graph review');
   // Runtime module specifiers currently contain no escape sequences.
   tokens.push({type:quote==='`'?'template':'string',value});continue;
  }
  if(c==='/'&&(!tokens.length||regexAfter.has(tokens.at(-1).value))){
   let bracket=false;i++;
   while(i<source.length){const r=source[i++];if(r==='\\'){i++;continue;}if(r==='[')bracket=true;else if(r===']')bracket=false;else if(r==='/'&&!bracket)break;}
   while(/[a-z]/i.test(source[i]??'')&&i<source.length)i++;
   tokens.push({type:'regex',value:'regexp'});continue;
  }
  if(/[a-zA-Z_$]/.test(c)){const start=i++;while(/[\w$]/.test(source[i]??'')&&i<source.length)i++;tokens.push({type:'word',value:source.slice(start,i)});continue;}
  if(c==='='&&next==='>'){tokens.push({type:'punctuation',value:'=>'});i+=2;continue;}
  tokens.push({type:'punctuation',value:c});i++;
 }
 return tokens;
}

export function buildGraph(read,entry='works/ambertime/index.html'){
 const nodes=new Map();
 const visit=path=>{if(nodes.has(path))return;const source=read(path);assert.notEqual(source,undefined,`missing cache dependency ${path}`);const edges=dependencies(source,path);nodes.set(path,{hash:hash(source),edges});for(const edge of edges)visit(edge.target);};
 visit(entry);return {entry,nodes};
}
export function currentGraph(){return buildGraph(path=>readFileSync(new URL('../../../'+path,import.meta.url)));}
export function requireEdge(graph,parent,target,{versioned=true,kind}={}){
 const edges=graph.nodes.get(parent)?.edges.filter(e=>e.target===target&&(!kind||e.kind===kind))??[];
 assert(edges.length,`missing ${parent} → ${target}${kind?' ('+kind+')':''}`);
 if(versioned)for(const edge of edges){const params=new URL(edge.spec,origin+parent).searchParams;assert([...params].some(([key,value])=>key&&value),`unversioned ${parent} → ${target}`);}
 return edges;
}
export function sameIdentity(graph,parents,target){
 const identities=parents.map(parent=>new URL(requireEdge(graph,parent,target)[0].spec,origin+parent).href);
 assert.equal(new Set(identities).size,1,`split module identity for ${target}: ${identities.join(', ')}`);
}
export function assertUpdatedGraph(before,after){
 // A cached parent can reveal a changed child URL only after its own incoming URL
 // changes. Check every old incoming edge, recursively up to the HTML entry.
 for(const [path,node] of after.nodes){
  const old=before.nodes.get(path);if(path===after.entry||!old||old.hash===node.hash)continue;
  for(const [parent,parentNode] of before.nodes){
   for(const edge of parentNode.edges.filter(edge=>edge.target===path)){
    const next=after.nodes.get(parent)?.edges.filter(e=>e.target===path&&e.kind===edge.kind)??[];
    // Removal is safe only when the parent bytes change (and propagate in turn).
    if(!next.length){assert.notEqual(after.nodes.get(parent)?.hash,parentNode.hash,`removed edge in unchanged ${parent}`);continue;}
    assert(next.every(e=>new URL(e.spec,origin+parent).href!==new URL(edge.spec,origin+parent).href),`stale cache identity: ${parent} → ${path}`);
   }
  }
 }
}

// Immutable pre-R0 anchor: 8fab526aec22a83b73147225c99e88e48188586e.
// Hashes and resolved edges, not regenerated expectations or a Git/network dependency.
const anchor=[
 ["works/ambertime-flavor-lab-v02/bridge.mjs","7c67199a05cfdda45a5e67da10c3c712c97087179e1d3f19cd50cce589e1ac3b",[["import","./model.mjs","works/ambertime-flavor-lab-v02/model.mjs"]]],
 ["works/ambertime-flavor-lab-v02/model.mjs","18165f8a71b3cddabea366f0c1cef80baabf311ce3f0084f36f3f6ddef01473a",[]],
 ["works/ambertime/aroma-extraction.mjs","b5f72397fc17387302320042bbe8c11629efac495361b379aad53a62cb01a3b6",[["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./economy-parameters.mjs","works/ambertime/economy-parameters.mjs"]]],
 ["works/ambertime/bottle-storage.mjs","7fb29615fd0ecaaeaad9e0084f1fb7b26f7ffe44a2b10a7c4f31a525bee6d652",[["import","./generations.mjs?v=0.41-delegation","works/ambertime/generations.mjs"]]],
 ["works/ambertime/brand-identity.mjs","81150e429e9309db94a979ddeaecad03b55cb0898acb75a25e6bcfa6e2963596",[]],
 ["works/ambertime/brand-reputation.mjs","adb3b110fae728e92f0025e7ef2e7c352f7a508caa9d13cea235e85b505aecec",[]],
 ["works/ambertime/brands.css","199a75c90f0febc2b408905f4d25169df511e9b400625d05fc78f26bcee92af0",[["style-import","./partners.css","works/ambertime/partners.css"]]],
 ["works/ambertime/brewing-cards.mjs","5333bacbdd78aaeac11adb7c835f0ef095f936af0ca4ec75c0e46416f522868c",[]],
 ["works/ambertime/canvas-layout.mjs","f2aa4cf25885827b0b438f5345294feb71302909a82bfe884c118097f00da590",[["import","./text-metrics.mjs?v=0.24-type-ui-1","works/ambertime/text-metrics.mjs"]]],
 ["works/ambertime/canvas-scene.mjs","67bdbc0f2c0c581ea2ef2f8c8c5ff929adfaeca7d86bf6a6bed0bc64651d2a40",[["import","./brewing-cards.mjs?v=confirmed-brewing-r1","works/ambertime/brewing-cards.mjs"],["import","./cut-bar.mjs?v=cut-range-r1","works/ambertime/cut-bar.mjs"],["import","./distill-tools-view.mjs?v=rooms-stage2-r1","works/ambertime/distill-tools-view.mjs"],["import","./font-uniform.mjs?v=uniform-messages-r1","works/ambertime/font-uniform.mjs"],["import","./room-motion.mjs?v=0.68-ui-refinements","works/ambertime/room-motion.mjs"],["import","./scene-input.mjs?v=0.21-space-1","works/ambertime/scene-input.mjs"],["import","./canvas-layout.mjs?v=store-market-main-r1&rooms=stage3-r1","works/ambertime/canvas-layout.mjs"],["import","./cask-glass-art.mjs?v=0.58-first-brand","works/ambertime/cask-glass-art.mjs"],["import","./room-object-art.mjs?v=0.62-bottle-shelf-wall&tools=r2","works/ambertime/room-object-art.mjs"],["import","./font-loader.mjs?v=0.35-font-1","works/ambertime/font-loader.mjs"],["import","./text-metrics.mjs?v=0.24-type-ui-1","works/ambertime/text-metrics.mjs"],["import","./pixel-symbols.mjs?v=rooms-stage2-r1","works/ambertime/pixel-symbols.mjs"],["import","./ui-text.mjs?v=stage4-r2&rooms=stage3-r1&aging=1","works/ambertime/ui-text.mjs"]]],
 ["works/ambertime/cask-detail-view.mjs","4c32ff44081b5a2e4ec78a6c427d00db2ddfca5c5328daeb10a95805a0fb8367",[["import","./flavor-types.mjs?v=stage4-r2","works/ambertime/flavor-types.mjs"],["import","./flavor-view.mjs?v=formal-copy-r1","works/ambertime/flavor-view.mjs"],["import","./ui-text.mjs?v=stage4-r2&rooms=stage3-r1&aging=1","works/ambertime/ui-text.mjs"]]],
 ["works/ambertime/cask-glass-art.mjs","626c1e9a9579f97662d002c869efc543b9fb107f8167dabf779fdef3afc77c16",[["export","./codea-object-art.mjs?v=0.57-codea-objects","works/ambertime/codea-object-art.mjs"]]],
 ["works/ambertime/cask-ledger-worker.mjs","d5e923560c332c90af30d5879f3318f49bd0827097ef96146e84d87f0661309f",[["import","./partner-orders.mjs?v=market-rules-r1","works/ambertime/partner-orders.mjs"],["import","./cask-ledger.mjs?v=stage4-r3","works/ambertime/cask-ledger.mjs"]]],
 ["works/ambertime/cask-ledger.mjs","249a9d26d14856c8015620ff113af07d780c95e3ba042188b85466fbc613bea5",[["import","./ledger-view.mjs","works/ambertime/ledger-view.mjs"]]],
 ["works/ambertime/cask-serials.mjs","417373e9c2049a14c5e0a4bf86adade88cd67964bf7fb309072389e8205fc720",[["import","./partner-orders.mjs?v=market-rules-r1","works/ambertime/partner-orders.mjs"],["import","./trade.mjs?v=adjust-b-r1","works/ambertime/trade.mjs"]]],
 ["works/ambertime/character.mjs","aad7d88de1a654703305c3714268cf843e3018c94cababdb0835c0faa66e5ebb",[["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"]]],
 ["works/ambertime/codea-object-art.mjs","6323c75e13c773c3dda8d5266a0f7b91f11b94a612af7b0881e4377bf244023b",[["import","./brand-identity.mjs?v=0.58-first-brand","works/ambertime/brand-identity.mjs"]]],
 ["works/ambertime/cut-bar.mjs","3982c504d83ff864b822bdbf8db8fa4941bac8d3aa725b382709e260575be3f0",[]],
 ["works/ambertime/department-projects.mjs","a8ecffd62f208309c1f96e0ac1c737ceeb3bc1bf7851d80aa20ce802d09a8a59",[["import","./partial-bottling.mjs?v=0.41-delegation","works/ambertime/partial-bottling.mjs"],["import","./bottle-storage.mjs?v=0.41-delegation","works/ambertime/bottle-storage.mjs"]]],
 ["works/ambertime/distill-learning.mjs","b102dddf20bbcee9cd18f852933bf3537a11950c47402b957de17f97c670a728",[]],
 ["works/ambertime/distill-tool-input.mjs","03c48fe15fa28437ba71e759222e90fd416f35ce6ba45eba487cecc9ebab644c",[]],
 ["works/ambertime/distill-tools-view.mjs","15e0d1f075d823e2c563cec1d7c218bd376d5c1837aa027a1496a849debf1ce8",[["import","./parameters.mjs","works/ambertime/parameters.mjs"]]],
 ["works/ambertime/distiller.mjs","8f2e7d776c6cdd74f60f1193c395d0665129463591b78f3730c3fbe49adb87a2",[["import","./partial-bottling.mjs?v=0.41-delegation","works/ambertime/partial-bottling.mjs"]]],
 ["works/ambertime/distillery-history.mjs","119fd941e6ab671feef4ea8dce1b3d8b2e91236a8a0c2f2ca16b9e10a30504d4",[["import","./generation-summary.mjs?v=market-rules-r1","works/ambertime/generation-summary.mjs"],["import","./partner-orders.mjs?v=market-rules-r1","works/ambertime/partner-orders.mjs"],["import","./generations.mjs?v=0.48-free-aging","works/ambertime/generations.mjs"]]],
 ["works/ambertime/distillery-parameters.mjs","0154c14c4784a7383d12e11db36424f35cc454272b21ff105759be11e1284710",[]],
 ["works/ambertime/distillery.css","34cda415e48bfed62d95301b14a2316db044e7bc630a1f44619eef99d4a9c53b",[["style-import","./journey.css","works/ambertime/journey.css"]]],
 ["works/ambertime/distillery.mjs","29af98be3ebb0032cc761ca2f6ca179d5054eba92ae7855be3cf509e4dae5061",[["import","./monthly.mjs?v=stage4-r2","works/ambertime/monthly.mjs"],["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./character.mjs?v=stage4-r2","works/ambertime/character.mjs"],["import","./parameters.mjs","works/ambertime/parameters.mjs"],["import","./distillery-parameters.mjs","works/ambertime/distillery-parameters.mjs"],["export","./distillery-parameters.mjs","works/ambertime/distillery-parameters.mjs"]]],
 ["works/ambertime/economy-parameters.mjs","fc024e9bf6f5f78d5aadd6e0ec26d7a3d6eaaeb9de4d8b599f39b74c72a25e32",[["import","./parameters.mjs","works/ambertime/parameters.mjs"],["import","./parallel-parameters.mjs","works/ambertime/parallel-parameters.mjs"]]],
 ["works/ambertime/economy.mjs","a0c7c02805f825123b0d5e65ef5125e15cad33403ea2f9cd5e90ea8bace5a037",[["import","./market-sales.mjs?v=market-rules-r1","works/ambertime/market-sales.mjs"],["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./distillery.mjs?v=stage4-r2","works/ambertime/distillery.mjs"],["import","./character.mjs?v=stage4-r2","works/ambertime/character.mjs"],["import","./monthly.mjs?v=stage4-r2","works/ambertime/monthly.mjs"],["import","./parameters.mjs","works/ambertime/parameters.mjs"],["import","./economy-parameters.mjs","works/ambertime/economy-parameters.mjs"],["export","./economy-parameters.mjs","works/ambertime/economy-parameters.mjs"]]],
 ["works/ambertime/event-notices.mjs","6bf4c81ab4b54dcf2660ac76d9d9c3706f89c170de0d2615915898a72de8965f",[["import","./player-news.mjs?v=adjust-a-r1","works/ambertime/player-news.mjs"]]],
 ["works/ambertime/experiments/reputation/v03/model.mjs","1005303c0971e9c6b265dcc4ce07d94a39f707498ba9c9dde887312634a88067",[]],
 ["works/ambertime/experiments/reputation/v05/core.mjs","86221031c15c300561d6ca0cbab48b777290651a124776405995872a46ee2e3f",[["import","../v03/model.mjs","works/ambertime/experiments/reputation/v03/model.mjs"]]],
 ["works/ambertime/experiments/reputation/v05/model.mjs","5c8b827b880d6867283e04b03aa145521d16f74259ffcf793418c7869e780e7d",[["import","./core.mjs","works/ambertime/experiments/reputation/v05/core.mjs"],["import","../v03/model.mjs","works/ambertime/experiments/reputation/v03/model.mjs"]]],
 ["works/ambertime/experiments/town-simulation/v01/model.mjs","cb32ec1ba9009e0a43dbf82172a9d686edc9f0328d928dc27d91014e806dbef1",[["import","../../../../ambertime-flavor-lab-v02/bridge.mjs?stage3=1","works/ambertime-flavor-lab-v02/bridge.mjs"],["import","../../reputation/v03/model.mjs","works/ambertime/experiments/reputation/v03/model.mjs"],["import","../../reputation/v05/core.mjs","works/ambertime/experiments/reputation/v05/core.mjs"],["import","../../reputation/v05/model.mjs","works/ambertime/experiments/reputation/v05/model.mjs"]]],
 ["works/ambertime/experiments/world-map/v01/map.mjs","9885dfeaa9a0224c5d74f1a4ba78806c79f98e9b0cc75dd60872fba75644021a",[]],
 ["works/ambertime/flavor-color.mjs","3b4193bf41ec03b481dd339445c19b6a2bf2621548a3b156ffc9d7570334d7b2",[]],
 ["works/ambertime/flavor-feedback-view.mjs","f3d74232d02f2fb243862c02dc9dcf25dc83d36b89c94ac52fbe2c60d7e0a73d",[["import","./player-news.mjs?v=0.25.4","works/ambertime/player-news.mjs"],["import","./tasting-view.mjs?v=stage4-r2","works/ambertime/tasting-view.mjs"],["import","./ui-text.mjs?v=stage4-r2&rooms=stage3-r1&aging=1","works/ambertime/ui-text.mjs"]]],
 ["works/ambertime/flavor-types.mjs","adf20a8af4b8d1293f7fe8097c0410030a9ef04d946f1a250bc0e262aa65ab7a",[]],
 ["works/ambertime/flavor-view.mjs","5cb8ebeb1224e623139b7bafc92bb79ba009bca6b8d9f336fda26aba5db30536",[["import","./lab-flavor.mjs?v=stage4-r2","works/ambertime/lab-flavor.mjs"],["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./tasting-view.mjs?v=stage4-r2","works/ambertime/tasting-view.mjs"]]],
 ["works/ambertime/font-loader.mjs","548d3398bb04cebe0dda863c0dc83aadd1876db10c05983cfad6a5034b5ed22e",[]],
 ["works/ambertime/font-uniform.css","c2fa950c5ecb9800e5b7b89f06366ddc8d6b8795e5f46846090484b7814efd67",[]],
 ["works/ambertime/font-uniform.mjs","bcfa34269b9471d8ec6bd12eec43a8a1a29c2816927fa3e938e76ce0fb211963",[["import","./text-metrics.mjs?v=0.24-type-ui-1","works/ambertime/text-metrics.mjs"]]],
 ["works/ambertime/fonts/misaki_gothic_2nd.ttf","5f0cbb8850e910ffa749d467bc41c89271388a0cbe0fe48741cf2bf0dfe3ac43",[]],
 ["works/ambertime/generation-summary.mjs","1c7608321562968ed91b4983f82ecb10d198d24cf4611d0da14ea23d964d9d68",[["import","./partner-orders.mjs?v=market-rules-r1","works/ambertime/partner-orders.mjs"]]],
 ["works/ambertime/generations.mjs","670373d967120f2de2290da2ac29393e8861d79bd1f8dad6f0be41414a12dfa7",[["import","./recipe-book.mjs?v=0.41-delegation","works/ambertime/recipe-book.mjs"]]],
 ["works/ambertime/history-worker.mjs","b1180e4c9b8b6782236e03ce799d07a7ea4688dfcbad6f002b2e3573e13082de",[["import","./distillery-history.mjs?v=market-rules-r1","works/ambertime/distillery-history.mjs"]]],
 ["works/ambertime/index.html","1043afcfed8205b5830f5b58ee8c47067b8d24e5868b5fe88588eab789d8acb9",[["stylesheet","./shop.css?v=placement-hand-delta-r2&touch=1&status=1","works/ambertime/shop.css"],["stylesheet","./room-scene.css?rooms=stage2-r1&v=visual14-r1&map=0.28.0-r3&daily=cut-range-r1&status=1","works/ambertime/room-scene.css"],["stylesheet","./font-uniform.css?v=store-market-main-r1","works/ambertime/font-uniform.css"],["stylesheet","./market.css?v=compact-three-r1&rooms=stage1-r1&touch=1","works/ambertime/market.css"],["script","./shop-app.mjs?v=market-layout-r1&rooms=stage3-r1&touch=1&status=1&aging=1","works/ambertime/shop-app.mjs"]]],
 ["works/ambertime/journey.css","6539fbf4f0e904e0a65bf77a96f08006fe6ee103cdc6475a1fb6d89c192a5a23",[]],
 ["works/ambertime/lab-flavor.mjs","2e617470bf6069052522194741d83795468d9b3c4ffff3910e4b7b60ad8377ca",[["import","../ambertime-flavor-lab-v02/model.mjs","works/ambertime-flavor-lab-v02/model.mjs"]]],
 ["works/ambertime/ledger-view.mjs","6f967afaf613e622d6abac2d3e2d52f054d4c86f20ae8a16fc6315119ce17c91",[]],
 ["works/ambertime/map-daily-view.mjs","ca1fda0b050c63c792e7e96599de0f21d6ac6482d5dd7391bb15d8b2ac38689a",[["import","./shop-model.mjs?v=0.48-free-aging","works/ambertime/shop-model.mjs"],["import","./map-sales-view.mjs?v=map-stage2-r1","works/ambertime/map-sales-view.mjs"],["import","./world-map-view.mjs?v=0.28.0-map","works/ambertime/world-map-view.mjs"]]],
 ["works/ambertime/map-sales-view.mjs","364237b0d6f76ec166528c5da822cb2356ef8a9818de5540771abe1980df625f",[["import","./shop-model.mjs?v=0.48-free-aging","works/ambertime/shop-model.mjs"],["import","./placement-mode.mjs?v=store-market-main-r1","works/ambertime/placement-mode.mjs"],["import","./shop-remarks.mjs?v=0.51-shop-remarks","works/ambertime/shop-remarks.mjs"],["import","./world-map-view.mjs?v=0.28.0-map","works/ambertime/world-map-view.mjs"],["import","./player-news.mjs?v=0.25.4","works/ambertime/player-news.mjs"]]],
 ["works/ambertime/market-sales.mjs","5b40fb74ee0f1e3a74c331c30e205a4d6a60c2e3d5ae89380491815f21892136",[]],
 ["works/ambertime/market-ui.mjs","b41304d660701699da5b71dcb297d9b8df904eaada2c40756521506298cdb886",[["import","./pixel-symbols.mjs?v=rooms-stage2-r1","works/ambertime/pixel-symbols.mjs"],["import","./retail-sale-motion.mjs?v=count-linked-r1","works/ambertime/retail-sale-motion.mjs"],["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./flavor-types.mjs?v=stage4-r2","works/ambertime/flavor-types.mjs"]]],
 ["works/ambertime/market.css","a7ecaaf7a61fff078c565a8d2096ff68cd71a999c9b428bde0727ac8db690d56",[]],
 ["works/ambertime/message-view.mjs","2ae5100188a6228c0efec7c27e9f11e0e02322b28d9c1101e22e2e4e83920a9f",[]],
 ["works/ambertime/model.mjs","8103594438971fee50c5e8f17ebbeb78e66365edc895f46eca22c51ea864eac0",[["import","./parameters.mjs","works/ambertime/parameters.mjs"],["import","./lab-flavor.mjs?v=stage4-r2","works/ambertime/lab-flavor.mjs"]]],
 ["works/ambertime/monthly.mjs","5f0a52a5c002b2e8971bd5a2b9e04cdf05ccb271f53d8b130e05ae98658b3ca2",[["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./character.mjs?v=stage4-r2","works/ambertime/character.mjs"]]],
 ["works/ambertime/nearby-comparison.mjs","46cb0db0a24a6904acfc17c54d2ba7c78dd23b60719b64c82b9e241198fdfee7",[["import","./partner-orders.mjs?v=market-rules-r1","works/ambertime/partner-orders.mjs"]]],
 ["works/ambertime/parallel-parameters.mjs","af05f0504c0788fbf9f9d1432f2a65c71f3f0d043971b2d1475eee076dc13f3f",[]],
 ["works/ambertime/parallel.css","bee587696f4d973d27126d1b60d04e2d2592b3b5a5c0eca9e40c7fb15c61a369",[["style-import","./distillery.css?v=0.6.3","works/ambertime/distillery.css"]]],
 ["works/ambertime/parameters.mjs","e8c08c0887936c70e8049d99c3509a8907896cf2d0848ddf13a5d810db50b822",[]],
 ["works/ambertime/partial-bottling.mjs","49b66d4b40ecf3daa467143832374eb5833f9c77ce3925ac25d028f3433ec17e",[]],
 ["works/ambertime/partner-orders.mjs","ea8f40410bacebcfb8a1c16ec921af095511de6db3732ee3d6f4cf2e9e32346b",[["import","./market-sales.mjs?v=market-rules-r1","works/ambertime/market-sales.mjs"],["import","./lab-flavor.mjs?v=stage4-r2","works/ambertime/lab-flavor.mjs"],["import","./town-connection.mjs?v=stage4-r2","works/ambertime/town-connection.mjs"],["import","./brand-identity.mjs?v=0.58-first-brand","works/ambertime/brand-identity.mjs"],["export","./brand-identity.mjs?v=0.58-first-brand","works/ambertime/brand-identity.mjs"],["import","./placement-mode.mjs?v=store-market-main-r1","works/ambertime/placement-mode.mjs"],["export","./placement-mode.mjs?v=store-market-main-r1","works/ambertime/placement-mode.mjs"],["import","./store-market.mjs?v=market-rules-r1","works/ambertime/store-market.mjs"],["export","./store-market.mjs?v=market-rules-r1","works/ambertime/store-market.mjs"],["import","./shop-demand.mjs?v=adjust-b-r1","works/ambertime/shop-demand.mjs"],["import","./partial-bottling.mjs?v=0.41-delegation","works/ambertime/partial-bottling.mjs"],["export","./partial-bottling.mjs?v=0.41-delegation","works/ambertime/partial-bottling.mjs"],["import","./distiller.mjs?v=0.41-delegation","works/ambertime/distiller.mjs"],["export","./distiller.mjs?v=0.41-delegation","works/ambertime/distiller.mjs"],["import","./recipe-book.mjs?v=0.41-delegation","works/ambertime/recipe-book.mjs"],["export","./recipe-book.mjs?v=0.41-delegation","works/ambertime/recipe-book.mjs"],["import","./generations.mjs?v=0.41-delegation","works/ambertime/generations.mjs"],["export","./generations.mjs?v=0.41-delegation","works/ambertime/generations.mjs"],["import","./bottle-storage.mjs?v=0.41-delegation","works/ambertime/bottle-storage.mjs"],["export","./bottle-storage.mjs?v=0.41-delegation","works/ambertime/bottle-storage.mjs"],["import","./trade.mjs?v=adjust-b-r1","works/ambertime/trade.mjs"],["import","./economy.mjs?v=market-rules-r1","works/ambertime/economy.mjs"],["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./character.mjs?v=stage4-r2","works/ambertime/character.mjs"],["import","./economy-parameters.mjs","works/ambertime/economy-parameters.mjs"],["import","./wholesale-parameters.mjs","works/ambertime/wholesale-parameters.mjs"],["import","./partner-parameters.mjs","works/ambertime/partner-parameters.mjs"],["import","./aroma-extraction.mjs?v=stage4-r2","works/ambertime/aroma-extraction.mjs"],["import","./shop-model.mjs?v=0.41-delegation","works/ambertime/shop-model.mjs"],["export","./shop-model.mjs?v=0.41-delegation","works/ambertime/shop-model.mjs"],["import","./department-projects.mjs?v=0.44-monthly-timing","works/ambertime/department-projects.mjs"],["export","./department-projects.mjs?v=0.44-monthly-timing","works/ambertime/department-projects.mjs"],["import","./brand-reputation.mjs?v=0.12","works/ambertime/brand-reputation.mjs"],["export","./partner-parameters.mjs","works/ambertime/partner-parameters.mjs"],["export","./economy.mjs?v=market-rules-r1","works/ambertime/economy.mjs"]]],
 ["works/ambertime/partner-parameters.mjs","57da9dba103d6560bb25c4dc76e596b3cc295f1f5bb9ecec48af51e253184838",[["import","./trade-parameters.mjs","works/ambertime/trade-parameters.mjs"]]],
 ["works/ambertime/partners.css","a75bacdc23972208a4c10485db738d7f59ebcda72e3cd32122df63c3004450b0",[["style-import","./v09.css?v=0.9","works/ambertime/v09.css"]]],
 ["works/ambertime/pixel-symbols.mjs","8f98e551d454f9509f823b7ac4ceb85a1815173a64fee42d66a882e04230d067",[]],
 ["works/ambertime/placement-draft.mjs","230be3d19d6762cc37d2a1c2e2979bcf1713b733d28a3a0dd4873be46b86a2e2",[]],
 ["works/ambertime/placement-mode.mjs","12fd5824bfff03f300fb1ebd669b31541f00e8825f8fcae9425fc9face858053",[]],
 ["works/ambertime/placement-save.mjs","54f112df474b628bbb1e78d688ebcb9b2410a2e812deb6d7fb75fa4fa5b2039e",[]],
 ["works/ambertime/placement-ui.mjs","00860cb5c3740b2e2e6a5fada11174496662113b731831e880d6a61fe5d3ad4f",[["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./placement-draft.mjs?v=0.27-placement","works/ambertime/placement-draft.mjs"]]],
 ["works/ambertime/player-news.mjs","8647a27eacf7425199cf2526f43c541f9481f514a3ba994cf8de02443a5d7641",[["import","./town-connection.mjs?v=stage4-r2","works/ambertime/town-connection.mjs"]]],
 ["works/ambertime/recipe-book.mjs","b7a8b880ade24fb92c528c72e059648d37b7029bcc0259b842c789ba3717c2ad",[["import","./distiller.mjs?v=0.41-delegation","works/ambertime/distiller.mjs"]]],
 ["works/ambertime/retail-sale-motion.mjs","bf365ddd6b65174971170dcf4e8f3e4e7f8b6bedfe5d2dd106218dbed901b284",[]],
 ["works/ambertime/room-motion.mjs","47c92e15bf515338f06182501e1b5f2e4ffa626a8f13c0196e9ffc7e58c44145",[]],
 ["works/ambertime/room-object-art.mjs","50d35a7dd69021e12f8a6cd07d31291ebdbd8a87f840c820a03e23a6190fc599",[["import","./codea-object-art.mjs?v=0.62-bottle-shelf-wall","works/ambertime/codea-object-art.mjs"],["import","./brand-identity.mjs?v=0.58-first-brand","works/ambertime/brand-identity.mjs"]]],
 ["works/ambertime/room-scene.css","dd35a4f015bb59adac05b583047ae7d8bd61e8bb8900e92520e4d7635093d58e",[["asset","./fonts/misaki_gothic_2nd.ttf","works/ambertime/fonts/misaki_gothic_2nd.ttf"]]],
 ["works/ambertime/runtime-clock.mjs","c5e3c7ed4ad6f4ec723cc157681c15ec1b7907cc21d5ce8141ac1314aff67550",[]],
 ["works/ambertime/scene-input.mjs","5a69a69f1359a85ffcea7bdab6f018965eedf9b9e9fe79aef310b032b51702ac",[]],
 ["works/ambertime/shop-app.mjs","e5f3bef85f435d87aba0ceeda6152ec81556567bfb7f3d9dc3fb759687a5bb22",[["import","./staff-status-view.mjs?v=status-reactions-r1","works/ambertime/staff-status-view.mjs"],["import","./distill-learning.mjs?v=game-guide-r1","works/ambertime/distill-learning.mjs"],["import","./distill-tool-input.mjs?v=lever-glass-r1","works/ambertime/distill-tool-input.mjs"],["import","./distill-tools-view.mjs?v=rooms-stage2-r1","works/ambertime/distill-tools-view.mjs"],["import","./flavor-color.mjs?v=cut-pixel-r1","works/ambertime/flavor-color.mjs"],["import","./message-view.mjs?v=visual14-r1","works/ambertime/message-view.mjs"],["import","./placement-save.mjs?v=formal-copy-r1","works/ambertime/placement-save.mjs"],["import","./market-ui.mjs?v=compact-three-r1&fields=count-linked-r1&rooms=stage2-r1","works/ambertime/market-ui.mjs"],["import","./placement-ui.mjs?v=visual14-r1","works/ambertime/placement-ui.mjs"],["import","./pixel-symbols.mjs?v=rooms-stage2-r1","works/ambertime/pixel-symbols.mjs"],["import","./flavor-feedback-view.mjs?v=0.25.4&rooms=stage3-r1&status=1&aging=1","works/ambertime/flavor-feedback-view.mjs"],["import","./shop-order-view.mjs?v=formal-copy-r1","works/ambertime/shop-order-view.mjs"],["import","./runtime-clock.mjs?v=0.25.1","works/ambertime/runtime-clock.mjs"],["import","./cask-detail-view.mjs?v=formal-copy-r1&rooms=stage3-r1&aging=1","works/ambertime/cask-detail-view.mjs"],["import","./start-countdown.mjs?v=native-timer-r2","works/ambertime/start-countdown.mjs"],["import","./world-map-view.mjs?v=0.28.0-map","works/ambertime/world-map-view.mjs"],["import","./map-sales-view.mjs?v=map-stage2-r1","works/ambertime/map-sales-view.mjs"],["import","./map-daily-view.mjs?v=map-stage2-r1","works/ambertime/map-daily-view.mjs"],["import","./brewing-cards.mjs?v=confirmed-brewing-r1","works/ambertime/brewing-cards.mjs"],["import","./player-news.mjs?v=0.25.4","works/ambertime/player-news.mjs"],["import","./lab-flavor.mjs?v=stage4-r2","works/ambertime/lab-flavor.mjs"],["import","./shop-ledger.mjs?v=0.68-ui-refinements","works/ambertime/shop-ledger.mjs"],["import","./ledger-view.mjs?v=0.63-ledger","works/ambertime/ledger-view.mjs"],["import","./brand-identity.mjs?v=0.58-first-brand","works/ambertime/brand-identity.mjs"],["import","./ui-details.mjs?v=stage4-r2","works/ambertime/ui-details.mjs"],["import","./shop-remarks.mjs?v=0.51-shop-remarks","works/ambertime/shop-remarks.mjs"],["import","./event-notices.mjs?v=uniform-messages-r1","works/ambertime/event-notices.mjs"],["import","./canvas-scene.mjs?tools=rooms-stage3-r1&touch=1&status=1&v=market-rules-r1&daily=1&aging=1","works/ambertime/canvas-scene.mjs"],["import","./partner-orders.mjs?v=market-rules-r1&touch=1","works/ambertime/partner-orders.mjs"],["import","./shop-model.mjs?v=0.48-free-aging","works/ambertime/shop-model.mjs"],["import","./work-context.mjs?v=0.38-cask-serials","works/ambertime/work-context.mjs"],["import","./cask-serials.mjs?v=market-rules-r1","works/ambertime/cask-serials.mjs"],["import","./spirit-view.mjs?v=distill-ui-r1","works/ambertime/spirit-view.mjs"],["import","./brand-reputation.mjs?v=0.15","works/ambertime/brand-reputation.mjs"],["import","./economy-parameters.mjs?v=0.7","works/ambertime/economy-parameters.mjs"],["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./cask-glass-art.mjs?v=0.58-first-brand","works/ambertime/cask-glass-art.mjs"],["import","./room-object-art.mjs?v=0.62-bottle-shelf-wall","works/ambertime/room-object-art.mjs"],["import","./tasting-view.mjs?v=stage4-r2","works/ambertime/tasting-view.mjs"],["import","./flavor-types.mjs?v=stage4-r2","works/ambertime/flavor-types.mjs"],["import","./flavor-view.mjs?v=formal-copy-r1","works/ambertime/flavor-view.mjs"],["import","./nearby-comparison.mjs?v=market-rules-r1","works/ambertime/nearby-comparison.mjs"],["import","./ui-text.mjs?v=stage4-r2&rooms=stage3-r1&aging=1","works/ambertime/ui-text.mjs"],["worker","./history-worker.mjs?v=market-rules-r1","works/ambertime/history-worker.mjs"],["worker","./cask-ledger-worker.mjs?v=market-rules-r1","works/ambertime/cask-ledger-worker.mjs"]]],
 ["works/ambertime/shop-demand.mjs","1dcfd4be23018e554bc84cf8015bd51014690f2f03d381d3b92a62297f9e1893",[["import","./shop-model.mjs?v=0.41-delegation","works/ambertime/shop-model.mjs"],["import","./economy.mjs?v=adjust-b-r1","works/ambertime/economy.mjs"],["import","./economy-parameters.mjs","works/ambertime/economy-parameters.mjs"]]],
 ["works/ambertime/shop-ledger.mjs","114af25675b026322ad57bdf6c4829099255cf8b42a60a5f4ad2fb475c826c55",[["import","./shop-model.mjs?v=0.48-free-aging","works/ambertime/shop-model.mjs"]]],
 ["works/ambertime/shop-model.mjs","d7bf2e9939a7b4cde41b5e99a44e55a0d39eee077e7eaec47016d51f36caa508",[["import","./bottle-storage.mjs?v=0.41-delegation","works/ambertime/bottle-storage.mjs"],["import","./department-projects.mjs?v=0.41-delegation","works/ambertime/department-projects.mjs"]]],
 ["works/ambertime/shop-order-view.mjs","31e19f1291a55b9035b96648e8d3e70cd5926873c38e92b81065a56456a91bf2",[]],
 ["works/ambertime/shop-remarks.mjs","caa0a417e7247b361c8c54e9cac490a86a2e8820580f08769f9331e7dc7db546",[]],
 ["works/ambertime/shop.css","d3866b0dbb8ee6b2ec43fff81a9db27b85449503ea3884066aa36f1b1b82df63",[["style-import","./usual.css?v=0.13-spirit-1","works/ambertime/usual.css"]]],
 ["works/ambertime/spirit-view.mjs","eed4f76532dbfd81b16fedce2fa84b2b3aa3ee78f7250235a9bc1bea8e2ac750",[["import","./lab-flavor.mjs?v=stage4-r2","works/ambertime/lab-flavor.mjs"],["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./aroma-extraction.mjs?v=stage4-r2","works/ambertime/aroma-extraction.mjs"],["import","./economy-parameters.mjs","works/ambertime/economy-parameters.mjs"]]],
 ["works/ambertime/staff-status-view.mjs","11e15bd640bed63dbea75626031041dfbb7cd1ef2b2b640bb83bf2979635c4df",[]],
 ["works/ambertime/start-countdown.mjs","d5ce4d0b9d0a939c956d9e0a58275ac1b6a3c6b5c6c4407b921eb8c1dca19ff0",[]],
 ["works/ambertime/store-market.mjs","8d269216c67d04d5b8c640fba30b51a5484684506d6c5286f9ba81936445bee9",[["import","./market-sales.mjs?v=market-rules-r1","works/ambertime/market-sales.mjs"],["import","./placement-mode.mjs?v=store-market-main-r1","works/ambertime/placement-mode.mjs"],["import","./shop-model.mjs?v=0.41-delegation","works/ambertime/shop-model.mjs"],["import","./shop-demand.mjs?v=adjust-b-r1","works/ambertime/shop-demand.mjs"],["import","./town-connection.mjs?v=stage4-r2","works/ambertime/town-connection.mjs"]]],
 ["works/ambertime/tasting-view.mjs","1a6c93eeec591333d7e9cea594d9dabada000d98a61793c88f247f607037b161",[["import","./character.mjs?v=stage4-r2","works/ambertime/character.mjs"]]],
 ["works/ambertime/text-metrics.mjs","d28a55999d034ce223a7624f1e67a902bc37c1ce10168590b72a8082ef16d608",[]],
 ["works/ambertime/town-connection.mjs","4d53bbe12f4573f45f8a1f3cfee04336612b06c581ccda0ad0e87a777bf12051",[["import","./experiments/town-simulation/v01/model.mjs?v=stage4-r2","works/ambertime/experiments/town-simulation/v01/model.mjs"]]],
 ["works/ambertime/trade-parameters.mjs","f21fbc530d05c6c7e76eac5ec2bb73eff7e4de71ea117f3eb789cb0b0fdb766c",[]],
 ["works/ambertime/trade.mjs","158e63767bcde24b134dcf21a44c7ec8961e73edbbe0d791d2a62f333648b1c5",[["import","./wholesale.mjs?v=adjust-b-r1","works/ambertime/wholesale.mjs"],["import","./economy.mjs?v=adjust-b-r1","works/ambertime/economy.mjs"],["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./character.mjs?v=stage4-r2","works/ambertime/character.mjs"],["import","./economy-parameters.mjs","works/ambertime/economy-parameters.mjs"],["import","./wholesale-parameters.mjs","works/ambertime/wholesale-parameters.mjs"],["import","./trade-parameters.mjs","works/ambertime/trade-parameters.mjs"],["export","./economy.mjs?v=adjust-b-r1","works/ambertime/economy.mjs"]]],
 ["works/ambertime/ui-details.mjs","f65d371b6711c016778ee01596ef17d2a8a8c3b6b7f20697efa608b885433e33",[["import","./economy-parameters.mjs","works/ambertime/economy-parameters.mjs"],["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"]]],
 ["works/ambertime/ui-text.mjs","4bd4401a42d24f832e6ed43c0a6c4bfd1f9b6a97d4360a98693b5700229078b9",[["import","./character.mjs?v=stage4-r2","works/ambertime/character.mjs"]]],
 ["works/ambertime/usual.css","b6f58e6e16228ac9362ce0c417ebc800d73e31911f1ffaeab17560ba62c5d5b9",[["style-import","./brands.css?v=0.11","works/ambertime/brands.css"]]],
 ["works/ambertime/v07.css","f974f998ee2aaba8e27e144a63b07b57fd32697015a6dd0af66f35601a7272c1",[["style-import","./parallel.css?v=0.6-playability","works/ambertime/parallel.css"]]],
 ["works/ambertime/v08.css","0820e32a1776666e43e74c3dc2757715f698cf3258d2711bc19633d7e6d39db8",[["style-import","./v07.css?v=0.7","works/ambertime/v07.css"]]],
 ["works/ambertime/v09.css","2d2a69e80856d5b7a85be345e00320f783670126b28d0bdf3c4d52aa9020e6a2",[["style-import","./v08.css?v=0.8","works/ambertime/v08.css"]]],
 ["works/ambertime/wholesale-parameters.mjs","4177e6dcdc6c50653b3807a44bb999d2eaa0276de3dcb6a5c5bd9d307af2ccd1",[]],
 ["works/ambertime/wholesale-v08.mjs","ccb886cdec4ff8b23cbe304907f0ca3c1403f94e45bdd71388d014ec3e816478",[["import","./economy.mjs?v=adjust-b-r1","works/ambertime/economy.mjs"],["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./character.mjs?v=stage4-r2","works/ambertime/character.mjs"],["import","./economy-parameters.mjs","works/ambertime/economy-parameters.mjs"],["import","./wholesale-parameters.mjs","works/ambertime/wholesale-parameters.mjs"],["export","./economy.mjs?v=adjust-b-r1","works/ambertime/economy.mjs"]]],
 ["works/ambertime/wholesale.mjs","e4e11ca467f63c944a3dc41182f0b4326fac66ac4bded534986b9ca44f5f7609",[["import","./wholesale-v08.mjs?v=adjust-b-r1","works/ambertime/wholesale-v08.mjs"],["import","./economy.mjs?v=adjust-b-r1","works/ambertime/economy.mjs"],["import","./model.mjs?v=stage4-r2","works/ambertime/model.mjs"],["import","./character.mjs?v=stage4-r2","works/ambertime/character.mjs"],["import","./economy-parameters.mjs","works/ambertime/economy-parameters.mjs"],["import","./wholesale-parameters.mjs","works/ambertime/wholesale-parameters.mjs"],["export","./economy.mjs?v=adjust-b-r1","works/ambertime/economy.mjs"]]],
 ["works/ambertime/work-context.mjs","e4b6b4e9c9dae767e1b1f22bde8b77573f47f499bd7182ebcb53ed8d05d4de84",[]],
 ["works/ambertime/world-map-view.mjs","2060e8be29ee2bdae9e8987a66d54f5b7e99f551a5d5789b0510d080b770f283",[["import","./experiments/world-map/v01/map.mjs","works/ambertime/experiments/world-map/v01/map.mjs"],["import","./town-connection.mjs?v=stage4-r2","works/ambertime/town-connection.mjs"]]]
];
export function baselineGraph(){return {entry:'works/ambertime/index.html',nodes:new Map(anchor.map(([path,digest,edges])=>[path,{hash:digest,edges:edges.map(([kind,spec,target])=>({kind,spec,target}))}]))};}
