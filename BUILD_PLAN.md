# BUILD_PLAN.md — SplitEase (Splitwise Clone)

---

## 1. Product Research

### How I Studied Splitwise
- Analyzed Splitwise's core UI flows: onboarding → groups → add expense → view balances → settle
- Identified the key data entities: User, Group, GroupMember, Expense, ExpenseSplit, Settlement, Message
- Studied the 4 split modes Splitwise offers (equal, exact amounts, percentages, shares)
- Understood the balance calculation model: each expense creates debts; settlements cancel debts

### What I Learned
- The core data model is surprisingly simple: expenses create splits, settlements cancel them, balances are always computed from these records
- Debt simplification (minimizing transactions) is a separate concern from balance tracking
- Real-time chat is the only truly async feature; everything else is request-response

### Workflows Identified
1. **Onboarding:** Register → Create group → Invite friends
2. **Add expense:** Pick group → Enter amount → Choose split type → Assign splits → Save
3. **View balances:** Group page shows each member's net + simplified debts
4. **Settle:** Click "Settle up" on a debt → confirm → balance updates
5. **Chat:** Open expense → type message → other members see it live

### Product Assumptions
- Only one currency (INR) — avoids FX complexity
- Logged-in user is always the payer — simplifies UI
- Groups are flat (no sub-groups, no shared expenses outside groups)
- All members can add expenses; only admin can delete the group

---

## 2. Architecture

### Tech Stack
- **Next.js 16** (App Router) — single repo for frontend + API routes
- **TypeScript** — type safety across full stack
- **Prisma 7** — ORM with generated types
- **PostgreSQL** (Supabase) — relational DB, free tier
- **NextAuth.js v4** — session management, credentials provider
- **Pusher** — managed WebSockets for real-time chat
- **Tailwind CSS v4** — utility-first styling
- **Vercel** — serverless deployment

### Database Schema
7 tables: User, Group, GroupMember, Expense, ExpenseSplit, Settlement, Message
See AI_CONTEXT.md for full schema with field types and relations.

Key design decisions:
- `ExpenseSplit.amount` = computed INR amount (always stored)
- `ExpenseSplit.share` = raw input (percentage or share count, nullable)
- Settlements stored separately from expenses — clean audit trail
- All relations use `onDelete: Cascade` for clean group/expense deletion

### API Design
RESTful JSON API via Next.js route handlers:
- Auth: NextAuth handles `/api/auth/*`
- `POST /api/register` — user creation
- CRUD on `/api/groups`, `/api/groups/:id`, `/api/groups/:id/members`
- `GET /api/groups/:id/balances` — computed balances + simplified debts
- `POST /api/expenses`, `GET /api/expenses/:id`, `DELETE`
- `GET/POST /api/expenses/:id/messages`
- `GET/POST /api/settlements`

### Frontend Structure
Route groups:
- `(auth)/` — login, register (no sidebar)
- `(dashboard)/` — sidebar layout with auth guard

Key components:
- `SplitEditor` — renders different controls for each of 4 split types
- `ChatBox` — Pusher subscription + message list + send form
- `SettleDebtButton` — single-click debt settlement
- `Sidebar` — navigation + user info + sign out

### Deployment Approach
1. Supabase (free PostgreSQL) — no self-hosted DB needed
2. Pusher free tier — 100 concurrent connections, sufficient for demo
3. Vercel (free hobby) — auto-deploys from GitHub push
4. All secrets in Vercel environment variables

---

## 3. AI Collaboration Process

### How I Instructed the AI
Used Claude Code (claude-sonnet-4-6) as the primary development collaborator.

Key instructions given:
- "Build a Splitwise clone, full-stack Next.js, Supabase, Pusher, deploy on Vercel"
- "Be token-efficient — this is a complete project that needs to fit in one session"
- "Don't touch company AWS or company tools — use only public services"
- "INR currency, payer is always the logged-in user"

### What the AI Asked / Clarified
1. Token feasibility — AI gave estimate (~46k tokens) before starting
2. Accounts needed — confirmed Supabase, Pusher, Vercel are fine
3. Currency — decided on INR
4. Prisma 7 schema format — AI discovered and fixed the breaking change during build
5. npm registry issue — company CodeArtifact registry was blocking; AI reset to public npm

### How the Plan Evolved
1. Started with writing implementation plan to `docs/superpowers/plans/`
2. Initialized Next.js with `create-next-app` (encountered AWS registry issue, fixed)
3. Wrote Prisma schema → discovered Prisma 7 breaking change (no `url` in datasource) → fixed
4. Wrote all API routes, then frontend pages
5. Generated Prisma client with `npx prisma generate`
6. Wrote documentation files last

### How AI_CONTEXT.md Was Maintained
Updated incrementally as each architectural decision was made:
- Schema was finalized first, then documented
- Split calculation algorithm documented when `POST /api/expenses` was written
- Balance algorithm documented when `lib/balance.ts` was written
- Trade-offs and limitations added at the end of implementation

---

## 4. Tradeoffs

### What We Simplified
- **Currency:** INR only — no multi-currency exchange rates
- **Payer:** Always logged-in user — real Splitwise lets you say "Alice paid" even when Bob is entering the expense
- **Balance caching:** Recomputed on every request — production would cache with Redis
- **Invite flow:** Users must already have an account to be added — no email invite system

### What We Hardcoded
- ₹ currency symbol throughout the UI
- Pusher cluster `ap2` as default in `.env`
- `NEXTAUTH_URL` to `http://localhost:3000` in dev (must be changed for production)

### What We Avoided
- OAuth (Google, GitHub) — requires app registration, adds setup complexity
- Email notifications — requires SMTP/SendGrid setup
- Expense categories/icons — visual polish not required for MVP
- Pagination — adds complexity; fine without for demo scale
- Admin panel — no management UI for all users

### What We Would Improve With More Time
1. **Add editing of expenses** — currently you delete and re-add
2. **Email invites** — invite friends who don't have accounts yet
3. **Decimal precision** — use Prisma `Decimal` type instead of `Float` to avoid rounding errors
4. **Polling fallback for chat** — if Pusher isn't configured, poll every 3s
5. **Group activity feed** — show all recent actions in one timeline
6. **Export to CSV** — useful for expense reporting
7. **Dark mode** — Tailwind makes this easy to add
8. **Tests** — Playwright e2e for core flows; Vitest for balance calculation logic
