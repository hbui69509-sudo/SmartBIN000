# ♻️ SmartBin Kiosk - AI Trash Classification (PTIT)

Hệ thống nhận diện và phân loại rác thải thông minh theo thời gian thực sử dụng Trí tuệ nhân tạo (AI). Đồ án ứng dụng Computer Vision chạy trực tiếp trên trình duyệt web.

## 🌟 Chức năng nổi bật

Dự án không chỉ sử dụng AI nhận diện hình ảnh cơ bản mà còn được tích hợp các thuật toán xử lý luồng camera nâng cao:

*   **🏃 Nhận diện chuyển động (Motion Detection):** Tự động tính toán sự thay đổi pixel (Pixel Diff) trong khung hình. Khi có vật thể (rác) chuyển động vào vùng quét, hệ thống mới kích hoạt AI để phân tích, giúp tiết kiệm tài nguyên xử lý[cite: 1].
*   **🤖 Chế độ tự động (Auto Mode):** Hỗ trợ bật/tắt tính năng tự động quét. Khi phát hiện vật thể đứng yên đủ lâu (600ms), hệ thống sẽ tự động chụp ảnh và phân tích mà không cần bấm nút[cite: 1].
*   **🎯 Nhận diện theo Vùng quan tâm (ROI Crop):** Thay vì đưa toàn bộ khung hình camera vào AI gây nhiễu, hệ thống chỉ cắt đúng vùng viền nét đứt ở giữa màn hình (ROI) để phân tích, tăng độ chính xác lên mức tối đa[cite: 1].
*   **📊 Biểu đồ tỷ lệ (Confidence Bars Real-time):** Hiển thị trực tiếp phần trăm độ tin cậy của mô hình AI cho từng loại rác theo thời gian thực (60 FPS)[cite: 1, 2].
*   **🔊 Tương tác giọng nói Tiếng Việt:** AI tự động đọc tên loại rác và hướng dẫn bỏ vào đúng thùng (Thùng vàng, Xanh lá, Đỏ...) bằng giọng nói Tiếng Việt[cite: 1].
*   **📱 Tra cứu Wikipedia (QR Code):** Sau khi nhận diện thành công, hệ thống tự động tạo mã QR trỏ đến trang Wikipedia của vật liệu đó để người dùng tra cứu kiến thức. Bảng mã QR sẽ duy trì hiển thị cho đến khi người dùng chủ động tắt[cite: 1, 2].
*   **📈 Thống kê & Lịch sử:** Lưu trữ lịch sử các lần quét gần nhất cùng mốc thời gian thực và đếm tổng số lượng từng loại rác đã nhận diện[cite: 1, 2].

## 🗑️ Danh mục rác hỗ trợ (7 Lớp)

Hệ thống được huấn luyện để nhận diện 7 loại rác thải sinh hoạt cơ bản:
1.  **Nhựa** 🧴 (Bỏ thùng vàng)[cite: 1]
2.  **Giấy** 📄 (Bỏ thùng xanh dương)[cite: 1]
3.  **Kim loại** 🔩 (Bỏ thùng vàng)[cite: 1]
4.  **Thủy tinh** 🍾 (Cẩn thận rơi vỡ, Bỏ thùng vàng)[cite: 1]
5.  **Rác điện tử** 📱 (Rác nguy hại, Thu gom riêng)[cite: 1]
6.  **Rác hữu cơ** 🍃 (Bỏ thùng xanh lá)[cite: 1]
7.  **Rác vô cơ** 🗑️ (Bỏ thùng đỏ)[cite: 1]

## 🛠️ Công nghệ sử dụng

*   **Frontend:** HTML5, CSS3, JavaScript ES6.
*   **AI Engine:** TensorFlow.js (`tfjs`)[cite: 2] kết hợp mô hình học máy của Teachable Machine.
*   **Libraries:** `teachablemachine-image`, `qrcodejs` (Tạo QR Code tự động)[cite: 2].
*   **Trình duyệt:** Sử dụng WebRTC để truy cập Webcam[cite: 1].

## 🚀 Hướng dẫn cài đặt & Chạy dự án

Vì dự án chạy thuần 100% trên trình duyệt (Client-side), bạn không cần cài đặt Backend hay Database.

1.  Clone kho lưu trữ này về máy:
```bash
    git clone [https://hbui69509-sudo.github.io/SmartBIN000/
    ```
2.  Sử dụng **Live Server** (Extention của VS Code) để mở file `index.html`.
    *(Lưu ý: Camera yêu cầu trình duyệt phải chạy trên nền tảng `localhost` hoặc `https://`).*
3.  Cho phép trình duyệt truy cập Camera.
4.  Đưa rác vào vùng khung viền nét đứt trên màn hình và trải nghiệm!
