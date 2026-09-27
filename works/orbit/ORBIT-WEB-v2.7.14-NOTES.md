# ORBIT Web v2.7.14 Notes

- Fuel-out visual changed to a CRT power-loss sequence.
- The live picture closes vertically to a thin horizontal line, the line dies into full black, then HOME fades back slowly.
- The old `FUEL LOST / RETURN HOME` E.V.E. speech at the instant of failure was removed; the visual itself carries the event.
- E.V.E.'s normal HOME return line now waits until the fade-back has completed.
- Rescue/checkpoint semantics remain the same: physical expedition state rolls back, decoded DATA/Echo knowledge is retained and saved.
- No changes to RESTORE, MiniMap, resources, planet rules, or landing controls.
