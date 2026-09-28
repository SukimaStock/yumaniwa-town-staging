# 湯間庭町 — AI作業の入口

日常の追加・編集は staging (`SukimaStock/yumaniwa-town-staging`) で行う。
作品identityの正本は `data/works.js`。
Search / Share v2 の日英文面・検索語彙・schemaTypeの正本は `data/work-search-meta.js`。
`w/<id>/` と `en/w/<id>/` と `sitemap.xml` は `tools/generate-work-search-pages.cjs` から生成する。生成物を直接編集しない。
変更種別と作業の重さは [CHANGE-OPERATIONS.md](CHANGE-OPERATIONS.md) で分類する。
repository変更前の実行範囲は [CHANGE-PLAN.md](CHANGE-PLAN.md) で固定する。high-risk / PR / promotionではPlan Lockのdigestへ固定する。
実装後の確認証拠は [CHANGE-VERIFICATION.md](CHANGE-VERIFICATION.md) でexact SHAへ固定する。
手順は [OPERATIONS.md](OPERATIONS.md)、
Release完成判定の唯一の正本は [RELEASE-WORKFLOW.md](RELEASE-WORKFLOW.md)。
配置の契約は `tools/SCENE-DATA-CONTRACT.md` と `YUMANIWA-PIXEL-STANDARD.md` を参照する。

## 判断権限の4層

| 層 | AIの範囲 |
| --- | --- |
| Standard | 承認済み入力からのmetadata登録、既存launch/frameMode、wページ、OGP参照、sitemap反映、validator、既存Release手順を機械的に実行 |
| Rule / Skill | 明文化済みnaming、work/game分類、Conditional test、既存profileの選択。適用した基準を記録 |
| HQ Review | 既存契約の変更。設計判断が済むまで該当変更を実装しない |
| Owner Decision | 作品名、地区、配置、店舗転用、OGP画像、紹介文の味、残す／消す、公開時期。AIは候補提示まで |

Assistは候補生成という作業方法であり、承認権限を変更しない。
既に許可されたStandard作業を何度も聞き直さない。一方、監査やstaging実装の依頼を
production公開・SNS投稿・外部設定変更の許可へ拡張しない。

## HQへ上げる境界

新launch、新frameMode、新venue、新scene navigation、新保存方式、共通runtime変更、
新Service Worker方針、新analytics体系、canonical方針変更、外部APIの常設依存、
runtime patch／compatibility例外、既存ID/URL/保存keyの変更はHQ対象。
既存schemaの範囲内の新規IDや、既に承認された施設slotへの登録までHQ化しない。

不足する契約、既存方式で収める案、最小拡張案、他作品への影響、必要な決定を短く示す。
判断が必要な部分だけ止め、影響しない調査・素材整理は進めてよい。
一度の前例だけで新しいStandardを作らない。

## 作業上の必須ルール

- 作業開始時に対象HEAD・差分・既存契約を読む。並行変更を上書きしない。
- repository変更では実装前にChange PlanをREADYにする。high-risk / PR / promotionではPlan Lockを実装前に固定し、実装後は Scope Guard → Risk Gate → Impact Check の順で照合する。Plan外path・risk floor違反・core Impact除外・未処理Impactが出たら完了扱いにせず停止する。
- stagingをVERIFIEDと呼ぶ前に、`CHANGE-VERIFICATION.md` に従いtrusted base runnerでmechanical evidenceを実測する。static PASSを自由記述で作らない。人間確認は `performedBy / recordedBy / observedSha / device / attestationRef` を分け、AIが観測していない実機確認をPASSにしない。
- Change OS自身、shared runtime、root HTML/CSS、Service Worker、manifest、未登録executable pathは `tools/change-risk-policy.cjs` の下限を優先する。依頼文が「軽く直して」でもCONTENT/Liteへ落とさない。
- Change OS自身の更新はstaging mainへ直接積まず、原則branch + locked Plan + PRで検査する。検査toolを変更するPRが自分の変更版だけで自己認証しないよう、trusted base gateを使う。checker / Ruleの実行元はcleanなlocked base SHAへ固定し、digestを証拠へ残す。
- 通常の作品追加で共通runtimeやscene方式を変更しない。既存URL・世界観を保持する。
- 未確認をPASSとしない。外部Goal・実機・本番配信は証拠がなければUNVERIFIED。
- Validator exit 0やCI成功をRelease Completeと言わない。
- stagingのopen集合をproduction公開対象へ自動採用しない。
- stagingをproductionへ丸ごとコピーしない。production変更は明示された作業範囲内で
  branch → PR → Safety Checks → mergeの既存手順による。force pushしない。
- Validatorを通すために検査を弱めたり、許可範囲外の作品・SEO・sitemapを直したりしない。
- `README.md`は訪問者向け。運用・debug手順を混ぜない。

