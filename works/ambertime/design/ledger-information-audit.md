# AmberTime — 帳面・記録・世代交代の情報整理監査

2026-10-21 / 調査基準: main `c92e121331b31766e6596c886671324d99b4fa4d`（PR #562）。**監査と設計のみ。本編・UI・保存形式は変更していない。** 参照リンクはこのSHAへ固定した。

提案は、帳面を「仕込み／樽と熟成／発売／取扱店」の4入口に整理し、同じ発売回・樽の詳細を共用すること。普段の作業状態は各部屋と担当者画面に残し、世代交代ではその代に実行した仕事と引継ぎを短く示す。画面から外す情報も、計算・保存に必要な記録は保持する。[U1] [U2] [U3] [P1]

## 1. 現行情報とA〜Dの分類

**A＝帳面で見返す、B＝通常表示しない内部記録、C＝世代の振り返り、D＝重複表示の統合。** Dは表示の扱いであり、データの削除指定ではない。HUD・部屋・担当者画面の現在情報は維持する。これらをBに分類する場合も、帳面へ同じ現在値を複写しないという意味で、操作画面から隠す提案ではない。A/Cの根拠も保存または既存操作から再構成する。Bの派生キャッシュは現行どおり非保存とし、新しい保存台帳にしない。[P1] [H]

| 情報・現在記録している内容 | 現行表示／いつ見るか | 計算・判定・保存の用途 | 重複・越代後の必要性／分類案 |
| --- | --- | --- | --- |
| 年月・当主・資金、時間操作 | HUD／現在の操作判断 | `core.month/cash`、`generations.active`、セッションの経過時間 | 現在値を帳面へ再掲しない。過去の引継値とは別。B、引継時点のみC。[U3] [G] [U7] |
| 累計売上・維持費、直近月の本数・売上 | 帳面の冒頭、販売用DOM、時間表示用DOM／経営確認 | `core.totals/lastMonth/journal`。資金決済と照合 | 帳面冒頭の常設合計は非表示候補。発売別実績と全期間維持費は別物で、維持費表示を残すかは§6で判断。世代別は全期間累計を使わない。B+C+D。[U1] [U3] [M] [E] |
| 今月の商店注文・発送・未発送 | 帳面「年月 商店」／今月の取引確認 | `shopDemand.lastOrders`は毎月上書き。需要・既発送数量の参照 | 過去全月の注文一覧ではない。通常の帳面から外し、必要なら取扱店の現在詳細へ。B+D、越代後の全月実績には使わない。[U8] [Q] [P3] |
| 現存樽の原酒量・熟成月数・樽種・風味・蒸発 | 貯蔵庫一覧／樽詳細・試飲／今どうするか | `core.casks`、変動係数、`batchesById`。熟成・本数・価格の入力 | 現在値は樽詳細を正面とし、帳面では履歴の概要だけ。内部保持は越代必須。A+B+D。[U3] [M] |
| 試飲時の風味・文、前回からの変化、観察・手入れ・選択 | 樽詳細、試飲、帳面「熟成の記録」「これまでの一本」 | `notesById.samples/observations/choices`。比較に加え香り減衰判定にもsamplesを使用 | 重要な過去としてA、判定はB。現存樽と瓶詰済みで分断せずcaskIdで共用。越代後も保持。[U1] [T] [P4] |
| 観察済み・直前イベント・最大香り・保留判断 | 普通は非表示。一部は判断モーダル | `seen/lastEventAge/peakCharacter/pending`など。重複イベント防止・時計停止 | 見えないから不要とは判断できない。B、進行中の樽とともに越代。[T] |
| 過去の手動製法、抽出位置・樽種・元樽／仕込年月 | 担当者→「製法」、元の記録／気に入った仕込みの再利用 | `recipeBook`と検証済み操作からの`manualSources`。再依頼元を特定 | A「仕込み」へ入口を追加し、担当者側は同じ詳細への近道。越代保持。A+B+D。[U2] [R] [P5] |
| 樽同士・前の発売回との比較 | 樽／商品詳細、帳面の比較ボタン | 既存の試飲・発売・実納品と`nearbyComparisonFacts`から表示用に派生 | 組合せ・閲覧履歴は一時状態で、独立した比較ログはない。既存記録と導線をAに残す。比較ログの新設は今回提案しない。[U2] [N] [P1] |
| ブランド名・瓶・ラベル・評判・発売回数 | 初回瓶詰め、商品、帳面のブランド詳細、歩み | `brands/brandIdentity`と小売実績。デザイン継続・評判・店条件 | 一つのブランド概要へ集約。旧保存の既存ブランドは保持。A+B+D、ブランドは越代して育つ。[U1] [U4] [P2] [B] |
| 発売回ID・瓶詰年月・本数・熟成・価格・販売状態 | 販売室、商品詳細、「ブランドと発売」「これまでの一本」、歩み | `releases`と`productsById/core.products/records`。価格・在庫・来歴 | A「発売」の1発売回1詳細へ。完売後も必要。親樽と発売回は別IDを保つ。A+B+D。[U1] [U3] [U4] [P2] |
| 発売回別の小売本数・小売売上／店への実納品・入金 | 商品詳細、発売・瓶詰記録、ブランド／店履歴、比較 | `releases.sold/revenue`と`shop.deliveries`。二重計上しない | A「発売」はチャネル別概要、A「取扱店」は店との履歴。明細を複写せず相互参照。B+C+Dも担う。[U1] [N] [P2] [P6] |
| 発売回と親樽・仕込batchの関係、部分瓶詰め | 各詳細の元の記録、世代の最後の樽表示 | `releaseId/productId/caskId/batchId`。同じ樽から複数発売を識別 | Aの関連リンク、Bの来歴、Cの仕込者／実行者区別。樽単位に発売をまとめて消さない。[P2] [P4] [N] |
| 取扱開始月・実納品日／量／単価／入金・取引の継続 | 帳面ブランド詳細、歩みの店別、取扱店画面 | `shop.relations/deliveries`。月内受入・既納品・取扱関係の判定 | A「取扱店」に開始・累計・直近実納品、詳細は必要時。全期間の取引として越代保持。A+B+C+D。[U1] [U5] [S] [H] |
| デパートの相談・翌月納品待ち・実採用 | 商品／取扱店、ブランド履歴、歩み | `interests/pendingDelivery/seenSources/adoptions`と実納品ID | 進行中は店画面、実採用はA/C。相談・承認と売上を分ける。同じ5本を二重表示・加算しない。B+Dも該当。[U1] [U5] [D] [P6] |
| 申し出・通知・承認・見送り、旧卸売・特別注文 | 申し出画面、歩みの取引出来事、一部旧記録 | 現offer/待機列/再提案時期とoperations。旧`trade.history`は上限あり | 通常はB。実取扱開始など意味のある成立事実だけC。台詞の将来材料として保持。見送りを常設失敗一覧にしない。[P7] [H] |
| 担当者の解放・雇用・給与・依頼元・残回数・進行 | 担当者画面、蒸留室／樽の状態表示 | `staff/progression/experience/usual`。解放・給与・再仕込み | 現在の管理は担当者画面。Aは元製法への参照に限定。雇用等の節目をCに使うかは保留。越代保持。B+D。[U6] [P5] |
| 瓶詰予約の時期／在庫条件・停止・順番・エラー、直近作業 | 担当者／樽／瓶詰め画面、予約アイコン | 予約status/order/armed/lastMonth等と`automation.lastBottlings/lastShipments` | 実行順・二重実行防止に必要。直近作業配列は毎月上書きで全履歴ではない。B。発売／納品という完了結果だけA/Cへ。[U6] [P3] |
| 蒸留所の歩み／世代期間・契機・最後の仕込み・引継ぎ | メニュー「歩み」、強制的な世代振り返り | `generations`と操作再実行から作る非保存の`history.events` | 全年表を毎回の振り返りへ流し込まない。Cの概要から必要時に既存の歩みへ。年表自体は残す。Aの参照+B+C+D。[U9] [H] [G] |
| seed・origin・operations・復元検証、UIの選択状態 | 前者は非表示、保存エラー時のみ案内。後者は一時的 | seed+origin+操作列から再演算し保存状態と完全一致を検証。モーダル／比較選択／historyDataは非保存 | 保存用の「操作の帳面」とプレイヤーの帳面を混同しない。操作はBで越代必須。一時表示を新しく保存しない。[P1] [U7] |

## 2. 統合・非表示の候補

1. **「ブランドと発売」＋「これまでの一本」を「発売」へ統合。** 月・樽・熟成・本数・販売数・売上・比較ボタンは同じ発売詳細を開く。旧卸売専用で`releases`にない`records`も由来を区別して残し、IDがない記録を黙って落とさない。[U1] [P2] [H]
2. **「熟成の記録」は「樽と熟成」へ。** 現存樽のnotesだけを一覧源にすると瓶詰済みの履歴が消える。瓶詰記録の試飲スナップショットや再構成できる事実も同じ樽の詳細へつなぐ。原文・試飲順・風味値を保持し、同じ文の重複表示だけを除く。[U1] [P4] [H]
3. **ブランド詳細と歩みの店別一覧にある全店履歴は「取扱店」の詳細へ集約。** 商品／ブランド／年表からはリンクし、累計納品を二度加算しない。取扱開始、初回実納品、直近納品、継続月数を同義にしない。[U1] [U5] [H] [S]
4. **今月の注文・未発送、採用費・給与・予約状態は通常の帳面から外す。** 現在の作業判断をする画面に残す。月次の通常売上・発送・入金の大量一覧も帳面の主一覧に足さない。現在の「歩み」も全月の小売ログではない。[U6] [U8] [H]
5. **ブランド概要は「発売」の上部に一度。** 名前・デザイン・既存の短い評判表現を見せる。繰り返しのブランド紹介・全期間の数値カード、新たなブランド管理は増やさない。[U1] [B]

これらは表示案であり、保存された`records`や文章、`operations`、`releases`を結合・削除する指示ではない。[P1]

## 3. 帳面の構成案

既存モーダルの寸法・ドット絵・枠・余白を保ち、最初は4つの入口だけを表示。一覧は短い概要、詳細は選んだ1件に限定する。新しい常設タブや管理ダッシュボードは追加しない。次表は画面案であって未実装。[U1] [U2]

| 入口 | 一覧の概要 | 詳細・既存操作への接続 |
| --- | --- | --- |
| 仕込み | 保存製法名／元樽／仕込年月。前回の手動仕込みも残す | 抽出位置、樽種、元の原酒・仕込者。既存の製法比較・元記録・「製法を選ぶ」→担当者への依頼確認へ。依頼できない条件と戻り先／フォーカスを維持。[U2] [P5] [R] |
| 樽と熟成 | 樽番号／仕込年月／現存か瓶詰済みか／直近の記録時熟成月数 | 試飲・観察・手入れの時系列、前回の試飲との差、関連する発売回。現存樽では既存の試飲・樽比較へ。消費済み樽を再試飲できるかのように見せない。[U1] [U3] [N] |
| 発売 | 発売年月＋元樽番号／瓶詰本数／販売状態。日付だけで同月の部分瓶詰めを同一視しない | 1 releaseIdにつき1詳細。本数、瓶詰時熟成・風味、現在／履歴の価格、小売と店納品を区別した累計、関連樽、前の発売との比較。旧保存の不明在庫・販売期間を推定で補わない。[P2] [N] |
| 取扱店 | 取扱開始年月／累計実納品本数／直近の実納品年月 | 店別の取引履歴と関連発売へのリンク。デパートは実採用を通常納品と区別。申し出への回答や予約取消などの管理は既存の店画面へ。[U5] [H] [D] |

「原料条件」は現行で存在する量・抽出位置・樽種・原酒プロフィールまでに限定する。原料・酵母等の個別選択履歴はなく、製法に未実装の項目を作らない。64件の保存製法を変更せず、手動仕込み元の導出と再依頼を維持する。[R] [P5]

一覧間はデータを複写せず`caskId/batchId/releaseId/productId/shopId/brandId`で参照する。部分瓶詰めは「樽1件→発売複数件」。既存モーダルの操作ハンドラには種類による制限があるため、HTMLの移動だけで再依頼・比較を移植済みとは扱わない。[U2] [P2] [N]

## 4. 世代の振り返り案と算出可能性

帰属の推奨は**実行した代**。仕込者の由来は別に保持する。月の範囲ではなく、操作の直前の`generations.active.id`で区切る。同月に引き継いだ後の仕事は次代、先代樽の次代瓶詰めは「先代の樽／次代の瓶詰め」とする。[H] [G] [X]

| 候補 | 現行データからの可否・定義 | 振り返りでの扱い |
| --- | --- | --- |
| 仕込んだ樽数 | 完全で世代IDも確定した操作列なら可。その代の`fill/complete-usual`で増えた一意caskId。蒸留開始数や部分瓶詰回数を足さない。[H] [P5] | 主表示「仕込んだたる」 |
| 瓶詰め累計本数 | 可。その代に起きた瓶詰イベントcountを加算。自動・部分・旧卸売を含む総数かを定義し、同じproductを重複加算しない。[H] [P2] | 主表示「ビン詰め」。自動を含める推奨 |
| 販売累計本数 | 可だが`history.events`だけでは不足。各操作前後の`core.totals.bottlesSold`差分で、小売・取扱店・旧卸売を含む実販売を数える。[M] [E] [P6] | 主表示「販売」。瓶詰数とは別 |
| 最も長く熟成した樽 | 「この代に瓶詰めした最長熟成」ならage最大で可。継承した未瓶詰樽を含む「到達最長」は途中の生樽監視も必要。[H] [M] | 詳細に1件。意味の明瞭な前者を推奨 |
| 最も売れた発売回 | 可だが新しい読取専用集計が必要。その代の発売回別小売＋取扱店の増分を比較。先代発売品も対象。旧卸売専用品には発売回がない。[P2] [P6] [B] | 詳細に1件。同率は同率、0本は該当なし |
| 初めて取扱いが始まった店 | 可。実際の`shop-start`を操作順で取得。店との初回はshopIdで重複除外。取扱開始と初納品を区別。[H] [S] | 出来事。複数なら最初＋詳細へ |
| デパートの特別取扱い | 可。実納品IDに結び付いた`department-adoption`を使用。相談中・承認のみは実績にしない。[H] [D] | 出来事。通常納品と同じ5本を二重加算しない |
| 最後の仕込み | 直接参照可。`lastBatchId/lastCaskId/lastStatus/reason`。未完成・見送りを完成した樽と数えない。[G] [X] | 必ず状態を区別して短く表示 |
| 引継ぐ樽・資金 | 確認中の現在値は可。完了した過去の代は引継操作直前スナップショットを再構成。completedには残高・樽一覧を保存していない。[P8] [G] | 引継樽数・資金。必要なら樽一覧へ |

**画面案：** 世代名＋在任期間 → 仕込樽数／瓶詰本数／販売本数の3数字 → 取扱開始・特別取扱いを最大2件 → 最後の仕込み → 引継樽数・資金 → 既存の「次の代へ引き継ぐ」「蒸留所の歩み」。最長熟成・最多販売は詳細を開いたときだけ。該当なしの出来事や評価ランクは追加しない。現行画面は期間・区切り・最後の仕込みが中心で、これらの数字はまだ表示していない。[U9]

完了世代の集計は引継時点で論理的に確定し、後代の販売によって増やさない。生涯のブランド実績は別に増え続ける。「未完成で引き継いだ最後の蒸留」は先代にlastBatchIdだけ残る場合がある。現行のlastCaskId照合だけで後代完成樽へ来歴を付け直せないため、batchIdで追う設計を後で検証するか、未完成表示のままに留める。[G] [P8] [X]

## 5. 内部保持・保存・計算への注意

- **現行の保存は操作列の再生結果との完全一致を要求する。** `validateDistillery/serializeDistillery/restoreDistillery`とセッション`{version:2, game, userPaused, elapsed}`、game version20、保存キーを変更しない。UIから外した文も保存原文を書き換えない。[P1] [U7]
- **売上はチャネルを区別する。** `core.products.sold/revenue`とcore累計は店納品を含むが、`retailMirror`が店納品を差し引いた`releases.sold/revenue`は小売分。全体を見るなら小売＋実納品、旧卸売はその実決済を別に扱う。products・records・releasesを足さない。評判には現在どおり小売実績を使い、取扱店実納品を混ぜない。[P6] [B] [S]
- **recent配列を生涯／世代の正本にしない。** records12件、archive24件、商品最大32件（完売後24か月の整理あり）、journal120件、樽history12件、旧trade.history120件は刈込み対象。発売512件・実納品2048件・製法64件・操作12000件はそれぞれ現行上限を維持し、満杯対策や削除を今回へ持ち込まない。発売・納品の上限は古い行を消して続行する方式ではない。[M] [P2] [P3] [S] [R] [L]
- **旧保存は不完全さを明示。** `origin`以前の抜けた操作は再構成できず、coverage.complete=false/fromMonthがある。「記録の残る範囲」「不明」として扱い、欠損を0本・初代の仕事・推定初売日へ置き換えない。残った累計が正確でも、世代や年月への内訳が分かるとは限らない。世代導入前の手動製法源はgenerationId=nullになり得る。既存年表の初代へのフォールバック（HのL11,54）を帰属の確定根拠とせず、coverageが完全でも世代IDの欠如を別に扱う。[H] [N] [P1] [X]
- **将来の台詞材料を残す。** 実納品・取扱開始・デパート採用・申し出への対応・作業結果は既存データ／operationsを保持する。通知文字列、historyData、比較の選択、manualSourcesや販売receiptは派生・一時情報であり、同じ内容の新しい保存フィールドを作らない。[P1] [P3] [P7] [H]
- **投影と処理を分離する。** 設計実装時も、既存の検証済みnearby事実・history Worker・投影replayを使う読取専用層にする。帳面を開くたび全履歴を何度も再演算しない。世代集計はまだ実装されておらず、既存history.eventsは全月小売の台帳ではない。[P1] [P8] [H] [U9]

## 6. 判断を残す項目

| 項目 | 推奨／未決の境界 |
| --- | --- |
| 全期間の維持費・累計売上 | 発売詳細のチャネル別実績を優先。帳面冒頭の2数値を残す必要があるかは作者判断。内部core.totalsは必ず保持。[U1] [M] |
| 古い試飲と重要な比較 | 保存に残る試飲・差分は埋もれない位置へ。どの試飲を「重要」と選ぶかの新しい自動評価・お気に入り機能は作らない。欠けた過去を創作しない。[U1] [N] [H] |
| 世代の最長熟成・販売最多 | 上記の実行世代・チャネル定義を採用するか。仕込者の生涯成績と混ぜない。未完成継承の来歴は要検証。[G] [X] |
| 雇用などの節目 | 内部履歴は保持。世代振り返りへ表示する採用は今回は保留し、候補を勝手に削除済み扱いにしない。[U6] [P3] |
| 旧卸売・複数ブランドの過去 | 新規ゲームの単一ブランド設計へ見た目を揃える際も、既存セーブの過去の発売・取引を隠し切らない。保存を単一ブランドへ強制変換しない。[P2] [P7] [H] |

## 7. 次の実装を小さく分ける順序

1. **表示用の読取モデルを整える。** 既存IDの対応、チャネル別数値、coverageと不明値を共通化。モデル／保存には触れず、既存の製法・比較の元データと一致を検査。[N] [P1]
2. **発売の重複だけ統合する。** 「ブランドと発売」「これまでの一本」を1詳細へ。完売・部分瓶詰め・旧卸売の表示漏れ、前の発売との比較と戻り先を確認。[U1] [U2] [P2]
3. **仕込み／樽と熟成を整理する。** 保存製法・手動元記録・試飲履歴を4分類の入口からたどれるようにし、既存の担当者再依頼・樽比較を接続。過去樽の欠落と誤った再試飲に注意。[U2] [N] [R]
4. **取扱店へ履歴を集約する。** ブランド・年表から同じ店詳細へ。今月注文は必要なら店の現在詳細へ移し、申し出管理や自動発送は変更しない。[U1] [U5] [Q]
5. **世代の数字を追加する。** 別の小さな変更で読取専用の操作差分集計を作り、同月引継ぎ・継承樽・先代発売品・旧保存・全チャネルを確認してから少数の数字を表示。保存済み世代レコードへ集計値を足す必要は現時点でない。[G] [H] [P8] [X]

各段階は変更表示・基本操作・関連回帰・必須CIに検証を限定。現行のドット絵／UI寸法と余白を維持する。保存形式変更や履歴圧縮は別件であり、この案の前提にしない。

## 調査と確認範囲

- AGENTS.md、Change OS、EXPRESSION-AUDIT.md、現行の表示関数・各部屋投影・担当者／店／世代モーダル、保存と履歴の参照関係を確認。現在のWeb版が監査対象であり、原作Codeaの未移植機能を現行の保存項目とみなしていない。
- 独立分担で内部依存・世代帰属を照合。既存のhistory-model 10件・partners-history 5件・generation-history 2件・recipe-book 11件、計28種類のテストが成功。history-modelは両監査担当が重複実行しており、実行回数を種類数へ加算していない。[X]
- 本編のコード・UI・保存・テストは無変更。今回はソースと読取専用テストの監査であり、新UIの実画面確認、作者の採用、実機操作、将来の世代集計実装は未確認。包括的E2E・長時間プレイは対象外。formal verificationStateはUNVERIFIED。Production変更なし。
- 表現監査: 定型の評価文や新しい説明カード、実績点数・ランクは提案しない。必要な既存操作とアクセシブルな導線を残す。

## コード参照（調査SHA固定）

[U1]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/shop-app.mjs#L239-L264 "recordTimeline/maturationHistory/brandHistory/bottleRecords/brandSummary/shopHistory。帳面組立はL420,605–608"
[U2]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/shop-app.mjs#L58-L164 "比較・元製法・recipesView。入口/操作制限はL631,715–722"
[U3]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/shop-app.mjs#L550-L619 "各部屋の現在値と帳面の投影。Canvas表示はcanvas-scene.mjs L90–114"
[U4]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/shop-app.mjs#L466-L495 "瓶詰め・商品詳細・販売先・比較"
[U5]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/shop-app.mjs#L436-L455 "取扱店、申し出、納品表示"
[U6]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/shop-app.mjs#L86-L116 "担当者と予約の表示。予約状態はL347–362、進行表示はL558–581"
[U7]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/shop-app.mjs#L269-L274 "save。保存キーL25、boot復元L776–784"
[U8]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/shop-app.mjs#L772-L774 "shopOrderLedger"
[U9]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/shop-app.mjs#L169-L230 "historyView/historyShopView/generationReview。worker入口L47–55、世代モーダルL428–435"
[P1]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/partner-orders.mjs#L1096-L1119 "validateDistillery/nearbyComparisonFacts/serializeDistillery/restoreDistillery"
[P2]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/partner-orders.mjs#L783-L826 "syncReleases/brandedBottling。上限RETAIL_BRANDSはL40"
[P3]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/partner-orders.mjs#L294-L460 "予約・自動瓶詰め・自動発送。月次順序はL1025–1036、履歴上限L35,321,404"
[P4]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/partner-orders.mjs#L892 "bottleTransactionの試飲スナップショット。旧卸売はL986–995、部分瓶詰めはpartial-bottling.mjs"
[P5]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/partner-orders.mjs#L471-L529 "製法保存・依頼。手動元事実はL1040–1050,1094、fill/委任完了はL778–781,889"
[P6]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/partner-orders.mjs#L650-L716 "実納品決済/retailMirror。月次小売・卸売はL930,986–995"
[P7]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/partner-orders.mjs#L580-L597 "取扱開始・見送り。申し出生成L686–710、旧取引L861,896–914"
[P8]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/partner-orders.mjs#L1124-L1139 "createProjectionReplay/replayDistilleryOperations。引継操作L536–543"
[M]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/model.mjs#L83-L118 "商品/樽/履歴の整理、月次集計。原酒と価格はL37–73、検証はL132–143"
[T]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/monthly.mjs#L13-L73 "試飲・観察・保留判断と香り減衰検出"
[R]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/recipe-book.mjs#L1-L8 "64件の保存製法とselectedUsualRecipe"
[N]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/nearby-comparison.mjs#L1-L37 "nearbyCasks/previousRelease/releasePair/sourceDetails。チャネル・coverage・親樽参照"
[B]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/brand-reputation.mjs#L1-L41 "小売のみのブランド実績・評判・取扱条件"
[S]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/shop-model.mjs#L1-L37 "実納品/関係/上限/店条件"
[D]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/department-projects.mjs#L1-L21 "interest/seenSources/adoptionsと実納品"
[Q]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/shop-demand.mjs#L9-L40 "月次需要・lastOrders"
[G]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/generations.mjs#L1-L46 "世代期間・区切り・最後のbatch/cask・review"
[H]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/distillery-history.mjs#L1-L100 "非保存の履歴投影。操作順帰属L52–75、旧originL42–50、coverageL100"
[L]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/parallel-parameters.mjs#L2 "操作上限maxOperations。その他の上限はP2/P3/M/S/R"
[X]: https://github.com/SukimaStock/yumaniwa-town-staging/tree/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/tests "history-model.test.mjs、partners-history.test.mjs、generation-history.test.mjs、generation-model.test.mjs L27,31,37、recipe-book.test.mjs"
[E]: https://github.com/SukimaStock/yumaniwa-town-staging/blob/c92e121331b31766e6596c886671324d99b4fa4d/works/ambertime/economy.mjs#L32-L64 "現行月次販売・入金と価格。raw modelの月次販売を上書き"
