# 湯間庭町 リリース運用

湯間庭町では、staging と本番環境の差分が一方向に流れるよう、以下を基本ルールとする。

## 基本フロー

1. 変更・新機能・作品追加は、まず `yumaniwa-town-staging` に反映する。
2. staging で実機確認・表示確認・導線確認を行う。
3. 検証成功だけで本番へ移さない。新規移行はcandidate状態と、それとは別のユーザーの明示的なproduction反映指示が揃ったときだけ、確認済みの差分を `yumaniwa-town`（本番）へ反映する。
4. 本番反映後、staging と本番の意図した差分だけが残っていることを確認する。

原則として、**staging → 本番** の順序を崩さない。

## 本番を直接修正した場合

障害や公開中の不具合など、緊急対応として本番を先に修正することは許容する。

ただし、その場合は対応完了後に必ず同じ修正を staging に戻す。

本番だけに修正を残したまま、次の staging 作業を進めない。

## 本番反映前の確認

本番へ反映する前に、少なくとも以下を確認する。

- staging で対象機能が正常に動くこと
- staging にだけ残す実験コードやデバッグコードが混ざっていないこと
- 本番側にだけ存在する修正がないこと
- 本番側にだけ修正がある場合は、先に staging へ取り込んでから反映すること
- 作品追加時は、町内導線・直リンク・Manifest・更新履歴・必要な会話や計測も合わせて確認すること

## 差分がずれた場合

staging と本番の双方に独自変更がある場合、どちらか一方で丸ごと上書きしない。

変更内容を確認し、

1. 本番にしかない有効な修正を staging に戻す
2. staging で統合状態を確認する
3. 統合済み staging を基準に本番へ反映する

の順で解消する。

---

**基本原則: stagingを制作・探索の正本として保ち、許可された差分だけを本番へ移す。**

## 新作公開Policy v1（Phase 2・完成判定の正本）

既存の安全な差分移送手順を維持する。以下の全工程を満たして初めて新作公開を閉じる。
AIの判断権限は `AGENTS.md`、具体的なDesk/Editor操作は `OPERATIONS.md` を参照する。

### 六つのReady

| Ready | 完成条件と必要な証拠 |
| --- | --- |
| Town Ready | 意図した町内導線→正しい作品→主操作→町へ戻る→町操作の再開。新作は駅前看板の更新履歴 `data/updates.js`（`workIds`で作品IDを紐付け）と、おばけ会話 `data/ghost-dialogue.js` の `works[id]` まで揃える。physicalはobject/prop/trigger/workId、collision/tapと実際の接近・到達性を確認。端末・経路・確認SHAを記録 |
| Guide Ready | `status: "open"` の作品は `data/work-guide-meta.js` に所要時間・1件以上の有効な気分・ガイド用の一言を持ち、展示ガイドの「すべて見る」と該当する気分から自動で発見できる。production公開候補として選択した作品は `assets/works/<id>/ogp.jpg` または `icon.png` も必要。おすすめ枠は自動追加せずOwnerが明示的に選ぶ |
| Search Ready | productionの日本語 `/w/<id>/` と英語 `/en/w/<id>/` が揃い、双方index,follow。日英のtitle、meta description、本文、自己canonical、同一og:url、OGP image/alt、起動リンク、町リンク、相互hreflang（ja/en/x-default）、JSON-LD、sitemap収録、静的発見経路がある。JSなしで最低限理解でき、generator正本との一致と実配信を確認 |
| Share Ready | 標準share URLは `/w/<id>/`。OGP/X card、日本語一文、必要な操作説明・英語一文・画像/動画を採用し、選択した外部公開工程へ渡せる。SNS全件投稿は必須にしない |
| Observe Ready | 既存契約のWork Open/Close/Shareと必要なcore actionをID単位で判別。外部Goalと本番送信の証拠を確認。未確認はUNVERIFIED |
| Release Ready | production base SHA、staging確認SHA、production候補SHA、今回公開する作品、公開しないstaging差分、必要依存、環境差分、validation、rollbackが明確 |

Googleにindex済みであることや検索順位は条件ではない。発見・理解・index可能な条件を整える。
Work Openは**起動選択／起動試行**であり、ロード成功やプレイ完了ではない。
Closeは共通playerの退出のみ。externalタブの終了はN/A。Shareはnative共有成功のみで、
全コピー・画像保存を測らない。作品に不要なcore action/Shareは理由付きN/Aにできる。
Scene Visitや新session ID等の計測体系を追加しない。Plausible設定はrepositoryから推測しない。

### URL契約

| URL | 正式な役割 |
| --- | --- |
| `/w/<id>/` | 日本語の検索・共有ページ。production自己canonical、index可能、通常redirectなし、JSなしの本文とリンク。日本語の標準share URL |
| `/en/w/<id>/` | 英語の検索・共有ページ。自己canonical、英語本文・OGP文面・JSON-LDを持ち、日本語ページとhreflangで相互接続 |
| `/?work=<id>` | 町shellの実行入口。作品固有OGPを期待しない |
| `/w/<id>/?open=1` | 既存互換の直接起動shortcut。町shellへredirect可。通常share URLにしない |
| `/works/<id>/` | embedded実体・単体検証/standalone。検索代表でない。既存index/noindexは全面変更しない |
| 通常itch URL | 作品紹介/配布用 |
| itch embed-upload URL | 町内iframe専用。告知URLにしない |

stagingのwページはnoindexを維持する。production候補のnoindexはFAIL。
実行ページまで一律noindex禁止にしない。OGPは現在1200×630が推奨値。
別寸法は即FAILではなくカード確認WARNING。参照・MIME・宣言寸法と実体の不一致はFAIL。
同じ画像URLの転記を検査する。別OGP/X画像や別asset配置規約が必要なら契約をレビューする。

### Search / Share v2 生成契約

Search / Share面は町runtimeから分離して管理する。

- `data/works.js`: 作品identity・町内runtime・launchの正本。
- `data/work-search-meta.js`: 日英文面、share文面、genre、検索語彙、schemaTypeの正本。
- `tools/generate-work-search-pages.cjs`: 日英Searchページとsitemapのgenerator。
- `w/<id>/index.html`、`en/w/<id>/index.html`、`sitemap.xml`: 生成物。直接編集しない。
- generatorはstagingのopen集合を自動採用しない。毎回 `--published` でproductionに公開してよい全作品集合を明示する。
- metadataがstagingに存在しても、それだけでproduction公開対象にはならない。
- staging生成は `noindex,nofollow`、production候補生成は `index,follow,max-image-preview:large`。
- 日本語と英語はそれぞれ自己canonicalを持ち、両ページに `hreflang="ja"`、`hreflang="en"`、日本語を指す `x-default` を置く。
- OGP画像は既定 `ogp.jpg` / JPEG / 1200×630。別形式・別寸法を正式採用する場合はSearch metadataの `ogp` overrideへ明示し、1200×630以外は従来どおりカード確認WARNINGとする。
- `terms` は生成・監査・JSON-LD用の語彙台帳であり、`meta keywords` は生成しない。
- JSON-LDは作品意味の機械可読化に使い、存在しないrating/review等を追加しない。

Release Validatorは選択作品について、metadata正本、日英生成一致、自己canonical、OGP文面、相互hreflang、x-default、JSON-LD、robots、静的言語切替、日英sitemap収録を検査する。明示されたpublication setがある場合、sitemap自体もgenerator出力との完全一致を要求する。

### Search / Share v2 編集監査

generatorとValidatorが通っていても、検索・共有文面は機械的な正しさだけで完成としない。production昇格前に、公開対象の日本語・英語metadataを作品内容との一致で見直す。

- 検索流入のために、作品にない性質・評価語・ジャンルを足さない。
- `cozy`、`relaxing`、`simulation` など評価や期待値を強く含む語は、作品内容として明確に採用している場合だけ使う。
- 制作者属性や国籍より、作品そのものを説明する具体語を優先する。
- 固有作品名はSEO都合で勝手に英訳・改名しない。必要な別名は `alternateNames` としてOwner承認の上で追加する。
- Search本文はShare文面より具体的にしてよいが、機能・ルール・体験を説明しすぎて作品の余白を壊さない。
- 英語は直訳より自然さを優先するが、日本語正本にない設定・意味・約束を追加しない。
- `terms` は作品内容に直接支えられる語だけを残す。検索ボリュームを根拠に作品を別ジャンルへ寄せない。
- title / descriptionの長さは機械的な文字数上限ではなく、検索結果で意味が途中で切れても作品名と核が残る順序を優先する。
- OGP画像は日英共通でよい。画像内へSEO文言を詰め込まず、日英差分はtitle / description / altで持つ。

Phase 4.4では、公開済み9作品をこの基準で監査し、過剰だった英語検索語を保守的に修正した。今後の新作もproduction候補作成前に同じ編集監査を行う。

### Release状態

- `DRAFT`: 対象・素材・判断を準備中。
- `VALIDATION_BLOCKED`: FAILまたはHQ_REQUIREDがある。
- `STATIC_CHECKS_PASSED`: 機械検証に阻害なし。外部/実機未確認があればUNVERIFIEDのまま。
- `RELEASE_READY`: 六つのReadyの配信前条件と候補・復旧手順を確認済み。
- `DEPLOYED_AWAITING_VERIFICATION`: production配信後の確認待ち。
- `DEPLOYED_AWAITING_ANNOUNCEMENT`: 本番確認済みだが、選択した告知または引渡しが未完。
- `RELEASE_COMPLETE`: production配信済み、同SHAのPages成功、本番確認、六つのReady、
  選択した外部公開**または引渡し**が完了。

作者への引渡しを選択した場合は引渡し完了でよい。投稿まで選択した場合は下書きの引渡しを
投稿完了にしない。SNS自体を選ばない場合はその理由を記録する。
ValidatorはRelease Completeを認定しない。CI成功・merge成功・Pages成功はそれぞれ別の証拠。

### Release記録（PR本文等に一箇所だけ記録）

- work IDs、productionに公開する**全対象集合**、今回検査する対象ID。
- production base SHA、staging確認SHA、production候補SHA。
- 今回公開しないstaging差分、必要な共通依存、環境差分（robots/dev/cache）。
- menu-only/physicalとOwner承認の参照、必要なHQ決定。
- validation command/結果、Standard/Conditional結果、外部確認証拠またはUNVERIFIED。
- rollback対象/手順、配信後確認担当、選択チャネル/引渡しと状態。

作品identityはworks.js。Release記録は実施証跡であり第二の作品台帳にしない。
stagingのopenを公開許可としない。CoffeeFactory等を無断で含めない。
候補を作る際はbaseから必要な依存ごとに選別し、本番用環境設定を確認する。
確認後に候補が変わったら影響部分を再検証する。失敗時は告知を止め、force pushを使わず
既存のrevert commit手順で戻す。緊急本番修正はstagingへ戻す。

### 新作の展示ガイド契約

新しい作品を `status: "open"` にするときは、展示ガイドから発見できる状態までGuide Readyに含める。

- `data/work-guide-meta.js` の `WORK_GUIDE_META["<id>"]` に、非空の `duration`、非空の `guideLine`、1件以上の `moods` を追加する。
- `moods` は `WORK_GUIDE_MOODS` で定義済みのIDだけを使い、同じIDを重複させない。
- これを満たした `status: "open"` の作品は、展示ガイドの「すべて見る」と対応する「気分から探す」へ自動反映される。
- `WORK_GUIDE_FEATURED` は店主のおすすめ棚として手動管理する。新作だから自動追加しない。
- production公開候補としてRelease Validatorの対象にする作品は、canonicalな `assets/works/<id>/ogp.jpg` または `assets/works/<id>/icon.png` のどちらかを持つ。
- staging runtimeには画像欠落時の文字フォールバックがあるが、それをproductionのGuide Ready完成条件にはしない。
- Release Validatorはrepository snapshot内の**全open作品**についてguide metadataを検査するため、新作をopenにしてmetadataを入れ忘れると、既存公開作品だけを検査する通常CIでもFAILになる。
- おすすめ内容・ガイド文面・気分分類の最終判断はOwner Decision。Validatorは妥当な形と参照整合だけを検査する。

### 新作の町内告知契約

新しい作品を `status: "open"` として公開する場合、町がその作品を知っている状態までTown Readyに含める。

- `data/updates.js` の先頭側に公開記録を追加し、`workIds: ["<id>"]` で作品IDを明示する。
- `data/ghost-dialogue.js` の `works["<id>"]` に、短い作品会話を1件以上追加する。
- menu-only / physical の違いに関係なく両方必要。看板propやおばけNPC本体を毎回作り直す必要はない。
- Release Validatorは選択した新作IDについて両契約を静的検査し、欠落をFAILにする。
- 文面は作品説明の転載ではなく、看板は更新記録、おばけは町の住人の一言として書く。最終文面はOwner Decision。

### 毎回Standard / 変更時だけConditional

毎回: 新作の町内導線・直リンク・駅前看板の更新履歴・おばけの作品会話・mobile/PC主操作・戻る・町操作・再入場・通常再訪。
同launch/frameの既存作品1件と対象施設の出入り1経路。Search/Share/Observeの静的検査、
production候補の差分/環境検証、配信後の実URL・画像・sitemap・event到達確認。
非対応端末は明記して告知と一致させる。全作品の通し遊びを毎回要求しない。

| 条件 | 追加する確認 |
| --- | --- |
| physical配置変更 | 既存scene validator、object画像、trigger参照、接近、collision/tap、隣接通路。Editor/Desk契約を変更時は既存テスト |
| scene出入口/遷移変更 | 対象遷移の往復・入力保持・連打・戻り先、既存interaction/transitionテスト |
| 共通player/frame/Engine変更 | 影響profileごとの代表作、関係する音/保存/共有/fullscreen |
| SW/PWA/cache変更 | scope/cache更新・通常再訪・ホーム画面・他作品cacheを消さない。offline提供時だけoffline |
| tilt/audio/save/share/API使用 | 当該機能の許可拒否・代替・Safari復帰・再読込・共有取消等 |
| itch build変更 | 配布ZIPそのもの、upload番号、サイズ、主操作、手動retry |
| 特定SNS内ブラウザを対象 | その環境の起動・戻る・必要な共有 |

### Release Validator（読み取り専用）

Nodeの既存テスト環境で実行する。新package導入・generator・ネットワーク通信・書込みはない。
検査対象は**信頼するrepository snapshot**のみ。JSのVM実行は安全隔離ではない。

```sh
# staging: noindexが正常。sitemap未配置はWARNING。公開完成とは判定しない。
node tools/release-validator.cjs --env staging --ids diorama-calendar,rojiura-masala,steamclock

# 意図したphysical配置の欠落も検出（既存triggerは指定なしでも検査）
node tools/release-validator.cjs --env staging --ids dotweather --physical dotweather

# 準備済みproduction候補を読む。対象全件を明示した例。公開やコピーは行わない。
node tools/release-validator.cjs --root /path/to/production-candidate --env production \
  --ids diorama-calendar,rojiura-masala,steamclock \
  --published diorama-calendar,rojiura-masala,steamclock,dotweather,junkissa-dive,midnight-cola,yakitori-wars,rainy-window

# 本番公開全件: 検証済みのproduction checkoutを集合の入力元に指定
node tools/release-validator.cjs --root /path/to/production-candidate --env production \
  --production-root /path/to/verified-production-snapshot --all-production

# machine-readable結果は標準出力（必要な場合だけ利用者が保存）
node tools/release-validator.cjs --env staging --ids dotweather --json
node --test tests/test-release-validator.cjs
```

`--published`は全公開集合、`--ids`は今回検査する部分集合。両者を混同しない。
`--production-root`は利用者が明示した本番snapshotのworks open集合を読むだけで、
環境を自動判定しない。SHA/由来をRelease記録へ。新作を追加する候補では、現行本番集合に
新作がまだないので`--published`に承認済み全集合を指定する。
production候補に集合外のopen作品がある場合もFAIL。stagingでは集合外openを禁止しない。

| 出力 | 意味 / exit |
| --- | --- |
| PASS | その機械的項目のみ合格。実機や外部設定の合格ではない |
| FAIL | 明確な欠落・不一致。exit 1 |
| WARNING | 推奨値との差、stagingのsitemap未配置等。単独ではexit 0 |
| HQ_REQUIRED | 未知の方式や静的に扱えない契約。exit 1で止める |
| EXTERNAL_CHECK_REQUIRED | 外部/実機のUNVERIFIED。単独ではexit 0だがRelease Complete不可 |

CLIの不正入力/実行不能はexit 2。JSONにもsummary/exitCodeと`releaseComplete:false`を出す。
外部GoalだけでCIを赤くしないが、六つのReady確認から除外もしない。

検査範囲: works必須metadata/identity、展示ガイド（全open作品のduration / guideLine / moods、featured参照、選択作品のcanonical OGP/icon）、町内告知（updates.js workIds / ghost-dialogue.js works[id]）、launch実体、Search metadata正本、日英w本文/meta/リンク/robots/redirect、hreflang、JSON-LD、生成一致、
OGP画像実体/MIME/寸法/ID、sitemap収録/集合/重複、Manifest/id/start_url/scope/icon、
physical参照（既存scene validator再利用）、既存trackerからのevent名生成。
`description`は公開Standardで必須。phoneの幅高さは正数、responsiveでは未指定可。

静的発見はrootから通常のa[href]をたどる。JS/canvas生成menuを代用にしない。
redirectは既存inline scriptを通常queryとopen=1で実行し、load/timerとmeta refreshを検査する。
外部script・未対応DOM依存・inline handler・実行不能はHQ_REQUIRED。一般の全JavaScript経路を
形式的に証明するものではなく、端末条件分岐やHTTP redirect/headersは実配信確認に残す。
HTML/XMLは現行静的形式を対象とする。外部画像やJPEG/PNG以外は自動PASSにせずレビューへ。
lastmodの実質的変更日との一致は履歴レビューで確認し、今日の日付を生成しない。

### 未決HQ（Phase 2では解決しない）

1. staging新WORLD OBJECT基盤と旧production基盤を越える昇格方法。新基盤の部分コピー禁止。
2. `/works/`のindex/noindex・canonicalを統一する範囲。今回のw契約採用はこの全面変更を含まない。
3. 将来generatorのためのSEO/Share追加metadataの最小設計。第二台帳・大規模schemaは未導入。
4. landing計測/UTM引渡し等、既存analytics契約を超える変更。

Phase 2確認時の基準: production `cc387496dbadbd5ddd1f937e15100c4c9bd82b83`、
staging `ccae0a7d4ca3e69117db636a265468df5a1cdf54`。
Phase 1のstaging固定SHAからの19コミットはORBIT本体/専用export関連6ファイルのみ。
登録・w・OGP・analytics・scene・Manualの結論は不変。
今回、既知SEO/sitemap/OGPの実データは直さない。まず赤を出せることが成果。

## Work lifecycleによるproductionゲート

`data/work-lifecycle.json`を昇格状態の唯一の正本とする。WORKS.statusやRelease Readyとの混同を避ける。
active/frozen/未登録workはproduction対象外。candidate化には明示的な候補化指示、実反映には別のproduction指示が必要。
releasedは既存公開集合へ保持できるが新規移行の対象ではない。公開済み作品の修正指示も個別にRelease記録へ残す。

```sh
# staging正本で、移行するcandidateだけを選択してread-only確認
node tools/work-lifecycle.cjs --promotion-check --ids <candidate IDs> \
  --production-instruction '<今回のユーザーproduction指示の参照>'

# 新作を含むproduction候補: FULL_SETは既存released＋今回candidate。
# --promoteは今回新規移行するcandidateだけ。candidate化指示を使い回さない。
node tools/release-validator.cjs --root /path/to/production-candidate --env production \
  --ids <検査対象IDs> --published <FULL_SET> --promote <candidate IDs> \
  --production-instruction '<今回のユーザーproduction指示の参照>'

# production用のSearch生成にも同じ二段階チェックを適用
node tools/generate-work-search-pages.cjs --env production --published <FULL_SET> \
  --promote <candidate IDs> --production-instruction '<今回の指示の参照>' --write
```

既存公開集合を読み取り検査するだけの場合はreleasedだけの集合を渡し、--promoteは不要。
production生成の--writeは既存公開集合だけでも今回の明示指示参照が必要。
昇格対象がないstaging生成・検査の従来コマンドは変更しない。
production snapshotに台帳がなければproduction検査はFAIL。省略を旧動作への迂回として扱わない。
移行時は公開対象の台帳項目だけを選別したsnapshotを準備し、LAB/ARCHIVE/凍結・開発中のwork本体をコピーしない。
配信と確認の証拠が揃った後、staging台帳をcandidate → releasedへ更新してproductionInstructionとreleaseEvidenceを残す。

これは既存validator/generatorとAI運用に対するゲートであり、別ツールによるGit書き込みを物理的に禁止する権限境界ではない。
ユーザー指示参照の真偽はレビューする。CI成功や参照文字列だけで公開許可・Release Completeを認定しない。


production snapshotでは、台帳の全項目が`--published`集合に含まれることを要求する。実体がなくても、選択対象外のactive/frozen等を台帳に残さない。
混入検査は`works/`に加え、`w/`、`en/w/`、`assets/works/`の各作品ディレクトリにも適用する。選択済み作品の通常のページ・画像構成は保持できる。

`works/_template/`は既存productionにも存在する制作雛形で、公開作品として昇格する対象ではない。
以前の無条件の除外は廃止し、staging/main `3988147` とproduction/main `db4b91a`で一致する5つの正規ファイルをexact Git blobで確認する。
productionに既存の空の`Test.md`と`assets/test.md`も、その既存blobのままに限り許容する。
雛形の改変・欠落・未知の追加ファイル・symlinkは拒否する。`rakugaki-template-test`のactive台帳項目は公開集合へコピーしない。
正規雛形を残せることは、任意の試作を`_template`という名前で本番へ移せることを意味しない。
