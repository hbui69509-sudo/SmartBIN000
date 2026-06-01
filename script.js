// LINK CỦA BẠN ĐÃ ĐƯỢC CHÈN SẴN VÀO ĐÂY
const URL = "https://teachablemachine.withgoogle.com/models/eUC93yBYY/";

let model, webcam, maxPredictions;
let isCameraReady = false;

const dict = {
    "nhựa": { name: "RÁC NHỰA", action: "Bỏ Thùng Vàng", color: "#00dcff", speak: "Nhựa. Vui lòng bỏ vào thùng màu vàng." },
    "giấy": { name: "RÁC GIẤY", action: "Bỏ Thùng Xanh Dương", color: "#ff9600", speak: "Giấy. Vui lòng bỏ vào thùng màu xanh dương." },
    "kim loại": { name: "KIM LOẠI", action: "Bỏ Thùng Vàng", color: "#00dcff", speak: "Kim loại. Vui lòng bỏ vào thùng màu vàng." },
    "thủy tinh": { name: "THỦY TINH", action: "Cẩn thận rơi vỡ", color: "#00dcff", speak: "Thủy tinh. Cẩn thận rơi vỡ, bỏ vào thùng vàng." },
    "rác điện tử": { name: "ĐIỆN TỬ", action: "Thu Gom Riêng", color: "#0000ff", speak: "Cảnh báo rác nguy hại." },
    "rác hữu cơ": { name: "HỮU CƠ", action: "Bỏ Thùng Xanh Lá", color: "#00ff00", speak: "Rác hữu cơ. Vui lòng bỏ vào thùng xanh lá." },
    "rác vô cơ": { name: "VÔ CƠ", action: "Bỏ Thùng Đỏ", color: "#0064ff", speak: "Rác vô cơ sinh hoạt. Vui lòng bỏ thùng đỏ." }
};

let stats = { "nhựa": 0, "giấy": 0, "kim loại": 0, "thủy tinh": 0, "rác điện tử": 0, "rác hữu cơ": 0, "rác vô cơ": 0 };
let totalTrash = 0;

function renderStats() {
    const list = document.getElementById("stats-list");
    if (!list) return; 
    
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
renderStats();

// NẠP DANH SÁCH GIỌNG NÓI CỦA TRÌNH DUYỆT
let availableVoices = [];
window.speechSynthesis.onvoiceschanged = () => {
    availableVoices = window.speechSynthesis.getVoices();
};

function speakVietnamese(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.0; 
        
        let voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
        let viVoice = voices.find(voice => voice.lang.includes('vi') || voice.name.includes('Vietnamese') || voice.name.includes('Google tiếng Việt'));
        
        if (viVoice) utterance.voice = viVoice;

        window.speechSynthesis.speak(utterance);
    }
}

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
        
        // Hiện khung ngắm ROI sau khi camera lên
        document.getElementById("roi-box").style.display = "block";
        
        startBtn.style.display = "none";
        document.getElementById("scan-btn").style.display = "block";
        
        const statusBadge = document.getElementById("status-badge");
        statusBadge.innerText = "ĐANG CHỜ";
        statusBadge.style.color = "#00ff00";
        isCameraReady = true;

    } catch (error) {
        alert("Lỗi tải Model! Kiểm tra mạng hoặc cấp quyền Camera.");
        startBtn.innerText = "Lỗi kết nối. F5 thử lại.";
    }
}

async function loop() {
    webcam.update(); 
    window.requestAnimationFrame(loop);
}

// HÀM QUÉT RÁC THEO VÙNG KHUNG NGẮM (ROI)
async function scanTrash() {
    if (!isCameraReady) return;

    const scanBtn = document.getElementById("scan-btn");
    const statusBadge = document.getElementById("status-badge");
    const popup = document.getElementById("result-popup");
    const roiBox = document.getElementById("roi-box");

    // Bật hiệu ứng quét nhấp nháy trên viền khung
    roiBox.classList.add("scanning");
    scanBtn.innerText = "⏳ ĐANG PHÂN TÍCH...";
    statusBadge.innerText = "ĐANG PHÂN TÍCH";
    statusBadge.style.color = "yellow";

    // 1. Cắt ảnh 300x300 ngay giữa tâm Camera
    const roiSize = 300;
    const startX = (webcam.canvas.width - roiSize) / 2;
    const startY = (webcam.canvas.height - roiSize) / 2;

    const hiddenCanvas = document.createElement("canvas");
    hiddenCanvas.width = roiSize;
    hiddenCanvas.height = roiSize;
    const ctx = hiddenCanvas.getContext("2d");
    
    ctx.drawImage(webcam.canvas, startX, startY, roiSize, roiSize, 0, 0, roiSize, roiSize);

    // 2. Gửi mảnh ảnh đã cắt (chỉ chứa rác) cho AI phân tích
    const prediction = await model.predict(hiddenCanvas);
    
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
                roiBox.classList.remove("scanning"); // Tắt hiệu ứng
            }, 4000);
            
            return;
        }
    }
    
    speakVietnamese("Không nhận diện được vật thể rõ ràng. Vui lòng thử lại.");
    scanBtn.innerText = "🎯 NHẬN DIỆN RÁC";
    statusBadge.innerText = "ĐANG CHỜ";
    statusBadge.style.color = "#00ff00";
    roiBox.classList.remove("scanning"); 
}
