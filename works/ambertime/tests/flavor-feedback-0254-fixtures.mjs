// Independent legal fixture generation using unchanged public game APIs.
import * as D from '../partner-orders.mjs';
export function warehouseFixtures(){
 const tick=(s,n)=>{for(let i=0;i<n;i++){const m=s.core.month;s=D.tickDistillery(s);if(s.core.month!==m+1)throw Error('fixture month blocked '+m);}return s;};
 let s=D.selectFlavorCards(D.newConnectedDistillery(42),{malt:'plain',ferment:'long'});s=D.startRangeDistillation(s);while(s.still.distillation.progress<12)s=D.distillStep(s);s=D.beginCollection(s);while(s.still.distillation.progress<40)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),'bourbon');
 const id=s.core.casks[0].id,initial=D.serializeDistillery(s),fresh=tick(s,6),expired=tick(fresh,3),sampled=D.endTasting(D.sampleDistillery(fresh,id));
 const named=tick(s,59),next=tick(s,41);
 return {initial,fresh:D.serializeDistillery(fresh),expired:D.serializeDistillery(expired),sampled:D.serializeDistillery(sampled),named:D.serializeDistillery(named),next:D.serializeDistillery(next),id};
}
