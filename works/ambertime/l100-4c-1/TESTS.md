# L100-4C-1 検証境界

## 新規実行

- generation-store.test.mjs: C/D各24件＋空store/revision/Unicode2件、計53成功（独立review後の3回帰を含む）。MemoryDriverモデル、永続領域ではない。
- 3方針100年×C/D=6 byte-exact fallback。初回正式reader3回、同プロセス復旧reader3回、翌月baseline/recovered各3回。全session deepEqual。入力不変。
- 既存formal-save.test.mjs / h1-b2-codec.test.mjs / recall-save.test.mjs 23成功。
- ブラウザー起動probeは失敗。IDB/localStorageの実障害は0件実行。iPhone Safari未実施。

## 障害マトリクス

|ケース|モデル実行|確認/制限|
|---|---|---|
|候補生成後検証段階失敗|candidate注入|旧G0/G1維持。実メモリ不足/OOMではない|
|容量不足・書込拒否・書込途中中断|quota/write-denied/write-interrupted|atomic rollbackの契約。実quotaではない|
|読戻し失敗|readback|prepared orphanのみ、head不変|
|候補改変|afterPrepareでtext改変|checksum/正式検証前に拒否|
|manifest確定前中断|before-manifest/commit-interrupted|旧head維持、未公開候補不採用|
|確定後応答失敗|after-commit|新headは残る。成功/失敗の不確実性を再読で解消|
|確定後破損・最新欠落・旧正常のみ|8 corruption variants|旧G0へfallback、破損bytesを不変で保持|
|part欠落/hash/version/generation/長さ/mixed parts|各C/D|不完全世代拒否|
|全published不正＋正常orphan|各C/D|safe-stop、orphan昇格禁止|
|2writer同時、準備後head更新|各C/D|同じtokenの勝者1。古い候補拒否|
|ABA/古いrevision|各C/D|復旧でもrevision増、再使用拒否|
|非同期復旧検証中の別writer|各C/D|旧snapshotの採用拒否|
|hashを再計算した意味的不正|各C/D|独立validatorが拒否。hashを認証扱いしない|
|head pointer欠落、published残存|各C/D|再検証して復旧|
|空store/不正revision/overflow|1共通|自動新規なし、安全停止|
|checkpoint/tail不整合|未実装・未実行|設計条件のみ。H1-A4過去証拠は別扱い|
|実保存領域破損/電源断/OS eviction|未実施|任意のDisk/IDB物理耐久保証なし|
|v5|既存回帰の安全拒否|移行互換を意味しない|

## 再現環境

Linux Debian13、Node v24.22.1。既存paused inputsは元Library baselineから以前にmaterialize済みの同一workspaceコピーを使用し、inputs.json SHAで検証。100年計測3process並列、単回。OS/ブラウザー容量推定に使わない。
`node --test works/ambertime/l100-4c-1/generation-store.test.mjs`
`node --test works/ambertime/tests/formal-save.test.mjs works/ambertime/tests/h1-b2-codec.test.mjs works/ambertime/tests/recall-save.test.mjs`
`node works/ambertime/l100-4c-1/measure.mjs INPUT OUTPUT`
`node works/ambertime/l100-4c-1/browser-feasibility.mjs OUTPUT`

試作はnative IDB driverを実装しておらず、MemoryDriver.transactionの意味が実IDBに対応するかは後段で検証する。既存H1-A4に実IDBコードはあるが正式保存へ導入済みとは扱わない。自己申告成功と独立reviewを分けて記録する。

## 独立reviewでの修正

1. 保存/復旧後に最新tokenを再読すると、他writerの新tokenを古いstateへ渡す競合を修正。成功transaction内で自分のhead/revisionを返す。2回帰追加。
2. manifest世代とstorage record keyの不一致で、丸ごと正常な旧bundleが最新と誤認される問題を修正。expected generationを検証。1回帰追加。
53/53を独立担当が再実行。修正後3方針100年も再実行。
