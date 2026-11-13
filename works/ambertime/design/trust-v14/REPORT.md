# AmberTime v1.4 正式保存の信頼モデル監査

## 結論

現構成で、**同じ保証を保ったまま cold 起動の全履歴再生を省略できる代替根拠は見つからなかった**。現行の正式readerを維持する。これは「数学的に高速検証は不可能」という結論ではない。外部の検証者や検証可能計算の証明は理論上の選択肢だが、実装・運用・性能の根拠が今はない。

B（検証済みcheckpoint）を同一プロセス内で使うことは既に実装されている。cold起動へ永続化するには、その正当性を次の起動が再び確認する必要がある。C（証拠を添えたcheckpoint）の証拠も同じ書換可能領域に保存するだけでは、未検証の自己申告が増える。D（段階的検証）は応答や待機表示を改善できるが、未検証の状態で正式操作・保存はできず、正式readyまでの計算量削減とは別である。

信頼と性能の両ゲートを通過した案がないため、**代替readerの設計Labは作成しない**。代わりに、現行readerの保証と限界を確認する小さな監査probeを実行した。本編runtime・正式reader・保存形式への変更はゼロ。Staging/Productionへのマージ・配信なし。

## 対象と現行配信の区別

- 調査日: 2026-11-13。GitHub照合は `pr-snapshot.json`（exact headとcheck URL）参照。
- Staging main: `0778bcf4555737ec45947a80aca8f761f39fa429`。v8とlocalStorage単一キーが現行。候補のv9/IDB正常世代保護を配信済みと扱わない。
- 比較基準: #931 `0ef9ba32c72e0fcb87f5ed748c47865db099adb6`。
- 研究の保全base: #939 `abef91fa419b72ea7e533039070e99f3da88b66c`。そのruntimeは既存候補を継承し、本研究で改変しない。
- 新しいPlan-only remote: `47e25f8c462430262cab6d49666394ac6a6148a2`。digest `39a298678cb9262781af5a0acf468571033819cebaebd96c1306c4f739b6d447`。研究資料・監査scriptだけを許可。
- PlanのcanonicalSources末尾の `session-state.mjs` は存在しない調査候補の誤記。実在正本は `development-save.mjs`。scope/権限/判定条件は変えず、固定済みlockも書換えていない。この誤記から架空の実装を推論していない。

## 1. 何を信頼し、何を計算し直しているか

正本コードへの行参照と詳細は [READER-AUDIT.md](READER-AUDIT.md)。以下の保証は「信頼された実行コードが動く」ことを前提とする。攻撃者がJavaScript自体まで置換できる場合に、同じコードで防御を保証するものではない。

1. **wireの形式**: v8は厳密JSONキー、型、範囲、canonical表現。v9はlossless表現を解き、同じ論理v8 sessionへ戻す。圧縮は意味の証明ではない。
2. **gameの意味**: `restoreDistillery → validateDistillery` がseed・origin・operationsからゲームを再現する。経済・町・委託・世代・乱数等のgame全体が、保存されたgameとJSONで完全一致することを要求する。
3. **origin**: 旧形式の有効な移行境界を正規readerで読み、その境界以降を再生する。移行前に存在しない履歴まで証明したとは言えない。
4. **session sidecar**: caskSlots/recentLedger/historyRecord/recallRecordは個別assertで参照・範囲・証拠・digest等を検証する。すべてを全履歴から独立再生成しているわけではない。5戦略試験のoracle全session一致は、実装契約に加えた試験証拠であり、reader単独の真正性保証とは別。
5. **checkpoint**: module-local `let checkpoint=null`。全game一致に成功した後だけ、独立コピーとoriginText/seed/operations prefix/contextを保持する。保存内の自己hash付きcheckpointを信用する設計ではない。再起動時は失われる。
6. **prefix cache**: 同一origin/seed/操作列の厳密prefixだけを再利用する。分岐・古い進行・異なるoriginではnative経路へ戻る。外部保存入力からcacheを宣言できない。未検証最終状態はprefixが一致しても拒否される。
7. **IDBの局所proof cache**: DB接続とreader関数ごとのWeakMap、最大8 digest。毎回canonicalとfresh SHAを確認し、reader成功後だけ登録する。返却headはforceReader。接続やreaderが違えば引き継がない。
8. **保存世代**: head/previous/origin/metadataの厳密構造・digest・revision対応を検査する。previousを先に検証し、headで既存prefixを再利用する。これは両方の独立保存を一方のhashだけで信頼する省略ではない。
9. **commit**: 候補を正式readerで検証し、検証済み旧全recordとのCASを同一write transactionで行い、headとpreviousを原子的に更新。transaction完了後に再読込・正式reader・一致検査を行う。成功receipt後だけ本編apply。
10. **不確実な結果**: readback失敗は、DBへcommit済みである可能性を残したまま本編未反映・halt。自動で旧DBへ巻き戻さず、previousを保持する。破損head/previousから勝手な自動復旧はしない。

`formal-idb-storage.mjs` の `signed()` は名前に反して鍵なしSHA-256であり、デジタル署名ではない。checksumは偶発破損の検出やlive CAS比較に有効だが、内容とchecksumを同時に書換えられる相手への真正性は保証しない。

## 2. 脅威と必要な防御

|問題|現行候補での防御と再生の役割|checkpointで省略できない点・限界|根拠試験|
|---|---|---|---|
|不完全write/abort/Quota|transaction atomicity、旧previous維持、readback、fail-stop。全履歴再生はatomicityを作らない|同じstorage手順が必要。物理quota/電源断は未検証|formal-idb-v03-faults / commit-boundary|
|commit後readback例外|本編apply禁止、旧世代保持。DBcommit済みの可能性あり|候補を成功扱いしない。自動rollbackしない|v03-faults readback exception|
|head/previous破損|厳密shape/SHA/formal reader/revision検証、停止|previousが正常でも自動fallback保証なし|v03-faults corrupt head/previous|
|履歴と最終game不一致|正規計算の結果との完全比較|checkpoint＋自己hashだけではprefixの計算が正しいか分からない|native-probes 2/5, formal-lossless-save|
|checkpoint偽造|現行cacheは外部入力にない。局所検証後のみ登録|永続B/Cではその検証の来歴を別途証明する必要|proof-cache, validation-order|
|形式不正/一部欠落|canonical、型/範囲、履歴再生、sidecar assert|形式だけでは意味を証明できない。整合的に別の合法履歴へ置換された場合は別問題|native-probes 2, formal-lossless-save|
|別ゲーム混入|origin/seed/prefix、世代構造とformal consistency|有効な別ゲーム全体の置換を識別する外部のプレイヤーidentity証拠はない|native-probes 3|
|古い世代への巻戻り|開いているwriterにはrevision＋全record CAS、epoch|cold時に全DBとmetadataが整合的な古いbackupへ置換されるfreshness検出根拠はない|native-probes 4はreaderのみ、DB全置換の動的試験ではない|
|競合/二重操作|busy/epoch、expectedRevision、全旧record CAS|全履歴再生を減らしてもCASとpublication境界は残す|v03-faults competing tab/equal revision/pending|
|v8移行|旧原文を保持、正式reader、IDB readback/source guard後のみ有効化|旧原文とIDBは別storeで同一transactionにならず、変化はuncertain halt|v03-faults migration/source mutation|
|sidecar改変|個別assertと参照/証拠検証|全履歴再生で全sidecarの「本人が体験した真正な歴史」を証明しているとは言わない|formal-lossless-save sidecar cases|

攻撃者が「別の合法な経営を再計算した完全な記録」に入れ替えた場合、現行readerも整合性を認める。この限界と、不整合なgameをhash再計算だけで通せないことは両立する。現行を万能の改ざん防止と呼ばず、代替でこの**意味の整合性**を失わないことが要求である。

## 3. 全履歴再生は毎回必要か

|保証|評価|
|---|---|
|経済・町・委託・世代・乱数・game中の記録の操作結果一致|coldで独立証拠がない現在は再計算が必要。検証済み同一実行内prefixからのtail再生は既に可能|
|履歴prefixの計算正当性|persistent checkpointのhashや「検証済み」フラグでは代替不可。別の検証可能な証明があれば理論上別方式はあり得る|
|形式/canonical/digest|履歴再生以外の検査。再生削減時にも維持|
|IDB原子的確定・正常世代保護・CAS|履歴再生とは別。省略不可|
|sidecar契約|個別assert。再生を残しても自動的に全sidecar真正性が強まるわけではない|
|現実の本人操作・全保存の最新性|現行全再生でも保証していない。新しい保証と混同しない|

## 4. 方式A〜Dの比較

|方式|信頼の起点|保証/リスク|費用と判断|
|---|---|---|---|
|A 全履歴再生|信頼されたコード・ルール＋形式検証済みorigin|入力履歴の合法な計算結果とgameの一致。実際の本人操作/全DB巻戻り真正性は別|基準を維持。cold性能問題は未解決|
|B 検証済みcheckpoint|同一プロセス内でAにより成功した独立cache|現行のwarm prefixで成立。coldではその根拠が消える|warmは既存。coldへコピーするだけの案は不採用|
|C 証拠付きcheckpoint|証拠の検証者と、証拠を次回信用する独立の理由|生成時刻、code version、history hash、checkpoint hash、revision、検証結果を記録しても同じ領域で全部書換可能なら不足|単なるmanifest追加は不採用。証拠検証がAを再実行するならcold削減なし|
|D 段階的検証|検証完了した範囲のみ、最後はA相当の完全確認|未検証previewは正式状態でない。入力固定、変更検出、隔離、取消、完了まで操作/保存禁止が必要|応答性の研究候補にはなり得るが、正式ready総時間やメモリの改善は未計測。今回UI/runtimeは変更しない|

外部検証サービスが固定rule/versionで履歴を実際に検証し署名するなら、Cに独立根拠を与える可能性がある。ただし鍵管理・公開鍵配布・撤回・version更新・オフライン・古い署名のfreshness・検証サービス費用・privacyが増える。単なるクライアント申告への署名では意味を証明しない。同一originの非抽出鍵も、鍵を使用できる攻撃者が未検証状態へ署名できれば防御にならない。

検証可能計算のproof等は外部サービス以外の理論的方向だが、現JSモデルの全計算/乱数/過去rule/sidecar契約を対応させる実装と独立verifier、proving/verification費用の実測が必要。今回の小規模研究で成立したとは扱わない。

## 5. 将来の信頼境界に最低限必要な仕様

- 作成者: 固定版formal readerを実行した信頼された検証者。保存書込み主体というだけでは不足。
- 対象: game/origin/全操作prefix/checkpoint/必要contextとsidecar契約、code/rule version、encoding、game identity、世代関係を束縛する。
- 証拠の保管: raw保存と同じ領域の証拠は消失・改変を想定。次回その検証結果を信用できる独立根拠を規定する。
- 欠落/食違い: 信頼を推定せず、元の全履歴と正式readerへフォールバック、またはhalt。履歴を削除しない。
- 古い正常世代: 読取検証を独立に通したうえで明示的復旧を検討。自動上書き/初期化禁止。現在の候補は破損世代を残して停止する。
- CAS競合: 新方式でも全検証対象bytesとrevisionが変化したら確定不可。証拠のvalid性とwriteの成功は別。
- 旧v8: 現行正式readerの同じ受理条件で検証し、原文保持後に移行。速さを理由に受理範囲を狭めない。
- 中断/例外: 未検証checkpointを公開せず、旧live/保存/正常世代を保持し安全停止。未完了を成功としない。
- version変更: 以前の検証者の証拠を現在のruleで有効と扱う条件、移行、失効を定義する。
- 実装移行の条件: 上記根拠と性能見積りを独立レビューし、作者が次段階を判断。今回本編接続なし。

## 6. 性能の上限評価

[PERFORMANCE.md](PERFORMANCE.md) に原JSONと測定条件を記載。#931の計測ではcoldの約97.5〜98.3%が履歴再生。地元124.113秒のうち120.978秒。checkpoint capture0.095秒・最終全game比較0.422秒は小さく、captureを省くだけでは大幅改善にならない。native clone累積117.260秒は再生の中に含まれ、合計してはいけない。

「再生が無料、代替証拠検証も無料」という仮想計算なら残余1.58〜3.14秒。ただし同等信頼を得る手段が未成立であり、達成可能な復元時間の予測ではない。Cの証拠を検証するために全履歴を再生すれば削減はゼロに近く、追加manifest処理と容量だけが増える。外部署名やproof検証の費用・メモリ・保存量は未測定であり数値を創作しない。

## 7. 研究履歴の取り扱い

|研究|成立した範囲|性能/未成立の範囲|
|---|---|---|
|#929/#931|#931原典の5戦略100年Node正式保存/cold/翌月/再保存/全session・canonical一致、Chromium保存12＋本編7＋巨大地域6。正常世代保護|cold74〜160秒、RSS約560〜863MiB。物理Quota/iPhone/電源断未確認|
|#932|105全状態コピー削減、5戦略正式一致、限定安全試験。後続#933でstrict source guard修正|改善悪化混在。安定高速化なし|
|#934|次月全状態/alias/参照分離の限定Lab|分割しても全量コピー＋graph走査。4〜5戦略悪化。不採用|
|#937|町単体36回更新の中央値改善、限定journal rollback|full game/100年cold/新IDB方式の成功ではない|
|#938|実tick＋74書込後資金不足rollback等の限定Lab|1か月処理が全5戦略で大幅悪化。準備・監査・Proxy・分離費用。正式統合なし|
|#939|25年2戦略A/B/C・18子processの全state一致、限定安全検査|Bはlocal40%悪化、分散改善はばらつき重複、B/C RSS増。Cは最適化領域の町書込0。gate不合格で新100年/IDB検証へ進まず|

exact head/CIは `pr-snapshot.json`。以前の成功を新しい方式へ流用しない。#929〜939の列挙対象全headで4種類CI成功を今回確認したが、native Chromiumは変更されていないruntimeの回帰であり、不採用Labの新方式の保存保証ではない。

## 8. 今回実行した検査

- 新規 **native audit probes 7/7**: v8/v9のcold子process＋canonical、digest再計算済み不整合/履歴欠落拒否、合法な別ゲーム受理、古い合法保存cold受理、warm不整合拒否後retry、返却状態の相互分離、IDB private proof cacheの接続/force reader境界。
- 既存focused **45/45**: lossless save、IDB proof cache/storage/v03 fault/commit boundary/validation order。Nodeと模擬transactionの試験であり実ブラウザーではない。
- 既存entry/source境界 **6/6**: `formal-idb-v03-entry.test.mjs`、`source-entry.tap`。
- 初回probeは括弧誤記で構文失敗。`initial-syntax-failure.tap`へ保全し、修正後7/7。失敗を成功や未実施に置換しない。
- 新方式のcheckpoint破損/証拠改ざん等の13項目Labは**未実施**。有望候補が存在しないという事前gateで停止。上のprobeを代替方式の合格として扱わない。
- 今回の新100年fixture生成、5戦略再測定、native IDB/Chromium、iPhone、物理quota、OS強制終了、電源断は未実施。
- scope/risk/impact/trusted-static、独立レビューとexact remote CIは `VALIDATION.md` に記録する。

## 次の判断

まず現行信頼条件を維持する。作者の実ゲームを速くする実装としてB/Cを採用しない。別途進むなら、(1)正式readyと区別した検証中の応答性を測る、(2)意味の整合性を同じ強さで証明できる独立証拠の具体仕様と運用費を先に評価する、の二方向。いずれも今回のマージ許可や本編変更ではない。却下済みcopy/journalを改名して反復しない。
