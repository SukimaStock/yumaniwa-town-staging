# 初回瓶詰めのブランド設定

基準main: 0aa346d6479177df4d39f7db100e72acbb577b8d（PR556）。Stagingのみ。Production変更なし。

最初の「ビン詰め」で名前・外観を選び、「次へ」で同じ小窓の本数選択へ進む。名前の初期値はAmberTime。1〜40文字、前後空白を除去、空欄・制御文字・上限超過は確定不可。入力途中と「次へ」はゲーム状態を書き換えず、実際の瓶詰めが成功した時だけブランドを確定する。本数選択から「設定を直す」で戻れる。取り消し・失敗では未確定の設定を保存しない。

| 項目 | 表示・保存の対応 |
| --- | --- |
| 丸ビン | 既存ID round → Codea BottleStandard |
| 角ビン | square → BottleSquare |
| 細ビン | 既存ID slender → BottleTall |
| 丸胴ビン | fancy → BottleFancy |
| ホワイト | 既存ID cream、#d9cba4、Fancy中央#786343 |
| ブラック | 既存ID dark、#303e3a、Fancy中央#d5c098 |
| 低め／ふつう／高め | キャップのみ #c8c8dc（銀系）／#b87333（銅系）／#ffc832（金系） |

Codea原典: Drive SukimaStock/AmberTime.txt（ID1cAtwEtLj0DoMbrw7XOwI0XdcA2dopTFi、更新2026-09-30T01:45:05.043Zを再確認）。BottlingScene3217–3219の4形状/2ラベル、3545–3579のラベルとキャップの分離、DistilleryAssets14469–14532の12×12行列を参照した。原作のラベルランク・価格別の光や色演出を追加せず、今回は依頼されたホワイト/ブラックと銀/銅/金を使用。元の全ピクセル配列は変更0、透明セルを含め保持。新しいドットを描かず、既存キャップ/ラベルセルだけ色を置換する。Fancyはラベル中央とキャップが元々同じ番号20なので座標で区別し、値段変更でラベルが変わらないようにした。

キャップは発売回の商品IDに対応するproductsById.selectedPrice（low/standard/high）から判定する。実際の金額やブランド全体の価格から推測しない。現行倍率0.82/1/1.24や価格計算は変更しない。販売室・商品・比較・製法元・帳面の各発売回は同じ描画経路を使用。ブランド単位の店舗表示は最新発売回の外観を使用。キャップ色は保存値からの表示のみで需要・品質・評判に影響しない。

## 保存・互換性

保存keyとgame version20を維持。旧factory・旧操作の再実行は変更しない。新規ゲームは記録付きenable-brand-identity境界で未設定となる。従来から存在するbrandId1を最初の瓶詰め成功時に設定し、ブランド2を作らない。2回目以降の名前/外観の変更はモデルでも拒否。手動・部分・自動のすべてがid1を継承する。

既存v20のブランドは設定済みとして名前・ID・外観・発売・実績を維持。読込時に瓶/ラベルだけが欠けている場合、信頼済み操作の再実行結果から復元し、その他全状態の厳密一致は維持する。他にデザイン指定がなければ従来の標準round/creamになる。過去の操作に指定が残っていればそれを復元し、名前・履歴を失わない。新しい境界は既存の履歴/比較/樽番号の読込処理にも届くため、activeな参照グラフだけcache keyをv0.58へ更新した（統合したr0 Plan Lock）。経済・数量・自動発送・世代交代のロジックは変更しない。

## 限定検証

- 関連70テスト成功。初回4形状×2ラベル、同一id、部分再瓶詰め、実際の自動瓶詰め、手動150本の既存解放条件、給与、旧セーブのcold replay、履歴/評判不変、欠けたデザインのみ復元、改ざん拒否、価格変更/保存復元を確認。
- 描画テストは全24組（4形状×2ラベル×3価格帯）の全不透明座標を原画と照合。価格変更の色差は元キャップセルのみ。ラベル/胴/液色/全セル配置は不変。蒸留器/管/受け器/試飲グラスはmainとbyte一致。
- 390×844 touchと1024×768 PCで初回設定/入力/4択2択/空欄拒否/本数画面からの取り消し/部分再瓶詰め/3価格/販売/帳面/歩みworker/店舗/復元を確認。初回設定は541px高（phone）で画面内に収まる。500px高へ縮めた入力欄の到達性も確認。browser-results.jsonとスクリーンショット23枚。
- 旧mainのモジュールをimmutable max-age3600でキャッシュしてから新版を読み込む別プローブで、新セーブを樽番号/比較/歩みworkerが読めることを確認。cache-results.json参照。
- 表現監査6点を確認。重複した店舗ブランド名を整理。装飾/新演出は追加しない。初期の全項目同時表示では小窓内が窮屈だったため、同じ小窓内の二段階へ変更。キーボード相当の高さでは設定小窓の幅を画面幅に保ち、4択が縮んで重ならないよう限定調整した。

新しい読込操作を含む保存は旧コードでは開けないため、取り消し時も新操作の読込対応を残す必要がある。物理iPhoneの日本語IME/実際のキーボード/Safariと作者の最終採否は未確認。headless環境の通常入力フォントは日本語字形が不足するが、日本語の入力値・エスケープ・保存・復元は確認済み。アプリの入力フォントは従来のsystem-uiを維持。包括E2E・長時間プレイ・経済の再調整は実施しない。verificationState=UNVERIFIED。

初期PR557は計画をr0→r1へ追記したが、現行のtrusted workflowは単一r0だけを受け付けるため、実装検査前に計画の形式で停止した。ゲートは変更せず、確定済みの同一実装をfresh branchの単一r0（ambertime-first-brand-ready）へ登録し直した。元PRと計画は監査用に維持し、コード・画像・70テスト結果はそのまま引き継ぐ。Scope/Risk/Impact、必須CI、Staging mergeと公開のexact SHA・結果は後継PRに記録する。

再現:
```sh
node --test works/ambertime/tests/first-brand.test.mjs works/ambertime/tests/first-brand-art.test.mjs works/ambertime/tests/codea-object-art.test.mjs works/ambertime/tests/room-object-art.test.mjs works/ambertime/tests/visual-polish-art.test.mjs works/ambertime/tests/brands.test.mjs works/ambertime/tests/partial-bottling.test.mjs works/ambertime/tests/delegation.test.mjs works/ambertime/tests/staff-experience.test.mjs works/ambertime/tests/canvas-layout.test.mjs works/ambertime/tests/pixel-art.test.mjs
node works/ambertime/design/first-brand/browser-review.mjs
node works/ambertime/design/first-brand/cache-review.mjs
```
