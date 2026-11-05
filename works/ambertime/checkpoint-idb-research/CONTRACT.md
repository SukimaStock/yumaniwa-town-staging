# H1-A4 研究用保存契約・分析の境界

正式保存・reader・本編には接続しない。H1-A3の完全保存と操作prefixは保持する。自己ハッシュは破損検出と接続確認であり、状態の正しさや悪意ある改変への認証ではない。作成時の正式全再生との一致、読込時のローカル検証、毎回の独立全再生は別の保証として表示する。最後の方式の高速実装はH1-A3で未成立である。

## 原子的な確定

現在状態、tail、collectorの確定操作位置と分岐を同じmanifestへ結ぶ。ハッシュ計算等の非IDB非同期処理はtransaction開始前に終える。readwrite transaction内でexpectedRevisionを確認し、新しい参照とrevisionを同時に確定する。単なるメモリのロックでは複数タブを保護できない。revisionは単調増加とし、rollbackでも戻さない。transaction完了前のrequest成功だけを保存完了と扱わない。

中断・quota・CAS競合では前の完全commitを維持する。読込時は未確定の孤立オブジェクトをrootにしない。currentが破損・欠落・モデル不一致なら検証済みの旧commitへ戻し、それも使えなければ保持した正式保存から全再生する。復旧元まで失った場合は検出と停止のみ可能であり、ハッシュだけで復旧できない。

## 保持とGC

| 方針 | 日常復元checkpoint | 歴史・復旧の保護 |
|---|---|---|
| A | 最新1個 | 世代記憶・元保存・prefix・backupを別rootとして保持 |
| B | 最新2個 | 同上。古い1個が使えることを毎回保証する意味ではない |
| C | 最新2個 | 不変の世代候補資料を明示的に保持 |
| D | 最新N個 | last-known-goodを別rootとして保持し、上記rootも保護 |

方針Aも歴史記憶の削除を許可しない。GCは保持commit、世代資料、last-known-good、backupから参照される全オブジェクトをmarkし、未参照だけを削除する。並行保存と競合する場合は同一transactionまたはrevisionの再確認が必要。checkpointの個数制限は、町の評判、collector、世代資料、元保存全体の容量上限ではない。

## 未来から独立した歴史

9境界の候補全体を保持する。採用場面だけには縮めない。元イベントID、根拠と参照チェーン、世代ID、境界のglobal操作位置、ordinal/replayOrdinal、seedGeneration、抽選seed、採用順、D1.2文章を保護する。後年の問い合わせが旧境界の候補を変えないことを再読込とGC後に比較する。現在のcollectorと境界資料は別の役割であり、render cacheを消せても候補の根拠は消せない。

H1-A3の`*-boundary-progress.json`には即時の候補・編集・文章があり、`*-materials.json`のmaterialDigestと即時／後年／公開oracle一致が確定証拠となる。browser fixtureに移す際は、この全候補を含む資料のdigestと個数を比較する。収集器全体のcollectorBytesを候補アーカイブ容量と取り違えない。

## 分析と実測

`analysis.mjs [output.json] [browser-results.json]`はH1-A2/A3の入力SHAを付け、既存5方式と年次または64操作のhybrid案を比較する。hybridは未実行の設計上限であり、時間を推定しない。30/60/90/100年のH1-A2 prefixは最終保存に結び付いたoffline資料である。H1-A3の9境界collectorは未来中立だが増大する。いずれも物理IDB容量ではない。累積書込は各確定時の実payloadを実測して集計する必要があり、最終容量×頻度で代替しない。

実Chromiumのtransactionテストは実Safariの耐久性を証明しない。Playwright WebKitが動いてもSafari実機、OS終了、電源断、ブラウザのevictionは別の未検証条件である。quotaの注入と実際のブラウザquota超過は区別する。
