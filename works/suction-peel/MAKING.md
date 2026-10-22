# 吸盤をはがす — 2026-10-22

狙い：ガラスに吸いついた縁がじわっと伸び、空気が入る境目で全体が外れる変化を、一つのドラッグで試す。

できたこと：SVGの縁を局所変形させ、引いた距離90 viewBox単位で離脱。離した吸盤はその場に残り、つかみ直して元の位置へ戻し、離すと再吸着する。途中で戻す、途中で離す、外れた後に戻す操作を繰り返せる。音・得点・保存・外部通信・力覚APIなし。タッチ／マウス／矢印キーとHomeを使用。

想定との差：圧力やゴム全体の物理計算ではなく、縁の局所変形と接触線・影・残る輪で見た目の変化を作った。再吸着は元の位置付近で離す操作であり、実際の押圧は測定しない。実機で感じる手触りは未確認。

面白さ：途中までめくって戻すときと、境目を越えて全体が移動するときの差を試せる。作者が面白いと評価した記録ではない。

次の可能性：実機で引く距離と離脱時の変化を確かめてから、必要な場合だけ縁のめくれ量・復元時間を調整する。

制作範囲：main f7bcaf8から開始。同名PR／open PR／suction・kyuban branch・Lifecycleに既存作業なし。AGENTS、Change OS、Work Lifecycle、表現監査、Motion Lab原典記録と案内、Engine新作手順を確認。checkoutおよびworkspaceに .agents/skills は存在しなかった。Engineを使うloop・音・保存を必要としない独立SVG作品とし共通Engineは変更しない。

実装前Lock：.change-plans/suction-peel-20261022/r0.lock.json、digest fc75421b5e9800b3c41a0d41c412f3cd8acf8f0d7cbd60cfeaad3de050640e95、先行Lock-only commit ac8442a。Full WORK/SYSTEM。必要なactive台帳一項目と既存generatorによるLAB / Prototype Benchを同じscopeに含めた。町登録・Production・他作品・共有runtime・保存・外部権限は変更しない。

検証：Chromiumの実ブラウザーで変形・途中戻し、10回の離脱／再把持／再吸着、CDP touch、吸着中と離脱後のtouchCancel、keyboard、blur、画面外解放、resize、reload、reduced motion、LAB入口とbrowser Back、pageerrorなしを確認。Lifecycle --checkと関連24tests、JS syntax成功。最初のテストはtouchCancelの直後に未描画のdata属性を読んで失敗したため、イベントと描画の配送を待つ検証に修正し成功。製品側の中断不具合ではなかった。

独立read-onlyレビューで重大指摘なし。短い横画面568×320で当たり判定が37.77pxになる指摘に対し、SVG表示倍率に応じて透明な操作領域を44px以上へ拡張した。通常390×844／iPad相当820×1180／PC1100×760／横844×390と短画面568×320を関連検査対象にした。端末サイズのエミュレーションは実機Safari確認ではない。

表現監査6点：画面はガラスと吸盤のみ。タイトルとmeta、操作対象の支援技術ラベルを保持。説明UI・副題・結論・重複コピー・架空の感情は追加しない。つまみの形と溝を操作の手がかりとし、フォーカスとキーボード入力を残した。

正式verificationStateはUNVERIFIED。実機iPhone/iPad/Safari、作者の触感採否は未確認。最終exact SHAのScope→Risk→Impact・CI、マージ・Pages・実URLの結果はPRに記録し、配信成功と実URL操作成功を混同しない。
