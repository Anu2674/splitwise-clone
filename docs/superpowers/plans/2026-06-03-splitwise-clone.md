# Splitwise Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Splitwise-inspired app with auth, groups, expenses (4 split types), real-time chat, balance tracking, and debt settlements.

**Architecture:** Next.js 14 App Router as full-stack framework with API routes backend, Prisma ORM against PostgreSQL (Supabase), NextAuth.js credentials auth, and Pusher for real-time chat. All deployed on Vercel + Supabase free tier.

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL (Supabase), NextAuth.js v4, Pusher, Tailwind CSS, bcryptjs

---

## File Map

```
splitwise-clone/
├── prisma/
│   └── schema.prisma           # DB schema: User, Group, GroupMember, Expense, ExpenseSplit, Settlement, Message
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # redirect to /dashboard or /login
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # sidebar nav
│   │   │   ├── dashboard/page.tsx     # overall balance summary
│   │   │   ├── groups/
│   │   │   │   ├── page.tsx           # list groups
│   │   │   │   ├── new/page.tsx       # create group
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # group detail + balances + expenses
│   │   │   │       └── settings/page.tsx  # manage members
│   │   │   └── expenses/
│   │   │       ├── new/page.tsx       # create expense (pick group)
│   │   │       └── [id]/page.tsx      # expense detail + chat
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── register/route.ts
│   │       ├── groups/
│   │       │   ├── route.ts           # GET list, POST create
│   │       │   └── [id]/
│   │       │       ├── route.ts       # GET detail, DELETE
│   │       │       ├── members/route.ts   # POST add, DELETE remove
│   │       │       └── balances/route.ts  # GET group balances
│   │       ├── expenses/
│   │       │   ├── route.ts           # POST create
│   │       │   └── [id]/
│   │       │       ├── route.ts       # GET detail, DELETE
│   │       │       └── messages/route.ts  # GET, POST messages
│   │       ├── settlements/route.ts   # POST record payment
│   │       └── pusher/auth/route.ts   # Pusher channel auth
│   ├── components/
│   │   ├── ui/                        # Button, Input, Card, Modal, etc
│   │   ├── ExpenseForm.tsx
│   │   ├── SplitEditor.tsx            # handles 4 split types
│   │   ├── BalanceSummary.tsx
│   │   ├── ChatBox.tsx                # real-time chat
│   │   └── MemberManager.tsx
│   ├── lib/
│   │   ├── prisma.ts                  # Prisma client singleton
│   │   ├── auth.ts                    # NextAuth config
│   │   ├── pusher.ts                  # Pusher server + client instances
│   │   └── balance.ts                 # balance calculation logic
│   └── types/
│       └── index.ts                   # shared TypeScript types
├── AI_CONTEXT.md
├── BUILD_PLAN.md
└── README.md
```

---

## Task 1: Initialize Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`

- [ ] Run Next.js init:
```bash
cd C:\Users\Admin\Desktop\splitwise-clone
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

- [ ] Install dependencies:
```bash
npm install @prisma/client prisma next-auth bcryptjs pusher pusher-js
npm install -D @types/bcryptjs
```

- [ ] Init Prisma:
```bash
npx prisma init
```

---

## Task 2: Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] Write schema:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  password      String
  createdAt     DateTime @default(now())
  groups        GroupMember[]
  expensesPaid  Expense[]     @relation("PaidBy")
  splits        ExpenseSplit[]
  sentSettlements     Settlement[] @relation("Payer")
  receivedSettlements Settlement[] @relation("Receiver")
  messages      Message[]
}

model Group {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]
}

model GroupMember {
  id       String   @id @default(cuid())
  groupId  String
  userId   String
  role     String   @default("member") // "admin" | "member"
  joinedAt DateTime @default(now())
  group    Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([groupId, userId])
}

model Expense {
  id          String   @id @default(cuid())
  groupId     String
  paidById    String
  description String
  amount      Float
  splitType   String   // "equal" | "unequal" | "percentage" | "share"
  date        DateTime @default(now())
  createdAt   DateTime @default(now())
  group       Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy      User     @relation("PaidBy", fields: [paidById], references: [id])
  splits      ExpenseSplit[]
  messages    Message[]
}

model ExpenseSplit {
  id        String  @id @default(cuid())
  expenseId String
  userId    String
  amount    Float   // actual amount this user owes
  share     Float?  // raw input: shares count or percentage
  expense   Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id])
  @@unique([expenseId, userId])
}

model Settlement {
  id         String   @id @default(cuid())
  groupId    String
  payerId    String
  receiverId String
  amount     Float
  note       String?
  createdAt  DateTime @default(now())
  group      Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  payer      User     @relation("Payer", fields: [payerId], references: [id])
  receiver   User     @relation("Receiver", fields: [receiverId], references: [id])
}

model Message {
  id        String   @id @default(cuid())
  expenseId String
  userId    String
  text      String
  createdAt DateTime @default(now())
  expense   Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## Task 3: Lib Setup (Prisma, Auth, Pusher, Balance)

**Files:**
- Create: `src/lib/prisma.ts`, `src/lib/auth.ts`, `src/lib/pusher.ts`, `src/lib/balance.ts`
- Create: `src/types/index.ts`
- Create: `.env.local`

- [ ] `src/lib/prisma.ts` — singleton Prisma client
- [ ] `src/lib/auth.ts` — NextAuth config with credentials provider
- [ ] `src/lib/pusher.ts` — server Pusher + client Pusher-js export
- [ ] `src/lib/balance.ts` — net balance calculation per user per group
- [ ] `.env.local` — DATABASE_URL, NEXTAUTH_SECRET, PUSHER vars

---

## Task 4: API Routes (Auth + Register)

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/api/register/route.ts`

---

## Task 5: API Routes (Groups)

**Files:**
- Create: `src/app/api/groups/route.ts`
- Create: `src/app/api/groups/[id]/route.ts`
- Create: `src/app/api/groups/[id]/members/route.ts`
- Create: `src/app/api/groups/[id]/balances/route.ts`

---

## Task 6: API Routes (Expenses + Messages + Settlements)

**Files:**
- Create: `src/app/api/expenses/route.ts`
- Create: `src/app/api/expenses/[id]/route.ts`
- Create: `src/app/api/expenses/[id]/messages/route.ts`
- Create: `src/app/api/settlements/route.ts`
- Create: `src/app/api/pusher/auth/route.ts`

---

## Task 7: Frontend (Auth Pages)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`

---

## Task 8: Frontend (Dashboard + Groups)

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/dashboard/page.tsx`
- Create: `src/app/(dashboard)/groups/page.tsx`
- Create: `src/app/(dashboard)/groups/new/page.tsx`
- Create: `src/app/(dashboard)/groups/[id]/page.tsx`
- Create: `src/app/(dashboard)/groups/[id]/settings/page.tsx`

---

## Task 9: Frontend (Expenses + Chat)

**Files:**
- Create: `src/components/SplitEditor.tsx`
- Create: `src/components/ChatBox.tsx`
- Create: `src/app/(dashboard)/expenses/new/page.tsx`
- Create: `src/app/(dashboard)/expenses/[id]/page.tsx`

---

## Task 10: Documentation

**Files:**
- Create: `AI_CONTEXT.md`
- Create: `BUILD_PLAN.md`
- Create: `README.md`
