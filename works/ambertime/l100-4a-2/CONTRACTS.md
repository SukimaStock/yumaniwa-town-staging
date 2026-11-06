# arrivals参照層の独立契約監査

対象base: `28f00c81cb1b374758da34dc79cf7f63dfe657c2`。以下は works/ambertime/ 配下。先行監査SHA 778de330824e5e3aa3b4e108d4691083c0c6021e とbaseのsave-codec、Town model、history-record、recall/observe、world-map-viewに差分がないことを確認した。

## 正本・追加・順序
- experiments/town-simulation/v01/model.mjs:36 は events.length+1 からe番号を採番しeventsへpushする。134はその同一objectをarrivalsへpushし、135で反応eventを追加する。arrival ordinalとevent indexは別物。
- save-codec.mjs:12–18,28 は全event ID重複を拒否し、arrivalsをarrival型eventの順序付き部分列と完全JSON比較する。集合一致だけでなく値、順序、JSONのプロパティ順を保つ。
- accessorは既存eventsへの正当な追加を登録する。events自動発見と既存pushを併用して二重登録しない。既存参照の削除・再番号・過去prefix変更は正式契約外。

## 読取契約
|項目|位置・要求|B/Cへの制約|
|---|---|---|
|length/追加分|history-lab/analysis.mjs:55,143 のslice(previous.arrivals.length)|before/afterのsnapshotを混同しない。現行accessorはslice未提供|
|数値index/ID|history-record.mjs:61–63、recall/observe.mjs:28,43–44,87–91|ここはarrivalsではなくeventsを数字ID-1で直接参照。operation内ordinalも保持|
|順序走査|world-map-view.mjs:9,16–21|Array.isArrayがfalseなら無言で空配列となる。明示consumer変更なしでは非互換|
|find|Town model.mjs:196、analyze.mjs:16|最初の海外到達・sourceId検索。現accessorはfind未提供|
|filter/map|design/gameplay-audit-20261023/reputation-run.mjs:32–35|地域/銘柄の値と順序を保存。一時通常配列の生成は常設cache削減とは別|
|identity|history-lab/analysis.mjs:61 のincludes(event)|同じ列から切り出したobject同一性が必要。ID一致と区別|

## 書込・clone・保存境界
- Town model.mjs:275–277 はObject.keys再帰でeventsとarrivalsを含む非整数値を書き換える。古いrecordを不変と仮定できない。今回B/Cは同じeventを返すのでevents側の丸めを観測でき、private索引の走査除外が成立する。eventsをcompact化した場合へ一般化しない。
- distillery.mjs:7、13/15/16等は全状態structuredCloneを行い、36でも検証cacheをcloneする。現ArrivalViewはprivate state/prototypeを失って普通の空objectとなる。Proxy方式は別途DataCloneErrorとなり得る。今回の失敗をProxyの失敗と混同しない。
- save-codec.mjs:24–30 は正式全文parseと普通の配列+完全JSON一致を要求。34–38はarrival全文を生成しJSON.parseで別objectへ戻し、展開後上限を維持する。distillery.mjs:34,36–37も再演算と全文JSONを比較する。
- 生成時events/arrivalsはaliasだが正式JSON読込後は別object。structuredCloneは元のaliasを保存し、JSON roundtripは保存しない。したがって参照同一性の全局的保存ではなく、許可した操作での結果同値を検証する。
- hydrateは浅い外枠再構成と参照配列生成であり、独立cloneではない。返したeventの変更は元eventsにも反映される。独立snapshotが必要ならeventsを一度cloneして参照を再bindする設計が必要。

## 本編とLab
本編はtown-connection.mjs:7,27からcreateExternal/advanceExternalへ入り、Town model.mjs:250のmodeはresponses。Labの自動世代交代190、1200月上限advance193、summary196/export213とは異なる。Labでのfind/includes/export成功を本編の保存・世代交代成功に置換しない。本編の歩み/回想はeventsを正本とし、arrivals削減だけでは全履歴replay費用は消えない。

## 同値の判定境界
1. 全arrivalの値・ID・順序と再構成JSON一致。
2. compact参照層を保持したまま町advanceの出力一致。
3. 明示hydrate後の正式ゲーム操作・collector・保存一致。
4. compactのまま正式clone/読込/ゲーム操作成功。

1〜3は別々の証拠であり4を含意しない。Cはevent本体の遅延物質化ではなくdelta-varint位置の遅延復号で、event本体は全件常駐する。B/Cの欠損検出も全参照検査時と個別読取時を区別する。validateを省くと未登録arrivalの追加を個別at/byIdだけでは必ずしも検出しない。
