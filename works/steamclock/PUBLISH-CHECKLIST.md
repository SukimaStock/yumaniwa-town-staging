# SukimaStock 公開チェックリスト

## 制作完了

- [ ] `sketch.js` の作品IDを確定
- [ ] `bridge.workId` を使う場合は作品IDと一致
- [ ] `index.html` のtitleを確認
- [ ] Koder Previewで起動
- [ ] iPhone実機で主操作を確認
- [ ] 保存・共有・音など使用機能を確認
- [ ] assets / soundsの不足なし

## Working Copy作業前

- [ ] Pull
- [ ] HEAD / main / origin/main が一致
- [ ] 未コミット変更なし
- [ ] YumaniwaDesk → 案内 → `Pull・同期状態を確認済み`

## 作品を町へ置く

- [ ] Koderの完成作品を `works/<作品ID>/` へコピー
- [ ] YumaniwaDesk → 作品
- [ ] 作品ID・作品名・設置場所・分類を確認
- [ ] 公開状態を確認
- [ ] 開き方 = 町内
- [ ] entryは通常空欄
- [ ] **「町内プレイヤー用の作品フォルダを雛形から作る」= OFF**
- [ ] `作品を登録する`

## 履歴

- [ ] 必要ならYumaniwaDesk → 履歴
- [ ] 日付・見出し・本文・タグを入力
- [ ] `更新履歴を追加する`

## 最終確認

- [ ] YumaniwaDesk → 安全 → 重大な問題なし
- [ ] Working Copy Statusを開く
- [ ] `works/<作品ID>/` が新規作品として追加
- [ ] `data/works.js` の差分を確認
- [ ] 履歴を追加した場合だけ `data/updates.js` の差分を確認
- [ ] 無関係な共通ファイルに差分なし
- [ ] Commit
- [ ] Push

## 本番

- [ ] `/works/<作品ID>/index.html`
- [ ] `/?work=<作品ID>`
- [ ] 町内の設置場所から入れる
- [ ] 戻る / 再入場
- [ ] Safari実機
- [ ] 必要ならX内ブラウザ
