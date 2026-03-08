import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const API = process.env.REACT_APP_API_URL || "http://localhost:4000";

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const T = {
  bg0:"#050810",bg1:"#080d16",bg2:"#0c1220",bg3:"#111827",bg4:"#1a2235",
  border:"#1e2d45",borderL:"#243552",
  teal:"#2dd4bf",tealD:"#0d9488",tealDim:"#0d948820",tealGlow:"#2dd4bf30",
  gold:"#f59e0b",goldD:"#d97706",goldDim:"#f59e0b18",goldGlow:"#f59e0b28",
  green:"#10b981",greenD:"#059669",greenDim:"#10b98118",
  red:"#f43f5e",redDim:"#f43f5e18",
  amber:"#fbbf24",amberDim:"#fbbf2418",
  textPri:"#f0fdf9",textSec:"#94a3b8",textDim:"#475569",textGold:"#fcd34d",
  gradPri:"linear-gradient(135deg,#2dd4bf,#0d9488)",
  gradGold:"linear-gradient(135deg,#f59e0b,#d97706)",
};

const fmt=(n)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n||0);
const fmtK=(n)=>Math.abs(n)>=1000?`$${(n/1000).toFixed(1)}k`:`$${Math.round(n)}`;

const apiFetch=async(path,options={},token)=>{
  const res=await fetch(`${API}${path}`,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{}),...options.headers},body:options.body?JSON.stringify(options.body):undefined});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||"Request failed");
  return data;
};

const CATEGORY_META={
  FOOD_AND_DRINK:{label:"Food & Dining",color:"#f59e0b",icon:"🍽"},
  TRANSFER_IN:{label:"Transfer In",color:"#10b981",icon:"↙"},
  TRANSFER_OUT:{label:"Transfer Out",color:"#f43f5e",icon:"↗"},
  TRANSPORTATION:{label:"Travel",color:"#2dd4bf",icon:"✈"},
  ENTERTAINMENT:{label:"Entertainment",color:"#a78bfa",icon:"🎬"},
  SHOPPING:{label:"Shopping",color:"#fbbf24",icon:"🛍"},
  RENT_AND_UTILITIES:{label:"Bills & Utilities",color:"#64748b",icon:"⚡"},
  MEDICAL:{label:"Medical",color:"#34d399",icon:"🏥"},
  INCOME:{label:"Income",color:"#10b981",icon:"💰"},
  GENERAL_MERCHANDISE:{label:"Shopping",color:"#fbbf24",icon:"🛍"},
  SUBSCRIPTION:{label:"Subscriptions",color:"#2dd4bf",icon:"🔄"},
  Other:{label:"Other",color:"#334155",icon:"📦"},
};
const getCatMeta=(cat)=>CATEGORY_META[cat]||CATEGORY_META.Other;
const formatCategory=(cat)=>getCatMeta(cat).label;

const GLOBAL_CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  ::-webkit-scrollbar{display:none;}
  body{background:#050810;}
  input,select,button,textarea{-webkit-appearance:none;font-family:'DM Sans',sans-serif;}
  input:focus,select:focus,textarea:focus{outline:1.5px solid #2dd4bf;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  .fade-up{animation:fadeUp 0.45s cubic-bezier(.22,1,.36,1) both;}
  .fade-in{animation:fadeIn 0.3s ease both;}
  .stagger>*:nth-child(1){animation-delay:.05s}
  .stagger>*:nth-child(2){animation-delay:.1s}
  .stagger>*:nth-child(3){animation-delay:.15s}
  .stagger>*:nth-child(4){animation-delay:.2s}
  .card-hover{transition:transform 0.18s ease,box-shadow 0.18s ease;}
  .card-hover:active{transform:scale(0.983);}
`;

// ── Components ──
const GlassCard=({children,style,glow,onClick,className=""})=>(
  <div onClick={onClick} className={`card-hover ${className}`} style={{background:T.bg2,border:`1px solid ${glow?T.borderL:T.border}`,borderRadius:20,padding:18,position:"relative",overflow:"hidden",cursor:onClick?"pointer":"default",boxShadow:glow?`0 0 0 1px ${glow}44,0 8px 32px ${glow}22,inset 0 1px 0 ${glow}18`:"0 2px 16px #00000040",...(style||{})}}>
    {glow&&<div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${glow}88,transparent)`}}/>}
    {children}
  </div>
);

const Pill=({children,active,onClick,color=T.teal})=>(
  <button onClick={onClick} style={{padding:"8px 18px",borderRadius:50,border:`1px solid ${active?color:T.border}`,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,whiteSpace:"nowrap",transition:"all 0.2s",background:active?color+"18":T.bg4,color:active?color:T.textDim,boxShadow:active?`0 0 0 1px ${color},0 0 12px ${color}30`:"none"}}>{children}</button>
);

const Input=({label,...props})=>(
  <div style={{marginBottom:14}}>
    {label&&<label style={{fontSize:12,color:T.textDim,display:"block",marginBottom:6,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</label>}
    <input {...props} style={{width:"100%",background:T.bg4,border:`1px solid ${T.border}`,borderRadius:14,padding:"13px 16px",color:T.textPri,fontSize:14,fontFamily:"inherit",...(props.style||{})}}/>
  </div>
);

const Btn=({children,variant="primary",small,...props})=>{
  const bg=variant==="primary"?T.gradPri:variant==="gold"?T.gradGold:variant==="danger"?T.redDim:T.bg4;
  return(
    <button {...props} style={{width:small?"auto":"100%",padding:small?"8px 16px":"14px",borderRadius:14,border:variant==="ghost"?`1px solid ${T.border}`:"none",cursor:"pointer",fontWeight:700,fontSize:small?12:14,fontFamily:"inherit",background:bg,color:(variant==="primary"||variant==="gold")?"#000":variant==="danger"?T.red:T.textPri,marginBottom:small?0:8,opacity:props.disabled?0.4:1,transition:"opacity 0.2s",boxShadow:variant==="primary"?`0 4px 20px ${T.tealGlow}`:variant==="gold"?`0 4px 20px ${T.goldGlow}`:"none",...(props.style||{})}}>{children}</button>
  );
};

const Modal=({title,onClose,children})=>(
  <div style={{position:"fixed",inset:0,background:"#000000bb",zIndex:1000,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={onClose}>
    <div className="fade-up" style={{background:T.bg1,border:`1px solid ${T.border}`,borderRadius:"28px 28px 0 0",width:"100%",maxWidth:500,margin:"0 auto",padding:24,paddingBottom:48,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{width:40,height:4,background:T.bg4,borderRadius:2,margin:"0 auto 22px"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h3 style={{color:T.textPri,fontSize:18,fontWeight:700,fontFamily:"'Syne',sans-serif"}}>{title}</h3>
        <button onClick={onClose} style={{background:T.bg4,border:`1px solid ${T.border}`,color:T.textDim,borderRadius:10,padding:"6px 12px",cursor:"pointer",fontSize:16}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const ChartTip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(<div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",boxShadow:"0 8px 24px #00000060"}}><p style={{color:T.textDim,fontSize:11,marginBottom:4}}>{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color||T.teal,fontSize:13,fontWeight:700}}>{p.name}: {fmt(p.value)}</p>)}</div>);
};

const ArcProgress=({pct,size=64,stroke=5,color=T.teal,children})=>{
  const r=(size-stroke)/2,circ=2*Math.PI*r;
  return(
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.bg4} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={circ-(pct/100)*circ} strokeLinecap="round" style={{transition:"stroke-dashoffset 0.8s cubic-bezier(.22,1,.36,1)",filter:`drop-shadow(0 0 6px ${color}88)`}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{children}</div>
    </div>
  );
};

const CardVisual=({name,mask,balance})=>{
  const isTeal=(name||"").charCodeAt(0)%2===0;
  const grad=isTeal?"linear-gradient(135deg,#0a2e38,#0d4a50,#0f5c52)":"linear-gradient(135deg,#1a1200,#2d1e00,#3d2800)";
  const accent=isTeal?T.teal:T.gold;
  return(
    <div style={{minWidth:220,height:132,borderRadius:20,background:grad,padding:18,display:"flex",flexDirection:"column",justifyContent:"space-between",flexShrink:0,boxShadow:`0 8px 32px #00000066,inset 0 1px 0 ${accent}22`,border:`1px solid ${accent}22`}}>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,opacity:0.5}}>
          {[0,1,2,3].map(i=><div key={i} style={{width:14,height:10,background:`${accent}44`,borderRadius:2}}/>)}
        </div>
        <span style={{fontSize:18,opacity:0.5}}>💳</span>
      </div>
      <div>
        <div style={{fontSize:11,color:`${accent}99`,letterSpacing:"0.06em",marginBottom:3,textTransform:"uppercase"}}>{name}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <span style={{fontSize:12,color:`${accent}66`,letterSpacing:3,fontFamily:"'DM Mono'"}}>•••• {mask||"----"}</span>
          <span style={{fontSize:19,fontWeight:700,color:accent,fontFamily:"'DM Mono'",textShadow:`0 0 12px ${accent}88`}}>{fmt(Math.abs(balance||0))}</span>
        </div>
        <div style={{height:1.5,background:`linear-gradient(90deg,transparent,${accent}66,transparent)`,marginTop:8}}/>
      </div>
    </div>
  );
};

// ── Login ──
const LoginScreen=({onLogin})=>{
  const[mode,setMode]=useState("login");
  const[form,setForm]=useState({name:"",email:"",password:""});
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(false);
  const handle=async()=>{
    setLoading(true);setError("");
    try{const data=await apiFetch(mode==="login"?"/auth/login":"/auth/signup",{method:"POST",body:form});localStorage.setItem("fintrackpro_token",data.token);onLogin(data.token,data.user);}
    catch(e){setError(e.message);}
    setLoading(false);
  };
  return(
    <div style={{minHeight:"100vh",background:T.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{position:"fixed",top:"-10%",left:"-10%",width:"60vw",height:"60vh",background:`radial-gradient(ellipse,${T.tealDim} 0%,transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"0%",right:"-10%",width:"50vw",height:"50vh",background:`radial-gradient(ellipse,${T.goldDim} 0%,transparent 70%)`,pointerEvents:"none"}}/>
      <div className="fade-up stagger" style={{width:"100%",maxWidth:380,position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:44}}>
          <div style={{width:72,height:72,borderRadius:22,background:T.gradPri,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 18px",boxShadow:`0 0 0 1px ${T.teal}44,0 0 40px ${T.tealGlow},0 0 80px ${T.tealDim}`,animation:"float 3s ease-in-out infinite"}}>◈</div>
          <div style={{fontSize:30,fontWeight:800,color:T.textPri,letterSpacing:"-0.03em",fontFamily:"'Syne',sans-serif"}}>FinTrack Pro</div>
          <div style={{fontSize:14,color:T.textDim,marginTop:6}}>Your wealth, beautifully tracked</div>
        </div>
        <div style={{display:"flex",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:16,padding:5,marginBottom:24,gap:4}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"11px",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700,background:mode===m?T.gradPri:"transparent",color:mode===m?"#000":T.textDim,transition:"all 0.25s",boxShadow:mode===m?`0 4px 16px ${T.tealGlow}`:"none"}}>
              {m==="login"?"Sign In":"Sign Up"}
            </button>
          ))}
        </div>
        {mode==="signup"&&<Input label="Full Name" placeholder="Refath Chowdhury" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>}
        <Input label="Email" type="email" placeholder="you@email.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
        <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handle()}/>
        {error&&<div style={{background:T.redDim,border:`1px solid ${T.red}44`,borderRadius:12,padding:"11px 15px",color:T.red,fontSize:13,marginBottom:14}}>{error}</div>}
        <Btn onClick={handle} disabled={loading}>{loading?"Loading…":mode==="login"?"Sign In":"Create Account"}</Btn>
      </div>
    </div>
  );
};

// ── Plaid ──
const PlaidLink=({token,onSuccess,label="🏦 Link Bank Account"})=>{
  const open=useCallback(()=>{
    if(!window.Plaid){alert("Plaid not loaded.");return;}
    window.Plaid.create({token,onSuccess:(pt,m)=>onSuccess(pt,m.institution?.name),onExit:()=>{}}).open();
  },[token,onSuccess]);
  return<Btn onClick={open}>{label}</Btn>;
};

// ── AI ──
const AITab=({accounts,transactions,user})=>{
  const[msgs,setMsgs]=useState([]);
  const[input,setInput]=useState("");
  const[loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  const totalSpent=Math.abs(transactions.filter(t=>t.amount<0).reduce((s,t)=>s+t.amount,0));
  const suggestions=["How much did I spend this month?","What's my biggest expense category?","Am I saving enough?","What subscriptions am I paying for?"];
  const send=async(text)=>{
    if(!text.trim()||loading)return;
    const userMsg={role:"user",content:text};
    setMsgs(p=>[...p,userMsg]);setInput("");setLoading(true);
    const ctx=`You are a sharp personal finance AI for ${user.name}. Their data: Accounts: ${accounts.map(a=>`${a.name}(${a.type}):${fmt(a.balance)}`).join(",")}. Total spent 90d: ${fmt(totalSpent)}. Recent txns: ${transactions.slice(0,20).map(t=>`${t.merchant} ${fmt(t.amount)} ${t.date}[${formatCategory(t.category)}]`).join(",")}. Be concise, specific, use their actual numbers. Max 3 sentences.`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:ctx,messages:[...msgs,userMsg].map(m=>({role:m.role,content:m.content}))})});
      const data=await res.json();
      setMsgs(p=>[...p,{role:"assistant",content:data.content?.[0]?.text||"Try again."}]);
    }catch{setMsgs(p=>[...p,{role:"assistant",content:"Connection error."}]);}
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };
  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 160px)"}}>
      {msgs.length===0?(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 0"}}>
          <div style={{width:90,height:90,borderRadius:"50%",background:`radial-gradient(circle,${T.teal}44,${T.tealDim})`,border:`1px solid ${T.teal}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,marginBottom:16,boxShadow:`0 0 40px ${T.tealGlow}`,animation:"float 3s ease-in-out infinite"}}>🧠</div>
          <div style={{fontSize:26,fontWeight:800,color:T.textPri,fontFamily:"'Syne',sans-serif",marginBottom:6}}>Finance AI</div>
          <div style={{fontSize:13,color:T.textSec,textAlign:"center",lineHeight:1.7,marginBottom:8,maxWidth:300}}>Ask anything about your money. I have full context on your accounts and transactions.</div>
          <div style={{fontSize:11,color:T.textDim,background:T.bg4,borderRadius:10,padding:"5px 12px",marginBottom:28}}>🧠 Powered by Claude AI</div>
          <div style={{width:"100%",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:18,padding:18,marginBottom:20,display:"flex",justifyContent:"space-around"}}>
            {[{val:fmt(totalSpent),lbl:"Spent (90d)",color:T.teal},{val:transactions.length,lbl:"Transactions",color:T.gold},{val:accounts.filter(a=>a.type==="credit").length,lbl:"Cards",color:T.textSec}].map((s,i)=>(
              <div key={i} style={{textAlign:"center"}}>
                <div style={{fontSize:17,fontWeight:800,color:s.color,fontFamily:"'DM Mono'"}}>{s.val}</div>
                <div style={{fontSize:11,color:T.textDim,marginTop:2}}>{s.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.1em",alignSelf:"flex-start",marginBottom:10}}>Suggestions</div>
          <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
            {suggestions.map((s,i)=>(
              <button key={i} onClick={()=>send(s)} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:"13px 16px",color:T.textPri,fontSize:13,fontFamily:"inherit",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
                <span style={{color:T.teal}}>◈</span>{s}
              </button>
            ))}
          </div>
        </div>
      ):(
        <div style={{flex:1,overflowY:"auto",paddingBottom:12}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:14}}>
              {m.role==="assistant"&&<div style={{width:32,height:32,borderRadius:"50%",background:`radial-gradient(circle,${T.teal}44,${T.tealDim})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,marginRight:8,flexShrink:0}}>🧠</div>}
              <div style={{maxWidth:"76%",padding:"12px 16px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?T.gradPri:T.bg2,border:m.role==="user"?"none":`1px solid ${T.border}`,color:m.role==="user"?"#000":T.textPri,fontSize:14,lineHeight:1.6,fontWeight:m.role==="user"?600:400}}>{m.content}</div>
            </div>
          ))}
          {loading&&(
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:T.bg4,display:"flex",alignItems:"center",justifyContent:"center"}}>🧠</div>
              <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:"18px 18px 18px 4px",padding:"14px 18px",display:"flex",gap:5}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.teal,animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      )}
      <div style={{display:"flex",gap:10,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send(input)} placeholder="Ask about your finances…" style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:16,padding:"13px 16px",color:T.textPri,fontSize:14,fontFamily:"inherit"}}/>
        <button onClick={()=>send(input)} disabled={!input.trim()||loading} style={{width:48,height:48,borderRadius:14,background:T.gradPri,border:"none",cursor:"pointer",fontSize:18,opacity:!input.trim()||loading?0.35:1,boxShadow:`0 4px 16px ${T.tealGlow}`,color:"#000",fontWeight:700}}>↑</button>
      </div>
    </div>
  );
};

// ── Analytics ──
const AnalyticsTab=({transactions})=>{
  const[period,setPeriod]=useState("Month");
  const periods=["Week","Month","3 Months","Year"];
  const daysMap={"Week":7,"Month":30,"3 Months":90,"Year":365};
  const now=new Date();
  const days=daysMap[period];
  const cutoff=new Date(now-days*86400000);
  const filtered=transactions.filter(t=>t.amount<0&&new Date(t.date)>=cutoff);
  const totalSpent=Math.abs(filtered.reduce((s,t)=>s+t.amount,0));
  const dailyAvg=totalSpent/days;
  const thisM=Math.abs(transactions.filter(t=>{const d=new Date(t.date);return t.amount<0&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).reduce((s,t)=>s+t.amount,0));
  const lastD=new Date(now.getFullYear(),now.getMonth()-1,1);
  const lastM=Math.abs(transactions.filter(t=>{const d=new Date(t.date);return t.amount<0&&d.getMonth()===lastD.getMonth()&&d.getFullYear()===lastD.getFullYear();}).reduce((s,t)=>s+t.amount,0));
  const momPct=lastM>0?((thisM-lastM)/lastM)*100:0;
  const monthBars=Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1);
    const spent=Math.abs(transactions.filter(t=>{const td=new Date(t.date);return t.amount<0&&td.getMonth()===d.getMonth()&&td.getFullYear()===d.getFullYear();}).reduce((s,t)=>s+t.amount,0));
    return{month:d.toLocaleString("en",{month:"short"}),spent};
  });
  const trendData=Array.from({length:30},(_,i)=>{
    const d=new Date(now-(29-i)*86400000);
    const spent=Math.abs(transactions.filter(t=>t.amount<0&&new Date(t.date).toDateString()===d.toDateString()).reduce((s,t)=>s+t.amount,0));
    return{date:`${d.getMonth()+1}/${d.getDate()}`,spent};
  });
  const byCat=Object.entries(filtered.reduce((acc,t)=>{const c=t.category||"Other";acc[c]=(acc[c]||0)+Math.abs(t.amount);return acc;},{})).map(([cat,val])=>({cat,val,meta:getCatMeta(cat)})).sort((a,b)=>b.val-a.val).slice(0,6);
  const byMerchant=Object.entries(filtered.reduce((acc,t)=>{const m=t.merchant||"Unknown";acc[m]=(acc[m]||0)+Math.abs(t.amount);return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const MONO={fontFamily:"'DM Mono'",fontWeight:700};
  const HEADING={fontFamily:"'Syne',sans-serif",fontWeight:800};
  const LBL={fontSize:11,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:600};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:16,padding:5,gap:3}}>
        {periods.map(p=>(
          <button key={p} onClick={()=>setPeriod(p)} style={{flex:1,padding:"10px 4px",borderRadius:12,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,background:period===p?T.teal:"transparent",color:period===p?"#000":T.textDim,transition:"all 0.2s",boxShadow:period===p?`0 2px 12px ${T.tealGlow}`:"none"}}>{p}</button>
        ))}
      </div>
      <GlassCard glow={T.teal} style={{paddingBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{...LBL,marginBottom:6}}>Total Spent</div>
            <div style={{...HEADING,fontSize:38,letterSpacing:"-0.03em",color:T.textPri}}>{fmt(totalSpent)}</div>
            <div style={{fontSize:13,color:T.teal,marginTop:6}}>◈ Daily avg: {fmt(dailyAvg)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{...MONO,fontSize:32,color:T.gold,textShadow:`0 0 16px ${T.goldGlow}`}}>{filtered.length}</div>
            <div style={{fontSize:12,color:T.textDim}}>transactions</div>
          </div>
        </div>
      </GlassCard>
      <GlassCard>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{...HEADING,fontSize:15,color:T.textPri}}>Month over Month</div>
            <div style={{fontSize:12,color:T.textDim,marginTop:2}}>6-month history</div>
          </div>
          <div style={{background:momPct<=0?"#10b98118":"#f43f5e18",border:`1px solid ${momPct<=0?T.green:T.red}44`,borderRadius:10,padding:"5px 10px"}}>
            <span style={{fontSize:13,fontWeight:700,color:momPct<=0?T.green:T.red}}>{momPct<=0?"↓":"↑"} {Math.abs(momPct).toFixed(1)}%</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={monthBars} barSize={26}>
            <XAxis dataKey="month" tick={{fill:T.textDim,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.textDim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
            <Tooltip content={<ChartTip/>}/>
            <Bar dataKey="spent" name="Spent" radius={[7,7,0,0]}>
              {monthBars.map((_,i)=><Cell key={i} fill={i===monthBars.length-1?T.teal:T.bg4} stroke={i===monthBars.length-1?T.teal:T.borderL}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{display:"flex",justifyContent:"space-around",marginTop:12,borderTop:`1px solid ${T.border}`,paddingTop:12}}>
          {[{val:thisM,lbl:"This month"},{val:lastM,lbl:"Last month"}].map((s,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{...MONO,fontSize:16,color:T.textPri}}>{fmt(s.val)}</div>
              <div style={{fontSize:11,color:T.textDim}}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard>
        <div style={{...HEADING,fontSize:15,color:T.textPri,marginBottom:14}}>Spending Trend</div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="tG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.teal} stopOpacity={0.35}/>
                <stop offset="95%" stopColor={T.teal} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{fill:T.textDim,fontSize:9}} axisLine={false} tickLine={false} interval={7}/>
            <YAxis tick={{fill:T.textDim,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
            <Tooltip content={<ChartTip/>}/>
            <Area type="monotone" dataKey="spent" name="Spent" stroke={T.teal} strokeWidth={2.5} fill="url(#tG)"/>
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>
      <GlassCard>
        <div style={{...HEADING,fontSize:15,color:T.textPri,marginBottom:14}}>By Category</div>
        {byCat.map(({cat,val,meta},i)=>{
          const pct=totalSpent>0?(val/totalSpent)*100:0;
          return(
            <div key={i} style={{marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:7}}>
                <div style={{width:40,height:40,borderRadius:14,background:`${meta.color}18`,border:`1px solid ${meta.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{meta.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:14,fontWeight:600,color:T.textPri}}>{meta.label}</span>
                    <span style={{...MONO,fontSize:14,color:T.textPri}}>{fmt(val)}</span>
                  </div>
                  <div style={{height:5,background:T.bg4,borderRadius:10,marginTop:6}}>
                    <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${meta.color}88,${meta.color})`,borderRadius:10,transition:"width 0.8s cubic-bezier(.22,1,.36,1)",boxShadow:`0 0 8px ${meta.color}66`}}/>
                  </div>
                </div>
                <span style={{fontSize:11,color:T.textDim,minWidth:32,textAlign:"right"}}>{pct.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
        {byCat.length===0&&<p style={{color:T.textDim,fontSize:13,textAlign:"center",padding:"20px 0"}}>No data for this period.</p>}
      </GlassCard>
      <GlassCard style={{marginBottom:4}}>
        <div style={{...HEADING,fontSize:15,color:T.textPri,marginBottom:14}}>Top Merchants</div>
        {byMerchant.map(([merchant,val],i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<byMerchant.length-1?`1px solid ${T.border}`:"none"}}>
            <div style={{width:26,fontSize:14,fontWeight:800,color:i===0?T.gold:T.textDim,fontFamily:"'DM Mono'",textAlign:"center"}}>{i+1}</div>
            <div style={{flex:1,fontSize:14,fontWeight:600,color:T.textPri}}>{merchant}</div>
            <div style={{...MONO,fontSize:15,color:T.textPri}}>{fmt(val)}</div>
          </div>
        ))}
        {byMerchant.length===0&&<p style={{color:T.textDim,fontSize:13,textAlign:"center",padding:"20px 0"}}>No data yet.</p>}
      </GlassCard>
    </div>
  );
};

// ── Main App ──
const TABS=[
  {id:"home",icon:"⌂",label:"Home"},
  {id:"accounts",icon:"⬡",label:"Banking"},
  {id:"transactions",icon:"☰",label:"Activity"},
  {id:"analytics",icon:"◕",label:"Analytics"},
  {id:"ai",icon:"◉",label:"AI"},
];

const MainApp=({token,user,onLogout})=>{
  const[tab,setTab]=useState("home");
  const[accounts,setAccounts]=useState([]);
  const[transactions,setTransactions]=useState([]);
  const[investments,setInvestments]=useState([]);
  const[linkedBanks,setLinkedBanks]=useState([]);
  const[goals,setGoals]=useState([]);
  const[budgets,setBudgets]=useState([]);
  const[linkToken,setLinkToken]=useState(null);
  const[loading,setLoading]=useState(true);
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({});
  const[homeView,setHomeView]=useState("Credit");
  const[txSearch,setTxSearch]=useState("");
  const[txAccount,setTxAccount]=useState("all");
  const[txFilter,setTxFilter]=useState("all");
  const[dismissed,setDismissed]=useState([]);
  const[manualAccounts,setManualAccounts]=useState(()=>{try{return JSON.parse(localStorage.getItem(`ftp_manual_${user.id}`)||"[]");}catch{return[];}});
  const saveManual=(a)=>{setManualAccounts(a);localStorage.setItem(`ftp_manual_${user.id}`,JSON.stringify(a));};
  const api=useCallback((path,opts)=>apiFetch(path,opts,token),[token]);
  const loadAll=useCallback(async()=>{
    setLoading(true);
    try{const[accts,txs,invs,banks,gs,bgs]=await Promise.all([api("/plaid/accounts").catch(()=>[]),api("/plaid/transactions").catch(()=>[]),api("/plaid/investments").catch(()=>[]),api("/plaid/linked-banks").catch(()=>[]),api("/goals").catch(()=>[]),api("/budgets").catch(()=>[])]);setAccounts(accts);setTransactions(txs);setInvestments(invs);setLinkedBanks(banks);setGoals(gs);setBudgets(bgs);}catch(e){console.error(e);}
    setLoading(false);
  },[api]);
  const getLinkToken=useCallback(async()=>{try{const d=await api("/plaid/link-token",{method:"POST"});setLinkToken(d.link_token);}catch{}},[api]);
  useEffect(()=>{loadAll();getLinkToken();},[loadAll,getLinkToken]);
  const handlePlaidSuccess=async(pt,name)=>{try{await api("/plaid/exchange",{method:"POST",body:{public_token:pt,institution_name:name}});await loadAll();await getLinkToken();}catch(e){alert("Failed: "+e.message);}};
  const handleUnlink=async(id,name)=>{if(!window.confirm(`Unlink ${name}?`))return;await api(`/plaid/unlink/${id}`,{method:"DELETE"});await loadAll();};
  const handleAddManual=()=>{if(!form.name||!form.balance)return;saveManual([...manualAccounts,{id:`manual_${Date.now()}`,name:form.name,type:form.type||"credit",subtype:form.type||"credit card",balance:parseFloat(form.balance),institution:"Manual",manual:true}]);setModal(null);setForm({});};
  const handleAddGoal=async()=>{try{const g=await api("/goals",{method:"POST",body:{name:form.name,target:parseFloat(form.target),current:parseFloat(form.current||0),icon:form.icon||"🎯",color:T.teal}});setGoals(gs=>[...gs,g]);setModal(null);setForm({});}catch(e){alert(e.message);}};
  const handleGoalUpdate=async(id,cur)=>{await api(`/goals/${id}`,{method:"PATCH",body:{current:parseFloat(cur)}});setGoals(gs=>gs.map(g=>g.id===id?{...g,current:parseFloat(cur)}:g));};
  const handleDeleteGoal=async(id)=>{await api(`/goals/${id}`,{method:"DELETE"});setGoals(gs=>gs.filter(g=>g.id!==id));};

  const allAccounts=[...accounts,...manualAccounts];
  const netWorth=allAccounts.reduce((s,a)=>s+(a.balance||0),0);
  const creditAccts=allAccounts.filter(a=>a.type==="credit"||a.subtype?.includes("credit"));
  const bankAccts=allAccounts.filter(a=>a.type==="depository"||a.subtype==="checking"||a.subtype==="savings");
  const totalCredit=creditAccts.reduce((s,a)=>s+Math.abs(a.balance||0),0);
  const totalLimit=creditAccts.reduce((s,a)=>s+(a.limit||0),0);
  const totalAvail=creditAccts.reduce((s,a)=>s+(a.available||0),0);
  const utilPct=totalLimit>0?Math.round((totalCredit/totalLimit)*100):0;
  const utilColor=utilPct<10?T.teal:utilPct<30?T.green:utilPct<50?T.amber:T.red;
  const utilLabel=utilPct<10?"Excellent":utilPct<30?"Good":utilPct<50?"Fair":"High";
  const now=new Date();
  const thisMonthTx=transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const monthlyIncome=thisMonthTx.filter(t=>t.amount>0).reduce((s,t)=>s+t.amount,0);
  const monthlyExpenses=Math.abs(thisMonthTx.filter(t=>t.amount<0).reduce((s,t)=>s+t.amount,0));
  const surplus=monthlyIncome-monthlyExpenses;
  const dailySpend=monthlyExpenses/Math.max(now.getDate(),1);
  const weeklyBars=Array.from({length:7},(_,i)=>{const d=new Date(now-(6-i)*86400000);const spent=Math.abs(transactions.filter(t=>new Date(t.date).toDateString()===d.toDateString()&&t.amount<0).reduce((s,t)=>s+t.amount,0));return{day:["S","M","T","W","T","F","S"][d.getDay()],spent};});
  const topCat=(()=>{const m={};thisMonthTx.filter(t=>t.amount<0).forEach(t=>{m[t.category]=(m[t.category]||0)+Math.abs(t.amount)});const top=Object.entries(m).sort((a,b)=>b[1]-a[1])[0];return top?getCatMeta(top[0]):null;})();
  const projData=Array.from({length:30},(_,i)=>({day:i+1,balance:netWorth-dailySpend*i}));
  const filteredTx=transactions.filter(t=>{const matchAcc=txAccount==="all"||t.account_id===txAccount;const matchSrch=!txSearch||t.merchant?.toLowerCase().includes(txSearch.toLowerCase());const matchF=txFilter==="all"||(txFilter==="income"&&t.amount>0)||(txFilter==="expenses"&&t.amount<0);return matchAcc&&matchSrch&&matchF;});
  const txByMonth=filteredTx.reduce((acc,t)=>{const k=t.date?.slice(0,7);if(!k)return acc;if(!acc[k])acc[k]=[];acc[k].push(t);return acc;},{});
  const noData=linkedBanks.length===0&&manualAccounts.length===0;

  const LBL={fontSize:11,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:600};
  const MONO={fontFamily:"'DM Mono'",fontWeight:700};
  const HEADING={fontFamily:"'Syne',sans-serif",fontWeight:800};

  return(
    <div style={{minHeight:"100vh",background:T.bg0,fontFamily:"'DM Sans',sans-serif",color:T.textPri,paddingBottom:96}}>
      <style>{GLOBAL_CSS}</style>
      {/* Ambient mesh */}
      <div style={{position:"fixed",top:"-5%",left:"-5%",width:"55vw",height:"55vh",background:`radial-gradient(ellipse,${T.tealDim} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:"5%",right:"-5%",width:"45vw",height:"40vh",background:`radial-gradient(ellipse,${T.goldDim} 0%,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>

      {/* Header */}
      <div style={{padding:"16px 18px 10px",background:`${T.bg0}ee`,position:"sticky",top:0,zIndex:50,backdropFilter:"blur(20px)",borderBottom:`1px solid ${T.border}40`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:12,background:T.gradPri,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:`0 0 16px ${T.tealGlow}`}}>◈</div>
            <div style={{...HEADING,fontSize:17,color:T.textPri}}>FinTrack Pro</div>
            {linkedBanks.length>0&&<span style={{fontSize:9,background:T.tealDim,color:T.teal,border:`1px solid ${T.teal}44`,borderRadius:8,padding:"2px 7px",fontWeight:700}}>LIVE</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right"}}>
              <div style={{...LBL,fontSize:10}}>Net Worth</div>
              <div style={{...MONO,fontSize:15,color:netWorth>=0?T.teal:T.red,textShadow:`0 0 14px ${netWorth>=0?T.tealGlow:T.redDim}`}}>{loading?"—":fmt(netWorth)}</div>
            </div>
            <div onClick={()=>setModal("profile")} style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${T.tealD},${T.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer",fontWeight:800,color:"#000",boxShadow:`0 0 12px ${T.tealGlow}`}}>
              {user.name[0].toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:"0 16px 16px",position:"relative",zIndex:1}} className="fade-up">

        {/* HOME */}
        {tab==="home"&&<>
          {creditAccts.filter(a=>a.payment_due&&!dismissed.includes(a.id)).map(a=>{
            const chkBal=bankAccts.reduce((s,b)=>s+(b.balance||0),0);
            return(<div key={a.id} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:18,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:T.tealDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>ℹ</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700}}>{a.name}</div>
                <div style={{fontSize:12,color:T.textSec,marginTop:2}}>Min payment {fmt(a.min_payment)} — checking has {fmt(chkBal)}</div>
                {chkBal<(a.min_payment||0)&&<div style={{fontSize:12,color:T.teal,marginTop:4}}>Short {fmt((a.min_payment||0)-chkBal)} — may incur fees</div>}
              </div>
              <button onClick={()=>setDismissed(d=>[...d,a.id])} style={{background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:16}}>✕</button>
            </div>);
          })}

          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {["Credit","Banking"].map(v=>(
              <Pill key={v} active={homeView===v} onClick={()=>setHomeView(v)}>{v==="Credit"?"💳":"🏛"} {v}</Pill>
            ))}
          </div>

          {homeView==="Credit"&&<>
            <GlassCard glow={T.teal} style={{marginBottom:12,textAlign:"center",paddingTop:24,paddingBottom:24}}>
              <div style={{...LBL,marginBottom:8}}>Total Credit Balance</div>
              <div style={{...HEADING,fontSize:46,letterSpacing:"-0.04em",marginBottom:16,color:T.textPri,textShadow:`0 0 30px ${T.tealGlow}`}}>{fmt(totalCredit)}</div>
              <div style={{display:"flex",justifyContent:"space-around"}}>
                {[{val:fmt(totalAvail||(totalLimit-totalCredit)),lbl:"Available",color:T.teal},{val:`${utilPct}%`,lbl:"Utilization",color:utilColor},{val:creditAccts.length,lbl:"Cards",color:T.textPri}].map((s,i)=>(
                  <div key={i}><div style={{...MONO,fontSize:17,color:s.color,textShadow:`0 0 10px ${s.color}44`}}>{s.val}</div><div style={{fontSize:11,color:T.textDim,marginTop:2}}>{s.lbl}</div></div>
                ))}
              </div>
            </GlassCard>

            <GlassCard glow={utilColor} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div>
                  <div style={{...LBL,marginBottom:4}}>Credit Utilization</div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{...HEADING,fontSize:34,color:utilColor,textShadow:`0 0 20px ${utilColor}66`}}>{utilPct}%</span>
                    <span style={{fontSize:12,fontWeight:700,background:`${utilColor}20`,color:utilColor,borderRadius:10,padding:"4px 10px",border:`1px solid ${utilColor}44`}}>{utilLabel}</span>
                  </div>
                </div>
                <ArcProgress pct={utilPct} size={64} color={utilColor}><span style={{fontSize:22}}>💳</span></ArcProgress>
              </div>
              <div style={{position:"relative",height:9,background:T.bg4,borderRadius:20,marginBottom:8}}>
                <div style={{height:"100%",width:`${Math.min(utilPct,100)}%`,background:`linear-gradient(90deg,${utilColor}88,${utilColor})`,borderRadius:20,transition:"width 0.9s cubic-bezier(.22,1,.36,1)",boxShadow:`0 0 12px ${utilColor}88`}}/>
                {[30,50,75].map(m=><div key={m} style={{position:"absolute",top:0,bottom:0,left:`${m}%`,width:1,background:T.border}}/>)}
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:T.textDim}}>↑ {fmt(totalCredit)}</span>
                <span style={{fontSize:12,color:T.textDim}}>⚑ {fmt(totalLimit)} limit</span>
              </div>
            </GlassCard>

            {creditAccts.length>0&&<>
              <div style={{...HEADING,fontSize:16,marginBottom:10}}>Your Cards</div>
              <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:10,marginBottom:4}}>
                {creditAccts.map((a,i)=><CardVisual key={i} name={a.name} mask={a.mask} balance={a.balance}/>)}
                {manualAccounts.filter(a=>a.type==="credit").map((a,i)=><CardVisual key={"m"+i} name={a.name} balance={a.balance}/>)}
              </div>
            </>}

            <GlassCard style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <div style={{...LBL,marginBottom:4}}>This Month</div>
                  <div style={{...HEADING,fontSize:30,letterSpacing:"-0.02em"}}>{fmt(monthlyExpenses)}</div>
                </div>
                {topCat&&<div style={{textAlign:"right",background:T.bg4,borderRadius:12,padding:"8px 12px"}}>
                  <div style={{...LBL,marginBottom:3}}>Top Category</div>
                  <div style={{fontSize:13,fontWeight:700}}>{topCat.icon} {topCat.label}</div>
                </div>}
              </div>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={weeklyBars} barSize={24}>
                  <XAxis dataKey="day" tick={{fill:T.textDim,fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis hide/>
                  <Tooltip content={<ChartTip/>}/>
                  <Bar dataKey="spent" name="Spent" radius={[6,6,0,0]}>
                    {weeklyBars.map((_,i)=><Cell key={i} fill={i===weeklyBars.length-1?T.teal:T.bg4}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{...HEADING,fontSize:16,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:20}}>💸</span> Cash Flow</div>
                <div style={{background:T.goldDim,border:`1px solid ${T.gold}33`,borderRadius:10,padding:"5px 11px"}}>
                  <span style={{...MONO,fontSize:12,color:T.gold}}>{fmt(dailySpend)}/day</span>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1px 1fr 1px 1fr",marginBottom:16}}>
                {[{icon:"↓",color:T.green,val:monthlyIncome,lbl:"Income"},null,{icon:"↑",color:T.red,val:monthlyExpenses,lbl:"Expenses"},null,{icon:"⚡",color:surplus>=0?T.teal:T.amber,val:Math.abs(surplus),lbl:surplus>=0?"Surplus":"Deficit"}].map((s,i)=>
                  s===null?<div key={i} style={{background:T.border,margin:"8px 0"}}/>:(
                    <div key={i} style={{textAlign:"center",padding:"0 8px"}}>
                      <div style={{width:34,height:34,borderRadius:"50%",background:`${s.color}18`,border:`1px solid ${s.color}33`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",fontSize:15,color:s.color}}>{s.icon}</div>
                      <div style={{...MONO,fontSize:15,color:s.color,textShadow:`0 0 10px ${s.color}44`}}>{fmt(s.val)}</div>
                      <div style={{fontSize:11,color:T.textDim,marginTop:2}}>{s.lbl}</div>
                    </div>
                  )
                )}
              </div>
              <div style={{...LBL,marginBottom:8}}>30-Day Projection</div>
              <ResponsiveContainer width="100%" height={65}>
                <AreaChart data={projData}>
                  <defs><linearGradient id="pG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.teal} stopOpacity={0.2}/><stop offset="95%" stopColor={T.teal} stopOpacity={0}/></linearGradient></defs>
                  <Area type="monotone" dataKey="balance" stroke={T.teal} strokeWidth={2} fill="url(#pG)" dot={false}/>
                  <Tooltip formatter={v=>[fmt(v),"Projected"]} labelFormatter={()=>""} contentStyle={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,fontSize:12}}/>
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>

            {noData&&!loading&&<GlassCard glow={T.teal}>
              <div style={{...HEADING,fontSize:16,marginBottom:6}}>👋 Welcome, {user.name.split(" ")[0]}!</div>
              <p style={{fontSize:13,color:T.textSec,marginBottom:18,lineHeight:1.7}}>Link your Chase, Robinhood, or any bank to see your real financial data here.</p>
              {linkToken&&<PlaidLink token={linkToken} onSuccess={handlePlaidSuccess}/>}
              <Btn variant="ghost" onClick={()=>{setForm({type:"credit"});setModal("add_manual");}}>+ Add Manual Account</Btn>
            </GlassCard>}
          </>}

          {homeView==="Banking"&&<>
            {bankAccts.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px"}}>
                <div style={{width:88,height:88,borderRadius:"50%",background:T.tealDim,border:`2px solid ${T.teal}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,margin:"0 auto 20px",animation:"float 3s ease-in-out infinite"}}>🏛</div>
                <div style={{...HEADING,fontSize:22,marginBottom:10}}>Link Your Bank Account</div>
                <div style={{fontSize:14,color:T.textSec,lineHeight:1.7,marginBottom:28}}>Connect checking and savings to track income and cash flow.</div>
                {linkToken&&<PlaidLink token={linkToken} onSuccess={handlePlaidSuccess} label="🔗 Link Bank Account"/>}
              </div>
            ):bankAccts.map((a,i)=>(
              <GlassCard key={i} glow={T.teal} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={LBL}>{a.institution} · {a.subtype}</div>
                    <div style={{fontSize:16,fontWeight:700,marginTop:4}}>{a.name}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{...MONO,fontSize:24,color:T.teal,textShadow:`0 0 16px ${T.tealGlow}`}}>{fmt(a.balance)}</div>
                    {a.available!=null&&<div style={{fontSize:11,color:T.textDim,marginTop:2}}>Available: {fmt(a.available)}</div>}
                  </div>
                </div>
              </GlassCard>
            ))}
          </>}
        </>}

        {/* ACCOUNTS */}
        {tab==="accounts"&&<>
          {allAccounts.map((a,i)=>(
            <GlassCard key={i} style={{marginBottom:10,borderLeft:`3px solid ${a.balance<0?T.red:T.teal}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={LBL}>{a.institution} · {a.subtype||a.type}{a.manual?" · Manual":""}</div>
                  <div style={{fontSize:15,fontWeight:700,marginTop:4}}>{a.name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{...MONO,fontSize:22,color:a.balance<0?T.red:T.teal,textShadow:`0 0 12px ${a.balance<0?T.redDim:T.tealGlow}`}}>{fmt(a.balance)}</div>
                  {a.available!=null&&<div style={{fontSize:11,color:T.textDim,marginTop:2}}>Available: {fmt(a.available)}</div>}
                  {a.manual&&<div style={{display:"flex",gap:6,marginTop:8,justifyContent:"flex-end"}}>
                    <input type="number" defaultValue={a.balance} style={{width:90,background:T.bg4,border:`1px solid ${T.border}`,borderRadius:10,padding:"5px 8px",color:T.textPri,fontSize:12,fontFamily:"inherit"}} onBlur={e=>e.target.value!==""&&saveManual(manualAccounts.map(m=>m.id===a.id?{...m,balance:parseFloat(e.target.value)}:m))}/>
                    <button onClick={()=>saveManual(manualAccounts.filter(m=>m.id!==a.id))} style={{background:T.redDim,border:`1px solid ${T.red}44`,color:T.red,borderRadius:10,padding:"5px 10px",cursor:"pointer",fontSize:11}}>✕</button>
                  </div>}
                </div>
              </div>
            </GlassCard>
          ))}
          {allAccounts.length===0&&!loading&&<p style={{color:T.textDim,fontSize:13,textAlign:"center",padding:"40px 0"}}>No accounts linked.</p>}
          <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:8}}>
            {linkToken&&<PlaidLink token={linkToken} onSuccess={handlePlaidSuccess}/>}
            <Btn variant="ghost" onClick={()=>{setForm({type:"credit"});setModal("add_manual");}}>+ Add Manual Account</Btn>
          </div>
          {linkedBanks.length>0&&<GlassCard style={{marginTop:14}}>
            <div style={{...HEADING,fontSize:16,marginBottom:14}}>Linked Institutions</div>
            {linkedBanks.map(b=>(
              <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.border}`}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600}}>{b.institution_name}</div>
                  <div style={{fontSize:11,color:T.textDim}}>Linked {new Date(b.created_at).toLocaleDateString()}</div>
                </div>
                <Btn small variant="danger" onClick={()=>handleUnlink(b.id,b.institution_name)}>Unlink</Btn>
              </div>
            ))}
          </GlassCard>}
          {investments.length>0&&<GlassCard style={{marginTop:14}}>
            <div style={{...HEADING,fontSize:16,marginBottom:14}}>Investments</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
              <div><div style={LBL}>Portfolio Value</div><div style={{...MONO,fontSize:22,color:"#a78bfa"}}>{fmt(investments.reduce((s,i)=>s+i.value,0))}</div></div>
              <div style={{textAlign:"right"}}><div style={LBL}>Holdings</div><div style={{...MONO,fontSize:22}}>{investments.length}</div></div>
            </div>
            {investments.slice(0,8).map((inv,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<investments.length-1?`1px solid ${T.border}`:"none"}}>
                <div style={{width:40,height:40,borderRadius:12,background:"#a78bfa18",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono'",fontSize:10,fontWeight:700,color:"#a78bfa",flexShrink:0}}>{inv.ticker?.slice(0,5)}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{inv.name}</div><div style={{fontSize:11,color:T.textDim,marginTop:1}}>{inv.shares?.toFixed(4)} sh @ {fmt(inv.price)}</div></div>
                <div style={{textAlign:"right"}}><div style={{...MONO,fontSize:13}}>{fmt(inv.value)}</div>{inv.change_pct!=null&&<div style={{fontSize:11,color:parseFloat(inv.change_pct)>=0?T.green:T.red}}>{parseFloat(inv.change_pct)>=0?"+":""}{inv.change_pct}%</div>}</div>
              </div>
            ))}
          </GlassCard>}
          <GlassCard style={{marginTop:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{...HEADING,fontSize:16}}>Goals</div>
              <button onClick={()=>{setForm({});setModal("add_goal");}} style={{background:T.tealDim,border:`1px solid ${T.teal}44`,color:T.teal,borderRadius:10,padding:"6px 13px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"inherit"}}>+ New</button>
            </div>
            {goals.map(g=>{const pct=Math.min((g.current/g.target)*100,100);return(
              <div key={g.id} style={{marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:22}}>{g.icon}</span><div><div style={{fontSize:14,fontWeight:700}}>{g.name}</div><div style={{fontSize:11,color:T.textDim}}>{pct.toFixed(0)}% complete</div></div></div>
                  <div style={{textAlign:"right"}}><div style={{...MONO,fontSize:15,color:T.teal}}>{fmt(g.current)}</div><div style={{fontSize:11,color:T.textDim}}>/ {fmt(g.target)}</div></div>
                </div>
                <div style={{height:7,background:T.bg4,borderRadius:20}}>
                  <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${T.tealD},${T.teal})`,borderRadius:20,transition:"width 0.8s cubic-bezier(.22,1,.36,1)",boxShadow:`0 0 10px ${T.tealGlow}`}}/>
                </div>
              </div>
            );})}
            {goals.length===0&&<p style={{color:T.textDim,fontSize:13}}>No goals yet.</p>}
          </GlassCard>
        </>}

        {/* TRANSACTIONS */}
        {tab==="transactions"&&<>
          <div style={{marginBottom:16}}>
            <div style={{...HEADING,fontSize:26}}>Activity</div>
            <div style={{fontSize:13,color:T.textDim,marginTop:2}}>{filteredTx.length} transactions</div>
          </div>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:10}}>
            <Pill active={txAccount==="all"} onClick={()=>setTxAccount("all")}>☰ All</Pill>
            {accounts.map((a,i)=><Pill key={i} active={txAccount===a.account_id} onClick={()=>setTxAccount(a.account_id)}>💳 {a.name?.slice(0,10)}{a.mask?` •${a.mask}`:""}</Pill>)}
          </div>
          <div style={{position:"relative",marginBottom:10}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.textDim,fontSize:16}}>🔍</span>
            <input value={txSearch} onChange={e=>setTxSearch(e.target.value)} placeholder="Search transactions…" style={{width:"100%",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:16,padding:"13px 16px 13px 44px",color:T.textPri,fontSize:14,fontFamily:"inherit"}}/>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {[["all","All"],["income","Income"],["expenses","Expenses"]].map(([v,l])=>(
              <Pill key={v} active={txFilter===v} onClick={()=>setTxFilter(v)} color={v==="income"?T.green:v==="expenses"?T.red:T.teal}>{l}</Pill>
            ))}
          </div>
          {Object.entries(txByMonth).sort((a,b)=>b[0].localeCompare(a[0])).map(([key,txs])=>{
            const label=new Date(key+"-01").toLocaleString("en",{month:"long",year:"numeric"});
            const total=Math.abs(txs.filter(t=>t.amount<0).reduce((s,t)=>s+t.amount,0));
            if(txs.length===0)return null;
            return(
              <div key={key} style={{marginBottom:4}}>
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",marginBottom:4}}>
                  <span style={{fontSize:14,fontWeight:700,color:T.textSec}}>{label}</span>
                  <span style={{...MONO,fontSize:13,color:T.textSec}}>{fmt(total)}</span>
                </div>
                <GlassCard style={{marginBottom:10}}>
                  {txs.map((tx,i)=>{
                    const meta=getCatMeta(tx.category);
                    return(
                      <div key={tx.id} style={{display:"flex",alignItems:"center",gap:13,padding:"13px 0",borderBottom:i<txs.length-1?`1px solid ${T.border}40`:"none"}}>
                        <div style={{position:"relative",flexShrink:0}}>
                          <div style={{width:44,height:44,borderRadius:15,background:`${meta.color}18`,border:`1px solid ${meta.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                            {tx.logo?<img src={tx.logo} alt="" style={{width:28,height:28,borderRadius:8}}/>:meta.icon}
                          </div>
                          <div style={{position:"absolute",bottom:-1,right:-1,width:10,height:10,borderRadius:"50%",background:T.teal,border:`2px solid ${T.bg2}`}}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.merchant}</div>
                          <div style={{fontSize:12,color:T.textDim,marginTop:1}}>{meta.label} · {tx.date?.slice(5)}</div>
                        </div>
                        <div style={{...MONO,fontSize:14,color:tx.amount>0?T.teal:T.textPri,textShadow:tx.amount>0?`0 0 10px ${T.tealGlow}`:"none",flexShrink:0}}>
                          {tx.amount>0?"+":""}{fmt(tx.amount)}
                        </div>
                      </div>
                    );
                  })}
                </GlassCard>
              </div>
            );
          })}
          {filteredTx.length===0&&!loading&&<div style={{textAlign:"center",padding:"50px 20px",color:T.textDim}}><div style={{fontSize:40,marginBottom:12}}>📭</div><div style={{fontSize:15,fontWeight:600}}>No transactions found</div><div style={{fontSize:13,marginTop:6}}>Link a bank to see real data</div></div>}
        </>}

        {/* ANALYTICS */}
        {tab==="analytics"&&<>
          <div style={{marginBottom:18}}>
            <div style={{...HEADING,fontSize:26}}>Analytics</div>
            <div style={{fontSize:13,color:T.textDim,marginTop:2}}>Track your spending</div>
          </div>
          <AnalyticsTab transactions={transactions}/>
        </>}

        {/* AI */}
        {tab==="ai"&&<AITab accounts={allAccounts} transactions={transactions} user={user}/>}
      </div>

      {/* Bottom nav */}
      <nav style={{position:"fixed",bottom:0,left:0,right:0,background:`${T.bg1}f0`,borderTop:`1px solid ${T.border}`,display:"flex",padding:"10px 10px 28px",zIndex:50,backdropFilter:"blur(24px)",gap:4}}>
        {TABS.map(t=>{
          const active=tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"2px 0"}}>
              {active?(
                <div style={{background:T.gradPri,borderRadius:50,padding:"9px 18px",display:"flex",alignItems:"center",gap:7,boxShadow:`0 4px 20px ${T.tealGlow}`}}>
                  <span style={{fontSize:15}}>{t.icon}</span>
                  <span style={{fontSize:13,fontWeight:700,fontFamily:"inherit",color:"#000"}}>{t.label}</span>
                </div>
              ):(
                <span style={{fontSize:22,color:T.textDim}}>{t.icon}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      {modal==="add_manual"&&<Modal title="Add Manual Account" onClose={()=>setModal(null)}>
        <p style={{fontSize:13,color:T.textSec,marginBottom:18,lineHeight:1.7}}>For accounts that cannot connect via Plaid (like Discover). Update the balance anytime.</p>
        <Input label="Account Name" placeholder="Discover Student Card" value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
        <Input label="Current Balance ($)" type="number" placeholder="-450.00  (negative = debt)" value={form.balance||""} onChange={e=>setForm(f=>({...f,balance:e.target.value}))}/>
        <div style={{marginBottom:16}}>
          <label style={{...LBL,display:"block",marginBottom:6}}>Account Type</label>
          <select value={form.type||"credit"} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{width:"100%",background:T.bg4,border:`1px solid ${T.border}`,borderRadius:14,padding:"13px 16px",color:T.textPri,fontSize:14}}>
            <option value="credit">Credit Card</option><option value="checking">Checking</option><option value="savings">Savings</option><option value="loan">Loan</option><option value="other">Other</option>
          </select>
        </div>
        <Btn onClick={handleAddManual}>Add Account</Btn>
      </Modal>}

      {modal==="add_goal"&&<Modal title="New Savings Goal" onClose={()=>setModal(null)}>
        <Input label="Goal Name" placeholder="Emergency Fund" value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
        <Input label="Target ($)" type="number" placeholder="10000" value={form.target||""} onChange={e=>setForm(f=>({...f,target:e.target.value}))}/>
        <Input label="Current ($)" type="number" placeholder="0" value={form.current||""} onChange={e=>setForm(f=>({...f,current:e.target.value}))}/>
        <Input label="Icon (emoji)" placeholder="🎯" value={form.icon||""} onChange={e=>setForm(f=>({...f,icon:e.target.value}))}/>
        <Btn onClick={handleAddGoal}>Create Goal</Btn>
      </Modal>}

      {modal==="profile"&&<Modal title="Your Account" onClose={()=>setModal(null)}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{width:68,height:68,borderRadius:"50%",background:T.gradPri,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:800,margin:"0 auto 14px",color:"#000",boxShadow:`0 0 24px ${T.tealGlow}`}}>{user.name[0].toUpperCase()}</div>
          <div style={{...HEADING,fontSize:18}}>{user.name}</div>
          <div style={{fontSize:13,color:T.textDim,marginTop:4}}>{user.email}</div>
        </div>
        <div style={{background:T.bg4,border:`1px solid ${T.border}`,borderRadius:16,padding:"16px 20px",marginBottom:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",textAlign:"center"}}>
          {[{val:linkedBanks.length,lbl:"Banks",color:T.teal},{val:transactions.length,lbl:"Txns",color:T.gold},{val:fmt(netWorth),lbl:"Worth",color:T.textPri}].map((s,i)=>(
            <div key={i}><div style={{...MONO,fontSize:16,color:s.color}}>{s.val}</div><div style={{fontSize:11,color:T.textDim,marginTop:2}}>{s.lbl}</div></div>
          ))}
        </div>
        <Btn variant="ghost" onClick={()=>{localStorage.removeItem("fintrackpro_token");onLogout();}}>Sign Out</Btn>
      </Modal>}
    </div>
  );
};

export default function App(){
  const[token,setToken]=useState(null);
  const[user,setUser]=useState(null);
  useEffect(()=>{
    const t=localStorage.getItem("fintrackpro_token");
    if(t){try{const p=JSON.parse(atob(t.split(".")[1]));if(p.exp*1000>Date.now()){setToken(t);setUser({id:p.id,name:p.name,email:p.email});}else localStorage.removeItem("fintrackpro_token");}catch{localStorage.removeItem("fintrackpro_token");}}
  },[]);
  if(!token)return<LoginScreen onLogin={(t,u)=>{setToken(t);setUser(u);}}/>;
  return<MainApp token={token} user={user} onLogout={()=>{setToken(null);setUser(null);}}/>;
}