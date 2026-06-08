function getCurrentRank() {
    let rank = POINT_RANKS[0];
    for (const r of POINT_RANKS) {
        if (totalPoints >= r.min) rank = r;
    }
    return rank;
}

function getNextRank() {
    for (const r of POINT_RANKS) {
        if (totalPoints < r.min) return r;
    }
    return null;
}

function addPoints(key, conf) {
    const base = TRASH_DICT[key].points;
    const confBonus = conf >= 90 ? 5 : conf >= 75 ? 2 : 0;
    const streakBonus = currentStreak > 1 ? Math.min(currentStreak - 1, 5) : 0;
    const earned = base + confBonus + streakBonus;
    totalPoints += earned;
    return { earned, confBonus, streakBonus };
}

function updateStreak() {
    const now = Date.now();
    currentStreak = now - lastScanTime < STREAK_TIMEOUT_MS ? currentStreak + 1 : 1;
    lastScanTime = now;
}

function renderPointsPanel() {
    const panel = document.getElementById("points-panel");
    if (!panel) return;

    const rank = getCurrentRank();
    const next = getNextRank();
    const progress = next ? ((totalPoints - rank.min) / (next.min - rank.min)) * 100 : 100;
    const streakHTML = currentStreak > 1 ? `<div class="streak-badge">🔥 Chuỗi x${currentStreak} — +${Math.min(currentStreak - 1, 5)} bonus!</div>` : "";
    const nextLabel = next ? `${totalPoints}/${next.min} → ${next.label}` : "🏆 Đã đạt cấp cao nhất!";

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
                <div class="pts-progress-fill" style="width:${Math.min(progress, 100)}%;background:${rank.color};box-shadow:0 0 10px ${rank.color}66"></div>
            </div>
            <span class="pts-next">${nextLabel}</span>
        </div>
        ${streakHTML}
    `;
}

function showPointsToast(pts, streakBonus, confBonus) {
    const toast = document.getElementById("points-toast");
    if (!toast) return;

    const extras = [];
    if (confBonus > 0) extras.push(`🎯 Độ chính xác cao +${confBonus}`);
    if (streakBonus > 0) extras.push(`🔥 Streak +${streakBonus}`);

    const bonusHTML = extras.length ? `<span class="toast-bonus">${extras.join(" · ")}</span>` : "";

    toast.innerHTML = `<span class="toast-pts">+${pts} điểm</span>${bonusHTML}`;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2500);
}

function setStatus(text, type = "") {
    document.getElementById("status-badge").innerText = text;
    document.getElementById("status-dot").className = "status-dot " + type;
}

function renderStats() {
    const list = document.getElementById("stats-list");
    if (!list) return;
    list.innerHTML = Object.entries(TRASH_DICT)
        .map(([key, info]) => `
            <div class="stat-card" style="border-left-color:${info.color}">
                <span class="stat-name">${info.icon} ${info.name}</span>
                <div class="stat-right">
                    <span class="stat-pts" style="color:${info.color}88">+${info.points}pts</span>
                    <span class="stat-value" id="cnt-${eid(key)}" style="color:${info.color}">${stats[key]}</span>
                </div>
            </div>`)
        .join("");
}

function bumpCount(key) {
    const el = document.getElementById("cnt-" + eid(key));
    if (!el) return;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
    el.innerText = stats[key];
}

function addHistory(name, icon, color, pts) {
    const t = new Date();
    const ts = [t.getHours(), t.getMinutes(), t.getSeconds()]
        .map(n => String(n).padStart(2, "0"))
        .join(":");

    scanHistory.unshift({ name, icon, color, ts, pts });
    if (scanHistory.length > MAX_HISTORY) scanHistory.pop();

    document.getElementById("history-list").innerHTML = scanHistory
        .map(h => `
            <li class="history-item">
                <span>${h.icon} <span style="color:${h.color};font-weight:700">${h.name}</span></span>
                <span class="h-right">
                    <span class="h-pts">+${h.pts || 0}pts</span>
                    <span class="h-time">${h.ts}</span>
                </span>
            </li>`)
        .join("");
}

function resetStats() {
    if (!confirm("Reset toàn bộ thống kê và điểm số?")) return;

    Object.keys(stats).forEach(k => (stats[k] = 0));
    totalTrash = 0;
    scanHistory = [];
    totalPoints = 0;
    currentStreak = 0;
    lastScanTime = 0;

    renderStats();
    renderPointsPanel();
    document.getElementById("total-count").innerText = "0";
    document.getElementById("history-list").innerHTML = '<li class="history-empty">Chưa có dữ liệu</li>';
}

function showQR(wikiSlug) {
    const url = "https://vi.wikipedia.org/wiki/" + encodeURIComponent(wikiSlug);
    const el = document.getElementById("qr-code");
    const urlEl = document.getElementById("qr-url");

    el.innerHTML = "";
    urlEl.innerText = url;

    if (typeof QRCode !== "undefined") {
        new QRCode(el, {
            text: url,
            width: 110,
            height: 110,
            colorDark: "#000",
            colorLight: "#fff",
            correctLevel: QRCode.CorrectLevel.M,
        });
    } else {
        const img = document.createElement("img");
        img.src = `https://chart.googleapis.com/chart?cht=qr&chs=110x110&chl=${encodeURIComponent(url)}`;
        img.width = 110;
        img.height = 110;
        el.appendChild(img);
    }
}

async function updateConfBars() {
    if (!model || !webcam || !isCameraReady) return;

    const panel = document.getElementById("confidence-panel");
    const div = document.getElementById("conf-bars");
    if (!panel || !div) return;

    try {
        const sorted = filterBackground(await smoothPredict(cropAndResize(webcam.canvas)))
            .sort((a, b) => b.probability - a.probability);

        if (panel.style.display === "none") panel.style.display = "block";

        div.innerHTML = sorted
            .map((p, i) => {
                const pct = Math.round(p.probability * 100);
                const col = BAR_COLORS[i % BAR_COLORS.length];
                const lbl = p.className.length > 11 ? p.className.slice(0, 11) + "…" : p.className;
                return `
                    <div class="conf-bar-row">
                        <span class="conf-bar-label">${lbl}</span>
                        <div class="conf-bar-track">
                            <div class="conf-bar-fill" style="width:${pct}%;background:${col}"></div>
                        </div>
                        <span class="conf-bar-pct" style="color:${col}">${pct}%</span>
                    </div>`;
            })
            .join("");
    } catch (_) {}
}

function closePopup() {
    clearTimeout(popupTimer);
    document.getElementById("result-popup").classList.remove("visible");
    resetScanUI();
}

function resetScanUI() {
    const btn = document.getElementById("scan-btn");
    if (btn) {
        btn.classList.remove("scanning");
        btn.innerText = "🎯 NHẬN DIỆN RÁC";
    }

    motionDetected = false;
    if (motionTimer) {
        clearTimeout(motionTimer);
        motionTimer = null;
    }

    setROIState("idle");
    setStatus(autoMode ? "CHẾ ĐỘ TỰ ĐỘNG — Đặt rác vào khung" : "SẴN SÀNG", "ready");
    isScanning = false;
}

renderStats();
