# AmberTime A6 — 店舗会話の共通シーン表現

## 範囲と判断

自動表示の店舗会話だけを、既存Canvasの通知窓と同じ座標・文字計測・配色へ接続した。描画はアクセシブルなDOMを残し、CanvasSceneの360×640論理座標から投影する。店名モーダルの承認済み表示は変更しない。

基準main: `44404305a56f421f14203c17f9ff8c6bdabb0f19`。Plan-only: `ce46c75ac6419c68537106bffbe43ec9964cd165`。Linux / Node v24.22.1。
作者のA6添付を根拠に、自動検証後のStagingマージ対象。Productionへの変更は行わない。**実ブラウザーの見た目・タッチ・iPhone Safariは未確認**であり、自動テストを実画面の受入と扱わない。

## 表示監査（コード上の比較）

共通本文はAmberMisaki 400、論理20pxを物理8px画素へ丸める既存方式。以下は実画面の観察ではなくソース監査。

|役割|場所・文字|色・枠・余白|時間・入力|
|---|---|---|---|
|A 一時通知|Canvas notice、automatic-news。共通フォント・共通計測|背景 #2e3143、枠 #858995、文字 #f0e6c8、影 #19141e。論理3px枠・9px余白|automatic 3500ms、Canvasは状態依存。受動表示|
|B 店舗・町の台詞（変更前）|body固定、画面下86px。見出し.8em、本文行高1.6|緑 #242b26、1px枠 #77715c、12×14px余白、画像48px|6500ms、pointer-events:none。重要操作時延期。店モーダルは別|
|C 操作結果|販売数差分・瓶点滅・販売強調、sr-only結果|金 #f7cd58／#e4bc66、枠なし|差分650ms、瓶300ms、flash160ms、売上1300ms。追加通知なし|
|D 読む情報|店詳細・帳面・担当者・管理dialog|共通背景・枠・影。外12px、本文0 3 8px。共通文字|自動消滅なし。入力・スクロールあり|

参照: canvas-layout.mjs / canvas-scene.mjs / room-scene.css / event-notices.mjs / market-ui.mjs / market.css / shop-dialogue.css / shop-app.mjs。

## 採用した規則

- NOTICE_WINDOWを既存通知と共有し、本文折返しもnoticeLayoutを再利用。常に全文を残す。
- 同じCanvasSceneのフォント計測・物理画素丸め・viewportを使用。横336、論理余白9、枠3、日常は文字のみ。記憶は共通packageArtを48論理pxで表示。
- 原稿9文、発行条件・頻度・選択、販売・経済・乱数・正式保存・歴史・回想・Eパッケージは無変更。
- 通知は下部管理・部屋移動より上に置き、現在の操作矩形、販売ボード、蒸留器／進行表示を避ける。空きがなければ延期。過密画面では即表示を保証しない。
- 既存の重要モーダル、試飲、瓶詰め、世代交代、保存警告等の優先を維持。
- 6500msで自然消滅。台詞領域のclick／Enter／Space／Escapeで消す。pointer系列を消費し、clickを消費してから非表示とする。背後の操作へ流さない。フォーカス表示と台詞を含むアクセシブル名を付与。新しい可視ボタンや閉じ方の説明は追加しない。
- 新しい台詞だけを保持。同月再表示、古いタイマーの復活、import後の通知混入を防止。表示と別の店詳細の最新台詞は保持。
- room切替時は古い描画済みhit領域を使わず最新layoutを見る。描画時の空間不足も通知制御へ戻し、見えないまま寿命だけが進むことを防ぐ。
- 既存クライアントに不完全なJS/CSS組合せが残らないよう変更した入口と依存URLを更新。

## 検証結果

- 保存・台詞・配置の自動回帰81件成功: formal-save, placement-save, recall-save, s1-slot-save, s3-save, s4-save, shop-dialogue, shop-dialogue-view, shop-dialogue-a6, canvas-layout。
- A6新規14件: 4狭幅＋PCの論理投影、日常／記憶、操作領域回避と延期、タイマー無効化、同月重複、最新置換、入力消費、URLと読み上げ本文。
- 必須UI 3ファイルは32成功・5失敗。同じ5件が基準mainの独立作業ツリーで再現。既存期待値は変更していない。
- 既存失敗: contextual staff/ledger labels; cache reader chain; main projection rules closure; native market exact conditional save; quota/conflict receipt publication。
- Plan Lock、Scope、Risk、Impact、JS構文・diff whitespace検査成功。
- Chromiumはページ表示前のsocket制限により起動不可。実画面、実click-through、スクリーンリーダー、狭幅の実表示、reduced-motion実表示は未確認。ブラウザーテストのskipは成功に含めない。
- ブラウザー受入テストは隔離preview用。安全制限を解除しない起動へ変更。記憶fixtureは合成の視覚試験であり自然発生とは区別。

## 再現

```
node --test works/ambertime/tests/{formal-save,placement-save,recall-save,s1-slot-save,s3-save,s4-save,shop-dialogue,shop-dialogue-view,shop-dialogue-a6,canvas-layout}.test.mjs
node --test works/ambertime/tests/{market-ui-main,formal-copy,market-rules-ui}.test.mjs
AMBER_BROWSER_MODULE=/absolute/playwright/index.mjs AMBER_BROWSER_EXECUTABLE=/usr/bin/chromium node --test works/ambertime/tests/shop-dialogue-browser.test.mjs
```

## 作者の最小確認

1. 360×568 / 375×620 / 390×680 / 430×740とPCで、日常・記憶の文字／箱の画素、折返し、窓の位置を確認。
2. 6.5秒の消滅、台詞タップだけで閉じて背後が動かないこと、周囲の操作が使えること。
3. 重要操作時は台詞が退き、店詳細で最新台詞を読めること。過密画面では延期される仕様を確認。
4. 再読込で同じ台詞が自動再送されず、保存内容が変わらないこと。
5. Safari実機、keyboard Enter/Space/Escape、読み上げ、reduced-motion。未確認を成功としていない。

巻戻しは本PRの表示変更をrevert。保存移行不要。

## 最終確認・未完了の公開工程

独立レビューで見つかった「renderを伴わない販売警告」の優先表示も、automatic-news/storage-notice/scene-noticeの変更監視で即時に台詞を退避するよう修正。最終の台詞・A6・Canvas・文字・入力40件成功。販売・remarks・packageの追加33件成功。

GitHub pushは実行許可の審査で拒否された。作者添付のStagingマージ許可原文を再提示した1回の再試行も同理由で拒否。外部操作を迂回せず停止しているため、**この時点ではPR未作成・必須CI未実行・マージ未実施・Pages未反映**。ローカル自動テストの成功をCIや公開の成功と扱わない。
