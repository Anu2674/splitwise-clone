# SplitEase — Splitwise Clone

A full-stack expense-splitting app built with Next.js 16, Prisma 7, PostgreSQL (Supabase), and real-time chat via Pusher.

**AI Tool Used:** Claude Code (claude-sonnet-4-6) by Anthropic

---

## Features
- Auth — Register and login with email/password (NextAuth.js)
- Groups — Create groups, add/remove members by email
- Expenses — 4 split modes: Equal / Unequal / Percentage / By Shares
- Balances — Group-wise and individual balance summary with debt simplification
- Settle up — Record payments between members
- Real-time chat — Live chat per expense (Pusher WebSockets)

---

## Quick Setup

### 1. Install
```bash
npm install
```

### 2. Supabase (Database)
1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection String (URI)
3. Copy the connection string

### 3. Pusher (Real-time Chat)
1. Create app at [pusher.com](https://pusher.com)
2. Copy App ID, Key, Secret, Cluster

### 4. Environment Variables
Fill in `.env`:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
NEXTAUTH_SECRET="your-random-secret-32-chars"
NEXTAUTH_URL="http://localhost:3000"
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
PUSHER_CLUSTER="ap2"
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="ap2"
```

### 5. Run
```bash
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel
1. Push to GitHub (personal account)
2. Import at [vercel.com](https://vercel.com)
3. Add all env vars in Vercel dashboard
4. Deploy

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| Database | PostgreSQL (Supabase free tier) |
| ORM | Prisma 7 |
| Auth | NextAuth.js v4 |
| Real-time | Pusher WebSockets |
| Styling | Tailwind CSS v4 |
| Deploy | Vercel |
