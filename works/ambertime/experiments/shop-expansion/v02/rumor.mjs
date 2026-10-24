// Counterfactual inputs belong only to v02; original Town functions stay untouched.
import * as T from '../../town-simulation/v01/model.mjs';
import {unit} from '../../reputation/v03/model.mjs';
import {GUEST_PROFILES} from '../../reputation/v05/model.mjs';
export const RUMORS=[{id:'native',name:'実納品ごとの機会（現行）'},{id:'pooled',name:'同月の共通予算'},{id:'contact',name:'四半期の接点・相性・継続'}];
const node=id=>T.NODES.find(n=>n.id===id),draw=(s,key)=>unit(s.seed,'relationship-v02:'+key);
export function createReaction(seed){return {town:T.createExternal({seed}),seed,contact:[],exposures:[]};}
function choose(rows,value,weight=x=>x.count){let total=rows.reduce((n,r)=>n+weight(r),0),v=value*total;for(const r of rows){v-=weight(r);if(v<0)return r;}return rows.at(-1);}
function budget(r,rows,period,kind){
 if(!rows.length)return;
 const total=rows.reduce((n,x)=>n+x.count,0),base=kind==='pooled'?1-Math.exp(-total/4):1,groups=new Map();
 for(const x of rows){const key=x.to+':'+x.releaseId;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x);}
 let denominator=total;
 const groupRows=[...groups.values()].map(parts=>{const first=parts[0],count=parts.reduce((n,p)=>n+p.count,0),product=r.town.releases[first.releaseId-1].product,fit=T.affinity(node(first.to),product,true).fit,root=r.town.nodes[first.to].root;return {...first,count,parts,fit,root,weight:kind==='pooled'?count:(.25+.75*fit)*(.5+.5*root)};});
 // Contact weights are per store+release, bounded by one equal share per store.
 // Aggregate several releases at a store before distributing its share.
 if(kind==='contact'){const perStore=new Map();for(const g of groupRows)perStore.set(g.to,(perStore.get(g.to)??0)+g.count);for(const g of groupRows)g.weight*=g.count/perStore.get(g.to);denominator=groupRows.reduce((n,g)=>n+g.weight,0);}
 for(const g of groupRows){const strength=base*(kind==='pooled'?g.count:g.weight)/denominator;
  r.town.packets.push({sourceId:g.eventId,releaseId:g.releaseId,to:g.to,from:'distillery',due:r.town.month+1,strength,path:[g.to],cohort:kind+':'+period+':release:'+g.releaseId,channel:'direct',hops:0});
  r.exposures.push({month:r.town.month,period,kind,to:g.to,releaseId:g.releaseId,sourceIds:g.parts.map(p=>p.eventId),count:g.count,strength,fit:g.fit,root:g.root});
 }
 const picked=choose(groupRows,draw(r,kind+':'+period+':actor'),g=>kind==='pooled'?g.count:GUEST_PROFILES[node(g.to).role].rate*g.weight),source=picked.parts[0];
 // Contact: compatibility/continuity may reduce the existing role-rate opportunity.
 // No drinking customer or sale is asserted; these remain hypothetical Town introductions.
 const gate=kind==='pooled'||draw(r,kind+':'+period+':engagement')<(.5+.5*picked.fit)*(.5+.5*picked.root);
 if(gate)r.town.pending.push({kind:'encounter',due:r.town.month+1+Math.floor(unit(r.seed,'town-v01:'+kind+':'+period+':lag')*6),sourceId:source.eventId,releaseId:picked.releaseId,to:picked.to,shipmentId:kind+':'+period,count:total,receivedMonth:r.town.month});
}
export function receiveBatch(r,receipts,kind){
 const facts=[];
 for(const x of receipts){const packets=r.town.packets.length,pending=r.town.pending.length;T.receiveExternal(r.town,{receiptId:x.id,releaseId:x.releaseId,to:x.to,count:x.count});
  const d=r.town.shipments.at(-1);facts.push({...x,eventId:d.parts[0].eventId});
  if(kind!=='native'){r.town.packets.splice(packets);r.town.pending.splice(pending);}
 }
 if(kind==='pooled')budget(r,facts,r.town.month,kind);
 else if(kind==='contact')r.contact.push(...facts);
 else for(const x of facts)r.exposures.push({month:r.town.month,kind,to:x.to,releaseId:x.releaseId,count:x.count,strength:1-Math.exp(-x.count/4),sourceIds:[x.eventId]});
}
export function finishMonth(r,kind){if(kind==='contact'&&r.town.month%3===0){budget(r,r.contact,Math.floor(r.town.month/3),kind);r.contact=[];}}
export function advanceReaction(r,month){T.advanceExternal(r.town,month);}
export const register=(r,args)=>T.registerExternalRelease(r.town,args);
