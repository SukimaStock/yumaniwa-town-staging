# H1-B2 検証状況

状態：UNVERIFIED（最終自動VERIFIED / Release Completeではない）。Staging-only Draft PR #811。12条件本編browser matrixが未完了のためマージしない。

基準：778f783043256bed02197988caecd65cda576167。Plan Lock digest：840e15f01aa53797e5db53358af91c113f4a0c925b100522783cd1cfb9fb1886。

|検査|結果|
|---|---|
|正式codec/app/同値証拠/逆変換単体|14/14 pass|
|本編正式session経路・将来操作|357操作完全一致、12入力byte同一展開|
|H1-B1将来759操作・H2-5九境界|入力SHA・53依存不変を照合して完了証拠を再利用|
|実Chromium失敗・救出|8/8 complete、native quota超過を含む|
|失敗検証fingerprintテスト|1/1 pass|
|実Chromium本編12条件|進行中、未完了|
|WebKit|host library不足で起動不可|
|iPhone Safari|実機未検証|
|広いAmberTime回帰|1298中1292 pass、4既存fail、2 skip|
|変更前main回帰|1284中1278 pass、同じ4 fail、2 skip|
|Scope Guard→Risk→Impact|すべてPASS（実装checkpoint dd29dab9。最終差分でも再確認）|
|Lifecycle|PASS|
|GitHub Release Validator Tests|実装checkpoint ce0e7dedでsuccess。最終headは別途確認|

既存失敗はA1-3 cache逆変換の固定pin、R4全体固定pin、R5固定hash、visual-14のsource assertion。変更前mainでも同じ失敗を実行確認。R5期待値・テストは未変更。新規回帰として隠さず区別する。

B2で変わったsave失敗時rollback・新session形をテストhostへ適用した。固定proofにはB2の正確な差分だけを戻す逆変換を追加し、基準mainの元byte一致と不正/重複hunk拒否をテストした。元のhash期待値を緩めず、現行の実挙動は別のcodec/app/browserテストで検査する。

実装担当外の独立レビューでcodec厳格性、移行gate、失敗commit、旧版引継ぎ、paused/elapsed、通常メニューからのfile復元を確認。ブラウザの完了前試行はbrowser-attempts.jsonへ保持し、未完了のstageから成功を推定しない。

## 実行ログの区別

広い回帰はtests/*.test.mjsであり、h1-b2のbrowser evidence testは別実行。ブラウザmatrixの完了JSONとrunner/product fingerprintが揃うまでevidence testはPASS扱いしない。

Reproduce手順はREPRODUCE.md、正式契約はCONTRACT.md、作者のSafari確認はSAFARI.md。Production不変。
