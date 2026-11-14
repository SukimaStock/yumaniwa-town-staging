# L100-4B-3 独立レビュー

実装担当と別の読取専用担当が、mainのcontext契約、B1/B2の固定SHAの証拠、設計報告を照合した。新しい100年再生や性能試験は実施していない。

## 指摘と対応

1. 通常のwriter/capture/serializerのバグも、hashと局所関係が合う誤contextを作り得る。悪意のある同origin改変だけを残余リスクにしない。
   - REPORT §1/§7に作成器の正しさへの信頼と、自己整合する通常バグの検出限界を明記。全バグの検出を保証しない。
2. B1は同世代の終端v8のsidecarを利用する。checkpoint境界collectorを独立再構築済みと読ませない。
   - REPORT §6に最小案のstate/context境界比較と終端v8 sidecar assertionを分離。prefix collector継承は別の未実装条件。
3. 非null originの前史coverageを完全と扱わない。
   - REPORT §7に欠けた出自を補完しない条件を追加。
4. 独立anchorが直前の派生正常世代と異なる場合の保持量。
   - REPORT §11にさらにVが必要であること、4V+2C候補peak、anchorを1つに制限して独立再生成功時だけ更新することを追記。

## 独立確認結果

- B1/B2 resultsの時間・作成費用・capture費用・UTF-16の引用と丸めが一致。
- V+C、2V+C、3V+2C、3V+3Cの全9以上の容量算術が一致。tail二重加算なし。
- B1の3件のcontext改変受理を成功と見せず、cold来歴、private capability、正式session/context、storage完全性を区別。
- raw cache注入、import receipt信頼、更新後の無条件継承を推奨しない。
- Bを推奨し、更新/取込/不整合/復旧時の全再生を必須、追加の定期監査は未採用とする判断はユーザーの設計範囲に適合。
- 設計採用候補は支持できるが、cold初回保存、増分更新、世代保存、Safari等の正式受入は未達。

読取担当による小さいdecodeContext-only確認では、非負counter増分と未使用商品追加はshape validationを通り、負counter・missing map・duplicate map keyは拒否された。これは全B1 semantic scenarioの再実行ではなく、設計判断の補助確認に限る。

最終追補：独立担当が修正後を再読し、上記2主指摘の解消、origin coverage、追加anchorの4V+2C全3値を再確認。設計採用候補としてブロッカーなし。実装受入・性能・永続性の認定ではない。
