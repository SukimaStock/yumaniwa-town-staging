# 執筆画面への反映 — 2026-10-05

研究だけのPR #159に続き、現在の執筆画面に **自動局所判定→Mozc文節候補→候補選択→下書き確定** を接続。
今回の結果は人手でJA/ENの境界を指定したoracleではない。既存の原文／下書き保存キーと画面構成を維持する。

## 使い方

英字キーボードで書きかけへ入力。初回はエンジン・辞書を読み込む。文節をタップすると漢字候補が表示される。
「今日はつかれた」の「つかれた」から「疲れた」を選べる。選択後に「下書きに入れる」。
読み込み失敗・変換中・候補と原文の不一致時は確定を無効にする。原文をかなだけで自動確定するfallbackはない。

## 三つの責務

- `composition.mjs`：WanaKanaのIMEモードによるnn/促音/拗音/長音とfinal nの明示flush。Rawの入力・カーソル・削除はnative textareaが保持し、変換で原文を書き換えない。
- `segmentation.mjs`：各局所候補のかな読み可能性、英語辞書の証拠、前後の英語文脈、大文字／固有名詞、明示言語記憶を評価。音境界上のJA区間と英語島の経路を比較。URL、記号、既存の日本語を保持する。未知の独立語を理由に左右の日本語まで英語扱いしない。
- `conversion.mjs`＋`mozc.mjs`／`mozc-worker.mjs`：日本語区間をまとめてかなにし、WorkerのMozcから文節と20候補を得る。読みの整合を検査し、Raw offsetを候補へ対応付ける。UI側はrequest世代と原文の一致を確認してから描画・確定する。

英語辞書は唯一の判定条件ではなく、局所スコアの一つ。短いto/no/go等は辞書一致だけで英語へ固定しない。
辞書はまだ広範な英語スペルチェッカーではない。ローマ字としても読める未知英語や、未知語を含むスペースなし入力の境界は誤る可能性がある。
曖昧さや原文／ひらがな／カタカナ／手動表記の選択を残す。一般的なIME並みの自動判定精度を主張しない。
一つの連続語は256文字、日本語変換区間は512かなまで。超過時は原文を保持し、区切りの追加を求める。
漢字候補を手作りしておらず、正解文の置換や優先ルールもない。選んだ漢字のMozc学習／OPFS永続化は今回未実装。

## 実際の自動入力結果

Nodeの15テストに加え、390×844のChromiumで執筆画面を操作。外部配信元の本物のglue／WASM／辞書を読み込み、10例の候補表示と文節選択を確認。

| Input | 第一候補／操作結果 |
|---|---|
| nanntomoienaihidakedo | なんとも言えない日だけど |
| kyouhatukareta | 今日はつかれた → 「疲れた」選択 → 下書き「今日は疲れた」 |
| ashitahakaishanomembertomtg | 明日は会社のmemberとmtg |
| mouiiya staff to isshoni | もういいや staff と一緒に |
| kinou PUMPOKO wo tsukutteita | 機能 PUMPOKO を作っていた。「昨日」を選べる |
| SukimaStock no prototype wo tsukutta | SukimaStock の prototype を作った |
| mouiiyastafftoisshoni | もういいやstaffと一緒に |
| mouiiya frindle to isshoni | もういいや frindle と一緒に（未知の英語を局所保持） |

指定段落：

> 今日は PUMPOKO を作っていて思ったことがある。最初はただかぼちゃを触っていたけどどんどん game 担っていった。

「になっていった」は候補から選択可能。game→ゲームや読点・スペースは手動の表記修正が必要。
追加段落は「明日は staff と一緒に prototype を直したい。まだ完成していないけど少しずつ進めたい。」等になった。
原文を少し修正せずに完璧な自動確定になるとは報告しない。

ブラウザでは実際に「疲れた」を選択して確定、Undoで原文復元、連続編集時の古い候補排除、未知英語の局所保持を確認。
ネットワークを意図的に失敗させ、原文保持・確定無効を確認。JavaScript pageerrorは0。
ネットワークには静的ファイルのGETのみ。入力文を外部変換APIへ送っていない。
検証用localhost配信はPlaywrightのrouteによるfile配信（外部エンジンの読み込みは実ネットワーク）。proxy CAのため検証ブラウザのみignoreHTTPSErrorsを使用。

**物理iPhone Safariのソフトキーボード・初回時間・タブ破棄・執筆快適さは未確認。**
現在の旧研究用check-qualityは当時の未実装状態を採点するのでFAILのまま保持。今回の自動回帰はtest-conversionとautomatic-resultsに分離し、歴史を上書きしない。
verificationState: UNVERIFIED。CI成功を実機品質PASSへ読み替えない。

## 依存とライセンス

既存WanaKana（MIT）＋hechimaのpinned Mozc WASM。engine MIT/BSD-3、辞書BSD-3＋NAIST/ICOT＋Public Domain、Abseil Apache-2.0、protobuf BSD、Emscripten/Musl等のruntime通知をTHIRD-PARTY-NOTICES.mdに全文保持。
MIT/BSD/Apache/NAIST条項は通知・免責等を保持して利用する構成であり、repository全体をGPLへ変更しない。MeltypeのGPLコード・辞書を使用しない。
Jaimeは読み込まない。英語リストは独自に用意しMeltype辞書を転記していない。

glue／WASM／辞書はhechimaのcommit `5cab51b401b76d95aee1657eba2366cdc5d9bca5`から固定URLで取得する。SHA-256が違うと実行しない。
合計約20MB、辞書が支配的。初回ネットワーク必須。通常ブラウザキャッシュに任せるが、offline保証はない。Service Workerや外部ホスティング設定は変更しない。
今回はbinaryをstaging repositoryへ再配布せず、配布元の固定static assetを読み込む。これらの配信元が止まると変換できないが、原文と下書きは保持する。

## 再検証

research/README.mdのpinned reference checkoutsをrepository外に用意してから：

```sh
MIXED_NOTE_REFERENCES=.. MIXED_NOTE_RESULTS=/tmp/automatic-results.json node --test works/mixed-note/test-conversion.mjs
node --test works/mixed-note/test-quality.mjs
```

15件の自動pipelineテストは必須3件の自然な漢字候補を検査し、かなだけの結果を成功にしない。
10入力の実測と自動推定境界はautomatic-results.json。物理Safariの保証や全文精度の統計ではない。


## 最終整形層 — 2026-10-05

`formatting.mjs`は候補選択後の文字列だけを整える。Composition／Detection／Mozcの読み・候補・raw offsetは変更しない。
`formatParts`の各要素を候補表示に使い、同じ要素を連結した`formatText`を下書きへ確定する。
文節ボタンの左右padding／border幅も除き、内部の境界を見た目の空白にしない。

- 今日も / つかれた / なぁ → 今日もつかれたなぁ
- 今日 は PUMPOKO を 作った → 今日はPUMPOKOを作った
- もういいや staff と一緒に → もういいやstaffと一緒に
- 日本語に接する横方向の空白を除去。英語の語間スペース、改行、段落先頭の字下げは保持。
- 入力された`, . ? !`のみ、日本語文脈で`、。？！`へ置換。句読点を推測して挿入しない。
- URL（http/https/www）、メール、数値内の小数点・桁区切り、backtick内は保護する。既存判定で分割されていたwww URLの読み片も、最終表記で原文を保持する（明示的な手動表記は優先）。
- 前後の局所文字列を評価。単独の英字・固有名詞は日本語の近傍文脈を使い、複数英単語の句は英語の記号を保持する。
- 候補リスト、原文、手動編集した下書き、コピー／exportの内容は再変換しない。整形はプレビューと確定時のみ。

文脈判定は最終表記のための保守的な規則で、英語混在判定スコアを変更するものではない。
未知の表記や引用などの曖昧さは手動編集できる。物理iPhone Safariは引き続きUNVERIFIED。

再検証: `node --test works/mixed-note/test-formatting.mjs`。21ケースで区切り、記号の保護、候補不変・source offset、同一の表示／確定を検査。
既存の15件の本物のMozc自動変換テストと12件のbaselineテストも再実行する。

Chromiumの390×844画面でも実エンジンを読み込み、従来10入力と整形9入力を確認した。
日本語の句読点・URL query・www path・メール・小数・英語文・改行について、候補表示と下書き確定が同じ文字列になること、Undoで元の入力へ戻ることを確認。
「疲れた」の候補選択、連続編集の古い候補排除、通信失敗時の原文保持も通過。pageerror 0。
検証環境は前記と同じfile配信＋実ネットワークの静的WASM読み込み。実機確認には読み替えない。
