# AmberTime リファクタリング計画・第1弾

基準main: `23f20504f81282c5c9161995758660be092156dc`（PR #767）。2026-11-02の構造監査。実装・Lab分類変更・移動・削除は行わない。関連: [構造監査](STRUCTURE-AUDIT.md)、[Lab棚卸し](LAB-INVENTORY.md)、[検証基準](BASELINE-TESTS.md)。

## 判断

最初に表示専用の小さな境界と蒸留道具の座標を整理する。既に分離済みのviewを再統合したり、行数削減のために正式モデルを分割し直したりしない。`shop-app.mjs`は182,628 bytes・直近44変更、正式モデルの`partner-orders.mjs`は140,287 bytes・直近3変更（2026-10-27以降のpath commit数）。変更頻度と保護コストからUI側の改善を優先する。

`render → syncModal`は表示だけではない。担当者・店の申し出・世代交代の正式notice操作と保存を実行する。まず描画用データとマークアップだけを取り出し、割込優先順と正式操作の発行元はrootに残す。保存処理も失敗時の振る舞いが異なるため、同じ形に見えるという理由で一括共通化しない。

## 候補比較

高/中/低は定性的評価。既存の失敗を含むため「テストあり」は全緑を意味しない。

|候補|複雑さ/変更頻度|波及・保存影響|既存保護|効果|実装リスク|優先|
|---|---|---|---|---|---|---|
|表示用projection・純粋変換を一部分ずつ抽出|高/高|DOM→Canvasの二重変換。正式操作を含めないなら低|view・copy・formal-save、画面基準は補強要|重複した表示判断と修正箇所を減らす|低〜中|1|
|レバー・グラスのgeometry統一|中/高|描画・hit・gestureへ横断。正式量計算は対象外|tool input/layout/cut、ブラウザー確認要|複数箇所の座標同期を減らす|中|2|
|蒸留室controller、次に貯蔵庫controller|高/高|clock/save/modalを巻き込むと高|room/input/formal操作回帰|画面ごとの操作責務を閉じる|中〜高|3|
|モーダルの表示familyとdraft/focusの分離|高/高|notice発行順・保存・取消へ波及|modal/staff/save、順序fixture要|巨大分岐を段階的に減らす|中〜高|4|
|Canvas lifecycle/cacheの整理|中/高|再描画頻度・非表示・font・a11y|layout/motion/render-power、cache旧期待値あり|不必要な再描画と更新漏れを調べやすくする|中|5|
|candidate保存helper|高/中|rollback/競合/通知確定、正式保存へ直接影響|formal/placement/save failure|重複の意味を明示できれば有効|高|任意・後段|
|正式モデルの分割|高/低|乱数・月次順序・旧再生へ最大波及|厳密再生・多数旧fixture|現時点で具体的利益が薄い|高|保留|

## 小さなPRへの分割

全PRを個別の最新main・事前Plan Lock・Scope→Risk→Impact・独立レビュー・exact head CIで扱う。下記は承認済み実装ではなく候補計画。先行作業の結果で利益が薄ければ見送る。

|PR候補|目的・対象ファイル|分離する責務|変更しない領域|リスク|必要な検証・完了条件|先行作業|
|---|---|---|---|---|---|---|
|R0 基準の固定と失敗の切り分け|`tests/`の既存保存fixture・UI harness、`design/`の現行証拠。必要な基準だけ追加|正式操作列、失敗rollback、割込順、三室画面の比較条件|既存期待値・CI条件・runtime|現在の不具合を正解として固定する危険|既存失敗を原因別に分類。仕様変更が必要な修正は別PR。新旧保存・冷再生・通知順・3幅の基準が再現可能|本監査。現行失敗全件を「過去のもの」で済ませない|
|R1 表示projectionの一部分|`shop-app.mjs`、既存viewまたはwork内の小さなview module、対象テスト、`index.html`等の必要な参照のみ|最初は一室の一表示。金額/名前のescapeや既存viewは必要時のみ|イベント登録・正式操作・通知順・保存・clock|DOM/a11yとCanvasで表記差が出る|同じ入力のprojection一致、入力不変、serializeバイト一致、該当画面/読み上げ値一致。抽出のためのframeworkを作らない|R0|
|R2 蒸留道具geometry|`distill-tools-view.mjs`、`canvas-layout.mjs`、`canvas-scene.mjs`、`shop-app.mjs`のgesture変換と関連テスト|既存`TOOL_GEOMETRY`を正本に描画・hit・移動距離を参照|採取操作・採取量・味・ガイド回数・時間|見た目が同じでもhitだけずれる|360/375/390px、DPR条件固定。座標/hit矩形・tap/swipe・pointer cancel・3段階・44px基準、画素比較一致|R0。R1と独立でも差分を混ぜない|
|R3 蒸留室controller|`shop-app.mjs`、新しいwork内controller、`distill-tool-input.mjs`等必要範囲|prepare/confirm/gesture/fillのUI orchestration。明示callbackでreadState/dispatch/update|rootの保存transaction・月次clock・正式notice・モデル|未確定仕込みと正式カード選択の混同|レバー開始前/採取中/停止/樽詰め/再読込/保存失敗、操作列・結果・回数一致。rootから所有責務が読める|R1/R2・R0の失敗対応判断|
|R4 貯蔵庫controller|`shop-app.mjs`、貯蔵庫controller、既存cask/tasting view|樽選択・試飲・比較・瓶詰めのUI遷移|計算・履歴生成・正式試飲・予約確定・旧文原文|選択解除/戻る/focus、試飲で時計再開条件が変化|複数樽・空・試飲/比較/瓶詰め・取消・再読込、同じ操作列と保存、旧pending表示・試飲前後一致|R3の境界を評価し有効な場合のみ|
|R5 モーダル表示を一familyずつ|`shop-app.mjs`、work内modal view、必要テスト。最初は読取専用帳面、次PRで担当者draft|markup、draft、focus復元を段階別に分離|`syncModal`の試飲/既存decision優先とstaff→trade→shop→generation→fill→map、notice操作/保存時点|純粋描画と正式効果を同時抽出する危険|同時割込の順序fixture、操作列/保存回数、Escape/取消/戻る/focus、draftは明示保存時だけ正式化|R0/R1。担当者設定は帳面抽出後の別PR|
|R6 Canvas描画更新・cache|`canvas-scene.mjs`、layout/motion/art、rootのscene adapter、HTML/import cache参照|純粋pixel描画とDOM監視/lifecycle。cache invalidation依存を明文化|正式replay checkpoint、月次時間、画素・hit・font|非表示復帰/フォントready/タイマーの競合|固定時刻/フォント/DPRの3幅画素・hit比較、hidden/BFCache/reduced-motion、warm/cold cache、動的workerもURL閉包検証|R1。R2の座標を二重変更しない|
|R7 保存候補の整理（任意）|`shop-app.mjs`、`placement-save.mjs`、必要transaction tests|操作種別ごとのcommit policyを明示したhelper。利益がなければ現状維持|保存key/形式・比較/復旧/旧origin・モデル|最大。generic actとcandidate保存は同義でない|quota/競合/readback失敗/通知/rollback/月次停止のmatrix完全一致。UI-only PRと混在しない|R0。個々のcommit差を固定してから再判断|
|L1 研究記録への導線（別系統）|`data/lab-rooms.json`、`tools/lab-renderer.cjs`等該当生成処理、`lab/`、関連テスト、必要なら研究詳細資料|通常LABと研究記録の表示分類。既存URLへのリンク|Lab実体・公開URL・保存・lifecycle状態・本編|削除したactive項目が自動作業台へ戻る、依存切断|生成check、入口一覧、転送/直接URL/リンク、C依存テスト、既存ナビゲーション。新室ならschema契約を別途設計|[棚卸し](LAB-INVENTORY.md)の採用/保留判断を作者と確定。本編refactorと別PR|

販売室は既に`createMarketUI`を持つ。新しい販売controllerを重ねず、既存adapterの境界を整理してから必要性を判断する。通知の期限やIDを単一化する改修は、優先度・読み上げ・保存成功後演出が一致する証拠ができてから独立PRにする。

## 共通受入条件

1. 固定seed・同じ正式操作列から、各操作後の正式状態、serialize文字列、乱数状態/消費順序が完全一致する。最終結果だけの比較にしない。
2. 旧セーブの受理/拒否・origin・操作履歴・原文・移行結果、別processのcold replayとwarm checkpoint結果を維持する。旧保存のバイトと現行へ正式移行した後の保存を区別する。
3. 月次の経済→在庫→記録→納品→自動発送→月次販売集計→自動瓶詰め→通知の現行monthlyTiming経路の順を維持。旧delegation経路の瓶詰め→発送という別順序も維持する。給与・担当者予約・世代交代・味/量/熟成/販売/評判・ゲーム時計を変えない。
4. candidate方式の保存では成功後にだけ結果と成功演出を確定。generic `act`（app552）はgameを先に代入し、save失敗でも自動rollbackせずtrueを返す既存経路がある。この経路をcandidate方式と同一扱いにしない。失敗時matrixを固定し、改善が必要なら別の不具合修正PRにする。
5. 操作回数・tap領域・gesture・取消・戻る・キーボード・focus・読み上げ・未解放店の非表示を維持。360×568、375×620、390×680を優先し、販売UIの430×740契約も必要時維持する。
6. Canvasはフォント読込・DPR・時刻・animation phaseを揃えてpixel/hit比較。許容差を後付けで広げない。reduced-motion/hidden/BFCache復帰を確認する。
7. browserのqueryを含むmodule URL、entry HTML、全親import、worker、CSS/画像cacheを照合。画面の最新表示だけで旧cache更新済みとしない。
8. 既存テスト・CI・保存検証を弱めない。既存失敗は記録し、今回の新規失敗はゼロ。必須CI成功だけでは作品回帰や実機触感を確認済みにしない。
9. Production変更なし。作者の採用・実機判断とStagingの技術完了を区別する。

## 現時点で触らない領域

`partner-orders.mjs`のapply/replay/strict validation/checkpoint、`placement-save.mjs`の正式keyとcopy transaction、旧`trade.mjs`→`wholesale.mjs`→`wholesale-v08.mjs` reader、`model`/`monthly`/`economy`、乱数・月次順序は維持する。本編から到達するLab内モデルと、その参照先も維持する。`placementEnabled=true`だけを根拠に旧UIや`placement-ui`を削除しない。

## 未確認

実機iPhone Safari/VoiceOverの体感、全旧Labの現在のブラウザー動作、未記録の作者採否は未確認。機械的な静的依存には動的URL/HTML入口の別調査が必要。監査後にmainが変われば、その差分を照合して各PRの基準を取り直す。
