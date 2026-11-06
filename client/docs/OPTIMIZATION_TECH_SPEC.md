# Client Optimization Tech Spec

Scope: `client/src` (React 19 + Vite + TypeScript, feature-sliced). Reviewed all 44 source files (~5,100 LOC). Issues are grouped by theme, each with file:line pointers, the problem, and the fix. Severity is relative to this app's scale (small device dashboard), not absolute.

---

## 1. No data-fetching cache/dedup layer — the biggest systemic issue

Every hook (`useDevices`, `useRooms`, `useIntegrations`, `usePowerState`, `useMeasurements`) fetches independently per mount, with zero sharing between components. There is no request cache (no React Query/SWR/context), so the same resource is fetched and polled redundantly whenever multiple components that need it are mounted simultaneously.

Concretely, `usePowerState(uid)` (`src/shared/hooks/usePowerState.ts:8-59`) opens its **own** `setInterval` (60s) and its **own** `fetch` per call site. On the devices page this hook is invoked independently in up to three places for the same device:
- `src/features/Header/Header.tsx:22` — hardcoded `usePowerState('tuya-plug-01')`, always mounted (lives for the whole app session).
- `src/features/Devices/SmartPlug/Card.tsx:26` — once per smart-plug card in the sidebar list.
- `src/features/Devices/SmartPlug/Page.tsx:51-54` — again for the selected device's detail page.
- `src/features/Settings/Devices/DeviceStatus.tsx:18-19` — again per device row in Settings.

Result: visiting `/devices?uid=tuya-plug-01` while the header is mounted runs **3 independent polling loops** (3 live `setInterval` timers + 3 periodic `fetch` calls every 60s) for the exact same `GET /api/devices/:uid/power` response. This scales with the number of smart-plug cards rendered, and every extra mounted component adds a persistent timer that must be torn down correctly (it is, via cleanup — but the redundant network/CPU cost remains for the lifetime of the mount).

Same shape of duplication for rooms/devices: `src/pages/room/RoomPage.tsx:17-52` re-fetches `getRooms()` + `getDevices()` from scratch on every room navigation instead of reusing `useRooms`/`useDevices` (which `Header.tsx` and `HomePage.tsx` already call) — so navigating to a room re-downloads the full device/room list that's already sitting in memory one component up.

**Fix:** introduce a small shared cache (even a minimal in-memory `Map` + subscriber keyed by resource key, or adopt `@tanstack/react-query` / SWR which are built for exactly this). At minimum, hoist device/room lists into a context provider populated once near `App`, and have `usePowerState` dedupe concurrent subscribers to the same `uid` behind a single interval/fetch.

---

## 2. Redundant work inside loops (the "redundant loops" ask)

### 2.1 Loop-invariant `new Date(...)` constructed per iteration
`src/features/Devices/SmartPlug/powerUtils.ts:96-103` — `getPowerStatistics`:
```ts
const outages = history.periods.filter(
  (period) =>
    period.status === 'offline' &&
    new Date(period.startedAt).getTime() >=
      new Date(history.from).getTime() &&
    new Date(period.startedAt).getTime() <
      new Date(history.to).getTime(),
).length;
```
`history.from` and `history.to` are the same for every element, yet `new Date(history.from)` / `new Date(history.to)` are constructed **twice each, on every iteration** of the filter callback (4 `Date` allocations × N periods, when it should be 2 total). `new Date(period.startedAt).getTime()` is also computed twice per period (once for each comparison) instead of once.

**Fix:**
```ts
const fromMs = new Date(history.from).getTime();
const toMs = new Date(history.to).getTime();
const outages = history.periods.filter((period) => {
  if (period.status !== 'offline') return false;
  const startedAtMs = new Date(period.startedAt).getTime();
  return startedAtMs >= fromMs && startedAtMs < toMs;
}).length;
```

### 2.2 Same array filtered twice for the same predicate
`src/features/Devices/SmartPlug/Page.tsx:285-296`:
```tsx
{history.periods.filter((period) => period.status === 'offline').length === 0 ? (
  ...
) : (
  <div className={styles.eventList}>
    {history.periods
      .filter((period) => period.status === 'offline')
      .slice()
      .reverse()
      .map((period) => ( ... ))}
```
`history.periods` is filtered by `status === 'offline'` twice — once just to check `.length === 0`, then again to actually render. Compute once above the JSX:
```ts
const outagePeriods = history.periods.filter((p) => p.status === 'offline');
```
and reuse `outagePeriods.length` / `outagePeriods.slice().reverse()`.

Within that same `.map` (`Page.tsx:297-321`), each row recomputes `new Date(history.to).getTime()` and `new Date(history.from).getTime()` — both loop-invariant across all rows — plus calls `new Date(period.endedAt ?? history.to)` / `new Date(period.startedAt)` without caching. Hoist `fromMs`/`toMs` once above the `.map`.

### 2.3 `getPowerTimeline` recomputed redundantly across components/renders
`src/features/Devices/SmartPlug/powerUtils.ts:15-75` (`getPowerTimeline`, O(n log n) sort + full array rebuild) is invoked from **three separate places** for the same `history` object:
1. `SmartPlugPage.tsx:109-111` — `getPowerStatistics(history)` (not memoized — reruns on *every* render of the page, including re-renders triggered by unrelated state like the 60s `usePowerState` poll tick).
2. `PowerChart.tsx:62-65` — `useMemo(() => getPowerTimeline(history), [history])` (correctly memoized, timeline mode).
3. `PowerChart.tsx:158` — `getPowerStatistics(history)` called again for distribution mode, **not memoized**, so it reruns the full sort+rebuild on every render, duplicating #1's work a third time for the same data.

**Fix:** wrap `getPowerStatistics(history)` in `useMemo(() => getPowerStatistics(history), [history])` at the single call site in `SmartPlugPage.tsx`, then pass the already-computed `stats` down to `PowerChart` as a prop instead of having `PowerChart` recompute it internally for `mode="distribution"`. This collapses 3 redundant computations of the same timeline into 1 per `history` change.

### 2.4 Per-call object literal allocated inside a frequently-called function
`src/features/Integrations/Ukrhmc/helpers.ts:57-75` (`getWeatherIcon`) allocates a brand-new 15-entry `iconMap` object on **every call**. It's called once for "current" conditions and once per forecast day — in `Card.tsx:20,68` that's 4 calls per render (1 current + 3 forecast slice), and in `Page.tsx:90,155` it's `1 + forecast.length` calls per render. None of the map's contents ever change.

**Fix:** hoist `iconMap` to module scope (a `const ICON_MAP = {...}` outside the function), so it's built once per module load instead of once per call.

---

## 3. Unmemoized chart config objects (re-render cost)

`src/features/Devices/SmartPlug/PowerChart.tsx` memoizes `timeline` and `data` (`useMemo`, lines 62-82) but **not** `options` (line 88) or `distributionOptions` (line 178) — both are plain `const` reassigned on every render, including nested tooltip callback closures that capture `timeline`. Since `<Bar data={...} options={...}>` (react-chartjs-2) treats a new `options` reference as a config change, this forces Chart.js to re-process scale/tooltip config on every parent re-render (e.g., every 60s poll tick from `usePowerState` in the same page), not just when `history`/`mode` actually change.

**Fix:** wrap both `options` and `distributionOptions` in `useMemo` keyed on the values they actually depend on (`fromMs`, `toMs`, `days`, `timeline` / `stats`).

Same pattern, smaller scale, in `src/features/Devices/THHome/Page.tsx` — `MetricChart`'s `data` (line 78) and `options` (line 108) are recreated every render with no memoization. `options` in particular is static-ish (depends only on `label`/`unit`), so it's always a fresh object even when neither prop changed.

---

## 4. Inconsistent / missing request cancellation

`src/shared/api/measurements.ts:46-48` and `src/shared/api/analytics.ts:61-63` call `fetch()` directly instead of going through `apiFetch`/`apiRequest` (`src/shared/api/client.ts`). Consequences:
- They don't accept an `AbortSignal` at all, so callers can't cancel the underlying network request.
- `src/shared/hooks/useMeasurements.ts:13-52` and `src/features/Devices/THHome/Page.tsx:213-250` (`loadAnalytics`) both use a boolean `cancelled` flag to guard `setState` after unmount/dep-change, but the **fetch itself keeps running** to completion — rapidly switching the analytics range (`THHomePage`'s range buttons, `Page.tsx:359-376`) fires a new request on every click while prior in-flight requests are neither aborted nor ignored at the network layer, just discarded after the JSON parses. Under a flaky/slow network this can pile up several in-flight requests.
- They duplicate `client.ts`'s error-handling logic with a slightly different (lower-fidelity) error message shape instead of reusing `apiRequest`.

**Fix:** route both through `apiFetch`, add a `signal` param, and pass `controller.signal` from the calling hooks/effects (mirroring the existing pattern in `usePowerState.ts` / `useDevices.ts`).

`src/pages/room/RoomPage.tsx:17-52` has no cancellation at all — not even a `cancelled` flag. `getRooms()` / `getDevices()` are called with no signal, and there's no guard before the two `setRoom`/`setDevices` calls. Switching rooms quickly (e.g., via fast back/forward nav) can let a stale, slower response overwrite a newer one — a correctness race, not just wasted work. Add an `AbortController` + signal, matching the pattern already used in `useDevices.ts`/`useRooms.ts` (and ideally just reuse those hooks instead of re-implementing the fetch — see §1).

---

## 5. Smaller redundant allocations per render

These are low-impact individually but are easy, mechanical wins:

- `src/features/Header/Header.tsx:29-43` — `mobileNavList` (array of 3 objects, one with a JSX icon element) is rebuilt every render of `Header`, which itself re-renders every 60s on the `usePowerState` poll tick (§1). Hoist static entries or wrap in `useMemo`.
- `src/features/Integrations/Integrations.tsx:12-17` — `integrationOrder` array literal and the `[...integrations].sort(...)` copy are recreated every render even though the component is wrapped in `memo` (sort only matters when `integrations` itself changes). Wrap the sorted list in `useMemo(() => [...integrations].sort(...), [integrations])`; hoist `integrationOrder` to module scope.
- `src/features/Integrations/Yasno/Card.tsx:16-41` — `statusList` (4 objects) is rebuilt on every render, and `getDescription(nextShutdownTime, nextRestoreTime)` is called twice unconditionally (once for the `ScheduleApplies` entry, once for `PossibleShutdowns`) even though only one of the 4 entries is ever used (`statusDetails = statusList.find(...)`). Only compute the description for the matched status.
- `src/features/Plan/Plan.tsx:11-17` — `roomHoverHandlers(room)` and `roomClassName(room)` allocate new closures/strings for all 7 rooms on every render of `Plan`, which re-renders on every `onRoomHover` call (i.e. on every pointer enter/leave while the user moves the mouse across the floor plan). Not urgent given the tiny fixed room count, but if hover-driven re-renders feel janky, memoize with `useCallback`/a lookup table keyed by room id.
- `src/features/Card/Card.tsx:25-31` — `cardClassName` array+`filter`+`join` is cheap but runs on every render of every card in a list; fine as-is, noted only because `Card` is rendered in hot lists (room sidebar, device sidebar).

---

## 6. Correctness note found in passing (not optimization, but worth flagging)

`src/features/Plan/Plan.tsx:27-358` — the SVG contains many `// comment` lines placed directly as JSX children (not wrapped in `{/* */}` or `{}`), e.g. lines 28-30, 47, 62, 79, 96, 111, 126, 141-143, 162-164, 178, 187, 196, 208, 220, 233-235, 251, 263-265, 273, 279, 286-289. In JSX, bare `//` text outside of `{}` is **not** a comment — it is literal text content. React will attempt to render these as text nodes inside an `<svg>`, which is invalid SVG content (text nodes aren't valid children of most SVG container elements without a `<text>` wrapper) and adds dozens of extra, pointless text nodes to the DOM tree on every mount of `Plan`. Should be converted to `{/* ... */}` JSX comments so they're stripped at compile time and add zero DOM nodes.

---

## Priority summary

| # | Issue | File(s) | Impact |
|---|---|---|---|
| 1 | No fetch cache/dedup — duplicate polling loops & network calls | `usePowerState.ts`, `Header.tsx`, `SmartPlug/Card.tsx`, `SmartPlug/Page.tsx`, `DeviceStatus.tsx`, `RoomPage.tsx` | High — recurring network/CPU cost, scales with mounted components |
| 2.1–2.3 | Redundant/loop-invariant recomputation | `powerUtils.ts`, `SmartPlug/Page.tsx` | Medium — O(n) waste repeated on every render/poll tick |
| 3 | Unmemoized Chart.js config objects | `PowerChart.tsx`, `THHome/Page.tsx` | Medium — unnecessary chart reprocessing every re-render |
| 4 | Missing abort signals / raw `fetch` bypassing client | `measurements.ts`, `analytics.ts`, `RoomPage.tsx` | Medium — wasted in-flight requests, one real race condition |
| 2.4, 5 | Per-call/per-render object/array allocations | `helpers.ts`, `Header.tsx`, `Integrations.tsx`, `Yasno/Card.tsx`, `Plan.tsx` | Low — GC churn, mostly mechanical fixes |
| 6 | Invalid JSX comments rendered as SVG text nodes | `Plan.tsx` | Low (correctness, not perf) but free to fix |
