# Yumaniwa Change Verification Contract v0.2

制定: 2026-09-28

## 現在のcanonical state（通常運用で最優先）

現在の正式な `verificationState` は **`UNVERIFIED`**。末尾のCurrent Closure Boundaryとこの節を、過去のVERIFIED表現より優先する。

- required checksはPlan / Scope / Risk / Impact / Trusted Static Evidenceを検査する。
- `tools/change-verification-check.cjs` の旧v0.2 Record checkerは **record / schema / internal consistency check**。exit 0はPlan Lock・対象SHA・申告されたcheck結果の内部整合を確認したことだけを意味する。
- 互換のため残る旧出力 `verificationState: VERIFIED` / `Verification: VERIFIED` は、このchecker内の旧ラベル。trusted evidenceの最終統合、実機確認の認証、現在のfinal VERIFIEDへ読み替えない。
- manual / 外部確認は、実際に観測できた内容と未確認事項を分けて報告する。Recordに `pass` と書かれているだけで、その観測の真実性を証明したことにはならない。
- Verification Record v0.3、live Human Attestation、automatic / final VERIFIED、Phase D / Phase Eは **intentionally deferred**。今回のcleanupで実装・有効化しない。

下記v0.2のschema・CLIは記録整合確認のために維持する。checker本体やexact-blob contractは変更しない。

この文書は、Change Planに従って実装した変更について、
**どの固定Planを使い、どのrepository / commit SHAで、何を確認したか**を記録する契約である。

目的は「確認しました」という文字列を増やすことではない。

- 実装前に固定したPlanとVerificationを結び付ける
- Planのbase/check listを後から差し替えて失敗を消せないようにする
- repository取り違えを止める
- Scope / Risk / Impactを同じtargetへ再評価する
- staticとmanualを混同しない
- 確認後にHEADが進んだら古いRecordを最新確認として使わない

変更分類は `CHANGE-OPERATIONS.md`、
Plan契約は `CHANGE-PLAN.md` を正本とする。

---

## 1. Trusted Input

v0.2のVerificationは**mutableなPlan JSONを直接受け取らない**。

入力はPlan Lockである。

```text
Plan READY
   ↓
Plan Lock
   ├─ changeId
   ├─ revision
   ├─ repository
   ├─ baseSha
   └─ planDigest
   ↓
implementation
   ↓
Verification Record
   └─ same planDigestを参照
```

`tools/change-plan-lock.cjs verify` がdigestを再計算する。
Lock後にPlan本文を書き換えた場合はINVALID。

v0.1のPlan / Recordは履歴として読めても、
v0.2のtrusted high-risk verificationを満たしたことにはしない。

---

## 2. Verification Record

v0.2 Recordは少なくとも次を持つ。

```json
{
  "schema": "yumaniwa-verification-record/0.2",
  "changeId": "example-change",
  "planDigest": "<sha256>",
  "planRevision": 0,
  "repository": "SukimaStock/yumaniwa-town-staging",
  "change": "変更内容",
  "environment": "staging",
  "baseSha": "<locked base sha>",
  "verifiedSha": "<verified commit sha>",
  "recordedAt": "2026-09-28T12:34:56Z",
  "recordedBy": "Owner / ChatGPT / CI",

  "conditionalAcknowledgements": [],

  "staticChecks": [
    {
      "id": "syntax",
      "status": "pass",
      "evidence": "実施結果への参照"
    }
  ],

  "impactChecks": [
    {
      "id": "scene.collision",
      "status": "pass",
      "evidence": "確認内容"
    }
  ],

  "manualChecks": [
    {
      "id": "iPhone walk",
      "status": "pass",
      "evidence": "OwnerがverifiedShaを確認"
    }
  ]
}
```

RecordはPlan Lockの次と完全一致する必要がある。

- `changeId`
- `planDigest`
- `planRevision`
- `repository`
- `change`
- `baseSha`

---

## 3. v0.2 Record整合確認

`tools/change-verification-check.cjs` は同じtargetについて次を再評価する。

1. Plan Lock digest / revision
2. repository identity
3. verified SHA
4. Scope Guard
5. Risk Gate
6. Impact Check
7. Planのstatic check evidence
8. Planのimpact check evidence
9. Planのmanual check evidence

```sh
node tools/change-verification-check.cjs \
  --lock /tmp/yumaniwa-change-plan.lock.json \
  --record /tmp/yumaniwa-verification.json \
  --root . \
  --head HEAD
```

Plan revisionを使う場合は必要に応じて `--previous-lock` も渡す。

exit code:

- `0`: Recordのschema / 内部整合に阻害なし（旧出力名はVERIFIED。現在のfinal VERIFIEDではない）
- `1`: UNVERIFIED / gate STOP
- `2`: Plan Lock / Record / Git入力が不正

---

## 4. 旧v0.2 checkerの成功条件

旧checkerは次の内部整合を確認する。確認行為そのものを認証する条件ではない。

- locked PlanとRecordが一致
- target repositoryがPlanと一致
- RecordのverifiedShaがtargetと一致
- Scope PASS
- Risk PASS
- Impact PASS
- Planで必須にしたcheckが欠けていない
- fail / unverifiedが残っていない

これらが揃っても現在の正式なstateは `UNVERIFIED` のまま。**Record整合確認成功はtrusted verification完了でもproduction Release Completeでもない。**

productionは別途、

```text
staging verified SHA
   ↓
production candidate
   ↓
PR / Production Safety Checks
   ↓
merge / Pages
   ↓
production verification
```

を通す。

---

## 5. Mechanical Evidence と Human Attestation

ここは境界を明確にする。

### Mechanical

本来runnerが取得できるもの:

- syntax
- test exit code
- validator
- generator check
- Git diff
- Scope / Risk / Impact
- CI run / target SHA

### Human

人間の観測が必要なもの:

- iPhone / PC実機
- 見た目
- 音
- 操作感
- 歩行
- collision
- tap
- 戻る / 再入場
- 作品・町の味

AIは観測していないmanual checkをPASSにしない。

### C3-2時点のtrust boundary

C3-1でPlan identity / repository / Scope / Risk / Impactをbase-owned mechanical evidenceへ移した。
C3-2ではPlanの `staticChecks` をbase-owned Trusted Static Registry / Executorへ接続する。

trusted static evidenceはexact candidate SHAに対して、少なくとも次を記録する。

- repository
- base SHA / target SHA
- Plan Lock path / commit / blob
- actor / triggering actor
- run ID / run attempt
- workflow ref / workflow SHA
- registry schema / version / base-owned blob SHA
- Risk Policy base-owned blob SHA
- Static Executor base-owned blob SHA
- check ID / definition version / fixed executor kind
- applicability
- PASS / FAIL / N/A
- exit code
- check固有machine evidence

`change-operations-regression` はsecurity-critical fileを
base-owned registryに事前登録されたexact Git blobへ照合する。
候補branch側registryはcurrent PRのexecutor dispatchには使わないため、
registry変更とcontracted file変更を同一PRで自己承認できない。

candidate registryがbaseと異なる場合は、base-owned executorがcandidate registryをinert JSONとして読み、
`registryTransition` evidenceを生成する。
許可されるtransitionは閉じている。

- unchanged registry
- steady → one-path pending authorization（target fileはfromBlobのまま）
- pending → steady cleanup（target fileは事前承認toBlob）

contract path追加・削除、unrelated contract drift、check/executor定義変更、
same-PR authorization + target file変更、pendingのretargetはFAIL。
`registryTransition` がFAILなら `staticOk=false` とする。

`node-syntax` はcandidate sourceを実行せず、safe temp fileへの `node --check` だけを行う。
unknown IDは明示FAIL、非該当はN/AでありPASSではない。

Static Evidence artifactは
`trusted-static-evidence-<run id>-attempt-<attempt>`
としてMechanical Evidenceとは別に残す。
static failureは既存ruleset-required `trusted-mechanical-evidence` jobをFAILさせ、
未保護の別statusへ逃がさない。

一方、現行Verification Recordの文字列 `evidence` をこのartifactへ最終統合すること、
Authenticated Human Attestation、final `VERIFIED` はまだ行わない。

C3-2完了時点:

- trusted mechanical evidence: あり
- trusted static evidence: あり
- authenticated human attestation: なし
- final `VERIFIED`: **成立させない**

### C3-3 verifier install時点

`tools/change-verification-check.cjs` には、GitHub認証済みPR commentを
immutable Plan Lock / exact PR head SHA / locked `manualChecks` へ束ねる
standalone `attest` modeを追加する。

このmodeはEvidence生成用のverifierであり、現時点ではlive workflowから呼ばない。

attestationが保持するtrusted identity:

- repository / PR number
- base SHA / target SHA
- Plan changeId / revision / digest / manualChecks
- GitHub comment user login / immutable numeric user ID
- GitHub event sender login / immutable numeric user ID
- repository owner login / immutable numeric user ID
- author association（provenanceのみ。authorizationには使わない）
- comment ID / createdAt / URL
- comment body SHA-256 / byte count
- optional note SHA-256 / byte count
- base-owned verifier Git blob

raw comment body / raw noteはattestation artifactへ複製しない。

1 commentはPlanの `manualChecks` 全件をexact setとしてattestする。
partial / extra / duplicate / stale SHA / fork PR / non-default-base PR /
bot identity / GitHub sender mismatch / verifier blob mismatchはREJECTする。

ただしC3-3 verifier installだけでは、

- issue_comment workflow: 未導入
- live Human Attestation artifact: 未生成
- Verification Record v0.3統合: 未実装
- final `VERIFIED`: **成立させない**

初期C3-3 policyでは、human attesterを**repository owner本人だけ**に限定する。

- repository ownerはGitHub eventの `repository.owner` をtrusted sourceとする
- ownerは `type=User` でなければならない
- owner login / immutable numeric user ID がcomment userとsenderの両方へ一致することを要求する
- `author_association` は証拠として残すが、Owner権限の代わりにはしない
- delegated attester / organization-owned repositoryは未対応。必要なら別のChange OS契約として追加する

live workflow導入時もこのowner-only verifier contractを変更せず使う。

---

## 6. Exact SHA Rule

manual verificationは `verifiedSha` に対して行う。

```text
Owner checks abc123
      ↓
new commit def456
```

abc123のRecordは過去の証拠として残せるが、
def456を確認済みとは扱わない。

新HEADへ進んだ場合は必要なcheckを再評価する。

---

## 7. Conditional Path

conditional pathを実際に使った場合は、Recordへ理由を残す。

```json
{
  "conditionalAcknowledgements": [
    {
      "path": "index.html",
      "reason": "approved cache fingerprint change"
    }
  ]
}
```

ただしacknowledgementは意味証明ではない。
「cache-onlyのはずなのにscriptを追加した」等のsemantic scope検査はRemediation Phase Eの対象。

---

## 8. High-Risk Changes

high-risk pathは `tools/change-risk-policy.cjs` の下限を満たす必要がある。

例:

- Change OS / workflow / shared runtime / root HTML-CSS / SW / manifest
  → SYSTEM / Full / HQ Review
- work runtime
  → WORK / Standard以上
- canonical asset
  → ASSET / Standard以上
- 未登録 executable/shared path
  → high-risk review

core ImpactはN/Aにできない。
profileが要求するImpactを全件除外してVERIFIEDへ進むこともできない。

---

## 9. Anti-Patterns

禁止:

- Verification時に別Planを作って差し替える
- 実装後HEADを新baseShaとして同じchangeIdへ使う
- failed checkをPlanから削除してRecordを作り直す
- repository名だけstagingと書いて別repositoryを認定する
- core ImpactをN/Aへ逃がす
- CI成功だけでOwner実機確認をPASSにする
- 古いSHAのRecordを最新HEADへ流用する
- free-form evidenceを「機械取得済み」と言い換える
- staging VERIFIEDをRelease Completeと呼ぶ

---

## 10. Operating Principle

```text
LOCKED PLAN
    ↓
IMPLEMENT
    ↓
SCOPE + RISK + IMPACT
    ↓
MECHANICAL CHECKS
    +
HUMAN ATTESTATION
    ↓
EXACT-SHA RECORD
```

OSは確認を代行したふりをしない。

**固定した計画、機械が確認した事実、人間が観測した事実を混ぜないこと**が、
Verificationの役割である。

---

## 11. Current Closure Boundary（2026-09-29）

Change Execution OSの現在の工事フェーズは、ここでいったん終了する。

現在stagingで成立しているtrust boundary:

- immutable Plan Lock
- exact base / target SHA
- base-owned Scope / Risk / Impact
- Trusted Static Evidence
- candidate codeを実行しないstatic check
- exact-blob Change OS contract
- same-PR self-authorization resistance
- active rulesetによるrequired check enforcement
- repository-owner-only Human Attestation verifier **foundation**

Human Attestation verifierはbase-owned sourceとして導入済みだが、
live `issue_comment` workflowからは呼ばれていない。
したがって現時点で「人間確認が自動認証される」とは扱わない。

次の項目は**未完成ではなく、現時点では意図的に保留**する。

- live `issue_comment` Human Attestation workflow
- `performed_via_github_app` を使ったAI / App投稿除外
- delegated attester
- organization-owned repository support
- Verification Record v0.3
- mechanical / static / human evidenceの最終統合
- automatic `VERIFIED` promotion
- Phase D
- Phase E

このため `verificationState=UNVERIFIED` は現在の正しい状態であり、
それ自体を直ちに解消すべき欠陥とは扱わない。

今後の通常変更では、既存のPlan / Scope / Risk / Impact / Static / Rulesetをそのまま使う。
Change Execution OSの工事を再開するのは、通常の湯間庭町制作で

- AIが未確認事項を確認済みとして進めた
- 現在のtrust boundaryでは防げない実事故が出た
- 手続きが制作を明確に阻害した
- 新しい具体的な権限要件が生まれた

など、**現実の問題が観測されたとき**とする。

認証システムとしての完全性だけを理由に、OSを拡張しない。

