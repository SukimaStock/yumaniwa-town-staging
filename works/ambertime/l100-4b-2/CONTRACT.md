# 研究上の保証と終了条件

## A–D比較

|方式|信頼元|再生|本研究の結論|
|---|---|---|---|
|A 現行正式保存|同一module内の正式再生cache、なければ全再生|coldは全操作、warmは新tail|比較基準。正式保証を維持|
|B checkpointのcache取込|作成時検証の来歴、context、codeとの結合が必要|成立すればtailのみ|自己申告hashでは不採用。raw setterは実装しない|
|C privateな検証済みprefix|実際に正式readerを通したlive token|最初は全操作、以後tail|同一プロセス限定で成立。新しいcold高速化ではない|
|D 毎回の独立全再生|元v8と現在の正式コード|全操作|保証の基準。費用はなくならない|

## 実装した最小試作

trust.mjs は正式modelのsource hashを固定し、独立data URL moduleにread-only
cache snapshotとapply counterのみ追加する。正式validator/reader/serializer/計算の
分岐・条件は変更しない。cache setter、raw token import、検証スキップは存在しない。
正式readerが成功した後だけWeakMapにprivateな証拠を登録する。返すsessionや
inspectのcontextはコピー。次のcandidateはprefixを確認してから正式serializerと
正式readerを通す。sidecarも含め完全一致後だけ次tokenを発行する。

失敗後に旧tokenと元v8は残る。native cacheがgame検証だけ先に進んだ後にsidecar
検証が失敗する場合も、tokenは未発行。次回の保存は再び全正式検証を受ける。
これはstorage transactionではない。ディスクへの保存は本試作の対象外。

## cold再開の境界

JSON化したtokenやreceiptはWeakMapのidentityを失う。hashを再計算してもidentityは
復活しない。別processでは元v8の正式admissionを必要とする。cold起動と初回保存の
合計から100年分の全再生を削減できていないため、12か月増分checkpoint更新への
受入gateは閉じる。9世代交代を新方式の成功として再掲しない。

これはcheckpoint一般の不可能性を意味しない。信頼できる作成元と永続化経路を
明示してcreator-trustを許容する設計なら別の保証を定義できる。今回のself-hashed
保存bundleだけではその来歴を独立に証明できない。新たな方式を無制限に追加せず、
その設計判断を別段階に残す。

## 4Cへの契約

- 元v8と独立に正式検証済みの旧正常v8をbyte単位で保持する。
- 操作prefix長とdigest、context全体、state、RNG、collector境界、code/model
  fingerprint、checkpoint/tail、元v8識別を同一の検証証拠へ結び付ける。
- storage generation ID / monotonic revisionは操作数やゲーム世代とは別。
- 候補を書いた後、読戻しと正式検証を確認してからhead/revisionをCASで確定。
- 正常保存の確定前に唯一の旧正常世代を消さない。読込中のsnapshotも保護する。
- checkpointだけ不正なら全candidateを捨て、正常な元v8を正式readerで再生する。
  元v8も不正なら独立した旧正常v8を全体として検証。全候補不正なら元bytesを
  保護して停止し、syntheticな新規ゲームを自動保存しない。
- events欠落を導出索引の再生成で修復したことにしない。
- 全同一origin消失は同じ領域の記録では初回起動と区別できず、復旧元なしは復旧不能。
- checkpointの意味的正しさと、storage generationの完全性・原子性は別保証。

## 保存容量と実機

6,016,384 UTF-16コード単位未満の正式上限を維持する。v8 bytes、checkpoint bytes、
heap、storage quotaは別指標。過去の町の記録増加は未解決。既存v8+checkpoint+旧正常
保存を保持すれば保存量は増える。研究receiptを正式保存容量削減と呼ばない。
Node結果はIndexedDBの永続性やiPhone Safariの速度を保証しない。4C-2の保留を解除せず、
そのブラウザー環境構築を再試行しない。
