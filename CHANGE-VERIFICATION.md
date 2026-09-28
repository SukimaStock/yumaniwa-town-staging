# Yumaniwa Change Verification Contract v0.3

制定: 2026-09-28

この文書は、Change Planに従って実装した変更について、
**どのtrusted Change OSで、どのrepository / commit / treeを、何によって確認したか**
を固定する契約である。

v0.3の原則は一つ。

> **機械で取得できる証拠は、機械に取得させる。  
> 人間にしか観測できない事実は、人間のattestationとして残す。**

「testを実行した」「Ownerが見た」という自由記述だけでVERIFIEDへ進めない。

変更分類は `CHANGE-OPERATIONS.md`、
Plan契約は `CHANGE-PLAN.md` を正本とする。

---

## 1. Trusted Verification Model

```text
LOCKED PLAN
   ├─ changeId
   ├─ repository
   ├─ baseSha
   └─ planDigest
        ↓
trusted Change OS
  clean checkout @ baseSha
        ↓
candidate target SHA / tree
        ↓
MECHANICAL EVIDENCE
  command ID / argv
  exit code
  output digest
  checker/rule digest
  CI run reference
        +
HUMAN ATTESTATION
  performedBy
  observedSha
  device
  attestationRef
        ↓
VERIFICATION
```

Verification checker自身も、locked Planの `baseSha` に一致する
**cleanなtrusted OS checkout** から実行する。

candidate branch内の変更済みchecker / Ruleを、
そのcandidate自身を認定するtrusted gateとして使わない。

---

## 2. Mechanical Evidence

static checkはVerification Recordへ自由記述でPASSを書かない。

Planの `staticChecks` には、
trusted baseの `tools/change-static-checks.cjs` に登録されたcheck IDを書く。

例:

```json
{
  "staticChecks": [
    "node-syntax",
    "change-operations-regression"
  ]
}
```

`tools/change-evidence-runner.cjs` が実際にcheckを実行し、次を採取する。

- locked `baseSha`
- target `verifiedSha`
- target tree SHA
- trusted OS HEAD / tree SHA
- checker / Rule file digest
- provenance bundle digest
- command ID / argv
- exit code
- signal / execution error
- stdout / stderr digest
- 実行時間
- GitHub Actions run / job / workflow / log reference（CI時）

PASSは実測したexit codeから導出する。
「node --testを実行した」という文字列は証拠にならない。

unknown static check IDはFAIL。
必要な新checkはChange OS側で先に設計・登録する。

---

## 3. Trusted OS Provenance

`tools/change-provenance.cjs` はtrusted Change OS checkoutについて、

- HEAD SHA
- tree SHA
- clean / dirty
- tracked / untracked dirty entry
- checker / Rule各fileのSHA-256
- bundle digest

を取得する。

次はtrusted verificationとして拒否する。

- OS HEADがlocked `baseSha` と違う
- tracked変更が残っている
- untracked fileが残っている
- provenance対象のchecker / Ruleが欠けている

つまり、

```text
target diffはcommit固定
でもRuleだけローカルで弱めた
```

という状態をVERIFIEDへ使えない。

OS自身を更新する変更は、
**更新前のtrusted OSで検査し、merge後の次の変更から新OSをtrusted版として使う。**

---

## 4. Human Attestation

人間の観測が必要なものだけattestationにする。

例:

- iPhone / PC実機
- 見た目
- 音
- 操作感
- 歩行
- collision
- tap
- 戻る / 再入場
- 町や作品の「これで良い」というOwner判断

Record例:

```json
{
  "humanAttestations": [
    {
      "id": "iPhone walk",
      "status": "pass",
      "performedBy": "Owner",
      "recordedBy": "ChatGPT",
      "observedSha": "<verified sha>",
      "device": "iPhone",
      "attestationRef": "chat:owner-confirmation",
      "attestedAt": "2026-09-28T06:20:00Z"
    }
  ]
}
```

意味:

- `performedBy`: 実際に見た人
- `recordedBy`: 記録へ転記した主体
- `observedSha`: 実際に観測したSHA
- `device`: 観測環境
- `attestationRef`: 会話・issue・check記録など参照先
- `attestedAt`: 観測時刻

AIがOwnerの発言を転記することはできる。
ただし `performedBy: "ChatGPT"` と偽ってOwner確認を代行しない。

manualの真実性を暗号学的に証明することまでは求めない。
**証言は証言として、誰のどのSHAへの発言かを固定する。**

---

## 5. Verification Record v0.3

Recordはhuman attestationとidentityを持つ。
mechanical evidenceそのものはrunnerが生成するため、
Recordへ手書きしない。

```json
{
  "schema": "yumaniwa-verification-record/0.3",
  "changeId": "example-change",
  "planDigest": "<sha256>",
  "planRevision": 0,
  "repository": "SukimaStock/yumaniwa-town-staging",
  "change": "変更内容",
  "environment": "staging",
  "baseSha": "<locked base sha>",
  "verifiedSha": "<verified candidate sha>",
  "recordedAt": "2026-09-28T06:30:00Z",
  "recordedBy": "ChatGPT",
  "conditionalAcknowledgements": [],
  "humanAttestations": []
}
```

Recordはlocked Planと次が一致する必要がある。

- `changeId`
- `planDigest`
- `planRevision`
- `repository`
- `change`
- `baseSha`

v0.3 Recordへ次を入れてはいけない。

- free-form `staticChecks`
- free-form `impactChecks`
- free-form `manualChecks`

v0.1 / v0.2 Recordは過去の記録として残せるが、
trusted v0.3 VERIFIEDの根拠にはならない。

---

## 6. Exact SHA / Time Rule

Recordの `verifiedSha`、
mechanical evidenceのtarget SHA、
human attestationの `observedSha`
は同じ対象を指す。

```text
Owner checks abc123
      ↓
new commit def456
```

abc123のattestationをdef456へ流用しない。

`recordedAt` / `attestedAt` は有効な時刻で、
大きく未来の時刻を受け付けない。

---

## 7. Verification Command

trusted base checkout側のcheckerを使う。

```sh
node <trusted-base>/tools/change-verification-check.cjs \
  --lock <candidate-plan-lock.json> \
  --record <verification-record.json> \
  --root <candidate-checkout> \
  --head HEAD \
  --mechanical-output <mechanical-evidence.json>
```

checkerは内部でmechanical evidenceを再生成する。

つまり、外から渡された

```json
{"status":"pass"}
```

のような「完成済みmechanical report」を信用してVERIFIEDにしない。

---

## 8. Verification State

出力を分離する。

```text
Mechanical: VERIFIED / UNVERIFIED
Human:      VERIFIED / UNVERIFIED
Verification: VERIFIED / UNVERIFIED
```

### Mechanical VERIFIED

少なくとも:

- Plan Lock valid
- repository identity一致
- exact target SHA
- Scope PASS
- Risk PASS
- Impact PASS
- trusted OS provenance PASS
- PlanのstaticChecksをrunnerが実測PASS

### Human VERIFIED

- PlanのmanualChecks全件にattestationがある
- `observedSha == verifiedSha`
- fail / unverifiedがない

manualChecksが空で、正当なexemptionがPlanにある場合は
Human側に未確認項目はない。

### Overall VERIFIED

MechanicalとHumanの両方が成立した時だけ。

ただし、

**staging VERIFIED = production Release Complete ではない。**

---

## 9. PR Gate

base-owned `.github/workflows/change-pr-gate.yml` は、
Phase Cがtrusted baseへ入った次のPRからmechanical evidenceを自動採取する。

workflowは `pull_request_target` でbase側定義を使い、

- trusted base checkout
- candidate checkout
- fixed Plan Lock
- Scope / Risk / Impact
- Mechanical Evidence Runner

を接続する。

mechanical reportはGitHub Actions artifactとして一定期間残す。

Change OS更新PRでは、
そのPR自身の新runnerをtrusted runnerとして使わない。
merge後のcanaryで新runnerがbase-ownedとして実際に動くことを確認する。

---

## 10. Security Boundary

trusted regressionがcandidate側Change OS toolを実行する場合、
child processへGitHub tokenや任意secret環境変数を引き継がない。

ただしPhase Cの目的は、
悪意ある第三者コードを安全にsandbox実行する汎用基盤を作ることではない。

- PRはsame-repositoryに限定
- workflow定義とrunnerはtrusted base所有
- checkout credentialはpersistしない
- child environmentは最小化
- candidateをtrusted gate実装として採用しない

という境界で運用する。

---

## 11. Anti-Patterns

禁止:

- `status: pass, evidence: "testした"` をstatic証拠にする
- CIの存在を確認せず「CI PASS」と記録する
- candidate branchの変更済みRuleでcandidate自身を認定する
- dirtyなchecker checkoutからVERIFIEDを出す
- old SHAのmanual確認をnew SHAへ付け替える
- AI転記を人間本人の観測と混同する
- unknown static checkを文字列だけ追加して済ませる
- mechanical report JSONを手書きしてcheckerへ渡す
- staging VERIFIEDをRelease Completeと呼ぶ

---

## 12. Operating Principle

```text
PLANを固定する
      ↓
trusted OSを固定する
      ↓
機械に取れる証拠は機械が取る
      ↓
人間にしか見えないものだけ人間が証言する
      ↓
同じSHAへ結び付ける
```

v0.3の目的は、確認を重くすることではない。

**「確認したこと」と「確認したと書いただけ」を分けること**である。
