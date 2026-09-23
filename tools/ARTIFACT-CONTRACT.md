# SukimaStock 制作物の共通メタデータ v1

Map Factory、Audio Factory、Nudge が書き出す JSON に、来歴と次の作業を示す `artifact` を付ける。各ツールの既存データ形式はそのまま維持する。これはファイルを自動転送する仕組みではなく、制作物を人や別のツールが判別するための契約である。

## 形

```json
{
  "artifact": {
    "schema": "sukimastock-artifact/1",
    "kind": "map-composition",
    "producer": { "tool": "map-factory", "version": "0.7" },
    "createdAt": "2026-09-23T12:00:00.000Z",
    "dependencies": [
      { "kind": "map-factory-asset", "id": "base_123" }
    ],
    "nextStep": "dot-cleanup"
  }
}
```

- `schema`: 共通メタデータの版。v1 は文字列 `sukimastock-artifact/1`。
- `kind`: このJSONが何を表すか。下表の値を使う。
- `producer.tool` / `producer.version`: 書き出した道具と、その時の道具の表示版。
- `createdAt`: このJSONを書き出した時刻。ISO 8601 のUTC日時。
- `dependencies`: 復元や次工程で必要な別の制作物への参照。依存がなければ空配列。参照自体に画像データは入れない。
- `nextStep`: 想定する次の作業。自動実行の指示ではない。

## 現在の出力

| 出力 | `kind` | `dependencies` | `nextStep` |
| --- | --- | --- | --- |
| Map Factory の素材庫バックアップ | `map-factory-backup` | `[]`。画像データを内包する | `map-factory-restore` |
| Map Factory の店舗Recipe JSON | `map-composition` | 使用した素材の `map-factory-asset` ID | `dot-cleanup` |
| Audio Factory のプリセットJSON | `audio-presets` | `[]` | `audio-factory-import` |
| Nudge の修正仕様JSON | `revision-brief` | `[]`。参照元作品があっても、現行ツールは識別子を持たない | `ai-revision` |

Map Factory のRecipeは画像を含まない。依存する素材IDは同じMap Factory素材庫の中でだけ解決できる。別のブラウザーへ作業を移すときは、先に素材庫バックアップを復元する。完成PNGは別ファイルであり、Recipeの依存素材には数えない。

## 互換性と版の扱い

- `artifact` は追加フィールド。Map Factoryバックアップの `format/version`、Map Recipeの `version`、Audio Factoryの `format/version`、Nudgeの `schema` はそれぞれのデータ形式として維持する。
- 読み込み側は各ツール固有の形式と版を検証する。`artifact` の有無だけでファイルの妥当性を判定しない。従来のバックアップやプリセットも引き続き読み込める。
- 共通フィールドの意味を変えるときだけ `artifact.schema` を上げる。ツール固有の内部データ変更では、そのツールの形式の版を上げる。
- `dependencies` のIDは参照であり、ファイルへのアクセス権やファイルの存在を保証しない。

町の開発モードからYumaniwaDeskへ渡す `yumaniwa-editor-diff-v1` は、正本ファイルを安全に更新する操作用プロトコルである。この共通メタデータを付けず、既存の検証・適用フローを維持する。
