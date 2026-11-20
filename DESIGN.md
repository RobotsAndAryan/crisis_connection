# Crisis Connection — Design System (`DESIGN.md`)

## Surface Mode & Intent
- **Mode:** **Operate** (humanitarian dispatch, field triage, peer mesh telemetry, and cloud reconciliation workbench).
- **Use Scene:** Disaster response field tablets, laptops, and mobile handsets operating in low light, smoke, stress, and intermittent or zero signal.
- **Character:** `taut, legible, field-rugged`.
- **Visual World:** Topographic SAR field maps, handheld emergency radio transceivers, and ambulance medical dispatch boards.

## Color Tokens (Matte Mineral Graphite Ramp)
All UI surfaces and borders come from a single matte mineral graphite ramp (`<3%` saturation, zero navy/slate wash, zero violet/cyan glow):

| Token | Value | Role | WCAG Contrast |
| --- | --- | --- | --- |
| `recessed` | `#0c0d0c` | Deepest wells, map canvas, form inputs, recessed tables | — |
| `canvas` | `#111211` | Primary page background | — |
| `surface` | `#171817` | Top bar, cards, modals, drawers | — |
| `raised` | `#202120` | Active rows, secondary buttons, status chips | — |
| `raised-hover` | `#282a28` | Hover step on raised controls | — |
| `ink-primary` | `#ededeb` | Primary copy, headings, off-white primary buttons | `16.02:1` on canvas / `15.19:1` on surface |
| `ink-secondary` | `#a5a7a4` | Supporting labels, descriptions, inactive tabs | `7.35:1` on surface |
| `ink-muted` | `#828581` | Timestamps, units, secondary icons, metadata | `4.77:1` on surface / `5.21:1` on recessed |
| `accent` | `#4ea1f3` | Active tab indicator, focus ring, unit position, selection | `6.54:1` on surface |
| `safe` | `#4cc38a` | Operational camps, safest route, on-device ready | `8.04:1` on surface |
| `caution` | `#e2a43b` | Offline blackout state, overcrowding, moderate uncertainty | `8.15:1` on surface |
| `hazard` | `#e5484d` | Hazard exclusion zones, risky shortcuts, destroyed camps | `4.55:1` on surface |

- **Hairlines:** `rgba(237, 237, 235, 0.09)` for resting dividers and panels; `rgba(237, 237, 235, 0.18)` for interactive control boundaries.
- **Operating-State Grounding:** Entering `Field offline` tints the top command bar's bottom boundary with `caution` and displays an explicit offline lock indicator so zero-signal state is unmistakable.

## Typography
- **Interface family:** `IBM Plex Sans` (`400`, `500`, `600`).
- **Data / code family:** `IBM Plex Mono` (`400`, `500`) — strictly for camp callsigns (`CAMP-02`), coordinates (`34.07°N`), Lamport versions (`v14`), checksums, and telemetry figures.
- **Rules:** Sentence case everywhere; `tabular-nums` on all figures; weights capped at `600`; minimum `12px` UI copy (`11px` dense metadata only); `16px` inputs on mobile (`text-base sm:text-xs`) to prevent iOS Safari zoom.

## Layout, Spacing & Nested Radii
- **Grid:** Strict `4px` spacing rhythm (`p-4`, `gap-4`, `h-8` desktop header controls, `h-9` desktop inputs/buttons, `h-10` mobile touch targets).
- **Nested Radius Ladder:** `12px` (`rounded-xl`) outer panels → `8px` (`rounded-lg`) inner blocks & controls → `6px` (`rounded-md`) compact buttons/inputs → `4px` (`rounded`) tags & keycaps.
- **Chrome Budget:** One 56px top command bar + one 36px inline closed-loop stage strip + optional single-line alert bar so the Sector Meridian topographic map fills the desktop viewport above the fold.

## Signature & Moments
1. **Sector Meridian Topographic Map (`TacticalMapView`):** UTM border ticks, elevation relief contours, 45° hatched hazard exclusion polygons, offset road distance knockouts, corner targeting brackets on the optimal camp, and collision-free label anchors.
2. **Uncertainty Calibration Meter (`UncertaintyMeter`):** 10-tick hairline gauge paired with tabular percentages across camp inspection, sector lists, Lamport vectors, CCTV readings, and audit logs.
3. **Depletion History Trace:** Selected Camp Inspector surfaces real 6-hour bed change deltas and onset notes directly from `camp.history`.
4. **Cloud Ward CCTV Monitor & Conflict Diff (`CloudCommandView`):** Matte IR-optical cot schematic paired with structured prior-to-resolved reconciliation diffs.

## Interaction, Accessibility & Hardening Standards
- **Icons:** All icons import strictly through `src/components/icons.tsx` (`strokeWidth={1.5}` default) plus flat geometric `CrisisMark`.
- **Keyboard:** `1`–`4` switches workspace tabs (when not focused in an input); `Esc` closes modals/drawers or cancels `Drop hazard`; SVG camp nodes are keyboard-focusable buttons (`Enter`/`Space`).
- **Error Prevention & Recovery:** Destructive `Report camp destroyed` requires inline two-step confirmation AND provides a 10-second `Undo` recovery action in the live status toast.
- **Motion:** Single easing curve `cubic-bezier(0.23, 1, 0.32, 1)`, named color/transform transitions only, `prefers-reduced-motion` preserves state color/opacity feedback while disabling scale and spin movement.
