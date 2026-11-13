# v1.4 検証記録

## 実行環境・対象

Node v24.22.1 / Linux。研究base #939 `abef91fa419b72ea7e533039070e99f3da88b66c`。
本編runtime、正式reader、保存形式を変更していない。合成seed 3/9の短い合法履歴のみを新規probeに使用し、実ユーザー保存は扱わない。

## 再現コマンドと結果

```
node --test --test-reporter=tap works/ambertime/design/trust-v14/native-probes.test.mjs
```

`native-probes.tap`: 7 test、7 pass、0 fail、0 skip。cold子processも正常終了。
初回の括弧誤記による構文失敗は `initial-syntax-failure.tap` に残す。修正後全件再実行。

```
node --test --test-reporter=tap \
  works/ambertime/tests/formal-lossless-save.test.mjs \
  works/ambertime/tests/formal-idb-proof-cache.test.mjs \
  works/ambertime/tests/formal-idb-storage.test.mjs \
  works/ambertime/tests/formal-idb-v03-faults.test.mjs \
  works/ambertime/tests/formal-idb-commit-boundary.test.mjs \
  works/ambertime/tests/formal-idb-validation-order.test.mjs
```

`regression.tap`: 45 test、45 pass、0 fail、0 skip、親process exit 0。模擬IDB故障経路であり実Chromiumではない。

`node --test --test-reporter=tap works/ambertime/tests/formal-idb-v03-entry.test.mjs` は6/6 PASS、exit 0 (`source-entry.tap`)。本編entry/source境界の既存回帰。

Plan JSONはlockの `plan` プロパティを抽出して使用する。

```
node tools/change-plan-lock.cjs verify --lock .change-plans/ambertime-trust-v14-20261113/r0.lock.json
node tools/change-scope-guard.cjs --plan /tmp/v14-plan.json --root . --json
node tools/change-risk-check.cjs --plan /tmp/v14-plan.json --root . --json
node tools/change-impact-check.cjs --plan /tmp/v14-plan.json --root . --json
```

初回worktree scope/risk/impactは全exit 0。最終candidateのTrusted Static・remote CI・独立reviewはPR本文およびcheck-runを正本とする。未完了のものを本書で合格と先取りしない。

## 未実施と範囲

代替checkpoint readerを作らない事前判定のため、新方式Labの13 faultケース、5戦略100年の再生成/再測定、実Chromium、iPhone、物理容量不足、OS強制終了・電源断は今回実施しない。既存候補の測定・CIを新方式の成功へ流用しない。

この研究はDraft限定。Staging/Productionのmerge・配信なし。研究branch内の先行未マージruntimeは依存関係であり、このPRの変更ではない。

## 独立レビューの限定事項

`INDEPENDENT-REVIEW.md`: 別担当によるコード・資料レビュー、blocking findingsなし。独立した試験再実行やremote CI認証ではない。
入力は不変のJSON文字列であり、参照試験が実際に攻撃するのは返却game同士。cash改変probeで再計算するSHAはreaderへ渡さない例示値で、偽造IDB envelopeのend-to-end試験ではない。実際のcache envelope境界は別probeで検査する。
固定Planの参照path誤記はscope変更ではないことをレビューし、lockは変更しない。正式gateが拒否した場合にこの判断で迂回しない。
