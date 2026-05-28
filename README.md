## ♻️ SmartBin - Hệ thống hỗ trợ phân loại rác tại nguồn thông minh (AIoT)

> **Học phần:** Nhập môn AIoT (Artificial Intelligence of Things)  
> **Học viện:** Học viện Công nghệ Bưu chính Viễn thông (PTIT)

---

## 📖 1. Tổng quan dự án (Abstract)
**SmartBin** là dự án ứng dụng Thị giác máy tính (Computer Vision) kết hợp công nghệ Web để giải quyết bài toán phân loại rác thải tại nguồn. Hệ thống cho phép nhận diện các loại vật liệu rác thải theo thời gian thực (Real-time) thông qua camera, từ đó đưa ra hướng dẫn phân loại bằng hình ảnh và giọng nói tiếng Việt nhằm hỗ trợ người dùng vứt rác đúng quy định.

## ⚙️ 2. Kiến trúc hệ thống (System Architecture)
Hệ thống được thiết kế theo mô hình Edge Computing (xử lý tại biên - ngay trên trình duyệt máy khách) để tối ưu hóa tốc độ phản hồi và bảo mật dữ liệu người dùng.

* **Thu thập dữ liệu (Data Collection):** Sử dụng Webcam để bắt khung hình (frames) liên tục ở tốc độ 30 FPS.
* **Mô hình Trí tuệ nhân tạo (AI Model):** Sử dụng mạng nơ-ron tích chập (CNN) được huấn luyện qua nền tảng Google Teachable Machine. Mô hình được xuất ra dưới định dạng `TensorFlow.js`.
* **Giao diện & Logic (Frontend & Control Logic):** Xây dựng bằng HTML/CSS/JS thuần. Tích hợp thuật toán lọc nhiễu (chỉ nhận diện khi Confidence Score > 85%) và tránh cảnh báo lặp (Debouncing).
* **Tương tác người - máy (HCI):** Sử dụng `Web Speech API` để chuyển đổi văn bản thành giọng nói (Text-to-Speech) hướng dẫn người dùng.

## 🌟 3. Các tính năng chính (Key Features)
- [x] **Nhận diện Real-time đa lớp:** Phân loại chính xác 4 nhóm rác chính (Nhựa, Giấy, Kim loại, Rác nguy hại/Điện tử).
- [x] **Xử lý nhiễu bối cảnh:** Được huấn luyện lớp `Background` chuyên biệt (người dùng tay không/bối cảnh phòng) để triệt tiêu hiện tượng nhận diện sai (False Positive).
- [x] **Trợ lý giọng nói (Voice Assistant):** Tự động phát âm thanh hướng dẫn bằng tiếng Việt phù hợp với từng loại rác.
- [x] **Bảng thống kê (Dashboard):** Ghi nhận và đếm số lượng các loại rác đã được phân loại trong phiên sử dụng.

## 🛠️ 4. Công nghệ sử dụng (Technologies Stack)
* **Core AI:** Google Teachable Machine, TensorFlow.js
* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **API tích hợp:** Web Speech API (Text-to-Speech)
* **Triển khai (Deployment):** GitHub Pages

## 🚀 5. Hướng dẫn cài đặt & Chạy thử nghiệm (Usage)
1. Clone repository này về máy tính:
```bash
git clone [https://github.com/hbui69509-sudo/SmartBIN000.git](https://github.com/hbui69509-sudo/SmartBIN000.git)
