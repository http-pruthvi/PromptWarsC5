# Soirée — GenAI Fullstack Event Planning Platform
PromptWars Challenge 5 Submission

## Vision
Transform the bespoke luxury event planner "Soirée" into an enterprise-grade fullstack monorepo featuring:
- Node.js + Express + TypeScript backend with Zod validation, Helmet, CORS, and Rate Limiting
- Zero-config SQLite persistence via `better-sqlite3` with automated schema migrations and cascade deletes
- Secure authentication (bcrypt + JWT in httpOnly cookie) with a 1-click Guest Demo mode for instant judge evaluation
- Complete user-scoped REST API for event planning, real-time budgeting, milestone ticking, vendor coordination, and AI-powered ideas/chat
- Server-side Google Gemini GenAI integration with zero-credential offline fallback engine
- Monorepo structure (npm workspaces: `/client`, `/server`, `/shared`) with zero-config `npm install` and `npm run dev`
- Strict compliance with <10MB repo size constraints and clean public repository standards
