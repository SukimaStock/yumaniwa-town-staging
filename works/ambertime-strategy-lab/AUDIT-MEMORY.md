# 酒造り・担当者・世代・記憶の棚卸し

調査基準は Staging main `036df63c7fcb47373bc66f44f8fda6a4d0c9872e`。以下の参照ファイルは、特記しない限り `works/ambertime/` 内。候補ルールの必要情報と、現在の正式 v8 が検証のため要求する情報を区別する。本編、正式保存、PR #894、実プレイヤーデータは変更・使用していない。

## 1. 本編で使う経路

`shop-app.mjs` の `newNativeGame()` は `partner-orders.mjs:newShopDialogueDistillery()` を使用する。新規ゲームの最新機能境界と、保存内の過去境界を区別する。`model.mjs` や `distillery.mjs` 単独の旧経済値を、そのまま本編値として引用しない。

本編の費用は `economy-parameters.mjs` と `economy.mjs` が担当する。開始資金 £1600、蒸留 £120、維持費は月 £4＋現役樽数×£8。旧 `parameters.mjs` の開始 £4000、蒸留 £260、基本維持 £22 は、この本編経済の値ではない。樽・瓶の共通値は樽4つ、0.7 L/瓶、瓶詰め £3/本、バーボン樽 £160、リフィル樽 £100。

## 2. 現行ルールの棚卸し

| プレイヤーの判断 | 現在の計算 | ゲーム上の意味 | 関連コード | 判定 | 将来の必要情報 |
| --- | --- | --- | --- | --- | --- |
| 材料と採取範囲を選ぶ | 麦芽 plain/peat、発酵 short/long。新しい採取は collectionVersion=2。開始位置0〜87、開始から終了まで最低12step。進行99で採取完了を待ち、採取前88/採取後99でやり直せる | 量と風味を自分の操作で作る | `partner-orders.mjs:selectFlavorCards, collectionState, beginCollection, startRangeDistillation, stopDistillation, restartRangeDistillation` | 維持。今回の単純化対象外 | 現在の材料・開始/終了位置・原酒風味・残量・乱数状態。過去の全指操作は未来計算には不要候補 |
| 樽を選び熟成を待つ | `ageCask` は毎月 roughness を指数減衰、woodを増加、characterを変化、容量を蒸発。flavor v1では `ageFlavor` も適用。現役樽は最大4つ | 待つ時間、樽の個性、資金と場所の代償 | `model.mjs:fillCask, ageCask`; `monthly.mjs`; `partner-orders.mjs:prepareFlavorFill, fillBarrel` | 維持。風味計算を再設計しない | 現役樽の全計算値、熟成月、容量、variation、風味、製造/世代出自 |
| 熟成中の試飲・手入れ・瓶詰め時期を選ぶ | 現在は freeAging 境界以降、通常熟成の強制選択を解除。現役樽の notes、samples、observations から表示。費用不足時には別の進行保護がある | 熟成を自分で見守る操作を保つ | `partner-orders.mjs:enableFreeAging, careForCask`; `economy.mjs:sampleDistillery`; `monthly.mjs` | 操作維持。終了樽の詳細観察保存は単純化候補 | 現役の手入れ状態・必要な直近試飲。記憶に選んだ酒の代表観察 |
| 一部または全部を瓶詰めする | 指定整数本数×0.7 Lを引く。残量が1本未満なら樽を終了。分割時は withdrawnLitres / attributedUpkeep で量・費用を帰属。操作ごとに商品、release、結果記録を作る | 早い現金化と残樽の熟成を両立 | `economy.mjs:bottleNow`; `model.mjs:bottle`; `partner-orders.mjs:bottleTransaction, brandedBottling` | 操作は維持、内部の発売単位は再検討 | 現役在庫の数量、風味/熟成snapshot、同一酒を示すID、元樽、製造世代、費用帰属 |
| 在庫を抱える・売り切ってから次を詰める | 手動経路は `bottleBranded → bottleTransaction → E.bottleNow({count}) → M.bottle`。`directSale=false` のまま、在庫あり商品が8件なら次を拒否。自動瓶詰めも8件で「在庫待ち」 | 瓶詰めの細分化には棚と時間の制約がある | `model.mjs:bottle`; `partner-orders.mjs:automaticBottling` 周辺 | 維持。Labでも制約として扱う | 活動中の在庫単位、在庫数、受入/販売状態 |
| 手動経験後に担当者を採用する | 瓶詰めは累計手動150本。蒸留の旧自動フラグ閾値は8回だが、現行 `distillerDiscovered` は手動樽詰め6回で発見・雇用を認める。notice/hireでフラグを確定し旧replayを維持 | 経験してから任せる。瓶詰め操作の分割で経験を水増ししない | `partner-orders.mjs:STAFF_EXPERIENCE, distillerDiscovered, staffHireCheck, hireStaffWithContext, brandedBottling` | 維持。6回と互換用8回を混同しない | manualFills、manualBottles、解放/通知/雇用状態。全操作履歴は新規則の計算には不要候補 |
| 蒸留を単発・反復で依頼する | 採用 £40、実行給与 £12。記録した製法、予約状態、資金・空き樽・進行条件を検査 | 再現可能な酒造りと操作負担軽減 | `distiller.mjs:DISTILLER`; `partner-orders.mjs:staffSource, staffQuote, reserveStaffWithContext, beginUsual, completeUsual` | 維持 | 製法の採取/材料/樽、依頼状態、反復残数、資金。元製法の必要な出自 |
| 瓶詰めを担当者に任せる | 採用 £20、実行給与 £2。指定本数の瓶詰め費用＋給与、棚、条件を満たさなければ実行しない | 時期・数量の方針を任せる | `partner-orders.mjs:BOTTLING_STAFF, hireBottlingStaff, delegateBottling, automaticBottling` | 維持 | 共通方針とrevision、樽ごとの予約/一時停止/エラー、次の条件 |
| 製法を残す | 最大64件。手動観察の製法を保存し、選択した製法または usual.recipe を参照 | 過去の手応えを再現する | `recipe-book.mjs:RECIPE_BOOK, selectedUsualRecipe`; `partner-orders.mjs:saveRecipeFromSource` | 維持 | 選んだ製法・名前・必要な出自。全製造記録は不要候補 |
| 最後の仕込みと世代交代を迎える | 300か月以降に、120か月以上のブランドの再発売、36か月以上熟成の瓶詰め、開始から120か月以上の店への納品で最後の仕込みへ。360か月で期限、猶予12か月。資金停止経路もある | 経営の成果と最後の樽を次代へ渡す | `generations.mjs:GENERATIONS, advanceGeneration, fixGeneration`; `partner-orders.mjs:generationStalled` | 仕組み維持。再発売の数え方と「長い関係」の説明は再検討 | 現世代起点/段階/引継ぎ理由/最後の樽、ブランド起点、店舗起点、酒の熟成年数 |
| 次世代へ引き継ぐ | completedへ現世代を追加、新active世代を作る。資金、樽、店、評判はリセットしない。mode付き反復予約は停止 | 同じ蒸留所の100年間として積み重ねる | `partner-orders.mjs:handoverGeneration` | 維持 | 現状態、世代境界、引継ぎ資産・成果、確定回想 |
| 店の短文を見る | 酒店は異なる納品月1/2/6で初回/反復/長い付き合い、最終納品から6か月でgap優先。スーパーは2納品月で反復、6か月でgap。正の納品だけを数える | 実績を短文で感じる | `shop-remarks.mjs:shopRemarkFacts, classifyShopRemark` | 単純で維持可能。全納品走査は集計へ変更候補 | 累計本数、異なる納品月数、最終月、契約/申し出/デパート受渡状態 |
| 過去の酒の話を聞く | 発売・初納品から24か月、既知packageFamilyの酒が記憶候補。直近2納品月の間隔12か月以上、最新が3か月以内なら再納品台詞候補 | 数十年前の酒の再登場 | `shop-dialogue.mjs:dialogueCandidates, additionalShopCandidates` | 体験維持。全発売×全納品の再走査は再検討 | 店×記憶酒の初回・直近・その前の納品月、酒の風味/外観/名前/日付 |
| 会話の頻度を体験する | 全体で月hash 1/12の機会、会話間隔9か月、同文36か月、記憶間隔36か月、記憶種別1/4。前月以前の事実だけで選ぶ。v2話者枠は酒店2・スーパー2・バー1・デパート1 | 操作を重ねても再抽選せず、店が増えても会話を過密にしない | `shop-dialogue.mjs:DIALOGUE_POLICY, shopDialogueHistory` | 頻度維持候補。全過去月再生成は再検討 | seed/方針境界、直近発話月、文別cooldown、確定した表示履歴/今後の候補 |
| 歩みで取引周年を見る | 正の納品間隔が12か月超なら継続起点reset。継続120か月ごとに10年周年 | 放置した契約を継続取引と区別する | `history-record.mjs:advanceHistoryRecord` の relationships | 維持/集計再利用候補 | 起点、最終月、累計納品/本数/売上、確定周年、起点納品の短い根拠 |
| 地域への広がりを思い出す | 到達は地域ごとの初回。問い合わせ/訪問は初回または前回から120か月以上。町levelの問い合わせ/訪問はこの歴史eventから除外。選んだeventのsource chainを保持 | 到達と反応を区別し、特別な再登場を残す | `history-record.mjs:advanceHistoryRecord` の contacts/evidence | 節目は維持、完了した詳細全履歴は再検討 | 種別×地域の初回/直近、成立原因、選んだ節目。到達だけで取扱開始にしない |
| 世代回想を見る | 現役候補から最大6場面。店/人/地域/時期の不足、世代越し、先代樽を優先し、同種/同対象の重複を減点。seed hashで同順位決定 | 異なる経営と世代のつながりを見せる | `recall/selection.mjs:selectC, linksFor, selectionSeed` | 表示体験維持、候補保持単位を再検討 | 候補となる節目、出自・因果、確定場面。全瓶詰め候補を保持する必要は別途検証 |
| 過去の確定回想を読み直す | prepare→世代交代成功→commitでcompletedへ複写。後年の候補から再選定しない | 過去の思い出が勝手に変わらない | `recall/collector.mjs:prepareRecall, commitRecall, readCompletedRecalls` | 維持 | 確定場面・文章・外観・依存事実・世代境界 |
| 保存・復元する | v8の8キーを厳密検証、game v20、正式restore、history/recall照合、serialize→正式reader→一致を確認。既存値との競合検査後setItem、readback一致後のみ成功 | 進行と記憶を壊さず継続する | `development-save.mjs:readSession, serializeSession, writeCandidate` | 今回完全維持。新候補を理由に検査を弱めない | 現行v8では既存全契約を保持。将来の新状態の必要情報とは別問題 |

### 制約上の重要な区別

- 54本を同月に1本ずつ54商品として持つ操作列は、現行の在庫あり商品8件上限で成立しない。販売して空きを作る実時間を含める必要がある。
- `directSale:true` の例外は `partner-orders.mjs` の旧卸売出荷経路にある。v20の `acceptOffer` は樽卸売を拒否する。この例外をLabの通常瓶詰めに使って上限を回避しない。
- 時間を進めて54回瓶詰めすれば残樽の熟成・蒸発も進む。元樽が54本相当なら、長期待機後も54本取れるとは限らない。「同一状態を54分割した評価器検査」と「実行可能な月次経営比較」は別に表示する。
- 世代終盤の `long-shop-delivery` は契約開始から120か月。履歴の周年は実際の納品間隔で継続を検査する。両者を同じ継続条件と説明しない。

## 3. 全発売記録が増える箇所

`brandedBottling` は操作ごとに `releases` へ追加する。`history-record.mjs` は新releaseすべてをbottling eventへ記録する。firstRelease/longestAgeという属性はあるが、重要でない発売を除外する判定ではない。

`recall/collector.mjs:accept` はfill/bottling originをすべてpinする。納品anchorにも店×銘柄×発売のキーがある。通常納品は店×銘柄×発売×48か月帯、売上は発売×48か月帯で中間候補を間引くが、発売originの増加は止めない。一方、`selection.mjs` が選ぶ回想は最大6場面/世代である。

このため分割は「表示場面を54倍必要にする」ものではないが、現行の履歴・出自保持件数を増やす。発売回数を解放実績に使う問題と、保存件数の問題は、それぞれの計算箇所で検出する。

## 4. 新候補ルールが必要とする3層

以下は将来設計の分類であり、現行v8から削除できるという判定ではない。

| 層・情報 | 将来計算に必要か | 表示・会話に必要か | 世代回想に必要か | 別データから再計算できるか | 古い全履歴を保持する必要 |
| --- | --- | --- | --- | --- | --- |
| 1 現役樽・原酒・容量・風味・熟成variation・乱数 | 必須 | 必須 | 出自のみ | 初期値と全操作なら可能だが現状態を正本とする方が明確 | 新候補計算では不要。現役状態と出自を保持 |
| 1 販売中の酒・価格・店別在庫・販売端数ledger | 必須 | 必須 | 選ばれた酒のみ | 在庫移動全列から可能だが重複保存を避ける | 現役単位は保持。完売後は成果と記憶へ |
| 1 資金・注文・契約・返品・受渡待ち | 必須 | 必須 | 成立節目のみ | 全取引から可能だが未決債務を直接保持 | 完了全明細は新候補次第。未決を削らない |
| 1 進行中口コミpacket・到達予定・重複抽選防止状態 | 必須 | 一部 | 成立経路のみ | seedだけでは既処理/未処理境界を復元できない | 完了全attemptは候補次第。将来へ影響する状態は必須 |
| 1 担当者依頼・反復残数・予約・pause・費用 | 必須 | 必須 | 特別な節目のみ | 現方針だけでは進行中予約を復元できない | 終了依頼の全履歴は不要候補 |
| 1 世代進行段階・最後の樽・期限 | 必須 | 必須 | 必須 | 月だけでは成立したtriggerを復元できない | 現段階と短いtriggerを保持 |
| 2 店舗の累計納品本数・売上・異なる納品月数 | 必須 | 必須 | 代表成果 | 増分集計可能。同月重複を防ぐlastCountedMonthも必要 | 原則不要候補。納品と販売を分けて集計 |
| 2 継続起点・最終納品月・関係段階 | 必須 | 必須 | 周年 | 更新規則と現在値で次を計算可能 | 全納品列は不要候補 |
| 2 地域の到達・関心・問い合わせ・訪問・取扱 | 必須 | 必須 | 節目 | 段階別状態、初回/直近、成立原因から更新可能 | 完了全経路は不要候補。段階を一つに潰さない |
| 2 製法・手動経験・解放・雇用 | 必須 | 必須 | 任意 | manualFills/manualBottlesは既に集計あり | 全操作列は新規則計算には不要候補 |
| 2 世代ごとの製造・瓶詰め・販売・資産総計 | 一部 | 必須 | 必須 | 増分集計と世代境界snapshot | 全操作/取引列は不要候補 |
| 3 重要な酒の風味・瓶外観・名前・熟成・樽/世代出自 | 再販売対象なら必須 | 必須 | 必須 | 風味から現行外観は生成できるが将来描画変更による同一性を検討 | 酒単位のsnapshotを保持。全試飲/選択列は不要候補 |
| 3 店×記憶酒の初回・直近・その前の納品月 | 会話条件に必要 | 必須 | 必須 | 集計更新できる。累計本数だけではreturn台詞を復元不可 | 全納品列は不要候補 |
| 3 初取引・地域節目・特別な到達と成立原因 | 一部 | 必須 | 必須 | 成果総計だけから原因を推測してはならない | 選んだ事実と必要な原因を保持 |
| 3 確定した世代回想・外観・依存事実 | 不要 | 必須 | 必須 | 再選定しない | 確定snapshotをそのまま保持 |
| 互換用の現在のoperations全列 | 現行正式codecには必須 | replay表示で使用 | 順序照合に使用 | 新状態だけから過去列を生成できない | 現行v8では保持必須。新規則設計と混同しない |

## 5. 第2段階への注意

1. **表示・会話の読取契約を先に決める。** `shopDialogueHistory` は全過去月を走査する。現在の累計だけへ置き換えると過去月時点の候補が変わり、既存の台詞や選出が変わる。新境界以降の増分発話・cooldownと、以前の確定表示を分ける設計が必要。
2. **回想の参照を切らない。** `collector.unpackFact` は `game.releases` とブランドを参照する。`assertRecall` はrelease、historyRecord、town events、operationsの順序/IDを照合する。発売を統合してから検査を緩める方式は採らない。
3. **同じ酒と別熟成の酒を分ける。** 同樽・同時点・同風味の瓶詰めで特性を共有する候補は有効。ただし熟成時点、風味、価格/外観、現役在庫、販売ledgerの扱いを具体化する。別時点の味を同じ値へ潰さない。
4. **数量と記憶を分ける。** 納品量・販売本数・手動経験は集計で進め、記憶は初酒、熟成記録、店/地域の節目に関わった酒、先代の樽などを候補にする。表示されなかった酒の最小外観まで捨ててよいかは別判断。
5. **確定した過去を再選定しない。** 既存completed回想の文章・場面・瓶・原因を保持し、新候補アルゴリズムは境界以降へ適用する。
6. **旧形式を変更しない。** 現行v8・正式reader・PR #894はそのまま。新状態の計算に全操作が不要でも、旧v8の検証契約に不要になったことを意味しない。互換設計と実装承認は次段階。

本稿はコードの静的読取に基づく。旧履歴を削除した状態での未来会話・回想・正式復元の同値性を確認した報告ではない。
