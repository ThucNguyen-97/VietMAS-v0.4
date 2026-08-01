"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./user.css";

type Item = { id: number; sku: string; name: string; category: string; unit: string; quantity: number; low_stock_threshold: number; packaging_note?: string };
type Message = { sender: "user" | "assistant"; text: string };
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const suggestions = ["Kho còn bao nhiêu muối?", "Nhập 50 kg ớt", "Xuất 10 kg muối", "Mặt hàng nào sắp hết?"];

export default function UserPortal() {
  useEffect(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) textNodes.push(node as Text);
    textNodes.forEach((textNode) => {
      if (textNode.nodeValue?.includes("Kho vận")) textNode.nodeValue = textNode.nodeValue.replaceAll("Kho vận", "Tồn kho");
    });
  });

  const [token, setToken] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("thukho");
  const [password, setPassword] = useState("thukho123");
  const [items, setItems] = useState<Item[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ sender: "assistant", text: "Xin chào! Tôi có thể giúp bạn kiểm tra tồn kho hoặc ghi nhận nhập, xuất kho." }]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadData = async (authToken: string) => {
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const [meResponse, inventoryResponse] = await Promise.all([fetch(`${API}/users/me`, { headers }), fetch(`${API}/inventory`, { headers })]);
      if (!meResponse.ok || !inventoryResponse.ok) throw new Error();
      const me = await meResponse.json();
      setDisplayName(me.display_name || me.username);
      setItems(await inventoryResponse.json());
    } catch {
      localStorage.removeItem("vietmas_user_token"); setToken(""); setError("Phiên đăng nhập hết hạn hoặc không thể kết nối backend.");
    }
  };

  useEffect(() => { const savedToken = window.localStorage.getItem("vietmas_user_token"); if (savedToken) { setToken(savedToken); loadData(savedToken); } }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (!response.ok) throw new Error();
      const data = await response.json(); localStorage.setItem("vietmas_user_token", data.access_token); setToken(data.access_token); await loadData(data.access_token);
    } catch { setError("Sai tài khoản/mật khẩu hoặc backend chưa chạy."); } finally { setLoading(false); }
  }

  async function sendMessage(text = query) {
    const message = text.trim(); if (!message || sending) return;
    setQuery(""); setMessages((current) => [...current, { sender: "user", text: message }]); setSending(true);
    try {
      const response = await fetch(`${API}/chat/message`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ message }) });
      if (!response.ok) throw new Error(); const data = await response.json();
      setMessages((current) => [...current, { sender: "assistant", text: data.reply }]); await loadData(token);
    } catch { setMessages((current) => [...current, { sender: "assistant", text: "Mình chưa thể kết nối máy chủ. Bạn thử lại sau nhé." }]); } finally { setSending(false); }
  }

  const filteredItems = useMemo(() => items.filter((item) => `${item.name} ${item.sku}`.toLowerCase().includes(search.toLowerCase())), [items, search]);
  const lowStock = items.filter((item) => item.quantity <= item.low_stock_threshold);
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!token) return <main className="user-login-shell"><div className="user-login-art"><span className="brand-mark">V</span><p>VietMAS</p><h1>Kho vận rõ ràng,<br />vận hành nhẹ nhàng.</h1><span className="login-spark">✦</span></div><div className="user-login-card"><div className="mobile-brand"><span className="brand-mark">V</span> VietMAS</div><p className="eyebrow">CỔNG VẬN HÀNH</p><h1>Chào mừng trở lại</h1><p className="login-copy">Đăng nhập để kiểm tra kho và làm việc cùng trợ lý VietMAS.</p><form onSubmit={signIn}><label>Tài khoản<input value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="error-text">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}<span>→</span></button></form><p className="login-hint">Tài khoản demo: thukho / thukho123</p><a className="admin-link" href="/">Đi tới trang quản trị →</a></div></main>;

  return <main className="user-shell"><aside className="user-sidebar"><div className="sidebar-brand"><span className="brand-mark">V</span><span>VietMAS</span></div><p className="sidebar-label">KHÔNG GIAN LÀM VIỆC</p><nav><a className="active" href="#overview"><span>⌂</span> Tổng quan</a><a href="#inventory"><span>▦</span> Tồn kho</a><a href="#assistant"><span>✦</span> Trợ lý VietMAS</a></nav><div className="sidebar-bottom"><div className="support-card"><span>✦</span><b>Cần hỗ trợ?</b><p>Hỏi VietMAS bất cứ lúc nào.</p><button onClick={() => document.getElementById("assistant")?.scrollIntoView({ behavior: "smooth" })}>Mở trợ lý →</button></div><button className="signout" onClick={() => { localStorage.removeItem("vietmas_user_token"); setToken(""); }}>↪ Đăng xuất</button></div></aside><section className="user-content"><header className="user-header"><div><p className="eyebrow">THỨ SÁU, 31 THÁNG 7, 2026</p><h1>Chào {displayName || "bạn"} <span>✦</span></h1><p className="muted">Đây là tình hình kho của bạn hôm nay.</p></div><div className="header-avatar">{(displayName || "U").charAt(0).toUpperCase()}</div></header><section id="overview" className="overview-grid"><div className="stat-card accent"><span className="stat-icon">▦</span><p>Tổng mặt hàng</p><strong>{items.length}</strong><small>Đang theo dõi trong kho</small></div><div className="stat-card"><span className="stat-icon green">◉</span><p>Tổng tồn kho</p><strong>{totalUnits.toLocaleString("vi-VN")}</strong><small>Đơn vị hàng hóa</small></div><div className="stat-card"><span className="stat-icon orange">!</span><p>Cần chú ý</p><strong>{lowStock.length}</strong><small>{lowStock.length ? "Mặt hàng sắp hết" : "Kho đang ổn định"}</small></div></section><div className="workspace-grid"><section id="assistant" className="assistant-card"><div className="section-heading"><div><p className="eyebrow">TRỢ LÝ THÔNG MINH</p><h2>Hôm nay tôi có thể giúp gì?</h2></div><span className="online-dot">● Đang hoạt động</span></div><div className="chat-window">{messages.map((message, index) => <div className={`chat-row ${message.sender}`} key={`${message.sender}-${index}`}><div className="chat-avatar">{message.sender === "assistant" ? "✦" : (displayName || "U").charAt(0).toUpperCase()}</div><div className="chat-bubble">{message.text}</div></div>)}{sending && <div className="chat-row assistant"><div className="chat-avatar">✦</div><div className="chat-bubble typing">Đang xử lý<span> ···</span></div></div>}</div><div className="suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => sendMessage(suggestion)}>{suggestion}</button>)}</div><form className="chat-form" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập yêu cầu kho của bạn..." /><button disabled={sending || !query.trim()} aria-label="Gửi">↑</button></form></section><section id="inventory" className="inventory-card"><div className="section-heading"><div><p className="eyebrow">TỔNG QUAN KHO</p><h2>Mặt hàng gần đây</h2></div><a href="#inventory">Xem tất cả →</a></div><div className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mặt hàng..." /></div><div className="item-list">{filteredItems.slice(0, 6).map((item) => { const isLow = item.quantity <= item.low_stock_threshold; return <div className="item-row" key={item.id}><div className="item-icon">{item.category === "finished_goods" ? "▤" : "◈"}</div><div className="item-info"><b>{item.name}</b><small>{item.sku}</small></div><div className="item-quantity"><b>{item.quantity.toLocaleString("vi-VN")} <small>{item.unit}</small></b><span className={isLow ? "status low" : "status good"}>{isLow ? "Sắp hết" : "Ổn định"}</span></div></div>; })}{!filteredItems.length && <p className="empty-state">Không tìm thấy mặt hàng.</p>}</div></section></div></section></main>;
}
