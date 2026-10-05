# note執筆変換層の再評価 — 2026-10-05

**採用確定はしない。次のWeb検証候補はMozc WASM（hechimaの単スレッド成果物）。Jaimeの現行WASMは採用しない。**
今回の10入力・3段落比較は自動DetectionもiPhone実機も通していないため、note執筆用としての成立は **UNVERIFIED**。
執筆UI・現行変換コード・staging main・productionに変更せず、調査／観測ハーネスのDraft PRで停止する。

前回の36例テスト成功は、実用品質の証拠にならなかった。実入力の二重「ん」、かなだけの最終候補、未知の英語で連続入力全体が英字になる問題を観測し、簡易辞書への単語追加で完成扱いにしない。

## 1. Meltypeを最初に再調査

main `2e18486c116cc8736af06b845b56c1b88f8fa93c` と [v1.0.0](https://github.com/yksr-melt/Meltype/releases/tag/v1.0.0) (`467255bfe3e36b803a3fd3f5a1480fe35d5058c9`)。
README、docs/DEVELOPMENT.md、Composition/Detection/Input/Learning、UserDictionary、QualityTestsとdictionariesの役割を確認。
mainとreleaseのCompositionDetectorの区間単位の方針を再確認した。C#の実行テストは.NET未導入のため実施していない。

重要な区別は「自動IME切替」と「自前Compositionの区間判定」が別経路であること。

| ソース | 粒度・責務 | Webへ参考にする点 |
|---|---|---|
| `Composition/CompositionText.cs` | Raw綴り＋かなの音単位とpending子音。入力・削除・確定を管理 | 原文offsetを失わず、確定時と入力途中の`n`を区別する |
| `Detection/RomajiDetector.cs` | ローマ字トークン・pending・不正綴り、拗音・促音・長音などの特徴 | 読めることは日本語の証明ではない。Composition用の拡張綴りと検出用の厳しい綴りは別 |
| `Detection/EnglishDetector.cs` | 語の完全一致と前方一致を英語スコアとして提供 | 辞書一致は証拠の一つ。辞書非一致を日本語確定にしない |
| `Detection/DictionaryDetector.cs` | 日本語見出しの綴り揺れ／前方一致／助詞＋語 | 短い`to`や`no`は次の語・前後の言語を待つ |
| `Detection/ScoreEngine.cs` + `Input/InputSession.cs` | 保留中の短い入力prefixの複数検出器を統合し、Japanese/English/Unknown/Undecided | スコアと差、未確定状態を残す。この経路の6文字制限等を全文区間判定に流用しない |
| `Composition/CompositionDetector.cs` | かなの音単位境界ごとに、そこから始まる英語候補区間を探す。前後の言語、固有名詞、大文字、URL、未知語、辞書、スペルチェック、言語記憶なども見る | 文章全体の二択ではない。英語島の前後を別の日本語区間として変換する |
| `Composition/CompositionController.cs`・`IKanjiConverter` | 区間判定後に別のかな漢字変換器へ依頼。曖昧語の文脈再評価・候補・確定 | Detectionと漢字変換を別インターフェースにする |
| `Composition/UserDictionary.cs` | かな読み→表記。最低2文字、読みの区間照合、ユーザー登録を組込語句より優先 | 固有名詞保護と言語記憶とは別の辞書として持つ |
| `Composition/LanguageMemory.cs` | 明示した英字／かな修正を語単位で記憶。短い曖昧語などは反復確認 | 一度の誤選択で日本語全体の判定を汚さない |
| `Learning/UserModel.cs` | 自動切替の3〜6文字prefixの採用／拒否統計。英語誤爆を重く扱う | OS切替結果からの自動学習はWebで模倣せず、明示的修正の学習に絞る |
| `Core.Tests/QualityTests.cs` | 理想出力の多カテゴリ採点、全体95%／各80%。打鍵列と混在・曖昧語・記号等 | 期待値を不自然な現出力へ下げず、実入力と数段落を独立採点する |

ScoreEngineは既定で日本語scoreと日英差の両方に閾値4を要求するが、これはOS切替用のprefix判定。
CompositionDetectorは音境界上の区間走査であり、「日本語候補と英語候補を全文章の同じスコアだけで競わせる万能ラティス」ではない。
両方を同一の二択判定器と理解しない。英語区間の開始／終端で音単位の綴りが絡む場合もあり、`nn`を単なる置換ルールにしてはならない。

`dictionaries/`には日本語・英語・固有名詞・reading・phrase・context・candidate・loanword等が別々にある。
かな漢字変換の中核辞書と同一ではなく、WindowsではMicrosoft IMEが漢字候補を提供する。
OSのスペルチェッカーがないWebで、Meltypeと同じ精度が得られるとは主張できない。

| 今回の扱い | 内容 |
|---|---|
| 参考にする | Raw/かな音境界、局所的な英語島、複数の証拠、曖昧さの保持、訂正学習、理想出力のカテゴリ採点 |
| Web/iPhone Safariへ移植しない | WH_KEYBOARD_LL、SendInput、IMM32/TSFのIME切替、Microsoft IME候補API、UI Automation、Windowsスペルチェック |
| 独自実装する候補 | DOMからの原文・選択範囲管理、局所Detection、URL/固有名詞保護、辞書と訂正履歴の区別、エンジンアダプター |
| note用途で省略できる | OS全アプリへのキー再送、システムIMEモードの状態管理、コードエディタ／全配列対応。文章内の候補編集と安全な原文復元へ絞る |

GPLコード・辞書・テストを転記していない。今回のfixtureはユーザーの実入力＋独自の追加段落。

## 2. かな漢字エンジン比較

[Jaime](https://github.com/egegungordu/jaime/tree/8d7a41ccb23acb129c01936a2fb31c36ab9965c0)のREADME、`src/core/ime.zig`、`transliteration.zig`、`lattice.zig`、WASM binding、React example、tests、IPADICを調査。
付属のWASMを別のNode／Chromiumハーネスで実行。本体UIやReact exampleのコードは移植していない。
IPADIC読みのtrieからラティスを作り、単語＋接続コストで最良経路を得る、本物のかな漢字変換。
ただし現在のgetMatchesは **最良経路の構成単語リスト**。各文節の代替候補やN-bestではない。
`getMatches`／`applyMatch`には複数候補未対応のTODO、WASM bindingにはメモリリークのTODOがある。

| 方式 | 実際の機能 | 比較判断 |
|---|---|---|
| 現行＋WanaKana 5.3.1 | 主にromaji→かな。英語検出は狭い手製辞書と逐次分割 | nn誤り・漢字層欠落・局所判定の弱さ。継ぎ足しで完成させない |
| Jaime WASM＋IPADIC | ローマ字Composition、cursor/delete、コストによるかな漢字最良経路 | 単純例は変換できるが、候補選択・混在・長入力の品質不足。採用しない |
| [Mozc WASM / hechima](https://github.com/msonrm/hechima/tree/5cab51b401b76d95aee1657eba2366cdc5d9bca5) | かな→文節＋候補、文節伸縮、学習等のAPI。現行成果物は単スレッド | 実用的な漢字候補を出す次のWeb検証候補。Automatic Detectionは別途必要 |
| WanaKana単体 | transliteration | Aの候補。Cの代わりにはならない |
| [kuromoji.js](https://github.com/takuyaa/kuromoji.js/blob/master/README.md) | 日本語表層文字列の形態素解析／読み取得 | 漢字文を解析する道具。読みから候補を生成するIMEの代わりではない。今回は実行・採用しない |
| [AzooKeyKanaKanjiConverter](https://github.com/azooKey/AzooKeyKanaKanjiConverter/tree/d59a28e4c7ca049aef04f29a91eae9677a7753f2) | SwiftのComposingText、N-best、文節／学習／ユーザー辞書、追加のZenzai | iOSネイティブの優先候補。Swift/Xcode・実機検証は今回未実行、同じ入力で優れていると実測主張しない |

Mozcはhechimaの安定同梱`hechima-wasm/` v0.7.1を検証。
`BUILD_INFO.txt`のMozc=`3f235b4eb6fcff7d14ef5f0fb8ee56de7ee4c732`、fcitx5-mozc=`522a5f22673e03e32bcb290ba729bab42fbc5c18`、Emscripten3.1.69。
別の実験用cost／paths成果物はエンジン版が異なるため混ぜていない。
古い記事ではpthreads/COOP/COEPが必要だったが、現行EMBEDDING.mdと成果物は単スレッド。
実測ChromiumでcrossOriginIsolated=falseのまま動作した。GitHub Pagesのヘッダー制約を理由に現在版を否定しない。

## 3. 実入力の変換結果

第一候補をそのまま記録。期待に合わせた並べ替え・手製漢字置換はしていない。
**Mozc列は人手の正解区間を与えたC層の測定で、自動混在変換の結果ではない。**

| 入力 | Jaime生入力→最良経路 | Mozc＋正解境界→第一候補 | 候補選択 |
|---|---|---|---|
| `kyouhatukareta` | 教は疲れた | 今日はつかれた | 「疲れた」は第2候補。今日は疲れたを選べる |
| `nanntomoienaihidakedo` | なんとも言えない日だけど | なんとも言えない日だけど | 第一候補で理想に一致 |
| `ashitahakaishanomembertomtg` | 明日は会社の眼ｍべｒ＆ｍｔｇ | 明日は会社のmemberとmtg | 英語の両側を変換できる（正解境界指定時） |
| `mouiiya staff to isshoni` | 猛威イヤｓ足っｆ＆一緒に | もういいや staff と一緒に | 第一候補で理想に一致（正解境界指定時） |
| `kinou PUMPOKO wo tsukutteita` | 機能をツクっていた | 機能 PUMPOKO を作っていた | 昨日は第2候補。Jaime生入力はPUMPOKOが消失 |
| `SukimaStock no prototype wo tsukutta` | 浮間＆ｃｋノｐ露＆ｔｙペをツクった | SukimaStock の prototype を作った | 第一候補で理想に一致（正解境界指定時） |

スペースなし`mouiiyastafftoisshoni`：現行は全体を英字保持。Mozc＋正解境界なら「もういいやstaffと一緒に」。
現行のスペースありstaff例は「もういいや staff to いっしょに」。現行の不具合をスペース有無で混同しない。
Jaimeへ日本語区間だけ渡しても「猛威イヤ staff ＆一緒に」で、Detection層だけの追加ではこのエンジンの候補品質は解決しない。

指定の段落（人手の正解境界＋Mozc第一候補）：

> 今日は PUMPOKO を作っていて思ったことがある。最初はただかぼちゃを触っていたけどどんどん game 担っていった。

「になっていった」は文節候補にある。読点追加、game→ゲーム、余分なスペース整理が必要。
指定の理想文を完全一致成功にしていない。Jaime生入力は97文字目のinsertでcode4を返したため候補を読まず失敗として記録した。

独自の追加2段落のMozc第一候補：

> 明日は staff と一緒に prototype を直したい。まだ完成していないけど少しずつ進めたい。

> SukimaStock の game を作っている。 URL は https://example.com/note だ。この記録を note に残したい。

後者は期待との文間スペース差もFAILのまま残した。段落を実際のソフトキーボードで継続入力する試験ではなく、入力列をエンジンへ逐次渡した試験。
「候補を少し直せば使える」というC層の可能性はあるが、執筆全体の成功は未確認。

CompositionでJaimeはnanntomo/nn/nya/shi/chi/tsu/拗音/促音/長音を通し、3つの削除・cursor編集例も通した。
final nをまだ確定していない`shinbun`は「しんぶｎ」。入力中と確定のAPIを分ける必要がある。
日本語のみ`kyouhatukareta`×10でも67文字目のinsertでcode4。英語混在だけが長入力失敗の原因ではない。
sourceのcatchは全エラーを4にしているため、OutOfMemoryだと断定しない。固定allocator／リークTODOは要調査。

付属WASMのサイズ（実バイト数）：Jaime17,930,091 bytes、64MiB固定linear memory、うち32,000,000 bytesがallocatorバッファ。
Mozc WASM2,702,858 bytes＋辞書18,890,236 bytes＋glue79KB程度、実測heap26,476,544 bytes。
標準gzipの参考値はJaime4,938,385 bytes、Mozc WASM974,055 bytes＋辞書13,176,816 bytes。配信サイズや実機RSSを測った値ではない。
Chromiumのローカル起動実測はMozc約118ms。Jaimeの初期化は各ケース158〜227ms。iPhone速度・電池・Safariタブ破棄は未確認。
NodeとChromiumの10例の第一候補は一致。WebKitはバイナリがなく未実行。

## 4. ライセンスと配布判断

repository全体の明示的なLICENSEは見つからず、既存の全コードをGPL互換と断言できない。
このPRに新しい外部エンジンコード・WASM・辞書を含めない。参照checkoutでの検証のみ。

| 対象 | 確認したライセンス／条件 | 今回の扱い |
|---|---|---|
| Meltype | GPL-3.0-or-later。ソースのSPDXとREADME、同梱辞書の独立通知も確認 | ソース／辞書／テストをコピーしない。設計と評価方法を参考にする |
| Jaime本体 | MIT (`LICENSE`, Copyright2025 Ege Güngördü) | 著作権・許諾・免責の保持が必要。コード／バイナリ未同梱 |
| Jaime IPADIC | [NAIST＋ICOT条項全文](https://github.com/egegungordu/jaime/blob/8d7a41ccb23acb129c01936a2fb31c36ab9965c0/dictionaries/ipadic/COPYING) | コピー・改変・配布は許可されるが著作権と全免責等の保持、配布先法令に反しない条件がある。MITのみと表示しない |
| hechima wrapper/glue | MIT。生成物をpublic repoで配布、開発本家はprivate。BUILD_INFOで版追跡 | バイナリの再ビルド可能性・帰属を確認してから製品採用 |
| Mozc / fcitx5-mozc | BSD-3-Clause | 著作権・条項・免責、推薦利用禁止を保持 |
| Mozc辞書 | upstream THIRD_PARTY_NOTICESにBSD-3＋NAIST/ICOT＋沖縄辞書Public Domain | UT辞書は非同梱。辞書通知全文が必要 |
| Mozcのリンク依存 | BUILD_INFOにはAbseil、protobufのpinがある。upstream配布通知はそれらの全文を網羅していない | 製品へ配布する前に正確なリンク依存・Apache/BSD等の全通知監査が必要。今回未配布 |
| 既存WanaKana5.3.1 | MIT、同梱memoize-one/dequalもMIT。既存notice保持 | 検証時に既存vendorを使用。kanji engineとして数えない |
| kuromoji.js | Apache-2.0（本体）、NOTICE.mdのIPADICはNAIST/ICOT | 比較調査のみ、未同梱 |
| AzooKeyKanaKanjiConverter | 本体MIT。default dictionary submoduleの指定commitはApache-2.0 | ネイティブ候補。辞書をMIT一括扱いしない。絵文字・Zenzaiモデル・Swift依存等は採用構成ごとに追加監査。未同梱・未実行 |
| Playwright | Apache-2.0 | 検証環境でのみ使用、アプリやPRへライブラリを同梱しない |

Jaime本体＋IPADICの条項は表示／免責を保持しての再配布を認めており、MeltypeのGPLと同じ制約ではない。
ただし本体MITだけの扱いでSukimaStockへ取り込むことはしない。技術品質で候補から外れたため配布のためのvendoring自体を実施していない。
Mozcの構成要素も許諾型だが、このprebuilt成果物の完全なthird-party notice準備はまだ完了していない。

## 5. 分離する最終構造と停止判断

A. **Composition**：Raw＋offset＋かな音単位＋pending、選択範囲、確定／未確定、削除・cursorを保持。
IME-modeのnn semanticsとfinal n flushを分ける。DOMのcomposition中に原文を書き換えない。
今回のWanaKana adapterは完成済みIME bufferではなく、C比較用の読み生成。

B. **Detection / Segmentation**：まずURL／コード／記号の範囲を保護し、残りで音境界上の日本語候補／英語候補／固有名詞候補を局所評価。
辞書一致、読めない綴り、pending、大小文字、前後の言語、助詞、ユーザー指定、漢字候補の情報を証拠として持つ。
短いto/no/goを単語辞書だけで確定しない。未知語はその範囲だけ保留し、左右の日本語候補を維持する。
各区間にRaw start/endと複数候補・理由を残し、境界変更と訂正を可能にする。
この層は今回 **未実装**。oracleでの変換成功をB層の成功に読み替えない。

C. **Kana-Kanji Conversion**：日本語区間のみをかなへ、実用エンジンへ渡して文節と候補を受ける。
MozcをWorkerで動かし、文節伸縮・候補選択・確定学習／取り消しを別APIにする案が第一候補。
自作の小さい漢字辞書や正解文の置換は採用しない。学習状態はfixture採点と分離する。

**Webは研究を続ける価値があるが、現時点で実用品質が成立したとは判断できない。**
Mozcによって漢字層とPagesの互換性には見通しが得られた。一方、Automatic Detection、実機Safariの英字キーボード／beforeinput／選択編集、初回約20MB読み込み、数段落の候補修正量が残る。
これらと配布通知を通すまで、今回のengineを執筆画面へ組み込まない。

**iPhoneで実際に使える道具を優先するなら、ネイティブiOS＋AzooKeyを並行する次候補。**
Swift版のComposingTextと候補APIを利用でき、Safariのイベント制約を避けられる。ただしモード自動判定は引き続き独立に必要。
今回はiOS実装／性能・品質の実測をしていないため、ネイティブ移行で必ず改善すると約束しない。
Webの自動局所判定＋実機3段落が通らなければ、UI改修を続けず同じfixtureでネイティブを比較する。

測定完了と製品成功を区別する：`check-quality.mjs`は未実装B／未確認実機により **exit 1**、integrationEligible=false。
Draft PRの機械的検査が通っても、この品質ゲートをPASSにしない。
