import {replayDistilleryOperations} from '../partner-orders.mjs?v=market-rules-r1';
import {createGenerationSummary} from '../generation-summary.mjs?v=market-rules-r1';
import {buildShopLedger} from '../shop-ledger.mjs';
import {NODES} from '../town-connection.mjs?v=stage4-r2';
import {monthLabel} from '../model.mjs';

const places = new Map(NODES.map(node => [node.id, node]));
const difference = (after = [], before = [], key = 'id') => {
  const known = new Set(before.map(row => row[key]));
  return after.filter(row => !known.has(row[key]));
};
const shopName = id => ({'town-liquor':'町の酒店', supermarket:'町のスーパー', department:'町のデパート'})[id] ?? id;
const total = (rows, field) => rows.reduce((sum, row) => sum + row[field], 0);
const time = (a,b) => a.month - b.month || (a.operationIndex ?? -1) - (b.operationIndex ?? -1);
const ageLabel = age => age >= 12 ? `${Math.floor(age / 12)}年${age % 12 ? age % 12 + 'か月' : ''}` : `${age}か月`;

export function analyzeHistory(state) {
  const coverage = {complete: !state.origin, fromMonth: state.origin?.core.month ?? 0};
  const collector = createGenerationSummary(state);
  const events = new Map();
  const receipts = new Map();
  const months = new Map();
  const releases = new Map();
  const fills = new Set();
  const handovers = [];
  const brandName = id => state.brands?.find(brand => brand.id === id)?.name;
  function add(kind, key, month, generationId, links, evidence, fact, operationIndex = null) {
    const id = `${kind}:${key}`;
    if (events.has(id) || !Number.isInteger(month) || month < 0) return;
    events.set(id, {id, kind, month, generationId, links, evidence, fact, operationIndex,
      completeness: operationIndex === null ? 'retained-record' : 'replayed'});
  }
  function addRelease(row, generationId, index) {
    if (releases.has(row.productId)) return;
    releases.set(row.productId, {...row, generationId});
    const name = brandName(row.brandId) ?? '原酒';
    add('bottling', row.productId, row.bottledMonth, generationId,
      {brandId: row.brandId ?? null, productId: row.productId, releaseId: row.id ?? null, caskId: row.caskId ?? null},
      {record: row.id == null ? 'records' : 'releases', age: row.age, bottles: row.bottles},
      `${name}を${row.bottles}本瓶詰め。熟成${ageLabel(row.age)}。`, index);
  }
  function addReceipt(row, generationId, index) {
    if (receipts.has(row.id)) return;
    const shopId = row.shopId ?? 'town-liquor';
    receipts.set(row.id, {...row, shopId, generationId});
    add('delivery', row.id, row.month, generationId, {shopId, brandId: row.brandId,
      releaseId: row.releaseId ?? null, productId: row.productId},
      {record:'shop.deliveries', receiptId:row.id, bottles:row.count},
      `${shopName(shopId)}に${row.count}本納品。`, index);
  }
  function townFacts(game, generationId, index, previous) {
    const town = game.labConnection?.town;
    if (!town) return;
    townFromMonth ??= game.core.month;
    const arrivals = town.arrivals.slice(previous?.arrivals.length ?? 0);
    const inquiries = town.events.slice(previous?.events.length ?? 0);
    for (const event of [...arrivals, ...inquiries]) {
      const place = places.get(event.to);
      if (!place) continue;
      const kind = event.type === 'arrival' && event.channel !== 'direct' ? 'rumor' : event.type === 'inquiry' ? 'inquiry' : null;
      if (!kind || (kind === 'rumor' && !arrivals.includes(event))) continue;
      const releaseId = event.mainReleaseId ?? town.releases.find(row => row.id === event.releaseId)?.externalId ?? null;
      const release = game.releases?.find(row => row.id === releaseId);
      add(kind,event.id,event.month,generationId,{regionId:place.id,releaseId,brandId:release?.brandId ?? null},
        {record:kind === 'rumor' ? 'town.arrivals' : 'town.events', townEventId:event.id, level:place.level, channel:event.channel ?? null},
        kind === 'rumor' ? `${place.name}に口コミが届いた。` : `${place.name}から問い合わせが届いた。`,index);
    }
  }
  function addRelation(relation, generationId, index) {
    const shopId = relation.shopId ?? 'town-liquor';
    if (shopId === 'department') return; // Consultation precedes actual adoption.
    add('shop-start', `${shopId}:${relation.brandId}`, relation.startedMonth, generationId,
      {shopId,brandId:relation.brandId},{record:'shop.relations'},`${shopName(shopId)}と取引を始めた。`,index);
  }
  let soldBeforeCoverage = 0;
  let townFromMonth = null;
  replayDistilleryOperations(state, observation => {
    collector.observe(observation);
    const {index, operation, before, after} = observation;
    if (!operation) {
      soldBeforeCoverage = after.core.totals.bottlesSold;
      for (const row of after.releases ?? []) addRelease(row,null,null);
      for (const row of after.records ?? []) addRelease(row,null,null);
      for (const row of after.shop?.deliveries ?? []) addReceipt(row,null,null);
      for (const row of after.shop?.relations ?? []) addRelation(row,null,null);
      townFacts(after,null,null);
      return;
    }
    const generationId = before.generations?.active?.id ?? null;
    const month = after.core.month;
    if (operation.key === 'stop' || operation.key === 'complete-usual') {
      const batch = operation.key === 'stop' ? after.still.batch : before.still.batch;
      if (batch) add('distillation',batch.id,month,generationId,{batchId:batch.id},{record:'operations',key:operation.key},'原酒を採り終えた。',index);
    }
    for (const cask of difference(after.core.casks,before.core.casks)) {
      fills.add(cask.id);
      add('fill',cask.id,cask.filledMonth,generationId,{caskId:cask.id,batchId:cask.batchId},{record:'core.casks'},'原酒を樽に詰めた。',index);
    }
    for (const row of difference(after.releases,before.releases)) addRelease(row,generationId,index);
    for (const row of difference(after.records,before.records,'productId')) addRelease(row,generationId,index);
    for (const row of difference(after.shop?.deliveries,before.shop?.deliveries)) addReceipt(row,generationId,index);
    for (const row of after.shop?.relations ?? []) addRelation(row,generationId,index);

    const sold = after.core.totals.bottlesSold - before.core.totals.bottlesSold;
    const revenue = Math.round(after.core.totals.revenue * 100) - Math.round(before.core.totals.revenue * 100);
    if (month !== before.core.month || sold || revenue) {
      const row = months.get(month) ?? {month, sold:0, revenueCents:0, channels:{direct:0,stockist:0,wholesale:0,unclassified:0}};
      row.sold += sold;
      row.revenueCents += revenue;
      let classified = 0;
      if (month !== before.core.month) for (const sale of after.core.lastMonth?.sales ?? []) {
        const channel = sale.channel ?? 'direct';
        if (!Object.hasOwn(row.channels,channel)) continue;
        row.channels[channel] += sale.sold;
        classified += sale.sold;
      }
      row.channels.unclassified += sold - classified;
      months.set(month,row);
    }
    if (sold > 0) add('sale',index,month,generationId,{},
      {record:'core.totals.bottlesSold',delta:sold,sales:month !== before.core.month ? after.core.lastMonth?.sales ?? [] : []},
      `${sold}本売れた。`,index);

    const oldTrade = new Set((before.trade?.history ?? []).map(row => JSON.stringify(row)));
    for (const row of after.trade?.history ?? []) {
      if (row.kind !== 'accepted' || oldTrade.has(JSON.stringify(row))) continue;
      add('wholesale-start', index, row.month, generationId,{partnerId:row.relationshipId ?? null},
        {record:'trade.history',entry:row},`${row.partner}と卸取引を始めた。`,index);
    }
    const completed = difference(after.generations?.completed,before.generations?.completed);
    for (const era of completed) {
      const oldCasks = new Set(before.core.casks.map(row => row.id));
      const caskIds = after.core.casks.filter(row => oldCasks.has(row.id)).map(row => row.id);
      const shopIds = [...new Set((after.shop?.relations ?? [])
        .filter(row => row.shopId !== 'department' || [...receipts.values()].some(receipt => receipt.shopId === 'department'))
        .map(row => row.shopId ?? 'town-liquor'))];
      handovers.push({month:era.endedMonth,generationId:era.id,nextGenerationId:after.generations.active.id,caskIds,shopIds});
      add('handover',era.id,era.endedMonth,era.id,{nextGenerationId:after.generations.active.id,caskIds,shopIds},
        {record:'generations.completed', startedMonth:era.startedMonth, lastCaskId:era.lastCaskId},
        `第${after.generations.active.id}世代に引き継いだ${caskIds.length ? `。引き継いだ樽は${caskIds.length}本` : ''}。`,index);
    }
    const town = after.labConnection?.town, oldTown = before.labConnection?.town;
    if (town && (town.arrivals.length !== oldTown?.arrivals.length || town.events.length !== oldTown?.events.length)) townFacts(after,generationId,index,oldTown);
  });

  const ordered = [...events.values()].sort(time);
  const shopRows = buildShopLedger(state).filter(shop => shop.established).map(shop => {
    const rows = [...receipts.values()].filter(row => row.shopId === shop.id && row.count > 0).sort(time);
    const deliveryMonths = [...new Set(rows.map(row => row.month))];
    const gaps = deliveryMonths.slice(1).map((end,index) => ({afterMonth:deliveryMonths[index],beforeMonth:end,
      months:end-deliveryMonths[index]-1})).filter(gap => gap.months > 0);
    const runs = [];
    for (const month of deliveryMonths) {
      if (runs.at(-1)?.lastMonth === month - 1) runs.at(-1).lastMonth = month;
      else runs.push({firstMonth:month,lastMonth:month});
    }
    const firstMonth = deliveryMonths[0] ?? null, lastMonth = deliveryMonths.at(-1) ?? null;
    return {id:shop.id,name:shop.name,startedMonth:shop.id === 'department' ? firstMonth : shop.startedMonth,bottles:total(rows,'count'),
      firstMonth,lastMonth,spanMonths:firstMonth === null ? null : lastMonth-firstMonth,deliveryMonths:deliveryMonths.length,
      runs,gaps,generationIds:[...new Set(rows.map(row => row.generationId).filter(id => id !== null))],
      receiptIds:rows.map(row => row.id)};
  });
  const brands = (state.brands ?? []).map(brand => {
    const rows = [...releases.values()].filter(row => row.brandId === brand.id).sort((a,b) => a.bottledMonth-b.bottledMonth || a.productId-b.productId);
    return {id:brand.id,name:brand.name,releases:rows.length,bottles:total(rows,'bottles'),
      firstMonth:rows[0]?.bottledMonth ?? null,lastMonth:rows.at(-1)?.bottledMonth ?? null,
      generationIds:[...new Set(rows.map(row => row.generationId).filter(id => id !== null))]};
  }).filter(brand => brand.releases);
  const regionPlaces = new Map();
  for (const event of ordered.filter(event => event.kind === 'rumor')) {
    const locations = regionPlaces.get(event.evidence.level) ?? new Set();
    locations.add(event.links.regionId);
    regionPlaces.set(event.evidence.level,locations);
  }
  const regions = [...regionPlaces].map(([level,locations]) => ({level,placeIds:[...locations]}));
  const annual = new Map();
  for (const row of months.values()) {
    const year = Math.floor(Math.max(0,row.month-1)/12)+1;
    const aggregate = annual.get(year) ?? {year,sold:0,revenueCents:0};
    aggregate.sold += row.sold;
    aggregate.revenueCents += row.revenueCents;
    annual.set(year,aggregate);
  }
  return {
    schema:'ambertime-history-lab/1', coverage:{...coverage,townFromMonth}, elapsedMonths:state.core.month,
    totals:{filledObserved:fills.size,bottledRecorded:total([...releases.values()],'bottles'),
      sold:state.core.totals.bottlesSold,soldBeforeCoverage,revenue:state.core.totals.revenue},
    generations:collector.finish(state),shops:shopRows,brands,regions,handovers,
    annualSales:[...annual.values()],monthlySales:[...months.values()],
    aging:{shortBottles:total([...releases.values()].filter(row => row.age <= 12),'bottles'),
      matureBottles:total([...releases.values()].filter(row => row.age >= 36),'bottles')},
    firstOverseasInquiry:ordered.find(event => event.kind === 'inquiry' && event.evidence.level === '海外') ?? null,
    timeline:selectTimeline(ordered,shopRows,brands,coverage),
  };
}

function selectTimeline(events,shops,brands,coverage) {
  const choices = new Map();
  function offer(event, score, reason, interpretation = null) {
    if (!event || (choices.get(event.id)?.importance ?? 0) >= score) return;
    choices.set(event.id,{...event,importance:score,reason,interpretation});
  }
  const first = kind => events.find(event => event.kind === kind);
  const observedFirst = label => coverage.complete ? label : '残っている記録で最も早い' + label;
  offer(first('distillation'),55,observedFirst('蒸留'));
  offer(first('fill'),45,observedFirst('樽詰め'));
  offer(first('bottling'),80,observedFirst('瓶詰め'));
  if (coverage.complete) offer(first('sale'),76,'最初の実売');
  const firstTrade = events.find(event => ['shop-start','wholesale-start'].includes(event.kind) ||
    event.kind === 'delivery' && event.links.shopId === 'department');
  offer(firstTrade,88,observedFirst('取引開始'));
  offer(first('handover'),95,'最初に記録された世代交代');
  const firstShopId = firstTrade?.links.shopId;
  const newShopDelivery = events.find(event => event.kind === 'delivery' &&
    firstShopId && event.links.shopId !== firstShopId && event.month >= firstTrade.month);
  offer(newShopDelivery,92,'別の店への納品');
  const oldest = events.filter(event => event.kind === 'bottling').sort((a,b) => b.evidence.age-a.evidence.age || time(a,b))[0];
  if (oldest?.evidence.age >= 36) offer(oldest,89,'記録上の最長熟成');
  const sustained = [...shops].sort((a,b) => (b.spanMonths ?? -1)-(a.spanMonths ?? -1))[0];
  if (sustained?.spanMonths > 0) {
    const last = events.find(event => event.kind === 'delivery' && event.evidence.receiptId === sustained.receiptIds.at(-1));
    offer(last,sustained.generationIds.length > 1 ? 98 : 90,'納品記録が最も長く残る店',
      {kind:'delivery-span',firstMonth:sustained.firstMonth,lastMonth:sustained.lastMonth,
        months:sustained.spanMonths,receiptIds:sustained.receiptIds,
        text:`最初と最後の納品は${ageLabel(sustained.spanMonths)}離れている${sustained.generationIds.length > 1 ? `。納品は${sustained.generationIds.length}世代にわたる` : ''}。`});
  }
  const continuing = [...brands].filter(brand => brand.releases > 1)
    .sort((a,b) => b.generationIds.length-a.generationIds.length ||
      (b.lastMonth-b.firstMonth)-(a.lastMonth-a.firstMonth))[0];
  if (continuing) {
    const releases = events.filter(event => event.kind === 'bottling' && event.links.brandId === continuing.id);
    offer(releases.at(-1),continuing.generationIds.length > 1 ? 93 : 72,'複数回の瓶詰めが記録された銘柄',
      {kind:'brand-continuity',eventIds:releases.map(event => event.id),
        text:`${continuing.name}は${monthLabel(continuing.firstMonth)}から${continuing.releases}回瓶詰めされた。`});
  }
  const inquiry = events.find(event => event.kind === 'inquiry' && event.evidence.level === '海外');
  offer(inquiry,85,'記録上最初の海外からの問い合わせ');
  for (const [level, score] of [['海外',84],['全国',79],['周辺地域',68],['町',62]]) {
    offer(events.find(event => event.kind === 'rumor' && event.evidence.level === level),score,`記録上最初の${level}への口コミの到達`);
  }
  const used = new Map();
  return [...choices.values()].sort((a,b) => b.importance-a.importance || time(a,b))
    .filter(event => {
      const count = used.get(event.kind) ?? 0;
      if (count === 2) return false;
      used.set(event.kind,count+1);
      return true;
    }).slice(0,8).sort(time);
}
