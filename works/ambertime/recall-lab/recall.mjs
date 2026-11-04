// A projection over the published H0/H1-B fixtures. No save restore or replay.
const profiles = {
  local: {shopId:'town-liquor'},
  wide: {shopId:'supermarket', reputation:'reputation:earliest'},
  mixed: {shopId:'town-liquor', reputation:'reputation:linked'},
};

const eventsOf = relation => relation ? [relation.start,...relation.bridge,relation.end] : [];
const sameOperation = (event, other) =>
  event.month === other.month && event.operationIndex === other.operationIndex;

function visibleAt(event, cutoff) {
  if (!Number.isInteger(event?.month) || event.month > cutoff.month) return false;
  if (cutoff.operationIndex === null) return true;
  if (!Number.isInteger(event.operationIndex)) return event.month < cutoff.month;
  return event.operationIndex <= cutoff.operationIndex;
}

export function buildRecall(recordId, horizon, h0Analysis, connectionsRecord) {
  const profile = Object.hasOwn(profiles,recordId) ? profiles[recordId] : null;
  if (!profile || !['handover','anniversary','30-years'].includes(horizon)) {
    return {cutoff:null,frames:[]};
  }
  const relations = connectionsRecord?.connections ?? [];
  const shop = relations.find(relation => relation.kind === 'shop' && relation.entity.id === profile.shopId);
  const shopEvents = eventsOf(shop);
  const h0Handover = h0Analysis?.timeline?.find(event => event.kind === 'handover' &&
    Number.isInteger(event.operationIndex));
  const h1Handover = shopEvents.find(event => event.kind === 'handover' && h0Handover &&
    sameOperation(event,h0Handover) && event.generationId === h0Handover.generationId &&
    event.ids.toGeneration === h0Handover.links.nextGenerationId);

  const cutoff = horizon === 'handover'
    ? h0Handover && {month:h0Handover.month,operationIndex:h0Handover.operationIndex}
    : Number.isInteger(h0Analysis?.elapsedMonths) && {month:h0Analysis.elapsedMonths,operationIndex:null};
  if (!cutoff) return {cutoff:null,frames:[]};

  const available = shopEvents.filter(event => visibleAt(event,cutoff));
  const start = available.find(event => event.kind === 'shop-start' && event.ids.shopId === profile.shopId);
  const deliveries = available.filter(event => event.kind === 'delivery' && event.ids.shopId === profile.shopId);
  const shopSummary = h0Analysis.shops?.find(entry => entry.id === profile.shopId);
  const first = deliveries.find(event => event.month === shopSummary?.firstMonth &&
    event.ids.receiptId === shopSummary?.receiptIds?.[0]);
  const later = h1Handover && deliveries.findLast(event => event !== first &&
    event.generationId === h1Handover.ids.toGeneration &&
    event.operationIndex > h1Handover.operationIndex);

  // Show reputation as a separate scene. The two stories have no asserted causal link.
  const reputation = relations.find(relation => relation.id === profile.reputation);
  const arrival = reputation?.start?.kind === 'arrival' && visibleAt(reputation.start,cutoff)
    ? reputation.start : null;

  const frames = [];
  function add(event, relation, reason, reference) {
    if (!event || !visibleAt(event,cutoff)) return;
    const delivery = event.kind === 'delivery';
    const brand = delivery && relations.find(item => item.kind === 'brand' &&
      item.entity.id === event.ids.brandId &&
      item.start.month <= event.month && item.start.operationIndex <= event.operationIndex);
    const evidence = {
      relationId:relation.id, operationIndex:event.operationIndex, operationKey:event.operationKey,
      ...reference,
    };
    frames.push({
      ...event,
      id:`${relation.id}/${event.kind}/${event.operationIndex}`,
      ids:{...event.ids},
      reason,
      evidence,
      coverage:{...relation.coverage},
      scene:{
        kind:relation.kind,
        entity:{...relation.entity},
        ...(brand ? {bottle:{...brand.entity}} : {}),
      },
    });
  }

  if (!arrival || !first || !later) add(start,shop,'店舗の最初の取引を確認できる場面。');
  add(first,shop,'同じ店舗への最初の納品。',{receiptId:first?.ids.receiptId});
  add(arrival,reputation,'町の外へ口コミが届いた記録。',{townEventId:arrival?.ids.townEventId});
  add(h1Handover,shop,'引き継ぎを記録した操作。',{historyEventId:h0Handover?.id, inheritedCaskIds:[...(h0Handover?.links.caskIds ?? [])]});
  add(later,shop,'後継世代の同じ店舗への納品。',{receiptId:later?.ids.receiptId});

  frames.sort((a,b) => a.month - b.month || a.operationIndex - b.operationIndex);
  return {cutoff,frames};
}
