import {replayDistilleryOperations} from '../partner-orders.mjs';
import {NODES} from '../town-connection.mjs';

const places = new Map(NODES.map(node => [node.id,node]));
const duration = n => n < 12 ? n+'か月' : Math.floor(n/12)+'年'+(n%12 ? n%12+'か月' : '');
const metric = (label,value) => ({label,value});
const keyFor = row => (row.shopId ?? 'town-liquor')+':'+row.brandId;
const order = (a,b) => a.month-b.month || (a.operationIndex ?? -1)-(b.operationIndex ?? -1);
const manual = new Set(['stop','fill','bottle','bottle-branded','bottle-counted-branded','stockist-accept',
  'accept-shop','store-assign','stockist-deliver','stockist-accept-delivery','deliver-shop','accept-shop-delivery',
  'department-queue','department-accept-queue','staff-hire','bottling-staff-hire','generation-handover']);

export function observeFacts(state,h0,observeOperation) {
  const facts = Object.fromEntries(['offers','receipts','placements','releases','fills','handovers','town','direct'].map(key=>[key,new Map()]));
  const shopName=id=>h0.shops.find(shop=>shop.id===id)?.name ?? id;
  replayDistilleryOperations(state, observation => {
    const {index,operation,before,after} = observation;
    observeOperation?.(observation);
    const key = operation?.key, month = after.core.month;
    const known = manual.has(key) ? 'manual' : 'unknown';
    function add(map,id,kind,date,ids,label,agency=known) {
      if (!map.has(id)) map.set(id,{kind,month:date,ids,label,agency,operationIndex:operation ? index : null,
        operationKey:key ?? null,generationId:before?.generations?.active?.id ?? null});
    }
    for (const row of after.shop?.relations ?? []) {
      const shopId = row.shopId ?? 'town-liquor';
      if (shopId === 'department') continue;
      add(facts.offers,keyFor(row),'shop-start',row.startedMonth,{shopId,brandId:row.brandId},
        shopName(shopId)+'と取引を始めた。');
    }
    for (const row of after.shop?.deliveries ?? []) {
      const shopId = row.shopId ?? 'town-liquor';
      add(facts.receipts,row.id,'delivery',row.month,{shopId,receiptId:row.id,brandId:row.brandId,
        productId:row.productId,releaseId:row.releaseId,count:row.count},
        shopName(shopId)+'に'+row.count+'本納品。',key === 'month' ? 'automatic' : known);
    }
    if (key === 'store-assign') {
      const {shopId,productId,count} = operation.value;
      add(facts.placements,index,'placement',month,{shopId,productId,count},shopName(shopId)+'の棚に瓶を置いた。');
    }
    for (const row of after.releases ?? []) {
      const brand = after.brands?.find(brand=>brand.id===row.brandId);
      const delegated = key === 'bottling-delegate' ||
        (after.automation?.lastBottlings ?? []).some(item=>item.productId===row.productId && item.month===month);
      add(facts.releases,row.id,'bottling',row.bottledMonth,
        {brandId:row.brandId,releaseId:row.id,productId:row.productId,caskId:row.caskId,age:row.age,count:row.bottles},
        '「'+(brand?.name ?? 'ウイスキー')+'」を'+row.bottles+'本瓶詰め。',
        delegated && operation ? 'delegated' : known);
    }
    for (const row of after.core.casks ?? []) add(facts.fills,row.id,'fill',row.filledMonth,
      {caskId:row.id,batchId:row.batchId},'原酒を樽に詰めた。',key === 'complete-usual' ? 'delegated' : known);
    for (const row of after.generations?.completed ?? []) add(facts.handovers,row.id,'handover',row.endedMonth,
      {fromGeneration:row.id,toGeneration:after.generations?.active?.id ?? null},'次の世代に引き継いだ。');
    if (key === 'stop' || key === 'complete-usual') {
      const batchId=(key==='stop' ? after.still.batch : before.still.batch)?.id;
      if (batchId != null) add(facts.direct,index,'distillation',month,{batchId},'原酒を採り終えた。',key==='stop'?'manual':'delegated');
    }
    if (key==='staff-hire' || key==='bottling-staff-hire') add(facts.direct,index,'hire',month,{},'担当者を雇った。');
    const town = after.labConnection?.town;
    for (const row of town?.events.slice(before?.labConnection?.town?.events.length ?? 0) ?? []) {
      const place=places.get(row.to), name=place?.name ?? row.to;
      const labels={
        arrival:name+(row.channel==='direct'?'に直接届いた。':'に口コミが届いた。'),
        inquiry:name+'から問い合わせが届いた。',interest:name+'で取扱いへの関心が生まれた。',
        rumor:name+'への紹介が記録された。',release:'ウイスキーを瓶詰めした。',shipment:'伝播モデルに出荷が記録された。',
      };
      add(facts.town,row.id,row.type,row.month,{townEventId:row.id,sourceId:row.sourceId,regionId:row.to,
        level:place?.level ?? null,townReleaseId:row.releaseId,releaseId:row.mainReleaseId ?? null,channel:row.channel ?? null},
        labels[row.type] ?? '口コミの経路に記録された。',operation ? 'automatic' : 'unknown');
    }
  });
  return facts;
}

export function sourceChain(event, byId) {
  const chain = [event], seen = new Set([event.ids.townEventId]);
  let current = event;
  while (current.ids.sourceId != null) {
    const parent = byId.get(current.ids.sourceId);
    if (!parent || seen.has(parent.ids.townEventId) || parent.month > current.month ||
        parent.ids.townReleaseId !== current.ids.townReleaseId) return [];
    chain.unshift(parent);
    seen.add(parent.ids.townEventId);
    current = parent;
  }
  return chain;
}

export function extractConnections(state,h0) {
  const facts = observeFacts(state,h0);
  const coverage = {...h0.coverage};
  const connections = [];
  function connect(id,kind,entity,start,end,bridge,certainty,metrics,summary,evidence) {
    if (!start || !end || order(start,end)>0) return;
    connections.push({id,kind,entity,start,end,bridge,elapsedMonths:end.month-start.month,certainty,
      metrics,summary,evidence,coverage});
  }

  for (const shop of h0.shops) {
    const entity = {id:shop.id,name:shop.name};
    const rows = [...facts.receipts.values()].filter(event=>event.ids.shopId===shop.id).sort(order);
    const end = rows.at(-1);
    if (!end) continue;
    const offer = facts.offers.get(keyFor(end.ids));
    const firstReceipt = rows.find(row=>row.ids.brandId===end.ids.brandId);
    const start = offer ?? firstReceipt;
    if (!start || start === end) continue;
    const handover = facts.handovers.get(start.generationId);
    const successor = handover && handover.ids.toGeneration === end.generationId && order(handover,end)<0;
    const placement = [...facts.placements.values()].filter(event=>event.ids.shopId===shop.id &&
      event.ids.productId===end.ids.productId && order(event,end)<0).at(-1);
    const laterPlacement = placement && (successor ? order(handover,placement)<=0 : !firstReceipt);
    const bridge = [firstReceipt!==start && firstReceipt!==end ? firstReceipt : null,
      successor ? handover : null,laterPlacement ? placement : null].filter(Boolean).sort(order);
    connect('shop:'+shop.id,'shop',entity,start,end,bridge,'same-id',[
      metric('累計納品',shop.bottles+'本'),metric('最初と最後の納品間隔',duration(shop.spanMonths)),
      metric('最長の納品空白',duration(Math.max(0,...shop.gaps.map(row=>row.months))))],
      successor && offer ? (start.generationId===1?'初代':'前の世代')+'が取引を始めた'+shop.name+'に、次の世代でも納品があった。' :
        offer ? shop.name+'と取引を始めたあと、同じ店にまた納品があった。' :
          shop.name+'へ、初納品のあとにも瓶が届いた。',
      ['同じ店舗・銘柄ID','納品の連続や休止・再開は不明',
        ...(laterPlacement ? ['棚への配置は同じ店・商品ID。納品との直接の因果は不明'] : [])]);
    if (successor) connect('generation:'+shop.id,'generation',entity,handover,end,[],
      'chronological',[metric('引き継ぎから納品まで',duration(end.month-handover.month)),metric('納品',end.ids.count+'本')],
      '世代が変わったあとも、'+shop.name+'に納品があった。',['世代の終了記録と納品の操作順','引き継ぎが納品の原因かは不明']);
  }

  for (const brand of state.brands ?? []) {
    const rows = [...facts.releases.values()].filter(event=>event.ids.brandId===brand.id).sort(order);
    const start = rows[0], end = rows.at(-1);
    if (!start || start === end) continue;
    const handover = facts.handovers.get(start.generationId);
    const successor = handover?.ids.toGeneration != null && handover.ids.toGeneration === end.generationId;
    connect('brand:'+brand.id,'brand',{id:brand.id,name:brand.name,shape:brand.bottle,label:brand.label},start,end,
      successor ? [handover] : [],'same-id',[metric('記録された瓶詰め',rows.length+'回'),metric('最初と最後の間隔',duration(end.month-start.month))],
      successor ? (start.generationId===1?'初代':'前の世代')+'が瓶詰めした「'+brand.name+'」を、次の世代も瓶詰めした。' :
        '「'+brand.name+'」は、後年にも同じ銘柄で瓶詰めされた。',['同じ銘柄ID。発売回はそれぞれ別のID']);
  }

  const release = [...(state.releases ?? [])].filter(row=>facts.fills.has(row.caskId))
    .sort((a,b)=>b.age-a.age||a.id-b.id)[0];
  if (release) {
    const start=facts.fills.get(release.caskId),end=facts.releases.get(release.id);
    connect('cask:'+release.caskId,'cask',{id:release.caskId,name:'樽詰めから瓶詰め',caskType:release.type},
      start,end,[],'same-id',[metric('記録された熟成',duration(release.age)),metric('瓶詰め',release.bottles+'本')],
      '原酒を詰めた樽から、'+duration(release.age)+'熟成したウイスキーを瓶詰めした。',
      ['樽のIDと発売記録のcaskIdが一致']);
  }

  const inquiry = facts.town.get(h0.firstOverseasInquiry?.evidence.townEventId);
  const arrivals = [...facts.town.values()].filter(e=>e.kind==='arrival'&&e.ids.level==='海外'&&e.ids.channel!=='direct').sort(order);
  const chain = inquiry ? sourceChain(inquiry,facts.town) : [];
  const source = chain.find(event=>event.kind==='arrival'&&event.ids.regionId===inquiry?.ids.regionId);
  if (source) connect('reputation:linked','reputation',{id:inquiry.ids.regionId,name:'口コミと問い合わせ'},
    source,inquiry,chain.slice(chain.indexOf(source)+1,-1),'source-linked',
    [metric('到達から問い合わせまで',duration(inquiry.month-source.month))],
    '海外に届いた口コミの記録が、その後の問い合わせにつながっていた。',
    ['問い合わせからsourceIdを遡って確認','問い合わせは取引・販売と別の記録',...chain.map(event=>event.ids.townEventId)]);
  if (inquiry && arrivals[0] && arrivals[0]!==source) connect('reputation:earliest','reputation',
    {id:inquiry.ids.regionId,name:'海外への初到達と問い合わせ'},arrivals[0],inquiry,[],'chronological',
    [metric('初到達から初問い合わせまで',duration(inquiry.month-arrivals[0].month))],
    '海外への最初の到達のあと、海外から最初の問い合わせがあった。',['年月順のみ',chain.length ? '最初の到達は、この問い合わせの参照経路に含まれない' : '問い合わせの参照経路は不明']);

  const contacts={manual:0,delegated:0,automatic:0,unknown:0};
  for (const group of Object.values(facts)) for (const event of group.values()) contacts[event.agency]++;
  return {coverage,contacts,connections};
}
