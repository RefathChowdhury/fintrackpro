# FinTrack Pro App — Complete Setup Guide

Follow these steps in order. Each step takes about 5–10 minutes.
Total time: ~45 minutes to have real Chase + Robinhood data in your app.

---

## WHAT YOU NEED FIRST

- A Mac or Windows PC
- An internet connection
- Your Chase and Robinhood login credentials (you'll enter them in Plaid's secure UI — never stored by you)

---

## STEP 1 — Install Node.js (if you don't have it)

1. Go to **https://nodejs.org**
2. Click the big green **"LTS"** download button
3. Open the downloaded file and follow the installer
4. To verify it worked, open **Terminal** (Mac) or **Command Prompt** (Windows) and type:
   ```
   node --version
   ```
   You should see something like `v20.11.0`

---

## STEP 2 — Get Your Plaid API Keys

1. Go to **https://dashboard.plaid.com/signup**
2. Sign up with your email — no credit card needed
3. After signing in, go to **Team Settings → Keys**
4. Copy your **Client ID** and **Sandbox Secret** (you'll get Development access next)
5. Apply for Development access:
   - Click **"Request Development access"** in the dashboard
   - Fill out the form — for "What are you building?" write: *"Personal family finance tracker for my own use"*
   - Approval takes 1–3 business days (often same day)
   - Once approved, copy your **Development Secret** too

---

## STEP 3 — Set Up the Backend

Open Terminal (Mac) or Command Prompt (Windows):

```bash
# 1. Go into the backend folder
cd path/to/fintrackpro/backend

# 2. Install dependencies (takes ~1 minute)
npm install

# 3. Create your .env file
cp .env.example .env
```

Now open `.env` in any text editor (Notepad, TextEdit, VS Code) and fill in:

```
PLAID_CLIENT_ID=paste_your_client_id_here
PLAID_SECRET=paste_your_development_secret_here
PLAID_ENV=development
JWT_SECRET=make_up_any_long_random_string_like_this_abc123xyz789
FRONTEND_URL=http://localhost:3000
PORT=4000
```

Then start the backend:
```bash
npm start
```

You should see: `✅ FinTrack Pro backend running on port 4000`

**Leave this terminal window open.**

---

## STEP 4 — Set Up the Frontend

Open a **second** Terminal window:

```bash
# 1. Go into the frontend folder
cd path/to/fintrackpro/frontend

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env
# The default (http://localhost:4000) is correct for local use

# 4. Start the frontend
npm start
```

Your browser will automatically open to **http://localhost:3000**

---

## STEP 5 — Create Your Account

1. In the app, tap **"Create Account"**
2. Enter your name, email, and a password
3. You're in! Do the same for your dad on his device later.

---

## STEP 6 — Link Chase and Robinhood

1. Go to the **Accounts** tab
2. Tap **"Link Bank / Brokerage Account"** — this opens Plaid's secure UI
3. Search for **"Chase"** → enter your Chase login → select accounts → Done
4. Tap **Link** again → search **"Robinhood"** → enter Robinhood login → Done
5. Your real transactions, balances, and investment holdings will appear within seconds

**Your login credentials are never stored by this app.** Plaid handles all bank authentication directly using bank-grade security (the same as Venmo, YNAB, and Robinhood themselves use).

---

## STEP 7 — Install on iPhone (Make it feel like a real app)

1. On your iPhone, open **Safari** (must be Safari, not Chrome)
2. Go to your computer's local address. First find your computer's IP:
   - Mac: System Preferences → Network → your IP (e.g. 192.168.1.42)
   - Windows: Command Prompt → type `ipconfig` → look for IPv4 Address
3. In Safari on iPhone, go to: `http://192.168.1.42:3000` (replace with your IP)
4. Tap the **Share button** (box with upward arrow at bottom of Safari)
5. Tap **"Add to Home Screen"**
6. Tap **"Add"**

The app now appears as a full-screen icon on your home screen — no App Store needed.

---

## STEP 8 — Deploy Online (So your dad can use it from his phone)

To make it accessible from anywhere (not just your home WiFi), deploy for free:

### Deploy Backend to Render.com (free tier)

1. Go to **https://render.com** → sign up free
2. Create a **New Web Service**
3. Connect your GitHub repo (push the `backend` folder to GitHub first)
4. Set environment variables in Render's dashboard (same as your `.env` file)
5. Render gives you a URL like `https://fintrackpro-backend.onrender.com`

### Deploy Frontend to Vercel (free)

1. Go to **https://vercel.com** → sign up free
2. Import your `frontend` folder
3. Set environment variable: `REACT_APP_API_URL=https://fintrackpro-backend.onrender.com`
4. Vercel gives you a URL like `https://fintrackpro.vercel.app`

Now your dad can go to `https://fintrackpro.vercel.app` on his iPhone Safari, create his own account, link his own cards, and install it to his home screen.

---

## FILE STRUCTURE

```
fintrackpro/
├── backend/
│   ├── server.js          ← Main backend (Plaid + auth + database)
│   ├── package.json
│   ├── .env.example       ← Copy to .env and fill in your keys
│   └── fintrackpro.db        ← Auto-created SQLite database (your data lives here)
│
└── frontend/
    ├── src/
    │   └── App.jsx        ← Full React app
    ├── public/
    │   ├── index.html     ← Includes Plaid Link script
    │   └── manifest.json  ← Makes it installable on iPhone
    ├── package.json
    └── .env.example       ← Copy to .env
```

---

## TROUBLESHOOTING

**"Cannot connect to backend"**
→ Make sure the backend terminal is still running (`npm start` in backend folder)

**Plaid Link not opening**
→ Make sure you're using Development credentials (not Sandbox) from dashboard.plaid.com

**"Plaid not loaded" error**
→ You need internet access; Plaid's script loads from their CDN

**Robinhood not showing investments**
→ Plaid's investment product support for Robinhood may require a specific account type. Try searching "Robinhood" in the Plaid Link UI — if it doesn't appear, check your Plaid dashboard under Products → Investments.

**App not showing on iPhone home screen**
→ Must use Safari specifically. Chrome on iPhone does not support "Add to Home Screen" for PWAs.

---

## COST SUMMARY

| Item | Cost |
|------|------|
| Plaid Development (up to 100 accounts) | Free |
| Render.com backend hosting | Free (or $7/mo for always-on) |
| Vercel frontend hosting | Free |
| **Total** | **$0 – $7/month** |

---

*Built with React + Node.js + Plaid + SQLite*
