'use strict';

const IMPACT_RULES_SCHEMA = 'yumaniwa-impact-rules/0.1';

const IMPACT_RULES = [
  {
    id: 'works-source',
    paths: ['data/works.js'],
    impacts: [
      { id: 'works.venue-menu', description: '施設メニューへの反映・表示順・可視性を確認する' },
      { id: 'works.direct-route', description: '直リンク / ?work=<id> の導線への影響を確認する' },
      { id: 'works.search-share', description: 'Search / Share metadataとの整合を確認する' },
      { id: 'works.analytics-id', description: 'Work Open / Close / Share等のwork id識別への影響を確認する' },
      { id: 'works.town-awareness', description: '更新履歴・おばけ会話など町内告知への影響を確認する' },
      { id: 'works.release-validator', description: 'Release Validator対象・公開集合への影響を確認する' }
    ]
  },
  {
    id: 'scene-data',
    paths: ['data/town-maps.js', 'data/station-plaza.js'],
    impacts: [
      { id: 'scene.rendering', description: 'scene描画・前後関係・表示位置への影響を確認する' },
      { id: 'scene.collision', description: 'collision / passable / blockedへの影響を確認する' },
      { id: 'scene.interaction', description: 'trigger / interaction / tap範囲への影響を確認する' },
      { id: 'scene.editor-desk', description: 'Editor / YumaniwaDeskのsource・before・hash契約への影響を確認する' },
      { id: 'scene.validation', description: 'Scene Contract validator / testsへの影響を確認する' },
      { id: 'scene.transition-adjacency', description: '隣接scene・spawn・edge warp・遷移往復への影響を確認する' }
    ]
  },
  {
    id: 'world-object-registry',
    paths: ['data/world-objects.js'],
    impacts: [
      { id: 'world-object.registry', description: 'WORLD OBJECT identity / metadataの整合を確認する' },
      { id: 'world-object.references', description: 'scene側objectId参照と孤児参照を確認する' },
      { id: 'world-object.asset', description: 'canonical asset / src / pixel contractを確認する' },
      { id: 'world-object.rendering', description: '配置sceneでのscale・foot・draw orderを確認する' }
    ]
  },
  {
    id: 'search-metadata',
    paths: ['data/work-search-meta.js'],
    impacts: [
      { id: 'search.generated-pages', description: 'w/・en/w/生成ページへの反映を確認する' },
      { id: 'search.sitemap', description: 'sitemapの公開集合・日英URLへの影響を確認する' },
      { id: 'search.localized-copy', description: '日英title / description / body / OGP文面の整合を確認する' },
      { id: 'search.structured-data', description: 'JSON-LD / schemaType / terms / genreへの影響を確認する' },
      { id: 'search.validator', description: 'Search / Share generator checkとRelease Validatorへの影響を確認する' }
    ]
  },
  {
    id: 'search-generator',
    paths: ['tools/generate-work-search-pages.cjs'],
    impacts: [
      { id: 'search.generated-pages', description: '全公開作品の日英生成ページへ横断的に影響しないか確認する' },
      { id: 'search.sitemap', description: 'sitemap生成契約への影響を確認する' },
      { id: 'search.structured-data', description: 'JSON-LD出力契約への影響を確認する' },
      { id: 'search.validator', description: 'Release Validatorとの生成一致契約を確認する' },
      { id: 'search.regression', description: '代表作品と境界ケースの回帰testを確認する' }
    ]
  },
  {
    id: 'ghost-dialogue',
    paths: ['data/ghost-dialogue.js'],
    impacts: [
      { id: 'ghost.runtime', description: 'おばけ会話の読み込み・ランダム候補表示を確認する' },
      { id: 'ghost.work-id', description: 'works[id]参照と公開作品IDの整合を確認する' }
    ]
  },
  {
    id: 'updates',
    paths: ['data/updates.js'],
    impacts: [
      { id: 'updates.runtime', description: '駅前看板 / 更新履歴表示への影響を確認する' },
      { id: 'updates.work-id', description: 'workIds参照と作品IDの整合を確認する' }
    ]
  },
  {
    id: 'interaction-lifecycle',
    paths: ['town-interaction-flow.js'],
    impacts: [
      { id: 'interaction.lifecycle', description: 'interaction / cancel / generation lifecycleへの影響を確認する' },
      { id: 'interaction.regression', description: '既存interaction回帰testを確認する' },
      { id: 'interaction.scene-flow', description: '代表sceneで開く・閉じる・戻る・連打を確認する' }
    ]
  },
  {
    id: 'shared-runtime',
    paths: ['main.js'],
    impacts: [
      { id: 'runtime.shared', description: '複数scene / workへ共通runtime影響がないか確認する' },
      { id: 'runtime.regression', description: '変更領域に対応する既存回帰testを確認する' },
      { id: 'runtime.mobile-desktop', description: '必要な場合mobile / desktop双方の実機挙動を確認する' },
      { id: 'runtime.rollback', description: '変更単位とrollback方法を確認する' }
    ]
  },
  {
    id: 'analytics-runtime',
    paths: ['town-analytics.js'],
    impacts: [
      { id: 'analytics.event-contract', description: 'event名・props・既存計測契約への影響を確認する' },
      { id: 'analytics.production-debug', description: 'production送信とdebug/staging挙動の分離を確認する' },
      { id: 'analytics.external-goals', description: '外部Goal設定が必要ならUNVERIFIEDとして残す' }
    ]
  }
];

function allImpactDefinitions() {
  const map = new Map();
  for (const rule of IMPACT_RULES) {
    for (const impact of rule.impacts) {
      if (!map.has(impact.id)) {
        map.set(impact.id, { ...impact, rules: [rule.id] });
      } else {
        map.get(impact.id).rules.push(rule.id);
      }
    }
  }
  return [...map.values()];
}

module.exports = {
  IMPACT_RULES_SCHEMA,
  IMPACT_RULES,
  allImpactDefinitions,
};
