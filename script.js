// script.js

// 🔴 BẠN SỬA LINK Ở ĐÂY NHÉ! (Nhớ giữ lại dấu / ở cuối)
const URL = "https://teachablemachine.withgoogle.com/models/DÁN_LINK_CỦA_BẠN_VÀO_ĐÂY/";

let model, webcam, maxPredictions;
let isCameraReady = false;

// Từ điển dữ liệu
const dict = {
    "nhựa": { name: "RÁC NHỰA", action: "Bỏ Thùng Vàng", color: "#00dcff", speak: "Nhựa. Vui lòng bỏ vào thùng màu vàng." },
    "giấy": { name: "RÁC GIẤY", action: "Bỏ Thùng Xanh Dương", color: "#ff9600", speak: "Giấy. Vui lòng bỏ vào thùng màu xanh dương." },
    "kim loại": { name: "KIM LOẠI", action: "Bỏ Thùng Vàng", color: "#00dcff", speak: "Kim loại. Vui lòng bỏ vào thùng màu vàng." },
    "rác điện tử": { name: "ĐIỆN TỬ", action: "Thu Gom Riêng", color: "#0000ff", speak: "Cảnh báo rác nguy hại." },
    "rác hữu cơ": { name: "HỮU CƠ", action: "Bỏ Thùng Xanh Lá", color: "#00ff00", speak: "Rác hữu cơ. Vui lòng bỏ vào thùng xanh lá." },
    "rác vô cơ": { name: "VÔ CƠ", action: "Bỏ Thùng Đỏ", color: "#0064ff", speak: "Rác vô cơ sinh hoạt. Vui lòng bỏ thùng đỏ." }
};

let stats = { "nhựa": 0, "giấy": 0, "kim loại": 0, "rác điện tử": 0, "rác hữu cơ": 0, "rác vô cơ": 0 };
let totalTrash = 0;

// Vẽ UI Thống kê ban đầu
function renderStats() {
    const list = document.getElementById("stats-list");
    list.innerHTML = "";
    for (let key in stats) {
        if(dict[key]) {
            list.innerHTML += `
                <div class="stat-card" style="border-left-color: ${dict[key].color};">
                    <span class="stat-name">${dict[key].name}</span>
                    <span class="stat-value" id="count-${key}">${stats[key]}</span>
                </div>
            `;
        }
    }
}

// Gọi hàm vẽ ngay khi file JS vừa được nạp
renderStats();

// Đọc tiếng Việt bằng Web Speech API
function speakVietnamese(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        window.speechSynthesis.speak(utterance);
    }
}

// Khởi động Camera & Tải Model
async function init() {
    const startBtn = document.getElementById("start-btn");
    startBtn.innerText = "Đang tải AI, đợi xíu...";
    startBtn.disabled = true;

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // Nạp não bộ từ Google
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Bật luồng Camera
    const flip = true; 
    webcam = new tmImage.Webcam(600, 600, flip); 
    await webcam.setup(); 
    await webcam.play();
    window.requestAnimationFrame(loop);

    // Gắn Camera vào giao diện
    document.getElementById("webcam-container").appendChild(webcam.canvas);
    
    // Đổi giao diện nút bấm
    startBtn.style.display = "none";
    document.getElementById("scan-btn").style.display = "block";
    
    const statusBadge = document.getElementById("status-badge");
    statusBadge.innerText = "ĐANG CHỜ";
    statusBadge.style.color = "#00ff00";
    isCameraReady = true;
}

// Vòng lặp cập nhật hình ảnh camera liên tục
async function loop() {
    webcam.update(); 
    window.requestAnimationFrame(loop);
}

// Hàm kích hoạt khi bấm nút Nhận Diện Rác
async function scanTrash() {
    if (!isCameraReady) return;

    const scanBtn = document.getElementById("scan-btn");
    const statusBadge = document.getElementById("status-badge");
    const popup = document.getElementById("result-popup");

    scanBtn.innerText = "⏳ ĐANG PHÂN TÍCH...";
    statusBadge.innerText = "ĐANG PHÂN TÍCH";
    statusBadge.style.color = "yellow";

    // AI dự đoán hình ảnh đang có trên webcam
    const prediction = await model.predict(webcam.canvas);
    
    // Tìm kết quả có độ tin cậy cao nhất
    let bestClass = "";
    let highestProb = 0;
    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            bestClass = prediction[i].className.toLowerCase();
        }
    }

    // Yêu cầu độ tin cậy > 70% và không phải là nền (background)
    if (highestProb > 0.7 && !bestClass.includes("background")) {
        let foundKey = Object.keys(dict).find(k => bestClass.includes(k));
        
        if (foundKey) {
            let info = dict[foundKey];
            let conf = Math.round(highestProb * 100);

            // Cập nhật giao diện Pop-up
            document.getElementById("res-name").innerText = `♻️ ${info.name} (${conf}%)`;
            document.getElementById("res-name").style.color = info.color;
            document.getElementById("res-action").innerText = `Hướng dẫn: ${info.action}`;
            popup.style.borderColor = info.color;
            popup.style.display = "block";

            // Đổi trạng thái
            statusBadge.innerText = "ĐÃ NHẬN DIỆN";
            statusBadge.style.color = "#00dcff";

            // Cộng điểm thống kê
            stats[foundKey]++;
            totalTrash++;
            document.getElementById(`count-${foundKey}`).innerText = stats[foundKey];
            document.getElementById("total-count").innerText = totalTrash;

            // Phát giọng nói hướng dẫn
            speakVietnamese(info.speak);

            // Tự động tắt popup sau 4 giây để chờ quét rác tiếp theo
            setTimeout(() => {
                popup.style.display = "none";
                statusBadge.innerText = "ĐANG CHỜ";
                statusBadge.style.color = "#00ff00";
                scanBtn.innerText = "🎯 NHẬN DIỆN RÁC";
            }, 4000);
            return;
        }
    }
    
    // Rơi vào đây nếu hệ thống nhìn mờ, không chắc chắn
    speakVietnamese("Không nhận diện được vật thể. Vui lòng thử lại.");
    scanBtn.innerText = "🎯 NHẬN DIỆN RÁC";
    statusBadge.innerText = "ĐANG CHỜ";
    statusBadge.style.color = "#00ff00";
}
