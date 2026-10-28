"use strict";

const API_BASE = "";
const ROUTES = {
  "/login": { title: "Sign in", public: true },
  "/register": { title: "Create account", public: true },
  "/shop": { title: "Campus shop", roles: ["buyer", "organizer"] },
  "/my-orders": { title: "My orders", roles: ["buyer"] },
  "/organizer": { title: "Overview", roles: ["organizer"] },
  "/organizer/inventory": { title: "Inventory", roles: ["organizer"] },
  "/organizer/orders": { title: "All orders", roles: ["organizer"] },
  "/organizer/alerts": { title: "Stock alerts", roles: ["organizer"] },
  "/organizer/reports": { title: "Reports", roles: ["organizer"] }
};
const BUYER_NAV = [
  ["/shop", "Discover", "grid"],
  ["/my-orders", "My orders", "receipt"]
];
const ORGANIZER_NAV = [
  ["/organizer", "Overview", "grid"],
  ["/organizer/inventory", "Inventory", "box"],
  ["/organizer/orders", "Orders", "receipt"],
  ["/organizer/alerts", "Alerts", "bell"],
  ["/organizer/reports", "Reports", "chart"]
];
const ICONS = {
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8m-9 5v9"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M9 8h6m-6 4h6m-6 4h3"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V4m0 16h17"/><path d="m7 15 4-4 3 2 6-7"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></svg>',
  merch: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 11-9 5 5 8 5-3v17h19V21l5 3 5-8-9-5c-1 4-5 6-10 6s-9-2-11-6Z"/><path d="m19 11 5 6 5-6"/></svg>',
  ticket: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17a5 5 0 0 0 0 10v5h34v-5a5 5 0 0 1 0-10v-5H7v5Z"/><path d="M27 13v4m0 4v4m0 4v4"/></svg>',
  cap: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 40 30-17 30 17-30 17-30-17Z"/><path d="M29 47v18c10 9 28 9 38 0V47M78 42v19"/><circle cx="78" cy="66" r="3" fill="currentColor" stroke="none"/></svg>',
  empty: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h16l-1 12H5L4 8Z"/><path d="M9 8a3 3 0 0 1 6 0m-5 5h.01M14 13h.01"/></svg>'
};
const state = {
  token: sessionStorage.getItem("campus_access_token"),
  user: null,
  socket: null,
  reconnectTimer: null,
  toastTimer: null,
  stockFilter: "all",
  stockSearch: "",
  shopItems: [],
  socketConnected: false
};
const root = document.getElementById("root");
const toast = document.getElementById("toast");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function routePath(path = location.pathname) {
  if (!path || path === "/") return "/";
  const clean = path.replace(/\/+$/, "");
  return clean || "/";
}
function defaultRoute() {
  return state.user?.role === "organizer" ? "/organizer" : "/shop";
}
function navTo(path, replace = false) {
  if (replace) history.replaceState({}, "", path);
  else history.pushState({}, "", path);
  renderRoute();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function showToast(message, type = "") {
  toast.textContent = message;
  toast.classList.toggle("error", type === "error");
  toast.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
}
function describeError(error) {
  const detail = error?.message || "Something went wrong. Please try again.";
  if (Array.isArray(error?.detail)) return error.detail.map(entry => entry.msg).join(", ");
  return detail;
}
async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = "Bearer " + state.token;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(API_BASE + path, { ...options, headers });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const detail = typeof data.detail === "string"
      ? data.detail
      : Array.isArray(data.detail)
        ? data.detail.map(entry => entry.msg).join(", ")
        : "Something went wrong. Please try again.";
    if (response.status === 401 && state.token) {
      clearSession();
      navTo("/login", true);
    }
    throw new Error(detail);
  }
  return data;
}
function clearSession() {
  state.token = null;
  state.user = null;
  sessionStorage.removeItem("campus_access_token");
  clearTimeout(state.reconnectTimer);
  if (state.socket) {
    state.socket.onclose = null;
    state.socket.close();
    state.socket = null;
  }
  state.socketConnected = false;
}
function signOut() {
  clearSession();
  navTo("/login", true);
  showToast("You've signed out. See you next time.");
}
function updateConnection(isConnected) {
  state.socketConnected = isConnected;
  const indicator = document.querySelector(".ws-indicator");
  const label = document.querySelector(".ws-label");
  if (indicator && label) {
    indicator.classList.toggle("offline", !isConnected);
    label.textContent = isConnected ? "Live" : "Reconnecting";
  }
}
function connectSocket() {
  if (!state.token || !state.user || state.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(state.socket.readyState)) return;
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  state.socket = new WebSocket(`${scheme}//${location.host}/ws?token=${encodeURIComponent(state.token)}`);
  state.socket.onopen = () => updateConnection(true);
  state.socket.onmessage = event => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === "stock_update") {
      const currentItem = state.shopItems.find(item => item.id === message.item_id);
      if (currentItem) currentItem.stock = message.stock;
      if (routePath() === "/shop") renderRoute();
    } else if (message.type === "alert") {
      const alert = message.alert || {};
      showToast(`${alert.type === "sold_out" ? "Sold out" : "Low stock"}: ${alert.item_name || "An item"} · ${alert.stock ?? 0} left`);
      if (routePath() === "/organizer/alerts") renderRoute();
    }
  };
  state.socket.onclose = () => {
    updateConnection(false);
    if (state.token) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = setTimeout(connectSocket, 2000);
    }
  };
  state.socket.onerror = () => state.socket?.close();
}
function brandMarkup() {
  return `<a class="brand" href="/shop" data-link aria-label="Campus Edit home">
    <span class="brand-mark">${ICONS.box}</span>
    <span class="brand-name">Campus Edit<span>Campus, collected.</span></span>
  </a>`;
}
function illustrationMarkup() {
  return `<div class="auth-illustration" aria-hidden="true">${ICONS.cap}</div>`;
}
function renderAuth(path) {
  const isRegister = path === "/register";
  document.title = `${isRegister ? "Create account" : "Sign in"} · Campus Edit`;
  root.innerHTML = `
    <header class="guest-header">
      ${brandMarkup()}
      <span class="guest-header-note"><span class="online-dot"></span>Made for campus life</span>
    </header>
    <main class="auth-layout">
      <section class="auth-copy">
        <p class="eyebrow">Good things happen here</p>
        <h1>${isRegister ? "Find your place on campus." : "Your campus.<br>In good supply."}</h1>
        <p>${isRegister
          ? "Join your campus community to discover the merch, events, and little moments worth showing up for."
          : "Find the merch you love and the events you don't want to miss. One little corner of campus, all in one place."}</p>
        ${illustrationMarkup()}
      </section>
      <form class="auth-card" id="${isRegister ? "register-form" : "login-form"}">
        <h2>${isRegister ? "Make yourself at home" : "Welcome back"}</h2>
        <p class="auth-subtitle">${isRegister ? "A few details and you're in." : "Sign in to see what's happening on campus."}</p>
        ${isRegister ? `
          <label class="field-label" for="name">Your name</label>
          <input class="field" id="name" name="name" maxlength="100" placeholder="How should we call you?" autocomplete="name" required>
        ` : ""}
        <label class="field-label" for="email">Campus email</label>
        <input class="field" id="email" name="email" type="email" placeholder="you@university.edu" autocomplete="username" required>
        <label class="field-label" for="password">Password</label>
        <input class="field" id="password" name="password" type="password" minlength="${isRegister ? "8" : "1"}" placeholder="${isRegister ? "At least 8 characters" : "Your password"}" autocomplete="${isRegister ? "new-password" : "current-password"}" required>
        ${isRegister ? `
          <label class="field-label" for="organizer-code">Organizer invite code <span class="muted">(optional)</span></label>
          <input class="field organizer-code" id="organizer-code" name="organizer_code" placeholder="For committee members">
        ` : ""}
        <p id="auth-error" class="auth-error" role="alert" hidden></p>
        <button class="button button-block" type="submit">${isRegister ? "Create my account" : "Sign in"} <span aria-hidden="true">→</span></button>
        <p class="auth-foot">${isRegister
          ? `Already have an account? <a href="/login" data-link>Sign in</a>`
          : `New around here? <a href="/register" data-link>Create an account</a>`}</p>
      </form>
    </main>`;
}
function navLinkMarkup([href, label, icon], active) {
  const isActive = href === active || href !== "/organizer" && href !== "/shop" && active.startsWith(href + "/");
  return `<a class="nav-link" href="${href}" data-link aria-current="${isActive ? "page" : "false"}">${ICONS[icon]}<span>${label}</span></a>`;
}
function renderShell(path, content = '<div class="loading">Gathering the good stuff…</div>') {
  const route = ROUTES[path] || ROUTES[defaultRoute()];
  const isOrganizer = state.user?.role === "organizer";
  const navigation = isOrganizer ? ORGANIZER_NAV : BUYER_NAV;
  const firstName = state.user?.name?.trim().split(/\s+/)[0] || "friend";
  document.title = `${route.title} · Campus Edit`;
  root.innerHTML = `
    <div class="app-layout">
      <aside class="sidebar">
        <div class="sidebar-brand">${brandMarkup()}</div>
        <p class="nav-label">${isOrganizer ? "Workspace" : "Your campus"}</p>
        <nav class="nav-list" aria-label="Main navigation">${navigation.map(link => navLinkMarkup(link, path)).join("")}</nav>
        <div class="sidebar-bottom">
          <div class="profile-row">
            <span class="avatar" aria-hidden="true">${escapeHtml((state.user?.name || state.user?.email || "C").slice(0, 1))}</span>
            <div class="profile-copy"><div class="profile-name">${escapeHtml(state.user?.name || state.user?.email)}</div><div class="profile-role">${isOrganizer ? "Organizer" : "Campus buyer"}</div></div>
          </div>
          <button class="signout-link" type="button" data-action="signout">${ICONS.logout}Sign out</button>
        </div>
      </aside>
      <div class="main-column">
        <header class="app-header">
          <div class="header-right">
            <div class="mobile-brand">${brandMarkup()}</div>
            <div class="page-heading"><h1>${escapeHtml(route.title)}</h1><p>${isOrganizer ? "A clearer view of your campus operation." : `Good to see you, ${escapeHtml(firstName)}.`}</p></div>
          </div>
          <div class="ws-indicator ${state.socketConnected ? "" : "offline"}" aria-live="polite"><span class="status-dot"></span><span class="ws-label">${state.socketConnected ? "Live" : "Reconnecting"}</span></div>
        </header>
        <main class="page-content" id="page-content">${content}</main>
      </div>
    </div>`;
}
function pageError(error, retry = true) {
  return `<div class="error-panel"><strong>Couldn't load this page.</strong><p>${escapeHtml(describeError(error))}</p>${retry ? '<button class="button-secondary" type="button" data-action="retry">Try again</button>' : ""}</div>`;
}
function pageHero(eyebrow, title, text, stats) {
  return `<section class="hero">
    <div class="hero-copy"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></div>
    <div class="hero-art" aria-hidden="true">${ICONS.cap}</div>
  </section>${stats ? `<div class="stats">${stats}</div>` : ""}`;
}
function statMarkup(label, value, icon) {
  return `<div class="stat"><span class="stat-icon">${ICONS[icon]}</span><span><span class="stat-label">${escapeHtml(label)}</span><strong class="stat-value">${escapeHtml(value)}</strong></span></div>`;
}
function emptyMarkup(title, message) {
  return `<div class="empty-state">${ICONS.empty}<strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
}
function itemStock(item) {
  if (Number(item.stock) <= 0) return { text: "Sold out", className: "out" };
  if (Number(item.stock) <= Number(item.low_stock_threshold || 0)) return { text: `Only ${item.stock} left`, className: "low" };
  return { text: `${item.stock} in stock`, className: "" };
}
function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}
function formatDate(value, options = { dateStyle: "medium" }) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, options).format(date);
}
function statusMarkup(status) {
  const value = String(status || "unknown");
  const klass = value === "confirmed" ? "" : value === "cancelled" ? "neutral" : "warning";
  return `<span class="status-pill ${klass}">${escapeHtml(value)}</span>`;
}
function productMarkup(item) {
  const stock = itemStock(item);
  const canBuy = state.user?.role === "buyer" && item.active !== false && Number(item.stock) > 0;
  const eventDate = item.kind === "ticket" && item.event_date
    ? `<p class="event-date">Event · ${escapeHtml(formatDate(item.event_date, { dateStyle: "medium", timeStyle: "short" }))}</p>`
    : "";
  return `<article class="product">
    <div class="product-art">${ICONS[item.kind === "ticket" ? "ticket" : "merch"]}<span class="product-kind">${item.kind === "ticket" ? "Event ticket" : "Campus merch"}</span></div>
    <div class="product-body">
      <div class="product-top"><div><h3>${escapeHtml(item.name)}</h3><span class="sku">${escapeHtml(item.sku)}</span></div><span class="price">${formatPrice(item.price)}</span></div>
      ${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ""}
      ${eventDate}
      <div class="product-bottom"><span class="stock ${stock.className}">${escapeHtml(stock.text)}</span>
        ${canBuy ? `<button class="button" type="button" data-action="buy" data-id="${escapeHtml(item.id)}">Get one</button>` : ""}
      </div>
    </div>
  </article>`;
}
function filteredProducts() {
  const query = state.stockSearch.trim().toLowerCase();
  return state.shopItems.filter(item => {
    const typeMatches = state.stockFilter === "all" || item.kind === state.stockFilter;
    const searchMatches = !query || [item.name, item.sku, item.kind, item.description]
      .some(value => String(value || "").toLowerCase().includes(query));
    return typeMatches && searchMatches;
  });
}
function renderShopProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const products = filteredProducts();
  grid.innerHTML = products.length
    ? products.map(productMarkup).join("")
    : emptyMarkup(state.shopItems.length ? "No little treasures found" : "Nothing on the shelves just yet",
      state.shopItems.length ? "Try another search or switch up your filter." : "Check back soon — something good is on its way.");
}
async function renderShop() {
  state.shopItems = await api("/items");
  const totalStock = state.shopItems.reduce((sum, item) => sum + Math.max(0, Number(item.stock) || 0), 0);
  const almostGone = state.shopItems.filter(item => item.stock > 0 && item.stock <= item.low_stock_threshold).length;
  const tickets = state.shopItems.filter(item => item.kind === "ticket").length;
  return `${pageHero("The Campus Edit · Live board", "A little more campus, a little less scrolling.",
    "Good finds, upcoming moments, and what's still in stock.",
    statMarkup("On the board", state.shopItems.length, "box") +
    statMarkup("Ready to find you", totalStock, "grid") +
    statMarkup("Events to explore", tickets, "receipt"))}
    <section>
      <div class="section-heading">
        <div><h2>The good stuff</h2><p>Little things that make campus feel like yours. ${almostGone ? `${almostGone} nearly gone.` : ""}</p></div>
        <div class="section-actions">
          <label class="search-box">${ICONS.search}<input class="search-input" id="shop-search" type="search" placeholder="Find something…" aria-label="Search inventory" value="${escapeHtml(state.stockSearch)}"></label>
          <div class="filters" role="group" aria-label="Filter inventory">
            ${[["all", "All"], ["merch", "Merch"], ["ticket", "Events"]].map(([value, label]) => `<button class="filter" type="button" data-filter="${value}" aria-pressed="${state.stockFilter === value}">${label}</button>`).join("")}
          </div>
        </div>
      </div>
      <div id="product-grid" class="product-grid" aria-live="polite"></div>
    </section>
    <p class="footer-note">Campus, collected. Your stock updates live.</p>`;
}
function orderRowsMarkup(orders, organizer = false) {
  if (!orders.length) return `<tr><td colspan="${organizer ? 7 : 6}" class="table-empty">No orders here yet. The next good thing is just around the corner.</td></tr>`;
  return orders.map(order => {
    const ticketCodes = !organizer && order.kind === "ticket" && Array.isArray(order.ticket_codes) && order.ticket_codes.length
      ? `<span class="ticket-codes-label">Your ticket${order.ticket_codes.length === 1 ? "" : "s"}</span><span class="ticket-codes">${order.ticket_codes.map(code => `<code>${escapeHtml(code)}</code>`).join("")}</span>`
      : "";
    return `<tr>
      <td><span class="cell-title">${escapeHtml(order.item_name)}</span><span class="cell-subtitle">${escapeHtml(order.sku)}</span>${ticketCodes}</td>
      ${organizer ? `<td><span class="cell-title">${escapeHtml(order.buyer_id)}</span><span class="cell-subtitle">Buyer ID</span></td>` : ""}
      <td>${escapeHtml(order.quantity)}</td><td>${formatPrice(order.total)}</td><td>${formatDate(order.created_at)}</td><td>${statusMarkup(order.status)}</td>
      <td>${order.status === "confirmed" ? `<button class="button-danger" type="button" data-action="cancel-order" data-id="${escapeHtml(order.id)}">Cancel</button>` : "—"}</td>
    </tr>`;
  }).join("");
}
async function renderOrders(organizer = false) {
  const orders = await api(organizer ? "/orders" : "/orders/me");
  const colspan = organizer ? 7 : 6;
  return `<div class="section-heading"><div><h2>${organizer ? "Every order, one place" : "Your campus moments"}</h2><p>${organizer ? "Review purchases and help when plans change." : "Tickets and campus finds you've picked up along the way."}</p></div></div>
    <section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr>
      <th>Item</th>${organizer ? "<th>Buyer</th>" : ""}<th>Qty</th><th>Total</th><th>Placed</th><th>Status</th><th>Action</th>
    </tr></thead><tbody>${orders.length ? orderRowsMarkup(orders, organizer) : `<tr><td colspan="${colspan}" class="table-empty">No orders here yet. The next good thing is just around the corner.</td></tr>`}</tbody></table></div></section>`;
}
function inventoryRowsMarkup(items) {
  if (!items.length) return '<tr><td colspan="5" class="table-empty">Add your first item to put it on the board.</td></tr>';
  return items.map(item => {
    const stock = itemStock(item);
    return `<tr>
      <td class="item-cell"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.sku)} · ${item.kind === "ticket" ? "Event" : "Merch"}</span></td>
      <td>${formatPrice(item.price)}</td><td><span class="stock ${stock.className}">${escapeHtml(stock.text)}</span></td>
      <td>${item.active ? '<span class="status-pill">Active</span>' : '<span class="status-pill neutral">Hidden</span>'}</td>
      <td><div class="table-actions">
        <form class="restock-form" data-id="${escapeHtml(item.id)}"><input class="field compact-field" aria-label="Stock adjustment for ${escapeHtml(item.name)}" name="delta" type="number" value="5" min="-${Math.max(0, Number(item.stock))}" max="100000" required><button class="button-secondary" type="submit">Adjust</button></form>
        <button class="${item.active ? "button-secondary" : "button"}" type="button" data-action="toggle-item" data-id="${escapeHtml(item.id)}" data-active="${String(item.active)}">${item.active ? "Hide" : "Publish"}</button>
      </div></td>
    </tr>`;
  }).join("");
}
async function renderInventory() {
  const items = await api("/items");
  return `<div class="section-heading"><div><h2>Inventory, in good order</h2><p>Add a new listing, adjust stock, or take an item off the board.</p></div></div>
    <div class="layout-two">
      <form id="create-item-form" class="panel form-panel">
        <h2>Add something good</h2><p>New items go live as soon as they're saved.</p>
        <div class="form-grid">
          <label class="span-2"><span class="field-label compact-label">Item name</span><input class="field compact-field" name="name" maxlength="150" required></label>
          <label><span class="field-label compact-label">SKU</span><input class="field compact-field" name="sku" maxlength="50" required></label>
          <label><span class="field-label compact-label">Type</span><select class="field compact-field" name="kind"><option value="merch">Merch</option><option value="ticket">Event ticket</option></select></label>
          <label><span class="field-label compact-label">Price (₹)</span><input class="field compact-field" name="price" type="number" min="0" step="0.01" required></label>
          <label><span class="field-label compact-label">Initial stock</span><input class="field compact-field" name="stock" type="number" min="0" step="1" required></label>
          <label><span class="field-label compact-label">Low-stock alert at</span><input class="field compact-field" name="low_stock_threshold" type="number" min="0" value="5" required></label>
          <label><span class="field-label compact-label">Limit per buyer</span><input class="field compact-field" name="per_user_limit" type="number" min="1" placeholder="No limit"></label>
          <label class="span-2"><span class="field-label compact-label">Description</span><textarea class="field compact-field" name="description" maxlength="2000" placeholder="A short note about this item"></textarea></label>
          <label class="span-2"><span class="field-label compact-label">Event date <span class="muted">(for tickets)</span></span><input class="field compact-field" name="event_date" type="datetime-local"></label>
          <label><span class="field-label compact-label">Sale opens <span class="muted">(optional)</span></span><input class="field compact-field" name="sale_starts_at" type="datetime-local"></label>
          <label><span class="field-label compact-label">Sale closes <span class="muted">(optional)</span></span><input class="field compact-field" name="sale_ends_at" type="datetime-local"></label>
        </div>
        <p id="item-form-error" class="form-error" role="alert" hidden></p>
        <button class="button button-block" type="submit">Publish item</button>
      </form>
      <section class="panel"><div class="panel-header"><div><h2>What you've got</h2><p>${items.length} item${items.length === 1 ? "" : "s"} in the inventory</p></div></div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>${inventoryRowsMarkup(items)}</tbody></table></div>
      </section>
    </div>`;
}
function alertRowsMarkup(alerts) {
  if (!alerts.length) return emptyMarkup("All quiet on the stock front", "When an item gets low, we'll let you know right here.");
  return `<div class="alert-list">${alerts.map(alert => `<div class="alert-row">
    <div class="alert-copy"><span class="alert-icon">${ICONS.alert}</span><div><strong>${escapeHtml(alert.type === "sold_out" ? "An item just sold out" : "Running low on an item")}</strong><p>${escapeHtml(alert.item_name)} · ${escapeHtml(alert.stock)} left · ${formatDate(alert.created_at)}</p></div></div>
    ${alert.acknowledged ? '<span class="status-pill neutral">Acknowledged</span>' : `<button class="button-secondary" type="button" data-action="ack-alert" data-id="${escapeHtml(alert.id)}">Mark as seen</button>`}
  </div>`).join("")}</div>`;
}
async function renderAlerts() {
  const alerts = await api("/alerts");
  const pending = alerts.filter(alert => !alert.acknowledged).length;
  return `<div class="section-heading"><div><h2>A little heads-up</h2><p>Live stock alerts so nothing catches you off guard.</p></div><span class="status-pill ${pending ? "warning" : ""}">${pending} unread</span></div>
    <section class="panel">${alertRowsMarkup(alerts)}</section>`;
}
async function renderReports() {
  const report = await api("/reports/summary");
  const top = Array.isArray(report.by_item) ? report.by_item : [];
  const low = Array.isArray(report.low_stock_items) ? report.low_stock_items : [];
  return `<div class="section-heading"><div><h2>A little perspective</h2><p>A quick snapshot of how your campus board is doing.</p></div></div>
    <div class="report-grid">
      <article class="report-stat"><span>Total revenue</span><strong>${formatPrice(report.total_revenue)}</strong></article>
      <article class="report-stat"><span>Items sold</span><strong>${escapeHtml(report.total_units ?? 0)}</strong></article>
    </div>
    <div class="section-heading"><div><h2>Best-loved things</h2><p>Items ordered most often, sorted by revenue.</p></div></div>
    <section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Item SKU</th><th>Units</th><th>Revenue</th></tr></thead><tbody>
      ${top.length ? top.map(item => `<tr><td>${escapeHtml(item.sku)}</td><td>${escapeHtml(item.units)}</td><td>${formatPrice(item.revenue)}</td></tr>`).join("") : '<tr><td colspan="3" class="table-empty">Your sales story starts with the first order.</td></tr>'}
    </tbody></table></div></section>
    <div class="section-heading"><div><h2>Could use a top-up</h2><p>Active listings at or below their low-stock threshold.</p></div></div>
    <section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>SKU</th><th>Left</th></tr></thead><tbody>
      ${low.length ? low.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.sku)}</td><td><span class="stock ${item.stock === 0 ? "out" : "low"}">${escapeHtml(item.stock)}</span></td></tr>`).join("") : '<tr><td colspan="3" class="table-empty">Everything is comfortably stocked. Nice work.</td></tr>'}
    </tbody></table></div></section>`;
}
async function renderOrganizerHome() {
  const [items, orders, report, alerts] = await Promise.all([
    api("/items"), api("/orders"), api("/reports/summary"), api("/alerts?unacknowledged=true")
  ]);
  const activeItems = items.filter(item => item.active !== false).length;
  const recentOrders = orders.slice(0, 5);
  const totalRevenue = formatPrice(report.total_revenue);
  const lowCount = Array.isArray(report.low_stock_items) ? report.low_stock_items.length : 0;
  return `${pageHero("Organizer workspace", "Your campus operation, at a glance.",
    "Inventory, orders, and the little details that keep things running.",
    statMarkup("Active listings", activeItems, "box") +
    statMarkup("Orders placed", orders.length, "receipt") +
    statMarkup("Revenue so far", totalRevenue, "chart"))}
    <div class="stats">${statMarkup("Low-stock items", lowCount, "alert")}${statMarkup("Unseen alerts", alerts.length, "bell")}${statMarkup("Units sold", report.total_units ?? 0, "grid")}</div>
    <section class="panel">
      <div class="panel-header"><div><h2>Latest orders</h2><p>The latest campus pickups.</p></div><a class="button-secondary" href="/organizer/orders" data-link>See all orders</a></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Buyer</th><th>Qty</th><th>Total</th><th>Placed</th><th>Status</th><th>Action</th></tr></thead><tbody>${recentOrders.length ? orderRowsMarkup(recentOrders, true) : '<tr><td colspan="7" class="table-empty">No orders just yet. Your first campus find is on its way.</td></tr>'}</tbody></table></div>
    </section>
    <div class="section-heading"><div><h2>Your shortcuts</h2><p>Right where you need to be.</p></div></div>
    <div class="quick-grid">
      <a class="quick-card" href="/organizer/inventory" data-link><strong>Manage inventory</strong><span>Add, restock, or hide a listing.</span></a>
      <a class="quick-card" href="/organizer/alerts" data-link><strong>Check stock alerts</strong><span>${alerts.length} waiting for a look.</span></a>
      <a class="quick-card" href="/organizer/reports" data-link><strong>See how it's going</strong><span>Take a peek at sales and stock.</span></a>
    </div>`;
}
async function routeContent(path) {
  switch (path) {
    case "/shop": return renderShop();
    case "/my-orders": return renderOrders();
    case "/organizer": return renderOrganizerHome();
    case "/organizer/inventory": return renderInventory();
    case "/organizer/orders": return renderOrders(true);
    case "/organizer/alerts": return renderAlerts();
    case "/organizer/reports": return renderReports();
    default: throw new Error("That page isn't here.");
  }
}
async function renderRoute() {
  const path = routePath();
  if (path === "/") {
    navTo(state.user ? defaultRoute() : "/login", true);
    return;
  }
  if (!ROUTES[path]) {
    navTo(state.user ? defaultRoute() : "/login", true);
    return;
  }
  if (ROUTES[path].public) {
    if (state.user) {
      navTo(defaultRoute(), true);
      return;
    }
    renderAuth(path);
    return;
  }
  if (!state.user) {
    navTo("/login", true);
    return;
  }
  if (!ROUTES[path].roles.includes(state.user.role)) {
    navTo(defaultRoute(), true);
    showToast("That page is only available to your campus role.", "error");
    return;
  }
  renderShell(path);
  try {
    const content = await routeContent(path);
    if (routePath() === path) document.getElementById("page-content").innerHTML = content;
  } catch (error) {
    if (routePath() === path) document.getElementById("page-content").innerHTML = pageError(error);
  }
  connectSocket();
}
async function signIn(form) {
  const button = form.querySelector('button[type="submit"]');
  const errorBox = document.getElementById("auth-error");
  button.disabled = true;
  button.textContent = "Signing you in…";
  errorBox.hidden = true;
  try {
    const body = new URLSearchParams({
      username: form.elements.email.value.trim(),
      password: form.elements.password.value
    });
    const response = await fetch("/auth/login", { method: "POST", body });
    let result = {};
    try { result = await response.json(); } catch {}
    if (!response.ok) throw new Error(result.detail || "We couldn't sign you in. Please try again.");
    state.token = result.access_token;
    sessionStorage.setItem("campus_access_token", state.token);
    state.user = await api("/auth/me");
    connectSocket();
    navTo(defaultRoute(), true);
    showToast(`Welcome in, ${state.user.name?.split(/\s+/)[0] || "friend"}.`);
  } catch (error) {
    errorBox.textContent = describeError(error);
    errorBox.hidden = false;
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.innerHTML = "Sign in <span aria-hidden=\"true\">→</span>";
    }
  }
}
async function register(form) {
  const button = form.querySelector('button[type="submit"]');
  const errorBox = document.getElementById("auth-error");
  button.disabled = true;
  button.textContent = "Creating your account…";
  errorBox.hidden = true;
  const body = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    password: form.elements.password.value
  };
  if (form.elements.organizer_code.value.trim()) body.organizer_code = form.elements.organizer_code.value.trim();
  try {
    const result = await api("/auth/register", { method: "POST", body: JSON.stringify(body) });
    navTo("/login", true);
    showToast(result.role === "organizer" ? "Organizer account created. Sign in to open your workspace." : "Account created. Welcome to campus!");
  } catch (error) {
    errorBox.textContent = describeError(error);
    errorBox.hidden = false;
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = "Create my account →";
    }
  }
}
async function buyItem(id, button) {
  button.disabled = true;
  try {
    const order = await api("/orders", { method: "POST", body: JSON.stringify({ item_id: id, quantity: 1 }) });
    showToast(`${order.item_name} is yours — order confirmed!`);
    await renderRoute();
  } catch (error) {
    showToast(describeError(error), "error");
    button.disabled = false;
  }
}
async function cancelOrder(id, button) {
  button.disabled = true;
  try {
    await api(`/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" });
    showToast("Order cancelled. Stock is back on the board.");
    await renderRoute();
  } catch (error) {
    showToast(describeError(error), "error");
    button.disabled = false;
  }
}
async function createItem(form) {
  const button = form.querySelector('button[type="submit"]');
  const errorBox = document.getElementById("item-form-error");
  button.disabled = true;
  button.textContent = "Publishing…";
  errorBox.hidden = true;
  const data = new FormData(form);
  const body = {
    name: data.get("name").trim(),
    sku: data.get("sku").trim(),
    kind: data.get("kind"),
    price: Number(data.get("price")),
    stock: Number(data.get("stock")),
    low_stock_threshold: Number(data.get("low_stock_threshold")),
    description: data.get("description").trim()
  };
  const limit = data.get("per_user_limit");
  if (limit) body.per_user_limit = Number(limit);
  const eventDate = data.get("event_date");
  if (eventDate) body.event_date = new Date(eventDate).toISOString();
  const saleStartsAt = data.get("sale_starts_at");
  if (saleStartsAt) body.sale_starts_at = new Date(saleStartsAt).toISOString();
  const saleEndsAt = data.get("sale_ends_at");
  if (saleEndsAt) body.sale_ends_at = new Date(saleEndsAt).toISOString();
  try {
    await api("/items", { method: "POST", body: JSON.stringify(body) });
    showToast("Your new item is on the board.");
    await renderRoute();
  } catch (error) {
    errorBox.textContent = describeError(error);
    errorBox.hidden = false;
    button.disabled = false;
    button.textContent = "Publish item";
  }
}
async function adjustStock(form) {
  const button = form.querySelector('button[type="submit"]');
  const delta = Number(form.elements.delta.value);
  if (!Number.isInteger(delta) || delta === 0) {
    showToast("Enter a non-zero whole number for the stock change.", "error");
    return;
  }
  button.disabled = true;
  try {
    await api(`/items/${encodeURIComponent(form.dataset.id)}/restock`, {
      method: "POST", body: JSON.stringify({ delta })
    });
    showToast(delta > 0 ? `Added ${delta} to stock.` : `Removed ${Math.abs(delta)} from stock.`);
    await renderRoute();
  } catch (error) {
    showToast(describeError(error), "error");
    button.disabled = false;
  }
}
async function toggleItem(button) {
  button.disabled = true;
  const active = button.dataset.active === "true";
  try {
    await api(`/items/${encodeURIComponent(button.dataset.id)}`, {
      method: "PATCH", body: JSON.stringify({ active: !active })
    });
    showToast(active ? "Listing hidden from the shop." : "Listing is live in the shop.");
    await renderRoute();
  } catch (error) {
    showToast(describeError(error), "error");
    button.disabled = false;
  }
}
async function acknowledgeAlert(button) {
  button.disabled = true;
  try {
    await api(`/alerts/${encodeURIComponent(button.dataset.id)}/ack`, { method: "POST" });
    showToast("Alert marked as seen.");
    await renderRoute();
  } catch (error) {
    showToast(describeError(error), "error");
    button.disabled = false;
  }
}
document.addEventListener("click", event => {
  const link = event.target.closest("a[data-link]");
  if (link && link.origin === location.origin && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    navTo(link.pathname);
    return;
  }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "signout") signOut();
  if (action === "retry") renderRoute();
  if (action === "buy") buyItem(button.dataset.id, button);
  if (action === "cancel-order") cancelOrder(button.dataset.id, button);
  if (action === "toggle-item") toggleItem(button);
  if (action === "ack-alert") acknowledgeAlert(button);
});
document.addEventListener("submit", event => {
  const form = event.target;
  if (form.id === "login-form") {
    event.preventDefault();
    signIn(form);
  } else if (form.id === "register-form") {
    event.preventDefault();
    register(form);
  } else if (form.id === "create-item-form") {
    event.preventDefault();
    createItem(form);
  } else if (form.matches(".restock-form")) {
    event.preventDefault();
    adjustStock(form);
  }
});
document.addEventListener("input", event => {
  if (event.target.id === "shop-search") {
    state.stockSearch = event.target.value;
    renderShopProducts();
  }
});
document.addEventListener("click", event => {
  const filter = event.target.closest("[data-filter]");
  if (filter) {
    state.stockFilter = filter.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(button => {
      button.setAttribute("aria-pressed", String(button === filter));
    });
    renderShopProducts();
  }
});
window.addEventListener("popstate", renderRoute);
async function boot() {
  if (state.token) {
    try {
      state.user = await api("/auth/me");
    } catch {
      clearSession();
    }
  }
  await renderRoute();
}
boot();
