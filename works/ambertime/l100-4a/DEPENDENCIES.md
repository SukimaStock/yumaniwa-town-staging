# Town構造・参照監査

参照base:8a145ec4bb810baccbb2dfb353e990db72a3ef21。独立監査の29697583→現在main差分を照合し、以下の本編ファイルに変更なし。A=現在計算、B=過去事実、C=他の正式記録から完全導出、D=未使用の可能性（削除許可ではない）。役割は重複する。

|group|役割|生成/増加|将来/歴史の依存・保持条件|
|---|---|---|---|
|seed/month/generation/mode/version/external|A|時計/乱数/版|乱数順・モード・世代を完全保持。modeを替えて省略不可|
|nodes/lastEncounter|A/B|到達・取引・反応|現存店舗のroot/関係/反応cooldown。固定場所数でも内容は変わる|
|releases|A/B|瓶詰め/発売|releaseId-1参照と配列長採番、当時の味profileを保持。無制限増加し得る|
|shipments|A/B|実受領|受領ID重複防止・発売別瓶数上限・全期間relationship。順序/fit/数を保つ|
|events|A/B|発売/到達/口コミ/問い合わせ/訪問|ID採番・直近12か月rumor cap・古い因果chain・回想ordinal。単なる表示履歴でない|
|arrivals|A/B/C|arrival eventと二重記録|events filterと完全一致。現行codecはwireで既に導出。全reader通常配列契約の変更は別段階|
|attempts|B（将来入力としての直接reader未発見）|encounter/伝播抽選|probability/roll/skip等の個別事実。正式状態・quantize対象。未使用扱いで消さない|
|packets|A/B|口コミ移動|source/release/path/cohort/due/strength。未来到達と因果の根。件数は入出で変化し有界証明なし|
|pending|A/B|店舗問い合わせ|次の受領・交渉への未処理状態。削除不可|
|seen|A/B|cohort×宛先の到達|二重到達抑止。古くても同cohort再到達判定に必要。件数は増加し得る|
|memories|A/B|memory mode生成|主ゲームresponsesでは全12入力空。別mode再登場のdue/retired/source/当時profileは必要|
|trades|A/B|独立town Lab取引|正式external入力では空。別mode・旧/将来互換性を確認せず削除しない|

Dに分類して安全に除去できると認定したgroupはない。分類は保存形式変更を許可しない。

## 重要な関数/位置

- `experiments/town-simulation/v01/model.mjs:36`: events.length+1がevent ID。削除/並べ替えは次のIDも変える。
- 同94–98 relationship: 全shipmentsからqualifying contactsを作り、四半期数・最初/最後のspan・配送単位fit平均を計算。浮動小数点加算順の変更も一致条件に含む。
- 同110: 直近12か月rumor数でannual cap。全archive化する場合は同じ窓を参照する契約が必要。
- 同111/141: attemptsに抽選入力・roll・skipを追記。
- 同131–139: seenで重複到達防止、packetsでsourceId/releaseId/pathを継承。
- 同146,173–176,189: memoryの長期再登場。248–250 createExternalはresponses固定なので本編の通常経路と別。
- 同261–269: 受領ID照合・発売別納品上限にもshipmentsを使用。
- 同277: events/arrivals/attempts等を再帰quantize。過去chunkの不変性は固定小数点化の冪等性も含め別途証明する必要がある。本Labはsnapshotの可逆保存だけで、不変archive更新方式を実装しない。
- `history-record.mjs:61–72`: event ID→配列位置、前回長以降の新event、source chainを参照。inquiry/visitの120か月以上の空白による再登場は本編側の具体例。
- `recall/observe.mjs:20–44,86–94`: append-only長さ・e{index}・positionBlocks、操作/世代/同一操作内ordinal。古いeventをIDから再構築する。
- `player-news.mjs:22–46`: 全eventsからブランド×場所×種類の初回を選び、祖先rumorから紹介者の文章を作る。
- `world-map-view.mjs:7–30`: arrivals/shipments/eventsから到達や海外接点を判断。
- `brand-reputation.mjs:4–40`: 経済上の銘柄評判は本編releaseの販売記録に基づく。town反応と同一計算ではない。
- `save-codec.mjs:24–38`: arrivals完全一致→null wire化、全展開長を先に検査してから配列復元。

## 操作と成長の関係

方針比較は同じseed/熟成・販路driverを使用。広域は販売/取扱先/発売頻度/経路が異なり、到達・口コミ・抽選試行も多い。『店舗数だけが原因』という単一因果は、この複合driver比較からは確定しない。経済評判とtown反応の役割も分ける。

idle.mjsの100年townコピーを、新発売・受領なしで12か月だけadvanceTownした結果、local+14,947、mixed+27,883、wide+49,779units増加。shipments/releasesの増分は0で、既存packet等の伝播だけでもevents/arrivals/attempts/seenが増えた。これはtown-only実験であり、本編時計を進めた正式101年セーブではない。元保存不変、各月に既存の正式サイズguardを適用。容量の年率は進行状況で変わり、この12か月の観測から無限期間同じ傾きとは推定しない。

全groupのUTF16/UTF8サイズ・配列件数はresults.json。12条件の独立再集計と一致した。最新結果はMEASUREMENTS.mdを参照。
