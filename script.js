// ============================================================
//  SMARTBIN KIOSK — script.js 
//  Tính năng:
//    ✅ Motion detection → tự động scan khi phát hiện vật thể
//    ✅ Scan liên tục (confidence bars realtime)
//    ✅ QR code Wikipedia sau mỗi lần nhận diện
//    ✅ ROI crop đúng tọa độ (canvas mirror fix)
//    ✅ Match class linh hoạt (có dấu / không dấu / tiếng Anh)
// ============================================================

const MODEL_URL            = "https://teachablemachine.withgoogle.com/models/JjOjDvCvT/";
const CONFIDENCE_THRESHOLD = 0.50;   // Chỉnh tuỳ model (0.0 – 1.0)
const ROI_RATIO            = 0.50;   // ROI = 50% cạnh ngắn canvas
const MAX_HISTORY          = 5;

// Motion detection settings
const MOTION_THRESHOLD     = 10;     // pixel diff để tính là "thay đổi" (0-255)
const MOTION_TRIGGER_PCT   = 3;      // % pixels thay đổi → kích hoạt (hạ xuống 3% cho dễ trigger)
const MOTION_STILL_PCT     = 1.5;    // % dưới mức này = vật thể đã đứng yên → scan
const MOTION_COOLDOWN_MS   = 4000;   // ms chờ sau mỗi lần scan auto
const MOTION_CONFIRM_MS    = 800;    // ms theo dõi sau khi phát hiện chuyển động

// ---------- State ----------
let model, webcam, maxPredictions;
let isCameraReady = false;
let isScanning    = false;

let autoMode      = false;
let prevFrameData = null;
let motionTimer   = null;
let lastAutoScan  = 0;
let motionPct     = 0;
let motionDetected = false;   // true = đã thấy vật thể vào khung, đang chờ đứng yên

let qrInstance    = null;
let popupTimer    = null;

// ---------- Danh mục rác ----------
const TRASH_DICT = {
    "Nhựa":        { name:"Nhựa",   action:"Bỏ Thùng Vàng",          color:"#00d4ff", icon:"🧴", wiki:"Nhựa",
                     speak:"Nhựa. Vui lòng bỏ vào thùng màu vàng.",
                     points: 10,
                     steps: ["Rửa sạch chai lọ, hộp nhựa trước khi bỏ", "Loại bỏ nắp kim loại nếu có", "Bỏ vào thùng tái chế màu vàng", "Nhựa PET, HDPE có thể tái chế thành quần áo, đồ dùng mới"],
                     tip: "♻️ 1 chai nhựa tái chế = tiết kiệm đủ điện để chạy bóng đèn 6 tiếng!",
                     risk: "Thấp" },
    "Giấy":        { name:"Giấy",   action:"Bỏ Thùng Xanh Dương",    color:"#ff8c00", icon:"📄", wiki:"Giấy",
                     speak:"Giấy. Vui lòng bỏ vào thùng màu xanh dương.",
                     points: 8,
                     steps: ["Giữ giấy khô ráo, không dính ướt", "Xếp gọn, tháo ghim, kẹp kim loại", "Bỏ vào thùng xanh dương hoặc giao cho vựa ve chai", "Carton, báo, giấy văn phòng đều tái chế được"],
                     tip: "🌳 Tái chế 1 tấn giấy = cứu 17 cây xanh và 26.000 lít nước!",
                     risk: "Thấp" },
    "Kim Loại":    { name:"Kim Loại",   action:"Bỏ Thùng Vàng",          color:"#c0c8e0", icon:"🔩", wiki:"Kim_loại",
                     speak:"Kim loại. Vui lòng bỏ vào thùng màu vàng.",
                     points: 15,
                     steps: ["Rửa sạch lon, hộp thiếc trước khi bỏ", "Có thể bóp dẹp để tiết kiệm chỗ", "Bỏ vào thùng tái chế màu vàng", "Kim loại có thể tái chế vô hạn lần mà không mất chất lượng"],
                     tip: "⚡ Tái chế 1 lon nhôm tiết kiệm điện bằng xem TV 3 tiếng!",
                     risk: "Thấp" },
    "Thủy Tinh":   { name:"Thủy Tinh",  action:"Cẩn thận, Bỏ Thùng Vàng",color:"#a0c8ff", icon:"🍾", wiki:"Thủy_tinh",
                     speak:"Thủy tinh. Cẩn thận rơi vỡ, bỏ vào thùng vàng.",
                     points: 12,
                     steps: ["⚠️ Cẩn thận mảnh vỡ sắc nhọn", "Rửa sạch bên trong chai lọ", "Đặt nhẹ nhàng vào thùng, không ném mạnh", "Thủy tinh có thể tái chế 100%, giữ nguyên chất lượng mãi mãi"],
                     tip: "🔄 Thủy tinh là vật liệu tái chế hoàn hảo nhất — không bao giờ giảm chất lượng!",
                     risk: "Trung bình" },
    "Rác Điện Tử": { name:"Rác Điện Tử",    action:"Thu Gom Riêng",           color:"#ff3d5a", icon:"📱", wiki:"Rác_thải_điện_tử",
                     speak:"Cảnh báo. Rác điện tử nguy hại, cần thu gom riêng.",
                     points: 20,
                     steps: ["⛔ KHÔNG bỏ vào thùng thường — rất nguy hiểm!", "Xóa dữ liệu cá nhân trước khi bỏ", "Mang đến điểm thu gom rác điện tử chuyên dụng", "Liên hệ nhà sản xuất hoặc chuỗi điện máy để thu hồi miễn phí"],
                     tip: "☠️ Pin và vi mạch chứa chì, thủy ngân — gây ung thư nếu thấm vào đất nước!",
                     risk: "Rất cao" },
    "Rác Hữu Cơ":  { name:"Rác Hữu Cơ",    action:"Bỏ Thùng Xanh Lá",       color:"#00e87a", icon:"🍃", wiki:"Chất_thải_hữu_cơ",
                     speak:"Rác hữu cơ. Vui lòng bỏ vào thùng xanh lá.",
                     points: 5,
                     steps: ["Bỏ vào thùng màu xanh lá chuyên rác hữu cơ", "Có thể ủ phân compost tại nhà", "Vỏ trái cây, thức ăn thừa đều phân hủy tự nhiên", "Tuyệt đối không trộn với rác nhựa hoặc rác nguy hại"],
                     tip: "🌱 Rác hữu cơ ủ thành phân compost = phân bón tự nhiên siêu tốt cho cây!",
                     risk: "Thấp" },
    "Rác Vô Cơ":   { name:"Rác Vô Cơ",     action:"Bỏ Thùng Đỏ",            color:"#4d8cff", icon:"🗑️", wiki:"Rác_thải",
                     speak:"Rác vô cơ sinh hoạt. Vui lòng bỏ thùng đỏ.",
                     points: 3,
                     steps: ["Bỏ vào thùng rác màu đỏ hoặc đen (rác thải thông thường)", "Buộc chặt túi rác trước khi bỏ", "Sẽ được thu gom và xử lý tại bãi chôn lấp", "Cố gắng giảm thiểu loại rác này trong sinh hoạt hàng ngày"],
                     tip: "💡 Tip: Thay thế đồ nhựa dùng một lần bằng sản phẩm tái sử dụng để giảm rác vô cơ!",
                     risk: "Thấp" }
};

// ---------- Hệ thống tích điểm ----------
const POINT_RANKS = [
    { min: 0,    label: "🌱 Tân Binh Xanh",     color: "#6b6b80" },
    { min: 50,   label: "🌿 Người Bảo Vệ",       color: "#00e87a" },
    { min: 150,  label: "♻️ Chiến Binh Tái Chế", color: "#00d4ff" },
    { min: 300,  label: "⭐ Anh Hùng Môi Trường", color: "#ffc800" },
    { min: 500,  label: "🏆 Huyền Thoại Xanh",   color: "#ff8c00" },
    { min: 1000, label: "🌍 Vệ Sĩ Trái Đất",     color: "#ff3d5a" },
];

let totalPoints = 0;
let currentStreak = 0;
let lastScanTime = 0;
const STREAK_TIMEOUT_MS = 30000; // 30 giây để duy trì chuỗi

const CLASS_ALIASES = {
    "plastic":"nhựa","paper":"giấy","metal":"kim loại","glass":"thủy tinh",
    "electronic":"rác điện tử","organic":"rác hữu cơ","inorganic":"rác vô cơ",
    "nhua":"nhựa","giay":"giấy","kim loai":"kim loại","thuy tinh":"thủy tinh",
    "huu co":"rác hữu cơ","vo co":"rác vô cơ","dien tu":"rác điện tử"
};

let stats = {};
Object.keys(TRASH_DICT).forEach(k => stats[k] = 0);
let totalTrash = 0;
let scanHistory = [];

// ============================================================
//  POINTS SYSTEM
// ============================================================
function getCurrentRank() {
    let rank = POINT_RANKS[0];
    for (const r of POINT_RANKS) {
        if (totalPoints >= r.min) rank = r;
    }
    return rank;
}

function getNextRank() {
    for (let i = 0; i < POINT_RANKS.length; i++) {
        if (totalPoints < POINT_RANKS[i].min) return POINT_RANKS[i];
    }
    return null;
}

function addPoints(key, conf) {
    const info = TRASH_DICT[key];
    const base = info.points;
    // Bonus điểm: streak và confidence cao
    const confBonus = conf >= 90 ? 5 : conf >= 75 ? 2 : 0;
    const streakBonus = currentStreak > 1 ? Math.min(currentStreak - 1, 5) : 0;
    const earned = base + confBonus + streakBonus;
    totalPoints += earned;
    return { earned, base, confBonus, streakBonus };
}

function updateStreak() {
    const now = Date.now();
    if (now - lastScanTime < STREAK_TIMEOUT_MS) {
        currentStreak++;
    } else {
        currentStreak = 1;
    }
    lastScanTime = now;
}

function renderPointsPanel() {
    const panel = document.getElementById("points-panel");
    if (!panel) return;
    const rank = getCurrentRank();
    const next = getNextRank();
    const progress = next
        ? ((totalPoints - rank.min) / (next.min - rank.min)) * 100
        : 100;
    panel.innerHTML = `
        <div class="points-header">
            <div class="points-total">
                <span class="pts-number">${totalPoints}</span>
                <span class="pts-label">ĐIỂM</span>
            </div>
            <div class="rank-badge" style="color:${rank.color};border-color:${rank.color}22;background:${rank.color}11">
                ${rank.label}
            </div>
        </div>
        <div class="points-progress-wrap">
            <div class="pts-progress-track">
                <div class="pts-progress-fill" style="width:${Math.min(progress,100)}%;background:${rank.color};box-shadow:0 0 10px ${rank.color}66"></div>
            </div>
            <span class="pts-next">${next ? `${totalPoints}/${next.min} → ${next.label}` : '🏆 Đã đạt cấp cao nhất!'}</span>
        </div>
        ${currentStreak > 1 ? `<div class="streak-badge">🔥 Chuỗi x${currentStreak} — +${Math.min(currentStreak-1,5)} bonus!</div>` : ''}
    `;
}

function showPointsToast(pts, streakBonus, confBonus) {
    const toast = document.getElementById("points-toast");
    if (!toast) return;
    let msg = `+${pts} điểm`;
    const extras = [];
    if (confBonus > 0) extras.push(`🎯 Độ chính xác cao +${confBonus}`);
    if (streakBonus > 0) extras.push(`🔥 Streak +${streakBonus}`);
    toast.innerHTML = `<span class="toast-pts">${msg}</span>${extras.length ? `<span class="toast-bonus">${extras.join(' · ')}</span>` : ''}`;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2500);
}



// ============================================================
//  UI HELPERS
// ============================================================
function setStatus(text, type = "") {
    document.getElementById("status-badge").innerText = text;
    document.getElementById("status-dot").className = "status-dot " + type;
}

function renderStats() {
    const list = document.getElementById("stats-list");
    if (!list) return;
    list.innerHTML = Object.entries(TRASH_DICT).map(([key, info]) => `
        <div class="stat-card" style="border-left-color:${info.color}">
            <span class="stat-name">${info.icon} ${info.name}</span>
            <div class="stat-right">
                <span class="stat-pts" style="color:${info.color}88">+${info.points}pts</span>
                <span class="stat-value" id="cnt-${eid(key)}" style="color:${info.color}">${stats[key]}</span>
            </div>
        </div>`).join("");
}
renderStats();

function eid(k) { return k.replace(/ /g,"-"); }

function bumpCount(key) {
    const el = document.getElementById("cnt-" + eid(key));
    if (!el) return;
    el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    el.innerText = stats[key];
}

function addHistory(name, icon, color, pts) {
    const t = new Date();
    const ts = [t.getHours(),t.getMinutes(),t.getSeconds()].map(n=>String(n).padStart(2,"0")).join(":");
    scanHistory.unshift({ name, icon, color, ts, pts });
    if (scanHistory.length > MAX_HISTORY) scanHistory.pop();
    const ul = document.getElementById("history-list");
    ul.innerHTML = scanHistory.length === 0
        ? '<li class="history-empty">Chưa có dữ liệu</li>'
        : scanHistory.map(h => `
            <li class="history-item">
                <span>${h.icon} <span style="color:${h.color};font-weight:700">${h.name}</span></span>
                <span class="h-right"><span class="h-pts">+${h.pts||0}pts</span><span class="h-time">${h.ts}</span></span>
            </li>`).join("");
}

function resetStats() {
    if (!confirm("Reset toàn bộ thống kê và điểm số?")) return;
    Object.keys(stats).forEach(k => stats[k] = 0);
    totalTrash = 0; scanHistory = [];
    totalPoints = 0; currentStreak = 0; lastScanTime = 0;
    renderStats();
    renderPointsPanel();
    document.getElementById("total-count").innerText = "0";
    document.getElementById("history-list").innerHTML = '<li class="history-empty">Chưa có dữ liệu</li>';
}

// ============================================================
//  REWARDS SHOP
// ============================================================
const REWARDS = {
  voucher: [
    { id:"v1",  icon:"☕", name:"Cà phê miễn phí",       cost:80,   desc:"1 ly cà phê size M tại căng tin trường hoặc đối tác tham gia.",    category:"voucher", tag:"Phổ biến" },
    { id:"v2",  icon:"🧋", name:"Trà sữa 1/2 giá",        cost:60,   desc:"Giảm 50% cho 1 ly trà sữa bất kỳ tại chuỗi đối tác.",             category:"voucher", tag:"Hot" },
    { id:"v3",  icon:"🍕", name:"Voucher ăn uống 20K",    cost:120,  desc:"Phiếu giảm giá 20.000đ tại căng tin hoặc quán ăn đối tác.",        category:"voucher", tag:"" },
    { id:"v4",  icon:"🚲", name:"Thuê xe đạp miễn phí",   cost:50,   desc:"1 lượt thuê xe đạp công cộng trong khuôn viên trường, miễn phí.",   category:"voucher", tag:"" },
    { id:"v5",  icon:"🖨️", name:"In 20 trang miễn phí",   cost:40,   desc:"20 tờ A4 in đen trắng miễn phí tại phòng in của trường.",           category:"voucher", tag:"Tiện ích" },
    { id:"v6",  icon:"🎬", name:"Vé xem phim -30%",       cost:150,  desc:"Giảm 30% vé xem phim bất kỳ tại rạp đối tác cuối tuần.",           category:"voucher", tag:"Cuối tuần" },
  ],
  item: [
    { id:"i1",  icon:"🎒", name:"Túi vải tái chế SmartBin", cost:200, desc:"Túi canvas in logo SmartBin, thân thiện môi trường, dùng thay túi nilon.", category:"item", tag:"Eco" },
    { id:"i2",  icon:"🖊️", name:"Bút làm từ giấy tái chế",  cost:80,  desc:"Bút bi thân giấy tái chế, mực xanh hoặc đen tuỳ chọn.",          category:"item", tag:"" },
    { id:"i3",  icon:"🌿", name:"Hạt giống trồng cây nhỏ",  cost:100, desc:"Gói hạt giống rau thơm (húng quế, hành, cà chua bi) để trồng tại nhà.", category:"item", tag:"Xanh" },
    { id:"i4",  icon:"🧴", name:"Bình nước giữ nhiệt",      cost:350, desc:"Bình giữ nhiệt 500ml in logo SmartBin, không dùng chai nhựa nữa!", category:"item", tag:"Premium" },
    { id:"i5",  icon:"📓", name:"Sổ tay giấy tái chế",     cost:160, desc:"Sổ tay bìa cứng, ruột giấy tái chế 96 trang, kẻ ngang.",           category:"item", tag:"" },
  ],
  eco: [
    { id:"e1",  icon:"🌳", name:"Trồng 1 cây xanh",         cost:300, desc:"Điểm của bạn tài trợ trồng 1 cây tại rừng phòng hộ — bạn nhận chứng chỉ điện tử.", category:"eco", tag:"Ý nghĩa" },
    { id:"e2",  icon:"🐠", name:"Dọn rác biển 1m²",         cost:150, desc:"Đóng góp vào chiến dịch làm sạch bãi biển, bạn nhận badge 'Người Bảo Vệ Đại Dương'.", category:"eco", tag:"" },
    { id:"e3",  icon:"⚡", name:"1 kWh điện tái tạo",       cost:200, desc:"Tài trợ sản xuất 1 kWh điện từ năng lượng mặt trời cho cộng đồng.", category:"eco", tag:"Sáng tạo" },
    { id:"e4",  icon:"🐝", name:"Bảo vệ tổ ong tự nhiên",   cost:120, desc:"Hỗ trợ dự án nuôi ong tự nhiên, nhận nhãn 'Người Bạn Của Ong'.",   category:"eco", tag:"Dễ thương" },
  ],
  special: [
    { id:"s1",  icon:"🏅", name:"Huy hiệu Chiến Binh Xanh", cost:500, desc:"NFT huy hiệu kỹ thuật số độc quyền 'Chiến Binh Xanh PTIT' — cấp số lượng có hạn!", category:"special", tag:"Độc quyền" },
    { id:"s2",  icon:"🎓", name:"+0.1 điểm rèn luyện",      cost:400, desc:"Cộng 0.1 vào điểm rèn luyện học kỳ (có xác nhận của Đoàn Trường).", category:"special", tag:"Học sinh" },
    { id:"s3",  icon:"📸", name:"Khung ảnh Profile Xanh",   cost:80,  desc:"Bộ filter ảnh đại diện 'SmartBin Champion' dùng trên MXH.",         category:"special", tag:"Trend" },
    { id:"s4",  icon:"🌏", name:"Tên lên Bảng Danh Dự",     cost:250, desc:"Tên bạn sẽ xuất hiện trên bảng Anh Hùng Môi Trường tại khuôn viên.", category:"special", tag:"Vinh danh" },
  ]
};

let currentTab = "voucher";
let pendingReward = null;

function openShop() {
  document.getElementById("shop-overlay").classList.add("open");
  document.getElementById("shop-pts-num").innerText = totalPoints;
  renderShopGrid("voucher");
}
function closeShop() {
  document.getElementById("shop-overlay").classList.remove("open");
  cancelRedeem();
}
function switchTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll(".shop-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  renderShopGrid(tab);
}

function renderShopGrid(tab) {
  const grid = document.getElementById("shop-grid");
  const items = REWARDS[tab] || [];
  grid.innerHTML = items.map(r => {
    const canAfford = totalPoints >= r.cost;
    return `
      <div class="reward-card ${canAfford ? '' : 'locked'}" onclick="${canAfford ? `startRedeem('${r.id}')` : ''}">
        ${r.tag ? `<span class="reward-tag">${r.tag}</span>` : ''}
        <div class="reward-icon">${r.icon}</div>
        <div class="reward-name">${r.name}</div>
        <div class="reward-desc">${r.desc}</div>
        <div class="reward-cost ${canAfford ? 'afford' : 'noafford'}">
          ${canAfford ? '✅' : '🔒'} <strong>${r.cost}</strong> điểm
        </div>
      </div>`;
  }).join("");
}

function startRedeem(id) {
  const all = Object.values(REWARDS).flat();
  const r = all.find(x => x.id === id);
  if (!r) return;
  pendingReward = r;
  document.getElementById("redeem-icon").innerText = r.icon;
  document.getElementById("redeem-name").innerText = r.name;
  document.getElementById("redeem-desc").innerText  = r.desc;
  document.getElementById("redeem-cost").innerText  = `${r.cost} điểm`;
  document.getElementById("redeem-layer").style.display = "flex";
}
function cancelRedeem() {
  pendingReward = null;
  document.getElementById("redeem-layer").style.display = "none";
  document.getElementById("success-layer").style.display = "none";
}
function confirmRedeem() {
  if (!pendingReward) return;
  if (totalPoints < pendingReward.cost) {
    alert("Không đủ điểm!"); return;
  }
  totalPoints -= pendingReward.cost;
  renderPointsPanel();
  document.getElementById("shop-pts-num").innerText = totalPoints;

  // Generate a fake redemption code
  const code = "SB-" + pendingReward.id.toUpperCase() + "-" + Math.random().toString(36).slice(2,8).toUpperCase();
  document.getElementById("success-anim").innerText = pendingReward.icon;
  document.getElementById("success-msg").innerText  = `Bạn đã đổi thành công: ${pendingReward.name}`;
  document.getElementById("success-code").innerText = code;

  document.getElementById("redeem-layer").style.display = "none";
  document.getElementById("success-layer").style.display = "flex";
  speak(`Chúc mừng! Đổi quà thành công: ${pendingReward.name}`);
  pendingReward = null;
  renderShopGrid(currentTab);
}
function closeSuccess() {
  document.getElementById("success-layer").style.display = "none";
}


let voices = [];
window.speechSynthesis.onvoiceschanged = () => { voices = window.speechSynthesis.getVoices(); };
function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "vi-VN"; u.rate = 1.0;
    const vv = (voices.length ? voices : window.speechSynthesis.getVoices());
    const v = vv.find(x => x.lang.includes("vi") || x.name.toLowerCase().includes("viet"));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
}

// ============================================================
//  ROI
// ============================================================
function getROI(canvas) {
    const size = Math.floor(Math.min(canvas.width, canvas.height) * ROI_RATIO);
    const x = Math.floor((canvas.width  - size) / 2);
    const y = Math.floor((canvas.height - size) / 2);
    return { x, y, size };
}

function drawROIOverlay(canvas) {
    document.getElementById("roi-overlay")?.remove();
    const { x, y, size } = getROI(canvas);
    const W = canvas.width, H = canvas.height;
    const ns = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(ns, "svg");
    svg.id = "roi-overlay";
    // Canvas bị CSS scaleX(-1) nên SVG overlay phải mirror theo để khung ROI khớp đúng vị trí
    Object.assign(svg.style, {
        position: "absolute", top: "0", left: "0",
        width: "100%", height: "100%",  // co giãn theo kích thước CSS của canvas
        pointerEvents: "none", zIndex: "3",
        transform: "scaleX(-1)"         // mirror cùng chiều với canvas
    });
    // viewBox theo pixel canvas gốc → SVG tự scale đúng tỷ lệ
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    // dark mask outside ROI
    const mask = document.createElementNS(ns, "mask"); mask.id = "roi-mask";
    const bg = document.createElementNS(ns, "rect");
    bg.setAttribute("width", W); bg.setAttribute("height", H); bg.setAttribute("fill", "white");
    const hole = document.createElementNS(ns, "rect");
    hole.setAttribute("x",x); hole.setAttribute("y",y);
    hole.setAttribute("width",size); hole.setAttribute("height",size);
    hole.setAttribute("fill","black"); hole.setAttribute("rx","4");
    mask.append(bg, hole); svg.appendChild(mask);

    const shadow = document.createElementNS(ns, "rect");
    shadow.setAttribute("width",W); shadow.setAttribute("height",H);
    shadow.setAttribute("fill","rgba(0,0,0,0.55)"); shadow.setAttribute("mask","url(#roi-mask)");
    svg.appendChild(shadow);

    // dashed border
    const border = document.createElementNS(ns, "rect");
    border.id = "roi-border";
    border.setAttribute("x",x); border.setAttribute("y",y);
    border.setAttribute("width",size); border.setAttribute("height",size);
    border.setAttribute("fill","none"); border.setAttribute("stroke","#00e87a");
    border.setAttribute("stroke-width","2.5"); border.setAttribute("stroke-dasharray","8 4");
    border.setAttribute("rx","4");
    svg.appendChild(border);

    // corner accents
    [[x,y,1,1],[x+size,y,-1,1],[x+size,y+size,-1,-1],[x,y+size,1,-1]].forEach(([cx,cy,dx,dy]) => {
        const p = document.createElementNS(ns,"path");
        p.setAttribute("d",`M${cx+dx*18} ${cy} L${cx} ${cy} L${cx} ${cy+dy*18}`);
        p.setAttribute("stroke","#00d4ff"); p.setAttribute("stroke-width","3");
        p.setAttribute("fill","none"); p.setAttribute("stroke-linecap","round");
        svg.appendChild(p);
    });

    document.getElementById("webcam-container").appendChild(svg);
}

function setROIState(state) {
    // state: "idle" | "motion" | "scanning"
    const b = document.getElementById("roi-border"); if (!b) return;
    if (state === "scanning") {
        b.setAttribute("stroke","#ffc800"); b.setAttribute("stroke-dasharray","");
    } else if (state === "motion") {
        b.setAttribute("stroke","#00d4ff"); b.setAttribute("stroke-dasharray","6 3");
    } else {
        b.setAttribute("stroke","#00e87a"); b.setAttribute("stroke-dasharray","8 4");
    }
}

// ============================================================
//  MOTION DETECTION
// ============================================================
function detectMotion(canvas) {
    const { x, y, size } = getROI(canvas);
    const ctx = document.createElement("canvas");
    ctx.width = size; ctx.height = size;
    const c = ctx.getContext("2d");
    c.drawImage(canvas, x, y, size, size, 0, 0, size, size);
    const curr = c.getImageData(0, 0, size, size).data;

    if (!prevFrameData || prevFrameData.length !== curr.length) {
        prevFrameData = curr.slice();
        return 0;
    }

    let changed = 0;
    const total = size * size;
    for (let i = 0; i < curr.length; i += 4) {
        const dr = Math.abs(curr[i]   - prevFrameData[i]);
        const dg = Math.abs(curr[i+1] - prevFrameData[i+1]);
        const db = Math.abs(curr[i+2] - prevFrameData[i+2]);
        if ((dr + dg + db) / 3 > MOTION_THRESHOLD) changed++;
    }
    prevFrameData = curr.slice();
    return (changed / total) * 100;
}

function updateMotionUI(pct) {
    const fill = document.getElementById("motion-fill");
    const txt  = document.getElementById("motion-pct");
    if (!fill || !txt) return;
    const clamped = Math.min(pct, 100);
    fill.style.width = clamped + "%";
    txt.innerText = Math.round(clamped) + "%";
    fill.className = "motion-fill" + (pct >= MOTION_TRIGGER_PCT * 1.5 ? " high" : pct >= MOTION_TRIGGER_PCT ? " trigger" : "");
}

// ============================================================
//  AUTO MODE
// ============================================================
function toggleAutoMode(on) {
    autoMode = on;
    motionDetected = false;
    if (motionTimer) { clearTimeout(motionTimer); motionTimer = null; }
    prevFrameData = null;   // reset frame buffer khi đổi mode
    const mb = document.getElementById("motion-bar");
    const sb = document.getElementById("scan-btn");
    if (on) {
        mb.style.display = "flex";
        sb.style.display = "none";
        setStatus("CHẾ ĐỘ TỰ ĐỘNG — Đặt rác vào khung", "ready");
    } else {
        mb.style.display = "none";
        sb.style.display = "inline-block";
        setROIState("idle");
        setStatus("SẴN SÀNG", "ready");
    }
}

// ============================================================
//  QR CODE
// ============================================================
function showQR(wikiSlug) {
    const url = "https://vi.wikipedia.org/wiki/" + encodeURIComponent(wikiSlug);
    const el  = document.getElementById("qr-code");
    const urlEl = document.getElementById("qr-url");
    el.innerHTML = "";
    urlEl.innerText = url;

    if (typeof QRCode !== "undefined") {
        new QRCode(el, { text: url, width: 110, height: 110, colorDark:"#000", colorLight:"#fff", correctLevel: QRCode.CorrectLevel.M });
    } else {
        // fallback: QR via Google Charts API
        const img = document.createElement("img");
        img.src = `https://chart.googleapis.com/chart?cht=qr&chs=110x110&chl=${encodeURIComponent(url)}`;
        img.width = 110; img.height = 110;
        el.appendChild(img);
    }
}

// ============================================================
//  CONFIDENCE BARS (realtime)
// ============================================================
const BAR_COLORS = ["#00d4ff","#00e87a","#ff8c00","#ffc800","#ff3d5a","#4d8cff","#a0c8ff"];
let lastBarUpdate = 0;

async function updateConfBars() {
    if (!model || !webcam || !isCameraReady) return;
    const panel = document.getElementById("confidence-panel");
    const div   = document.getElementById("conf-bars");
    if (!panel || !div) return;
    try {
        const pred = await model.predict(webcam.canvas);
        const sorted = [...pred].sort((a,b) => b.probability - a.probability);
        if (panel.style.display === "none") panel.style.display = "block";
        div.innerHTML = sorted.map((p,i) => {
            const pct = Math.round(p.probability * 100);
            const col = BAR_COLORS[i % BAR_COLORS.length];
            const lbl = p.className.length > 11 ? p.className.slice(0,11)+"…" : p.className;
            return `<div class="conf-bar-row">
                <span class="conf-bar-label">${lbl}</span>
                <div class="conf-bar-track"><div class="conf-bar-fill" style="width:${pct}%;background:${col}"></div></div>
                <span class="conf-bar-pct" style="color:${col}">${pct}%</span>
            </div>`;
        }).join("");
    } catch(_) {}
}

// ============================================================
//  CLASS MATCHING
// ============================================================
function norm(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"").trim();
}
function matchKey(className) {
    const raw = className.toLowerCase().trim();
    if (TRASH_DICT[raw]) return raw;
    if (CLASS_ALIASES[raw]) return CLASS_ALIASES[raw];
    for (const k of Object.keys(TRASH_DICT)) if (raw.includes(k)) return k;
    const nr = norm(raw);
    for (const k of Object.keys(TRASH_DICT)) if (nr.includes(norm(k))) return k;
    for (const [a,m] of Object.entries(CLASS_ALIASES)) if (nr.includes(norm(a))) return m;
    return null;
}

// ============================================================
//  INIT
// ============================================================
async function init() {
    const btn = document.getElementById("start-btn");
    btn.innerText = "Đang tải AI..."; btn.disabled = true;
    setStatus("ĐANG TẢI", "active");
    try {
        model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
        maxPredictions = model.getTotalClasses();

        const flip = true;
        webcam = new tmImage.Webcam(560, 420, flip);
        await webcam.setup(); await webcam.play();

        document.getElementById("webcam-container").appendChild(webcam.canvas);
        drawROIOverlay(webcam.canvas);
        window.requestAnimationFrame(mainLoop);

        btn.style.display = "none";
        document.getElementById("scan-btn").style.display = "inline-block";
        document.getElementById("reset-btn").style.display = "inline-block";
        document.getElementById("auto-toggle-wrap").style.display = "flex";
        isCameraReady = true;
        setStatus("SẴN SÀNG", "ready");

    } catch(err) {
        console.error(err);
        alert("Lỗi tải Model!\n" + err.message);
        btn.innerText = "🔄 Thử lại"; btn.disabled = false;
        setStatus("LỖI", "");
    }
}

// ============================================================
//  MAIN LOOP
// ============================================================
let loopTick = 0;
async function mainLoop() {
    webcam.update();
    loopTick++;

    // Cập nhật confidence bars mỗi ~400ms (mỗi 24 frame @ ~60fps)
    if (loopTick % 24 === 0) updateConfBars();

    // Motion detection mỗi ~100ms (mỗi 6 frame)
    if (autoMode && loopTick % 6 === 0 && isCameraReady && !isScanning) {
        motionPct = detectMotion(webcam.canvas);
        updateMotionUI(motionPct);

        const now = Date.now();
        const cooldownOk = now - lastAutoScan > MOTION_COOLDOWN_MS;

        if (!cooldownOk) return window.requestAnimationFrame(mainLoop);  // trong cooldown, bỏ qua

        if (motionPct >= MOTION_TRIGGER_PCT) {
            // Có chuyển động → đánh dấu đã thấy vật thể
            motionDetected = true;
            setROIState("motion");
            setStatus("PHÁT HIỆN VẬT THỂ — Đặt vật vào khung...", "motion");
            // Hủy timer cũ nếu vật thể vẫn đang di chuyển
            if (motionTimer) { clearTimeout(motionTimer); motionTimer = null; }

        } else if (motionDetected && motionPct < MOTION_STILL_PCT) {
            // Vật thể vừa dừng lại sau khi di chuyển → scan sau CONFIRM ms
            if (!motionTimer) {
                setStatus("VẬT THỂ ĐÃ ĐẶT — Đang chuẩn bị scan...", "motion");
                motionTimer = setTimeout(() => {
                    motionTimer = null;
                    motionDetected = false;
                    if (autoMode && !isScanning) {
                        scanTrash();
                    }
                }, MOTION_CONFIRM_MS);
            }

        } else if (!motionDetected) {
            // Không có gì, chờ bình thường
            if (motionTimer) { clearTimeout(motionTimer); motionTimer = null; }
            setROIState("idle");
            setStatus("CHẾ ĐỘ TỰ ĐỘNG — Đặt rác vào khung", "ready");
        }
    }

    window.requestAnimationFrame(mainLoop);
}

// ============================================================
//  SCAN
// ============================================================
async function scanTrash() {
    if (!isCameraReady || isScanning) return;
    isScanning = true;
    if (autoMode) lastAutoScan = Date.now();

    const scanBtn = document.getElementById("scan-btn");
    // Chỉ cập nhật nút khi đang ở chế độ thủ công (nút đang hiện)
    if (!autoMode) {
        scanBtn.classList.add("scanning");
        scanBtn.innerText = "⏳ ĐANG PHÂN TÍCH...";
    }
    setStatus("ĐANG PHÂN TÍCH...", "active");
    setROIState("scanning");

    try {
        const canvas = webcam.canvas;
        const { x, y, size } = getROI(canvas);
        const crop = document.createElement("canvas");
        crop.width = size; crop.height = size;
        crop.getContext("2d").drawImage(canvas, x, y, size, size, 0, 0, size, size);

        const preds = await model.predict(crop);
        console.log("[SmartBin]", preds.map(p=>`${p.className}:${(p.probability*100).toFixed(1)}%`).join(" | "));

        const sorted = [...preds].sort((a,b) => b.probability - a.probability);
        const best = sorted.find(p => !p.className.toLowerCase().includes("background") &&
                                      !p.className.toLowerCase().includes("nền"));

        if (best && best.probability >= CONFIDENCE_THRESHOLD) {
            const key = matchKey(best.className);
            if (key) {
                const info = TRASH_DICT[key];
                const conf = Math.round(best.probability * 100);

                // Points
                updateStreak();
                const { earned, base, confBonus, streakBonus } = addPoints(key, conf);
                renderPointsPanel();

                // Show popup
                document.getElementById("popup-icon").innerText = info.icon;
                document.getElementById("res-name").innerText   = info.name;
                document.getElementById("res-name").style.color = info.color;
                document.getElementById("res-action").innerText = "👉 " + info.action;
                document.getElementById("conf-badge").innerText = conf + "% tin cậy";

                // Handling steps in popup
                const stepsEl = document.getElementById("res-steps");
                if (stepsEl) {
                    stepsEl.innerHTML = `
                        <div class="steps-title">📋 Cách xử lý</div>
                        <ol class="steps-list">
                            ${info.steps.map(s => `<li>${s}</li>`).join("")}
                        </ol>
                        <div class="steps-tip">${info.tip}</div>
                        <div class="steps-risk risk-${info.risk.replace(/ /g,'-').toLowerCase()}">
                            ⚠️ Mức độ nguy hại: <strong>${info.risk}</strong>
                        </div>
                    `;
                }

                const popup = document.getElementById("result-popup");
                popup.style.borderColor  = info.color;
                popup.style.boxShadow    = `0 0 40px ${info.color}44, 0 20px 60px rgba(0,0,0,.85)`;
                popup.classList.add("visible");

                // QR code
                showQR(info.wiki);

                // Stats
                stats[key]++; totalTrash++;
                bumpCount(key);
                document.getElementById("total-count").innerText = totalTrash;
                addHistory(info.name, info.icon, info.color, earned);
                speak(info.speak);
                setStatus("ĐÃ NHẬN DIỆN", "done");

                // Points toast
                showPointsToast(earned, streakBonus, confBonus);

                clearTimeout(popupTimer);
                //popupTimer = setTimeout(closePopup, 7000);
                return;
            }
        }

        // Không nhận diện được
        speak("Không nhận diện được. Vui lòng thử lại.");
        setStatus(autoMode ? "CHẾ ĐỘ TỰ ĐỘNG" : "KHÔNG RÕ", autoMode ? "ready" : "");
        setTimeout(resetScanUI, 1200);

    } catch(err) {
        console.error(err);
        setStatus("LỖI QUÉT", "");
        setTimeout(resetScanUI, 1200);
    }
}

function closePopup() {
    clearTimeout(popupTimer);
    document.getElementById("result-popup").classList.remove("visible");
    resetScanUI();
}

function resetScanUI() {
    const btn = document.getElementById("scan-btn");
    btn.classList.remove("scanning");
    btn.innerText = "🎯 NHẬN DIỆN RÁC";
    setROIState("idle");
    motionDetected = false;
    if (motionTimer) { clearTimeout(motionTimer); motionTimer = null; }
    setStatus(autoMode ? "CHẾ ĐỘ TỰ ĐỘNG — Đặt rác vào khung" : "SẴN SÀNG", "ready");
    isScanning = false;
}
