import { useState, useEffect, createContext, useContext } from "react";

// ─── Inline API (no external file needed for artifact) ──────────
const BASE = "http://localhost:8000/api";
const req = async (url, opts = {}) => {
  const token = localStorage.getItem("access_token");
  const res = await fetch(BASE + url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
};
const api = {
  login:   (d) => req("/auth/login/",  { method: "POST", body: JSON.stringify(d) }),
  register:(d) => req("/auth/register/",{ method:"POST", body: JSON.stringify(d) }),
  me:      ()  => req("/auth/me/"),
  bets:    ()  => req("/bets/my/"),
  openDraws:() => req("/bets/draws/open/"),
  pastDraws:() => req("/bets/draws/past/"),
  placeBet:(d) => req("/bets/place/",  { method: "POST", body: JSON.stringify(d) }),
  wallet:  ()  => req("/wallet/my/"),
  deposit: (d) => req("/wallet/deposit/",  { method:"POST", body:JSON.stringify(d) }),
  withdraw:(d) => req("/wallet/withdraw/", { method:"POST", body:JSON.stringify(d) }),
  // Admin
  stats:   ()  => req("/bets/admin/stats/"),
  adminUsers:() => req("/auth/admin/users/"),
  adminDraws:() => req("/bets/admin/draws/"),
  createDraw:(d) => req("/bets/admin/draws/create/",{ method:"POST",body:JSON.stringify(d) }),
  declareResult:(id,wn) => req(`/bets/admin/draws/${id}/declare/`,{ method:"POST",body:JSON.stringify({winning_number:wn}) }),
  adminBets:(did)=> req(`/bets/admin/all/${did?"?draw_id="+did:""}`),
  pendingTxns:() => req("/wallet/admin/pending/"),
  txnAction:(id,action)=> req(`/wallet/admin/txn/${id}/action/`,{ method:"POST",body:JSON.stringify({action}) }),
  adminAdjust:(id,d)=> req(`/auth/admin/users/${id}/wallet/`,{ method:"PATCH",body:JSON.stringify(d) }),
};

// ─── Auth Context ───────────────────────────────────────────────
const AuthCtx = createContext(null);
function useAuth() { return useContext(AuthCtx); }

// ─── Helpers ────────────────────────────────────────────────────
const toast = (msg, type = "success") => {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;color:#fff;background:${type === "error" ? "#dc2626" : type === "info" ? "#2563eb" : "#16a34a"};box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .3s`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 300); }, 2800);
};

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

// ─── Components ─────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: 20, border: "1px solid var(--color-border-tertiary)", ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", style = {}, disabled }) {
  const colors = {
    primary: { background: "#7c3aed", color: "#fff" },
    success: { background: "#16a34a", color: "#fff" },
    danger:  { background: "#dc2626", color: "#fff" },
    ghost:   { background: "transparent", color: "var(--color-text-primary)", border: "1px solid var(--color-border-secondary)" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "9px 18px", borderRadius: 8, border: "none", fontWeight: 500, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, transition: "opacity .2s", ...colors[variant], ...style }}>
      {children}
    </button>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 5, color: "var(--color-text-secondary)" }}>{label}</label>}
      <input {...props}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
    </div>
  );
}

function Badge({ children, color = "purple" }) {
  const colors = { purple: "#7c3aed", green: "#16a34a", red: "#dc2626", amber: "#d97706", blue: "#2563eb" };
  return (
    <span style={{ background: colors[color] + "22", color: colors[color], padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
      {children}
    </span>
  );
}

// ─── Auth Pages ─────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", password2: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      let data;
      if (tab === "login") {
        data = await api.login({ username: form.username, password: form.password });
      } else {
        data = await api.register(form);
      }
      localStorage.setItem("access_token",  data.tokens?.access  || "");
      localStorage.setItem("refresh_token", data.tokens?.refresh || "");
      onAuth(data);
    } catch (e) {
      toast(Object.values(e || {}).flat().join(", ") || "Error", "error");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <Card style={{ width: 380 }}>
        <h2 style={{ textAlign: "center", marginBottom: 24, fontSize: 22, fontWeight: 500 }}>🎲 Pick-3 Game</h2>
        <div style={{ display: "flex", marginBottom: 20, borderBottom: "2px solid var(--color-border-tertiary)" }}>
          {["login", "register"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer", fontWeight: 500, fontSize: 14, borderBottom: tab === t ? "2px solid #7c3aed" : "2px solid transparent", color: tab === t ? "#7c3aed" : "var(--color-text-secondary)", textTransform: "capitalize" }}>
              {t}
            </button>
          ))}
        </div>
        <Input label="Username" value={form.username} onChange={e => update("username", e.target.value)} placeholder="Enter username" />
        {tab === "register" && <>
          <Input label="Email"    value={form.email}    onChange={e => update("email", e.target.value)}    placeholder="email@example.com" />
          <Input label="Phone"    value={form.phone}    onChange={e => update("phone", e.target.value)}    placeholder="9876543210" />
        </>}
        <Input label="Password" type="password" value={form.password} onChange={e => update("password", e.target.value)} placeholder="••••••" />
        {tab === "register" && <Input label="Confirm Password" type="password" value={form.password2} onChange={e => update("password2", e.target.value)} placeholder="••••••" />}
        <Btn onClick={submit} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
          {loading ? "Please wait..." : tab === "login" ? "Login" : "Create Account"}
        </Btn>
      </Card>
    </div>
  );
}

// ─── User Dashboard ─────────────────────────────────────────────
function PlaceBetPanel({ draws, onBetPlaced }) {
  const [form, setForm] = useState({ draw: "", numbers: "", amount: "", bet_type: "straight" });
  const [loading, setLoading] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Pair bet types need only 2 digits
  const isPairType = ["front", "back", "any_pair"].includes(form.bet_type);
  const maxDigits  = isPairType ? 2 : 3;

  const BET_TYPES = [
    { value: "straight", label: "Straight",  sub: "Exact match",       payout: "500x",      digits: 3, color: "#7c3aed" },
    { value: "box",      label: "Box",        sub: "Any order",         payout: "80x/160x",  digits: 3, color: "#2563eb" },
    { value: "front",    label: "Front Pair", sub: "First 2 digits",    payout: "50x",       digits: 2, color: "#d97706" },
    { value: "back",     label: "Back Pair",  sub: "Last 2 digits",     payout: "50x",       digits: 2, color: "#059669" },
    { value: "any_pair", label: "Any Pair",   sub: "Front OR Back",     payout: "25x",       digits: 2, color: "#dc2626" },
  ];

  const submit = async () => {
    if (!form.numbers || form.numbers.length !== maxDigits) {
      return toast(`Enter exactly ${maxDigits} digits for ${form.bet_type}`, "error");
    }
    if (!form.amount || form.amount < 1) return toast("Enter valid amount", "error");
    setLoading(true);
    try {
      await api.placeBet({ ...form, amount: parseFloat(form.amount) });
      toast("✅ Bet placed successfully!");
      setForm(f => ({ ...f, numbers: "", amount: "" }));
      onBetPlaced();
    } catch (e) {
      toast(e.error || JSON.stringify(e), "error");
    }
    setLoading(false);
  };

  const selectedType = BET_TYPES.find(b => b.value === form.bet_type);

  return (
    <Card>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Place a Bet</h3>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 5, color: "var(--color-text-secondary)" }}>Select Draw</label>
        <select value={form.draw} onChange={e => upd("draw", e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 14 }}>
          <option value="">-- No specific draw --</option>
          {draws.map(d => <option key={d.id} value={d.id}>{d.draw_date} {d.draw_time}</option>)}
        </select>
      </div>

      {/* Bet type selector */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8, color: "var(--color-text-secondary)" }}>Bet Type</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 7 }}>
          {BET_TYPES.map(({ value, label, sub, payout, digits, color }) => (
            <div key={value} onClick={() => { upd("bet_type", value); upd("numbers", ""); }}
              style={{ padding: "10px 6px", borderRadius: 8, border: `2px solid ${form.bet_type === value ? color : "var(--color-border-secondary)"}`, cursor: "pointer", textAlign: "center", background: form.bet_type === value ? color + "15" : "transparent", transition: "all .15s" }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: form.bet_type === value ? color : "var(--color-text-primary)" }}>{label}</div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2 }}>{sub}</div>
              <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 700 }}>{payout}</div>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 2 }}>{digits} digits</div>
            </div>
          ))}
        </div>
      </div>

      {/* Digit hint */}
      <div style={{ marginBottom: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
        {form.bet_type === "front"    && "Enter first 2 digits — e.g. 12 (matches 12X)"}
        {form.bet_type === "back"     && "Enter last 2 digits — e.g. 23 (matches X23)"}
        {form.bet_type === "any_pair" && "Enter 2 digits — wins if they match front OR back pair"}
        {form.bet_type === "straight" && "Enter all 3 digits — exact match only"}
        {form.bet_type === "box"      && "Enter all 3 digits — any order wins"}
      </div>

      <Input label={`Your Numbers (${maxDigits} digits)`}
        value={form.numbers} maxLength={maxDigits}
        onChange={e => { if (/^\d*$/.test(e.target.value)) upd("numbers", e.target.value); }}
        placeholder={isPairType ? "e.g. 12" : "e.g. 123"} />

      {/* Visual preview */}
      {form.numbers.length > 0 && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: selectedType?.color + "10", border: `1px dashed ${selectedType?.color}`, fontSize: 13 }}>
          {form.bet_type === "front"    && <span>Wins if result is <strong>{form.numbers}X</strong> — e.g. {form.numbers}0 to {form.numbers}9</span>}
          {form.bet_type === "back"     && <span>Wins if result is <strong>X{form.numbers}</strong> — e.g. 0{form.numbers} to 9{form.numbers}</span>}
          {form.bet_type === "any_pair" && <span>Wins if result starts with <strong>{form.numbers}</strong> OR ends with <strong>{form.numbers}</strong></span>}
          {form.bet_type === "straight" && form.numbers.length === 3 && <span>Wins ONLY if result is exactly <strong>{form.numbers}</strong></span>}
          {form.bet_type === "box"      && form.numbers.length === 3 && <span>Wins if result contains digits <strong>{form.numbers.split("").sort().join("")}</strong> in any order</span>}
        </div>
      )}

      <Input label="Amount (₹)" type="number" value={form.amount} onChange={e => upd("amount", e.target.value)} placeholder="Min ₹1 · Max ₹10,000" />
      <Btn onClick={submit} disabled={loading} style={{ width: "100%" }}>
        {loading ? "Placing..." : `Place Bet ${form.amount ? fmt(form.amount) : ""}`}
      </Btn>
    </Card>
  );
}

function MyBetsPanel({ bets }) {
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>My Bets</h3>
      {bets.length === 0 && <p style={{ color: "var(--color-text-secondary)", textAlign: "center" }}>No bets yet. Place your first bet!</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {bets.map(b => (
          <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--color-border-tertiary)", background: b.is_winner ? "#16a34a11" : "transparent" }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 18, letterSpacing: 2 }}>{b.numbers}</span>
              <span style={{ marginLeft: 10 }}><Badge color={b.bet_type === "straight" ? "purple" : b.bet_type === "box" ? "blue" : "amber"}>{b.bet_type}</Badge></span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 500 }}>{fmt(b.amount)}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {b.is_processed ? (b.is_winner ? <span style={{ color: "#16a34a" }}>🏆 Won {fmt(b.payout)}</span> : <span style={{ color: "#dc2626" }}>✗ Lost</span>) : <span style={{ color: "#d97706" }}>⏳ Pending</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WalletPanel({ wallet, onRefresh }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const doAction = async (type) => {
    if (!amount || parseFloat(amount) < 50) return toast("Min ₹50", "error");
    setLoading(true);
    try {
      const fn = type === "deposit" ? api.deposit : api.withdraw;
      await fn({ amount: parseFloat(amount) });
      toast(type === "deposit" ? "Deposit request sent! Awaiting admin approval." : "Withdrawal request sent!", "info");
      setAmount("");
      onRefresh();
    } catch (e) { toast(e.error || "Error", "error"); }
    setLoading(false);
  };

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>My Wallet</h3>
      <div style={{ textAlign: "center", padding: "20px 0", borderBottom: "1px solid var(--color-border-tertiary)", marginBottom: 20 }}>
        <div style={{ fontSize: 36, fontWeight: 600, color: "#7c3aed" }}>{fmt(wallet?.balance)}</div>
        <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Available Balance</div>
      </div>
      <Input label="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Min ₹50" />
      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={() => doAction("deposit")}  disabled={loading} variant="success" style={{ flex: 1 }}>Deposit</Btn>
        <Btn onClick={() => doAction("withdraw")} disabled={loading} variant="ghost"   style={{ flex: 1 }}>Withdraw</Btn>
      </div>
      <h4 style={{ marginTop: 20, marginBottom: 12 }}>Recent Transactions</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(wallet?.transactions || []).slice(0, 10).map(t => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: "1px solid var(--color-border-tertiary)" }}>
            <div>
              <Badge color={t.txn_type === "winning" ? "green" : t.txn_type === "bet_placed" ? "purple" : "amber"}>{t.txn_type}</Badge>
              {t.note && <span style={{ marginLeft: 8, color: "var(--color-text-secondary)" }}>{t.note}</span>}
            </div>
            <div style={{ fontWeight: 500 }}>
              <span style={{ color: ["winning","deposit"].includes(t.txn_type) ? "#16a34a" : "#dc2626" }}>
                {["winning","deposit"].includes(t.txn_type) ? "+" : "-"}{fmt(t.amount)}
              </span>
              {t.status === "pending" && <Badge color="amber" style={{ marginLeft: 6 }}>pending</Badge>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function UserDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("bet");
  const [bets, setBets] = useState([]);
  const [draws, setDraws] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [past, setPast] = useState([]);

  const loadAll = async () => {
    const [b, d, w, p] = await Promise.all([api.bets(), api.openDraws(), api.wallet(), api.pastDraws()]);
    setBets(b); setDraws(d); setWallet(w); setPast(p);
  };

  useEffect(() => { loadAll(); }, []);

  const tabs = [["bet","🎯 Place Bet"],["my","📋 My Bets"],["wallet","💰 Wallet"],["results","🏆 Results"]];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)" }}>
      <div style={{ background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-tertiary)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>🎲 Pick-3</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Hi, <strong>{user.username}</strong></span>
          <Badge color="green">{fmt(wallet?.balance)}</Badge>
          <Btn onClick={onLogout} variant="ghost" style={{ padding: "6px 12px", fontSize: 13 }}>Logout</Btn>
        </div>
      </div>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {tabs.map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === t ? "#7c3aed" : "var(--color-background-secondary)", color: tab === t ? "#fff" : "var(--color-text-secondary)", fontWeight: 500, fontSize: 14, transition: "all .2s" }}>
              {label}
            </button>
          ))}
        </div>
        {tab === "bet"    && <PlaceBetPanel draws={draws} onBetPlaced={loadAll} />}
        {tab === "my"     && <MyBetsPanel   bets={bets} />}
        {tab === "wallet" && <WalletPanel   wallet={wallet} onRefresh={loadAll} />}
        {tab === "results" && (
          <Card>
            <h3 style={{ marginTop: 0 }}>Past Draw Results</h3>
            {past.length === 0 && <p style={{ color:"var(--color-text-secondary)" }}>No results yet.</p>}
            <div style={{ display:"grid", gap:10 }}>
              {past.map(d => (
                <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", borderRadius:8, border:"1px solid var(--color-border-tertiary)" }}>
                  <div>
                    <strong>{d.draw_date}</strong> <span style={{ color:"var(--color-text-secondary)", fontSize:13 }}>{d.draw_time}</span>
                  </div>
                  <div style={{ fontSize:26, fontWeight:700, letterSpacing:4, color:"#7c3aed" }}>{d.winning_number}</div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────────
function AdminDashboard({ user, onLogout }) {
  const [tab, setTab]         = useState("stats");
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [draws, setDraws]     = useState([]);
  const [bets, setBets]       = useState([]);
  const [pending, setPending] = useState([]);
  const [wn, setWn]           = useState({});

  const loadStats  = () => api.stats().then(setStats);
  const loadUsers  = () => api.adminUsers().then(setUsers);
  const loadDraws  = () => api.adminDraws().then(setDraws);
  const loadBets   = (did) => api.adminBets(did).then(setBets);
  const loadPending= () => api.pendingTxns().then(setPending);

  useEffect(() => {
    loadStats(); loadUsers(); loadDraws(); loadPending();
  }, []);

  const createDraw = async () => {
    const date = prompt("Draw date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    const time = prompt("Draw time:", "Evening");
    if (!date) return;
    try { await api.createDraw({ draw_date: date, draw_time: time }); loadDraws(); toast("Draw created!"); }
    catch (e) { toast(e?.draw_date?.[0] || "Error", "error"); }
  };

  const declareResult = async (id) => {
    const num = wn[id] || "";
    if (num.length !== 3) return toast("Enter 3 digit result", "error");
    if (!confirm(`Declare result ${num} for draw #${id}?`)) return;
    try {
      const res = await api.declareResult(id, num);
      toast(`✅ Declared! Winners: ${res.winners} | Payout: ${fmt(res.total_payout)}`);
      loadDraws(); loadStats();
    } catch (e) { toast(e.error || "Error", "error"); }
  };

  const txnAction = async (id, action) => {
    try { await api.txnAction(id, action); loadPending(); toast(`${action}d!`); }
    catch (e) { toast("Error", "error"); }
  };

  const tabs = [["stats","📊 Stats"],["draws","🎰 Draws"],["users","👥 Users"],["bets","📋 Bets"],["wallet","💳 Wallet Requests"]];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)" }}>
      <div style={{ background: "#1e1b4b", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 18, color: "#c4b5fd" }}>🎲 Pick-3 Admin</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: "#a5b4fc", fontSize: 14 }}>{user.username}</span>
          <Btn onClick={onLogout} variant="ghost" style={{ padding: "6px 12px", fontSize: 13, color: "#c4b5fd", borderColor: "#4c1d95" }}>Logout</Btn>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {tabs.map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); if (t === "bets") loadBets(); }}
              style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === t ? "#7c3aed" : "var(--color-background-secondary)", color: tab === t ? "#fff" : "var(--color-text-secondary)", fontWeight: 500, fontSize: 14 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {tab === "stats" && stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
            {[
              ["Total Bets",    stats.total_bets,    "purple"],
              ["Total Wagered", fmt(stats.total_wagered), "blue"],
              ["Total Payout",  fmt(stats.total_payout),  "green"],
              ["House Profit",  fmt(stats.house_profit),  stats.house_profit >= 0 ? "amber" : "red"],
              ["Wallet Funds",  fmt(stats.total_balance_in_wallets), "amber"],
            ].map(([label, val, color]) => (
              <Card key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: { purple:"#7c3aed", blue:"#2563eb", green:"#16a34a", amber:"#d97706", red:"#dc2626" }[color] }}>{val}</div>
                <div style={{ color: "var(--color-text-secondary)", fontSize: 13, marginTop: 4 }}>{label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Draws */}
        {tab === "draws" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Btn onClick={createDraw} variant="success">+ Create Draw</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {draws.map(d => (
                <Card key={d.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <strong>{d.draw_date}</strong> — {d.draw_time}
                      <span style={{ marginLeft: 12 }}><Badge color={d.is_declared ? "green" : "amber"}>{d.is_declared ? "Declared" : "Open"}</Badge></span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {d.is_declared ? (
                        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 4, color: "#7c3aed" }}>{d.winning_number}</span>
                      ) : (
                        <>
                          <input value={wn[d.id] || ""} maxLength={3}
                            onChange={e => { if (/^\d*$/.test(e.target.value)) setWn(w => ({ ...w, [d.id]: e.target.value })); }}
                            placeholder="Result"
                            style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontSize: 16, letterSpacing: 4, textAlign: "center" }} />
                          <Btn onClick={() => declareResult(d.id)} variant="success">Declare</Btn>
                          <Btn onClick={() => { loadBets(d.id); setTab("bets"); }} variant="ghost">View Bets</Btn>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <Card>
            <h3 style={{ marginTop: 0 }}>All Users ({users.length})</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--color-border-tertiary)" }}>
                    {["ID","Username","Email","Balance","Role","Status","Action"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: "var(--color-text-secondary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}>
                      <td style={{ padding: "10px 12px" }}>{u.id}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>{u.username}</td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>{u.email}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#7c3aed" }}>{fmt(u.balance)}</td>
                      <td style={{ padding: "10px 12px" }}><Badge color={u.role === "admin" ? "purple" : "blue"}>{u.role}</Badge></td>
                      <td style={{ padding: "10px 12px" }}><Badge color={u.is_active ? "green" : "red"}>{u.is_active ? "Active" : "Suspended"}</Badge></td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <Btn variant="ghost" style={{ padding:"4px 10px", fontSize:12 }}
                            onClick={async () => { await api.adminAdjust(u.id, { amount: parseFloat(prompt("Amount to credit:") || 0), action: "credit", note: "Admin credit" }); loadUsers(); toast("Credited!"); }}>
                            Credit
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Bets */}
        {tab === "bets" && (
          <Card>
            <h3 style={{ marginTop: 0 }}>All Bets ({bets.length})</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--color-border-tertiary)" }}>
                    {["User","Numbers","Type","Amount","Draw","Result"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: "var(--color-text-secondary)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bets.map(b => (
                    <tr key={b.id} style={{ borderBottom: "1px solid var(--color-border-tertiary)", background: b.is_winner ? "#16a34a08" : "transparent" }}>
                      <td style={{ padding: "8px 12px" }}>{b.username}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 700, letterSpacing: 3 }}>{b.numbers}</td>
                      <td style={{ padding: "8px 12px" }}><Badge color="purple">{b.bet_type}</Badge></td>
                      <td style={{ padding: "8px 12px" }}>{fmt(b.amount)}</td>
                      <td style={{ padding: "8px 12px", color:"var(--color-text-secondary)", fontSize:12 }}>{b.draw_info?.draw_date}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {b.is_processed ? (b.is_winner ? <Badge color="green">Won {fmt(b.payout)}</Badge> : <Badge color="red">Lost</Badge>) : <Badge color="amber">Pending</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Wallet Requests */}
        {tab === "wallet" && (
          <Card>
            <h3 style={{ marginTop: 0 }}>Pending Wallet Requests ({pending.length})</h3>
            {pending.length === 0 && <p style={{ color: "var(--color-text-secondary)" }}>No pending requests.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pending.map(t => (
                <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderRadius:8, border:"1px solid var(--color-border-tertiary)" }}>
                  <div>
                    <strong>{t.username}</strong>
                    <Badge color={t.txn_type === "deposit" ? "green" : "amber"} style={{ marginLeft: 10 }}>{t.txn_type}</Badge>
                    <span style={{ fontSize: 20, fontWeight: 700, marginLeft: 12, color: "#7c3aed" }}>{fmt(t.amount)}</span>
                    {t.note && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{t.note}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="success" onClick={() => txnAction(t.id, "approve")}>Approve</Btn>
                    <Btn variant="danger"  onClick={() => txnAction(t.id, "reject")}>Reject</Btn>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Root App ────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      api.me().then(setUser).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuth = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--color-text-secondary)" }}>Loading...</div>
      </div>
    );
  }

  if (!user) return <AuthPage onAuth={handleAuth} />;

  const isAdmin = user?.profile?.role === "admin";
  return isAdmin
    ? <AdminDashboard user={user} onLogout={handleLogout} />
    : <UserDashboard  user={user} onLogout={handleLogout} />;
}
