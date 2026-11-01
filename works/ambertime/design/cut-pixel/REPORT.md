# カットバー・グラスのピクセル色表現

基準 main `6c8b2be96c81646bab59ae69964342b5a46e6d94`。先行Plan Lockは `.change-plans/ambertime-cut-pixel/r0.lock.json`。既存の #741 味監査、#742 本編接続、#743 キャッシュ修正を継承する。

## 採用と比較

バーはA「3px縦列＋表示RGB16段階」を採用。以前も3px列であったが、色は列ごとにほぼ連続だった。代表条件では80列に対し9段階の色になり、ドット絵の段差が見える。段階は既存の瞬間profileの連続混色から決まり、固定の初留・中留・後留境界ではない。Bの軽い固定ディザとCの主副成分模様は、高さ6pxでは現在位置・採取印と視線が競合したため比較資料に残す。

グラスはB「代表色」を採用。正式終了時に確定した既存profileから個性を分類し、液体内の2色のみ変更する。採取中は従来の中立色。最小12step未満を含め暫定profileを確定色として見せない。象徴液面0→8stepで0.7→保持、形状、移動、入力は維持。結果窓の既存余白へ6pxの同色印を置き、既存の味名・香り・刺激・正式Lを残す。色は量・価格・品質の指標ではない。

- [バー・グラス同条件比較360px](render/comparison-360.png) / [375px](render/comparison-375.png) / [390px](render/comparison-390.png)
- [グラス3方式比較](audit/glass-comparison.png)、[全カット監査](AUDIT.md)、[分類分布](audit/classification-map.png)
- [変更前390px](browser-output/before/chromium-390-finished.png) / [変更後390px](browser-output/chromium/390-finished.png)

既存名称の成分重みを表示分類に再利用。上位差5%未満だけ混合とする。全15,664件の内訳は果実3,811／麦2,495／煙4,810／厚み2,677／混合1,871。件数を均等に補正していない。非混合13,793件は既存の個性と一致。隣接30,624組の切替は688組（2.25%）。単純最多成分の名称不一致4,179件に対し、採用方式の非混合不一致0件。代表色は副成分差を省略するため、同色を同じ味とは扱わない。

## 保護と検証

正式な味48点平均、12step、収量、費用、熟成、販売、需要、評判、時計、正式保存、入力、習熟モジュールは変更しない。既存の146正式ソースhashおよび4条件×5段階の20正式状態・冷保存bytesとの一致を再検証。表示色は純粋関数で正式profileを変更しない。

- 関連Nodeテスト40成功（色全件、描画3方式、座標/印一致、入力/習熟、正式状態/保存）。root Release Validatorテスト30成功。
- 変更依存のキャッシュ参照は entry→shop→Canvas→bar/tools および shop→flavor-color 全て `cut-pixel-r1`。既存の変更していない学習/入力moduleは旧queryを維持。
- Scope Guard→Risk Gate→Impact Checkは実行済み。CIのtrusted base検査を別途確認する。
- 全AmberTime suiteは長期計算を含むため途中停止。途中の3失敗は基準mainで同じく再現（旧販売通知の期待、過去Canvas全byte固定、過去Canvas query固定）。対象外テストを弱めず維持した。
- `release-validator --ids ambertime` は既存のWORKS未登録によりmetadata.identityがFAIL（lifecycleはactive）。今回台帳/公開範囲を変えず、この結果を成功扱いしない。

幅・engine別の実ポインター/画素/保存/配置の結果は [BROWSER.md](BROWSER.md)。Chromium/Linux WebKitを実機iPhone Safariと混同しない。実機の色差、バー3px印、指追従、Safariバー・安全領域は未確認。

Productionには反映しない。既存active作品のStaging更新であり新Labや町の配置は追加しない。
