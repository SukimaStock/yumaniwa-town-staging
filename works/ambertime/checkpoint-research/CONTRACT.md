# H1-A2 再生契約と信頼境界

基準は H1-A1 を取り込んだ Staging main `0f22b025542ebb09abb464c632d998fbc88cac2c`。これは既存コードの読取分析であり、本編の保存契約を変更する文書ではない。研究結果の実測・一致範囲は同ディレクトリの検証記録を参照する。

## 現行の入口と境界

`partner-orders.mjs:1292–1353` が再生・検証・投影の入口となる。

| 入口 | 現行の動作 | checkpoint研究で保つ条件 |
| --- | --- | --- |
| `restoreDistillery(text)` | UTF-16長の上限確認、JSON解析、旧版3/4/5は旧reader経由の移行、現行版は正式検証 | 旧版移行と現在版の部分再生を混同しない。元保存をそのまま残す |
| `validateDistillery(state)` | coreの検証、seed/origin/版/操作数確認、初期状態または一致prefixから操作適用、途中蒸留・試飲の復元、全JSON一致 | 状態全体の一致が契約。経済だけ、乱数だけ、近似数値だけの比較へ弱めない |
| `serializeDistillery(state)` | 正式検証後に `JSON.stringify(state)` | 研究用メタデータを正式状態へ足さない。現行の再保存と同じバイト列を比較する |
| `replayDistilleryOperations(state, observer)` | 初期状態から全操作をcold再生し、操作の前後snapshotをobserverへ渡す | 描画向けの履歴は最終状態の単純コピーでは再現できない |
| `createProjectionReplay(state, observer, previousToken)` | module-local WeakMapのtokenから、一致prefixだけを継続可能 | token自体は永続データではない。状態・context・prefix identityを明示して検証する |

正式検証のprefix一致は `seed`、`JSON.stringify(origin)`、操作件数、prefixのJSON文字列による。seedや月が同じだけでは別分岐を同一扱いしない。tokenは別module instanceやprocessへ渡して使う保存形式ではなく、その寿命は現行moduleのメモリ内に限られる。

正式検証用cacheとprojection continuationは別物である。前者は操作再生後に `E.endTasting(j)` した境界状態を保持し、そこから保存に記録された途中蒸留progress・試飲状態を補完する。後者はobserverへ渡した操作の直後状態とcontextを保持する。この違いを無視して両cacheを相互利用してはいけない。

`applyOperation()` は各操作前に試飲を終了し、`apply(state, operation, context, globalIndex)` がその結果から派生contextを更新する。部分再生でも同じ順番、同じ小数丸め、同じ操作indexを使う。操作prefixを削除したり、tailのindexを0へ戻したりしない。研究用境界は記録済み操作の間に置く。未記録の蒸留progressや画面だけの状態は別の試験項目とする。

## 状態と再生context

`partner-orders.mjs:1247–1289` の空contextは、3つのMapと2つの数値で構成される。

| 情報 | 保持・復元の分類 | 理由 |
| --- | --- | --- |
| 正式ゲーム状態全体 | 完全保持 | core、在庫、樽、商品、店舗、世代、予約、判断、評判状態、乱数をそのまま継続する |
| `operations` と `origin` | 今回は完全保持 | 境界対応、全再生fallback、旧版の由来、操作位置を検証する正本 |
| `manualSources: Map` | 境界時点のcontextを保持 | 手動で樽詰めした停止位置・樽型・flavorChoice・global operationIndex・世代を含む。保存レシピや現存樽だけから全件復元できない |
| `nearbyCasks: Map` | 境界時点のcontextを保持 | 蒸留月、停止位置、手動/委任、commissionedFromの由来。終了済み樽も対象となる |
| `nearbyProducts: Map` | 境界時点のcontextを保持 | 初期価格・価格変更履歴、販売開始月、販売対象月数、初売/最終売月、価格別数量・金額。現在商品から過去を再構成できない |
| `manualFills` | 境界時点のcontextを保持 | 正式な手動fill完了だけを数える。自動処理を手動経験として数え直さない |
| `manualBottles` | 境界時点のcontextを保持 | 手動の記録済みbottle操作で新規生成された商品のoriginalStockを累積する。現存在庫の合計とは異なる |
| 日時・現在世代・ID・乱数 | 正式状態に既に含まれる値を保持し、メタデータと照合 | 独立した二重カウンターを新設しない。配列length/indexを採番に使う評判状態もそのまま残す |
| coverage | originからの再構成が可能。ただし値を比較する | `complete: origin === null`、`fromMonth: origin?.core.month ?? 0`。旧版以前の未知の過去を完全履歴として扱わない |
| メモリ内cache・WeakMap token | 再構築対象 | 現在processだけの高速化。checkpointが存在することの信頼根拠にはしない |

MapはJSONで直接保存すると内容が失われる。研究用codecは順序を持つentry配列等で保存し、キー型とentry順を保ってMapへ戻す必要がある。単なるobject化は数値キーの並び替えや文字列化を起こし得る。戻したcontextは独立して複製し、同じcheckpointから進めた別分岐で共有・変異しない。

`manualSources` は担当者の採用・製法指定・レシピ保存に、`nearbyCasks` は委任元の検索にも使われる。したがって、現在状態だけが一致してもcontext欠落を安全とは判定できない。欠落後の採用、依頼、再発売、価格履歴資料、世代交代後の依頼を実行し、最初の不一致操作を特定する。

旧保存の `upgraded()` は版5相当の旧状態をoriginとして残し、新しい操作列を空から始める既存契約である。新研究checkpointの領域としてoriginを流用しない。旧origin以前のmanualSourcesが不完全な場合、推測で補わない。

## 帳面と歴史資料は別の継続状態を要する

ゲームの再生contextは、すべての帳面・歴史collectorの内部状態を含むものではない。

| 資料 | prefixから必要となるもの | tailだけにした場合の不足 |
| --- | --- | --- |
| 仕込み・樽帳面 | manual source、fill時の初期profile、履歴・試飲・選択・観察・液量のcollector | records12件、archive24件、cask.history12件等から消えた過去の詳細 |
| 発売・瓶詰め | releaseと元樽の対応、販売開始/価格/販売期間等のnearby receipts | 現在の在庫や売上合計だけでは価格・販売期間を復元できない |
| 店舗納品・取扱店 | 現行の全relation/delivery、release/adoptionとの結合 | 将来集約するときは初回・直近・数量・金額と由来の代替が必要。今回は削除しない |
| 歩み・ブランド歩み | event Map、firstSales/firstDistillationsの集合、世代actor、製造・取引・納品の過去事実 | 過去の初回イベントや、pruneされた事実、当時の世代対応 |
| 世代詳細 | 世代ごとのtotals、seenShops、unknownPast、frozen/mature等のcollector状態 | 世代境界で確定した集計、最初の店、初の長熟瓶詰めを失う |
| raw歴史事実 | direct/fill/release/receipt/handover/townのMap、sales/caskTypes/townOrigins、元ID・操作位置・順序 | 根拠、因果chain、ordinal、当時の主体・銘柄snapshotを復元できない |

根拠は `cask-ledger.mjs:12–56`、`distillery-history.mjs:9–80`、`generation-summary.mjs:10–65`、`memory-lab/connections.mjs:13–80`、`chronicle-lab/facts-generate.mjs` と `research-h24-facts.mjs`。既存collectorは関数内closureにMap等を持つ。返却された完成資料を単純にtailの完成資料へ連結するだけでは重複、first判定、集計、順序が変わる可能性がある。

正式本編を変更しない研究では、固定した元ソースをメモリ内だけでロードし、既知のseamをassertした上で内部関数・collectorを研究用に観察する方法を使える。製品ファイル自体は編集しない。抽出元・依存graph・研究コードのfingerprintを結果へ紐付け、seamが変わった場合は停止する。全再生を研究用の新実装へ置き換え、それを同じ実装同士で比較しただけでは独立oracleにならない。元moduleの正式readerによる結果も照合する。

prefixの全observer snapshotを保存すれば資料を再生できるが、操作数×状態容量の増大を起こす。これはコンパクトな歴史記憶の完成を意味しない。H1-A2で保持した補助資料の実容量と生成負荷を含めて報告し、資料の不足が残る範囲は未検証または不一致として残す。

H2-5はraw事実を交代境界で切り、その後C-3を適用する。現在時点のC-3候補を後から切る方法へ戻さない。グローバルoperationIndex、replayOrdinalとseed用ordinal、handover ID、cutoff、世代、根拠chainを保持する。21〜23の採用場面だけの保存では将来編集と再登場の材料が不足する。境界候補は未来の操作によって変わらない正本とし、選出結果は版・seedを伴う検証可能なcacheとして分ける方針を維持する。

## 信頼性・失効・復旧

研究checkpointの自己ハッシュは偶発破損の検出と対応確認には役立つが、内容の正当性を外部から認証しない。stateとcontextを書き換えてハッシュも再計算できる主体には、ハッシュだけでは対抗できない。また、元prefixを削除した場合に元操作の妥当性を証明するものでもない。

| 条件 | 研究段階の扱い |
| --- | --- |
| 元保存・prefix・checkpointの対応不一致 | 部分再生を拒否し、保持した正式保存から全再生する |
| tailの改変・欠落・順序変更 | 元保存の操作suffixとの一致を検証して拒否する。月と件数だけで判定しない |
| モデル・規則・依存fingerprint不一致 | checkpointを失効させる。旧版実行か正式全再生を選び、暗黙に新規則で継続しない |
| 別seed・別origin・同seed別prefix | 誤接続を拒否。分岐ごとに独立した状態/contextへ複製する |
| 途中蒸留・試飲・保留判断 | 確定境界とは区別して同じ補完手順を検証する。非対応なら拒否しfallbackする |
| 破損checkpoint | 元保存と全操作履歴を保持し、正式readerで再生成可能とする |

checkpointの作成時に一度だけ全再生照合した場合、その後のロードは「その作成経路を信頼する」条件付き復元である。毎回prefixから独立全再生し直す検証と同じ保証ではない。計測は純粋tail再生、局所整合性検査付き部分再生、現行と同等の完全再検証を分ける。同等保証を実装していなければ、正式復元の高速化倍率として報告しない。

## H1-A3へ残す判断

H1-A2は部分再生の成立条件を調べる。正式readerへの接続・新save key・移行・削除は行わない。

次段階では、複数seed/銘柄、旧origin、担当者・委任、抽出途中、試飲、未処理申し出、世代交代前後、長期memory・50年後の再登場について未検証範囲を埋める。collectorの増分生成は全再生資料と別に比較し、H2-5の全9交代境界の候補・根拠・seed・採用順を守る。

checkpoint間隔は世代・年次・操作数・容量/負荷の管理負荷も比較してから決める。世代交代だけでは約25〜27年のtailが残り得る。頻繁なcheckpointは作成・検証・書込回数を増やすため、復元時間だけで採用値を決めない。

checkpointを導入しても大きなtown状態はそのまま残る。容量対策はattemptsの集約、arrivals/event重複、live因果参照、seen、受領保存則、単調ID等を別に検証する必要がある。checkpoint研究の成功を保存容量問題の解決とは扱わない。

正式採用の前に、新version、旧完全reader、移行前backup、破損検出、複数checkpointの保持数、失効/再検査条件、fallback、移行中断、rollbackを設計する。古いprefixや詳細の削除は代替情報と将来分岐・資料の同値性が確認されてからの別判断とする。
