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
  "/organizer/users": { title: "User directory", roles: ["organizer"] },
  "/organizer/check-in": { title: "Ticket check-in", roles: ["organizer"] },
  "/organizer/alerts": { title: "Stock alerts", roles: ["organizer"] },
  "/organizer/reports": { title: "Reports", roles: ["organizer"] },
  "/organizer/database": { title: "Database lab", roles: ["organizer"] }
};

const BUYER_NAV = [
  ["/shop", "Discover", "grid"],
  ["/my-orders", "My orders", "receipt"]
];

const ORGANIZER_NAV = [
  ["/organizer", "Overview", "grid"],
  ["/organizer/inventory", "Inventory", "box"],
  ["/organizer/orders", "Orders", "receipt"],
  ["/organizer/users", "Users", "users"],
  ["/organizer/check-in", "Ticket check-in", "ticketCheckin"],
  ["/organizer/alerts", "Alerts", "bell"],
  ["/organizer/reports", "Reports", "chart"],
  ["/organizer/database", "Database lab", "database"]
];

const ICONS = {
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8m-9 5v9"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M9 8h6m-6 4h6m-6 4h3"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  ticketCheckin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8a3 3 0 0 0 0 6v3h16v-3a3 3 0 0 1 0-6V5H4v3Z"/><path d="M14 5v2m0 4v2m0 4v2"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V4m0 16h17"/><path d="m7 15 4-4 3 2 6-7"/></svg>',
  database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></svg>',
  merch: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 11-9 5 5 8 5-3v17h19V21l5 3 5-8-9-5c-1 4-5 6-10 6s-9-2-11-6Z"/><path d="m19 11 5 6 5-6"/></svg>',
  ticket: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17a5 5 0 0 0 0 10v5h34v-5a5 5 0 0 1 0-10v-5H7v5Z"/><path d="M27 13v4m0 4v4m0 4v4"/></svg>',
  cap: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 40 30-17 30 17-30 17-30-17Z"/><path d="M29 47v18c10 9 28 9 38 0V47M78 42v19"/><circle cx="78" cy="66" r="3" fill="currentColor" stroke="none"/></svg>',
  empty: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h16l-1 12H5L4 8Z"/><path d="M9 8a3 3 0 0 1 6 0m-5 5h.01M14 13h.01"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'
};

// Application State
const state = {
  token: sessionStorage.getItem("campus_access_token"),
  user: null,
  socket: null,
  reconnectTimer: null,
  toastTimer: null,
  stockFilter: "all",
  stockSearch: "",
  shopSort: "default",
  shopItems: [],
  recommendations: [],
  selectedQty: {},
  cart: JSON.parse(localStorage.getItem("campus_bag") || "[]"),
  cartOpen: false,
  inventoryItems: [],
  inventorySearch: "",
  inventoryFilter: "all",
  ordersSearch: "",
  ordersStatusFilter: "all",
  usersSearch: "",
  usersRoleFilter: "all",
  usersList: [],
  checkinHistory: JSON.parse(sessionStorage.getItem("campus_checkins") || "[]"),
  socketConnected: false
};

const root = document.getElementById("root");
const toast = document.getElementById("toast");
const cartDrawerContainer = document.getElementById("cart-drawer-container");
const modalContainer = document.getElementById("modal-container");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function routePath(path = location.pathname) {
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
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
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      navTo("/login", true);
    }
    const err = new Error(data.detail || `Request failed (${response.status})`);
    err.detail = data.detail;
    err.status = response.status;
    throw err;
  }
  return data;
}

function clearSession() {
  state.token = null;
  state.user = null;
  sessionStorage.removeItem("campus_access_token");
  if (state.socket) state.socket.close();
  state.socket = null;
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
      if (currentItem) {
        currentItem.stock = message.stock;
        currentItem.sold = message.sold;
        currentItem.active = message.active;
      }
      const invItem = state.inventoryItems.find(item => item.id === message.item_id);
      if (invItem) {
        invItem.stock = message.stock;
        invItem.sold = message.sold;
        invItem.active = message.active;
      }
      const recItem = state.recommendations.find(item => item.id === message.item_id);
      if (recItem) {
        recItem.stock = message.stock;
        recItem.sold = message.sold;
        recItem.active = message.active;
      }
      if (routePath() === "/shop") renderShopProducts();
      else if (routePath() === "/organizer/inventory") renderRoute();
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

// Formatters
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

function datetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function itemStock(item) {
  if (Number(item.stock) <= 0) return { text: "Sold out", className: "out" };
  if (Number(item.stock) <= Number(item.low_stock_threshold || 0)) return { text: `Only ${item.stock} left`, className: "low" };
  return { text: `${item.stock} in stock`, className: "" };
}

function statusMarkup(status) {
  const value = String(status || "unknown");
  const klass = value === "confirmed" ? "" : value === "cancelled" ? "neutral" : "warning";
  return `<span class="status-pill ${klass}">${escapeHtml(value)}</span>`;
}

function timeUntil(targetDate) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Standards-Compliant ISO 18004 21x21 QR Code Generator
function generateQrSvg(text, size = 180) {
  const clean = String(text || "").trim().toUpperCase().slice(0, 16);
  let bits = "0100" + clean.length.toString(2).padStart(8, "0");
  for (let i = 0; i < clean.length; i++) {
    bits += clean.charCodeAt(i).toString(2).padStart(8, "0");
  }
  bits += "0000";
  while (bits.length % 8 !== 0) bits += "0";
  const raw = [];
  for (let i = 0; i < bits.length; i += 8) raw.push(parseInt(bits.slice(i, i + 8), 2));
  const pad = [0xEC, 0x11];
  let pIdx = 0;
  while (raw.length < 19) {
    raw.push(pad[pIdx % 2]);
    pIdx++;
  }
  const gfExp = new Array(512), gfLog = new Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    gfExp[i] = x;
    gfExp[i + 255] = x;
    gfLog[x] = i;
    x <<= 1;
    if (x & 256) x ^= 285;
  }
  const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : gfExp[gfLog[a] + gfLog[b]]);
  const gen = [1, 127, 122, 154, 164, 11, 68, 117];
  const msg = [...raw, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < raw.length; i++) {
    const lead = msg[i];
    if (lead !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(lead, gen[j]);
      }
    }
  }
  const allCodewords = [...raw, ...msg.slice(raw.length)];
  let allBits = "";
  for (const b of allCodewords) allBits += b.toString(2).padStart(8, "0");

  const grid = Array.from({ length: 21 }, () => Array(21).fill(0));
  const reserved = Array.from({ length: 21 }, () => Array(21).fill(false));

  function setFinder(r0, c0) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = r0 + r, col = c0 + c;
        if (row >= 0 && row < 21 && col >= 0 && col < 21) {
          reserved[row][col] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            grid[row][col] = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) ? 1 : 0;
          } else {
            grid[row][col] = 0;
          }
        }
      }
    }
  }
  setFinder(0, 0);
  setFinder(0, 14);
  setFinder(14, 0);

  for (let i = 8; i <= 12; i++) {
    reserved[6][i] = reserved[i][6] = true;
    grid[6][i] = i % 2 === 0 ? 1 : 0;
    grid[i][6] = i % 2 === 0 ? 1 : 0;
  }
  reserved[13][8] = true;
  grid[13][8] = 1;

  const fmtCoords = [
    [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
    [20,8],[19,8],[18,8],[17,8],[16,8],[15,8],[14,8],[8,13],[8,14],[8,15],[8,16],[8,17],[8,18],[8,19],[8,20]
  ];
  for (const [r, c] of fmtCoords) reserved[r][c] = true;

  let bitIdx = 0, up = true, col = 20;
  while (col > 0) {
    if (col === 6) col--;
    const rows = up ? [20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0]
                    : [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
    for (const r of rows) {
      for (const c of [col, col - 1]) {
        if (!reserved[r][c]) {
          let val = bitIdx < allBits.length ? parseInt(allBits[bitIdx], 10) : 0;
          bitIdx++;
          if ((r + c) % 2 === 0) val ^= 1;
          grid[r][c] = val;
        }
      }
    }
    up = !up;
    col -= 2;
  }

  const fmt = "111011111000100";
  const fmt1 = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
  const fmt2 = [[20,8],[19,8],[18,8],[17,8],[16,8],[15,8],[14,8],[8,13],[8,14],[8,15],[8,16],[8,17],[8,18],[8,19],[8,20]];
  for (let i = 0; i < 15; i++) {
    const b = parseInt(fmt[i], 10);
    grid[fmt1[i][0]][fmt1[i][1]] = b;
    grid[fmt2[i][0]][fmt2[i][1]] = b;
  }

  let rects = "";
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      if (grid[r][c] === 1) {
        rects += `<rect x="${c + 2}" y="${r + 2}" width="1" height="1" fill="#1e2d22"/>`;
      }
    }
  }
  return `<svg class="qr-svg" viewBox="0 0 25 25" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="25" height="25" fill="#ffffff" rx="1"/>
    ${rects}
  </svg>`;
}

// Cart Management
function saveCart() {
  localStorage.setItem("campus_bag", JSON.stringify(state.cart));
  renderCartDrawer();
  updateCartBadge();
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function updateCartBadge() {
  const badge = document.querySelector(".cart-badge");
  if (badge) badge.textContent = cartCount();
}

function addToCart(item, quantity = 1) {
  const existing = state.cart.find(c => c.item_id === item.id);
  const maxStock = Number(item.stock);
  const limit = item.per_user_limit ? Number(item.per_user_limit) : 20;
  const maxAllowed = Math.min(maxStock, limit);

  if (existing) {
    if (existing.quantity + quantity > maxAllowed) {
      showToast(`Limit reached for ${item.name} (${maxAllowed} max).`, "error");
      return;
    }
    existing.quantity += quantity;
  } else {
    if (quantity > maxAllowed) {
      showToast(`Cannot add more than ${maxAllowed} units.`, "error");
      return;
    }
    state.cart.push({
      item_id: item.id,
      name: item.name,
      sku: item.sku,
      price: Number(item.price),
      kind: item.kind,
      quantity: quantity,
      max_stock: maxStock,
      per_user_limit: limit
    });
  }
  saveCart();
  showToast(`Added ${quantity} × ${item.name} to your campus bag.`);
}

function updateCartItemQty(itemId, delta) {
  const item = state.cart.find(c => c.item_id === itemId);
  if (!item) return;
  const newQty = item.quantity + delta;
  const maxAllowed = Math.min(item.max_stock, item.per_user_limit || 20);
  if (newQty <= 0) {
    state.cart = state.cart.filter(c => c.item_id !== itemId);
  } else if (newQty > maxAllowed) {
    showToast(`Maximum allowed is ${maxAllowed}.`, "error");
    return;
  } else {
    item.quantity = newQty;
  }
  saveCart();
}

function removeFromCart(itemId) {
  state.cart = state.cart.filter(c => c.item_id !== itemId);
  saveCart();
}

function clearCart() {
  state.cart = [];
  saveCart();
}

function toggleCart(forceOpen) {
  state.cartOpen = forceOpen !== undefined ? forceOpen : !state.cartOpen;
  renderCartDrawer();
}

async function checkoutCart(button) {
  if (!state.cart.length) return;
  button.disabled = true;
  button.textContent = "Processing Transaction…";
  try {
    const payload = {
      items: state.cart.map(c => ({ item_id: c.item_id, quantity: c.quantity }))
    };
    const results = await api("/orders/batch", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const totalItems = results.reduce((sum, o) => sum + o.quantity, 0);
    clearCart();
    toggleCart(false);
    showToast(`Success! ${totalItems} items secured across ${results.length} confirmed orders.`);
    navTo("/my-orders");
  } catch (error) {
    showToast(describeError(error), "error");
    button.disabled = false;
    button.textContent = "Checkout All (Atomic Transaction)";
  }
}

// Cart Drawer Renderer
function renderCartDrawer() {
  if (!cartDrawerContainer) return;
  const count = cartCount();
  const total = cartTotal();
  const isOpen = state.cartOpen;

  cartDrawerContainer.innerHTML = `
    <div class="cart-drawer-overlay ${isOpen ? "open" : ""}" data-action="close-cart"></div>
    <aside class="cart-drawer ${isOpen ? "open" : ""}">
      <div class="cart-header">
        <h2>Your Campus Bag (${count})</h2>
        <button class="icon-button" type="button" data-action="close-cart" aria-label="Close cart">×</button>
      </div>
      <div class="cart-items-list">
        ${!state.cart.length ? emptyMarkup("Your bag is empty", "Add some merch or event tickets from the shop.") : ""}
        ${state.cart.map(item => `
          <div class="cart-item">
            <div class="cart-item-art">${ICONS[item.kind === "ticket" ? "ticket" : "merch"]}</div>
            <div class="cart-item-info">
              <h3 class="cart-item-title">${escapeHtml(item.name)}</h3>
              <p class="cart-item-sku">${escapeHtml(item.sku)} · ${formatPrice(item.price)} each</p>
              <div class="product-card-actions">
                <div class="qty-stepper">
                  <button class="qty-btn" type="button" data-action="cart-minus" data-id="${escapeHtml(item.item_id)}">−</button>
                  <span class="qty-val">${escapeHtml(item.quantity)}</span>
                  <button class="qty-btn" type="button" data-action="cart-plus" data-id="${escapeHtml(item.item_id)}">+</button>
                </div>
                <button class="button-danger button-sm" type="button" data-action="cart-remove" data-id="${escapeHtml(item.item_id)}" title="Remove">${ICONS.trash}</button>
              </div>
            </div>
            <div class="cart-item-price">${formatPrice(item.price * item.quantity)}</div>
          </div>
        `).join("")}
      </div>
      ${state.cart.length ? `
        <div class="cart-footer">
          <div class="cart-summary-row"><span>Subtotal</span><span>${formatPrice(total)}</span></div>
          <div class="cart-summary-row total"><span>Total Amount</span><span>${formatPrice(total)}</span></div>
          <div class="cart-actions">
            <button class="button button-block" type="button" data-action="cart-checkout">Checkout All (Atomic Transaction)</button>
            <button class="button-secondary button-block" type="button" data-action="cart-clear">Empty Bag</button>
          </div>
        </div>
      ` : ""}
    </aside>
  `;
}

// Shell and Page Rendering
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
            <div class="profile-copy">
              <div class="profile-name">${escapeHtml(state.user?.name || state.user?.email)}</div>
              <div class="profile-role">${isOrganizer ? "Organizer" : "Campus buyer"}</div>
            </div>
            <button class="icon-button" style="width: 28px; height: 28px; margin-left: auto;" type="button" data-action="open-profile-dialog" title="Edit Profile">${ICONS.edit}</button>
          </div>
          <button class="signout-link" type="button" data-action="signout">${ICONS.logout}Sign out</button>
        </div>
      </aside>
      <div class="main-column">
        <header class="app-header">
          <div class="header-left">
            <div class="mobile-brand">${brandMarkup()}</div>
            <div class="page-heading">
              <h1>${escapeHtml(route.title)}</h1>
              <p>${isOrganizer ? "A clearer view of your campus operation." : `Good to see you, ${escapeHtml(firstName)}.`}</p>
            </div>
          </div>
          <div class="header-actions">
            ${!isOrganizer ? `
              <button class="cart-trigger" type="button" data-action="toggle-cart" aria-label="View Campus Bag">
                ${ICONS.cart}
                <span>Bag</span>
                <span class="cart-badge">${cartCount()}</span>
              </button>
            ` : ""}
            <div class="ws-indicator ${state.socketConnected ? "" : "offline"}" aria-live="polite">
              <span class="status-dot"></span>
              <span class="ws-label">${state.socketConnected ? "Live" : "Reconnecting"}</span>
            </div>
          </div>
        </header>
        <main class="page-content" id="page-content">${content}</main>
      </div>
    </div>`;

  renderCartDrawer();
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

// Product Card
function productMarkup(item) {
  const stock = itemStock(item);
  const isBuyer = state.user?.role === "buyer";
  const canBuy = isBuyer && item.active !== false && Number(item.stock) > 0;
  const currentQty = state.selectedQty[item.id] || 1;

  const now = new Date();
  let timingBadge = "";
  if (item.sale_starts_at && new Date(item.sale_starts_at) > now) {
    const left = timeUntil(item.sale_starts_at);
    if (left) timingBadge = `<span class="sale-countdown-tag">Sale in ${left}</span>`;
  } else if (item.sale_ends_at && new Date(item.sale_ends_at) > now) {
    const left = timeUntil(item.sale_ends_at);
    if (left) timingBadge = `<span class="sale-countdown-tag">Ends in ${left}</span>`;
  }

  const limitBadge = item.per_user_limit ? `<div class="per-limit-note">⚡ Max ${item.per_user_limit} per student</div>` : "";
  const eventDate = item.kind === "ticket" && item.event_date
    ? `<p class="event-date">📅 Event · ${escapeHtml(formatDate(item.event_date, { dateStyle: "medium", timeStyle: "short" }))}</p>`
    : "";

  const recBadge = item.recommendation_reason
    ? `<div class="rec-reason-badge" title="${escapeHtml(item.recommendation_reason)}"><span class="rec-sparkle">✨</span> <span>${escapeHtml(item.recommendation_reason)}</span></div>`
    : "";

  return `<article class="product ${item.recommendation_reason ? "product-recommended" : ""}">
    <div class="product-art">
      ${ICONS[item.kind === "ticket" ? "ticket" : "merch"]}
      <span class="product-kind-tag">${item.kind === "ticket" ? "Event ticket" : "Campus merch"}</span>
      ${timingBadge}
    </div>
    <div class="product-body">
      ${recBadge}
      <div class="product-top">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <span class="sku">${escapeHtml(item.sku)}</span>
        </div>
        <span class="price">${formatPrice(item.price)}</span>
      </div>
      ${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ""}
      ${eventDate}
      ${limitBadge}
      <div class="product-bottom">
        <span class="stock ${stock.className}">${escapeHtml(stock.text)}</span>
        ${canBuy ? `
          <div class="product-card-actions">
            <div class="qty-stepper">
              <button class="qty-btn" type="button" data-action="card-qty-minus" data-id="${escapeHtml(item.id)}">−</button>
              <span class="qty-val">${currentQty}</span>
              <button class="qty-btn" type="button" data-action="card-qty-plus" data-id="${escapeHtml(item.id)}" data-max="${item.stock}">+</button>
            </div>
            <button class="button-secondary button-sm" type="button" data-action="add-bag" data-id="${escapeHtml(item.id)}">Add to Bag</button>
            <button class="button button-sm" type="button" data-action="buy-now" data-id="${escapeHtml(item.id)}">Buy Now</button>
          </div>
        ` : ""}
      </div>
    </div>
  </article>`;
}

function filteredProducts() {
  const query = state.stockSearch.trim().toLowerCase();
  let list = state.shopItems.filter(item => {
    const typeMatches = state.stockFilter === "all" || item.kind === state.stockFilter;
    const searchMatches = !query || [item.name, item.sku, item.kind, item.description]
      .some(value => String(value || "").toLowerCase().includes(query));
    return typeMatches && searchMatches;
  });

  if (state.shopSort === "price-low") list.sort((a, b) => Number(a.price) - Number(b.price));
  else if (state.shopSort === "price-high") list.sort((a, b) => Number(b.price) - Number(a.price));
  else if (state.shopSort === "name") list.sort((a, b) => a.name.localeCompare(b.name));

  return list;
}

function renderShopProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const products = filteredProducts();
  grid.innerHTML = products.length
    ? products.map(productMarkup).join("")
    : emptyMarkup(state.shopItems.length ? "No matching treasures found" : "Nothing on the shelves just yet",
      state.shopItems.length ? "Try another search or reset your filters." : "Check back soon — fresh drops are on their way.");

  const recsGrid = document.getElementById("recs-grid");
  if (recsGrid && state.recommendations && state.recommendations.length > 0) {
    recsGrid.innerHTML = state.recommendations.map(productMarkup).join("");
  }
}

async function renderShop() {
  const [items, recs] = await Promise.all([
    api("/items"),
    state.user ? api("/items/recommendations?limit=4").catch(() => []) : Promise.resolve([])
  ]);
  state.shopItems = items || [];
  state.recommendations = recs || [];
  const totalStock = state.shopItems.reduce((sum, item) => sum + Math.max(0, Number(item.stock) || 0), 0);
  const almostGone = state.shopItems.filter(item => item.stock > 0 && item.stock <= item.low_stock_threshold).length;
  const tickets = state.shopItems.filter(item => item.kind === "ticket").length;

  const recsSection = state.recommendations.length > 0 ? `
    <section class="recs-section">
      <div class="section-heading">
        <div>
          <span class="rec-badge-pill">✨ Picked For You</span>
          <h2>Recommended For You</h2>
          <p>Personalized suggestions based on your past purchases and popular campus favorites.</p>
        </div>
      </div>
      <div id="recs-grid" class="product-grid" aria-label="Personalized Recommendations">
        ${state.recommendations.map(productMarkup).join("")}
      </div>
    </section>
  ` : "";

  return `${pageHero("The Campus Edit · Live board", "A little more campus, a little less scrolling.",
    "Curated drops, campus moments, and real-time inventory at your fingertips.",
    statMarkup("On the board", state.shopItems.length, "box") +
    statMarkup("Ready to find you", totalStock, "grid") +
    statMarkup("Events to explore", tickets, "receipt"))}
    ${recsSection}
    <section>
      <div class="section-heading">
        <div>
          <h2>The good stuff</h2>
          <p>Verified gear and moments. ${almostGone ? `<strong>${almostGone}</strong> nearly gone.` : ""}</p>
        </div>
        <div class="section-actions">
          <label class="search-box">
            ${ICONS.search}
            <input class="search-input" id="shop-search" type="search" placeholder="Find gear or event…" aria-label="Search inventory" value="${escapeHtml(state.stockSearch)}">
          </label>
          <div class="filters" role="group" aria-label="Filter inventory">
            ${[["all", "All"], ["merch", "Merch"], ["ticket", "Events"]].map(([value, label]) => `<button class="filter" type="button" data-filter="${value}" aria-pressed="${state.stockFilter === value}">${label}</button>`).join("")}
          </div>
          <select id="shop-sort" class="field compact-field" style="width: 150px;">
            <option value="default" ${state.shopSort === "default" ? "selected" : ""}>Sort: Featured</option>
            <option value="price-low" ${state.shopSort === "price-low" ? "selected" : ""}>Price: Low → High</option>
            <option value="price-high" ${state.shopSort === "price-high" ? "selected" : ""}>Price: High → Low</option>
            <option value="name" ${state.shopSort === "name" ? "selected" : ""}>Name: A → Z</option>
          </select>
        </div>
      </div>
      <div id="product-grid" class="product-grid" aria-live="polite"></div>
    </section>
    <p class="footer-note">Campus, collected. Real-time ACID inventory synchronization.</p>`;
}

// Digital Ticket Pass Modal
function openTicketPass(orderId, code, itemName, sku, date, isUsed) {
  if (!modalContainer) return;
  const qrSvg = generateQrSvg(code, 170);
  modalContainer.innerHTML = `
    <dialog id="ticket-modal" class="ticket-dialog" open>
      <div class="ticket-pass">
        <div class="ticket-pass-header">
          <div class="ticket-pass-badge">CAMPUS ADMISSION PASS</div>
          <h2 class="ticket-pass-event">${escapeHtml(itemName)}</h2>
          <div class="ticket-pass-brand">Campus Edit Official Event Entry</div>
        </div>
        <div class="ticket-tear-line">
          <div class="tear-cut-left"></div>
          <div class="tear-dots"></div>
          <div class="tear-cut-right"></div>
        </div>
        <div class="ticket-pass-body">
          <div class="ticket-meta-grid">
            <div><span class="t-label">SKU Code</span><span class="t-val">${escapeHtml(sku)}</span></div>
            <div><span class="t-label">Order Ref</span><span class="t-val">${escapeHtml(orderId.slice(0, 8))}</span></div>
            <div><span class="t-label">Purchase Date</span><span class="t-val">${escapeHtml(formatDate(date))}</span></div>
            <div><span class="t-label">Admission State</span><span class="status-pill ${isUsed ? "neutral" : ""}">${isUsed ? "Checked In" : "Valid for Entry"}</span></div>
          </div>
          <div class="ticket-qr-container">
            ${qrSvg}
            <div class="ticket-code-display">${escapeHtml(code)}</div>
            <p class="ticket-instruction">Scan this digital pass at the entrance gate.</p>
          </div>
        </div>
        <div class="ticket-pass-footer">
          <button class="button" type="button" onclick="window.print()">Print / Save Pass</button>
          <button class="button-secondary" type="button" data-action="close-modal">Close</button>
        </div>
      </div>
    </dialog>
  `;
}

// Orders View
function orderRowsMarkup(orders, organizer = false) {
  if (!orders.length) {
    return `<tr><td colspan="${organizer ? 7 : 6}" class="table-empty">No matching orders found.</td></tr>`;
  }
  return orders.map(order => {
    const isTicket = order.kind === "ticket";
    const usedCodes = new Set(order.used_ticket_codes || []);
    const ticketCodes = Array.isArray(order.ticket_codes) && order.ticket_codes.length
      ? `<div class="ticket-codes">${order.ticket_codes.map(code => {
          const isUsed = usedCodes.has(code);
          return `<button class="ticket-badge-btn ${isUsed ? "used" : ""}" type="button" data-action="view-ticket" data-order-id="${escapeHtml(order.id)}" data-code="${escapeHtml(code)}" data-name="${escapeHtml(order.item_name)}" data-sku="${escapeHtml(order.sku)}" data-date="${escapeHtml(order.created_at)}" data-used="${isUsed}">🎟 ${escapeHtml(code)} · ${isUsed ? "Checked In" : "View Pass"}</button>`;
        }).join("")}</div>`
      : "";

    let actionButton = "—";
    if (order.status === "confirmed") {
      actionButton = `<button class="button-danger button-sm" type="button" data-action="cancel-order" data-id="${escapeHtml(order.id)}">Cancel</button>`;
    } else if (organizer && order.status === "cancelled") {
      actionButton = `<button class="button-danger button-sm" type="button" data-action="delete-order" data-id="${escapeHtml(order.id)}" title="Permanently delete cancelled order">${ICONS.trash}</button>`;
    }

    return `<tr>
      <td>
        <span class="cell-title">${escapeHtml(order.item_name)}</span>
        <span class="cell-subtitle">${escapeHtml(order.sku)} · Order #${escapeHtml(order.id.slice(0, 8))}</span>
        ${ticketCodes}
      </td>
      ${organizer ? `<td><span class="cell-title">${escapeHtml(order.buyer_name || "Campus buyer")}</span><span class="cell-subtitle">${escapeHtml(order.buyer_email || "")}</span></td>` : ""}
      <td>${escapeHtml(order.quantity)}</td>
      <td>${formatPrice(order.total)}</td>
      <td>${formatDate(order.created_at)}</td>
      <td>${statusMarkup(order.status)}</td>
      <td>${actionButton}</td>
    </tr>`;
  }).join("");
}

async function renderOrders(organizer = false) {
  const params = new URLSearchParams();
  if (state.ordersStatusFilter !== "all") params.set("status", state.ordersStatusFilter);
  if (state.ordersSearch.trim()) params.set("search", state.ordersSearch.trim());

  const path = (organizer ? "/orders" : "/orders/me") + (params.toString() ? "?" + params.toString() : "");
  const orders = await api(path);
  const totalVolume = orders.filter(o => o.status === "confirmed").reduce((sum, o) => sum + Number(o.total || 0), 0);

  return `
    <div class="section-heading">
      <div>
        <h2>${organizer ? "All campus orders" : "Your orders & digital tickets"}</h2>
        <p>${organizer ? `Reviewing ${orders.length} transactions across campus.` : "Receipts, status updates, and printable event passes."}</p>
      </div>
      <div class="section-actions">
        <label class="search-box">
          ${ICONS.search}
          <input class="search-input" id="orders-search" type="search" placeholder="Search orders…" value="${escapeHtml(state.ordersSearch)}">
        </label>
        <div class="filters" role="group">
          ${[["all", "All"], ["confirmed", "Confirmed"], ["cancelled", "Cancelled"]].map(([val, label]) => `<button class="filter" type="button" data-order-status="${val}" aria-pressed="${state.ordersStatusFilter === val}">${label}</button>`).join("")}
        </div>
        ${organizer ? `<a class="button button-secondary button-sm" href="/reports/export/orders.csv" download="campus_orders.csv">${ICONS.download} Export CSV</a>` : ""}
      </div>
    </div>
    <div class="stats">
      ${statMarkup("Orders found", orders.length, "receipt")}
      ${statMarkup("Confirmed Total", formatPrice(totalVolume), "box")}
    </div>
    <section class="panel">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Item / Digital Passes</th>
              ${organizer ? "<th>Buyer</th>" : ""}
              <th>Qty</th>
              <th>Total</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${orderRowsMarkup(orders, organizer)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// User Management View (Full CRUD)
async function renderUsers() {
  const params = new URLSearchParams();
  if (state.usersRoleFilter !== "all") params.set("role", state.usersRoleFilter);
  if (state.usersSearch.trim()) params.set("search", state.usersSearch.trim());

  const users = await api("/users" + (params.toString() ? "?" + params.toString() : ""));
  state.usersList = users;
  const organizers = users.filter(u => u.role === "organizer").length;
  const buyers = users.filter(u => u.role === "buyer").length;

  return `
    <div class="section-heading">
      <div>
        <h2>Campus User Directory &amp; Access Control</h2>
        <p>Full CRUD management of students, faculty buyers, and campus organizers.</p>
      </div>
      <div class="section-actions">
        <label class="search-box">
          ${ICONS.search}
          <input class="search-input" id="users-search" type="search" placeholder="Search users…" value="${escapeHtml(state.usersSearch)}">
        </label>
        <div class="filters">
          ${[["all", "All"], ["organizer", "Organizers"], ["buyer", "Buyers"]].map(([val, label]) => `<button class="filter" type="button" data-user-role="${val}" aria-pressed="${state.usersRoleFilter === val}">${label}</button>`).join("")}
        </div>
        <button class="button button-sm" type="button" data-action="open-create-user">+ Add User</button>
      </div>
    </div>
    <div class="stats">
      ${statMarkup("Total Accounts", users.length, "users")}
      ${statMarkup("Campus Buyers", buyers, "grid")}
      ${statMarkup("Organizers", organizers, "box")}
    </div>
    <section class="panel">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Orders Placed</th>
              <th>Total Spent</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${!users.length ? '<tr><td colspan="6" class="table-empty">No users match your query.</td></tr>' : users.map(u => `
              <tr>
                <td>
                  <strong>${escapeHtml(u.name)}</strong>
                  <span class="cell-subtitle">${escapeHtml(u.email)}</span>
                </td>
                <td><span class="status-pill ${u.role === "organizer" ? "" : "neutral"}">${escapeHtml(u.role)}</span></td>
                <td><strong>${u.order_count ?? 0}</strong></td>
                <td>${formatPrice(u.total_spent ?? 0)}</td>
                <td>${formatDate(u.created_at)}</td>
                <td>
                  <div style="display: flex; gap: 6px;">
                    <button class="button-secondary button-sm" type="button" data-action="edit-user" data-id="${escapeHtml(u.id)}">Edit</button>
                    <button class="button-danger button-sm" type="button" data-action="delete-user" data-id="${escapeHtml(u.id)}" data-name="${escapeHtml(u.name)}">Delete</button>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Create User Dialog -->
    <dialog class="edit-dialog" id="create-user-dialog">
      <form class="edit-dialog-form" id="create-user-form">
        <div class="dialog-heading">
          <div><h2>Create Campus Account</h2><p>Provision a new buyer or organizer directly.</p></div>
          <button class="icon-button" type="button" data-action="close-create-user" aria-label="Close">×</button>
        </div>
        <div class="form-grid">
          <label class="span-2"><span class="field-label compact-label">Full Name</span><input class="field compact-field" name="name" required placeholder="Sam Smith"></label>
          <label class="span-2"><span class="field-label compact-label">Campus Email</span><input class="field compact-field" name="email" type="email" required placeholder="sam@campus.edu"></label>
          <label><span class="field-label compact-label">Password</span><input class="field compact-field" name="password" type="password" minlength="8" required placeholder="••••••••"></label>
          <label><span class="field-label compact-label">Role</span>
            <select class="field compact-field" name="role">
              <option value="buyer">Campus Buyer</option>
              <option value="organizer">Organizer</option>
            </select>
          </label>
        </div>
        <p id="create-user-error" class="form-error" role="alert" hidden></p>
        <div class="dialog-actions">
          <button class="button-secondary" type="button" data-action="close-create-user">Cancel</button>
          <button class="button" type="submit">Create User</button>
        </div>
      </form>
    </dialog>

    <!-- Edit User Dialog -->
    <dialog class="edit-dialog" id="edit-user-dialog">
      <form class="edit-dialog-form" id="edit-user-form">
        <div class="dialog-heading">
          <div><h2>Edit User Account</h2><p>Update access permissions and profile details.</p></div>
          <button class="icon-button" type="button" data-action="close-edit-user" aria-label="Close">×</button>
        </div>
        <input type="hidden" name="id">
        <div class="form-grid">
          <label class="span-2"><span class="field-label compact-label">Full Name</span><input class="field compact-field" name="name" required></label>
          <label class="span-2"><span class="field-label compact-label">Campus Email</span><input class="field compact-field" name="email" type="email" required></label>
          <label><span class="field-label compact-label">New Password <span class="muted">(leave blank to keep)</span></span><input class="field compact-field" name="password" type="password" minlength="8" placeholder="••••••••"></label>
          <label><span class="field-label compact-label">Role</span>
            <select class="field compact-field" name="role">
              <option value="buyer">Campus Buyer</option>
              <option value="organizer">Organizer</option>
            </select>
          </label>
        </div>
        <p id="edit-user-error" class="form-error" role="alert" hidden></p>
        <div class="dialog-actions">
          <button class="button-secondary" type="button" data-action="close-edit-user">Cancel</button>
          <button class="button" type="submit">Save Changes</button>
        </div>
      </form>
    </dialog>
  `;
}

// Inventory View
function inventoryRowsMarkup(items) {
  if (!items.length) return '<tr><td colspan="6" class="table-empty">No items match your filter.</td></tr>';
  return items.map(item => {
    const stock = itemStock(item);
    return `<tr>
      <td class="item-cell">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="cell-subtitle">${escapeHtml(item.sku)} · ${item.kind === "ticket" ? "Event ticket" : "Merchandise"}</span>
      </td>
      <td>${formatPrice(item.price)}</td>
      <td><span class="stock ${stock.className}">${escapeHtml(stock.text)}</span> <span class="muted">(${item.sold} sold)</span></td>
      <td>${item.active ? '<span class="status-pill">Active</span>' : '<span class="status-pill neutral">Hidden</span>'}</td>
      <td>
        <form class="restock-form" data-id="${escapeHtml(item.id)}" style="display: inline-flex; gap: 4px; align-items: center;">
          <input class="field compact-field" style="width: 70px;" aria-label="Stock delta" name="delta" type="number" value="10" min="-${Math.max(0, Number(item.stock))}" max="100000" required>
          <button class="button-secondary button-sm" type="submit">+ Restock</button>
        </form>
      </td>
      <td>
        <div class="table-actions" style="display: inline-flex; gap: 6px;">
          <button class="button-secondary button-sm" type="button" data-action="edit-item" data-id="${escapeHtml(item.id)}">Edit</button>
          <button class="${item.active ? "button-secondary" : "button"} button-sm" type="button" data-action="toggle-item" data-id="${escapeHtml(item.id)}" data-active="${String(item.active)}">${item.active ? "Hide" : "Publish"}</button>
          <button class="button-danger button-sm" type="button" data-action="delete-item" data-id="${escapeHtml(item.id)}">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

async function renderInventory() {
  const items = await api("/items");
  state.inventoryItems = items;

  let filtered = items;
  if (state.inventorySearch.trim()) {
    const q = state.inventorySearch.trim().toLowerCase();
    filtered = filtered.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
  }
  if (state.inventoryFilter === "low_stock") {
    filtered = filtered.filter(i => i.stock > 0 && i.stock <= i.low_stock_threshold);
  } else if (state.inventoryFilter === "sold_out") {
    filtered = filtered.filter(i => i.stock === 0);
  } else if (state.inventoryFilter === "hidden") {
    filtered = filtered.filter(i => !i.active);
  }

  return `
    <div class="section-heading">
      <div>
        <h2>Inventory Control Center</h2>
        <p>Real-time relational catalog with foreign-key integrity and stock management.</p>
      </div>
      <div class="section-actions">
        <label class="search-box">
          ${ICONS.search}
          <input class="search-input" id="inv-search" type="search" placeholder="Search catalog…" value="${escapeHtml(state.inventorySearch)}">
        </label>
        <div class="filters">
          ${[["all", "All"], ["low_stock", "Low stock"], ["sold_out", "Sold out"], ["hidden", "Hidden"]].map(([val, label]) => `<button class="filter" type="button" data-inv-filter="${val}" aria-pressed="${state.inventoryFilter === val}">${label}</button>`).join("")}
        </div>
        <a class="button button-secondary button-sm" href="/reports/export/inventory.csv" download="campus_inventory.csv">${ICONS.download} Export CSV</a>
      </div>
    </div>
    <div class="layout-two">
      <form id="create-item-form" class="panel form-panel">
        <h2>Publish New Listing</h2>
        <p>Save and broadcast new campus drops immediately.</p>
        <div class="form-grid">
          <label class="span-2"><span class="field-label compact-label">Item name</span><input class="field compact-field" name="name" maxlength="150" placeholder="e.g. Cedar Hall Wool Scarf" required></label>
          <label><span class="field-label compact-label">SKU</span><input class="field compact-field" name="sku" maxlength="50" placeholder="CAMPUS-SCARF-01" required></label>
          <label><span class="field-label compact-label">Type</span><select class="field compact-field" name="kind"><option value="merch">Merchandise</option><option value="ticket">Event Ticket</option></select></label>
          <label><span class="field-label compact-label">Price (₹)</span><input class="field compact-field" name="price" type="number" min="0" step="0.01" value="20.00" required></label>
          <label><span class="field-label compact-label">Initial Stock</span><input class="field compact-field" name="stock" type="number" min="0" step="1" value="30" required></label>
          <label><span class="field-label compact-label">Low Stock Threshold</span><input class="field compact-field" name="low_stock_threshold" type="number" min="0" value="5" required></label>
          <label><span class="field-label compact-label">Limit Per Buyer</span><input class="field compact-field" name="per_user_limit" type="number" min="1" placeholder="e.g. 2"></label>
          <label class="span-2"><span class="field-label compact-label">Description</span><textarea class="field compact-field" name="description" maxlength="2000" placeholder="Product story and details"></textarea></label>
          <label class="span-2"><span class="field-label compact-label">Event Date <span class="muted">(tickets only)</span></span><input class="field compact-field" name="event_date" type="datetime-local"></label>
          <label><span class="field-label compact-label">Sale Opens</span><input class="field compact-field" name="sale_starts_at" type="datetime-local"></label>
          <label><span class="field-label compact-label">Sale Closes</span><input class="field compact-field" name="sale_ends_at" type="datetime-local"></label>
        </div>
        <p id="item-form-error" class="form-error" role="alert" hidden></p>
        <button class="button button-block" type="submit">Publish to Board</button>
      </form>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Active Catalog Items</h2>
            <p>${filtered.length} of ${items.length} items shown</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Item Details</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Restock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${inventoryRowsMarkup(filtered)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    <dialog class="edit-dialog" id="edit-item-dialog">
      <form class="edit-dialog-form" id="edit-item-form">
        <div class="dialog-heading">
          <div><h2 id="edit-item-title">Edit Listing</h2><p>Adjust price, limits, or dates.</p></div>
          <button class="icon-button" type="button" data-action="close-edit" aria-label="Close">×</button>
        </div>
        <input type="hidden" name="id">
        <div class="form-grid">
          <label class="span-2"><span class="field-label compact-label">Item name</span><input class="field compact-field" name="name" maxlength="150" required></label>
          <label><span class="field-label compact-label">Price (₹)</span><input class="field compact-field" name="price" type="number" min="0" step="0.01" required></label>
          <label><span class="field-label compact-label">Low Stock Threshold</span><input class="field compact-field" name="low_stock_threshold" type="number" min="0" required></label>
          <label><span class="field-label compact-label">Limit Per Buyer</span><input class="field compact-field" name="per_user_limit" type="number" min="1"></label>
          <label><span class="field-label compact-label">Event Date</span><input class="field compact-field" name="event_date" type="datetime-local"></label>
          <label class="span-2"><span class="field-label compact-label">Description</span><textarea class="field compact-field" name="description" maxlength="2000"></textarea></label>
          <label><span class="field-label compact-label">Sale Opens</span><input class="field compact-field" name="sale_starts_at" type="datetime-local"></label>
          <label><span class="field-label compact-label">Sale Closes</span><input class="field compact-field" name="sale_ends_at" type="datetime-local"></label>
        </div>
        <p id="edit-item-error" class="form-error" role="alert" hidden></p>
        <div class="dialog-actions">
          <button class="button-secondary" type="button" data-action="close-edit">Cancel</button>
          <button class="button" type="submit">Save Changes</button>
        </div>
      </form>
    </dialog>
  `;
}

// Ticket Check-In Terminal
function renderTicketCheckIn() {
  const history = state.checkinHistory;
  return `
    <div class="section-heading">
      <div>
        <h2>Event Ticket Check-In Terminal</h2>
        <p>Rapid gate scanner with automatic 8-character verification and duplicate entry protection.</p>
      </div>
    </div>
    <div class="checkin-layout">
      <form class="panel form-panel checkin-form" id="ticket-checkin-form">
        <h2>Gate Admission Scanner</h2>
        <p>Enter or scan the 8-character hex code. Verification is atomic and irreversible.</p>
        <label>
          <span class="field-label" for="ticket-code">Ticket Pass Code</span>
          <input class="field checkin-code" id="ticket-code" name="ticket_code" minlength="8" maxlength="8" pattern="[A-Fa-f0-9]{8}" placeholder="A1B2C3D4" autocomplete="off" spellcheck="false" required autofocus>
        </label>
        <p id="ticket-checkin-error" class="form-error" role="alert" hidden></p>
        <button class="button button-block" type="submit">Verify &amp; Check In Guest</button>
      </form>
      <section id="ticket-checkin-result" class="panel checkin-result" aria-live="polite">
        <div class="checkin-result-icon">${ICONS.ticketCheckin}</div>
        <h2>Terminal Armed</h2>
        <p>Scan an attendee's digital QR pass or type their 8-character ticket voucher code.</p>
      </section>
    </div>
    <div class="section-heading">
      <div>
        <h2>Terminal Check-In Log</h2>
        <p>Admissions processed during this session.</p>
      </div>
    </div>
    <section class="panel">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Ticket Code</th>
              <th>Event Name</th>
              <th>Order ID</th>
              <th>Verified Time</th>
              <th>Admission State</th>
            </tr>
          </thead>
          <tbody>
            ${!history.length ? '<tr><td colspan="5" class="table-empty">No check-ins logged yet in this session.</td></tr>' : history.map(h => `
              <tr>
                <td><code class="verified-code">${escapeHtml(h.ticket_code)}</code></td>
                <td><strong>${escapeHtml(h.item_name)}</strong></td>
                <td><code>${escapeHtml(h.order_id.slice(0, 8))}</code></td>
                <td>${escapeHtml(formatDate(h.checked_in_at, { timeStyle: "medium", dateStyle: "short" }))}</td>
                <td><span class="status-pill">Admitted</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// Reports & Visual Analytics
async function renderReports() {
  const report = await api("/reports/summary");
  const top = Array.isArray(report.by_item) ? report.by_item : [];
  const low = Array.isArray(report.low_stock_items) ? report.low_stock_items : [];
  const maxRevenue = Math.max(...top.map(i => i.revenue), 10);

  return `
    <div class="section-heading">
      <div>
        <h2>Executive Sales &amp; Inventory Analytics</h2>
        <p>Relational SQL views, revenue aggregations, and stock performance metrics.</p>
      </div>
      <div class="section-actions">
        <a class="button button-secondary button-sm" href="/reports/export/orders.csv" download="campus_orders.csv">${ICONS.download} Export Orders (CSV)</a>
        <a class="button button-secondary button-sm" href="/reports/export/inventory.csv" download="campus_inventory.csv">${ICONS.download} Export Inventory (CSV)</a>
      </div>
    </div>
    <div class="stats">
      ${statMarkup("Total Revenue", formatPrice(report.total_revenue), "chart")}
      ${statMarkup("Units Sold", report.total_units ?? 0, "box")}
      ${statMarkup("Confirmed Orders", report.total_orders ?? 0, "receipt")}
      ${statMarkup("Avg Order Value", formatPrice(report.avg_order_value ?? 0), "grid")}
    </div>
    <section class="chart-panel">
      <div class="panel-header">
        <div>
          <h2>Revenue by Listing (SQL View Visualization)</h2>
          <p>Real-time data fetched from the <code>sales_by_item</code> materialized view.</p>
        </div>
      </div>
      <div class="chart-bars-wrap">
        ${!top.length ? '<p class="table-empty">Sales data will appear here once purchases are confirmed.</p>' : top.map(item => {
          const pct = Math.min(100, Math.round((item.revenue / maxRevenue) * 100));
          return `
            <div class="chart-bar-row">
              <span class="chart-bar-label" title="${escapeHtml(item.sku)}">${escapeHtml(item.sku)}</span>
              <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width: ${pct}%;"></div>
              </div>
              <span class="chart-bar-value">${formatPrice(item.revenue)} (${item.units} sold)</span>
            </div>
          `;
        }).join("")}
      </div>
    </section>
    <div class="section-heading">
      <div>
        <h2>Low Stock Monitor</h2>
        <p>Listings currently at or below their configured threshold.</p>
      </div>
    </div>
    <section class="panel">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Item Name</th><th>SKU</th><th>Units Left</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${!low.length ? '<tr><td colspan="4" class="table-empty">All active inventory is well above alert thresholds.</td></tr>' : low.map(item => `
              <tr>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td><code>${escapeHtml(item.sku)}</code></td>
                <td><strong class="stock ${item.stock === 0 ? "out" : "low"}">${item.stock}</strong></td>
                <td>${item.stock === 0 ? '<span class="status-pill danger">Sold Out</span>' : '<span class="status-pill warning">Low Stock</span>'}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// Database Lab & Interactive SQL Console
async function renderDatabaseLab() {
  const snapshot = await api("/reports/database");

  return `
    <div class="section-heading">
      <div>
        <h2>Relational Database Lab &amp; SQL Console</h2>
        <p>Live introspection of the ${escapeHtml(snapshot.engine)} engine, schema, indexes, and ACID transactions.</p>
      </div>
      <span class="status-pill neutral">Refreshed ${escapeHtml(formatDate(snapshot.generated_at, { timeStyle: "medium" }))}</span>
    </div>
    <section class="sql-console-panel">
      <div class="sql-console-header">
        <h2>${ICONS.database} Interactive SQL Console</h2>
        <span class="sql-tag">READ-ONLY ACID QUERIES</span>
      </div>
      <div class="preset-queries">
        ${(snapshot.preset_queries || []).map((pq, i) => `
          <button class="preset-btn" type="button" data-action="run-preset" data-query="${escapeHtml(pq.query)}">${escapeHtml(pq.name)}</button>
        `).join("")}
      </div>
      <div class="sql-editor-wrap">
        <textarea id="sql-console-input" class="sql-textarea" rows="3" placeholder="Enter a SELECT or WITH query…">SELECT sku, units, revenue FROM sales_by_item ORDER BY revenue DESC LIMIT 5;</textarea>
      </div>
      <div class="sql-console-actions">
        <button class="button" type="button" data-action="execute-sql">${ICONS.play} Execute SQL Query</button>
        <span id="sql-benchmark" class="sql-benchmark-badge"></span>
      </div>
      <div id="sql-result-container" class="sql-result-wrap" hidden></div>
    </section>
    <div class="section-heading">
      <div><h2>Relational Table Volumes</h2><p>Row counts across normalized schema entities.</p></div>
    </div>
    <section class="dbms-metrics">${databaseCountMarkup(snapshot.tables)}</section>
    <div class="section-heading">
      <div><h2>Schema Introspection</h2><p>Primary keys, foreign keys, and indexes defined in SQLAlchemy DDL.</p></div>
    </div>
    <section class="dbms-entities">${databaseSchemaMarkup(snapshot.schema)}</section>
  `;
}

function databaseCountMarkup(tables) {
  const labels = {
    users: "Users", items: "Items", orders: "Orders",
    ticket_codes: "Ticket Codes", purchase_counters: "Counters", alerts: "Alerts"
  };
  return Object.entries(labels).map(([name, label]) => `
    <article class="dbms-metric">
      <span>${label}</span>
      <strong>${escapeHtml(tables[name] ?? 0)}</strong>
      <code>${escapeHtml(name)}</code>
    </article>
  `).join("");
}

function databaseSchemaMarkup(tables) {
  return tables.map(table => `
    <article class="dbms-entity">
      <span class="dbms-entity-type">RELATIONAL ENTITY · ${escapeHtml(table.constraints.length)} CONSTRAINTS</span>
      <h3>${escapeHtml(table.name)}</h3>
      <ul class="dbms-columns">
        ${table.columns.map(c => `
          <li>
            <code>${escapeHtml(c.name)}</code>
            <span>${escapeHtml(c.type)}${c.nullable ? "" : " NOT NULL"}</span>
            ${c.primary_key ? '<b>PK</b>' : c.foreign_key ? `<b>FK → ${escapeHtml(c.foreign_key)}</b>` : ""}
          </li>
        `).join("")}
      </ul>
      <p class="dbms-indexes"><strong>Constraints:</strong> ${table.constraints.map(escapeHtml).join(" · ")}</p>
      <p class="dbms-indexes"><strong>Indexes:</strong> ${table.indexes.map(i => `${i.unique ? "UNIQUE " : ""}${escapeHtml(i.name)}`).join(" · ") || "Primary keys"}</p>
    </article>
  `).join("");
}

async function executeCustomSql(query) {
  const container = document.getElementById("sql-result-container");
  const benchmark = document.getElementById("sql-benchmark");
  if (!container || !query) return;

  benchmark.textContent = "Executing query against database…";
  container.hidden = true;

  try {
    const result = await api("/reports/query", {
      method: "POST",
      body: JSON.stringify({ query: query.trim() })
    });
    benchmark.textContent = `⚡ Executed in ${result.execution_time_ms} ms · ${result.row_count} row${result.row_count === 1 ? "" : "s"} returned`;
    container.hidden = false;

    if (!result.rows.length) {
      container.innerHTML = '<p style="padding: 12px; color: #9bb1a1;">Query executed successfully. 0 rows returned.</p>';
      return;
    }

    container.innerHTML = `
      <table class="sql-result-table">
        <thead>
          <tr>${result.columns.map(col => `<th>${escapeHtml(col)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${result.rows.map(row => `
            <tr>${row.map(val => `<td>${escapeHtml(val ?? "NULL")}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    benchmark.textContent = "";
    container.hidden = false;
    container.innerHTML = `<div class="form-error" style="background: #381a1a; color: #ff9b9b;">${escapeHtml(describeError(err))}</div>`;
  }
}

// Organizer Home Overview
async function renderOrganizerHome() {
  const [report, alerts, orders] = await Promise.all([
    api("/reports/summary"),
    api("/alerts?unacknowledged=true"),
    api("/orders")
  ]);

  return `
    ${pageHero("Campus Operations Center", "Everything in good order.",
      "Track live ticket admissions, manage merchandise drops, audit transaction integrity, and administer accounts.",
      statMarkup("Total Revenue", formatPrice(report.total_revenue), "chart") +
      statMarkup("Pending Alerts", alerts.length, "bell") +
      statMarkup("Total Orders", orders.length, "receipt"))}
    <div class="layout-two">
      <section class="panel">
        <div class="panel-header">
          <div><h2>Recent High-Priority Alerts</h2><p>Stock threshold events needing attention.</p></div>
          <a class="button-secondary button-sm" href="/organizer/alerts" data-link>View all alerts</a>
        </div>
        ${alertRowsMarkup(alerts.slice(0, 5))}
      </section>
      <section class="panel">
        <div class="panel-header">
          <div><h2>Recent Orders</h2><p>Latest campus purchases.</p></div>
          <a class="button-secondary button-sm" href="/organizer/orders" data-link>All orders</a>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Item</th><th>Buyer</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              ${!orders.length ? '<tr><td colspan="4" class="table-empty">No orders placed yet.</td></tr>' : orders.slice(0, 6).map(o => `
                <tr>
                  <td><strong>${escapeHtml(o.item_name)}</strong><span class="cell-subtitle">${o.sku}</span></td>
                  <td>${escapeHtml(o.buyer_name || "Campus buyer")}</td>
                  <td><strong>${formatPrice(o.total)}</strong></td>
                  <td>${statusMarkup(o.status)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function alertRowsMarkup(alerts) {
  if (!alerts.length) return emptyMarkup("All quiet on the stock front", "When an item gets low or sells out, alerts show up here.");
  return `<div class="alert-list" style="display: grid; gap: 8px;">${alerts.map(alert => `
    <div class="alert-row" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: #fafbf9;">
      <div class="alert-copy" style="display: flex; gap: 10px; align-items: center;">
        <span class="alert-icon" style="color: ${alert.type === "sold_out" ? "var(--red)" : "var(--amber)"}">${ICONS.alert}</span>
        <div>
          <strong>${escapeHtml(alert.type === "sold_out" ? "Item Sold Out" : "Low Stock Alert")}</strong>
          <p style="margin: 2px 0 0; font-size: 12px; color: var(--muted);">${escapeHtml(alert.item_name)} · ${alert.stock} remaining · ${formatDate(alert.created_at)}</p>
        </div>
      </div>
      <div style="display: flex; gap: 6px; align-items: center;">
        ${alert.acknowledged ? '<span class="status-pill neutral">Acknowledged</span>' : `<button class="button-secondary button-sm" type="button" data-action="ack-alert" data-id="${escapeHtml(alert.id)}">Acknowledge</button>`}
        <button class="button-danger button-sm" type="button" data-action="delete-alert" data-id="${escapeHtml(alert.id)}" title="Dismiss / Delete Alert">${ICONS.trash}</button>
      </div>
    </div>
  `).join("")}</div>`;
}

async function renderAlerts() {
  const alerts = await api("/alerts");
  const pending = alerts.filter(a => !a.acknowledged).length;
  return `
    <div class="section-heading">
      <div><h2>Stock Threshold Alerts</h2><p>Automatic triggers fired when inventory reaches configured safety levels.</p></div>
      <div class="section-actions">
        <span class="status-pill ${pending ? "warning" : ""}">${pending} pending</span>
        <button class="button-secondary button-sm" type="button" data-action="clear-alerts">Dismiss All Acknowledged</button>
      </div>
    </div>
    <section class="panel">${alertRowsMarkup(alerts)}</section>
  `;
}

// Auth Rendering
function renderAuth(path) {
  const isRegister = path === "/register";
  document.title = isRegister ? "Create account · Campus Edit" : "Sign in · Campus Edit";

  root.innerHTML = `
    <header class="guest-header">
      ${brandMarkup()}
      <div class="guest-header-note"><span class="online-dot"></span>Campus Inventory Live</div>
    </header>
    <main class="auth-layout">
      <div class="auth-copy">
        <p class="eyebrow">${isRegister ? "Join Campus life" : "Welcome back"}</p>
        <h1>${isRegister ? "Start finding what makes campus yours." : "Drop back in and grab your gear."}</h1>
        <p>FastAPI with SQLite relational integrity, conditional stock reservations, and digital ticket passes.</p>
        <div class="auth-illustration">${ICONS.cap}</div>
      </div>
      <div class="auth-card">
        <h2>${isRegister ? "Create your account" : "Sign in to Campus Edit"}</h2>
        <p class="auth-subtitle">${isRegister ? "Join as a campus buyer or use an organizer invite code." : "Enter your email and password to proceed."}</p>
        <form id="${isRegister ? "register-form" : "login-form"}">
          ${isRegister ? `<label><span class="field-label">Your Name</span><input class="field" name="name" type="text" placeholder="Alex Mercer" required autofocus></label>` : ""}
          <label><span class="field-label">Campus Email</span><input class="field" name="email" type="email" placeholder="student@campus.edu" required ${!isRegister ? "autofocus" : ""}></label>
          <label><span class="field-label">Password</span><input class="field" name="password" type="password" minlength="8" placeholder="••••••••" required></label>
          ${isRegister ? `<label class="organizer-code"><span class="field-label">Organizer Invite Code <span class="muted">(optional)</span></span><input class="field" name="organizer_code" type="text" placeholder="Leave blank for student buyer"></label>` : ""}
          <p id="auth-error" class="form-error" role="alert" hidden></p>
          <button class="button button-block" type="submit">${isRegister ? "Create my account →" : "Sign in →"}</button>
        </form>
        <p class="auth-foot">
          ${isRegister ? 'Already have an account? <a href="/login" data-link>Sign in</a>' : 'New to campus? <a href="/register" data-link>Create an account</a>'}
        </p>
      </div>
    </main>
  `;
}

// Router Controller
async function routeContent(path) {
  switch (path) {
    case "/shop": return await renderShop();
    case "/my-orders": return await renderOrders(false);
    case "/organizer": return await renderOrganizerHome();
    case "/organizer/inventory": return await renderInventory();
    case "/organizer/orders": return await renderOrders(true);
    case "/organizer/users": return await renderUsers();
    case "/organizer/check-in": return renderTicketCheckIn();
    case "/organizer/alerts": return await renderAlerts();
    case "/organizer/reports": return await renderReports();
    case "/organizer/database": return await renderDatabaseLab();
    default: return emptyMarkup("Not Found", "This route does not exist.");
  }
}

async function renderRoute() {
  const path = routePath();
  if (path === "/" || !ROUTES[path]) {
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
    showToast("That page is restricted to your campus role.", "error");
    return;
  }
  renderShell(path);
  try {
    const content = await routeContent(path);
    if (routePath() === path) {
      document.getElementById("page-content").innerHTML = content;
      if (path === "/shop") renderShopProducts();
    }
  } catch (error) {
    if (routePath() === path) {
      document.getElementById("page-content").innerHTML = `<div class="error-panel"><strong>Couldn't load page.</strong><p>${escapeHtml(describeError(error))}</p></div>`;
    }
  }
  connectSocket();
}

// Auth Handlers
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
    const res = await fetch("/auth/login", { method: "POST", body });
    let result = {};
    try { result = await res.json(); } catch {}
    if (!res.ok) throw new Error(result.detail || "Authentication failed.");
    state.token = result.access_token;
    sessionStorage.setItem("campus_access_token", state.token);
    state.user = await api("/auth/me");
    connectSocket();
    navTo(defaultRoute(), true);
    showToast(`Welcome in, ${state.user.name?.split(/\s+/)[0] || "friend"}.`);
  } catch (err) {
    errorBox.textContent = describeError(err);
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Sign in →";
  }
}

async function register(form) {
  const button = form.querySelector('button[type="submit"]');
  const errorBox = document.getElementById("auth-error");
  button.disabled = true;
  button.textContent = "Creating account…";
  errorBox.hidden = true;
  const body = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    password: form.elements.password.value
  };
  if (form.elements.organizer_code?.value.trim()) {
    body.organizer_code = form.elements.organizer_code.value.trim();
  }
  try {
    const res = await api("/auth/register", { method: "POST", body: JSON.stringify(body) });
    navTo("/login", true);
    showToast(res.role === "organizer" ? "Organizer account registered. Sign in to open workspace." : "Account created. Welcome to campus!");
  } catch (err) {
    errorBox.textContent = describeError(err);
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Create my account →";
  }
}

// User CRUD Handlers
async function createUser(form) {
  const button = form.querySelector('button[type="submit"]');
  const errorBox = document.getElementById("create-user-error");
  button.disabled = true;
  button.textContent = "Creating User…";
  errorBox.hidden = true;
  const data = new FormData(form);
  const body = {
    name: data.get("name").trim(),
    email: data.get("email").trim(),
    password: data.get("password"),
    role: data.get("role")
  };
  try {
    await api("/users", { method: "POST", body: JSON.stringify(body) });
    document.getElementById("create-user-dialog").close();
    showToast("User account created successfully.");
    await renderRoute();
  } catch (err) {
    errorBox.textContent = describeError(err);
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Create User";
  }
}

async function updateUser(form) {
  const button = form.querySelector('button[type="submit"]');
  const errorBox = document.getElementById("edit-user-error");
  const data = new FormData(form);
  const id = data.get("id");
  const body = {
    name: data.get("name").trim(),
    email: data.get("email").trim(),
    role: data.get("role")
  };
  if (data.get("password") && data.get("password").trim()) {
    body.password = data.get("password");
  }
  button.disabled = true;
  button.textContent = "Saving…";
  errorBox.hidden = true;
  try {
    await api(`/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
    document.getElementById("edit-user-dialog").close();
    showToast("User updated successfully.");
    await renderRoute();
  } catch (err) {
    errorBox.textContent = describeError(err);
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Save Changes";
  }
}

async function deleteUser(id, name) {
  if (!confirm(`Are you sure you want to permanently delete user "${name}"?`)) return;
  try {
    const res = await api(`/users/${encodeURIComponent(id)}`, { method: "DELETE" });
    showToast(res.message);
    await renderRoute();
  } catch (err) {
    showToast(describeError(err), "error");
  }
}

function openEditUser(id) {
  const user = state.usersList.find(u => u.id === id);
  if (!user) return;
  const dialog = document.getElementById("edit-user-dialog");
  const form = document.getElementById("edit-user-form");
  form.elements.id.value = user.id;
  form.elements.name.value = user.name;
  form.elements.email.value = user.email;
  form.elements.role.value = user.role;
  form.elements.password.value = "";
  document.getElementById("edit-user-error").hidden = true;
  dialog.showModal();
}

function openProfileDialog() {
  if (!modalContainer) return;
  modalContainer.innerHTML = `
    <dialog class="edit-dialog" id="profile-dialog" open>
      <form class="edit-dialog-form" id="profile-form">
        <div class="dialog-heading">
          <div><h2>My Profile</h2><p>Role: <strong style="text-transform: capitalize;">${escapeHtml(state.user?.role || "buyer")}</strong></p></div>
          <button class="icon-button" type="button" data-action="close-profile" aria-label="Close">×</button>
        </div>
        <div class="form-grid">
          <label class="span-2"><span class="field-label compact-label">Your Name</span><input class="field compact-field" name="name" value="${escapeHtml(state.user?.name || "")}" required></label>
          <label class="span-2"><span class="field-label compact-label">Campus Email</span><input class="field compact-field" value="${escapeHtml(state.user?.email || "")}" disabled style="background: #f0f3ed; cursor: not-allowed;"></label>
          <label class="span-2"><span class="field-label compact-label">New Password <span class="muted">(leave blank to keep current)</span></span><input class="field compact-field" name="password" type="password" minlength="8" placeholder="••••••••"></label>
          ${state.user?.role !== "organizer" ? `
            <label class="span-2"><span class="field-label compact-label">Upgrade to Organizer <span class="muted">(Enter invite code: committee-2026)</span></span><input class="field compact-field" name="organizer_code" type="text" placeholder="committee-2026"></label>
          ` : ""}
        </div>
        <p id="profile-error" class="form-error" role="alert" hidden></p>
        <div class="dialog-actions">
          <button class="button-secondary" type="button" data-action="close-profile">Cancel</button>
          <button class="button" type="submit">Update Profile</button>
        </div>
      </form>
    </dialog>
  `;
}

async function updateProfile(form) {
  const button = form.querySelector('button[type="submit"]');
  const errorBox = document.getElementById("profile-error");
  const data = new FormData(form);
  const body = { name: data.get("name").trim() };
  if (data.get("password") && data.get("password").trim()) {
    body.password = data.get("password");
  }
  if (data.get("organizer_code") && data.get("organizer_code").trim()) {
    body.organizer_code = data.get("organizer_code").trim();
  }
  button.disabled = true;
  button.textContent = "Updating…";
  errorBox.hidden = true;
  try {
    const updated = await api("/auth/profile", { method: "PATCH", body: JSON.stringify(body) });
    const oldRole = state.user.role;
    state.user.name = updated.name;
    state.user.role = updated.role;
    document.getElementById("profile-dialog")?.close();
    showToast(updated.role !== oldRole ? `Upgraded to ${updated.role}! Organizer menu unlocked.` : "Profile updated successfully.");
    if (updated.role !== oldRole) {
      navTo(defaultRoute(), true);
    } else {
      renderRoute();
    }
  } catch (err) {
    errorBox.textContent = describeError(err);
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Update Profile";
  }
}

function safeIsoDate(val) {
  if (!val) return undefined;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// Item Actions
async function createItem(form) {
  const button = form.querySelector('button[type="submit"]');
  const errorBox = document.getElementById("item-form-error");
  button.disabled = true;
  button.textContent = "Publishing…";
  errorBox.hidden = true;
  const data = new FormData(form);
  const body = {
    name: (data.get("name") || "").trim(),
    sku: (data.get("sku") || "").trim(),
    kind: data.get("kind") || "merch",
    price: Number(data.get("price")) || 0,
    stock: Number(data.get("stock")) || 0,
    low_stock_threshold: Number(data.get("low_stock_threshold")) || 5,
    description: (data.get("description") || "").trim()
  };
  const limit = data.get("per_user_limit");
  if (limit && Number(limit) > 0) body.per_user_limit = Number(limit);
  const eventDate = safeIsoDate(data.get("event_date"));
  if (eventDate) body.event_date = eventDate;
  const saleStart = safeIsoDate(data.get("sale_starts_at"));
  if (saleStart) body.sale_starts_at = saleStart;
  const saleEnd = safeIsoDate(data.get("sale_ends_at"));
  if (saleEnd) body.sale_ends_at = saleEnd;

  try {
    await api("/items", { method: "POST", body: JSON.stringify(body) });
    showToast("New item listing published.");
    form.reset();
    await renderRoute();
  } catch (err) {
    errorBox.textContent = describeError(err);
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Publish to Board";
  }
}

async function updateItem(form) {
  const button = form.querySelector('button[type="submit"]');
  const errorBox = document.getElementById("edit-item-error");
  const data = new FormData(form);
  const id = data.get("id");
  const body = {
    name: (data.get("name") || "").trim(),
    description: (data.get("description") || "").trim(),
    price: Number(data.get("price")) || 0,
    low_stock_threshold: Number(data.get("low_stock_threshold")) || 5,
    per_user_limit: data.get("per_user_limit") ? Number(data.get("per_user_limit")) : null,
    event_date: safeIsoDate(data.get("event_date")) || null,
    sale_starts_at: safeIsoDate(data.get("sale_starts_at")) || null,
    sale_ends_at: safeIsoDate(data.get("sale_ends_at")) || null
  };
  button.disabled = true;
  button.textContent = "Saving…";
  errorBox.hidden = true;
  try {
    await api(`/items/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
    document.getElementById("edit-item-dialog").close();
    showToast("Listing details updated.");
    await renderRoute();
  } catch (err) {
    errorBox.textContent = describeError(err);
    errorBox.hidden = false;
    button.disabled = false;
    button.textContent = "Save Changes";
  }
}

async function adjustStock(form) {
  const button = form.querySelector('button[type="submit"]');
  const delta = Number(form.elements.delta.value);
  if (!Number.isInteger(delta) || delta === 0) return;
  button.disabled = true;
  try {
    await api(`/items/${encodeURIComponent(form.dataset.id)}/restock`, {
      method: "POST",
      body: JSON.stringify({ delta })
    });
    showToast(delta > 0 ? `Added ${delta} to stock.` : `Wrote off ${Math.abs(delta)} stock.`);
    await renderRoute();
  } catch (err) {
    showToast(describeError(err), "error");
    button.disabled = false;
  }
}

async function toggleItem(button) {
  button.disabled = true;
  const active = button.dataset.active === "true";
  try {
    await api(`/items/${encodeURIComponent(button.dataset.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !active })
    });
    showToast(active ? "Listing hidden from the shop." : "Listing is live in the shop.");
    await renderRoute();
  } catch (err) {
    showToast(describeError(err), "error");
    button.disabled = false;
  }
}

async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete or archive this item? Items with past orders will be archived to preserve historical relational audit logs.")) return;
  try {
    const res = await api(`/items/${encodeURIComponent(id)}`, { method: "DELETE" });
    showToast(res.message);
    await renderRoute();
  } catch (err) {
    showToast(describeError(err), "error");
  }
}

async function checkInTicket(code, form) {
  const cleanCode = code.trim().toUpperCase();
  const errorBox = document.getElementById("ticket-checkin-error");
  const resultBox = document.getElementById("ticket-checkin-result");
  if (errorBox) errorBox.hidden = true;

  try {
    const res = await api("/orders/check-in", {
      method: "POST",
      body: JSON.stringify({ ticket_code: cleanCode })
    });
    state.checkinHistory.unshift(res);
    sessionStorage.setItem("campus_checkins", JSON.stringify(state.checkinHistory.slice(0, 50)));

    if (resultBox) {
      resultBox.innerHTML = `
        <div class="checkin-result-icon">${ICONS.ticketCheckin}</div>
        <span class="status-pill">Entry Approved</span>
        <h2>${escapeHtml(res.item_name)}</h2>
        <p>Voucher <code class="verified-code">${escapeHtml(res.ticket_code)}</code> verified and marked as admitted.</p>
        <p class="muted" style="margin-top: 6px;">Checked in at ${escapeHtml(formatDate(res.checked_in_at, { timeStyle: "medium", dateStyle: "short" }))}</p>
      `;
    }
    if (form) form.reset();
    showToast(`✓ Ticket ${cleanCode} checked in successfully!`);
    if (routePath() === "/organizer/check-in") renderRoute();
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = describeError(err);
      errorBox.hidden = false;
    }
    if (resultBox) {
      resultBox.innerHTML = `
        <div class="checkin-result-icon error">${ICONS.alert}</div>
        <h2 style="color: var(--red);">Entry Denied</h2>
        <p>${escapeHtml(describeError(err))}</p>
      `;
    }
  }
}

// Global Event Listeners
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
  if (action === "toggle-cart") toggleCart();
  if (action === "close-cart") toggleCart(false);
  if (action === "close-modal") document.getElementById("ticket-modal")?.close();
  if (action === "cart-checkout") checkoutCart(button);
  if (action === "cart-clear") clearCart();
  if (action === "cart-plus") updateCartItemQty(button.dataset.id, 1);
  if (action === "cart-minus") updateCartItemQty(button.dataset.id, -1);
  if (action === "cart-remove") removeFromCart(button.dataset.id);

  if (action === "add-bag") {
    const item = state.shopItems.find(i => i.id === button.dataset.id) || state.recommendations.find(i => i.id === button.dataset.id);
    if (item) addToCart(item, state.selectedQty[item.id] || 1);
  }
  if (action === "buy-now") {
    const item = state.shopItems.find(i => i.id === button.dataset.id) || state.recommendations.find(i => i.id === button.dataset.id);
    if (item) {
      addToCart(item, state.selectedQty[item.id] || 1);
      toggleCart(true);
    }
  }

  if (action === "card-qty-plus") {
    const id = button.dataset.id;
    const max = Number(button.dataset.max) || 20;
    const cur = state.selectedQty[id] || 1;
    if (cur < max) {
      state.selectedQty[id] = cur + 1;
      renderShopProducts();
    }
  }
  if (action === "card-qty-minus") {
    const id = button.dataset.id;
    const cur = state.selectedQty[id] || 1;
    if (cur > 1) {
      state.selectedQty[id] = cur - 1;
      renderShopProducts();
    }
  }

  if (action === "view-ticket") {
    openTicketPass(
      button.dataset.orderId,
      button.dataset.code,
      button.dataset.name,
      button.dataset.sku,
      button.dataset.date,
      button.dataset.used === "true"
    );
  }

  if (action === "cancel-order") {
    if (confirm("Are you sure you want to cancel this order? The items will be returned to live stock.")) {
      api(`/orders/${encodeURIComponent(button.dataset.id)}/cancel`, { method: "POST" })
        .then(() => {
          showToast("Order cancelled and stock restored to catalog.");
          renderRoute();
        })
        .catch(err => showToast(describeError(err), "error"));
    }
  }

  if (action === "delete-order") {
    if (confirm("Are you sure you want to permanently delete this cancelled order from history?")) {
      api(`/orders/${encodeURIComponent(button.dataset.id)}`, { method: "DELETE" })
        .then(() => {
          showToast("Cancelled order permanently deleted.");
          renderRoute();
        })
        .catch(err => showToast(describeError(err), "error"));
    }
  }

  if (action === "open-create-user") {
    document.getElementById("create-user-error").hidden = true;
    document.getElementById("create-user-dialog").showModal();
  }
  if (action === "close-create-user") document.getElementById("create-user-dialog")?.close();
  if (action === "edit-user") openEditUser(button.dataset.id);
  if (action === "close-edit-user") document.getElementById("edit-user-dialog")?.close();
  if (action === "delete-user") deleteUser(button.dataset.id, button.dataset.name);

  if (action === "open-profile-dialog") openProfileDialog();
  if (action === "close-profile") document.getElementById("profile-dialog")?.close();

  if (action === "toggle-item") toggleItem(button);
  if (action === "delete-item") deleteItem(button.dataset.id);

  if (action === "ack-alert") {
    api(`/alerts/${encodeURIComponent(button.dataset.id)}/ack`, { method: "POST" })
      .then(() => {
        showToast("Stock alert acknowledged.");
        renderRoute();
      })
      .catch(err => showToast(describeError(err), "error"));
  }
  if (action === "delete-alert") {
    api(`/alerts/${encodeURIComponent(button.dataset.id)}`, { method: "DELETE" })
      .then(() => {
        showToast("Alert dismissed and deleted.");
        renderRoute();
      })
      .catch(err => showToast(describeError(err), "error"));
  }
  if (action === "clear-alerts") {
    api("/alerts", { method: "DELETE" })
      .then(res => {
        showToast(res.message);
        renderRoute();
      })
      .catch(err => showToast(describeError(err), "error"));
  }

  if (action === "execute-sql") {
    const input = document.getElementById("sql-console-input");
    if (input) executeCustomSql(input.value);
  }
  if (action === "run-preset") {
    const input = document.getElementById("sql-console-input");
    if (input && button.dataset.query) {
      input.value = button.dataset.query;
      executeCustomSql(button.dataset.query);
    }
  }

  if (action === "edit-item") {
    const item = state.inventoryItems.find(entry => entry.id === button.dataset.id);
    if (!item) return;
    const dialog = document.getElementById("edit-item-dialog");
    const form = document.getElementById("edit-item-form");
    form.elements.id.value = item.id;
    form.elements.name.value = item.name;
    form.elements.description.value = item.description || "";
    form.elements.price.value = item.price;
    form.elements.low_stock_threshold.value = item.low_stock_threshold ?? 5;
    form.elements.per_user_limit.value = item.per_user_limit ?? "";
    form.elements.event_date.value = datetimeLocalValue(item.event_date);
    form.elements.sale_starts_at.value = datetimeLocalValue(item.sale_starts_at);
    form.elements.sale_ends_at.value = datetimeLocalValue(item.sale_ends_at);
    document.getElementById("edit-item-error").hidden = true;
    dialog.showModal();
  }
  if (action === "close-edit") document.getElementById("edit-item-dialog")?.close();
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
  } else if (form.id === "edit-item-form") {
    event.preventDefault();
    updateItem(form);
  } else if (form.id === "create-user-form") {
    event.preventDefault();
    createUser(form);
  } else if (form.id === "edit-user-form") {
    event.preventDefault();
    updateUser(form);
  } else if (form.id === "profile-form") {
    event.preventDefault();
    updateProfile(form);
  } else if (form.id === "ticket-checkin-form") {
    event.preventDefault();
    checkInTicket(form.elements.ticket_code.value, form);
  } else if (form.matches(".restock-form")) {
    event.preventDefault();
    adjustStock(form);
  }
});

document.addEventListener("input", event => {
  if (event.target.id === "shop-search") {
    state.stockSearch = event.target.value;
    renderShopProducts();
  } else if (event.target.id === "inv-search") {
    state.inventorySearch = event.target.value;
    renderRoute();
  } else if (event.target.id === "orders-search") {
    state.ordersSearch = event.target.value;
    renderRoute();
  } else if (event.target.id === "users-search") {
    state.usersSearch = event.target.value;
    renderRoute();
  } else if (event.target.id === "ticket-code") {
    if (event.target.value.trim().length === 8) {
      checkInTicket(event.target.value.trim(), event.target.form);
    }
  }
});

document.addEventListener("change", event => {
  if (event.target.id === "shop-sort") {
    state.shopSort = event.target.value;
    renderShopProducts();
  }
});

document.addEventListener("click", event => {
  const filter = event.target.closest("[data-filter]");
  if (filter) {
    state.stockFilter = filter.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(b => b.setAttribute("aria-pressed", String(b === filter)));
    renderShopProducts();
    return;
  }
  const invFilter = event.target.closest("[data-inv-filter]");
  if (invFilter) {
    state.inventoryFilter = invFilter.dataset.invFilter;
    renderRoute();
    return;
  }
  const orderFilter = event.target.closest("[data-order-status]");
  if (orderFilter) {
    state.ordersStatusFilter = orderFilter.dataset.orderStatus;
    renderRoute();
    return;
  }
  const userFilter = event.target.closest("[data-user-role]");
  if (userFilter) {
    state.usersRoleFilter = userFilter.dataset.userRole;
    renderRoute();
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
