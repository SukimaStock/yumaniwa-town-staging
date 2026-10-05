# Meltype調査とWeb版Phase 1

調査日：2026-10-05。**実装方式の決定前に**以下を取得して読んだ。

- [Meltype](https://github.com/yksr-melt/Meltype)、調査main：`2e18486c116cc8736af06b845b56c1b88f8fa93c`
- [v1.0.0](https://github.com/yksr-melt/Meltype/releases/tag/v1.0.0)：`467255bfe3e36b803a3fd3f5a1480fe35d5058c9`。Release APIも確認。Windows正式版、Mac/Linuxプレビューの3配布物。iOS配布物なし。
- 指定されたComposition / Detection / Input / Learning、QualityTests.cs、dictionaries、README、docs/DEVELOPMENT.mdを調査。mainとv1.0.0の差分も確認した。今回参照した主要判定・品質テストはその差分に含まれていない。

## ソースから確認した設計

| 観点 | Meltypeの仕組み・原典 |
| --- | --- |
| 日本語と英語の判定 | `Detection/ScoreEngine.cs`はRomaji / Kana / Dictionary / English / Typo / Userの寄与を集計。日本語点と日英点差の両方が閾値を超えた場合に日本語へ。UnknownとUndecidedを別に持つ。`RomajiDetector.cs`は、かなとして成立するだけで日本語とは言えないと明記。拗音・tsu・促音・長音等も証拠にする。 |
| 評価単位 | 自動IME切替は打ち始めを保留して評価。標準最大6文字、無入力0.7秒、総保留2.5秒。`Input/InputSession.cs`はIdle / Collecting / Flushing / Committedの状態機械。変換ボックスは別方式で、`CompositionText.cs`のRaw＋Kanaを持つCompositionUnitと末尾未完成子音を使い、かな1音の境目で区間を判定する。 |
| 混在文 | `CompositionDetector.cs`は単位列の先頭から長い英語区間を探索し、前後を日本語区間として残す。全文章を一言語に分類しない。日本語の助詞、英語区間の前後、確定済みキャレット前後、英文継続の強さも見る。未確定の表示は再評価できる。 |
| 英字の保護 | 英語辞書、正しい大文字小文字を持つProperNouns、OS/組み込みスペルチェッカー、ローマ字の不成立や未完成子音、ドメイン、メンション、識別子、大文字、LanguageMemoryなどを併用する。短い部分一致は日本語を壊すため厳しく制限。 |
| ユーザー辞書 | `Composition/UserDictionary.cs`はかなの読み→表記。読み2文字以上、同じ読みの候補群、ユーザー登録を優先し、読みの中の最長登録語で分割する。`phrases.txt`の組み込み補助語句とは分離。`UserDictionaryFile.cs`はファイル処理の別責務。 |
| 学習 | `Learning/UserModel.cs`はIME切替の短いprefixの受容／拒否を記録し、英語誤爆の拒否を重く扱う。`Composition/LanguageMemory.cs`は明示的な英字／かな修正を記録。一般的な日本語と衝突する英語記憶は2回待つ場合があり、短いgoを覚えてもnihongoまで分割しない対策がある。Controllerでは候補の履歴・漢字変換学習も別に扱う。 |
| 責務分離 | Detectionは言語の証拠と判定。CompositionはRaw/Kana、混在区間、候補、確定、取消、前後文脈と学習。`IKanjiConverter`は漢字候補生成の別境界。`HybridConverter`はMozcとOS変換器を組み合わせる。OS入力捕捉／UI／注入とは分離。 |
| 曖昧な入力 | 同じ語が日本語／英語になり得る。前後が不明／矛盾する場合、変換ボックスは日本語寄り。英語の続き、両側の証拠、ユーザー修正で補う。Controllerは直前に確定した曖昧語を次の語で修正する仕組みも持つ。 |
| 品質テスト | `Core.Tests/QualityTests.cs`は日本語、英語、曖昧語、混在、短い語、数字・記号、小書き、大文字、かな、コード／入力欄、絵文字、誤記などに理想の期待値を置く。カテゴリ別の成功率と外れた例を出し、通常テストは全体95%以上・各カテゴリ80%以上を要求する。Windowsスペルチェッカーがない場合も評価可能。これは基準の確認で、今回そのC#テストを実行したわけではない。 |

原典リンク：[CompositionDetector](https://github.com/yksr-melt/Meltype/blob/2e18486c116cc8736af06b845b56c1b88f8fa93c/src/Meltype.Core/Composition/CompositionDetector.cs)、[ScoreEngine](https://github.com/yksr-melt/Meltype/blob/2e18486c116cc8736af06b845b56c1b88f8fa93c/src/Meltype.Core/Detection/ScoreEngine.cs)、[QualityTests](https://github.com/yksr-melt/Meltype/blob/2e18486c116cc8736af06b845b56c1b88f8fa93c/src/Meltype.Core.Tests/QualityTests.cs)、[DEVELOPMENT](https://github.com/yksr-melt/Meltype/blob/2e18486c116cc8736af06b845b56c1b88f8fa93c/docs/DEVELOPMENT.md)。

## 辞書とライセンス

MeltypeのソースはSPDX `GPL-3.0-or-later`、READMEはGPL v3と説明。辞書すべてを単一ライセンスとみなしてはいけない。`THIRD-PARTY-NOTICES.md`と辞書ヘッダによると、JMdict由来の翻訳・loanwordsやWiktionary由来の意味はCC BY-SA 4.0、CLDR絵文字はUnicode-3.0、SCOWL語彙は複数著作権の許諾通知付き。手書きの英語／日本語／固有名詞／語句や文脈辞書もある。

SukimaStock stagingのbase `57072fb5551c340ad3e2cee49bf55e31f8a798b7`のtrackedファイルから、リポジトリ全体のLICENSE / COPYINGを確認できなかった。**互換性確認済みとは言わない。** Meltypeのコード・辞書データ・テスト本文は一切組み込まない。判定思想・責務境界・UX・カテゴリ別テストの考え方を参考にし、JavaScript判定と小規模語彙・期待値は新しく記述した。辞書・漢字変換エンジンを将来追加する場合は個別にライセンスを確認する。

## 実装方式を決める4点

1. **使う考え方**：区間単位の判定、原文を保ったプレビュー、固有名詞保護、前後の英文、明示的な訂正、カテゴリ別理想期待値。
2. **Safariでは使えないもの**：WH_KEYBOARD_LL、SendInput、IMM32/TSF、Microsoft IME変換器、UI Automation、Windowsスペルチェック、OS全体／他アプリへの入力捕捉・注入。Webはこのエディタの入力のみ扱う。iOSのIME候補をJavaScriptから取得する仕組みは採用しない。
3. **今回の独自実装**：Detection (`detection.mjs`) → Composition/編集 (`app.mjs`) →保存 (`state.mjs`)。かなとして読めるprefixを境界として長い登録語と保護英語を探し、残りをかなへ。曖昧語は文脈で補い、不明は英字原文を残して点線表示。原文入力欄を自動改変しない。候補の英字／かな変更は確定時だけ、語全体の記憶として保存する。Meltypeの重み・prefix学習・2回ルール・確定済み文章の自動再修正は初版では実装しない。
4. **外部ライブラリ**：WanaKana 5.3.1（MIT）、配布ESMに含まれるmemoize-one 6.0.0（MIT）とdequal 2.0.3（MIT）。ローカル同梱、通知を保存。クラウドAPI／AI変換／解析SDKなし。

note用途では入力対象を専用エディタに限定できるので、アプリ別判定、コードエディタ統合、キーの保留・再注入、OSプロファイル、トレイ、自動更新を省ける。見出し・段落・既存日本語は保持し、下書きをコピーしてnoteへ貼る。

**範囲の限界**：WanaKanaはかな変換であり漢字変換器ではない。初版の漢字はユーザー登録語／表記修正／下書き欄の通常IME入力のみ。小さな英語語彙のため未知の英単語や難しい混在境界は誤る。初版のコーパス成功はMeltype相当の精度や実際の文章の正解率を意味しない。入力途中は子音を保持する原文欄と別の候補表示を使い、未確定候補のちらつきや選択範囲を実機で評価する必要がある。
