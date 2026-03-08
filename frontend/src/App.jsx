import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const API = process.env.REACT_APP_API_URL || "http://localhost:4000";
const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n || 0);
const fmtK = (n) => Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

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

const CATEGORY_META = {
  FOOD_AND_DRINK: { label: "Food & Dining", color: "#f59e0b", icon: "🍽️" },
  TRANSFER_IN: { label: "Transfer In", color: "#10b981", icon: "↙️" },
  TRANSFER_OUT: { label: "Transfer Out", color: "#ef4444", icon: "↗️" },
  TRANSPORTATION: { label: "Travel", color: "#3b82f6", icon: "✈️" },
  ENTERTAINMENT: { label: "Entertainment", color: "#a855f7", icon: "🎬" },
  SHOPPING: { label: "Shopping", color: "#ec4899", icon: "🛍️" },
  RENT_AND_UTILITIES: { label: "Bills & Utilities", color: "#6b7280", icon: "⚡" },
  MEDICAL: { label: "Medical", color: "#14b8a6", icon: "🏥" },
  INCOME: { label: "Income", color: "#10b981", icon: "💰" },
  GENERAL_MERCHANDISE: { label: "Shopping", color: "#ec4899", icon: "🛍️" },
  SUBSCRIPTION: { label: "Subscriptions", color: "#06b6d4", icon: "🔄" },
  Other: { label: "Other", color: "#374151", icon: "📦" },
};
const getCatMeta = (cat) => CATEGORY_META[cat] || CATEGORY_META.Other;
const formatCategory = (cat) => getCatMeta(cat).label;

// ─── SHARED UI ────────────────────────────────────────────────────────────────

const GlowCard = ({ children, style, onClick, glow }) => (
  <div onClick={onClick} style={{
    background: "#111318", border: "1px solid #1f2330", borderRadius: 20,
    padding: 18, position: "relative", overflow: "hidden",
    cursor: onClick ? "pointer" : "default",
    boxShadow: glow ? `0 0 30px ${glow}22` : "none",
    ...(style || {})
  }}>{children}</div>
);

const Chip = ({ active, onClick, children, color }) => (
  <button onClick={onClick} style={{
    padding: "7px 16px", borderRadius: 50, border: "none", cursor: "pointer",
    fontFamily: "inherit", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
    background: active ? (color || "#1db954") : "#1a1d25",
    color: active ? "#000" : "#6b7280",
    transition: "all 0.2s",
  }}>{children}</button>
);

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 5, fontWeight: 500 }}>{label}</label>}
    <input {...props} style={{ width: "100%", background: "#1a1d25", border: "1px solid #1f2330", borderRadius: 12, padding: "12px 16px", color: "#f1f5f9", fontSize: 14, fontFamily: "inherit", outline: "none", WebkitAppearance: "none", ...(props.style || {}) }} />
  </div>
);

const Btn = ({ children, variant = "primary", small, ...props }) => (
  <button {...props} style={{
    width: small ? "auto" : "100%", padding: small ? "8px 16px" : "14px",
    borderRadius: 14, border: "none", cursor: "pointer", fontWeight: 700,
    fontSize: small ? 12 : 14, fontFamily: "inherit",
    background: variant === "primary" ? "#1db954"
      : variant === "danger" ? "#ef444420" : "#1a1d25",
    color: variant === "danger" ? "#ef4444" : variant === "primary" ? "#000" : "#f1f5f9",
    marginBottom: small ? 0 : 8, opacity: props.disabled ? 0.5 : 1,
    ...(props.style || {})
  }}>{children}</button>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 1000, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
    <div style={{ background: "#0c0e14", border: "1px solid #1f2330", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 500, margin: "0 auto", padding: 24, paddingBottom: 44, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
      <div style={{ width: 36, height: 4, background: "#1f2330", borderRadius: 2, margin: "0 auto 20px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <h3 style={{ color: "#f1f5f9", fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "#1a1d25", border: "none", color: "#6b7280", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#111318", border: "1px solid #1f2330", borderRadius: 12, padding: "10px 14px" }}>
      <p style={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 700, margin: 0 }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

// ─── CIRCULAR PROGRESS ───────────────────────────────────────────────────────
const CircleProgress = ({ pct, color = "#1db954", size = 60, strokeWidth = 5, children }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2330" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
};

// ─── CREDIT CARD VISUAL ──────────────────────────────────────────────────────
const CreditCardVisual = ({ name, last4, balance, network = "Visa" }) => {
  const colors = [
    ["#1a3a5c", "#2d6a9f"], ["#2d1a5c", "#6a2d9f"], ["#1a5c2d", "#2d9f6a"], ["#5c1a1a", "#9f2d2d"]
  ];
  const [c1, c2] = colors[Math.abs((name || "").charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      minWidth: 220, height: 130, borderRadius: 18,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      padding: 18, display: "flex", flexDirection: "column",
      justifyContent: "space-between", flexShrink: 0,
      boxShadow: "0 8px 32px #00000066",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, opacity: 0.8 }}>
          {[0,1,2,3].map(i => <div key={i} style={{ width: 14, height: 10, background: "#ffffff44", borderRadius: 2 }} />)}
        </div>
        <span style={{ fontSize: 12, color: "#ffffffbb", fontWeight: 600 }}>{network}</span>
      </div>
      <div>
        <div style={{ fontSize: 13, color: "#ffffffaa", marginBottom: 2 }}>{name}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span style={{ fontSize: 12, color: "#ffffffbb", letterSpacing: 2 }}>•••• {last4 || "----"}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{fmt(Math.abs(balance || 0))}</span>
        </div>
        <div style={{ height: 2, background: "#ffffff33", borderRadius: 1, marginTop: 8 }} />
      </div>
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
    <div style={{ minHeight: "100vh", background: "#080a10", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap'); * { box-sizing:border-box; margin:0; padding:0; }`}</style>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#1db954,#0a8f3d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px", boxShadow: "0 0 40px #1db95440" }}>◈</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.03em" }}>FinTrack Pro</div>
          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 6 }}>Your financial life, simplified</div>
        </div>
        <div style={{ display: "flex", background: "#111318", borderRadius: 14, padding: 4, marginBottom: 24 }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "10px", borderRadius: 11, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, background: mode === m ? "#1db954" : "none", color: mode === m ? "#000" : "#6b7280", transition: "all 0.2s" }}>
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>
        {mode === "signup" && <Input label="Full Name" placeholder="Refath Chowdhury" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />}
        <Input label="Email" type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          onKeyDown={e => e.key === "Enter" && handle()} />
        {error && <div style={{ background: "#ef444420", border: "1px solid #ef444440", borderRadius: 10, padding: "10px 14px", color: "#ef4444", fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <Btn onClick={handle} disabled={loading}>{loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}</Btn>
      </div>
    </div>
  );
};

// ─── PLAID LINK ───────────────────────────────────────────────────────────────
const PlaidLinkButton = ({ token, onSuccess, label = "🏦 Link Bank / Brokerage Account" }) => {
  const openPlaid = useCallback(() => {
    if (!window.Plaid) { alert("Plaid not loaded."); return; }
    const handler = window.Plaid.create({
      token, onSuccess: (pt, meta) => onSuccess(pt, meta.institution?.name),
      onExit: (err) => { if (err) console.error("Plaid exit:", err); },
    });
    handler.open();
  }, [token, onSuccess]);
  return <Btn onClick={openPlaid} style={{ background: "#1db954", color: "#000" }}>{label}</Btn>;
};

// ─── AI CHAT TAB ─────────────────────────────────────────────────────────────
const AITab = ({ accounts, transactions, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const totalSpent = Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const txCount = transactions.length;
  const cardCount = accounts.filter(a => a.type === "credit").length;

  const suggestions = [
    "How much did I spend this month?",
    "What's my biggest expense category?",
    "Am I saving enough money?",
    "What subscriptions am I paying for?",
  ];

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const context = `You are a personal financial AI assistant for ${user.name}. 
Here is their financial data:
- Total spent (last 90 days): ${fmt(totalSpent)}
- Number of transactions: ${txCount}
- Number of credit cards: ${cardCount}
- Accounts: ${accounts.map(a => `${a.name} (${a.type}): ${fmt(a.balance)}`).join(", ")}
- Recent transactions: ${transactions.slice(0, 20).map(t => `${t.merchant}: ${fmt(t.amount)} on ${t.date} (${formatCategory(t.category)})`).join(", ")}

Answer the user's question concisely and helpfully. Be specific with numbers from their data. Keep responses under 3 sentences unless they need more detail.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: context,
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "I couldn't process that. Try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I had trouble connecting. Please try again." }]);
    }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
      {messages.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 20px", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 16, boxShadow: "0 0 40px #6366f140" }}>🧠</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", marginBottom: 8 }}>Hey there</div>
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 6, lineHeight: 1.6 }}>Ask me anything about your finances. I have access to all your accounts and transactions.</div>
          <div style={{ fontSize: 12, color: "#374151", background: "#111318", borderRadius: 10, padding: "6px 14px", marginBottom: 24 }}>🧠 Claude AI</div>
          <div style={{ background: "#111318", borderRadius: 16, padding: 16, width: "100%", maxWidth: 340, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>{fmt(totalSpent)}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>This Month</div>
              </div>
              <div style={{ width: 1, background: "#1f2330" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>{txCount}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Transactions</div>
              </div>
              <div style={{ width: 1, background: "#1f2330" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9" }}>{cardCount}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Cards</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#374151", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, alignSelf: "flex-start" }}>SUGGESTIONS</div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)} style={{ background: "#111318", border: "1px solid #1f2330", borderRadius: 12, padding: "12px 16px", color: "#f1f5f9", fontSize: 13, fontFamily: "inherit", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                <span>📊</span> {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 0 12px" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 14 }}>
              {m.role === "assistant" && (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, marginRight: 8, flexShrink: 0 }}>🧠</div>
              )}
              <div style={{
                maxWidth: "75%", padding: "12px 16px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: m.role === "user" ? "#1db954" : "#111318",
                color: m.role === "user" ? "#000" : "#f1f5f9",
                fontSize: 14, lineHeight: 1.5,
              }}>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🧠</div>
              <div style={{ background: "#111318", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", display: "flex", gap: 4 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#6b7280", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
      <div style={{ display: "flex", gap: 10, padding: "12px 0 0", borderTop: "1px solid #1f2330" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage(input)}
          placeholder="Message Finance AI..." style={{ flex: 1, background: "#111318", border: "1px solid #1f2330", borderRadius: 14, padding: "13px 16px", color: "#f1f5f9", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} style={{ width: 46, height: 46, borderRadius: 14, background: "#1db954", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, opacity: !input.trim() || loading ? 0.4 : 1 }}>↑</button>
      </div>
    </div>
  );
};

// ─── ANALYTICS TAB ───────────────────────────────────────────────────────────
const AnalyticsTab = ({ transactions }) => {
  const [period, setPeriod] = useState("Month");
  const periods = ["Week", "Month", "3 Months", "Year"];

  const now = new Date();
  const daysMap = { "Week": 7, "Month": 30, "3 Months": 90, "Year": 365 };
  const days = daysMap[period];
  const cutoff = new Date(now - days * 86400000);

  const filtered = transactions.filter(t => t.amount < 0 && new Date(t.date) >= cutoff);
  const totalSpent = Math.abs(filtered.reduce((s, t) => s + t.amount, 0));
  const dailyAvg = totalSpent / days;

  // Month over month
  const thisMonth = transactions.filter(t => t.amount < 0 && new Date(t.date).getMonth() === now.getMonth());
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return t.amount < 0 && d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
  });
  const thisMonthSpend = Math.abs(thisMonth.reduce((s, t) => s + t.amount, 0));
  const lastMonthSpend = Math.abs(lastMonth.reduce((s, t) => s + t.amount, 0));
  const momChange = lastMonthSpend > 0 ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0;

  // 6-month bar chart
  const monthBars = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const spent = Math.abs(transactions.filter(t => {
      const td = new Date(t.date);
      return t.amount < 0 && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    }).reduce((s, t) => s + t.amount, 0));
    return { month: d.toLocaleString("en", { month: "short" }), spent };
  });

  // Spending trend (daily for month)
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now - (29 - i) * 86400000);
    const spent = Math.abs(transactions.filter(t => {
      const td = new Date(t.date);
      return t.amount < 0 && td.toDateString() === d.toDateString();
    }).reduce((s, t) => s + t.amount, 0));
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, spent };
  });

  // By category
  const byCat = Object.entries(
    filtered.reduce((acc, t) => {
      const cat = t.category || "Other";
      acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
      return acc;
    }, {})
  ).map(([cat, val]) => ({ cat, val, meta: getCatMeta(cat) })).sort((a, b) => b.val - a.val).slice(0, 6);

  // Top merchants
  const byMerchant = Object.entries(
    filtered.reduce((acc, t) => {
      const m = t.merchant || "Unknown";
      acc[m] = (acc[m] || 0) + Math.abs(t.amount);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Period selector */}
      <div style={{ display: "flex", background: "#111318", borderRadius: 14, padding: 4, gap: 2 }}>
        {periods.map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: "9px 4px", borderRadius: 11, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: period === p ? "#1db954" : "none", color: period === p ? "#000" : "#6b7280", transition: "all 0.2s" }}>{p}</button>
        ))}
      </div>

      {/* Total Spent */}
      <GlowCard>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Total Spent</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.03em" }}>{fmt(totalSpent)}</div>
            <div style={{ fontSize: 13, color: "#1db954", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              📈 Daily Avg: {fmt(dailyAvg)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>{filtered.length}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Transactions</div>
          </div>
        </div>
      </GlowCard>

      {/* Month over Month */}
      <GlowCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Month over Month</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>6-month spending history</div>
          </div>
          <div style={{ background: momChange <= 0 ? "#1db95420" : "#ef444420", borderRadius: 10, padding: "5px 10px" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: momChange <= 0 ? "#1db954" : "#ef4444" }}>
              {momChange <= 0 ? "↓" : "↑"} {Math.abs(momChange).toFixed(1)}%
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={monthBars} barSize={26}>
            <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="spent" name="Spent" fill="#1db954" radius={[6, 6, 0, 0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12, borderTop: "1px solid #1f2330", paddingTop: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>{fmt(thisMonthSpend)}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>This month</div>
          </div>
          <div style={{ width: 1, background: "#1f2330" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>{fmt(lastMonthSpend)}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Last month</div>
          </div>
        </div>
      </GlowCard>

      {/* Spending Trend */}
      <GlowCard>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>Spending Trend</div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1db954" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1db954" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} interval={6} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
            <Tooltip content={<Tip />} />
            <Area type="monotone" dataKey="spent" name="Spent" stroke="#1db954" strokeWidth={2} fill="url(#trendGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </GlowCard>

      {/* By Category */}
      <GlowCard>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>By Category</div>
        {byCat.map(({ cat, val, meta }, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < byCat.length - 1 ? "1px solid #1f2330" : "none" }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: meta.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{meta.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{meta.label}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{fmt(val)}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{totalSpent > 0 ? ((val / totalSpent) * 100).toFixed(0) : 0}%</div>
            </div>
          </div>
        ))}
        {byCat.length === 0 && <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No spending data for this period.</p>}
      </GlowCard>

      {/* Top Merchants */}
      <GlowCard>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>Top Merchants</div>
        {byMerchant.map(([merchant, val], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < byMerchant.length - 1 ? "1px solid #1f2330" : "none" }}>
            <div style={{ width: 24, fontSize: 14, color: "#6b7280", fontWeight: 700, textAlign: "center" }}>{i + 1}</div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{merchant}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{fmt(val)}</div>
          </div>
        ))}
      </GlowCard>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "home", icon: "⌂", label: "Home" },
  { id: "accounts", icon: "⬡", label: "Banking" },
  { id: "transactions", icon: "☰", label: "Activity" },
  { id: "analytics", icon: "◕", label: "Analytics" },
  { id: "ai", icon: "◉", label: "AI" },
];

const MainApp = ({ token, user, onLogout }) => {
  const [tab, setTab] = useState("home");
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
  const [txFilter, setTxFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");
  const [txAccount, setTxAccount] = useState("all");
  const [homeView, setHomeView] = useState("Credit"); // Credit | Banking
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const [manualAccounts, setManualAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`fintrackpro_manual_${user.id}`) || "[]"); } catch { return []; }
  });

  const saveManualAccounts = (accts) => {
    setManualAccounts(accts);
    localStorage.setItem(`fintrackpro_manual_${user.id}`, JSON.stringify(accts));
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
    } catch (e) { alert("Failed to link: " + e.message); }
  };

  const handleUnlink = async (id, name) => {
    if (!window.confirm(`Unlink ${name}?`)) return;
    await api(`/plaid/unlink/${id}`, { method: "DELETE" });
    await loadAll();
  };

  const handleAddManualAccount = () => {
    if (!form.name || !form.balance) return;
    const acct = { id: `manual_${Date.now()}`, name: form.name, type: form.type || "credit", subtype: form.type || "credit card", balance: parseFloat(form.balance), institution: "Manual", manual: true, color: "#f59e0b" };
    saveManualAccounts([...manualAccounts, acct]);
    setModal(null); setForm({});
  };

  const handleAddGoal = async () => {
    try {
      const g = await api("/goals", { method: "POST", body: { name: form.name, target: parseFloat(form.target), current: parseFloat(form.current || 0), icon: form.icon || "🎯", color: "#1db954" } });
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
  const creditAccounts = allAccounts.filter(a => a.type === "credit" || a.subtype?.includes("credit"));
  const bankAccounts = allAccounts.filter(a => a.type === "depository" || a.subtype === "checking" || a.subtype === "savings");

  const totalCreditBalance = creditAccounts.reduce((s, a) => s + Math.abs(a.balance || 0), 0);
  const totalCreditLimit = creditAccounts.reduce((s, a) => s + (a.limit || 0), 0);
  const totalAvailable = creditAccounts.reduce((s, a) => s + (a.available || 0), 0);
  const creditUtilization = totalCreditLimit > 0 ? Math.round((totalCreditBalance / totalCreditLimit) * 100) : 0;

  const now = new Date();
  const thisMonthTx = transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const monthlyIncome = thisMonthTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = Math.abs(thisMonthTx.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
  const deficit = monthlyIncome - monthlyExpenses;
  const dailySpend = monthlyExpenses / Math.max(now.getDate(), 1);

  // Weekly spend bar chart
  const weeklyBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    const dayStr = ["S","M","T","W","T","F","S"][d.getDay()];
    const spent = Math.abs(transactions.filter(t => new Date(t.date).toDateString() === d.toDateString() && t.amount < 0).reduce((s, t) => s + t.amount, 0));
    return { day: dayStr, spent };
  });

  const topCategory = (() => {
    const map = {};
    thisMonthTx.filter(t => t.amount < 0).forEach(t => { map[t.category] = (map[t.category] || 0) + Math.abs(t.amount); });
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return top ? getCatMeta(top[0]) : null;
  })();

  // 30-day projection line
  const projectionData = Array.from({ length: 30 }, (_, i) => {
    const projBalance = netWorth - (dailySpend * i);
    return { day: i + 1, balance: projBalance };
  });

  // Transactions filter
  const filteredTx = transactions.filter(t => {
    const matchAccount = txAccount === "all" || (t.account_id && t.account_id === txAccount) || (txAccount === "manual");
    const matchSearch = !txSearch || t.merchant?.toLowerCase().includes(txSearch.toLowerCase()) || formatCategory(t.category).toLowerCase().includes(txSearch.toLowerCase());
    return matchAccount && matchSearch;
  });

  // Group by month
  const txByMonth = filteredTx.reduce((acc, t) => {
    const key = t.date?.slice(0, 7);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const S = {
    label: { fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 },
    mono: { fontFamily: "'DM Mono'", fontWeight: 700, letterSpacing: "-0.02em" },
    sec: { fontSize: 16, fontWeight: 800, color: "#f1f5f9", marginBottom: 14 },
  };

  const noData = linkedBanks.length === 0 && manualAccounts.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#080a10", fontFamily: "'DM Sans',sans-serif", color: "#f1f5f9", paddingBottom: 95 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { display:none; }
        input,select,button { -webkit-appearance:none; }
        input:focus,select:focus { outline:2px solid #1db954; }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fadein { animation: fadeIn 0.3s ease; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "16px 18px 12px", background: "#080a10", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: "linear-gradient(135deg,#1db954,#0a8f3d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>◈</div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>FinTrack Pro</div>
            {linkedBanks.length > 0 && <span style={{ fontSize: 9, background: "#1db95422", color: "#1db954", border: "1px solid #1db95433", borderRadius: 8, padding: "2px 6px", fontWeight: 700 }}>LIVE</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#6b7280" }}>Net Worth</div>
              <div style={{ ...S.mono, fontSize: 15, color: "#1db954" }}>{loading ? "—" : fmt(netWorth)}</div>
            </div>
            <div onClick={() => setModal("profile")} style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer", fontWeight: 800 }}>
              {user.name[0].toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px 16px" }} className="fadein">

        {/* ── HOME ── */}
        {tab === "home" && (
          <>
            {/* Alerts */}
            {creditAccounts.filter(a => !dismissedAlerts.includes(a.id)).map(a => {
              if (!a.payment_due) return null;
              const checkingBalance = bankAccounts.reduce((s, b) => s + (b.balance || 0), 0);
              const short = checkingBalance < (a.min_payment || 0);
              return (
                <div key={a.id} style={{ background: "#1a1d25", borderRadius: 16, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1db95420", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>ℹ</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{a.name}</div>
                    <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>Min payment {fmt(a.min_payment)} — checking has {fmt(checkingBalance)}</div>
                    {short && <div style={{ fontSize: 12, color: "#1db954", marginTop: 4 }}>Short {fmt((a.min_payment || 0) - checkingBalance)} — may incur fees if on autopay</div>}
                  </div>
                  <button onClick={() => setDismissedAlerts(d => [...d, a.id])} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
                </div>
              );
            })}

            {/* Credit / Banking toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["Credit", "Banking"].map(v => (
                <Chip key={v} active={homeView === v} onClick={() => setHomeView(v)}
                  color="#1db954"
                  children={
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{v === "Credit" ? "💳" : "🏛"}</span> {v}
                    </span>
                  }
                />
              ))}
            </div>

            {homeView === "Credit" && (
              <>
                {/* Credit Summary */}
                <GlowCard style={{ marginBottom: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4 }}>Total Credit Balance</div>
                  <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>{fmt(totalCreditBalance)}</div>
                  <div style={{ display: "flex", justifyContent: "space-around" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#1db954" }}>{fmt(totalAvailable || (totalCreditLimit - totalCreditBalance))}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Available</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: creditUtilization > 30 ? "#ef4444" : "#f59e0b" }}>{creditUtilization}%</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Utilization</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{creditAccounts.length}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Cards</div>
                    </div>
                  </div>
                </GlowCard>

                {/* Credit Utilization bar */}
                <GlowCard style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: "#9ca3af" }}>Credit Utilization</div>
                      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 2 }}>{creditUtilization}%
                        <span style={{ fontSize: 12, background: "#1db95420", color: "#1db954", borderRadius: 8, padding: "3px 8px", marginLeft: 8 }}>
                          {creditUtilization < 10 ? "Excellent" : creditUtilization < 30 ? "Good" : creditUtilization < 50 ? "Fair" : "High"}
                        </span>
                      </div>
                    </div>
                    <div style={{ position: "relative", width: 56, height: 56 }}>
                      <CircleProgress pct={creditUtilization} color={creditUtilization > 30 ? "#ef4444" : "#1db954"} size={56} strokeWidth={5} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💳</div>
                    </div>
                  </div>
                  <div style={{ position: "relative", height: 8, background: "#1f2330", borderRadius: 10, marginBottom: 8 }}>
                    <div style={{ height: "100%", width: `${Math.min(creditUtilization, 100)}%`, background: creditUtilization > 30 ? "#ef4444" : "#1db954", borderRadius: 10, transition: "width 0.8s ease" }} />
                    {[30, 50, 75].map(mark => (
                      <div key={mark} style={{ position: "absolute", top: 0, bottom: 0, left: `${mark}%`, width: 1, background: "#374151" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>↑ {fmt(totalCreditBalance)}</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>⚑ {fmt(totalCreditLimit)} limit</span>
                  </div>
                </GlowCard>

                {/* Card scroll */}
                {creditAccounts.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Your Cards</div>
                    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                      {creditAccounts.map((a, i) => (
                        <CreditCardVisual key={i} name={a.name} last4={a.mask} balance={a.balance} />
                      ))}
                      {manualAccounts.filter(a => a.type === "credit").map((a, i) => (
                        <CreditCardVisual key={"m" + i} name={a.name} balance={a.balance} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Weekly spending + cash flow */}
                <GlowCard style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>This Month</div>
                      <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(monthlyExpenses)}</div>
                    </div>
                    {topCategory && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Top Category</div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{topCategory.icon} {topCategory.label}</div>
                      </div>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={weeklyBars} barSize={22}>
                      <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="spent" name="Spent" fill="#1db954" radius={[5, 5, 0, 0]} opacity={0.8} />
                    </BarChart>
                  </ResponsiveContainer>
                </GlowCard>

                {/* Cash Flow */}
                <GlowCard style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>💸</span> Cash Flow
                    </div>
                    <div style={{ background: "#f59e0b20", borderRadius: 10, padding: "4px 10px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{fmt(dailySpend)}/day</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", gap: 0, textAlign: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1db95420", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 15 }}>↓</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#1db954" }}>{fmt(monthlyIncome)}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Income</div>
                    </div>
                    <div style={{ background: "#1f2330" }} />
                    <div>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ef444420", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 15 }}>↑</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>{fmt(monthlyExpenses)}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Expenses</div>
                    </div>
                    <div style={{ background: "#1f2330" }} />
                    <div>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f59e0b20", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 15 }}>⚠</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: deficit < 0 ? "#ef4444" : "#1db954" }}>{fmt(Math.abs(deficit))}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{deficit < 0 ? "Deficit" : "Surplus"}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>30-Day Projection</div>
                  <ResponsiveContainer width="100%" height={70}>
                    <AreaChart data={projectionData}>
                      <defs>
                        <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} fill="url(#projGrad)" dot={false} />
                      <Tooltip formatter={v => [fmt(v), "Projected Balance"]} labelFormatter={() => ""} contentStyle={{ background: "#111318", border: "1px solid #1f2330", borderRadius: 10 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </GlowCard>

                {/* No data prompt */}
                {noData && !loading && (
                  <GlowCard glow="#1db954">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>👋 Welcome, {user.name.split(" ")[0]}!</div>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, lineHeight: 1.6 }}>Link your Chase, Robinhood, or any bank account to see real financial data.</p>
                    {linkToken && <PlaidLinkButton token={linkToken} onSuccess={handlePlaidSuccess} />}
                    <Btn variant="ghost" onClick={() => { setForm({ type: "credit" }); setModal("add_manual"); }}>+ Add Manual Account</Btn>
                  </GlowCard>
                )}
              </>
            )}

            {homeView === "Banking" && (
              <>
                {bankAccounts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#1db95415", border: "2px solid #1db95430", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, margin: "0 auto 20px" }}>🏛</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Link Your Bank Account</div>
                    <div style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 24 }}>Connect your checking and savings accounts to track income and cash flow.</div>
                    {linkToken && <PlaidLinkButton token={linkToken} onSuccess={handlePlaidSuccess} label="🔗 Link Bank Account" />}
                  </div>
                ) : (
                  <>
                    {bankAccounts.map((a, i) => (
                      <GlowCard key={i} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>{a.institution} · {a.subtype}</div>
                            <div style={{ fontSize: 15, fontWeight: 700 }}>{a.name}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: "#1db954" }}>{fmt(a.balance)}</div>
                            {a.available != null && <div style={{ fontSize: 11, color: "#6b7280" }}>Available: {fmt(a.available)}</div>}
                          </div>
                        </div>
                      </GlowCard>
                    ))}
                    {linkToken && <div style={{ marginTop: 8 }}><PlaidLinkButton token={linkToken} onSuccess={handlePlaidSuccess} /></div>}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── BANKING / ACCOUNTS ── */}
        {tab === "accounts" && (
          <>
            {allAccounts.map((a, i) => (
              <GlowCard key={i} style={{ marginBottom: 10, borderLeft: `3px solid ${a.balance < 0 ? "#ef4444" : "#1db954"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={S.label}>{a.institution} · {a.subtype || a.type}{a.manual ? " · Manual" : ""}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{a.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...S.mono, fontSize: 20, color: a.balance < 0 ? "#ef4444" : "#1db954" }}>{fmt(a.balance)}</div>
                    {a.available != null && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Available: {fmt(a.available)}</div>}
                    {a.manual && (
                      <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                        <input type="number" defaultValue={a.balance} style={{ width: 90, background: "#1a1d25", border: "1px solid #1f2330", borderRadius: 9, padding: "5px 8px", color: "#f1f5f9", fontSize: 12, fontFamily: "inherit" }}
                          onBlur={e => e.target.value !== "" && saveManualAccounts(manualAccounts.map(m => m.id === a.id ? { ...m, balance: parseFloat(e.target.value) } : m))} />
                        <button onClick={() => saveManualAccounts(manualAccounts.filter(m => m.id !== a.id))} style={{ background: "#ef444420", border: "1px solid #ef444440", color: "#ef4444", borderRadius: 9, padding: "5px 8px", cursor: "pointer", fontSize: 11 }}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
              </GlowCard>
            ))}
            {allAccounts.length === 0 && !loading && <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No accounts linked yet.</p>}
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {linkToken && <PlaidLinkButton token={linkToken} onSuccess={handlePlaidSuccess} />}
              <Btn variant="ghost" onClick={() => { setForm({ type: "credit" }); setModal("add_manual"); }}>+ Add Manual Account</Btn>
            </div>
            {linkedBanks.length > 0 && (
              <GlowCard style={{ marginTop: 14 }}>
                <div style={S.sec}>Linked Institutions</div>
                {linkedBanks.map(b => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1f2330" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{b.institution_name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Linked {new Date(b.created_at).toLocaleDateString()}</div>
                    </div>
                    <Btn small variant="danger" onClick={() => handleUnlink(b.id, b.institution_name)}>Unlink</Btn>
                  </div>
                ))}
              </GlowCard>
            )}

            {/* Investments */}
            {investments.length > 0 && (
              <GlowCard style={{ marginTop: 14 }}>
                <div style={S.sec}>Investments</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Portfolio Value</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#6366f1" }}>{fmt(investments.reduce((s, i) => s + i.value, 0))}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Holdings</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{investments.length}</div>
                  </div>
                </div>
                {investments.slice(0, 8).map((inv, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: i < investments.length - 1 ? "1px solid #1f2330" : "none" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: "#6366f120", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono'", fontSize: 10, fontWeight: 700, color: "#818cf8", flexShrink: 0 }}>{inv.ticker?.slice(0, 5)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{inv.name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{inv.shares?.toFixed(4)} sh @ {fmt(inv.price)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ ...S.mono, fontSize: 13 }}>{fmt(inv.value)}</div>
                      {inv.change_pct != null && <div style={{ fontSize: 11, color: parseFloat(inv.change_pct) >= 0 ? "#1db954" : "#ef4444" }}>{parseFloat(inv.change_pct) >= 0 ? "+" : ""}{inv.change_pct}%</div>}
                    </div>
                  </div>
                ))}
              </GlowCard>
            )}

            {/* Goals */}
            <GlowCard style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={S.sec}>Goals</div>
                <button onClick={() => { setForm({}); setModal("add_goal"); }} style={{ background: "#1db95420", border: "none", color: "#1db954", borderRadius: 10, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>+ Add</button>
              </div>
              {goals.map((g) => {
                const pct = Math.min((g.current / g.target) * 100, 100);
                return (
                  <div key={g.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{g.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{g.name}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{pct.toFixed(0)}% complete</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ ...S.mono, fontSize: 14, color: "#1db954" }}>{fmt(g.current)}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>/ {fmt(g.target)}</div>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "#1f2330", borderRadius: 10 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#1db954", borderRadius: 10, transition: "width 0.6s" }} />
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && <p style={{ color: "#6b7280", fontSize: 13 }}>No goals set yet. Add one to start tracking.</p>}
            </GlowCard>
          </>
        )}

        {/* ── TRANSACTIONS ── */}
        {tab === "transactions" && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>Activity</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>{filteredTx.length} transactions</div>
                </div>
              </div>
            </div>

            {/* Account filter chips */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 10 }}>
              <Chip active={txAccount === "all"} onClick={() => setTxAccount("all")}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>☰ All Accounts</span>
              </Chip>
              {accounts.map((a, i) => (
                <Chip key={i} active={txAccount === a.account_id} onClick={() => setTxAccount(a.account_id)}>
                  💳 {a.name?.slice(0, 12)}{a.mask ? ` •${a.mask}` : ""}
                </Chip>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 10 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontSize: 15 }}>🔍</span>
              <input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Search transactions..." style={{ width: "100%", background: "#111318", border: "1px solid #1f2330", borderRadius: 14, padding: "12px 16px 12px 40px", color: "#f1f5f9", fontSize: 14, fontFamily: "inherit", outline: "none" }} />
            </div>

            {/* Filter chips */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["All", "Income", "Expenses"].map(f => (
                <Chip key={f} active={txFilter === f.toLowerCase()} onClick={() => setTxFilter(f.toLowerCase())}>{f}</Chip>
              ))}
            </div>

            {/* Transactions grouped by month */}
            {Object.entries(txByMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([monthKey, txs]) => {
              const monthLabel = new Date(monthKey + "-01").toLocaleString("en", { month: "long", year: "numeric" });
              const monthTotal = Math.abs(txs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
              const displayTxs = txFilter === "income" ? txs.filter(t => t.amount > 0) : txFilter === "expenses" ? txs.filter(t => t.amount < 0) : txs;
              if (displayTxs.length === 0) return null;
              return (
                <div key={monthKey} style={{ marginBottom: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#9ca3af" }}>{monthLabel}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#9ca3af" }}>{fmt(monthTotal)}</span>
                  </div>
                  <GlowCard style={{ marginBottom: 10 }}>
                    {displayTxs.map((tx, i) => {
                      const meta = getCatMeta(tx.category);
                      return (
                        <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < displayTxs.length - 1 ? "1px solid #1f2330" : "none" }}>
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 14, background: meta.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                              {tx.logo ? <img src={tx.logo} alt="" style={{ width: 28, height: 28, borderRadius: 8 }} /> : meta.icon}
                            </div>
                            <div style={{ position: "absolute", bottom: -2, right: -2, width: 10, height: 10, borderRadius: "50%", background: "#1db954", border: "2px solid #080a10" }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.merchant}</div>
                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{meta.label} · {tx.date?.slice(5)}</div>
                          </div>
                          <div style={{ ...S.mono, fontSize: 14, color: tx.amount > 0 ? "#1db954" : "#f1f5f9", flexShrink: 0 }}>
                            {tx.amount > 0 ? "+" : ""}{fmt(tx.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </GlowCard>
                </div>
              );
            })}
            {filteredTx.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#6b7280" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>No transactions found</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Link a bank account to see real data</div>
              </div>
            )}
          </>
        )}

        {/* ── ANALYTICS ── */}
        {tab === "analytics" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Analytics</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Track your spending</div>
            </div>
            <AnalyticsTab transactions={transactions} />
          </>
        )}

        {/* ── AI ── */}
        {tab === "ai" && (
          <>
            <AITab accounts={allAccounts} transactions={transactions} user={user} />
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0c0e14", borderTop: "1px solid #1f2330", display: "flex", padding: "10px 8px 28px", zIndex: 50, gap: 4 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
              {active ? (
                <div style={{ background: "#1db954", borderRadius: 50, padding: "8px 18px", display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "inherit", color: "#000", whiteSpace: "nowrap" }}>{t.label}</span>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: 20, color: "#374151" }}>{t.icon}</span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      {modal === "add_manual" && (
        <Modal title="Add Manual Account" onClose={() => setModal(null)}>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, lineHeight: 1.6 }}>For accounts that can't connect via Plaid like Discover. Update the balance anytime.</p>
          <Input label="Account Name" placeholder="e.g. Discover Student Card" value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Current Balance ($)" type="number" placeholder="-450.00 (negative for debt)" value={form.balance || ""} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} />
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 5, fontWeight: 500 }}>Account Type</label>
            <select value={form.type || "credit"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: "100%", background: "#1a1d25", border: "1px solid #1f2330", borderRadius: 12, padding: "12px 16px", color: "#f1f5f9", fontSize: 14, fontFamily: "inherit" }}>
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
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, margin: "0 auto 12px" }}>{user.name[0].toUpperCase()}</div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{user.email}</div>
          </div>
          <div style={{ background: "#1a1d25", borderRadius: 14, padding: "14px 18px", marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, textAlign: "center" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1db954" }}>{linkedBanks.length}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Banks</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{transactions.length}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Transactions</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#6366f1" }}>{fmt(netWorth)}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Net Worth</div>
            </div>
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