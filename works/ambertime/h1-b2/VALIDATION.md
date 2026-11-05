# H1-B2 検証状況

状態：UNVERIFIED（最終自動VERIFIED / Release Completeではない）。Staging-only PR #811。12条件の本編browser matrixは完了。最終headの必須CI確認後にStagingへ反映する。iPhone実機未検証。

基準：778f783043256bed02197988caecd65cda576167。Plan Lock digest：840e15f01aa53797e5db53358af91c113f4a0c925b100522783cd1cfb9fb1886。

|検査|結果|
|---|---|
|正式codec/app/同値証拠/逆変換単体|14/14 pass|
|本編正式session経路・将来操作|357操作完全一致、12入力byte同一展開|
|H1-B1将来759操作・H2-5九境界|入力SHA・53依存不変を照合して完了証拠を再利用|
|実Chromium失敗・救出|8/8 complete、native quota超過を含む|
|新旧保存・app・failure/browser evidence・逆変換の検査|17/17 pass（現在product/runner fingerprintへ結合）|
|販売欄required browser回帰|compact・rulesの2/2 pass。旧rules testのdebug入口/移行gate手順を更新、製品変更なし|
|実Chromium本編12条件|12/12 complete。全条件の実ページreload・次月保存が一致。広域100年はprocess再起動も一致|
|WebKit|host library不足で起動不可|
|iPhone Safari|実機未検証|
|広いAmberTime回帰|1298中1292 pass、4既存fail、2 skip|
|変更前main回帰|1284中1278 pass、同じ4 fail、2 skip|
|Scope Guard→Risk→Impact|すべてPASS（最終差分で再確認済み）|
|Lifecycle|PASS|
|GitHub Release Validator Tests|実装checkpoint ce0e7dedでsuccess。最終headは別途確認|

既存失敗はA1-3 cache逆変換の固定pin、R4全体固定pin、R5固定hash、visual-14のsource assertion。変更前mainでも同じ失敗を実行確認。R5期待値・テストは未変更。新規回帰として隠さず区別する。

B2で変わったsave失敗時rollback・新session形をテストhostへ適用した。固定proofにはB2の正確な差分だけを戻す逆変換を追加し、基準mainの元byte一致と不正/重複hunk拒否をテストした。元のhash期待値を緩めず、現行の実挙動は別のcodec/app/browserテストで検査する。

実装担当外の独立レビューでcodec厳格性、移行gate、失敗commit、旧版引継ぎ、paused/elapsed、通常メニューからのfile復元を確認。ブラウザの完了前試行はbrowser-attempts.jsonへ保持し、未完了のstageから成功を推定しない。

## 実行ログの区別

広い回帰はtests/*.test.mjsであり、h1-b2のbrowser evidence testは別実行。最終browser matrixの完了JSONとrunner/product fingerprintを照合し、evidence testを含む17件がPASS。

Reproduce手順はREPRODUCE.md、正式契約はCONTRACT.md、作者のSafari確認はSAFARI.md。Production不変。

## 復旧操作の追補

PR #811の後続で、保存失敗時のmodal解放とoutside exportを修正。現在sourceで実browser11/11 complete、集約22/22 pass、追加関連host43/43・蒸留統合10/10 pass。元12条件は結果とfingerprintを変更せず、厳格なfailure-only source inverseとrecovery-reuse.jsonにより再利用する。新しい12回の実行とは表記しない。詳細RECOVERY.md。最終CIと配信のexact SHAは修正PRへ記録する。
