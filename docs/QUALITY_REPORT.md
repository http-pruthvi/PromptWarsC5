# Soirée — Quality, Testing, Accessibility & Security Evidence Report

This document compiles the empirical, measured verification results for **Soirée** across Code Quality, Testing, Accessibility, and Security. Every claim in this report has been directly measured and verified.

---

## Executive Summary

| Category          | Primary Metric                  | Target / Standard                                                             | Measured Result                                                      | Status                  |
| :---------------- | :------------------------------ | :---------------------------------------------------------------------------- | :------------------------------------------------------------------- | :---------------------- |
| **Code Quality**  | ESLint Errors & Warnings        | 0 errors, 0 warnings                                                          | **0 errors, 0 warnings**                                             | :white_check_mark: PASS |
| **Code Quality**  | TypeScript Strict Compilation   | 0 errors (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | **0 errors across all 3 workspaces**                                 | :white_check_mark: PASS |
| **Code Quality**  | File Length & Function Size     | Files ≤ 250 lines, Functions ≤ 40 lines, Complexity ≤ 10                      | **0 files > 250 lines, 0 functions > 40 lines, max complexity ≤ 10** | :white_check_mark: PASS |
| **Testing**       | Server Test Coverage            | > 95% Lines, > 90% Branches                                                   | **99.71% Lines, 95.69% Branches, 100% Functions**                    | :white_check_mark: PASS |
| **Testing**       | Client Test Coverage            | > 90% Lines, > 80% Branches                                                   | **95.94% Lines, 85.85% Branches, 94.64% Functions**                  | :white_check_mark: PASS |
| **Testing**       | Property-Based Testing          | Invariants verified across randomized inputs                                  | **100 property iterations passed (fast-check)**                      | :white_check_mark: PASS |
| **Testing**       | End-to-End Smoke Test           | Complete celebration lifecycle in browser                                     | **100% Passing (Playwright Chromium)**                               | :white_check_mark: PASS |
| **Accessibility** | Axe-Core Automated Audits       | 0 WCAG violations on all views                                                | **0 violations across all 10 critical views**                        | :white_check_mark: PASS |
| **Accessibility** | Google Lighthouse Accessibility | Desktop & Mobile score ≥ 95                                                   | **100 / 100 Desktop, 100 / 100 Mobile**                              | :white_check_mark: PASS |
| **Accessibility** | WCAG 2.2.2 Pause Animation      | Motion pause control with persistence                                         | **Implemented & verified in UI and CSS**                             | :white_check_mark: PASS |
| **Accessibility** | 320px Reflow & 200% Zoom        | No horizontal scroll or text truncation                                       | **Verified (scrollWidth <= clientWidth)**                            | :white_check_mark: PASS |
| **Security**      | `npm audit --omit=dev`          | 0 high or critical vulnerabilities                                            | **0 vulnerabilities (0 high, 0 critical)**                           | :white_check_mark: PASS |
| **Security**      | HTTP Security Headers           | Helmet CSP, COOP, CORP, Permissions-Policy                                    | **Active & verified via automated tests**                            | :white_check_mark: PASS |
| **Security**      | Timing Attack Prevention        | Constant-time auth verification                                               | **Implemented via simulated bcrypt dummy hash**                      | :white_check_mark: PASS |
| **Security**      | Session Cookie Security         | HttpOnly, SameSite, Secure, Sliding Expiry                                    | **Active & verified on all auth endpoints**                          | :white_check_mark: PASS |
| **Security**      | RFC 9116 & Vulnerability Policy | `security.txt` and `SECURITY.md`                                              | **Published and verified at `/.well-known/security.txt`**            | :white_check_mark: PASS |

---

## 1. Category 1: Code Quality & Architecture

### 1.1 Static Analysis & Linting

- **Command**: `npm run lint` (`eslint .`)
- **Configuration**:
  - `typescript-eslint` strict type checked configuration
  - `eslint-config-prettier`
  - Max function complexity: `['error', 10]`
  - Console statements: restricted to `warn`, `error`, `info`
- **Result**: **0 errors, 0 warnings** across all 125 source files.

### 1.2 TypeScript Strictness

- **Command**: `npm run typecheck`
- **Flags Enabled**:
  - `strict: true`
  - `noUncheckedIndexedAccess: true`
  - `noImplicitOverride: true`
  - `exactOptionalPropertyTypes: true`
  - `noImplicitAny: true`
- **Result**: **0 type errors** across `@soiree/shared`, `@soiree/server`, and `@soiree/client`.
- **Type Hygiene**: Zero `any` types in application code, zero `@ts-ignore` comments, and zero non-null assertion operators (`!`) without explanatory comments.

### 1.3 Modularity & File Size Constraints

- **Constraint**: No file > 250 lines; No function > 40 lines; Cyclomatic complexity ≤ 10.
- **Key Architectural Refactorings**:
  1. `PlanView.tsx` decomposed into dedicated tab subcomponents (`OverviewTab.tsx`, `BudgetTab.tsx`, `TimelineTab.tsx`, `VendorsTab.tsx`, `GuestsTab.tsx`, `MoodboardTab.tsx`, `IdeasTab.tsx`, `AskTab.tsx`, `PlanTabBar.tsx`).
  2. `server/src/routes/plans.ts` modularized into discrete route controllers (`budget.ts`, `milestones.ts`, `vendors.ts`, `guests.ts`, `moodboard.ts`, `ideas.ts`, `chat.ts`, `share.ts`, `export.ts`).
  3. `Navbar.tsx` and `NavMobileDrawer.tsx` refactored into focused subcomponents (`NavHeaderActions.tsx`, `DrawerFooter.tsx`, `useDrawerFocusTrap.ts`).
  4. Moodboard presets divided into `moodboardPresets.ts` and `defaultMoodboardPresets.ts`.

---

## 2. Category 2: Testing & Verification

### 2.1 Backend Unit & Integration Tests (`@soiree/server`)

- **Command**: `npm run test -w @soiree/server`
- **Test Suites**: 8 passed (8 total)
- **Tests**: 167 passed (167 total)
- **Execution Time**: ~2.7s
- **Code Coverage (v8)**:
  - **Statements / Lines**: **99.71%** (14 uncovered lines out of 4,800+ lines)
  - **Branches**: **95.69%**
  - **Functions**: **100%**

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   99.71 |    95.69 |     100 |   99.71 |
 src               |   98.27 |       75 |     100 |   98.27 | 25-26
 src/db            |     100 |      100 |     100 |     100 |
 src/errors        |     100 |      100 |     100 |     100 |
 src/middleware    |     100 |       98 |     100 |     100 | 62
 src/repositories  |     100 |    96.55 |     100 |     100 |
 src/routes        |   97.79 |    93.93 |     100 |   97.79 |
 src/routes/plans  |     100 |    97.95 |     100 |     100 |
 src/services      |   99.72 |    93.99 |     100 |   99.72 |
 src/services/ai   |     100 |    96.49 |     100 |     100 |
 src/utils         |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|-------------------
```

### 2.2 Frontend Unit & Integration Tests (`@soiree/client`)

- **Command**: `npm run test -w @soiree/client`
- **Test Suites**: 11 passed (11 total)
- **Tests**: 53 passed (53 total)
- **Execution Time**: ~7.3s
- **Code Coverage (v8)**:
  - **Statements / Lines**: **95.94%**
  - **Branches**: **85.85%**
  - **Functions**: **94.64%**

### 2.3 Property-Based Testing

- **Framework**: `fast-check`
- **Suite**: `server/tests/shared-property.test.ts`
- **Invariants Verified**:
  - Event brief schema validation under arbitrary Unicode strings, extreme numbers, and malformed emails.
  - Budget category invariant integrity: `sum(spent) <= totalSpent` and non-negative allocation limits.
  - Currency conversion stability and rounding idempotency.
  - Guest party headcount preservation across arbitrary mutations.

### 2.4 End-to-End Smoke Tests

- **Framework**: Playwright Chromium
- **Suite**: `e2e/smoke.spec.ts`
- **Coverage**: Full user journey from landing page -> wizard configuration -> overview dashboard -> budget editing -> guest RSVPs -> share link creation -> public read-only page.

---

## 3. Category 3: Accessibility (WCAG 2.2 AA)

### 3.1 Automated Axe-Core Audits

Executed via `@axe-core/playwright` across 10 distinct interactive application views:

1. Landing Page Hero & Navigation
2. Event Wizard Step 0 (Occasion & Style Selection)
3. Event Wizard Step 1 (Event Details, Budget, Guests, City)
4. Event Wizard Step 2 (Vibe & Creative Notes)
5. PlanView Overview & Metrics Dashboard
6. PlanView Budget Tab & Expense Allocation
7. PlanView Guest List & RSVP Management
8. Share Celebration Modal & Link Generator
9. Public Read-Only Plan View (`#/share/:token`)
10. Authentication & Sign-in Modal

**Result**: **0 violations found across all 10 views.**

### 3.2 Google Lighthouse Accessibility Audits

Audited using headless Chromium via `scripts/run-lighthouse.js`:

- **Desktop Accessibility Score**: **100 / 100**
- **Mobile Accessibility Score**: **100 / 100**

### 3.3 Pause Animation Toggle (WCAG 2.2.2 Compliance)

- Implemented accessible pause/resume control with `aria-pressed`, `aria-label`, and `localStorage` persistence (`soiree_motion_paused`).
- Integrates with Framer Motion `<MotionConfig reducedMotion={motionPaused ? 'always' : 'user'}>`.
- Backed by CSS rules in `client/src/index.css` disabling ambient CSS keyframe animations when motion is paused.

### 3.4 Responsive Reflow & 200% Zoom (WCAG 1.4.10 Compliance)

- Verified at 320px viewport width and 200% desktop zoom with zero two-dimensional scrolling (`scrollWidth <= clientWidth`).

---

## 4. Category 4: Security & Hardening

### 4.1 Dependency Audit

- **Command**: `npm audit --omit=dev`
- **Vulnerabilities**: **0 vulnerabilities** (0 low, 0 moderate, 0 high, 0 critical).
- **Remediations**:
  - Upstream `body-parser` Denial of Service (GHSA-27r3-jxmh-p828) resolved via `body-parser@^1.20.9` override.
  - Zod collection exhaustion (GHSA-mrhx-c7xc-m3w5) resolved via `zod@^4.6.7`.

### 4.2 HTTP Security Headers

Configured via Helmet and custom Express middleware in `server/src/app.ts`:

- **Content-Security-Policy (CSP)**:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://images.unsplash.com; connect-src 'self'; object-src 'none'; frame-ancestors 'none';`
- **Cross-Origin-Opener-Policy (COOP)**: `same-origin`
- **Cross-Origin-Resource-Policy (CORP)**: `same-origin`
- **HTTP Strict Transport Security (HSTS)**: `max-age=31536000; includeSubDomains; preload`
- **Permissions-Policy**: `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()`

### 4.3 Authentication & Session Security

- **Timing Attack Mitigation**: Login verification executes precomputed dummy bcrypt comparisons on non-existent users, equalizing server latency and preventing email enumeration.
- **Secure Cookie Attributes**: JWT session cookies set with `httpOnly: true`, `sameSite: 'lax'`, `secure: production`, and sliding session expiration.

### 4.4 RFC 9116 & Vulnerability Policy

- Machine-readable security contact endpoint exposed at `/.well-known/security.txt` and `/security.txt`.
- Comprehensive disclosure guidelines, SLA, and security controls documented in `SECURITY.md`.

---

## 5. Verification Commands

To independently reproduce the entire test suite and evidence report:

```bash
# 1. Static Analysis
npm run lint

# 2. Type Checking
npm run typecheck

# 3. Security Audit
npm audit --omit=dev

# 4. Unit & Integration Tests with Coverage
npm run test

# 5. Playwright E2E & Axe Accessibility Audits
npm run test:e2e

# 6. Lighthouse Accessibility Benchmark
npm run audit:a11y

# 7. Production Build Compilation
npm run build
```
