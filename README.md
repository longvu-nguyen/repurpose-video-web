# Hướng Dẫn Đưa Website Bán Key Lên GitHub Pages (Miễn Phí 100%)

Thư mục `website/` này chứa toàn bộ mã nguồn của trang web giới thiệu phần mềm, cho khách tải app, thanh toán tự động qua mã **VietQR**, tự động xuất **Key bản quyền** và tra cứu Key.

---

## 🛠 BƯỚC 1: Cấu hình Tài khoản Ngân hàng nhận tiền

Mở file: `website/js/main.js` và chỉnh sửa các thông tin ở ngay đầu file:

```javascript
const CONFIG = {
  BANK_ID: "MB",               // Mã ngân hàng: MB, VCB, TCB, ACB, VPB, ICB...
  BANK_NAME: "MBBank (Quân Đội)",
  ACCOUNT_NO: "0399888899",     // Số tài khoản ngân hàng của bạn
  ACCOUNT_NAME: "NGUYEN VAN A", // Tên chủ tài khoản (Viết hoa không dấu)
  
  // Link tải file cài đặt Desktop App (Google Drive hoặc GitHub Release)
  DOWNLOAD_URL: "https://github.com/your-username/repurpose-video/releases/latest"
};
```

*(Mã VietQR sẽ tự động thay đổi theo đúng số tài khoản và ngân hàng của bạn).*

---

## 🚀 BƯỚC 2: Xuất bản lên GitHub Pages trong 3 phút

1. Đăng nhập vào tài khoản [GitHub](https://github.com) của bạn.
2. Tạo một **Repository mới** (Ví dụ đặt tên là: `repurpose-video` hoặc `repurpose-tool`), chọn chế độ **Public**.
3. Tải toàn bộ các file trong thư mục `website/` lên repository này:
   - `index.html`
   - thư mục `css/`
   - thư mục `js/`
4. Vào mục **Settings** của repository $\to$ chọn thẻ **Pages** ở thanh menu bên trái.
5. Tại mục **Build and deployment**:
   - **Source**: Chọn `Deploy from a branch`
   - **Branch**: Chọn `main` (hoặc `master`) $\to$ Thư mục: `/ (root)` $\to$ Bấm **Save**.
6. Chờ khoảng 1 - 2 phút, GitHub sẽ cung cấp cho bạn một đường link website chính thức dạng:
   👉 **`https://<tên-github-của-bạn>.github.io/<tên-repo>/`**

---

## 💡 BƯỚC 3: Đưa file tải App lên GitHub Releases

1. Chạy file `Build-Exe-To-Sell.bat` trong thư mục `desktop_app/` để tạo ra bản đóng gói `.exe`.
2. Nén toàn bộ thư mục app thành file `.zip` (ví dụ: `AutoVideoRepurposerPRO_v2.0.zip`).
3. Vào repository GitHub của bạn $\to$ Mục **Releases** $\to$ Bấm **Create a new release**.
4. Đặt tên phiên bản (ví dụ `v2.0`) và tải file `.zip` lên đó.
5. Copy đường link tải file và dán vào biến `DOWNLOAD_URL` trong file `website/js/main.js`.

---

## 🔐 Cơ chế Hoạt động Tự Động của Website

1. **Khách nhập mã HWID**: Lấy từ phần mềm Desktop trên máy của họ.
2. **Khách quét mã VietQR**: Mã QR đã chứa sẵn số tiền và nội dung chuyển khoản độc nhất.
3. **Sinh Key tự động**: Hệ thống Web Crypto HMAC-SHA256 trên website tự động tạo Key khớp 100% với thuật toán của Desktop App.
4. **Kích hoạt ngay**: Khách copy Key $\to$ Dán vào phần mềm $\to$ Mở khóa toàn bộ tính năng và bắt đầu sử dụng!

