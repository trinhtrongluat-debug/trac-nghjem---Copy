# HƯỚNG DẪN CHẠY ỨNG DỤNG TẠO ĐỀ TRẮC NGHIỆM AI TRÊN PC

Ứng dụng **SmartExam AI Platform** tải về từ Google AI Studio là một ứng dụng Fullstack (giao diện React 19 + Tailwind CSS, máy chủ Express + Vite + Gemini SDK). 

Dưới đây là các cách khởi động ứng dụng trên máy tính của bạn:

---

## CÁCH 1: KHỞI ĐỘNG DÙNG NỘI BỘ TRÊN MÁY TÍNH (Localhost)
- Nhấp đúp chuột vào file **`CHAY_APP.bat`**.
- Trình duyệt sẽ mở **http://localhost:3000** để bạn tạo đề và xem trước đề thi.

---

## CÁCH 2: KẾT NỐI INTERNET ĐỂ GỬI LINK CHO HỌC SINH Ở XA ⭐ (Khuyên Dùng Khi Tổ Chức Thi)
Tôi đã cấu hình sẵn chế độ kết nối Cloudflare Tunnel bảo mật cao, hoàn toàn miễn phí và không cần mở cổng modem.

1. **Nhấp đúp chuột vào file `CHAY_ONLINE_INTERNET.bat`**.
2. Cửa sổ màu đen sẽ khởi động và tạo một đường link Internet an toàn (HTTPS có chứng chỉ xanh) dạng:
   `https://[chuỗi-ngẫu-nhiên].trycloudflare.com`
3. **Gửi link cho học sinh:**
   - Link phòng thi cho học sinh: **`https://[link-của-bạn]/?exam=MÃ_ĐỀ`**
   - Hoặc bạn chỉ cần vào mục **"Khu Vực 3: Quản Lý Đề Thi & Link Trực Tuyến"**, bấm nút **"Sao chép link"** hoặc **"Mã QR"** — hệ thống sẽ tự động lấy đúng link Internet này để bạn gửi cho học sinh!
4. Học sinh ở bất cứ đâu (dùng 3G/4G/Wi-Fi, điện thoại hoặc máy tính) đều có thể bấm vào link để làm bài ngay.
5. Khi học sinh nộp bài, điểm số và bài nộp sẽ truyền thẳng về máy tính của bạn theo thời gian thực (real-time).

---

## CÁCH 3: CHẠY BẰNG DÒNG LỆNH (TERMINAL / POWERSHELL / CMD)

Mở Terminal trong thư mục dự án và chạy các lệnh sau:

### 1. Khởi động chế độ phát triển (Development):
```bash
npm.cmd run dev
```
*(Lưu ý trên Windows: dùng `npm.cmd` thay vì `npm` nếu PowerShell báo lỗi script execution policy).*

### 2. Mở trình duyệt:
Truy cập vào: **http://localhost:3000**

---

## CẤU HÌNH GEMINI API KEY (ĐỂ SỬ DỤNG TÍNH NĂNG AI)

Để sử dụng các tính năng tạo câu hỏi tự động, giải thích chi tiết, trợ lý từng phần và chuyển văn bản thành giọng nói (TTS):

- **Cách 1 (Thuận tiện nhất):** 
  Vào giao diện web ứng dụng -> chuyển đến **"Khu Vực 5: Cài Đặt Thông Số & Gemini API"** -> Nhập API Key của bạn vào ô **Gemini API Key**. Khóa sẽ được lưu vào trình duyệt của bạn.
- **Cách 2:** 
  Mở file **`.env`** trong thư mục dự án, dán API key của bạn vào:
  ```env
  GEMINI_API_KEY="AIzaSy..."
  PORT=3000
  ```
  *(Bạn có thể lấy Gemini API Key miễn phí tại: [Google AI Studio](https://aistudio.google.com/app/apikey))*

---

## LƯU Ý KHI SỬ DỤNG
- Dữ liệu đề thi và kết quả nộp bài sẽ tự động được lưu vào thư mục `data/` (`exams.json` và `submissions.json`).
- Ứng dụng đã được tích hợp sẵn 1 đề mẫu chất lượng cao để bạn có thể trải nghiệm làm bài thi hoặc chỉnh sửa ngay lập tức.
