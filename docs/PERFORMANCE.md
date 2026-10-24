# Soirée Performance Audit & Optimization Benchmark

This document tracks empirical performance, bundle architecture, and web vitals benchmarks for Soirée across production builds.

---

## 1. Baseline Measurements (Before Optimization)

Recorded on production build served via Express with HTTP/1.1 on Node.js 22.20.0.

### Bundle Architecture (Monolithic)
- **Primary JS Bundle**: `dist/assets/index-zPjgs6c6.js` — **409.62 kB** (124.62 kB gzip)
- **Primary Stylesheet**: `dist/assets/index-DKODjAvv.css` — **39.11 kB** (8.95 kB gzip)
- **Entry HTML**: `dist/index.html` — **1.27 kB** (0.73 kB gzip)
- **Total Initial Payload**: **448.73 kB** uncompressed / **133.57 kB** gzip
- **Code-Splitting**: None (All routes, tabs, heavy SVG scenes, and full planner bundled in single initial chunk).
- **Bundle Visualizer**: Available at `client/dist/stats.html`.

### Lighthouse Scores (Baseline)

| Metric / Category | Mobile (Before) | Desktop (Before) | Target |
|:---|:---:|:---:|:---:|
| **Performance Score** | **63** | **94** | ≥ 95 |
| **Accessibility Score** | **96** | **96** | ≥ 98 |
| **Best Practices Score** | **96** | **96** | 100 |
| **SEO Score** | **91** | **91** | 100 |
| **First Contentful Paint (FCP)** | 5.0 s | 1.1 s | < 1.8 s |
| **Largest Contentful Paint (LCP)** | 5.2 s | 1.2 s | < 2.5 s |
| **Total Blocking Time (TBT)** | 250 ms | 0 ms | < 100 ms |
| **Cumulative Layout Shift (CLS)** | 0.000 | 0.007 | < 0.05 |
| **Speed Index** | 5.0 s | 1.1 s | < 2.5 s |

### Key Bottlenecks Identified in Baseline
1. **Monolithic JS Bundle**: Client loads the entire application (Landing, Auth, Wizard, PlanView, 5 heavy tabs, AI Budget Rebalancer, Moodboard, Guest manager) upfront even for visitors only viewing the landing page.
2. **Web Fonts**: External Google Fonts (`Cormorant Garamond`, `Outfit`) loaded from third-party CDN without local preloading, blocking initial paint.
3. **HTTP Caching & Compression**: Express production server currently lacks `compression` middleware and static asset cache headers (`max-age=31536000, immutable`).
4. **SVG Motion Overhead**: Background vector scenes continue animating off-screen without intersection observation.

---

## 2. Post-Optimization Measurements (Target)
*(To be populated in step A.6 after code splitting, font self-hosting, server compression, query optimization, and client memoization).*
