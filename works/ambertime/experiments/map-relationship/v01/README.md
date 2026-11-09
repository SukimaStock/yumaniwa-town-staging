# AmberTime｜お店のつながり比較Lab（ドットの反応）

このLabは、町の店舗を選んだときに、関係する実在の建物スプライトが小さく変化する表現を比較するもの。**ゲーム本編や実プレイの歴史ではありません。**

## 体験の比較

- 普段はいつもの町。関係表示にしない限り追加演出はない。
- 「届く前／届いた後／まだ取扱前」は、既存 `arrival` / `rumor` / `shipment` / `release` の形式に沿った固定シナリオ。保存データもRNGも使わない。
- 町のバーに本当に口コミが届いたことを `sourceId` で検証でき、紹介元の酒店が取扱中のときだけ、酒店のドット絵が反応する。**契約の原因が口コミだったと断定しない。**
- A「ひさし」：既存の屋根の端が、途切れない一帯として左から少しずつ色づく。点状の粒をばらまかない。
- B「窓」：既存の窓に室内の色が現れ、鎧戸が1セル分開く。
- C「戸口」：既存の暗い出入口が2×2単位で少し開く。
- いずれも最後の状態で静止し、点滅・ループ・店舗間の線は描画しない。「もう一度見る」で一度だけ再生できる。
- 既存の `renderMap(stage=3)`（144×144、1セル2×2ピクセル）と `mapObservationBounds(3)` を再利用。独立した同寸法のCanvasへ建物内部のパーツだけ描く。
- ズーム・パン・店舗選択・紹介元をたどる操作は維持する。prefers-reduced-motion およびブラウザー非表示ではタイマー再生せず最終フレームを表示する。

## 実際の町の絵について

`works/ambertime/experiments/world-map/v01/map.mjs` のstage3では次の実建物を描いている。

- 町の酒店：`shop(p,43,22,'liquor',8)` → 出発座標（86,44）。
- スーパー：`shop(p,49,46,'super',8)` → 出発座標（98,92）。

屋根、窓、戸口のパッチ座標はこの実スプライトを基準とし、2ピクセル単位の格子上に、建物の範囲を出ないように描画する。**路地裏のバーは現行M0で仮の選択位置しかなく、まだ実建物スプライトがないため、バーそのものを光らせない。**

## 保護する境界

- `relationship-view.mjs` は既存Draft PR #881の読み取り専用検証コードをLabに固定したもの。今回変更しない。
- `fixtures.mjs` やモデル、口コミ生成、納品、正式保存、経済、RNG、回想、世代交代、通知や時計、本編M0は変更しない。
- 契約していない店、存在しない地図上の位置、因果が確認できない口コミには反応を出さない。
- 新たなアイコン、人物、建物、地図のレベル、点線を作らない。Productionや別作品は変更しない。

## 自動テストと未確認事項

```sh
node --check works/ambertime/experiments/map-relationship/v01/app.mjs
node --check works/ambertime/experiments/map-relationship/v01/pixel-reaction.mjs
node --test works/ambertime/experiments/map-relationship/v01/relationship-lab.test.mjs works/ambertime/experiments/map-relationship/v01/pixel-reaction.test.mjs
```

`pixel-reaction.test.mjs` は、パッチが店舗の16×16スプライト内に収まり、2px単位で、バーに偽の反応を描かず、屋根が連続帯で点線にならないことを検査する。テスト実行結果はPRに記録する。

iPhone Safari実機の視認性、native zoom時に分かるか、ブラウザーでのピンチとパン、配信ページの実動作は**作者の試遊前には未確認**。機械CI成功やモデルテストだけで演出の採用を確定しない。

以前の「A文章のみ／B点線一本」はこの改訂で置換。画面が変わるのはLabだけで、M1-B本編接続は別作業。
