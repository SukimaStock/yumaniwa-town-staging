# A/B/C比較と容量

全数値は同一100年fixtureのJSON論理量。UTF-16 code unitsとUTF-8 bytesを分ける。物理ディスク・IndexedDB quota・保持heap・cold時間ではない。容量計測器はD0純粋比較用であり保存APIではない。

|対象|UTF-16 units|UTF-8 bytes|
|---|---:|---:|
|元game|9,808,696|10,994,786|
|town|9,492,444|10,655,992|
|events/attempts/arrivalsを除いたgame bucket|806,607|830,913|
|全events（10,333件）|3,238,341|3,879,233|
|全attempts（26,221件）|3,017,047|3,017,047|
|到達順序索引（8,153件）|40,245|40,245|
|研究envelopeのgame以外|836,443|879,195|
|Aの全bucket組立表現|7,938,765|8,646,715|
|Bのschema共有表現|5,113,409|5,821,359|

active bucketが小さいことは、それだけで計算できる証明ではない。sessionFieldsは元envelopeの付帯情報で、正式v8全体を生成した値ではない。#854の理論C sessionは7,898,496 units/8,606,446 bytes。Bの比較表現はAよりUTF-16で約35.6%、UTF-8で約32.7%小さいが、正式C wireとは形式もwrapperも異なる。正式上限に収まったとは判定しない。元の完全gameへ戻せば9,808,696 unitsのまま。

|案|容量・成長|完全性/同値性|互換・復旧|負荷・規模・最大リスク|
|---|---|---|---|---|
|A 現在＋全履歴|現在bucketは小さくなるが全履歴は増え続ける。総量約8.65MBの比較表現|個別記録は保持可。過去lookup/ID/窓依存が未解決|旧game分解/再構成と同一世代確定が必要|長期hot負荷には有望。広いruntime変更と隠れた歴史依存が最大リスク|
|B canonical＋索引|同fixture比較表現約5.82MB。記録数増加は残る|schema/property順/値を失わない可逆性を測定。将来同値はD1|旧v8を原本として隔離変換、完全hydrate比較。破損は拒否|最小D1候補。codec/検証契約の複雑化。hydrateと全再生は依然重い|
|C 分割履歴＋checkpoint|A相当＋chunk wrapper＋cp＋manifest＋backup。小さいhotだけを総量と誤認しない|世代一致に加えcp自体の正当性が必要|IDB transaction、readback、head/revision CAS、旧正常保持|cold改善候補だが永続性/信頼/ブラウザー証拠不足。今回組合せ導入しない|

Cの512件chunk会計は73個、履歴chunk合計6,258,536 units/6,899,428 bytes、最大chunk165,658 units/197,718 bytes。元events+attemptsに対するwrapper増分3,148 units/bytes。manifest/hash/索引/active/sidecar/driverはこの値の外。checkpoint容量は今回生成しておらず未測定。正式状態の複製を含むならその分が追加される。chunkingそのものは圧縮ではない。

復旧容量の最低会計（メタデータ・DB overhead・cpを除く論理下限）:
- B表現2世代:11,642,718 bytes。旧正常＋現行＋新候補3世代:17,464,077 bytes。
- 元v8を別途保持する場合は実際の元wire bytesをさらに足す。#854理論C sessionの8,606,446 bytesを仮置きすると3世代候補＋原本は26,070,523 bytes。理論値を成功したv8保存と呼ばない。
- A表現3世代は25,940,145 bytes、Cはこれにcp/manifest等を加える。共有immutable chunkによる削減は参照寿命・GC安全性を証明するまで見込まない。

localStorageへ二世代保存できると仮定しない。IDBのestimateも推定でありquota保証ではない。iPhoneは未検証。履歴ごとの保持上限はなく増加する一方、現行には操作12,000件・保存サイズの上限もあるためBでも永久解決ではない。新店舗/供給増加時の増加率は未実測。保存全体・候補ピーク・hydrateメモリ・旧正常領域を別々に予算化する。

## 選定

BをD1の第一候補とする。今回はkey共有を使った容量比較とexact JSON roundtripだけであり、製品codec実装ではない。Aは次の依存分離段階、Cは永続化とcheckpointの独立受入段階へ送る。Bの研究表現が小さいという理由で現行guardを迂回しない。全状態上限を維持したまま現行保存を成功させる案は今回成立していない。
