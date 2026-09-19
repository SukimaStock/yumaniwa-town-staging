# ORBIT Web v1.9 — Echo Story

## Story-first pass
- Echo discovery order now opens a fixed 01–12 narrative sequence regardless of which SERA planets are found first.
- The planet ID remains responsible only for uniqueness; the story index is the discovery count.
- Each Echo is shown as a brief memory fragment, then present-day E.V.E. reacts after the fragment fades.
- E.V.E. reaction language still follows BASE Lv1–5, grouped into five emotional bands rather than 60 bespoke lines.

## Echo sequence
01 VOICE / 02 RETURN / 03 ROUTINE / 04 SILENCE / 05 LAUGH / 06 DEPART /
07 WAIT / 08 WORRY / 09 NAME / 10 PROMISE / 11 KEEP / 12 ECHO.

## Final connection
- Trigger: ECHO 12/12 + BASE Lv5 while at BASE.
- If Echoes are completed first, the sequence begins after the Lv5 repair line has had time to play.
- If BASE is already Lv5, the sequence begins on the next return with 12/12.
- The sequence reveals only the core: E.V.E. = Echo of Vital Emotion; during the accident E.V.E. held the part of the pilot that was being lost.
- The original closing phrase is retained: 「あなたの心は / また 動き出した。」
- No GAME CLEAR / ending screen is shown. Normal play resumes at BASE.
- The first takeoff after the sequence gets one line: 「……いってらっしゃい。」

## Mechanical consequence found by story-first design
DATA has a 10-unit cargo cap. After BASE restoration, DATA may have no sink, which previously could prevent any further DATA harvest and therefore stop Echo discovery before 12/12. v1.9 separates Echo analysis from DATA cargo capacity: a unique SERA can reveal its Echo after the normal analysis tick even when DATA storage is full.

## Unchanged
- Accepted Web drift physics.
- Landing assist / high-speed bounce arbitration.
- Launch ritual and launch speed 330.
- BASE repair costs and Lv1–5 visual restoration.
- Deterministic sector atlas density and resource planet generation.
