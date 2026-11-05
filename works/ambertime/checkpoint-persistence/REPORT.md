# H1-A3 永続checkpoint・歴史記憶の増分継続

100年3方針×5方式の15本を別Nodeプロセスで復元し、正式状態全JSON・乱数を含む状態hash・再生contextが一致した。過去時点だけで生成したcollectorを永続化し年次tailで継続した3条件でも、全帳面資料・raw歴史事実・回想が一致した。9世代交代境界は、当時の候補・根拠・境界・ordinal/replayOrdinal・seed・採用順・D1.2文章が後年および既存H2-5資料と一致した。

正式保存形式・本編readerへの接続は行っていない。**現行正式復元と同等の独立検証保証を含む高速復元は未実装**であり、保存容量問題も未解決である。

## 基準と再利用

基準mainは74eb99ec28102c67b9e765684cfaf072a2a1c2e5。H1-A2の12条件・60本の同値フラグ、計測fingerprint、全入力SHA/容量、現行モデルfingerprintを照合した。既存60本の再計測はしない。前セッションscratchへアクセスできないため、未変更のH24公開操作generatorでscratchへ保存を再現した。既存H1-A1/H1-A2の12保存すべてと全バイト・SHAが一致し、原資料は編集していない。

H1-A2のwarm性能と最終保存依存sidecarをcold/onlineの証明へ読み替えない。新しいオンライン資料は初期状態またはprefix時点だけから作り、tailのobserverだけで更新する。全操作snapshot列は保存しない。finishはcollectorを複製して表示し、Map/Set/初回判定を汚さない。世代の後付け表示情報はfinish時点で生成する。

## cold状態復元（100年）

Node v24.22.1 / linux x64。各方式1試行、別Nodeのmodule/cache。OS page cache未flush、JIT初期化あり、統計的区間なし。複数独立研究processが同じhostで動き得る。正式coldも別processで1回測定し、保証差のある高速化率は算出しない。

| 方針 | 方式 | 作成trigger | tail操作/月 | 純粋tail秒 | cold worker全体秒 | 書込MiB | capture/write ms | peak RSS MiB |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- | ---: |
| 地元密着 | generation | 3 | 287/245 | 19.289 | 19.652 | 3.44 | 52.0/78.4 | 495.68 |
| 地元密着 | annual | 100 | 13/12 | 0.556 | 0.929 | 4.06 | 81.0/163.0 | 270.52 |
| 地元密着 | operations64 | 23 | 49/42 | 5.637 | 6.105 | 3.99 | 61.7/69.1 | 368.00 |
| 地元密着 | operations128 | 11 | 113/96 | 7.746 | 8.126 | 3.82 | 56.5/85.0 | 371.35 |
| 地元密着 | workload64MiB | 50 | 1/1 | 0.065 | 0.518 | 4.08 | 85.9/139.2 | 204.57 |
| 広域展開 | generation | 3 | 327/270 | 39.280 | 39.854 | 4.96 | 81.6/151.7 | 744.53 |
| 広域展開 | annual | 100 | 17/12 | 1.190 | 1.778 | 6.20 | 113.3/223.4 | 377.38 |
| 広域展開 | operations64 | 23 | 56/47 | 8.582 | 9.098 | 6.09 | 97.1/124.1 | 746.68 |
| 広域展開 | operations128 | 11 | 120/100 | 12.319 | 12.875 | 5.75 | 106.8/126.0 | 738.74 |
| 広域展開 | workload64MiB | 73 | 1/1 | 0.071 | 0.619 | 6.26 | 109.4/153.6 | 250.74 |
| 混合 | generation | 3 | 348/282 | 40.740 | 41.328 | 3.99 | 65.3/111.8 | 666.96 |
| 混合 | annual | 100 | 12/12 | 0.737 | 1.371 | 5.24 | 79.4/342.0 | 331.38 |
| 混合 | operations64 | 23 | 26/24 | 1.589 | 2.084 | 5.17 | 78.0/104.7 | 387.96 |
| 混合 | operations128 | 11 | 90/77 | 12.541 | 13.006 | 4.94 | 102.6/139.2 | 511.39 |
| 混合 | workload64MiB | 57 | 11/11 | 0.778 | 1.279 | 5.24 | 92.5/119.5 | 335.95 |

worker全体はsourceファイル読込、checkpoint読込/JSON解析、adapter import、局所検証、context復元、tail、最終全JSON比較を含む内部wall時間。Node起動前の親spawn時間を含めない。pure tailはobserverなし。localVerifyMsにはsource JSON解析・hash・prefix照合・state複製/context decodeが入り、replayTail内部でも再度検証する。replay context decodeはcontext-probe.mjsの別cold processでも独立計測した（results.jsonのcontextProbe）。これは統合localVerifyMsに既に含まれる処理の追加観測であり、合計へ足さず、統合時間の厳密なpartitionともみなさない。parseMsはcheckpoint/tailのJSONのみで、manifest/source全体のJSON解析ではない。詳細内訳はresults.json。

| 方針 | 正式cold秒 | 作成用全再生秒 | 正式reader検証秒 | 正式observer全境界比較秒 |
| --- | ---: | ---: | ---: | ---: |
| 地元密着 | 45.481 | 44.542 | 46.166 | 82.735 |
| 広域展開 | 93.445 | 95.340 | 93.657 | 146.957 |
| 混合 | 67.992 | 71.080 | 70.088 | 112.107 |

作成時検証は同じ条件の全境界で共有した実測であり、毎triggerの完全再生・fsyncを100回計測した累積値ではない。trigger数は照合済みH1-A2 scheduleを再利用した。保持する最後の非空tail用checkpointを測定し、各triggerでの書込容量合計・失効再生成全体・削除負荷は未計測。captureはstate/context clone/hash、writeはcheckpoint/tail/manifestのfsyncとrename。

## 帳面・歴史のcold継続

| 方針 | raw事実 | 資料hydrate ms | 資料付きtail秒 | 仕上げ/回想 ms | cold全体秒 | bundle MiB |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| 地元密着 | 3280 | 104.7 | 1.522 | 57.3/31.1 | 2.014 | 12.27 |
| 広域展開 | 5093 | 157.2 | 2.954 | 67.3/41.4 | 3.806 | 18.55 |
| 混合 | 4285 | 128.3 | 1.809 | 55.1/34.0 | 2.548 | 15.78 |

資料付きtailはobserver用before/after複製を含み、純粋tailと同一条件の値ではない。material workerはGC APIを公開するが強制GCを呼ばず、自然GCで計測した。広域・混合の資料条件は同時実行されCPU競合がある。collectorの通知内数、状態検証、資料hydrate、finish、回想生成、read/parse/importはJSONに分離した。全帳面・rawの最終digestはH1-A2既存projectionDigestと一致し、rawは未変更H25抽出を別processで実行しても一致する。iPhone/DOM/UIの計測ではない。

## 9世代境界

| 方針 | 世代交代 | 月 | 候補数 | 当時=後年=既存H2-5 |
| --- | --- | ---: | ---: | --- |
| 地元密着 | handover:1 | 321 | 238 | 一致 |
| 地元密着 | handover:2 | 636 | 360 | 一致 |
| 地元密着 | handover:3 | 955 | 483 | 一致 |
| 広域展開 | handover:1 | 314 | 316 | 一致 |
| 広域展開 | handover:2 | 630 | 492 | 一致 |
| 広域展開 | handover:3 | 930 | 667 | 一致 |
| 混合 | handover:1 | 306 | 253 | 一致 |
| 混合 | handover:2 | 610 | 389 | 一致 |
| 混合 | handover:3 | 918 | 547 | 一致 |

raw事実を交代境界で切ってC-3を適用する既存関数を使用する。raw ID・年月・操作index・世代・店/銘柄/発売・数量/熟成年数・因果chain・事実文を全資料一致で照合する。境界別の候補全体と編集全結果をdigest化し、seed/採用順/文章も記録する。選ばれた場面だけに資料を削っていない。

## 信頼性・復旧

破損、欠落、異seed、同seed異prefix、tail改変/欠落/誤対応、モデル/形式不一致、context構造欠落、途中書込を拒否し、元正式保存があれば全再生へ戻る。resealした意味上の不正もテストする。旧commitと無関係な孤立新ファイル/tmpがある場合は旧commitを読める。元保存を失った状態はhashだけでは復旧できず停止する。直接外部observerをfallback APIへ渡すことは拒否し、資料はdetached collectorを成功時だけ採用する。

自己hashを書き直せる攻撃者への認証、操作prefix削除後の復旧、Safari/IndexedDBの電断・quota・transaction、モデル跨ぎの移行は未実装。最終一致比較にも完全保持した元保存を使う。作成時全再生照合と読込時独立全再生は同じ保証ではない。

## 採用判断と次段階

年次は短いtailを維持しやすいが作成頻度が高い。世代方式は歴史境界に適する一方、長いtailを残す。64/128操作は件数管理が容易でも内部distillStepの負荷を直接表さない。推定64MiBは状態容量×操作数proxyであり、実行時間基準ではない。正式値を採用せず、歴史境界と日常checkpointを別に持つ設計を継続検証する。

H1-A4では、作成経路の信頼根拠・定期独立監査、context decodeを含む詳細計測、IndexedDB原子commit/終了/失効/rollback、保持数とGC、複数版reader/backup、資料のbounded retentionを扱う。50年休止した銘柄の再登場、全旧origin・全操作分岐は網羅していない。別研究としてtown.events/arrivals共有、attempts集約を販売・評判・RNG・ID/seen/pending・参照閉包の同値性で検証する。checkpoint研究の成功を容量削減とみなさない。正式採用条件はDESIGN.md。
