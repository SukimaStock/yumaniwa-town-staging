// Research continuation, adapted mechanically from market-dialogue-s3/long-run.mjs at b7b5473.
// Differences: supplied snapshot/records, absolute starting month, deterministic cask targets; no formal save.
// No stock/cash/contract injection. Run one policy per process, sequentially.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as Native from '../../partner-orders.mjs';
import {PARALLEL_PARAMETERS} from '../../parallel-parameters.mjs';
import {shopDialogueHistory,createDialogueProjection} from '../../shop-dialogue.mjs';
import {serializeSession,readSession} from '../../development-save.mjs';
import {createObservedModel} from '../../recall/operations.mjs';
import {initializeRecall,advanceRecall} from '../../recall/collector.mjs';
import {initializeHistoryRecord,advanceHistoryRecord} from '../../history-record.mjs';
import {initializeCaskSlots,reconcileCaskSlots} from '../../cask-slots.mjs';
import {migrateRecentLedger,advanceRecentLedger} from '../../recent-ledger.mjs';
const SEED = 42;
const DEPARTMENT = 'department';
const TOWN = 'town-liquor';
const SUPER = 'supermarket';
const BOOTSTRAP_MONTHS = 30;
const SCENARIOS = {
  local: {
    label: '地元密着型',
    brand: '石蔵',
    description: '最初に自家販売を育て、以降は36〜48か月熟成を目安に町の酒店と付き合う。',
    targets: [36, 48, 36, 36],
    shops: [TOWN],
  },
  wide: {
    label: '広域展開型',
    brand: '川霧',
    description: '12〜24か月熟成を中心に供給し、酒店・スーパー・デパートの申し出を受ける。',
    targets: [12, 12, 18, 24],
    shops: [TOWN, SUPER, 'bar', DEPARTMENT],
  },
  mixed: {
    label: '混合型',
    brand: '朝霞',
    description: '前半は町の酒店を優先し、16年目から店を増やす。短熟と長熟を並行する。',
    targets: [12, 36, 12, 48],
    shops: [TOWN, SUPER, 'bar', DEPARTMENT],
  },
};

const sum = (rows, get) => rows.reduce((total, row) => total + get(row), 0);
const hash = text => createHash('sha256').update(text).digest('hex');
const elapsed = started => Math.round(performance.now() - started);

export function continueScenario(input, id, months, { onCheckpoint = () => {}, onTransition = () => {}, checkpoints = [] } = {}) {
  const policy = SCENARIOS[id];
  assert(policy, 'Unknown H0 scenario');
  assert(Number.isSafeInteger(months) && months > 0, 'Invalid duration');
  let records=null;
  const D=createObservedModel(Native,({before,after})=>{
    records={...records,caskSlots:reconcileCaskSlots(after,records.caskSlots),recentLedger:advanceRecentLedger(before,after,records.recentLedger),historyRecord:advanceHistoryRecord(before,after,records.historyRecord),recallRecord:advanceRecall(before,after,records.recallRecord)};
    onTransition(after,records);
  });
  let {game,...initialRecords}=structuredClone(input);
  records=initialRecords;
  const startMonth=game.core.month;
  const caskTargets = new Map(game.core.casks.map((c,i)=>[c.id,policy.targets[i%policy.targets.length]]));
  let fills = 0;
  let forcedBottlings = 0;

  function markets() {
    return id === 'mixed' && game.core.month < 180 ? [TOWN] : policy.shops;
  }

  function bottle(cask, forced = false) {
    if (forced) forcedBottlings++;
    const selection = D.needsBrandSetup(game) ? { name: policy.brand } : {};
    game = D.bottleBranded(game, cask.id, selection);
    const { productId, bottles } = game.result;
    // Mark the release as listed for department eligibility. Native allocation
    // is separate. The release keeps a small unassigned reserve for an offer.
    game = D.listBottles(game, productId);
    const canSupplyStores = game.shop.relations.some(r => markets().includes(r.shopId));
    const keep = markets().includes(DEPARTMENT) && cask.age >= 24 ? 5 : 0;
    const retail = canSupplyStores ? Math.ceil(bottles * 0.55) : bottles - keep;
    game = D.setMarketRetail(game, { productId, count: retail });
  }

  function stockShelves() {
    const shops = markets().filter(shop => shop !== DEPARTMENT);
    for (const product of game.core.products) {
      if (!product.stock) continue;
      const { hand } = D.storeMarketInventory(game, product.id);
      if (!hand) continue;
      const reserve = markets().includes(DEPARTMENT) && product.age >= 24
        && game.core.month - product.bottledMonth < 4 ? 5 : 0;
      const eligible = shops.filter(shop => D.storeMarketQuote(game, product.id, shop).ok);
      for (const [index, shopId] of eligible.entries()) {
        const available = D.storeMarketInventory(game, product.id).hand - reserve;
        const count = Math.ceil(available / (eligible.length - index));
        if (count > 0) game = D.assignStoreProduct(game, { productId: product.id, shopId, count });
      }
      const available = D.storeMarketInventory(game, product.id);
      if (available.hand > reserve) {
        game = D.setMarketRetail(game, { productId: product.id, count: available.retail + available.hand - reserve });
      }
    }
  }

  function handleOffersAndCasks() {
    for (let guard = 0; guard < 50; guard++) {
      const decision = game.decisions[0];
      if (decision) {
        const cask = D.currentCask(game, decision.caskId);
        if (decision.eventId === 'funds' || cask.age >= caskTargets.get(cask.id)) {
          bottle(cask, decision.eventId === 'funds');
        } else {
          const option = decision.pending.options.find(o => o.id === 'wait')
            ?? decision.pending.options.find(o => o.id === 'last');
          assert(option, `Unhandled cask decision ${decision.eventId}`);
          game = D.chooseDistillery(game, cask.id, option.id);
        }
        continue;
      }
      // Wholesale and town-model inquiries have separate rules. The same
      // wholesale policy (decline) isolates finished-bottle routes in all arms.
      if (game.trade.offer) {
        game = D.declineOffer(game);
        continue;
      }
      const generation = D.generationStatus(game);
      if (generation.needsNotice) {
        game = D.noticeGeneration(game, generation.id);
        continue;
      }
      if (generation.phase === 'review') {
        game = D.handoverGeneration(game, generation.id);
        continue;
      }
      const offer = game.shop.offer;
      if (offer) {
        if (!markets().includes(offer.shopId)) {
          game = D.declineShop(game, offer.shopId, offer.id);
        } else if (offer.shopId !== DEPARTMENT) {
          game = D.acceptShop(game, offer.shopId, offer.id);
        } else {
          const product = game.releases.find(r => r.id === offer.sourceReleaseId);
          if (product && D.shopOfferQuote(game, product.productId, DEPARTMENT).ok) {
            game = D.acceptShopDelivery(game, product.productId, 5, DEPARTMENT, offer.id);
          } else {
            game = D.declineShop(game, offer.shopId, offer.id);
          }
        }
        continue;
      }
      const due = game.core.casks.find(c => c.age >= caskTargets.get(c.id));
      if (due) {
        bottle(due);
        continue;
      }
      stockShelves();
      return;
    }
    throw Error('H0 scenario failed to resolve pending decisions');
  }

  const ticksPerMonth = PARALLEL_PARAMETERS.monthMs / PARALLEL_PARAMETERS.distillStepMs;
  for (let month = startMonth; month < startMonth+months; month++) {
    handleOffersAndCasks();
    const capacity = game.core.month < BOOTSTRAP_MONTHS ? 2 : 4;
    if (game.core.casks.length < capacity && D.canStart(game).ok) {
      // Complete within one monthly clock interval using the normal range
      // controls. A fixed range and wood type keep the comparison on routing.
      game = D.startRangeDistillation(game);
      for (let step = 0; step < 24; step++) game = D.distillStep(game);
      game = D.beginCollection(game);
      for (let step = 24; step < Math.min(55, ticksPerMonth); step++) game = D.distillStep(game);
      game = D.fillBarrel(D.stopDistillation(game), 'refill');
      const target = game.core.month < BOOTSTRAP_MONTHS ? 6 : policy.targets[fills % policy.targets.length];
      caskTargets.set(game.core.casks.at(-1).id, target);
      fills++;
      handleOffersAndCasks();
    }
    let attempts = 0;
    while (game.core.month === month) {
      const previous = game;
      game = D.tickDistillery(game, month);
      assert(game !== previous, `Career stopped at month ${month}`);
      assert(++attempts < 10, `Could not advance month ${month}`);
      if (game.core.month === month) handleOffersAndCasks();
    }
    if(game.core.month%120===0)console.error(JSON.stringify({progress:id,month:game.core.month}));
    if (checkpoints.includes(game.core.month)) onCheckpoint(game, { fills, forcedBottlings,records });
  }
  return {game,...records};
}
