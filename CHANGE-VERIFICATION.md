# Yumaniwa Change Verification Contract v0.2

制定: 2026-09-28

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

## 3. Verification Gate

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

- `0`: VERIFIED
- `1`: UNVERIFIED / gate STOP
- `2`: Plan Lock / Record / Git入力が不正

---

## 4. VERIFIED の意味

VERIFIEDには次が必要。

- locked PlanとRecordが一致
- target repositoryがPlanと一致
- RecordのverifiedShaがtargetと一致
- Scope PASS
- Risk PASS
- Impact PASS
- Planで必須にしたcheckが欠けていない
- fail / unverifiedが残っていない

ただし、**staging VERIFIED = production Release Complete ではない。**

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

### v0.2 A+B時点の制限

現行Recordの `evidence` はまだ文字列であり、
**static evidenceの実在性をrunnerが完全に採取・照合する仕組みはRemediation Phase Cの対象**である。

したがってA+B完了時点では、

- Plan identity / repository / Risk / Scope / Impactは機械gate
- static evidence provenanceは次Phase
- human manualはattestationとして扱う

と明示する。

A+Bだけで「すべての証拠がtrustedになった」と言わない。

### C3-2 bootstrap: trusted Change OS blob contract

C3-2の設計監査で、candidate sourceのsubstring存在確認だけでは
comment / dead stringへ同じ文字列を残してtrusted PASSを偽装できることが判明した。

そのためC3-2本体より先に、
`tools/change-os-contract.json` と `tools/change-os-contract.cjs` をbase-owned trust boundaryとして置く。

このcontractはsecurity-criticalなChange OS workflow/toolを
**literal Git path + mode/type + exact blob ID**で検査する。
YAML/JavaScriptの意味をcandidate sourceから推測せず、candidate codeも実行しない。

bootstrap後はcontract/verifier自身をcandidate側から変更できない。
両fileはtrusted base blobとの完全一致を要求する。

C3-2で必要な次版についてだけ、bootstrap時点でexact blobを先に許可する。
同じPRでcandidateが自分のblobを許可listへ追加することはできない。

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
