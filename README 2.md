# FinTrack Pro

**AI-powered personal finance tracker with real bank & investment data**

FinTrack Pro is a full-stack web application that connects to your real bank accounts, credit cards, and investment portfolios via Plaid, and visualizes everything in a sleek, mobile-friendly dashboard. Built for personal and family use - inspired by the need for a private, no-subscription alternative to apps like Mint and Copilot.

---

## Overview

FinTrack Pro enables:

- Real-time bank and investment account syncing via Plaid API
- Multi-user support with isolated, secure per-user data
- Transaction history, budget tracking, and spending breakdowns
- Investment portfolio tracking (Robinhood, Fidelity, etc.)
- Savings goal management with live progress tracking
- Manual account support for institutions Plaid doesn't cover (e.g. Discover)
- iPhone home screen installable (PWA)

---

## Core Features

### Plaid Bank Integration
- Connects to real Chase, Robinhood, and 10,000+ institutions via Plaid Link
- Fetches live balances, 90 days of transactions, and investment holdings
- Secure token exchange - credentials never touch our servers

### Multi-User Auth
- JWT-based authentication with bcrypt password hashing
- Each user's financial data is completely isolated
- 30-day token expiration with automatic session management

### Financial Dashboard
- Net worth tracking across all linked accounts
- Monthly cash flow charts (income vs. expenses)
- Spending breakdown by category with interactive pie charts
- Budget progress bars with over-budget alerts

### Investment Portfolio
- Real holdings from Robinhood, Fidelity, and brokerages
- Shares, price per share, total value, and return percentage
- Portfolio allocation visualization

### Goals & Budget
- Custom savings goals with live progress tracking
- Per-category budget limits with automatic transaction matching
- Recurring transaction detection

### iPhone PWA
- Installable to iPhone home screen via Safari
- Full-screen native app experience - no App Store needed

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Recharts |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Bank Data | Plaid API (Transactions, Investments, Auth) |
| Auth | JWT + bcrypt |
| Hosting | Render (backend) + Vercel (frontend) |
| Mobile | PWA - installable on iOS via Safari |

---

## Local Setup

### Clone the repo
```bash
git clone https://github.com/RefathChowdhury/fintrackpro.git
cd fintrackpro
```

### Backend
```bash
cd backend
npm install
cp .env.example .env
# fill in your Plaid credentials and JWT secret
npm start
```

Backend will run on: `http://localhost:4000`

### Frontend
```bash
cd ../frontend
npm install
npm start
```

Frontend will run on: `http://localhost:3000`

---

## Environment Variables

Copy `.env.example` → `.env` and fill in:

```
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_production_secret
PLAID_ENV=production
JWT_SECRET=your_long_random_secret
FRONTEND_URL=http://localhost:3000
PORT=4000
```

 `.env` and all sensitive keys are excluded via `.gitignore`.

---

## Plaid Setup

1. Sign up at **dashboard.plaid.com**
2. Apply for Development or Production access
3. Enable products: **Transactions**, **Investments**, **Auth**
4. Paste your Client ID and Secret into `.env`
5. Run the app - click "Link Bank Account" to connect real institutions

> ️ Discover cards are not supported by Plaid due to Discover's data sharing restrictions. Use the Manual Account feature instead.

---

## Install on iPhone

1. Open the deployed app URL in **Safari** (must be Safari)
2. Tap the **Share button** → **"Add to Home Screen"**
3. Tap **Add**

FinTrack Pro appears as a full-screen app icon on your home screen - no App Store required.

---

## What to Expect

 Real bank and credit card balances
 90 days of real transaction history
 Live investment holdings (Robinhood, etc.)
 Multi-user login with isolated data
 Budget tracking with category breakdown
 Savings goals with progress bars
 Manual accounts for unsupported institutions
 iPhone installable PWA

---

## ⭐ Interview STAR Stories

You can talk about this project like this:

**Situation:**
Existing finance apps like Mint require subscriptions and share your data with advertisers. I wanted a private, self-hosted alternative for my family.

**Task:**
Build a full-stack personal finance app with real bank connectivity, multi-user support, and a mobile-first UI.

**Action:**
Integrated Plaid's API for real-time bank and investment data, built a Node/Express backend with JWT auth and SQLite, and created a React PWA installable on iPhone. Navigated Plaid's production approval process including security questionnaires and compliance documentation.

**Result:**
A fully functional personal finance OS connecting real Chase and Robinhood accounts, tracking net worth, transactions, budgets, and investments - deployed on Render and Vercel at zero monthly cost.

---

## What I Learned

- Production API integration with OAuth-style token exchange (Plaid)
- Navigating real-world compliance processes (security & risk questionnaires)
- JWT authentication and secure per-user data isolation
- Building installable PWAs for iOS
- Full-stack deployment with Render + Vercel
- Handling third-party API limitations gracefully (Discover fallback)

---

## Project Structure

```
fintrackpro/
├── backend/
│ ├── server.js ← Express API + Plaid integration
│ ├── fintrackpro.db ← SQLite database (auto-created)
│ ├── .env.example ← Environment variable template
│ └── package.json
│
└── frontend/
 ├── src/
 │ └── App.jsx ← Full React app
 ├── public/
 │ ├── index.html ← Includes Plaid Link SDK
 │ └── manifest.json ← PWA manifest for iPhone install
 └── package.json
```

---

*Built with React · Node.js · Plaid · SQLite · Deployed on Render + Vercel*
