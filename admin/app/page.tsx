"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Item = { id: number; sku: string; name: string; category: string; unit: string; quantity: number; low_stock_threshold: number; packaging_note?: string };
type Transaction = { id: number; item_id: number; transaction_type: string; quantity: number; note: string; created_by_id: number; created_at: string };
type User = { id: number; username: string; display_name: string; role: string };
type CompanyProfile = { id?: number; legal_name: string; short_name?: string; tax_code: string; address?: string; phone?: string; email?: string; legal_representative?: string; logo_url?: string };
type CompanyProfileHistory = { id: number; action: string; changed_by_id: number; changed_at: string; snapshot: CompanyProfile };
type Partner = { id: number; legal_name: string; short_name?: string; partner_type: "customer" | "vendor" | "service"; tax_code: string; legal_representative?: string; address?: string; phone?: string; email?: string; logo_url?: string; status: "active" | "inactive"; created_by_id: number; created_at: string; updated_at: string; supply_item_ids: number[] };
type PartnerHistory = { id: number; action: string; changed_by_id: number; changed_at: string; snapshot: Partner };
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [companyProfileHistory, setCompanyProfileHistory] = useState<CompanyProfileHistory[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerHistory, setPartnerHistory] = useState<PartnerHistory[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState<"warehouse" | "users" | "settings">("warehouse");
  const [settingsTab, setSettingsTab] = useState<"company" | "partners">("company");
  const [companyTab, setCompanyTab] = useState<"info" | "history">("info");
  const [partnerTab, setPartnerTab] = useState<"list" | "history">("list");
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);

  const headers = (authToken = token) => ({ Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" });

  const loadDashboard = async (authToken: string) => {
    try {
      const authHeaders = { Authorization: `Bearer ${authToken}` };
      const [meResponse, inventoryResponse, transactionsResponse, partnersResponse] = await Promise.all([
        fetch(`${API}/users/me`, { headers: authHeaders }),
        fetch(`${API}/inventory`, { headers: authHeaders }),
        fetch(`${API}/inventory/transactions`, { headers: authHeaders }),
        fetch(`${API}/partners`, { headers: authHeaders }),
      ]);
      if (!meResponse.ok || !inventoryResponse.ok || !transactionsResponse.ok) throw new Error();
      const me = await meResponse.json();
      setRole(me.role);
      setItems(await inventoryResponse.json());
      setTransactions(await transactionsResponse.json());
      if (partnersResponse.ok) setPartners(await partnersResponse.json());
      if (me.role === "admin" || me.role === "ceo") {
        const usersResponse = await fetch(`${API}/admin/users`, { headers: authHeaders });
        if (usersResponse.ok) setUsers(await usersResponse.json());
        const partnerHistoryResponse = await fetch(`${API}/partners/history`, { headers: authHeaders });
        if (partnerHistoryResponse.ok) setPartnerHistory(await partnerHistoryResponse.json());
        const [profileResponse, historyResponse] = await Promise.all([
          fetch(`${API}/company-profile`, { headers: authHeaders }),
          fetch(`${API}/company-profile/history`, { headers: authHeaders }),
        ]);
        if (profileResponse.ok) setCompanyProfile(await profileResponse.json());
        else if (profileResponse.status === 404) setCompanyProfile(null);
        if (historyResponse.ok) setCompanyProfileHistory(await historyResponse.json());
      } else { setUsers([]); setActiveTab("warehouse"); }
    } catch { setError("Phiên đăng nhập không hợp lệ hoặc không thể kết nối backend"); setToken(""); }
  };

  useEffect(() => {
    const savedToken = window.localStorage.getItem("vietmas_token");
    if (savedToken) { setToken(savedToken); loadDashboard(savedToken); }
  }, []);

  useEffect(() => {
    if (!error && !message) return;
    const timer = window.setTimeout(() => { setError(""); setMessage(""); }, 3500);
    return () => window.clearTimeout(timer);
  }, [error, message]);

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

  async function submitPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const data: Record<string, FormDataEntryValue> = {};
    new FormData(event.currentTarget).forEach((value, key) => { data[key] = value; });
    const supply_item_ids = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[name="supply_item_ids"]:checked')).map((input) => Number(input.value));
    const payload = { legal_name: String(data.legal_name), short_name: data.short_name ? String(data.short_name) : null, partner_type: String(data.partner_type), tax_code: String(data.tax_code), legal_representative: data.legal_representative ? String(data.legal_representative) : null, address: data.address ? String(data.address) : null, phone: data.phone ? String(data.phone) : null, email: data.email ? String(data.email) : null, logo_url: data.logo_url ? String(data.logo_url) : null, status: String(data.status ?? "active"), supply_item_ids };
    const endpoint = editingPartner ? `${API}/partners/${editingPartner.id}` : `${API}/partners`;
    const response = await fetch(endpoint, { method: editingPartner ? "PUT" : "POST", headers: headers(), body: JSON.stringify(payload) });
    if (!response.ok) { setError((await response.json()).detail ?? "Không thể lưu đối tác"); return; }
    setMessage(editingPartner ? "Đã cập nhật đối tác" : "Đã thêm đối tác"); setEditingPartner(null); setShowPartnerForm(false); event.currentTarget.reset(); await loadDashboard(token);
  }

  async function deletePartner(partner: Partner) {
    if (!window.confirm(`Ngừng hoạt động đối tác ${partner.short_name || partner.legal_name}?`)) return;
    const response = await fetch(`${API}/partners/${partner.id}`, { method: "DELETE", headers: headers() });
    if (!response.ok) { setError((await response.json()).detail ?? "Không thể xóa đối tác"); return; }
    setMessage("Đã chuyển đối tác sang trạng thái ngừng hoạt động"); await loadDashboard(token);
  }

  async function clearPartnerHistory() {
    if (!window.confirm("Xóa toàn bộ lịch sử chỉnh sửa đối tác hiện có? Thao tác này không thể hoàn tác.")) return;
    const response = await fetch(`${API}/partners/history`, { method: "DELETE", headers: headers() });
    if (!response.ok) { setError((await response.json()).detail ?? "Không thể xóa lịch sử chỉnh sửa"); return; }
    setPartnerHistory([]); setMessage("Đã xóa lịch sử chỉnh sửa đối tác");
  }

  async function savePartnerEdits() {
    if (!editingPartner) return;
    setError(""); setMessage("");
    const response = await fetch(`${API}/partners/${editingPartner.id}`, { method: "PUT", headers: headers(), body: JSON.stringify({
      legal_name: editingPartner.legal_name, short_name: editingPartner.short_name ?? null, partner_type: editingPartner.partner_type,
      tax_code: editingPartner.tax_code, legal_representative: editingPartner.legal_representative ?? null, address: editingPartner.address ?? null,
      phone: editingPartner.phone ?? null, email: editingPartner.email ?? null, logo_url: editingPartner.logo_url ?? null,
      status: editingPartner.status, supply_item_ids: editingPartner.supply_item_ids,
    }) });
    if (!response.ok) { setError((await response.json()).detail ?? "Không thể cập nhật đối tác"); return; }
    setEditingPartner(null); setMessage("Đã cập nhật đối tác"); await loadDashboard(token);
  }

  async function submitCompanyProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const data: Record<string, FormDataEntryValue> = {};
    new FormData(event.currentTarget).forEach((value, key) => { data[key] = value; });
    const payload = {
      legal_name: String(data.legal_name ?? ""),
      short_name: data.short_name ? String(data.short_name) : null,
      tax_code: String(data.tax_code ?? ""),
      address: data.address ? String(data.address) : null,
      phone: data.phone ? String(data.phone) : null,
      email: data.email ? String(data.email) : null,
      legal_representative: data.legal_representative ? String(data.legal_representative) : null,
      logo_url: data.logo_url ? String(data.logo_url) : null,
    };
    const sameAsSaved = companyProfile && Object.entries(payload).every(([key, value]) => (companyProfile[key as keyof CompanyProfile] ?? null) === value);
    if (sameAsSaved) { setMessage("Không có thay đổi mới"); return; }
    const response = await fetch(`${API}/company-profile`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) { setError((await response.json()).detail ?? "Không thể lưu thông tin doanh nghiệp"); return; }
    setCompanyProfile(await response.json()); setMessage("Đã lưu thông tin doanh nghiệp"); await loadDashboard(token);
  }

  function signOut() { window.localStorage.removeItem("vietmas_token"); setToken(""); setItems([]); setTransactions([]); setUsers([]); setPartners([]); setPartnerHistory([]); setCompanyProfile(null); setCompanyProfileHistory([]); }

  if (!token) return <main><div className="card" style={{ maxWidth: 420, margin: "80px auto" }}><h1>VietMAS Admin</h1><p className="muted">Đăng nhập quản trị kho</p><form onSubmit={signIn}><label>Tài khoản<input value={username} onChange={(e) => setUsername(e.target.value)} /></label><label>Mật khẩu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><button disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button></form>{error && <p>{error}</p>}</div></main>;

  const canEdit = role === "admin" || role === "ceo";
  const canAdjust = role === "admin";
  const canViewUsers = role === "admin" || role === "ceo";
  const canViewSettings = canEdit;
  const partnerPanel = <section className="section"><div className="section-title-row"><div><h2>Đối tác</h2></div></div>{canEdit && <form className="form-grid partner-form" onSubmit={submitPartner} key={editingPartner?.id ?? "new-partner"}><label>Tên pháp lý<input name="legal_name" defaultValue={editingPartner?.legal_name ?? ""} required /></label><label>Tên viết tắt<input name="short_name" defaultValue={editingPartner?.short_name ?? ""} /></label><label>Loại<select name="partner_type" defaultValue={editingPartner?.partner_type ?? "customer"}><option value="customer">Customer</option><option value="vendor">Vendor</option><option value="service">Service</option></select></label><label>MST<input name="tax_code" defaultValue={editingPartner?.tax_code ?? ""} required /></label><label>Người đại diện<input name="legal_representative" defaultValue={editingPartner?.legal_representative ?? ""} /></label><label>Địa chỉ<input name="address" defaultValue={editingPartner?.address ?? ""} /></label><label>SĐT<input name="phone" /></label><label>Email<input name="email" type="email" /></label><label className="full-width">URL logo<input name="logo_url" /></label><label>Trạng thái<select name="status" defaultValue={editingPartner?.status ?? "active"}><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></label><fieldset className="full-width supply-fieldset"><legend>Vật tư vendor cung cấp</legend>{items.filter((item) => item.category === "raw_material").map((item) => <label key={item.id}><input type="checkbox" name="supply_item_ids" value={item.id} defaultChecked={editingPartner?.supply_item_ids.includes(item.id)} />{item.name} ({item.sku})</label>)}</fieldset><div className="form-actions"><button type="submit">{editingPartner ? "Lưu thay đổi" : "Thêm đối tác"}</button>{editingPartner && <button type="button" onClick={() => setEditingPartner(null)}>Hủy</button>}</div></form>}<table><thead><tr><th>Tên pháp lý</th><th>Loại</th><th>MST</th><th>Liên hệ</th><th>Vật tư cung cấp</th><th>Trạng thái</th><th>Người tạo / Ngày tạo</th><th>Cập nhật</th><th></th></tr></thead><tbody>{partners.map((partner) => <tr key={partner.id}><td>{partner.legal_name}<br />{partner.short_name}</td><td>{partner.partner_type}</td><td>{partner.tax_code}</td><td>{partner.legal_representative}<br />{partner.phone}<br />{partner.email}</td><td>{partner.supply_item_ids.map((id) => items.find((item) => item.id === id)?.name ?? id).join(", ") || "—"}</td><td>{partner.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}</td><td>#{partner.created_by_id}<br />{new Date(partner.created_at).toLocaleDateString("vi-VN")}</td><td>{new Date(partner.updated_at).toLocaleDateString("vi-VN")}</td><td>{canEdit && <><button onClick={() => setEditingPartner(partner)}>Sửa</button> <button onClick={() => deletePartner(partner)}>Xóa</button></>}</td></tr>)}</tbody></table></section>;
  const inlinePartnerPanel = <section className="section inline-partner-panel"><div className="section-title-row"><div><h2>Đối tác</h2><p className="muted">Đang chỉnh sửa trực tiếp trong bảng</p></div></div><table><thead><tr><th>Tên pháp lý</th><th>Loại</th><th>MST</th><th>Liên hệ</th><th>Vật tư cung cấp</th><th>Trạng thái</th><th>Người tạo / Ngày tạo</th><th>Cập nhật</th><th></th></tr></thead><tbody>{partners.map((partner) => editingPartner?.id === partner.id ? <tr key={partner.id}><td><input value={editingPartner.legal_name} onChange={(e) => setEditingPartner({ ...editingPartner, legal_name: e.target.value })} /><input value={editingPartner.short_name ?? ""} placeholder="Tên viết tắt" onChange={(e) => setEditingPartner({ ...editingPartner, short_name: e.target.value })} /></td><td><select value={editingPartner.partner_type} onChange={(e) => setEditingPartner({ ...editingPartner, partner_type: e.target.value as Partner["partner_type"] })}><option value="customer">customer</option><option value="vendor">vendor</option><option value="service">service</option></select></td><td><input value={editingPartner.tax_code} onChange={(e) => setEditingPartner({ ...editingPartner, tax_code: e.target.value })} /></td><td><input value={editingPartner.legal_representative ?? ""} placeholder="Người đại diện" onChange={(e) => setEditingPartner({ ...editingPartner, legal_representative: e.target.value })} /><input value={editingPartner.phone ?? ""} placeholder="SĐT" onChange={(e) => setEditingPartner({ ...editingPartner, phone: e.target.value })} /><input value={editingPartner.email ?? ""} placeholder="Email" onChange={(e) => setEditingPartner({ ...editingPartner, email: e.target.value })} /></td><td>{items.filter((item) => item.category === "raw_material").map((item) => <label className="inline-check" key={item.id}><input type="checkbox" checked={editingPartner.supply_item_ids.includes(item.id)} onChange={(e) => setEditingPartner({ ...editingPartner, supply_item_ids: e.target.checked ? [...editingPartner.supply_item_ids, item.id] : editingPartner.supply_item_ids.filter((id) => id !== item.id) })} />{item.name}</label>)}</td><td><select value={editingPartner.status} onChange={(e) => setEditingPartner({ ...editingPartner, status: e.target.value as Partner["status"] })}><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></td><td>#{partner.created_by_id}<br />{new Date(partner.created_at).toLocaleDateString("vi-VN")}</td><td>{new Date(partner.updated_at).toLocaleDateString("vi-VN")}</td><td><button onClick={savePartnerEdits}>Lưu</button><button onClick={() => setEditingPartner(null)}>Hủy</button></td></tr> : <tr key={partner.id}><td>{partner.legal_name}<br />{partner.short_name}</td><td>{partner.partner_type}</td><td>{partner.tax_code}</td><td>{partner.legal_representative}<br />{partner.phone}<br />{partner.email}</td><td>{partner.supply_item_ids.map((id) => items.find((item) => item.id === id)?.name ?? id).join(", ") || "—"}</td><td>{partner.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}</td><td>#{partner.created_by_id}<br />{new Date(partner.created_at).toLocaleDateString("vi-VN")}</td><td>{new Date(partner.updated_at).toLocaleDateString("vi-VN")}</td><td><button onClick={() => setEditingPartner(partner)}>Sửa</button><button onClick={() => deletePartner(partner)}>Xóa</button></td></tr>)}</tbody></table></section>;
  const partnerFields: Array<[keyof Partner, string]> = [["legal_name", "Đối tác"], ["tax_code", "MST"], ["status", "Trạng thái"]];
  const formatPartnerValues = (snapshot: Partner | undefined, keys: Array<[keyof Partner, string]>) => keys.map(([key, label]) => {
    const value = snapshot?.[key];
    const displayValue = key === "status" ? (value === "active" ? "Đang hoạt động" : value === "inactive" ? "Ngừng hoạt động" : "—") : value || "—";
    return `${label}: ${displayValue}`;
  }).join(" · ");
  const partnerHistoryPanel = <section className="section partner-history-panel"><div className="section-title-row"><div><h2>Lịch sử chỉnh sửa</h2></div>{canEdit && partnerHistory.length > 0 && <button onClick={clearPartnerHistory}>Xóa lịch sử</button>}</div><table><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Người chỉnh sửa</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr></thead><tbody>{partnerHistory.map((entry, index) => { const previous = partnerHistory.slice(index + 1).find((candidate) => candidate.snapshot.id === entry.snapshot.id)?.snapshot; const changedFields = partnerFields.filter(([key]) => entry.action === "created" || !previous || (previous[key] ?? null) !== (entry.snapshot[key] ?? null)); return <tr key={entry.id}><td>{new Date(entry.changed_at).toLocaleString("vi-VN")}</td><td>{entry.action === "created" ? "Khởi tạo" : entry.action === "deleted" ? "Ngừng hoạt động" : "Cập nhật"}</td><td>#{entry.changed_by_id}</td><td>{entry.action === "created" ? "—" : formatPartnerValues(previous, changedFields)}</td><td>{formatPartnerValues(entry.snapshot, changedFields)}</td></tr>; })}</tbody></table>{!partnerHistory.length && <p className="muted">Chưa có lịch sử chỉnh sửa.</p>}</section>;
   const companyFields: Array<[keyof CompanyProfile, string]> = [["legal_name", "Tên pháp lý"], ["short_name", "Tên viết tắt"], ["tax_code", "Mã số thuế"], ["legal_representative", "Người đại diện"], ["address", "Địa chỉ"], ["phone", "Số điện thoại"], ["email", "Email"], ["logo_url", "URL logo"]];
   const formatCompanyValues = (snapshot: CompanyProfile | undefined, keys: Array<[keyof CompanyProfile, string]>) => keys.map(([key, label]) => `${label}: ${snapshot?.[key] || "—"}`).join(" · ");
   const companyHistoryPanel = <section className="section company-history-panel">{companyProfileHistory.length ? <table><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Người chỉnh sửa</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr></thead><tbody>{companyProfileHistory.map((entry, index) => { const previous = companyProfileHistory[index + 1]?.snapshot; const changedFields = companyFields.filter(([key]) => entry.action === "created" || !previous || (previous[key] ?? null) !== (entry.snapshot[key] ?? null)); return <tr key={entry.id}><td>{new Date(entry.changed_at).toLocaleString("vi-VN")}</td><td>{entry.action === "created" ? "Khởi tạo" : "Cập nhật"}</td><td>#{entry.changed_by_id}</td><td>{entry.action === "created" ? "—" : formatCompanyValues(previous, changedFields)}</td><td>{formatCompanyValues(entry.snapshot, changedFields)}</td></tr>; })}</tbody></table> : <p className="muted">Chưa có lịch sử cập nhật.</p>}</section>;

   return <main className={`${activeTab === "settings" && settingsTab === "partners" ? "settings-partners" : ""} ${activeTab === "settings" && settingsTab === "company" ? "settings-company" : ""} ${activeTab === "settings" && settingsTab === "company" && companyTab === "history" ? "company-tab-history" : ""} ${showPartnerForm ? "partner-form-open" : ""}`}>
    <div className="topbar"><div><h1>VietMAS Admin</h1><div className="muted">AI hỗ trợ vận hành doanh nghiệp · Vai trò: {role}</div></div><button onClick={signOut}>Đăng xuất</button></div>
    <div className="admin-tabs"><button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")} disabled={!canViewUsers}>Người dùng <span>{users.length}</span></button><button className={activeTab === "warehouse" ? "active" : ""} onClick={() => setActiveTab("warehouse")}>Kho vận</button><button className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")} disabled={!canViewSettings}>Cài đặt</button></div>
    {activeTab === "settings" && canViewSettings && <div className="settings-tabs"><button className={settingsTab === "company" ? "active" : ""} onClick={() => setSettingsTab("company")}>Thông tin doanh nghiệp</button><button className={settingsTab === "partners" ? "active" : ""} onClick={() => setSettingsTab("partners")}>Đối tác <span>{partners.length}</span></button></div>}
    {activeTab === "settings" && settingsTab === "company" && <div className="settings-tabs company-tabs"><button className={companyTab === "info" ? "active" : ""} onClick={() => setCompanyTab("info")}>Thông tin doanh nghiệp</button><button className={companyTab === "history" ? "active" : ""} onClick={() => setCompanyTab("history")}>Lịch sử cập nhật</button></div>}
    {activeTab === "settings" && settingsTab === "partners" && <div className="settings-tabs partner-tabs"><button className={partnerTab === "list" ? "active" : ""} onClick={() => setPartnerTab("list")}>Danh sách đối tác</button><button className={partnerTab === "history" ? "active" : ""} onClick={() => setPartnerTab("history")}>Lịch sử chỉnh sửa</button>{partnerTab === "list" && !editingPartner && canEdit && <button className="partner-add-button" onClick={() => setShowPartnerForm((open) => !open)}>{showPartnerForm ? "− Đóng form" : "+ Thêm đối tác"}</button>}</div>}
     {activeTab === "settings" && settingsTab === "partners" && (partnerTab === "list" ? (editingPartner ? inlinePartnerPanel : partnerPanel) : partnerHistoryPanel)}
     {activeTab === "settings" && settingsTab === "company" && companyTab === "history" && companyHistoryPanel}
    {(error || message) && <div className={`toast ${error ? "toast-error" : "toast-success"}`} role="status">{error || message}</div>}
    {activeTab === "users" && canViewUsers ? <section className="section users-panel"><div className="section-title-row"><div><h2>Người dùng trong hệ thống</h2><p className="muted">Danh sách tài khoản và vai trò được cấp quyền truy cập VietMAS.</p></div><span className="user-count">{users.length} tài khoản</span></div><div className="user-cards">{users.map((user) => <article className="user-card" key={user.id}><div className="user-avatar">{user.display_name.charAt(0).toUpperCase()}</div><div className="user-detail"><h3>{user.display_name}</h3><p>@{user.username}</p><span className={`role-badge role-${user.role}`}>{user.role === "admin" ? "Quản trị viên" : user.role === "ceo" ? "CEO" : "Quản lý kho"}</span></div><div className="user-meta"><small>ID người dùng</small><strong>#{user.id}</strong><small>Quyền truy cập</small><strong>{user.role === "manager" ? "Kho vận & chatbot" : "Toàn hệ thống"}</strong></div></article>)}</div></section> : activeTab === "settings" && canViewSettings ? <section className="section"><div className="section-title-row"><div><h2>Cài đặt</h2><p className="muted">Quản lý thông tin dùng chung cho toàn bộ VietMAS.</p></div></div><form className="form-grid company-form" onSubmit={submitCompanyProfile}><label>Tên pháp lý<input name="legal_name" defaultValue={companyProfile?.legal_name ?? ""} required /></label><label>Tên viết tắt<input name="short_name" defaultValue={companyProfile?.short_name ?? ""} /></label><label>Mã số thuế<input name="tax_code" defaultValue={companyProfile?.tax_code ?? ""} required /></label><label>Người đại diện<input name="legal_representative" defaultValue={companyProfile?.legal_representative ?? ""} /></label><label className="full-width">Địa chỉ<input name="address" defaultValue={companyProfile?.address ?? ""} /></label><label>Số điện thoại<input name="phone" defaultValue={companyProfile?.phone ?? ""} /></label><label>Email<input name="email" type="email" defaultValue={companyProfile?.email ?? ""} /></label><label className="full-width">URL logo<input name="logo_url" defaultValue={companyProfile?.logo_url ?? ""} /></label><div className="form-actions"><button type="submit">Lưu thông tin</button></div></form><div className="history-panel"><div className="section-title-row"><div><h2>Lịch sử chỉnh sửa</h2><p className="muted">Các phiên bản thông tin doanh nghiệp đã được lưu.</p></div></div>{companyProfileHistory.length ? <table><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Người chỉnh sửa</th><th>Tên công ty</th><th>Mã số thuế</th></tr></thead><tbody>{companyProfileHistory.map((entry) => <tr key={entry.id}><td>{new Date(entry.changed_at).toLocaleString("vi-VN")}</td><td>{entry.action === "created" ? "Khởi tạo" : "Cập nhật"}</td><td>#{entry.changed_by_id}</td><td>{entry.snapshot.legal_name}</td><td>{entry.snapshot.tax_code}</td></tr>)}</tbody></table> : <p className="muted">Chưa có lịch sử chỉnh sửa.</p>}</div></section> : <>
    <section className="section"><h2>{editing ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2><form className="form-grid" onSubmit={submitInventory} key={editing?.id ?? "new"}><label>SKU<input name="sku" defaultValue={editing?.sku ?? ""} disabled={Boolean(editing)} required /></label><label>Tên hàng<input name="name" defaultValue={editing?.name ?? ""} required /></label><label>Nhóm<select name="category" defaultValue={editing?.category ?? "raw_material"} disabled={Boolean(editing)}><option value="raw_material">Nguyên liệu</option><option value="finished_goods">Thành phẩm</option></select></label><label>Đơn vị<input name="unit" defaultValue={editing?.unit ?? "kg"} required /></label><label>Số lượng ban đầu<input name="quantity" type="number" min="0" defaultValue={editing?.quantity ?? 0} disabled={Boolean(editing)} /></label><label>Ngưỡng cảnh báo<input name="low_stock_threshold" type="number" min="0" defaultValue={editing?.low_stock_threshold ?? 0} required /></label><label>Quy cách/Ghi chú<input name="packaging_note" defaultValue={editing?.packaging_note ?? ""} /></label><div className="form-actions"><button type="submit">{editing ? "Lưu thay đổi" : "Thêm sản phẩm"}</button>{editing && <button type="button" onClick={() => setEditing(null)}>Hủy</button>}</div></form></section>

    <section className="section"><h2>Tồn kho</h2><table><thead><tr><th>SKU</th><th>Tên hàng</th><th>Nhóm</th><th>Tồn</th><th>Cảnh báo</th><th>Thao tác</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.sku}</td><td>{item.name}</td><td>{item.category === "raw_material" ? "Nguyên liệu" : "Thành phẩm"}</td><td>{item.quantity} {item.unit}</td><td>{item.quantity <= item.low_stock_threshold ? "Sắp hết" : "Bình thường"}</td><td>{canEdit && <><button onClick={() => setEditing(item)}>Sửa</button> <button onClick={() => deleteItem(item)}>Xóa</button></>}</td></tr>)}</tbody></table></section>

    <section className="section"><h2>Ghi nhận giao dịch</h2><form className="form-grid" onSubmit={submitTransaction}><label>Sản phẩm<select name="item_id" required>{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>)}</select></label><label>Loại giao dịch<select name="transaction_type"><option value="import">Nhập kho</option><option value="export">Xuất kho</option>{canAdjust && <option value="adjustment">Điều chỉnh tồn kho</option>}</select></label><label>Số lượng<input name="quantity" type="number" min="1" required /></label><label>Ghi chú<input name="note" required /></label><div className="form-actions"><button type="submit">Ghi nhận</button></div></form></section>

    <section className="section"><h2>Lịch sử giao dịch</h2><table><thead><tr><th>Thời gian</th><th>Sản phẩm</th><th>Loại</th><th>Số lượng</th><th>Ghi chú</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id}><td>{new Date(transaction.created_at).toLocaleString("vi-VN")}</td><td>{items.find((item) => item.id === transaction.item_id)?.name ?? transaction.item_id}</td><td>{transaction.transaction_type}</td><td>{transaction.quantity}</td><td>{transaction.note}</td></tr>)}</tbody></table></section>
    </>}
  </main>;
}
