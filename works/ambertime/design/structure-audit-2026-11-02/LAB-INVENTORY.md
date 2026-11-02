# AmberTime Lab資産棚卸し・研究アーカイブ設計
基準 `23f20504f81282c5c9161995758660be092156dc`。棚卸し39項目＝experiments/index入口34＋同領域の旧版HTML2＋外置実体3。うちreputation/index.htmlはv03への転送で、旧reputationモデル群の資産単位として別項目に残す。独立した実画面は38。公開登録入口29＝転送wrapper26＋外置実体3で、転送wrapperは追加計上しない。旧本編HTML19、design直下127群は別集計。
公開URLは下表のrepository相対pathに `https://sukimastock.github.io/yumaniwa-town-staging/` を付けたもの。index.htmlは省略可能。wrapperのURLと転送先をともに保持する。

A/Bは提案であり登録statusではない。登録29入口は全active。A候補4、B候補35。Cは下記の実import元保護を重ねる。全39項目のURL・記録も削除対象外。
| 実体/入口 | 名称・目的 | 実装/更新PR（git履歴） | 推奨 | 外部依存 | 参照元 | 現在の本編採用・保護根拠 |
|---|---|---|---|---|---|---|
| `works/ambertime/experiments/cask-aroma/index.html` | AmberTime · 樽と香りの試作<br>「樽と香り」「試飲台で飲み比べる」の探索を終了。本編への採用は見送る。 | #501, #500, #498, #497 | B（研究記録候補） | 域外static importなし（HTML/font等は別） | 域外static import未検出（URL参照は別） | 見送り。REPORT冒頭に探索終了・本編不採用を明記。専用保存・URLを保持。 |
| `works/ambertime/experiments/contest/index.html`<br>公開入口 `works/ambertime-contest-lab/` | AmberTime Contest Lab 0.2<br>4樽・3人の審査・熟成待ちと消費の比較。旧v01とv02を保持。 | #532, #531 | B（研究記録候補） | `works/ambertime/model.mjs`<br>`works/ambertime/parameters.mjs`<br>`works/ambertime/partner-orders.mjs` | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/contest/v01.html` | AmberTime Contest Lab 0.1<br>4樽・3人の審査・熟成待ちと消費の比較。旧v01とv02を保持。 | #532 | B（研究記録候補） | 域外static importなし（HTML/font等は別） | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/continuous-trade/v01/index.html` | AmberTime｜取引のつづき Lab 0.1<br>独立した一画面の操作・継続取引比較Lab。元の `hand-and-place/v073` は変更しない。Stagingのみ・本編未接続。 | #650 | B（研究記録候補） | 域外static importなし（HTML/font等は別） | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/decision/index.html`<br>公開入口 `works/ambertime-decision-lab/` | AmberTime Decision Lab 0.1<br>熟成・手元資金・季節から瓶詰め時期を比較。 | #533 | B（研究記録候補） | `works/ambertime/economy-parameters.mjs`<br>`works/ambertime/economy.mjs`<br>`works/ambertime/model.mjs`<br>`works/ambertime/monthly.mjs`<br>`works/ambertime/parameters.mjs`<br>`works/ambertime/partner-orders.mjs` | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/distillation/index.html` | AmberTime · 蒸留モデル比較<br>Aは「中盤の香り」と「後半の量」に違いが出る。Bは集めた原酒の構成が、軽さ→果実→果実と穀物へ滑らかに変わる。どちらも本編への採用は未決定。数値検証で面白さを判定しない。 | #437 | B（研究記録候補）＋C（実import元） | `works/ambertime/brand-reputation.mjs`<br>`works/ambertime/character.mjs`<br>`works/ambertime/distillery-art.mjs`<br>`works/ambertime/economy-parameters.mjs`<br>`works/ambertime/economy.mjs`<br>`works/ambertime/model.mjs`<br>`works/ambertime/partner-orders.mjs`<br>`works/ambertime/partner-parameters.mjs`<br>`works/ambertime/spirit-view.mjs` | `works/ambertime/design/shop/price-audit.mjs`<br>`works/ambertime/design/stockists/parameter-audit.mjs`<br>`works/ambertime/tests/aroma-model.test.mjs`<br>`works/ambertime/tests/aroma-simulate.mjs` | aroma-extraction.mjsにmodels.mjs由来を明記（Aの抽出）。aroma-model.test.mjsの560区間比較を保護。旧B比較を正式仕様にしない。 |
| `works/ambertime/experiments/hand-and-place/v01/index.html`<br>公開入口 `works/ambertime-hand-and-place-lab/` | AmberTime 手札と場 Lab 0.1<br>新しい一本を造り、店へ出し、その製法をまた使いたくなるかを試す独立Lab。本編への採用は作者の試遊後に判断する。 | #623, #622 | B（研究記録候補）＋C（実import元） | `works/ambertime-flavor-lab-v02/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/model.mjs` | `works/ambertime/experiments/hand-and-place/v02/tests/model.test.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/hand-and-place/v02/index.html`<br>公開入口 `works/ambertime-hand-and-place-v02-lab/` | AmberTime 手札と場 Lab 0.2<br>手札と店の棚を見比べ、一枚を出すと場が変わり、その場を見て次を選べるかを試す独立Lab。本編への採用と楽しさは作者の試遊で判断する。 | #624 | B（研究記録候補）＋C（実import元） | `works/ambertime-flavor-lab-v02/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v01/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/model.mjs` | `works/ambertime/experiments/hand-and-place/v03/tests/model.test.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/hand-and-place/v03/index.html`<br>公開入口 `works/ambertime-hand-and-place-v03-lab/` | AmberTime 手札と場 Lab 0.3<br>取扱いの成立と、店主自身の好みを分けた独立Lab。紹介した一本にどんな返事が返り、それを見て次を試したくなるかを確かめる。反応の数や取扱い成功率で楽しさを認定しない。 | #625 | B（研究記録候補） | `works/ambertime-flavor-lab-v02/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v02/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/model.mjs` | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/hand-and-place/v04/index.html`<br>公開入口 `works/ambertime-hand-and-place-v04-lab/` | AmberTime 手札と場 Lab 0.4 — 店からの注文<br>店の注文を選び、手札を渡すと在庫が減る。渡した一本と店に残った分から、次の注文が変わる独立Lab。手動で渡す体験が分かりやすく、また造る理由になるかを作者が試す。 | #626 | B（研究記録候補）＋C（実import元） | `works/ambertime-flavor-lab-v02/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/model.mjs` | `works/ambertime/experiments/hand-and-place/v05/app.mjs`<br>`works/ambertime/experiments/hand-and-place/v05/tests/scenarios.mjs`<br>`works/ambertime/experiments/hand-and-place/v05/tests/view.test.mjs`<br>`works/ambertime/experiments/hand-and-place/v06/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v06/tests/model.test.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/hand-and-place/v05/index.html`<br>公開入口 `works/ambertime-hand-and-place-v05-lab/` | AmberTime 手札と場 Lab 0.5 — 時間と店の動き<br>v04の注文・納品・時間・再仕込みは変えず、同じ出来事をA数字／B瓶／C短い動きで見比べる独立Lab。Bを初期表示にした。Bだけで伝わるか、Cが必要かは作者の試遊で判断する。 | #627 | B（研究記録候補） | `works/ambertime/experiments/hand-and-place/v04/model.mjs` | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/hand-and-place/v06/index.html`<br>公開入口 `works/ambertime-hand-and-place-v06-lab/` | AmberTime 手札と場 Lab 0.6 — 在庫の行き先と自由な取引<br>自家販売へ回した分だけが自動で売れ、店へ渡す一本と量は自分で決める。Cでは未販売の配分を戻して考え直せる。注文を処理し続けるゲームにならず、行き先を選ぶ楽しさが残るかを試す独立Lab。 | #628 | B（研究記録候補）＋C（実import元） | `works/ambertime/experiments/hand-and-place/v04/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/model.mjs` | `works/ambertime/experiments/hand-and-place/v07/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v07/tests/model.test.mjs`<br>`works/ambertime/experiments/hand-and-place/v07/tests/scenarios.mjs`<br>`works/ambertime/experiments/hand-and-place/v072/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v072/tests/model.test.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/hand-and-place/v07/index.html`<br>公開入口 `works/ambertime-hand-and-place-v07-lab/` | AmberTime 販売室 Lab 0.7<br>v06 Cの自由な行き先選択を、AmberTime本編の瓶棚・部屋・小窓で操作する独立Lab。棚から瓶を選び、行き先と量を確認する。Cでは、本人が選んだ自家販売の未販売分を一度の確定で店へ渡せる。 | #656, #655, #629 | B（研究記録候補）＋C（実import元） | `works/ambertime/canvas-layout.mjs`<br>`works/ambertime/cask-glass-art.mjs`<br>`works/ambertime/experiments/hand-and-place/v06/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/model.mjs`<br>`works/ambertime/font-loader.mjs`<br>`works/ambertime/pixel-symbols.mjs`<br>`works/ambertime/room-object-art.mjs` | `works/ambertime/experiments/hand-and-place/v071/app.mjs`<br>`works/ambertime/experiments/hand-and-place/v072/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v072/tests/model.test.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/hand-and-place/v071/index.html`<br>公開入口 `works/ambertime-hand-and-place-v071-lab/` | AmberTime 販売室 Lab 0.7.1<br>v07のゲーム処理を直接読み込み、棚と小窓の表示だけを減らした独立Lab。本編・v01〜v07・保存形式・Productionは変更していない。基準mainは `19b4bfd8bda2ae5b01ce50fda172158a6f4ba6d3`（PR #629）。実装前にFull Plan Lockを固定した。 | #632, #630 | B（研究記録候補） | `works/ambertime/canvas-layout.mjs`<br>`works/ambertime/cask-glass-art.mjs`<br>`works/ambertime/experiments/hand-and-place/v07/model.mjs`<br>`works/ambertime/font-loader.mjs`<br>`works/ambertime/pixel-symbols.mjs`<br>`works/ambertime/room-object-art.mjs` | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/hand-and-place/v072/index.html`<br>公開入口 `works/ambertime-hand-and-place-v072-lab/` | AmberTime 販売室 Lab 0.7.2<br>基点は `abd0b1d42099318b71836136b03d324611bb9fd1`（v071公開後のmain）。新しい発売回を開き、自家販売に残す数・2店へ今回渡す数を一度に決める独立Staging実験。本編への統合・Production変更は行わない。 | #633 | B（研究記録候補）＋C（実import元） | `works/ambertime/canvas-layout.mjs`<br>`works/ambertime/cask-glass-art.mjs`<br>`works/ambertime/experiments/hand-and-place/v06/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v07/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/model.mjs`<br>`works/ambertime/font-loader.mjs`<br>`works/ambertime/pixel-symbols.mjs`<br>`works/ambertime/room-object-art.mjs` | `works/ambertime/experiments/hand-and-place/v073/app.mjs`<br>`works/ambertime/experiments/hand-and-place/v073/tests/draft.test.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/hand-and-place/v073/index.html`<br>公開入口 `works/ambertime-hand-and-place-v073-lab/` | AmberTime 販売室 Lab 0.7.3<br>基点main：`f71a0cd7895b23e5d39e0fccfe0153da010e8f80`（PR633）。v072の数値配分と同じ結果を、量を選び、瓶の行き先をタップして仮置きする操作で比べる独立Staging Lab。本編・既存Lab・保存・Productionは変更しない。 | #634 | B（研究記録候補）＋C（実import元） | `works/ambertime/canvas-layout.mjs`<br>`works/ambertime/cask-glass-art.mjs`<br>`works/ambertime/experiments/hand-and-place/v072/model.mjs`<br>`works/ambertime/font-loader.mjs`<br>`works/ambertime/pixel-symbols.mjs`<br>`works/ambertime/room-object-art.mjs` | `works/ambertime/experiments/whisky-evaluation/v02/model.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/market-design/v01/index.html`<br>公開入口 `works/ambertime-market-design-lab/` | AmberTime 販売設計 Lab<br>味と販売先の相性、配分と販売循環、販売モデル候補の経済バランスを比較。基準mainは監査PR #666の `3031554e5e115cb1c4c0bf13715ea761646f840b`。 | #667 | A（再比較用候補）＋C（実import元） | `works/ambertime/economy-parameters.mjs`<br>`works/ambertime/economy.mjs`<br>`works/ambertime/font-loader.mjs`<br>`works/ambertime/lab-flavor.mjs`<br>`works/ambertime/partner-orders.mjs`<br>`works/ambertime/pixel-symbols.mjs`<br>`works/ambertime/room-object-art.mjs`<br>`works/ambertime/shop-demand.mjs`<br>`works/ambertime/store-market.mjs` | `works/ambertime-cut-lab/quantity/run.mjs`<br>`works/ambertime/design/map-daily/run.mjs`<br>`works/ambertime/design/map-sales-028/run.mjs`<br>`works/ambertime/design/map-stage2/run.mjs`<br>`works/ambertime/design/market-rules-adoption/validation.mjs`<br>`works/ambertime/tests/map-initial-display-browser.mjs`<br>`works/ambertime/tests/map-stable-browser.mjs`<br>`works/ambertime/tests/market-rules-model.test.mjs` | 本編market-sales.mjsとLab sales.mjsのソース完全一致をmarket-rules-model.test.mjsで保護。採用範囲はdesign/market-rules-adoption。 |
| `works/ambertime/experiments/reputation/index.html`<br>公開入口 `works/ambertime-reputation-lab/` | AmberTime Reputation Lab 0.3<br>実納品に起因する評判、店の相性、紹介経路の比較。v01入口とv03への転送を別版として保護。 | #578, #577, #576, #575, #537, #536 | B（研究記録候補）＋C（実import元） | `works/ambertime/brand-reputation.mjs`<br>`works/ambertime/department-projects.mjs`<br>`works/ambertime/economy.mjs`<br>`works/ambertime/model.mjs`<br>`works/ambertime/partner-orders.mjs`<br>`works/ambertime/shop-model.mjs` | `works/ambertime/experiments/reputation/v02/analyze.mjs`<br>`works/ambertime/experiments/reputation/v02/model.mjs`<br>`works/ambertime/experiments/reputation/v02/tests/model.test.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/reputation/v01.html` | AmberTime Reputation Lab 0.1<br>実納品に起因する評判、店の相性、紹介経路の比較。v01入口とv03への転送を別版として保護。 | #537 | B（研究記録候補） | 域外static importなし（HTML/font等は別） | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/reputation/v02/index.html` | AmberTime Reputation Lab 0.2<br>実験（`works/ambertime/experiments/reputation/v02/index.html`） · 比較数値（`works/ambertime/experiments/reputation/v02/results.json`） · 0.1の画面（`works/ambertime/experiments/reputation/v01.html`） · 0.1の報告（`works/ambertime/experiments/reputation/REPORT.md`） · 0.1の数値（`works/ambertime/experiments/reputation/results.json`） | #537 | B（研究記録候補） | `works/ambertime/economy.mjs`<br>`works/ambertime/experiments/reputation/model.mjs`<br>`works/ambertime/model.mjs`<br>`works/ambertime/partner-orders.mjs` | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/reputation/v03/index.html` | AmberTime 口コミLab 0.3<br>実納品を起点に、店別の相性・道のつながり・少量継続で結果が変わる独立モデルを作成した。**本編への採用はまだ保留**。相性と実納品由来の経路は採用候補だが、固定商品での停滞と大店集中の弱さが残った。全評価条件の達成とは扱わない。 | #576, #575 | B（研究記録候補）＋C（実import元） | 域外static importなし（HTML/font等は別） | `works/ambertime/experiments/reputation/v04/model.mjs`<br>`works/ambertime/experiments/reputation/v05/core.mjs`<br>`works/ambertime/experiments/reputation/v05/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v02/rumor.mjs`<br>`works/ambertime/experiments/town-simulation/v01/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v01/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v011/audit-baseline.mjs` | town-simulation経由で本編の実行依存。#592/#593。全ての実験仮定・表示・指標を採用した意味ではない。 |
| `works/ambertime/experiments/reputation/v04/index.html`<br>公開入口 `works/ambertime-reputation-world-lab/` | AmberTime Reputation Lab 0.4<br>土地への定着を、口コミの強さとは別の状態として計算できた。同じ本数でも、実納品の時期・好み・過去の商品記憶で関係が変わる。大店からは地域の流通圏、地元からは食文化圏へ届く。混合方針では、90年時点に別の海外文化圏へ届いた。 | #577 | B（研究記録候補）＋C（実import元） | `works/ambertime/experiments/reputation/v03/model.mjs` | `works/ambertime/experiments/reputation/v05/tests/model.test.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/reputation/v05/index.html`<br>公開入口 `works/ambertime-reputation-encounter-lab/` | AmberTime Reputation Lab 0.5<br>独立比較実験。AmberTime 0.24.3依頼。原典は 0.4 REPORT（`works/ambertime/experiments/reputation/v04/REPORT.md`）（PR #577）。正式な地図・人物・取引実績ではない。採用候補は「実納品ごとの有限な出会い機会＋発売回まで辿れる履歴」。確率・強度の数値は未採用。 | #578 | B（研究記録候補）＋C（実import元） | `works/ambertime/experiments/reputation/v03/model.mjs`<br>`works/ambertime/experiments/reputation/v04/model.mjs` | `works/ambertime/experiments/shop-expansion/v02/rumor.mjs`<br>`works/ambertime/experiments/town-simulation/v01/model.mjs` | town-simulation経由で本編の実行依存。#592/#593。全ての実験仮定・表示・指標を採用した意味ではない。 |
| `works/ambertime/experiments/shop-expansion/v01/index.html`<br>公開入口 `works/ambertime-shop-expansion-lab/` | AmberTime｜取扱店 Lab 0.1<br>食堂・路地のバー・専門酒店の既存モデルを使い、同じ一本を違う店に届ける比較ができた。果実香は食堂、煙を含む別の採取ではバー、煙・麦と1stフィルの組み合わせでは専門酒店に反応がある。どの店にも共通する最良の商品はない。店数を増やすことと、納品回数を増やすことは分けて評価する必要がある。 | #620 | B（研究記録候補）＋C（実import元） | `works/ambertime-flavor-lab-v02/model.mjs`<br>`works/ambertime/experiments/reputation/v03/model.mjs`<br>`works/ambertime/experiments/town-simulation/v01/model.mjs`<br>`works/ambertime/lab-flavor.mjs`<br>`works/ambertime/partner-orders.mjs` | `works/ambertime/experiments/hand-and-place/v01/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v01/tests/model.test.mjs`<br>`works/ambertime/experiments/hand-and-place/v02/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v03/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v04/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v04/tests/model.test.mjs`<br>`works/ambertime/experiments/hand-and-place/v06/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v07/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v072/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v072/tests/model.test.mjs`<br>`works/ambertime/experiments/shop-expansion/v02/model.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/shop-expansion/v02/index.html`<br>公開入口 `works/ambertime-shop-relationship-lab/` | AmberTime｜取扱関係 Lab 0.2<br> | #621 | B（研究記録候補） | `works/ambertime-flavor-lab-v02/model.mjs`<br>`works/ambertime/experiments/reputation/v03/model.mjs`<br>`works/ambertime/experiments/reputation/v05/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/model.mjs`<br>`works/ambertime/experiments/town-simulation/v01/model.mjs`<br>`works/ambertime/shop-demand.mjs`<br>`works/ambertime/shop-model.mjs` | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/taste-market/v01/index.html` | AmberTime｜味と店 Lab 0.1<br>販売を細かく管理する代わりに、「どんな味を造ると、どの店で受け入れられるか」を試す独立実験。 | #655 | B（研究記録候補） | 域外static importなし（HTML/font等は別） | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/taste-market/v02/index.html` | AmberTime｜味と店 Lab 0.2<br>発売回と本数を選んで特定の店へ割り当て、売れる瞬間までを同じ場所で試す独立Lab。 | #663, #660, #659, #656 | B（研究記録候補）＋C（実import元） | 域外static importなし（HTML/font等は別） | `works/ambertime/experiments/taste-market/v03/app.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/taste-market/v03/index.html` | AmberTime｜味と店 Lab 0.3<br>発売回の選択を1行、本数を1本・5本・全部の3択、店を3行にまとめた比較用Lab。通常画面は1画面に収め、記録・条件・次の味はダイアログへ移す。 | #663 | B（研究記録候補） | `works/ambertime/experiments/taste-market/v02/model.mjs` | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/town-simulation/v01/index.html`<br>公開入口 `works/ambertime-town-simulation-lab/` | AmberTime｜街と口コミの長期シミュレーター<br>既存の街・月次処理・口コミ経路を使い、到達、好みに合う反応、実納品による定着を区別する。代表3種類で広まりの違いと出来事の理由を確認したら、作者の採否を残して実装を区切る。名前Labとの接続、本編、Production、保存方式は対象外。 | #592, #590, #589, #579 | B（研究記録候補）＋C（実import元） | `works/ambertime-flavor-lab-v02/bridge.mjs`<br>`works/ambertime/experiments/reputation/v03/model.mjs`<br>`works/ambertime/experiments/reputation/v05/core.mjs`<br>`works/ambertime/experiments/reputation/v05/model.mjs` | `works/ambertime-cut-lab/audit.mjs`<br>`works/ambertime-flavor-lab-v02/bridge.test.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/tests/model.test.mjs`<br>`works/ambertime/experiments/shop-expansion/v02/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v02/rumor.mjs`<br>`works/ambertime/town-connection.mjs` | 本編town-connection.mjsからmodel.mjsを実行時import（#592/#593）。UIと全実験条件の採用は未確認。 |
| `works/ambertime/experiments/whisky-evaluation/v01/index.html`<br>公開入口 `works/ambertime-whisky-evaluation-lab/` | AmberTime 評価 Lab 0.1<br>2026-10-29。調査基準 main: `8bd15572e10b4dc51fca2c1c3cc025668719caab`。Staging専用。本編・既存Lab・保存・経済・Productionは変更しない。 | #673 | B（研究記録候補）＋C（実import元） | `works/ambertime-flavor-lab-v02/model.mjs`<br>`works/ambertime/codea-object-art.mjs`<br>`works/ambertime/experiments/reputation/v03/model.mjs` | `works/ambertime/experiments/whisky-evaluation/v011/audit-baseline.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v011/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v011/model.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v011/priority-sensitivity.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v011/results.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v011/run.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v02/model.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/whisky-evaluation/v011/index.html`<br>公開入口 `works/ambertime-whisky-evaluation-lab-v011/` | AmberTime 評価 Lab 0.1.1<br>2026-10-29。基準main：`bdb683ec07b41b9507294b81d4a37ef01e2b9556`（PR #673）。v01・本編・販売・経済・保存・Productionは変更していない。計算で確認した改善と、後続の体験Labで判断する面白さは分ける。 | #677 | B（研究記録候補）＋C（実import元） | `works/ambertime-flavor-lab-v02/model.mjs`<br>`works/ambertime/codea-object-art.mjs`<br>`works/ambertime/experiments/reputation/v03/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v01/model.mjs` | `works/ambertime/experiments/whisky-evaluation/v02/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v02/model.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v03/memory.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/whisky-evaluation/v02/index.html`<br>公開入口 `works/ambertime-whisky-evaluation-lab-v02/` | AmberTime 評価 Lab 0.2<br>2026-10-29。調査開始時のmainは `82d93017725760e9f4c441386de6ea3f267bbb80`。独立Labだけを追加し、v01・v011、本編のルール・保存形式・経済バランス、Productionは変更しない。 | #678 | B（研究記録候補）＋C（実import元） | `works/ambertime-flavor-lab-v02/model.mjs`<br>`works/ambertime/codea-object-art.mjs`<br>`works/ambertime/economy-parameters.mjs`<br>`works/ambertime/experiments/hand-and-place/v073/draft.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v01/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v011/model.mjs`<br>`works/ambertime/lab-flavor.mjs`<br>`works/ambertime/market-sales.mjs`<br>`works/ambertime/model.mjs`<br>`works/ambertime/pixel-symbols.mjs` | `works/ambertime/experiments/whisky-evaluation/v03/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v03/model.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v03/results.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v03/run.mjs` | 未確認。資料の当時記述を現行採用へ読み替えない。 |
| `works/ambertime/experiments/whisky-evaluation/v03/index.html`<br>公開入口 `works/ambertime-whisky-evaluation-lab-v03/` | AmberTime 評判 Lab 0.3<br>2026-10-29。着手時main：`6f7b63ff24c6bb339da3c4888de5070ef902e35f`。独立Lab v03を追加する。本編、v01・v011・v02、保存形式、経済バランス、Productionは変更しない。 | #681 | A（再比較用候補）＋C（実import元） | `works/ambertime/codea-object-art.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v011/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v02/model.mjs`<br>`works/ambertime/pixel-symbols.mjs` | `works/ambertime/experiments/whisky-evaluation/v04-visual/app.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v04-visual/independent.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v04-visual/run.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v04-visual/scene.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v04-visual/scene.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v04-visual/timeline.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v04-visual/timeline.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v05-map/app.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v05-map/independent.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v05-map/map.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v05-map/map.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v05-map/replay.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v05-map/run.mjs` | 店の記憶・支持・期待モデルは本編未移植（design/map-sales-028/REPORT.md）。独立Lab #681。 |
| `works/ambertime/experiments/whisky-evaluation/v04-visual/index.html`<br>公開入口 `works/ambertime-whisky-visual-lab-v04/` | AmberTime 視覚 Lab 0.4<br>2026-10-29。着手時main `577abd31b020ad614fb408873c0ff869f1f41a20`。独立Labのみ。本編・旧Labのゲームルール、評価式、保存形式、経済バランス、Productionは変更しない。画像生成AI・外部画像は使用していない。 | #687 | B（研究記録候補）＋C（実import元） | `works/ambertime/codea-object-art.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v03/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v03/scenarios.mjs`<br>`works/ambertime/pixel-symbols.mjs` | `works/ambertime/experiments/whisky-evaluation/v05-map/app.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v05-map/map.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v05-map/replay.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v05-map/run.mjs` | 店内情景は本編未移植（design/map-sales-028/REPORT.md、Lab #687）。 |
| `works/ambertime/experiments/whisky-evaluation/v05-map/index.html`<br>公開入口 `works/ambertime-whisky-map-lab-v05/` | AmberTime マップ Lab 0.5<br>2026-10-30。着手時main `f8189d08691daf59af14b0c2858bec353829db0a`。v03の販売・在庫・購入評価・店の記憶を変更せず、蒸留所側から把握する管理情報を地図へ投影する独立Lab。本編・旧Lab・保存形式・経済・Productionは変更しない。 | #691 | A（再比較用候補） | `works/ambertime/codea-object-art.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v03/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v03/scenarios.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v04-visual/timeline.mjs`<br>`works/ambertime/experiments/world-map/v01/map.mjs`<br>`works/ambertime/pixel-symbols.mjs` | 域外static import未検出（URL参照は別） | C案の表示を本編採用（design/map-sales-028/REPORT.md、Lab #691）。正式モデルは移植せず読取専用。 |
| `works/ambertime/experiments/world-map/v01/index.html`<br>公開入口 `works/ambertime-world-map-lab/` | AmberTime｜世界マップ Lab 0.1<br>蒸留所・近所・町・周辺・全国・地球の6段階の見せ方を比較。 | #607, #606, #605, #602, #600 | B（研究記録候補）＋C（実import元） | 域外static importなし（HTML/font等は別） | `works/ambertime/experiments/whisky-evaluation/v05-map/map.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v05-map/map.test.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v05-map/run.mjs`<br>`works/ambertime/world-map-view.mjs` | 本編world-map-view.mjsがmap.mjsを実行時import。#604で本編接続、#605–607等で描画更新。 |
| `works/ambertime-cut-lab/index.html` | AmberTime カット・バー比較Lab<br> | #741 | A（再比較用候補）＋C（実import元） | `works/ambertime-flavor-lab-v02/model.mjs`<br>`works/ambertime/distill-tool-input.mjs`<br>`works/ambertime/distill-tools-view.mjs`<br>`works/ambertime/economy.mjs`<br>`works/ambertime/experiments/market-design/v01/run.mjs`<br>`works/ambertime/experiments/town-simulation/v01/model.mjs`<br>`works/ambertime/lab-flavor.mjs`<br>`works/ambertime/market-sales.mjs`<br>`works/ambertime/model.mjs`<br>`works/ambertime/partner-orders.mjs`<br>`works/ambertime/room-object-art.mjs`<br>`works/ambertime/shop-demand.mjs`<br>`works/ambertime/shop-model.mjs` | `works/ambertime/tests/distill-cut-bar.test.mjs` | バー・グラス誘導を#742/#743以降へ採用（Lab #741）。固定34.35LはLab仮説で本編未採用。 |
| `works/ambertime-flavor-lab-v02/index.html` | AmberTime｜仕込みと熟成 Lab 0.2<br>対象はこのLabのみ。手札と蛇口で個性を造り、熟成で小さく変化し、好きな時点で瓶詰めできる状態までとする。Production、本編、街Lab、保存形式・キー・versionは変更しない。作者の実機確認と採否を残して第1段階の実装を閉じる。第2段階には着手しない。 | #591, #590, #588 | B（研究記録候補）＋C（実import元） | `works/ambertime/experiments/town-simulation/v01/model.mjs` | `works/ambertime-cut-lab/projection.mjs`<br>`works/ambertime/experiments/hand-and-place/v01/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v02/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v03/model.mjs`<br>`works/ambertime/experiments/hand-and-place/v04/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v01/model.mjs`<br>`works/ambertime/experiments/shop-expansion/v02/model.mjs`<br>`works/ambertime/experiments/town-simulation/v01/app.mjs`<br>`works/ambertime/experiments/town-simulation/v01/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v01/model.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v011/run.mjs`<br>`works/ambertime/experiments/whisky-evaluation/v02/model.mjs`<br>`works/ambertime/lab-flavor.mjs`<br>`works/ambertime/tests/adjust-b.test.mjs`<br>`works/ambertime/tests/adjust-c.test.mjs`<br>`works/ambertime/tests/stage4-flavor.test.mjs` | 本編lab-flavor.mjsがmodel.mjsをimport、town閉包からbridgeも使用（#592/#593）。Lab用保存を本編保存にしない。 |
| `works/ambertime-word-crafting-lab/index.html` | AmberTime｜言葉を育てる Lab 0.1<br>独立したカード選択・抽出・熟成と言葉の生成の試作。既存 AmberTime 本編へ統合しない。 | 未確認 | B（研究記録候補） | 域外static importなし（HTML/font等は別） | 域外static import未検出（URL参照は別） | 未確認。資料の当時記述を現行採用へ読み替えない。 |

## design資料全群（127）
以下は39資産項目へ加算しない。各群の全ファイルを保存対象に含め、単なる画像重複を理由に削除しない。
|群|資料入口|変更履歴PR（採用の証明ではない）|
|---|---|---|
| `aging-copy` | `works/ambertime/design/aging-copy/VERIFY.md` | #767 |
| `all-shop-flights` | `works/ambertime/design/all-shop-flights/VERIFY.md` | #749 |
| `aroma` | `works/ambertime/design/aroma/REPORT.md` | #439 |
| `bottle-shelf-wall` | `works/ambertime/design/bottle-shelf-wall/REPORT.md` | #562 |
| `bottles` | `works/ambertime/design/bottles/REPORT.md`<br>`works/ambertime/design/bottles/simulation-notes.md` | #467 |
| `bottling-policy` | `works/ambertime/design/bottling-policy/REPORT.md` | #544 |
| `bottling-roles` | `works/ambertime/design/bottling-roles/REPORT.md` | #545 |
| `brands` | `works/ambertime/design/brands/REPORT.md` | #433 |
| `brewing-panel` | `works/ambertime/design/brewing-panel/VERIFY.md` | #752 |
| `canvas-room` | `works/ambertime/design/canvas-room/REPORT.md` | #505 |
| `cask-serials` | `works/ambertime/design/cask-serials/REPORT.md` | #529 |
| `codea-cask-bottles` | `works/ambertime/design/codea-cask-bottles/REPORT.md` | #556 |
| `compact-apparatus` | `works/ambertime/design/compact-apparatus/REPORT.md` | #555 |
| `compact-three-shops` | `works/ambertime/design/compact-three-shops/REPORT.md`<br>`works/ambertime/design/compact-three-shops/department-notes.md` | #733 |
| `compact-ui` | `works/ambertime/design/compact-ui/REPORT.md` | #502 |
| `comparison` | `works/ambertime/design/comparison/REPORT.md`<br>`works/ambertime/design/comparison/long-notes.md` | #487 |
| `confirmed-brewing` | `works/ambertime/design/confirmed-brewing/VERIFY.md` | #753 |
| `copy-cleanup` | `works/ambertime/design/copy-cleanup/REPORT.md` | #519 |
| `count-linked-delta` | `works/ambertime/design/count-linked-delta/VERIFY.md` | #750 |
| `cross-audit` | `works/ambertime/design/cross-audit/REPORT.md` | #452 |
| `cut-main` | `works/ambertime/design/cut-main/CACHE.md`<br>`works/ambertime/design/cut-main/REPORT.md` | #743, #742 |
| `cut-mark-refine` | `works/ambertime/design/cut-mark-refine/REPORT.md`<br>`works/ambertime/design/cut-mark-refine/VERIFY.md` | #745 |
| `cut-pixel` | `works/ambertime/design/cut-pixel/AUDIT.md`<br>`works/ambertime/design/cut-pixel/BROWSER.md`<br>`works/ambertime/design/cut-pixel/REPORT.md` | #744 |
| `cut-range-ticks` | `works/ambertime/design/cut-range-ticks/VERIFY.md` | #746 |
| `delegation` | `works/ambertime/design/delegation/REPORT-0211.md`<br>`works/ambertime/design/delegation/REPORT-0212.md`<br>`works/ambertime/design/delegation/REPORT-0213.md`<br>`works/ambertime/design/delegation/REPORT.md` | #541, #540, #539, #538 |
| `delivery-display-0252` | 直下MDなし。下位資料/結果/画像を保持 | #617 |
| `department-limited` | `works/ambertime/design/department-limited/REPORT.md` | #462 |
| `direct-market-fields` | `works/ambertime/design/direct-market-fields/REPORT.md` | #735 |
| `distill-visual-flow` | `works/ambertime/design/distill-visual-flow/REPORT.md` | #738 |
| `distiller` | `works/ambertime/design/distiller/REPORT.md`<br>`works/ambertime/design/distiller/economy-notes.md` | #495 |
| `event-popups` | `works/ambertime/design/event-popups/REPORT.md` | #521 |
| `first-brand` | `works/ambertime/design/first-brand/REPORT.md` | #558 |
| `flavor-feedback-0253` | 直下MDなし。下位資料/結果/画像を保持 | #618 |
| `flavor-feedback-0254` | 直下MDなし。下位資料/結果/画像を保持 | #619 |
| `flavor-types` | `works/ambertime/design/flavor-types/REPORT.md` | #496 |
| `font-uniform` | `works/ambertime/design/font-uniform/REPORT.md` | #644 |
| `formal-copy` | `works/ambertime/design/formal-copy/REPORT.md` | #643, #642 |
| `free-aging` | `works/ambertime/design/free-aging/REPORT.md` | #546 |
| `game-guide` | `works/ambertime/design/game-guide/VERIFY.md` | #754 |
| `gameplay-audit-20261023` | `works/ambertime/design/gameplay-audit-20261023/time-findings.md` | #614 |
| `generations` | `works/ambertime/design/generations/REPORT.md`<br>`works/ambertime/design/generations/comparison-notes.md`<br>`works/ambertime/design/generations/long-notes.md` | #476 |
| `gradual-glass` | `works/ambertime/design/gradual-glass/VERIFY.md` | #751 |
| `history` | `works/ambertime/design/history/REPORT.md`<br>`works/ambertime/design/history/long-notes.md` | #471 |
| `home-sale-flight` | `works/ambertime/design/home-sale-flight/EVENTS.md`<br>`works/ambertime/design/home-sale-flight/VERIFY.md` | #747 |
| `hud-controls` | `works/ambertime/design/hud-controls/REPORT.md` | #559 |
| `ledger-stage1` | `works/ambertime/design/ledger-stage1/review.md` | #565 |
| `ledger-stage2` | `works/ambertime/design/ledger-stage2/review.md` | #569, #568, #567, #566 |
| `ledger-stage3` | `works/ambertime/design/ledger-stage3/review.md` | #570 |
| `ledger-stage4` | `works/ambertime/design/ledger-stage4/review.md` | #571 |
| `ledger-view` | `works/ambertime/design/ledger-view/REPORT.md` | #523 |
| `lever-glass` | `works/ambertime/design/lever-glass/REPORT.md` | #737 |
| `map-0273` | `works/ambertime/design/map-0273/REPORT.md` | #641 |
| `map-counts-card-wrap` | `works/ambertime/design/map-counts-card-wrap/REPORT.md` | #732 |
| `map-daily` | `works/ambertime/design/map-daily/REPORT.md` | #722 |
| `map-initial-display` | `works/ambertime/design/map-initial-display/REPORT.md` | #730 |
| `map-layout` | `works/ambertime/design/map-layout/REPORT.md` | #725 |
| `map-place-selection` | `works/ambertime/design/map-place-selection/REPORT.md` | #734 |
| `map-sales-028` | `works/ambertime/design/map-sales-028/REPORT.md` | #708, #704, #703 |
| `map-stable` | `works/ambertime/design/map-stable/REPORT.md` | #739 |
| `map-stage2` | `works/ambertime/design/map-stage2/REPORT.md` | #728 |
| `market-affordance` | `works/ambertime/design/market-affordance/REPORT.md` | #669 |
| `market-balance-audit` | `works/ambertime/design/market-balance-audit/REPORT.md` | #666 |
| `market-common-feedback` | `works/ambertime/design/market-common-feedback/VERIFY.md` | #748 |
| `market-info-width` | `works/ambertime/design/market-info-width/REPORT.md` | #672 |
| `market-layout-staging` | `works/ambertime/design/market-layout-staging/REPORT.md` | #671 |
| `market-map-polish` | `works/ambertime/design/market-map-polish/REPORT.md` | #731 |
| `market-rules-adoption` | `works/ambertime/design/market-rules-adoption/REPORT.md` | #668 |
| `market-ui-organize` | `works/ambertime/design/market-ui-organize/REPORT.md` | #670 |
| `misaki` | `works/ambertime/design/misaki/REPORT.md` | #509 |
| `modal-actions` | `works/ambertime/design/modal-actions/REPORT.md` | #516 |
| `nearby-comparison` | `works/ambertime/design/nearby-comparison/REPORT.md`<br>`works/ambertime/design/nearby-comparison/performance-notes.md` | #493 |
| `offer-confirm` | `works/ambertime/design/offer-confirm/REPORT.md` | #518 |
| `operation-flow` | `works/ambertime/design/operation-flow/REPORT.md` | #547 |
| `panel-countdown` | `works/ambertime/design/panel-countdown/VERIFY.md` | #755 |
| `partial-bottling` | `works/ambertime/design/partial-bottling/REPORT.md` | #535 |
| `partners` | `works/ambertime/design/partners/BALANCE.md`<br>`works/ambertime/design/partners/DESIGN.md`<br>`works/ambertime/design/partners/FEASIBILITY.md`<br>`works/ambertime/design/partners/VERIFICATION.md` | #430, #428, #427, #425, #424 |
| `performance-0251` | 直下MDなし。下位資料/結果/画像を保持 | #616 |
| `pixel-casks` | `works/ambertime/design/pixel-casks/REPORT.md` | #503 |
| `pixel-space` | `works/ambertime/design/pixel-space/REPORT.md` | #508, #507 |
| `placement-027` | `works/ambertime/design/placement-027/REPORT.md` | #637 |
| `placement-0271` | `works/ambertime/design/placement-0271/REPORT.md` | #638 |
| `readable-copy` | `works/ambertime/design/readable-copy/REPORT.md` | #510 |
| `reputation` | `works/ambertime/design/reputation/REPORT.md` | #434 |
| `room-balance` | `works/ambertime/design/room-balance/REPORT.md` | #506 |
| `room-world` | `works/ambertime/design/room-world/REPORT.md` | #504 |
| `rooms-stage1` | `works/ambertime/design/rooms-stage1/VERIFY.md` | #756 |
| `rooms-stage2` | `works/ambertime/design/rooms-stage2/VERIFY.md` | #757 |
| `rooms-stage3` | `works/ambertime/design/rooms-stage3/VERIFY.md` | #758 |
| `sales-controls` | `works/ambertime/design/sales-controls/REPORT.md` | #522 |
| `shop` | `works/ambertime/design/shop/REPORT.md` | #445 |
| `shop-demand` | `works/ambertime/design/shop-demand/REPORT.md` | #543 |
| `shop-flow` | `works/ambertime/design/shop-flow/REPORT.md` | #450 |
| `shop-relations` | `works/ambertime/design/shop-relations/REPORT.md` | #549 |
| `shop-remarks` | `works/ambertime/design/shop-remarks/REPORT.md` | #550 |
| `small-motion` | `works/ambertime/design/small-motion/review.md` | #572 |
| `spirit` | `works/ambertime/design/spirit/README.md` | #436 |
| `staff-entry` | `works/ambertime/design/staff-entry/REPORT.md` | #517 |
| `staff-experience` | `works/ambertime/design/staff-experience/REPORT.md` | #548 |
| `staff-repeat` | `works/ambertime/design/staff-repeat/REPORT.md` | #530 |
| `start-map-ui` | `works/ambertime/design/start-map-ui/REPORT.md` | #612 |
| `status-reactions` | `works/ambertime/design/status-reactions/VERIFY.md` | #766 |
| `still-codea` | `works/ambertime/design/still-codea/REPORT.md` | #553 |
| `still-native` | `works/ambertime/design/still-native/REPORT.md` | #554 |
| `stockist-entry` | `works/ambertime/design/stockist-entry/REPORT.md` | #528 |
| `stockists` | `works/ambertime/design/stockists/ECONOMY.md`<br>`works/ambertime/design/stockists/REPORT.md`<br>`works/ambertime/design/stockists/SIMULATION.md` | #456 |
| `store-visibility` | `works/ambertime/design/store-visibility/REPORT.md` | #482 |
| `supply-demand` | `works/ambertime/design/supply-demand/REPORT.md` | #542 |
| `tasting-display` | `works/ambertime/design/tasting-display/REPORT.md` | #494 |
| `time-line-sales` | `works/ambertime/design/time-line-sales/REPORT.md` | #561 |
| `time-speed` | `works/ambertime/design/time-speed/review.md` | #574 |
| `touch-refinements` | `works/ambertime/design/touch-refinements/VERIFY.md` | #762 |
| `type-ui` | `works/ambertime/design/type-ui/REPORT.md` | #512, #511 |
| `ui-details` | `works/ambertime/design/ui-details/REPORT.md` | #551 |
| `ui-fine` | `works/ambertime/design/ui-fine/REPORT.md` | #560 |
| `ui-polish` | `works/ambertime/design/ui-polish/REPORT.md` | #515 |
| `ui-tidy` | `works/ambertime/design/ui-tidy/REPORT.md`<br>`works/ambertime/design/ui-tidy/six-refinements-review.md` | #573, #513 |
| `uniform-messages` | `works/ambertime/design/uniform-messages/MESSAGES.md`<br>`works/ambertime/design/uniform-messages/REPORT.md` | #645 |
| `usual` | `works/ambertime/design/usual/README.md` | #435 |
| `v06` | `works/ambertime/design/v06/AUDIT.md`<br>`works/ambertime/design/v06/DESIGN.md`<br>`works/ambertime/design/v06/IMPLEMENTATION.md`<br>`works/ambertime/design/v06/PARALLEL.md` | #405, #403, #402, #401, #399, #398 |
| `v07` | `works/ambertime/design/v07/ECONOMY.md`<br>`works/ambertime/design/v07/TIME-AND-VERIFY.md` | #414 |
| `v08` | `works/ambertime/design/v08/DESIGN.md`<br>`works/ambertime/design/v08/VERIFICATION.md` | #420, #416 |
| `v081` | `works/ambertime/design/v081/REPAIR.md`<br>`works/ambertime/design/v081/WAREHOUSE.md` | #420 |
| `v09` | `works/ambertime/design/v09/BALANCE.md`<br>`works/ambertime/design/v09/DESIGN.md` | #421 |
| `visual-14` | `works/ambertime/design/visual-14/REPORT.md`<br>`works/ambertime/design/visual-14/SEMANTICS.md` | #648 |
| `visual-polish` | `works/ambertime/design/visual-polish/REPORT.md` | #552 |
| `wholesale-care` | `works/ambertime/design/wholesale-care/REPORT.md` | #432 |
| `wholesale-copy` | `works/ambertime/design/wholesale-copy/REPORT.md` | #527 |

## 補助入口
experiments/distillation/report.html は比較結果表示、whisky-evaluation/v04-visual/qa.html と v05-map/qa.html はQA入口、cut-lab/audit/index.html は味分布監査表示。独立Lab数へ重複加算しない。
本編直下の旧版HTML19（index除外）は旧セーブ用の公開入口としてC。
## 採用の確証
- `design/map-sales-028/REPORT.md` は #691 C案の本編接続を明記。#681の店の記憶と #687の店内情景は移植していない。
- cut Lab #741 → 本編 #742/#743、色/印は #744–746へ継続。量34.35L固定案はLab比較条件で正式経済へ未採用。
- cask-aroma REPORT冒頭は採用見送り・探索終了・直接URLと専用保存キー維持を明記。
- hand-and-place各REPORTの「未採用」は執筆当時の状態。後続本編採用と混同しない。現在の採用対応は git履歴とdesign/placement-027、market-rules-adoption等を根拠に別途照合。
## アーカイブ設計
`data/lab-rooms.json` は配置・説明、`data/work-lifecycle.json` がidentity/path/status正本。tools/lab-renderer.cjs:readRooms は status/path をplacementに拒否、frozenはArchiveへ自動配置、未割当active/candidateをbenchへ自動追加。単にmachinesから削ると戻ってくる。
既存stored:trueは同じ部屋のdetails奥棚。研究記録の表示用途なら lifecycle凍結と分離する選択肢。現在room IDは固定7室。新研究記録室の追加はschema/generator/テストの別PRが必要。
新メタデータを設計する場合もstatusと採用判断を二重正本にしない。研究記録は現行URLへリンク、wrapper転送と旧入口は保持。frozenは作者の明示判断が必要で、研究上完了と同義ではない。
テストは本編→Lab実依存の閉包を維持。保存/ログ再生の再現テスト、参照元回帰、URL/link検査と画面比較を分け、旧版の全画面E2Eを毎回必要と先決めしない。現CI変更は本監査外。
## 本編からの保護依存閉包
`shop-app.mjs`起点のstatic import閉包は86ファイル。実験領域の7ファイルは `experiments/reputation/v03/model.mjs`、`experiments/reputation/v05/core.mjs`、同`model.mjs`、`experiments/town-simulation/v01/model.mjs`、`experiments/world-map/v01/map.mjs`、`../ambertime-flavor-lab-v02/bridge.mjs`、同`model.mjs`。この5 Lab群は正式本編の実行時依存としてC。

本編 `tests/aroma-model.test.mjs` はdistillation/models.mjsとの560採取比較、`tests/market-rules-model.test.mjs` はmarket-design/v01/sales.mjsとmarket-sales.mjsのソース完全一致を検査する。研究完了後もB＋C。

表のREPORT冒頭は各研究時点の記述。現行採用は後続本編の資料・import・PRで確認する。PR列はpathのGit履歴で確認した実装/更新番号であり、作者の採用証拠として自動流用しない。補助スクリプトはread-only解析でありrepositoryへ追加しない。

## 分類集計

|推奨|件数|C重複|
|---|---:|---:|
|A 現役再比較の候補|4|3|
|B 研究記録候補|35|21|
|C 実import参照元保護（重複）|24|—|

A4/B35/C24は上記39資産項目を単位とし、38実画面の分類件数とは区別する。C24は本編・Lab・テスト・監査スクリプトからの域外static importを含む。正式本編の実行依存5 Lab群とは異なる単位。各行の参照元で理由を確認する。全39資産項目・登録29入口（転送wrapper26＋実体3）・旧本編19入口もURL保護対象。上記は分類提案のみで、lifecycleや公開状態は変更していない。

## 旧本編入口19件（Lab数と別集計・C）

- `works/ambertime/legacy.html`
- `works/ambertime/v010-care.html`
- `works/ambertime/v010.html`
- `works/ambertime/v011.html`
- `works/ambertime/v012.html`
- `works/ambertime/v013.html`
- `works/ambertime/v014.html`
- `works/ambertime/v0152.html`
- `works/ambertime/v016.html`
- `works/ambertime/v0162.html`
- `works/ambertime/v0164.html`
- `works/ambertime/v0171.html`
- `works/ambertime/v04.html`
- `works/ambertime/v05.html`
- `works/ambertime/v06.html`
- `works/ambertime/v07.html`
- `works/ambertime/v08.html`
- `works/ambertime/v081.html`
- `works/ambertime/v09.html`

## 表示整理の推奨手順（未実装）

1. Aの再比較候補は販売設計、評価/評判v03、マップv05、カット比較の4件。最近の作業との接続と再比較用途による提案で、作者が継続中と確定した一覧ではない。B候補は手札と場の各版、旧評判、視覚v04、contest/decision、cask-aroma等35資産。採用済みと未採用/保留を同じ完了理由にしない。
2. 最初の導線PRは既存`stored:true`の奥棚を使い、通常LABから研究詳細へ辿る方式を優先する。実体・URL・モデルimport・保存keyは据え置く。未配置activeの作業台自動追加を考慮し、単に登録を外す方法は使わない。
3. 別の「研究記録」ページが必要なら、目的/結果/採用範囲/採用しなかった案/関連PR/旧Lab入口を持つ詳細へリンクする。既存7室を増やす場合はschema/generator/ナビゲーションの契約検討を別途行う。既存lifecycleのstatusを研究の進捗のために転用しない。
4. Cは実行依存・再生oracle・他Lab参照の理由を詳細にも表示する。本編が使うLab内モデルを移す作業はこの導線PRへ混ぜない。変更時のテストは依存閉包から選び、テスト削減やCI変更を先に決めない。

公開URLはfilesystem上で入口存在と転送先を確認したもので、今回38画面すべてのHTTP/ブラウザー動作確認をしたわけではない。
