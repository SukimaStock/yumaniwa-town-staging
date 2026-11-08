# Small v8 independent replay / collector boundaries

## 結論

**B側判定: 情報不足の反例成立。**

支持する小入力では正式操作再生からgame、recentLedger、historyRecord、recallRecordが一致した。一方、同じ許可再生入力・同じgameを持つ、正式readerがどちらも受理する2つのv8で、historyRecordが異なる反例を得た。初期化位置を正しくするだけでは、現行readerが許容する全記録を操作列から一意に再構成できない。

これは保存・更新境界を変えた隔離アダプターの反例である。現在のUIが瓶詰めと価格変更を1回の保存にまとめることは示していない。現行UIの正常動作のバグや任意の既存保存の破損とは断定しない。研究の再生規則と異なる正当な境界の記録を、自動的に不正扱いしたり上書きしたりしてはいけない。

正式100年保存、D1、S3、Safari、永続化・電断耐性の合格ではない。AのCI是正とは別計画・別Draft #867。#856/#864と正式コードは変更していない。

## 計画と対象

- 開始main: `8f50ecac82066fcb02958f7514d64e79d19696f5`
- 先行lockのみのcommit: `9560c6b9500c1b4e281f442dd68442e7863d0c0b`
- Plan digest: `1c92e01ff59ba4602526db064bac083b80906e7e931cecbc87fae3f3d0040c29`
- GitHubへの計画書込み受理、SHAと実ファイル読戻し、lock-only親関係の確認を実装より前に完了。計画はWORK／Standardの隔離研究範囲。HQ承認は取得しておらず、その記載もしない。
- 初版研究コード: remote `d30cf9b71c37ea02eb10eb5e7a5a43b1502908f7`。local `5e05f8d3c43b2773ef23642b0869e9e9b1dba818` と同一tree。CLI pushは認証不在で未実行となり、GitHubコネクタの通常FFで保存。remote履歴の書換えなし。
- 独立レビュー後のrunner保護修正版: `a20b157ac5d955812d755e50e07de694e587f1b9`。reference/replayの計算部分は初版と同一。
- `evidence/results.json` は初版測定。`results-after-fix.json` は修正版の再実行であり、区別して保持。

計画・本研究コード・テスト・証拠以外の差分はない。CI変更、正式モデル・writer・reader・validator、上限、B codec、B0/B1、保存先の変更なし。Draftのまま、マージ・公開なし。

## 本編対応と独立性

| 対象 | 本編の根拠 | 研究で実施したこと・限界 |
| --- | --- | --- |
| 初期化 | shop-app:98,1489–1490 / partner-orders:132 | `newShopDialogueDistillery(seed)`後の初期records。古いnewMarketRules initializerへすり替えない |
| recall更新 | shop-app:49–53 / recall/operations:13–21 | native wrapperで1公開操作を観測。0操作の途中抽出・試飲終了は観測しない。handoverのprepareはコード対応を調査、実行未確認 |
| ledger/history | shop-app:581–590 | 最後のcommittedSessionから候補への差分で更新。公開操作単位とは異なる |
| 保存成功 | shop-app:584–590 | slots→ledger→history→正式serialize/read→隔離readback→commit。実ブラウザー操作ではない |
| timer | shop-app:660–667 | 本編は途中抽出を5刻み等で保存。本研究の基本系列は各step保存、一部はまとめ保存。アプリ全体のtimer/失敗rollbackは再現していない |
| native再生 | partner-orders:1348–1353,1373–1389 | seed/origin/operationsからcold projection、continuation tokenなし。最終試飲終了と許可progress/tastingIdは公開遷移で適用 |

再生入力はsession/model/collector version、固定支持initializer、seed、origin=null、操作列、許可された最終progress/tastingIdだけ。候補の最終game/RNG、records、cursor、既知SHA、参照側だけのsaveスケジュールは渡さない。initializer prefixは候補cursorから決めず、現在のconstructorから独立に生成して照合する。

projectionSnapshotがorigin/operationsを除くため、元入力のキー順を借りず、`newDistillery(seed)`のscaffoldに再生factsと許可操作prefixを配置。nativeのゲーム計算は再実装していない。正式readerの候補受理確認と、候補から開始しない独立projectionは別の検査である。同じ正式モデルの誤りを双方が共有する限界は残る。

### 6 sidecarの保証

| sidecar | 扱い | 結果 |
| --- | --- | --- |
| recentLedger | 派生記録を独立生成・直接比較 | 毎操作保存小入力、24か月入力、今回のまとめ保存反例で一致。任意の保存間隔への一般化は不可 |
| historyRecord | 派生記録を独立生成・直接比較 | 毎操作保存と24か月は一致。まとめ保存でoperationIndexの非一意性 |
| recallRecord | 独立したconstructor位置から公開操作ごとに生成 | 非空factsで一致。短入力のcompletedは0。確定回想の採用・文章・世代交代までの新規実証はなし |
| userPaused | unchanged v8のboolean検査 | false/trueの正当な違いを認める。経済操作列からの再生保証なし |
| elapsed | unchanged v8の整数・範囲・step整合 | 有効stepは受理、month上限は拒否。経済操作列から一意とはしない |
| caskSlots | unchanged型・重複禁止・生存cask対応 | 有効な場所変更は受理、重複は拒否。ゲーム再生から配置を捏造しない |

## 入力・反例

### 新規作成した短い正常v8

公的操作でrange蒸留開始→24まで進行→採取開始→36で停止→bourbon樽詰め。共通の正常保存から、瓶詰め1本と価格highへの変更を同順で実行。

| | 毎操作保存 | 2操作後のまとめ保存 |
| --- | --- | --- |
| v8 SHA | `e81ed60a32e41631739ebb5689f833feeb50f034abae95c03bc559b227de9789` | `b255360be4f85b0dcb7e3a8320e648a4b6fa359eced6084bc5226a379a91b555` |
| bytes | 24,544 | 24,544 |
| 正式reader | 受理 | 受理 |
| 最終game | 同一 | 同一 |
| 許可再生入力 | 同一 | 同一 |
| history瓶詰めoperationIndex | 33 | 34 |
| 独立毎操作再生とのhistory一致 | 一致 | 不一致 |

共通game SHA: `5095e2c01a079b276f8feca74cb57f91b86ab97f353f3e4d7fae8bc819bda5b7`。許可入力SHA: `3b453a6a8dcc0b81553a05a775b9d857c0e30af22ed8cc4db39857bef57bc480`。月0、操作35件。history3件、recall retained facts2件であり、空配列だけの一致ではない。

最初の差: `historyRecord.events[2].operationIndex`。history-record:21–23は保存差分内の新規イベントへ`after.operations.length-1`を付ける。瓶詰め専用処理:43–47はこの値を上書きしない。validator:94–96はreleaseとの事実整合を検査するが、当該indexが瓶詰め操作であることは要求しない。毎操作保存の確定後、価格変更では過去の瓶詰めeventを変えない。まとめ保存は価格変更後のindex34でeventを初生成する。

この対は「未知の候補を全て信頼できる」証明ではなく、「この許可入力から両方の保存履歴を一意には選べない」反例である。game/RNG、ledger、recallは同一。既存recordを毎操作再生の値へ置換してはいない。

### 再利用した24か月v8

`evidence/reused-24-month-v8.json`は先行#864研究で新規生成済みだった正常v8の**同一バイト列コピー**。既存プレイヤーの過去保存の発見ではない。元の実在保存先・SHA前後は機械可読結果に記録。

- SHA `48751764f194f0e9909abd1186db79fa9d50b832ecbb14a776b5b8eb94198693`
- 209,412 bytes、model20、origin=null、24か月、107操作。
- 正式reader受理。gameと3派生sidecarが独立再生と一致。
- 欠落・空・version違い候補を拒否、元SHA不変、原本を再読込し25か月へ公開操作で継続。
- 100年研究fixtureは使用・再生成していない。

## 試験と独立技術レビュー

新規研究43試験PASS、関連正式保存・回想19試験PASS。正常原本、途中抽出、記録済み試飲/終了、繰返し保存、読込後継続、6 sidecar分類を確認。ゲーム結果改変、操作改変、記録欠落・重複・参照不整合・cursor改変は正式readerの拒否を確認。支持しないversion/origin/initializerは研究対象外として拒否し、正式な保存破損とは分類しない。

派生記録のbrandName変更は現行readerが受理するが、独立内容比較は差を検出した。この比較の不一致も、正当な保存境界との違いを区別せずに製品の拒否理由へ採用しない。candidate自身のhashを来歴証明にしていない。

独立技術レビューは自己点検とは別に実施。初版39試験と核心反例の再現に加え、runnerにP2相当の原本保護問題を発見した。出力先と原本pathが衝突すると、原本の読取前に候補を出力していた。/tmpの使い捨てコピーだけで失敗を保存し、実際の24か月原本は不変。

修正は入力読取/SHAを先行し、全出力の既存pathを先行拒否（symlink/hardlinkを含む）、exclusive `wx`生成と前後SHA確認。same-path/symlink/hardlink/不存在原本の実runner4回帰を追加。失敗ログと旧コードを保持。変更は研究runnerだけで、検証規則を緩めていない。修正版a20b157aで独立再レビューと43試験の再実行を完了し、追加の要修正事項なし。新規出力先での実runnerも成功、既存出力先への再実行は拒否された。詳細はevidence/independent-review.txt。

隔離ファイル・メモリーでの保護であり、browser原子的保存・quota・電断・全origin消失の保証ではない。runnerの出力ディレクトリは毎回新しくし、既存証拠を上書きしない。

## 再現

```sh
node --test works/ambertime/tests/independent-record-replay.test.mjs
OUT=$(mktemp -d)
AMBERTIME_NORMAL_V8=works/ambertime/design/independent-record-replay/evidence/reused-24-month-v8.json \
  node --max-old-space-size=512 works/ambertime/design/independent-record-replay/run.mjs "$OUT"
```

`results-after-fix.json`に対象コードSHA256、実行commit、入力SHA、成功・不一致、実行条件を残す。元の結果・修復前ログは削除しない。今回の短いrunは予算内のRSSで完了したが、これは性能比較でなく研究予算の確認。100年やiPhoneのメモリに外挿しない。

## 次の最小判断

1. **新しい保存記録の検証契約を設計する際、初期化と成功保存境界を明示的な再生入力に含めるか。** 候補はcollector/model version、初期化位置、成功保存候補の操作位置と必要な非操作補助入力。今回の反例を同じgame・同じ履歴のまま再現できることを、次の隔離試作で証明する必要がある。境界を追加すれば全sidecarに十分だとはまだ証明していない。
2. **既存v8の互換性。** 境界が記録されていない旧v8は、今回の許可入力だけでは一意に回復できない。現存sidecarを保護し、旧readerの確認範囲と独立再生できた範囲を分ける。無条件に再生成して過去の記録を変えない。候補のhistory indexを使って都合よい境界を逆算し「独立」と呼ぶ方式は採らない。
3. **適用範囲。** origin=null/current constructorの小入力と既存24か月は確認済み。旧起点・機能移行・非空確定回想、D1の3方針×3境界・他seed、100年保存、永続世代復旧、Safariは未確認のまま。広域4種類を9条件の4/9へ読み替えない。

作者が判断するのは、保存/collector境界情報の追加を次の研究対象にするかと、復元不能な旧境界の記録をどの互換性保証で保持するか。今回は正式形式への追加、本編接続、マージを実施しない。

## 検査状態

ローカルScope/Risk/ImpactはPASS（計画の宣言範囲のみ）。独立レビューと実試験は技術的証拠であり、正式なHQ承認ではない。GitHub exact-SHAチェックは最終PRコメントへ記録する。計画だけのCI成功を最終実装成功と取り違えない。Change OSのVerification Stateは規則どおりUNVERIFIEDであり、本編の正式導入判定ではない。
