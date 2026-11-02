let currentFilter = "ALL";

document.addEventListener("DOMContentLoaded", () => {
  // Kiểm tra đăng nhập
  if (sessionStorage.getItem("admin_auth") === "true") {
    document.getElementById("loginOverlay").style.display = "none";
    refreshAdminOrders();
  }

  // Lắng nghe đơn hàng mới từ các tab khác theo thời gian thực
  if (window.BroadcastChannel) {
    const channel = new BroadcastChannel("order_channel");
    channel.onmessage = () => {
      refreshAdminOrders();
    };
  }

  // Tự động làm mới mỗi 3 giây
  setInterval(refreshAdminOrders, 3000);
});

function checkAdminPin() {
  const pin = document.getElementById("adminPinInput").value.trim();
  if (pin === STORE_CONFIG.ADMIN_PIN) {
    sessionStorage.setItem("admin_auth", "true");
    document.getElementById("loginOverlay").style.display = "none";
    refreshAdminOrders();
  } else {
    alert("❌ Mã PIN không chính xác!");
  }
}

function logoutAdmin() {
  sessionStorage.removeItem("admin_auth");
  location.reload();
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  refreshAdminOrders();
}

function refreshAdminOrders() {
  if (sessionStorage.getItem("admin_auth") !== "true") return;

  const orders = OrderStore.getOrders();

  // 1. Tính toán thống kê
  let pendingCount = 0;
  let approvedCount = 0;
  let totalRevenue = 0;

  orders.forEach(o => {
    if (o.status === "PENDING") pendingCount++;
    if (o.status === "APPROVED") {
      approvedCount++;
      totalRevenue += (o.amount || 0);
    }
  });

  document.getElementById("statPending").innerText = pendingCount;
  document.getElementById("statApproved").innerText = approvedCount;
  document.getElementById("statRevenue").innerText = totalRevenue.toLocaleString("vi-VN") + "đ";
  document.getElementById("statTotal").innerText = orders.length;

  // 2. Lọc danh sách theo Tab
  let filtered = orders;
  if (currentFilter !== "ALL") {
    filtered = orders.filter(o => o.status === currentFilter);
  }

  // 3. Render Table
  const tbody = document.getElementById("adminOrderTableBody");
  if (!filtered || filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 30px;">Không có đơn hàng nào trong mục này.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => `
    <tr>
      <td><b>#${o.orderCode}</b></td>
      <td style="color: #94a3b8; font-size: 11px;">${o.createdAt || 'Vừa xong'}</td>
      <td><b>${escapeHtml(o.contact || 'Khách vãng lai')}</b></td>
      <td><span style="color: #38bdf8; font-weight: 600;">${o.planName}</span></td>
      <td><b style="color: #10b981;">${(o.amount || 0).toLocaleString("vi-VN")}đ</b></td>
      <td><code style="background:#0f172a; padding: 2px 6px; border-radius:4px; color:#fbbf24;">${o.transferContent}</code></td>
      <td style="font-family: Consolas; font-size: 11px;">${o.hwid}</td>
      <td>
        <span class="badge-status badge-${o.status}">
          ${o.status === 'PENDING' ? '⏳ Chờ Duyệt' : o.status === 'APPROVED' ? '✅ Đã Duyệt' : '❌ Từ Chối'}
        </span>
      </td>
      <td style="font-family: Consolas; font-size: 11px; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">
        ${o.licenseKey ? `<b style="color:#38bdf8;">${o.licenseKey}</b>` : '<span style="color:#64748b;">(Chưa cấp)</span>'}
      </td>
      <td>
        <div class="action-group">
          ${o.status === 'PENDING' ? `
            <button class="btn-approve" onclick="approveOrderAction('${o.orderCode}')">✅ Duyệt & Cấp Key</button>
            <button class="btn-reject" onclick="rejectOrderAction('${o.orderCode}')">❌ Hủy</button>
          ` : o.status === 'APPROVED' ? `
            <button class="btn-approve" style="background:#334155;" onclick="copyKeyText('${o.licenseKey}')">📋 Copy Key</button>
          ` : `
            <span style="color:#94a3b8; font-size:11px;">Đã từ chối</span>
          `}
        </div>
      </td>
    </tr>
  `).join("");
}

async function approveOrderAction(orderCode) {
  if (!confirm(`Bạn đã kiểm tra thấy tiền đơn hàng #${orderCode} vào tài khoản chưa? Bấm OK để hệ thống tự động sinh Key trả cho khách!`)) {
    return;
  }

  const key = await OrderStore.approveOrder(orderCode);
  if (key) {
    alert(`🎉 Đã duyệt thành công đơn #${orderCode}!\nKey được sinh: ${key}\nMàn hình của khách sẽ tự động nhận được Key ngay bây giờ.`);
    refreshAdminOrders();
  }
}

function rejectOrderAction(orderCode) {
  if (confirm(`Bạn có chắc muốn từ chối đơn #${orderCode}?`)) {
    OrderStore.rejectOrder(orderCode);
    refreshAdminOrders();
  }
}

function copyKeyText(key) {
  navigator.clipboard.writeText(key);
  alert("Đã sao chép Key: " + key);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

