# Scene Replay · 最初の屋根に一粒

作品が定義する開始レシピを、現在の設定から繰り返し試す任意能力。Studioは作品の物理・描画・入力を所有しない。CはBから派生した独立した不変buildで、旧A/Bと旧clientは変更しない。

## 接続

`bridge-client-v05.js`へ `getTestScenes()` と `startTestScene(input)` を渡す。両hookがあるとreadyの `capabilities.sceneReplay` がtrueになり、scenesが通知される。

- 宣言：`{id,label,contract,description,configDrivenKeys}`。最大8場面、短い安定ID、契約は `name/1`。現在は `first-roof-rain` / `ametsugi-first-roof-rain/1` 一場面。
- コマンド：`start-test-scene`、`{sceneId,contract,config,runId}`。
- 作品は全入力を検証してから初期化する。失敗時は既存game/configを保持する。
- 応答：`scene-started`、`{runId,sceneId,contract,effectiveConditions,config}`。configは実際の開始に使った値。
- effectiveConditionsは最大16項目の平坦な有限数値・boolean・null・短い文字列。物理の構造は作品が決める。親は実行しない。configDrivenKeysに指定した条件はconfigとの一致を検査する。

Cのレシピは鏡像なしの最初の屋根、経過0、履歴/角速度/入力解除、現在configのangle/wait。新RainGameを作り、手操作なしでstartする。タイトルを表示せず、wait後に通常spawnする。paused・LIVE調整モードは保つ。音を勝手に有効化しない。独立play.htmlはBridgeなしで通常タイトルから起動する。

## 比較と保存

「この場面でもう一度」は現在の案だけ。「両案をこの場面から」は同じID/contractを両案が宣言した場合だけ。左右の開始設定を強制一致させない。angle/waitの差と他の調整値差を表示する。固定条件が異なる応答も差として表示する。スマホの非表示frameはpauseされ、同時刻・入力・結果の一致は保証しない。

再試行でconfig・draft・分岐・採否・Undoを変更しない。実行状態をsnapshotから復元しない。通常の「試す」は通常resetとして維持する。

保存は既存 `feel-workspace/2` / project別v2キーを継続。任意 `extensions.sceneReplay={version:1,selected:null|{id,contract}}` に場面選択だけを保存。旧JSONで拡張がなければ通常開始。未知の場面は勝手に適用せず、非対応表示する。新readerは拡張の形・ID・長さを検証する。古いUIで新しい場面機能が使えるという保証はない。

`feel-work-request/2`にも同じ任意拡張を添える。現在configと元build/hashは既存baseに入る。Workは場面IDから登録済みbuildのhookを参照できる。返答は既存形式のまま。この実験ではAI返答のconfig自動mergeを追加していない。作者設定の保持を自動保証しない。

## 応答の境界

親Window/nonce検査、clientの順序queueを維持する。Studioは現在frame・mount・runId・選択場面を照合し、古い応答を採用しない。開始応答と現在draftが違えば再試行を促す。不正応答・作品エラー・5秒timeoutで準備中表示を解除する。

## 含まない機能

任意frame snapshot、入力の完全再現、タイムライン、場面作成UI、二作品目、メモ、画面編集、ミキサー、Work通信自動化。新作の追加には既存catalog登録と全依存SHA256を使う。公開は別の指示と既存Release手順による。
