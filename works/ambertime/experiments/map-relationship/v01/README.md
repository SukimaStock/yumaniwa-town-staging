# AmberTime｜お店のつながり M1-A：全景コントラストと自動フォーカス

## 目的と採用範囲

作者がiPhoneで試した「ひさし／窓／戸口」の小さなピクセル反応は、3つとも町の地図では気づきにくかった。そこで今回の比較Labでは **A：町全体の中で2地点が浮かび上がる** と **C：地図そのものが紹介元の店に近づく** の2案を比較する。点線、点滅、実在しない建物は作らない。

この画面は既存 `works/ambertime/experiments/map-relationship/v01/` の独立Staging Labであり、正式なゲーム本編・実プレイデータではない。

## A：場所が浮かぶ

既存の町ドット絵（144×144ピクセル）を約68%暗くするマスクを載せ、**選択店舗と紹介元**の2つの場所だけ、元の色を残す。境界は2×2ピクセル格子上の5段の輪郭で、幅は最大48元ピクセル。小さな屋根や窓のパーツだけを動かす方式ではない。

選択先の路地裏のバーは現行M0の**仮の地図位置**で、建物そのもののドット絵は存在しない。そのためバーの新しい建物を描かず、現在の選択位置の周辺だけを明るく残す。

## C：地図が近づく

紹介元の店へ、現在の地図全体を約2.85倍まで自動で寄せる。元のマップ画像や建物スプライトは描き直さず、Canvas・ピン・タッチ領域をまとめたレイヤーを拡大し、約680msの12段階で移動する。

「全景」で1倍の町へ戻る。ユーザーがズーム・ピンチ・パンを始めたら自動移動は止め、指での操作を尊重する。reduced-motion では移動アニメーションを省いて完成した倍率・位置へ即時に移す。

## 共通の条件

- 「届く前／届いた後／まだ取扱前」の固定fixtureを切り替える。
- 「町を眺める」では追加の表示なし。「関係を見る」では、実際に記録された口コミ到達と発売・納品・紹介の因果関係が照合できた場合だけA/Cを表示する。
- 契約のない店、到達前、正しい紹介元が不明な場合、マスクも自動フォーカスも出さない。
- 関係の証拠は既存の読み取り専用 `relationship-view.mjs` を使用し、イベントの判定、経済、正式保存、RNG、歴史、回想には触れない。
- 元の小さな建物反応の `pixel-reaction.mjs` は比較研究として保持し、ピクセル幾何テストも残す。今回の画面からは使用しない。

## 機械検証

```sh
node --check works/ambertime/experiments/map-relationship/v01/app.mjs
node --check works/ambertime/experiments/map-relationship/v01/focus-view.mjs
node --test works/ambertime/experiments/map-relationship/v01/relationship-lab.test.mjs works/ambertime/experiments/map-relationship/v01/pixel-reaction.test.mjs works/ambertime/experiments/map-relationship/v01/focus-view.test.mjs
```

`focus-view.test.mjs` ではマスクのピクセル格子、境界、未到達・未契約時の無表示、iPhone相当の画面サイズに対するズーム制約、旧UI廃止を検証する。実ブラウザーでの描画・ジェスチャー・幅別確認は実行した範囲をPRに記録し、未実施はUNVERIFIEDとする。

## 今後

作者がA/Cの実機視認性、発見の面白さ、町を眺める時間への馴染みを比較してから、本編M0への接続を検討する。今回Productionや正式ゲームの6段階マップ、ユーザーのセーブデータは変更しない。
