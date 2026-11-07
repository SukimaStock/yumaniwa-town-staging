# 検証・復旧契約（設計、未実装）

## 保証を分ける

1. 表現可逆性: 全行のプロパティ存在・順序・値、配列の順序、件数、IDが同じ。
2. 意味整合性: source参照、release/store/receipt、世代境界、保存則、現在状態と歴史が一致。
3. 将来同値性: 同一入力で月次・販売・口コミ・RNG・回想が一致。
4. 来歴: その状態が正式計算と操作履歴から生成されたこと。
5. 保存世代完全性: すべての部分が同じ確定世代に所属。
6. 永続性: 次回起動後にも必要な原本・旧正常世代が存在。

hashは偶発破損・取り違えの検出補助であり、来歴認証ではない。同じwriter/readerが同じ誤りを共有するとroundtripだけで発見できない。既存の独立正式replay、別実装による行比較、既知SHA fixtureを基準にする。checkpointの終端session一致だけではmanualFills/manualBottles/nearbyProducts等contextの正当性を保証しない（#840等）。

## 通常保存・再開の候補

現在状態は厳密なschema/値/RNG検査。履歴は固定したordinal範囲の個別行を全件検査し、重複ID、欠落、source因果、件数、順序、schema ID/列数を確認する。ストリーミングで走査することと検査を省くことを区別する。検証済みimmutable prefixを再利用する場合、その作成検証・同一世代・不変性・コードfingerprint・tail境界を証明する別契約が必要。D0はその信頼を永続化できたとは主張しない。

現在正式validatorは完全JSON/replayを要求する。上記新契約との同等性は未証明であり、通常保存に直結しない。巨大JSONを作らず正式保証を成立させるには、成分別比較と全体参照整合性、資源上限を別途承認・検証する必要がある。

## 移行・異常時

旧正常v8の元bytesを変更せず記録し、既存readerで独立復元する。新表現からhydrateしたgame/全session/contextを元と比較し、次月も比較する。100年超過fixtureは既に正式v8ではないため、「旧v8移行成功」の入力にしてはいけない。10/30年正常保存と100年研究fixtureを別ケースにする。

|状態|判断|
|---|---|
|全構成が正常・同世代|全検証後に候補確定。新headへ切り替える前に読戻し|
|索引のみ破損|正本eventsが独立検証可能な場合のみ再生成候補。黙って採用せず再検証|
|events/attempts欠落・値改変・source不整合|その候補拒否。件数/合計へ置換しない|
|版/依存fingerprint相違|候補失効、旧v8を正式readerで検証。v8自体を失効と混同しない|
|候補途中中断/容量不足|headを変更せず旧正常維持。復旧元を空き容量のため先に消さない|
|revision競合|transaction内CASで拒否。古いタブを自動統合しない|
|最新破損・旧正常あり|世代全体を検証して旧正常へ復帰。異世代断片を混ぜない|
|全候補不正・全origin消失|安全停止。復旧元なしは復旧不能。新規ゲームで自動上書きしない|

Cを将来使う場合、generation ID、storage revision、game/model version、prefix length/digest、chunk ordinal/length/hash、collector/RNG境界をmanifestに結びつける。候補書込→readback→正式検証→head確定→旧正常を残す順。transaction成功は物理電源断後永続性ではない。全origin消失と初回起動を同origin記録だけで区別できない限界も残る。

## 今回の証拠

新規: fixture SHA照合、全events/attempts schema tableのJSON.stringify一致、arrival全8,153件のevents所属・内容・順序一致、容量会計、計測器の非破壊/不一致拒否/Unicodeテスト。
既存: #854の容量・月次超過時点、#810–812のC可逆性、#805–807の復元/依存研究。
未実施: 新モデルの月次、cold復元、世代交代、実browser保存、Safari、実障害注入。この研究は正式validatorを置換しない。
