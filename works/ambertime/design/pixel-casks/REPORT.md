# AmberTime — 樽と試飲グラスのドット絵・第一段階

基準main: `8d107ceccd56d7265b46743db0fca47150e2cf5a`。Stagingのみ。現在のコンパクトな情報配置と通常フォントを保ち、本編の樽二種類と試飲グラスだけを変更する。

## Codea原典

Drive `SukimaStock/Code/AmberTime.txt`（[原典](https://drive.google.com/file/d/1cAtwEtLj0DoMbrw7XOwI0XdcA2dopTFi/view)、2026-09-30保存、677,600bytes）を実際に取得した。SHA256: `7d7f64a2237e2cf3bba2211fa1a813545211652b4d48352812e49e83c0496080`。フォルダの親もCode→SukimaStockと確認。

| 原典の処理 | 参考にした点 / 今回の扱い |
| --- | --- |
| `DistilleryAssets.Cask`（14402–14419行） | 16×16、中央が膨らむ段状の輪郭、上下の金属帯、中央の栓、少数色。形を整理し直し、少数の板の継ぎ目を追加 |
| `CaskVisual:_ensurePalette`（6539行〜） | バーボンの木色は影80/50/20・中間180/110/40・明部220/160/80。リフィルは70/60/50・160/150/120・200/190/170。三色の対応を使用 |
| `CaskVisual.draw`（6719行〜） | 棚と詳細で同じ樽を描く考え方を採用。Codeaの品質・熟成札、点滅は移植しない。Webの選択枠と名前を維持 |
| `AssetManager`の`icon_glass`（1075行〜） | 12×12のバー用アイコン。輪郭と中身を別に置く簡潔さを参考にした。現在Webの試飲グラスと同一の実装ではない。Webの容器の輪郭・脚・液体を16×24へ描き直した |
| `WarehouseUI:getLiquidColorIdx` / `Cask:getLabelColorIdx` | Codeaの年数・過熟による札色は採用しない。Webのwood由来の既存4色と閾値・液体の不透明度を保持 |
| `WarehouseScene:touched`（7950行付近） | タップで対象を確かめる処理を確認。Codeaのドラッグ・効果音・モーダル方式を移植せず、Webの選択・試飲・既存の注ぐ反応を維持 |

## 実装範囲

`cask-glass-art.mjs`は本編だけが読み込む。旧版も使う`art.mjs`、蒸留器、販売用ボトル、背景、文字、ボタンは変更していない。終了済みの独立試作・モック・香りアイコンは参照・再利用していない。

樽は16×16、グラスは16×24の整数マスをSVG矩形で描く。ぼかし・モザイク・フィルタ・ノイズ・曲線・グラデーションは使わない。樽は一覧32px、選択中128px、試飲中64px、比較48px、樽選択64pxなど、既存枠の中の整数倍で描く。グラスは通常48×72px、試飲中32×48px。小さい絵でも同じ単純な輪郭と金属帯が残る。透明な部分は背景を透かし、液体を別のグループにした。

新しい演出は追加していない。既存の注ぐアニメーションは同じ時間・条件で残し、新しい座標系に合わせて変形の基点だけを調整した。色の対応は引き続き`wood > .65 / .3 / .1`の4段階で、樽名や味のための新しい対応関係はない。

## 画面・検証

360×740・390×844・1280×900、DPR1と3。実際の公開モデル操作から初期・中期・長期の保存を構成し、同じ保存・文字・ボタンで改善前後を比較する。描画サイズ、三指標・風味タイプ・前回印、キーボードでの選択、試飲・比較・樽選択・再読込、保存分離を確認する。

実機iPhone Safari、OS文字拡大と実物のタップ、読み上げによる確認は未実施。スクリーンショットはブラウザでの確認であり、作者の実機での採用判断を代替しない。

| 使用画面 | 360×740 前 / 後 | 390×844 前 / 後 |
| --- | --- | --- |
| 貯蔵庫・一覧と選択中の樽 | [前](before/360-warehouse.png) / [後](after/360-warehouse.png) | [前](before/390-warehouse.png) / [後](after/390-warehouse.png) |
| 試飲・1年前後 | [前](before/360-tasting-12m.png) / [後](after/360-tasting-12m.png) | [前](before/390-tasting-12m.png) / [後](after/390-tasting-12m.png) |
| 二樽比較 | [前](before/360-comparison-12m.png) / [後](after/360-comparison-12m.png) | [前](before/390-comparison-12m.png) / [後](after/390-comparison-12m.png) |
| 樽選択 | [前](before/360-fill.png) / [後](after/360-fill.png) | [前](before/390-fill.png) / [後](after/390-fill.png) |

[初期のグラス](after/390-tasting-0m.png)、[長期のグラス](after/390-tasting-72m.png)、[DPR3の試飲](after/390-dpr3-tasting-12m.png)、[PCの貯蔵庫](after/1280-warehouse.png)、[PCの試飲](after/1280-tasting-12m.png)も保存した。

検証結果：

- 最初にバーボンと液体入りグラスを実寸で確認し、その後リフィルを展開した。注ぐ反応の変形原点は、旧CSSの強いセレクタを確認したうえで新しい座標へ合わせた。
- `node --test works/ambertime/tests/*.test.mjs`: **567/567成功**。既存564件＋整数図形・旧液色との境界互換・二樽とsampleグループの3件。
- `tests/pixel-browser.mjs`: **4組の画面幅/DPR、44状態・192物体**で成功。[前](before/browser-results.json)と[後](after/browser-results.json)に一致するfixture hash・ソースhash・画像hash・寸法・操作結果を記録。
- 初期はバーボン1か月／リフィル0か月、中期12／11か月、長期72／71か月。一月一仕込みの現行動作を守り、長期の資金は8回の実際の瓶詰め・販売で確保した。資金・風味・年数を直接注入していない。
- 360px貯蔵庫の主要操作下端は約683→669px、試飲の瓶詰め下端は約726pxで不変。通常文字とタップ領域を維持し、ページスクロールは増えていない。中央配置のモーダルが短くなった場合は、画面内到達性とモーダル内の相対位置で比較した。
- 既存`compact-browser.mjs`も360×740・390×844・1280×900で成功。販売・製法・入力保持・停止再開・旧保存・世代交代後・破損保存復旧・文字拡大・保存分離を確認。
- SVGの幅・高さは整数倍率。既存中央配置の原点には端数があるため、全原点の整数整列は主張しない。`crispEdges`、整数矩形とDPR1/3の実画面を確認した。360pxと390px/DPR3の試飲素材内の実PNG色数は背景込みで樽6色・グラス5色のみで、輪郭の中間ぼけ色は生じていない。
- 独立レビュー：原典・液色・旧版の参照分離・既存反応・情報配置を照合し、阻害する回帰なし。モデル・経済・保存・旧素材・独立試作に差分なし。
- 表現監査：新しいコピー・見出し・説明・装飾枠・香りアイコンは追加していない。通常フォント・対象の名前・タップ領域を保持。

再実行：`AMBERTIME_CHROME=/tmp/chromium node works/ambertime/tests/pixel-browser.mjs`。改善前の幾何情報を比較する場合は`AMBERTIME_BASELINE=works/ambertime/design/pixel-casks/before/browser-results.json`。公開確認では`AMBERTIME_URL`と`AMBERTIME_OUTPUT`を指定して既存証拠を上書きしない。
