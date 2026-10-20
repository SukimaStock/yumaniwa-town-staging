# Codea樽・瓶の移植（Stagingのみ）

原典: Google Drive AmberTime.txt（source-reference.jsonのURL、更新2026-09-30T01:45:05.043Z）。比較元Webはmain e24d2145144d9beb21d3137e13f2421620805192 / PR555。原作コードから抽出した行列を独立に描画し、移植後の実Canvas sprite painterのRGBAと比較した。原作Codea実機アプリのスクリーンショットとは区別する。

| 原作参照 | 内容・使用条件 | 今回の対応 |
| --- | --- | --- |
| DistilleryAssets.Cask 14402–14419 | 16×16、正面の広い鏡板、上下の金具、中央の栓、透明な外周 | 全256セルを保持。回転・加筆なし |
| CaskVisual 6539–6582、6610–6684 | 共通Caskを優先、10/11/12だけ木材色へ置換 | Bourbon / Refillを原作色で共有。その他の木材をゲームに追加しない |
| BottleStandard 14469–14482 | 12×12、通常瓶、緑の蓋・灰ラベル | Webの通常瓶へ。無指定も同じ |
| BottleFancy 14485–14498 | 12×12、丸い胴・金ラベル | 元データとレンダラを収録、既存ゲームへ新選択肢は追加しない |
| BottleSquare 14502–14515 | 12×12、角形 | 同上 |
| BottleTall 14519–14532 | 12×12、細長い瓶 | 既存slender指定の描画に対応 |
| BottlingScene 3511–3517 / InventoryScene 16301–16315 | Square/Tall/Fancy指定、既定Standard。InventoryはshapeName優先、未指定でmaterialRank90以上Fancy/60以上Square/その他Standard | Web保存形式・価格・瓶詰め処理は変更せず。現在の製品作成は通常瓶のみ、既存描画引数のslender対応を保持 |
| GameRenderer 5197以降、Config.Color 5111–5112 | 銅20=#b87333、液体21=#c89632 | 元の蓋・ラベル・液体パレット保持 |

瓶を16×16へパディングしたり、12×28の旧Web瓶に合わせて再描画したりしない。全データは凍結配列で保持し、着色セルを1×1矩形で一度だけ出力。SVGとCanvasで共有し、拡大補間なし。Canvasでは120×214の既存ワールドに元寸法で描画。モーダルの当該SVGだけ原画1セル=3CSS pxとし、元配列と分離。棚・操作ボタン・コンテナ寸法は変更しない。透明な末尾行を消さず、data-content-bottomで既存の棚へ接地する。

瓶の変更色は番号9のガラスだけ: #29adff → #8f9a7d。透明度や黒枠を加えない。Standardの緑の蓋4、灰ラベル7、Fancyの金ラベル6、Tallの暗い蓋10、液体21は原作色。旧Webの木材による液色変更・paper/darkによるラベル変更は描画から除去し、原作色を優先。保存値・ゲーム処理には触れない。現mainに外観選択UIは存在しない。

## 実描画の比較

comparison.pngは左から名称、原作行列描画、旧Web、移植後。各1セルを同じ4表示pxで表示するため、旧12×28瓶を12×12へ押し込んでいない。source/after-native.pngは原寸16×16または12×12。before/afterの390×844 touchと1024×768画像は同一seed42・保存・時計・操作条件。

| 確認 | 結果 |
| --- | --- |
| 樽の横置き・正面の鏡板 | 原作形状を保持。旧Web独自の縦の継ぎ目・黒い外周を除去 |
| 樽の配置・配色 | Bourbon / Refillとも256セル一致、RGBA差0 |
| 瓶4種の形状・配置 | 各144セル一致。実Canvasの色差は番号9のみ。Standard22 / Fancy20 / Square28 / Tall18セル |
| 不要な拡大・補間 | 元データ変更0。原寸描画・nearest表示。既存ワールド全体の画面フィット倍率は維持 |
| 小表示・棚への接地 | 390縦/1024PCの貯蔵庫・販売室・商品・樽選択で欠け/重なりなし |
| 樽選択・瓶詰め・販売開始・樽詰め | 両画面サイズ、変更前後とも成功、pageerror0 |
| 保護対象 | 蒸留器/管/受け器/試飲グラスのmarkupはmainと同一。操作領域・棚等のアンカー・HUD/フォント・比較時保存bytes一致 |

18件の限定テスト成功。原作行列の独立抽出ハッシュと全セル比較、実CanvasのRGBA比較を含む。browser-results.jsonとpixel-results.jsonに証拠。独立読取レビューで阻害なし。必須CI・配信確認はPR上のexact head/merge SHAを参照する。Scope/Risk/Impactを実装commitで照合する。表現監査6項目を確認し、作品内の文章・装飾・操作案内追加なし。

原作CaskVisualの任意の影・状態タグ・装飾帯・選択枠、瓶の価格/材質/ラベルランク追加演出は移植しない。今回は元のスプライトをそのまま使用し、Web既存の選択表示等を維持する。Fancy/Squareは移植済みデータ・描画比較までで、ゲームへ新たな瓶種/使用条件を追加していない。原画セルとの未解決の形状差はなし。指定したガラス色差、既存ゲームの種類の範囲、全画面の倍率は上記の通り。物理iPhone Safariと作者の最終採否は未確認。verificationState=UNVERIFIED。Production変更なし。

再現:
```sh
node --test works/ambertime/tests/codea-object-art.test.mjs works/ambertime/tests/room-object-art.test.mjs works/ambertime/tests/visual-polish-art.test.mjs works/ambertime/tests/pixel-art.test.mjs works/ambertime/tests/canvas-layout.test.mjs
AMBER_CODEA_SOURCE=/path/to/AmberTime.txt node works/ambertime/design/codea-cask-bottles/pixel-review.mjs
node works/ambertime/design/codea-cask-bottles/browser-review.mjs
```

原作コードの広範な抜粋を含む初期のsource-reference.jsonのGitHub blob作成は、自動承認レビューが外部開示の許可不足として拒否した。抜粋を公開せず、参照情報と元行列の照合ハッシュだけへ縮小した。独立比較の再現にはDrive原本をローカルで指定する。依頼された移植対象のピクセル配列は実装内に保持する。
