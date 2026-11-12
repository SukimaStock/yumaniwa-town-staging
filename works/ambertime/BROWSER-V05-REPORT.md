# AmberTime v0.5 — 正式保存・委託販売の検証報告

2026-11-12。**実ブラウザー保存検証は成立。復元性能の重大な問題が残るため、正式完成・Stagingマージ・配信は保留。Production変更なし。**

## 固定候補・成果の保全

- main: `0778bcf4555737ec45947a80aca8f761f39fa429`（開始時・終了前に確認）。GitHubのpush権限と、必須2checkをstrictに要求するmain rulesetを確認。bypass actorなし。
- [PR #927](https://github.com/SukimaStock/yumaniwa-town-staging/pull/927): 委託販売。head `a210984399547b07728c48bcd83365cf2f28e269`、Draft・未マージ。旧確定売上・価格・実売ルールのexactソース照合を維持。
- [PR #928](https://github.com/SukimaStock/yumaniwa-town-staging/pull/928): 回収と初回native証明。head `08625280bb5da65eb1be33a80c1f488d0c5a0e01`。#929へ継続し、重複マージを防ぐため**未マージで閉じた**。
- [PR #929](https://github.com/SukimaStock/yumaniwa-town-staging/pull/929): 現在の正式統合Draft。実装・試験対象 `ae0c0922e036fef309d4881990631207c93ad242`。製品runtimeは `d087bbca74768aa666e2c9d681030bf5df1a0a22` と同一で、後続差分は本編故障試験の強化のみ。
- Fresh Plan: `.change-plans/ambertime-idb-order-v05-20261112/r0.lock.json`。remote Plan-only commit `3501248366d6ce7e24cb49bb479d6c8b7f50bf53`。旧Lockの書換え・後付けscope拡張なし。
- f878アーカイブ96ファイル: `recovery/ambertime-f878-work-20261112` / `10591eb427b8ffe6649c2e4a2347a2519f2fc2c4` に保全。回収時runtimeはバイト一致。SHA256SUMS全件と5戦略proofの98ファイルを検査し不一致なし。
- 安全な単世代性能実験: `recovery/ambertime-perf-v05-20261112`。測定runtimeはremote `8593831d3fd4d77c066357f502a658ca87514a91`、local `2a3f009d6efa9e6d4033a852cd2e84be56ee79c3`、共通tree `f417cb3a4ac7ee6023ce9e2bfe5af08db442a872`。後続commitは証拠MDのみ。
- [性能証拠・全結果JSON・実行プログラム](https://github.com/SukimaStock/yumaniwa-town-staging/blob/recovery/ambertime-perf-v05-20261112/works/ambertime/design/restore-perf-v05/REPORT.md) に入力hash、独立oracle、正常終了、実行したrunner/loader全文とhashを保全。
- 世界拡張Stage5の既存回収bundleは `git bundle verify` 成功。候補 `1e6126b8657e48d7024f8569b156422eb97e6ff5`、bundle SHA-256 `640a992e279f14653e1a21461c057fb9ab3b43c826a0899f1285af78d0f30b00`。原回収パッケージを保持し、本編へ追加接続していない。

作者の実セーブ・秘密情報・巨大fixture本体はコミットしていない。fixture原本は生成データで、変更していない。ローカルgit pushは認証がなく失敗したため、正規の接続済みGitHub APIでPlan→実装commit→branchを保全した。権限制約・Change OSの迂回なし。

## 利用した環境

| 環境 | 結果・証明範囲 |
|---|---|
| Work Node v24.22.1 | 正式reader、模擬IDB、独立プロセス試験。ブラウザーではない |
| Work内Playwright + /usr/bin/chromium | socket EPERMで起動前停止。同じ再試行は繰り返していない |
| WorkクラウドChrome | 公開Stagingのタイトル表示のみ。候補保存・故障注入の成功ではない |
| Actions Ubuntu26.04 | Chromium sandbox利用不可で起動前停止 |
| Actions Ubuntu22.04.5 / Chromium 151.0.7922.34 / Node v22.23.4 | sandbox有効のまま本編native IndexedDB試験成功 |
| Playwright WebKit / iPhone Safari | 未実施。Chromiumで代用したとは主張しない |

失敗後は公式に利用可能なUbuntu22.04 runnerへ固定した。no-sandbox、sysctl変更、trusted gate/registry変更は行っていない。

## 実ブラウザーの正式保存安全性

[成功run 43218947596 / job 131185241495](https://github.com/SukimaStock/yumaniwa-town-staging/actions/runs/43218947596/job/131185241495)。候補 `ae0c0922e036fef309d4881990631207c93ad242`。**保存基盤12/12、本編7シナリオ成功**。本編のNode集計は親1+子7=8tests、8pass、0fail、0skip。最後のcomplete markerまで正常終了。

| 対象 | 実施内容・結果 |
|---|---|
| 移行・通常保存 | 旧v8の正式reader、v9候補独立生成、原子的commit、正式読戻し。legacy原文とorigin保持 |
| 書込み前Quota | adapter試験はnative API位置でDOMException注入し、全旧entry保持・停止。本編のQuotaはwriter例外注入で未反映・停止を確認（本編のnative API故障は別途abort/readbackで実施） |
| 書込み途中 | 実native transaction.abort。全entry rollback、本編game・全sidecar未反映 |
| commit後読戻し失敗 | native commit後のreadonlyに例外注入。新headと正確な旧previousが残り、本編は未反映・停止。cold正式復元成功 |
| 新旧世代の破損 | native DBのhead/previousを個別に破損。正式検証で停止し、上書きしない |
| 保存中ページ終了 | 実page.closeでnative transaction中に終了。旧または新の完全な世代から復元 |
| 別タブ | 実2ページの古いCASを拒否、勝った保存を保持 |
| 移行途中の失敗 | native abortでIDBは空のまま、旧v8を正確に保持 |
| 二重操作・遅延反映 | 2回目を拒否。読戻し失敗・中断後の遅延反映なし |
| 復元後の初回保存失敗 | cold接続後のQuota注入で全旧entry・head保持、停止 |
| 別ブラウザープロセス | persistent profileの正常終了・新プロセスで正確な正式状態を復元 |

本編7シナリオは旧v8移行、明示的新規開始、commitと本編反映の分離、合成pagehide中断、**実writerのnative abort、本編のcommit後readback失敗**、2タブ競合とQuotaを含む。追加2ケースはmainStoreの同一性を確認し、writerを代替しない。game全体・clock・caskSlots・recentLedger・historyRecord・recallRecordの未反映と、cold reload後の正式readerの全session一致を比較した。

Quotaは物理ディスク枯渇ではなく例外注入。pagehideは合成イベント、page.closeは実ページ終了。正常な終了・再起動はOS強制終了、電源断、evictionの証明ではない。native試験は小さな合成保存で、100年巨大保存のnative性能は未検証。旧世代の自動採用・自動rollbackは追加していない。

初回試験のDOMException数値code/name混同を修正した。全旧entry一致・停止を先に検査し、native abort実行済みとTransactionInactiveErrorを厳密確認する。期待値を緩めたり、試験を無効にしたりしていない。

## 本編の検証順序改善

previous→headの順に正式検証し、既存のorigin・seed・操作prefix完全一致cacheを利用する。正常候補の両世代の正式reader、SHA、構造、世代関係、CAS、結果読戻しは維持し、head由来sessionを返す。新しい信頼cache・実データ共有は追加していない。破損判明時は安全停止する。

同じ地域100年fixtureの2世代を使い、実際の `bootMainIdb` →正式readerをNodeで測定した。IndexedDB open/readonlyの要求スケジューリングとlocalStorageは模擬であり、nativeブラウザー性能ではない。originは実装の3つのlegacy keyを使用。

| 2世代の検証順序 | 正式reader呼出し | 全boot秒 |
|---|---|---:|
| head→previous（回収基点） | head 96.596秒 + previous 94.870秒 | 191.675 |
| previous→head（#929 runtime d087） | previous 91.106秒 + head 1.683秒 | 92.911 |

**51.5%短縮。両方の正式readerを実行**し、旧・新の独立した全session期待値、同じhead/previous wire hash、全stored entry不変、ready/idbを確認した。両プロセス正常exit0。新しい順序では既存の厳密なprefix cacheが効いたが、最初の旧世代再生は約91秒残る。これは実行環境1回のNode比較で、native IDB・iPhoneの時間やwrite時間ではない。単世代性能候補8593831dとの併用を測定したものでもない。

## 5戦略・100年の正式保存往復

対象は**Node限定性能候補8593831d**。#929のnative成功をこの変更済みruntimeへ転用しない。単世代最適化は前回の安全な候補の回収・再検証であり、前回最速値57秒からさらに短縮したとは主張しない。異なるホストの過去の秒数と直接比較しない。

原a210の1200か月経営fixtureと、原モデルで独立生成された翌月の全sessionを固定して再利用した。新しい1200か月の戦略選択を生成し直したものではない。今回は全5戦略で新しく正式serializeし、別プロセスでcold復元→全期待値比較→翌月→独立期待値比較→再保存、さらに第2プロセスで再復元→全期待値比較→canonical再保存を実行。**全て最後の結果JSONまで到達し、親・両child・全体launcherは正常exit0。**

game全体と全sidecarをJSON完全一致で比較し、現金・商品/委託在庫・売上・取引先・申し出・世代・回想・乱数を含む。履歴・操作を削除していない。元fixtureの不変と新旧wire hash一致も確認。

| 戦略 | 改善前cold秒 | 安全候補cold秒 | 第2cold秒 | 短縮率 | 全往復 |
|---|---:|---:|---:|---:|---|
| 地元中心 | 180.450 | 129.357 | 142.478 | 28.3% | PASS |
| 地域中心 | 88.785 | 75.492 | 74.220 | 15.0% | PASS |
| 大量委託 | 95.743 | 81.053 | 79.873 | 15.3% | PASS |
| 少量継続 | 187.694 | 164.940 | 164.374 | 12.1% | PASS |
| 複数窓口分散（実2窓口） | 92.679 | 82.614 | 76.689 | 10.9% | PASS |

同fixture・同環境・重い回帰suite終了後の逐次プロセス。各1回の測定で統計的保証ではない。地元の最初のFULL baselineは回帰suiteと競合し約200秒だったため、負荷のない再測定180.450秒を比較に用いた。

地元/地域/大量/少量は1332→1333月、真分散は1450→1451月。全て委託開始後1200か月。分散にはtrial-region-desk実売2159本、national-specialist-desk実売2061本（計4220本）があり、1窓口を分散と呼び替えていない。

## 内訳・再保存・メモリ

地域の安全候補75.492秒の内訳。nested値は加算しない。

| 処理 | 秒・区別 |
|---|---:|
| 保存wireのファイル読込 | 0.030（filesystem、IDBではない） |
| 外側JSON解析 | 0.074 |
| lossless decode | 0.886 |
| game展開 | 0.641 |
| native JSON解析 | 0.017 |
| 正式native reader全体 | 73.632（再生を含む） |
| 操作履歴再生 | 72.599 |
| checkpoint cache生成 | 0.048（復元ではない） |
| 最終状態一致確認 | 0.212 |
| 全sidecar検査 | 約0.030 |

coldプロセスにwarmなnative replay checkpointはない。保存済みcheckpointのcold復元として測定した経路ではなく、checkpointCaptureを復元時間と読み替えない。履歴再生が大部分を占め、既存CPU研究では繰り返すstructuredCloneが主要コストだった。安全候補も実データはnative structuredCloneで分離し、数値が固定点になった履歴部分の量子化走査だけをprivate同期replay中に再利用する。却下された共有town案は再導入していない。

| 戦略 | 復元・翌月後の最初の正式serialize秒 | child1 peak RSS |
|---|---:|---:|
| 地元中心 | 5.449 | 1218 MiB |
| 地域中心 | 2.372 | 864 MiB |
| 大量委託 | 2.602 | 923 MiB |
| 少量継続 | 3.909 | 1128 MiB |
| 複数窓口分散（実2窓口） | 2.398 | 773 MiB |

これはserializerと内蔵reader検証の時間で、**本編IndexedDB writer全体ではない**。baselineは復元直後の同月、candidateは翌月後のserializeなので微小差を保存性能改善と扱わない。RSSはoracleも保持するNodeプロセス全体で、iPhone実測ではない。メモリ改善は示せていない。

## CI・回帰・独立レビュー

実装・試験対象ae0c0922の `plan-risk-gate`、`trusted-mechanical-evidence`、`validate`、`native-chromium` は全て成功。Scope→Risk→Impact、base-owned Trusted Staticも同じ実行treeでPASS。workflowは同一repoのpull_request、contents:read、exact head、認証非永続化。既存trusted gate/registryは不変。

- 最初の保存関連Node97/97成功。検証順序候補は新3件を含む96/96成功。別suiteで重複し、合算しない。
- 独立担当の保存重点57/57、性能helper/改変検出/低資金rollback等6/6も正常終了。実装担当以外が保存・性能・workflow・native試験をレビューし、新たな阻害不具合なし。
- candidate SHA・本編4ファイルhash・nativeログを独立照合。追加した本編故障2試験も独立レビュー済み。
- 全回帰初回: main1820tests / 1700pass / 102fail / 18skip、回収候補1928tests / 1834pass / 75fail / 19skip。両者結果表示まで到達しexit1。候補の追加失敗タイトル0、mainの27失敗タイトルが解消。**全回帰成功ではない**。
- 浅いcheckoutの歴史Git objectを正規fetch後、関係7ファイルを両者で再実行: main38件29pass9fail、候補38件30pass8fail。追加失敗なし。全体再実行の数値ではない。
- 新cache比較2ファイルはmain0778から直接比較して5/5成功。未回収の中間commit上の成功を装わず、recursive identity、8LabのURL以外のバイト一致、exact927経済ソースhashを維持した。

native成功・独立レビューで照合した本編SHA-256:

| ファイル | SHA-256 |
|---|---|
| formal-idb-storage.mjs | `4d65d9995ce4421e0fc243cfd0b6a5e57c0d611efca2a6e1caa9143d831973dc` |
| formal-idb-main.mjs | `ee7fde795218eb39a71932d6d3744a0f6d86f9ff1d03b7ea631779fdf55e5da3` |
| development-save.mjs | `d47882888030153e3424840be160e6270713f245d77f85f96cd2673424f3d8d1` |
| shop-app.mjs | `17c7cb5d63a2caa777f07da11269ffa99a6445348e9fcd60b0bb1a0397cd1c97` |

## 停止理由・次の実現可能な改善

1. 安全な単世代候補でもcold復元75〜165秒。#929の順序改善だけで最初の長期再生自体は消えない。
2. 単世代性能候補はNode限定。browser module URL/cache closureは未統合で、#929のnative証拠は転用不可。両改善を併用する配信候補は未検証。
3. source上の検証済みtext cacheは8Mi **code units**上限。地元のhead+previous約9.2M units、少量のcandidate+head+previous約11.1M unitsは上限を超え、追出し・再再生が起こり得る。100年native writerの実測ではなく、serializerの数秒で保存全体を保証しない。
4. 次はcandidate/head/previousの検証結果を適切なメモリ上限で保持する方式を、全チェック・reader identity・失敗停止を維持して検証する。過去履歴を毎操作複製するモデル境界も整理し、公開APIの入力非破壊、低資金rollback、世代交代、全状態一致を証明する。共有town案やreader省略で解決しない。
5. 既存回帰失敗は未解決。期待値緩和・試験無効化なし。世界拡張の追加接続とUIメモ41〜44は実施しない。

したがって**#927と#929はDraft・未マージ、Stagingの新配信なし**。Production変更なし。正式verificationStateもUNVERIFIEDで、個々のPASSを正式完成・作者採用へ水増ししない。

## 作者のiPhoneで必要な確認

iPhone Safari実機は未確認。性能とメモリを改善した配信候補ができた後、合成長期データで継続/保存/再起動、バックグラウンド復帰、別タブ競合、実指の停止・復帰、実容量・OSメモリ圧迫を確認する。現時点で作者の実セーブを未配信候補へimportし直す必要はない。

