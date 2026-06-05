# Lekha-Jokha ( लेखा-जोखा ) 🧾

A mobile-first, installable **PWA** for tracking, splitting, and settling bills and expenses with friends and groups — built with **React + Vite + TypeScript + Tailwind** and **Supabase** (Postgres + Auth + Row Level Security).

> Users are managed by you directly in **Supabase Auth**. A matching `profiles`
> row is created automatically for every auth user via a database trigger.

## Features

- 🔐 Email + password (and magic-link) sign-in via Supabase Auth
- 👥 Create groups, add members by email, manage membership
- 🧾 Add expenses with **equal**, **exact**, or **percentage** splits
- 📸 **Smart Receipt Auto-Scanner (Simulated AI OCR)** to parse amounts and merchants instantly
- 📊 **Spending Insights Dashboard** showing category-wise spending breakdowns and smart budget tips
- ⚡ **UPI Payment QR Code Generator** to scan and settle debts directly via any UPI app (GPay, PhonePe, Paytm, etc.)
- ⚙️ **UPI ID Profile Configuration** so members can configure their UPI address to receive payments
- 💱 Multi-currency support, category tags, custom date logging
- ⚖️ Live per-member balances + **smart "who pays whom"** debt simplification
- 🤝 Record settlements / payments between members
- 📱 100% mobile-friendly, installable on phones, tablets, and desktop (PWA)
- 🛡️ Row Level Security (RLS) so members only ever see their own groups' data

## 1. Set up the database

In your Supabase project, open **SQL Editor** and run the migration:

```
supabase/migrations/0001_init.sql
```

(Or, with the Supabase CLI: `supabase db push`.)

This creates the tables (`profiles`, `groups`, `group_members`, `expenses`,
`expense_splits`, `settlements`), the auth→profile sync trigger, helper
functions, and all RLS policies.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in from **Supabase → Project Settings → API**:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Create users

In **Supabase → Authentication → Users → Add user**, create accounts (set
"Auto Confirm User" so they can log in immediately). The `profiles` row and
display name are created automatically. Users sign in with that email/password.

## 4. Run

```bash
npm install      # already done if you scaffolded here
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build locally
```

## 5. Install as an app

The app ships a web manifest + service worker, so it's installable:

- **iPhone/iPad (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** ⋮ menu → *Install app*
- **Desktop (Chrome/Edge):** install icon in the address bar

> PWA install requires HTTPS in production (Supabase/Vercel/Netlify all provide
> it). On `localhost` it also works for testing.

## Deploying

Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages).
Build command `npm run build`, output dir `dist`. Add the two `VITE_…` env vars
in the host dashboard. Because it's a SPA, enable history-fallback to
`index.html` (Vercel/Netlify do this automatically).

## Project structure

```
supabase/migrations/0001_init.sql   # schema + RLS (run this first)
scripts/generate-icons.mjs          # regenerates PWA PNG icons
src/
  lib/        supabase client, types, api calls, balance math, formatting
  context/    AuthContext (session + profile)
  components/ Layout, bottom nav, shared UI, icons
  pages/      Login, Dashboard, Groups, GroupDetail, AddExpense, Account
```

## How balances work

`src/lib/balances.ts` computes each member's net position from expenses
(payer is credited, each split debits the participant) and settlements, then
runs a greedy **debt simplification** to suggest the fewest payments needed to
settle everyone up.
