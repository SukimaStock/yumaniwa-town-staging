# 世界拡張 第3段階：地域への配分と正式納品

基準：PR #903 / `efcfdcb2cf3dd6025072b5fad32e82187405c91b`。Staging限定。契約は第2段階の `regionalContract(game, partnerId)` が正本であり、取扱条件や申し出を作り直さない。

## プレイヤーの操作と確定時点

契約済みの地域窓口を、既存販売室の左側へ表示する。右の実物の瓶、既存の1本・5本・全部、左の納品先を使って配分する。配分済みの瓶には「未納品」を表示し、その瓶から既存の確認欄を開いて「納品する／手元へ戻す／やめる」を選ぶ。納品時の本数・予定金額を同じ欄で確認できる。保存成功後だけ状態・瓶の移動・通知を反映する。新しい地図・地域管理画面は追加しない。

| 事実 | 変更するもの | 変更しないもの |
| --- | --- | --- |
| 契約 | 第2段階で承諾した取扱関係 | 酒・在庫・売上 |
| 配分 | 地域への取り置きと手元の利用可能数 | 物理在庫・現金・売上・納品実績 |
| 取消 | 選択した未納品の取り置きを手元へ戻す | 物理在庫・現金・過去の納品 |
| 正式納品 | 対象の取り置きを消費し、在庫と代金・確定receiptを更新 | 消費者への実売、既存店舗の記録、町の口コミ |

納品条件は共通定義の6か月以上・最小1本・価格率1。静的定義の存在だけでは資格にならず、実際に承諾した契約IDとブランドが一致する必要がある。月間販売機会3を納品上限にしない。納品数量は実在庫・他の予約・プレイヤーの選択に従う。単価は既存の標準価格に共通定義の率を掛ける。新しいプレミア価格や顧客販売計算はない。

## 正式状態・在庫・支払

明示的な `enable-regional-deliveries` 操作で `game.regionalDeliveries` を作る。旧保存には自動で取り置きや納品を追加せず、既存の本編読込時には有効化前バイト列のバックアップと正式保存が成功してから採用する。新規ゲームは `newRegionalDeliveryDistillery` を使用する。第2段階のcreator・契約ID・問い合わせ根拠は維持する。

`placementInventory` は、有効化済みの場合だけ地域の取り置きを `assigned` に加え、`hand`・`available` から差し引く。`shops` は既存の町の店舗だけ、地域分は `regions` / `regionalAssigned` に分ける。無効の旧保存では従来の戻り値形状を維持する。これにより自家販売、町の棚、デパートの5本予約と同じ物理在庫を共有し、二重利用を防ぐ。既存の月次計算はretail配分だけを消費するため、地域の取り置きを売らない。

既存coreの商品は `originalStock = stock + sold` を要求し、soldには卸売を含む有償引渡しが入る。地域納品もこの内部保存則に従い、stockを減らし、paid sold/revenue・cash・core totalsを増やす。ただし発売・記録の自家販売mirrorから地域納品分を差し引き、`delivered` / `deliveryRevenue` に含める。これらのpaid soldを地域の顧客実売へ読み替えない。`lastMonth`・商品の `lastSold/lastRevenue`・店舗納品・世代進行・町のイベントは納品判断だけでは変更しない。

発売帳の外部納品集計と比較用の手元数にも、地域分の明示的な内訳を加える。自家販売は増えず、地域先の `customerSales` / `customerRevenue` は `null`（不明）。既存4店舗の個別実績は `shop.deliveries` のままである。

## 識別・再試行・履歴の大きさ

- 配分ID：`regional-allocation:trial-region-desk:<serial>`。
- 正式納品ID：`regional-delivery:trial-region-desk:<serial>`。
- 契約ID：第2段階の `regional-contract:trial-region-desk` をそのまま参照。
- 操作：`regional-assign`、`regional-return`、`regional-deliver`。

配分はquoteが示した次のIDを使用する。同じ配分ID・内容の再試行は何もしない。取消と納品は選択済みのallocationIdsを必須とし、古い画面から新しい配分を勝手に消費しない。同じ納品IDの同内容は再計上せず、内容変更は拒否する。取消済み配分の同じ再試行でも新しい取り置きを消さない。追加のプレイヤー操作は次のIDになり、意図した追加配分と通信・保存の再試行を区別する。

receiptは契約・取引先・地域・ブランド・発売・商品・月・本数・単価・金額・元の問い合わせと申し出・消費した配分ID・対応する操作位置を持つ。例えば自然seed3の5本納品は、発売5の商品15、132か月目、1本£16・計£80、問い合わせe331へ紐付いた `regional-delivery:trial-region-desk:1` として検証した。

永続状態は現在の配分、直近8件のreceipt、商品別と相手別の累計。全receiptは確定した `regional-deliver` 操作値へ保存する。古いreceiptを切り捨てて事実を失うのではなく、`regionalDeliveryReceipt` / `regionalDeliveryHistory` が必要時に操作帳から参照する。町の2048件の納品帳は消費せず、全履歴を二重の巨大配列として持たない。商品別集計は既存の最大512発売を超える新しい記録種類を作らない。既存の12000操作・保存サイズ上限は維持し、無制限の長期保存が可能とはしていない。

## 第4段階で利用するAPI

| 用途 | API |
| --- | --- |
| 契約済み地域の選択 | `regionalDeliveryPartners(game)`。安定した取引先ID・契約ID・短縮名・正式名・種類を返す |
| 地域・地図縮尺 | 選択されたIDから `tradingPartner(id)` のregionId/mapScaleを読む |
| 契約資格・価格・利用可能数 | `regionalDeliveryQuote(game, productId, partnerId)` |
| 未納品の瓶 | `regionalDeliveryRows(game, partnerId)` |
| 配分 | `assignRegionalProduct(game, {partnerId, productId, contractId, allocationId, count})` |
| 取消 | `returnRegionalProduct(game, {partnerId, productId, contractId, allocationIds})` |
| 確定納品 | `deliverRegionalProduct(game, {partnerId, productId, contractId, allocationIds, deliveryId})` |
| 納品実績 | `regionalDeliveryReceipt` / `regionalDeliveryHistory` / `regionalProductTotals` |

quoteの `ok/reason` は手元からの配分資格、`canDeliver/deliveryReason` はすでに配分済みの瓶の納品資格。手元が0本でも取り置きは納品できる。納品資格を新規配分の空き数量と混同しない。

## 保存と口コミの境界

既存v8 envelope・保存key・codec・writerを変更せず、正式な操作帳と完全リプレイによって、配分後・取消後・納品後の状態を検証する。receipt内の単価・金額・参照先も復元時に再計算と照合する。実在しない配分、改竄されたreceiptや累計・境界は拒否する。実際の保存失敗は既存のsave-before-publishでゲームへ反映しない。

今回、地域納品receiptを町の伝播モデルへは渡していない。町への実売receiptと地域窓口への仕入れを一括すると、未知の顧客実売や即時の口コミを捏造するためである。契約・問い合わせ・今回の酒と地域を正確に保持し、以後の段階でreceiptを一度だけ受け渡す設計へ接続できる。新しい紹介・到達・関心や地域内の小売店は生成しない。

PR #901のStage5 loadで元revisionがCAS revisionに上書きされる問題は**未修正**。今回もcheckpoint・tail・loadへの依存はない。将来の再利用前に独立PRでrevision分離、異なるrevisionの回帰、save/load/restore呼出側、競合検出・復元契約を確認する。

## 確認した範囲

自然seed3・6の口コミ→問い合わせ→承諾から、新しい6か月熟成の酒を造り、1本・5本・全部を配分・正式納品した。注入した問い合わせ・契約・資金ではない。不正ブランド等の純粋なnegative projectionは正式経営fixtureと区別している。

モデルテストは在庫競合、自家販売・酒店・実際のデパート予約、再試行、古いID、保存失敗、v8・履歴・回想・別プロセス復元、直近8件を超える実納品、360か月目の実際の世代交代と持越しを確認する。表示操作のNode harnessは本物のモデルを使い、瓶・本数・配分・取消・納品・保存失敗を操作する。

無納品の5seed×180か月では、地域納品の有効化フィールドと操作だけを除いたnative状態を、基準mainの独立checkoutと照合する。既存回帰・基準mainの既知失敗・独立レビュー・必須CI・配信一致はPRへexact SHAとともに記録する。

実ブラウザーテストも自然な正式v8 fixtureを用意したが、この実行環境ではChromiumがProcessSingletonのAF_UNIXソケット作成EPERMでページ起動前に停止する。**実画面の寸法・ブラウザー操作は未確認**。Node harness成功を実画面のPASSとは扱わない。iPhone実機は作者が別途確認する。Productionの変更はない。
