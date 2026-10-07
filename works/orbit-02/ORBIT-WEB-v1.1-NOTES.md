# ORBIT Web v1.1 — landing / takeoff separation

- Keep the accepted proximity landing marker.
- Landing now commits only when crossing the close threshold at <= 120 speed.
- Faster approaches remain in flight and can reach the existing impact / bounce response.
- Original takeoff gesture and impulse remain: hold 1.0 s, outward impulse 120, re-land lock 2.0 s.
- Fix Web-only conflict: amplified Web planetary gravity is not applied during the takeoff handoff frame, because it was cancelling the source-faithful launch impulse immediately.
- Normal Web gravity resumes as soon as takeoff hands back to flight.
