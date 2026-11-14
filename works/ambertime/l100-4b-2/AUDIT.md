# L100-4B-2 保存と検証情報の監査

基準 main: 6a1707c106afb4bf0658a274edf404bbc541de64。
#837: d674cb58b14ad1c7f45819694cd2367dfd11ccc8、未マージDraft。
両者の partner-orders / development-save / save-codec に差分なし。
関連Draftの状態は pr-states.json。正式導入済みとは扱わない。

## なぜ最初の保存が遅いか

partner-orders.mjs 1292–1324 の checkpoint はモジュール内の単一cache。
seed、originのJSON、操作prefixの長さと完全なJSONが一致すると、過去の
操作境界state/contextをコピーして新tailだけをapplyする。
cacheの内容自体をhashで信頼する構造ではない。外部から変更できず、正式
validateDistilleryが操作を再生し最終JSONの完全一致を確認した後にだけ発行する。

B1 fast() は、研究用に得た game を development-save.readSession の restore
callbackへ返す。sessionのsidecar検証は行うが、正式モデルmoduleの内部cache
を生成しない。その後 serializeSession → serializeDistillery → validateDistillery
が最初の全再生を行う。次のreadbackと2回目の保存はcacheを使える。

## 保存の検証順

serializeSession (development-save.mjs 30–38): 正式serialize/validate、正式UTF-16上限、
slots/ledger/history/recallの検証、v8 compact、同じ正式readerでの読戻し、gameと
sidecar一致。これらは本研究でも一切削除しない。

cache.state は操作境界の状態。stillの途中経過とtastingは別途finalizeする。
partial cacheは同じ操作数、同じ蒸留epoch、後退しない進捗等に限定される。
最終session.gameをそのままcache.stateへ入れる設計は不適切。
projectionTokensのWeakMapは履歴投影専用で、正式保存cacheの証明ではない。

## 失効条件

元origin/seed/prefixが異なる、操作が短くなる、別branch、互換性のないtransient
状態では正式cacheは再生へ戻る。研究tokenは別manager、構造複製、JSON化、
自己申告receiptを拒否する。コード依存fingerprint変更も拒否する。
古い有効tokenは過去のbranchの検証権限を持つが、storage headの更新権限ではない。
永続revision/CASや複数タブ制御は実装しない。

## contextの意味

manualFills/manualBottles: enable-staff-experience時の経験値・解放初期値。
manualSources: 手動製法、担当者の採用条件・予約、操作順・世代の由来。
nearbyCasks: 抽出停止点、樽種、flavor、担当者予約の製法。
nearbyProducts: 販売・陳列・価格の履歴と近隣比較facts。
終端gameに未使用の情報が残り、現在のgame一致だけではcontext一致を保証しない。
MapはObject.freezeだけでは不変にならない。private graphを複製して所有する。

B1の整合hash再計算試験では8件中3件のcontext改変が終端session一致で受理された。
今回この旧証拠は再利用であり、新規実測として数えない。全再生で作成した証拠と
毎回の読込検証は別。hashは破損検出で、作成者や検証履歴の認証ではない。
