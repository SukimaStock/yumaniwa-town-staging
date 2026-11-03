# AmberTime L1 — 研究資産の最新棚卸し

基準main `632968a80b81ea1478012073b2de9a0f6e525183`。原典は[PR #768の棚卸し](../structure-audit-2026-11-02/LAB-INVENTORY.md)。R0〜R6の[総括](../../REFACTOR-SUMMARY.md)を引き継ぐ。

## 件数と分類

39研究資産・38実画面・29登録入口。監査基準 `23f20504f81282c5c9161995758660be092156dc` から、Lab実体・LAB登録・lifecycleの追加更新は0件。旧本編19入口・補助画面・design資料は39件へ重複計上しない。

現役4件、要確認5件（通常表示を維持）、研究記録30件。保護対象24件は重複分類。要確認はcontest最新版・decision・continuous-trade・shop-expansion v02・word-crafting。監査のA4/B35という候補から、Bのうち継続判断が曖昧な5件を非表示にせず残した。分類は表示用途のみでlifecycle・作者の採否を変更しない。

## 全件一覧

依存先と参照元は原典の域外static import調査を保持する。HTML・font・URLリンクは別。以下の実体・登録入口はすべて既存URLを保持する。

### 1. AmberTime · 樽と香りの試作（表記なし）

- 表示：研究記録。保護対象：域外static import元としては未検出。
- 研究：樽による香りの変化と、試飲台で飲み比べる操作を試す。
- 結果：樽と香り、試飲台での飲み比べを試した。REPORT冒頭で探索終了を記録した。
- 本編採用：本編への採用は見送り。
- 見送り・保留：樽と香り・試飲台の本編導入を見送った。コード・専用保存は保持する。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/cask-aroma/index.html
- import先：域外static importなし（HTML/font等は別）
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/cask-aroma/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/501 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/500 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/498 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/497

### 2. AmberTime Contest Lab 0.2（0.2）

- 表示：要確認・通常表示維持。保護対象：域外static import元としては未検出。
- 研究：年ごとに替わる審査員、任意参加の品評会、熟成待ちと次の仕込みのつながりを試す。
- 結果：0.2では年ごとに審査員が替わると、同じ4樽でも選択が変わった。総合賞と個人推薦を分け、翌年の審査員を事前に確認できる形にした。体験の評価は未確認。
- 本編採用：本編統合は保留。
- 見送り・保留：中央値の標準化は見送り。賞金・評判・世代との接続は未実装。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/contest/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-contest-lab/
- import先：works/ambertime/model.mjs works/ambertime/parameters.mjs works/ambertime/partner-orders.mjs
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/contest/REPORT-v02.md / works/ambertime/experiments/contest/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/532 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/531

### 3. AmberTime Contest Lab 0.1（0.1）

- 表示：研究記録。保護対象：域外static import元としては未検出。
- 研究：同じ4樽を好みの異なる3人で審査し、熟成時期・集計方式・出品時の消費を比較する。
- 結果：審査員の好みで高評価の製法と月齢が分かれた。固定総合点では多様な4樽を持つ利点が足りなかった。
- 本編採用：本編統合は保留。
- 見送り・保留：0.1では出品ごとの0.7L消費の標準化を見送った。審査員の好み・個人推薦・熟成を待つ判断は採用候補に留めた。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/contest/v01.html
- import先：域外static importなし（HTML/font等は別）
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/contest/REPORT-v02.md / works/ambertime/experiments/contest/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/532

### 4. AmberTime｜取引のつづき Lab 0.1（0.1）

- 表示：要確認・通常表示維持。保護対象：域外static import元としては未検出。
- 研究：タップ・スライド・ドラッグ・線で結ぶ操作を比べ、同じ製法の継続取引と品切れ後の再開を試す。
- 結果：4種類の操作で同じ取引関係を作り、同じ製法の在庫から自動発送する仮モデルを作成した。価格・需要・店の好みには未接続で、操作方式の採否は未確認。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/continuous-trade/v01/index.html
- import先：域外static importなし（HTML/font等は別）
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/continuous-trade/v01/README.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/650

### 5. AmberTime Decision Lab 0.1（0.1）

- 表示：要確認・通常表示維持。保護対象：域外static import元としては未検出。
- 研究：熟成・手元資金・季節の違いが、瓶詰めする時期と販売判断にどう関わるかを比較する。
- 結果：2シード・3初期セット・4条件・4方針の96本を最大36か月で比較した。風味と資金の理由を分けて観察できる。
- 本編採用：当時のREPORTでは現段階の本編統合を見送り。後続の採用は未確認。
- 見送り・保留：強い蒸発・大幅な季節補正・強制瓶詰めイベントを当時見送った。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/decision/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-decision-lab/
- import先：works/ambertime/economy-parameters.mjs works/ambertime/economy.mjs works/ambertime/model.mjs works/ambertime/monthly.mjs works/ambertime/parameters.mjs works/ambertime/partner-orders.mjs
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/decision/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/533

### 6. AmberTime · 蒸留モデル比較（表記なし）

- 表示：研究記録。保護対象：あり。
- 研究：採取区間を変え、香りと量のトレードオフを示すAと、原酒の構成が滑らかに変わるBを比較する。
- 結果：Aは中盤の香りと後半の量、Bは軽さから果実・穀物への滑らかな変化を比較できた。
- 本編採用：A由来の抽出をaroma-extraction.mjsが使用。560区間比較を本編テストで保護。
- 見送り・保留：旧Bモデルを正式仕様として採用した根拠は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/distillation/index.html
- import先：works/ambertime/brand-reputation.mjs works/ambertime/character.mjs works/ambertime/distillery-art.mjs works/ambertime/economy-parameters.mjs works/ambertime/economy.mjs works/ambertime/model.mjs works/ambertime/partner-orders.mjs works/ambertime/partner-parameters.mjs works/ambertime/spirit-view.mjs
- 参照元：works/ambertime/design/shop/price-audit.mjs works/ambertime/design/stockists/parameter-audit.mjs works/ambertime/tests/aroma-model.test.mjs works/ambertime/tests/aroma-simulate.mjs
- 関連PR・資料：works/ambertime/experiments/distillation/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/437

### 7. AmberTime 手札と場 Lab 0.1（0.1）

- 表示：研究記録。保護対象：あり。
- 研究：一本を造って店へ出し、同じ製法をまた使いたくなるかを試す。
- 結果：一本を造り、店へ出す循環を独立モデルで試した。 作者による体験評価は未確認。
- 本編採用：v073の仮置き・量選択・取消・最後の1確定は後続の本編接続で採用。各旧版の全仕様を採用した意味ではない。
- 見送り・保留：各版の注文・店舗・操作案すべての採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/hand-and-place/v01/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-hand-and-place-lab/
- import先：works/ambertime-flavor-lab-v02/model.mjs works/ambertime/experiments/shop-expansion/v01/model.mjs
- 参照元：works/ambertime/experiments/hand-and-place/v02/tests/model.test.mjs
- 関連PR・資料：works/ambertime/experiments/hand-and-place/v01/REPORT.md / works/ambertime/design/placement-027/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/623 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/622

### 8. AmberTime 手札と場 Lab 0.2 — 一枚を出す瞬間（0.2）

- 表示：研究記録。保護対象：あり。
- 研究：手札と店の棚を見比べ、一本を出した後の場から次の選択を考えられるかを試す。
- 結果：手札を出すと棚が変わり、次の選択へ戻る循環を試した。 作者による体験評価は未確認。
- 本編採用：v073の仮置き・量選択・取消・最後の1確定は後続の本編接続で採用。各旧版の全仕様を採用した意味ではない。
- 見送り・保留：各版の注文・店舗・操作案すべての採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/hand-and-place/v02/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-hand-and-place-v02-lab/
- import先：works/ambertime-flavor-lab-v02/model.mjs works/ambertime/experiments/hand-and-place/v01/model.mjs works/ambertime/experiments/shop-expansion/v01/model.mjs
- 参照元：works/ambertime/experiments/hand-and-place/v03/tests/model.test.mjs
- 関連PR・資料：works/ambertime/experiments/hand-and-place/v02/REPORT.md / works/ambertime/design/placement-027/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/624

### 9. AmberTime 手札と場 Lab 0.3 — 一本へのさまざまな反応（0.3）

- 表示：研究記録。保護対象：域外static import元としては未検出。
- 研究：取扱いの成立と店主の好みを分け、紹介した一本への返事が次の試作につながるかを試す。
- 結果：取扱いの成立と店主の好みを別に扱う比較を試した。 作者による体験評価は未確認。
- 本編採用：v073の仮置き・量選択・取消・最後の1確定は後続の本編接続で採用。各旧版の全仕様を採用した意味ではない。
- 見送り・保留：各版の注文・店舗・操作案すべての採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/hand-and-place/v03/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-hand-and-place-v03-lab/
- import先：works/ambertime-flavor-lab-v02/model.mjs works/ambertime/experiments/hand-and-place/v02/model.mjs works/ambertime/experiments/shop-expansion/v01/model.mjs
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/hand-and-place/v03/REPORT.md / works/ambertime/design/placement-027/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/625

### 10. AmberTime 手札と場 Lab 0.4 — 店からの注文（0.4）

- 表示：研究記録。保護対象：あり。
- 研究：店の注文を選んで手札を渡し、残った在庫と次の注文から再仕込みを考える操作を試す。
- 結果：注文・実納品・残った在庫から次の注文が変わる操作を試した。 作者による体験評価は未確認。
- 本編採用：v073の仮置き・量選択・取消・最後の1確定は後続の本編接続で採用。各旧版の全仕様を採用した意味ではない。
- 見送り・保留：各版の注文・店舗・操作案すべての採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/hand-and-place/v04/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-hand-and-place-v04-lab/
- import先：works/ambertime-flavor-lab-v02/model.mjs works/ambertime/experiments/shop-expansion/v01/model.mjs
- 参照元：works/ambertime/experiments/hand-and-place/v05/app.mjs works/ambertime/experiments/hand-and-place/v05/tests/scenarios.mjs works/ambertime/experiments/hand-and-place/v05/tests/view.test.mjs works/ambertime/experiments/hand-and-place/v06/model.mjs works/ambertime/experiments/hand-and-place/v06/tests/model.test.mjs
- 関連PR・資料：works/ambertime/experiments/hand-and-place/v04/REPORT.md / works/ambertime/design/placement-027/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/626

### 11. AmberTime 手札と場 Lab 0.5 — 時間と店の動き（0.5）

- 表示：研究記録。保護対象：域外static import元としては未検出。
- 研究：同じ注文・納品・時間経過を、数字・瓶・短い動きの3案で比較する。
- 結果：v04と同じ出来事を数字・瓶・短い動きの3案で比較した。初期表示はB。 作者による体験評価は未確認。
- 本編採用：v073の仮置き・量選択・取消・最後の1確定は後続の本編接続で採用。各旧版の全仕様を採用した意味ではない。
- 見送り・保留：各版の注文・店舗・操作案すべての採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/hand-and-place/v05/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-hand-and-place-v05-lab/
- import先：works/ambertime/experiments/hand-and-place/v04/model.mjs
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/hand-and-place/v05/REPORT.md / works/ambertime/design/placement-027/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/627

### 12. AmberTime 手札と場 Lab 0.6 — 在庫の行き先と自由な取引（0.6）

- 表示：研究記録。保護対象：あり。
- 研究：自家販売と店への納品量を自分で選び、未販売の配分を戻して考え直す操作を比較する。
- 結果：自家販売へ回した分だけ自動販売し、店へ渡す量を手動で選ぶ比較を試した。 作者による体験評価は未確認。
- 本編採用：v073の仮置き・量選択・取消・最後の1確定は後続の本編接続で採用。各旧版の全仕様を採用した意味ではない。
- 見送り・保留：各版の注文・店舗・操作案すべての採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/hand-and-place/v06/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-hand-and-place-v06-lab/
- import先：works/ambertime/experiments/hand-and-place/v04/model.mjs works/ambertime/experiments/shop-expansion/v01/model.mjs
- 参照元：works/ambertime/experiments/hand-and-place/v07/model.mjs works/ambertime/experiments/hand-and-place/v07/tests/model.test.mjs works/ambertime/experiments/hand-and-place/v07/tests/scenarios.mjs works/ambertime/experiments/hand-and-place/v072/model.mjs works/ambertime/experiments/hand-and-place/v072/tests/model.test.mjs
- 関連PR・資料：works/ambertime/experiments/hand-and-place/v06/REPORT.md / works/ambertime/design/placement-027/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/628

### 13. AmberTime 手札と場 Lab 0.7 — 販売室への落とし込み（0.7）

- 表示：研究記録。保護対象：あり。
- 研究：自由な行き先選択を瓶棚と小窓へ置き換え、瓶・行き先・数量を確認する操作を比較する。
- 結果：v06 Cの行き先選択を本編の瓶棚と小窓で操作できるようにした。 作者による体験評価は未確認。
- 本編採用：v073の仮置き・量選択・取消・最後の1確定は後続の本編接続で採用。各旧版の全仕様を採用した意味ではない。
- 見送り・保留：各版の注文・店舗・操作案すべての採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/hand-and-place/v07/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-hand-and-place-v07-lab/
- import先：works/ambertime/canvas-layout.mjs works/ambertime/cask-glass-art.mjs works/ambertime/experiments/hand-and-place/v06/model.mjs works/ambertime/experiments/shop-expansion/v01/model.mjs works/ambertime/font-loader.mjs works/ambertime/pixel-symbols.mjs works/ambertime/room-object-art.mjs
- 参照元：works/ambertime/experiments/hand-and-place/v071/app.mjs works/ambertime/experiments/hand-and-place/v072/model.mjs works/ambertime/experiments/hand-and-place/v072/tests/model.test.mjs
- 関連PR・資料：works/ambertime/experiments/hand-and-place/v07/REPORT.md / works/ambertime/design/placement-027/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/656 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/655 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/629

### 14. AmberTime 手札と場 Lab 0.7.1（0.7.1）

- 表示：研究記録。保護対象：域外static import元としては未検出。
- 研究：v07と同じゲーム処理で、瓶棚と小窓の表示を減らした操作を比較する。
- 結果：v07モデルを変更せず棚と小窓の表示を減らした。 作者による体験評価は未確認。
- 本編採用：v073の仮置き・量選択・取消・最後の1確定は後続の本編接続で採用。各旧版の全仕様を採用した意味ではない。
- 見送り・保留：各版の注文・店舗・操作案すべての採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/hand-and-place/v071/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-hand-and-place-v071-lab/
- import先：works/ambertime/canvas-layout.mjs works/ambertime/cask-glass-art.mjs works/ambertime/experiments/hand-and-place/v07/model.mjs works/ambertime/font-loader.mjs works/ambertime/pixel-symbols.mjs works/ambertime/room-object-art.mjs
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/hand-and-place/v071/REPORT.md / works/ambertime/design/placement-027/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/632 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/630

### 15. AmberTime 手札と場 Lab 0.7.2（0.7.2）

- 表示：研究記録。保護対象：あり。
- 研究：自家販売に残す数と2店へ渡す数を数値でまとめ、最後に一度だけ確定する操作を試す。
- 結果：自家販売と2店への配分を最後に一度だけ確定する数値方式を試した。 作者による体験評価は未確認。
- 本編採用：v073の仮置き・量選択・取消・最後の1確定は後続の本編接続で採用。各旧版の全仕様を採用した意味ではない。
- 見送り・保留：各版の注文・店舗・操作案すべての採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/hand-and-place/v072/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-hand-and-place-v072-lab/
- import先：works/ambertime/canvas-layout.mjs works/ambertime/cask-glass-art.mjs works/ambertime/experiments/hand-and-place/v06/model.mjs works/ambertime/experiments/hand-and-place/v07/model.mjs works/ambertime/experiments/shop-expansion/v01/model.mjs works/ambertime/font-loader.mjs works/ambertime/pixel-symbols.mjs works/ambertime/room-object-art.mjs
- 参照元：works/ambertime/experiments/hand-and-place/v073/app.mjs works/ambertime/experiments/hand-and-place/v073/tests/draft.test.mjs
- 関連PR・資料：works/ambertime/experiments/hand-and-place/v072/REPORT.md / works/ambertime/design/placement-027/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/633

### 16. AmberTime 手札と場 Lab 0.7.3（0.7.3）

- 表示：研究記録。保護対象：あり。
- 研究：v072の数値配分と、量を選んで行き先をタップする仮置き操作を同じ配分結果で比較する。
- 結果：数値方式と仮置きを5場面で比較。仮置きの操作数は少なくならず、手応えと負担を分けて判断した。 作者による体験評価は未確認。
- 本編採用：v073の仮置き・量選択・取消・最後の1確定は後続の本編接続で採用。各旧版の全仕様を採用した意味ではない。
- 見送り・保留：各版の注文・店舗・操作案すべての採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/hand-and-place/v073/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-hand-and-place-v073-lab/
- import先：works/ambertime/canvas-layout.mjs works/ambertime/cask-glass-art.mjs works/ambertime/experiments/hand-and-place/v072/model.mjs works/ambertime/font-loader.mjs works/ambertime/pixel-symbols.mjs works/ambertime/room-object-art.mjs
- 参照元：works/ambertime/experiments/whisky-evaluation/v02/model.mjs
- 関連PR・資料：works/ambertime/experiments/hand-and-place/v073/REPORT.md / works/ambertime/design/placement-027/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/634

### 17. AmberTime 販売設計 Lab（0.1）

- 表示：現役。保護対象：あり。
- 研究：味と販路の相性、瓶の配分と販売循環、販売ルール候補の経済バランスを比較する。
- 結果：味と販路の相性、配分後の販売循環、経済バランスを比較した。Lab sales.mjsと本編market-sales.mjsの一致をテストで保護。
- 本編採用：販売ルールを本編へ採用（#668）。
- 見送り・保留：Lab全体の画面・条件をそのまま本編へ採用したものではない。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/market-design/v01/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-market-design-lab/
- import先：works/ambertime/economy-parameters.mjs works/ambertime/economy.mjs works/ambertime/font-loader.mjs works/ambertime/lab-flavor.mjs works/ambertime/partner-orders.mjs works/ambertime/pixel-symbols.mjs works/ambertime/room-object-art.mjs works/ambertime/shop-demand.mjs works/ambertime/store-market.mjs
- 参照元：works/ambertime-cut-lab/quantity/run.mjs works/ambertime/design/map-daily/run.mjs works/ambertime/design/map-sales-028/run.mjs works/ambertime/design/map-stage2/run.mjs works/ambertime/design/market-rules-adoption/validation.mjs works/ambertime/tests/map-initial-display-browser.mjs works/ambertime/tests/map-stable-browser.mjs works/ambertime/tests/market-rules-model.test.mjs
- 関連PR・資料：works/ambertime/experiments/market-design/v01/REPORT.md / works/ambertime/design/market-rules-adoption/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/667

### 18. AmberTime Reputation Lab 0.3（0.3）

- 表示：研究記録。保護対象：あり。
- 研究：口コミLab v03への既存入口として、実納品・店の相性・紹介経路の比較へつなぐ。
- 結果：実納品を起点に相性と紹介経路を比較。入口はv03へ転送する。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/reputation/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-reputation-lab/
- import先：works/ambertime/brand-reputation.mjs works/ambertime/department-projects.mjs works/ambertime/economy.mjs works/ambertime/model.mjs works/ambertime/partner-orders.mjs works/ambertime/shop-model.mjs
- 参照元：works/ambertime/experiments/reputation/v02/analyze.mjs works/ambertime/experiments/reputation/v02/model.mjs works/ambertime/experiments/reputation/v02/tests/model.test.mjs
- 関連PR・資料：works/ambertime/experiments/reputation/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/578 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/577 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/576 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/575 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/537 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/536

### 19. AmberTime Reputation Lab 0.1（0.1）

- 表示：研究記録。保護対象：域外static import元としては未検出。
- 研究：店への納品を起点に評判が伝わり、相性や継続納品から次の取引機会が生まれるかを比較する。
- 結果：0.1の独立画面をv01.htmlで保持している。納品起点の伝播と継続納品による関係を比較した。0.1の結果を後続版で再計算して置き換えない。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/reputation/v01.html
- import先：域外static importなし（HTML/font等は別）
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/reputation/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/537

### 20. AmberTime Reputation Lab 0.2（0.2）

- 表示：研究記録。保護対象：域外static import元としては未検出。
- 研究：店への発送を自動化し、ブランドの方向性や実績から育つ期待が次の一本の判断につながるかを比較する。
- 結果：ブランドの方向性を選ぶ方式と、実際の発送から期待が育つ方式を比較した。在庫不足の注文を積み上げず、別ブランドへの自動置換も行わない。体験評価は未確認。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/reputation/v02/index.html
- import先：works/ambertime/economy.mjs works/ambertime/experiments/reputation/model.mjs works/ambertime/model.mjs works/ambertime/partner-orders.mjs
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/reputation/v02/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/537

### 21. AmberTime 口コミLab 0.3（0.3）

- 表示：研究記録。保護対象：あり。
- 研究：店別の相性・道のつながり・少量継続が、実納品からの口コミに与える違いを比較する。
- 結果：相性・道のつながり・少量継続で結果が変わる。固定商品での停滞と大店集中の弱さが残った。
- 本編採用：モデルの一部をtown-simulation経由で本編が実行時参照。実験仮定・表示・全指標を採用した意味ではない。
- 見送り・保留：Lab全体の採用と各確率・強度の正式な採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/reputation/v03/index.html
- import先：域外static importなし（HTML/font等は別）
- 参照元：works/ambertime/experiments/reputation/v04/model.mjs works/ambertime/experiments/reputation/v05/core.mjs works/ambertime/experiments/reputation/v05/model.mjs works/ambertime/experiments/shop-expansion/v01/model.mjs works/ambertime/experiments/shop-expansion/v02/rumor.mjs works/ambertime/experiments/town-simulation/v01/model.mjs works/ambertime/experiments/whisky-evaluation/v01/model.mjs works/ambertime/experiments/whisky-evaluation/v011/audit-baseline.mjs
- 関連PR・資料：works/ambertime/experiments/reputation/v03/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/576 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/575

### 22. AmberTime Reputation Lab 0.4（0.4）

- 表示：研究記録。保護対象：あり。
- 研究：土地への定着と口コミの強さを分け、納品時期・好み・過去の商品記憶による広まりの違いを比較する。
- 結果：定着を口コミの強さと別に計算。同じ本数でも納品時期・好み・過去の商品記憶で関係が変わった。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/reputation/v04/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-reputation-world-lab/
- import先：works/ambertime/experiments/reputation/v03/model.mjs
- 参照元：works/ambertime/experiments/reputation/v05/tests/model.test.mjs
- 関連PR・資料：works/ambertime/experiments/reputation/v04/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/577

### 23. AmberTime Reputation Lab 0.5（0.5）

- 表示：研究記録。保護対象：あり。
- 研究：実納品ごとの有限な出会い機会と、発売回まで辿れる紹介履歴を試す。
- 結果：実納品ごとの有限な出会い機会と、発売回を辿れる紹介履歴を比較した。
- 本編採用：モデルの一部をtown-simulation経由で本編が実行時参照。実験仮定・表示・全指標を採用した意味ではない。
- 見送り・保留：Lab全体の採用と各確率・強度の正式な採否は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/reputation/v05/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-reputation-encounter-lab/
- import先：works/ambertime/experiments/reputation/v03/model.mjs works/ambertime/experiments/reputation/v04/model.mjs
- 参照元：works/ambertime/experiments/shop-expansion/v02/rumor.mjs works/ambertime/experiments/town-simulation/v01/model.mjs
- 関連PR・資料：works/ambertime/experiments/reputation/v05/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/578

### 24. AmberTime 新しい取扱店 Lab 0.1（0.1）

- 表示：研究記録。保護対象：あり。
- 研究：同じウイスキーを食堂・バー・専門酒店へ届け、店の好みと納品先・回数による反応の違いを比較する。
- 結果：同じ一本でも食堂・バー・専門酒店で反応が異なった。数量条件・需要・売上を省いた比較だけでは経済性を判断できない。
- 本編採用：REPORTでは本編統合を行わず、反応の違いを採用候補とした。後続の全面採用は未確認。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/shop-expansion/v01/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-shop-expansion-lab/
- import先：works/ambertime-flavor-lab-v02/model.mjs works/ambertime/experiments/reputation/v03/model.mjs works/ambertime/experiments/town-simulation/v01/model.mjs works/ambertime/lab-flavor.mjs works/ambertime/partner-orders.mjs
- 参照元：works/ambertime/experiments/hand-and-place/v01/model.mjs works/ambertime/experiments/hand-and-place/v01/tests/model.test.mjs works/ambertime/experiments/hand-and-place/v02/model.mjs works/ambertime/experiments/hand-and-place/v03/model.mjs works/ambertime/experiments/hand-and-place/v04/model.mjs works/ambertime/experiments/hand-and-place/v04/tests/model.test.mjs works/ambertime/experiments/hand-and-place/v06/model.mjs works/ambertime/experiments/hand-and-place/v07/model.mjs works/ambertime/experiments/hand-and-place/v072/model.mjs works/ambertime/experiments/hand-and-place/v072/tests/model.test.mjs works/ambertime/experiments/shop-expansion/v02/model.mjs
- 関連PR・資料：works/ambertime/experiments/shop-expansion/v01/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/620

### 25. AmberTime 取扱関係 Lab 0.2（0.2）

- 表示：要確認・通常表示維持。保護対象：域外static import元としては未検出。
- 研究：ブランド・発売回・風味の近さで取扱関係を分け、月次の自動発送と品切れ後の判断を比較する。
- 結果：同じ製法を継続する条件では、発売回指定に継続許可を加えたB＋と、風味の近さで扱うCで発送結果・判断数が一致した。Cの風味距離を全店へ採用する根拠にはならない。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/shop-expansion/v02/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-shop-relationship-lab/
- import先：works/ambertime-flavor-lab-v02/model.mjs works/ambertime/experiments/reputation/v03/model.mjs works/ambertime/experiments/reputation/v05/model.mjs works/ambertime/experiments/shop-expansion/v01/model.mjs works/ambertime/experiments/town-simulation/v01/model.mjs works/ambertime/shop-demand.mjs works/ambertime/shop-model.mjs
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/design/shop-relationship-redesign-0261.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/621

### 26. AmberTime｜味と店 Lab 0.1（0.1）

- 表示：研究記録。保護対象：域外static import元としては未検出。
- 研究：どんな味を造るとどの店に受け入れられるか、味と販売先の相性を中心に試す。
- 結果：味と店の相性を中心に販売を捉える独立試作。体験評価と正式採用は未確認。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/taste-market/v01/index.html
- import先：域外static importなし（HTML/font等は別）
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/taste-market/v01/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/655

### 27. AmberTime｜味と店 Lab 0.2（0.2）

- 表示：研究記録。保護対象：あり。
- 研究：発売回と本数を選び、店へ置く・売れる・回収する流れを同じ画面で試す。
- 結果：発売回と本数を選び、店へ置く・実売・回収を同じ画面で試した。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/taste-market/v02/index.html
- import先：域外static importなし（HTML/font等は別）
- 参照元：works/ambertime/experiments/taste-market/v03/app.mjs
- 関連PR・資料：works/ambertime/experiments/taste-market/v02/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/663 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/660 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/659 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/656

### 28. AmberTime｜味と店 Lab 0.3（0.3）

- 表示：研究記録。保護対象：域外static import元としては未検出。
- 研究：発売回の選択を1行、本数を3択、店を3行へ整理し、複数の瓶と販売の流れを小さい画面で確認する。
- 結果：v02モデルを維持して選択を1行、本数を3択、店を3行へ整理。記録されたブラウザー検証では360×540以上の指定条件で全体スクロールなし。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/taste-market/v03/index.html
- import先：works/ambertime/experiments/taste-market/v02/model.mjs
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/taste-market/v03/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/663

### 29. AmberTime 街と口コミの長期シミュレーター 0.1（0.1（v01））

- 表示：研究記録。保護対象：あり。
- 研究：口コミの到達、好みに合う反応、実納品による定着を分け、町の訪問・問い合わせ・記憶を長期観察する。
- 結果：到達、好みに合う反応、実納品による定着を別に観察する長期シミュレーターを作成した。
- 本編採用：town-connection.mjsがモデルを本編で使用（#592/#593）。Lab画面・全条件の採用は未確認。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/town-simulation/v01/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-town-simulation-lab/
- import先：works/ambertime-flavor-lab-v02/bridge.mjs works/ambertime/experiments/reputation/v03/model.mjs works/ambertime/experiments/reputation/v05/core.mjs works/ambertime/experiments/reputation/v05/model.mjs
- 参照元：works/ambertime-cut-lab/audit.mjs works/ambertime-flavor-lab-v02/bridge.test.mjs works/ambertime/experiments/shop-expansion/v01/model.mjs works/ambertime/experiments/shop-expansion/v01/tests/model.test.mjs works/ambertime/experiments/shop-expansion/v02/model.mjs works/ambertime/experiments/shop-expansion/v02/rumor.mjs works/ambertime/town-connection.mjs
- 関連PR・資料：works/ambertime/experiments/town-simulation/v01/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/592 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/590 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/589 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/579

### 30. AmberTime 評価 Lab 0.1（0.1）

- 表示：研究記録。保護対象：あり。
- 研究：一本の味と熟成年数を変え、届ける店や客ごとの評価・反応の違いを比較する。
- 結果：一本の味と年数、店・客層による評価を比較。後続0.1.1の基準再現で保存済み2,160行が一致した。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/whisky-evaluation/v01/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-whisky-evaluation-lab/
- import先：works/ambertime-flavor-lab-v02/model.mjs works/ambertime/codea-object-art.mjs works/ambertime/experiments/reputation/v03/model.mjs
- 参照元：works/ambertime/experiments/whisky-evaluation/v011/audit-baseline.mjs works/ambertime/experiments/whisky-evaluation/v011/model.mjs works/ambertime/experiments/whisky-evaluation/v011/model.test.mjs works/ambertime/experiments/whisky-evaluation/v011/priority-sensitivity.mjs works/ambertime/experiments/whisky-evaluation/v011/results.test.mjs works/ambertime/experiments/whisky-evaluation/v011/run.mjs works/ambertime/experiments/whisky-evaluation/v02/model.mjs
- 関連PR・資料：works/ambertime/experiments/whisky-evaluation/v01/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/673 / works/ambertime/experiments/whisky-evaluation/v011/REPORT.md

### 31. AmberTime 評価 Lab 0.1.1（0.1.1）

- 表示：研究記録。保護対象：あり。
- 研究：バランス型に偏る評価と上限への飽和を分析し、嗜好の重み・距離・熟成加点の改善案を比較する。
- 結果：30シードでバランス型が支持率最高の割合は72.1%から38.9%へ低下。評価上限への飽和は0条件になったが、店舗の優位は残った。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/whisky-evaluation/v011/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-whisky-evaluation-lab-v011/
- import先：works/ambertime-flavor-lab-v02/model.mjs works/ambertime/codea-object-art.mjs works/ambertime/experiments/reputation/v03/model.mjs works/ambertime/experiments/whisky-evaluation/v01/model.mjs
- 参照元：works/ambertime/experiments/whisky-evaluation/v02/model.mjs works/ambertime/experiments/whisky-evaluation/v02/model.test.mjs works/ambertime/experiments/whisky-evaluation/v03/memory.mjs
- 関連PR・資料：works/ambertime/experiments/whisky-evaluation/v011/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/677

### 32. AmberTime 評価 Lab 0.2（0.2）

- 表示：研究記録。保護対象：あり。
- 研究：瓶を店へ配分して実売と購入者評価を確かめ、回収・再配置と次の一本へつながる販売循環を試す。
- 結果：瓶の配分、実売、購入者評価、回収・再配置を独立Labで接続した。経営全体の成立や作者の体験評価は未確認。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/whisky-evaluation/v02/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-whisky-evaluation-lab-v02/
- import先：works/ambertime-flavor-lab-v02/model.mjs works/ambertime/codea-object-art.mjs works/ambertime/economy-parameters.mjs works/ambertime/experiments/hand-and-place/v073/draft.mjs works/ambertime/experiments/whisky-evaluation/v01/model.mjs works/ambertime/experiments/whisky-evaluation/v011/model.mjs works/ambertime/lab-flavor.mjs works/ambertime/market-sales.mjs works/ambertime/model.mjs works/ambertime/pixel-symbols.mjs
- 参照元：works/ambertime/experiments/whisky-evaluation/v03/model.mjs works/ambertime/experiments/whisky-evaluation/v03/model.test.mjs works/ambertime/experiments/whisky-evaluation/v03/results.test.mjs works/ambertime/experiments/whisky-evaluation/v03/run.mjs
- 関連PR・資料：works/ambertime/experiments/whisky-evaluation/v02/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/678

### 33. AmberTime 評判 Lab 0.3（0.3）

- 表示：現役。保護対象：あり。
- 研究：店が前の一本の実売と評価を覚え、次の商品への受け止め方が変わるかを試す。
- 結果：実売と購入者評価から店別の記憶を残し、次の商品への店側の反応を変える独立モデルを作成した。購入者評価には記憶補正を戻さない。
- 本編採用：記憶・支持・期待モデルは本編未移植（本編接続資料#703）。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/whisky-evaluation/v03/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-whisky-evaluation-lab-v03/
- import先：works/ambertime/codea-object-art.mjs works/ambertime/experiments/whisky-evaluation/v011/model.mjs works/ambertime/experiments/whisky-evaluation/v02/model.mjs works/ambertime/pixel-symbols.mjs
- 参照元：works/ambertime/experiments/whisky-evaluation/v04-visual/app.mjs works/ambertime/experiments/whisky-evaluation/v04-visual/independent.test.mjs works/ambertime/experiments/whisky-evaluation/v04-visual/run.mjs works/ambertime/experiments/whisky-evaluation/v04-visual/scene.mjs works/ambertime/experiments/whisky-evaluation/v04-visual/scene.test.mjs works/ambertime/experiments/whisky-evaluation/v04-visual/timeline.mjs works/ambertime/experiments/whisky-evaluation/v04-visual/timeline.test.mjs works/ambertime/experiments/whisky-evaluation/v05-map/app.mjs works/ambertime/experiments/whisky-evaluation/v05-map/independent.test.mjs works/ambertime/experiments/whisky-evaluation/v05-map/map.mjs works/ambertime/experiments/whisky-evaluation/v05-map/map.test.mjs works/ambertime/experiments/whisky-evaluation/v05-map/replay.test.mjs works/ambertime/experiments/whisky-evaluation/v05-map/run.mjs
- 関連PR・資料：works/ambertime/experiments/whisky-evaluation/v03/REPORT.md / works/ambertime/design/map-sales-028/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/681

### 34. AmberTime 視覚 Lab 0.4（0.4）

- 表示：研究記録。保護対象：あり。
- 研究：店頭の瓶と過去に好まれた一本の記録を、3種類の店内情景で比較する。
- 結果：店頭の瓶と過去に好まれた一本を3案で比較する店内情景を作成した。体験評価は未確認。
- 本編採用：店内情景は本編未移植（本編接続資料#703）。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/whisky-evaluation/v04-visual/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-whisky-visual-lab-v04/
- import先：works/ambertime/codea-object-art.mjs works/ambertime/experiments/whisky-evaluation/v03/model.mjs works/ambertime/experiments/whisky-evaluation/v03/scenarios.mjs works/ambertime/pixel-symbols.mjs
- 参照元：works/ambertime/experiments/whisky-evaluation/v05-map/app.mjs works/ambertime/experiments/whisky-evaluation/v05-map/map.test.mjs works/ambertime/experiments/whisky-evaluation/v05-map/replay.test.mjs works/ambertime/experiments/whisky-evaluation/v05-map/run.mjs
- 関連PR・資料：works/ambertime/experiments/whisky-evaluation/v04-visual/REPORT.md / works/ambertime/design/map-sales-028/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/687

### 35. AmberTime マップ Lab 0.5（0.5）

- 表示：現役。保護対象：域外static import元としては未検出。
- 研究：売上・残数・前の一本の記録を、数字・印・数字と反応の3案で地図へ表示する。
- 結果：A数字・B印・C数字＋反応を切替比較。100シード・1,200履歴で既存v03との一致を確認した。
- 本編採用：C案の表示を本編の正式記録へ読取専用で接続（#703）。Labの評判モデルは移植しない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/whisky-evaluation/v05-map/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-whisky-map-lab-v05/
- import先：works/ambertime/codea-object-art.mjs works/ambertime/experiments/whisky-evaluation/v03/model.mjs works/ambertime/experiments/whisky-evaluation/v03/scenarios.mjs works/ambertime/experiments/whisky-evaluation/v04-visual/timeline.mjs works/ambertime/experiments/world-map/v01/map.mjs works/ambertime/pixel-symbols.mjs
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime/experiments/whisky-evaluation/v05-map/REPORT.md / works/ambertime/design/map-sales-028/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/691

### 36. AmberTime 世界マップ Lab 0.1（0.1）

- 表示：研究記録。保護対象：あり。
- 研究：蒸留所・近所・町・周辺・全国・地球の6段階で、口コミの広まりと地図の見せ方を比較する。
- 結果：蒸留所・近所・町・周辺・全国・地球の6段階を比較した。
- 本編採用：map.mjsを本編world-map-view.mjsが直接使用（#604、描画更新#605〜#607）。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/world-map/v01/index.html
- 登録入口：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-world-map-lab/
- import先：域外static importなし（HTML/font等は別）
- 参照元：works/ambertime/experiments/whisky-evaluation/v05-map/map.mjs works/ambertime/experiments/whisky-evaluation/v05-map/map.test.mjs works/ambertime/experiments/whisky-evaluation/v05-map/run.mjs works/ambertime/world-map-view.mjs
- 関連PR・資料：https://github.com/SukimaStock/yumaniwa-town-staging/pull/607 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/606 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/605 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/602 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/600

### 37. AmberTime · カットと味の比較Lab（比較版）

- 表示：現役。保護対象：あり。
- 研究：採取区間による味の違いと、3種類の採取バー・グラスの表示を比較する。
- 結果：3種類の採取バー・グラスと採取区間を比較。固定34.35L案も比較条件として残した。
- 本編採用：バー・グラス誘導を#742/#743以降で採用。
- 見送り・保留：固定34.35Lは本編未採用。正式な不採用決定と同義にはしない。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-cut-lab/index.html
- import先：works/ambertime-flavor-lab-v02/model.mjs works/ambertime/distill-tool-input.mjs works/ambertime/distill-tools-view.mjs works/ambertime/economy.mjs works/ambertime/experiments/market-design/v01/run.mjs works/ambertime/experiments/town-simulation/v01/model.mjs works/ambertime/lab-flavor.mjs works/ambertime/market-sales.mjs works/ambertime/model.mjs works/ambertime/partner-orders.mjs works/ambertime/room-object-art.mjs works/ambertime/shop-demand.mjs works/ambertime/shop-model.mjs
- 参照元：works/ambertime/tests/distill-cut-bar.test.mjs
- 関連PR・資料：works/ambertime/design/cut-main/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/741

### 38. AmberTime 仕込みと熟成 Lab 0.2（0.2）

- 表示：研究記録。保護対象：あり。
- 研究：手札と採取区間で原酒の個性を造り、樽で熟成させて好きな時点で瓶詰めする流れを試す。
- 結果：手札と採取で個性を造り、樽で熟成し、任意の時点で瓶詰めするモデルを試した。
- 本編採用：本編lab-flavor.mjsがmodel.mjsを使用し、town閉包がbridge.mjsを使用。Lab専用保存は本編保存にしない。
- 見送り・保留：第2段階は当時の対象外。Lab全画面の採用判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-flavor-lab-v02/index.html
- import先：works/ambertime/experiments/town-simulation/v01/model.mjs
- 参照元：works/ambertime-cut-lab/projection.mjs works/ambertime/experiments/hand-and-place/v01/model.mjs works/ambertime/experiments/hand-and-place/v02/model.mjs works/ambertime/experiments/hand-and-place/v03/model.mjs works/ambertime/experiments/hand-and-place/v04/model.mjs works/ambertime/experiments/shop-expansion/v01/model.mjs works/ambertime/experiments/shop-expansion/v02/model.mjs works/ambertime/experiments/town-simulation/v01/app.mjs works/ambertime/experiments/town-simulation/v01/model.mjs works/ambertime/experiments/whisky-evaluation/v01/model.mjs works/ambertime/experiments/whisky-evaluation/v011/run.mjs works/ambertime/experiments/whisky-evaluation/v02/model.mjs works/ambertime/lab-flavor.mjs works/ambertime/tests/adjust-b.test.mjs works/ambertime/tests/adjust-c.test.mjs works/ambertime/tests/stage4-flavor.test.mjs
- 関連PR・資料：works/ambertime-flavor-lab-v02/REPORT.md / https://github.com/SukimaStock/yumaniwa-town-staging/pull/591 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/590 / https://github.com/SukimaStock/yumaniwa-town-staging/pull/588

### 39. AmberTime 言葉を育てる Lab 0.1（0.1）

- 表示：要確認・通常表示維持。保護対象：域外static import元としては未検出。
- 研究：カード選択・抽出・熟成を通して、ウイスキーを表す言葉が育つ仕組みを試す。
- 結果：比較結果と作者による体験評価は未確認。実験条件と検証資料を保持している。
- 本編採用：本編への採用状況は未確認。過去のREPORTの記述を現在の採用判断へ読み替えない。
- 見送り・保留：正式な不採用・継続終了の判断は未確認。
- 実体URL：https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime-word-crafting-lab/index.html
- import先：域外static importなし（HTML/font等は別）
- 参照元：域外static import未検出（URL参照は別）
- 関連PR・資料：works/ambertime-word-crafting-lab/REPORT.md

## 本編の保護依存7ファイル

本編からの入口とqueryを保持する。実体・名称・import先の移動、複製、改名は行わない。

| ファイル | 直接の参照元 |
| --- | --- |
| `experiments/reputation/v03/model.mjs` | town-simulation v01、reputation v05 core/model |
| `experiments/reputation/v05/core.mjs` | town-simulation v01、v05 model |
| `experiments/reputation/v05/model.mjs` | town-simulation v01 |
| `experiments/town-simulation/v01/model.mjs` | 本編town-connection.mjs（`?v=stage4-r2`） |
| `experiments/world-map/v01/map.mjs` | 本編world-map-view.mjs |
| `../ambertime-flavor-lab-v02/model.mjs` | 本編lab-flavor.mjs、同Lab bridge.mjs |
| `../ambertime-flavor-lab-v02/bridge.mjs` | town-simulation v01（`?stage3=1`） |

これらは正式計算・旧保存再生の実行閉包に属する。保護分類はLab画面全体の採用を意味しない。本編testsのaroma 560区間比較とmarket-salesソース一致oracleも保持する。旧本編入口19件は原典一覧を維持し、今回編集しない。
