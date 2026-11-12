# 追記：検証順序改善候補（未配信）

以下の本報告はブラウザー成功基点08625280の証拠として保持する。新候補ではformal-idb-storage.mjsのverifyMainEntriesがprevious→headの順で正式検証する。すべての正式reader・SHA・世代関係・CAS・読戻し検査を維持する。新規3件を含む保存関連Node検証96件が成功（fail/skipとも0、正常終了）。既存2件のreader呼出順序期待値だけをhead→previousからprevious→headへ更新し、呼出回数・全安全性検査を維持した。新storage SHA-256: `4d65d9995ce4421e0fc243cfd0b6a5e57c0d611efca2a6e1caa9143d831973dc`。新候補のnativeブラウザー・100年cold性能・exact CIは未確認であり、以下の086成功を新候補の成功へ読み替えない。本編保存storageの新hashは別記録に固定する。

Fresh Plan: `.change-plans/ambertime-idb-order-v05-20261112/r0.lock.json`。Production変更なし。

---

# AmberTime v0.5 — ブラウザー検証と統合候補

2026-11-12。Draft / Staging未マージ。Production変更なし。

## 固定候補と回収

- 最新main: `0778bcf4555737ec45947a80aca8f761f39fa429`。
- PR #927: Draft、head `a210984399547b07728c48bcd83365cf2f28e269`。今回の委託販売はその経済ソースのhashを固定し、旧確定売上・既存価格を維持する。
- 回収したf878アーカイブの96ファイル: `recovery/ambertime-f878-work-20261112` / `10591eb427b8ffe6649c2e4a2347a2519f2fc2c4`。runtimeは回収原本とバイト一致。アーカイブの古いPlanを新しい承認として再利用していない。
- 新規Plan: `.change-plans/ambertime-browser-v05-20261112/r0.lock.json`。実装前commit `9fbdbde748945e57b96778fb417b3a6edbc9db9c`。
- 実ブラウザー成功候補: `08625280bb5da65eb1be33a80c1f488d0c5a0e01`、[PR #928](https://github.com/SukimaStock/yumaniwa-town-staging/pull/928)。
- 安全な性能実験を独立保全: `recovery/ambertime-perf-v05-20261112` / `8593831d3fd4d77c066357f502a658ca87514a91`。これはNode実験であり、ブラウザーcache fingerprint未統合、配信用候補ではない。
- ローカルgit pushは認証がなく失敗。正規の接続済みGitHub APIでPlan→実装commit→branchを保全した。権限制限を迂回していない。

## 検証環境

| 環境 | 観測結果 | 証明範囲 |
|---|---|---|
| Work実行環境 Node v24.22.1 | 正式reader、模擬IDB、独立プロセス試験 | nativeブラウザーではない |
| Work内Playwright + /usr/bin/chromium | socket EPERMで起動前停止、同じ再試行なし | ブラウザー試験未実施 |
| WorkクラウドChrome | 公開Stagingタイトルのみ確認 | 候補保存・故障注入の証明ではない |
| Actions Ubuntu26.04 | Chromium sandbox利用不可で起動前停止 | 保存試験未実施 |
| Actions Ubuntu22.04 / Chromium 151.0.7922.34 / Node v22.23.4 | 本編native IndexedDB試験成功 | 合成データ・localhost、sandbox有効 |
| Playwright WebKit / iPhone Safari | 未実施 | 成功と扱わない |

初回Actionsのsandbox失敗後、sandboxを無効化せず、公式に利用可能なUbuntu22.04のrunnerへ固定した。sysctl、セキュリティ設定、trusted gate、registryは変更していない。

## 実ブラウザーでの保存安全性

[成功run 43214361268](https://github.com/SukimaStock/yumaniwa-town-staging/actions/runs/43214361268)、job `131169700207`。

1. PASS — migration preserves exact v8; real writer accepts official lossless v9 (native transactions + official reader)
2. PASS — quota rejects and keeps all prior bytes (quota injected exception; abort native transaction)
3. PASS — abort rejects and keeps all prior bytes (quota injected exception; abort native transaction)
4. PASS — postcommit readback failure halts; old normal generation survives (injected readback failure after native commit)
5. PASS — corrupt head stops rotation without overwriting other generations (injected native DB corruption + official validation)
6. PASS — corrupt previous stops rotation without overwriting other generations (injected native DB corruption + official validation)
7. PASS — closing page during native write leaves complete old or new generation (actual page close with active transaction; not OS kill)
8. PASS — two native tabs reject stale CAS and retain winning exact head (actual two pages, native serialized write transactions)
9. PASS — migration interrupted in native transaction retains exact legacy and empty IDB (native transaction abort during migration)
10. PASS — overlapping input is rejected while first real save succeeds once (actual adapter busy guard and native writer)
11. PASS — first save after cold adapter restore fails safely (injected quota on first native write after cold connection)
12. PASS — new browser process restores exact official state (native persistent profile clean close/reopen; not power loss)

12件すべて成功し、最後のcomplete markerまで正常終了。別途、本編UI/runtimeの5シナリオも成功（Node集計は親1+子5=6tests、6pass、0fail、0skip）。旧v8の正確な移行、空originから明示的新規開始、native commit完了と本編反映の分離、二重入力拒否、合成pagehide中断、実2タブ競合、注入Quotaで進行しないことを確認した。

Quotaは実ディスク枯渇ではなくDOMException注入。readbackも例外注入。途中失敗はnative IDBTransaction.abort、ページ終了は実際のpage.close。runtimeのpagehideは合成イベント。ブラウザープロセス復元はpersistent profileの正常終了・再起動であり、OS強制終了、電源断、evictionを証明しない。100年の巨大保存をnativeブラウザーで読み込んだ試験ではない。

エラー分類の初回テスト不備を修正した。DOMExceptionの数値codeとnameを分離し、旧世代全entry一致・安全停止・旧raw保持を先に検査する。期待値を緩めて失敗を隠したものではない。native abort後の次のmetadata putはTransactionInactiveErrorとなることを記録し、abort実行済みと厳密照合した。

保存失敗・読戻し不確定・競合・破損ではadapterと本編が停止し、候補は本編へ反映されない。postcommit読戻し失敗時、新headが存在しても直前の正常previousが保持される。自動rollback・旧世代の自動採用・legacy raw削除はしない。

## CI・回帰・独立レビュー

成功候補 `08625280bb5da65eb1be33a80c1f488d0c5a0e01` の `plan-risk-gate`、`trusted-mechanical-evidence`、`validate`、`native-chromium` はすべて成功。Scope→Risk→Impactも同一候補でPASS。mainのrulesetは必須2checkをstrictに要求し、bypass actorなし。新ブラウザーworkflowはpull_request、同一repo、contents:read、exact head、認証非永続化で実行する。

- 保存関連Node模擬試験: 97/97成功、正常終了。
- 独立レビュー担当の重点試験: 57/57成功、正常終了（上記97件と重複するため合算しない）。
- 全回帰初回: main 1820tests / 1700pass / 102fail / 18skip、候補1928tests / 1834pass / 75fail / 19skip、両方正常に結果表示まで到達しexit1。候補で追加された失敗タイトルは0、mainの失敗タイトル27件が候補では解消。全テスト成功とは扱わない。
- 初回は一部の歴史Git objectが浅いcheckoutに不足した。正規fetchで全履歴取得後、関連7ファイルを両方で再検証: main38件29pass9fail、候補38件30pass8fail。追加失敗なし。全体を再実行した数値ではない。
- 2件の新しいcache比較は、存在しない中間commitに依存する過去試験の成功を装わず、main0778からの直接比較として5/5成功。recursive identity、8LabのURL以外のバイト一致、exact927経済ソースhashを保持する。
- 独立レビューで保存境界、新workflow、native試験を確認。成功runのcandidate SHAと本編4ファイルhashも独立照合し一致。新しい阻害不具合なし。これはiPhone実機承認ではない。

## 長期検証と性能

native成功ログと独立レビューで照合した本編hash:

| ファイル | SHA-256 |
|---|---|
| formal-idb-storage.mjs | `ff42c47af7e06d133ab578120c8c7fe8752878cb8d4b072977d7a565d629a566` |
| formal-idb-main.mjs | `ee7fde795218eb39a71932d6d3744a0f6d86f9ff1d03b7ea631779fdf55e5da3` |
| development-save.mjs | `d47882888030153e3424840be160e6270713f245d77f85f96cd2673424f3d8d1` |
| shop-app.mjs | `17c7cb5d63a2caa777f07da11269ffa99a6445348e9fcd60b0bb1a0397cd1c97` |

回収したf878アーカイブのSHA256SUMS全件、および5戦略proofアーカイブの98ファイルを検査し、不一致なし。生成fixtureは作者の実セーブではなく、今回も原本を変更していない。

検証継続中。詳細結果は確定後追記する。旧アーカイブの5戦略成功と今回の再実行を混同しない。100年復元は依然として重大な未解決事項であり、Stagingへのマージを停止する。

## 現時点の停止境界

PR #928と#927はDraftのまま、Staging配信なし。正式保存のnative検証が成立しても、長期復元性能・回帰失敗・exact最終候補の結果を未解決のまま完成としない。世界拡張の追加接続、UIメモ41〜44、Productionには進まない。

作者のiPhone確認は、性能問題を解決した配信候補ができた後に、旧v8を外部保全したうえで継続/保存/再起動、バックグラウンド復帰、実指の操作停止と復帰、Safariの容量・メモリ挙動を確認する。現時点で作者の実セーブをこの未配信候補へimportし直す必要はない。

