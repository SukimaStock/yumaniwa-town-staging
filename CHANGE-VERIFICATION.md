# Yumaniwa Change Verification Contract v0.1

制定: 2026-09-28

この文書は、Change Planに従って実装した変更について、
**どのcommit SHAで、何を確認し、何がまだ未確認か**を記録する契約である。

目的は「確認しました」という曖昧な完了報告を増やすことではない。

- Scope GuardとImpact Checkの対象SHAを固定する
- Planで要求したstatic / impact / manual checkの実施証拠を残す
- manual checkをCI成功で代用しない
- 確認後にコードが変わった場合、古い確認結果を使い回さない
- staging verificationとproduction verificationを混同しない

ことを目的とする。

変更分類は \`CHANGE-OPERATIONS.md\`、
実装前契約は \`CHANGE-PLAN.md\` を正本とする。

Verification RecordはRelease Completeの証明ではない。
外部Goal、本番配信、production実機など、別契約の確認はそれぞれのRelease手順に従う。

---

## 1. Verification Target

v0.1は **staging commit SHA** を対象とする。

Verification Recordを作る時点では、確認対象変更をCommit済みにする。
未Commit worktreeはScope Guard / Impact Checkには使えるが、
「この状態を確認済み」と固定するVerification Recordには使わない。

Recordには必ず次を持つ。

- \`baseSha\`: Change Planのbase SHA
- \`verifiedSha\`: 実際に確認したstaging commit SHA
- \`change\`: Planと同じ変更名
- \`recordedAt\`: 記録時刻
- \`recordedBy\`: 誰が記録したかを識別できる短い表現

\`verifiedSha\` が後からHEADではなくなっても、記録自体は過去の証拠として有効。
ただし新しいHEADを「確認済み」と扱う根拠にはならない。

---

## 2. Verification State

checkerが導出する状態は次の3つ。

### VERIFIED

次をすべて満たす。

- recordとPlanのchange / baseShaが一致
- verifiedShaが指定HEADと一致
- Scope Guard PASS
- Impact Check PASS
- Planの \`staticChecks\` がすべてPASS evidence付き
- Planの \`impactChecks\` がすべてPASS evidence付き
- Planの \`manualChecks\` がすべてPASS evidence付き

### UNVERIFIED

Planに必要なcheckが、

- missing
- \`unverified\`
- \`fail\`

のいずれか。

この状態では「staging verified」と言わない。

### INVALID

record形式、Plan形式、Git関係、SHA関係などが不正で評価不能。

CLI exit codeは2。

---

## 3. Record Shape

machine-readable record:

\`\`\`json
{
  "schema": "yumaniwa-verification-record/0.1",
  "change": "curry shopを右へ2 world px移動",
  "environment": "staging",
  "baseSha": "<plan base sha>",
  "verifiedSha": "<verified staging commit sha>",
  "recordedAt": "2026-09-28T12:34:56Z",
  "recordedBy": "Owner + ChatGPT",

  "conditionalAcknowledgements": [
    {
      "path": "index.html",
      "reason": "data script cache fingerprint needed to change"
    }
  ],

  "staticChecks": [
    {
      "id": "Scene Contract",
      "status": "pass",
      "evidence": "node --test tests/test-town-scene-contract.cjs"
    }
  ],

  "impactChecks": [
    {
      "id": "scene.collision",
      "status": "pass",
      "evidence": "Scene Contract PASS and owner walk test on iPhone"
    }
  ],

  "manualChecks": [
    {
      "id": "店前の歩行",
      "status": "pass",
      "evidence": "Owner checked staging on iPhone at verifiedSha"
    }
  ],

  "notes": "Optional short note"
}
\`\`\`

Record JSONをrepositoryへ常設する必要はない。

推奨保存先:

- staging-only Lite変更: 作業報告 / chat内のVerification summary
- Standard / Full変更: PR本文、監査記録、作業報告
- production昇格: PRまたはrelease verification comment

時刻ごとのJSONをrepositoryに大量保存する運用にはしない。

---

## 4. Check Entry

\`staticChecks\` / \`impactChecks\` / \`manualChecks\` の各entryは:

\`\`\`json
{
  "id": "Planに書いたcheck IDと完全一致",
  "status": "pass",
  "evidence": "何を確認したか"
}
\`\`\`

status:

- \`pass\`: 実施し問題なし
- \`fail\`: 実施し問題あり
- \`unverified\`: 未実施または確認不能

Planで必須にしたcheckをVerification時点でN/Aへ変更しない。
N/AにしたいImpactは、実装前Planの \`impactExclusions\` へ理由付きで置く。

\`evidence\` は全statusで必須。

例:

\`\`\`json
{
  "id": "mobile",
  "status": "unverified",
  "evidence": "Owner実機確認待ち"
}
\`\`\`

---

## 5. Conditional Acknowledgement

Scope Guardのconditional pathを実際に使用した場合、
Recordへ理由付きで残す。

\`\`\`json
{
  "conditionalAcknowledgements": [
    {
      "path": "index.html",
      "reason": "data script cache fingerprint was updated"
    }
  ]
}
\`\`\`

\`path\` はPlanの \`conditionalPaths[].path\` と完全一致させる。

checkerはこのpathをScope Guardへ渡して再評価する。

conditional pathを変更したのにRecordにacknowledgementがなければ、
Scope Guardが \`SCOPE_REVIEW_REQUIRED\` となりVerificationは成立しない。

---

## 6. What the Checker Verifies

\`tools/change-verification-check.cjs\` は次を行う。

1. Change Planをvalidation
2. Verification Recordをvalidation
3. \`baseSha → verifiedSha\` のGit diffを取得
4. recordの \`verifiedSha\` と指定HEADが一致するか確認
5. conditional acknowledgementを使ってScope Guardを再評価
6. Impact Rulesを使ってImpact Checkを再評価
7. Planのstatic checksとRecordを照合
8. Planのimpact checksとRecordを照合
9. Planのmanual checksとRecordを照合
10. VERIFIED / UNVERIFIEDを出力

重要:

- Scope Guard / Impact CheckのPASS文字列をRecordから信用しない
- checkerが同じSHAで再計算する
- manual verificationの真偽そのものを機械が観測したとは扱わない
- manual evidenceは実施者の明示記録

---

## 7. CLI

\`\`\`sh
node tools/change-verification-check.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --record /tmp/yumaniwa-verification.json \
  --head HEAD
\`\`\`

JSON出力:

\`\`\`sh
node tools/change-verification-check.cjs \
  --plan /tmp/yumaniwa-change-plan.json \
  --record /tmp/yumaniwa-verification.json \
  --head HEAD \
  --json
\`\`\`

\`--head\` を省略した場合は \`HEAD\` を使う。

exit code:

- \`0\`: VERIFIED
- \`1\`: UNVERIFIED / STOP
- \`2\`: record / Plan / Git入力が不正、または評価不能

---

## 8. Exact SHA Rule

manual verificationは必ず \`verifiedSha\` に対して行う。

例:

\`\`\`text
manual check
  verifiedSha = abc123
        ↓
code changes
        ↓
HEAD = def456
\`\`\`

この場合、abc123のmanual checkをdef456へ自動継承しない。

checkerへ \`--head def456\` を渡すとrecord SHA mismatchで止まる。

変更内容から見て再確認不要と判断する場合も、
新しいVerification Recordを作り、その判断根拠をevidenceへ明示する。
古いrecordを書き換えて「最初からdef456を確認した」ことにしない。

---

## 9. Who Can Record What

### AI / CI

記録してよい:

- syntax
- automated tests
- validator
- generator check
- Git diff
- Scope Guard
- Impact Check
- GitHub Actions結果

観測していない実機操作をPASSにしない。

### Owner

記録できる:

- iPhone / PC実機
- 見た目
- 音
- 操作感
- 歩行
- collision
- tap
- 戻る / 再入場
- 作品や町の味に関する最終確認

Ownerが「確認した」「問題ない」と伝えた場合、
その発言をmanual evidenceとしてRecordへ反映してよい。

---

## 10. Lite / Standard / Full

Verification Recordのschema自体は共通。

### Lite

短くてよい。

\`\`\`text
SHA
Scope
必要Impact
static
manual
\`\`\`

### Standard

asset / work / placementの複数観点を記録する。

### Full

SYSTEM / WORLD / Retirementでは、

- regression
- boundary cases
- rollback確認
- representative manual verification

をPlan側で具体的なcheckとして定義し、その結果をRecordへ残す。

Record側で新しいcheckを後付けして設計不足を隠さない。

---

## 11. Promotion Boundary

staging VerificationがVERIFIEDでも、production反映許可にはならない。

\`\`\`text
STAGING VERIFIED
    ↓
Owner requests promotion
    ↓
production branch / PR
    ↓
Production Safety Checks
    ↓
merge / Pages
    ↓
production verification
\`\`\`

\`environment: staging-production\` のPlanでも、
このv0.1 Recordが証明するのはstaging verifiedShaまで。

productionのmerge SHAやPages確認はRelease Operations側へ記録する。

---

## 12. Anti-Patterns

禁止:

- HEADを確認せず「最新を確認済み」と書く
- CI成功だけでmanual checkをPASSにする
- Ownerが確認していない実機操作をAIがPASSにする
- failed checkをRecordから削除してVERIFIEDに見せる
- conditional acknowledgementを理由なしで追加する
- Planにないmanual checkをrequired checkの代わりにする
- 古いSHAのrecordを新HEADへ流用する
- staging VERIFIEDをRelease Completeと呼ぶ
- Verification Recordを巨大な恒久databaseへ育てる

---

## 13. Operating Principle

\`\`\`text
PLAN
  何を確認する必要があるか
      ↓
IMPLEMENT
      ↓
SCOPE / IMPACT
  何を触ったか・何を見るべきか
      ↓
VERIFY
  実際に何を確認したか
      ↓
VERIFICATION RECORD
  どのSHAで確認したか
\`\`\`

OSは確認を代行したふりをしない。

**確認済み・未確認・誰の判断かを混ぜないこと**が、このRecordの役割である。
