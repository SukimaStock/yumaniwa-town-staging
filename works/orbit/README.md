# SukimaStock Starter v0.1.1

Koderで新しいSukimaStock作品を始めるための原本フォルダです。

このStarterは、Codea Liteの上にSukimaStock Engineを載せ、作品固有部分だけを`sketch.js`へ書く構成です。

## 最初にやること

1. このフォルダを複製する。
2. 複製したフォルダを作品名または作品IDに変更する。
3. `sketch.js`の`id: "replace-with-work-id"`を作品IDへ変更する。
4. 必要なら`index.html`の`<title>`を作品名へ変更する。
5. Koderで`index.html`を開いてPreviewする。
6. 以後は複製側だけを編集し、原本Starterは直接制作に使わない。

## ファイル構成

```text
index.html                  新作の起動ページ
index.demo.html             Engine更新後の動作確認用Demo
codea-lite.js               Codea風Canvasランタイム
sukimastock-engine.js       SukimaStock Engine本体
sketch.js                   新作開始用Blankテンプレート
examples/
  sketch.starter-demo.js    Engine機能確認用の動くStarter
assets/                     画像などを置く場所
sounds/                     音声などを置く場所
docs/
  ENGINE-README.md          Engineの詳しい使い方
  ARCHITECTURE.md           Engineと作品の境界
  CHANGELOG.md              Engine更新履歴
  VALIDATION.md             v0.1.1で確認済みの項目
WORKFLOW.md                  制作から公開までの標準フロー
PUBLISH-CHECKLIST.md         公開直前に使う短いチェックリスト
```

## 使い分け

- 新作制作: `index.html` + `sketch.js`
- Engine / テンプレート更新後の確認: `index.demo.html`
- Engine仕様の確認: `docs/ENGINE-README.md`

`index.demo.html`は`examples/sketch.starter-demo.js`を読みます。新作の`sketch.js`とは独立しているため、Blankテンプレートを壊さずにEngineの基本動作を確認できます。

## 重要な境界

作品固有の遊び、ルール、絵、文章は`sketch.js`へ置きます。

共通化するのは、二作品以上で実際に必要になったものだけです。Engine本体を作品ごとに気軽に変更せず、共通化する価値が確認できた変更だけをStarterへ戻します。

詳しくは`docs/ARCHITECTURE.md`を参照してください。


## 公開するとき

詳しい手順は `WORKFLOW.md`、公開直前の確認だけなら `PUBLISH-CHECKLIST.md` を使います。


## Current build
ORBIT Web v2.4 (HOME RESTORATION): v2.3.3 の進行基盤に、分離された BASE/Station、Lv1〜5 Ship visual、WAKE→LINK→MEMORY→RESONANCE→REBIRTH の RESTORE ritual を統合。MiniMap、距離制 FUEL、HOME save、LUMA range rule は維持。

## ORBIT v1.7 note
DATA planets reveal a one-time Echo on their first successful DATA harvest. The opening SERA still provides the first Echo, and v1.8 adds deterministic sector-generated VOX / SERA / LUMA planets beyond the opening area so the full 12-Echo hunt can now continue through exploration. Echo discovery and BASE return reactions follow the current E.V.E. language phase.


## v1.8 EXPLORE
- Deterministic planet sectors: 1800 units, up to two 48% spawn rolls per sector.
- Opening BASE / VOX / SERA / LUMA remain as the proven calibration area.
- Beyond it, VOX / SERA / LUMA are generated deterministically and retain depletion state in the atlas cache.
- Trader / Noir / ordinary Astra are still deferred; BASE remains the unique home.
- Generated planets intentionally reuse the accepted Web gravity profile for this pass.
- Echo discovery now caps cleanly at 12/12.


## v2.0 RETURN SAVE
- Returning to BASE is the primary auto-save point.
- Echo discoveries, repairs, and final story milestones also save.
- Title shows CONTINUE only when a valid local save exists.
- No manual save menu is added.
- Save data is local to the browser/origin; clearing site data removes it.


## v2.1 FAINT SIGNAL

- Adds a minimal exploration hint for undiscovered SERA planets.
- No arrow, distance, planet name, minimap target, or persistent marker is shown.
- When the nearest undiscovered SERA is farther than the quiet radius, a faint edge signal appears for about 1.25 seconds every ~6.2 seconds.
- Nearby SERA planets stay unmarked so early discoveries still feel self-directed.
- The signal peeks deterministic Atlas sectors without caching them, so guidance does not silently expand save-state data.
- Signal is suppressed during landing, Echo memory playback, rescue/finale beats, and after ECHO 12/12.
- Flight, landing assist, launch speed, repair costs, Echo text, and save schema are unchanged.


## v2.2 VECTOR ASSIST

- First tactile control pass only; no speed, thrust, damping, landing, takeoff, gravity, or signal tuning changed.
- While touching, the current velocity gently rotates toward the thrust direction.
- At high speed the assist is more noticeable; at low speed it is nearly absent.
- Opposite-direction input naturally sheds speed before reversing instead of snapping 180 degrees.
- Releasing touch returns immediately to the accepted v2.1 inertial drift.


## v2.3 RESTORE RADIUS

- BASE repair and ship-range repair are unified as RESTORE Lv1–5.
- FUEL max: 32 / 60 / 95 / 135 / 180.
- ORE cargo max: 20 / 25 / 30 / 30 / 30.
- RESTORE costs: 20+2 / 25+2 / 30+3 / 30+3 (ORE + DATA).
- Exactly 12 progression SERA are distributed 2 / 2 / 3 / 3 / 2 across five distance bands.
- Each SERA gives one DATA and one Echo once; standard progression naturally aligns E.V.E.'s five language phases with Echo 1–12.
- Progression VOX are distributed near those SERA routes with the exact ORE budget needed for each next RESTORE.
- Procedural planets are now neutral ASTRA plus occasional LUMA fuel relays; they no longer inject extra DATA/ORE into the progression economy.
- Fuel consumption is distance-based (4.23 / 1000 units), so future optional speed modules can be added without changing range.
- Only BASE is persistent. Fuel-out rolls the whole unreturned expedition back to the last HOME checkpoint.
- Save schema moved to v3; v2.2 test saves intentionally start fresh.

## v2.5 — OPEN UNIVERSE
Phase 12 の固定リング進行を緩め、procedural SERA / VOX を復帰。宇宙は最初から広く移動でき、RESTORE は遠方世界の解析・採掘能力を開く。LUMA は全域で利用可能、FUEL は寄り道前提へ拡張。燃料切れでも DATA / Echo 発見は保持する。v2.4 の RESTORE iframe 黒画面対策も実施。
