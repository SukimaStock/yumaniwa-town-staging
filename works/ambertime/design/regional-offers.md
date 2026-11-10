# 世界拡張 第2段階：問い合わせから取扱関係へ

基準：PR #902 / `7aa5c1d0df87ea516c17c639fe97daf53be49bbf`。Staging限定。第1段階の静的取引先モデルを再利用し、納品・地域販売・地図は追加しない。

## 問い合わせの意味と根拠

`tradingPartner('trial-region-desk')` にある仮地域窓口を、既存simulationの `near-wide`（周辺の流通圏、地域集約ノード）へ対応させる。この窓口は、その抽象的な流通圏で関心を持った相手からの連絡を代表する。地名・新規経路や小売店を作ったという意味ではない。元のノード・好み・確率・経路・乱数・`inquiry`から自動取引を作らないexternalモードの契約は変更しない。

`regionalInquiryEvidence` は次をすべて確認する。

- 本編external townの、`near-wide`宛の実際の`inquiry`。arrival・interest・visit・独立Labのtradeは申し出の代用にしない。
- 発売ID・商品IDが本編の発売とsimulation発売を一貫して参照し、ブランドも存在する。
- sourceIdを時系列・同一発売のまま辿り、発売と本物の発送イベントまで到達する。循環・欠落・別発売への飛び移りは拒否。
- simulation発送はnativeの`shop.deliveries`または本編自家販売由来のreceiptに対応する。正式保存全体の事実性は従来の完全リプレイ検証が保証する。

正式申し出の発行は、明示的な有効化境界以降のイベントだけを読む。有効化時点の既存問い合わせから、過去に存在しなかった申し出や契約を作らない。ブランド・酒の好みや最低熟成6か月は今後の納品条件であり、問い合わせが来たことを在庫確保・発注・実売と解釈しない。

実際の本編操作から確認した例：

| seed | 問い合わせ | 月 | 発売 | 元の事実 |
| --- | --- | --- | --- | --- |
| 3 | e331 | 126 | 4 | スーパーの実売11本、shop:3、99か月目 |
| 6 | e318 | 115 | 4 | スーパーの実売、shop:3 |

seed3の因果鎖は `e331 inquiry → e306 interest → e305 arrival near-wide → e282 arrival super → e281 shipment shop:3 → e267 release`。発売4は96か月目に瓶詰めした12か月熟成の酒。注入した問い合わせではない。seed3には133か月目に別の問い合わせe334も生じる。

## 状態・操作・互換性

既存の`shop.offer`・`shop.pendingOffers`・`shop.relations`は、既知のSHOPS・数値serial・旧自動発送・価格参照と結び付いている。ここへ未知IDを混ぜると既存店舗の生成時期や処理が変わり得るため、地域の正式状態は`game.regionalPartners`へ分離する。店舗の待ち行列・クールダウン・承諾・販売・会話は変更しない。

- `enable-regional-partners`: version/rules、開始月、イベント開始位置と読取り位置、空のoffers/contracts、declinedUntilを作る。現在の蒸留進捗と試飲も境界に記録。
- `regional-notice` / `regional-defer`: 確認済み・あとで確認の状態を保存する。pendingの申し出は失われない。
- `regional-accept`: 申し出をacceptedとし、契約開始の事実だけを追加する。在庫・資金・売上・顧客実売・口コミ・発送・世代進行は変更しない。
- `regional-decline`: 申し出をdeclinedとし、既存SHOP.declineGapと同じ12か月のクールダウンを設定する。

申し出は `regional-offer:<partnerId>:<inquiryEventId>` で一意。partnerId、regionId、nodeId、brandId、releaseId、productId、eventId、inquiryMonth、sourceReceiptId、発行月、状態を保持する。同じ問い合わせは再利用しない。pending中とクールダウン中は読取り位置を先へ進めず、次に処理できる未使用の問い合わせを残す。見送り後12か月が過ぎると、別の実際の問い合わせから再申し出できる。問い合わせが新たに届かない期間に架空の再申し出は作らない。承諾済み相手へ重複契約は作らない。

契約IDは `regional-contract:trial-region-desk`。partnerId、regionId、brandId、releaseId、eventId、sourceReceiptId、sourceOfferId、startedMonthを残す。契約は地域窓口単位で、最初の酒は成立根拠の参照として保持する。

`action('month')` が既存の`syncTown`を終えた後だけ、新しい問い合わせを確認する。取扱判断そのものではsyncTownやadvanceGenerationを再実行しない。既存4店舗のmaybeStockistOffersやsimulationの乱数は変更しない。

`newShopDialogueDistillery`など過去のcreatorは維持し、新しい`newRegionalPartnerDistillery`だけが有効化する。本編新規ゲームはこのcreatorを使う。既存v8は従来どおり復元し、installSessionで新しいenable操作を既存保存機能によって保存してから採用する。既存のバックアップ付きwriterを使い、旧境界の保存バイト列を残す。失敗すると有効化後のgameを公開しない。

正式保存は引き続きv8のゲーム本体と操作帳、同じsave-codec・serializeSession・readSession・validateDistillery。新しい状態と操作が有効化済みデータを識別する。新opcodeを理解しない古いreaderには、有効化前バックアップを使用する。旧操作の意味やv8 envelope・保存keyを変更せず、Stage5 checkpoint/tail/loadは利用しない。改竄されたイベント参照・契約・カーソル・enable境界は完全リプレイとの比較で拒否する。

## 既存の画面を使う

既存の取扱店一覧とshop-offerモーダルへ地域用の小さな分岐を追加する。名称・好みは共通モデルから読む。表示内容は好み、問い合わせ対象ブランド、「納品は準備中です。」と「受ける／あとで／断る」。新しい交渉画面や価格・配送操作は置かない。

既存店舗の重要な連絡を先に表示し、地域窓口は未確認の場合に同じ流れで開く。あとで確認する相手は既存一覧から再び開ける。契約成立後も同じ一覧で取扱関係を確認できる。SHOPS、販売棚、地図ピンには登録しない。地域の判断は既存`act` / `saveCandidate`で保存が成功してからgameへ反映し、確認通知もdialogの表示後だけ保存する。

## 検証と確認範囲

- 自然経営の5seed（1/2/3/6/42）各180か月を変更前mainの独立checkoutと比較。毎月の全native状態（地域フィールドと新opcodeだけを除外）の累積SHA256が一致。新テストにはその基準digestも固定した。120か月時点と最後に保存・復元する。
- 正例seed3/6は本編操作だけで問い合わせ発生。seed1/2/42は同じ経営で未発生。到達や関心を自動承諾しない。純粋な不正入力テストの合成projectionは正式事実と区別している。
- notice/defer/decline/cooldown/再申し出/accept/idempotence/不正ID/正式cold replayと、公式v8・履歴・回想つきroundtrip、失敗・競合・readback不一致時の未承諾を検査する。
- 既存のUIテストは新規creator名を照合する1か所だけを、今回の明示仕様に合わせて更新した。他の期待値を弱めていない。
- 独立レビューで、比較用helperが古いpartner-ordersのURLを保持して新opcodeを読めないキャッシュ経路を検出。稼働中のnearby-comparisonと本編の参照URLだけを更新し、同一モデルURLと有効化済みセーブの実読取りを回帰に追加した。
- 実ブラウザーテストは自然発生した問い合わせと有効なv8fixtureを使い、4端末幅・保留・既存店アクセス・承諾・再読込・拒否・保存失敗を対象にした。今回の実行環境ではChromiumのProcessSingleton用AF_UNIXソケット作成がEPERMとなり、ページ起動前に停止した。**実画面・ブラウザー操作・iPhone実機は未確認**。Nodeでの表示projectionと正式保存検証の成功を、その代わりのPASSにしない。
- 関連回帰・main上の既知失敗・独立レビュー・必須CI・exact SHAはPRに記録する。

## PR #901の保存revision問題

Stage5 `persistence.mjs` のloadで元データrevisionがCAS revisionに上書きされる問題は、この第2段階でも**未修正**。依存はない。次回Stage5保存再利用前に、独立PRで別フィールド化・異なるrevisionの回帰・save/load/restore呼出側と競合検出・復元契約を確認する。今回の保存成功を、その修正完了とは扱わない。

## 第3段階へ

`regionalContract(game, partnerId)` の契約ID・partnerId・開始月を、次の納品操作の資格境界に使う。`tradingPartner(partnerId)`の好み・受入・数量・能力を読み、酒と本数を選ぶ既存の`storeMarketQuote` / `assignStoreProduct` / `returnStoreProduct`操作感へ接続する。ただし現行のこれら関数は地域IDを拒否するままであり、今回承諾しても納品できない。地域用の見積・確定・在庫保存則・販売処理は第3段階で明示的に追加する。契約の存在を売上・発送実績に読み替えない。
