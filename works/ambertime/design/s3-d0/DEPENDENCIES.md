# 現在・過去・結合情報の依存

基準コミットはDESIGN.md。以下のパスはworks/ambertime相対。M = experiments/town-simulation/v01/model.mjs。独立した読取監査によって照合した。

|項目|実際の依存|分類・分離条件|
|---|---|---|
|events.length|M:36でeN採番、M:188でsourceId順序、history-record:61–63,97–104、recall/observe:20–30,42–44,86–94、collector:151–159でdense ID/ordinal|過去＋結合＋現在。古い行削除も再採番も不可。全logical count、位置lookup、append境界が必要|
|最近のevents|M:110–115は12か月未満rumorの上限、lastEncounterは6か月cooldown|現在入力。窓を変えず保持する必要|
|古いevents|shop-model:34–38はbar interest/inquiry/visit証拠で将来eligibility|古いからcoldとは言えない。release/brand/place/time別の永続証拠索引が必要|
|因果連鎖|history-record:61–72,97–104は選択証拠を原eventsに照合。recall/collector:37–46,175–179は後のinquiry/visitから以前のarrivalを再取得|全source closureを保持。選ばれなかった記録も必要。歩み・回想sidecarは全歴史の代替にならない|
|attempts|M:111,141,169,173で追記、275–277でroll以外を再量子化。乱数はM:33 seed+key。正式検証はpartner-orders:1338–1369|主に過去。将来判断による古いattempt読取は見つからないが、量子化と完全状態照合が依存。削除不可。増分量子化も別証明|
|arrivals|M:134でeventを追加。world-map-view:7–29,36–43で全到達、eventsで海外接点。save-codec:12–38で本文省略/復元|過去＋表示＋結合。順序・property位置・alias/copy境界の確認が必要。既存wire削減済み|
|shipments|town-connection:19–25 receipt/month重複防止。M:259–270 per-release保存則、packet生成。94–98,269関係再計算|現在＋過去。四半期集合・期間・件数・fit総和と加算順序。player-news:131–149の台詞/cooldownにも必要|
|seen|M:130–139 cohort+place重複と伝播拡張|現在。安全TTLは未証明。到達済でも別経路が戻る可能性|
|pending/packets|M:149–176遅延反応、184–188 queue消費順|現在＋因果。due time・順序・元source・数値を保持|
|nodes/releases|M:117–180 awareness/interest/root/contacts/decay、252–269 dense release ID・received totals|現在＋歴史。float近似・ID再採番不可。初接点も表示に使う|
|正式再生|partner-orders:1338–1369 full replayと厳密JSON一致。development-save:22–38 sidecar/roundtrip、41–45 conflict/write/readback|全履歴＋現在＋context。Lab validate(M:199–211)で置換不可|

main createExternalはM:250でresponses固定。memory mode seeds(M:146)、non-external trade(M:164)は通常main経路では生成しないが、旧データを未知として捨てる理由にはしない。v8原本の構造検査・移行分類が必要。

最も難しい境界は「歴史表示用だからcold」と仮定できない点。昔の店、酒、source chainが将来の反応へ再接続する。Aはreader accessorを各呼出元に渡すだけでは足りず、ID採番・量子化・exact replay・structuredCloneまで契約を変える。D1ではこの広い変更を避け、Bの可逆表現を先に確かめる。
