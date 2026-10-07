# ORBIT Web v1.2

- Takeoff keeps the accepted one-second hold ritual.
- Source value `TAKEOFF_IMPULSE = 120` is retained only as historical reference.
- Release now enters a Web-specific 0.28 s launch phase at speed 300.
- During launch: no planetary gravity, no normal damping, no landing capture.
- After launch phase, control returns to the accepted DRIFT flight physics.
- Two-second re-land lock remains.
- Landing / high-speed bounce logic from v1.1 is unchanged.
