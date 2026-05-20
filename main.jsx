import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, Coffee, CreditCard, FileSpreadsheet, LogOut, Moon, Sun, Bot } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, LineChart, Line } from 'recharts';
import './index.css';
import { api, apiBase } from './client';

function Login({ onLogin }) {
  const [email,setEmail]=useState('admin@demo.mn');
  const [password,setPassword]=useState('password123');
  const [error,setError]=useState('');
  async function submit(e){
    e.preventDefault();
    try {
      const data = await api('/auth/login',{method:'POST',body:JSON.stringify({email,password})});
      localStorage.setItem('token',data.token);
      localStorage.setItem('user',JSON.stringify(data.user));
      onLogin(data.user);
    } catch(err){ setError(err.message); }
  }
  return <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-amber-50 to-stone-200 dark:from-slate-950 dark:to-slate-900">
    <form onSubmit={submit} className="card w-full max-w-md p-8 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-amber-600 text-white"><Coffee /></div>
        <div><h1 className="text-2xl font-bold">Cafe AI Finance</h1><p className="text-sm opacity-70">POS + Accounting + AI Assistant</p></div>
      </div>
      <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button className="btn-primary w-full">Login</button>
    </form>
  </div>
}

function Layout({ children, page, setPage, user, setUser }) {
  const [dark,setDark]=useState(localStorage.getItem('theme')==='dark');
  useEffect(()=>{ document.documentElement.classList.toggle('dark',dark); localStorage.setItem('theme',dark?'dark':'light'); },[dark]);
  const nav = [
    ['dashboard','Dashboard',BarChart3],['pos','POS',Coffee],['bank','Bank AI',CreditCard],['reports','Reports',FileSpreadsheet],['assistant','AI Chat',Bot]
  ];
  return <div className="min-h-screen flex">
    <aside className="hidden md:flex w-72 p-4 flex-col gap-3 border-r border-stone-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80">
      <h2 className="text-xl font-black px-2">☕ Modern Cafe</h2>
      {nav.map(([id,label,Icon])=><button key={id} onClick={()=>setPage(id)} className={`btn text-left flex gap-3 items-center ${page===id?'bg-amber-600 text-white':'bg-transparent hover:bg-stone-100 dark:hover:bg-slate-800'}`}><Icon size={18}/>{label}</button>)}
      <div className="mt-auto text-sm opacity-70 px-2">{user?.name} · {user?.role}</div>
      <button className="btn-soft flex gap-2" onClick={()=>setDark(!dark)}>{dark?<Sun/>:<Moon/>} Theme</button>
      <button className="btn-soft flex gap-2" onClick={()=>{localStorage.clear();setUser(null)}}><LogOut/> Logout</button>
    </aside>
    <main className="flex-1 p-4 md:p-6 overflow-auto">
      <div className="md:hidden flex gap-2 overflow-x-auto mb-4">{nav.map(([id,label])=><button key={id} onClick={()=>setPage(id)} className="btn-soft whitespace-nowrap">{label}</button>)}</div>
      {children}
    </main>
  </div>
}

function Dashboard(){
  const [data,setData]=useState(null);
  useEffect(()=>{api('/reports/dashboard').then(setData)},[]);
  if(!data) return <p>Loading...</p>;
  return <div className="space-y-6">
    <h1 className="text-3xl font-black">Dashboard</h1>
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card p-5"><p className="opacity-60">Өнөөдрийн борлуулалт</p><b className="text-3xl">{Number(data.dailySales).toLocaleString()}₮</b></div>
      <div className="card p-5"><p className="opacity-60">Сарын орлого</p><b className="text-3xl">{Number(data.monthlyRevenue).toLocaleString()}₮</b></div>
      <div className="card p-5"><p className="opacity-60">AI Insights</p><b className="text-xl">Зардал, орлого автоматаар ангилна</b></div>
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="card p-5 h-80"><h3 className="font-bold mb-3">Top Products</h3><ResponsiveContainer><BarChart data={data.topProducts}><XAxis dataKey="name" hide/><YAxis/><Tooltip/><Bar dataKey="revenue"/></BarChart></ResponsiveContainer></div>
      <div className="card p-5 h-80"><h3 className="font-bold mb-3">Cash Flow</h3><ResponsiveContainer><LineChart data={data.cashflow}><XAxis dataKey="date" hide/><YAxis/><Tooltip/><Line dataKey="net"/></LineChart></ResponsiveContainer></div>
      <div className="card p-5 h-80"><h3 className="font-bold mb-3">Expenses</h3><ResponsiveContainer><PieChart><Pie data={data.expenses} dataKey="amount" nameKey="category" outerRadius={90} label /></PieChart></ResponsiveContainer></div>
    </div>
  </div>
}

function POS(){
  const [products,setProducts]=useState([]), [cart,setCart]=useState([]), [method,setMethod]=useState('cash'), [receipt,setReceipt]=useState(null);
  useEffect(()=>{api('/products').then(setProducts)},[]);
  function add(p){ setCart(c=>{ const x=c.find(i=>i.product_id===p.id); return x?c.map(i=>i.product_id===p.id?{...i,qty:i.qty+1}:i):[...c,{product_id:p.id,name:p.name,price:Number(p.selling_price),qty:1,image_url:p.image_url}]})}
  const total=cart.reduce((s,i)=>s+i.price*i.qty,0);
  async function pay(){
    const order=await api('/pos/orders',{method:'POST',body:JSON.stringify({order_type:'takeaway',items:cart,payment_method:method})});
    setReceipt(order.receipt_json); setCart([]);
  }
  return <div className="grid lg:grid-cols-[1fr_380px] gap-4">
    <div>
      <h1 className="text-3xl font-black mb-4">Fast POS</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {products.map(p=><button key={p.id} onClick={()=>add(p)} className="card p-3 text-left hover:scale-[1.02] transition">
          <img src={p.image_url} className="rounded-xl h-28 w-full object-cover mb-3"/>
          <b>{p.name}</b><p className="text-amber-600 font-bold">{Number(p.selling_price).toLocaleString()}₮</p>
        </button>)}
      </div>
    </div>
    <div className="card p-4 h-fit sticky top-4">
      <h2 className="text-xl font-black">Cart</h2>
      {cart.map(i=><div key={i.product_id} className="flex justify-between py-2 border-b dark:border-slate-800"><span>{i.name} × {i.qty}</span><b>{(i.qty*i.price).toLocaleString()}₮</b></div>)}
      <div className="flex justify-between text-2xl font-black py-4"><span>Total</span><span>{total.toLocaleString()}₮</span></div>
      <select className="input mb-3" value={method} onChange={e=>setMethod(e.target.value)}><option value="cash">Cash</option><option value="qr">QR</option><option value="bank">Bank</option></select>
      <button disabled={!cart.length} onClick={pay} className="btn-primary w-full disabled:opacity-50">Pay & Generate Receipt</button>
      {receipt && <pre className="mt-4 text-xs bg-stone-100 dark:bg-slate-800 p-3 rounded-xl overflow-auto">{JSON.stringify(receipt,null,2)}</pre>}
    </div>
  </div>
}

function BankAI(){
  const [file,setFile]=useState(null),[preview,setPreview]=useState([]),[files,setFiles]=useState([]),[txs,setTxs]=useState([]);
  const load=()=>{api('/bank/files').then(setFiles);api('/bank/transactions').then(setTxs)};
  useEffect(load,[]);
  async function upload(){
    const fd=new FormData(); fd.append('statement',file);
    const data=await api('/bank/upload',{method:'POST',body:fd});
    setPreview(data.preview); load();
  }
  async function del(id, permanent=false){
    await api(`/bank/files/${id}/${permanent?'permanent':'soft'}`,{method:'DELETE'}); load();
  }
  return <div className="space-y-5">
    <h1 className="text-3xl font-black">Bank Statement AI</h1>
    <div className="card p-5">
      <p className="mb-3 opacity-70">CSV/Excel хуулга оруулаад AI ангилал, duplicate, preview харна. Дараа нь устгаж болно.</p>
      <input className="input" type="file" onChange={e=>setFile(e.target.files[0])}/>
      <button className="btn-primary mt-3" onClick={upload} disabled={!file}>Upload & Analyze</button>
    </div>
    {!!preview.length && <div className="card p-5 overflow-auto"><h2 className="font-bold mb-2">Preview Parsed Result</h2><Table rows={preview}/></div>}
    <div className="card p-5 overflow-auto"><h2 className="font-bold mb-2">Uploaded Files</h2>
      {files.map(f=><div key={f.id} className="flex flex-wrap gap-2 justify-between py-2 border-b dark:border-slate-800"><span>{f.original_name} · {f.status} · {f.parsed_count} rows</span><span className="flex gap-2"><button className="btn-soft" onClick={()=>api('/bank/confirm-import/'+f.id,{method:'POST'}).then(load)}>Confirm</button><button className="btn-soft" onClick={()=>del(f.id,false)}>Soft Delete</button><button className="btn-soft" onClick={()=>del(f.id,true)}>Permanent</button></span></div>)}
    </div>
    <div className="card p-5 overflow-auto"><h2 className="font-bold mb-2">AI Classified Transactions</h2><Table rows={txs}/></div>
  </div>
}

function Table({rows}){
  if(!rows?.length) return <p>No data</p>;
  const keys=Object.keys(rows[0]).slice(0,10);
  return <table className="w-full text-sm"><thead><tr>{keys.map(k=><th className="text-left p-2" key={k}>{k}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t dark:border-slate-800">{keys.map(k=><td className="p-2" key={k}>{String(r[k]??'').slice(0,80)}</td>)}</tr>)}</tbody></table>
}

function Reports(){
  const [pl,setPl]=useState(null),[vat,setVat]=useState(null);
  useEffect(()=>{api('/reports/profit-loss').then(setPl);api('/reports/vat').then(setVat)},[]);
  return <div className="space-y-5">
    <h1 className="text-3xl font-black">Reports</h1>
    <div className="grid md:grid-cols-3 gap-4">
      <div className="card p-5"><p>Income</p><b className="text-2xl">{Number(pl?.income||0).toLocaleString()}₮</b></div>
      <div className="card p-5"><p>Expense</p><b className="text-2xl">{Number(pl?.expense||0).toLocaleString()}₮</b></div>
      <div className="card p-5"><p>Profit</p><b className="text-2xl">{Number(pl?.profit||0).toLocaleString()}₮</b></div>
    </div>
    <div className="card p-5"><h2 className="font-bold">Monthly VAT</h2><pre>{JSON.stringify(vat,null,2)}</pre></div>
    <a className="btn-primary inline-block" href={`${apiBase}/reports/export/monthly-report`} target="_blank">Export Excel</a>
  </div>
}

function Assistant(){
  const [q,setQ]=useState('Өнөөдрийн ашиг хэд вэ?'),[ans,setAns]=useState('');
  async function ask(){ const r=await api('/ai/chat',{method:'POST',body:JSON.stringify({question:q})}); setAns(r.answer); }
  return <div className="max-w-3xl space-y-4">
    <h1 className="text-3xl font-black">AI Financial Assistant</h1>
    <div className="card p-5 space-y-3">
      <textarea className="input min-h-28" value={q} onChange={e=>setQ(e.target.value)} />
      <button className="btn-primary" onClick={ask}>Ask AI</button>
      {ans && <div className="rounded-2xl bg-amber-50 dark:bg-slate-800 p-4 text-lg">{ans}</div>}
    </div>
    <div className="grid sm:grid-cols-2 gap-2">
      {['Энэ сарын хамгийн их зардал юу вэ?','НӨАТ хэд гарах вэ?','Ямар бүтээгдэхүүн хамгийн ашигтай байна?','Сарын санхүүгийн дүгнэлт гарга'].map(x=><button className="btn-soft text-left" onClick={()=>setQ(x)} key={x}>{x}</button>)}
    </div>
  </div>
}

function App(){
  const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem('user')||'null'));
  const [page,setPage]=useState('dashboard');
  if(!user) return <Login onLogin={setUser}/>;
  const pages={dashboard:<Dashboard/>,pos:<POS/>,bank:<BankAI/>,reports:<Reports/>,assistant:<Assistant/>};
  return <Layout page={page} setPage={setPage} user={user} setUser={setUser}>{pages[page]}</Layout>
}

createRoot(document.getElementById('root')).render(<App/>);
