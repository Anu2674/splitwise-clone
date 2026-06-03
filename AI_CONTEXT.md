# AI_CONTEXT.md — SplitEase (Splitwise Clone)

> This file is the source of truth for the entire project. It should be detailed enough that another developer or AI agent can paste it into Claude Code and recreate a similar app.

---

## Product Understanding

**What is Splitwise?**
Splitwise is an expense-splitting app that lets groups of people (friends, roommates, travel companions) track shared expenses and settle debts. Core behaviors:
- Users create groups and add members
- Any member can add an expense (paid by one person, split among several)
- The app calculates running balances: who owes whom how much
- Users settle by recording a payment, which adjusts balances
- Expenses have a comment/chat thread for context

**What this app replicates:**
- Login/register with email+password
- Groups: create, add members by email, remove members, view members
- Expenses: add with 4 split types, view split breakdown, delete
- Balances: per-group net balance per member, simplified "who owes whom"
- Settle up: record a payment from one member to another in a group
- Chat: real-time per-expense message thread (Pusher WebSockets)

---

## Product Scope (MVP)

**In scope:**
- Email/password auth (no OAuth)
- Groups (one level, no sub-groups)
- Expenses within groups only (no non-group expenses)
- 4 split types: equal, unequal (by amount), percentage, by shares
- Current logged-in user is always the payer
- Balance calculation: net per user per group + debt simplification algorithm
- Settle up: record payment, updates balances immediately
- Real-time chat per expense (Pusher free tier)
- Currency: INR (₹) — hardcoded, no multi-currency

**Out of scope:**
- OAuth (Google/Facebook login)
- Email notifications/invites
- Expense categories/icons/images
- Non-group (friend-only) expenses
- Recurring expenses
- Multi-currency
- Mobile app
- Admin panel

---

## Implementation Decisions

1. **Next.js 16 App Router** — full-stack in one repo, server components for data fetching, client components only where interactivity needed
2. **Prisma 7** — type-safe ORM; note: Prisma 7 removed `url` from schema datasource — connection URL passed via `prisma.config.ts` (CLI) and `new PrismaClient({ datasourceUrl })` (runtime)
3. **NextAuth v4 credentials** — simplest auth, no external OAuth needed for MVP
4. **Pusher** — managed WebSocket service; free tier: 100 connections, 200k messages/day. If Pusher keys not configured, chat falls back gracefully (messages still save, just no live push)
5. **Debt simplification** — greedy algorithm: pair largest creditor with largest debtor to minimize number of transactions
6. **Split calculation** — all computed server-side in `POST /api/expenses`; `ExpenseSplit.share` stores the raw input (percentage or share count) for display; `ExpenseSplit.amount` stores the final computed INR amount
7. **Balance calculation** — computed at request time from raw expenses+settlements (not cached); acceptable for MVP scale

---

## Engineering Requirements

- Node.js 20+
- npm 10+
- PostgreSQL (Supabase free tier recommended)
- Pusher account (pusher.com free tier)
- Vercel account for deployment

---

## Tech Stack

| Concern | Technology | Version |
|---|---|---|
| Framework | Next.js | 16.2.7 |
| Language | TypeScript | 5.x |
| ORM | Prisma | 7.8.0 |
| Database | PostgreSQL | via Supabase |
| Auth | NextAuth.js | 4.24.14 |
| Password hashing | bcryptjs | 3.x |
| Real-time | Pusher + pusher-js | 5.x / 8.x |
| Styling | Tailwind CSS | 4.x |
| Runtime | Node.js | 20.x |
| Deploy | Vercel | — |

---

## Database Schema

```
User
  id        cuid PK
  name      String
  email     String UNIQUE
  password  String (bcrypt hashed)
  createdAt DateTime

Group
  id          cuid PK
  name        String
  description String?
  createdAt   DateTime

GroupMember
  id       cuid PK
  groupId  FK → Group
  userId   FK → User
  role     String ("admin" | "member")
  joinedAt DateTime
  UNIQUE(groupId, userId)

Expense
  id          cuid PK
  groupId     FK → Group (cascade delete)
  paidById    FK → User
  description String
  amount      Float (total expense amount in INR)
  splitType   String ("equal"|"unequal"|"percentage"|"share")
  date        DateTime
  createdAt   DateTime

ExpenseSplit
  id        cuid PK
  expenseId FK → Expense (cascade delete)
  userId    FK → User
  amount    Float  (computed INR amount this user owes)
  share     Float? (raw input: % or share count, null for equal/unequal)
  UNIQUE(expenseId, userId)

Settlement
  id         cuid PK
  groupId    FK → Group (cascade delete)
  payerId    FK → User
  receiverId FK → User
  amount     Float
  note       String?
  createdAt  DateTime

Message
  id        cuid PK
  expenseId FK → Expense (cascade delete)
  userId    FK → User
  text      String
  createdAt DateTime
```

---

## API Design

### Auth
- `POST /api/register` — `{name, email, password}` → creates user
- `POST /api/auth/signin` — handled by NextAuth (credentials)
- `GET /api/auth/session` — handled by NextAuth

### Users
- `GET /api/users?email=x` — find user by email (for adding to group)

### Groups
- `GET /api/groups` — list groups for current user
- `POST /api/groups` — `{name, description}` → create group (creator becomes admin)
- `GET /api/groups/:id` — group detail with members + expenses
- `DELETE /api/groups/:id` — delete group (admin only)
- `POST /api/groups/:id/members` — `{email}` → add member by email
- `DELETE /api/groups/:id/members` — `{userId}` → remove member
- `GET /api/groups/:id/balances` — returns `{balances[], debts[]}`

### Expenses
- `POST /api/expenses` — `{groupId, description, amount, splitType, splits[]}` → create
- `GET /api/expenses/:id` — expense detail with splits + messages
- `DELETE /api/expenses/:id` — delete (payer only)

### Messages
- `GET /api/expenses/:id/messages` — list messages
- `POST /api/expenses/:id/messages` — `{text}` → create + pusher trigger

### Settlements
- `POST /api/settlements` — `{groupId, receiverId, amount, note}` → record payment
- `GET /api/settlements?groupId=x` — list settlements for a group

---

## Frontend Structure

```
app/
  page.tsx                    → redirects to /dashboard or /login
  layout.tsx                  → root layout with SessionProvider

  (auth)/
    login/page.tsx            → email/password login form
    register/page.tsx         → registration form

  (dashboard)/
    layout.tsx                → sidebar + auth guard (redirect if not logged in)
    dashboard/page.tsx        → balance summary cards + group list
    groups/
      page.tsx                → list all groups
      new/page.tsx            → create group form
      [id]/
        page.tsx              → group detail: balances, debts, expenses list
        settings/page.tsx     → manage members (add by email, remove)
    expenses/
      new/page.tsx            → create expense (group picker + split editor)
      [id]/page.tsx           → expense detail: split breakdown + chat

components/
  SessionProvider.tsx         → wraps NextAuth SessionProvider (client)
  Sidebar.tsx                 → left nav with user info + sign out
  SplitEditor.tsx             → renders split controls for all 4 split types
  ChatBox.tsx                 → real-time chat UI with Pusher subscription
  SettleDebtButton.tsx        → "Settle up" button in group detail

lib/
  prisma.ts                   → Prisma client singleton (passes datasourceUrl)
  auth.ts                     → NextAuth options with credentials provider
  pusher.ts                   → Pusher server instance + client factory
  balance.ts                  → calculateGroupBalances() + simplifyDebts()

types/
  index.ts                    → SplitType, SplitInput, NextAuth session extension
```

---

## Balance Calculation Logic

```
calculateGroupBalances(expenses, settlements, members):
  for each expense:
    payer's net += sum of all OTHER members' split amounts
    each other member's net -= their split amount
  for each settlement:
    payer's net += amount (they paid off debt)
    receiver's net -= amount (they received payment)
  return [{userId, userName, net}]

simplifyDebts(balances):
  creditors = members with net > 0 (sorted desc)
  debtors = members with net < 0 (sorted asc)
  greedily pair creditor with debtor until both zeroed
  return [{fromUserId, fromUserName, toUserId, toUserName, amount}]
```

---

## Deployment Plan

1. **Database:** Supabase free tier
   - Create project → copy connection string → put in env vars
   - Run `npx prisma migrate deploy` once to create tables

2. **Pusher:** Free tier (pusher.com)
   - Create Channels app → copy credentials → put in env vars
   - Channel naming: `expense-{expenseId}` (public channels)
   - Event name: `new-message`

3. **Vercel:** Free hobby tier
   - Import GitHub repo → add all env vars → deploy
   - Vercel auto-detects Next.js, runs `npm run build`

---

## Testing Plan

Manual testing checklist:
1. Register two users (A and B)
2. User A creates a group, adds User B by email
3. User A adds an expense (equal split, ₹100) — verify B owes A ₹50
4. User A adds an expense (percentage: A=30%, B=70%) — verify amounts
5. User A adds an expense (by shares: A=1, B=3) — verify A pays 25%, B pays 75%
6. User B opens expense, sends a chat message — User A sees it in real-time
7. User B clicks "Settle up" to pay A ₹50 — balance updates to ₹0
8. User A removes User B from group settings

---

## Trade-offs

| What | Simplified to | Why |
|---|---|---|
| Multi-currency | INR only (₹ hardcoded) | Scope reduction |
| OAuth | Email/password only | Simpler, no external OAuth config |
| Balance caching | Computed on each request | Simpler; acceptable for MVP |
| Email invites | Add by email (user must exist) | No email service needed |
| Push notifications | Pusher only (no fallback polling) | Pusher free tier sufficient |
| Expense editing | Delete and re-add | Simpler state management |

---

## Known Limitations

1. If Pusher keys are not configured (`your-pusher-key`), chat messages save to DB but don't push live. Users see messages on page refresh.
2. No pagination on expenses or messages — could be slow for very active groups.
3. Balance calculation is O(n) per request — fine for MVP, needs caching at scale.
4. `GroupMember.role` is stored but only `admin` role check is used (on delete group). Finer-grained permissions not implemented.
5. Expense amount is stored as Float (not Decimal) — rounding errors possible on edge cases. Production would use `Decimal`.

---

## Prompts Used

Initial prompt given to AI (Claude Code):
> "Build a Splitwise clone for a friend's assignment. Full-stack Next.js, PostgreSQL via Supabase, real-time chat via Pusher, Tailwind CSS. Deploy on Vercel. Requirements: login, groups (add/remove members), expenses (equal/unequal/percentage/share split), group+individual balances, settle debts, real-time chat per expense. Relational DB only. Be token-efficient."

Key follow-up decisions made:
- Use INR (₹) as currency
- Payer is always the logged-in user (no "paid by someone else" UX)
- Debt simplification via greedy creditor-debtor pairing
- Prisma 7 schema format changed (no url in datasource) — fixed during build
- Tailwind v4 CSS-based config (no tailwind.config.ts)

---

## Changes Made During Implementation

| Change | Reason |
|---|---|
| Prisma 7 schema: removed `url` from datasource | Prisma 7 moved URL to prisma.config.ts |
| `PrismaClient({ datasourceUrl })` in runtime | Prisma 7 requires explicit URL at runtime |
| `prisma-client-js` generator with output `../src/generated/prisma` | Prisma 7 default output path |
| npm registry reset to registry.npmjs.org | Company npmrc was pointing to private AWS CodeArtifact |
| `serverExternalPackages: ["@prisma/client"]` in next.config | Prisma works correctly in Next.js server |
