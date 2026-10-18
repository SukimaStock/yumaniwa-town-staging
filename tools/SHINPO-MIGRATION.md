# note記事を町内へ移す

この手順はStagingだけ。実行担当AIがCLIとGitを扱い、作者にJSONの記入を求めない。`data/notes.js` のID・title・publishedAt/publish_date・urlが正本。2026-10-18の作者採用により、既存ピックアップ枠は最新枠で未選択の町内全文記事（archivePageあり）から1本抽選する。対象がなければ従来のfeatured/pickup・直近記事へ戻る。最新・ランダム・おすすめは従来どおりで、特定記事固定や5枠目は作らない。カード・本文ヘッダーへ追加サブタイトルや抜粋説明を作らない。archiveTeaserは表示しない。原文中の同じ文章は本文として保持する。description/ogDescriptionは画面に表示しないmetadataであり入力必須ではない。未指定時は正本のタイトルだけを使い、新しい要約やコピーを生成しない。

## 入口

### バックナンバー・作品紹介・環境別SEO（2026-10-18）

- `shinpo/index.html` は本CLIが、`data/notes.js` の `archivePage` と `data/shinpo/*.json` から生成する。タイトル・元の公開日だけを日付降順で掲載。通常のimport/generateは、1記事の `--id` 指定時も一覧を更新する。一覧を手で編集しない。掲示板の4枠と選抜は変更しない。
- 記事共通navの「バックナンバー」→一覧→掲示板は相対URL。同一記事の町内化は、今回明示された4件のnoteリンクと町カード1件だけ。原典note、未移植記事、旧ポートフォリオ、提出先・資料リンクは維持する。
- 作品紹介の少数の制作記事は `data/work-search-meta.js` の任意 `articleIds` に既存記事IDを参照する。日英紹介ページから原タイトルへリンクし、英語側には日本語記事と明示する。作品runtimeには追加しない。記事本文が扱う版と登録作品の対応を確認してから変更する。
- `tools/site-environment.cjs` がURLとrobotsの正本。Stagingは同環境のcanonical/OGP・`noindex,nofollow`。全対象がnoindexのためStaging sitemapは生成しない（空urlsetも出さない）。本番用は自身のProduction URLをcanonicalとする `index,follow,max-image-preview:large`。現在の本番応答・Googleの採用を保証しない。
- 将来の本番反映は別の明示指示と既存Release手順が必要。本CLIのproductionは `dry-run --env production --published-articles ID,ID` と公開APIの `outputs` / `render` / `renderIndex` による読取専用の準備・確認のみ。`generate/import --env production` は拒否する。既存Release作業で選択した記事・媒体・一覧だけを配置し、Staging出力を丸ごとコピーしない。
- 本番作品紹介・sitemapの既存生成器には、従来の `--published` に加えて `--articles ID,ID` を明示する。省略時の本番記事集合は空で、全記事を自動採用しない。記事CLIの `--published-articles` と同じID集合を使う。Productionの既存standaloneページ（観光案内所等）・公開作品集合は保持する。release validatorにも同じ `--articles` を渡して照合する。
- 選択記事が別の町内記事へリンクしている場合、その参照先も本番公開集合へ明示的に含める。部分集合で参照先が欠ければ生成・検証は拒否する。原文リンクを勝手に消して通さない。作品へのリンクも本番に実在する必要があり、公開対象外の作品へつながる記事は公開前に解決する。
- 公開前は記事/一覧/作品紹介のcanonical、OGP、robots、元の公開日、原典リンクと全画像を実URLで確認する。更新日を推測してlastmodにしない。今回、元画像のbytes・GIF/WEBP全frames・キャプション・既存lazy指定は変更せず、実寸のwidth/heightと観察できるaltを整えた。

`node tools/shinpo-migrate.cjs` の `inspect / dry-run / plan / import / generate / check / resume` を使う。Node標準ライブラリだけで実行できる。ネットワーク取得・PR作成・merge・公開は行わない。既存のGit/PR運用で照合・レビューする。

- `inspect --id <ID>`: notesの正本、既存URL、原典参照、未取得媒体を表示。
- `inspect --id <ID> --source /tmp/original.html`: 取得済み原典のテキスト包含とリンク一覧を照合。これは補助であり、全文・順序・画像の一致を認証しない。PDFは実行担当が抽出テキスト/リンクと原画像を別途目視照合する。
- `dry-run [--id <ID>]`: 予定出力の内容hashと差分だけ表示。ファイル、Git、ネットワークを変更しない。
- `check`: 登録済み全記事の正本・原画像/ローカルリンク存在・生成一致を確認。
- `generate --lock <path> [--id <ID>]`: 正式Lockを確認して静的HTMLを再生成。同入力の再実行は差分ゼロ。
- `resume --lock <path> [--pr-state /tmp/prs.json]`: branch/HEAD/保存状態/Lock/生成途中を表示。PR結果は正規GitHub照会のsnapshotを実行担当AIが用意する。取得失敗を空配列で代用しない。

## 次の1記事

1. 最新mainをfetchし、open/closed/merged PRと既存 `archivePage` を照合する。同じIDが済んでいれば再実装しない。新規branchを最新mainから作る。原典と素材はまずrepository外へ取得する。
2. `inspect` でIDを確認。原典の段落・リンクカード・画像・動画参照を元の順序のまま `/tmp/body.html` へ準備する。**1行を1つの完結したHTMLブロック**にし、段落内改行は `<br>` を使う。元の外部リンクを町内リンクに置換しない。取得できない媒体は作らず、元位置の `aside.media-note` と `--missing` に明記。町内案内は自動生成される本文外の `.afterword` に限定する。
3. まだrepositoryを編集せず、実行担当が次を用意する。`--authority` は今回の実際の指示の参照であり、文字列自体が承認を作るわけではない。追加の原画像がある場合は **実装前** に `--assets` で全pathを列挙する。

```sh
node tools/shinpo-migrate.cjs plan --id <既存ID> --slug <新しいURL名> \
  --cover assets/shinpo/<記事名>/cover.png \
  --assets assets/shinpo/<記事名>/figure-1.png,assets/shinpo/<記事名>/figure-2.png \
  --source-ref '<取得原典の参照>' --authority '<今回のStaging指示>' \
  --lock .change-plans/shinpo-<既存ID>/r0.lock.json
```

`plan` はSYSTEM / Full / HQ Review、unknown-code、必要なASSET影響を宣言し、公式 `change-plan-lock.cjs create/verify` を呼ぶ。独自Plan digestは計算しない。出力Planを読み、scope/素材/未決判断を確認する。Lockだけを初回commitとしてpushする。CLIはGit commitを代行しない。

4. Lock後に取得できた原画像を宣言済みpathへ置く。実行担当が原典照合結果を記録し、同じ引数でdry-runを2回実行する（出力が一致すること）。

```sh
node tools/shinpo-migrate.cjs dry-run --id <ID> --slug <URL名> \
  --body /tmp/body.html --cover assets/shinpo/<記事名>/cover.png \
  --source-ref '<原典参照>' --verification '<照合した証拠/不足>' --missing '<未取得媒体。複数は|区切り>'
```

5. 同じ引数で `dry-run` を `import` へ変え、`--lock <正式Lock path>` を追加する。データ、該当notesレコードのarchivePage、生成HTMLだけを更新する。既存IDに異なる入力を上書きせず停止する。訂正は既存データをレビューしてから編集し、同じLock範囲で `generate` する。通常の追加ではmain.js、template、既存記事の編集は不要。
6. `check`、`node --test tests/test-shinpo-migrate.cjs tests/test-shinpo-rack.cjs tests/test-shinpo-source-media.cjs`、公式Scope → Risk → Impact、必要なブラウザー検査を行う。原典の全文・リンク・順序・画像照合は必ず別途行う。生成HTMLは手で直さない。
7. commit/push、既存PR照会、draft PR、必須 `plan-risk-gate` / `trusted-mechanical-evidence` と関連CI、レビュー確認後に許可済みStaging merge。exact merge SHA、Pages run、実URLを確認する。CI成功を実機/原典の確認とみなさない。

新規notesレコード自体が必要な場合は、最初のPlan前にID・タイトル・日付・原note URLを原典で確認し、通常のmetadata登録のPlanで扱う。このツールは未登録IDや架空のmetadataを生成しない。

## 中断から戻る

進捗は既存PRまたはcommit本文に「目的、base/HEAD、Lock、完了/不足、次のコマンド、検証SHA、問題別の修正回数」を短く残す。追加の全体台帳は作らない。

- Lock直後: 正式Lockと単独初回commitを確認し、未実施のimportから続行。
- JSONだけ保存 / notes登録途中 / HTML未生成: `resume` が `needsRegistration`、`create`、または `needs-review` を示す。同じ原典入力でimportを再実行。部分書込を隠さない。原典の一時ファイルが失われた場合は同じ原典を再取得・照合する。
- PR作成後または作成結果不明: **まず既存PRを照会する**。CLIにPR作成機能はなく、失敗・タイムアウトで再作成しない。snapshotは配列で、`number / head（branch名）/ state / merged / head_sha / base_sha` を正規照会結果から実行担当が渡す。snapshotだけを最新状態の証明にしない。closedはmergedではない。
- merged: 実main/merge SHA、CI、Pagesを照合し、既存実装を作り直さない。
- mainが進んだ: CLIの`origin/main`は**最後にfetchしたローカルref**。必ず実remoteと照合する。通常PR Gateのexact baseが合わない場合、旧Lockを編集せず最新mainから新branch・公式fresh r0単独初回commitを準備し、実装差分だけ再利用する。旧PRを参照して正規の置換PRとして扱う。盲目的な重複PR作成とは区別する。

## 既存3記事の証拠と限界

基準は `644ce1e04a999cf575bd6affe2a24e374fe1125e` のHTMLとPR443/447/449/451。今回の抽出は既存HTMLの本文・順序・属性・画像・CSSを保持したもので、Drive PDFの再取得・再認証ではない。旧移植時からある町内本文リンクも保持し、将来の原典リンク置換の前例にしない。

2026-10-18の原note再照合で、ボードゲーム記事の本文画像は5点（前半2点も欠落していた）、町のはじまりには本文アニメーション1点の欠落が判明した。親の正規ブラウザ取得→GitHub共有の実bytesを復元し、各記事データのsource.mediaへ原URL・位置・caption・SHA256・寸法・frame数を保持。見出しcoverとは別に扱う。アニメーションは480×854の69frames WEBPのまま。本文外部リンクも原典へ戻した。

ゲーム未満記事は本文静止画0、X投稿3件。元noteで確認した正規投稿URLへリンクし、原動画実体は未取得。cloudからpublish.twitter.comのoEmbed取得はTunnel403で拒否。既存の静的fragment契約はscript/iframeを禁止しているため、無断で埋込runtimeを追加せず、動画を別画像に置き換えない。その後2026-10-18の明示指示で別note `nca6b0ef9db94` の取得済みGIF（animated WEBP）を牛吸い→蛇口おばけ→豆腐タワーの順で各投稿直前へ追加した。source.approvedReplacementsへ承認・別原典・hash・寸法・frame数・配置を記録。元X投稿リンクは維持し、元動画そのものの復元とはしない。実機iPhone/iPadはUNVERIFIED。ブラウザー表示と実機の触感を区別する。

このツールのテストはこの変更のCIに自動接続していない。必須ゲートを弱めず、上記コマンドを記事追加ごとに実行担当が実行する。保護workflowを変更する場合は別途Authorization → Transitionの現行手順を使う。

2026-10-18の作者明示指示に限る例外: town-beginningのitchリンク3件は作品名と原文を残して解除。board-game-makingのitchリンク1件は既存正本で対応を確認した `../../w/yakitori-wars/` に変更。source.ownerLinkCorrectionに承認と対象を記録。将来の原典リンクを自動置換する規則ではない。

掲示板のサムネイルはnotesの任意 `archiveThumbnail` に記事coverと同じ既存画像の町root相対URLを指定する。新しい記事の登録時は実行担当がcover参照を確認して該当notesレコードへ追加する（本文画像と取り違えない）。画像なし/ロード失敗は見出しのみへ戻る。記事追加ごとにmain.jsやCSSを変更しない。

### 環境別の町内案内

未公開作品への案内だけを本番から省く必要がある場合、記事データに任意の `afterwordProduction` を持てる。Productionではcatalog検証・HTML生成の前にこの案内を選択する。未指定なら従来の `afterword` を使い、Stagingでは常に `afterword` を使う。本文ブロック・原典note出典・画像は変更しない。`no-right-answer` は現在のWeb版AmberTimeへの案内だけを本番で省略し、歴史的本文中のAmberTimeと原典リンクを保持する。
