# L100-4A-3 clone 境界と表示境界の研究結果

2026-11-06。正式モデルを変更せず、`arrivals` を `events` への順序付き参照へ置き換えた状態で、clone、地図の読取り、正式な月次処理を比較した。

**判定は C が追加研究、B は現方式を不採用。正式採用候補には進めない。** 3方針の100年保存から12か月進めた72比較、9つの既存交代境界からの36比較は通常配列版と一致した。C は保持heapを減らしたが、wide100 の初回cloneは約1.88倍、warm cloneも約1.15倍かかり、地図読取りも遅くなった。月次は概ね同程度で、工程全体の高速化は成立していない。正式保存上限とcold復元の問題も残る。

## 基準と証拠

- Repository: `SukimaStock/yumaniwa-town-staging`。
- 基準main: `28f00c81cb1b374758da34dc79cf7f63dfe657c2`。H4 Canvas変更を含むが、本研究はCanvas、UI、正式runtimeを変更しない。
- 実測実装commit: `2b0b612486e82bfc5387c5ece4522492ff7cf64e`。以下の数値は末尾の研究コードSHA-256にも結び付ける。
- 実装前の公開Plan Lock commit: `a514a69ca23af2ab2883a6859ea9e5c43242f220`。lock digest: `0628d5e76ff8a4082c164553ae85a239b0b952403c8aef21e464a4903e3ca9cb`。ローカルで先行作成した `42d327d6` と親commitおよびtree `863e88acc6083277acc551115e1ebaeafe590ce3` が一致することを確認して、公開済みcommitへ揃えた。研究ファイルの内容は変えていない。
- 先行研究は [Draft #828](https://github.com/SukimaStock/yumaniwa-town-staging/pull/828) の `739754b57e80620235ca2550d2978f69c0813294`、[Draft #831](https://github.com/SukimaStock/yumaniwa-town-staging/pull/831) の `05d20df8148d14b6f5029e59b989d252b4d05923`、[Draft #832](https://github.com/SukimaStock/yumaniwa-town-staging/pull/832) の `03f8312f65cfffb869393bda431beabcec746aea`。開始時はいずれも未マージ。#832の順序付きindex案だけを隔離ディレクトリへ再実装し、先行branch全体は取り込んでいない。
- 入力は100年停止保存3件と既存交代前保存9件のコピー。全12入力のファイル名、byte数、SHA-256と正式ソース9件のSHA-256は [inputs.json](inputs.json) に固定した。元のplayer保存やbrowser storageは操作していない。
- 数値は最終コードで生成した `final-results/` の20 JSONを採用した。wide100はA/B/C各3 fresh processes、各processで同じ入力から3回。local/mixedは各方式1 process、各3回。Linux、Node `v24.22.1`、`--expose-gc`。最終性能計測は逐次実行した。
- 先行pilot、修正前の性能値、並列に実行した1か月gateのcold時間は性能比較に使わない。再現手順は [TESTS.md](TESTS.md)、設計は [DESIGN.md](DESIGN.md)、独立レビューは [REVIEW.md](REVIEW.md)。

## 1 clone A B C の比較

| 方式 | 表現とclone | 独立性 | 主な負担 |
| --- | --- | --- | --- |
| A | 通常の `arrivals` 配列とnative `structuredClone` | 従来の基準 | 到達記録本体を重複保持する |
| B | viewを研究用markerへ投影し、投影graphをnative cloneした後、新eventsからindexを再構築 | copied eventsだけを参照。元graphのalias/cycleを保持 | 投影時に普通のrecordも複製する。native clone前後の一時graphが必要 |
| C | plain record/arrayをseen map付きで専用cloneし、新eventsからviewを再構築 | copied eventsだけを参照。元graphのalias/cycleを保持 | JSで全graphを走査する。native cloneの汎用互換性はない |

B/Cとも、viewの順序、件数、`e1`からのevent ID、到達eventへの参照を検証してから複製する。壊れたindexをclone時に黙って修復しない。追加eventはeventsへ登録してからviewへ一度だけ追加し、旧snapshotの件数を変えない。コピー側のpayload変更が元側へ届かないこと、town-root、view-root、alias、cycleもfocused testで確認した。

`ArrivalView` はArrayではない。直接のnative cloneや既存の `Array.isArray` consumerをそのまま互換とみなせない。CはDate、Map、Set、symbol、accessor、未知prototype等を拒否する制限付き研究cloneである。B/Cとも予約marker衝突を拒否し、own `__proto__` data propertyを維持する。転送optionsと非同期利用には対応しない。

indexはUint32Arrayで、実件数の4倍byteだけでなく確保済みcapacityを数える。100年時点のlocal/mixedは16,384 bytes、wideは32,768 bytes。wideの4,801件を詰めた理論値19,204 bytesと、実確保32,768 bytesを混同しない。event本体、view object、graph管理領域はこのindex容量に含まれない。

## 2 推奨する clone と判定

- **A: 正式側の基準を維持する。** 今回の範囲では正式cloneを置き換えない。
- **B: 現方式は不採用。** wideのwarm cloneはAの約2.51倍、月次は約1.59倍。保持heapが減っても、二重のgraph処理と一時領域を正当化できない。
- **C: 追加研究。** Bより負担は小さいが、wideのwarm cloneはAより15.4%遅い。初回cloneは88.4%遅く、warm地図読取りも約1.98倍。保持heapの利点だけで正式採用しない。

Cはguard中のすべての `structuredClone` 呼出しを専用cloneへ切り替える。したがって月次時間の差を、到達記録の重複除去だけの効果とは言えない。clone方式、object layout、JIT、GCの影響を分離する比較が次に必要になる。

## 3 地図の接続

`map-adapter.mjs` は既存 `world-map-view.mjs` を読取り、到達記録を受け入れるguard一箇所だけをassert付きで置換する。描画文や地図の計算は変更しない。対象ソースSHAは `2060e8be29ee2bdae9e8987a66d54f5b7e99f551a5d5789b0510d080b770f283`。

iterator経由と、`at(index)`を使う表示専用accessor経由の双方について、通常配列版の `mapProgress` とdeep equalityで比較した。`activeShops` のSet所属も比較対象に含めた。毎回の地図読取りのために全到達配列を作らない。ただし研究adapterは毎回indexをvalidateするため、全件走査の時間はかかる。

元の `mapProgress` にviewを直接渡すと、既存Array guardが到達記録を空扱いする。focused testはこのsilent failureを検出する。地図の集計結果自体は到達順序を表現しないため、順序の証拠は別のindex testと全sessionのJSON一致が担う。実画面、DOM描画、Safariでの動作は未確認。

## 4 正式な月次処理への接続

実行したのは未変更の `partner-orders.mjs` の `tickDistillery` と既存のtownモデルである。`run.mjs` はさらに `reconcileCaskSlots`、`advanceRecentLedger`、`advanceHistoryRecord`、`advanceRecall` を呼び、正式sessionの次状態を比較する。比較しやすい別モデルへの置換ではない。

同期の研究区間だけ `globalThis.structuredClone` をB/Cへ差し替え、例外時も `finally` で元へ戻す。正式restore/serializeはこの区間の外に置く。これは隔離process内の実験方法であり、本編でglobal関数をpatchする提案ではない。

各月の結果は `ArrivalView` のまま次月へ渡す。比較用に展開したobjectは破棄し、compact側へ戻さない。実際の月次経路の到達記録操作は追加と量子化で、量子化はcanonical eventsを走査する。Labのexport/summaryを月次経路へ混ぜていない。

最終72比較では、各月のcompact viewを含むcloneは1回。guard内の全clone呼出しはlocalで2,985〜2,986回、mixedで3,302〜3,303回、wideで3,277〜3,278回だった。`fullExpansions` は全件0、adapter経由の配列materializationも全件0。これは対象経路のソース監査と併せた結果であり、将来の全consumerに対する万能検出ではない。

## 5 正式状態と乱数と履歴の一致

各月で全sessionのdeep equalityとJSON文字列一致を確認した。core/RNG、町の全配列、event/arrivalの順序とID、店舗、在庫、操作履歴、history、recent ledger、recall、cask slotsを含む。元snapshotの件数と展開時hashを前後で照合し、events配列が別objectであることも確認した。

| 方針 | Bの月次一致 | Cの月次一致 | 元入力不変 | 12か月後の通常版正式保存と再読込み |
| --- | ---: | ---: | --- | --- |
| local | 12/12 | 12/12 | 一致 | 一致 |
| mixed | 12/12 | 12/12 | 一致 | 一致 |
| wide | 12/12 | 12/12 | 一致 | 一致 |

世代交代の補足では、localの321/636/955月、mixedの306/610/918月、wideの314/630/930月の既存保存を使った。各入力で正式 `handoverGeneration` と次の `tickDistillery` をB/Cで実行し、**9入力 × 2操作 × 2方式 = 36結果**の全sessionと完成済み回想のreadbackが通常版と一致した。これは各方針3つの特定境界であり、各方針9世代の新規再生ではない。入力は正式codecで展開したが、ここではauthoritative cold replay検証を繰り返していない。

過去の到達先との再接続も補足集計した。100年時点に既存だったrelease IDについて、12か月の新arrivalはlocal 19件、mixed 32件、wide 56件。そのうち開始前と同じrelease IDと到達nodeの組は19/25/46件だった。これは過去の銘柄が既存到達先へ再び届いた証拠であり、新しい実店舗販売契約や50年後の再登場を実証したものではない。

## 6 12か月の継続

3方針すべての1か月gate成功後に、各100年保存を正式 `readSession` で読み直し、1200月から1212月まで逐次実行した。下表の月次はcollectorを含む継続runの中央値であり、次節の同一入力反復とは別条件である。

| 方針 | 到達件数 1200→1212月 | 1212月events | A月次 ms | B月次 ms | C月次 ms | 正式cold読込み 秒 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| local | 3,084→3,103 | 4,010 | 57.305 | 93.019 | 57.499 | 57.528 |
| mixed | 4,035→4,067 | 5,238 | 71.820 | 122.150 | 64.360 | 77.415 |
| wide | 4,801→4,857 | 6,205 | 78.851 | 140.537 | 83.227 | 110.276 |

正式cold読込みは従来readerによる全再生を含む観測値。wideのcold reader中には診断用local C計測1本が短時間重なったため、cold時間の方針間比較は厳密に制御した比較ではない。診断出力は性能集計から除外した。compact化前の正式復元は依然として遅く、codec展開だけの約0.1秒を、この57〜110秒の代わりに示していない。次節の最終15本のphase計測はその後に逐次実行し、同時実行はない。

## 7 容量とメモリと性能

### wide100 の制御した反復

各方式3 fresh processes。初回は各processの最初の1回、warmはその後2回ずつの計6回。各回は同じ1200月入力からcloneして1か月進める。単位はms、値は中央値。範囲は全観測値の最小〜最大であり、信頼区間ではない。

| 方式 | 初回clone | warm clone | 初回月次 | warm月次 | 初回地図 | warm地図 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A | 50.913 | 52.504 | 95.895 | 86.726 | 1.900 | 1.346 |
| B | 156.009 | 131.602 | 165.988 | 137.666 | 3.730 | 2.117 |
| C | 95.910 | 60.577 | 102.689 | 84.358 | 4.967 | 2.667 |

warm cloneの範囲はA 44.821〜57.916、B 113.940〜147.835、C 46.485〜82.213ms。warm月次はA 71.261〜97.610、B 124.011〜141.791、C 65.970〜108.143ms。Cの月次中央値はAより2.7%短いが、範囲が大きく重なり、継続12か月のwide中央値は逆にAより5.5%長い。安定した高速化とは判定しない。Cの初回地図には27.615msの観測もあり、中央値だけで隠していない。

工程を分けたwide100中央値は次のとおり。

| 工程 ms | A | B | C |
| --- | ---: | ---: | ---: |
| codec展開とJSON parse | 110.895 | 119.166 | 126.087 |
| view構築と整合確認 | 0.002（no-op） | 13.411 | 13.539 |
| 通常表現の再構築と正式codec | 110.769 | 109.359 | 113.947 |

最後の行は明示的なhydrate、JSON化、codec比較を含み、正式モデルのfull replay検証ではない。全session一致を検査する継続runでは、比較用展開とdeep/JSON equalityを別計測した。wideの中央値はB 74.506ms、C 83.526msであり、月次時間へ混ぜていない。

local/mixedの補助計測は各方式1 processだけなので、wideと同じ反復数の証拠とは扱わない。

| 方針と方式 | 初回clone ms | warm clone ms | 初回月次 ms | warm月次 ms |
| --- | ---: | ---: | ---: | ---: |
| local A | 40.908 | 32.630 | 98.484 | 67.231 |
| local B | 103.341 | 79.681 | 145.167 | 106.549 |
| local C | 64.464 | 35.129 | 85.174 | 50.389 |
| mixed A | 47.088 | 44.264 | 114.080 | 78.419 |
| mixed B | 145.879 | 115.689 | 162.895 | 131.474 |
| mixed C | 82.883 | 44.352 | 106.713 | 72.131 |

### GC後の保持メモリ

単位はMiB（1,048,576 bytes）。wide100の3 processesの同一フェーズ中央値。`heapUsed` はGC後に残ったheapで、同期処理中の最大allocationではない。

| フェーズ | A heapUsed | B heapUsed | C heapUsed |
| --- | ---: | ---: | ---: |
| 通常表現のdecode直後 | 35.563 | 35.563 | 35.563 |
| view構築後 | 18.277 | 15.607 | 15.607 |
| 初回clone後 | 28.164 | 22.703 | 19.941 |
| 初回月次後 | 38.363 | 30.044 | 24.530 |
| 最後の結果参照を解放した後 | 18.740 | 16.143 | 16.136 |
| 正式codec処理後 | 36.680 | 34.123 | 34.116 |

最後の結果解放後はCがAより2.604MiB、13.9%少ない。localは15.359→13.761MiB、mixedは17.311→15.144MiBだった。月次直後にはsource、明示clone、月次出力の参照が同時に残る。従って38.363→24.530MiBを単独のゲーム状態の削減率とは言わない。CとBのobject配置の差も含まれ、差のすべてをarrival本体削除へ帰属しない。

Uint32Arrayのbacking storeはheapUsed外にも計上される。wideのview構築後と最後の結果解放後のarrayBuffersはA約0.202MiB、B/C約0.233MiB。indexを含めないheap値だけで全メモリと呼ばない。

process lifetime maxRSSの中央値はA 208.504MiB、B 233.809MiB、C 216.469MiB。Bの投影一時graphを含め、**process全体のhigh-water改善は示せなかった**。maxRSSはそれ以前の全工程を含み、cloneや月次だけのpeakではない。GC直後sampleから一時allocation peakも推定しない。Aはno-opのview構築前後でもheapが減るため、同一processのその差をviewの削減量に使っていない。

### 保存に関する容量

| 方針 | 入力session UTF-8 bytes | 展開ゲーム JSON UTF-16 units | 既存上限まで追加可能な最大units |
| --- | ---: | ---: | ---: |
| local | 3,467,349 | 3,806,900 | 2,209,483 |
| mixed | 4,535,936 | 4,938,560 | 1,077,823 |
| wide | 5,282,030 | 5,838,093 | 178,290 |

上限は厳密な `< 6,016,384` なので、表は `6,016,383 - 現在長`。byte、UTF-16 code unit、heapを区別する。12か月後に通常版で再保存したsessionのUTF-8容量はlocal 3,491,960、mixed 4,566,633、wide 5,339,646 bytes。この数字はcompact runtimeを正式保存した結果ではない。

## 8 残る全展開と検出の限界

1. 初回の正式 `readSession` は既存codecで到達配列を再構築してから正式検証する。compact viewはその後で作るため、初期展開とcold replayは減らない。
2. 正式serializationは通常配列を必要とする。`compactFormalGame` も導出arrival配列とJSON全体を作って比較する。B/Cのviewをそのまま正式storageへ書く経路はない。
3. 継続runは各方式・各月に、元snapshotの事前hash、事後hash、結果比較の計3回、全到達記録を明示展開する。これらはguard外の検証費用であり、実runtimeの性能として計上しない。展開objectを次月へ持ち込まない。
4. `measure.mjs` の最終段階も正式codec確認のため明示展開する。測定中の小さい表示集計objectやUint32 indexは許容するが、到達記録の全body配列とは別に数える。

guardは `hydrate`、viewの全 `map`、全件を返す `filter`、全 `slice` を拒否する。bounded suffixの配列は記録できる。一方、任意のconsumerがiteratorへ `Array.from` やspreadを使えば、このadapterのカウンターだけでは検出できない。今回の「全展開なし」は実際に実行した正式月次経路のソース監査付きの主張であり、未監査consumerや将来実装の保証ではない。

## 9 正式保存上限の設計

現行v8 sessionのgame wireは既に `arrivals:null` とcanonical eventsを保存する。runtimeの重複保持を減らすだけでは、展開後の正式JSON長の制限を緩和できない。ゲーム上限は6,016,384、session上限は6,017,408 UTF-16 code unitsのstrict less-than。保存形式、版、上限、正式validatorは変更していない。

streamingで検証可能なのは、event IDの型・一意性・順序、arrivalの件数、indexの所属、event値との一致などである。ただし「同じJSON長」まで配列なしで測るには、property order、escaping、surrogateを含むUTF-16長、数値表現、aliasのJSON化を規定したcanonical serializerと独立testが必要になる。全状態と操作replayの同値性をindexの整合性へ置き換えてはいけない。

安全な移行案は、まず既存v8 readerと正式検証を通し、元保存を残したままメモリ内viewを導出する方式。ただしこの案は初回展開peakを解決しない。初回からcompactに読むには、別のtrusted reader契約、旧保存互換、改変・破損検出、fallbackを独立して設計する必要がある。本研究にはその実装も容量改善の証拠もない。

## 10 L100-4B と L100-4C への接続

arrival indexは破棄して作り直せる派生データとし、private class fieldsを永続形式にしない。独立して検証済みのeventsからcanonical順で再構築する。現在の生きたviewが壊れている場合は研究cloneを停止する。将来の読込み時にindex cacheだけが壊れた場合の再構築とは区別する。

checkpointには、モデル・規則fingerprint、操作prefixの完全なdigestと長さ、RNG、game状態、origin、世代identity、再生context、collectorの境界を結び付ける。[H1-A2契約](../checkpoint-research/CONTRACT.md) のmanualSources/nearbyCasks/nearbyProducts等のMapと履歴collectorは、現在gameだけから復元できるとは限らない。Cの制限付きcloneが、これらMapをそのまま扱えるという意味でもない。

H1-A3の作成時検証、H1-A4のcommit-last、revision、fallback契約は設計要件として引き継げるが、異なるruntime表現の実証済み保証として流用しない。自己hashは偶発破損と対応の確認であり、偽造されたcheckpointの正当性の認証ではない。作成時の全再生検証、ロード時の局所検証、毎回の独立全再生を明確に分ける。

分割保存ではevents segment、tail、collector、manifestを同じgeneration/commit IDとhashへ結ぶ。manifestを最後に確定し、candidate全体の検証が終わるまで利用中状態へ渡さない。新世代が完成するまでlast-known-goodと元bytesを保持する。別々には正しい異世代の断片を混ぜない。

| 不具合 | 必要な扱い |
| --- | --- |
| index cacheだけの欠損・破損 | eventsが独立に正当と確認できた場合だけ再構築 |
| eventsの欠損・重複・順序変更 | index再構築では回復できない。停止して原bytesを保持 |
| checkpointとprefix、モデル、世代の不一致 | candidateを拒否し、別途検証済みの旧保存から復元 |
| 書込み中断、quota、競合、readback失敗 | 部分成功を採用しない。前の完全commitを維持 |
| すべての復旧元も不正 | 検出して停止。新規gameで上書きしない |

本repositoryの正式storageは既存方式のまま。IndexedDB、新しい保存key、checkpoint採用、耐久backup、復旧機構を実装したとは報告しない。

## 11 次の段階

1. Cを対象に、正式modelへglobal patchを入れない明示clone境界を別途研究する。普通recordのcloneとarrival参照化の効果を分け、native-compatible plain graphだけの比較も置く。
2. 初回とwarmのclone退行、地図のvalidate走査、object配置、一時graph、同期allocation peakを個別に調べる。複数processで反復し、cold reader、codec、map、collectorを混ぜない。
3. 新consumerごとにArray guard、iteratorの全配列化、export/serialize、alias/cycleを再監査する。制限付きcloneの対応範囲を黙って広げない。
4. L100-4B/4Cは上記の信頼境界と復旧契約を先に固定する。上限変更、旧データ削除、checkpoint採用はこの研究結果から自動承認しない。
5. Node上の結果が改善してから実browserを測定する。Safari実機、複数tab、終了・再起動、storage中断は別の試験として残す。

今回の12か月と特定交代境界を、100年全期間のcompact replay、無制限の将来同値、長期保存の耐久性、正式容量制約の解決へ拡張しない。

## 12 Draft PR とテスト証拠

成果は [Draft PR #833](https://github.com/SukimaStock/yumaniwa-town-staging/pull/833) に隔離する。mainへマージせず、Productionへ反映しない。変更範囲はPlan Lockと `works/ambertime/l100-4a-3/` の研究コード・資料のみ。正式model、save codec、保存上限、RNG、history/recall選出、UI、Canvas、既存テスト期待値を変更しない。

- focused adapter testは20/20成功。marker衝突、own `__proto__`、古いindex、duplicate/out-of-order append、元graph独立性、例外時global復旧、地図のsilent-empty検出を含む。
- adapterと正式保存・回想保存の関連回帰は最終ログで36/36成功。独立reviewerもfocused 20/20を再実行した。
- 3方針の1か月gate後、最終コードで12か月72比較、handover/next-month 36比較、補足再接続3方針が成功。全100年入力の元bytesは不変。
- レビューでmarker衝突、`__proto__`扱い、計測結果holderの解放漏れを修正した。性能値は修正後の20 JSONのみを採用する。
- 実装commit `2b0b612486e82bfc5387c5ece4522492ff7cf64e` でScope/Risk/Impact/Trusted StaticはPASS。GitHubのexact headの `validate`、`plan-risk-gate`、`trusted-mechanical-evidence` も成功した。報告文書追加後の最終headは別revisionとなるため、最終CIはPRの該当revisionで確認する。
- 正式ソースhashと入力hashは `inputs.json`、詳細計測は証拠一式の `final-results/`、再現commandは `TESTS.md`。検査成功を正式採用や実機確認と同一視しない。
- 表現監査の6点を確認した。追加のplayer向け文言・装飾・常時表示UIはない。報告は観測結果、制限、次の検証を分けて記載した。

実測対象の研究コードSHA-256を以下に固定する。公開後に実装が変わった場合、この数値を新実装の性能として再利用しない。

| ファイル | SHA-256 |
| --- | --- |
| adapter.mjs | `f631d7b17deb0f74c33e2c8adcc3671c15af4637ba74c0bf5adf0db0044c93e9` |
| adapter.test.mjs | `ac735999d616516da64f38929addd3d6f5a1c70ecc91b5b516c4e558e0d7afcf` |
| map-adapter.mjs | `aae8f03866a29a2472f91297d115df1a8068df4b6fab4e4bfd0e63e19b9e3fbb` |
| run.mjs | `7857690e3884f108b98aeed4c4968e5a425981424c02f4eee15c1b61cd1f7cbc` |
| measure.mjs | `253157cb56f232910bb2673d722b88f6295e32e4236b97dcbc9e4495e274f46a` |
| handover.mjs | `1743540e1d7a731806585879f241f34f4fd75faa0a12fe482fa050ee4ce7c704` |
| reconnections.mjs | `43fb6c09eecae9374bd9f92e6e8489ad9ee81c162b4b4f895ef00b3a9f5bd796` |
