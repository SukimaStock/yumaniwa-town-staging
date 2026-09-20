# Yumaniwa Analytics v2

Start date: 2026-09-20

## Purpose

Use a small, consistent set of Plausible events to improve works even when users do not leave comments.

The basic funnel is:

`Work Open: <work-id>` -> core action -> completion (when the work has a completion state)

Pageviews are not used to compare work popularity because embedded works have different internal pageview behavior.

## Environment rule

- Production: send events to Plausible.
- `/yumaniwa-town-staging/`: do not send events to Plausible; log them to the browser console.
- Embedded SukimaStock Engine works use the town tracker when `__YUMANIWA_ANALYTICS_READY__` is ready.
- A work may fall back to its own existing Plausible tracker when opened outside the town shell.

## Town events

The town analytics layer is the source of truth for entry/exit events.

- `Work Open: <work-id>`
- `Work Close: <work-id>`
- `Share: <work-id>`
- `Venue Open: <venue>`
- `Map Open`
- `Feedback Open`

## Work events

### CoffeeFactory

- `Coffee Brew Start`
  - `method`
  - `cups`
- `Coffee Brew Complete`
  - `method`
  - `cups`
- `Coffee Again`
  - `method`
  - `cups`

### Diorama Calendar

- `Diorama Month Change`
  - `direction`
  - `month`
- `Diorama Parallax Used`
  - `method=sensor|drag`
  - sent once per method per page load

### DotWeather

Interactive user actions remain interactive:

- `Refresh`
- `City Add`
- `City Remove`
- `Unit Change`
- `Ambient Mode Open`
- `View Mode Change`

Automatic technical events are non-interactive so they do not affect bounce calculations:

- `Weather Load Success`
- `Weather Load Error`

### Rainy Window

- `Rainy Window Interaction`
  - `method=touch`
  - sent once per page load

### SteamClock

No additional core-action event for now. Use `Work Open: steamclock` as the primary signal.

## Not included in this pass

- ORBIT: keep analytics disabled until publication integration.
- itch.io games: town entry/exit is measured by Yumaniwa; internal game analytics stay in each uploaded build.
- No user IDs, custom session IDs, heatmaps, per-button logging, or external database.

## Plausible event options

Meaningful user actions use Plausible's default interactive behavior.

Automatic diagnostics use:

```js
plausible("Event Name", { props: {...}, interactive: false });
```

This keeps technical events visible without turning them into engagement signals.
