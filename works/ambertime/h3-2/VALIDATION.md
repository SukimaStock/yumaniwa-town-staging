# H3-2 検証記録

基点: H3-1 `bc73b8558648a1cfe736860b2c9bc99b76659563`。実装前Plan Lock digest `801f49b98143d84d495d993d0707a4d2ef1506adef95597eabe41f2ef63b4950`。

## 実行済み

- H3-2（増分観測、保持、C adapter、保存、実際の交代結合）、H3-1、H2 recall snapshots: 64テスト成功、失敗0、skip0。
- S3 save、S4 record/save、H2-5通常・archive回帰: 25テスト成功、失敗0。
- 30／100年×3方針、6実行。9種類の交代境界、30／100年初回一致、60／90年の正式prefix一致。
- 全入力保存SHAが既存H2/H3-1のsourceSha256と一致。正式状態・乱数を変更していない。
- H3-1 C adapter: 公開12行のseed、採用ID、文、情景、関係を同じ入力で完全再現。
- JSON再開したcollectorと連続collectorが一致。交代前previewはゲームもcollectorも変更せず、後世代によって確定回想が変わらない。
- 研究一体保存: 生成失敗、encode失敗、quota、write、readback、競合、破損、再試行。実際の地元30年交代にゲーム・時計・S2帳面・S4歩み・collectorを接続した保存失敗／再試行も成功。
- 独立レビューと修正はREVIEW.md。実装hashと入力hashはcomparison.json。

`atomic-integration.test.mjs` は `/tmp/h32-saves/local-360.json`（または H32_INTEGRATION_SAVE）を必要とする。未配置のCI環境では明示的にskipする。今回ローカルでは入力を配置して実行済みであり、skipを成功として数えていない。`evidence.test.mjs` も100年の研究入力を必要とする独立照合で、入力未配置時はskipする。

## 境界と未確認

- Scope / Risk / Impactとrequired CIは、PR上の実際の対象SHAに対して確認し、結果をPR本文へ記録する。旧checkerの整合成功をfinal VERIFIEDと呼ばない。
- 本編や研究用UIを変更していないため、実ブラウザー確認は未実施。Safariの性能・容量・複数タブ競合は未確認。
- Nodeのmedianと研究用memory transactionが、Safariや正式localStorageでの実用性を証明するわけではない。
- 3方針はseed42・各1銘柄。複数銘柄や任意の未来の選出への一般化は未確認。
- 新しい全操作履歴・正式保存形式・本編import・公開URL・LAB導線は追加していない。
