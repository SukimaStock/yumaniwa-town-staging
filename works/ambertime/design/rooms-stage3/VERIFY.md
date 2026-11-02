# 三室の操作整理 — 第3段階

基準は第2段階公開済み main `ff02e309a0edeab422b5b7364b4f3bb5bebc31eb`（#757）。実装前の単一r0 Lockは `.change-plans/ambertime-rooms-stage3/r0.lock.json`、先行ローカルcommit `673ebaa7`。本編の下部反応と資金停止の表示だけを整理する。Production・正式計算・保存形式は変更しない。

## 下部文章の監査

| 現在の文章 | 意味と対応 |
| --- | --- |
| 任意の `room-feedback` | 熟成変化・客の反応を既存詳細へ開く入口。短文は1行、長文だけ省略＋全文への既存操作を採用 |
| 蒸留結果・樽選択 | 第1段階の統合画面を維持。正式な数値と判断を省略しない |
| 資金停止の判断 | 金額と操作が必要なので既存モーダルの全文表示を維持。名称だけ下記のとおり修正 |
| 保存失敗・他タブ競合 | 重要な停止理由として全文を維持。Canvasの優先表示も更新 |
| 世代交代・期限・重要な申し出 | 判断に必要な既存ポップアップ・通知を維持 |
| 自動樽詰め／瓶詰め・月次販売など | 確定数値を含む既存通知の全文表示を維持。任意反応用の省略関数へ通さない |
| 古い採取方式を続けている表示 | 互換状態を説明するため保持 |

現在の通常販売室は `marketMode` により `room-feedback` 自体を描画しない。ここへ新しい反応領域は追加しない。今回のコンパクト化は、実際に残っている貯蔵庫の反応と既存互換表示の入口に限定する。販売室の数量・−n・瓶移動・配置領域は変更しない。

## A・B・Cの比較と採用

| 案 | 比較結果 |
| --- | --- |
| A：短い文章を1行静止 | 短文には適切。そのまま全文を表示し、時間待ちも追加操作も不要。長い3項目の熟成変化は同じ幅の1行へ全文を収められない |
| B：長文のみ省略＋既存全文 | 採用。原文の最初の変化と末尾の省略印、既存のピクセルchevronを表示。既存の樽詳細を開くと反応全文が読める。短文はAと同じく全文の1行表示 |
| C：ゆっくり横スクロール | 不採用。下記の実測幅で12 logical px/秒を仮定すると末尾の表示まで約26.5〜31秒。これは比較用の速度仮定で、製品へ実装した時間ではない。既存の任意タップで全文を読めるため、自動移動・待ち・停止操作を増やす必要を認めなかった |

長い比較文は正式な記録から作る。既存の6か月時点で試飲し、49か月まで熟成した同じ樽で「前回から：香りが落ち着いた · 木の余韻が増した · シゲキがやわらいだ」が発生する。成分や記録を捏造していない。

同じ文の変更前69 logical px・Aの1行表示・Bの省略表示を画像比較する。Aの長文比較画像は、1行に全文が収まらないことを示す検証用描画であり、無言の切捨てを本編へ採用するものではない。

| 幅×高さ | 本文の利用幅 | 長文プレビューの実測幅 | 54 logical px の実タップ高さ |
| --- | --- | --- | --- |
| 360×568 | 279 logical px | 651.04 logical px | 47.92px |
| 375×620 | 279 logical px | 596.44 logical px | 52.31px |
| 390×680 | 279 logical px | 621.50 logical px | 57.38px |

フォントの物理ドット数は既存の画面・DPRに合わせるため、正規化した文字幅は画面サイズにより変わる。文字を縮めて1行へ押し込めていない。矩形は x18/y447/w324 のまま、高さだけ69→54へ整理し、他の道具・ナビゲーションを移動しない。全対象で44px以上のタップ高さを維持する。

先頭の冗長な文脈で味が見えなくならないよう、貯蔵庫の**表示用プレビューだけ**、既知の派生名 `たる No.1` を `No.1` とし、`sample` の既知接頭辞 `前回から：` を省く。最初の「香りが落ち着いた」が省略されずに読める。全文・native buttonのaccessible name・樽詳細・記録は変更しない。客の文章や任意の名前をこの置換へ通さない。

`feedbackLine` は純粋な表示関数。文字を1行へ収めるだけで、原文はnative buttonと既存詳細へ残す。貯蔵庫の入口→既存inspect→`#cask-feedback` の全文一致を実際にタップして確認。客の反応の既存 `openFeedbackRelease`→`.release-comments` も構造を維持し、新しい全文画面や必須操作を追加しない。

## 「瓶詰めの費用を残す」の意味

`partner-orders.mjs` の `reserve` と `requestFunds`、`tickDistillery`、既存のquoteを調査した。

- 対象は、現在の**全樽の残量をすべて瓶詰めする費用の合計**。
- 未樽詰めの原酒があれば、最安樽（通常£100、自動蒸留中は選択済みの樽）の費用と、その原酒からの将来の瓶詰め費用も加える。
- 蒸留中の将来瓶数は最大40Lを用いる既存の保守的な見積り。今回この計算は変更しない。
- 瓶詰め費用は0.7L瓶1本あたり£3。`D.quote`、`E.quote`、`M.bottleQuote` の値は一致する。
- これは資金口座への留保、予約支払、追加の現金控除ではない。月次を試算し、その後の残高が必要額を下回る場合に月次を元へ戻し、重要な資金判断を出す停止閾値。
- プレイヤーは既存の「ビン詰め」から回収を検討する。契約中なら既存の解除・出荷に関する情報と操作を維持する。

合法な本編記録では、105か月目に **所持金£120、必要額£120、維持費£12/月、今瓶詰めできる40本の費用£120** となる。現在の瓶詰めが不可能なのではなく、次月の維持費を払うと必要額を下回る。そのため見出しは **「次月の資金不足で停止」**、本文の既知の先頭 `瓶詰め予約 £` は **「必要資金 £」** とした。所持金・維持費・出荷月数・契約の事実と数値はすべて維持する。3樽の別の合法な例では必要額£423が各樽£141×3と一致する。

変更は既存のlive UIアダプター `agingEventText` だけ。`id=funds` と完全一致する既知のシステム見出しに限る。本文ラベルは既知の文頭だけを置換し、他の文章に含まれる語を一括置換しない。正式なpendingのtitle/text/options、origin、費用、閾値、月次処理、セーブ・再生は旧来のまま。

実在するV08の2つの旧保存fixtureには、既知の見出しで本文が空のfundsがある。空の本文へ金額を作らず、表示見出しだけ同じ改善を適用する。正式な復元処理が生成する現行の本文も適切に表示し、元のoriginと正式保存は変えない。

## 重要通知の描画順

他タブ保存競合の既存handlerは `suspend()` 内で描画した後、`storageNotice` のDOM文字を更新するだけだった。このため、重要通知がDOMに現れてもCanvasの任意反応が古い表示のまま残った。

通知文字をセットした後に既存 `render()` を一度呼ぶだけの修正で、全文の停止通知をCanvasにも反映し、任意の反応は既存の優先条件に従って隠す。ゲーム代入、保存、canSaveの判定、時計、schedule、タイマーは追加しない。実際のstorage-event handlerで、全文・反応非表示・live game／保存の完全一致を検査。

## 検証

- 関連Node **66件成功**：新しい表示・旧funds・全文保持、既存第1・第2段階、Canvas配置、feedback0253、販売・正式保存のUI回帰。
- Chromium・Linux WebKit 各 **21観測成功**。360×568、375×620、390×680、通常motion／reduced-motion、実Canvasとnative buttonの実タップ、全文への既存導線、fundsの全文と数値、既存瓶詰め入口、重要storage通知、modern販売室の非追加を確認。
- 元の原酒・熟成結果・正式な金額・保存は、表示操作の前後で完全一致。正式なモデル／保存・時計・費用モジュールに差分なし。
- `flavor-feedback-0254.test.mjs` は別途実行し **6件成功・1件失敗**。残る1件は、現在のCanvas全体を古いcommit `74d845cf` とバイト一致させる旧pin検査（同ファイル18行）。基準mainでも既に失敗していることをrootが確認した既知の状態。検査は変更・弱化せず、今回の成功件数へ含めない。
- Scope → Risk → Impact は同じ先行Lockの範囲で成功。CIと公開結果はPRの追記を参照。

再現例：

```sh
node --test works/ambertime/tests/rooms-stage3.test.mjs works/ambertime/tests/rooms-stage2.test.mjs works/ambertime/tests/rooms-stage1.test.mjs works/ambertime/tests/canvas-layout.test.mjs works/ambertime/tests/flavor-feedback-0253.test.mjs works/ambertime/tests/market-ui-main.test.mjs works/ambertime/tests/formal-copy.test.mjs works/ambertime/tests/market-rules-ui.test.mjs
AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/headless_shell node works/ambertime/tests/rooms-stage3-browser.mjs
AMBER_TOOL_ENGINE=webkit AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_WEBKIT_EXECUTABLE=/absolute/webkit-wrapper node works/ambertime/tests/rooms-stage3-browser.mjs
```

`chromium/results.json` / `webkit/results.json` は測定と正式保存一致の記録。画像は同じディレクトリ。

| 比較 | 画像 |
| --- | --- |
| 変更前の3行枠 | `375-long-before.png` |
| Aの長文比較／B採用 | `375-long-A.png` / `375-long-B.png` |
| 短文は静止全文 | `375-short-B.png` |
| 既存詳細の全文 | `375-existing-full-detail.png` |
| 資金案内の変更前後 | `375-funds-before.png` / `375-funds-full-popup.png` |
| 重要な保存競合の全文 | `375-critical-storage-full.png` |

## キャッシュと未確認

HTML→shop-app→Canvas→canvas-layoutと、ui-textを読むapp／Canvas／cask-detail／flavor-feedbackの参照を `rooms=stage3-r1` で更新。変更していない正式計算・道具・色・バー・市場の依存は維持する。古いCanvasを新しい入口から再利用する#743の問題を避ける。

実機iPhone Safariは未確認。実指での全文入口の分かりやすさ、Safariバーの開閉や文字拡大時の重要モーダル、実際の読書感覚を確認する。Linux WebKitの成功を実機検証とは扱わない。Productionは変更しない。
