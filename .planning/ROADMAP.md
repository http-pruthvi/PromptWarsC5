# Development Roadmap — Soirée Fullstack Migration

## Phase 1: Monorepo Setup & Workspaces Restructure
- [ ] Initialize git and craft bulletproof `.gitignore` (blocking node_modules, dist, *.db, .env, logs).
- [ ] Move client into `client/`.
- [ ] Create `shared/` workspace package for shared TypeScript types.
- [ ] Create `server/` workspace package with Express, TypeScript, Better-SQLite3, Zod, and JWT.
- [ ] Configure root `package.json` with npm workspaces and concurrently dev scripts.
- [ ] Verify root `npm install` and directory integrity.

## Phase 2: Database Schema & Backend Core
- [ ] Build SQLite database initialization (`server/src/db/index.ts`, `server/src/db/schema.ts`) with foreign key enforcement and automatic migration.
- [ ] Build Authentication layer (bcryptjs, JWT in httpOnly cookie, guest user creation, auth middleware).
- [ ] Port GenAI & offline generator logic into `server/src/services/` (Gemini API server-side, fallback engine, prompt engineering).
- [ ] Implement all REST API routes in `server/src/routes/` with Zod validation, error handling, rate limiting, and ownership checks.
- [ ] Implement `.ics` calendar generator endpoint.

## Phase 3: Integration Tests & Backend Verification
- [ ] Set up Vitest + Supertest in `server/`.
- [ ] Write tests for:
  - Auth flow: register, login, guest login, session check (`/auth/me`), logout.
  - Plan creation: brief validation, offline generation, SQLite relational insertion, retrieval.
  - Security & Ownership: User A cannot fetch, edit, or delete User B's plan (404/403).
- [ ] Run test suite and ensure 100% pass.

## Phase 4: Frontend Modernization & Fullstack Connection
- [ ] Implement `client/src/lib/api.ts` fetch wrapper with credentials and structured error handling.
- [ ] Build Auth UI (Sign In / Register / 1-Click Guest) matching luxury aesthetic.
- [ ] Build "My Plans" dashboard view (cards for saved events, delete dialog, create new).
- [ ] Wire Wizard to `POST /api/plans`.
- [ ] Wire PlanView tabs to backend endpoints with optimistic updates & rollback (milestones, budget, vendors, chat, regenerate ideas).
- [ ] Remove all legacy localStorage key and plan persistence; remove client-side Gemini API key fields.
- [ ] Configure Vite dev proxy to `http://localhost:4000` and Express production static serving.

## Phase 5: Verification, Size Check & Documentation
- [ ] Run full build: `npm run build` with zero TypeScript errors across all workspaces.
- [ ] Run integration tests: `npm test`.
- [ ] Launch development server and smoke test full user workflow: guest login, plan creation, milestone ticking, budget modification, chat assistant, calendar download.
- [ ] Check repository size: `git ls-files | xargs du -ch | tail -1` (guaranteeing <10MB).
- [ ] Create Dockerfile and `render.yaml`.
- [ ] Author comprehensive `README.md` with architecture diagram, API documentation, and security disclosures.
