# Requirements Specification — Soirée Fullstack Migration

## 1. Hard Submission Constraints
- [x] Total git-tracked repository size < 10 MB (exclude node_modules, dist, .env, *.db, logs, zips).
- [x] Strictly clean public repo: never commit secrets. Only `.env.example` with empty defaults.
- [x] Retain existing optimized hero video assets (`hero.mp4`, `hero.webm`, `hero-poster.jpg`) without adding bulky media.
- [x] Zero-friction local startup: `npm install && npm run dev` works with no Docker, Postgres, or external daemons.
- [x] Flawless offline fallback: app must function completely with NO Gemini API key.

## 2. Monorepo Architecture (npm Workspaces)
- [ ] `/client`: Vite + React + TypeScript + Framer Motion (migrated from root).
- [ ] `/server`: Node + Express + TypeScript + SQLite.
- [ ] `/shared`: Shared TypeScript types and contracts for client and server.
- [ ] Root `package.json`: npm workspaces configuration (`client`, `server`, `shared`) with scripts: `dev`, `build`, `start`, `test`.
- [ ] Root `.gitignore` and `.env.example`.

## 3. Backend Specifications
- [ ] Express + TypeScript + Zod validation + Helmet + CORS (credentials) + Rate Limiting.
- [ ] Database: SQLite via `better-sqlite3` at `server/data/soiree.db` (auto-created on first run, gitignored).
- [ ] Schema:
  - `users`: id, email, password_hash, is_guest, created_at
  - `plans`: id, user_id (FK cascade), created_at, title, event_type, date, guests, budget, currency, city, vibe, notes, summary, generated_by
  - `budget_items`: id, plan_id (FK cascade), category, allocated, spent, note
  - `milestones`: id, plan_id (FK cascade), label, detail, weeks_before, done
  - `vendors`: id, plan_id (FK cascade), category, name, status, estimate, tips
  - `idea_groups`: id, plan_id (FK cascade), title, items_json
  - `chat_messages`: id, plan_id (FK cascade), role, text, created_at
- [ ] Authentication:
  - Email/password registration & login with `bcryptjs`.
  - JWT token stored in httpOnly cookie (`soiree_token`).
  - One-click "Continue as guest" instant demo account (`POST /api/auth/guest`).
  - `GET /api/auth/me`, `POST /api/auth/logout`.
- [ ] REST API endpoints (all user-scoped with ownership checks):
  - `GET /api/plans`, `POST /api/plans`, `GET /api/plans/:id`, `DELETE /api/plans/:id`.
  - `PATCH /api/plans/:id/budget/:itemId` (allocated, spent).
  - `PATCH /api/plans/:id/milestones/:id` (done).
  - `POST /api/plans/:id/vendors`, `PATCH /api/plans/:id/vendors/:vendorId`, `DELETE /api/plans/:id/vendors/:vendorId`.
  - `POST /api/plans/:id/ideas/regenerate` (optional steering prompt).
  - `GET /api/plans/:id/chat`, `POST /api/plans/:id/chat` (persisted chat).
  - `GET /api/plans/:id/export.ics` (RFC 5545 calendar export).
  - `GET /api/health`.
- [ ] GenAI Service:
  - Server-side only via `process.env.GEMINI_API_KEY` and `GEMINI_MODEL`.
  - Robust offline generator fallback (`server/src/services/generator.ts`) matching normalization rules.

## 4. Frontend Specifications
- [ ] Fetch wrapper with `credentials: 'include'` in `client/src/lib/api.ts`.
- [ ] Beautiful auth modal/screen (Login, Register, Guest demo) matching luxury cream/gold glass theme.
- [ ] "My Plans" dashboard listing all saved plans, with open, delete, and create-new actions.
- [ ] Optimistic UI updates with rollback on network failure for milestones, budget, vendors.
- [ ] Seamless chat tab using persisted backend history.
- [ ] Preserved hero video, petals, marquee, and all luxury styling.
- [ ] Vite proxy `/api` -> `http://localhost:4000`. In production, Express serves `client/dist`.

## 5. Quality, Testing & Deployment
- [ ] Strict TypeScript (`npm run build` passes with zero errors across all workspaces).
- [ ] Integration tests (Vitest + supertest) covering auth, plan creation (offline fallback), and user ownership isolation.
- [ ] Production-ready Dockerfile & `render.yaml`.
- [ ] Comprehensive README with architecture diagram, setup guide, API table, GenAI overview, and security documentation.
