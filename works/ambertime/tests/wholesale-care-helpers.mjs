import fs from 'node:fs';
import * as D from '../partner-orders.mjs';
export const round=n=>Math.round(n*100)/100||0;
export const loadFixture=name=>D.restoreDistillery(fs.readFileSync(new URL('./fixtures/'+name,import.meta.url),'utf8'));
export function resolveOrdinary(s){let guard=0;while(s.decisions.length){if(++guard>20)throw Error('Decision loop');const d=s.decisions[0],option=d.pending.options.find(o=>o.id==='wait')??d.pending.options.find(o=>o.id==='last');if(!option)throw Error('Explicit recovery required: '+d.eventId);s=D.chooseDistillery(s,d.caskId,option.id);}return s;}
export function fill(s,{type='bourbon',progress=99,book=true}={}){s=resolveOrdinary(s);if(s.trade.offer)s=D.declineOffer(s);s=D.startDistillation(s);while(s.still.distillation.progress<progress)s=D.distillStep(s);s=D.fillBarrel(D.stopDistillation(s),type);const id=s.core.casks.at(-1).id;if(book)s=D.assignCask(s,id,s.trade.relationship.terms[0].id);return s;}
export function oldRoughPending(){let s=fill(loadFixture('partners-accepted.json'));const id=s.core.casks.at(-1).id;for(let i=0;i<6;i++){s=resolveOrdinary(s);if(s.trade.offer)s=D.declineOffer(s);s=D.tickDistillery(s);}return {s,id};}
export function fourCasks({unbooked=false}={}){let s=D.enablePromisedCare(loadFixture('partners-accepted.json'));s=fill(s);s=D.tickDistillery(s);s=fill(s,{book:!unbooked});return s;}
export function exact(s){const text=D.serializeDistillery(s);const restored=D.restoreDistillery(text);if(JSON.stringify(restored)!==text)throw Error('Strict replay mismatch');return restored;}
export function cashIdentity(s){return round(s.core.cash-(1600+s.core.totals.revenue-s.core.totals.costs-s.core.totals.upkeep));}
