# 器と食卓 Generator Lab 0.1 — 検証

## 範囲

active / staging-only。既存Postcard Generator、町の共通runtime、Productionは変更しない。
Plan Lock: `.change-plans/tabletop-generator-lab-01/r0.lock.json`。実装前commit `d44be5b`、base `cf5da34295c103d793738cd37c6f916751cb4945`。

## 比較

`review/` に36seed（真上review-01〜18、横review-19〜36）、原画・印刷風・水彩画風の同seed比較、360/375/390pxのiframeを用意。

- 真上 review-01 / cream / few：大皿と布、カップの離れと余白が読み取りやすい。
- 真上 review-11 / cream / normal：右端で切れる大皿と左の器のまとまり。切れは意図したデータ。
- 横 review-34 / cream / few：瓶と低いボウル、広い背景で高さの差が見える。
- 横 review-30 / teal / many：果物の盛り上がりと手前の皿で奥行きが出る。
- 横 review-36 / rust / many：梨が続き輪郭が似るため、識別しにくさを作者に確認したい。配置違反ではないが美的採否は保留。
- 真上 review-03 / rust / many：初回比較で果物3個の輪郭が接続。多めを不規則な五角形へ変更し、果物間の間隔検査を追加した。

影なしの原画から確認。質感の比較では傷みや汚れに見える強い斑点を加えず、色面ごとの淡い白抜きと紙粒に限定。布の座標変換による素材の途切れを独立レビューで発見し、素材インスタンスの座標を修正した。PNG素材は各1回だけSVGへ内包し、内部参照で再利用する。

## 検査

- `node --test works/tabletop-generator/engine.test.mjs`：6件成功。36seed×2視点×3密度×5配色＝1,080条件の皿内包含、親子関係、意図したクロップ、順序、支持面、JSON完全再現、質感間の形状一致、SVGのID・安全性・内包素材一致、布全域への素材適用。
- `node --test tests/test-work-lifecycle.cjs`：24件成功。
- Scope → Risk → Impact：PASS。既存共有契約の拡張なし。台帳と生成LAB以外の共有側変更なし。
- 独立レビュー：LABアンカー、モバイル入力文字サイズ、布の素材領域を修正。構図・保存処理・XMLエスケープを再確認。
- Chromeで360/375/390px iframeを表示・操作。横はみ出しなし、選択操作・6枚比較を確認。物理iPhone/Safariは未確認。
- Chromeで水彩PNGを実保存：PNG署名、1800×1440pxを確認。設定JSONを実保存後、新しい絵を生成してから読込み、元のseed・配色・質感へ復元。
- ローカルHTTPプレビューのSVG保存通知は出るが、Cloud Browserのdownloadイベントが取得できず、ローカルからのSVG実ファイル受信は未確認。PNGとJSONの取得は成功。Staging HTTPSで再確認する。

## 表現監査

タイトル、選択ラベル、操作ボタン、最小限の状態通知のみ。副題コピー・導入カード・架空の制作意図・総括を追加しない。ラベル、フォーカス、画像名、素材出典は維持する。

作者の美的採否・実指の触感・実機Safariは未確認。CI成功をこれらの代用にしない。現在の正式verificationStateはUNVERIFIED。
