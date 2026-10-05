# Phase 1検証記録

2026-10-05 / staging-only。

- 実装開始前base：`57072fb5551c340ad3e2cee49bf55e31f8a798b7`
- Plan Lock first commit：`7033a03f0b300f3dc7ce06042f5a157a07250314`
- 最終実行コード検証対象：`84bd175cc845da2eac2a1d6847e5ca10fe3142d3`
- Plan digest：`ad04ae44c10ec0340f7de70921dd9a4b68efcf4e585f1f774857b8cb51add8f6`
- verificationState：`UNVERIFIED`（repositoryの現行契約どおり。実機未確認をPASSにしない）

## 確認したもの

- 独立して作った理想期待値36例：日本語6、英語5、混在7、曖昧7、既存文字／記号8、不明3。全例成功。コーパスは小さく、一般的な文章での精度を意味しない。
- 新規Nodeテスト12件：上記カテゴリ、原文とoffsetの連続性、最長ユーザー登録語、明示訂正、短い学習語が別の日本語を壊さないこと、3万文字、不正データ／保存不可。全成功。
- 既存lifecycle / release-validator / work-guideを含む合計70件成功。実行コードの最終修正後、新規12件は再実行。既存58件の対象ロジックはその修正で変更なし。
- Scope → Risk → Impact、base-owned trusted node-syntax：最終実行コードSHAで成功。Plan Lock整合成功。diff check成功。
- Lifecycle check（base比較）：成功。既存台帳は保持し、activeの新規1件だけ追加。
- 既存9公開作品のSearch/Share generator：一致。release-validator：FAIL 0 / HQ_REQUIRED 0。既存のWARNING 3 / EXTERNAL_CHECK_REQUIRED 56は未解消・未認証のまま。
- Headless Chromium、viewport幅375 / 390 / 430 / 1100px：例入力、混在候補、確定、取消、英字修正、確定後の記憶、再読込、ユーザー辞書、compositionstart/endと変換中の確定禁止、既存日本語保持、Clipboard拒否時の手動コピー案内、その後の確定で全文を置換しないこと、直前原文保持を確認。横はみ出しなし。pageerror 0、外部リクエスト0。
- 壊れた保存データは警告し、原データを自動上書きしないことをブラウザでも確認。
- 日本語フォントをテスト環境に追加して390px画面を目視。フォントは実装には同梱せず、ユーザー端末のシステムフォントを使用。

## 未確認・限定

- 実機iPhone/iPad Safariのソフトキーボード・候補・コピー・ダウンロード・長文執筆の手触り。
- WebKit実行：この環境に実行バイナリがない。Chromiumのviewport検証をSafari実機確認とみなさない。IME確認は合成DOMイベント。
- 一般的な漢字変換、巨大英語辞書、継続学習の精度、オフライン再起動保証は対象外。
- Github pushは自動承認審査に拒否され、read-onlyのremote branch確認でも対象branchは存在しなかった。ローカルcommitのみ。Draft PR・CI・merge・deployは未実施。

## 次の操作

`codex/mixed-note-phase1-20261005`を`SukimaStock/yumaniwa-town-staging`へpushし、main宛てのDraft PRを作成する許可を得てから実施する。productionには変更しない。PRでは上記SHAと未確認事項をそのまま引き継ぐ。
