# SukimaStock 3D Collection 02 · Free Forms — 2026-10-12

Base `f0eaea118fea35b9ecbe503731465a0a7b38b487` (merged #287); latest main, related PRs/reviews, all 21 definitions, COLLECTION_GUIDE, DEVELOPMENT, specimen/mesh and AGENTS/operations reviewed. No applicable production skill was present in the catalog or checkout `.agents/skills`; the work guide is canonical. Active / staging-only. Standard WORK preimplementation Plan `sukima-3d-collection-02-20261012` was committed before authoring; draft PR #288. An earlier plan-only branch was superseded before implementation when the user authorized minimal existing-test count maintenance.

15 individually shaped **v2 STATIC** works, explicit unique display numbers **22–36**, appended after the unchanged 21 entries. Naming followed shape exploration. No random deformation, imported models, dedicated preview images, gameplay or scheduled production. Each JSON uses authored indexed triangles, flat normals and `behaviors:{}`. Shared previews derive from the same data. Engine/camera/input/Touch/UI/package, shared 2D Engine, other works and Production are unchanged.

| No. / Category | Name / ID | Shape idea, v2 expression, angle to inspect; finding |
| --- | --- | --- |
| 22 / A 器と空洞 | TILT MOUTH / `tilt-mouth` | Five-sided deep pocket with sloping asymmetric lip and displaced foot. Closed outer/inner/rim/floors, 22 vertices / 40 triangles. Look down into mouth then below foot; oblique lip changes depth impression. |
| 23 / A | POCKET SHELL / `pocket-shell` | Wide shallow seven-sided recess, thicker back and tilted rim. Closed 30/56. Front → edge → back; a shallow space can read as a shell without copying BOWL. |
| 24 / A | SQUARE FLUE / `square-flue` | Leaning rectangular hollow tube, open at both ends but closed skin, 16/32. Look along Y then across side; thickness belongs to the skin, no end caps across the hole. |
| 25 / B 穴と隙間 | ELBOW WINDOW / `elbow-window` | Concave L-shaped through-window; paired six-corner inner/outer boundary, closed 24/48. Face → oblique → back; the narrow horizontal passage joins the tall slot. |
| 26 / B | FORK GAP / `fork-gap` | Unequal prongs with an open-ended gap, tapered and slanted. Extruded concave polygon, closed 16/28. Front then edge; gap stays open rather than becoming another ring. |
| 27 / B | SKEW TUNNEL / `skew-tunnel` | Shifted triangular portals joined by sloping walls, closed 12/24. Front and back along Z then side; aperture partly occludes itself at oblique angles. |
| 28 / C 薄いもの | CREASE FAN / `crease-fan` | Broad radial zigzag edge from one low corner, 11/9, open + doubleSided. Face → edge → back; nine folds collapse into a jagged profile. |
| 29 / C | RIBBON TURN / `ribbon-turn` | Six unequal cross-sections turn a narrow strip through space, 12/10, open + doubleSided. Rotate around Y; waist is projected twist, not a hole or deformation. |
| 30 / C | SADDLE SHEET / `saddle-sheet` | Four corners bend in opposing directions, 9/8, open + doubleSided. Face → diagonal edge → underside; broad quadrilateral becomes a pinched profile. |
| 31 / D 複数パーツ | OFFSET STACK / `offset-stack` | Five unequal plates separated by explicit air gaps, 40/60. Five closed parts with position, Y rotation and nonuniform scale. Front and side reveal offset versus layering; no hidden supports/animation. |
| 32 / D | BRIDGE PINS / `bridge-pins` | Two unequal feet, slanted lintel and detached triangular cap, 30/44. Four closed TRS parts. Front → side; deliberate small clearances make an unstable-looking assembly without collisions. |
| 33 / D | ORBIT CAGE / `orbit-cage` | Five tangential flat blocks around a small central prism, 48/72. Six separated closed TRS parts. Face → side reveals depth and central occlusion; no moving orbit. |
| 34 / E 自由造形 | THREE RIDGES / `three-ridges` | Three displaced height ridges above a flat underside, closed 24/44. Above → side → below; terrain/tool associations emerge from the same nonconvex solid. |
| 35 / E | PINCHED CROSS / `pinched-cross` | Unequal four-way silhouette with a sheared thick body, closed 24/44. Front → diagonal → back; narrow waist and skew thickness change apparent balance. |
| 36 / E | STEP KNOT / `step-knot` | Six square sections make a continuous angular ascending bend, closed 26/48. Front → side → underside; the bend reads as separate facets without detached parts. |

All fifteen fit v2 without extension. 344 authored vertices / 567 triangles total; three thin sheets draw both sides (additional 27 triangles). Per-work budget is 8–72 authored triangles, far below the contract limit. No authored normal override or Touch configuration is required. Each closed part is one connected surface with positive signed volume; disconnected shells are separate parts. This avoids the known #287 P2 aggregate-volume blind spot. The unknown Touch-key P2 is inapplicable because all behaviors are empty. Neither existing Engine issue was repaired here.

## Verification

- Baseline main: 114/114 existing tests. Candidate: **129/129** work tests and **24/24** lifecycle tests. Minimal `free-forms.test.mjs` maintenance pins old 17–21 to slice(16,21), checks total36/new22–36/v2 STATIC, and makes the independent data-addition example choose the next unused number/count. Old sixteen hash/behavior baselines and old five named geometry checks remain. Manifest-driven v2 tests now cover all twenty v2 forms; switching walks all36 forwards/backwards. No new permanent test system.
- Direct Git byte comparison protects **all21** original JSONs (including the five v2s), and exact manifest prefix equality protects order/number metadata. Only fifteen new JSONs, append-only manifest, this note, one existing test and the Plan Lock change.
- Unchanged native script: **536 GLES frames**, exact shaders compile/link, GL error0; all36 rest/turned/back at three sizes, old Touch states, and all20 v2 CPU/GPU preview comparisons. Coverage .9996–1.0000 for v2 previews; mean channel differences 0–.006. Native results are not browser/device certification.
- A temporary strict noncoplanar edge/triangle intersection check found a slight BRIDGE PINS lintel/left-foot overlap; raising only the lintel from Y=.36 to .42 creates a clear gap. All15 then pass this supplementary check; coplanar contacts/boundaries are not a complete intersection proof. The script is not committed.
- Individually reviewed all15 native three-angle images and same-gray initial/side/back/underside previews (temporary outputs outside repository). Confirmed cavity interiors versus back/foot, unfilled apertures, edge silhouettes, thin backs and intentional separated parts. CPU/GPU equality alone is not the topology evidence.
- Actual local Chromium `/usr/bin/chromium`, Playwright, WebGL2 SwiftShader: all36 load and draw; no pageerror/GL error. Real Pointer Events and next-while-captured switches restore pristine meshes/input; all20 STATIC rotate after hold, reset pose/velocity, retain exact vertices. New15 get >1s holds; keyboard rotations also exercised. Three CSS viewport sizes 390×844, 844×390, 768×1024: no horizontal overflow and collection scroll preserved. Additional actual WebGL views confirm background through SQUARE FLUE along its axis, the L-window and skew tunnel; the deep mouth interior and all three thin backs render. Existing v1 interaction behavior remains protected by unchanged fixed traces.
- PR #288 records exact checked head, Scope → Risk → Impact, CI, merge SHA and Pages/live results. **Physical iPhone/iPad, native iOS menus and device frame pacing are UNVERIFIED**. Formal verificationState stays UNVERIFIED; staging publication is not owner adoption or Production permission.

## Limits / next shapes

Zero-thickness sheets deliberately vanish edge-on; they are not flexible cloth. Parts remain rigid and static, with no joints, transparency, collision or general nonconvex Touch. General self-intersection repair and nested-shell orientation are outside the current validator. Authored cross-sections and separate-part clearances were reviewed here; no automatic repair is claimed. Future exploration: an asymmetric split shell with a narrow slit, interleaved folds, or a branching hollow passage. Moving/contacting parts would require a separate capability decision; no extension or automation was started.

---

# SukimaStock 3D v0.5 · Free Forms — 2026-10-12

## Scope and architecture

Latest main `2a8af03d5795bd1e537ec410a521930dc047434e`; merged #277/#278/#279/#280/#284/#285/#286, all sixteen specimens and both guides reviewed before work. Standard WORK Plan locked first at `.change-plans/sukima-3d-free-forms-v05-20261012/r0.lock.json`. Only this work and its own Plan Lock change. Production, other works, shared 2D Engine, global registries, LAB and Motion Lab stay outside scope.

- **Core**: `math.js`, `camera.js`, `geometry.js`, `mesh.js`, `renderer.js`, `rotation.js`, `loop.js`. `mesh.js` validates explicit triangle surfaces and bakes part TRS; it has no Touch or DOM imports. The existing WebGL 2 shader/light/camera remain. A flat face normal is generated unless authored normals are supplied; nonuniform scale uses inverse transpose. Only explicitly two-sided parts get reversed GPU triangles with reversed normals.
- **Specimen loading**: `specimen.js` retains all v1 convex/welded/volume checks and dispatches v2 surface checks. `sukima3d-specimen/1` JSON is unchanged. `sukima3d-specimen/2` explicitly authors triangles, normals, materials and parts. Open boundaries, concavity, through-holes, inner surfaces and disconnected components are not converted to convex hulls or filled.
- **Behaviors**: `behaviors.js` handles optional capabilities. V1 defaults to its existing `feel`; explicit `behaviors:{}` selects a `RotationBody`. V2 requires explicit behaviors, normally `{}`. Touch uses the existing `TouchBody`, now extending the shared rotation body. This preserves the exact rotation equations and Touch update order. V2 opt-in Touch is limited to one closed convex part validated through the old contract; its adapter adds bending centres. There is no new free-form physics.
- **Collection**: `session.js` is a DOM-free fresh-body factory, named `SpecimenSession` with `TouchSession` retained as a compatibility alias. `PointerInput` retains `TouchInput` as an alias. Static down/hold never calls press or pull; a drag after any hold rotates. Static permits a drag starting on a hole/background. Reset cancels capture, angular velocity and wobble, and restores the authored pose. Existing Touch thresholds, hold/pull mapping, cancellation, presets and callout protection remain.
- **Previews**: old logical-face SVG unchanged; new 200px CPU depth raster uses the same packed triangles, camera and matte lighting. No live card WebGL contexts. One active renderer remains. Static card canvases do not capture input or block collection scrolling. No external 3D engine or runtime package was added.

## Works and registration

| Display | ID | Authored vertices / triangles | Distinction |
| --- | --- | --- | --- |
| 17 | dent | 47 / 90 | irregular solid with a shallow central depression |
| 18 | ring | 72 / 144 | closed torus surface with a genuine through-hole |
| 19 | bowl | 86 / 168 | outer wall, rim, inner wall and inner floor |
| 20 | leaf | 14 / 16 (32 GPU) | bent open sheet, two-sided |
| 21 | mobile | 132 / 240, seven parts | plinth, axis, beam, two threads, warm weight and small loop |

All five are STATIC. Old cards keep numbers 00–15 and original order; new entries explicitly carry 17–21 as requested. The number is display metadata, distinct from position/count. The next registration can use `number:22`. Shape data plus one manifest entry remain sufficient; no object-name conditions were added to runtime. All module/CSS/data URLs and package advance together to 0.5.0. JSON stays `cache:no-cache`, so later data-only additions need no engine-version edits.

## Verification and limitations

Reproducible commands are in COLLECTION_GUIDE.md. The expanded unit suite checks all sixteen unchanged JSON blobs and fixed tap/hold/pull/restore/flick hashes at every profile, generated from the actual pre-change `2a8af03` sources. It also checks all 21 session switches, static gestures/reset, explicit convex Touch reuse, transformed normals, bad indices/nonfinite/zero-area/winding/topology, separate components, ray-through-hole/interior/back-side geometry, preview depth, guide examples and data-only registration.

Observed before PR: all 114 work tests and 24 existing work-lifecycle tests pass; all 27 JS/MJS modules and inline module fixtures pass syntax checks; git diff check passes. Native run succeeds for 386 frames with GL error 0, and all five preview masks match GPU coverage exactly at 200px (one subpixel facet-edge color difference per preview; mean channel difference 0.000–0.006).

Native Mesa GLES compiles the exact shipped shaders and draws all 16 Touch works × 7 states × 3 sizes, all 5 static works × 3 poses × 3 sizes, and five 200px preview comparisons (386 frames). CPU/GPU preview coverage must exceed 99.5%; channel error is bounded, with only differences within 0.01px of an actual triangle edge permitted for subpixel raster rounding and fewer than 0.1% boundary pixels. Existing >5000 body-pixel and >300 change-pixel checks remain for the original full-size scene set. RING also asserts actual background pixels through the hole.

The cloud browser has previously lacked WebGL2. The local runtime has Playwright but no Chromium executable; a browser installation returned truncated downloads, so local Chromium rendering is not claimed. Native GLES evidence is distinct from browser WebGL/device evidence. The actual browser UI/fallback/responsive pages and labelled `tests/debug-fixture.html` can verify Pointer Events, capture, profile controls, static rotation/reset and switching without claiming GL rendering. The fixture selects a centre ray for any point in its labelled 2D surface: it is not a pointer/3D alignment test. Exact final SHA, CI, Pages and live observations are recorded in the PR.

Physical iPhone/iPad touch feel, native iOS callout suppression and actual device performance remain **UNVERIFIED** until tested on hardware. Formal verificationState remains UNVERIFIED under the repository contract; CI/staging merge is not author adoption or production approval.

Remaining limits: self intersections and nested-shell outward orientation are not comprehensively diagnosed or repaired; no arbitrary nonconvex Touch physics, mesh editor, joints/collisions, transparency/textures or Motion system. Part transforms are baked at load time; per-part animation can be a later capability without rewriting authored shape data. Camera fits the bounds and restores orientation; no additional zoom gesture is introduced.

---

Below is preserved v0.4 / Collection 01 history.

# SukimaStock 3D Collection 01 · 2026-10-12

小さな造形を見て、触り、そこから用途を考えるための第1回。ゲームや機能の企画ではない。自然3・人工3・正体不明4を追加し、既存6作と合わせて16作。各形の頂点を意図して配置し、大きな論理面、厚み比率、偏りを先に設計した。ランダム標本、外部モデル、追加パーツは使っていない。

最新main `ea0a63510f89a246e4ff00ee426024d03a880537`、#284/#285、AGENTS、制作ガイドと現行運用を確認。active / staging-only。10 JSON + registry + この記録は小変更ルートの最大4ファイルを超えるため、Standard WORK Planを最初のcommitで固定し、draft PR #286から開始した。JSON/Markdownのみなので非該当のnode-syntaxを成功扱いせず、既存回帰と描画を実行する。必要な制作skillは利用可能一覧にもcheckoutの`.agents/skills`にもなかったため、作品の`COLLECTION_GUIDE.md`を正本にした。

**番号について:** 下表の07〜16は登録順の7〜16番目。既存UIはカード・名前の番号が00始まり（元の6作は00〜05）、件数表示が1始まり。その既存番号・順序・UIを守り、新作のカード表示は06〜15、件数表示は7/16〜16/16になる。番号補正のruntime変更は含めない。

## 制作記録

| 登録順 / 区分 | 名前・ID | 意図 / シルエットと回した変化 | 初期触感 / 触ってほしいところ |
| --- | --- | --- | --- |
| 07 / A 自然 | WILLOW / 柳片 · `willow` | 細い葉の、面から稜へ変わる薄さ。左右非対称の葉形、裏にも厚みがあり、横からは細い刃。茎は付けない | SOFT。中央の葉脈状の稜とその横の面を軽く押す。尖端を大きく引かず、小さい戻りを見る |
| 08 / A 自然 | BASALT / 柱石 · `basalt` | 石の丸い塊とは違う、五角の切断面と縦長の平面。少し傾いた一本の角柱。回すと縦の帯の幅が変わる | HARD。縦の広い面と上端近く。短く押して早い復元を比べる |
| 09 / A 自然 | ICE RAFT / 氷筏 · `ice-raft` | 水辺に浮く一枚の厚い氷。横に広い不規則七角の台形断面、裏は大きな一面。透明表現ではなく輪郭で氷を考える | SOFT。硬そうな平たい天面が控えめに沈む意外性。天面中央を押して、縁近くを小さく引く |
| 10 / B 人工 | DOORSTOP / 戸あたり · `doorstop` | 5面だけの楔。正面の三角と、回したときの大きな斜面の違い | HARD。斜面中央と厚い側の稜。浅い押下の後の短い余韻 |
| 11 / B 人工 | LEAN BLOCK / かたむき積木 · `lean-block` | 横長で低い箱の上面をずらす。不安定そうな平行四辺形と裏の大きな面。柱石との差を見て、縦長案から幅広に修正 | SOFT。積木の硬さを裏切るゆっくりした面の沈み。広い前面を押し、上の角寄りを引く |
| 12 / B 人工 | TETRA / 四つ角 · `tetra` | 4面だけの最少立体。少しずれた頂点、回すと三角から四角い輪郭へ。初期姿勢を調整して二面の稜を見せる | BOUNCY。大きな三角面を短くタップし、離した後を見る。頂点より面の中央 |
| 13 / C 不明 | ELSEWHERE / どこでもない · `elsewhere` | 台形の背に片寄った峰が一つ。前からは畳んだ何か、横はひれ、裏は何もない一面。用途は付けない | BOUNCY。低い峰の脇の三角と、裏の広い台形を交互に触る |
| 14 / C 不明 | OFFSET / ずれた頂き · `offset` | 上下の四角の向きが45度違う反角柱。回転で帯の稜と肩の数が入れ替わる。ねじれは関節ではなく一つの凸面集合 | HARD。斜めの稜の隣の面を押し、輪郭の動かなさと局所の戻りを比べる |
| 15 / C 不明 | FAR TIP / とおい先 · `far-tip` | 左右で長さが違う横向きの二錐。短い背中と遠い先、端から見ると急に三角に縮む | BOUNCY。中央の三角面、短い先の付け根。小さな引きと反発で偏りを感じる |
| 16 / C 不明 | PAUSE / まのかたまり · `pause` | 厚い六角の円盤に小さな平らな頂を二つ。表裏に少しずれ、横からは台形の重なりに見える単一凸体 | SOFT。親指を置きたくなる六角の平面。遅い押し込みと静かな復元を長押しで見る |

全作 `display.scale=1`、matte、`variation=.018`。触感構成は HARD 3 / SOFT 4 / BOUNCY 3。色を一時的に同じ灰色にしたプレビューで初期・90度・180度を並べ、色なしの輪郭差も確認する。既存のプレビュー関数と同じJSONを使い、別形状のサムネイルは作らない。

### データの触感設定

数値はJSONの正本を参照。下表の上限は `pressDepth / maxDisplacement / maxPull`、Cは `cornerCompliance`、`centerCompliance=1`。省略したfeelキーは既存profileの値。

| ID | 論理面 / GPU三角形 | 上限 / C | feel.overrides |
| --- | ---: | --- | --- |
| `willow` | 10 / 30 | 0.065 / 0.09 / 0.15 / C=0.24 | `{"depth":0.09,"radius":0.72,"pullStrength":0.65}` |
| `basalt` | 7 / 30 | 0.1 / 0.14 / 0.23 / C=0.3 | `{"depth":0.1,"radius":0.72,"maxPull":0.23}` |
| `ice-raft` | 9 / 42 | 0.065 / 0.09 / 0.14 / C=0.22 | `{"depth":0.075,"radius":0.85,"pullStrength":0.6,"returnDamping":0.83}` |
| `doorstop` | 5 / 18 | 0.09 / 0.12 / 0.18 / C=0.3 | `{"depth":0.1,"maxPull":0.18,"pullStrength":0.75,"restoreStiffness":360,"returnDamping":0.72}` |
| `lean-block` | 6 / 24 | 0.16 / 0.2 / 0.32 / C=0.44 | `{"pressRate":3.8,"returnDamping":0.77}` |
| `tetra` | 4 / 12 | 0.13 / 0.18 / 0.27 / C=0.33 | `{"returnDamping":0.51,"maxPull":0.27}` |
| `elsewhere` | 5 / 16 | 0.13 / 0.18 / 0.29 / C=0.35 | `{"returnDamping":0.54,"pullStrength":0.85}` |
| `offset` | 10 / 32 | 0.115 / 0.155 / 0.25 / C=0.36 | `{"depth":0.115,"radius":0.82,"maxPull":0.25}` |
| `far-tip` | 6 / 18 | 0.09 / 0.13 / 0.2 / C=0.26 | `{"depth":0.1,"radius":0.72,"pullStrength":0.65,"returnDamping":0.58}` |
| `pause` | 14 / 60 | 0.13 / 0.17 / 0.25 / C=0.42 | `{"pressRate":3.4,"restoreStiffness":145,"returnDamping":0.85,"pullStrength":0.75}` |

`compliance`は押し込み用で、pullの尖端保護には使われない。全作にlimitsを明示し、薄い葉と氷、先の長い二錐は小さいpull上限にした。scaleで上限が縮尺されないため、今回はすべて実寸のscale=1で設計。既存の面積・辺長ガードは対向面衝突や体積を直接保証するものではない。極端な薄板を避け、復元と複数方向の変形を観察する。

## 検証記録と限界

最終の対象SHA・CI・Pages・配信結果はPR #286へ固定する。規格/全16作/各面のpick・変形/複数角度/生成プレビューは既存 `tests/*.test.mjs` と `render-collection.mjs | check-gles.py` で確認する。恒久的な検証コードを追加・変更しない。

既存のswitch回帰は `i % 6` なので、新10作の切替確認の根拠にはしない。今回の一時ブラウザ検証は既存debug公開APIと実アプリのPointer Eventsで全16作のタップ・1秒hold・rotate・pull・release、掴んだままのnext、previousでの再入場、一覧へ戻る/スクロール復元を別に確認する。復元数値の最終確認では実bodyの既存stepを3秒分進める。物理的な指の感覚の代用ではない。

Native Mesa GLESはシェーダ/形状の証拠、ローカルChromium WebGL2はブラウザ描画/入力の証拠、390×844・844×390・768×1024はCSS viewportの証拠として区別する。実機iPhone/iPadの手触り、native menu抑止、端末性能は未確認。正式状態は現行契約どおりUNVERIFIED。作者の採用・Productionの承認を意味しない。

観測結果: 全16作のブラウザ読込み・操作・掴み中切替と前後/一覧復帰が成功し、appのpageerrorは0、GL errorは0。3 viewportで横overflowなし・一覧scroll復元一致。既存native scriptは全16作×7状態×3サイズ=336フレームで成功。同色三方向プレビューとnativeの初期/turned/backを目視し、初期案で近かった柱石と積木は積木の幅/高さ/傾きを変更して区別した。初期の戸あたりは復元が早くreleaseフレーム差分が小さかったため、既存のreturnパラメータを微調整し、検査の閾値を変えずに短い余韻を残した。

## 今回見送った形 / 次回

穴のある輪石、くぼんだ器、割れ目を開閉する莢、独立した二つの塊が触れ合う形はv1対象外。無理に凸の塊へ置き換えず保留し、拡張の実装や予約はしない。

次は作者が実際に触った反応をもとに、「広い一面を押す」対「細い稜をつまむ」、短い復元対ゆっくりした復元を少数の形で深めたい。特に柳片・氷筏の控えめな動きと、四つ角・どこでもないの反発が心地よいかを見たい。用途や遊びはその後に考える。定期量産設定はない。

---

以下はv0.4基盤と以前の検証の履歴（当時の6作品）。

# Touch Lab v0.4 — collection foundation

## Current scope / design

Base: staging/main `90fbd73063cacb53252bb981e66fca9d074f8f34`, after merged #277/#278/#279/#280 and current LAB #283. Reviewed current engine, DEVELOPMENT, AGENTS and operations. Work-only Standard Plan locked before implementation. No global lifecycle/LAB, common 2D Engine, other works, deployment workflow or production changes. Remains active/staging-only. Author success feedback is not blanket certification of these new specimens.

The app opens a six-item Collection View. A static SVG preview uses the exact validated specimen mesh/material/pose; there is no WebGL context or animation per card. The sheet scrolls, with two columns on phones and a responsive wider grid. Selected Touch View has one shared WebGL2 renderer and a fresh mesh/body/input. Back/previous/next are the only normal navigation controls; no score or new gesture. Return restores collection scroll/focus. Keyboard arrows/space, reduced-motion preferences and opt-in debug remain.

`collection.json` is the ordered work-local registry. `objects/*.json` hold independent shape/material/feel/display data. `engine/specimen.js` is a pure validator/mesh adapter; `engine/session.js` creates a fresh body and clears the previous one. No DOM/fetch is required to reuse a specimen in a different app. `collection.js` handles same-work JSON loading at bounded concurrency (four), preserves order and isolates individual invalid/missing specimens. Fatal registry errors produce a short message. Metadata reaches the UI through textContent, and thumbnails contain only generated numeric SVG polygons.

The v1 creation contract deliberately supports a single closed convex solid with planar convex polygon faces, 4–64 corners, 4–96 logical faces and at most 512 fan triangles. Validator checks finite/index bounds, duplicate/unused points, outward halfspaces, planarity/convexity/area, oppositely paired welded edges, connectedness, volume, color/material, whitelisted bounded feel overrides and unit pose/display limits. Hollow/open/concave/self-intersecting solids are rejected; no silent winding repair. SHELL is a thick closed fan, not a hollow shell. These are documented boundaries, not arbitrary imported-model support.

Generic changes to existing engine:

- Geometry packing reads a matte color/optional per-face palette and variation from mesh material. The legacy clay fallback and exact shaders/light remain unchanged.
- Camera framing may move back for a specimen radius above 1.1. Original polyhedron framing is unchanged. The ground shadow also moves down for a larger bounding radius; its original position and shaders remain for the polyhedron.
- TouchBody uses optional shape-owned pressure/displacement/pull caps and reuses the existing whole-field signed-area/edge-strain guard on all deformation of constrained shapes. No object-ID branches. Existing springs, impulse, hold/drag thresholds, quaternion drag/inertia and pull mapping are retained.
- All module/CSS/data request URLs consistently use `?v=0.4.1`. Original `createPolyhedron()` remains the regression reference; production gallery loads its identical JSON copy. JSON requests conditionally revalidate HTTP caches, so subsequent data-only additions do not require changing engine/module versions. No runtime libraries, image downloads, external API, asset editor, storage, imported 3D engine or Dots automation.

Native iOS selection/callout guard from #280 is retained inline on main. Pointer listeners are destroyed/capture cancelled before switching. Each selection creates a fresh pose, zero angular/offset velocities and rest vertices; no deformation/profile from the previous specimen is reused. Resize, blur, visibility/pagehide, BFCache and context-loss cancellation remain. WebGL is initialized only when opening a specimen, so the Collection View still works without WebGL2. In that environment Touch View offers the existing graceful notice plus navigation.

## New specimens / making more

STONE has unequal bevelled planes; CRYSTAL is a slanted hexagonal prism with two unequal tips; SEED tapers with asymmetric belly/tip; SHELL has a raised fan and thin but closed rim; ODD has three offset shoulders with a crooked crest. All use SOFT by default. HARD/SOFT/BOUNCY remain available; shape caps protect narrow geometry even under stronger debug values.

Authoring procedure, valid cube example, parameter bounds, required tests and failure diagnosis: **COLLECTION_GUIDE.md** in this directory. Adding a specimen means a new JSON file and an appended registry entry; previews, UI and specimen tests consume the registry. No renderer/input/deformation edit is needed. A pure synthetic new-item registration and 100-item load test exercise that boundary.

## Verification commands / limits

```sh
node --test works/sukima-3d-lab/tests/*.test.mjs
node tests/test-work-lifecycle.cjs
node works/sukima-3d-lab/tests/render-collection.mjs | python works/sukima-3d-lab/tests/check-gles.py /tmp/touch-v04-render
```

All 38 pre-v0.4 tests are retained. Collection tests add original-mesh/pose/colors/response identity, every specimen/material/face picking and bounded press/pull/recovery, repeated mixed deformation, five viewport sizes/many rotations, invalid data, isolated loading failures, synthetic data-only addition/100-item loading and grabbed/spinning session replacement. 63/63 work tests and 24/24 existing lifecycle tests passed locally. Exact checked SHA and CI are recorded in the PR.

Native Mesa GLES compiled/linked the exact unchanged shaders and rendered **126 specimen frames**: six specimens × seven rest/rotated/back/tap/held/pull/release states × 390×844, 844×390 and 900×900. Pixel evidence and GL errors are checked against each specimen's own rest frame. Rest-frame montage was visually inspected. This is native GLES evidence, not browser WebGL or actual iPhone/iPad touch/performance. No UI/ground shadow is included in native rendering. The v0.3 script remains usable separately.

Cloud-browser collection/navigation/fallback/debug observations and Pages publication are recorded after deployment in the PR. Physical Safari touch comfort, native menu suppression, real mobile frame pacing and WebGL context restoration remain UNVERIFIED until observed. Formal verificationState stays UNVERIFIED under the current repository contract; staging CI/merge is not final author adoption or production permission.

Rollback: revert this isolated work-only PR. No shared registry or other work needs to change.

## Historical v0.3 implementation reference

# Touch Lab v0.3 — surface grab and elastic pull

## Scope / baseline

Started from staging/main `ddb4166106696f2aa0cda241732e5beb941dfcef`, after reviewing merged #277 (v0.2 tactile response), #278 (complete versioned browser module graph), current code, AGENTS and Change operations. The explicit v0.3 instruction supersedes the earlier v0.2 restriction on pull. The work remains **active / staging-only**.

Changes are confined to this work, its lifecycle title and the required pre-implementation Plan Lock. Shared 2D Engine, other works, town, SEO, deployment workflow, production, lifecycle status and public URL are unchanged. No new specimen, editor, multi-object system or two-finger scaling. No Three.js, Babylon.js, external runtime package, physics library, storage or API. Browser-standard WebGL 2, ES modules and Pointer Events remain the implementation.

## Modules

| File | Responsibility |
| --- | --- |
| `engine/interaction.js` | Captured primary pointer; press → rotate or armed → grab; RAF hold age and cancellation |
| `engine/camera.js` | Projection, inverse picking ray, frozen camera-plane drag mapping |
| `engine/pull.js` | Mesh-independent barycentric attachment, smooth neighbour weights, resistant displacement and topology safety |
| `engine/dynamics.js` | Existing press/impulse and quaternion inertia, held pull targets, shared return springs |
| `engine/response.js` | Unchanged v0.2 HARD/SOFT/BOUNCY material parameters and scalar spring |
| `engine/geometry.js` | Unchanged irregular shape: 20 logical faces, 32 welded vertices, 60 GPU triangles; deformed-mesh picking |
| `debug.js` | Opt-in material and parameter UI; values shown beside sliders |
| `app.js` | Input/body composition and existing resize/visibility/BFCache/context cancellation |
| `engine/renderer.js`, `math.js`, `loop.js` | Existing shaders, lighting, quaternion/vector math and RAF |

All runtime imports, CSS/app entry points and browser fixtures use `?v=0.3.0`, checked by the version-graph regression. Some otherwise unchanged rendering/geometry files differ only in import version. A warm older graph cannot mix with v0.3. No import map, Service Worker or new asset framework.

## Gesture contract

- **Tap / ordinary hold:** seed the exact v0.2 bounded contact impulse and retain progressive pressure. A stationary hold keeps deepening even after it becomes eligible for grabbing. Release retains positions and velocities for natural return.
- **Ordinary drag:** travel at least **10 CSS px before 380 ms** commits to rotation for the rest of that pointer capture. The threshold is slightly more tolerant than v0.2's 7 px to allow finger drift. Quaternion drag equations, speed cap, inertia, stale-flick cutoff and rotational settling are retained.
- **Long press:** **380 ms** without crossing the rotation threshold arms the grab. It does not stop the pressure spring or move the shape by itself. After arming, at least **3 CSS px** from the armed position starts pulling; it can no longer turn into rotation. No timer, queued gesture or normal-mode button. Hold age advances on the existing RAF; event timestamps also handle the first move after a stationary hold without an intervening frame.
- **Grab:** bake the current settling pose, stop angular momentum, capture current offsets and keep orientation fixed. The same picked triangle/barycentrics stay attached throughout, including during earlier deformation recovery.
- **Release / interruption:** release clears grab/contact state without a position snap; the rest shape becomes the spring target. Cancel/lost capture, resize, blur, hidden/pagehide and context loss also clear pointer capture and angular/vertex velocity. Current positions recover using the same bounded spring. There is no stale projection plane or delayed grab on re-entry. A secondary pointer cannot cancel the primary one.

This is one-finger or mouse surface grabbing. The word "pinch" does not mean a two-finger scale gesture in this version.

## Screen-to-3D calculation

At grab start, interpolate the **current deformed triangle** with the picked barycentrics. Transform that attachment into world space with the frozen pose. A camera-parallel plane passes through its world Z. For a CSS-pixel delta `(dx,dy)`, use:

```
depth = camera.distance - attachmentWorld.z
worldDelta = [2*depth*tan(fov/2)*aspect*dx/width,
             -2*depth*tan(fov/2)*dy/height, 0]
localDelta = inverse(frozenPose) * worldDelta
```

Canvas offsets, CSS size and camera distance/aspect are respected. Mapping is independent of DPR; the renderer still caps DPR at 2. Right/up finger motion remains right/up on screen after arbitrary object rotation. Resize cancels the capture rather than reusing an obsolete plane. At small displacement the attachment follows this mapped delta; deliberate resistance and the safety bound make large drags fall behind the finger rather than stretch indefinitely.

## Deformation and feel

Pull weights are a spatial field over **rest vertices**, with a flat core out to 35% of the propagation radius and a cubic smoothstep falloff to zero at the radius. Normalize by the barycentric attachment weight so nearby triangles follow the grab without a special face-centre ID or separate face geometry. Shared vertices keep seams welded. Pull does not depend on the 20-face shape or its v0.2 press-compliance metadata.

Target displacement uses `maxPull * tanh(length * pullStrength / maxPull)` in the mapped direction. It is nearly linear for small motion, then resists more strongly. Captured pressure offsets are retained as the baseline, preventing a shape jump at the transition. Critically damped tracking springs follow the live target; the existing material return springs restore every vertex to its exact rest position.

A global displacement cap scales the entire field, preserving smooth neighbour relationships. A safety guard also requires each triangle's signed projected area to remain at least 18% of its rest area and each edge length between 35% and 200% of rest. Extreme input uses a bounded bisection to reduce the whole offset field. The guard covers release overshoot and repeat interactions until offsets are small. It is a compact deformation safeguard, not collision/volume-preserving physics. Arbitrary imported or degenerate meshes are not supported.

Pull release reduces the material damping ratio by at most 10%, proportional to stretch, for a small final rebound. Return stiffness/damping remain the same controls for both pressing and pulling. SOFT is the provisional normal default; actual device comfort is not certified.

| Pull parameter | Default | Debug range |
| --- | ---: | ---: |
| holdDelay (ms) | 380 | 200–700 |
| pullStrength | 1.00 | 0.50–1.50 |
| maxPull (mesh units) | 0.48 | 0.20–0.60 |
| pullRadius (mesh units) | 1.45 | 1.00–1.90 |
| pull tracking stiffness (1/s²) | 520 | fixed |
| tracking damping ratio | 1.00 | fixed |
| return stiffness (1/s²) | 185 SOFT | 100–500 |
| return damping ratio | 0.68 SOFT | 0.40–0.98 |

Higher return damping means less final shaking. Sliders cancel the current contact before changing parameters; presets retain pull settings and rotation preferences while changing the material response. The debug panel scrolls in short viewports. It adds no normal controls or separate update timer.

| v0.2 material retained | HARD | SOFT (default) | BOUNCY |
| --- | ---: | ---: | ---: |
| press depth | 0.145 | 0.205 | 0.195 |
| press radius | 0.78 | 1.08 | 0.98 |
| pressRate (1/s) | 14 | 4.8 | 6.5 |
| press stiffness | 460 | 210 | 240 |
| press damping | 0.90 | 0.95 | 0.85 |
| return stiffness | 460 | 185 | 230 |
| return damping | 0.78 | 0.68 | 0.46 |
| tap velocity impulse | 3.1 | 2.9 | 3.0 |

HARD returns quickly with less rebound; SOFT is slower and deeper; BOUNCY has a livelier release. Pull tracking is shared so comparison isolates press and release feel. Rotation damping/settling are unchanged by presets. Existing reduced-motion rotation preferences remain respected.

## Reproducible verification

```sh
node --test works/sukima-3d-lab/tests/*.test.mjs
node tests/test-work-lifecycle.cjs
node works/sukima-3d-lab/tests/render-scenes.mjs | python works/sukima-3d-lab/tests/check-gles.py /tmp/touch-v03-render
```

38/38 work tests and 18/18 existing lifecycle tests pass locally. The suite retains all v0.2 tap/press/flick/cache/fallback tests. New cases cover stationary arming with unchanged pressure, pre-hold rotation, post-hold capture, jitter, no-RAF timestamp arming, cancellation/capture loss, 600 mapping/attachment checks across 120 rotated viewport configurations, material return at 30/60/120 fps, all faces and off-centre pulls, extreme changing directions, repeated interactions, complete settling and vertex-order independence. Exact counts/results and checked PR SHA are recorded in the PR.

Optional Mesa/EGL script compiles/links the exact shipped shaders and renders rest, tap, hold, release, pull and pull release at 390×844, 844×390 and 900×900. 57 frames passed with visible pixel differences and GL error 0. These establish native GLES geometry/shader evidence; they do **not** certify browser WebGL, mobile performance or physical touch feel. Native rendering excludes UI/ground shadow.

`tests/debug-fixture.html` mounts the actual body, input and debug UI, with a labelled 2D pointer region and visible state/offset readouts. Every point in that fixture deliberately selects the centre face. It checks real browser pointer capture, gesture switching and settings, **not** 3D picking/rendering. The cloud browser has previously lacked WebGL2; main fallback and fixture observations after publishing are reported separately.

Formal verificationState remains **UNVERIFIED** under the current repository contract. iPhone/iPad Safari gestures, real mobile frame pacing and browser context restoration remain unobserved. CI/staging merge is not author adoption or production authorization.

## Device evaluation / next decisions

1. Tap rapidly and hold without moving: compare the preserved v0.2 dent/rebound.
2. Drag immediately and flick: compare ordinary rotation; wait with finger still down and move again to confirm it remains rotation.
3. Hold about 0.4 seconds, drift slightly, then pull right/up and diagonally. Check the arming delay, attachment drift and increasing resistance.
4. Rotate to several faces, then repeat pulling near the centre and an edge. Release shallow and deep pulls; check final rebound and exact recovery.
5. Compare HARD/SOFT/BOUNCY at `?debug`; adjust hold time, strength, max amount/radius and return speed/damping. Report accidental mode changes or excessive lag.
6. Rotate device during a grab, leave/return to the tab and briefly touch with a second finger. No active grab should remain.

Future tuning depends on those observations: long-press discoverability/time, screen attachment lag versus resistance, neighbour radius/strain limits on other shapes and device performance. No additional gestures/editor are implemented.

Rollback: revert this isolated PR, including only its target lifecycle title. The preceding v0.2 and cache repair remain available in Git history (#277/#278).

## Static preview correction (package 0.4.1)

Post-publication browser inspection found antialias seams between internal bending fan triangles in collection thumbnails. The preview now renders each original flat logical face as one polygon, using the same mesh corners/material/pose, with no alternate geometry asset. Native shaders/geometry/physics are unchanged. The complete module/CSS/data URL graph advances together to 0.4.1. A polygon-count regression prevents reintroducing internal preview subdivisions. `tests/viewport-fixture.html` embeds the actual app at portrait/landscape/tablet CSS sizes; it is a labelled developer QA page, not touch/device or WebGL certification. Final browser findings are recorded in the repair PR.
