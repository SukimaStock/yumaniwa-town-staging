(() => {
  'use strict';

  window.YUMANIWA_MAP_FACTORY_SYSTEM = {
    version: 1,
    assetTypes: {
      alley_shop: {
        label: 'Alley Shop',
        defaultStrategy: 'double_variation',
        defaultPairStrategy: 'same_shop_variations'
      },
      exhibit_object: {
        label: 'Exhibit Object',
        defaultStrategy: 'double_variation',
        defaultPairStrategy: 'same_object_variations',
        future: true
      }
    },

    strategies: {
      single: {
        label: 'Single',
        description: '単体生成。最終調整や、比較が不要なAsset向け。'
      },
      double_variation: {
        label: 'Double Variation',
        description: '同カテゴリを2案並べて生成し、1案あたりの情報量を自然に下げつつ比較できる方式。',
        reference: true
      }
    },

    operatingRules: [
      'Alley Shopは、まずDouble Variationから試す。',
      '2案は同カテゴリのまま、完全コピーではなく小さな差だけ許す。',
      '最初の再現性テストでは参考画像を使わず、Master + Category Recipeだけで生成する。',
      '構造は固定し、Shop type / Color / Sign / Lighting / Props / Manual Adjustmentだけを差し替える。',
      '店の個性を強めたい場合も、差はCategory Recipe側で足し、Masterはすぐに変更しない。',
      '結果はDraft → Good → Referenceで昇格し、成功理由と次回残す点を保存する。'
    ],

    referenceRule: '同じMaster + Strategyが3カテゴリ以上で成立したら、StrategyをReferenceとして固定する。',
    validation: {
      strategy: 'double_variation',
      status: 'validated',
      categories: ['craft_cola', 'kissaten', 'curry'],
      summary: 'Craft Cola / Kissaten / Curry の3カテゴリで統一感と低密度化を確認。Double Variation v1をAlley Shopの標準戦略とする。'
    },

    categoryPresets: {
      craft_cola: {
        label: 'Craft Cola',
        name: 'クラフトコーラ屋（2軒並び）',
        description: '灯串横丁にある、小さな手作りクラフトコーラ店を2案並べたバリエーション。',
        variables: {
          shopType: 'small craft-cola shops',
          mainColor: 'dark brown wooden facades, deep charcoal roofs, faded dark red noren, small beige accents, warm amber light',
          sign: 'one simple hanging bottle sign per shop, using a very simple bottle-shaped emblem or abstract cola symbol',
          lighting: 'one small warm lantern or entrance light per shop, restrained amber light',
          props: 'at most 2 simple cola bottles and 1 simple spice jar per shop, no labels, no clutter'
        },
        manualAdjustment: 'Preserve the noren and hanging signs as the main identity. Keep both shops compact, narrow, slightly vertical, low-color, and visually quiet.'
      },

      kissaten: {
        label: 'Kissaten',
        name: '喫茶店（2軒並び）',
        description: '灯串横丁にある、小さな昔ながらの喫茶店を2案並べたバリエーション。静かで落ち着き、長くこの横丁で営業しているような店。',
        variables: {
          shopType: 'small old-fashioned neighborhood kissaten',
          mainColor: 'dark brown wooden facades, deep charcoal roofs, faded deep green noren or fabric accents, small beige details, warm amber light',
          sign: 'one simple hanging sign per shop with a simple coffee cup, coffee bean, or kettle emblem, no detailed readable text',
          lighting: 'one small warm entrance lamp per shop, restrained amber light from the entrance or small window',
          props: 'at most 1 simple coffee pot and 2 simple cups per shop, or one small menu board, no labels, no clutter'
        },
        manualAdjustment: 'Preserve the same successful Double Variation structure. Keep both shops compact, narrow, and slightly vertical. The main identity should come from a noren, a hanging sign, and one or two coffee-related symbols. Avoid turning the shops into fancy modern cafes. Keep them modest, old-fashioned, quiet, and native to Tomogushi Alley.'
      },

      curry: {
        label: 'Curry',
        name: 'カレー屋（2軒並び）',
        description: '灯串横丁にある、小さな近所のカレー屋を2案並べたバリエーション。片方は小さな食堂寄り、もう片方は持ち帰り寄りまで、控えめな差を許す。',
        variables: {
          shopType: 'small neighborhood curry shops',
          mainColor: 'dark brown wooden facades, deep charcoal roofs, faded mustard yellow or dull ochre fabric accents, small beige details, warm amber light',
          sign: 'one simple hanging sign per shop with a simple curry bowl, spoon, or spice emblem, no detailed readable text',
          lighting: 'one small warm entrance lamp or lantern per shop, restrained amber light',
          props: 'at most 1 simple curry bowl, 1 simple pot, 1 simple spice jar, or 1 small menu board per shop, no clutter'
        },
        manualAdjustment: 'Preserve the same successful Double Variation structure. Keep both shops compact, narrow, and slightly vertical. For the curry version, allow the two shops to be slightly more offset from each other than in the kissaten version. One may lean a little more toward a tiny sit-down curry shop and the other toward a tiny takeaway-style curry shop. Keep the difference modest and native to Tomogushi Alley.'
      }
    }
  };
})();
