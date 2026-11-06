import {monthLabel} from '../model.mjs';

const positive = value => Number.isSafeInteger(value) && value > 0;
const nameOf = value => typeof value === 'string' && value.trim() ? value.trim() : null;

export function firstDeliveryIds({coverage,events}) {
  const first = new Map();
  if (coverage?.complete !== true || coverage.fromMonth !== 0) return first;
  for (const event of events) {
    const shop = event.ids?.shopId;
    if (event.kind !== 'delivery' || shop == null) continue;
    const prior = first.get(shop);
    if (!prior || event.month < prior.month ||
        event.month === prior.month && (event.operationIndex < prior.operationIndex ||
          event.operationIndex === prior.operationIndex && event.ordinal < prior.ordinal)) first.set(shop,event);
  }
  return new Map([...first].map(([shop,event]) => [shop,event.id]));
}

const phrases = {
  distillation: () => '原酒を採り終えた',
  fill: () => '原酒を樽に詰めた',
  bottling: ({ids,brand,count}) => {
    const age = positive(ids.age) ? ids.age%12 === 0 ? ids.age/12+'年' : ids.age+'か月' : null;
    return `${age ? age+'熟成の' : ''}${brand ?? 'ウイスキー'}を${count}瓶詰めした`;
  },
  sale: ({event,brand,count}) => `${event.ids?.saleReceiptId?.startsWith('retail:') ? '自家販売で' : ''}${brand ? brand+'が' : ''}${count}売れた`,
  'shop-start': ({place}) => place ? place+'と取引を始めた' : '取引を始めた',
  delivery: ({place,brand,count,first}) =>
    `${place ? place+'に' : ''}${brand ? brand+'を' : ''}${first ? '初めて' : ''}${count}納品した`,
  arrival: ({place}) => `${place ? place+'に' : ''}口コミが届いた`,
  inquiry: ({place}) => `${place ? place+'から' : ''}問い合わせが届いた`,
  visit: ({place}) => `${place ? place+'で銘柄を知った' : ''}人が蒸留所を訪れた`,
  handover: ({ids}) => positive(ids.toGeneration) ?
    `蒸留所を第${ids.toGeneration}世代へ引き継いだ` : '蒸留所を引き継いだ',
  reaction: ({event,brand}) => {
    // Only unwrap the known presentation wrapper. The quoted content stays verbatim.
    const quote = event.evidence?.record === 'player-news.customerComments' &&
      event.label?.match(/^.+のお客さん「([\s\S]+)」$/u)?.[1];
    return quote ? `自家販売で${brand ? brand+'に' : ''}「${quote}」という反応があった` : null;
  },
};

export function recallSentence(event,firstIds) {
  const ids = event.ids ?? {};
  const scene = event.scene;
  const place = (ids.shopId != null && scene?.kind === 'shop' && scene.entity?.id === ids.shopId ||
    ids.regionId != null && scene?.kind === 'reputation' && scene.entity?.id === ids.regionId)
    ? nameOf(scene.entity.name) : null;
  const brandName = ids.brandId != null && scene?.bottle?.id === ids.brandId ? nameOf(scene.bottle.name) : null;
  const phrase = Object.hasOwn(phrases,event.kind) ? phrases[event.kind]({
    event,ids,place,brand:brandName ? '『'+brandName+'』' : null,
    count:positive(ids.count) ? ids.count+'本' : '',
    first:ids.shopId != null && firstIds?.get(ids.shopId) === event.id,
  }) : null;
  const body = phrase ?? nameOf(event.label);
  if (!body) return '';
  const date = Number.isSafeInteger(event.month) && event.month >= 0 ? monthLabel(event.month)+'、' : '';
  return date+body+(/[。！？]$/u.test(body) ? '' : '。');
}
