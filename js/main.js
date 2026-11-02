// ==========================================================================
// CẤU HÌNH TÀI KHOẢN NGÂN HÀNG NHẬN TIỀN CỦA BẠN (HỖ TRỢ VIETQR TỰ ĐỘNG)
// ==========================================================================
const BANK_CONFIG = {
  BANK_ID: "MB",               // Mã ngân hàng: MB, VCB, TCB, ACB, VPB, ICB...
  BANK_NAME: "MBBank (Quân Đội)",
  ACCOUNT_NO: "0399888899",     // Số tài khoản ngân hàng của bạn
  ACCOUNT_NAME: "NGUYEN VAN A", // Tên chủ tài khoản (Viết hoa không dấu)
  
  // Link tải file cài đặt Desktop App
  DOWNLOAD_URL: "https://github.com/your-username/repurpose-video/releases/latest"
};

// State đơn hàng hiện tại
let currentOrder = {
  planName: "",
  amount: 0,
  daysValid: 30,
  hwid: "",
  contact: "",
  orderCode: "",
  transferContent: ""
};

let pollInterval = null;

// Cập nhật link tải app
document.addEventListener("DOMContentLoaded", () => {
  const btnDownload = document.getElementById("btnDownloadLink");
  if (btnDownload && BANK_CONFIG.DOWNLOAD_URL) {
    btnDownload.href = BANK_CONFIG.DOWNLOAD_URL;
  }

  // Lắng nghe tín hiệu Admin duyệt đơn theo thời gian thực
  if (window.BroadcastChannel) {
    const channel = new BroadcastChannel("order_channel");
    channel.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === "ORDER_APPROVED" && data.order.orderCode === currentOrder.orderCode) {
        showApprovedKey(data.order.licenseKey);
      }
    };
  }
});

// ================= 1. FLOW MUA HÀNG & MODAL ================= //
function startPurchase(planName, amount, daysValid) {
  currentOrder.planName = planName;
  currentOrder.amount = amount;
  currentOrder.daysValid = daysValid;
  currentOrder.orderCode = "REP" + Math.floor(1000 + Math.random() * 9000);

  document.getElementById("selectedPlanName").innerText = planName;
  document.getElementById("selectedPlanPrice").innerText = amount.toLocaleString("vi-VN") + "đ";

  // Reset steps
  document.getElementById("step-info").style.display = "block";
  document.getElementById("step-qr").style.display = "none";
  document.getElementById("step-success").style.display = "none";

  openModal("checkoutModal");
}

function proceedToPayment() {
  const hwidInput = document.getElementById("inputHwid").value.trim();
  const contactInput = document.getElementById("inputContact").value.trim();

  if (!hwidInput) {
    alert("Vui lòng nhập Mã máy tính (HWID) từ ứng dụng Desktop!");
    return;
  }
  if (!hwidInput.toUpperCase().startsWith("HWID-")) {
    alert("Mã máy tính không đúng định dạng (Ví dụ: HWID-DF89-9A1D-82A2-E186)!");
    return;
  }
  if (!contactInput) {
    alert("Vui lòng nhập Số điện thoại hoặc Zalo để Admin liên hệ hỗ trợ!");
    return;
  }

  currentOrder.hwid = hwidInput.toUpperCase();
  currentOrder.contact = contactInput;
  currentOrder.transferContent = `${currentOrder.orderCode} ${currentOrder.hwid.slice(-4)}`;

  // Lưu đơn hàng vào kho (Trạng thái: PENDING - Chờ Admin duyệt)
  OrderStore.saveOrder({
    orderCode: currentOrder.orderCode,
    hwid: currentOrder.hwid,
    contact: currentOrder.contact,
    planName: currentOrder.planName,
    amount: currentOrder.amount,
    daysValid: currentOrder.daysValid,
    transferContent: currentOrder.transferContent,
    status: "PENDING",
    createdAt: new Date().toLocaleTimeString("vi-VN") + " " + new Date().toLocaleDateString("vi-VN")
  });

  // Tạo URL VietQR chuẩn
  const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.BANK_ID}-${BANK_CONFIG.ACCOUNT_NO}-compact2.png?amount=${currentOrder.amount}&addInfo=${encodeURIComponent(currentOrder.transferContent)}&accountName=${encodeURIComponent(BANK_CONFIG.ACCOUNT_NAME)}`;

  document.getElementById("qrImage").src = qrUrl;
  document.getElementById("displayOrderCode").innerText = `#${currentOrder.orderCode}`;
  document.getElementById("bankName").innerText = BANK_CONFIG.BANK_NAME;
  document.getElementById("bankAccount").innerText = BANK_CONFIG.ACCOUNT_NO;
  document.getElementById("accountName").innerText = BANK_CONFIG.ACCOUNT_NAME;
  document.getElementById("transferAmount").innerText = currentOrder.amount.toLocaleString("vi-VN") + "đ";
  document.getElementById("transferContent").innerText = currentOrder.transferContent;

  // Chuyển sang bước 2 (Quét mã QR & Chờ duyệt)
  document.getElementById("step-info").style.display = "none";
  document.getElementById("step-qr").style.display = "block";

  // Bật bộ quét polling kiểm tra xem Admin đã duyệt chưa (mỗi 2 giây quét 1 lần)
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(checkOrderStatusPolling, 2000);
}

function checkOrderStatusPolling() {
  if (!currentOrder.orderCode) return;
  const order = OrderStore.findOrder(currentOrder.orderCode);
  if (order && order.status === "APPROVED" && order.licenseKey) {
    clearInterval(pollInterval);
    showApprovedKey(order.licenseKey);
  }
}

function showApprovedKey(licenseKey) {
  if (pollInterval) clearInterval(pollInterval);
  document.getElementById("generatedKeyResult").innerText = licenseKey;
  document.getElementById("step-qr").style.display = "none";
  document.getElementById("step-success").style.display = "block";
}

function backToInfo() {
  if (pollInterval) clearInterval(pollInterval);
  document.getElementById("step-info").style.display = "block";
  document.getElementById("step-qr").style.display = "none";
}

function copyGeneratedKey() {
  const key = document.getElementById("generatedKeyResult").innerText;
  copyText(key);
  alert("✅ Đã sao chép Key bản quyền! Hãy mở ứng dụng trên máy tính và dán vào để kích hoạt.");
}

// ================= 2. TRA CỨU ĐƠN & KEY ================= //
function openLookupModal() {
  document.getElementById("lookupResult").style.display = "none";
  document.getElementById("lookupHwid").value = "";
  openModal("lookupModal");
}

function performLookup() {
  const query = document.getElementById("lookupHwid").value.trim().toUpperCase();
  const resDiv = document.getElementById("lookupResult");

  if (!query) {
    alert("Vui lòng nhập HWID hoặc Mã đơn!");
    return;
  }

  const order = OrderStore.findOrder(query);

  resDiv.style.display = "block";
  if (order) {
    if (order.status === "APPROVED" && order.licenseKey) {
      resDiv.innerHTML = `
        <div class="key-result-box" style="margin-top:0;">
          <span class="key-label">ĐÃ TÌM THẤY KEY CỦA BẠN (${order.planName}):</span>
          <div class="key-value">${order.licenseKey}</div>
          <button class="btn btn-primary btn-block btn-sm" onclick="copyText('${order.licenseKey}'); alert('Đã copy Key!')">📋 Copy Key</button>
        </div>
      `;
    } else if (order.status === "PENDING") {
      resDiv.innerHTML = `
        <div style="background:#1e293b; border: 1px solid #fbbf24; color:#fbbf24; padding:14px; border-radius:8px; font-size:13px;">
          ⏳ <b>Đơn hàng #${order.orderCode} (${order.planName})</b> đang chờ Admin kiểm tra tài khoản và duyệt. Vui lòng quay lại sau ít phút hoặc nhắn tin cho Admin để duyệt nhanh!
        </div>
      `;
    } else {
      resDiv.innerHTML = `
        <div style="background:#7f1d1d; color:#fca5a5; padding:12px; border-radius:8px; font-size:13px;">
          ❌ Đơn hàng #${order.orderCode} đã bị từ chối. Vui lòng liên hệ Admin qua Zalo để kiểm tra!
        </div>
      `;
    }
  } else {
    resDiv.innerHTML = `
      <div style="background:#7f1d1d; color:#fca5a5; padding:12px; border-radius:8px; font-size:13px;">
        ❌ Không tìm thấy thông tin cho mã: <b>${query}</b>. Vui lòng kiểm tra lại hoặc liên hệ Admin!
      </div>
    `;
  }
}

// Helpers
function openModal(id) {
  document.getElementById(id).classList.add("active");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

function copyText(text) {
  navigator.clipboard.writeText(text);
}
