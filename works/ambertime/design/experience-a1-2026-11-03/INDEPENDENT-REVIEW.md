# AmberTime A1 — 独立レビュー

実装担当とは別のreview agentが、基準main `341f2865ff44af97bfb99e76450b6db17cac9511` と最終事前Lock `f365d0344b5c775f5085b8b53e10933ccecaefebef86e5cdd9b1737edb17cc59`（初稿Lock `b80254c50d5f485f4261fd847ce52522bc403cfe9c7833742251f75f941de387`を後述のscope再作成で置換）、root/work AGENTS、実diff・保存/通知/worker/Canvas接続を読んで確認した。自己レビューではない。最終commit SHA・CI・配信確認は統合側の記録を参照する。

## 指摘と修正

P2を1件検出した。初稿は `fontSettled=false` でもglintを開始し、実drawがfont gateでreturnするため、250msの完了callbackがフォントfallbackまで待つ可能性があった。実CanvasSceneのVM実行で、開始後1,000msでもpending=true、done=0を再現した。復元済み採取中状態をDOM/支援技術から早く停止した場合の応答退行になる。

修正は `startDistillCompletion` が未描画可能時に演出を省略するguard1箇所。専用テストで従来どおり即時fillを確認した。指摘→修正→再検証は1回で解決。現在の製品diffに未解決P1/P2指摘なし。

初稿のmicrotaskによるWorker準備は起動/fontの負荷増を計測で検出し、統合担当が既存fontReadyと2回の一度限りのRAF後へ移した。最終版は同じ既存font-loader URL identityを使う。要求時のWorker生成はこれを待たず、常時loop・独立描画timerを追加しない。初期版と最終版の測定は別記録であり、混同しない。

## コードと保護境界

- Workerは既存2種類と既存URL・projectionを再利用する。準備時にstate/replayを送らない。最新request/snapshot/worker identity、古い応答無視、error後の破棄と明示retryを確認。既存game identityのprojection無効化を維持し、新たな正式状態cacheは作っていない。
- glintは正式act/save成功後のみ開始。正式通知を含むsyncModal全体を遅延せず、fillと低優先mapの表示だけを一時保留する。higher-priority modalで取消し、完了時は再度正式phase/spirit/room/modal/visibility/save可否を確認する。
- CanvasSceneの既存RAF/motionTimerへ有限phaseを追加する。取消generationで古いmicrotaskを失効させる。hidden/pagehide/reset/room/modal/reduced変更を確認。正式計算、保存形式、量・味・RNG・TOOL_GEOMETRY/inputは変更しない。
- R4/R5用exact逆変換は、実際のA1 hunkだけを一度ずつ原文へ戻し、残り全bytesをimmutable L1のSHA256へ照合する。両ファイルをGit原文と独立比較して完全一致。hunk内cache tokenの変更と末尾への無関係な追加はいずれも拒否された。旧oracle/fixture/期待値の緩和ではなく、意図したA1挙動は別テストで確認する。

## 独立に実行・照合した証拠

新glint7件・worker5件・R0通知優先2件・R6 lifecycle6件、計20件を独立実行して成功、失敗/skip0。font修正後、新12件を再実行して12成功。exact逆変換のGit原文一致とmutation拒否も独立に実行した。

負荷除去前の暫定ledger記録（後述のclean最終で置換）は288観測/144前後組のbody/hash/focus/ARIA/scroll全一致。96 Worker応答/48前後組のpayload hash一致、12非zero scroll/focus復帰probeが成功。最終実行runnerのhashと保存された実行source・再実行用testのbytesが一致し、fixture provenance中の8製品source hashも実ファイルと照合した。初回中央値はsmall/historyで改善がある一方、長期仕込みには明確な改善が確認できず、遅いcaseも混在する。全条件高速化とは報告しない。

最終glint記録のrunner hash・14固定phase case・16自然時刻case・errors0を独立に照合した。glintの差分はworld上2cellsのみ、範囲外0、hit不変。実pointer操作による3回ずつの自然完了はChromium256.4–258.7ms、WebKit256–265ms。保存済みfilling→arm→paint1→paint2→complete→fillの順。10取消/再読込caseに古い完了callbackなし。これらは実装担当のbrowser runner出力を独立に検査したもので、review agent自身が全browser runnerを再実行したという意味ではない。

物理iPhone Safariの指の感覚、VoiceOver実音声、実OS background/BFCacheは未確認。合成visibility/pagehideと完了したブラウザー検査を実機確認へ読み替えない。全域テスト・非演出画素比較・旧cache更新・exact-head CI/公開確認の最終結果は統合検証記録で別途固定する。

## 統合途中の追加照合（負荷除去前の履歴）

固定1,000msの別条件supplement144観測/72前後組の完全本文・focus/ARIA/scroll一致と、実行runner SHA256一致を独立に確認した。即時・初稿microtask・supplementの3gzipすべてを展開し、summary記載の圧縮/非圧縮bytes長・両SHA256が一致することを確認した。supplementも長期仕込みの改善を確立しておらず、即時条件の数字へ置き換えない。

計測報告の起動時間proseに、異なるfixtureの個別観測を中央値として比較した誤りを検出した。報告担当がraw gzipから再計算し、各engine/side12観測のaggregate medianと長期fixtureの遅い中央値を分けて訂正した。その暫定aggregateではWebKit app487→462.5/font513.5→489.5ms、Chromium app526.8→453.75/font552.55→471.6ms。一方、長期fixtureのapp中央値はWebKit539→946ms、Chromium727.1→1080.9msであり、共有hostの負荷変動を含む。安定した起動高速化や、すべての起動退行が解消したという結論は採用しない。これは報告修正で、製品/runner/raw測定は変更していない。


全域の初回結果は1,228件中1,223成功・5失敗・skip0。失敗は新しいpresentation呼出に旧VM/fake adapterが追従していないR2の1件とR4 effectsの4件で、保存や計算の期待値不一致ではなかった。ただし初稿Planはその2fileを許可していなかったため、その場でscopeを後付け変更しなかった。同じmainから新branch/新changeId/最終Lockを単独commit `b535a423` に固定してから、R2 fakeへ `sampleDistillCompletion:()=>null`、R4 ctxへ無効なscene portだけを追加した。全assertion/旧oracleはそのまま。差分とLock-only親子順、runtime3fileが前branch `1cbd3219` と完全byte一致することを独立に確認した。対象2fileの再実行記録は11成功・失敗/skip0。初回5失敗も原ログに残す。

非演出のbrowser比較はChromium/WebKit、3幅/DPRとreduced全8条件・26状態、416取得/208前後比較。結果JSONと8captureファイルのSHA256、実行runner hashを独立に照合し、208組すべてdecoded差分0・PNG byte一致、errors0を確認した。DOM/hit/focus/ARIA/state/saveを比較するrunnerのassertionも確認済み。旧1時間cache→新版更新は両engine2件が成功し、変更app/Canvas bodyを再取得、未変更依存を再利用した記録を確認した。実機や本番の証明とは区別する。


## 採用する最終証拠（既知の測定負荷を除去後）

後から、旧fixture生成の中断漏れprocessが1 CPU coreを消費していたことが分かった。上の暫定即時/supplement数値はその負荷を含み、性能の最終評価には採用しない。生成processを原sessionから停止し、既知の測定process不在を確認、重い検査も止めて、同一製品sourceで即時matrixを1回取り直した。初稿・負荷あり即時・負荷ありsupplementは削除せず別gzip/runnerとして保持する。

clean最終の実行source SHA256 `7383d6d69e9ccab94e9216909e2081640fa5cac2158465e24b498cc9230b17ec` が保存snapshotと一致することを独立確認。288観測/48startup/errors0、144本文/focus/ARIA/scroll前後組、96応答/48projection前後組の完全一致、12非zero scroll復帰を再度確認した。4gzipの両SHA256/長さと、candidate8source hashも独立照合した。

|engine/初回中央値ms|仕込み before→after|歩み before→after|
|---|---|---|
|Chromium 新規|128.7→62.7|128.0→60.7|
|Chromium 120か月|465.8→340.5|250.4→162.8|
|WebKit 新規|183→122|155→86|
|WebKit 120か月|451→413|315→251|

ただしChromium rich仕込みは261.8→344.9msと遅く、WebKit長期の最大値は仕込み493→863ms/歩み397→685ms。全条件での改善・tail安定化は主張しない。各初回n=3、対比はbefore/after順で非randomized、実機iPhoneではない。

cleanの起動aggregate中央値（各12/side）はChromium app465.5→468ms/font480.2→488.85ms、WebKit app554.5→532.5ms/font581.5→559ms。既知の自己生成負荷は除去したが、共有host・有限sampleの揺らぎまで除去した保証や起動高速化の因果証明にはしない。

全域の最終unique outcomeは1,228成功・失敗/skip0（初回1,223成功＋missing port由来5件を修正後に成功）。対象2fileの再実行11件には既に成功していた6件も含むため、再実行分すべてを新規成功として水増ししない。初回から単一commandで全緑だったとは報告しない。製品bodyは初回全域検査以降byte不変。独立レビュー上、未解決P1/P2と未解決検査失敗なし。exact-head必須CIと公開後smokeの結果は、取得後に別途記録する。
