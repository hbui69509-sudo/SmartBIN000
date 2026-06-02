// ============================================================
//  SMARTBIN KIOSK — script.js v3
//  Tính năng:
//    ✅ Motion detection → tự động scan khi phát hiện vật thể
//    ✅ Scan liên tục (confidence bars realtime)
//    ✅ QR code Wikipedia sau mỗi lần nhận diện
//    ✅ ROI crop đúng tọa độ (canvas mirror fix)
//    ✅ Match class linh hoạt (có dấu / không dấu / tiếng Anh)
// ============================================================

const MODEL_URL            = "https://teachablemachine.withgoogle.com/models/J6zhgar8S/";
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
    "nhựa":        { name:"Nhựa",   action:"Bỏ Thùng Vàng",          color:"#00d4ff", icon:"🧴", wiki:"Nhựa",
                     speak:"Nhựa. Vui lòng bỏ vào thùng màu vàng." },
    "giấy":        { name:"Giấy",   action:"Bỏ Thùng Xanh Dương",    color:"#ff8c00", icon:"📄", wiki:"Giấy",
                     speak:"Giấy. Vui lòng bỏ vào thùng màu xanh dương." },
    "kim loại":    { name:"Kim Loại",   action:"Bỏ Thùng Vàng",          color:"#00d4ff", icon:"🔩", wiki:"Kim_loại",
                     speak:"Kim loại. Vui lòng bỏ vào thùng màu vàng." },
    "thủy tinh":   { name:"Thủy Tinh",  action:"Cẩn thận, Bỏ Thùng Vàng",color:"#a0c8ff", icon:"🍾", wiki:"Thủy_tinh",
                     speak:"Thủy tinh. Cẩn thận rơi vỡ, bỏ vào thùng vàng." },
    "rác điện tử": { name:"Rác Điện Tử",    action:"Thu Gom Riêng",           color:"#ff3d5a", icon:"📱", wiki:"Rác_thải_điện_tử",
                     speak:"Cảnh báo. Rác điện tử nguy hại, cần thu gom riêng." },
    "rác hữu cơ":  { name:"Rác Hữu Cơ",    action:"Bỏ Thùng Xanh Lá",       color:"#00e87a", icon:"🍃", wiki:"Chất_thải_hữu_cơ",
                     speak:"Rác hữu cơ. Vui lòng bỏ vào thùng xanh lá." },
    "rác vô cơ":   { name:"Rác Vô Cơ",     action:"Bỏ Thùng Đỏ",            color:"#4d8cff", icon:"🗑️", wiki:"Rác_thải",
                     speak:"Rác vô cơ sinh hoạt. Vui lòng bỏ thùng đỏ." }
};

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
            <span class="stat-value" id="cnt-${eid(key)}" style="color:${info.color}">${stats[key]}</span>
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

function addHistory(name, icon, color) {
    const t = new Date();
    const ts = [t.getHours(),t.getMinutes(),t.getSeconds()].map(n=>String(n).padStart(2,"0")).join(":");
    scanHistory.unshift({ name, icon, color, ts });
    if (scanHistory.length > MAX_HISTORY) scanHistory.pop();
    const ul = document.getElementById("history-list");
    ul.innerHTML = scanHistory.length === 0
        ? '<li class="history-empty">Chưa có dữ liệu</li>'
        : scanHistory.map(h => `
            <li class="history-item">
                <span>${h.icon} <span style="color:${h.color};font-weight:700">${h.name}</span></span>
                <span class="h-time">${h.ts}</span>
            </li>`).join("");
}

function resetStats() {
    if (!confirm("Reset toàn bộ thống kê?")) return;
    Object.keys(stats).forEach(k => stats[k] = 0);
    totalTrash = 0; scanHistory = [];
    renderStats();
    document.getElementById("total-count").innerText = "0";
    document.getElementById("history-list").innerHTML = '<li class="history-empty">Chưa có dữ liệu</li>';
}

// ============================================================
//  SPEECH
// ============================================================
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

                // Show popup
                document.getElementById("popup-icon").innerText = info.icon;
                document.getElementById("res-name").innerText   = info.name + ` (${conf}%)`;
                document.getElementById("res-name").style.color = info.color;
                document.getElementById("res-action").innerText = "👉 " + info.action;
                document.getElementById("conf-badge").innerText = conf + "% tin cậy";
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
                addHistory(info.name, info.icon, info.color);
                speak(info.speak);
                setStatus("ĐÃ NHẬN DIỆN", "done");

                clearTimeout(popupTimer);
                //popupTimer = setTimeout(closePopup, 5000);
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
