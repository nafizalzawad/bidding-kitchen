# Bidding Kitchen — Visual QA & Layout Invariant Protocol

## 1. Scope & Objective

The Visual QA Protocol defines the automated screenshot capture and layout invariant testing procedures for Bidding Kitchen. It guarantees that every screen state renders legibly, accessibly, and without visual regressions across all target viewports.

---

## 2. Target Viewports

| Identifier | Dimensions (WxH) | Device Archetype | Touch Target Baseline |
| :--- | :--- | :--- | :--- |
| **`mobile-sm`** | `360 x 640` | Entry-level Android (e.g. Galaxy A03, Moto G) | 44px x 44px |
| **`mobile-md`** | `390 x 844` | Modern flagship mobile (iPhone 12/13/14/15) | 44px x 44px |
| **`tablet`** | `768 x 1024` | Tablet portrait (iPad Mini, iPad 10.2) | 44px x 44px |
| **`desktop`** | `1280 x 800` | Widescreen laptop / desktop browser | 44px x 44px |

---

## 3. Deterministic Screenshot Naming Convention

All screenshots are stored under `docs/visual-qa/screenshots/phase-{N}/` using the format:
```text
{screen-state}-{viewport}.png
```

Phase 1 captures:
1. `contract-diagnostic-mobile-sm.png` (360x640)
2. `contract-diagnostic-mobile-md.png` (390x844)
3. `contract-diagnostic-tablet.png` (768x1024)
4. `contract-diagnostic-desktop.png` (1280x800)

---

## 4. Automated Layout Invariant Assertions

Alongside visual capture, Playwright evaluates DOM geometry invariants in every viewport:
1. **Zero Horizontal Overflow**: `document.documentElement.scrollWidth <= window.innerWidth`.
2. **Touch Target Size**: All interactive elements (`button`, `a`, `[role="button"]`) have bounding box `width >= 44px` and `height >= 44px`.
3. **Font Rendering Readiness**: Screenshot capture occurs only after `await page.evaluate(() => document.fonts.ready)` resolves.
4. **Non-Empty Capture**: Every screenshot file must exceed 10 KB (`stat.size > 10_000`).

---

## 5. Defect Severity Definitions

- **P0 (Blocker)**: Unreadable text, overlapping interactive controls, horizontal page overflow, crashed UI, or missing contract data. Must be fixed before phase sign-off.
- **P1 (Major)**: Incorrect design token color, interactive touch target < 44px, clipped badge/text, or contrast ratio < 4.5:1.
- **P2 (Minor)**: Minor visual spacing imbalance (2-4px off specification) that does not impair touch usability or readability.
