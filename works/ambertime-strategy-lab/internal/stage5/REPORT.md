# 第5段階：小さな正本を成立させる条件

基準main: `bef87b33a58b8327ef6f22374a6d82ebc0178302`（第4段階PR #900）。これは独立比較の報告であり、本編の正本変更・正式v8保存への接続承認ではない。正式計算、Stage4の読取切替、既存セーブ、PR #894、Productionは維持する。

## 1. 容量監査の出発点

[`../../../ambertime/shadow/STAGE4.md`](../../../ambertime/shadow/STAGE4.md) の1200か月合成条件ではcore 613,816 bytes、reader 332,634 bytes、core更新合計12,258.44 ms、月4回・計4,800回の全体JSONコピーだった。これは第4段階の既測定値であり、今回の再測定や正式ゲーム100年の結果ではない。月1発売と2取引という限定入力でも、全体コピーの対象が過去発売とともに増える。

`../model.mjs` の `registerRelease` / `applyTransaction` / `compactRelease` は全体JSONコピーを使う。descriptorは純粋な味だけでなく入力発売の出自・価格などを含み、同じ味でも同じdescriptorになるとは限らない。発売ごとのidentityは特性共有と独立して保持しなければならない。`shadow/readers.mjs` は全期間と前月以前の集計、発売・店舗別発売・実選出台詞を別に持ち、coreと重複するが境界月と選出済み履歴という保持理由がある。用途を確定せず削除しない。

Stage5 `model.mjs` は公開snapshotを不変として扱い、変更対象の発売・店・月次metric・参照だけを複製する。無関係なdescriptorや発売rowのJSONコピーは省くが、object spreadによる索引の浅いコピーは残る。登録時の全identity・descriptor検索も残るため、全処理が定数時間になったわけではない。計測はJSON payload bytes、浅い索引entry数、浅いproperty数、更新row数、再計算回数を区別し、浅い参照コピーを0 bytes扱いして改善率を出さない。公開済みsnapshotを外部から直接変更する使い方は対象外である。

## 2. 必要性の棚卸し

分類は「現在」「成果」「記憶」。再計算できることと、再計算のための原本を削除できることは別である。増加量は構造上の次数であり実測メモリ量ではない。

|層・情報|保持理由／用途|保持期間・増加量|削除・集約できる条件|失われ得る体験／判断|
|---|---|---|---|---|
|現在：現役樽・原酒・商品・在庫・棚割当|次の製造・販売と在庫保存則|現役中、容量制約内|完売・未処理取引なし・参照保護確認後|売れる酒や預けた酒を失う。正式coreを正本維持|
|現在：資金・契約・注文・担当者・RNG|経済、次の判断・確定操作|有効期間。契約は店×ブランド等|期限だけでなく保留処理完了を確認|独立酒モデルには未収録。新モデルのみでゲーム再開不可|
|現在／記憶：発売ID↔商品ID↔特性ID|古い会話と同じ発売の再納品を特定|任意の旧ID参照を支える限り全発売数Rに比例|参照する全機能の廃止・代替契約が証明された場合のみ|同特性の異発売を統合すると出会い・在庫・時期を混同|
|現在／記憶：descriptor|味・熟成・出自・外観詳細の再表示|異なるdescriptor数Dに比例|同一性の正確な証明による共有。通常酒の詳細削除は別policy|味の再評価・製法・collector証拠の再現を失う。Cの短い識別と同一でない|
|成果：発売別販売・納品・収入|自家販売と他店取引の帳面を維持|発売数R。完売後identityへ集約可|現在在庫ゼロ、棚割当ゼロ、保護参照なし|合計だけでは売上の月順や納品方式を復元不可|
|成果：店×ブランドの供給と浸透|確定納品、観測実売、異なる月数、初回・最終月|店×ブランド組合せSに比例|関係廃止ではなく歴史も不要と合意した場合のみ|unknown卸売を実売0に変えると関係の意味を変える|
|成果／記憶：店×発売の実績|以前扱った酒、同じ発売との再会|実際の店×発売組合せに比例|再会会話・昔の酒参照を別索引で同等に成立させた後|全店合計だけではどの店が扱ったか失う|
|成果：直近取引・月次境界|休止／再開、当月短文と前月候補の区別|旧core recentは各店最大8、perRelease.lastMonths最大2|必要な月境界を越えた分だけ|lastMonthだけで全月継続と呼ばない。最近の8件は全履歴ではない|
|記憶：実選出台詞・発話月・cooldown|同じ発話を再抽選せず、再起動で同じ過去を表示|実発話数。cooldownはキー数|選出履歴の正式保持契約が許す場合のみ|候補から再生成不可。旧v8欠落分はunknown|
|記憶：Cの全発売最小識別・外観|数十年前の通常酒も認識できる|R個の識別、外観共有数V|参照可能な発売を消すB案は不採用|完全な風味profile・製法・数量月次証拠は最小カードから復元不可|
|記憶：重要酒詳細・選定理由|初瓶詰め、熟成、店・地域の節目、継承|重要／保護対象数I。上限は未採用|後の参照と正式記憶選定の契約が必要|重要性は後から判明し得る。通常酒の最低識別を残す理由|
|現在／記憶：pending参照・回想参照|未処理口コミ・問い合わせ、凍結回想のIDを守る|未処理と確定参照数|pendingは処理完了、確定回想は削除不可|参照だけでは実際の未処理packetを復元できない|
|成果：transaction cursor・最終署名|順序、一度だけ計上、再送検出|cursorは定数、tailはcheckpoint以後|検証済checkpointに取り込み後tailを切る|cursorだけでは任意の古い同seq改変を識別できない。確定順序の契約が必要|
|派生：Shadow reader・候補・診断|旧結果比較、少ない情報で読むための索引|発売／店／発話とともに増加|同revisionのcore＋確定発話等から再構成可能と証明後|現状coreだけから全readerが作れるとは未証明。診断と正本を混同しない|
|現在：町packet/pending/seen/lastEncounter|未来の到達時刻、二重伝播防止、因果|未処理数とcohort数等|到達済だけでは不可。将来の因果閉包と再送境界の証明後|集計から再生成すると到達先や時期・RNG結果を変える|
|記憶：町event/receipt・collector位置・proof|口コミの由来、世代内の順番、確定回想|事実・参照・世代数|正式collectorとfuture RNGの互換検証後|少ない使用箇所でも因果証拠。今回削除不可|

保持目的が明確でないものとして、`storeRelation().historicalMaxStage` は実際の過去最高到達ではなく現在の計算stageを返している。この名前を歴史的事実と解釈しない。Stage5比較では既存出力を保ち、将来の保存用到達記録を別契約にする。

## 3. 町の正本と回想の境界

`works/ambertime/partner-orders.mjs:syncTown()` は全発売を `recordBottle` へ渡し、`labConnection.deliveryId` より後の納品に `shop:<deliveryId>`、月境界の自家実売に `retail:<month>:<productId>` を付ける。`receiptMonth` は再計上防止の境界である。`town-connection.mjs:receiveActual()` は同receiptの月・宛先・数量・発売まで比較し、変更された再送を拒否する。これらは供給合計から復元できない。

`experiments/town-simulation/v01/model.mjs` のpacketはsourceId、releaseId、due、path、cohort、channel、hops、strengthを持つ。`seen[cohort:to]`、pending encounter/visit/inquiry、lastEncounter、nodesのawareness/interest/root、seedを含む決定条件が未来に影響する。eventのIDは配列位置と結び付き、sourceIdは過去の同発売の原因を指す。到達、関心、問い合わせ、訪問、契約、実取引は別の事実。external接続のinquiryだけからtradeを自動作成しない既存分岐も維持する。正式契約の状態は本編trade/shop側に残す。

`recall/observe.mjs` はoperation index・lastKey・各source配列count・positionBlocksを検証し、製造、瓶詰め、販売、納品、取引開始、町の出来事を確定事実に変換する。`recall/collector.mjs` はfirst/last anchor、製造出自、因果pinを保持する。問い合わせ／訪問が後から重要になったときは、実際のsource chainから昔のarrivalを回復し、同地域だからという推測はしない。

`prepareRecall()` には世代、開始月、cutoff operation、seed、algorithm hash、依存事実、因果proofが必要。`packFact()` は瓶詰めの詳細を重複保存しない代わりに、`unpackFact()` が正式releasesとbrandsから本数・熟成年数・外観・flavorNameを読む。したがってCのカードだけを今のcollectorに渡すことはできない。確定prepared snapshotとdependencies/proofsは変更しない。次世代候補の置換は、これらの事実と順序の比較を終えてから別PRで検討する。

## 4. 関係policyの保存判断

供給はdelivery.bottles/months、浸透はsale.bottles/monthsとして分ける。unknownSaleReceiptsの存在は未観測を表し、売れなかった本数ではない。始まりの契約月と初納品月も別である。

将来の関係記録は `policyVersion / attainedStage / attainedMonth / evidence / generationId` を到達時に固定し、`lastDeliveryMonth / lastObservedSaleMonth / currentActivity / gapMonths` を現在の指標として別に更新する。evidenceには当時の供給量・月数、観測実売量・月数、coverage、根拠revisionを残す。新policyで過去の到達を再計算しない。継承は前世代の到達記録への参照と現世代活動を区別する。欠落した旧到達月はunknownとし、現在の累計から歴史を捏造しない。これは保存設計であり、段階閾値・解放・評判の正式採用ではない。

## 5. 記憶Cで残せる体験と不足

既存 `../memory.mjs:selectImportantWines()` は初瓶詰め、初36か月熟成、店×ブランド初納品、地域の非直接arrival/inquiry/visit、継承樽を説明可能な理由にする。これは独立候補であり正式選定ではない。favoriteIdsも比較APIであり新しいプレイヤー操作ではない。

|体験|必要な小さい情報|まだ必要なもの／不成立条件|
|---|---|---|
|数十年前の酒を帳面で見る|旧発売・商品ID、ブランド、元樽・世代、発売月、年数・味の識別、外観|原Cではprofile/recipe不足。Stage5拡張Cは共有profileを保持するがrecipeや完全な過去明細は別途必要|
|昔の酒が店の会話に出る|店×発売の実績、前月までの事実、選出済みentryとcooldown|外観カードだけから既存選出規則を再現不可。架空の発話禁止|
|以前の酒を再納品する|同発売ID、以前の店実績|実在する残在庫が必要。完売カードから瓶を作らない。同特性の新発売は別発売|
|世代をまたいで酒を思い出す|最小識別、出自、凍結回想の参照|collectorの位置・因果proof・製造詳細・正式snapshotが必要|
|当時は普通だった酒を後で思い出す|全発売の最低識別、後から得た実際の関連事実|捨てた細部は戻らない。後から重要化しても不明詳細を補わない|
|同じ特性の異なる発売を見る|共有descriptorと各発売identity|ブランド・価格・出自がdescriptor同一性に含まれる現行契約を勝手に緩めない|

Stage5 `memory.mjs` は原Cに共有traits（profile・熟成年数）と発売別summary・priceを追加した。通常酒のprofileも保持する一方、recipe・collectorの位置・因果証拠は補わない。`memory-results.json` の1200発売・同風味の合成例では、完全発売データ323,077 bytes、原C 215,873 bytes、Stage5 C 326,644 bytesだった。正確な描画SVGと追加識別・集計を保持した結果、この入力では容量削減していない。構築28.36 msは一回の独立計測であり、線形検索を繰り返す共有判定にはO(R²)の上限がある。本編更新経路への導入済み性能として扱わない。

任意の昔の発売を指名できる体験を維持するなら、最低識別が発売数に比例することは必要な費用である。定数容量を成功条件にしない。

## 6. 保存研究の再利用と正式接続条件

`works/ambertime/checkpoint-persistence/DESIGN.md` はstate/context/proofと最後に公開するcommit manifestを分離し、作成時の正式reader/full replay一致と読込時の検証を区別する。hashは破損検出であって真正性証明ではない。原本を捨てた後も同じ検証保証があるとは言えない。本段階も独立のcheckpoint/tail契約としてこの境界を守り、別の本番保存基盤を作らない。

正式保存revisionと独立保存revisionが異なる場合、古い独立状態を新しい正式状態の読取元にしない。対応が証明されたrevisionだけを採用し、欠落tail・cursor/versions/ID不一致・書込み/readback/競合失敗は理由を診断して旧読取を維持する。独立保存の成功は正式保存統合の承認ではない。正式保存の失敗を新モデル側で覆さない。checkpoint化は町の未処理packetやcollectorの依存事実を削除する権限でもない。

独立 `persistence.mjs` はschema/policy、正式source fingerprint、整数revision、checkpoint cursor、tail前後cursor、前hash、結果model hash、head長を検証する。tailはrevisionを1ずつ進め、欠落・並替え・異なるcheckpointとの接合を拒否する。公開済みheadの更新は、同checkpointと完全一致する既存tail prefixの延長、または復元結果が同一でtailを空にしたcheckpoint化に限定する。任意の別checkpointを「新しいrevisionだから」と採用しない。旧ID、確定回想、発話・記憶メタデータの不変条件も照合する。coverageのunknown→partial→completeという格上げ、coverageキーやunknown理由の消去も拒否する。不足情報の解消には将来の検証済み移行契約が必要である。prepare→readback完全一致→CAS commitの模擬メモリストアであり、IndexedDBやSafariのクラッシュ耐久性を実装したものではない。失敗は `readSource: legacy` とreasonを返す。

|比較対象|判定|限定・不足|
|---|---|---|
|同じ確定commandの増分モデルと従来モデル|一致|差分テスト対象の在庫・供給・実売・収入・ID・参照。正式本編への採用ではない|
|checkpoint＋tailの復元|一致|同version・同revision・同fingerprint・整合したIDとcursor、独立ストアに限定|
|通常酒のprofileを追加したStage5 C|意図的差分|原Cより多く保持し外観・風味体験を守る。正式ゲームルールの変更ではない|
|旧v8の過去方式・実売不明・実際の発話|情報不足|原本の確定部分だけ保持。不明を0や完全な取引列に変換しない|
|旧v8コピーから実行可能な新正本への移行|未検証|bootstrapは部分的な観測projectionであり実行可能モデルではない|
|町進行・正式collector・端末で100年|未検証|独立モデルから正式正本を置換しない|

第6段階の接続前には、正式revisionの採番と確定時点、原本バックアップ、旧v8のcoverageとunknown、全ID参照の閉包、境界を跨ぐtail、collector版の変更、競合後の復旧、端末上の停止時間を別々に検証する。memory Cへの保持方式変更と更新高速化を同時の正本変更にしない。

## 7. 観測した回帰基準

2026-11-10、基準main上のStage1–4関連suiteを実行した。235件中230成功、5失敗。既存テストを変更していない。失敗はformal-copyの文面2件・cache query1件、market-rules-uiのcache query1件、shop-dialogue-s2のVM harness `m0 is not defined` 1件で、第4段階の既知失敗と同じ名称。これを「全回帰成功」とは表記しない。必須CIの成功条件とローカル既知失敗を区別する。

再現対象：strategy-lab/model.test、internal直下全test、small-memory-lab/memory.test、shadow全test、および本編store-market-main・market-rules-model・shop-remarks・recall-save・formal-save・ledger-view・shop-ledger・shop-dialogue・shop-dialogue-s2・market-ui-main・formal-copy・market-rules-uiの各test。

`bootstrap.mjs` は正式 `readSession` と `restoreDistillery` を使用し、渡されたv8文字列のコピーだけを検証する。APIは `bootstrapV8(text,{revision})`。raw・明示revisionを保持し、fingerprintは真正性保証としない。現在発売と実在商品の在庫、観測された納品receipt、元の町・回想をコピーして残すが、実売不明・昔の方式・実表示台詞・出自欠落を埋めない。正式 `shopDialogueHistory` は月別に過去の選出を再生成する関数であり、実際の発話を観測した保存記録ではない。bootstrapから呼ばず、選出済み発話・cooldownはunknownのままにする。bootstrapのrevisionは外部入力の文字列ラベルで、独立persistenceの整数revisionへ自動昇格しない。operation数から新transaction cursorを作らず、常に実行中読取への採用不可を返す。元v8も保持するため圧縮ではない。実際にserializeSessionした新規／月進行／瓶詰めfixtureで、JSON往復・原本不変・正式validator拒否・revision/文字列相違を3テストで確認した。これらのbootstrap fixtureでは納品済みreceiptと確定済み回想は空であり、非空の完全な旧セーブ移行の証明とはしない。

Stage5の現時点の独立suiteは44件すべて成功（model 23、persistence 15、memory 3、bootstrap 3）。これは本編への保存接続成功を意味しない。

Stage5実装・複数seed性能・独立保存異常系の最終結果は同ディレクトリの実行可能テストと計測結果を正本とする。合成100年は正式ゲーム100年ではない。iPhone実機、作者の体験評価、正式保存への接続は未確認。

## 性能比較の最終観測

[`results.json`](results.json) はNode v24.22.1/Linux x64、12・360・1200か月×seed 1/42/781×集中・分散・休止の27条件。全27条件で旧モデルとの完全一致とcheckpoint JSON往復後の完全一致を確認し、別に3条件の単一bulk tail復元も一致した。focused/distributed/gapの具体的操作列は `scenarios.mjs` を正本とする。パターン名は合成入力を分類するもので正式ゲームの攻略結果ではない。

|月数・パターン|従来更新合計 ms（3seed範囲）|増分更新合計 ms|最終JSON bytes（新旧同一）|checkpoint復元 ms|
|---|---:|---:|---:|---:|
|12 集中|3.81–5.05|0.89–3.01|9,470–9,475|0.80–1.64|
|12 分散|9.33–10.36|1.02–1.77|13,638–13,643|0.91–1.48|
|12 休止|3.48–5.09|0.78–1.14|9,777–9,784|0.65–2.00|
|360 集中|1,378.75–1,465.10|295.04–332.61|218,771–218,781|10.46–28.18|
|360 分散|3,969.15–4,199.61|364.02–381.27|290,165–290,175|15.25–17.53|
|360 休止|20.81–24.80|3.49–7.70|26,252–26,590|1.45–2.58|
|1200 集中|16,046.31–16,552.55|3,888.55–4,032.90|728,364–728,394|40.65–45.26|
|1200 分散|45,487.02–45,959.38|4,819.77–5,055.03|965,423–965,453|54.28–78.76|
|1200 休止|154.84–206.46|31.25–36.94|77,324–77,342|3.45–5.64|

更新の全体JSONコピーを減らす改善は確認できたが、最終JSON容量は変わらない。1200か月の旧モデル累積コピーJSONは集中約1.748 GB、分散約5.212 GB。増分側でも浅い索引コピーはそれぞれ2,888,406／5,069,406 entries発生し、入力payloadコピーと別に記録する。再計算は721,800／727,800回。これはdescriptor比較とmetric更新の回数で、旧モデルも同じ探索・式を使うが旧側の回数は独立計器による実測ではない。

seed42集中の単一bulk tailでは、12／360／1200か月の復元は1.53／265.26／3,336.50 ms、1200か月のappendは3,303.50 ms、bundleは668,951 bytesだった。1200か月は4,804 commandsを空checkpointの後に一つのtail entryとして加えた条件であり、毎月追記の計測ではない。checkpointだけの復元40–79 msより重く、tailが常に高速とは結論しない。現実装のappendは既存chainを検証・再実行・コピーするため、長いtailへの反復追記には二次増加が残る。

JSONサイズ計算と一致assertは更新時間の外で実行するが、その割当はGC/cacheに影響し得る。heapBefore/After/Deltaは両モデル、操作列、一時JSON、復元、GCを含む同一processのサンプルであり、モデル固有の常駐量・peak・iPhoneメモリ上限を示さない。初回起動・Safari停止時間は未確認。100ms停止上限の引上げで改善した結果ではなく、本編診断へこの独立モデルを接続してもいない。

## 8. 第6段階でゲームとして検証したいこと

- **新しい店**：共通の供給・浸透・休止実績を利用し、店固有の能力や味の相性を別policyで比較できる。新店舗の正式解放・台詞・演出はまだない。
- **地域への進出**：どの酒がどの店で実際に扱われたかを残せる。地域への広がりは正式packet/因果を守った比較が必要で、累計納品だけから問い合わせや契約を作れない。
- **昔の酒の再登場**：普通の酒にもIDと外観を残すことで、後年の実際の出来事からその酒を再び意味づけられる。失った製法や架空の取引は補えない。
- **長い付き合いと世代継承**：過去に築いた到達と現在の活発さを分ければ、休止した店との再会を過去の消去なしに表現できる。policyの作者評価と旧セーブの不明情報を扱う設計が必要。

次の成功条件は、小さいモデルを常用することではなく、同じ酒・店・町の出来事を再起動後も正確に思い出せること。現段階で保証できる範囲を一機能ずつ広げる。

## 独立レビューと検証状態

独立レビューでは、別checkpointを進んだrevisionとして渡すことで過去状態へ戻せる問題、およびmodel／memoryの参照検証が不足する問題を検出した。保存headの系譜を同tail prefix延長または同一状態のcheckpoint化に限定し、参照・集計の検証と回帰テストを追加した。修正後の独立レビューは、独立比較という範囲ではblocking指摘なし。これは正式保存採用のレビューではない。

保護パス（`works/ambertime/**`、従来internal model/adapters/memory、engine/data/tools/.github）のdiffは空である。新コードは独立ディレクトリと既存Labへのリンクに限定する。

最終検証状態：**UNVERIFIED**。Nodeの独立テスト・合成比較と本番ゲームの実機体験を区別する。ブラウザー確認は配信後の観測待ち、iPhone実機と作者の体験評価は未確認。CI・Pages・実ブラウザーの最終exact head結果はPRに追記し、観測していない体験を成功として扱わない。
