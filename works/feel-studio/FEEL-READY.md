# Feel-ready · 0.4 の最小実装

作品を動かしたまま、手触りを変え、気に入った設定を分岐して残すための任意の接続です。作品のCanvas・DOM・物理・入力・RAFは作品が持ち、Studioがないときも同じ初期値で動きます。

## 作品本体 / Parameters / Bridge

1. `parameters.js` に初期値、意味、範囲、適用方法をまとめます。作品本体はこの設定を読んで物理・描画を更新します。値を公開するだけでは完了ではありません。
2. 制作用 `index.html` だけで `bridge-client-v04.js` を読み、任意のhookをつなぎます。独立起動用 `play.html` はBridgeを読みません。
3. 登録は既存 `tests/register-v3.cjs` を利用します。新作のためにStudioの共通JSを編集する必要はありません。

```js
const settings = { gravity: 670, waterColor: '#e4f5ee', rainEnabled: true };
const validate = input => { /* 型・範囲・色などを作品側で検査 */ return structuredClone(input); };
function applyState(input) {
  const next = validate(input); // 全体を検証してから反映。失敗時に一部だけ変更しない
  Object.assign(settings, next);
  // 現在の位置・速度・経過時間を保ち、次の物理step/描画から設定を読む
}
window.FeelBridge?.connect({
  getState: () => structuredClone(settings),
  restoreState: input => { applyState(input); resetWork(); },
  applyState, // 任意。これがあるbuildだけ、undo/初期値復帰も状態を保って同期
  reset: resetWork,
  pause: value => { paused = value; },
  play: () => { paused = false; },
  beginEdit: id => { /* nullは調整モード。LIVEなら実行を止めない */ },
  applyEdit: (id, change) => applyState({ ...settings, [id]: change.value }),
  endEdit: id => {},
  getEditableElements: () => [
    { id: 'gravity', label: '落ちる強さ', type: 'range',
      min: 300, max: 1100, step: 10, value: settings.gravity,
      apply: 'live', group: '水の流れ' },
    { id: 'waterColor', label: '水の色', type: 'color',
      value: settings.waterColor, apply: 'live', group: '景色' },
    { id: 'rainEnabled', label: '雨を降らせる', type: 'boolean',
      value: settings.rainEnabled, apply: 'live', group: '景色' },
    { id: 'shape', label: '器の形を変える', type: 'rebuild', apply: 'rebuild' }
  ],
  getComparisonInfo: () => '開始条件は揃えられるが、指の操作は同じ力とは限らない'
});
```

`applyState` はすべての設定を受け取ります。作品はLIVEだけをその場の動作に使い、RESTARTは次のresetまで保留します。たとえば、開始位置の変更で動いている物体を突然移動させないこと。`getState` は制作設定を返します。実行中の物理snapshotの保存を意味しません。

## 適用方法

| 宣言 | 作品側の責任 | Studioでの動作 |
| --- | --- | --- |
| `apply: 'live'` | 安全な範囲を決め、時間・位置・速度を維持して更新 | 調整しながら実行。undo/初期値復帰は `applyState` で同期 |
| `apply: 'restart'` | 設定を保存し、次のresetで適用 | 「次の試すで」と表示。「試す」は現在の設定を渡してから両案をreset |
| `apply: 'rebuild'` | コードpartsを宣言 | Workへの依頼画面を開く。コードや設定を自動生成・実行しない |
| 省略（旧build） | 既存の編集/restore方式 | RESTART表示。旧clientと旧hashをそのまま使う |

型は既存の `position` / `timing` / `range` / `value` を再利用。0.4追加は `color`（#RRGGBB）、`boolean`、`choice`（`options: [{value,label}]`）、`rebuild`。作品固有操作は `control:'work'` のまま。秒はtimingとunit、位置は0〜1のscreen、直接操作の意味と入力解除は作品が管理します。groupで折り畳み、使わない項目を閉じます。

## catalog と不変build

新projectは既存のconfig/ranges/settingParts/levelを登録。既存projectに状態schemaの違うbuildを足す場合は、buildに任意の `config` / `ranges` / `colors: ['waterColor']` / `values: {rainStyle:['soft','clear']}` を宣言します。省略時は従来のproject schemaです。configは初期値とJSONの形の正本。親と作品の両方で検証します。

buildの `parameters: [{id,label,type,apply}]` はWork依頼に適用方法を添えるための宣言です。実際のUIは作品のgetEditableElementsで決まります。コードsourceだけでなく、HTML・parameters・物理・描画・Bridge・CSSなど全依存のSHA256を登録します。

新コードは新ID・新directoryへ追加。古いbuildや依存を編集しません。保存済み机に新しい初期buildがない場合は「別の実装を机に追加」で明示的に開きます。元の保存案は残ります。返答専用 `initial:false` buildは既存のWork返答取り込みで追加します。

`feel-workspace/2`・`feel-work-request/2`・`feel-work-response/2`とv2保存keyを継続。旧保存を別schemaに書き換えません。設定分岐とコードbuildを区別し、Work依頼はconfig、source/hash/version、選択元を保持します。LIVEの途中で分岐すると設定を保存し、新案はその設定の開始条件から起動します。水滴の途中位置そのものを保存するものではありません。

## 新作を作るWorkへの短い指示

> 作品本体・任意のFeel Parameters・Feel Bridge接続を分離してください。独立起動を先に成立させ、体験を変える少数の値を宣言します。LIVEはその場で物理/描画へ反映し、resetを呼びません。RESTARTは保留して再試行時に適用し、REBUILDはWorkの別buildとして扱います。新しい作品はcatalogと作品directoryだけで登録し、旧build・全依存hash・sandbox・保存形式を維持してください。設定の変化が実際の動作を変えるテストを行い、Node・ハーネス・実ブラウザ・実機を区別して報告してください。

実例: `prototypes/ametsugi/ametsugi-b/parameters.js` と `app.js`。旧Aとの違いを確認するには雨つぎprojectでBを開きます。Aは旧接続を保った比較基準です。
