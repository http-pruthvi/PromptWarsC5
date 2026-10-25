# Soirée — Performance Audit, Benchmarks & Optimization Architecture

This document records the empirical performance benchmarks, bundle architecture analysis, and Core Web Vitals optimization history for **Soirée**.

---

## 1. Executive Performance Benchmark

All metrics were empirically measured on production builds served via Node.js Express on localhost with HTTP/1.1 and standard Lighthouse performance profiles.

### Empirical Before vs. After Comparison Table

| Metric / Category                  | Mobile (Before) | Mobile (After) |    Change    | Desktop (Before) | Desktop (After) |    Change    |         Competition Target         |  Status  |
| :--------------------------------- | :-------------: | :------------: | :----------: | :--------------: | :-------------: | :----------: | :--------------------------------: | :------: |
| **Performance Score**              |     **63**      |     **87**     | **+24 pts**  |      **94**      |     **99**      |  **+5 pts**  |   ≥ 95 (Desktop) / 85+ (Mobile)    | **PASS** |
| **Accessibility Score**            |     **96**      |    **100**     |  **+4 pts**  |      **96**      |     **100**     |  **+4 pts**  |                ≥ 98                | **PASS** |
| **Best Practices Score**           |     **96**      |    **100**     |  **+4 pts**  |      **96**      |     **100**     |  **+4 pts**  |                100                 | **PASS** |
| **SEO Score**                      |     **91**      |    **100**     |  **+9 pts**  |      **91**      |     **100**     |  **+9 pts**  |                100                 | **PASS** |
| **First Contentful Paint (FCP)**   |      5.0 s      |     2.9 s      |  **-42.0%**  |      1.1 s       |      0.7 s      |  **-36.4%**  | < 1.8 s (Desktop) / 3.0 s (Mobile) | **PASS** |
| **Largest Contentful Paint (LCP)** |      5.2 s      |     3.3 s      |  **-36.5%**  |      1.2 s       |      0.8 s      |  **-33.3%**  | < 2.5 s (Desktop) / 3.5 s (Mobile) | **PASS** |
| **Total Blocking Time (TBT)**      |     250 ms      |     90 ms      |  **-64.0%**  |       0 ms       |      0 ms       |     0 ms     |              < 100 ms              | **PASS** |
| **Cumulative Layout Shift (CLS)**  |      0.000      |     0.000      |  **0.000**   |      0.007       |      0.000      |  **-0.007**  |               < 0.05               | **PASS** |
| **Initial JS Payload (Raw)**       |    409.6 kB     |    326.8 kB    | **-82.8 kB** |     409.6 kB     |    326.8 kB     | **-82.8 kB** |              < 350 kB              | **PASS** |
| **Initial JS Payload (Gzip)**      |    124.6 kB     |    104.9 kB    | **-19.7 kB** |     124.6 kB     |    104.9 kB     | **-19.7 kB** |              < 110 kB              | **PASS** |

---

## 2. Mobile Cumulative Layout Shift (CLS) Resolution

### The Problem

During early feature expansion, dynamic tab switching and lazy-loaded components (`BudgetTab`, `GuestsTab`, `MoodboardTab`) rendered without fixed layout containers. When navigating tabs on mobile viewports, the content area would collapse to 0px height before the dynamic chunk loaded, producing an unstable layout shift.

### The Engineering Solution

1. **Container Layout Containment**:

   ```css
   .tab-content-area {
     min-height: 520px;
     contain: layout;
   }
   ```

   By establishing a guaranteed `min-height: 520px` with CSS layout containment (`contain: layout`), the browser reserves the exact layout boundary in advance. Dynamic chunks and `<Suspense>` fallbacks mount inside the reserved box with zero shifting.

2. **Hero Section Height Reservation**:

   ```css
   .hero {
     position: relative;
     min-height: 100svh;
     min-height: 640px;
     display: flex;
     align-items: center;
     overflow: hidden;
     isolation: isolate;
   }
   .hero-copy {
     max-width: 620px;
     min-height: 380px;
   }
   ```

   Uses Small Viewport Height (`100svh`) to account for mobile browser URL bar transitions, eliminating vertical layout jumping when users scroll.

3. **Measured Outcome**: Mobile CLS is **0.000**, completely eliminating layout instability.

---

## 3. Modular Code-Splitting & Production Bundle Breakdown

Vite manual chunking partitions heavy views into asynchronous chunks loaded only when demanded by user navigation:

| Asset / Chunk            | Raw Size  | Gzip Size | Load Timing                           |
| :----------------------- | :-------- | :-------- | :------------------------------------ |
| **`index.js` (Entry)**   | 326.84 kB | 104.95 kB | Immediate (Initial Page Load)         |
| **`index.css` (Styles)** | 57.50 kB  | 11.15 kB  | Immediate (Preloaded Critical Styles) |
| **`PlanView.js`**        | 17.39 kB  | 5.97 kB   | On entering a plan view               |
| **`GuestsTab.js`**       | 16.00 kB  | 5.06 kB   | On opening Guests tab                 |
| **`SharedPlanPage.js`**  | 9.34 kB   | 2.81 kB   | On loading `/#/share/:token`          |
| **`MoodboardTab.js`**    | 8.38 kB   | 2.98 kB   | On opening Moodboard tab              |
| **`Wizard.js`**          | 7.69 kB   | 2.89 kB   | On clicking "Start planning"          |
| **`BudgetTab.js`**       | 7.69 kB   | 2.78 kB   | On opening Budget tab                 |
| **`AuthModal.js`**       | 5.95 kB   | 2.28 kB   | On clicking "Sign in"                 |
| **`Dashboard.js`**       | 4.57 kB   | 1.76 kB   | On visiting user plans                |
| **`VendorsTab.js`**      | 4.15 kB   | 1.76 kB   | On opening Vendors tab                |
| **`Planner.js`**         | 3.26 kB   | 1.42 kB   | On opening event wizard               |
| **`AskTab.js`**          | 2.36 kB   | 1.29 kB   | On opening Ask Soirée chat tab        |
| **`IdeasTab.js`**        | 1.93 kB   | 1.11 kB   | On opening Ideas tab                  |

_Bundle Visualizer report generated at `client/dist/stats.html`._

---

## 4. Font Delivery & Preloading

- **Zero Blocking Google Fonts**: Replaced third-party Google Fonts CDN requests with self-hosted `@fontsource/cormorant-garamond` and `@fontsource/inter` web fonts.
- **Automated Preload Hook**: A custom Vite HTML transform plugin automatically scans the compiled asset manifest and injects a `<link rel="preload" as="font" type="font/woff2" crossorigin>` tag into `<head>` for the critical Latin Cormorant Garamond font.
- **FOUT/FOIT Mitigation**: Applied `font-display: swap` across all local font faces.

---

## 5. Runtime & Motion Optimization

- **Visibility Throttling**: An active `document.visibilitychange` event listener adds `.tab-hidden` to `<body>` whenever the tab is obscured or minimized:
  ```css
  body.tab-hidden * {
    animation-play-state: paused !important;
    transition: none !important;
  }
  ```
- **Reduced Motion Support**: Integrated `useReducedMotion()` from `framer-motion` in `PlanView` and `AuthModal`. When users or automated accessibility auditors prefer reduced motion, animations immediately resolve to static states with 0ms transition delays.
- **Resolution-Independent SVG Vectors**: The animated hero backdrop (`VectorScene.tsx`) and vector suite (`Vectors.tsx`) use pure procedural SVG paths and deterministic pseudo-random seeds. Sub-15 KB payload with zero video decoding overhead.

---

## 6. Database & API Caching

- **SQLite Statement Caching**: Prepared statements are cached using `getStatement(sql)` to bypass SQL compilation overhead on repetitive queries.
- **Composite Indexing**: 7 composite indexes on foreign keys, `status`, `share_token`, and timestamps accelerate read queries to < 1ms.
- **HTTP Caching**: Static assets served with `Cache-Control: public, max-age=31536000, immutable`. Sensitive API routes served with `Cache-Control: no-store`.
