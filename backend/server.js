// ─── FinTrack Pro Backend ────────────────────────────────────────────────
// Node.js + Express + Plaid SDK + SQLite

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const { PlaidApi, PlaidEnvironments, Configuration } = require("plaid");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ─── DATABASE SETUP ──────────────────────────────────────────────────────────

const db = new Database("./fintrackpro.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plaid_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    item_id TEXT NOT NULL,
    institution_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target REAL NOT NULL,
    current REAL DEFAULT 0,
    icon TEXT DEFAULT '🎯',
    color TEXT DEFAULT '#6366f1',
    deadline TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    limit_amount REAL NOT NULL,
    color TEXT DEFAULT '#6366f1',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ─── PLAID CLIENT ─────────────────────────────────────────────────────────────

const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || "development"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});
const plaid = new PlaidApi(plaidConfig);

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_change_me");
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

// POST /auth/signup
app.post("/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });
  if (password.length < 6) return res.status(400).json({ error: "Password too short" });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) return res.status(400).json({ error: "Email already registered" });

  const hashed = await bcrypt.hash(password, 10);
  const id = `uid_${Date.now()}`;
  db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)").run(id, name, email.toLowerCase(), hashed);

  // Seed default budget categories
  const defaultBudgets = [
    { name: "Housing", limit: 1600, color: "#6366f1" },
    { name: "Food", limit: 500, color: "#8b5cf6" },
    { name: "Transport", limit: 200, color: "#00d4ff" },
    { name: "Entertainment", limit: 150, color: "#f59e0b" },
    { name: "Shopping", limit: 200, color: "#ef4444" },
  ];
  const insertBudget = db.prepare("INSERT INTO budgets (id, user_id, name, limit_amount, color) VALUES (?, ?, ?, ?, ?)");
  defaultBudgets.forEach(b => insertBudget.run(`bgt_${Date.now()}_${Math.random()}`, id, b.name, b.limit, b.color));

  const token = jwt.sign({ id, name, email }, process.env.JWT_SECRET || "dev_secret_change_me", { expiresIn: "30d" });
  res.json({ token, user: { id, name, email } });
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email?.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET || "dev_secret_change_me", { expiresIn: "30d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// ─── PLAID ROUTES ─────────────────────────────────────────────────────────────

// POST /plaid/link-token — creates a Plaid Link token to open the UI
app.post("/plaid/link-token", auth, async (req, res) => {
  try {
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: req.user.id },
      client_name: "FinTrack Pro",
      products: ["transactions", "investments"],
      country_codes: ["US"],
      language: "en",
    });
    res.json({ link_token: response.data.link_token });
  } catch (e) {
    console.error("Plaid link token error:", e.response?.data || e.message);
    res.status(500).json({ error: "Failed to create link token" });
  }
});

// POST /plaid/exchange — exchange public token for access token after user links bank
app.post("/plaid/exchange", auth, async (req, res) => {
  const { public_token, institution_name } = req.body;
  try {
    const response = await plaid.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = response.data;
    const id = `item_${Date.now()}`;
    db.prepare("INSERT INTO plaid_items (id, user_id, access_token, item_id, institution_name) VALUES (?, ?, ?, ?, ?)")
      .run(id, req.user.id, access_token, item_id, institution_name || "Bank");
    res.json({ success: true, institution: institution_name });
  } catch (e) {
    console.error("Plaid exchange error:", e.response?.data || e.message);
    res.status(500).json({ error: "Failed to link account" });
  }
});

// GET /plaid/accounts — fetch all real accounts across linked banks
app.get("/plaid/accounts", auth, async (req, res) => {
  const items = db.prepare("SELECT * FROM plaid_items WHERE user_id = ?").all(req.user.id);
  const allAccounts = [];
  for (const item of items) {
    try {
      const r = await plaid.accountsGet({ access_token: item.access_token });
      r.data.accounts.forEach(a => allAccounts.push({
        id: a.account_id,
        name: a.name,
        official_name: a.official_name,
        type: a.type,
        subtype: a.subtype,
        balance: a.balances.current,
        available: a.balances.available,
        institution: item.institution_name,
        currency: a.balances.iso_currency_code,
      }));
    } catch (e) { console.error("Accounts fetch error:", e.message); }
  }
  res.json(allAccounts);
});

// GET /plaid/transactions — fetch last 90 days of transactions
app.get("/plaid/transactions", auth, async (req, res) => {
  const items = db.prepare("SELECT * FROM plaid_items WHERE user_id = ?").all(req.user.id);
  const allTx = [];
  const end = new Date().toISOString().split("T")[0];
  const start = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

  for (const item of items) {
    try {
      const r = await plaid.transactionsGet({
        access_token: item.access_token,
        start_date: start,
        end_date: end,
        options: { count: 250 },
      });
      r.data.transactions.forEach(t => allTx.push({
        id: t.transaction_id,
        merchant: t.merchant_name || t.name,
        category: t.personal_finance_category?.primary || t.category?.[0] || "Other",
        amount: -t.amount, // Plaid uses negative for credits, flip for display
        date: t.date,
        account_id: t.account_id,
        logo: t.logo_url,
        pending: t.pending,
      }));
    } catch (e) { console.error("Transactions fetch error:", e.message); }
  }
  allTx.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(allTx);
});

// GET /plaid/investments — fetch investment holdings (Robinhood, brokerage, etc)
app.get("/plaid/investments", auth, async (req, res) => {
  const items = db.prepare("SELECT * FROM plaid_items WHERE user_id = ?").all(req.user.id);
  const allHoldings = [];

  for (const item of items) {
    try {
      const r = await plaid.investmentsHoldingsGet({ access_token: item.access_token });
      const securities = r.data.securities.reduce((m, s) => { m[s.security_id] = s; return m; }, {});
      r.data.holdings.forEach(h => {
        const sec = securities[h.security_id];
        allHoldings.push({
          ticker: sec?.ticker_symbol || sec?.name?.slice(0, 5) || "N/A",
          name: sec?.name || "Unknown",
          shares: h.quantity,
          price: h.institution_price,
          value: h.institution_value,
          cost_basis: h.cost_basis,
          change_pct: h.institution_price && h.cost_basis
            ? (((h.institution_price - h.cost_basis / h.quantity) / (h.cost_basis / h.quantity)) * 100).toFixed(2)
            : 0,
          type: sec?.type,
        });
      });
    } catch (e) { console.error("Investments fetch error:", e.message); }
  }
  res.json(allHoldings);
});

// GET /plaid/linked-banks — list connected institutions
app.get("/plaid/linked-banks", auth, (req, res) => {
  const items = db.prepare("SELECT id, institution_name, created_at FROM plaid_items WHERE user_id = ?").all(req.user.id);
  res.json(items);
});

// DELETE /plaid/unlink/:id — remove a linked bank
app.delete("/plaid/unlink/:id", auth, async (req, res) => {
  const item = db.prepare("SELECT * FROM plaid_items WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  try {
    await plaid.itemRemove({ access_token: item.access_token });
  } catch {}
  db.prepare("DELETE FROM plaid_items WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ─── GOALS ROUTES ─────────────────────────────────────────────────────────────

app.get("/goals", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM goals WHERE user_id = ?").all(req.user.id));
});

app.post("/goals", auth, (req, res) => {
  const { name, target, current, icon, color, deadline } = req.body;
  const id = `goal_${Date.now()}`;
  db.prepare("INSERT INTO goals (id, user_id, name, target, current, icon, color, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, req.user.id, name, target, current || 0, icon || "🎯", color || "#6366f1", deadline || null);
  res.json({ id, name, target, current: current || 0, icon, color, deadline });
});

app.patch("/goals/:id", auth, (req, res) => {
  const { current, name, target } = req.body;
  const goal = db.prepare("SELECT * FROM goals WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!goal) return res.status(404).json({ error: "Not found" });
  db.prepare("UPDATE goals SET current = COALESCE(?, current), name = COALESCE(?, name), target = COALESCE(?, target) WHERE id = ?")
    .run(current ?? null, name ?? null, target ?? null, req.params.id);
  res.json({ success: true });
});

app.delete("/goals/:id", auth, (req, res) => {
  db.prepare("DELETE FROM goals WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ success: true });
});

// ─── BUDGET ROUTES ────────────────────────────────────────────────────────────

app.get("/budgets", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM budgets WHERE user_id = ?").all(req.user.id));
});

app.patch("/budgets/:id", auth, (req, res) => {
  const { limit_amount } = req.body;
  db.prepare("UPDATE budgets SET limit_amount = ? WHERE id = ? AND user_id = ?").run(limit_amount, req.params.id, req.user.id);
  res.json({ success: true });
});

// ─── START ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ FinTrack Pro backend running on port ${PORT}`));
