# ORBIT Web v1.3

Landing forgiveness pass.

- Keeps v1.2 launch behavior unchanged.
- Keeps high-speed collision / bounce behavior unchanged.
- Landing no longer requires a precise threshold crossing.
- Near the planet, only an intentional inward approach receives a light assist.
- Assist begins inside 132 logical px, only at <=180 speed and with inward motion making up at least 20% of travel direction.
- Assist gently steers/brakes toward ~72 speed.
- Landing begins once the intentional approach reaches the visible marker radius (104).
- Tangential fly-bys are not captured.
