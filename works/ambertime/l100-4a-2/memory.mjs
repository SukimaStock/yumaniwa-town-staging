// Separate fresh-process measurements. GC checkpoints are not synchronous peaks.
import fs from 'node:fs';import {ArrivalView,install,hydrate} from './accessor.mjs';import {expandFormalGame,compactFormalGame} from '../save-codec.mjs';import {advanceTown} from '../town-connection.mjs';
const [file,mode]=process.argv.slice(2),samples=[];
function mark(phase,ms=null){global.gc?.();samples.push({phase,ms,...process.memoryUsage(),processLifetimeMaxRSSKiB:process.resourceUsage().maxRSS});}
let raw=fs.readFileSync(file,'utf8'),wire=JSON.parse(raw).game;mark('input');let t=performance.now(),formal=expandFormalGame(wire),game=JSON.parse(formal);mark('decodeExpandParse',performance.now()-t);raw=null;wire=null;formal=null;mark('onlyGame');
t=performance.now();if(mode!=='A')install(game,mode);mark('construct',performance.now()-t);
t=performance.now();advanceTown(game.labConnection.town,game.labConnection.town.month+1);mark('townMonth',performance.now()-t);
t=performance.now();let clone=structuredClone(game);mark('nativeClone',performance.now()-t);const nativeCloneCompatible=Array.isArray(clone.labConnection.town.arrivals);clone=null;mark('cloneReleased');
t=performance.now();let expanded=mode==='A'?game:hydrate(game),saved=compactFormalGame(JSON.stringify(expanded));mark('explicitHydrateAndWireSave',performance.now()-t);let decoded=expandFormalGame(saved);mark('expandedAgain');
console.log(JSON.stringify({mode,file,node:process.version,samples,nativeCloneCompatible,index:mode==='A'?null:game.labConnection.town.arrivals.stats(),formalUnits:decoded.length,compactGameUnits:JSON.stringify(saved).length,warning:'GC retained samples and lifetime MaxRSS, NOT per-phase peak; parse still expands baseline. Native B/C clone loses view; no compact formal reload.'}));
