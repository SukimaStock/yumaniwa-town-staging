# AmberTime v0.5 — 復元性能・保存往復の実行記録

更新: 2026-11-12T12:50:59.186982+00:00

状態: 最終測定完了。改善候補の完全な5戦略プロトコルは **5/5完了**。完了集合: local, regional, bulk, small, diversified。未完了・将来実行予定は成功扱いにしない。

## 固定した対象

- 回収基準: `bb12ed61`（既存96ファイル候補）。正式v9 lossless保存・IndexedDB本編接続・委託販売の既存候補。
- 性能実験の測定commit: `2a3f009d6efa9e6d4033a852cd2e84be56ee79c3`、測定Git tree: `f417cb3a4ac7ee6023ce9e2bfe5af08db442a872`。
- 同一treeの保全先: `recovery/ambertime-perf-v05-20261112`、head `8593831d3fd4d77c066357f502a658ca87514a91`。後続の本報告だけのcommitを測定済みruntimeに読み替えない。
- 実装前Plan: `.change-plans/ambertime-perf-v05-20261112/r0.lock.json`、lock commit `f47806f`、digest `181974d7510fc1cac25cae90857e1361b7fff8370729a70e59597d9343a00aaa`。
- 基点main: `0778bcf4555737ec45947a80aca8f761f39fa429`。Production変更なし。Node実験のみ。ブラウザー用のrecursive cache URLを更新していないため、そのまま配信する候補ではない。

## 検証の意味と限界

1. Node `v24.22.1` / Linux x64の別プロセスによる正式reader/serializer検証。ブラウザーIndexedDB・iPhone Safariの性能測定ではない。`fileRead`はscratch filesystemの読取り時間。
2. 100年の原軌跡は、元の `a210984399547b07728c48bcd83365cf2f28e269` モデルで生成・凍結された独立期待値を再利用した。今回1200か月の生成そのものを再実行したとは主張しない。翌月の独立期待値も凍結済み原本を使用し、改善候補から生成し直していない。
3. 改善候補では各戦略を新しく正式保存し、child1でcold復元・全gameと全sidecar一致・翌月進行・独立翌月原本一致・再保存、child2で再cold復元・全一致・canonical再保存の完全一致を確認する。親プロセスの正常終了まで完了扱いにしない。
4. 基準側は地元のみ完全プロトコルを新実行。残る4戦略は1回ずつfresh正式reader・全原本一致・復元後最初の正式serializerとcanonical wire一致を新実行した。基準側の過去5完全プロトコル成功は過去証拠のまま区別する。
5. 初期の地元基準は2本の全回帰suiteと競合したため、正しさだけの証拠。改善候補5戦略の終了後、同じloaderを用いた地元基準のfresh readerを再実行し、正常終了と全原本一致を確認したうえで比較値に採用した。
6. `firstSaveAfterRestore`は正式serializerとその内部reader検証の時間。IndexedDB transaction書込み時間ではない。`checkpointCapture`はreplay後に新しく作るdetached cache snapshotであり、永続checkpointのcold復元ではない。phase値は入れ子であり合計してはならない。
7. native IndexedDB起動はheadとpreviousを検証する。単一generationのNode reader時間を、そのままブラウザー起動時間とみなさない。
8. 単回測定。信頼区間やiPhone外挿なし。長い復元時間と大きいメモリは未解決。性能改善だけでStagingマージ条件を満たしたとは扱わない。

## 本編writerの残る性能リスク（source分析・未測定）

`formal-idb-storage.mjs` の `rememberValidated` は接続内の正式検証済みtext cacheを合計 `8*1024*1024` code units以内へLRU削除する。これはUTF-8 byte数ではない。地元のhead+previousだけで約9.2M code unitsとなり上限を超える。少量戦略でもcandidate+head+previousの3世代相当は約11.1M code unitsとなる。

したがって本編writerでは、正式serializerが数秒でも、検証済みtextの追出しによって再び正式reader・操作replayが必要になる可能性がある。今回のserializer測定はnative IndexedDBの100年データ初回save全体を測っていない。二世代read-only測定もwrite経路の証明ではない。この可能性はsourceから導いた未解決事項であり、100年native browser writeで発生を観測したとの主張ではない。

次の候補はcandidate/head/previousを明示的に扱うbounded cache policyと、ブラウザーのmemory・失敗時検証を組み合わせること。無条件の上限拡大やreader条件の緩和は行っていない。

## 安全な差分と拒否した案

native `structuredClone`による完全detachmentとalias保持を残し、private synchronous replay内だけで量子化固定点のappend-only `events` / `arrivals` / `attempts` prefix長をWeakMapに記録する。実データ共有・保存メタデータ追加・履歴削除・操作再生省略・reader受理条件変更はない。public呼出しは従来の全走査を維持する。

町全体を共有するowned-town案は、月次の自動瓶詰め予約失敗rollbackで旧状態へ変更が漏れる反例が見つかり不採用。この案を再採用していない。将来、旧ログ行を変更する実装を入れる場合はprefixのappend-only前提を再検証する。

## 進行と比較

| 戦略 | 基準cold秒 | 改善候補cold秒 | 2回目cold秒 | 完全プロトコル |
| --- | ---: | ---: | ---: | --- |
| local | 180.450 | 129.357 | 142.478 | 親・両child正常終了 |
| regional | 88.785 | 75.492 | 74.220 | 親・両child正常終了 |
| bulk | 95.743 | 81.053 | 79.873 | 親・両child正常終了 |
| small | 187.694 | 164.940 | 164.374 | 親・両child正常終了 |
| diversified | 92.679 | 82.614 | 76.689 | 親・両child正常終了 |

地元の競合あり基準完全プロトコル: 初回正式serializer199.454秒、child1 cold200.322秒、child2 cold189.956秒、親exit0。比較値には未採用。

## 検査

- 新しいclone helperと境界検証: 6/6成功。native graph detachment、public prefix非流用、例外後scope復元、低資金月次rollback、旧ログ改変拒否・cache汚染なし、public sparse/extra-property互換を含む。
- exact `2a3f009` のScope / Risk / Impactはすべて成功。正式CI、実ブラウザーの成否は別担当の記録に従い、本Node結果から成功を推測しない。

## 残る単一世代cold復元の改善候補

測定ではoperation replayがcold時間の大部分を占める。次はreplay中のdetached state copy回数と、蓄積town logの再copyを分離して測定し、rollback境界を壊さないprojectionや不変データ表現を独立設計する。検証済みprefix checkpointの再利用は同一origin・完全一致する操作prefixの範囲に限定し、未知のcold履歴をchecksumだけで受理する方式へ変更しない。shared townへの単純な参照共有は不採用のままとする。

## 二世代readMainRecord測定

別の正規Planで実装されたprevious→head検証順序候補を、100年の旧世代・翌月の新世代で測定した。現在のfixtureは合成原軌跡だけを使用する。候補commit `d087bbca74768aa666e2c9d681030bf5df1a0a22`、tree `b675d0f3c14acf4b43e798376232b55a8cb26fd6`。実 `bootMainIdb` → `readMainRecord` と実正式reader・SHA検証を呼び、実際の3つのlegacy source key（すべてnull）を一致させる。IDBのopen/readonly request schedulingだけを模擬する。native browser IDB測定とは区別する。二世代とも正式readerが呼ばれたこと、旧・新の全session原本一致、保存bytes不変、ready/idb、親・両プロセス正常終了を確認した。

## 最終比較JSON

```json
{
  "environment": "Node, local managed executor, sequential fresh processes. Not browser IndexedDB or iPhone.",
  "baselineRuntime": "bb12ed6 recovered candidate; local clean comparison after full protocols; original local full run200s retained as contended correctness only.",
  "optimizedRuntime": {
    "localCommit": "2a3f009d6efa9e6d4033a852cd2e84be56ee79c3",
    "gitTree": "f417cb3a4ac7ee6023ce9e2bfe5af08db442a872",
    "preservedRemoteHead": "8593831d3fd4d77c066357f502a658ca87514a91"
  },
  "fixtures": "Frozen original a210 independent1200-month careers and frozen original next-month full-session oracles. Original100-year generation reused, not rerun.",
  "timingInterpretation": "Single run per strategy; phase measurements nested, not additive. fileRead is filesystem, not IndexedDB. Native IDB head+previous verification may incur additional reader passes. firstSaveAfterRestore is official serialization plus embedded reader verification, not IDB transaction write. checkpointCapture is new replay-cache snapshot capture, not persisted checkpoint restoration. Memory not demonstrated improved.",
  "allFiveOptimizedFullProtocolNormalExit": true,
  "allFiveUncontendedBaselineReadsNormalExit": true,
  "baselineRoutes": [
    {
      "strategy": "local",
      "exitCode": 0,
      "elapsedSeconds": 603.8525707889999
    },
    {
      "strategy": "regional",
      "exitCode": 0,
      "elapsedSeconds": 91.79852619700023
    },
    {
      "strategy": "bulk",
      "exitCode": 0,
      "elapsedSeconds": 98.90220103499996
    },
    {
      "strategy": "small",
      "exitCode": 0,
      "elapsedSeconds": 192.12309605100018
    },
    {
      "strategy": "diversified",
      "exitCode": 0,
      "elapsedSeconds": 95.38890496700014
    }
  ],
  "optimizedRoutes": [
    {
      "strategy": "local",
      "exitCode": 0,
      "elapsedSeconds": 423.4763741339998
    },
    {
      "strategy": "regional",
      "exitCode": 0,
      "elapsedSeconds": 236.9919878999999
    },
    {
      "strategy": "bulk",
      "exitCode": 0,
      "elapsedSeconds": 251.87983209599997
    },
    {
      "strategy": "small",
      "exitCode": 0,
      "elapsedSeconds": 504.8709297989999
    },
    {
      "strategy": "diversified",
      "exitCode": 0,
      "elapsedSeconds": 251.18957033899915
    }
  ],
  "rows": [
    {
      "strategy": "local",
      "baselineColdSeconds": 180.450258282,
      "optimizedColdSeconds": 129.356862952,
      "optimizedSecondColdSeconds": 142.47805301100001,
      "coldImprovementPercent": 28.314393016912952,
      "sameWireSHA256": "87f84465dbeaf08f5bb3ad3fc1bb26881fff304026446568e09de0c180cf4456",
      "baselineFirstSaveAfterRestoreSeconds": 5.169401255000004,
      "optimizedFirstSaveAfterRestoreSeconds": 5.4488128550000114,
      "baselineReadPhases": {
        "fileRead": {
          "calls": 1,
          "ms": 61.92654200000004
        },
        "sessionJSONParse": {
          "calls": 1,
          "ms": 86.81421599999999
        },
        "sessionLosslessDecode": {
          "calls": 1,
          "ms": 1417.092608
        },
        "gameExpansion": {
          "calls": 1,
          "ms": 730.8745050000002
        },
        "nativeJSONParse": {
          "calls": 1,
          "ms": 41.39590499999986
        },
        "operationReplay": {
          "calls": 2,
          "ms": 175891.00992
        },
        "checkpointCapture": {
          "calls": 2,
          "ms": 94.94285699999637
        },
        "finalStateEquality": {
          "calls": 2,
          "ms": 412.5174869999855
        },
        "officialNativeValidation": {
          "calls": 1,
          "ms": 176401.199074
        },
        "officialNativeReader": {
          "calls": 1,
          "ms": 177844.57400700002
        },
        "sidecar.slots": {
          "calls": 1,
          "ms": 0.48939299999619834
        },
        "sidecar.ledger": {
          "calls": 1,
          "ms": 3.672576000011759
        },
        "sidecar.history": {
          "calls": 1,
          "ms": 5.070512999984203
        },
        "sidecar.recall": {
          "calls": 1,
          "ms": 24.268562999990536
        }
      },
      "optimizedReadPhases": {
        "fileRead": {
          "calls": 1,
          "ms": 13.98077699999999
        },
        "sessionJSONParse": {
          "calls": 1,
          "ms": 24.37199899999996
        },
        "sessionLosslessDecode": {
          "calls": 1,
          "ms": 1293.313306
        },
        "gameExpansion": {
          "calls": 1,
          "ms": 950.2520579999998
        },
        "nativeJSONParse": {
          "calls": 1,
          "ms": 91.45110199999999
        },
        "operationReplay": {
          "calls": 2,
          "ms": 125080.465731
        },
        "checkpointCapture": {
          "calls": 2,
          "ms": 129.00473400000283
        },
        "finalStateEquality": {
          "calls": 2,
          "ms": 426.71067799999173
        },
        "officialNativeValidation": {
          "calls": 1,
          "ms": 125643.707572
        },
        "officialNativeReader": {
          "calls": 1,
          "ms": 126692.770695
        },
        "sidecar.slots": {
          "calls": 1,
          "ms": 0.48359000000345986
        },
        "sidecar.ledger": {
          "calls": 1,
          "ms": 3.7531310000049416
        },
        "sidecar.history": {
          "calls": 1,
          "ms": 6.386687999998685
        },
        "sidecar.recall": {
          "calls": 1,
          "ms": 31.245148999994854
        }
      },
      "baselinePeakRSSKiB": 1276988,
      "optimizedChild1PeakRSSKiB": 1246908,
      "fullOptimizedProtocolNormalExit": true,
      "wholeGameAndEverySidecarEqual": true,
      "initialExpectedSHA256": "f35e0fb48fab929ebb689d94a07fe98f65c5b758fb4e779c92ba5c3edcf6c668"
    },
    {
      "strategy": "regional",
      "baselineColdSeconds": 88.784981675,
      "optimizedColdSeconds": 75.491623754,
      "optimizedSecondColdSeconds": 74.21956462200001,
      "coldImprovementPercent": 14.972529892117029,
      "sameWireSHA256": "b38a683adb00948baa91121922833d2169304a13613931a2d77ff71046cdb7f4",
      "baselineFirstSaveAfterRestoreSeconds": 2.4080605689999937,
      "optimizedFirstSaveAfterRestoreSeconds": 2.3719985450000096,
      "baselineReadPhases": {
        "fileRead": {
          "calls": 1,
          "ms": 31.322386999999992
        },
        "sessionJSONParse": {
          "calls": 1,
          "ms": 23.879705000000058
        },
        "sessionLosslessDecode": {
          "calls": 1,
          "ms": 861.96129
        },
        "gameExpansion": {
          "calls": 1,
          "ms": 450.550424
        },
        "nativeJSONParse": {
          "calls": 1,
          "ms": 15.767515000000003
        },
        "operationReplay": {
          "calls": 2,
          "ms": 86429.587908
        },
        "checkpointCapture": {
          "calls": 2,
          "ms": 47.10661599999321
        },
        "finalStateEquality": {
          "calls": 2,
          "ms": 179.93617300000096
        },
        "officialNativeValidation": {
          "calls": 1,
          "ms": 86660.524604
        },
        "officialNativeReader": {
          "calls": 1,
          "ms": 87235.249834
        },
        "sidecar.slots": {
          "calls": 1,
          "ms": 0.7169949999952223
        },
        "sidecar.ledger": {
          "calls": 1,
          "ms": 3.254574999999022
        },
        "sidecar.history": {
          "calls": 1,
          "ms": 6.527616999999736
        },
        "sidecar.recall": {
          "calls": 1,
          "ms": 19.374236999996356
        }
      },
      "optimizedReadPhases": {
        "fileRead": {
          "calls": 1,
          "ms": 30.013209999999958
        },
        "sessionJSONParse": {
          "calls": 1,
          "ms": 74.31311000000005
        },
        "sessionLosslessDecode": {
          "calls": 1,
          "ms": 886.21998
        },
        "gameExpansion": {
          "calls": 1,
          "ms": 641.173685
        },
        "nativeJSONParse": {
          "calls": 1,
          "ms": 17.484799000000294
        },
        "operationReplay": {
          "calls": 2,
          "ms": 72599.066998
        },
        "checkpointCapture": {
          "calls": 2,
          "ms": 48.02618300000813
        },
        "finalStateEquality": {
          "calls": 2,
          "ms": 212.2212709999976
        },
        "officialNativeValidation": {
          "calls": 1,
          "ms": 72864.048629
        },
        "officialNativeReader": {
          "calls": 1,
          "ms": 73632.251265
        },
        "sidecar.slots": {
          "calls": 1,
          "ms": 0.40508799999952316
        },
        "sidecar.ledger": {
          "calls": 1,
          "ms": 3.477339999997639
        },
        "sidecar.history": {
          "calls": 1,
          "ms": 7.107191000002786
        },
        "sidecar.recall": {
          "calls": 1,
          "ms": 18.697280000007595
        }
      },
      "baselinePeakRSSKiB": 808600,
      "optimizedChild1PeakRSSKiB": 885124,
      "fullOptimizedProtocolNormalExit": true,
      "wholeGameAndEverySidecarEqual": true,
      "initialExpectedSHA256": "4a3dc36bdc77c749376c2f52710a0caa438b58b7f5eb77a3a57e61355c539f8f"
    },
    {
      "strategy": "bulk",
      "baselineColdSeconds": 95.74322776300001,
      "optimizedColdSeconds": 81.053062878,
      "optimizedSecondColdSeconds": 79.87318441400001,
      "coldImprovementPercent": 15.343293962643079,
      "sameWireSHA256": "2e32bb086764754baca3073e08784d385eb9a31c32725cfff487658773355592",
      "baselineFirstSaveAfterRestoreSeconds": 2.747438221999997,
      "optimizedFirstSaveAfterRestoreSeconds": 2.6017031940000015,
      "baselineReadPhases": {
        "fileRead": {
          "calls": 1,
          "ms": 16.366428000000013
        },
        "sessionJSONParse": {
          "calls": 1,
          "ms": 22.983064000000013
        },
        "sessionLosslessDecode": {
          "calls": 1,
          "ms": 662.933638
        },
        "gameExpansion": {
          "calls": 1,
          "ms": 367.85512400000016
        },
        "nativeJSONParse": {
          "calls": 1,
          "ms": 17.435709000000088
        },
        "operationReplay": {
          "calls": 2,
          "ms": 93672.769612
        },
        "checkpointCapture": {
          "calls": 2,
          "ms": 47.05103999999278
        },
        "finalStateEquality": {
          "calls": 2,
          "ms": 185.38008500000205
        },
        "officialNativeValidation": {
          "calls": 1,
          "ms": 93908.41334
        },
        "officialNativeReader": {
          "calls": 1,
          "ms": 94456.564726
        },
        "sidecar.slots": {
          "calls": 1,
          "ms": 1.4548429999995278
        },
        "sidecar.ledger": {
          "calls": 1,
          "ms": 9.376506000000518
        },
        "sidecar.history": {
          "calls": 1,
          "ms": 6.185318000003463
        },
        "sidecar.recall": {
          "calls": 1,
          "ms": 22.503819000005024
        }
      },
      "optimizedReadPhases": {
        "fileRead": {
          "calls": 1,
          "ms": 32.862459
        },
        "sessionJSONParse": {
          "calls": 1,
          "ms": 87.64854300000002
        },
        "sessionLosslessDecode": {
          "calls": 1,
          "ms": 838.4114030000001
        },
        "gameExpansion": {
          "calls": 1,
          "ms": 675.4818309999998
        },
        "nativeJSONParse": {
          "calls": 1,
          "ms": 18.327932000000146
        },
        "operationReplay": {
          "calls": 2,
          "ms": 78147.25071
        },
        "checkpointCapture": {
          "calls": 2,
          "ms": 48.23599699999568
        },
        "finalStateEquality": {
          "calls": 2,
          "ms": 236.36187800000653
        },
        "officialNativeValidation": {
          "calls": 1,
          "ms": 78435.517217
        },
        "officialNativeReader": {
          "calls": 1,
          "ms": 79197.37745199999
        },
        "sidecar.slots": {
          "calls": 1,
          "ms": 0.3446479999984149
        },
        "sidecar.ledger": {
          "calls": 1,
          "ms": 2.3667180000047665
        },
        "sidecar.history": {
          "calls": 1,
          "ms": 4.949316999991424
        },
        "sidecar.recall": {
          "calls": 1,
          "ms": 20.977100999996765
        }
      },
      "baselinePeakRSSKiB": 849740,
      "optimizedChild1PeakRSSKiB": 945112,
      "fullOptimizedProtocolNormalExit": true,
      "wholeGameAndEverySidecarEqual": true,
      "initialExpectedSHA256": "0554aad284cb93e38691538723a3f3243418ecd3c489ce499b2bd30d255feabe"
    },
    {
      "strategy": "small",
      "baselineColdSeconds": 187.69358988999997,
      "optimizedColdSeconds": 164.94016695300002,
      "optimizedSecondColdSeconds": 164.373819088,
      "coldImprovementPercent": 12.122642520895294,
      "sameWireSHA256": "9cbfe8554c8106c4ed745e02d91317226c3b313bacd4c341ea92d38a4c3d1b95",
      "baselineFirstSaveAfterRestoreSeconds": 3.90499841,
      "optimizedFirstSaveAfterRestoreSeconds": 3.9091370160000225,
      "baselineReadPhases": {
        "fileRead": {
          "calls": 1,
          "ms": 20.270689000000004
        },
        "sessionJSONParse": {
          "calls": 1,
          "ms": 33.85853000000003
        },
        "sessionLosslessDecode": {
          "calls": 1,
          "ms": 816.898115
        },
        "gameExpansion": {
          "calls": 1,
          "ms": 525.3758890000001
        },
        "nativeJSONParse": {
          "calls": 1,
          "ms": 24.169977000000017
        },
        "operationReplay": {
          "calls": 2,
          "ms": 184950.61690700002
        },
        "checkpointCapture": {
          "calls": 2,
          "ms": 67.0498439999933
        },
        "finalStateEquality": {
          "calls": 2,
          "ms": 323.2279810000182
        },
        "officialNativeValidation": {
          "calls": 1,
          "ms": 185345.913876
        },
        "officialNativeReader": {
          "calls": 1,
          "ms": 186039.25658199997
        },
        "sidecar.slots": {
          "calls": 1,
          "ms": 0.23742699998547323
        },
        "sidecar.ledger": {
          "calls": 1,
          "ms": 2.909079000004567
        },
        "sidecar.history": {
          "calls": 1,
          "ms": 5.358479999995325
        },
        "sidecar.recall": {
          "calls": 1,
          "ms": 27.08933000001707
        }
      },
      "optimizedReadPhases": {
        "fileRead": {
          "calls": 1,
          "ms": 42.63996899999995
        },
        "sessionJSONParse": {
          "calls": 1,
          "ms": 102.04960399999993
        },
        "sessionLosslessDecode": {
          "calls": 1,
          "ms": 1158.386994
        },
        "gameExpansion": {
          "calls": 1,
          "ms": 763.6902400000001
        },
        "nativeJSONParse": {
          "calls": 1,
          "ms": 20.65267199999971
        },
        "operationReplay": {
          "calls": 2,
          "ms": 161112.47187500002
        },
        "checkpointCapture": {
          "calls": 2,
          "ms": 63.662480000018604
        },
        "finalStateEquality": {
          "calls": 2,
          "ms": 344.9977699999895
        },
        "officialNativeValidation": {
          "calls": 1,
          "ms": 161527.15070099998
        },
        "officialNativeReader": {
          "calls": 1,
          "ms": 162582.63065600002
        },
        "sidecar.slots": {
          "calls": 1,
          "ms": 0.887871000013547
        },
        "sidecar.ledger": {
          "calls": 1,
          "ms": 4.663349000009475
        },
        "sidecar.history": {
          "calls": 1,
          "ms": 5.681995999999344
        },
        "sidecar.recall": {
          "calls": 1,
          "ms": 19.192050000012387
        }
      },
      "baselinePeakRSSKiB": 1057720,
      "optimizedChild1PeakRSSKiB": 1155340,
      "fullOptimizedProtocolNormalExit": true,
      "wholeGameAndEverySidecarEqual": true,
      "initialExpectedSHA256": "b886e4a0e0820e5b36f5e36aa09f20620573f2160cf665d8b4746e6877d04c49"
    },
    {
      "strategy": "diversified",
      "baselineColdSeconds": 92.678532517,
      "optimizedColdSeconds": 82.614008214,
      "optimizedSecondColdSeconds": 76.688602125,
      "coldImprovementPercent": 10.85960689025138,
      "sameWireSHA256": "c78ce5bf0787634fbd9e30f7c01798a0ef49226c384fdd5f4f7374b7dcfa1443",
      "baselineFirstSaveAfterRestoreSeconds": 2.247028470999998,
      "optimizedFirstSaveAfterRestoreSeconds": 2.3984258139999874,
      "baselineReadPhases": {
        "fileRead": {
          "calls": 1,
          "ms": 16.68283500000001
        },
        "sessionJSONParse": {
          "calls": 1,
          "ms": 19.44136800000001
        },
        "sessionLosslessDecode": {
          "calls": 1,
          "ms": 509.32369
        },
        "gameExpansion": {
          "calls": 1,
          "ms": 263.759237
        },
        "nativeJSONParse": {
          "calls": 1,
          "ms": 20.788763000000017
        },
        "operationReplay": {
          "calls": 2,
          "ms": 91087.827256
        },
        "checkpointCapture": {
          "calls": 2,
          "ms": 39.74463600000013
        },
        "finalStateEquality": {
          "calls": 2,
          "ms": 201.7470120000064
        },
        "officialNativeValidation": {
          "calls": 1,
          "ms": 91333.44145099999
        },
        "officialNativeReader": {
          "calls": 1,
          "ms": 91731.466578
        },
        "sidecar.slots": {
          "calls": 1,
          "ms": 1.149397000001045
        },
        "sidecar.ledger": {
          "calls": 1,
          "ms": 12.291847000000416
        },
        "sidecar.history": {
          "calls": 1,
          "ms": 8.821257000003243
        },
        "sidecar.recall": {
          "calls": 1,
          "ms": 25.414927999998326
        }
      },
      "optimizedReadPhases": {
        "fileRead": {
          "calls": 1,
          "ms": 31.70471200000003
        },
        "sessionJSONParse": {
          "calls": 1,
          "ms": 80.23436300000003
        },
        "sessionLosslessDecode": {
          "calls": 1,
          "ms": 870.491339
        },
        "gameExpansion": {
          "calls": 1,
          "ms": 529.0637360000001
        },
        "nativeJSONParse": {
          "calls": 1,
          "ms": 39.681142000000364
        },
        "operationReplay": {
          "calls": 2,
          "ms": 79988.210915
        },
        "checkpointCapture": {
          "calls": 2,
          "ms": 38.216905999997834
        },
        "finalStateEquality": {
          "calls": 2,
          "ms": 145.39512300000388
        },
        "officialNativeValidation": {
          "calls": 1,
          "ms": 80176.304863
        },
        "officialNativeReader": {
          "calls": 1,
          "ms": 80859.17195999999
        },
        "sidecar.slots": {
          "calls": 1,
          "ms": 0.44186700000136625
        },
        "sidecar.ledger": {
          "calls": 1,
          "ms": 3.321195999989868
        },
        "sidecar.history": {
          "calls": 1,
          "ms": 5.833852999989176
        },
        "sidecar.recall": {
          "calls": 1,
          "ms": 27.194667999996454
        }
      },
      "baselinePeakRSSKiB": 743216,
      "optimizedChild1PeakRSSKiB": 791528,
      "fullOptimizedProtocolNormalExit": true,
      "wholeGameAndEverySidecarEqual": true,
      "initialExpectedSHA256": "86332df390402525a50fe500276328f2b58325533dd06c96fd1a13f97c294ffc"
    }
  ],
  "instrumentationSHA256": {
    "phase-loader-v05.mjs": "3051124a41e85e10e22987c53a1e819ca9f992ef92ca58256bdb19a8df96924d",
    "protocol-v05.mjs": "0b7ae57565ddccee36da372fdd18ddf4251e0ed330dd762465ead752bcc0c3fd",
    "protocol-perf-v05.mjs": "1a82851a22240d8a091e0b88f054ab72968147398b8573a93a35afefa94f4f4b"
  }
}
```

## 二世代測定結果

```json
{
  "storageKind": "Mock readonly IDB scheduling, not native browser IndexedDB",
  "baselineSource": "bb12ed6 recovered",
  "candidateSource": "d087bbca74768aa666e2c9d681030bf5df1a0a22",
  "candidateTree": "b675d0f3c14acf4b43e798376232b55a8cb26fd6",
  "bothFormalReadersExecuted": true,
  "fullHeadAndPreviousEqual": true,
  "baselineSeconds": 191.674708351,
  "candidateSeconds": 92.91123687899999,
  "improvementPercent": 51.526605842614146,
  "baselineOrder": [
    "head",
    "previous"
  ],
  "candidateOrder": [
    "previous",
    "head"
  ],
  "results": [
    {
      "variant": "baseline",
      "exitCode": 0
    },
    {
      "variant": "previous-first",
      "exitCode": 0
    }
  ]
}
```

## Fixture manifest（保存本体は含めない）

```json
[
  {
    "strategy": "local",
    "originalExpectedSHA256": "f35e0fb48fab929ebb689d94a07fe98f65c5b758fb4e779c92ba5c3edcf6c668",
    "originalExpectedBytes": 13295514,
    "frozenMonth": 1332,
    "consignmentStartedMonth": 132,
    "consignmentSettledMonth": 1332,
    "yearsAfterConsignmentStart": 100.0,
    "actuallySellingDesks": {},
    "nextExpectedSHA256": "639edacedb8967e4bea2abbe172aa8edd16a48045ff4473f2f061c5bd8868e19"
  },
  {
    "strategy": "regional",
    "originalExpectedSHA256": "4a3dc36bdc77c749376c2f52710a0caa438b58b7f5eb77a3a57e61355c539f8f",
    "originalExpectedBytes": 7039687,
    "frozenMonth": 1332,
    "consignmentStartedMonth": 132,
    "consignmentSettledMonth": 1332,
    "yearsAfterConsignmentStart": 100.0,
    "actuallySellingDesks": {
      "trial-region-desk": {
        "count": 4401,
        "revenueCents": 7041600
      }
    },
    "nextExpectedSHA256": "dcb2caea36c98f3641b8ec489fa51f3263ac2778806c10fa2b602dd7bc2848f3"
  },
  {
    "strategy": "bulk",
    "originalExpectedSHA256": "0554aad284cb93e38691538723a3f3243418ecd3c489ce499b2bd30d255feabe",
    "originalExpectedBytes": 7909358,
    "frozenMonth": 1332,
    "consignmentStartedMonth": 132,
    "consignmentSettledMonth": 1332,
    "yearsAfterConsignmentStart": 100.0,
    "actuallySellingDesks": {
      "trial-region-desk": {
        "count": 4401,
        "revenueCents": 7041600
      }
    },
    "nextExpectedSHA256": "72358db64c149b0bbf7b7f75d030c7d9e1be7ffc71d73f04336d4df748bb2dd7"
  },
  {
    "strategy": "small",
    "originalExpectedSHA256": "b886e4a0e0820e5b36f5e36aa09f20620573f2160cf665d8b4746e6877d04c49",
    "originalExpectedBytes": 10646516,
    "frozenMonth": 1332,
    "consignmentStartedMonth": 132,
    "consignmentSettledMonth": 1332,
    "yearsAfterConsignmentStart": 100.0,
    "actuallySellingDesks": {
      "trial-region-desk": {
        "count": 4401,
        "revenueCents": 7041600
      }
    },
    "nextExpectedSHA256": "4d227ba864ede381e81397c3e6d3d143d93e1c0463f45a59cde985c5e28fad7f"
  },
  {
    "strategy": "diversified",
    "originalExpectedSHA256": "86332df390402525a50fe500276328f2b58325533dd06c96fd1a13f97c294ffc",
    "originalExpectedBytes": 6791048,
    "frozenMonth": 1450,
    "consignmentStartedMonth": 250,
    "consignmentSettledMonth": 1450,
    "yearsAfterConsignmentStart": 100.0,
    "actuallySellingDesks": {
      "trial-region-desk": {
        "count": 2159,
        "revenueCents": 4051724
      },
      "national-specialist-desk": {
        "count": 2061,
        "revenueCents": 4061682
      }
    },
    "nextExpectedSHA256": "f07435aa65464a958dfbae7555de228f246408c571413277ae6364e43c339637"
  }
]
```

複数窓口戦略は、実売が地域窓口2,159本・全国専門窓口2,061本で発生した原本。各戦略の開始→終了差は1200か月（100年）。

## 生の完了結果

途中生成物は含めず、完了が確認された戦略の最終結果だけを列挙する。

### baseline: local

```json
[
  {
    "name": "local",
    "careerOrigin": "frozen original a210 1200-month trajectory, not newly generated",
    "nextOracle": "frozen independent original next-month session",
    "expectedSHA256": "f35e0fb48fab929ebb689d94a07fe98f65c5b758fb4e779c92ba5c3edcf6c668",
    "sourceGameSHA256": "2029d5da02168492481ea45a09236fe15082d7cfbaa322281d9e3f3d87bca1c2",
    "firstWriteMs": 199453.516357,
    "wireUnits": 4613593,
    "wireUtf8": 4811505,
    "unmodifiedOriginal": true
  },
  {
    "mode": "child1",
    "name": "local",
    "month": 1332,
    "coldMs": 200321.95108199999,
    "wireUnits": 4613593,
    "wireSHA256": "87f84465dbeaf08f5bb3ad3fc1bb26881fff304026446568e09de0c180cf4456",
    "expectedFullEquality": true,
    "rss": 1221364
  },
  {
    "mode": "child2",
    "name": "local",
    "month": 1333,
    "coldMs": 189956.09611500002,
    "wireUnits": 4615699,
    "wireSHA256": "938bbbfb7b635d6a6bc35cbbdcdc7fe8cc3215261edaf60be013ed0bdfd858b1",
    "expectedFullEquality": true,
    "rss": 1192956
  }
]
```

### baseline: regional

```json
[
  {
    "mode": "baseline-read-only",
    "name": "regional",
    "month": 1332,
    "coldMs": 88784.981675,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 31.322386999999992
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 23.879705000000058
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 861.96129
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 450.550424
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 15.767515000000003
      },
      "operationReplay": {
        "calls": 2,
        "ms": 86429.587908
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 47.10661599999321
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 179.93617300000096
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 86660.524604
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 87235.249834
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.7169949999952223
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 3.254574999999022
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 6.527616999999736
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 19.374236999996356
      }
    },
    "firstSaveAfterRestoreMs": 2408.060568999994,
    "firstSavePhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 0.036837000006926246
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 94.01468099998601
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 179.71606899998733
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 12.880823000014061
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 528.2576979999867
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 279.7936719999998
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 13.386847999994643
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 150.84031699999468
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 748.4113429999998
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.03620799999043811
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.5899060000083409
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 3.1149699999950826
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 12.680776999986847
      }
    },
    "nestedPhaseTimings": true,
    "wireUnits": 2475089,
    "wireSHA256": "b38a683adb00948baa91121922833d2169304a13613931a2d77ff71046cdb7f4",
    "expectedFullEquality": true,
    "rss": 808600,
    "historicalCareerReused": true,
    "newNextMonthProtocol": false,
    "waitedForRegressionSuites": true
  }
]
```

### baseline: bulk

```json
[
  {
    "mode": "baseline-read-only",
    "name": "bulk",
    "month": 1332,
    "coldMs": 95743.227763,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 16.366428000000013
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 22.983064000000013
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 662.933638
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 367.85512400000016
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 17.435709000000088
      },
      "operationReplay": {
        "calls": 2,
        "ms": 93672.769612
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 47.05103999999278
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 185.38008500000205
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 93908.41334
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 94456.564726
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 1.4548429999995278
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 9.376506000000518
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 6.185318000003463
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 22.503819000005024
      }
    },
    "firstSaveAfterRestoreMs": 2747.438221999997,
    "firstSavePhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 0.03208699999959208
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 117.06050500000129
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 145.9132099999988
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 21.483657999997376
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 557.1110380000027
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 376.52505199999723
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 16.736097999993945
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 183.70019799999136
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 877.1412220000057
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.03784200000518467
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.5175690000032773
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 3.581936999995378
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 14.886551000003237
      }
    },
    "nestedPhaseTimings": true,
    "wireUnits": 2774104,
    "wireSHA256": "2e32bb086764754baca3073e08784d385eb9a31c32725cfff487658773355592",
    "expectedFullEquality": true,
    "rss": 849740,
    "historicalCareerReused": true,
    "newNextMonthProtocol": false,
    "waitedForRegressionSuites": true
  }
]
```

### baseline: small

```json
[
  {
    "mode": "baseline-read-only",
    "name": "small",
    "month": 1332,
    "coldMs": 187693.58988999997,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 20.270689000000004
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 33.85853000000003
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 816.898115
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 525.3758890000001
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 24.169977000000017
      },
      "operationReplay": {
        "calls": 2,
        "ms": 184950.61690700002
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 67.0498439999933
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 323.2279810000182
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 185345.913876
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 186039.25658199997
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.23742699998547323
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 2.909079000004567
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 5.358479999995325
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 27.08933000001707
      }
    },
    "firstSaveAfterRestoreMs": 3904.99841,
    "firstSavePhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 0.028931999986525625
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 125.09668600000441
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 360.83391000001575
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 30.209176000003936
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 754.161946999986
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 700.9717680000176
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 32.351653999998234
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 248.42901599998004
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 1012.1948709999851
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.03789599999436177
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.6951709999993909
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 2.9738080000097398
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 15.689918999996735
      }
    },
    "nestedPhaseTimings": true,
    "wireUnits": 3698705,
    "wireSHA256": "9cbfe8554c8106c4ed745e02d91317226c3b313bacd4c341ea92d38a4c3d1b95",
    "expectedFullEquality": true,
    "rss": 1057720,
    "historicalCareerReused": true,
    "newNextMonthProtocol": false,
    "waitedForRegressionSuites": true
  }
]
```

### baseline: diversified

```json
[
  {
    "mode": "baseline-read-only",
    "name": "diversified",
    "month": 1450,
    "coldMs": 92678.532517,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 16.68283500000001
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 19.44136800000001
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 509.32369
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 263.759237
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 20.788763000000017
      },
      "operationReplay": {
        "calls": 2,
        "ms": 91087.827256
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 39.74463600000013
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 201.7470120000064
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 91333.44145099999
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 91731.466578
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 1.149397000001045
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 12.291847000000416
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 8.821257000003243
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 25.414927999998326
      }
    },
    "firstSaveAfterRestoreMs": 2247.028470999998,
    "firstSavePhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 0.029811000000336207
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 86.79150399999344
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 184.4306840000063
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 34.00492700000177
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 415.15085000000545
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 277.1944460000086
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 14.603696999998647
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 149.65402499999618
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 620.6924330000038
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.046124000000418164
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.5624810000008438
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 2.748135000001639
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 17.15902300000016
      }
    },
    "nestedPhaseTimings": true,
    "wireUnits": 2409241,
    "wireSHA256": "c78ce5bf0787634fbd9e30f7c01798a0ef49226c384fdd5f4f7374b7dcfa1443",
    "expectedFullEquality": true,
    "rss": 743216,
    "historicalCareerReused": true,
    "newNextMonthProtocol": false,
    "waitedForRegressionSuites": true
  }
]
```

### optimized: local

```json
[
  {
    "name": "local",
    "careerOrigin": "frozen original a210 1200-month trajectory, not newly generated",
    "nextOracle": "frozen independent original next-month session",
    "expectedSHA256": "f35e0fb48fab929ebb689d94a07fe98f65c5b758fb4e779c92ba5c3edcf6c668",
    "sourceGameSHA256": "2029d5da02168492481ea45a09236fe15082d7cfbaa322281d9e3f3d87bca1c2",
    "firstWriteMs": 138232.60778100003,
    "wireUnits": 4613593,
    "wireUtf8": 4811505,
    "unmodifiedOriginal": true,
    "firstWritePhases": {
      "operationReplay": {
        "calls": 3,
        "ms": 132819.556661
      },
      "checkpointCapture": {
        "calls": 3,
        "ms": 225.18173899999954
      },
      "finalStateEquality": {
        "calls": 3,
        "ms": 558.0664130000016
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 42.92728299999726
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 994.4060340000142
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 831.5616860000009
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 29.134823000000324
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 404.9098089999752
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 1265.3013179999834
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.21539900000789203
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 1.0874250000051688
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 3.6387379999796394
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 34.076130000001285
      }
    },
    "nestedPhaseTimings": true
  },
  {
    "mode": "child1",
    "name": "local",
    "month": 1332,
    "coldMs": 129356.862952,
    "wireUnits": 4613593,
    "wireSHA256": "87f84465dbeaf08f5bb3ad3fc1bb26881fff304026446568e09de0c180cf4456",
    "expectedFullEquality": true,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 13.98077699999999
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 24.37199899999996
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 1293.313306
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 950.2520579999998
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 91.45110199999999
      },
      "operationReplay": {
        "calls": 2,
        "ms": 125080.465731
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 129.00473400000283
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 426.71067799999173
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 125643.707572
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 126692.770695
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.48359000000345986
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 3.7531310000049416
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 6.386687999998685
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 31.245148999994854
      }
    },
    "afterReadPhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 125.34235299998545
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 203.96959700001753
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 337.0432910000236
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 22.530364999984158
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 986.958095000009
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 826.67296299999
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 83.24258499999996
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 359.8387910000165
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 1787.964456000016
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.4636799999861978
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.9833700000017416
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 3.5841399999917485
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 27.351261000003433
      },
      "firstSaveAfterRestore": {
        "calls": 1,
        "ms": 5448.812855000011
      }
    },
    "nestedPhaseTimings": true,
    "rss": 1246908
  },
  {
    "mode": "child2",
    "name": "local",
    "month": 1333,
    "coldMs": 142478.053011,
    "wireUnits": 4615699,
    "wireSHA256": "938bbbfb7b635d6a6bc35cbbdcdc7fe8cc3215261edaf60be013ed0bdfd858b1",
    "expectedFullEquality": true,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 13.581955999999991
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 26.720690999999988
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 874.2994410000001
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 651.0694309999999
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 79.31757800000014
      },
      "operationReplay": {
        "calls": 2,
        "ms": 139320.280443
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 93.06401199998663
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 205.1624500000189
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 139621.318656
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 140568.86823
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.20004699999117292
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 2.2182970000139903
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 5.667092000017874
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 27.55512400000589
      }
    },
    "afterReadPhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 0.029891999991377816
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 180.61421700002393
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 355.8927749999857
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 26.23855700000422
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 903.6597550000006
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 1007.8275169999979
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 38.14775999999256
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 359.2389419999963
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 1392.4318740000017
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.040367000008700415
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.6292620000021998
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 3.3211949999968056
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 40.33544299998903
      },
      "canonicalResave": {
        "calls": 1,
        "ms": 5171.33051
      }
    },
    "nestedPhaseTimings": true,
    "rss": 1191312
  }
]
```

### optimized: regional

```json
[
  {
    "name": "regional",
    "careerOrigin": "frozen original a210 1200-month trajectory, not newly generated",
    "nextOracle": "frozen independent original next-month session",
    "expectedSHA256": "4a3dc36bdc77c749376c2f52710a0caa438b58b7f5eb77a3a57e61355c539f8f",
    "sourceGameSHA256": "89c2dcc79ee6eb7d493cefc740b370900020b08d052ce134ddbcfd50e6b5c4ab",
    "firstWriteMs": 80143.376492,
    "wireUnits": 2475089,
    "wireUtf8": 2624337,
    "unmodifiedOriginal": true,
    "firstWritePhases": {
      "operationReplay": {
        "calls": 3,
        "ms": 77151.68804399998
      },
      "checkpointCapture": {
        "calls": 3,
        "ms": 119.96128299999964
      },
      "finalStateEquality": {
        "calls": 3,
        "ms": 237.15672600000448
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 13.732038999994984
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 496.2929589999985
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 288.13550699999905
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 22.6137630000012
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 208.82151700000395
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 798.9934210000065
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.13082700000086334
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 2.3859640000009676
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 3.5073649999976624
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 17.829507000002195
      }
    },
    "nestedPhaseTimings": true
  },
  {
    "mode": "child1",
    "name": "regional",
    "month": 1332,
    "coldMs": 75491.623754,
    "wireUnits": 2475089,
    "wireSHA256": "b38a683adb00948baa91121922833d2169304a13613931a2d77ff71046cdb7f4",
    "expectedFullEquality": true,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 30.013209999999958
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 74.31311000000005
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 886.21998
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 641.173685
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 17.484799000000294
      },
      "operationReplay": {
        "calls": 2,
        "ms": 72599.066998
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 48.02618300000813
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 212.2212709999976
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 72864.048629
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 73632.251265
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.40508799999952316
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 3.477339999997639
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 7.107191000002786
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 18.697280000007595
      }
    },
    "afterReadPhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 74.73117400000046
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 80.22101700000349
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 119.26268999998865
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 11.460041000013007
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 597.2321289999963
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 263.41509999999835
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 13.665781999996398
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 146.3919750000059
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 614.1890580000036
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.0682200000010198
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.8734700000059092
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 3.158213999995496
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 26.506617000006372
      },
      "firstSaveAfterRestore": {
        "calls": 1,
        "ms": 2371.9985450000095
      }
    },
    "nestedPhaseTimings": true,
    "rss": 885124
  },
  {
    "mode": "child2",
    "name": "regional",
    "month": 1333,
    "coldMs": 74219.564622,
    "wireUnits": 2475135,
    "wireSHA256": "9c8593825553bc08413ba203dc1c354027ae10c3c6375bb4d32e0d7f7d94eb36",
    "expectedFullEquality": true,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 12.981988000000001
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 40.42643499999997
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 508.347918
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 328.4629530000001
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 14.289023000000043
      },
      "operationReplay": {
        "calls": 2,
        "ms": 72268.735469
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 40.382637999996405
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 231.38010100000497
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 72545.08914499999
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 73095.34428
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 2.203007999996771
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 3.249253999994835
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 5.750683000005665
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 23.87621100000979
      }
    },
    "afterReadPhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 0.042595999999321066
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 167.5743039999943
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 137.82160999999905
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 11.837522000001627
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 482.4432349999988
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 322.7059389999922
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 14.898952999996254
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 259.2899170000019
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 841.8641000000061
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.03877999998803716
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.5959640000073705
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 2.531130999996094
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 17.708799
      },
      "canonicalResave": {
        "calls": 1,
        "ms": 2546.093427
      }
    },
    "nestedPhaseTimings": true,
    "rss": 883292
  }
]
```

### optimized: bulk

```json
[
  {
    "name": "bulk",
    "careerOrigin": "frozen original a210 1200-month trajectory, not newly generated",
    "nextOracle": "frozen independent original next-month session",
    "expectedSHA256": "0554aad284cb93e38691538723a3f3243418ecd3c489ce499b2bd30d255feabe",
    "sourceGameSHA256": "6ec491ac2dee192f56e5317a06bbbad6d53ff122c01492307aae5eba417a0f41",
    "firstWriteMs": 83246.01780100001,
    "wireUnits": 2774104,
    "wireUtf8": 2927148,
    "unmodifiedOriginal": true,
    "firstWritePhases": {
      "operationReplay": {
        "calls": 3,
        "ms": 79937.18708100001
      },
      "checkpointCapture": {
        "calls": 3,
        "ms": 105.96216199999424
      },
      "finalStateEquality": {
        "calls": 3,
        "ms": 308.32832699999597
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 29.05204200001026
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 546.462004999994
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 333.43968300000415
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 15.80020599999989
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 198.31984399999783
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 873.3440110000083
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.11338500000420026
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.9235369999951217
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 3.427964999995311
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 17.091311999989557
      }
    },
    "nestedPhaseTimings": true
  },
  {
    "mode": "child1",
    "name": "bulk",
    "month": 1332,
    "coldMs": 81053.06287800001,
    "wireUnits": 2774104,
    "wireSHA256": "2e32bb086764754baca3073e08784d385eb9a31c32725cfff487658773355592",
    "expectedFullEquality": true,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 32.862459
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 87.64854300000002
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 838.4114030000001
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 675.4818309999998
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 18.327932000000146
      },
      "operationReplay": {
        "calls": 2,
        "ms": 78147.25071
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 48.23599699999568
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 236.36187800000653
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 78435.517217
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 79197.37745199999
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.3446479999984149
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 2.3667180000047665
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 4.949316999991424
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 20.977100999996765
      }
    },
    "afterReadPhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 64.17799599999853
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 95.493707000016
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 135.66668100000243
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 20.31176600001345
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 632.0426920000027
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 337.5254189999978
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 16.31626999999571
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 158.06492000000435
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 645.9787750000105
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.04063200000382494
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.9986990000033984
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 2.9672739999950863
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 18.632777999999234
      },
      "firstSaveAfterRestore": {
        "calls": 1,
        "ms": 2601.7031940000015
      }
    },
    "nestedPhaseTimings": true,
    "rss": 945112
  },
  {
    "mode": "child2",
    "name": "bulk",
    "month": 1333,
    "coldMs": 79873.184414,
    "wireUnits": 2775266,
    "wireSHA256": "f105650fcac4982f1904d8a26d33a78365be97f014436a9814e092b404d291bb",
    "expectedFullEquality": true,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 8.756792000000019
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 42.62425900000005
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 457.24809600000003
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 352.3656490000001
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 21.242727999999943
      },
      "operationReplay": {
        "calls": 2,
        "ms": 77983.59380199999
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 46.14328999999839
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 202.68054799999823
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 78236.691569
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 78756.538221
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 2.3411120000091614
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 3.6466570000047795
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 5.797556000004988
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 16.585902999999234
      }
    },
    "afterReadPhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 0.030950999993365258
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 87.4733899999992
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 203.55767599999672
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 22.73562700000184
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 525.254912999997
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 439.69911599998886
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 15.543578999990132
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 189.84556200000225
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 664.1166190000076
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.04018999999971129
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.6491220000025351
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 4.373401999997441
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 18.04849000000104
      },
      "canonicalResave": {
        "calls": 1,
        "ms": 2593.11751299999
      }
    },
    "nestedPhaseTimings": true,
    "rss": 917592
  }
]
```

### optimized: small

```json
[
  {
    "name": "small",
    "careerOrigin": "frozen original a210 1200-month trajectory, not newly generated",
    "nextOracle": "frozen independent original next-month session",
    "expectedSHA256": "b886e4a0e0820e5b36f5e36aa09f20620573f2160cf665d8b4746e6877d04c49",
    "sourceGameSHA256": "abce5d44e7a29bd5ce6a58b08b891175eb4011aed35d50cc0f13d6861210ab25",
    "firstWriteMs": 164959.25210699998,
    "wireUnits": 3698705,
    "wireUtf8": 3867991,
    "unmodifiedOriginal": true,
    "firstWritePhases": {
      "operationReplay": {
        "calls": 3,
        "ms": 160682.80898099998
      },
      "checkpointCapture": {
        "calls": 3,
        "ms": 124.18865700001663
      },
      "finalStateEquality": {
        "calls": 3,
        "ms": 417.39203700000746
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 17.055208999983734
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 780.7159040000115
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 521.7073060000257
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 27.453456000017468
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 254.53307199999108
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 1104.7649920000113
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.12591599998995662
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.9416609999898355
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 2.9660150000127032
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 14.950388999975985
      }
    },
    "nestedPhaseTimings": true
  },
  {
    "mode": "child1",
    "name": "small",
    "month": 1332,
    "coldMs": 164940.166953,
    "wireUnits": 3698705,
    "wireSHA256": "9cbfe8554c8106c4ed745e02d91317226c3b313bacd4c341ea92d38a4c3d1b95",
    "expectedFullEquality": true,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 42.63996899999995
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 102.04960399999993
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 1158.386994
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 763.6902400000001
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 20.65267199999971
      },
      "operationReplay": {
        "calls": 2,
        "ms": 161112.47187500002
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 63.662480000018604
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 344.9977699999895
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 161527.15070099998
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 162582.63065600002
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.887871000013547
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 4.663349000009475
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 5.681995999999344
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 19.192050000012387
      }
    },
    "afterReadPhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 97.19764299999224
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 129.47147899999982
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 320.2080380000116
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 24.162301999982446
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 819.7093689999892
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 529.9254409999994
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 26.706285999971442
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 333.71019400001387
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 1019.34951
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.1677170000039041
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 1.5644430000102147
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 4.055038999998942
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 20.069783000013558
      },
      "firstSaveAfterRestore": {
        "calls": 1,
        "ms": 3909.1370160000224
      }
    },
    "nestedPhaseTimings": true,
    "rss": 1155340
  },
  {
    "mode": "child2",
    "name": "small",
    "month": 1333,
    "coldMs": 164373.81908800002,
    "wireUnits": 3698754,
    "wireSHA256": "7c2b359bcc549a3c175009a435b4248b98eaff7d37238ee2f70d33c51fcd7b03",
    "expectedFullEquality": true,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 19.94090799999998
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 54.20379700000001
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 755.4360829999999
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 476.336916
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 20.01868400000012
      },
      "operationReplay": {
        "calls": 2,
        "ms": 161741.45861499998
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 63.80731699999569
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 245.68337599998176
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 162055.88397300002
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 162813.414014
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.44970099997590296
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 3.7729070000059437
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 5.154811999993399
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 23.298821999982465
      }
    },
    "afterReadPhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 0.03667899998254143
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 130.10478399999556
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 321.88192599997274
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 18.64353899998241
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 847.2589870000083
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 548.0521049999807
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 29.112252999999328
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 268.5124739999883
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 1143.49926099999
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.10913200001232326
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.6176259999920148
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 3.805227000004379
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 22.094066999998176
      },
      "canonicalResave": {
        "calls": 1,
        "ms": 3958.4884369999927
      }
    },
    "nestedPhaseTimings": true,
    "rss": 1173776
  }
]
```

### optimized: diversified

```json
[
  {
    "name": "diversified",
    "careerOrigin": "frozen original a210 1200-month trajectory, not newly generated",
    "nextOracle": "frozen independent original next-month session",
    "expectedSHA256": "86332df390402525a50fe500276328f2b58325533dd06c96fd1a13f97c294ffc",
    "sourceGameSHA256": "681efd85a8c33e814ad9ef35929f7d54e07a55816565ee6530e610195bfed525",
    "firstWriteMs": 85048.977877,
    "wireUnits": 2409241,
    "wireUtf8": 2570677,
    "unmodifiedOriginal": true,
    "firstWritePhases": {
      "operationReplay": {
        "calls": 3,
        "ms": 82459.433197
      },
      "checkpointCapture": {
        "calls": 3,
        "ms": 85.52893399999687
      },
      "finalStateEquality": {
        "calls": 3,
        "ms": 253.1267899999949
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 19.75285900000017
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 503.05311699998856
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 292.38847600000736
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 41.41047699999763
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 163.31684500000847
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 589.1542340000015
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.12011000000347849
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.8916239999962272
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 4.577529999995022
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 16.64698300001328
      }
    },
    "nestedPhaseTimings": true
  },
  {
    "mode": "child1",
    "name": "diversified",
    "month": 1450,
    "coldMs": 82614.008214,
    "wireUnits": 2409241,
    "wireSHA256": "c78ce5bf0787634fbd9e30f7c01798a0ef49226c384fdd5f4f7374b7dcfa1443",
    "expectedFullEquality": true,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 31.70471200000003
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 80.23436300000003
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 870.491339
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 529.0637360000001
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 39.681142000000364
      },
      "operationReplay": {
        "calls": 2,
        "ms": 79988.210915
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 38.216905999997834
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 145.39512300000388
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 80176.304863
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 80859.17195999999
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.44186700000136625
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 3.321195999989868
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 5.833852999989176
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 27.194667999996454
      }
    },
    "afterReadPhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 53.04134399999748
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 93.20852100000775
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 121.41706300000078
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 13.325780999992276
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 505.829813999997
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 293.48232499998994
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 14.416043999997783
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 149.4315370000113
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 763.1104210000049
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.042218999995384365
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 1.3167499999981374
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 3.3033270000014454
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 15.741923000008683
      },
      "firstSaveAfterRestore": {
        "calls": 1,
        "ms": 2398.4258139999874
      }
    },
    "nestedPhaseTimings": true,
    "rss": 791528
  },
  {
    "mode": "child2",
    "name": "diversified",
    "month": 1451,
    "coldMs": 76688.602125,
    "wireUnits": 2409261,
    "wireSHA256": "beb83bba1a202d46e38f64324575fd60aac6c4ee4b8414ab094417b3b393e07e",
    "expectedFullEquality": true,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 6.504691000000008
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 28.46454600000004
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 517.742382
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 303.999597
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 13.736206999999922
      },
      "operationReplay": {
        "calls": 2,
        "ms": 75087.565585
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 38.95728000001236
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 126.65559000000076
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 75257.67686600001
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 75658.347015
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.38429899999755435
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 2.167417000004207
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 4.97322100000747
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 22.9449530000129
      }
    },
    "afterReadPhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 0.028500999993411824
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 71.46786599999177
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 174.68602999999712
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 11.22844299999997
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 441.5437399999937
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 257.3037369999947
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 23.72129699999641
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 148.94355799999903
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 555.4935210000112
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.04425599999376573
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.6787100000074133
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 2.742294999989099
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 15.530772999991314
      },
      "canonicalResave": {
        "calls": 1,
        "ms": 2122.211433000004
      }
    },
    "nestedPhaseTimings": true,
    "rss": 878932
  }
]
```

### protocol-v05/local.clean.results.json

```json
[
  {
    "mode": "baseline-read-only",
    "name": "local",
    "month": 1332,
    "coldMs": 180450.258282,
    "readPhases": {
      "fileRead": {
        "calls": 1,
        "ms": 61.92654200000004
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 86.81421599999999
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 1417.092608
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 730.8745050000002
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 41.39590499999986
      },
      "operationReplay": {
        "calls": 2,
        "ms": 175891.00992
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 94.94285699999637
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 412.5174869999855
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 176401.199074
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 177844.57400700002
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.48939299999619834
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 3.672576000011759
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 5.070512999984203
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 24.268562999990536
      }
    },
    "firstSaveAfterRestoreMs": 5169.401255000004,
    "firstSavePhases": {
      "operationReplay": {
        "calls": 2,
        "ms": 0.036290999996708706
      },
      "checkpointCapture": {
        "calls": 2,
        "ms": 193.81607800000347
      },
      "finalStateEquality": {
        "calls": 2,
        "ms": 355.22754399999394
      },
      "sessionJSONParse": {
        "calls": 1,
        "ms": 26.394952000002377
      },
      "sessionLosslessDecode": {
        "calls": 1,
        "ms": 1055.1693889999879
      },
      "gameExpansion": {
        "calls": 1,
        "ms": 830.4812600000005
      },
      "nativeJSONParse": {
        "calls": 1,
        "ms": 37.83308500002022
      },
      "officialNativeValidation": {
        "calls": 1,
        "ms": 396.71615100000054
      },
      "officialNativeReader": {
        "calls": 1,
        "ms": 1448.6146350000054
      },
      "sidecar.slots": {
        "calls": 1,
        "ms": 0.039072000014130026
      },
      "sidecar.ledger": {
        "calls": 1,
        "ms": 0.5988070000021253
      },
      "sidecar.history": {
        "calls": 1,
        "ms": 2.960194999992382
      },
      "sidecar.recall": {
        "calls": 1,
        "ms": 35.66535300001851
      }
    },
    "nestedPhaseTimings": true,
    "wireUnits": 4613593,
    "wireSHA256": "87f84465dbeaf08f5bb3ad3fc1bb26881fff304026446568e09de0c180cf4456",
    "expectedFullEquality": true,
    "rss": 1276988,
    "historicalCareerReused": true,
    "newNextMonthProtocol": false,
    "waitedForRegressionSuites": true
  }
]
```

### clean-local-exit.json

```json
{
  "exitCode": 0,
  "observedLauncherOutput": "FINAL_CLEAN_LOCAL_EXIT 0",
  "source": "tools.write_stdin session24878 completed exit_code0"
}
```

### protocol-v05/whole-results.json

```json
[
  {
    "strategy": "local",
    "exitCode": 0,
    "elapsedSeconds": 603.8525707889999
  },
  {
    "strategy": "regional",
    "exitCode": 0,
    "elapsedSeconds": 91.79852619700023
  },
  {
    "strategy": "bulk",
    "exitCode": 0,
    "elapsedSeconds": 98.90220103499996
  },
  {
    "strategy": "small",
    "exitCode": 0,
    "elapsedSeconds": 192.12309605100018
  },
  {
    "strategy": "diversified",
    "exitCode": 0,
    "elapsedSeconds": 95.38890496700014
  }
]
```

### protocol-perf-v05/whole-results.json

```json
[
  {
    "strategy": "local",
    "exitCode": 0,
    "elapsedSeconds": 423.4763741339998
  },
  {
    "strategy": "regional",
    "exitCode": 0,
    "elapsedSeconds": 236.9919878999999
  },
  {
    "strategy": "bulk",
    "exitCode": 0,
    "elapsedSeconds": 251.87983209599997
  },
  {
    "strategy": "small",
    "exitCode": 0,
    "elapsedSeconds": 504.8709297989999
  },
  {
    "strategy": "diversified",
    "exitCode": 0,
    "elapsedSeconds": 251.18957033899915
  }
]
```

### two-generation-v05/process-results.json

```json
[
  {
    "variant": "baseline",
    "exitCode": 0
  },
  {
    "variant": "previous-first",
    "exitCode": 0
  }
]
```

### two-generation-v05/launcher-exit.json

```json
{
  "exitCode": 0,
  "finalOutput": "FINAL_TWO_GENERATION printed",
  "bothProcessExitCodes": [
    0,
    0
  ],
  "bothBootReady": true,
  "exactOrderObserved": true
}
```

### two-generation-v05/baseline.json

```json
{
  "repo": "/workspace/scratch/a46e452c28fd/protocol-recovered",
  "name": "regional",
  "storageKind": "Mock readonly IDB request scheduling, not native browser IndexedDB",
  "officialBootMainIdb": true,
  "officialReadMainRecord": true,
  "legacySourceKeyCount": 3,
  "bootReady": true,
  "headSHA256": "9c8593825553bc08413ba203dc1c354027ae10c3c6375bb4d32e0d7f7d94eb36",
  "previousSHA256": "b38a683adb00948baa91121922833d2169304a13613931a2d77ff71046cdb7f4",
  "callOrder": [
    "head",
    "previous"
  ],
  "calls": [
    {
      "kind": "head",
      "ms": 96596.265919,
      "fullSessionEqual": true
    },
    {
      "kind": "previous",
      "ms": 94870.17553299999,
      "fullSessionEqual": true
    }
  ],
  "elapsedMs": 191674.70835099998,
  "wholeHeadAndPreviousEqual": true,
  "storedBytesUnchanged": true,
  "rss": 805496
}
```

### two-generation-v05/previous-first.json

```json
{
  "repo": "/workspace/scratch/a46e452c28fd/idb-order-benchmark",
  "name": "regional",
  "storageKind": "Mock readonly IDB request scheduling, not native browser IndexedDB",
  "officialBootMainIdb": true,
  "officialReadMainRecord": true,
  "legacySourceKeyCount": 3,
  "bootReady": true,
  "headSHA256": "9c8593825553bc08413ba203dc1c354027ae10c3c6375bb4d32e0d7f7d94eb36",
  "previousSHA256": "b38a683adb00948baa91121922833d2169304a13613931a2d77ff71046cdb7f4",
  "callOrder": [
    "previous",
    "head"
  ],
  "calls": [
    {
      "kind": "previous",
      "ms": 91105.677023,
      "fullSessionEqual": true
    },
    {
      "kind": "head",
      "ms": 1683.173438999991,
      "fullSessionEqual": true
    }
  ],
  "elapsedMs": 92911.23687899999,
  "wholeHeadAndPreviousEqual": true,
  "storedBytesUnchanged": true,
  "rss": 839968
}
```

## 実行プログラムの保全

以下は実行に用いたscratch runnerの原文。絶対rootはこの実行環境の配置であり、別環境ではrootだけを適応する。期待値・reader・比較・正常終了条件を緩めない。最初の地元実行は `protocol-v05-original-full.mjs` の完全ルート、後続の基準4戦略とclean地元は `protocol-v05.mjs` のread-onlyルート、改善5戦略は `protocol-perf-v05.mjs` の完全ルートを使用した。

### protocol-v05-original-full.mjs

SHA256: `1bf70a58ee90a5cf6cc1669d82b214581d3ac2460407891112dcdffa088620b7`

```javascript
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
const dir='/workspace/scratch/a46e452c28fd/unpacked/AmberTime-v03-five-strategy-proof/ambertime-v03-capacity',sha=s=>createHash('sha256').update(s).digest('hex'),j=v=>JSON.stringify(v);
async function modules(repo){const u=n=>pathToFileURL(path.join(repo,'works/ambertime',n)).href;return {D:await import(u('partner-orders.mjs')),S:await import(u('development-save.mjs')),P:(await import(u('economy-parameters.mjs'))).PARALLEL_PARAMETERS,C:await import(u('cask-slots.mjs')),L:await import(u('recent-ledger.mjs')),H:await import(u('history-record.mjs')),R:await import(u('recall/collector.mjs')),O:await import(u('recall/operations.mjs'))};}
function options(m){return {enabled:true,serialize:m.D.serializeDistillery,restore:m.D.restoreDistillery,monthMs:m.P.monthMs,stepMs:m.P.distillStepMs,encoding:'lossless-v1'};}
function advance(m,s){let recall=s.recallRecord;const D=m.O.createObservedModel(m.D,({before,after})=>{recall=m.R.advanceRecall(before,after,recall)});let g=s.game,guard=0;
 while(g.decisions.length){assert(++guard<100);const d=g.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');assert(o);g=D.chooseDistillery(g,d.caskId,o.id);}
 if(g.trade.offer)g=D.declineOffer(g);while(g.shop.offer){assert(++guard<100);const o=g.shop.offer;g=(o.shopId==='department'?D.declineShop:D.acceptShop)(g,o.shopId,o.id);}
 for(const o of D.regionalOffers(g))g=D.acceptRegionalOffer(g,o.partnerId,o.id);if(g.generations.active.phase==='review')g=D.handoverGeneration(g,g.generations.active.id);
 g=D.tickDistillery(g);assert.equal(g.core.month,s.game.core.month+1);return {game:g,userPaused:s.userPaused,elapsed:s.elapsed,caskSlots:m.C.reconcileCaskSlots(g,s.caskSlots),recentLedger:m.L.advanceRecentLedger(s.game,g,s.recentLedger),historyRecord:m.H.advanceHistoryRecord(s.game,g,s.historyRecord),recallRecord:recall};}
function equalActual(actual,expected){assert.equal(j(actual.game),j(expected.game),'full original game differs');for(const key of ['userPaused','elapsed','caskSlots','recentLedger','historyRecord','recallRecord'])assert.equal(j(actual[key]),j(expected[key]),key+' differs');}
const [mode,repo,name]=process.argv.slice(2),prefix='/workspace/scratch/a46e452c28fd/protocol-v05/'+name;fs.mkdirSync('/workspace/scratch/a46e452c28fd/protocol-v05',{recursive:true});
if(mode==='child1'||mode==='child2'){
 const m=await modules(repo),input=prefix+(mode==='child1'?'.formal9.json':'.next.formal9.json'),expectedFile=mode==='child1'?dir+'/expected/'+name+'-1200.json':prefix+'.next.expected.json',raw=fs.readFileSync(input,'utf8'),expected=JSON.parse(fs.readFileSync(expectedFile,'utf8')),t=performance.now(),s=m.S.readSession(raw,options(m));equalActual(s,expected);const coldMs=performance.now()-t;
 if(mode==='child1'){const next=advance(m,s);equalActual(next,JSON.parse(fs.readFileSync(prefix+'.next.expected.json','utf8')));const output=m.S.serializeSession(next.game,next,options(m));fs.writeFileSync(prefix+'.next.formal9.json',output,{flag:'wx'});}else{assert.equal(m.S.serializeSession(s.game,s,options(m)),raw);}
 console.log(j({mode,name,month:s.game.core.month,coldMs,wireUnits:raw.length,wireSHA256:sha(raw),expectedFullEquality:true,rss:process.resourceUsage().maxRSS}));
}else{
 assert.equal(mode,'parent');const expectedText=fs.readFileSync(dir+'/expected/'+name+'-1200.json','utf8'),expected=JSON.parse(expectedText);
 fs.copyFileSync(dir+'/protocol/'+name+'.next.expected.json',prefix+'.next.expected.json');
 const candidate=await modules(repo),t=performance.now(),wire=candidate.S.serializeSession(expected.game,expected,options(candidate));fs.writeFileSync(prefix+'.formal9.json',wire,{flag:'wx'});assert.equal(j(expected),expectedText);
 const results=[{name,careerOrigin:'frozen original a210 1200-month trajectory, not newly generated',nextOracle:'frozen independent original next-month session',expectedSHA256:sha(expectedText),sourceGameSHA256:sha(j(expected.game)),firstWriteMs:performance.now()-t,wireUnits:wire.length,wireUtf8:Buffer.byteLength(wire),unmodifiedOriginal:true}];
 for(const child of ['child1','child2']){const out=execFileSync(process.execPath,[new URL(import.meta.url).pathname,child,repo,name],{encoding:'utf8',maxBuffer:1024*1024});results.push(JSON.parse(out));console.log(out.trim());}
 fs.writeFileSync(prefix+'.results.json',j(results),{flag:'wx'});console.log(j(results));
}

```

### protocol-v05.mjs

SHA256: `0b7ae57565ddccee36da372fdd18ddf4251e0ed330dd762465ead752bcc0c3fd`

```javascript
import {register} from 'node:module';register('/workspace/scratch/a46e452c28fd/phase-loader-v05.mjs',import.meta.url);
let measuredPhases={};globalThis.__amberMeasure=(key,f)=>{const start=performance.now();try{return f();}finally{measuredPhases[key]??={calls:0,ms:0};measuredPhases[key].calls++;measuredPhases[key].ms+=performance.now()-start;}};
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
const dir='/workspace/scratch/a46e452c28fd/unpacked/AmberTime-v03-five-strategy-proof/ambertime-v03-capacity',sha=s=>createHash('sha256').update(s).digest('hex'),j=v=>JSON.stringify(v);
async function modules(repo){const u=n=>pathToFileURL(path.join(repo,'works/ambertime',n)).href;return {D:await import(u('partner-orders.mjs')),S:await import(u('development-save.mjs')),P:(await import(u('economy-parameters.mjs'))).PARALLEL_PARAMETERS,C:await import(u('cask-slots.mjs')),L:await import(u('recent-ledger.mjs')),H:await import(u('history-record.mjs')),R:await import(u('recall/collector.mjs')),O:await import(u('recall/operations.mjs'))};}
function options(m){return {enabled:true,serialize:m.D.serializeDistillery,restore:m.D.restoreDistillery,monthMs:m.P.monthMs,stepMs:m.P.distillStepMs,encoding:'lossless-v1'};}
function advance(m,s){let recall=s.recallRecord;const D=m.O.createObservedModel(m.D,({before,after})=>{recall=m.R.advanceRecall(before,after,recall)});let g=s.game,guard=0;
 while(g.decisions.length){assert(++guard<100);const d=g.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');assert(o);g=D.chooseDistillery(g,d.caskId,o.id);}
 if(g.trade.offer)g=D.declineOffer(g);while(g.shop.offer){assert(++guard<100);const o=g.shop.offer;g=(o.shopId==='department'?D.declineShop:D.acceptShop)(g,o.shopId,o.id);}
 for(const o of D.regionalOffers(g))g=D.acceptRegionalOffer(g,o.partnerId,o.id);if(g.generations.active.phase==='review')g=D.handoverGeneration(g,g.generations.active.id);
 g=D.tickDistillery(g);assert.equal(g.core.month,s.game.core.month+1);return {game:g,userPaused:s.userPaused,elapsed:s.elapsed,caskSlots:m.C.reconcileCaskSlots(g,s.caskSlots),recentLedger:m.L.advanceRecentLedger(s.game,g,s.recentLedger),historyRecord:m.H.advanceHistoryRecord(s.game,g,s.historyRecord),recallRecord:recall};}
function equalActual(actual,expected){assert.equal(j(actual.game),j(expected.game),'full original game differs');for(const key of ['userPaused','elapsed','caskSlots','recentLedger','historyRecord','recallRecord'])assert.equal(j(actual[key]),j(expected[key]),key+' differs');}
const [mode,repo,name]=process.argv.slice(2),prefix='/workspace/scratch/a46e452c28fd/protocol-v05/'+name+(process.argv[5]==='read-only'?'.clean':'');fs.mkdirSync('/workspace/scratch/a46e452c28fd/protocol-v05',{recursive:true});
if(mode==='child1'||mode==='child2'){
 const m=await modules(repo),input=prefix+(mode==='child1'?'.formal9.json':'.next.formal9.json'),expectedFile=mode==='child1'?dir+'/expected/'+name+'-1200.json':prefix+'.next.expected.json',raw=globalThis.__amberMeasure('fileRead',()=>fs.readFileSync(input,'utf8')),expected=JSON.parse(fs.readFileSync(expectedFile,'utf8')),t=performance.now(),s=m.S.readSession(raw,options(m));equalActual(s,expected);const coldMs=performance.now()-t,readPhases=structuredClone(measuredPhases);measuredPhases={};
 if(mode==='child1'){const next=advance(m,s);equalActual(next,JSON.parse(fs.readFileSync(prefix+'.next.expected.json','utf8')));const output=globalThis.__amberMeasure('firstSaveAfterRestore',()=>m.S.serializeSession(next.game,next,options(m)));fs.writeFileSync(prefix+'.next.formal9.json',output,{flag:'wx'});}else{assert.equal(globalThis.__amberMeasure('canonicalResave',()=>m.S.serializeSession(s.game,s,options(m))),raw);}
 console.log(j({mode,name,month:s.game.core.month,coldMs,wireUnits:raw.length,wireSHA256:sha(raw),expectedFullEquality:true,readPhases,afterReadPhases:structuredClone(measuredPhases),nestedPhaseTimings:true,rss:process.resourceUsage().maxRSS}));
}else{
 assert.equal(mode,'parent');
 if(name!=='local'||process.argv[5]==='read-only'){
  const suites=['main-baseline.log','candidate-before-browser.log'];
  while(!suites.every(f=>{try{return /duration_ms/.test(fs.readFileSync('/workspace/scratch/a46e452c28fd/'+f,'utf8'));}catch{return false;}}))await new Promise(r=>setTimeout(r,1000));
  const m=await modules(repo),input=dir+'/protocol/'+name+'.formal9.json',raw=globalThis.__amberMeasure('fileRead',()=>fs.readFileSync(input,'utf8')),expected=JSON.parse(fs.readFileSync(dir+'/expected/'+name+'-1200.json','utf8')),t=performance.now(),restored=m.S.readSession(raw,options(m));equalActual(restored,expected);const coldMs=performance.now()-t,readPhases=structuredClone(measuredPhases);measuredPhases={};const saveStart=performance.now(),resave=m.S.serializeSession(restored.game,restored,options(m));assert.equal(resave,raw);const firstSaveAfterRestoreMs=performance.now()-saveStart;
  const result={mode:'baseline-read-only',name,month:restored.game.core.month,coldMs,readPhases,firstSaveAfterRestoreMs,firstSavePhases:structuredClone(measuredPhases),nestedPhaseTimings:true,wireUnits:raw.length,wireSHA256:sha(raw),expectedFullEquality:true,rss:process.resourceUsage().maxRSS,historicalCareerReused:true,newNextMonthProtocol:false,waitedForRegressionSuites:true};
  fs.writeFileSync(prefix+'.results.json',j([result]),{flag:'wx'});console.log(j(result));process.exit(0);
 }
const expectedText=fs.readFileSync(dir+'/expected/'+name+'-1200.json','utf8'),expected=JSON.parse(expectedText);
 fs.copyFileSync(dir+'/protocol/'+name+'.next.expected.json',prefix+'.next.expected.json');
 const candidate=await modules(repo),t=performance.now(),wire=candidate.S.serializeSession(expected.game,expected,options(candidate));fs.writeFileSync(prefix+'.formal9.json',wire,{flag:'wx'});assert.equal(j(expected),expectedText);
 const results=[{name,careerOrigin:'frozen original a210 1200-month trajectory, not newly generated',nextOracle:'frozen independent original next-month session',expectedSHA256:sha(expectedText),sourceGameSHA256:sha(j(expected.game)),firstWriteMs:performance.now()-t,wireUnits:wire.length,wireUtf8:Buffer.byteLength(wire),unmodifiedOriginal:true,firstWritePhases:structuredClone(measuredPhases),nestedPhaseTimings:true}];
 for(const child of ['child1','child2']){const out=execFileSync(process.execPath,[new URL(import.meta.url).pathname,child,repo,name],{encoding:'utf8',maxBuffer:1024*1024});results.push(JSON.parse(out));console.log(out.trim());}
 fs.writeFileSync(prefix+'.results.json',j(results),{flag:'wx'});console.log(j(results));
}

```

### protocol-perf-v05.mjs

SHA256: `1a82851a22240d8a091e0b88f054ab72968147398b8573a93a35afefa94f4f4b`

```javascript
import {register} from 'node:module';register('/workspace/scratch/a46e452c28fd/phase-loader-v05.mjs',import.meta.url);
let measuredPhases={};globalThis.__amberMeasure=(key,f)=>{const start=performance.now();try{return f();}finally{measuredPhases[key]??={calls:0,ms:0};measuredPhases[key].calls++;measuredPhases[key].ms+=performance.now()-start;}};
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
const dir='/workspace/scratch/a46e452c28fd/unpacked/AmberTime-v03-five-strategy-proof/ambertime-v03-capacity',sha=s=>createHash('sha256').update(s).digest('hex'),j=v=>JSON.stringify(v);
async function modules(repo){const u=n=>pathToFileURL(path.join(repo,'works/ambertime',n)).href;return {D:await import(u('partner-orders.mjs')),S:await import(u('development-save.mjs')),P:(await import(u('economy-parameters.mjs'))).PARALLEL_PARAMETERS,C:await import(u('cask-slots.mjs')),L:await import(u('recent-ledger.mjs')),H:await import(u('history-record.mjs')),R:await import(u('recall/collector.mjs')),O:await import(u('recall/operations.mjs'))};}
function options(m){return {enabled:true,serialize:m.D.serializeDistillery,restore:m.D.restoreDistillery,monthMs:m.P.monthMs,stepMs:m.P.distillStepMs,encoding:'lossless-v1'};}
function advance(m,s){let recall=s.recallRecord;const D=m.O.createObservedModel(m.D,({before,after})=>{recall=m.R.advanceRecall(before,after,recall)});let g=s.game,guard=0;
 while(g.decisions.length){assert(++guard<100);const d=g.decisions[0],o=d.pending.options.find(x=>x.id==='wait')??d.pending.options.find(x=>x.id==='last');assert(o);g=D.chooseDistillery(g,d.caskId,o.id);}
 if(g.trade.offer)g=D.declineOffer(g);while(g.shop.offer){assert(++guard<100);const o=g.shop.offer;g=(o.shopId==='department'?D.declineShop:D.acceptShop)(g,o.shopId,o.id);}
 for(const o of D.regionalOffers(g))g=D.acceptRegionalOffer(g,o.partnerId,o.id);if(g.generations.active.phase==='review')g=D.handoverGeneration(g,g.generations.active.id);
 g=D.tickDistillery(g);assert.equal(g.core.month,s.game.core.month+1);return {game:g,userPaused:s.userPaused,elapsed:s.elapsed,caskSlots:m.C.reconcileCaskSlots(g,s.caskSlots),recentLedger:m.L.advanceRecentLedger(s.game,g,s.recentLedger),historyRecord:m.H.advanceHistoryRecord(s.game,g,s.historyRecord),recallRecord:recall};}
function equalActual(actual,expected){assert.equal(j(actual.game),j(expected.game),'full original game differs');for(const key of ['userPaused','elapsed','caskSlots','recentLedger','historyRecord','recallRecord'])assert.equal(j(actual[key]),j(expected[key]),key+' differs');}
const [mode,repo,name]=process.argv.slice(2),prefix='/workspace/scratch/a46e452c28fd/protocol-perf-v05/'+name;fs.mkdirSync('/workspace/scratch/a46e452c28fd/protocol-perf-v05',{recursive:true});
if(mode==='child1'||mode==='child2'){
 const m=await modules(repo),input=prefix+(mode==='child1'?'.formal9.json':'.next.formal9.json'),expectedFile=mode==='child1'?dir+'/expected/'+name+'-1200.json':prefix+'.next.expected.json',raw=globalThis.__amberMeasure('fileRead',()=>fs.readFileSync(input,'utf8')),expected=JSON.parse(fs.readFileSync(expectedFile,'utf8')),t=performance.now(),s=m.S.readSession(raw,options(m));equalActual(s,expected);const coldMs=performance.now()-t,readPhases=structuredClone(measuredPhases);measuredPhases={};
 if(mode==='child1'){const next=advance(m,s);equalActual(next,JSON.parse(fs.readFileSync(prefix+'.next.expected.json','utf8')));const output=globalThis.__amberMeasure('firstSaveAfterRestore',()=>m.S.serializeSession(next.game,next,options(m)));fs.writeFileSync(prefix+'.next.formal9.json',output,{flag:'wx'});}else{assert.equal(globalThis.__amberMeasure('canonicalResave',()=>m.S.serializeSession(s.game,s,options(m))),raw);}
 console.log(j({mode,name,month:s.game.core.month,coldMs,wireUnits:raw.length,wireSHA256:sha(raw),expectedFullEquality:true,readPhases,afterReadPhases:structuredClone(measuredPhases),nestedPhaseTimings:true,rss:process.resourceUsage().maxRSS}));
}else{
 assert.equal(mode,'parent');const expectedText=fs.readFileSync(dir+'/expected/'+name+'-1200.json','utf8'),expected=JSON.parse(expectedText);
 fs.copyFileSync(dir+'/protocol/'+name+'.next.expected.json',prefix+'.next.expected.json');
 const candidate=await modules(repo),t=performance.now(),wire=candidate.S.serializeSession(expected.game,expected,options(candidate));fs.writeFileSync(prefix+'.formal9.json',wire,{flag:'wx'});assert.equal(j(expected),expectedText);
 const results=[{name,careerOrigin:'frozen original a210 1200-month trajectory, not newly generated',nextOracle:'frozen independent original next-month session',expectedSHA256:sha(expectedText),sourceGameSHA256:sha(j(expected.game)),firstWriteMs:performance.now()-t,wireUnits:wire.length,wireUtf8:Buffer.byteLength(wire),unmodifiedOriginal:true,firstWritePhases:structuredClone(measuredPhases),nestedPhaseTimings:true}];
 for(const child of ['child1','child2']){const out=execFileSync(process.execPath,[new URL(import.meta.url).pathname,child,repo,name],{encoding:'utf8',maxBuffer:1024*1024});results.push(JSON.parse(out));console.log(out.trim());}
 fs.writeFileSync(prefix+'.results.json',j(results),{flag:'wx'});console.log(j(results));
}

```

### phase-loader-v05.mjs

SHA256: `3051124a41e85e10e22987c53a1e819ca9f992ef92ca58256bdb19a8df96924d`

```javascript
import {readFile} from 'node:fs/promises';
export async function load(url,context,nextLoad){
 const result=await nextLoad(url,context);if(!url.startsWith('file:')||result.format!=='module')return result;
 let s=String(result.source),changed=false;
 const replace=(from,to)=>{if(!s.includes(from))throw Error('profiling source marker absent '+new URL(url).pathname+': '+from.slice(0,60));s=s.replace(from,to);changed=true;};
 const p=new URL(url).pathname;
 if(p.endsWith('/works/ambertime/development-save.mjs')){
  replace('session=JSON.parse(text);',"session=globalThis.__amberMeasure('sessionJSONParse',()=>JSON.parse(text));");
  replace("session=JSON.parse(decodeExactJSON(JSON.stringify(session.data),'session'));", "session=globalThis.__amberMeasure('sessionLosslessDecode',()=>JSON.parse(decodeExactJSON(JSON.stringify(session.data),'session')));");
  replace('const game=restore(lossless?expandLosslessGame(session.game):expandFormalGame(session.game));',"const expanded=globalThis.__amberMeasure('gameExpansion',()=>lossless?expandLosslessGame(session.game):expandFormalGame(session.game));const game=globalThis.__amberMeasure('officialNativeReader',()=>restore(expanded));");
  for(const [name,from] of [['slots','assertCaskSlots(game,session.caskSlots).slice()'],['ledger','assertRecentLedger(game,session.recentLedger)'],['history','assertHistoryRecord(game,session.historyRecord)'],['recall','assertRecall(game,session.recallRecord,historyRecord)']])replace('='+from+';','='+`globalThis.__amberMeasure('sidecar.${name}',()=>${from});`);
 }
 if(p.endsWith('/works/ambertime/partner-orders.mjs')){
  replace('s=JSON.parse(text);',"s=globalThis.__amberMeasure('nativeJSONParse',()=>JSON.parse(text));");
  replace("validateDistillery(s,{repairMissingBrandDesign:!placementMode(s)});return s;", "globalThis.__amberMeasure('officialNativeValidation',()=>validateDistillery(s,{repairMissingBrandDesign:!placementMode(s)}));return s;");
  const normal='for(let i=prefix?checkpoint.length:0;i<s.operations.length;i++)j=apply(j,s.operations[i],context,i);';
  const optimized='for(let i=prefix?checkpoint.length:0;i<s.operations.length;i++)j=withPrivateReplay(()=>apply(j,s.operations[i],context,i));';
  const loop=s.includes(optimized)?optimized:normal;replace(loop,`globalThis.__amberMeasure('operationReplay',()=>{${loop}});`);
  replace('j=E.endTasting(j);cache=clone(j);',"j=E.endTasting(j);cache=globalThis.__amberMeasure('checkpointCapture',()=>clone(j));");
  replace("assert(JSON.stringify(s)===JSON.stringify(j),'蒸留所の状態と操作の帳面が一致しません。');", "globalThis.__amberMeasure('finalStateEquality',()=>assert(JSON.stringify(s)===JSON.stringify(j),'蒸留所の状態と操作の帳面が一致しません。'));");
 }
 return changed?{...result,source:s}:result;
}

```

### phase-profile-v05.mjs

SHA256: `cf249c737d578715332dff8b95e0c82ba85cce9850952dff4e156db7c4e5fb0e`

```javascript
import fs from 'node:fs';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
const [repo,name]=process.argv.slice(2),base='/workspace/scratch/a46e452c28fd/unpacked/AmberTime-v03-five-strategy-proof/ambertime-v03-capacity';let phases={};globalThis.__amberMeasure=(key,f)=>{const start=performance.now();try{return f();}finally{phases[key]??={calls:0,ms:0};phases[key].calls++;phases[key].ms+=performance.now()-start;}};
const D=await import(pathToFileURL(repo+'/works/ambertime/partner-orders.mjs')),S=await import(pathToFileURL(repo+'/works/ambertime/development-save.mjs')),P=(await import(pathToFileURL(repo+'/works/ambertime/economy-parameters.mjs'))).PARALLEL_PARAMETERS;
const raw=globalThis.__amberMeasure('fileRead',()=>fs.readFileSync(base+'/protocol/'+name+'.formal9.json','utf8')),o={enabled:true,serialize:D.serializeDistillery,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs,encoding:'lossless-v1'};
const s=globalThis.__amberMeasure('wholeOfficialRead',()=>S.readSession(raw,o));const expected=JSON.parse(fs.readFileSync(base+'/expected/'+name+'-1200.json','utf8'));globalThis.__amberMeasure('independentFullSessionEquality',()=>assert.equal(JSON.stringify(s),JSON.stringify(expected)));const readPhases=structuredClone(phases);phases={};const resave=globalThis.__amberMeasure('firstSaveAfterRestore',()=>S.serializeSession(s.game,s,o));assert.equal(resave,raw);
console.log(JSON.stringify({repo,name,phasesAreNested:true,read:readPhases,firstSave:phases,fullEquality:true,canonicalResaveEquality:true,rss:process.resourceUsage().maxRSS}));

```

### run-five-v05.py

SHA256: `b6ad29a29ec6bdfccd3823c6b97829d3e24c4d1eff8c7516b9d9d77984df63cf`

```python
import subprocess,json,time,pathlib
root=pathlib.Path('/workspace/scratch/a46e452c28fd')
results=[]
for name in ['local','regional','bulk','small','diversified']:
 print('START',name,flush=True)
 t=time.monotonic()
 with (root/f'protocol-v05/{name}.log').open('w') as out:
  p=subprocess.run(['node',str(root/'protocol-v05.mjs'),'parent',str(root/'protocol-recovered'),name],stdout=out,stderr=subprocess.STDOUT)
 result={'strategy':name,'exitCode':p.returncode,'elapsedSeconds':time.monotonic()-t}
 results.append(result)
 (root/'protocol-v05/whole-results.json').write_text(json.dumps(results,indent=2))
 print('END',json.dumps(result),flush=True)
 if p.returncode:break
print('FINAL',json.dumps({'allFiveNormalExit':len(results)==5 and all(x['exitCode']==0 for x in results),'results':results}),flush=True)
raise SystemExit(0 if len(results)==5 and all(x['exitCode']==0 for x in results) else 1)

```

### run-perf-five-v05.py

SHA256: `2a4ada262ad3f7c375ecfbbd8e918a251c4b1d8cd853d80fe2efd6cdf9a983d9`

```python
import subprocess,json,time,pathlib
root=pathlib.Path('/workspace/scratch/a46e452c28fd')
results=[]
while True:
 baseline=root/'protocol-v05/whole-results.json'
 if baseline.exists():
  status=json.loads(baseline.read_text())
  if any(x['exitCode']!=0 for x in status):raise SystemExit('baseline failed, optimized protocol not started')
  if len(status)==5:break
 time.sleep(10)
print('Baseline finished; starting optimized five protocol',flush=True)
for name in ['local','regional','bulk','small','diversified']:
 print('START',name,flush=True)
 t=time.monotonic()
 with (root/f'protocol-perf-v05/{name}.log').open('w') as out:
  p=subprocess.run(['node',str(root/'protocol-perf-v05.mjs'),'parent',str(root/'perf-v05'),name],stdout=out,stderr=subprocess.STDOUT)
 result={'strategy':name,'exitCode':p.returncode,'elapsedSeconds':time.monotonic()-t}
 results.append(result)
 (root/'protocol-perf-v05/whole-results.json').write_text(json.dumps(results,indent=2))
 print('END',json.dumps(result),flush=True)
 if p.returncode:break
print('FINAL',json.dumps({'allFiveNormalExit':len(results)==5 and all(x['exitCode']==0 for x in results),'results':results}),flush=True)
raise SystemExit(0 if len(results)==5 and all(x['exitCode']==0 for x in results) else 1)

```

### run-clean-local-v05.py

SHA256: `50a05411a559cb9b84b80034a66b8f04f5be87dd9bf92b16df7ded6f97cc7fde`

```python
import pathlib,json,time,subprocess
r=pathlib.Path('/workspace/scratch/a46e452c28fd')
while True:
 p=r/'protocol-perf-v05/whole-results.json'
 if p.exists():
  status=json.loads(p.read_text())
  if any(x['exitCode']!=0 for x in status):raise SystemExit('optimized protocol failed; clean local baseline not started')
  if len(status)==5:break
 time.sleep(10)
print('Starting uncontended local baseline read',flush=True)
with (r/'protocol-v05/local.clean.log').open('w') as out:
 result=subprocess.run(['node',str(r/'protocol-v05.mjs'),'parent',str(r/'protocol-recovered'),'local','read-only'],stdout=out,stderr=subprocess.STDOUT)
print('FINAL_CLEAN_LOCAL_EXIT',result.returncode,flush=True)
raise SystemExit(result.returncode)

```

### two-generation-read-v05.mjs

SHA256: `fa3621f20ed2fb68870e62dd0562adc673287cc9fdec1a6adf798fb22e14e285`

```javascript
import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {createHash,webcrypto} from 'node:crypto';import {performance} from 'node:perf_hooks';import assert from 'node:assert/strict';
const [repo,name='regional']=process.argv.slice(2),base='/workspace/scratch/a46e452c28fd/unpacked/AmberTime-v03-five-strategy-proof/ambertime-v03-capacity',j=JSON.stringify,sha=s=>createHash('sha256').update(s).digest('hex'),schema='ambertime-main-bounded-idb/2';
const u=n=>pathToFileURL(repo+'/works/ambertime/'+n).href,D=await import(u('partner-orders.mjs')),S=await import(u('development-save.mjs')),M=await import(u('formal-idb-main.mjs')),P=(await import(u('economy-parameters.mjs'))).PARALLEL_PARAMETERS;
const oldText=fs.readFileSync(base+'/protocol/'+name+'.formal9.json','utf8'),newText=fs.readFileSync(base+'/protocol/'+name+'.next.formal9.json','utf8'),oldExpected=JSON.parse(fs.readFileSync(base+'/expected/'+name+'-1200.json','utf8')),newExpected=JSON.parse(fs.readFileSync(base+'/protocol/'+name+'.next.expected.json','utf8'));
const signed=p=>({...p,sha256:sha(j(p))}),origin=signed({schema,sources:M.LEGACY_SAVE_KEYS.map(key=>({key,text:null}))}),metadata=signed({schema,revision:2,originSha256:origin.sha256}),head={schema,revision:2,text:newText,sha256:sha(newText)},previous={schema,revision:1,text:oldText,sha256:sha(oldText)};
const entries=new Map([['head',head],['previous',previous],['metadata',metadata],['origin',origin]]),before=j([...entries]),requests=[];
const db={close(){},transaction(storeName,mode){assert.equal(storeName,'records');assert.equal(mode,'readonly');const tx={},resultFor=kind=>{const request={};queueMicrotask(()=>{request.result=structuredClone(kind==='keys'?[...entries.keys()]:[...entries.values()]);request.onsuccess?.();requests.push(kind);if(requests.length===2)queueMicrotask(()=>tx.oncomplete?.());});return request;};tx.objectStore=name=>{assert.equal(name,'records');return {getAllKeys:()=>resultFor('keys'),getAll:()=>resultFor('values')};};return tx;}};
const calls=[],reader=text=>{const kind=text===oldText?'previous':text===newText?'head':'unknown';assert.notEqual(kind,'unknown');const t=performance.now(),session=S.readSession(text,{enabled:true,restore:D.restoreDistillery,monthMs:P.monthMs,stepMs:P.distillStepMs});assert.equal(j(session),j(kind==='previous'?oldExpected:newExpected),'full independent session differs');calls.push({kind,ms:performance.now()-t,fullSessionEqual:true});return session;};
const indexedDBApi={open(name,version){assert.equal(name,M.MAIN_IDB_NAME);assert.equal(version,1);const request={};queueMicrotask(()=>{request.result=db;request.onsuccess?.();});return request;}};
const start=performance.now(),result=await M.bootMainIdb({reader,storage:{getItem:()=>null},indexedDBApi,cryptoApi:webcrypto}),elapsedMs=performance.now()-start;assert.equal(result.ok,true,'boot failed: '+result.reason+' '+result.error?.message);assert.equal(result.state,'ready');assert.equal(result.reason,'idb');assert.equal(j(result.session),j(newExpected));assert.equal(result.text,newText);assert.equal(result.adapter.text,newText);assert.equal(entries.get('previous').text,oldText);assert.equal(result.revision,2);assert.equal(calls.length,2);assert.deepEqual(new Set(calls.map(x=>x.kind)),new Set(['head','previous']));assert.equal(j([...entries]),before,'read mutated storage');
result.adapter.close();
console.log(j({repo,name,storageKind:'Mock readonly IDB request scheduling, not native browser IndexedDB',officialBootMainIdb:true,officialReadMainRecord:true,legacySourceKeyCount:origin.sources.length,bootReady:true,headSHA256:head.sha256,previousSHA256:previous.sha256,callOrder:calls.map(x=>x.kind),calls,elapsedMs,wholeHeadAndPreviousEqual:true,storedBytesUnchanged:true,rss:process.resourceUsage().maxRSS}));

```

### run-two-generation-v05.py

SHA256: `73b526b579ca50efd1f4db56f9a80854cd3fe8f130f364339f1fa1ab74e488bf`

```python
from pathlib import Path
import json,time,subprocess,hashlib
r=Path('/workspace/scratch/a46e452c28fd');outdir=r/'two-generation-v05';outdir.mkdir(exist_ok=True)
while not (r/'clean-local-exit.json').exists():time.sleep(10)
clean=json.loads((r/'clean-local-exit.json').read_text());assert clean['exitCode']==0
results=[]
repos=[('baseline',r/'protocol-recovered'),('previous-first',r/'idb-order-benchmark')]
for filename in ['partner-orders.mjs','development-save.mjs']:
 assert (repos[0][1]/'works/ambertime'/filename).read_bytes()==(repos[1][1]/'works/ambertime'/filename).read_bytes(),filename+' differs beyond validation ordering'
for name,repo in repos:
 print('START_TWO_GENERATION',name,flush=True)
 with (outdir/(name+'.json')).open('w') as output,(outdir/(name+'.stderr')).open('w') as error:
  p=subprocess.run(['node',str(r/'two-generation-read-v05.mjs'),str(repo),'regional'],stdout=output,stderr=error)
 result={'variant':name,'exitCode':p.returncode};results.append(result)
 (outdir/'process-results.json').write_text(json.dumps(results,indent=2))
 print('END_TWO_GENERATION',json.dumps(result),flush=True)
 if p.returncode:raise SystemExit(p.returncode)
base=json.loads((outdir/'baseline.json').read_text());order=json.loads((outdir/'previous-first.json').read_text())
assert base['headSHA256']==order['headSHA256'] and base['previousSHA256']==order['previousSHA256']
summary={'storageKind':'Mock readonly IDB scheduling, not native browser IndexedDB','baselineSource':'bb12ed6 recovered','candidateSource':'d087bbca74768aa666e2c9d681030bf5df1a0a22','candidateTree':'b675d0f3c14acf4b43e798376232b55a8cb26fd6','bothFormalReadersExecuted':len(base['calls'])==len(order['calls'])==2,'fullHeadAndPreviousEqual':base['wholeHeadAndPreviousEqual'] and order['wholeHeadAndPreviousEqual'],'baselineSeconds':base['elapsedMs']/1000,'candidateSeconds':order['elapsedMs']/1000,'improvementPercent':(base['elapsedMs']-order['elapsedMs'])/base['elapsedMs']*100,'baselineOrder':base['callOrder'],'candidateOrder':order['callOrder'],'results':results}
(outdir/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print('FINAL_TWO_GENERATION',json.dumps(summary),flush=True)

```

### summarize-perf-v05.py

SHA256: `0c0028a51cffe1955b35296f838476611d9e1f9758cfe78f4f2aa90623360960`

```python
from pathlib import Path
import json,hashlib,subprocess
r=Path('/workspace/scratch/a46e452c28fd')
j=lambda p:json.loads(p.read_text())
baseRuns=j(r/'protocol-v05/whole-results.json');perfRuns=j(r/'protocol-perf-v05/whole-results.json')
assert len(baseRuns)==len(perfRuns)==5
assert all(x['exitCode']==0 for x in baseRuns+perfRuns)
rows=[]
for name in ['local','regional','bulk','small','diversified']:
 baseFile=r/'protocol-v05'/((name+'.clean.results.json') if name=='local' else (name+'.results.json'))
 b=j(baseFile)[0];p=j(r/'protocol-perf-v05'/(name+'.results.json'))
 assert len(p)==3 and all(x.get('expectedFullEquality') is True for x in p[1:])
 assert b['expectedFullEquality'] is True and b['wireSHA256']==p[1]['wireSHA256']
 rows.append({'strategy':name,'baselineColdSeconds':b['coldMs']/1000,'optimizedColdSeconds':p[1]['coldMs']/1000,'optimizedSecondColdSeconds':p[2]['coldMs']/1000,'coldImprovementPercent':(b['coldMs']-p[1]['coldMs'])/b['coldMs']*100,'sameWireSHA256':b['wireSHA256'],'baselineFirstSaveAfterRestoreSeconds':b['firstSaveAfterRestoreMs']/1000,'optimizedFirstSaveAfterRestoreSeconds':p[1]['afterReadPhases']['firstSaveAfterRestore']['ms']/1000,'baselineReadPhases':b['readPhases'],'optimizedReadPhases':p[1]['readPhases'],'baselinePeakRSSKiB':b['rss'],'optimizedChild1PeakRSSKiB':p[1]['rss'],'fullOptimizedProtocolNormalExit':True,'wholeGameAndEverySidecarEqual':True,'initialExpectedSHA256':p[0]['expectedSHA256']})
summary={'environment':'Node, local managed executor, sequential fresh processes. Not browser IndexedDB or iPhone.','baselineRuntime':'bb12ed6 recovered candidate; local clean comparison after full protocols; original local full run200s retained as contended correctness only.','optimizedRuntime':{'localCommit':'2a3f009d6efa9e6d4033a852cd2e84be56ee79c3','gitTree':'f417cb3a4ac7ee6023ce9e2bfe5af08db442a872','preservedRemoteHead':'8593831d3fd4d77c066357f502a658ca87514a91'},'fixtures':'Frozen original a210 independent1200-month careers and frozen original next-month full-session oracles. Original100-year generation reused, not rerun.','timingInterpretation':'Single run per strategy; phase measurements nested, not additive. fileRead is filesystem, not IndexedDB. Native IDB head+previous verification may incur additional reader passes. firstSaveAfterRestore is official serialization plus embedded reader verification, not IDB transaction write. checkpointCapture is new replay-cache snapshot capture, not persisted checkpoint restoration. Memory not demonstrated improved.','allFiveOptimizedFullProtocolNormalExit':True,'allFiveUncontendedBaselineReadsNormalExit':True,'baselineRoutes':baseRuns,'optimizedRoutes':perfRuns,'rows':rows,'instrumentationSHA256':{f:hashlib.sha256((r/f).read_bytes()).hexdigest() for f in ['phase-loader-v05.mjs','protocol-v05.mjs','protocol-perf-v05.mjs']}}
(r/'perf-v05-final-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k not in ['rows','baselineRoutes','optimizedRoutes']},indent=2))
for row in rows:print(row['strategy'],round(row['baselineColdSeconds'],3),round(row['optimizedColdSeconds'],3),round(row['coldImprovementPercent'],1),round(row['optimizedSecondColdSeconds'],3))

```

