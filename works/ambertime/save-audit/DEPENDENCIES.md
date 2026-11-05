# H1-A1 データ依存関係と長期保存案

対象は Plan base `7b138e2a78cefe258b780d8426a1b508e4cfb357`。本編コード、正式保存形式、既存資料は変更していない。以下の削除可能性は将来の契約下の検討であり、現形式から削除してよいという判定ではない。

## 役割と代替条件

A=現在状態、B=最近の帳面、C=歴史記憶、D=復元検証。複数役割を併記する。

| 項目 | 役割 | 現在・将来の計算への依存 | 帳面・回想への依存 | 整理段階／代替に必要な情報 |
| --- | --- | --- | --- | --- |
| core / still / inventory / RNG | A,D | 資金、熟成、在庫、抽出途中、経済の乱数を継続 | 稼働中の原酒・樽・瓶 | 3：完全保持。全状態・将来分岐一致が必要 |
| operations / origin | D,B,C | seed/originから完全再生し状態を照合。manual/staff経験や元レシピも復元 | 仕込み・樽・世代・歴史の資料生成 | 2：永続checkpoint＋tail＋再生context＋歴史事実が成立した後に検討。現行では削除不可 |
| releases / productsById | A,B,C,D | 店舗資格、再発売、世代trigger、販売mirror | 発売・銘柄系譜・初瓶詰 | 2：release/product/brand/cask ID、由来、経済集計・必要profileを保持 |
| records | A,B,C,D | 旧卸売の累計sold/young/36か月機会判定、現在商品の同期 | 元樽・味・試飲・売上 | 2：集計と近接窓・由来事実。recordsは既に12件上限 |
| shop.deliveries | A,B,C,D | 商品別売上mirror、店・銘柄stats、当月上限、最新納品の世代trigger | 納品、初回、再登場、収益 | 2：店/商品/銘柄別数量・金額、直近窓、初回/最終、ID継続 |
| shop.relations | A,B,C,D | 現在取扱、開始から120か月の世代trigger | 取引開始、同店の再登場 | 3：永続shop/brand ID、startedMonthを保持 |
| town.releases | A,C,D | 配列のid-1で将来反応のprofile参照、配列lengthでID採番 | 発売対応 | 2：ID map/counterと参照されるproduct snapshot |
| town.shipments | A,B,C,D | 受領重複防止、release別瓶数保存則、relationshipの全期間集計 | 実売/納品の根拠 | 2：受領ID index、release別shipped total、適合contact数・distinct quarter・first/last・fit集計 |
| town.events | A,B,C,D | 配列lengthによる採番、直近12か月rumor上限、因果source | 口コミ・問い合わせ・訪問の参照chain | 2：単調ID、直近rumor窓、live source closure、歴史候補根拠 |
| town.arrivals | B,C,D、一部A | eventsと同じ出来事の実体を別保持。world-map-view.mjs:7–24の到達段階判定からも参照 | 到達・評判の履歴 | 1：共通実体とID参照への変更可能性。地図の到達済み段階をevents由来の索引/集計で維持し、全参照とvalidatorの置換証明が必要 |
| town.attempts | D、研究 | appendのみ。将来計算からの読取は確認されず | 抽選経過の研究・debug | 1：古い詳細の集約候補。検証統計・必要なら別debug記録を保持。現形式では全状態一致の対象 |
| town.seen | A,D | cohort/place再到達を抑止 | 重複の根拠 | 3：live keyを保持。cohort退役条件が証明されるまで古いkeyも削除不可 |
| town.memories / pending / packets | A,C,D | 将来の反応、長期再登場、dueとsource参照 | 因果根拠 | 3：active記録と参照先closureを保持。retiredの整理は別検証 |
| generations | A,B,C,D | 現在phase、最後の仕込み・経験・世代移行 | 世代境界、summary、seed | 3：active完全保持。completedは節目・集計・境界を保持 |
| core.archive / journal / cask.history | B,C,D、一部A | archive24、journal120、history12の既存上限 | 最近の製造記録 | 無制限増加の主因ではない。由来参照を確認してから個別検討 |

段階1＝依存上は整理可能性が高い、2＝代替情報の保持と同値証明が必要、3＝現在必要または安全性未確認。現行の正式検証は全オブジェクト一致を要求するため、**今回削除可能と認定した正式データはない**。

## 根拠となる入口

- `partner-orders.mjs:1292–1333`：完全再生、prefix cache、途中蒸留、全JSON一致、復元上限。`:1338–1353`：独立projection token、cold observer API、各操作のbefore/after複製。
- `partner-orders.mjs:1050`：recordsから旧卸売の累計sold/young/recent。`shop-model.mjs:22–38`：deliveries集計とrelease資格。`generations.mjs:29–35`：再発売・店舗関係trigger。
- `town-connection.mjs:19–25`：受領ID重複照合。`experiments/town-simulation/v01/model.mjs:36`：event ID採番、`:95–98`：全shipmentのcontact/quarter/span/fit、`:110`：rumor cap、`:132–176`：seen/pending/packet/memory/source、`:254–267`：release ID/indexと発売別受領上限。
- townの乱数は同model `:33`のseed＋keyによるstateless hash。attempt件数は乱数cursorではない。ただしID/cohort/source keyの変更は結果を変える。core乱数は別に完全保持する。

## 帳面は表示件数と生成件数が異なる

| 画面 | 表示 | 読む範囲 | 今後の分離案 |
| --- | --- | --- | --- |
| 仕込み | 20件/page | worker内の正式検証2回＋全操作cold projection。全saved/unsaved/manual | 確定製造事実・最新手動・保存レシピ。最近一覧を先に生成 |
| たる | 20件/page | 同workerが各操作時点のrecords/releases/notes/archive等を走査 | 稼働樽・最近終了樽・過去の確定製造事実 |
| 発売 | 全件 | 全release/records結合、releaseごと全delivery filter | 最近発売＋累計＋旧release参照 |
| 取扱店 | 20件/page | 全relation/deliveryを全店分生成 | 店別集計を先に生成 |
| 店舗納品 | 20件/page | 全納品をrelease/adoptionに結合しsort後ページング | 最近詳細＋数量/金額/初回/直近集計 |
| 歩み | 全年ボタン、年内50件/page | 初回は全操作再生・全event生成。年選択も全event filter | 年索引・世代集計・歴史節目 |
| 世代詳細 | 集計＋節目最大2件 | 歩みと同じ全再生 | 交代時summary確定 |
| ブランド歩み | 発売全件 | 全release/event/shop filter | 最近発売＋節目。再登場identityを維持 |
| 街での出来事 | 最近8件 | milestones/feedback全件取得・sort後slice | 境界付き最近投影 |

根拠：`shop-app.mjs:305–319,361–363,380–397,403–411,428–447,462–464`、`cask-ledger-worker.mjs:9–15`、`history-worker.mjs:8–10`、`cask-ledger.mjs:39–56`、`generation-summary.mjs:16,65`、`shop-ledger.mjs:11–23`、`ledger-view.mjs:19–34`。UIの表示制限だけでは保存容量は減らない。今回の計測はNodeでのデータ生成でありDOM描画・worker転送・Safariの応答時間ではない。

## 回想のために残す情報

D1.1はoperationsを直接読まず、候補事実を受け取る。現在の資料生成側がoperationsに依存する。よってゲーム進行中の増分事実生成へ移せる可能性があるが、現行C-3と同じ全事実・順番・参照閉包を生成する同値試験が先に必要。

| 用途 | 必要な情報 |
| --- | --- |
| 事実の同定・境界 | id, kind, month, generationId, operationIndex, replayOrdinal, ordinal |
| 対象と再登場 | 永続shop/brand/release/product/cask/batch/region/level/townRelease/townEvent ID、初回/前回/世代対応 |
| 評価と文 | count, age, role, agency、manual、label/sceneの当時snapshot、toGeneration |
| 根拠 | evidence.record, sourceId, sourceChain、由来と因果を区別 |
| 完全性 | coverage.complete/fromMonth、元seed、資料生成版 |
| 当時の再現 | handover ID、cutoff month/op/replayOrdinal/ordinal、incoming seedGeneration、候補集合、ordinal差分、C-3/D1.1/D1.2の版 |

`edition-d.mjs:4–22,45–143,232–268`、`caption.mjs:6–19,51–72`、`recall-boundary.mjs:87–135`、`recall-snapshots.mjs:9–27`を根拠とする。

50年後に同店・銘柄が再登場しても、同一地域・銘柄という関係だけで因果を作らない。永続IDと初回/前回の事実を保持し、実際の口コミsourceChainは別に残す。採用された21〜23場面だけを残すと、将来の再登場や参照元を失うため不十分。

H2-5は **raw事実を対象境界で切ってからC-3** の順。現在時点のC-3結果を後で切る方式に戻してはいけない。境界候補snapshotは、その後の未来事実が増えても不変とする。

| 当時の保持方式 | 利点 | 課題 |
| --- | --- | --- |
| 候補事実＋版固定規則＋seed | 根拠監査と同じ結果の再計算ができる | 旧規則の実行手段と全候補・境界の維持が必要 |
| 選出結果を確定 | 表示が軽く当時の採用結果を保持 | 非採用候補や選出理由の再計算、将来編集への材料が不足 |
| 併用 | 境界候補を正本、選出ID/根拠/文を再生成可能cache | 複数層の版・整合性管理が必要 |

推奨は境界候補を不変にし、選出結果を検証可能なcacheとする併用。永久保存するのが表示文だけにならないようにする。

## A/B/C/D比較

| 指標 | A 現行＋効率化 | B checkpoint | C 状態と記憶を分離 | D B＋C |
| --- | --- | --- | --- | --- |
| 容量 | 全履歴増加は残る | 操作prefixは減らせても大きいtown実体が残る | 試行集約・重複実体の整理が対象 | C＋tail。実測削減率は未確定 |
| cold復元 | 再生/cloneの最適化余地 | checkpoint以降の再生へ限定できる可能性 | 全再生validatorを残す限り限定的 | 状態復元と記憶生成を別々に制御 |
| 過去再生 | 完全履歴 | checkpointより前は別archiveが必要 | 詳細再生を残すなら別archive | 詳細debug archiveを任意に保存 |
| 計算同一性 | 現契約を維持 | replay contextも含めた証明が必要 | 集計置換ごとの全未来分岐検証が必要 | 両方の証明が必要 |
| 旧保存 | 最も容易 | 旧読込→検証済checkpoint移行 | 旧読込→分類/集約移行 | 旧全再生readerを維持した版移行 |
| 回想 | 現資料生成を維持 | checkpointだけでは過去資料不足 | 独立候補と境界を維持 | 不変境界＋歴史候補 |
| 帳面 | 表示制限は可能 | 過去詳細を別途確保 | 最近詳細＋過去集計＋節目 | 同左 |
| 複雑さ/保守 | 低〜中。増大対応が続く | 中〜高。trusted checkpoint契約 | 高。全参照の置換 | 最も高い。段階導入が必要 |
| 破損復旧 | origin/operationsが健全なら再構成根拠 | checkpoint破損時にprefix削除済みなら戻れない | 記憶層と状態層の独立整合性が必要 | 複数checkpoint/元保存/移行rollbackを検討 |

削減率・速度倍率は未実装のため示さない。今回測定する各フィールドの容量は削減対象の上限的な材料に過ぎず、新しいindex/counter/根拠の容量を差し引いた利益ではない。ハッシュだけを残しても、消した操作の正しさや復元可能性は証明できない。

## 推奨とH1-A2順序

将来像はD。ただし最初に削除や正式形式変更をせず、Aの契約を基準に研究用Bを証明し、その後Cを段階的に分離する。

1. **H1-A2の最初**：scratch専用checkpoint＋tailプロトタイプ。既存正式保存と操作を丸ごと保持したまま、交代境界の状態とreplay context（manualSources/manualFills/manualBottles、nearby product/cask資料など）を切り出す。現行全再生と状態・RNG・将来分岐・資料を比較する。実装対象は保存reader交換ではなく同値検証の入口。
2. 世代交代は歴史境界と揃うが、約25〜27年のtailが残る。年次・一定操作数・容量閾値も同じ復元試験で比較する。固定間隔の採用値は実測後に決める。蒸留途中・試飲・旧origin・分岐・staff/委任・未処理決裁も試験する。
3. raw製造/販売/評判事実の増分生成と、交代境界を先に確定する不変candidate snapshotをshadow生成。既存抽出・H2-5の9境界と候補・根拠・seed・採用順が一致するまで本編readerへ接続しない。
4. 日常の帳面を最近詳細・店/年/銘柄集計・節目に分離する設計と索引を試す。全履歴の参照先を個別に置換。UIの採用と正式データ集約は別判断。
5. townのattempts、arrivals/event重複、表示reasonを最初の集約候補にし、ID/counter/seen/因果closure/受領保存則を守って同じ未来を生成するか検証。複数銘柄・50年後の再登場・長期memoryも含める。
6. 正式形式の変更は別判断。新version・旧完全reader・一方向移行・再検証・元保存backup・rollback・破損検出を揃え、容量/初回復元/メモリを再測定してから古いprefixや詳細を減らす。

Bのcheckpointは不正な状態を「検証済み」と自己申告するだけのものにしない。信頼境界（ローカル整合性検査が守る範囲、改変耐性を保証する範囲）、完全再生の再検査条件、版ごとの移行を明文化する。Cの歴史候補もゲーム計算に必要なlive状態の代替にはならない。

## 再生負荷のコード上の根拠

`experiments/town-simulation/v01/model.mjs:274–278`のquantizeReactionはnodes/events/arrivals/memories/pending/packets/attemptsを再帰走査する。外部受領後と月次反応のたびに過去の実体も再走査するため、単純なJSON解析だけでなく、全状態複製と累積履歴の再走査が再生負荷に含まれる。個別のquantizeReaction時間は今回分離していないので、clone以外の残差すべてをこの関数の時間とみなさない。
