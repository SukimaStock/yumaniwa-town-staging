# L100-4B-3 検証・再現

## 今回新規に確認したこと

- base `6a1707c106afb4bf0658a274edf404bbc541de64` のroot/AmberTime AGENTS、Change OS、Work Lifecycleを読取。AmberTime active。
- #805〜808、#810〜812、#815 のマージとmain祖先関係、#828/#831〜835/#837/#839 の未マージDraft状態を確認。詳細 `EVIDENCE.json`。
- 本編model/save/codecと研究依存5ファイルはB1/B2対象SHAとbyte同一。新runtime差分なし。
- 既存保存回帰 23/23 成功（Node v24.22.1/Linux、9,064.67913ms）。ログとSHAを `EVIDENCE.json` に収録。全スイートや100年の新規試験ではない。
- 設計の容量算術、入力SHAの先行provenance、性能値の出典、保証の分類を再読。
- 独立レビューと修正は `REVIEW.md`。新cold admission・初回保存・増分継承の実装試験ではない。

## 再現

repository rootから実行する。

```sh
node --test works/ambertime/tests/formal-save.test.mjs works/ambertime/tests/recall-save.test.mjs works/ambertime/tests/h1-b2-codec.test.mjs
node tools/change-plan-lock.cjs verify --lock .change-plans/ambertime-l100-4b-3/r0.lock.json
node -e "require('fs').writeFileSync('/tmp/ambertime-b3-plan.json',JSON.stringify(require('./.change-plans/ambertime-l100-4b-3/r0.lock.json').plan))"
node tools/change-scope-guard.cjs --plan /tmp/ambertime-b3-plan.json --head HEAD
node tools/change-risk-check.cjs --plan /tmp/ambertime-b3-plan.json --head HEAD
node tools/change-impact-check.cjs --plan /tmp/ambertime-b3-plan.json --head HEAD
git diff --check 6a1707c106afb4bf0658a274edf404bbc541de64 HEAD
```

Plan digest `56cb2dc8133426496fbaa9e49c9eb0ef2ddb47a88bb29896ce7c915bf8229ae5`。
Plan-only先行commit：local `5e8795f8e67cf36a395df48ea347b2426dbfbba8`、remote `98c75771784a67ada845b73b92293c139ea8a686`。同一tree。通常git pushは認証情報がないため未実行で終了し、認証済みGitHub接続で同じPlan-first treeを作成した。

初期の未公開local Planはwork内JSONに必要なImpact宣言を欠きSTOPとなったため、修正を後付けせず同じmainから新branchでPlan-onlyを固定し直した。初期branchは公開していない。Gateの弱化やforce-pushなし。risk tool名の最初の誤記による起動失敗も正式結果に含めず、正しい `change-risk-check.cjs` を実行した。

Scope→Risk→Impactは候補差分に対してPASS。node-syntaxは実行可能source差分がないため適用対象なしであり、runtime test成功を意味しない。CIは最終PR headに結び付けて外部で確認する。正式のverificationStateはUNVERIFIEDを維持。

## 保護範囲・未確認

変更はこの研究ディレクトリのMarkdown/JSONとPlan Lockだけ。正式本編、保存形式、上限、計算、RNG、履歴、Canvas/UI、プレイヤーデータを変更していない。研究コードの取り込みなし。Production変更、マージ、IndexedDB正式実装、4C-2ブラウザー再構築は行わない。

100年再生・性能再測定は0回。iPhone Safari・ブラウザー永続性は未確認。既存証拠の再利用と今回の23回帰を混同しない。表現監査は技術判断に必要な説明だけとし、ゲームUIや作品紹介文は変更していない。
