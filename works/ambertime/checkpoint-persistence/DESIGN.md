# H1-A3 保存・復旧契約案

これは研究用の別ファイル契約であり、正式保存形式の提案採用・実装ではない。本編、正式reader、origin、保存キー、C-3、D1.1、D1.2は変更しない。

## 役割と信頼境界

| 層 | 保持内容 | 確定点 |
| --- | --- | --- |
| 現在状態 | 正式state全体、RNG、未処理判断 | 操作間のcheckpoint。未記録蒸留/試飲は最終overlayとして別復元 |
| 最近の記録 | 帳面collectorのMap/Set/集計値と明細 | 同じglobal operation index |
| 歴史記憶 | raw事実・永続ID・因果chain、世代境界の候補集合 | rawを境界で切ってからC-3。採用21〜23場面だけにはしない |
| 復元根拠 | seed/origin識別、全操作prefix、tail、context、形式/モデルfingerprint、作成検証記録 | commit manifestの原子的rename |

自己hashは破損検出であり、内容を再署名できる攻撃者に対する認証ではない。creation.validationもローカルなreceiptであり、フラグを信じるだけでprefix正当性が成立するわけではない。

| 保証 | 作成時 | 読込時 |
| --- | --- | --- |
| ファイル破損 | payload hash | envelope/manifest hash・schema・content address |
| checkpointとtailの対応 | seed/origin/global index/prefix hash | 同じ値と元保存suffixの全件比較 |
| 作成状態の正当性 | 未変更の正式reader＋独立空contextからの全再生。長期計測は正式observerでも全永続境界状態を比較 | 作成経路を信頼する条件付き。最終全JSONは保持元保存と比較 |
| 元操作の独立妥当性 | 正式全再生 | 毎回は実行しない。必要なら正式readerへfallback |

部分復元では全保存JSON・操作列を読み込みhash照合するが、古い操作の意味を毎回全再生しない。現行正式cold復元と同等の独立検証保証を持つ高速復元は未実装。最終比較のoracleとなる正式保存の保持は研究の前提であり、削除後にも同じ保証が維持できるとはしない。

## 永続化

checkpointとtailは内容address付きファイルへ書き、各ファイルfsync→rename→directory fsyncの後、最後にcommit manifestを同じ手順で切り替える。途中の.tmpと未参照データは読まない。既存commitがあればそれを読み、新規commitがなければ元保存へ戻る。これはNode/POSIXの研究実装であり、IndexedDB transaction・Safari終了・端末電断時のdurabilityを実証するものではない。

fallback APIは状態専用。外部observerを直接渡す操作を拒否する。帳面・歴史はdetached collectorを分岐ごとにhydrateし、tailと最終照合が成功した後だけ採用する。途中失敗したcollectorを完全再生結果と混ぜず破棄し、元保存から全資料を再構成する。

## 将来の正式形式

1. 新しい形式versionを設け、旧保存readerを維持する。旧originをcheckpoint格納欄へ転用しない。
2. 移行前の元保存backupを別transactionで確保する。hashだけでは復旧できない。
3. 一つのcommitに現在state、context、tail末尾、資料collector、歴史境界のoperation位置を揃える。
4. checkpointの検証状態を、生成中・局所整合済・独立全再生一致・失効へ区別する。ローカルflagのみを信用根拠にしない。
5. 同じモデルfingerprintで検証した直近2件と世代境界を保持する案を比較する。件数2は研究案であり採用値ではない。GCは新commit成功後に行い、backupと操作prefixは削除しない。
6. モデル・規則・collector source変更は失効として扱う。旧実行系で読むか全再生から再生成し、暗黙に新規則へ繋がない。
7. tail欠落・分岐混入・context欠損・破損では旧正常checkpointを試し、元保存と全prefixがある場合だけ全再生fallbackを保証する。全候補不正かbackup欠落なら停止する。
8. rollbackは旧reader＋移行前backupへ戻す。prefix削除の許可は本研究から導かない。

## 間隔と容量

世代交代は歴史候補の不変境界に適するが、日常復元のtailを20年以上残す場合がある。年次・64/128操作・推定64MiBを日常checkpointの比較基準とし、世代境界と別に管理する。作成時の完全再生検証、コピー、hash、書込、失効時の再生成も費用に含める。

操作数はCPU負荷を保証しない。1操作内に多くのdistillStepが含まれる。推定64MiBも状態容量×操作数のproxyでありCPU計測ではない。頻繁な生成を毎回全再生で保証する方式は総コストが高い。将来は信頼済み前checkpointからの生成経路と、定期的な独立全再生監査を別途設計する必要がある。

checkpoint追加でtown.events/arrivals/attemptsは減らない。元保存・prefixを保持する本研究では総容量は増える。別研究でarrivals/eventsの実体共有、古いattemptsの集約、live評判と歴史の分離を検討する際は、単調ID・source参照閉包・seen/pending・受領保存則・将来RNG/販売/経済一致を先に証明する。
