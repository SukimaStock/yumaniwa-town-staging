# H3-2 一体保存の研究用取引

`atomic.mjs` は正式ゲーム・時計・最近の帳面・歩み・collectorを一つのJSONに入れ、候補生成と保存確定を分離する。session v7、正式保存key、`development-save.mjs` は変更しない。

## 手順とAPI

1. `createAtomicSession(store, 'research:h3-2:…', {initial, validate})` で保存済み全体を読む。初回だけ `initial` を保存する。
2. `session.prepare(builder)` に確定済み全体の独立コピーを渡す。builderは次の正式状態と全台帳を組み立てる。生成、検証、JSON化、再読込のいずれかが失敗しても現状態と永続値は変わらない。
3. `session.commit(prepared)` で旧JSONとの比較を含む取引を実行し、成功後だけメモリ上の全体を入れ替える。
4. 競合時は古い候補を上書きせず、`reload()` で新しい全体を確認し、そこから操作を再評価する。単なる書込み失敗なら同じ候補を再試行できる。

payloadの必須成分は `game / clock / recentLedger / historyRecord / collector`。`caskSlots` など追加のJSON成分も同じpayloadへ含められる。読込は `decodeEnvelope(text, {validate})`、書出しは `encodeEnvelope(value, {revision, parentDigest, validate})`。全体の版、親digest、SHA-256、正規JSON表現を検査する。チェックサムは偶発破損の検出用で、改ざん認証ではない。

`prepare` だけでは正式世代も保存済み回想も進めない。将来の表示開始では選定結果をプレビューし、「次の代へ」で正式世代交代と回想確定を同じ候補へ入れ、取引成功後に公開する。プレビュー中にゲームを進めないことと、候補を作った境界が現在も同一であることは呼出側の責務となる。

## 取引アダプターの保証と限界

`createMemoryStore()` は一つの保存枠を持つ**研究用の同期取引アダプター**である。`read()` と `compareExchange(expected, next)` を提供する。後者は旧値照合、全体書込み、readback確認を一取引として扱い、途中の例外では旧値へ戻す。quota、write途中、readback不一致、別writerの更新を注入できる。

この試験を、ブラウザーのlocalStorageが同じ保証を持つ証拠にはしない。`getItem` と `setItem` の組合せは複数タブ間の原子的CASではなく、書込み後のreadback失敗時には永続値の状況が曖昧になり得る。現在のS3/S4はメモリをcommittedSessionへ戻し、進行を止める。今回の研究では「全成分を一つの保存取引へ入れる」条件下の整合性を検証した。

本編導入前には、既存writer上での扱い（単一writerの保証、保存済み値を再読込して全体で採用する復旧、競合時の停止）か、原子的なCAS相当を保証する保存取引を決める必要がある。今回IndexedDBを実装・導入していない。

読込に操作再生はない。payloadの基本型・JSON健全性・checksumを検査し、必要なゲーム／台帳／collector間の整合性は `validate` に渡す。正式ゲームの全ルールをこの小さなdecoderで再検証したとは扱わない。正式readerの置換や起動時間改善は対象外である。

## テスト証拠

`node --test works/ambertime/h3-2/atomic.test.mjs`：11件成功。

- 実際の正式モデルの月次操作を保存・再開し、ゲーム全体（乱数を含む）、時計、S2帳面、S4歩み、collectorが一致。
- 保存候補の生成とencoderの失敗で、永続値・メモリとも旧全体を保持。
- 容量不足、書込み途中、readback不一致で全成分を巻き戻し、同じ候補の再試行後に再開。
- 別writerとの競合、古い候補、別session由来候補、二重commitを拒否。
- JSON破損、schema違い、checksum違い、ゲームとcollectorの月・操作数不一致、重複候補、非JSON値を拒否。
- メモリ上の確定状態は深くfreeze。後年の候補追加で過去の回想を変えない。
- 世代交代と回想確定の同時commit／失敗は、この単体テストでは合成例。正式な交代操作とC案の接続は進行再生ハーネスの証拠と区別する。

これはNode上の試験であり、ブラウザーの保存容量・実機Safari・複数タブ競合・電源断の実測ではない。

## 正式な世代交代との結合試験

`node --test works/ambertime/h3-2/atomic-integration.test.mjs` は生成済みの地元密着30年正式保存を一度再生し、実際の最初の世代交代で、正式モデルの `handoverGeneration`、増分collector、C案確定、S2帳面、S4歩みを一つの保存候補に組み立てる。独立レビュー後の実行は1件成功（Node、約15.4秒。再生・S2/S4・検証全体の時間でありcollector速度ではない）。

通常の樽詰め後・月次後・交代直前・交代直後で全体JSONの再開一致を確認した。回想プレビューだけでは旧世代を維持し、容量不足ではゲームと回想の双方が旧状態へ戻る。同じ候補の再試行後は、記録再生から得た正式な交代後状態と完全一致した。別writerが時計を変更した競合でも、古い交代候補は保存を上書きせず、再読込は旧世代を保つ。確定回想のchecksum変更と凍結後の変更も拒否する。

既定の入力は `/tmp/h32-saves/local-360.json`。`H32_INTEGRATION_SAVE` で別パスを指定できる。入力は既存の `chronicle-lab/research-h24-saves.mjs` で生成する。保存ファイルがない環境ではこの1件は明示的にskipされるため、通常CIの成功をこの実データ試験の再実行とは扱わない。
