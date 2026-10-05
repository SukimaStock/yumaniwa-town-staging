# 全入力の境界候補比較 — 2026-10-05

UI、最終整形、Composition、Mozc WASM／辞書／候補順位／Worker、保存方式は変更しない。

## Meltypeの再確認

参照はローカルに固定した[Meltype](https://github.com/yksr-melt/Meltype)のDetection/ScoreEngine.cs、RomajiDetector.cs、EnglishDetector.cs、DictionaryDetector.cs、Composition/CompositionDetector.csとQualityTests.cs。GPL-3.0-or-later。実装・辞書をコピーしない。
ScoreEngineはローマ字成立／拗音等、日本語辞書、英語辞書、ユーザー学習のcontributionを分離して閾値・差分で評価する。Compositionは音の単位を使い、前後の言語、大文字・固有名詞、助詞、途中の音・語の切断などで区間を評価する。
CompositionのFindSpansは逐次的な区間探索であり、全文N-best最適化ではない。Meltypeにない機能を移植したとは報告しない。
今回は「辞書一致は一つの証拠」「ローマ字の途中と英語を区別」「前後の成立」「品質をカテゴリで回帰する」という考え方を参考に、独自のbounded N-best比較を追加する。

## 実装

`segmentCandidates`は日本語、英語、ユーザー辞書のedgeから複数の完全経路を生成する。
全文を先に日本語／英語の二択へ固定しない。各連続語の全日本語／全英語も比較候補として残す。
語間の空白を含む入力全体で経路を組み合わせ、隣接言語と短い残片も採点する。

証拠は次のように分離する。

- ローマ字成立度：現在のCompositionによる読みの成立、長さ、未確定音で切る境界。
- 英語の確からしさ：独立に作成した日常・技術・仕事・スポーツ等の語彙、一致長、独立語と埋込み語の差、読み可能性。辞書部分一致だけで決定しない。
- ユーザー辞書／修正記憶：現在の明示的指定を優先し、境界候補にも辞書entryを使う。
- 大文字／固有名詞：既存の名前・略語・CamelCaseの強いシグナルを保持。
- 前後：英語の両側文脈、短い日本語残片、連続英語edgeの不自然な分割を評価。
- 変換後：同じMozcへ候補経路の日本語部分を渡す。複数文字の語・活用を含む漢字候補の支持、短い単漢字やカタカナ・かなの弱い支持を区別する。支持される日本語文節を英語edgeが途中で切る経路を減点する。

`rankSegmentation`のscore = languageScore（近傍contextを含む）+ conversion + continuity。
現在のAPIにPOS・文法コスト・辞書登録判定はなく、このconversionは候補文字列に基づく**補助的heuristic**。漢字が出るだけで自然な日本語と断定せず、較正された確率や本物のMozc経路コストとも呼ばない。
同じかなの変換はrequest内で一度だけ実行し、その実測結果を候補表示にも再使用。漢字候補の並びは変更しない。

語内beamは8、全入力beamは12、cut位置が48を超える語は全体候補へ限定する。256字以上の連続語の原文保持、512かなの既存変換区間上限は維持。
最良はこのbounded候補集合内の最良であり、すべての境界の厳密探索ではない。一般英語の網羅や未知CamelCaseの連結境界、未知の小文字英単語の無空白連結を完全に解くものではない。
URL/email/backtickはengineへ送らず保護する。www URLも事前に保護。失敗時はかなや全文英字の候補で成功扱いせず、既存の原文保持・確定無効に従う。

## 実入力

| 入力 | 最終整形後の第一候補 | 一意な変換呼出し数 |
| --- | --- | --- |
| `saikinntyousihadou?` | 最近調子はどう？ | 3 |
| `demogoalkimetatokiha` | でもgoal決めたときは | 2 |
| `kyouhaPUMPOKOwotukutta` | 今日はPUMPOKOを作った | 2 |
| `mouiiya staff to isshoni` | もういいやstaffと一緒に | 4 |
| `ashitahadaka` | 明日裸 | 3 |

`ashitahadaka`のテストは英語hadを切り出さないことを確認する。「明日裸」という第一候補は報告するが、入力意図の不明なこの文を自然な完成文とは採点しない。
`anatahadaredesuka` → あなたは誰ですか、`korehashirabetai` → これは調べたい、`hometehoshii` → 褒めてほしい、`hadashidearuita` → 裸足で歩いたも確認。
`kyouhagamewotukutta` → 今日はgameを作った、`kyouhaplanwokimeta` → 今日はplanを決めたも確認。
`I had a good day.`／`This is my goal.`は英文のまま保持。hadを英語辞書から削除していない。goalだけを特別優遇する分岐もない。
新しい語彙は独立した一般語彙リストで、今回の入力やMeltypeの辞書を転記した規則ではない。外部ライブラリとライセンスの追加はない。

## 検査

```sh
MIXED_NOTE_REFERENCES=.. MIXED_NOTE_SEGMENT_RESULTS=/tmp/segmentation-results.json node --test works/mixed-note/test-segmentation.mjs works/mixed-note/test-conversion.mjs works/mixed-note/test-formatting.mjs works/mixed-note/test-quality.mjs
```

77テスト。新規29件には実Mozcによる21入力、競合had経路、変換証拠によるhome経路の再順位付け、辞書・記憶・固有名詞、記号保護、変換cache／エラー、探索上限を含む。従来48件も維持。
判定の正解文字列や文単位の置換は実装に持たない。推測経路をfixtureで固定してから変換するoracle方式にもしていない。
物理iPhone SafariはUNVERIFIED。Node／Chromiumの性能やCI成功を実機での執筆品質に読み替えない。

Chromium 390×844の実画面で従来10入力と17追加入力を確認。候補表示＝確定文、Undoの原文復元、疲れたの選択、古い候補排除、通信失敗時の確定無効が通過。JavaScript pageerror 0。既存と同じfile配信＋実ネットワークのpinned静的asset。
