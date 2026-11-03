# Final immediate rerun after local CPU cleanup

Three fresh page loads per side per fixture; first n=3, reopen n=6. Shared infrastructure variance remains. No deliberate settling delay or worker-ready gate.

|Browser|Fixture|View|First median ms before→after|First max ms before→after|Reopen median before→after|
|---|---|---|---:|---:|---:|
|chromium|empty|recipes|128.7→62.7|144.8→80.4|41.85→44.9|
|chromium|empty|history|128→60.7|178.1→61.2|43→42.95|
|chromium|rich|recipes|261.8→344.9|329.4→411|45.4→45.15|
|chromium|rich|history|190.6→109.4|345.2→212.8|44.35→45.8|
|chromium|long|recipes|465.8→340.5|742.6→611.2|45.3→45.55|
|chromium|long|history|250.4→162.8|276.7→163.3|45.45→44.65|
|chromium|legacy|recipes|379.3→206|595.6→246.4|46.2→45.5|
|chromium|legacy|history|245.9→127.2|345.8→229.6|47.05→44.9|
|webkit|empty|recipes|183→122|212→136|51.5→57.5|
|webkit|empty|history|155→86|172→123|50.5→49.5|
|webkit|rich|recipes|349→286|541→317|98.5→92.5|
|webkit|rich|history|267→225|457→381|45→41.5|
|webkit|long|recipes|451→413|493→863|41.5→50|
|webkit|long|history|315→251|397→685|42→44|
|webkit|legacy|recipes|397→305|457→323|44→41|
|webkit|legacy|history|235→219|284→220|43→43|

Earlier CPU-loaded immediate and fixed1000ms-settled figures remain in ledger-loaded-summary.json and their exact compressed traces; they are superseded for final performance assessment. Chromium rich recipes remain slower in the final immediate sample.
