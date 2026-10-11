# PUMPOKO 02 — itch.io HTML5 standalone

This is a packaging-only export for Ultimate AI-Powered Game Jam #5.
It does **not** edit game source, audio, shared Engine/Codea Lite, production or the live staging site.

## Build locally

At the repository root run:

```bash
python3 works/pumpoko-02/build-itch.py
```

Output: `dist/PUMPOKO-itch.zip`. The ZIP includes `index.html` at its root,
all 12 game JavaScript files, CSS, logo, five audio files, Codea Lite 1.0.0,
and Engine 0.3.0. Only the exported `index.html` changes: two relative script
references become local and the browser tab title drops "02".

The GitHub Actions workflow **PUMPOKO 02 Itch Export** validates this package
and uploads a ready-to-upload `PUMPOKO-itch` artifact; its downloaded ZIP
contains the HTML5 files directly at archive root. Do not upload the source
repository ZIP or `works/pumpoko-02` alone to itch.io.

## Manual release checklist

1. Download the `PUMPOKO-itch` Actions artifact and verify `index.html`
   is at archive root.
2. On itch.io choose **HTML** as project kind, upload the artifact ZIP and mark
   the uploaded archive as **This file will be played in the browser**.
3. Test desktop keyboard and mobile touch, landscape/portrait, game start,
   all four handoffs, falling/retry, stage 5 goal, ending/title replay,
   BGM and effects (including mute and background return).
4. Verify source music/art licensing and credits independently before public
   release; this exporter cannot establish rights.
5. Configure itch.io page as PUMPOKO; publish/submit only after owner approval.

Actual itch.io embed and device behavior are **UNVERIFIED** until tested.
