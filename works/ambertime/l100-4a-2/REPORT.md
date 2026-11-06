# L100-4A-2：arrivals参照層の比較研究

## 判定：追加研究
推奨はB（eventsへの順序付き索引参照）。12基準の全件・順序・ID・再構成JSONが一致し、通常arrivals配列を保持しないまま、未変更の町月次処理を各12か月進めても完全一致した。C（delta-varint索引の遅延読出し）も一致するが、添字アクセスの線形復号が遅く、索引数万bytesの節約のために複雑化する利点は小さい。

**正式モデルへのそのままの差し替えは不可。正式上限・正式再開時間は改善していない。** structuredCloneでaccessorが失われ、本編tickは失敗する。地図のArray.isArrayも無言で空配列扱いになる。正式保存前には現状、全arrivalsを明示再構成する必要がある。正式導入・マージ・Production変更は一切していない。

## 対象・再現性
- 最新main/base: 28f00c81cb1b374758da34dc79cf7f63dfe657c2。
- Plan Lock digest: 9c48481534c16124404e6287a1689322e47cdaab7ee915fc0b802203cdc2d852（実装前commit dd570c4e）。
- 参照PR #828: Draft/open/unmerged、739754b57e80620235ca2550d2978f69c0813294。
- 参照PR #831: Draft/open/unmerged、05d20df8148d14b6f5029e59b989d252b4d05923。C-pack可逆縮小は本研究のCとは別方式。以前の成果を正式導入済みと扱わない。
- Node v24.22.1、隔離コピー。12入力のSHA-256と原本不変をresults.jsonに記録。
- 変更は研究directoryとPlan Lockのみ。本編・保存・上限・RNG・履歴・回想選定・Canvas・UIは無変更。

## 方式比較
|項目|A 現行通常配列|B 導出参照|C 遅延索引|
|---|---|---|---|
|保持|展開後のarrival個別object配列|events本体＋Uint32順序索引|events本体＋delta-varint Uint8索引|
|個別値・順序|基準|全件一致|全件一致|
|添字|O(1)|at(i) O(1)|at(i) O(n)復号|
|順次走査|O(n)|O(n)|O(n)、1件ずつ復号|
|ID検索|find O(n)|byId O(n)|byId O(n)|
|append|配列push|既存event同一objectだけ許可、索引capacity増設|同じ、差分整数追記|
|cache|全record|record cache 0|record cache 0|
|clone|正式契約どおり|native cloneはprivate stateを失う|同左|
|JSON|通常配列|直接は{}、明示hydrate必須|同左|
|既存表示|そのまま|Array.isArray境界は非互換|同左|
|推奨|baseline|次段階候補|比較用、現時点優先しない|

Cはarrivals専用の遅延参照であり、events自体を圧縮保持する方式ではない。B/Cとも全eventは残す。意味集約・記録削除は行わない。索引packed bytesとcapacity割当bytesを区別する。

## 12基準とライブ町進行
各行A/B/Cすべて、全arrival値、順序、index、ID、因果フィールドを照合。復元JSON全体の完全一致はRNG、町、発売/受領/関係、保持された履歴参照も含む。**セッションの帳面・歩み・確定回想は基準入力で維持されるが、この町だけの試験ではそれらのcollectorを進めない。** 次節の正式モデル試験と区別。
各方式を同じsnapshotから始め、未変更advanceTownを12回実行。B/Cは全期間accessorを維持。全gameを明示再構成してAと毎月一致確認。再構成は照合時だけで、次のtickへ戻さない。

|入力|元の正式units|arrivals units|B/C比較|ライブ町月数|
|---|---:|---:|---|---:|
|local-100-year-1200-v8.json|3,806,900|1,025,164|全件・再構成一致|12|
|local-30-year-360-v8.json|1,663,003|431,775|全件・再構成一致|12|
|local-60-year-720-v8.json|2,631,181|693,803|全件・再構成一致|12|
|local-90-year-1080-v8.json|3,500,658|940,458|全件・再構成一致|12|
|mixed-100-year-1200-v8.json|4,938,560|1,347,528|全件・再構成一致|12|
|mixed-30-year-360-v8.json|1,830,735|478,828|全件・再構成一致|12|
|mixed-60-year-720-v8.json|2,917,707|785,489|全件・再構成一致|12|
|mixed-90-year-1080-v8.json|4,425,277|1,205,032|全件・再構成一致|12|
|wide-100-year-1200-v8.json|5,838,093|1,609,859|全件・再構成一致|12|
|wide-30-year-360-v8.json|2,328,417|624,482|全件・再構成一致|12|
|wide-60-year-720-v8.json|3,737,497|1,019,573|全件・再構成一致|12|
|wide-90-year-1080-v8.json|5,259,993|1,452,446|全件・再構成一致|12|

計36ケース、432月次遷移。年末ゲーム状態は正式codecでcompact/expand往復も一致。ただし町だけ時計を進めたsnapshotは本編のcore時計と同期しないので、正式sessionとして採用・保存していない。

## 100年以降の正式モデル・保存
future.mjsは3方針の100年セーブを正式readSessionで読み、各A/B/Cを**明示hydrateしてから**正式tickDistilleryで翌月へ進め、caskSlots、recentLedger、historyRecord、recallRecordも正式collectorで更新。session全体を比較し、正式serializeSession→readSessionの一致を確認する。これは正式互換境界の証拠でありcompact full-modelの成功ではない。
30→100年の全操作列をcompact状態のまま再演算する試験は未実施。clone境界が未接続なので実施済みとはできない。100年以降の新たな世代交代・回想抽選、再登場を意図的に発生させるフルゲーム試験も未実施。既存確定回想保持と1月のcollector結果一致のみを主張する。

## 容量・メモリ
正式上限は展開後JSON `<6,016,384 UTF-16 units`。B/Cを直接JSON化して小さくなった値は不正形式であり、正式余裕と数えない。wide100の正式5,838,093 units/arrivals1,609,859 unitsは変わらない。保存codecも全再構成後に既存上限を適用する。

12基準のheapは、同じJSON.parse済みgameからarrivalsだけ置き換え、GC後の増減を測定。入力元original等も保持する測定なので、絶対heapを製品1sessionのheapとみなさない。TypedArray backing storeはheapUsedと別にarrayBuffersへ記録。capacityを含め、未使用領域も除外しない。

|100年入力|B heap差分 bytes（warm中央値）|C heap差分 bytes（warm中央値）|B索引capacity bytes|C索引capacity bytes|
|---|---:|---:|---:|---:|
|local|-1,852,696|-1,815,256|16,384|4,096|
|mixed|-2,350,912|-2,350,920|16,384|4,096|
|wide|-2,820,236|-2,820,192|32,768|8,192|

索引は12月後の件数/capacity、heap差分は基準時点の測定。大半の削減はBでもCでも、保存読込時に作られた重複arrival objectを保持しなくなる点にある。現在も保存前には同一event objectを共有する場合があるため、この削減量が常時どのゲーム状態にも適用されるわけではない。

別途wide100を各方式3回、新規Nodeプロセスで測定（memory/*.json）。入力取得、codec展開・parse、唯一game、置換、町更新、clone、明示hydrate+wire保存、再展開のGC後heap/RSS/arrayBuffersを記録。processLifetimeMaxRSSはプロセス生涯の高水位で、各処理の正確なpeakではない。同期処理途中の月次/保存/読込peakとallocation総量は未計測。native B/C cloneの低コストはaccessor消失を含むため性能改善として採用しない。

## 性能
results.jsonは各入力3回（初回＋warm2回）、memoryは新規プロセス各3回。AのconstructMsは既に正式配列を保持するためno-opで、B/C構築との公平な初期生成比較ではない。正式codecからのA再構築はmemoryのdecodeExpandParseに含まれる。正式readSession全体と直接比較しない。

|wide100、warm中央値|B|C|
|---|---:|---:|
|constructMs (ms)|2.316|2.656|
|single100Ms (ms)|0.051|8.281|
|scanMs (ms)|1.769|1.301|
|id20Ms (ms)|9.010|7.376|
|equalityMs (ms)|23.431|22.032|

single100Msは中央1件を100回、id20Msは末尾IDを20回。Cの添字復号が大幅に遅い。ID検索はどちらも線形なので、将来必要ならイベントID→位置の検証済み規則とarrival順位検索を組み合わせる別設計が必要。現在の数値をiPhone Safariに外挿しない。正式全操作再生の約112秒問題を本研究だけで解消できる証拠はない。

## 全展開・互換境界
1. 正式decode/expandは入力時に通常arrivals全体を作る。本研究はそこから置換するため、起動時ピークは解消しない。
2. formal modelのstructuredCloneがclass private stateを失う。初期snapshotの正式tickで `s.arrivals.push is not a function` を観測。
3. world-map-viewのArray.isArrayはaccessorを[]へ置換。明示hydrateした地図projectionは一致するが、直接地図表示は互換とは認めない。
4. formal JSON/save validatorsは普通の配列と完全JSON一致を要求。hydrate前の正式保存は禁止。
5. filter/mapは呼出側に通常配列を返す。常設cacheは0だが、filter/map呼出の一時配列は必要。各consumerに限定されたiterator APIが次の候補。
6. quantizeReactionはObject.keysを再帰。accessor private fieldsは走査しないが、同一event objectがevents側で丸められるため本試験では値が一致。将来eventsもcompact化する場合はこの成立条件を再検証する。
7. history-lab includesは参照同一性を要求。正式history/recallはeventsのIDと位置を使用し、arrival viewだけでそれらを置換しない。

## events・attempts、4B/4Cとの接続
- eventsはlength採番、sourceId、append順序、history/recall位置blockの正本。arrivalsのような他の正本への単純な導出ではない。次段階はeventsの読みAPI契約調査とimmutable block参照の研究までとし、ID・位置を保持する。delete/再番号は禁止。
- attemptsは試行/roll/skipを含む個別監査記録。現在直接未来計算に読まれないことは削除許可ではない。既存順序・値・roll丸め除外を維持し、append/read/clone/save契約を別途比較する。
- 4B checkpointにaccessorのJS class/private heapを直列化しない。eventsの正式データとschema/version/件数/ID順序の検証を信頼境界とし、導出索引は再生成が最小。索引を保存するならsourceハッシュ・件数・順序との結合検証と再生成fallbackが必要。
- 4Cは参照先欠落、重複、順序破損を採用前に拒否。破損索引だけなら検証済みeventsから再構築できるが、events自体の欠落はこの方式では復旧できない。過去正常世代を保持する永続バックアップが別途必要。
- 現在の正式validator/readerに戻す復旧は全展開を要求。compactのまま正式採用するならclone/serializer/validationまで一貫した新契約が必要。今回正式checkpoint・backupは実装しない。

## 次の最小段階
1. B accessorのclone契約を隔離環境で定義（eventsを一度複製し、参照を新eventsへ再bindする。元eventsとのalias混入を検査）。
2. 地図などread-only consumerをiterator契約で試験。通常array fallbackで空表示になる失敗を必須テストにする。
3. 単一の正式モデル操作を研究adapter下で実行し、全session/RNG/collectorを比較。その後30→100年操作列と100年以後の世代交代へ拡大。
4. 最後に保存validatorがどの表現を検査するか別設計として決める。上限増加や保存形式変更を先行しない。

本段階ではBを正式採用候補の前段に置く。全参照層の透明な置換や正式耐久合格には進めない。

## 再現コマンド
node --test works/ambertime/l100-4a-2/accessor.test.mjs
node --expose-gc works/ambertime/l100-4a-2/run.mjs INPUT_PAUSED_DIR results.json
node --expose-gc works/ambertime/l100-4a-2/memory.mjs wide-100-year-1200-v8.json B
node works/ambertime/l100-4a-2/future.mjs INPUT_V8 OUTPUT.json

入力は研究evidence内のSHAに一致するL100-1の12基準コピー。新規ユーザーデータへのwriteはない。Node focused tests、Scope/Risk/Impact、独立レビューの最終結果はTESTS.mdへ記録。実ブラウザー、iPhone実機、完全な正式compact復元、同期処理中peakは未確認。

## 正式100年翌月試験の実測
正式cold readSession（同時実行の新規Node）は local 56.0秒 / mixed 86.2秒 / wide 113.2秒。競合を含む観測であり既報112秒への改善率ではない。各1200→1201月・全session・正式保存再読込が一致。

wide100 fresh process×3、GC後heap中央値（bytes）:
|方式|元game|置換後|町1月後|明示hydrate+wire保存後|
|---|---:|---:|---:|---:|
|A|17,886,016|17,886,120|18,041,648|25,188,328|
|B|17,886,016|14,992,704|15,129,576|22,327,864|
|C|17,886,152|14,996,256|15,133,056|22,331,352|
