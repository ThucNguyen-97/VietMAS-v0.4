"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Item = { id: number; sku: string; name: string; category: string; unit: string; quantity: number; low_stock_threshold: number; packaging_note?: string };
type Transaction = { id: number; item_id: number; transaction_type: string; quantity: number; note: string; created_by_id: number; created_at: string };
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  const headers = (authToken = token) => ({ Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" });

  const loadDashboard = async (authToken: string) => {
    try {
      const authHeaders = { Authorization: `Bearer ${authToken}` };
      const [meResponse, inventoryResponse, transactionsResponse] = await Promise.all([
        fetch(`${API}/users/me`, { headers: authHeaders }),
        fetch(`${API}/inventory`, { headers: authHeaders }),
        fetch(`${API}/inventory/transactions`, { headers: authHeaders }),
      ]);
      if (!meResponse.ok || !inventoryResponse.ok || !transactionsResponse.ok) throw new Error();
      const me = await meResponse.json();
      setRole(me.role);
      setItems(await inventoryResponse.json());
      setTransactions(await transactionsResponse.json());
      if (me.role === "admin" || me.role === "ceo") {
        const statisticsResponse = await fetch(`${API}/admin/statistics`, { headers: authHeaders });
        if (statisticsResponse.ok) setStats(await statisticsResponse.json());
      } else setStats({});
    } catch { setError("Phiên đăng nhập không hợp lệ hoặc không thể kết nối backend"); setToken(""); }
  };

  useEffect(() => {
    const savedToken = window.localStorage.getItem("vietmas_token");
    if (savedToken) { setToken(savedToken); loadDashboard(savedToken); }
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      window.localStorage.setItem("vietmas_token", data.access_token);
      setToken(data.access_token); await loadDashboard(data.access_token);
    } catch { setError("Sai tài khoản/mật khẩu hoặc backend chưa chạy"); }
    finally { setLoading(false); }
  }

  async function submitInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const data: Record<string, FormDataEntryValue> = {};
    new FormData(event.currentTarget).forEach((value, key) => { data[key] = value; });
    const endpoint = editing ? `${API}/inventory/${editing.id}` : `${API}/inventory`;
    const method = editing ? "PUT" : "POST";
    const payload = editing ? { name: data.name, unit: data.unit, low_stock_threshold: Number(data.low_stock_threshold), packaging_note: data.packaging_note } : { sku: data.sku, name: data.name, category: data.category, unit: data.unit, quantity: Number(data.quantity), low_stock_threshold: Number(data.low_stock_threshold), packaging_note: data.packaging_note };
    const response = await fetch(endpoint, { method, headers: headers(), body: JSON.stringify(payload) });
    if (!response.ok) { setError((await response.json()).detail ?? "Không thể lưu sản phẩm"); return; }
    setMessage(editing ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm"); setEditing(null); event.currentTarget.reset(); await loadDashboard(token);
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(`Xóa ${item.name}?`)) return;
    const response = await fetch(`${API}/inventory/${item.id}`, { method: "DELETE", headers: headers() });
    if (!response.ok) { setError((await response.json()).detail ?? "Không thể xóa sản phẩm"); return; }
    setMessage("Đã xóa sản phẩm"); await loadDashboard(token);
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const data: Record<string, FormDataEntryValue> = {};
    new FormData(event.currentTarget).forEach((value, key) => { data[key] = value; });
    const response = await fetch(`${API}/inventory/transactions`, { method: "POST", headers: headers(), body: JSON.stringify({ item_id: Number(data.item_id), transaction_type: data.transaction_type, quantity: Number(data.quantity), note: data.note }) });
    if (!response.ok) { setError((await response.json()).detail ?? "Không thể tạo giao dịch"); return; }
    setMessage("Đã ghi nhận giao dịch kho"); event.currentTarget.reset(); await loadDashboard(token);
  }

  function signOut() { window.localStorage.removeItem("vietmas_token"); setToken(""); setItems([]); setTransactions([]); setStats({}); }

  if (!token) return <main><div className="card" style={{ maxWidth: 420, margin: "80px auto" }}><h1>VietMAS Admin</h1><p className="muted">Đăng nhập quản trị kho</p><form onSubmit={signIn}><label>Tài khoản<input value={username} onChange={(e) => setUsername(e.target.value)} /></label><label>Mật khẩu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><button disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button></form>{error && <p>{error}</p>}</div></main>;

  const canEdit = role === "admin" || role === "ceo";
  const canAdjust = role === "admin";
  return <main>
    <div className="topbar"><div><h1>VietMAS Admin</h1><div className="muted">Quản lý kho muối ớt · Vai trò: {role}</div></div><button onClick={signOut}>Đăng xuất</button></div>
    {(error || message) && <div className="card notice">{error || message}</div>}
    <div className="grid"><div className="card"><div className="muted">Người dùng</div><div className="value">{stats.users ?? "—"}</div></div><div className="card"><div className="muted">Mặt hàng</div><div className="value">{stats.inventory_items ?? items.length}</div></div><div className="card"><div className="muted">Giao dịch kho</div><div className="value">{stats.inventory_transactions ?? transactions.length}</div></div><div className="card"><div className="muted">Câu hỏi</div><div className="value">{stats.questions ?? "—"}</div></div></div>

    <section className="section"><h2>{editing ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2><form className="form-grid" onSubmit={submitInventory} key={editing?.id ?? "new"}><label>SKU<input name="sku" defaultValue={editing?.sku ?? ""} disabled={Boolean(editing)} required /></label><label>Tên hàng<input name="name" defaultValue={editing?.name ?? ""} required /></label><label>Nhóm<select name="category" defaultValue={editing?.category ?? "raw_material"} disabled={Boolean(editing)}><option value="raw_material">Nguyên liệu</option><option value="finished_goods">Thành phẩm</option></select></label><label>Đơn vị<input name="unit" defaultValue={editing?.unit ?? "kg"} required /></label><label>Số lượng ban đầu<input name="quantity" type="number" min="0" defaultValue={editing?.quantity ?? 0} disabled={Boolean(editing)} /></label><label>Ngưỡng cảnh báo<input name="low_stock_threshold" type="number" min="0" defaultValue={editing?.low_stock_threshold ?? 0} required /></label><label>Quy cách/Ghi chú<input name="packaging_note" defaultValue={editing?.packaging_note ?? ""} /></label><div className="form-actions"><button type="submit">{editing ? "Lưu thay đổi" : "Thêm sản phẩm"}</button>{editing && <button type="button" onClick={() => setEditing(null)}>Hủy</button>}</div></form></section>

    <section className="section"><h2>Tồn kho</h2><table><thead><tr><th>SKU</th><th>Tên hàng</th><th>Nhóm</th><th>Tồn</th><th>Cảnh báo</th><th>Thao tác</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.sku}</td><td>{item.name}</td><td>{item.category === "raw_material" ? "Nguyên liệu" : "Thành phẩm"}</td><td>{item.quantity} {item.unit}</td><td>{item.quantity <= item.low_stock_threshold ? "Sắp hết" : "Bình thường"}</td><td>{canEdit && <><button onClick={() => setEditing(item)}>Sửa</button> <button onClick={() => deleteItem(item)}>Xóa</button></>}</td></tr>)}</tbody></table></section>

    <section className="section"><h2>Ghi nhận giao dịch</h2><form className="form-grid" onSubmit={submitTransaction}><label>Sản phẩm<select name="item_id" required>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>)}</select></label><label>Loại giao dịch<select name="transaction_type"><option value="import">Nhập kho</option><option value="export">Xuất kho</option>{canAdjust && <option value="adjustment">Điều chỉnh tồn kho</option>}</select></label><label>Số lượng<input name="quantity" type="number" min="1" required /></label><label>Ghi chú<input name="note" required /></label><div className="form-actions"><button type="submit">Ghi nhận</button></div></form></section>

    <section className="section"><h2>Lịch sử giao dịch</h2><table><thead><tr><th>Thời gian</th><th>Sản phẩm</th><th>Loại</th><th>Số lượng</th><th>Ghi chú</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id}><td>{new Date(transaction.created_at).toLocaleString("vi-VN")}</td><td>{items.find((item) => item.id === transaction.item_id)?.name ?? transaction.item_id}</td><td>{transaction.transaction_type}</td><td>{transaction.quantity}</td><td>{transaction.note}</td></tr>)}</tbody></table></section>
  </main>;
}
