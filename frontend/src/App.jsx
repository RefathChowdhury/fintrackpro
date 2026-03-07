import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Change this to your deployed backend URL when on Render
const API = process.env.REACT_APP_API_URL || "http://localhost:4000";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);
const fmtK = (n) => `$${Math.abs(n) >= 1000 ? (n / 1000).toFixed(0) + "k" : n}`;

const apiFetch = async (path, options = {}, token) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

const CATEGORY_COLORS = {
  FOOD_AND_DRINK: "#8b5cf6", TRANSFER_IN: "#10b981", TRANSFER_OUT: "#ef4444",
  TRANSPORTATION: "#00d4ff", ENTERTAINMENT: "#f59e0b", SHOPPING: "#6366f1",
  RENT_AND_UTILITIES: "#ec4899", MEDICAL: "#14b8a6", INCOME: "#10b981",
  GENERAL_MERCHANDISE: "#f97316", Other: "#4b5563",
};

const formatCategory = (cat) => cat?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Other";

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ fontSize: 12, color: "#4b5563", display: "block", marginBottom: 5 }}>{label}</label>}
    <input {...props} style={{ width: "100%", background: "#1e2535", border: "1px solid #2d3748", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", WebkitAppearance: "none", ...(props.style || {}) }} />
  </div>
);

const Btn = ({ children, variant = "primary", small, ...props }) => (
  <button {...props} style={{
    width: small ? "auto" : "100%", padding: small ? "8px 16px" : "13px",
    borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 700,
    fontSize: small ? 13 : 14, fontFamily: "inherit",
    background: variant === "primary" ? "linear-gradient(135deg,#6366f1,#00d4ff)"
      : variant === "danger" ? "#ef444422" : "#1e2535",
    color: variant === "danger" ? "#ef4444" : "#fff",
    marginBottom: small ? 0 : 8, opacity: props.disabled ? 0.5 : 1,
    ...(props.style || {})
  }}>{children}</button>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 1000, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
    <div style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, margin: "0 auto", padding: 24, paddingBottom: 44, maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "#1e2535", border: "none", color: "#8892a4", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const Card = ({ children, style }) => (
  <div style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 16, padding: 18, ...style }}>{children}</div>
);

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 10, padding: "8px 13px" }}>
      <p style={{ color: "#4b5563", fontSize: 11, marginBottom: 3 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color, fontSize: 12, fontWeight: 600 }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────

const LoginScreen = ({ onLogin }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true); setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/signup";
      const data = await apiFetch(path, { method: "POST", body: form });
      localStorage.setItem("fintrackpro_token", data.token);
      onLogin(data.token, data.user);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080b12", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap'); * { box-sizing:border-box; margin:0; padding:0; } input::placeholder { color:#2d3748; } input:focus { border-color:#6366f1!important; outline:none; }`}</style>
      <div style={{ marginBottom: 36, textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: "linear-gradient(135deg,#6366f1,#00d4ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 14px" }}>◈</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>FinTrack Pro</div>
        <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>Personal Finance OS — powered by Plaid</div>
      </div>

      <div style={{ width: "100%", maxWidth: 380, background: "#0d1117", border: "1px solid #1e2535", borderRadius: 20, padding: 26 }}>
        <div style={{ display: "flex", background: "#1e2535", borderRadius: 11, padding: 4, marginBottom: 22 }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit", background: mode === m ? "#6366f1" : "transparent", color: mode === m ? "#fff" : "#4b5563", transition: "all 0.2s" }}>
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>
        {mode === "signup" && <Input label="Full Name" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />}
        <Input label="Email" type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        {error && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 10, textAlign: "center" }}>{error}</p>}
        <Btn onClick={handle} disabled={loading}>{loading ? "Loading..." : mode === "login" ? "Sign In →" : "Create Account →"}</Btn>
      </div>
      <p style={{ color: "#1e2535", fontSize: 11, marginTop: 24 }}>📱 Safari → Share → Add to Home Screen</p>
    </div>
  );
};

// ─── PLAID LINK BUTTON ────────────────────────────────────────────────────────

const PlaidLinkButton = ({ token, onSuccess }) => {
  const openPlaid = useCallback(() => {
    if (!window.Plaid) { alert("Plaid not loaded. Check your internet connection."); return; }
    const handler = window.Plaid.create({
      token,
      onSuccess: (public_token, metadata) => onSuccess(public_token, metadata.institution?.name),
      onExit: (err) => { if (err) console.error("Plaid exit error:", err); },
    });
    handler.open();
  }, [token, onSuccess]);

  return (
    <Btn onClick={openPlaid} style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
      🏦 Link Bank / Brokerage Account
    </Btn>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", icon: "⬡", label: "Overview" },
  { id: "accounts", icon: "🏦", label: "Accounts" },
  { id: "transactions", icon: "↕", label: "Activity" },
  { id: "budget", icon: "◎", label: "Budget" },
  { id: "investments", icon: "📈", label: "Invest" },
  { id: "goals", icon: "🎯", label: "Goals" },
];

const MainApp = ({ token, user, onLogout }) => {
  const [tab, setTab] = useState("overview");
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [linkedBanks, setLinkedBanks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [manualAccounts, setManualAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`fintrackpro_manual_${user.id}`) || "[]"); } catch { return []; }
  });

  const saveManualAccounts = (accts) => {
    setManualAccounts(accts);
    localStorage.setItem(`fintrackpro_manual_${user.id}`, JSON.stringify(accts));
  };

  const handleAddManualAccount = () => {
    if (!form.name || !form.balance) return;
    const acct = {
      id: `manual_${Date.now()}`,
      name: form.name,
      type: form.type || "credit",
      subtype: form.type || "credit card",
      balance: parseFloat(form.balance),
      institution: "Manual",
      manual: true,
      color: "#f59e0b",
    };
    saveManualAccounts([...manualAccounts, acct]);
    setModal(null); setForm({});
  };

  const handleUpdateManualAccount = (id, newBalance) => {
    const updated = manualAccounts.map(a => a.id === id ? { ...a, balance: parseFloat(newBalance) } : a);
    saveManualAccounts(updated);
  };

  const handleDeleteManualAccount = (id) => {
    saveManualAccounts(manualAccounts.filter(a => a.id !== id));
  };

  const api = useCallback((path, opts) => apiFetch(path, opts, token), [token]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [accts, txs, invs, banks, gs, bgs] = await Promise.all([
        api("/plaid/accounts").catch(() => []),
        api("/plaid/transactions").catch(() => []),
        api("/plaid/investments").catch(() => []),
        api("/plaid/linked-banks").catch(() => []),
        api("/goals").catch(() => []),
        api("/budgets").catch(() => []),
      ]);
      setAccounts(accts); setTransactions(txs); setInvestments(invs);
      setLinkedBanks(banks); setGoals(gs); setBudgets(bgs);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [api]);

  const getLinkToken = useCallback(async () => {
    try { const d = await api("/plaid/link-token", { method: "POST" }); setLinkToken(d.link_token); }
    catch (e) { console.error("Link token:", e); }
  }, [api]);

  useEffect(() => { loadAll(); getLinkToken(); }, [loadAll, getLinkToken]);

  const handlePlaidSuccess = async (public_token, institution_name) => {
    try {
      await api("/plaid/exchange", { method: "POST", body: { public_token, institution_name } });
      await loadAll(); await getLinkToken();
      alert(`✅ ${institution_name} linked successfully! Your real data is now loading.`);
    } catch (e) { alert("Failed to link account: " + e.message); }
  };

  const handleUnlink = async (id, name) => {
    if (!window.confirm(`Unlink ${name}?`)) return;
    await api(`/plaid/unlink/${id}`, { method: "DELETE" });
    await loadAll();
  };

  const handleAddGoal = async () => {
    try {
      const g = await api("/goals", { method: "POST", body: { name: form.name, target: parseFloat(form.target), current: parseFloat(form.current || 0), icon: form.icon || "🎯", color: "#6366f1" } });
      setGoals(gs => [...gs, g]); setModal(null); setForm({});
    } catch (e) { alert(e.message); }
  };

  const handleGoalUpdate = async (id, current) => {
    await api(`/goals/${id}`, { method: "PATCH", body: { current: parseFloat(current) } });
    setGoals(gs => gs.map(g => g.id === id ? { ...g, current: parseFloat(current) } : g));
  };

  const handleDeleteGoal = async (id) => {
    await api(`/goals/${id}`, { method: "DELETE" });
    setGoals(gs => gs.filter(g => g.id !== id));
  };

  // Derived data
  const allAccounts = [...accounts, ...manualAccounts];
  const netWorth = allAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const monthlyIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  const spendByCategory = [...new Set(transactions.filter(t => t.amount < 0).map(t => t.category))].map(cat => ({
    name: formatCategory(cat), value: Math.abs(transactions.filter(t => t.category === cat && t.amount < 0).reduce((s, t) => s + t.amount, 0)),
    color: CATEGORY_COLORS[cat] || "#6366f1",
  })).sort((a, b) => b.value - a.value).slice(0, 8);

  // Group transactions by month for chart
  const monthlyFlow = (() => {
    const map = {};
    transactions.forEach(t => {
      const m = t.date?.slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: new Date(m + "-01").toLocaleString("en", { month: "short" }), income: 0, expenses: 0 };
      if (t.amount > 0) map[m].income += t.amount;
      else map[m].expenses += Math.abs(t.amount);
    });
    return Object.values(map).slice(-6);
  })();

  const S = {
    card: { background: "#0d1117", border: "1px solid #1e2535", borderRadius: 16, padding: 18 },
    label: { fontSize: 11, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500 },
    mono: { fontFamily: "'DM Mono'", fontWeight: 700, letterSpacing: "-0.02em" },
    sec: { fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 14 },
  };

  const noData = linkedBanks.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#080b12", fontFamily: "'DM Sans',sans-serif", color: "#e2e8f0", paddingBottom: 90 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap'); * { box-sizing:border-box; } ::-webkit-scrollbar { width:3px; } ::-webkit-scrollbar-thumb { background:#1e2535; border-radius:4px; } input,select { -webkit-appearance:none; } input:focus,select:focus { outline:2px solid #6366f1; }`}</style>

      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e2535", position: "sticky", top: 0, zIndex: 50, background: "#080b12", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#00d4ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◈</div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>FinTrack Pro</div>
          {linkedBanks.length > 0 && <span style={{ fontSize: 10, background: "#10b98122", color: "#10b981", border: "1px solid #10b98133", borderRadius: 10, padding: "2px 7px" }}>LIVE</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#4b5563" }}>Net Worth</div>
            <div style={{ ...S.mono, fontSize: 16, color: "#00d4ff" }}>{loading ? "—" : fmt(netWorth)}</div>
          </div>
          <div onClick={() => setModal("profile")} style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>
            {user.name[0].toUpperCase()}
          </div>
        </div>
      </div>

      {/* No banks linked banner */}
      {noData && !loading && (
        <div style={{ margin: "16px 16px 0", background: "#6366f111", border: "1px solid #6366f133", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>👋 Welcome, {user.name}!</div>
          <p style={{ fontSize: 13, color: "#8892a4", marginBottom: 14, lineHeight: 1.5 }}>Link your Chase, Robinhood, or any bank account to see your real financial data here.</p>
          {linkToken && <PlaidLinkButton token={linkToken} onSuccess={handlePlaidSuccess} />}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "18px 16px" }}>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                { label: "Net Worth", val: fmt(netWorth), color: "#00d4ff" },
                { label: "Saved This Month", val: fmt(monthlyIncome - monthlyExpenses), color: "#10b981" },
                { label: "Income (90d)", val: fmt(monthlyIncome), color: "#8b5cf6" },
                { label: "Expenses (90d)", val: fmt(monthlyExpenses), color: "#ef4444" },
              ].map((s, i) => (
                <Card key={i}>
                  <div style={S.label}>{s.label}</div>
                  <div style={{ ...S.mono, fontSize: 17, color: s.color, marginTop: 6 }}>{loading ? "—" : s.val}</div>
                </Card>
              ))}
            </div>

            {monthlyFlow.length > 0 && (
              <Card style={{ marginBottom: 12 }}>
                <div style={S.sec}>Monthly Cash Flow</div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={monthlyFlow} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
                    <XAxis dataKey="month" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {spendByCategory.length > 0 && (
              <Card>
                <div style={S.sec}>Spending by Category</div>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={spendByCategory} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {spendByCategory.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {spendByCategory.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#8892a4" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, display: "inline-block" }} />
                      {c.name}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── ACCOUNTS ── */}
        {tab === "accounts" && (
          <>
            {allAccounts.map((a, i) => (
              <Card key={i} style={{ marginBottom: 10, borderLeft: `3px solid ${a.balance < 0 ? "#ef4444" : "#10b981"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={S.label}>{a.institution} · {a.subtype || a.type}{a.manual ? " · Manual" : ""}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>{a.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...S.mono, fontSize: 20, color: a.balance < 0 ? "#ef4444" : "#00d4ff" }}>{fmt(a.balance)}</div>
                    {a.available != null && <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>Available: {fmt(a.available)}</div>}
                    {a.manual && (
                      <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
                        <input type="number" defaultValue={a.balance} style={{ width: 90, background: "#1e2535", border: "1px solid #2d3748", borderRadius: 7, padding: "4px 8px", color: "#e2e8f0", fontSize: 12, fontFamily: "inherit" }}
                          onBlur={e => e.target.value !== "" && handleUpdateManualAccount(a.id, e.target.value)} />
                        <button onClick={() => handleDeleteManualAccount(a.id)} style={{ background: "#ef444422", border: "1px solid #ef444444", color: "#ef4444", borderRadius: 7, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {allAccounts.length === 0 && !loading && <p style={{ color: "#4b5563", fontSize: 13, textAlign: "center", padding: "30px 0" }}>No accounts linked yet.</p>}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {linkToken && <PlaidLinkButton token={linkToken} onSuccess={handlePlaidSuccess} />}
              <Btn variant="ghost" onClick={() => { setForm({ type: "credit" }); setModal("add_manual"); }}>+ Add Manual Account (e.g. Discover)</Btn>
            </div>
            {linkedBanks.length > 0 && (
              <Card style={{ marginTop: 12 }}>
                <div style={S.sec}>Linked Institutions</div>
                {linkedBanks.map(b => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e253540" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{b.institution_name}</div>
                      <div style={{ fontSize: 11, color: "#4b5563" }}>Linked {new Date(b.created_at).toLocaleDateString()}</div>
                    </div>
                    <Btn small variant="danger" onClick={() => handleUnlink(b.id, b.institution_name)}>Unlink</Btn>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}

        {/* ── TRANSACTIONS ── */}
        {tab === "transactions" && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={S.sec}>All Activity</div>
              <span style={{ fontSize: 11, color: "#4b5563" }}>{transactions.length} transactions · 90 days</span>
            </div>
            {transactions.slice(0, 100).map((tx, i) => (
              <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: i < transactions.length - 1 ? "1px solid #1e253550" : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#1e2535", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                  {tx.logo ? <img src={tx.logo} alt="" style={{ width: 24, height: 24, borderRadius: 6 }} /> : "💳"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.merchant}</div>
                  <div style={{ fontSize: 11, color: "#4b5563", marginTop: 1 }}>{tx.date} · {formatCategory(tx.category)}</div>
                </div>
                <div style={{ ...S.mono, fontSize: 13, color: tx.amount > 0 ? "#10b981" : "#e2e8f0", flexShrink: 0 }}>
                  {tx.amount > 0 ? "+" : ""}{fmt(tx.amount)}
                </div>
              </div>
            ))}
            {transactions.length === 0 && !loading && <p style={{ color: "#4b5563", fontSize: 13, textAlign: "center", padding: "30px 0" }}>No transactions yet. Link a bank account to see real data.</p>}
          </Card>
        )}

        {/* ── BUDGET ── */}
        {tab === "budget" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <Card><div style={S.label}>Total Budgeted</div><div style={{ ...S.mono, fontSize: 17, color: "#8892a4", marginTop: 6 }}>{fmt(budgets.reduce((s, b) => s + b.limit_amount, 0))}</div></Card>
              <Card><div style={S.label}>Spent</div><div style={{ ...S.mono, fontSize: 17, color: "#ef4444", marginTop: 6 }}>{fmt(monthlyExpenses)}</div></Card>
            </div>
            <Card>
              <div style={S.sec}>Category Breakdown</div>
              {budgets.map((b, i) => {
                const spent = Math.abs(transactions.filter(t => formatCategory(t.category).toLowerCase().includes(b.name.toLowerCase()) && t.amount < 0).reduce((s, t) => s + t.amount, 0));
                const pct = b.limit_amount > 0 ? Math.min((spent / b.limit_amount) * 100, 100) : 0;
                const over = spent > b.limit_amount;
                return (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{b.name}</span>
                      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <span style={{ ...S.mono, fontSize: 13, color: over ? "#ef4444" : "#e2e8f0" }}>{fmt(spent)}</span>
                        <span style={{ fontSize: 11, color: "#4b5563" }}>/ {fmt(b.limit_amount)}</span>
                      </div>
                    </div>
                    <div style={{ height: 7, background: "#1e2535", borderRadius: 20 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: over ? "#ef4444" : b.color, borderRadius: 20 }} />
                    </div>
                  </div>
                );
              })}
            </Card>
          </>
        )}

        {/* ── INVESTMENTS ── */}
        {tab === "investments" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <Card><div style={S.label}>Portfolio Value</div><div style={{ ...S.mono, fontSize: 17, color: "#6366f1", marginTop: 6 }}>{fmt(investments.reduce((s, i) => s + i.value, 0))}</div></Card>
              <Card><div style={S.label}>Holdings</div><div style={{ ...S.mono, fontSize: 17, color: "#00d4ff", marginTop: 6 }}>{investments.length}</div></Card>
            </div>
            <Card>
              <div style={S.sec}>Holdings</div>
              {investments.map((inv, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: i < investments.length - 1 ? "1px solid #1e253550" : "none" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#1e2535", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono'", fontSize: 10, fontWeight: 700, color: "#6366f1", flexShrink: 0 }}>{inv.ticker?.slice(0, 5)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{inv.name}</div>
                    <div style={{ fontSize: 11, color: "#4b5563", marginTop: 1 }}>{inv.shares?.toFixed(4)} shares @ {fmt(inv.price)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...S.mono, fontSize: 13 }}>{fmt(inv.value)}</div>
                    {inv.change_pct != null && <div style={{ fontSize: 11, color: parseFloat(inv.change_pct) >= 0 ? "#10b981" : "#ef4444", marginTop: 2 }}>{parseFloat(inv.change_pct) >= 0 ? "+" : ""}{inv.change_pct}%</div>}
                  </div>
                </div>
              ))}
              {investments.length === 0 && !loading && <p style={{ color: "#4b5563", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Link a brokerage account (Robinhood, Fidelity) to see holdings.</p>}
            </Card>
          </>
        )}

        {/* ── GOALS ── */}
        {tab === "goals" && (
          <>
            {goals.map((g) => {
              const pct = Math.min((g.current / g.target) * 100, 100);
              return (
                <Card key={g.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 22 }}>{g.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: "#4b5563" }}>{pct.toFixed(0)}% complete</div>
                    </div>
                    <Btn small variant="danger" onClick={() => handleDeleteGoal(g.id)}>✕</Btn>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                    <span style={{ ...S.mono, fontSize: 18, color: g.color || "#6366f1" }}>{fmt(g.current)}</span>
                    <span style={{ fontSize: 12, color: "#4b5563", alignSelf: "flex-end" }}>/ {fmt(g.target)}</span>
                  </div>
                  <div style={{ height: 7, background: "#1e2535", borderRadius: 20, marginBottom: 12 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: g.color || "#6366f1", borderRadius: 20 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="number" defaultValue={g.current} style={{ flex: 1, background: "#1e2535", border: "1px solid #2d3748", borderRadius: 9, padding: "8px 12px", color: "#e2e8f0", fontSize: 13, fontFamily: "inherit" }}
                      onBlur={e => e.target.value && handleGoalUpdate(g.id, e.target.value)} />
                    <span style={{ alignSelf: "center", fontSize: 12, color: "#4b5563" }}>Update amount</span>
                  </div>
                </Card>
              );
            })}
            <Btn onClick={() => { setForm({}); setModal("add_goal"); }}>+ New Savings Goal</Btn>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0d1117", borderTop: "1px solid #1e2535", display: "flex", padding: "8px 0 20px", zIndex: 50 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
            <span style={{ fontSize: 17 }}>{t.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 600, fontFamily: "inherit", color: tab === t.id ? "#00d4ff" : "#2d3748", letterSpacing: "0.04em" }}>{t.label}</span>
            {tab === t.id && <span style={{ width: 14, height: 2, background: "#00d4ff", borderRadius: 2 }} />}
          </button>
        ))}
      </nav>

      {/* Modals */}
      {modal === "add_manual" && (
        <Modal title="Add Manual Account" onClose={() => setModal(null)}>
          <p style={{ fontSize: 13, color: "#8892a4", marginBottom: 16, lineHeight: 1.5 }}>
            Use this for accounts that cannot connect via Plaid like Discover. You can update the balance manually anytime.
          </p>
          <Input label="Account Name" placeholder="e.g. Discover Student Card" value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Current Balance ($)" type="number" placeholder="-450.00 (use negative for credit card debt)" value={form.balance || ""} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#4b5563", display: "block", marginBottom: 5 }}>Account Type</label>
            <select value={form.type || "credit"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: "100%", background: "#1e2535", border: "1px solid #2d3748", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit" }}>
              <option value="credit">Credit Card</option>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="loan">Loan</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Btn onClick={handleAddManualAccount}>Add Account</Btn>
        </Modal>
      )}

      {modal === "add_goal" && (
        <Modal title="New Savings Goal" onClose={() => setModal(null)}>
          <Input label="Goal Name" placeholder="e.g. Emergency Fund" value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Target Amount ($)" type="number" placeholder="10000" value={form.target || ""} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
          <Input label="Current Amount ($)" type="number" placeholder="0" value={form.current || ""} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
          <Input label="Icon (emoji)" placeholder="🎯" value={form.icon || ""} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
          <Btn onClick={handleAddGoal}>Create Goal</Btn>
        </Modal>
      )}

      {modal === "profile" && (
        <Modal title="Your Account" onClose={() => setModal(null)}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, margin: "0 auto 12px" }}>{user.name[0].toUpperCase()}</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: "#4b5563", marginTop: 3 }}>{user.email}</div>
          </div>
          <div style={{ background: "#1e2535", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}>Linked Banks</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#00d4ff" }}>{linkedBanks.length}</div>
          </div>
          <Btn variant="ghost" onClick={() => { localStorage.removeItem("fintrackpro_token"); onLogout(); }}>Sign Out</Btn>
        </Modal>
      )}
    </div>
  );
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("fintrackpro_token");
    if (t) {
      try {
        const payload = JSON.parse(atob(t.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) { setToken(t); setUser({ id: payload.id, name: payload.name, email: payload.email }); }
        else localStorage.removeItem("fintrackpro_token");
      } catch { localStorage.removeItem("fintrackpro_token"); }
    }
  }, []);

  if (!token) return <LoginScreen onLogin={(t, u) => { setToken(t); setUser(u); }} />;
  return <MainApp token={token} user={user} onLogout={() => { setToken(null); setUser(null); }} />;
}