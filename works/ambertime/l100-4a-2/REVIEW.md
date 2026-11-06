# L100-4A-2 独立実装レビュー

## 判定
**限定した研究として妥当。正式導入の承認ではない。** Bを次段階候補とする判断、Cのindex復号コスト、正式clone/map/save非互換、ブラウザー未確認をREPORTが明示している。

対象: accessor.mjs、run.mjs、future.mjs、memory.mjs、REPORT.md。契約の正本はCONTRACTS.md。独立レビューでの全12入力/長期再生の再実行は行っていない。実行記録の件数は実装担当のresults/future evidenceと照合して扱う。

## 独立して実行した確認
- node --test works/ambertime/l100-4a-2/accessor.test.mjs : 8 tests PASS / 0 failure。
- 契約監査対象の正式5ファイルについて先行監査SHA→研究baseのdiffなし。
- accessorはTypedArray容量をstatsに含め、private fieldsを持ち、records cacheなし。filter/mapは一時配列を生成する。
- runはcompact accessorを町の12か月間維持し、毎月のhydrateを比較にだけ使用する。比較用controlも同じ町操作のみを行う。本編core時計/collectorは進めず、その限界をREPORTが明示。
- futureは正式readSession後にhydrateして本編翌月とcollectorを照合。compact正式動作の証明ではないことを明示。原本へのwriteなし。
- memoryはGC後保持量と生涯MaxRSSを区別し、native cloneでviewが消失する低コストを改善と扱わない。

## 指摘と残る制約
1. **計測欄の修正依頼**: レビュー時runのwireUnits:wire.length、memoryのwireUnits:saved.lengthはcompactFormalGameのobject戻値に対するlengthなのでundefinedとなり出力JSONから消える。JSON.stringifyの文字数をcompactGameUnits等の正しい名称で出力するよう担当へ通知した。正式session bytesとは区別する。**対応確認済み**: run.mjs/memory.mjsが `compactGameUnits: JSON.stringify(...).length` へ修正されたことを独立確認。最終results.jsonの36ケース、memory-results.jsonの9件すべてに正の有限な数値が格納されていることも確認した。本指摘は解消済み。
2. constructor/validate/pushは研究入力に合わせた契約であり、任意の敵対的保存データを検証する完全なreaderではない。validateは全arrival順序を比較するが、非arrival全件の再検証を毎回行うわけではない。正式入力の検証を省く根拠にしない。
3. byIdは全件走査。未登録追加を黙って無視しないため、遷移後validateが必要。今回runは毎月呼ぶ。
4. Array同等APIではない。数値property、slice、find、callback第3引数/thisArg等を含む全Array互換を主張しない。atは整数のみ、filter/mapは展開配列をcallbackに渡す。
5. Cは本体recordの圧縮保持ではなく索引圧縮。全events常駐と初期正式展開ピークは残る。
6. hydrateは独立cloneでなくaliasする。将来正式境界でcloneする際は一度複製したeventsへviewを再bindし、元snapshotへのalias漏れを試験する。

## 推奨する次段階
Bのclone/rebindを研究adapterとして定義し、read-only consumerを明示iterator化した小範囲で正式操作と全sessionを比較。その後のみ長期操作列・新たな世代交代・実ブラウザーへ広げる。現段階で正式容量上限引上げ、形式変更、履歴削除、マージは不要。
