# 本編確定操作とShadowの境界

基準main `cdf331f2f9f8ee65601fde3bffd112ed7363027c`。#896/#897/#898はmerged、#894はDraft（head `84de683814bf5efd68c0a1c53dc7d3463400ae44`）。この文書は実装前の保存境界監査を記す。

## 正式確定

`shop-app.mjs:saveCandidate()`は候補帳面・歴史・回想とともに`serializeSession()`を実行する。正式readerによる復元一致検証を経た文字列を`writeCandidate()`へ渡し、既存値との競合検査、書込み、同一文字列の読戻しが成功してから`committedSession`を更新する。Shadow入力はこの成功後に限定する。失敗候補、previewの保存なし分岐、`recall/operations.mjs:createObservedModel()`の保存前通知を確定取引として扱わない。

|操作|入口・候補更新|正式成功境界|Shadowへ渡せる事実／失敗時|
|---|---|---|---|
|手動瓶詰め|`act()`→`bottleBranded()`→`brandedBottling()`。費用、樽残量、商品、発売ID|`saveCandidate(next)`成功後|新発売・元樽・風味・外観・在庫。失敗時登録しない|
|担当者瓶詰め|月次内の自動瓶詰め→`brandedBottling(...,true)`。内部操作をpopして月次操作に包含|月次候補全体の保存成功後|同月内の発売とその後の販売を順序通り取り込む。内部一時状態は確定しない|
|自家販売|月次販売、`retailMirror()`が店舗分を除いた発売sold/revenueを更新|月次保存成功後|自家販売だけの差分。core商品soldと二重計上しない|
|棚割当|`actMarket()`／`commitPlacement()`→配置関数|保存後だけgame更新・演出|予約数量のみ。所有在庫に加算しない。売上／関係実績にしない|
|棚での顧客実売|`settleStoreMarket()`が割当を減らし`deliverShopInto()`、lastMonth.salesへstockist行|月次保存成功後|顧客実売と確定納品が同一成果。金額は一度だけ|
|旧卸売|手動受渡／自動注文出荷→`deliverShopInto()`|操作／月次保存成功後|確定卸売。顧客購入はunknown/partial。関数名だけで実売認定しない|
|デパート|企画のqueue、後日の特別受渡、adoption生成|各候補保存成功後|queueは実績なし。受渡のdeliveryとadoptionの対応を保護。顧客実売は不明|
|契約開始|`act()`内のaccept処理。初回受渡と同時の場合あり|候補保存成功後|成立したrelation。注文成立だけで販売加算しない|
|蒸留・樽詰め|`distillStep()`／`commitFill()`→`fillBarrel()`|保存成功後|現役樽の正確なsnapshot。未保存の抽出途中は確定しない|
|月進行|タイマー／debug skip。後者も各月`saveCandidate()`|各月書込み読戻し後|月内の複数取引を一確定遷移として処理|
|世代交代|本編世代・回想処理を含む候補|回想を含む正式保存成功後|確定した場面を固定。再選出しない|
|新規開始|`startNew()`または空storageの`boot()`|新ゲームの正式writer成功後|新規であることが明白な場合だけ初期化可能|
|復元／import|reader→`installSession()`。importはwriter後|正式reader／writer成功|Shadowは停止・破棄。古い全履歴を自動再走査しない|
|時間・部屋の保存|同じgameを`save()`で再保存可能|writer成功|取引追加なし。保存回数を取引連番へ無条件変換しない|

`installSession({fresh:true})`はファイルimportにも使われる。freshだけで新規Shadowを開始するのは不可。バー／会話の旧保存移行もinstallSession後にsaveCandidateを呼ぶため、復元時の停止を先に行う必要がある。Shadow例外は独立catchで診断停止とし、正式保存のcatchへ伝播させない。

## 町・会話・帳面・回想

`syncTown()`は発売IDでrecordBottle、delivery IDに対して`shop:<id>`、月×商品に対して`retail:<month>:<id>`をreceipt IDとして使用する。`deliveryId`と`receiptMonth`が処理済み境界。既存packet、inquiry、因果リンクを集計値から再発行してはいけない。Shadowはそれらの存在と参照を観測するだけで、正式townを進めない。

短文は当月を含み、昔の酒の会話候補は前月まで。スーパー開始月とデパートの企画・採用・受渡照合を保持しなければ、全4店の互換を証明できない。実際に選ばれた台詞・cooldownは原記録から固定し、現在の候補から過去発言を再作成しない。

発売帳の自家販売sold/revenueと店舗受渡の実績は別の正本。集計で再構成可能なprojectionを比較し、明細表示に必要な行まで集計だけで復元できたとは主張しない。確定回想はそのまま固定。次世代候補は必要な事実の対応を検査し、正式collectorへ架空の履歴を注入しない。

## 第4段階の順序

1. Shadowの一致が証明された発売在庫・経路別実績の読取から検討する。正式更新・保存は引き続き旧モデル。
2. 店舗短文、全4店の候補、帳面projectionを個別の比較契約で切り替える。不足店は旧読取を維持し、代用事実を作らない。
3. 供給と浸透の新評価は現行互換と別の仕様変更として決める。policy versionを固定し、到達月・policy・当時の基礎値を過去事実として残す。新policyで過去到達を塗り替えない。
4. town receipt/cursorと次世代collectorは独立課題。Shadow一致の範囲を越えて切替対象へ広げない。
5. v8移行、新保存形式、記憶Cの詳細削減は別承認範囲。未完参照・旧ID・確定回想の保護を先に検証する。#894の保存媒体変更とは混合しない。
