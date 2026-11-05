# H1-A5 メモリ・処理比較

`memory-results.json`はNode v24.22.1/Linux/x64、12入力を各新規processで一度ずつ計測した。入力SHA-256とUTF-8容量はH2-4の12保存に一致する。各phaseはbefore/afterのheapUsed・external・arrayBuffers・RSSを記録し、OS process最大RSSも記録した。同期処理途中の真のJS heap peakは計測できていない。終了後の観測値をpeakと呼ばない。

同じprocess内でparse済state、再stringify text、clone、wrapper、段階処理用parsedを意図的に併存させた。したがって全phase終了時の最大RSSは「中間コピーを残す研究pipeline」の値であり、本編で必ず同じ数のコピーが同時に残るという証拠ではない。NodeのRSSはChromium heapやiPhoneのRAM必要量ではない。

|100年入力|parse|文字列化|全clone|文字列hash|現行wrapperのparse＋文字列化|process最大RSS|
|---|---:|---:|---:|---:|---:|---:|
|地元|17.2ms|18.4ms|33.7ms|7.6ms|34.2ms|138.1MiB|
|広域|28.9ms|34.2ms|69.5ms|12.6ms|54.7ms|181.3MiB|
|混合|24.8ms|28.3ms|62.8ms|7.6ms|51.7ms|165.6MiB|

Aは既存の検証済正式JSONに対し、`JSON.parse(text)`で全gameを再生成しwrapperを`JSON.stringify`する。正式serializer自体の検証と最終stringifyはこの表に含めない。

Bは正式serializerが返したJSON textをwrapperのgame値として再利用する。文字列の必要な構文を固定し、UI値はJSON.stringifyする。12入力で現行wrapperとバイト一致し、引用符・改行・日本語・非BMP文字・UI値の境界テストも成功した。lazy rope構築は0.1ms程度だが、実文字列の展開・native保存の費用を含まない。別phaseで両方式のSHAを計算して内容を強制的に読むと広域100年で24.0msを要した（2本分のhashを含む）。この値を保存の高速化率へ換算しない。削減できるのは全gameの再parseと二度目のJSON生成であり、正式検証は残る。

Cはparseとstringifyの間でevent loopへ戻る。大きな同期phaseの内部は分割できず、広域100年で20.0msのparseと21.3msのstringifyが残った。段階処理は応答機会を作るが、オブジェクトを保持したままなら総メモリは減らない。NodeのsetImmediateはブラウザのpaint確認ではない。

|広域100年・別process単発|全処理|メインtimerの最大遅延|process最大RSS|
|---|---:|---:|---:|
|D mainでparse→workerへobject clone|173.0ms|66.4ms|146.7MiB|
|E UTF-8 ArrayBufferをtransfer→workerでdecode/parse|141.9ms|5.6ms|129.0MiB|

D/Eともworkerは文字列化・hashを行いhashと長さだけを返す。受信値は元保存SHAと長さに一致し、Eの転送元bufferがdetachされたことも確認した。Dは送信時の主thread parseと構造化cloneが残る。Eはencode用bufferとworker側decode文字列・parsed stateが必要で、ゼロコピーの完全復元ではない。workerから巨大stateを返す費用は未計測。単発Node測定であり、SafariやChromiumのframe time・process peak削減を保証しない。

H1-A4の128MiB V8 heap制限下26MB fixture pipelineのrenderer crashは、転送・解析・cloneのどこで落ちたか未確定の既存失敗として保持する。今回のRSS値でその発生phaseを断定できない。checkpoint/hash/IDBはH1-A4既存観測とその未計測境界を引き継ぎ、今回JSON-only比較をIDB transactionの新計測と扱わない。

再実行：`node --expose-gc works/ambertime/save-practicality/memory-run.mjs run /tmp/amber-h1-a1/saves /tmp/h1-a5-memory.json`。研究コードと入力のfingerprintをresultsへ保存する。正式保存への接続は行わない。
