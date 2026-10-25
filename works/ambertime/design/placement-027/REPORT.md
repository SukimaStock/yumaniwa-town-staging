# AmberTime 0.27 本編接続・第1段階

基点main：`8ec6e12f79d02322561ebf284c90fc3605412942`。今回は独立Labを増やさず、本編の明示opt-inだけに瓶の配分を接続した。通常起動と旧保存は引き続き従来方式。Production・既存Labsは変更しない。

## 1. 採用した仕組み

v073で試した1本/2本/その時点の仮手元の半分（切上げ）/残り全部、行先への連置、直前取消、元の配分、分け直し、最後の1確定を本編の実商品小窓へ接続した。仮置きはpure UIでdispatchも保存もしない。代表瓶1本と数だけを更新し、240msの有限motionを同targetでcancelする。hidden/close/scroll/resize/reduced-motionへ対応し、新しい時計や常時RAFを足さない。

行先は自家販売と既存の町の酒店（`town-liquor`）だけ。レストランや新店舗を作らない。「個性と仕込み」、本編の価格設定、元の製法/比較、実ブランドの瓶絵を保持した。瓶詰め後は手元に入り、配分窓を強制しない。従来の地図/担当者等の案内は残る。

## 2. 本編との差と起動

- 新方式：`works/ambertime/?placement=1`。新規ゲームを基本とする別試遊。
- 通常方式：`works/ambertime/`。旧SAVE_KEY・version20・通常操作の保存と販売/自動発送は維持。
- 試遊の保存・設定に通常URLへ戻るリンクを表示する。通常画面に新しい常設bannerは加えない。

新方式もgame.versionは20のまま、正規`enable-placement` operationによって`placement:{version:1,retailByProduct:{}}`を追加する。通常stateにはこのfieldを加えない。旧進行のコピー・移行・推測補修はしない。新modeはfresh-empty境界からのみ有効化できる。

自由配分に必要な差は新方式町酒店だけに限定した。既存brand取扱い、瓶詰めの翌月、関係開始の翌月、商品条件、既存買取価格、月10本の上限、納品帳上限は維持。一方、自家販売開始済みであることは要求しない。手元からの納品を自家販売の開始に依存させないためである。旧候補1/5/10/残数の離散量を、新町酒店だけ1〜共通quote上限の整数にする。通常qは戻りshapeも含め変更しない。

## 3. コード責務

| 正本 | 今回の責務 |
| --- | --- |
| `partner-orders.mjs` | enable/配分operation、正規replay、全state検証、共通quote、既存retail/月次/納品経路への接続 |
| `placement-mode.mjs` | modeと総stock/department確保/retail/handのpure表示 |
| `placement-draft.mjs` / `placement-ui.mjs` | 仮置きだけ。需要・金銭・ブランド・帳面を計算しない |
| `placement-save.mjs` | 独立key、両向きmode guard、厳密session境界、書込前競合検査 |
| `shop-app.mjs` | opt-in起動、本編小窓、候補保存成功後のlive state差替え |

`economy.mjs`、`shop-demand.mjs`、`shop-model.mjs`、`shop-ledger.mjs`、`ledger-view.mjs`、蒸留/風味/熟成/担当者/世代の式は変更していない。replayを読むcask-serials/nearby-comparison/cask-ledger-workerは新opcodeを同じDで再生できるようimport queryだけを更新した。関数ロジックは不変。新ゲームモデルや帳面の複製はない。

## 4. retail・manual・autoの境界

`core.products[].stock`は全未販売の物理総数。`retailByProduct[productId]`はその内の未販売自家枠。departmentの既存承認確保を除いた`available=stock-held`、`hand=available-retail`とする。欠落retail値は0なので、手動/担当者の新瓶詰めは手元。既存list操作をしても勝手にretailは増えない。

月次は既存`economicMonthly`をそのまま呼び、既存`timing.heldCounts`へ`stock-min(retail,available)`を渡す。需要/価格/端数配分/現金/維持費/評判の計算は従来通り、販売可能数だけを本人の配分に限る。その直後の自家販売数だけretail枠から減らす。自家販売を初めて配分した時は正規listingし、翌月から販売する。配分を直すたびにlistedMonthを書き換えない。

町酒店の自動発送だけを新modeで停止する。スーパーのplannerとfallback自動発送はdepartment確保＋retailをheld扱いし、手元からだけ出す。デパートも承認時にretailを使わず、承認済み5本を先にpoolから除く。樽から出す既存卸売契約/特別注文はそのまま。未接続の自動処理を全面置換しない。

## 5. brand・release・product

小窓と確定は実`brandId/releaseId/productId`の3IDを照合する。同ブランドの別年齢/発売回は別productとして選び、売切れの製法履歴は保持する。町酒店の関係は既存brand relationで、納品receiptは実際に選んだrelease/productへ帰属する。

棚はopt-inだけ実brandの短名、複数発売回がある時は第N回、使える本数を表示する。native Canvasの既存label欄へ渡し、Canvasそのものは変更しない。長名は4文字＋…、フル名と発売回/熟成年月/元の製法は小窓で確認できる。通常は従来の発売日/総stock表示のまま。

## 6. 在庫・売上・納品帳

`allocateProduct(s,{productId,releaseId,brandId,retail,shopCount})`は入力stateを変更せず、全state clone上で配分→必要なら正規listing→既存`deliverShopInto`の入金/receipt/売上/brand同期を実行する。前後のD.validateDistilleryで資金・在庫・履歴・帳面・ブランド・契約を含む全再生一致を確認してから返す。public wrapperとreplay内部transactionを分け、自己再帰で検証しない。

操作は正規`product-allocation`1件。整数/上限/確保/3ID/店舗条件の失敗でstate・参照・operationsは不変。変更なしも同じstateを返し履歴を増やさない。仮置き上限と確定条件は同じ`placementQuote(...,{retail})`。配分途中に先に回収だけ確定する経路はない。

総stockとsoldは既存保存則を使う。納品を自家販売評判へ二重算入せず、既存retail mirrorとshop ledgerを読む。retailのみの変更は既存price/listと同じ在庫操作として扱い、納品は既存quoteの試飲/卸売申し出等のgateを使う。UIから同時に別のmodal判断へ介入しない。

## 7. 保存・operations

通常：`sukimastock.ambertime.wholesale.v20`。試遊：`sukimastock.ambertime.placement-trial.v1`。地図の表示metadataもそれぞれのkeyに従う。新modeを通常keyから復元しない、通常modeを新keyから復元しない、両向きguardを置いた。

sessionは既存4field/version2、game.version20。新modeの復元はbrand designを含め推測repairをしない。読めない保存は書き換えず保護停止する。D.serialize/restoreの正規operation再生にenable/配分を含め、余分field・履歴欠落・金額/納品/配分の改変を拒否する。

UIの配分確定だけは候補D state→strict serialize→新keyの競合確認/保存成功→live game差替えの順。検証失敗や書込前競合でlive state/opsと保存は不変。quota等でsetItemが失敗しても旧gameを残して停止。書込後のreadbackに外部競合/読取障害がある時の完全なstorage rollbackは保証せず、他writerを上書きせず停止する。通常actと通常保存経路は変えない。

## 8. 実際に操作できる範囲・工程別検証

1. 設計：root独立reviewでstock総数、既存held hook、nativeD責務、町酒店のlisted非依存、modeguard、cache-reader整合を確認。Full Lock r0を実装前commit。
2. UI：本編GUIの蒸留/採取/樽詰め/熟成/初brand/既存選択肢5本瓶詰め→棚を確認。新瓶は手元5で配分窓なし。例6本は正規D操作で生成した別fixtureを使用し、瓶詰めUIの既存5/10等の選択は変えない。
3. retail：正規6本から3本配分、翌月の既存単価/需要/入金/評判/維持費・retail減・残るhandを検証。wishを放置しても蒸留/熟成/retailが進む。
4. 酒店：正規実工程で40本を2発売回から自家販売→native offer→町酒店取扱い承認→次の6本発売→翌月の合法fixture。条件緩和なし。3retail/2町酒店/1hand一括、receipt/現金/帳面、売れた後の残る未販売だけの回収/納品を確認。
5. 公開：PR必須CI/自動review完了、exact SHA Scope/Risk/Impact/Trusted Static、安全Staging merge後の配信bytes/基本操作は公開証拠コメントへ記録する。

phone Chromium幅360/375/390・高さ844で本編A〜H、1x/2x、pause、閉じる/取消/分け直し、失敗保存、main storage canary、両mode不一致の保護停止、独立worker/caskserial/nearby readerの新operation cold再生を確認。JS例外0。初期小窓は360/375で605px・390で581px、配置後653/629px、追加body scroll0、viewport内。長名/同brand異年齢2発売の棚画像をrootが目視した。物理Safari/VoiceOver/触感/発熱は未確認。

## 9. 未接続・既存失敗・検証の限界

スーパー/デパートは配分UIに置き換えていない。本編の従来UIへ「個性と仕込み」から進め、handから既存自動発送/企画承認を続ける。これは全面接続完了ではない。町酒店の「今月の希望」は既存`normalShopOrders`の現在月の純粋投影で、保存した未処理注文/期限/罰則ではない。希望と違う味/本数は新modeの共通q範囲で渡せる。需要式を増やさず、希望に正解を作らない。

newmode model15・save8・draft2の関連追加試験を含め、本編unit全921件中920成功。残る1件`wholesale-care.test.mjs`の旧fixture境界「special-order cool choices...」はbase8ec相当の未変更旧worktreeでも同じnull.idで再現した既存失敗。今回修正せず、成功へ混同しない。

旧feedback0253/0254/shop-order-viewの3テストは当時の限定UI作業としてpartner-ordersのsource byte固定を要求していた。今回の明示された正規opcode追加とは両立しないため、root確認後、この1fileの保証だけを旧mode挙動へ置換する最終scopeを固定した。他の計算/Canvas/clock/feedback/cache/RNG/source固定は維持した。機械gateや検査toolは変更しない。最初のPR635はlocalでr0→r1 chainを検証したが、trusted Gateが「変更lockは単一・fresh revision0のみ」として拒否し未mergeで閉じた。local schema対応とCI経路を混同した点を訂正し、最新baseから最終scopeを含む単一r0 lockを最初のcommitとして固定して同じ実装を再適用した。検査結果を成功に書き換えず、完了済みの関連試験は同一内容として再利用した。base8ec実コードから得た旧保存before→同月操作afterの全state/serialize完全一致で保証し、rootも別の旧worktreeでfixtureが同じ結果になることを独立確認した。

対象外スーパーの追加境界は手作りprojectionとしてplanner/heldを検査（そのprojectionを合法saveとは扱わない）。デパートは別途正規実蒸留40→65採取/24か月熟成/12本瓶詰め/native offer/retail7＋正規queue5をcold再生し、翌月7本自家販売＋5本納品・入金・adoption・receipt各1回、stock0/retail0まで確認した。通常mode既存department/スーパー回帰も成功。包括E2Eは実施しない。

## 10. 次の移行で置き換える箇所

旧saveのstockには本人がhandへ置いた分とretailへ置いた分の区別がない。将来移行時は推測で全量販売へ寄せず、旧stockの初期配分を作者が決める必要がある。既存relationsをbrandの関係として保持し、どのshopをmanualへ切り替えるか、autoとの重複回避を決める。実納品historyのbrand/release/product/金額は書換えない。

未完offer/特別注文/department pending5本/樽契約を同時に扱う時は、確保・月次順・通知の引継ぎを個別に検証する。cash/reputation/generation/担当者/既存製法履歴を初期化しない。今回の試遊keyから旧saveへ戻す移行はない。通常URLへ戻れば手を付けていない通常保存を再開できるが、試遊で進めた月/売上を旧保存へ合流することはできない。

## 11. 作者の試遊と採否

まず明示URLで新しく蒸留し、同じ製法を熟成・瓶詰めして棚から配分する。自家販売の量だけが売れるか、ブランドの取扱いを育てた後に実際の一本を酒店へ選んで渡したくなるか、残る未販売を分け直す操作が自然かを試す。同brandの違う年齢/発売回、wishに従わない選択、wishを置いて仕込みを続ける場面も見る。

rootの設計/実装/save/model/最終phone画像レビューを実施し、既存Canvasを変えずopt-in棚名と利用可能数を接続、長名と実発売回の表示を確認した。表現監査6点を確認し、不要な架空会話/mission/副題/重複結果を足していない。作者の実機評価・本編標準への採用・旧save移行・Production公開は今回の完了条件へ含めない。

関連結果：`browser-results.json`。再現：`node works/ambertime/design/placement-027/browser.cjs`、新model/save/draft試験は`node --test works/ambertime/tests/placement-*.test.mjs`。Full unitの既存1失敗と公開後の証拠はPRにも分けて残す。
