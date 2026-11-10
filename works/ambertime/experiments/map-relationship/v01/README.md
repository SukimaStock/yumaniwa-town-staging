# AmberTime｜お店のつながり M1-A：店舗の呼吸 A / B / C

## 試す体験

点線、ひさし・窓・戸口の微細変化、地図全体の暗転、自動ズームは作者のiPhone試遊で採用せず、**関係する店舗そのものを、ゆっくり拡大縮小するだけ**の3案へ更新する。

| 比較案 | 紹介元 | 選択中の店 | 目的 |
|---|---|---|---|
| A 同時 | 呼吸 | 同じタイミングで呼吸 | 2地点が関連すると一目で分かるか |
| B 呼応 | 呼吸 | 320ms遅れて呼吸 | 伝わった方向を感じるか |
| C 相手だけ | 呼吸 | 静止 | 今選んだ店から、関係する相手を探せるか |

共通：最大 **1.28倍**、**2.2秒周期**、段階的な8ステップ拡大縮小。常に繰り返すが、点滅、矢印、ネットワーク線、地図全体の変形はない。動きは表示中の関係1件に限定する。

## 実際のドット絵を使う方法

町の地図は既存の `renderMap(ctx,3)` が描く **144×144** のCanvas。ホテルやバーの新画像を作らない。

- 町の酒店・スーパー：`world-map-view.mjs` の建物範囲に一致する位置から元の16×16ドット絵をコピーし、実スプライトの外形に合わせて周辺の草や道のピクセルだけ透過。別レイヤーで建物の中心を動かさず拡大縮小する。元のCanvasは書き換えない。
- 路地裏のバー：現行M0では仮の選択位置だけで、正式な建物画像がない。そこで**既存の選択枠（四隅）だけ**を拡大縮小し、建物を捏造しない。
- アニメーション要素は `pointer-events:none`。既存の44pxタップ領域・パン・ピンチ・ズーム・キーボード操作は維持。

## 表示条件

固定fixtureの3条件「届く前／届いた後／まだ取扱前」を維持。`relationship-view.mjs` が発売→納品→紹介→口コミ到達の真の因果経路を確認でき、対象の店が取扱中で、双方に選択位置がある場合だけ呼吸する。

- 町を眺める間は通常表示。関係を見る間だけ呼吸する。
- 他の店を選択・シナリオを変更・通常表示へ戻ると、前の動きは停止する。
- `prefers-reduced-motion` では呼吸させず、動く対象を少し拡大した静止表示にする。
- ブラウザーのページを非表示にするとアニメーションを一時停止する。
- ゲームの経済・保存・RNG・イベント発生・回想・時計は一切変更しない。

## 検証

```sh
node --check works/ambertime/experiments/map-relationship/v01/app.mjs
node --check works/ambertime/experiments/map-relationship/v01/breath-view.mjs
node --test works/ambertime/experiments/map-relationship/v01/relationship-lab.test.mjs works/ambertime/experiments/map-relationship/v01/breath-view.test.mjs works/ambertime/experiments/map-relationship/v01/focus-view.test.mjs works/ambertime/experiments/map-relationship/v01/pixel-reaction.test.mjs
```

正式な機械検証と、実際のブラウザー・iPhone操作確認は区別する。旧方式の純粋な幾何テストを削除せず、現行UIへの期待だけ更新する。

この比較Labは現在の`works/ambertime/experiments/map-relationship/v01/` へのStaging限定更新。本編M0統合やProduction公開は作者の比較結果を見て別途判断する。
