# AmberTime v0.6 — 保存安全性・復元性能の検証

## 判断

**PR #931 は Draft・未マージで保全する。** 保存契約・5戦略の状態一致・実Chromiumの故障注入は成立したが、単世代100年復元とメモリ負荷は実用性能の完成と呼べない。30秒目安は未達。CI成功を性能完成・iPhone検証済みとは扱わない。Productionは変更していない。

#927の委託販売と#929のlossless v9/IndexedDB保存・正常世代保護を、最新main `0778bcf4555737ec45947a80aca8f761f39fa429` から正規Planで統合した候補。中間PR #930は未マージで閉じ、6入口のmodule URL閉包を含めた新Planを先に固定して#931に移した。#927・#929の成果は保全されている。

## 採用した実装

- v0.5の安全なprivate replay最適化と#929のprevious→head検証順序を統合。townの共有はせず、コピーはnative structuredCloneで完全に分離する。private WeakMapは検証済みappend-only配列の量子化済みprefix長だけを持つ。
- 蒸留状態の投影から大きな無関係stateを除き、必要なcore/phase/distillation/batch/operationsだけを渡す。外側の状態コピーは維持。旧処理との差分試験で結果・入力不変・JSON順序・no-op/guardを比較した。
- 検証cacheは8Mi code unitsの巨大raw text保持から、接続・reader単位の最大8件のSHA256:length証拠へ変更。毎回canonical検査と新しいSHAを計算し、正式reader成功後に限り登録する。返却headは必ずreaderを再実行する。CAS・世代関係・読戻しを維持。
- 単独surrogateがTextEncoderで同じbytesになる境界を独立レビューで検出し、cache hit前にもcanonical検査するよう修正・回帰追加。URLの重複queryによる別module instanceと、Labからの旧依存参照も閉包検査で修正した。

## 採用しなかった案

| 案 | 理由 |
| --- | --- |
| descriptor/aliasを保持する手動graph clone | 地域の同一実験77.961→76.237秒で改善が小さい。複雑性に見合わず削除。実験source・結果を保全 |
| descriptor省略の高速clone | 合成例では速いが、getterとDate混在時のfallbackでgetter二重実行。公開readerのJS入力契約を守れず不採用 |
| town共有 | rollback時の入力汚染を生むため禁止を維持 |
| checkpointとその自己hashだけで復元 | 状態とhashを共に改変された場合に合法な履歴再生結果と証明できない。独立した信頼根拠なしに正式readerを省略しない |
| cache無制限拡大 | 大きなtext保持をやめ、最大8件の検証済みdigestに制限 |

## Node同一環境比較

| 戦略 | 旧安全候補・秒 | 統合候補・秒 | 短縮率 | 旧peak RSS MiB | 候補peak RSS MiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| 地元中心 | 143.049 | 124.113 | 13.2% | 864.7 | 862.8 |
| 地域中心 | 77.154 | 76.513 | 0.8% | 572.1 | 576.4 |
| 大量委託 | 82.230 | 73.869 | 10.2% | 592.1 | 606.3 |
| 少量継続 | 165.681 | 159.925 | 3.5% | 810.7 | 809.0 |
| 複数窓口分散 | 88.500 | 73.917 | 16.5% | 551.5 | 559.6 |

全5戦略の最終候補15processは正常終了し、全状態・翌月・canonical再保存が一致。追加baseline5、地元再検証3、profile1、少量継続再測定1、2世代2も正常終了。RSSは3戦略で増加しており、単世代メモリの改善を達成したとは判断しない。時刻・GC・実行環境差を含む単発比較で、統計的有意差を主張しない。

2世代起動（地域、実boot＋模擬IDB）は163.941→69.679秒、oracle読込前peak RSSは870.4→651.3MiB。head→previousからprevious→headへ変更し、両方の正式reader・全session一致を維持。native browser値と混同しない。


旧候補は `198b95c7dd9741965a5fa24ffd3b6830190f68bd`（v0.5安全性能候補、後続は報告のみ）。計測は独立processで逐次実行し、同一wire SHAを確認。RSSは独立oracleを開く前のプロセスhigh-waterであり、Node・コード・wire・replay・検証を含む。iPhoneのメモリではない。

初回full-fiveは地元の最初2processが旧中間SHAだったため、その結果を最終候補の証拠に流用せず地元3processを再実行した。初回少量継続の時間には別回帰試験が重なったため、正当性の証拠は保持し、性能表には独立した再測定を使う。混在した初回結果も隠さず `results/initial-five/` に保存する。

## 5戦略の正式保存・復元

immutable `AmberTime-v03-five-strategy-proof.zip` の98ファイルhashを確認。1200か月の経営履歴と独立した翌月oracleを再利用し、今回新しく1200か月を生成したとは扱わない。全5戦略で正式保存→別process cold restore→全session一致→翌月→独立oracle一致→再保存→さらに別processでcold restore→全session・canonical再保存一致を検証する。

比較は選択した項目だけでなくsession全体。現金、商品・委託在庫、売上、取引先、申し出、世代、回想、乱数、操作履歴、全sidecarを含む。分散fixtureは実際の2窓口で実売2159本と2061本（合計4220本）。初期monthは4戦略1332、分散1450で、翌月1333/1451を検証する。これは100年の経営操作後のゲーム内monthである。

再現コマンド・Node version・commit/tree・fixture/script SHA・全process終了コード・最後の結果JSONはresultsに保全。測定器の用法と限界は[README](README.md)。

## 実Chromium

最終実装SHA `695a70b8e3854624c1877f3e4518e02a74d2ac48`、[Actions 43246905176](https://github.com/SukimaStock/yumaniwa-town-staging/actions/runs/43246905176)。Ubuntu22.04 / Chromium151 / sandbox有効。保存基盤12ケース、本編7シナリオ、大きな地域100年データ6ケースすべて成功。

| 実Chromium・地域100年 | 時間 |
| --- | ---: |
| 初回巨大書込み＋読戻し | 46.519秒 |
| cold restore | 44.077秒 |
| 翌月の正式保存・反映 | 1.910秒 |
| previous＋head起動 | 44.838秒 |

2世代はprevious43.882秒＋head0.851秒。元の全session・翌月全session hashとcanonical wireが一致。旧正常世代を保持して再保存できた。中間候補ではcold36.721秒だったが同じruntimeでもrunner差があるため、最終候補の44.077秒を採用する。

ブラウザーprocess群のRSS合算sample最大1,756,432KiB（約1715MiB）。共有ページ重複を含み、unique memoryでもJS heapでもない。cold後JS heapUsed63,782,304bytes、2世代後167,569,816bytesは境界sampleでありpeakではない。旧候補の同条件browserメモリ比較は未実施であり、メモリ問題解決とは判断しない。

artifact `13958900900`、ZIP SHA256 `76dd6584192510cf6edfe03f32abc83eb17d1bad37fa33749c83a972d2bdcd28`。raw JSONとCI provenanceをresultsに保存した。地域以外4戦略の巨大native browser試験は未実施。

## 正常世代・故障注入

旧v8原文保持、lossless v9正式reader、head/previous独立検証、破損拒否、CAS競合、quota/abort/readback故障、保存前の本編未反映、復元後初回保存を確認。巨大quota注入時は旧bytesとlive stateが変わらず、新head破損時も旧previousを上書きせずcold起動も拒否した。正常世代への自動fallback成功とは扱わない。

quotaは例外注入であり物理disk枯渇ではない。OS強制終了・電源断・iPhone Safariは未確認。ローカルChromiumは環境sandbox制約で起動できなかったため、sandboxを無効にせず正規Actionsで実施した。

## cache・コピーの評価

cache単独probeは実100年の地元2世代text（合計9,229,292 code units）を使い、**semantic readerだけ模擬**。旧上限8,388,608を超えるため、再訪時の追加reader呼出しは旧2回→新0回。保持keyは旧raw1件4,615,699units→新digest2件144units。force headは両方で正式reader相当の呼出しが増える。これはcache動作の証拠でありnative復元時間・process総メモリ削減の測定ではない。

地域の別process詳細profileでは、replay操作2,229回、private clone helper17,671回、native structuredClone120,255回。native入力の論理JSON量は8,547,324,474 code units（helper入力8,427,155,937）。両者は重複するため足さない。これは各入力をJSON化した論理量であり、実allocation bytesではない。計測自身の追加走査で復元が171.9秒になるため、その時間/RSSを通常の性能比較には使わない。

通常測定の地元は124.113秒のうちoperation replay120.978秒。native clone125,588回・累積117.260秒で、phaseは入れ子のため合計しない。checkpoint captureは2回・0.095秒、最終全状態比較0.422秒。既存checkpointの生成が主因ではない。月次economicMonthlyや委託・瓶詰め・世代処理のfull cloneは残る。今回のcounterは呼出し元ごとの配分を計測していないため、特定の関数だけで何%改善できるとは断定しない。

## CI・独立レビュー・exact candidate

最終実装695a70bで必須 `plan-risk-gate` / `trusted-mechanical-evidence`、Release Validator、native-chromiumが成功。Full Plan Lockを実装前に固定しScope/Risk/ImpactがPASS。旧cache graph試験のshop-app→history-worker不足は同一main0778でも再現する既存失敗であり、期待値緩和・試験無効化は行っていない。

中間実装段階の関連save/restore focused suite127pass/0fail/1skip（local browser不足）は履歴証拠であり、最終SHAでの再実行とはしない。最終関連回帰44pass/0fail/0skip（URL閉包・source保護・private clone・世代交代・forgery・offers・recall・委託販売）。独立レビュアーの詳細はresults/independent-review.md。

Node最終測定runtimeはaacc112e（tree5999a11191b670195bf92f7d31b48f20bb57cade）。納品実装695a70b（tree3c64d9757127456f34eda153854c97751c9e60b5、ローカル1ce2b818）は本編runtime/asset775ファイルがblob一致。差は新Plan、外部Lab6ファイルのURL、試験2ファイル。Nodeで使う本編への変更はない。最終報告commitでは文書・測定証拠だけを追加する。

## 未完了と次の安全な改善

- 単世代のコピー負荷が支配的で、30秒と安定したメモリ低減を満たしていないためマージ停止。
- 次はprepareFlavorFill→E.fillBarrel、給与調整→正式操作の二重full cloneを、必要なcore/spiritだけを投影する形で個別に監査する。各案ごとに低資金rollback・入力不変・旧reader全状態一致を先に証明する。共有townへ戻さない。
- 自己hashだけのcheckpoint採用はしない。履歴と状態の独立した検証根拠を設計できるまでcold replayを維持する。
- 今回の保存基盤・委託販売候補はPR #931に保全し、世界拡張Stage5と実機メモ41〜44は接続しない。

Staging main/Pagesは0778bcf4のまま、今回の候補は未配信。従って作者のiPhoneで今回候補を確認できる段階ではない。将来の配信後には、既存save保護、cold起動、翌月進行、保存→再起動、background復帰時の状態、長時間待機とtab再読込み有無を確認する。Chromium成功をSafari成功に読み替えない。
