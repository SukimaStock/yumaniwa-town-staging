# AmberTime 現行テスト・保存互換の基準

基準main `23f20504f81282c5c9161995758660be092156dc`。2026-11-02、Node `v24.22.1`。本監査はテスト・期待値・fixture・CI・runtimeを変更していない。試験開始時点でコードは基準mainと同一（追加はPlan Lockのみ）。資料PRの成功とゲーム全体の全緑は別に報告する。

## 実行結果

|コマンド/範囲|結果|時間/備考|
|---|---|---|
|`node --test works/ambertime/tests/*.test.mjs`|exit1、1147件/1134成功/11失敗/2skip/0cancel/0todo|246.767秒。152ファイル。import不能な1ファイルは失敗node1件で、その未実行subtestを成功数に含めない|
|下記の最小回帰6ファイル|exit0、60/60成功、skip0|5.024秒|
|bottling-policy + brewing-panelの再現|12件/10成功/2失敗|既存文言/cache期待値の失敗を確認|
|distill-cut-cache + distill-display + flavor-feedback-0254 + font-uniformの再現|16件/12成功/4失敗|旧harness/source固定を切り分け|
|distill-cut-main-integration単体|import時に失敗|削除済みexportにより内部の20状態比較には到達しない|

```sh
node --test works/ambertime/tests/formal-save.test.mjs works/ambertime/tests/placement-save.test.mjs works/ambertime/tests/runtime-clock.test.mjs works/ambertime/tests/market-ui-main.test.mjs works/ambertime/tests/formal-copy.test.mjs works/ambertime/tests/market-rules-ui.test.mjs
```

## 構成と保護範囲

`tests/`は305ファイル、うち`*.test.mjs`152。直下fixture JSONは28件。`experiments/**`の`*.test.mjs`48件は上記globに含まれない。別work Labのテスト、単発simulation/browser scriptsも別系統。ファイル数は網羅率ではない。

|領域|主な既存テスト|保護するもの|
|---|---|---|
|正式原酒・熟成・経済|model、aroma-model、partners-model/replay、shop-model/compatibility|味・量・乱数・旧版受理/拒否・月次順|
|担当者・瓶詰め・世代|staff系、monthly-timing-integration、generation系、partial-bottling、bottling-policy/roles、bottle-storage|予約・給与・月次・部分瓶詰め・世代の境界|
|現行販売/採用|store-market-main、market-rules-model、placement-adoption|在庫・実売・価格・旧origin・境界operationとcold replay|
|保存|formal-save、placement-save、market-rules-ui、旧ui-storage|key分離、バイト一致、quota/conflict、readback、copy/rollback|
|UI/表示|canvas-layout、scene-input、distill-tool-input/tools-view、rooms-stage1/2/3、market-ui-main、touch-staff、status-reactions、aging-copy、map/ledger/history|hit・gesture・表示・旧文原文・focus/遷移。source文字列assertionも多い|
|時計・演出|runtime-clock、start-countdown、motion/render-power等|正式月とanimation時間を分離、非表示停止・再開・更新抑制|

`formal-copy`は文言/表示監査であり正式保存検証の代替ではない。直接importがあるだけで十分なケース保護があるとも言えない。

## 正式保存と再生

- `placement-save.mjs`の正式keyは `sukimastock.ambertime.main.v1`、旧keyは `sukimastock.ambertime.wholesale.v20`、試行keyは `sukimastock.ambertime.placement-trial.v1`。envelope version2、ゲームversion20。elapsedは0以上6000未満、100ms単位の整数、pause意図も保存する。
- source探索は書き込まない。正式保存が既にある場合にcopyで上書きしない。trialは原文バイトをコピー、旧保存の採用は明示境界operationを追加。書込前source不変・destination条件比較、書込後readback完全一致、quota/競合/破損の拒否を守る。
- `formal-save.test.mjs`は両旧key・無関係key不変、cold processのrestore/serialize、v20以前stage4への`enable-stage4`/`adopt-placement`のみ追加、silent repair/fallbackなしを検証する。
- `partner-orders.mjs`はorigin+operationsからapply/replayで再構築し、現在状態とのJSON完全一致を検証する。partial distillation・preStage4/preStoreMarket/preMarketRulesの境界、v3/4/5の旧reader経路、warm checkpointとcold process一致を保護する。
- `market-rules-model.test.mjs`は旧未採用月次SHA256 `7b291d66909a08a9019a13f0a99e186cc66ce744e9735366ff9c18063f031fb5`、旧操作prefix、split/retry不変、native Lab source完全一致、価格/入金/資金不足rollback/納品履歴/百貨店予約/冷再生を検証する。
- `aroma-model.test.mjs`は560通りの公開A採取を`experiments/distillation/models.mjs`と比較し、量/刺激/RNGを保持。旧v6〜v10セーブと原文、partial/月次/自動のcold/warmも保護する。研究アーカイブ後もoracleを消せない。
- `design/cut-main/model-baseline.json`には4カット列×開始前/開始/終了/樽詰め/瓶詰めの20状態が残る。ただし今回integration testはimport失敗したため、この20状態を確認済みとは扱わない。

## 既存失敗11件

すべて今回の本編変更による失敗ではない。本監査にruntime差分はない。原因の説明は成功への読み替えではなく、今後の基準整理のための分類。正式モデル周辺の未確定問題は改修前に別調査する。

| Existing failing file:line | Observed failure | Interpretation / required follow-up |
| --- | --- | --- |
| bottling-policy.test.mjs:61 | expects `/ビン詰め 8本/`, actual `ビン詰め完了 8本 / 販売 5本 · 入金 £80 / 発送 3本` | wording assertion drift; reconcile with approved message audit while retaining event/count checks |
| brewing-panel.test.mjs:5 | expected `daily=panel-countdown-r1` in index | historical cache-query assertion drift; verify current transitive cache graph instead of restoring obsolete query |
| distill-cut-cache.test.mjs:5 | expected shop-app daily=panel-countdown-r1 | same older cache contract assertion; current graph review needed |
| distill-cut-main-integration.test.mjs:1 | SyntaxError: no export DistillLearning from distill-learning.mjs | removed class replaced by manualCompletedRuns in fa11fd31; entire file never reaches tests. Restore lawful equivalent test harness before relying on its 20-state baseline |
| distill-display.test.mjs:44 | expected immediate legacy modal kind fill; actual undefined | extracts only finishDistillation; current full lifecycle opens fill in syncModal shop-app:760 after save/render. Verify full lifecycle instead of inferring actual UI failure from isolated old harness |
| flavor-feedback-0254.test.mjs:14 | exact Canvas source differs from Git 74d845cf | old source freeze guard includes now-approved visual changes; separate formal calculation invariants from versioned UI baseline; cache semantic assertion itself reached/pass before source mismatch |
| font-uniform.test.mjs:23 | expects literal ./canvas-scene.mjs?v=store-market-main-r1 | stale reader identity assertion; measure actual graph/font behavior |
| retail-sale-cache.test.mjs:3 | expected sales=count-linked-r1 on main entry | historical query assertion drift; current source graph needed |
| shop-order-view.test.mjs:54 | economy.mjs source differs from #616 era due to explicit market-sales rules branch | older immutable-source assertion predates authorized model boundary; preserve old-save hash/replay branch checks, confirm adoption history before replacing guard |
| wholesale-care.test.mjs:29 | TypeError: Cannot read properties of null (reading id), line30 | synthetic boundary fixture overwrites version/rules to v6; unsupported prompt retention/fixture expectation requires independent analysis. Not proven harmless; hold formal-model refactor until resolved |
| world-map-view.test.mjs:73 | expects selected warehouse object blink timer1, actual0 | current Canvas selection timer intentionally gated to sales (canvas-scene:226); reconcile with approved warehouse selection design, verify visible selection behavior before expectation changes |


## ブラウザーと画面基準

`AMBER_BROWSER_MODULE` / `AMBER_BROWSER_EXECUTABLE`は未設定。Playwright/coreとWebKitはあるがChromium実体は未検出。インストール・ブラウザー実行は行わず、opt-inの`market-compact-browser.test.mjs`/`market-rules-browser.test.mjs`2件はskip。物理iPhone Safari/VoiceOverは未確認。過去のrooms-stage1/2/3、aging-copy、uniform-messages、status-reactions等の画像・browser結果は過去の証拠であり、そのまま今回の最新mainの全画面確認にしない。

将来のR0では、360×568・375×620・390×680（販売UIは430×740も）で同じviewport/DPR/font/seed/state/logical animation timeを固定する。三室、樽選択、複数発売回/店、モーダル、戻る/取消、focus/keyboard、読み上げ、reduced-motion、非表示/BFCache、保存失敗を対象にする。スクリーンショットだけでhitや操作回数は証明できないため、hit矩形・action列を別に比較する。旧一時間cache等のwarm/cold状態も別条件にする。

```sh
AMBER_BROWSER_MODULE=/absolute/playwright-core/index.mjs AMBER_BROWSER_EXECUTABLE=/absolute/chromium node --test works/ambertime/tests/market-compact-browser.test.mjs works/ambertime/tests/market-rules-browser.test.mjs
```

上記は将来実行用の既存コマンド例で、今回の成功報告ではない。`*-browser.mjs`/`.cjs`の単発scriptには証拠ファイル出力があるので、read-only監査で不用意に実行しない。

## 将来の最小検証と広域検証

|変更|最小|広域検証が必要になる条件|
|---|---|---|
|表示専用変換|上記60件＋変更viewの純粋関数/入力不変/serialize前後一致＋対象画面|複数室・正式効果・描画更新へ波及するなら全root suiteと影響閉包|
|道具geometry/input|上記＋tool/layout/scene input/cut、3幅pixel/hit/tap/swipe/cancel|採取開始/停止の正式操作を触るならaroma/モデル/旧保存/20状態の実行可能なharness|
|三室controller/modal|上記＋割込順・draft/取消/focus・保存回数・hidden復帰|全root152ファイル、影響するLab oracle、旧入口/fixture cold replay、ブラウザーの該当室と販売|
|保存/正式モデル（初期には非推奨）|同操作列・毎操作byte/RNG/ledger一致、別process cold/warm、quota/conflict/readback matrix|native model/store-market/adoption/aroma/staff/monthly/generation全系統・旧fixture全般。未確定11件の扱いを先に確定|
|Lab研究記録の導線|generator/lifecycle check、wrapper/直接URL/asset/import smoke、C依存の回帰|共有モデル・旧UI・生成schemaを変えるときは各参照元の契約回帰。全旧Lab全画面E2Eを毎回とは先決めしない|

固定seedと合法な公開操作から新しいversion付きbaselineを作り、旧fixtureを上書きしない。base/candidateを別processで起動し、最終状態だけでなく各操作後のserialize文字列、RNG、operation順、資金/在庫を完全比較。表示専用ならmodel hash不変も照合する。浮動小数や金額への後付け許容差は導入しない。

既存11失敗を黙って期待値更新で消さない。古いsource/URL固定は採用履歴を確認して、現在も守る契約と古いharnessを分ける独立PRが必要。`wholesale-care`のpending=nullは無害と証明されていないため、正式モデル整理の前に解決/切り分ける。

## CI・Staging公開

`.github/workflows`にAmberTime全152ファイルを実行する専用workflowはない。`plan-risk-gate`と`trusted-mechanical-evidence`はbase-owned Plan/Scope/Risk/Impact/Trusted Staticを検査し、ゲーム回帰やSafariを証明しない。補助Release Validatorはworks差分のPRでも適用される。既存CI条件を変更しない。

資料PRでは事前Lockのみの最初のcommit、4Markdownのみの次commit、Scope→Risk→Impact、独立レビュー、exact head/baseの必須CIと適用補助CI、レビュー/未解決指摘/merge可否を照合する。通常merge後は同merge SHAのPages job/deployment成功と資料のHTTP/内容一致を確認。外部保護設定の全体は別確認が必要。現在の正式verificationStateは契約どおりUNVERIFIEDであり、CI成功を最終VERIFIED/Production公開/作者採用に読み替えない。

## 監査の再現証拠

本監査のログ集計・失敗のfile/line・コマンド・Node版は本書に固定。元の詳細stdoutは監査実行環境の一時ログであり、永続成果物として別納品していない。再実行は基準SHAのcheckoutで上記コマンドを使う。今後mainが進んだ場合は、結果を最新mainへ無条件に流用しない。
