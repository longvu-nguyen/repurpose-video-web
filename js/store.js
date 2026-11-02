// ==========================================================================
// CẤU HÌNH BẢO MẬT & ĐỒNG BỘ ĐƠN HÀNG GIỮA KHÁCH HÀNG VÀ BẠN (ADMIN)
// ==========================================================================
const STORE_CONFIG = {
  ADMIN_PIN: "admin123", // Đổi mật khẩu này để chỉ có bạn mới vào được admin.html!
  
  // Khóa bí mật sinh Key (khớp 100% với license_manager.py trong desktop_app)
  SECRET_SALT: "REPURPOSE_VIDEO_PRO_SECRET_KEY_2026_XYZ",

  // Cloud API đồng bộ đơn hàng tức thì giữa máy khách và máy bạn (Miễn phí)
  API_URL: "https://api.jsonbin.io/v3/b"
};

// Thuật toán Web Crypto sinh Key bản quyền chuẩn HMAC-SHA256
async function createLicenseKey(hwid, daysValid) {
  let expiryDate = "99991231";
  if (daysValid > 0) {
    const d = new Date();
    d.setDate(d.getDate() + daysValid);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    expiryDate = `${yyyy}${mm}${dd}`;
  }

  const payload = `${hwid.trim().toUpperCase()}|${expiryDate}`;
  const encoder = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(STORE_CONFIG.SECRET_SALT),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await window.crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const signature = hashHex.substring(0, 12);

  return `KEY-${expiryDate}-${signature}`;
}

// Lưu trữ & Truy xuất đơn hàng đồng bộ
const OrderStore = {
  // Lấy toàn bộ đơn hàng
  getOrders: function() {
    try {
      return JSON.parse(localStorage.getItem("repurpose_orders") || "[]");
    } catch {
      return [];
    }
  },

  // Khách tạo đơn hàng mới (Chờ duyệt)
  saveOrder: function(order) {
    const orders = this.getOrders();
    // Kiểm tra xem đơn đã có chưa
    const idx = orders.findIndex(o => o.orderCode === order.orderCode);
    if (idx >= 0) {
      orders[idx] = order;
    } else {
      orders.unshift(order);
    }
    localStorage.setItem("repurpose_orders", JSON.stringify(orders));
    // Phát tín hiệu qua BroadcastChannel cho tab khác đồng bộ ngay
    if (window.BroadcastChannel) {
      new BroadcastChannel("order_channel").postMessage({ type: "NEW_ORDER", order });
    }
  },

  // Tìm đơn theo mã đơn hoặc HWID
  findOrder: function(orderCodeOrHwid) {
    const orders = this.getOrders();
    const q = orderCodeOrHwid.trim().toUpperCase();
    return orders.find(o => o.orderCode.toUpperCase() === q || o.hwid.toUpperCase() === q);
  },

  // Admin bấm Duyệt & Cấp Key
  approveOrder: async function(orderCode) {
    const orders = this.getOrders();
    const order = orders.find(o => o.orderCode === orderCode);
    if (!order) return null;

    // Sinh key bản quyền
    const key = await createLicenseKey(order.hwid, order.daysValid);
    order.status = "APPROVED";
    order.licenseKey = key;
    order.approvedAt = new Date().toLocaleString("vi-VN");

    localStorage.setItem("repurpose_orders", JSON.stringify(orders));

    if (window.BroadcastChannel) {
      new BroadcastChannel("order_channel").postMessage({ type: "ORDER_APPROVED", order });
    }
    return key;
  },

  // Admin từ chối đơn (sai tiền / spam)
  rejectOrder: function(orderCode) {
    const orders = this.getOrders();
    const order = orders.find(o => o.orderCode === orderCode);
    if (order) {
      order.status = "REJECTED";
      localStorage.setItem("repurpose_orders", JSON.stringify(orders));
      if (window.BroadcastChannel) {
        new BroadcastChannel("order_channel").postMessage({ type: "ORDER_REJECTED", order });
      }
    }
  }
};

