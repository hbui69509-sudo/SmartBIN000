function detectMotion(canvas) {
    const { x, y, size } = getROI(canvas);
    const tmp = document.createElement("canvas");
    tmp.width = size;
    tmp.height = size;

    const ctx = tmp.getContext("2d");
    ctx.drawImage(canvas, x, y, size, size, 0, 0, size, size);
    const curr = ctx.getImageData(0, 0, size, size).data;

    if (!prevFrameData || prevFrameData.length !== curr.length) {
        prevFrameData = curr.slice();
        return 0;
    }

    let changed = 0;
    const total = size * size;
    for (let i = 0; i < curr.length; i += 4) {
        const dr = Math.abs(curr[i] - prevFrameData[i]);
        const dg = Math.abs(curr[i + 1] - prevFrameData[i + 1]);
        const db = Math.abs(curr[i + 2] - prevFrameData[i + 2]);
        if ((dr + dg + db) / 3 > MOTION_THRESHOLD) changed++;
    }

    prevFrameData = curr.slice();
    return (changed / total) * 100;
}

function updateMotionUI(pct) {
    const fill = document.getElementById("motion-fill");
    const txt = document.getElementById("motion-pct");
    if (!fill || !txt) return;

    const clamped = Math.min(pct, 100);
    fill.style.width = clamped + "%";
    txt.innerText = Math.round(clamped) + "%";
    fill.className = "motion-fill" + (pct >= MOTION_TRIGGER_PCT * 1.5 ? " high" : pct >= MOTION_TRIGGER_PCT ? " trigger" : "");
}

function toggleAutoMode(on) {
    autoMode = on;
    motionDetected = false;
    prevFrameData = null;
    predBuffer = [];

    if (motionTimer) {
        clearTimeout(motionTimer);
        motionTimer = null;
    }

    const motionBar = document.getElementById("motion-bar");
    const scanBtn = document.getElementById("scan-btn");

    if (on) {
        motionBar.style.display = "flex";
        scanBtn.style.display = "none";
        setStatus("CHẾ ĐỘ TỰ ĐỘNG — Đặt rác vào khung", "ready");
    } else {
        motionBar.style.display = "none";
        scanBtn.style.display = "inline-block";
        setROIState("idle");
        setStatus("SẴN SÀNG", "ready");
    }
}
