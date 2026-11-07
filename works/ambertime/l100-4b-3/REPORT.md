# AmberTime L100-4B-3 — checkpoint 信頼ポリシー

## 1. 判定と推奨

**判定：設計採用候補。正式実装の承認・完了ではない。**

推奨は **B：アプリ作成 checkpoint の条件付き信頼**。通常の保存領域をアプリとブラウザーが正しく管理するという明示的な前提を置き、同じ検証済み系列を引き継ぐ。外部取込、依存コード変更、不整合、旧世代復旧では独立全再生へ戻る。最初の限定実装は隔離 Node 経路に限り、正式 cache や本編を変更しない。

毎回の独立全再生と同じ保証を、self-hashed checkpoint だけから再現することはできない。今回許容を提案する違いは「前回の正しい作成とその後の保管を信頼する」ことであり、「毎回履歴から独立に正しさを再計算する」ことではない。作者がこの前提を採用しない場合は A を維持する。設計採用候補という判定は、その選択肢と実装前条件が具体化できたという意味である。

この設計が検出・保護を目指す対象は、局所検査で捉えられる不整合、部分的な偶発破損、書込中断、世代取り違え、競合、古いコードとの不整合。作成器・capture・serializer自体の正しさは信頼前提であり、これらのバグが自己整合する誤contextを作ればBは見逃し得る。悪意のある改変だけの問題ではない。独立した実装回帰と必要に応じた全再生監査で軽減するが、通常のバグをすべて検出すると保証しない。**同一 origin の任意コード実行、DevTools・拡張機能・端末侵害等で bundle と hash と来歴を一貫して改変できる主体に対する来歴認証は保証しない。** 攻撃者を想定しないからといって内部不整合を許すものではない。起源不明のデータは条件付き経路へ入れない。管理状態が不明な場合は全再生へ退避する。ただし一貫した改変自体を完全に検出できるわけではない。

B の cold admission・初回保存・増分更新は未実装・未計測。B1 の約1〜2秒を、これら全部が実用速度で成立した証拠にはしない。正式導入の受入 gate は未達である。

## 2. 対象と証拠の扱い

- 監査基準 main：`6a1707c106afb4bf0658a274edf404bbc541de64`（2026-11-07確認）。AmberTime は active。
- #837：`d674cb58b14ad1c7f45819694cd2367dfd11ccc8`、#839：`51cd037e2a715283840cba43c3dbf806c8293a85`、#835：`54071ffb2d4301360e61ebcbc8440de8aab74ced` は open Draft・未マージ。
- #828、#831〜834 も open Draft・未マージ。H1-A2〜A4（#806〜808）、H1-B1/B2（#810〜812）、H1-C1（#815）はマージ済み。**研究資料が main に存在することと本編でその方式が使われていることは別**。現在も正式保存は v8 と module-private replay cache である。
- `EVIDENCE.json` に PR 状態、対象 SHA、source SHA、再利用入力 SHA を保存。正式 model/save/codec と研究依存の5ファイルを B1/B2 と比較して同一を確認。先行 branch を cherry-pick していない。
- 新規実施はコード・証拠監査、文書整合確認、短い既存回帰、独立設計レビュー。100年全再生・性能測定・ブラウザー再構築は0回。入力 SHA は先行証拠の引用であり、本研究で元セーブを再取得・再ハッシュした結果ではない。

### 根拠

|根拠|使用箇所と限定|
|---|---|
|main `partner-orders.mjs:1292–1333`|prefix照合、private cache発行、serialize/restore。現在の正式保証|
|main `development-save.mjs:14–46`|v8 schema、sidecar validation、書出し前再読込、単一キー比較/読戻し|
|main `save-codec.mjs`|正式サイズ、compact/expand。UTF-16上限不変|
|#837 `works/ambertime/l100-4b-1/{REPORT,CONTRACT,REVIEW}.md`, `results.json`, `semantic-faults.json`|cold・12基準・9境界・将来36比較・context改変。既存試験|
|#839 `works/ambertime/l100-4b-2/{AUDIT,CONTRACT,REPORT}.md`, `trust.mjs`, `results.json`, `provenance.json`|初回保存、private capability、cold来歴の限界。既存試験|
|#835 `works/ambertime/l100-4c-1/{DESIGN,REPORT,AUDIT}.md`|世代確定、候補拒否、旧正常保持。MemoryDriverモデルのみ|
|main `checkpoint-research/`, `checkpoint-persistence/`, `checkpoint-idb-research/`|H1の境界state/context、fingerprint、collector、復旧契約。既存研究として参照|
|main `h1-c1/REPORT.md`、#815|重複validator削減は導入済み。再度未解決の重複と扱わない|

## 3. 現行の復元・保存保証

正式 `restoreDistillery` は JSON を読み、`validateDistillery` が origin/seed と操作列から状態を再現する。cold module では全再生、同一 module に合う prefix があれば検証済み境界 state/context をコピーして新 tail だけを再生する。最終 game JSON の完全一致後にだけ cache が発行される。cache は外部への可変参照を公開しない。

cache の state は **操作境界**であり、画面上の最終 session.game をそのまま入れるものではない。蒸留途中進捗・試飲は finalize 側にあり、partial cache は同じ epoch と後退しない進捗等に限定される。projectionTokens は表示用履歴投影の証拠であり、保存検証 cache の権限ではない。

正式 `serializeSession` は game 検証→正式サイズ→slots/ledger/history/recall検証→compact v8→正式 reader による読戻し→game と sidecar の一致を要求する。現在の reader はゲーム再生で context を内部生成するが、v8 に context は保存されない。外部 checkpoint context と独立に照合する API ではない。帳面・回想等の正式 sidecar validation を「全部を原操作から独立生成し直した」とも表現しない。

B1 の研究 restore callback は正式 module の private cache を生成しない。そのため最初の正式保存で全再生に戻り、次の保存だけ既存 cache が効く。B2 の全再生 admission はこれを前倒ししただけで、cold 費用を除去していない。

`writeCandidate` は既存文字列との比較→setItem→readback。旧正常世代の独立保存も、複数呼出し全体の storage transaction もない。4C の契約をこの関数の実装済み保証として扱わない。

## 4. 五つの保証

|保証|成立条件・証拠|検出できる問題|検出できない問題|
|---|---|---|---|
|A 独立全再生|fresh realm/module、正本操作列、現モデル。checkpoint境界と終端で全state/contextを独立照合|操作に合わないstate/RNG/context、モデル非互換|同じバグを含むモデル、操作列全体の由来の認証、ストレージ永続性|
|B 作成時検証|正式reader＋checkpoint境界の独立context照合、collector位置照合。成功したimmutable snapshotだけ登録|作成時の異常、誤ったcapture位置|作成後の一貫した改変、将来コードの適合性|
|C 保存世代完全性|v8/checkpoint/tail/sidecar/manifestを同世代に束縛、長さ/hash/版、readback、CAS確定|欠落、混在、部分破損、古いrevision更新|自己矛盾しない不正state、作成者認証、電源断後耐久|
|D 読込時整合性|B/Cの来歴前提、現fingerprint、prefix/tail位置、schema、context局所チェック、読込後private ownership|破損、不適合、検出可能な局所不整合|未使用contextを含む整合改変、全履歴の意味的正しさの再証明|
|E 将来進行|同一入力の月次/保存/9境界/回想/contextをAと比較、複数版回帰|試した将来操作の相違|未試験操作や全未来の数学的保証、実機永続性|

A〜E は相互代替ではない。B1 は正常入力での B/E の部分証拠、B2 は同一プロセス継承、4C-1 は C のモデル証拠であり、これらを合算して正式 cold D＋初回保存が完成したとはしない。

## 5. A・B・Cポリシー比較

|項目|A 厳格な独立再生|B 条件付きローカル信頼（推奨）|C B＋定期独立再検証|
|---|---|---|---|
|信頼|現在のモデルと元操作列|Aに加え、正しいwriterと作成後のローカル保管|Bと同じ。定期照合は由来認証ではない|
|起動|毎回全再生|全条件成立時tailのみの予定|通常B、監査回はA費用|
|初回保存|正式cacheありならwarm|admission証拠から保存検証へ接続する設計が必要、未測定|Bと同じ。監査を直前へ移せば待ち時間が戻る|
|checkpoint更新|省略可能／作るなら全再生費用を計上|検証済みprefix＋同じ正式tail、immutable次世代証拠|B＋定期監査費用|
|容量|v8＋旧正常v8|左記＋checkpoint/tail＋候補とメタデータ|B＋監査中snapshot、全過去checkpoint保存は不要|
|破損|正式reader拒否|hash/構造/局所関係/世代拒否。不明はA|B＋後日の全再生で発見可能な誤り|
|復旧|旧正常v8全再生|同じ。疑わしいcheckpointは使わない|同じ|
|コード更新・取込|全再生|checkpoint失効、元v8全再生|同じ|
|複雑さ|最小だが遅い|管理されたadmission、失効、増分証拠、世代保存が追加|さらに期限・中断・監査結果の適用競合が追加|

Bでもコード更新・外部取込・不整合・復旧は全再生する。このイベント駆動の退避は必須であり、Cの暦日や操作数による追加監査とは別。

Cは「12ゲーム月または1,000新操作ごと」のように検証間隔を決められるが、これは未検証の候補値である。頻繁な監査は100年時点で50〜109秒程度の処理を繰り返し、メインスレッドなら操作を停止させる。別workerでもCPU/メモリ費用、snapshot世代固定、中断、結果のCAS適用が必要。定期再検証はそれ以前の全起動を独立検証済みにしない。現段階ではBに定期タイマーを追加せず、次段階の実測で必要性を判断する方が単純。

## 6. 来歴・作成・読込契約

### 来歴の正本

ローカル管理領域へ書ける入口を、正式作成器、正式全再生済みimport、正式検証済み復旧のみに閉じる。`createdByApp:true` や receipt の存在からその入口を通ったと推定しない。importは常に未信頼入力として別経路で扱う。

この入口制御はアプリの実装上の信頼境界であり、同一originへの任意書込主体に対する暗号学的証明ではない。ブラウザーの隔離、配布されたアプリコード、保存adapterの正しさが前提である。同originのmarkerも一緒に書換え・消失し得る。外部サーバーに検証証拠を置く設計は今回の範囲外。

Webアプリに埋め込んだ署名鍵・HMAC鍵は秘密にならない。IndexedDB内のnon-extractable CryptoKeyも同originコードから署名処理を呼べる可能性があり、独立した作成者認証の根拠にしない。鍵作成・認証基盤の実装は行わない。

### 記録するフィールドと役割

|束縛対象|必須内容|
|---|---|
|保存の同一性|generation ID、parent generation、単調増加storage revision、save version、manifest version。ゲーム世代番号/操作数とは別|
|コード適合性|game model version、model fingerprint、replay/codec/collector依存fingerprint、context schema version、trust-policy version|
|原本|元v8 ID、原bytesのSHA-256と長さ、branch/lineage ID。既存原本は変更しない|
|操作|prefix長とdigest、checkpoint操作index、tail開始/終了index、全操作数、tail長/hash。半開区間を明示し重複/欠落拒否|
|状態|checkpoint年月、ゲーム世代ID、origin/seed、操作境界game state、core/trade等全RNG、全replay context|
|履歴|history/recall collectorの内容・位置・確定世代、caskSlots/recentLedger等正式sidecarとv8への結合|
|検証|作成時の検証種別、独立再生対象境界、context照合、親証拠ID、capture条件、検証済みsnapshot digest、validator依存版|
|確定|checkpoint/tail/原v8/metadataの長さ・hash、検証完了後にだけ確定できるhead。timestampは補助で権限ではない|

hash対象のencode規則・キー/Map順序・Unicode処理を固定し、独自serializerは導入しない。自己参照digestを避け、hash対象と除外フィールドを版ごとに明記する。digest一致は内容束縛であり検証実施の証明ではない。

### 作成とcold admission

1. 新規importまたは新コードでの基準作成では元v8を正式readerで全再生。checkpoint境界のstate/contextは独立prefix replay oracleと照合する。終端sessionだけでは不可。最小BはB1を再利用し、帳面・歩み・回想等のsidecarを同じ終端v8原本から取得して正式assertionを通す。prefix collectorから独立に再構築済みという保証ではない。将来prefix collectorを実際にcapture/増分継承する場合は、その境界の独立oracle一致を別の未実装前提として要求する。
2. 正式上限、全session・sidecar整合、RNG、操作境界とtransient stateを検査。全成功後だけ private な証拠snapshotを発行。
3. 4C候補へ同じsnapshotを保存し、原bytesとreadbackを照合。保存した候補を検証したものと違う値へ置き換えない。metadataだけ先に確定しない。
4. transaction内で親head/revision・候補不変性を再確認し新世代を公開。旧正常全v8を保持。実IDB未検証なのでこれは将来契約。
5. coldでは管理領域の確定世代に限り、schema/length/hash/世代/fingerprint/prefix/tail/context局所関係を照合。同一immutable snapshotで処理しTOCTOUを防止。
6. 条件付きadmission専用の証拠を発行する。`independent-replay` と `trusted-local-checkpoint` を内部型・検証記録で区別し、後者を前者へ偽装しない。正式cacheのraw setterは設けない。
7. tailを正式処理で再生し、全状態とsidecarを照合してsessionを返す。採用前に失敗したら候補を保存せずfallback。

コード依存fingerprintが変わればcheckpointとその証拠を失効。v8互換を独立に判断し、現readerで利用できる正常v8は全再生で引き継ぐ。現在の研究fingerprintは保守的な全ファイルhashであり正式API契約ではない。初期限定実装では過剰失効を許容し、UIだけの変更を除外する最適化は依存集合の閉包が証明されてから行う。

## 7. contextの保証

|情報|実コード上の役割|読込時の局所確認案と限界|
|---|---|---|
|manualFills|手動fill完了数。enable-staff-experience時の経験値初期化|非負整数、適用モードのstate counterと照合候補。origin/解放前後を含む契約の試験が必要|
|manualBottles|手動瓶詰めのoriginalStock合計。経験値初期化|上と同様。終端session一致だけでは値の由来を確認できない|
|manualSources|樽/仕込/stopAt/type/flavor/操作index/月/世代。採用・予約の製法|keyとID、操作範囲・型・世代関係。履歴全体との完全一致にはprefix再生|
|nearbyCasks|樽の抽出・flavor・担当者予約に関するfacts|関連ID・型・有効範囲。現存樽だけを正本にして過去樽を削除/拒否してはならない|
|nearbyProducts|価格・陳列・販売履歴、比較facts|key/ID、価格/在庫等の局所整合。過去の非現存商品を含む完全な適用registryがない場合、単純な存在検査では正当性を証明できない|

`partner-orders.mjs:422–430, 652–688, 1246–1290, 1328–1330` が主な利用箇所。context は非null originの取込以前の履歴を補完しない。`coverage.complete` がfalseの範囲に完全な出自を捏造しない。現在未使用でも将来の操作や比較表示、コード更新で読まれる可能性がある。採用時は全contextを保持し、「未使用だから消してよい」としない。

B1の整合hash再計算ではmanualFills、manualBottles、未使用nearbyProductsの3件が `sessionEqual:true / contextEqual:false` で受理された。通常のbyte破損検出と別である。局所counter/ID照合を追加すれば**これら特定の改変を検出できる可能性**はあるが、すべての一貫したcontext改変を拒否できる証明にはならない。本研究ではその追加validatorを実装していない。

作成時の独立確認は、実際のcheckpoint操作境界における全contextの値・Map順序・key/IDを独立再生と比較する。読込後は外部へmutable graphを渡さず、private所有コピーを使用。Object.freeze(Map)だけではset/deleteを防げない。証拠外からの変更、違うstate/contextの組合せ、別managerのtokenは拒否。生のsession最終値をoperation-boundary cacheへ転用しない。

コード更新ではcontext消費箇所の追加も意味変更として扱う。hashを再計算した整合改変と、作成器のバグが生む自己整合する誤contextは、Bの局所検査で検出しきれない残余リスクとして明記し、A/Cの独立context照合なら検出できる比較試験を次段階へ残す。

## 8. 初回保存・増分更新への接続

同一プロセスのprivate capabilityは、実際に検証を実行した管理者が発行し、identityとprivate immutable graphを保持する。永続receiptはデータであり、そのidentityや検証の実行事実を復活させない。Bのcold admissionは**別の許容された契約による新しい証拠発行**であり、receiptを既存正式cacheへ注入することではない。

条件付き保存で維持する確認：prefix完全一致、origin/seed・コード・保存系列、正式tail適用、全game結果・RNG一致、操作境界/transient区別、全sidecar検証、正式上限、正式v8 wire生成、読戻し一致。省略を提案するのは検証済みprefixの毎回の独立再生のみ。従来validatorと全く同じ独立保証を維持したと呼ばない。

増分更新は、採用済み証拠から同じ正式操作列を適用→新tailを検証→新v8候補を作成→全snapshotを次checkpointへ結合→保存世代確定の順。最後の独立再生anchorからどのprefixまで派生検証したかを明記し、派生証拠を「全再生済み」と記録しない。anchorの元v8と独立検証済み旧正常世代を、必要な安全性が確認されるまでGCしない。内容の小さな証明書だけで元v8を置き換えない。

checkpoint更新失敗時は旧bundleを保持。新v8だけが正式に検証・確定できた場合は `v8-only` 世代として扱い、古いcheckpointを新v8に付け替えない。次回は正式全再生。正式v8自体の保存失敗なら成功扱いせず進行を止め、旧正常世代を保護する。

古い有効prefixからの分岐はゲームとして正常でも現在headを更新する権限ではない。branch/parent世代とstorage CASを分離。古いtabは競合拒否して最新保存再読込へ誘導し、自動統合しない。復旧は旧内容を検証後、新revisionとして確定しrevisionを巻き戻さない。

## 9. 採用・拒否・fallback判断表

以下は推奨Bの設計。拒否は入力の削除や黙った修復を意味しない。

|状況|決定|
|---|---|
|正常なアプリ作成・管理された同一コード確定checkpoint|全admission条件成立時のみ条件付き採用。正式導入前は隔離研究のみ|
|外部取込checkpoint／来歴不明|checkpointを採用しない。同梱元v8があれば正式全再生し新ローカル系列を作る。checkpoint単独は拒否|
|コード更新／model・依存fingerprint不一致|checkpoint失効。現readerで元v8を全再生。非互換なら旧bytes保護して停止|
|prefix不一致、tail欠落・重複・順序異常|bundle拒否。正常な元v8の正式全再生へ|
|context・RNG・collector不整合|bundle拒否、元v8を正式全再生。失敗すれば独立旧正常v8へ|
|checkpointだけ破損|元v8全再生、破損checkpointを修正して採用しない|
|元v8だけ破損|現研究checkpoint単独は採用不可。独立旧正常v8を全再生。正常元v8がない場合停止|
|両方破損|独立旧正常v8を全体検証して復旧。なければ停止|
|独立旧正常v8のみ|正式readerで世代全体を検証、履歴を失った新状態へ部分混合しない|
|保存世代混在|混合bundle拒否。完全な単一世代v8を選び全再生|
|storage revision競合|新保存を拒否、候補は未確定。最新確定headを再読込し検証。正常な他tab保存を上書きしない|
|head更新後にUI処理失敗|成否を再読込して確定。旧revisionで再送しない。既確定正常headを破損扱いで戻さない|
|全候補不正／全保存消失|bytesを保護して安全停止。復旧元がなければ復旧不能。新規ゲーム自動上書きなし|

同originの全保存が消えた場合、同じ領域のmarkerだけで初回起動と過去消失を区別できない。不明を「初回」と断定しない。外部バックアップは別設計であり、存在しない復旧元を保証しない。

## 10. 4Cとの共通契約

ゲーム状態の正当性、保存世代の完全性、物理的永続性は別々のgateとする。

- 最初は1世代1bundle。元v8 bytes、checkpoint、tail、collector、来歴metadataを同じ世代にする。
- 検証済み候補のreadback後、同じtransaction内でhead/revisionと候補不変性を再照合し公開。transactionのsuccessは電源断耐久の証明ではない。
- 最新正常＋独立検証済み旧正常を最低限保護し、新候補準備に必要な追加容量を確保。唯一の復旧元を容量確保のため先に削除しない。容量不足なら新保存を失敗させる。
- 定常保持を無制限に増やさない。readerが参照中の世代をpinし、GCは確定・読戻し・検証・代替復旧元・head/revision一致を条件とする。cleanup中断は余分な世代が残る方向に倒す。
- eventsが正本。arrivals索引だけの破損なら正しいeventsとの検証後に再生成可能だが、events自体の欠落を索引で修復した扱いにしない。今回参照層を導入しない。
- 現#835はMemoryDriverモデル。4C-2は実環境未確保で保留。今回はIndexedDBの正式実装や環境再試行を行わない。

## 11. 100年の費用比較（先行実測の再利用）

時間は秒、Node v24.22.1の内部計測。新規測定ではなく、ブラウザー表示・Safari時間ではない。

|方針|B1正式cold|B1 checkpoint cold|B2高速復元後の初回正式保存|B2先行全再生admission|B2 admission後保存|
|---|---:|---:|---:|---:|---:|
|地元|52.764|1.196|50.383|49.085|0.746|
|混合|83.631|1.776|76.607|75.633|1.018|
|広域|108.880|2.122|102.634|101.943|1.053|

B1内部時間はfile IO・初期parse等を除く。全process wallは地元1.614、混合2.277、広域2.618秒（12か月checkpoint）。B2は独立Nodeプロセスの反復平均。異なる研究区間の単純加算を実測エンドツーエンド値としない。Aは正式cold後に同一module cacheが残るので初回保存まで毎回もう一度coldとは限らない。B/Cの新cold admission・初回保存・増分checkpoint更新時間は未測定。

B1作成時全再生＋独立readerは地元69.484＋69.981、混合110.560＋104.674、広域136.477＋129.922秒（並行ホスト診断値）。境界captureのみ101.9/111.7/170.9ms。captureだけを作成総費用にしない。通常保存はB2の同プロセスで約0.75〜1.05秒の例があるが、新B経路の保証値ではない。fallbackは少なくとも元v8正式cold相当の待ちが戻り、別旧世代検証を試せば追加費用が出る。

### 容量

空白なしJSONのUTF-8論理bytes。12か月checkpoint envelopeにはtailが含まれる。旧世代が同程度のサイズと仮定した算術例であり物理storage実測ではない。

|方針|元v8|checkpoint＋tail|元v8＋checkpoint|＋旧v8（2V+C）|次V+C候補準備（3V+2C）|旧世代もcheckpoint保持（3V+3C）|
|---|---:|---:|---:|---:|---:|---:|
|地元|3,467,349|4,256,776|7,724,125|11,191,474|18,915,599|23,172,375|
|混合|4,535,936|5,490,479|10,026,415|14,562,351|24,588,766|30,079,245|
|広域|5,282,030|6,499,321|11,781,351|17,063,381|28,844,732|35,344,053|

上表の旧v8が独立再生anchorと同じ場合は追加anchor不要。直前正常世代がBの派生検証によるもので独立anchorと異なる場合は、直前世代とanchorを別に保持するためさらにVが必要になる。定常は3V+C、次候補準備は4V+2C（地元22,382,948／混合29,124,702／広域34,126,762 bytes）となる。anchorを全過去世代分は保持せず1つに固定し、次の独立全再生成功と保存確定後にだけ置換する。直前正常世代を「独立全再生済み」と誤表記しない。

実際のB1 indent付きcheckpointファイルは地元8,195,244、混合10,546,936、広域12,459,868 bytes。上表はそのファイル長ではない。metadata、storage encoding、index、GC/transaction複製、候補生成中のheapは別に加算される。旧正常世代のcheckpointを省きv8だけ復旧元にする案が最小だが、削除前の独立正常確認とreader pinが必要。

正式gameのUTF-16単位は地元3,806,900、混合4,938,560、広域5,838,093。上限は **6,016,384未満**のまま。wire bytes、正式展開文字数、heap、origin quotaを混同しない。checkpointは記録増大や正式上限を解決せず、追加容量を必要とする。長期更新時の全保存量増加は次段階のgate。

## 12. 正式導入の受入チェックリスト

|条件|現在の証拠|不足・合格条件|
|---|---|---|
|信頼元/保証差が明確|本設計で明示|作者による条件付き契約の採否。設計採用候補を承認にしない|
|元v8と旧正常保持|4C-1モデルで部分成立|native保存の失敗/競合/GC試験|
|checkpointと同世代性|B1 exact-target、4Cモデル|実際のincremental bundle、readback/CAS/GCの一体検証|
|不正・失効拒否|B1通常16ケース、整合改変3件の限界、B2 token拒否|cold admission型とimport/code-update経路、局所context checks|
|初回保存負荷削減|未達。B2は待ち時間移動のみ|起動→月次→保存の合計を測定、prefix再生省略の契約どおり同値|
|増分checkpoint|B2新12か月は未実施|3方針12か月でstate/RNG/history/context/save/reload一致|
|同じ未来が続く|B1 12基準・9境界18比較・未来36比較|新admission＋保存経路でも同じ比較。既存成功を新経路へ転用しない|
|コード更新/外部取込|fingerprint拒否等研究証拠|実入口からの失効、v8原本保護、旧版互換の明示|
|容量・破損・競合復旧|4Cモデルのみ|native IDB、容量不足、中断、2接続、旧正常読戻し、GC|
|実ブラウザー/Safari|B1/B2はNodeのみ、4C-2保留|専用originで3方針、iPhoneのライフサイクルとメモリ/保存受入|

既存回帰成功は本設計の意味的保証の実装成功を証明しない。正式上限接近は別途未解決リスク。

## 13. 次段階の最小計画と終了

1. この脅威モデルとBの保証差を採用するか判断する。受け入れない場合はAを維持し、checkpoint方式を無理に押し込まない。
2. 承認後、隔離Nodeで一つのtyped admission境界だけ試作。正式reader/cacheを置換せず、trusted-localとindependent-replayの証拠を分離。importや任意receiptからtokenを発行しない。
3. 小fixtureで改変・取り違え・コード失効・branch/競合・更新中断・3件のcontext反例を検証。整合改変に対してBが保証しない範囲をテストの期待値で隠さない。
4. 3方針100年の再開→1か月→初回保存→再読込を同じ入力でAと比較。比較費用を高速経路から分離。安全性と総待ち時間の改善が成立した場合のみ12か月と9境界へ。
5. 別途許可された4C実ブラウザー段階で世代確定・GC・障害試験を実施。今回その環境を再構築しない。正式導入は全受入gate後の別判断。

iPhone Safariの最小受入は、デスクトップ隔離試験成立後に専用originで広域100年コピーの再開→月次→保存→Safari終了/再開、2tab stale保存拒否、checkpoint破損→元v8復旧、全復旧元不正→上書きせず停止を確認する。容量/メモリ圧迫・背景化中断は実機固有試験として残す。まだ操作可能な受入UIがないので、今すぐ本人に手順を実行させない。

本研究はここで区切る。設計条件を定義できたため「設計採用候補」とするが、実装・正式保証・実機永続性は未成立。新serializer、署名基盤、checkpoint方式、IndexedDBを追加しない。成果は文書とDraft PRのみ。正式本編、ゲーム計算、RNG、歴史、UI/Canvas、保存形式・上限、Production、プレイヤーデータは変更しない。
