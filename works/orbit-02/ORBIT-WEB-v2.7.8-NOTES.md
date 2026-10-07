# ORBIT Web v2.7.8 — E.V.E. / SYSTEM separation

Scope: presentation-only separation of E.V.E.'s voice from the cockpit SYSTEM log.

- SYSTEM console remains in the lower-left as a quiet persistent instrument.
- SYSTEM console is reduced to 62px height and keeps only status lines (`SYSTEM BOOT`, `E.V.E. ONLINE.`).
- `sayEve()` no longer appends E.V.E. dialogue into the SYSTEM history.
- E.V.E. speech is transient and appears in its own faint receive layer just above the SYSTEM console.
- E.V.E. speech has a short fade-in/out and no persistent dialogue history.
- E.V.E. speech is drawn after the HOME terminal so return lines can remain visible while connected to HOME.
- Echo memory / finale / rescue suppression rules remain intact.
- No changes to RESTORE, resource economy, landing, MiniMap, mining FX, save logic, or DATA timing.
