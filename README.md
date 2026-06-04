# ♻️ SmartBin Kiosk - AI Trash Classification & Gamification (PTIT)

Hệ thống nhận diện và phân loại rác thải thông minh theo thời gian thực sử dụng Trí tuệ nhân tạo (AI). Đồ án ứng dụng Computer Vision chạy trực tiếp trên trình duyệt web. Phiên bản mới tích hợp hệ thống điểm thưởng sinh thái và cửa hàng quy đổi quà tặng thực tế.

## 🌟 Chức năng nổi bật

Dự án không chỉ sử dụng AI nhận diện hình ảnh cơ bản mà còn được tích hợp các thuật toán xử lý luồng camera nâng cao và hệ thống Gamification tương tác:

*   **🏃 Nhận diện chuyển động (Motion Detection):** Tự động tính toán sự thay đổi pixel (Pixel Diff) trong khung hình. Khi có vật thể (rác) chuyển động vào vùng quét, hệ thống mới kích hoạt AI để phân tích, giúp tiết kiệm tài nguyên xử lý.
*   **🤖 Chế độ tự động (Auto Mode):** Hỗ trợ bật/tắt tính năng tự động quét. Khi phát hiện vật thể đứng yên đủ lâu (800ms), hệ thống sẽ tự động chụp ảnh và phân tích mà không cần người dùng bấm nút.
*   **🎯 Nhận diện theo Vùng quan tâm (ROI Crop):** Thay vì đưa toàn bộ khung hình camera vào AI gây nhiễu, hệ thống chỉ cắt đúng vùng viền nét đứt ở giữa màn hình (ROI) để phân tích, tăng độ chính xác lên mức tối đa.
*   **📊 Biểu đồ tỷ lệ (Confidence Bars Real-time):** Hiển thị trực tiếp phần trăm độ tin cậy của mô hình AI cho từng loại rác theo thời gian thực.
*   **🔊 Tương tác giọng nói Tiếng Việt:** AI tự động đọc tên loại rác và hướng dẫn bỏ vào đúng thùng bằng giọng nói Tiếng Việt.
*   **📖 Hướng dẫn xử lý & Tra cứu Wikipedia:** Hệ thống cung cấp các bước xử lý rác chi tiết, mẹo bảo vệ môi trường, hiển thị cảnh báo mức độ nguy hại (Thấp, Trung bình, Rất cao). Tự động tạo mã QR trỏ đến trang Wikipedia của vật liệu để tra cứu.
*   **🎁 Hệ thống Tích điểm & Cửa hàng Đổi quà (Gamification):** 
    *   Người dùng nhận được điểm thưởng khi phân loại rác thành công. 
    *   Điểm thưởng được cộng dồn (Bonus) nếu người dùng phân loại với độ chính xác cao hoặc duy trì chuỗi liên tục (Streak bonus). 
    *   Cửa hàng trực tuyến với 4 danh mục (Voucher, Vật phẩm, Eco, Đặc biệt) cho phép quy đổi điểm xanh thành mã quà tặng thực tế.
*   **📈 Thống kê & Phân cấp (Ranking):** Lưu trữ lịch sử các lần quét gần nhất và phân cấp danh hiệu người dùng (từ "Tân Binh Xanh" đến "Vệ Sĩ Trái Đất") dựa trên tổng điểm tích lũy.

## 🗑️ Danh mục rác hỗ trợ (7 Phân loại)

Hệ thống được huấn luyện để nhận diện 7 loại rác thải sinh hoạt cơ bản, đi kèm mức điểm thưởng và đánh giá mức rủi ro môi trường:

1.  **Nhựa:** Bỏ thùng vàng, thưởng 10 điểm, rủi ro Thấp.
2.  **Giấy:** Bỏ thùng xanh dương, thưởng 8 điểm, rủi ro Thấp.
3.  **Kim Loại:** Bỏ thùng vàng, thưởng 15 điểm, rủi ro Thấp.
4.  **Thủy Tinh:** Bỏ thùng vàng (cẩn thận vỡ), thưởng 12 điểm, rủi ro Trung bình.
5.  **Rác Điện Tử:** Thu gom riêng biệt, thưởng 20 điểm, rủi ro Rất cao.
6.  **Rác Hữu Cơ:** Bỏ thùng xanh lá, thưởng 5 điểm, rủi ro Thấp.
7.  **Rác Vô Cơ:** Bỏ thùng đỏ, thưởng 3 điểm, rủi ro Thấp.

## 🛠️ Công nghệ sử dụng

*   **Frontend:** HTML5, CSS3, JavaScript ES6.
*   **AI Engine:** TensorFlow.js (`tfjs`) kết hợp mô hình học máy của Teachable Machine.
*   **Libraries:** `teachablemachine-image`, `qrcodejs` (Tạo QR Code tự động).
*   **Trình duyệt:** Sử dụng WebRTC để truy cập Webcam.

## 🚀 Hướng dẫn cài đặt & Chạy dự án

Vì dự án chạy thuần 100% trên trình duyệt (Client-side), bạn không cần cài đặt Backend hay Database.

1.  Clone kho lưu trữ này về máy:
```bash
    git clone [https://github.com/hbui69509-sudo/SmartBIN000.git](https://github.com/hbui69509-sudo/SmartBIN000.git)
    ```
2.  Sử dụng **Live Server** (Extention của VS Code) để mở file `index.html`.
    *(Lưu ý: Camera yêu cầu trình duyệt phải chạy trên nền tảng `localhost` hoặc `https://`).*
3.  Cho phép trình duyệt truy cập Camera.
4.  Đưa rác vào vùng khung viền nét đứt trên màn hình và thu thập điểm thưởng xanh!
