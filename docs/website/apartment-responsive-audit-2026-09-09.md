# Apartment responsive audit — 2026-09-09

## Follow-up: automatic scroll tour and design review

- Removed the manual start gate. A current video loading after the visitor reaches the tour now activates scroll playback automatically.
- Preview height is capped at 620px; active scroll playback occupies the viewport.
- Reduced the scroll section from one viewport per scene to 0.4 per scene, with a five-viewport total cap. The 36-67 page now uses 4.2 total viewports instead of nine.
- Astra medium reviewed and corrected apartment hero, details, contact band and related-card typography, line heights and spacing. Area typography is relative to its column; generic numbered features are replaced by a semantic list.
- Verified automatic activation and scene advancement in the production preview on port 4325 using page scrolling without clicking Start. Added a late-loading regression test; the suite now has 32 tests.

## Implemented

- Apartment hero spacing clears the shared fixed header; narrower titles have readable line height and smaller mobile type.
- Tour controls are visible, touch targets are at least 44px, and the characteristics link no longer overlaps room navigation.
- Short viewports use ordinary playback with controls below the image instead of an extended scroll section.
- Only the current scene can unlock the tour. Navigation to characteristics suppresses automatic tour activation, preventing a moving anchor target.
- Opening a plan pauses playback; closing restores focus. The details section now includes an enlargement button.
- Plan images retain their intrinsic proportions instead of keeping a 750px height on narrow screens.
- All interface icons use the shared Lucide component. Architectural SVG artwork remains artwork.
- Home animations rebuild at responsive breakpoints, animate complete library SVGs, clean up dialog animations and cancel stale project transitions. Reduced motion is respected.

## Validation

Production preview at port 4325, Chrome viewport emulation:

| Requested viewport | Apartment | Checks |
| --- | --- | --- |
| 320 × 740 | 39-87 | Hero, tour, control overlap and overflow |
| 390 × 844 | 79-79 | Content overflow, room navigation, contact dialog |
| 768 × 1024 | 36-67 | Layout and plan dialog |
| 844 × 390 | 36-67 | Short-screen playback and normal-flow controls |
| 1024 × 768 | 39-87 | Typography, columns, plan sizing |
| 1440 × 900 | 79-79 | Desktop hero and overflow |
| 1920 × 1080 | 36-67 | Wide layout and characteristics navigation |

Browser zoom was approximately 110%, so CSS viewport widths were about 291, 355, 698, 767, 931, 1309 and 1745px respectively. No document-level horizontal overflow was observed; room navigation intentionally scrolls horizontally. Viewport emulation was reset afterwards.

`bun run check`: no errors or warnings. `bun run test`: 31 tests passed, including three new tour regressions and two home-motion regressions. `bun run build` and `bun run --cwd website test:build`: passed for all five pages.

This is browser emulation, not physical-device testing. Native iOS/Android playback, software keyboards and browser-specific fullscreen behavior were not verified. Home agent confirmed page and form loading; its further visual smoke was interrupted by Chrome extension UI. Home animation fixes also have automated regression coverage.
