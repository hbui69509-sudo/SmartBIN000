// Link mô hình của bạn đã được dán sẵn
const URL = "https://teachablemachine.withgoogle.com/models/eUC93yBYY/";

let model, webcam, maxPredictions;
let isCameraReady = false;

// 1. TỪ ĐIỂN DỮ LIỆU
const dict = {
    "nhựa": { name: "RÁC NHỰA", action: "Bỏ Thùng Vàng", color: "#00dcff", speak: "Nhựa. Vui lòng bỏ vào thùng màu vàng." },
    "giấy": { name: "RÁC GIẤY", action: "Bỏ Thùng Xanh Dương", color: "#ff9600", speak: "Giấy. Vui lòng bỏ vào thùng màu xanh dương." },
    "kim loại": { name: "KIM LOẠI", action: "Bỏ Thùng Vàng", color: "#00dcff", speak: "Kim loại. Vui lòng bỏ vào thùng màu vàng." },
    "thủy tinh": { name: "THỦY TINH", action: "Cẩn thận rơi vỡ", color: "#00dcff", speak: "Thủy tinh. Cẩn thận rơi vỡ, bỏ vào thùng vàng." },
    "rác điện tử": { name: "ĐIỆN TỬ", action: "Thu Gom Riêng", color: "#0000ff", speak: "Cảnh báo rác nguy hại." },
    "rác hữu cơ": { name: "HỮU CƠ", action: "Bỏ Thùng Xanh Lá", color: "#00ff00", speak: "Rác hữu cơ. Vui lòng bỏ vào thùng xanh lá." },
    "rác vô cơ": { name: "VÔ CƠ", action: "Bỏ Thùng Đỏ", color: "#0064ff", speak: "Rác vô cơ sinh hoạt. Vui lòng bỏ thùng đỏ." }
};

// 2. KHỞI TẠO BỘ ĐẾM THỐNG KÊ
let stats = { "nhựa": 0, "giấy": 0, "kim loại": 0, "thủy tinh": 0, "rác điện tử": 0, "rác hữu cơ": 0, "rác vô cơ": 0 };
let totalTrash = 0;

// 3. VẼ GIAO DIỆN THỐNG KÊ LÊN HTML
function renderStats() {
    const list = document.getElementById("stats-list");
    if (!list) return; // Tránh lỗi nếu chưa load xong HTML
    
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
// Vẽ luôn bảng thống kê
renderStats();

// 4. HỆ THỐNG PHÁT ÂM THANH TIẾNG VIỆT
function speakVietnamese(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        window.speechSynthesis.speak(utterance);
    }
}

// 5. KHỞI ĐỘNG CAMERA & TẢI NÃO AI
async function init() {
    const startBtn = document.getElementById("start-btn");
    startBtn.innerText = "Đang tải AI, đợi xíu...";
    startBtn.disabled = true;

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        const flip = true; 
        webcam = new tmImage.Webcam(600, 600, flip); 
        await webcam.setup(); 
        await webcam.play();
        window.requestAnimationFrame(loop);

        document.getElementById("webcam-container").appendChild(webcam.canvas);
        
        startBtn.style.display = "none";
        document.getElementById("scan-btn").style.display = "block";
        
        const statusBadge = document.getElementById("status-badge");
        statusBadge.innerText = "ĐANG CHỜ";
        statusBadge.style.color = "#00ff00";
        isCameraReady = true;

    } catch (error) {
        alert("Lỗi tải Model! Hãy kiểm tra lại mạng hoặc quyền Camera.");
        console.error(error);
        startBtn.innerText = "Lỗi kết nối. F5 thử lại.";
    }
}

// Vòng lặp cập nhật khung hình
async function loop() {
    webcam.update(); 
    window.requestAnimationFrame(loop);
}

// 6. XỬ LÝ KHI BẤM NÚT NHẬN DIỆN
async function scanTrash() {
    if (!isCameraReady) return;

    const scanBtn = document.getElementById("scan-btn");
    const statusBadge = document.getElementById("status-badge");
    const popup = document.getElementById("result-popup");

    scanBtn.innerText = "⏳ ĐANG PHÂN TÍCH...";
    statusBadge.innerText = "ĐANG PHÂN TÍCH";
    statusBadge.style.color = "yellow";

    const prediction = await model.predict(webcam.canvas);
    
    let bestClass = "";
    let highestProb = 0;
    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            bestClass = prediction[i].className.toLowerCase();
        }
    }

    if (highestProb > 0.70 && !bestClass.includes("background")) {
        let foundKey = Object.keys(dict).find(k => bestClass.includes(k));
        
        if (foundKey) {
            let info = dict[foundKey];
            let conf = Math.round(highestProb * 100);

            document.getElementById("res-name").innerText = `♻️ ${info.name} (${conf}%)`;
            document.getElementById("res-name").style.color = info.color;
            document.getElementById("res-action").innerText = `Hướng dẫn: ${info.action}`;
            popup.style.borderColor = info.color;
            popup.style.display = "block";

            statusBadge.innerText = "ĐÃ NHẬN DIỆN";
            statusBadge.style.color = "#00dcff";

            stats[foundKey]++;
            totalTrash++;
            document.getElementById(`count-${foundKey}`).innerText = stats[foundKey];
            document.getElementById("total-count").innerText = totalTrash;

            speakVietnamese(info.speak);

            setTimeout(() => {
                popup.style.display = "none";
                statusBadge.innerText = "ĐANG CHỜ";
                statusBadge.style.color = "#00ff00";
                scanBtn.innerText = "🎯 NHẬN DIỆN RÁC";
            }, 4000);
            
            return;
        }
    }
    
    speakVietnamese("Không nhận diện được vật thể rõ ràng. Vui lòng thử lại.");
    scanBtn.innerText = "🎯 NHẬN DIỆN RÁC";
    statusBadge.innerText = "ĐANG CHỜ";
    statusBadge.style.color = "#00ff00";
}
