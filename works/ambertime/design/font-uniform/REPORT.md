# AmberTime — フォント監査 第1段階

基準: main `1fa5383b29004de406fbd77da7ed398456ce29af`（配分版正式採用 #642、報告 #643）。単一サイズの採用判断は保留する。現在の本編に、表示だけを切り替える比較モードを追加した。

- 通常: https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/
- 比較: https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/?font-uniform=1

## 共通サイズの決め方

`BODY_SIZE=20` と既存の `pixelTypography()` を正本にした。Canvasは360×640の論理座標を画面へ合わせたあと、文字だけを物理ピクセルへ描き直す。字体は既存の美咲ゴシック第2。フォントファイル・読み込み処理は未変更。

```
scale = min(画面幅 / 360, 画面高 / 640)
unit = scale × 既存CanvasのDPR
fontPixels = max(8, round(20 × unit / 8) × 8)
HTMLのCSSサイズ = fontPixels / DPR
```

既存CanvasのDPRは1〜3に制限される。美咲の8ドットのemを整数倍にする既存丸めを再利用しており、文字画像の縮小やCSS transformは追加しない。

| 条件（高さ844px） | Canvas通常文字の物理サイズ | 比較版のCSSサイズ | 1ドット |
|---|---:|---:|---:|
| 360 / 375 / 390px、DPR3 | 64px | 約21.3333px | 8物理px |
| 390px、DPR2 | 40px | 20px | 5物理px |
| 390px、DPR1 | 24px | 24px | 3物理px |

比較版の行間は10ドット。DPR3では80物理px＝約26.6667 CSS pxになる。CSSの小数値は、画面上の整数ドットをCSS単位へ換算した値である。

`国 A g 0 1 2 £ ％ L 本` をDOMとCanvasで描き、5条件・50字形について余白を除いた白い字形マスクが完全一致した。日本語、英数字、通貨、記号、単位の字の粒を確認した。HTMLの字送り・行の原点にはブラウザーのレイアウト処理があるため、行全体の座標一致は要求していない。[測定結果](raster-results.json)

## 現在の指定と優先順位

`shop.css` → importされた `usual.css` など → `room-scene.css` の順に既存指定が重なる。比較専用CSSはその後に読み、モード属性がある場合だけ適用する。

| 対象 | 通常版の指定・最終表示 | 比較版 |
|---|---|---|
| Canvasの通常文字 | 論理20、ヘッダーは必要に応じて縮小 | 論理20の共通実サイズ。ヘッダーも縮小しない |
| Canvasの棚本数・短い原酒表示・風味文 | 論理16 | 同じ共通実サイズ |
| Canvasのカウントダウン | 論理48 | 同じ共通実サイズ |
| 小窓本文・多くの見出しやボタン | `room-scene.css` の24px / 32px `!important` が優先 | 同じ共通実サイズ |
| 入力欄 | 20pxのsystem font。selectは小窓側24px指定 | 同じ美咲と共通実サイズ。未収録字は既存font stackのfallback |
| 配分の補助情報・価格・結果文 | 個別指定と小窓の強い指定が重なる | 同じ共通実サイズ |
| メニュー地図・通常通知・エラー | 個別指定、小窓指定、通知のinline指定が混在 | 同じ共通実サイズ |
| 記録選択 | 小窓の外にあり、18px本文・24px見出し・16px補助 | 同じ共通実サイズ |

通常版の実測DOMサイズは13 / 16 / 18 / 20 / 24pxと、Canvasに合わせた自動通知の約21.3333px。今回の29場面では未使用のmilestone用28px指定も既存CSSに残っている。比較用セレクターはその見出しにも優先する。Canvasは390px/DPR3で56 / 64 / 160物理pxが使われた。比較版では、実際に描いたCanvas文字がすべて64物理px、表示中のDOM文字がすべて約21.3333 CSS pxになった。[画面別の実測](results.json)

## 実装範囲

`font-uniform.mjs` が一時的なモード判定と共通メトリクスを持つ。既存のresize処理からCSS変数を更新し、描画・計測・折返し・行間を同じ値へ接続した。新しい時計や常時アニメーションは追加しない。現在の本編にある比較用stylesheetの識別子も確認し、古いHTMLやLabから共用Canvasを呼ぶ場合は有効化しない。

`font-uniform.css` は主小窓、記録選択、入力欄、通知、エラーなどの文字のrootを明示し、既存の2 ID・`!important`指定より強い比較専用セレクターを使う。SVG内部を除外し、×や店舗アイコン、瓶・たる、地図などの絵は変えない。入力欄に残っていたsystem font指定も、比較モードでは現在の美咲へ揃える。

通常のCSS3ファイル、字体データ、フォントローダー、文字列、句読点、ゲームモデル、時計、保存処理・保存キーは未変更。通常と比較で同じ `main.v1` を使い、モードを保存しない。queryを外せば通常表示へ戻る。既存の配分・取扱店・保存の引きつぎ操作は共通のまま。

## 比較画像

各画像は**左が通常、右が単一サイズ**。390×844 CSS px・DPR3、同じ正規操作で作った状態を左右に並べた。画像は元の物理ピクセルのまま、補間・縮小なしで保存している。

| 場面 | 比較 |
|---|---|
| 蒸留室・仕込み | [通常時](comparisons/distill.png) / [仕込み](comparisons/brewing.png) |
| 蒸留中・完了 | [カウントダウン](comparisons/countdown.png) / [蒸留中](comparisons/distilling.png) / [たる詰め](comparisons/fill.png) |
| 貯蔵庫・試飲 | [棚](comparisons/warehouse.png) / [詳細](comparisons/cask-detail.png) / [試飲](comparisons/tasting.png) |
| ビン詰め | [入力](comparisons/brand-input.png) / [数量・費用](comparisons/bottling.png) |
| 販売室 | [瓶棚](comparisons/shelf.png) / [配分](comparisons/allocation.png) / [確定結果](comparisons/receipt.png) / [取扱店](comparisons/store.png) |
| 担当者 | [担当者](comparisons/staff.png) / [依頼](comparisons/staff-request.png) / [共通設定](comparisons/common-settings.png) |
| 帳面・比較 | [帳面](comparisons/ledger.png) / [製法](comparisons/recipe-record.png) / [比較](comparisons/comparison.png) |
| 歩み・世代 | [歩み](comparisons/history.png) / [世代案内](comparisons/generation-notice.png) / [引き継ぎ前](comparisons/generation-review.png) |
| 地図・メニュー | [地図](comparisons/map.png) / [メニュー](comparisons/menu.png) |
| 保存・通知 | [保存](comparisons/save.png) / [記録選択](comparisons/save-choice.png) / [自動通知](comparisons/automatic-notice.png) / [警告](comparisons/error.png) / [復旧案内](comparisons/recovery.png) |

通常版は基準checkoutと29画面のピクセルが完全一致した。試飲の比較画像は既存の注ぐ動きが終わってから撮り、演出の途中フレーム差を除いた。[通常版の一致確認](normal-parity.json)

## 観察と判断保留

- **字の粒が近づいた場面**：配分の「手元」・数量・ボタン、試飲、帳面、記録選択。見出しや補助情報も背景のCanvas文字と同じ大きさになる。
- **変化が小さい場面**：蒸留室の通常文字、ヘッダー、棚のブランド名・熟成年数。これらはもともとCanvasの通常サイズ。棚本数と短い風味文は大きくなる。
- **読み分けが弱まる場面**：カウントダウンは他の数字と同じ大きさになり、目立ちにくい。見出し・説明・補助情報の大きさによる差もなくなる。今回は大きな例外を残していない。
- **レイアウト上の変化**：記録選択の説明と「新しく始める」が改行する。ボタンは枠内で2行となり、操作は可能。長い比較記録は引き続きスクロールする。390pxの比較本文は通常222px、単一サイズ95pxのスクロール量になった。
- **次に判断する余地**：カウントダウンや重要な通知に大きさの差が必要か、記録選択の改行をどう感じるか。今回の比較版は全て同じサイズのままにしている。

測定した範囲では、文字切れ・小窓の画面外配置・ボタン文字の横はみ出しは0。最小ボタン高は44pxを維持。長い世代名と極端に大きい資金がヘッダー幅を同時に使う場合、比較版は縮小しないため重なり得る。今回の実データでは発生しなかった。未確認の状態を隠すための縮小例外は追加しない。

## 検証範囲と未確認

- 関連unit8件成功。整数ドットの共有、完全なquery指定だけの有効化、通常モードの非変更、16/48指定の統一、CSS適用範囲、既存の描画・表示キャッシュを確認。
- 360 / 375 / 390px・DPR3で各29場面×通常/比較＝174表示を確認。DPR1/2でも表示メトリクスと96表示を確認。Canvasの描画font、DOMのcomputed size、入力・数量・通貨、枠・ボタン、同じ操作後の保存byte列を照合した。[DPR結果](dpr-results.json)
- 375pxで長い比較のスクロールを実際に動かし、文字を含む入力値「麦𠮷🙂é」が保持され、入力だけで記録が変わらないことを確認。[スクロール・入力](scroll-input-results.json)
- 既存の復旧案内も両modeで確認。[復旧案内](recovery-results.json)
- 通知・警告の診断は既存の表示先に一時的な文字を出す。新しい履歴・ゲーム状態・メッセージ仕様は作らない。世代・担当者の正規fixtureを準備して表示を確認した。長期進行の計算評価や包括的なゲームE2Eは行わない。

実機Safari、VoiceOver、実際のiPhoneキーボード・OSの選択パネル、DPR3超・ピンチ拡大時の描画は未確認。非収録字は美咲の字形比較から除外し、既存fallbackを維持する。単一サイズの正式採用は未決定。Production・旧版・独立Labは未変更。

再現: `node works/ambertime/design/font-uniform/browser.cjs`。基準側は `BASELINE=1 SOURCE_ROOT=<基準checkout>`。DPR1/2の追加確認は `DPR_PROBES=1`、小さな確認は `SCROLL_INPUT_ONLY=1 WIDTHS=375` / `RECOVERY_ONLY=1 WIDTHS=390`。`EVIDENCE_DIR`で出力先を指定できる。字形診断は同じディレクトリの `raster.cjs`。

Scope→Risk→Impact、必須CIと公開版の確認結果は、この変更のPR証拠コメントへexact SHA付きで記録する。Change Verificationの正式状態は契約どおりUNVERIFIED。CI・画面計測を実機確認や作者の採用判断と読み替えない。
