# 湯間庭町 — AI作業の入口

日常の追加・編集は staging (`SukimaStock/yumaniwa-town-staging`) で行う。
作品identityの正本は `data/works.js`。
探索・昇格状態の正本は `data/work-lifecycle.json`。作業開始時に `node tools/work-lifecycle.cjs --list` で対象の状態も確認する。
Search / Share v2 の日英文面・検索語彙・schemaTypeの正本は `data/work-search-meta.js`。
`w/<id>/` と `en/w/<id>/` と `sitemap.xml` は `tools/generate-work-search-pages.cjs` から生成する。生成物を直接編集しない。
変更種別と作業の重さは [CHANGE-OPERATIONS.md](CHANGE-OPERATIONS.md) で分類する。
repository変更前の実行範囲は [CHANGE-PLAN.md](CHANGE-PLAN.md) で固定する。軽量対象外PR / promotionではPlan Lockのdigestへ固定する。
実装後の確認証拠は [CHANGE-VERIFICATION.md](CHANGE-VERIFICATION.md) でexact SHAへ固定する。
手順は [OPERATIONS.md](OPERATIONS.md)、
Release完成判定の唯一の正本は [RELEASE-WORKFLOW.md](RELEASE-WORKFLOW.md)。
配置の契約は `tools/SCENE-DATA-CONTRACT.md` と `YUMANIWA-PIXEL-STANDARD.md` を参照する。

## 全新規制作の表現監査（2026-10-18）

新しいゲーム・アプリ・Webページ・UI・作品紹介文・noteは、生成前に独立共通基準 [EXPRESSION-AUDIT.md](EXPRESSION-AUDIT.md) を読む。Google Driveの共通基準を原典、既存の観察ログを実例集として扱う。

- **制作前**：文章・装飾の必要性を先に判断し、理由のない副題・詩的コピー・説明カード・結論は初期状態で置かない。既存の計画に短く含める。
- **制作中**：ボタンとの重複、独り言、詩的な句読点・改行、架空の感情・意図、定型セクションの自動付加を確認してAI側で削る。本人の自然な言葉を理由なく整えない。
- **完成前**：共通基準の6点を通常の検証と同時に確認し、操作発見性・アクセシビリティ・SEOの必要情報が保たれることを確認する。既存PR／報告へ結果と未確認を短く残す。

短文・比喩・擬音などを一律禁止しない。作品ごとの演出と必要な案内は採用できる。新しい承認工程・常設台帳は作らず、Change OS / Plan Lock / Scope / Risk / Impactと作者の採否・実機確認・Production判断を維持する。詳細手順は [OPERATIONS.mdの表現監査](OPERATIONS.md#新規制作の表現監査) を参照する。note単独にも共通基準を適用でき、repository作業を要求しない。

## 制作を守る優先原則（2026-10-11）

1. **新しい作品は試しやすく。** 既存の `works/<id>/`、町、Engine、公開URLに影響しない試作は、その作品の指示範囲で実装・試行・修正を進める。staging-onlyとproduction公開は別判断。独立した試作のために町全体を変更しない。
2. **今ある体験を壊しにくく。** 共通画面、既存の動線、操作、保存、Engineへの影響を最初に把握する。既存の町に新しい常時表示UIを加える場合は、SEO等の目的承認とは別に、具体的な表示案について作者の判断を得てから実装する。既存UIの局所修正など、依頼範囲内で具体的な未決選択のない可逆変更は、既存検査を通してstagingで試してよい。作者は実際の画面を見て、残す・直す・戻すを判断する。stagingマージやCI成功を作者の採用・実機確認とみなさない。
3. **失敗は簡単に戻す。** 指摘された既知の変更を取り消す場合は、独立した改善を残して最小差分で戻す。戻すための新しいデザイン会議や同じ承認の取り直しはしない。ただし現行PR/Plan Gateの検査を迂回してよいわけではない。
4. **承認を水増ししない。** 改善目的、可逆なstaging試行、作者による採用決定、production公開承認は別物。Planの `authority` / `ownerDecisions` / `hqDecisions` に文字列を記入するだけでは実際の承認証拠にならない。AIによるHQの設計整理と、作者が持つ選択権を混同しない。
5. **同じ作業指示を何度も聞き返さない。** 作者から明示されたstaging作業範囲には、必要なbranch・commit・PR・テスト・安全なstagingマージの実行を含めて扱う。新たな設計判断、範囲外の変更、production、接続サービス側の操作承認は別途確認する。

これは作業の**判断原則**であり、trusted base / exact Git blob保護を無効化しない。Plan Lock不要の3ルートと対象外条件は [CHANGE-PLAN.md §1](CHANGE-PLAN.md#1-plan-level) を唯一の詳細入口とする。新作・active作品の小変更・検証可能な部分復元は、その範囲に必要な差分確認と回帰だけを行う。AIは未確認の共有依存・保存・外部連携を軽量判定のPASSだけで安全扱いにしない。

## AIによる実行方法の選択（2026-10-14）

メインAIは複雑性、既存作品・Engineへの影響、可逆性、独立作業数、必要な検証、失敗時の影響から実行方法を選ぶ。コード量だけで判断しない。これは作業分担の判断であり、Change Class / Authority / risk floor / 軽量ルートの代替ではない。短い文書変更でもChange OSならSYSTEM / Fullの既存手順を守る。

| 作業 | 実行方針 |
| --- | --- |
| 軽量 | メインが直接処理。不要な計画書・分担を作らず関連回帰だけ行う。Plan免除はCHANGE-PLAN §1の適合時だけ |
| 通常 | 既存PR本文等に簡潔な計画。分担に効果がある調査・実装・検証だけ委任し統合する。軽量対象外は既存Lockを先に固定 |
| 大規模・高リスク | 依存順に分割。独立作業だけ並列化し、節目で成果を保存。重要な変更は実装担当以外のレビューを使う |

- 開始時に現在のモデル候補・対応エフォート・サブエージェント操作・並列上限・権限を実際のツール／設定で確認する。単純な調査・定型処理は軽量構成、通常実装は品質と効率の均衡、複雑な設計・不具合・重要レビューは高い推論能力を優先する。モデル名・最大並列数を固定せず、費用・待ち時間・文脈の引き継ぎも考慮する。
- 対応するspawn操作等があれば、現在許可されたモデル／エフォートをメインが選択する。本節は必要なサブエージェント分担を依頼するプロジェクト指示だが、上位の環境制限を解除しない。メインモデルの変更操作がない場合は現在のモデルを使い、変更したとは報告しない。未対応時は逐次実行し、利用者へ毎回モデル選びを差し戻さない。
- 委任には対象repository / SHA、目的、読取範囲または書込所有path、保護対象、検査、返す証拠を渡す。調査・実装・検証・レビューは必要な役割だけ使う。同じファイルの同時編集、依存する変更の同時実装を避け、共通ファイルへの統合はメインが担当する。枠が空いても独立性がなければ増員しない。
- メインは差分・結果・未完了／重複／失敗を照合して最終確認する。独立レビューが使えなければ明示し、差分の再読、既存回帰、境界ケース検査で補う。自己レビューを独立レビューと呼ばない。
- 長時間作業は [OPERATIONS.mdの中断と再開](OPERATIONS.md#長時間作業の中断と再開) に従う。GitHubの既存成果を先に照合し、完成済み機能やマージ済みPRを理由なく再実装しない。
- 同一問題への自動修正は最大3回。各回の原因仮説・修正・再テスト結果を既存記録へ残す。再開しても回数をリセットしない。解決しなければその問題への修正を止め、原因・試行・未解決点を報告し、独立作業を続ける。単なる再試行やモデル変更で無制限に繰り返さない。無関係なコードは変更しない。

実行方針・実際の操作・検証結果は必要な範囲でPR／報告へ短く残す。新しい管理台帳、常設ダッシュボード、全作業共通の進捗ファイルは作らない。承認済みstaging範囲では途中確認を繰り返さず、作者の採否・創作判断・production公開権限は従来どおり保持する。

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
- repository変更はまず3ルートへの適合を確認する。適合するstaging変更はPR本文の短いscope・関連回帰で進め、Full Planの作り直しを要求しない。対象外では実装前にChange PlanをREADYにし、high-risk / 通常PR / promotionではPlan Lockを固定し、実装後は Scope Guard → Risk Gate → Impact Check の順で照合する。Plan外path・risk floor違反・core Impact除外・未処理Impactが出たら完了扱いにせず停止する。
- `CHANGE-VERIFICATION.md` 冒頭の現在状態を優先する。final / automatic VERIFIEDは保留。旧v0.2 checkerのexit 0はRecord整合確認であり、trusted verification完了ではない。確認対象SHAと各結果を記録し、AIが観測していない実機確認をPASSにしない。
- Change OS自身、shared runtime、root HTML/CSS、Service Worker、manifest、未登録executable pathは `tools/change-risk-policy.cjs` の下限を優先する。依頼文が「軽く直して」でもCONTENT/Liteへ落とさない。
- Change OS自身の更新はstaging mainへ直接積まず、原則branch + locked Plan + PRで検査する。検査toolを変更するPRが自分の変更版だけで自己認証しないよう、trusted base gateを使う。
- 通常の作品追加で共通runtimeやscene方式を変更しない。既存URL・世界観を保持する。
- 未確認をPASSとしない。外部Goal・実機・本番配信は証拠がなければUNVERIFIED。
- Validator exit 0やCI成功をRelease Completeと言わない。
- stagingのopen集合をproduction公開対象へ自動採用しない。
- stagingをproductionへ丸ごとコピーしない。production変更は明示された作業範囲内で
  branch → PR → Safety Checks → mergeの既存手順による。force pushしない。
- Validatorを通すために検査を弱めたり、許可範囲外の作品・SEO・sitemapを直したりしない。
- `README.md`は訪問者向け。運用・debug手順を混ぜない。


## 新作・制作ツールのLAB接続（2026-10-14）

- 新しい試作・ゲーム・アプリ・実験室・制作ツールをstagingへ追加する作業には、LABへの接続と再生成・検証を含める。作者に別の接続依頼を求めない。具体的な手順は [OPERATIONS.mdのLAB接続](OPERATIONS.md#新作制作ツールのlab接続) を参照する。
- workのID/path/title/statusは既存の `data/work-lifecycle.json`、研究室の配置と短い説明は `data/lab-rooms.json` を正本とする。既存の配置・除外指定を優先し、重複登録しない。
- 分類が未指定の新しい遊べるactive/candidate workは、既存generatorが試作作業台の通常一覧へ自動で拾う。制作ツールは制作機材室、明確な研究対象は既存の該当室へ配置する。新しい部屋・作品名・公開状態を独断で作らない。
- 新しいWeb制作ツールは実在する入口を確認して制作機材室へ登録する。Web版がないものは利用環境を明記し、架空のリンクを作らない。模型・素材・内部buildを独立した作品として大量登録しない。
- 実装前に必要な台帳・配置・生成HTMLをscopeへ含め、同じ作業PRで `node tools/work-lifecycle.cjs --write-lab` → `--check` と関連回帰を実行する。これらの共有pathを含む差分は隔離軽量ルートへ押し込まず、従来のPlan Lock / Scope / Risk / Impactを使う。
- 作品更新で名称・説明・入口・探索状態が変わる場合もLABとの整合を確認する。凍結した試作は既存のArchive生成へ反映する。LAB接続はstaging-onlyであり、作者による採用・凍結・production公開の許可を代替しない。
- この自動化は制作担当AIの作業規則とgeneratorの自動検出である。独立した常駐botやマージ後の自動commitは導入していない。完成報告には接続先の部屋と検証結果を短く含める。

## Work lifecycle — staging-onlyがデフォルト

- 新しいwork・未登録workは常に **active / staging-only**。登録忘れもproduction許可にしない。`data/work-lifecycle.json`へID/path/title/statusを追加する。既存WORKSのopen/preparing/hiddenは町内表示であり、昇格許可ではない。
- active → frozen、または active → candidate → released。凍結／候補化はユーザーの明示的な指示を記録して実施する。AIが完成度からcandidateを推定しない。
- productionへ新規移行できるのはcandidateだけ。**candidateでも別の明示的なproduction反映指示が必要**。staging依頼、検証成功、merge指示、候補化をproduction指示へ拡張しない。
- frozenは探索終了。コード・画像・音・URLを保存し、原則追加開発しない。再開はユーザーの明示的な再開指示を`resumeDecision`へ記録し、frozen → activeへ戻してから行う。ARCHIVE.mdの記録修正はゲーム内容の変更と区別する。
- 凍結時はwork内のARCHIVE.mdに8項目を短く記録し、台帳のarchive/theme/freezeDecisionを設定する。`node tools/work-lifecycle.cjs --write-lab`でLABを更新する。
- `released`は既存公開の記録。公開集合への保持は新規移行ではない。公開済み作品の修正も別の明示的なproduction指示と既存Release手順が必要。
- production反映前は`node tools/work-lifecycle.cjs --promotion-check --ids <candidate IDs> --production-instruction '<今回のユーザー指示の参照>'`。read-onlyの適格性確認であり、ツール成功は公開実施・ユーザー許可の証明ではない。
- 対象だけを選別移送する。台帳全体、LAB、ARCHIVE、active/frozenのコード・asset・検索ページを本番へコピーしない。公開候補snapshotには公開対象の台帳項目だけを含め、昇格の判断は必ずstaging正本で行う。

詳しい手順と証拠の扱いは[OPERATIONS.md](OPERATIONS.md)、production検査は[RELEASE-WORKFLOW.md](RELEASE-WORKFLOW.md)。

## GitHubレビューと人間のToDo（2026-10-15）

- 自動レビューはAIが扱う技術的な対応候補。P1/P2や未解決スレッドだけで作者のToDoへ追加しない。現在のmain、後続PR、現行pathと照合し、現存性・実際の影響・自動修正可能性・対応要否・作者判断の必要性を確認する。
- 状態は対応済み／要修正／対応不要／追加検証とし、根拠のSHA・再現手順・結果を既存PRや作品内の検証記録に残す。未確認を完了扱いにしない。大きな新規タスク台帳や重複Pageを作らない。
- 明確な技術的不具合、テスト更新、CI対応、技術調査は、許可済みのStaging範囲でAIが既存のPlan Lock・Scope・Risk・Impact・回帰・PR・安全なマージまで行う。技術的な修正方法を作者に選ばせず、毎件「対応しますか？」と聞き直さない。共通基盤の副作用や既存ゲートの問題が解消しなければマージを止め、理由を残して独立作業を続ける。
- 作者への報告は問題と影響／現行コードの根拠と状態／AI推奨と対応方針／人間の判断（不要、または具体的な選択）を短く示す。同じ候補は新しい証拠や状態変化がなければ再通知しない。
- 人間のToDoは実指での触感評価、仕様・演出・デザインの採用、Production公開承認、本人だけができる外部操作などに限る。作者の好みや実機未確認をCI成功で完了にしない。
- 外部のToDo更新自動化は別の設定。リポジトリの記述変更だけで外部設定も変更済みとしない。読取専用の定期処理はコードを変更せず、AI対応提案として報告する。新たな無人マージ権限やProduction許可を与える規則ではない。手順はOPERATIONS.mdの「GitHubレビューの処理」を参照する。
