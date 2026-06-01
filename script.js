
const URL = "https://teachablemachine.withgoogle.com/models/eUC93yBYY/";

let model, webcam, maxPredictions;
let isCameraReady = false;

// 1. TỪ ĐIỂN DỮ LIỆU (Đã bổ sung Thủy Tinh)
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
// Vẽ luôn khi trang vừa load
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
        // Tải Model
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Bật Webcam
