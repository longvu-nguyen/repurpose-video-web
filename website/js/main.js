// ==========================================================================
// CẤU HÌNH TÀI KHOẢN NGÂN HÀNG NHẬN TIỀN CỦA BẠN (HỖ TRỢ VIETQR TỰ ĐỘNG)
// ==========================================================================
const CONFIG = {
  BANK_ID: "MB",               // Mã ngân hàng: MB, VCB, TCB, ACB, VPB, ICB...
  BANK_NAME: "MBBank (Quân Đội)",
  ACCOUNT_NO: "0399888899",     // Số tài khoản ngân hàng của bạn
  ACCOUNT_NAME: "NGUYEN VAN A", // Tên chủ tài khoản (Viết hoa không dấu)
  
  // Khóa bí mật sinh Key (Phải trùng khớp 100% với license_manager.py của Desktop App)
  SECRET_SALT: "REPURPOSE_VIDEO_PRO_SECRET_KEY_2026_XYZ",
  
  // Link file cài đặt Desktop App (Đặt link Google Drive hoặc GitHub Release tại đây)
  DOWNLOAD_URL: "https://github.com/your-username/repurpose-video/releases/latest"
};

// State hiện tại
let currentOrder = {
  planName: "",
  amount: 0,
  daysValid: 30,
  hwid: "",
  contact: "",
  orderCode: ""
};

// Cập nhật link tải app
document.addEventListener("DOMContentLoaded", () => {
  const btnDownload = document.getElementById("btnDownloadLink");
  if (btnDownload && CONFIG.DOWNLOAD_URL) {
    btnDownload.href = CONFIG.DOWNLOAD_URL;
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

  currentOrder.hwid = hwidInput.toUpperCase();
  currentOrder.contact = contactInput;

  // Tạo URL VietQR chuẩn
  const transferContent = `${currentOrder.orderCode} ${currentOrder.hwid.slice(-4)}`;
  const qrUrl = `https://img.vietqr.io/image/${CONFIG.BANK_ID}-${CONFIG.ACCOUNT_NO}-compact2.png?amount=${currentOrder.amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(CONFIG.ACCOUNT_NAME)}`;

  document.getElementById("qrImage").src = qrUrl;
  document.getElementById("bankName").innerText = CONFIG.BANK_NAME;
  document.getElementById("bankAccount").innerText = CONFIG.ACCOUNT_NO;
  document.getElementById("accountName").innerText = CONFIG.ACCOUNT_NAME;
  document.getElementById("transferAmount").innerText = currentOrder.amount.toLocaleString("vi-VN") + "đ";
  document.getElementById("transferContent").innerText = transferContent;

  // Chuyển sang bước 2 (Quét mã QR)
  document.getElementById("step-info").style.display = "none";
  document.getElementById("step-qr").style.display = "block";
}

function backToInfo() {
  document.getElementById("step-info").style.display = "block";
  document.getElementById("step-qr").style.display = "none";
}

// ================= 2. SINH KEY BẢN QUYỀN TỰ ĐỘNG (HMAC-SHA256) ================= //
async function generateLicenseKey(hwid, daysValid) {
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

  // Mã hóa Web Crypto HMAC-SHA256 (Khớp 100% với Python license_manager.py)
  const encoder = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(CONFIG.SECRET_SALT),
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

async function simulatePaymentSuccess() {
  const btn = document.getElementById("btnConfirmPaid");
  btn.disabled = true;
  btn.innerText = "⏳ Đang xác thực giao dịch ngân hàng...";

  // Giả lập kiểm tra giao dịch (hoặc kết nối SePay/Casso webhook)
  setTimeout(async () => {
    btn.disabled = false;
    btn.innerText = "✅ Tôi Đã Chuyển Khoản Thành Công";

    // Sinh Key tự động
    const key = await generateLicenseKey(currentOrder.hwid, currentOrder.daysValid);

    // Lưu vào LocalStorage để khách tra cứu lại bất cứ lúc nào
    saveKeyToHistory(currentOrder.hwid, key, currentOrder.planName);

    // Hiển thị kết quả
    document.getElementById("generatedKeyResult").innerText = key;
    document.getElementById("step-qr").style.display = "none";
    document.getElementById("step-success").style.display = "block";
  }, 1200);
}

function copyGeneratedKey() {
  const key = document.getElementById("generatedKeyResult").innerText;
  copyText(key);
  alert("✅ Đã sao chép Key bản quyền! Hãy mở ứng dụng trên máy tính và dán vào để kích hoạt.");
}

// ================= 3. LƯU & TRA CỨU KEY ================= //
function saveKeyToHistory(hwid, key, plan) {
  try {
    const history = JSON.parse(localStorage.getItem("repurpose_keys") || "{}");
    history[hwid] = {
      key: key,
      plan: plan,
      date: new Date().toLocaleDateString("vi-VN")
    };
    localStorage.setItem("repurpose_keys", JSON.stringify(history));
  } catch (e) {
    console.error(e);
  }
}

function openLookupModal() {
  document.getElementById("lookupResult").style.display = "none";
  document.getElementById("lookupHwid").value = "";
  openModal("lookupModal");
}

function performLookup() {
  const hwid = document.getElementById("lookupHwid").value.trim().toUpperCase();
  const resDiv = document.getElementById("lookupResult");

  if (!hwid) {
    alert("Vui lòng nhập HWID!");
    return;
  }

  const history = JSON.parse(localStorage.getItem("repurpose_keys") || "{}");
  const found = history[hwid];

  resDiv.style.display = "block";
  if (found) {
    resDiv.innerHTML = `
      <div class="key-result-box" style="margin-top:0;">
        <span class="key-label">TÌM THẤY KEY CỦA BẠN (${found.plan}):</span>
        <div class="key-value">${found.key}</div>
        <button class="btn btn-primary btn-block btn-sm" onclick="copyText('${found.key}'); alert('Đã copy!')">📋 Copy Key</button>
      </div>
    `;
  } else {
    resDiv.innerHTML = `
      <div style="background:#7f1d1d; color:#fca5a5; padding:12px; border-radius:8px; font-size:13px;">
        ❌ Không tìm thấy Key nào cho mã máy <b>${hwid}</b> trên trình duyệt này. Nếu bạn đã mua, vui lòng liên hệ Admin qua Zalo/Telegram để được cấp lại!
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

