# 公開後の既存キャッシュ修正

#742公開後のcloud Chromiumで、HTMLと入力表示は更新されたが、CanvasScene importが既存の`visual-flow-r2` queryを維持していたため、以前の描画モジュールがcacheから再利用された。結果、象徴液面と新入力表示に対し、バーが旧単色、復帰描画が旧版となった。

CanvasScene importを`tools=cut-main-r2`へ更新し、entryの`daily=cut-main-r2`も更新する。正式モデル、描画実装、操作処理の変更はない。変更多段依存（entry→app→scene→tools/cutbar）すべてに新機能の版queryがあることを自動テストする。

修正後の関連テスト10成功。#742の全ブラウザー・正式保存比較は維持。公開版で旧cacheを持つ同じtabをreloadし、C案区間と正式終了後のレバー復帰を再検証する。
