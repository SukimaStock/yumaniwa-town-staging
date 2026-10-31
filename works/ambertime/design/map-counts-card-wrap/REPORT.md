# AmberTime 地図数値復元・販売室カード再調整

Base: `9c295a8d2ffc4711c60aef4a73fed13fb282aef1`（#731）。Staging限定、本編を直接修正。
Plan Lock: `.change-plans/ambertime-map-counts-card-wrap/r0.lock.json`、digest `4036622ea3e7d9658fc4c7dad37a54e27ae17e50423e73303db9f41239285248`。

## 原因と修正

地図の数値は#731で`mapSalesMarkup`からラベルを取り除き、下部だけに集約したため消えた。各店を比較するC案の情報量が失われていた。既存projectionの`recentSold/currentStock`をそのまま地図ラベルへ復元し、詳細と短い反応は下部にも残す。旧納品方式のデパートは従来どおり「納」を使用し、実販売へ読み替えない。

ラベルは共通フォントを使い、実寸を測って建物・四隅カーソル・他ラベルを避ける。選択店を優先して配置、地図内へ制限。桁数が大きい場合は既存の999+表記を維持して「売」「残」の語単位で折り返す。地図・建物・店舗座標の描画や表示範囲は変更していない。

販売室は、上段のアイコン＋店名と独立した店情報を維持。商品を2列のまとまりにし、瓶＋実残数／下段の年月の対応を固定。「ここに置く」は商品一覧の後、カード右下へ移動し、DOM順も一致させた。1商品でも横長の1行へ戻さない。大きい数量の単位は必要に応じて幅を確保し、文字は縮小しない。

商品数に応じてカードが伸び、既存の販売室パネル内で縦に送れる。空店舗の不要な空白行は省略。今回の明示指示を優先し、旧AGENTSの左側操作／全商品1画面条件は、この可変高さと右下操作へ更新する。未解放店舗・配分条件・引き取り確認・保存成功後だけの演出は維持。

本数は`storeMarketInventory/storeMarketRows`の店舗に残る実数。商品ごとの発売回と結び付けて表示する。今回の操作の数量変化は別の＋n／−nであり、実残数を通知へ置換しない。新しい在庫計算は追加していない。

## 回帰で検出した表示依存の問題

- 横棚から共通の縦スクロールへ変えると、複数店舗の販売演出が同じスクロールを並列操作する。店舗・商品を順番に表示するよう修正し、通知の寿命も全件数へ合わせた。
- 深い商品から引き取りを開いた場合、背景を送ると確認ボタンが隠れる。確認中は背景スクロールを固定し、閉じると戻す。商品12・正のscrollTop・ホイール操作後のボタンhitを検証。
- 手元の横スワイプは継続するため、親のpan-x/pan-yを維持。新しい操作で古い数量演出を止め、移動後の誤った場所へ残さない。

独立レビューで上記を検出・修正し、再確認。表現監査では新しい説明や重複ラベルを増やさず、既存の操作名と実数値を使用。

## 画像

- 地図：[前](map-before.png)／[後](map-after.png)／[大きい数値](map-large-numbers.png)
- 本編販売室：[前](market-before.png)／[後](market-after.png)
- 商品単位：[0](products-0.png)／[1](products-1.png)／[2](products-2.png)／[3](products-3.png)
- 3商品：[360px](products-360.png)／[375px](products-375.png)
- 数量演出：[配置](quantity-placement.png)／[実販売表示](quantity-sale.png)

本編の前後・配置画像は既存のnative試遊記録。0/1/2/3/12商品の組合せと大きい地図数値・販売演出画像は**表示用ハーネスの検証データ**。正式な本編のゲーム記録や架空の新店舗として扱っていない。

## 結果

- 関連unit66件に加え、store-market-main／reputationの27件が成功。販売・店舗評判・保存・正式コピー・地図投影の関連回帰を含む。
- 販売室compact browser：360×568／375×620／390×680／430×740、DPR1/3。配置・全量・取消・引き取り・店情報・画面往復・reduced-motion成功。実進行13か月目0本、14か月目自家販売1本を観測し、各月の販売・在庫・現金・納品を既存`tickDistillery`と照合。
- 旧保存の販売ルールopt-in／backup失敗／reload browserも成功。
- 新しいwrap browser：3幅×0/1/2/3/12商品の15状態、商品単位の非重複・年月対応・2列・右下操作・深い位置の引き取り・配置取消を確認。3店舗の販売演出が順番に正しい数量横へ表示されることも確認。
- 地図初回：Chromium48／Linux WPE WebKit45観測成功。可視描画・222px・開閉・保存復元・選択・拡縮・安全領域・保存バイト一致。
- 地図の3店舗／通常値／999+／全店選択／3幅の表示ストレス：Chromium48／WebKit48成功。数値の意味・共通フォント・ラベル同士／カーソルとの非重複・端での非切断を検査。既存レイアウト21状態成功。
- Scope→Risk→Impact、syntax、diff検査成功。配信バージョンも更新。

## 変更ファイル

`shop-app.mjs`、`room-scene.css`、`market-ui.mjs`、`market.css`、`index.html`、関連テスト、画像・検証JSON、本レポート、Plan Lock。

販売・評判・口コミ・地域・解放・熟成・瓶詰め・保存形式の計算コードは未変更。Production変更なし。

## 実機Safariの残確認

実機確認とは区別する。3商品以上での縦スクロール、手元の横スワイプ、右下ボタン、引き取り確認、数量演出の触感、地図ラベルの読みやすさと対応、初回表示・安全領域を確認する。#730の実機Previewの初回欠落条件は引き続き未確定。作者の採否はブラウザー／CI成功で代用しない。

再現コマンド（外部のPlaywright/Chromiumを環境変数で指定）：

```sh
node --test works/ambertime/tests/market-ui-main.test.mjs works/ambertime/tests/formal-copy.test.mjs works/ambertime/tests/market-rules-ui.test.mjs
node --test works/ambertime/tests/store-market-main.test.mjs works/ambertime/tests/reputation.test.mjs
node --test works/ambertime/tests/market-compact-browser.test.mjs works/ambertime/tests/market-rules-browser.test.mjs
node works/ambertime/tests/market-wrap-browser.mjs
node works/ambertime/tests/map-initial-display-browser.mjs
node works/ambertime/tests/map-counts-browser.mjs
```
