"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Item = { id: number; sku: string; name: string; category: string; unit: string; quantity: number; low_stock_threshold: number; packaging_note?: string };
type Transaction = { id: number; item_id: number; transaction_type: string; quantity: number; note: string; reference_code?: string | null; vendor_id?: number | null; document_url?: string | null; order_status?: string; created_by_id: number; created_at: string };
type PurchaseOrderHistory = { id: number; order_id: number; action: string; changed_by_id: number; changed_by_name: string; changed_at: string; previous_snapshot: { reference_code?: string | null; vendor_id?: number | null; item_id?: number | null; quantity?: number; order_status?: string }; snapshot: { reference_code?: string | null; vendor_id?: number | null; item_id?: number | null; quantity?: number; order_status?: string } };
type User = { id: number; username: string; display_name: string; role: string; access_scope: string };
type CompanyProfile = { id?: number; legal_name: string; short_name?: string; tax_code: string; address?: string; phone?: string; email?: string; legal_representative?: string; logo_url?: string };
type CompanyProfileHistory = { id: number; action: string; changed_by_id: number; changed_at: string; snapshot: CompanyProfile };
type Partner = { id: number; legal_name: string; short_name?: string; partner_type: "customer" | "vendor" | "service"; tax_code: string; legal_representative?: string; representative_title?: string; address?: string; delivery_address?: string; phone?: string; email?: string; bank_name?: string; bank_account_name?: string; bank_account_number?: string; contract_no?: string; contract_effective_date?: string; contract_expired_date?: string; credit_days?: number; credit_limit?: string; deposit_percent?: string; logo_url?: string; status: "active" | "inactive"; created_by_id: number; created_at: string; updated_at: string; supply_item_ids: number[] };
type PartnerHistory = { id: number; action: string; changed_by_id: number; changed_at: string; snapshot: Partner };
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchaseOrderHistory, setPurchaseOrderHistory] = useState<PurchaseOrderHistory[]>([]);
  const [nextPurchaseOrderCode, setNextPurchaseOrderCode] = useState("Đang tính...");
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
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  const [selectedPurchaseVendorId, setSelectedPurchaseVendorId] = useState("");
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState<"warehouse" | "users" | "settings">("warehouse");
  const [warehouseTab, setWarehouseTab] = useState<"transactions" | "inventory">("transactions");
  const [settingsTab, setSettingsTab] = useState<"company" | "partners">("company");
  const [companyTab, setCompanyTab] = useState<"info" | "history">("info");
  const [partnerTab, setPartnerTab] = useState<"list" | "history">("list");
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [expandedPartnerIds, setExpandedPartnerIds] = useState<number[]>([]);

  useEffect(() => {
    if (editingPurchaseOrder && !showPurchaseOrderForm) {
      setShowPurchaseOrderForm(true);
    }
  }, [showPurchaseOrderForm, editingPurchaseOrder]);

  useEffect(() => {
    if (editingPartner && !showPartnerForm) {
      setShowPartnerForm(true);
    }
  }, [editingPartner, showPartnerForm]);

  useEffect(() => {
    document.querySelectorAll<HTMLInputElement>('input[name="note"]').forEach((input) => input.removeAttribute("required"));
  }, [showPurchaseOrderForm, editingPurchaseOrder]);

  const headers = (authToken = token) => ({ Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" });

  const loadDashboard = async (authToken: string) => {
    try {
      const authHeaders = { Authorization: `Bearer ${authToken}` };
      const [meResponse, inventoryResponse, transactionsResponse, partnersResponse, nextCodeResponse, orderHistoryResponse] = await Promise.all([
        fetch(`${API}/users/me`, { headers: authHeaders }),
        fetch(`${API}/inventory`, { headers: authHeaders }),
        fetch(`${API}/inventory/transactions`, { headers: authHeaders }),
        fetch(`${API}/partners`, { headers: authHeaders }),
        fetch(`${API}/inventory/transactions/next-code`, { headers: authHeaders }),
        fetch(`${API}/inventory/purchase-orders/history`, { headers: authHeaders }),
      ]);
      if (!meResponse.ok || !inventoryResponse.ok || !transactionsResponse.ok) throw new Error();
      const me = await meResponse.json();
      setRole(me.role);
      setItems(await inventoryResponse.json());
      setTransactions(await transactionsResponse.json());
      if (nextCodeResponse.ok) setNextPurchaseOrderCode((await nextCodeResponse.json()).code);
      if (orderHistoryResponse.ok) setPurchaseOrderHistory(await orderHistoryResponse.json());
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
    const isEditing = Boolean(editingPurchaseOrder);
    const response = await fetch(isEditing ? `${API}/inventory/purchase-orders/${editingPurchaseOrder!.id}` : `${API}/inventory/transactions`, { method: isEditing ? "PUT" : "POST", headers: headers(), body: JSON.stringify({ item_id: Number(data.item_id), transaction_type: data.transaction_type, quantity: Number(data.quantity), note: data.note, reference_code: data.reference_code || null, vendor_id: data.vendor_id ? Number(data.vendor_id) : null, document_url: data.document_url || null, order_status: data.order_status }) });
    if (!response.ok) { setError((await response.json()).detail ?? (isEditing ? "Không thể cập nhật đơn mua hàng" : "Không thể tạo đơn mua hàng")); return; }
    setMessage(isEditing ? "Đã cập nhật đơn mua hàng" : "Đã tạo đơn mua hàng"); event.currentTarget.reset(); setEditingPurchaseOrder(null); setSelectedPurchaseVendorId(""); setShowPurchaseOrderForm(false); await loadDashboard(token);
  }

  async function deletePurchaseOrder(order: Transaction) {
    if (!window.confirm(`Xóa đơn mua hàng ${order.reference_code || `PO-${order.id}`}?`)) return;
    const response = await fetch(`${API}/inventory/purchase-orders/${order.id}`, { method: "DELETE", headers: headers() });
    if (!response.ok) { setError((await response.json()).detail ?? "Không thể xóa đơn mua hàng"); return; }
    setMessage("Đã xóa đơn mua hàng"); await loadDashboard(token);
  }


  async function submitPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const data: Record<string, FormDataEntryValue> = {};
    new FormData(event.currentTarget).forEach((value, key) => { data[key] = value; });
    const supply_item_ids = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[name="supply_item_ids"]:checked')).map((input) => Number(input.value));
    const optionalNumber = (key: string) => data[key] ? Number(data[key]) : null;
    const payload = { legal_name: String(data.legal_name), short_name: data.short_name ? String(data.short_name) : null, partner_type: String(data.partner_type), tax_code: String(data.tax_code), legal_representative: data.legal_representative ? String(data.legal_representative) : null, representative_title: data.representative_title ? String(data.representative_title) : null, address: data.address ? String(data.address) : null, delivery_address: data.delivery_address ? String(data.delivery_address) : null, phone: data.phone ? String(data.phone) : null, email: data.email ? String(data.email) : null, bank_name: data.bank_name ? String(data.bank_name) : null, bank_account_name: data.bank_account_name ? String(data.bank_account_name) : null, bank_account_number: data.bank_account_number ? String(data.bank_account_number) : null, contract_no: data.contract_no ? String(data.contract_no) : null, contract_effective_date: data.contract_effective_date ? String(data.contract_effective_date) : null, contract_expired_date: data.contract_expired_date ? String(data.contract_expired_date) : null, credit_days: optionalNumber("credit_days"), credit_limit: data.credit_limit ? String(data.credit_limit) : null, deposit_percent: data.deposit_percent ? String(data.deposit_percent) : null, logo_url: data.logo_url ? String(data.logo_url) : null, status: String(data.status ?? "active"), supply_item_ids };
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
      tax_code: editingPartner.tax_code, legal_representative: editingPartner.legal_representative ?? null, representative_title: editingPartner.representative_title ?? null, address: editingPartner.address ?? null, delivery_address: editingPartner.delivery_address ?? null,
      phone: editingPartner.phone ?? null, email: editingPartner.email ?? null, bank_name: editingPartner.bank_name ?? null, bank_account_name: editingPartner.bank_account_name ?? null, bank_account_number: editingPartner.bank_account_number ?? null, contract_no: editingPartner.contract_no ?? null, contract_effective_date: editingPartner.contract_effective_date ?? null, contract_expired_date: editingPartner.contract_expired_date ?? null, credit_days: editingPartner.credit_days ?? null, credit_limit: editingPartner.credit_limit ?? null, deposit_percent: editingPartner.deposit_percent ?? null, logo_url: editingPartner.logo_url ?? null,
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

  function signOut() { window.localStorage.removeItem("vietmas_token"); setToken(""); setItems([]); setTransactions([]); setPurchaseOrderHistory([]); setUsers([]); setPartners([]); setPartnerHistory([]); setCompanyProfile(null); setCompanyProfileHistory([]); }

  if (!token) return <main><div className="card" style={{ maxWidth: 420, margin: "80px auto" }}><h1>VietMAS Admin</h1><p className="muted">Đăng nhập quản trị kho</p><form onSubmit={signIn}><label>Tài khoản<input value={username} onChange={(e) => setUsername(e.target.value)} /></label><label>Mật khẩu<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><button disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button></form>{error && <p>{error}</p>}</div></main>;

  const canEdit = role === "admin" || role === "ceo";
  const canAdjust = role === "admin";
  const canViewUsers = role === "admin" || role === "ceo";
  const canViewSettings = canEdit;
  const selectedPurchaseVendor = partners.find((partner) => partner.id === Number(selectedPurchaseVendorId));
  const availablePurchaseItems = selectedPurchaseVendor ? items.filter((item) => selectedPurchaseVendor.supply_item_ids.includes(item.id)) : [];
  const formatPurchaseOrderValue = (key: string, snapshot: PurchaseOrderHistory["snapshot"]) => {
    const statusLabels: Record<string, string> = { draft: "Nháp", ordered: "Đã đặt hàng", partially_received: "Nhận một phần", received: "Đã nhận đủ", cancelled: "Đã hủy" };
    const vendor = partners.find((partner) => partner.id === snapshot.vendor_id);
    const item = items.find((entry) => entry.id === snapshot.item_id);
    const values: Record<string, string> = { reference_code: snapshot.reference_code || "—", vendor_id: vendor?.short_name || vendor?.legal_name || "—", item_id: item?.name || String(snapshot.item_id || "—"), quantity: String(snapshot.quantity ?? "—"), order_status: statusLabels[snapshot.order_status || "draft"] || "Nháp" };
    return values[key] || "—";
  };
  const formatPurchaseOrderChanges = (previous: PurchaseOrderHistory["previous_snapshot"], current: PurchaseOrderHistory["snapshot"], display: "previous" | "current" = "current") => {
    const labels: Record<string, string> = { reference_code: "Mã đơn", vendor_id: "Vendor", item_id: "Nguyên liệu", quantity: "Số lượng", order_status: "Trạng thái" };
    const keys = Object.keys(labels).filter((key) => (previous[key as keyof typeof previous] ?? null) !== (current[key as keyof typeof current] ?? null));
    const snapshot = display === "previous" ? previous : current;
    return keys.map((key) => `${labels[key]}: ${formatPurchaseOrderValue(key, snapshot)}`).join(" · ") || "—";
  };
  const purchaseOrderRows = transactions.filter((transaction) => transaction.vendor_id != null).map((transaction) => {
    const isEditing = false;
    if (isEditing) {
      const editVendor = partners.find((partner) => partner.id === transaction.vendor_id);
      const editItems = editVendor ? items.filter((item) => editVendor.supply_item_ids.includes(item.id)) : [];
      return <tr key={transaction.id}><td colSpan={8}><form className="purchase-order-inline-form" onSubmit={submitTransaction}><input type="hidden" name="transaction_type" value="import" /><input type="hidden" name="reference_code" value={transaction.reference_code || ""} /><label>Mã đơn hàng<input className="auto-order-code" value={transaction.reference_code || `PO-${transaction.id}`} disabled /></label><label>Vendor<select name="vendor_id" value={selectedPurchaseVendorId} onChange={(event) => setSelectedPurchaseVendorId(event.target.value)} required><option value="">Chọn vendor</option>{partners.filter((partner) => partner.partner_type === "vendor" && partner.status === "active").map((partner) => <option key={partner.id} value={partner.id}>{partner.short_name || partner.legal_name}</option>)}</select></label><label>Nguyên liệu<select name="item_id" defaultValue={transaction.item_id} required><option value="">Chọn nguyên liệu</option>{editItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>)}</select></label><label>Số lượng<input name="quantity" type="number" min="1" defaultValue={transaction.quantity} required /></label><label>Trạng thái<select name="order_status" defaultValue={transaction.order_status || "draft"}><option value="draft">Nháp</option><option value="ordered">Đã đặt hàng</option><option value="partially_received">Nhận một phần</option><option value="received">Đã nhận đủ</option><option value="cancelled">Đã hủy</option></select></label><label className="purchase-order-inline-wide">URL chứng từ<input name="document_url" type="url" defaultValue={transaction.document_url || ""} placeholder="https://..." /></label><label className="purchase-order-inline-wide">Ghi chú<input name="note" defaultValue={transaction.note || ""} required /></label><div className="purchase-order-inline-actions"><button type="submit">Lưu</button><button type="button" onClick={() => { setEditingPurchaseOrder(null); setSelectedPurchaseVendorId(""); }}>Hủy</button></div></form></td></tr>;
    }
    return <tr key={transaction.id}><td>{transaction.reference_code || `PO-${transaction.id}`}</td><td>{partners.find((partner) => partner.id === transaction.vendor_id)?.short_name || partners.find((partner) => partner.id === transaction.vendor_id)?.legal_name || "—"}</td><td>{items.find((item) => item.id === transaction.item_id)?.name ?? transaction.item_id}</td><td>{transaction.quantity}</td><td>{({ draft: "Nháp", ordered: "Đã đặt hàng", partially_received: "Nhận một phần", received: "Đã nhận đủ", cancelled: "Đã hủy" } as Record<string, string>)[transaction.order_status || "draft"] || "Nháp"}</td><td>{new Date(transaction.created_at).toLocaleDateString("vi-VN")}</td><td>{transaction.document_url ? <a href={transaction.document_url} target="_blank" rel="noreferrer">Mở chứng từ</a> : "—"}</td><td><button onClick={() => { setEditingPurchaseOrder(transaction); setSelectedPurchaseVendorId(String(transaction.vendor_id)); setShowPurchaseOrderForm(false); }}>Sửa</button> <button onClick={() => deletePurchaseOrder(transaction)}>Xóa</button></td></tr>;
  });


  const partnerPanel = <section className="section"><div className="section-title-row"><div><h2>Đối tác</h2></div></div>{canEdit && <form className="form-grid partner-form" onSubmit={submitPartner} key={editingPartner?.id ?? "new-partner"}><label>Tên pháp lý<input name="legal_name" defaultValue={editingPartner?.legal_name ?? ""} required /></label><label>Tên viết tắt<input name="short_name" defaultValue={editingPartner?.short_name ?? ""} /></label><label>Loại<select name="partner_type" defaultValue={editingPartner?.partner_type ?? "customer"}><option value="customer">Customer</option><option value="vendor">Vendor</option><option value="service">Service</option></select></label><label>MST<input name="tax_code" defaultValue={editingPartner?.tax_code ?? ""} required /></label><label>Người đại diện<input name="legal_representative" defaultValue={editingPartner?.legal_representative ?? ""} /></label><label>Chức vụ<input name="representative_title" defaultValue={editingPartner?.representative_title ?? ""} /></label><label>Địa chỉ trụ sở chính<input name="address" defaultValue={editingPartner?.address ?? ""} /></label><label>Địa chỉ giao nhận hàng<input name="delivery_address" defaultValue={editingPartner?.delivery_address ?? ""} /></label><label>SĐT<input name="phone" /></label><label>Email<input name="email" type="email" /></label><label>Ngân hàng<input name="bank_name" defaultValue={editingPartner?.bank_name ?? ""} /></label><label>Chủ tài khoản<input name="bank_account_name" defaultValue={editingPartner?.bank_account_name ?? ""} /></label><label>Số tài khoản<input name="bank_account_number" defaultValue={editingPartner?.bank_account_number ?? ""} /></label><fieldset className="full-width contract-fieldset"><legend>Thông tin hợp đồng</legend><label>Số hợp đồng<input name="contract_no" defaultValue={editingPartner?.contract_no ?? ""} placeholder="FC-2026-001" /></label><label>Ngày hiệu lực<input name="contract_effective_date" type="date" defaultValue={editingPartner?.contract_effective_date ?? ""} /></label><label>Ngày hết hiệu lực<input name="contract_expired_date" type="date" defaultValue={editingPartner?.contract_expired_date ?? ""} /></label><label>Mức đặt cọc (%)<input name="deposit_percent" type="number" min="0" max="100" step="0.01" defaultValue={editingPartner?.deposit_percent ?? ""} /></label><label>Thời hạn công nợ<input name="credit_days" type="number" min="0" defaultValue={editingPartner?.credit_days ?? ""} /></label><label>Hạn mức công nợ<input name="credit_limit" defaultValue={editingPartner?.credit_limit ?? ""} placeholder="500.000.000 VND" /></label></fieldset><label className="full-width">URL logo<input name="logo_url" /></label><label>Trạng thái<select name="status" defaultValue={editingPartner?.status ?? "active"}><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></label><fieldset className="full-width supply-fieldset"><legend>Vật tư vendor cung cấp</legend>{items.filter((item) => item.category === "raw_material").map((item) => <label key={item.id}><input type="checkbox" name="supply_item_ids" value={item.id} defaultChecked={editingPartner?.supply_item_ids.includes(item.id)} />{item.name} ({item.sku})</label>)}</fieldset><div className="form-actions"><button type="submit">{editingPartner ? "Lưu thay đổi" : "Thêm đối tác"}</button>{editingPartner && <button type="button" onClick={() => setEditingPartner(null)}>Hủy</button>}</div></form>}<table className="partners-table"><thead><tr><th>Tên pháp lý</th><th>Loại</th><th>Liên hệ</th><th>Vật tư cung cấp</th><th className="partner-actions-heading" aria-label="Thao tác" /></tr></thead><tbody>{partners.map((partner) => { const expanded = expandedPartnerIds.includes(partner.id); const toggleExpanded = () => setExpandedPartnerIds((ids) => expanded ? ids.filter((id) => id !== partner.id) : [...ids, partner.id]); return <><tr className="partner-row" key={partner.id} onClick={toggleExpanded} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleExpanded(); } }} tabIndex={0}><td><strong>{partner.legal_name}</strong>{partner.short_name && <small>{partner.short_name}</small>}</td><td>{partner.partner_type}</td><td>{partner.email || "—"}<br />{partner.phone || "—"}</td><td>{partner.supply_item_ids.map((id) => items.find((item) => item.id === id)?.name ?? id).join(", ") || "—"}</td><td className="partner-actions">{canEdit && <div className="partner-row-actions" onClick={(event) => event.stopPropagation()}><button type="button" className="icon-button" onClick={() => setEditingPartner(partner)} aria-label="Sửa đối tác" title="Sửa"><span aria-hidden="true">✎</span></button><button type="button" className="icon-button danger" onClick={() => deletePartner(partner)} aria-label="Xóa đối tác" title="Xóa"><span aria-hidden="true">⌫</span></button></div>}</td></tr>{expanded && <tr className="partner-details-row" key={`${partner.id}-details`}><td colSpan={5}><div className="partner-details"><div><span>MST</span><strong>{partner.tax_code || "—"}</strong></div><div><span>Người đại diện</span><strong>{partner.legal_representative ? `${partner.legal_representative}${partner.representative_title ? ` (${partner.representative_title})` : ""}` : "—"}</strong></div><div><span>Địa chỉ trụ sở chính</span><strong>{partner.address || "—"}</strong></div><div><span>Địa chỉ giao nhận hàng</span><strong>{partner.delivery_address || "—"}</strong></div><div><span>Ngân hàng</span><strong>{partner.bank_name || "—"}</strong></div><div><span>Chủ tài khoản</span><strong>{partner.bank_account_name || "—"}</strong></div><div><span>Số tài khoản</span><strong>{partner.bank_account_number || "—"}</strong></div><div><span>Trạng thái</span><strong>{partner.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}</strong></div><div><span>Ngày tạo / cập nhật</span><strong>{new Date(partner.created_at).toLocaleDateString("vi-VN")} · {new Date(partner.updated_at).toLocaleDateString("vi-VN")}</strong></div><div className="partner-contract-details"><h3>Thông tin hợp đồng</h3><div className="partner-contract-grid"><div><span>Số hợp đồng</span><strong>{partner.contract_no || "—"}</strong></div><div><span>Ngày hiệu lực</span><strong>{partner.contract_effective_date || "—"}</strong></div><div><span>Ngày hết hiệu lực</span><strong>{partner.contract_expired_date || "—"}</strong></div><div><span>Mức đặt cọc</span><strong>{partner.deposit_percent ? partner.deposit_percent + "%" : "Không áp dụng"}</strong></div><div><span>Thời hạn công nợ</span><strong>{partner.credit_days != null ? `${partner.credit_days} ngày` : "—"}</strong></div><div><span>Hạn mức công nợ</span><strong>{partner.credit_limit || "—"}</strong></div></div></div></div></td></tr>}</>; })}</tbody></table></section>;
  const inlinePartnerPanel = <section className="section inline-partner-panel"><div className="section-title-row"><div><h2>Đối tác</h2><p className="muted">Đang chỉnh sửa trực tiếp trong bảng</p></div></div><table><thead><tr><th>Tên pháp lý</th><th>Loại</th><th>MST</th><th>Liên hệ</th><th>Vật tư cung cấp</th><th>Trạng thái</th><th>Người tạo / Ngày tạo</th><th>Cập nhật</th><th></th></tr></thead><tbody>{partners.map((partner) => editingPartner?.id === partner.id ? <tr key={partner.id}><td><input value={editingPartner.legal_name} onChange={(e) => setEditingPartner({ ...editingPartner, legal_name: e.target.value })} /><input value={editingPartner.short_name ?? ""} placeholder="Tên viết tắt" onChange={(e) => setEditingPartner({ ...editingPartner, short_name: e.target.value })} /></td><td><select value={editingPartner.partner_type} onChange={(e) => setEditingPartner({ ...editingPartner, partner_type: e.target.value as Partner["partner_type"] })}><option value="customer">customer</option><option value="vendor">vendor</option><option value="service">service</option></select></td><td><input value={editingPartner.tax_code} onChange={(e) => setEditingPartner({ ...editingPartner, tax_code: e.target.value })} /></td><td><input value={editingPartner.legal_representative ?? ""} placeholder="Người đại diện" onChange={(e) => setEditingPartner({ ...editingPartner, legal_representative: e.target.value })} /><input value={editingPartner.phone ?? ""} placeholder="SĐT" onChange={(e) => setEditingPartner({ ...editingPartner, phone: e.target.value })} /><input value={editingPartner.email ?? ""} placeholder="Email" onChange={(e) => setEditingPartner({ ...editingPartner, email: e.target.value })} /></td><td>{items.filter((item) => item.category === "raw_material").map((item) => <label className="inline-check" key={item.id}><input type="checkbox" checked={editingPartner.supply_item_ids.includes(item.id)} onChange={(e) => setEditingPartner({ ...editingPartner, supply_item_ids: e.target.checked ? [...editingPartner.supply_item_ids, item.id] : editingPartner.supply_item_ids.filter((id) => id !== item.id) })} />{item.name}</label>)}</td><td><select value={editingPartner.status} onChange={(e) => setEditingPartner({ ...editingPartner, status: e.target.value as Partner["status"] })}><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></td><td>#{partner.created_by_id}<br />{new Date(partner.created_at).toLocaleDateString("vi-VN")}</td><td>{new Date(partner.updated_at).toLocaleDateString("vi-VN")}</td><td><button onClick={savePartnerEdits}>Lưu</button><button onClick={() => setEditingPartner(null)}>Hủy</button></td></tr> : <tr key={partner.id}><td>{partner.legal_name}<br />{partner.short_name}</td><td>{partner.partner_type}</td><td>{partner.tax_code}</td><td>{partner.legal_representative}<br />{partner.phone}<br />{partner.email}</td><td>{partner.supply_item_ids.map((id) => items.find((item) => item.id === id)?.name ?? id).join(", ") || "—"}</td><td>{partner.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}</td><td>#{partner.created_by_id}<br />{new Date(partner.created_at).toLocaleDateString("vi-VN")}</td><td>{new Date(partner.updated_at).toLocaleDateString("vi-VN")}</td><td><button onClick={() => setEditingPartner(partner)}>Sửa</button><button onClick={() => deletePartner(partner)}>Xóa</button></td></tr>)}</tbody></table></section>;
  const partnerFields: Array<[keyof Partner, string]> = [["legal_name", "Đối tác"], ["tax_code", "MST"], ["status", "Trạng thái"]];
  const formatPartnerValues = (snapshot: Partner | undefined, keys: Array<[keyof Partner, string]>) => keys.map(([key, label]) => {
    const value = snapshot?.[key];
    const displayValue = key === "status" ? (value === "active" ? "Đang hoạt động" : value === "inactive" ? "Ngừng hoạt động" : "—") : value || "—";
    return `${label}: ${displayValue}`;
  }).join(" · ");
  const partnerHistoryPanel = <section className="section partner-history-panel"><div className="section-title-row"><div><h2>Lịch sử thay đổi</h2></div>{canEdit && partnerHistory.length > 0 && <button onClick={clearPartnerHistory}>Xóa lịch sử</button>}</div><table><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Người thao tác</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr></thead><tbody>{partnerHistory.map((entry, index) => { const previous = partnerHistory.slice(index + 1).find((candidate) => candidate.snapshot.id === entry.snapshot.id)?.snapshot; const changedFields = partnerFields.filter(([key]) => entry.action === "created" || !previous || (previous[key] ?? null) !== (entry.snapshot[key] ?? null)); return <tr key={entry.id}><td>{new Date(entry.changed_at).toLocaleString("vi-VN")}</td><td>{entry.action === "created" ? "Khởi tạo" : entry.action === "deleted" ? "Ngừng hoạt động" : "Cập nhật"}</td><td>#{entry.changed_by_id}</td><td>{entry.action === "created" ? "—" : formatPartnerValues(previous, changedFields)}</td><td>{formatPartnerValues(entry.snapshot, changedFields)}</td></tr>; })}</tbody></table>{!partnerHistory.length && <p className="muted">Chưa có lịch sử thay đổi.</p>}</section>;
   const companyFields: Array<[keyof CompanyProfile, string]> = [["legal_name", "Tên pháp lý"], ["short_name", "Tên viết tắt"], ["tax_code", "Mã số thuế"], ["legal_representative", "Người đại diện"], ["address", "Địa chỉ"], ["phone", "Số điện thoại"], ["email", "Email"], ["logo_url", "URL logo"]];
   const formatCompanyValues = (snapshot: CompanyProfile | undefined, keys: Array<[keyof CompanyProfile, string]>) => keys.map(([key, label]) => `${label}: ${snapshot?.[key] || "—"}`).join(" · ");
   const companyHistoryPanel = <section className="section company-history-panel">{companyProfileHistory.length ? <table><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Người thao tác</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr></thead><tbody>{companyProfileHistory.map((entry, index) => { const previous = companyProfileHistory[index + 1]?.snapshot; const changedFields = companyFields.filter(([key]) => entry.action === "created" || !previous || (previous[key] ?? null) !== (entry.snapshot[key] ?? null)); return <tr key={entry.id}><td>{new Date(entry.changed_at).toLocaleString("vi-VN")}</td><td>{entry.action === "created" ? "Khởi tạo" : "Cập nhật"}</td><td>#{entry.changed_by_id}</td><td>{entry.action === "created" ? "—" : formatCompanyValues(previous, changedFields)}</td><td>{formatCompanyValues(entry.snapshot, changedFields)}</td></tr>; })}</tbody></table> : <p className="muted">Chưa có lịch sử cập nhật.</p>}</section>;

   return <main className={`${activeTab === "settings" && settingsTab === "partners" ? "settings-partners" : ""} ${activeTab === "settings" && settingsTab === "company" ? "settings-company" : ""} ${activeTab === "settings" && settingsTab === "company" && companyTab === "history" ? "company-tab-history" : ""} ${activeTab === "warehouse" ? `warehouse-${warehouseTab}` : ""} ${showPartnerForm ? "partner-form-open" : ""}`}>
    <div className="topbar"><div><h1>VietMAS Admin</h1><div className="muted">AI hỗ trợ vận hành doanh nghiệp · Vai trò: {role}</div></div><button onClick={signOut}>Đăng xuất</button></div>
    <div className="admin-tabs"><button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")} disabled={!canViewUsers}>Người dùng <span>{users.length}</span></button><button className={activeTab === "warehouse" ? "active" : ""} onClick={() => setActiveTab("warehouse")}>Mua hàng - Kho vận</button><button className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")} disabled={!canViewSettings}>Cài đặt</button></div>
    {activeTab === "warehouse" && <div className="warehouse-tabs"><button className={warehouseTab === "transactions" ? "active" : ""} onClick={() => setWarehouseTab("transactions")}>Đơn mua hàng</button><button className={warehouseTab === "inventory" ? "active" : ""} onClick={() => setWarehouseTab("inventory")}>Kho vận</button></div>}
    {activeTab === "settings" && canViewSettings && <div className="settings-tabs"><button className={settingsTab === "company" ? "active" : ""} onClick={() => setSettingsTab("company")}>Thông tin doanh nghiệp</button><button className={settingsTab === "partners" ? "active" : ""} onClick={() => setSettingsTab("partners")}>Đối tác <span>{partners.length}</span></button></div>}
    {activeTab === "settings" && settingsTab === "company" && <div className="settings-tabs company-tabs"><button className={companyTab === "info" ? "active" : ""} onClick={() => setCompanyTab("info")}>Thông tin doanh nghiệp</button><button className={companyTab === "history" ? "active" : ""} onClick={() => setCompanyTab("history")}>Lịch sử cập nhật</button></div>}
    {activeTab === "settings" && settingsTab === "partners" && <div className="settings-tabs partner-tabs"><button className={partnerTab === "list" ? "active" : ""} onClick={() => setPartnerTab("list")}>Danh sách đối tác</button><button className={partnerTab === "history" ? "active" : ""} onClick={() => setPartnerTab("history")}>Lịch sử thay đổi</button>{partnerTab === "list" && !editingPartner && canEdit && <button className="partner-add-button" onClick={() => setShowPartnerForm((open) => !open)}>{showPartnerForm ? "− Đóng form" : "+ Thêm đối tác"}</button>}</div>}
     {activeTab === "settings" && settingsTab === "partners" && (partnerTab === "list" ? partnerPanel : partnerHistoryPanel)}
     {activeTab === "settings" && settingsTab === "company" && companyTab === "history" && companyHistoryPanel}
    {(error || message) && <div className={`toast ${error ? "toast-error" : "toast-success"}`} role="status">{error || message}</div>}
    {activeTab === "users" && canViewUsers ? <section className="section users-panel"><div className="section-title-row"><div><h2>Người dùng trong hệ thống</h2><p className="muted">Danh sách tài khoản và vai trò được cấp quyền truy cập VietMAS.</p></div><span className="user-count">{users.length} tài khoản</span></div><div className="user-cards">{users.map((user) => <article className="user-card" key={user.id}><div className="user-avatar">{user.display_name.charAt(0).toUpperCase()}</div><div className="user-detail"><h3>{user.display_name}</h3><p>@{user.username}</p><span className={`role-badge role-${user.role}`}>{user.role === "admin" ? "Quản trị viên" : user.role === "ceo" ? "CEO" : "Quản lý"}</span></div><div className="user-meta"><small>ID người dùng</small><strong>#{user.id}</strong><small>Quyền truy cập</small><strong>{user.access_scope === "purchasing" ? "Mua hàng" : user.access_scope === "all" ? "Toàn hệ thống" : "Kho vận"}</strong></div></article>)}</div></section> : activeTab === "settings" && canViewSettings ? <section className="section"><div className="section-title-row"><div><h2>Cài đặt</h2><p className="muted">Quản lý thông tin dùng chung cho toàn bộ VietMAS.</p></div></div><form className="form-grid company-form" onSubmit={submitCompanyProfile}><label>Tên pháp lý<input name="legal_name" defaultValue={companyProfile?.legal_name ?? ""} required /></label><label>Tên viết tắt<input name="short_name" defaultValue={companyProfile?.short_name ?? ""} /></label><label>Mã số thuế<input name="tax_code" defaultValue={companyProfile?.tax_code ?? ""} required /></label><label>Người đại diện<input name="legal_representative" defaultValue={companyProfile?.legal_representative ?? ""} /></label><label className="full-width">Địa chỉ<input name="address" defaultValue={companyProfile?.address ?? ""} /></label><label>Số điện thoại<input name="phone" defaultValue={companyProfile?.phone ?? ""} /></label><label>Email<input name="email" type="email" defaultValue={companyProfile?.email ?? ""} /></label><label className="full-width">URL logo<input name="logo_url" defaultValue={companyProfile?.logo_url ?? ""} /></label><div className="form-actions"><button type="submit">Lưu thông tin</button></div></form><div className="history-panel"><div className="section-title-row"><div><h2>Lịch sử thay đổi</h2><p className="muted">Các phiên bản thông tin doanh nghiệp đã được lưu.</p></div></div>{companyProfileHistory.length ? <table><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Người thao tác</th><th>Tên công ty</th><th>Mã số thuế</th></tr></thead><tbody>{companyProfileHistory.map((entry) => <tr key={entry.id}><td>{new Date(entry.changed_at).toLocaleString("vi-VN")}</td><td>{entry.action === "created" ? "Khởi tạo" : "Cập nhật"}</td><td>#{entry.changed_by_id}</td><td>{entry.snapshot.legal_name}</td><td>{entry.snapshot.tax_code}</td></tr>)}</tbody></table> : <p className="muted">Chưa có lịch sử thay đổi.</p>}</div></section> : <>
    <section className="section inventory-section"><div className="section-title-row inventory-title-row"><h2>Tồn kho</h2>{canEdit && <button className="inventory-toggle" onClick={() => { if (showInventoryForm) setEditing(null); setShowInventoryForm((open) => !open); }}>{showInventoryForm ? "− Đóng form" : "+ Thêm hàng tồn kho"}</button>}</div><div className={`inventory-form-dropdown ${showInventoryForm ? "open" : ""}`}><form className="form-grid" onSubmit={submitInventory} key={editing?.id ?? "new"}><label>SKU<input name="sku" defaultValue={editing?.sku ?? ""} disabled={Boolean(editing)} required /></label><label>Tên hàng<input name="name" defaultValue={editing?.name ?? ""} required /></label><label>Nhóm<select name="category" defaultValue={editing?.category ?? "raw_material"} disabled={Boolean(editing)}><option value="raw_material">Nguyên liệu</option><option value="finished_goods">Thành phẩm</option></select></label><label>Đơn vị<input name="unit" defaultValue={editing?.unit ?? "kg"} required /></label><label>Số lượng ban đầu<input name="quantity" type="number" min="0" defaultValue={editing?.quantity ?? 0} disabled={Boolean(editing)} /></label><label>Ngưỡng cảnh báo<input name="low_stock_threshold" type="number" min="0" defaultValue={editing?.low_stock_threshold ?? 0} required /></label><label>Quy cách/Ghi chú<input name="packaging_note" defaultValue={editing?.packaging_note ?? ""} /></label><div className="form-actions"><button type="submit">{editing ? "Lưu thay đổi" : "Thêm hàng tồn kho"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setShowInventoryForm(false); }}>Hủy</button>}</div></form></div><table><thead><tr><th>SKU</th><th>Tên hàng</th><th>Nhóm</th><th>Tồn</th><th>Cảnh báo</th><th>Thao tác</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.sku}</td><td>{item.name}</td><td>{item.category === "raw_material" ? "Nguyên liệu" : "Thành phẩm"}</td><td>{item.quantity} {item.unit}</td><td>{item.quantity <= item.low_stock_threshold ? "Sắp hết" : "Bình thường"}</td><td>{canEdit && <><button onClick={() => { setEditing(item); setShowInventoryForm(true); }}>Sửa</button> <button onClick={() => deleteItem(item)}>Xóa</button></>}</td></tr>)}</tbody></table></section>

    <section className="section purchase-order-section"><div className="section-title-row"><div><h2>Đơn mua hàng</h2></div><button className="inventory-toggle purchase-order-toggle" onClick={() => setShowPurchaseOrderForm((open) => { if (open) { setEditingPurchaseOrder(null); setSelectedPurchaseVendorId(""); } return !open; })}>{showPurchaseOrderForm ? "− Đóng form" : "+ Thêm đơn mới"}</button></div><div className={`purchase-order-form-dropdown ${showPurchaseOrderForm ? "open" : ""}`}><form className="form-grid" onSubmit={submitTransaction} key={editingPurchaseOrder?.id ?? "new-purchase-order"}><input type="hidden" name="transaction_type" value="import" /><label>Mã đơn hàng<input className="auto-order-code" value={editingPurchaseOrder?.reference_code || nextPurchaseOrderCode} disabled aria-label={`Mã PO: ${editingPurchaseOrder?.reference_code || nextPurchaseOrderCode}`} /></label><label>Vendor<select name="vendor_id" value={selectedPurchaseVendorId} onChange={(event) => setSelectedPurchaseVendorId(event.target.value)} required><option value="">Chọn vendor</option>{partners.filter((partner) => partner.partner_type === "vendor" && partner.status === "active").map((partner) => <option key={partner.id} value={partner.id}>{partner.short_name || partner.legal_name}</option>)}</select></label><label>Nguyên liệu<select name="item_id" defaultValue={editingPurchaseOrder?.item_id ?? ""} required disabled={!selectedPurchaseVendorId}><option value="">{selectedPurchaseVendorId ? (availablePurchaseItems.length ? "Chọn nguyên liệu" : "Vendor chưa có nguyên liệu") : "Chọn Vendor trước"}</option>{availablePurchaseItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>)}</select></label><label>Số lượng<input name="quantity" type="number" min="1" defaultValue={editingPurchaseOrder?.quantity ?? ""} required /></label><label>Trạng thái<select name="order_status" defaultValue={editingPurchaseOrder?.order_status || "draft"}><option value="draft">Nháp</option><option value="ordered">Đã đặt hàng</option><option value="partially_received">Nhận một phần</option><option value="received">Đã nhận đủ</option><option value="cancelled">Đã hủy</option></select></label><label className="full-width">URL chứng từ<input name="document_url" type="url" defaultValue={editingPurchaseOrder?.document_url || ""} placeholder="https://..." /></label><label className="full-width">Ghi chú<input name="note" defaultValue={editingPurchaseOrder?.note || ""} required /></label><div className="form-actions"><button type="submit">Tạo đơn mua hàng</button></div></form></div><div className="purchase-order-history-panel"><div className="section-title-row"><div><h2>Danh sách đơn đặt hàng</h2><p className="muted">Theo dõi và quản lý các đơn đã tạo, đang chờ nhận hoặc đã hoàn tất.</p></div></div><table><thead><tr><th>Mã đơn</th><th>Vendor</th><th>Nguyên liệu</th><th>Số lượng</th><th>Trạng thái</th><th>Ngày tạo</th><th>Chứng từ</th><th>Thao tác</th></tr></thead><tbody>{purchaseOrderRows}{!transactions.some((transaction) => transaction.vendor_id != null) && <tr><td colSpan={8} className="muted">Chưa có đơn đặt hàng nào.</td></tr>}</tbody></table><div className="purchase-order-audit-panel"><div className="section-title-row"><div><h2>Lịch sử thay đổi</h2></div></div><table><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Người thao tác</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr></thead><tbody>{purchaseOrderHistory.map((entry) => <tr key={entry.id}><td>{new Date(entry.changed_at).toLocaleString("vi-VN")}</td><td>{entry.action === "created" ? "Tạo" : entry.action === "updated" ? "Sửa" : "Xóa"}</td><td>#{entry.changed_by_id}</td><td>{entry.action === "created" ? "—" : formatPurchaseOrderChanges(entry.previous_snapshot, entry.snapshot, "previous")}</td><td>{formatPurchaseOrderChanges(entry.previous_snapshot, entry.snapshot)}</td></tr>)}{!purchaseOrderHistory.length && <tr><td colSpan={5} className="muted">Chưa có lịch sử thay đổi.</td></tr>}</tbody></table></div></div></section>

    <section className="section stock-history-section"><h2>Lịch sử xuất nhập kho</h2><table><thead><tr><th>Thời gian</th><th>Sản phẩm</th><th>Loại</th><th>Số lượng</th><th>Ghi chú</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id}><td>{new Date(transaction.created_at).toLocaleString("vi-VN")}</td><td>{items.find((item) => item.id === transaction.item_id)?.name ?? transaction.item_id}</td><td>{transaction.transaction_type === "import" ? "Nhập kho" : transaction.transaction_type === "export" ? "Xuất kho" : "Điều chỉnh"}</td><td>{transaction.quantity}</td><td>{transaction.note}</td></tr>)}</tbody></table></section>
    </>}
  </main>;
}
