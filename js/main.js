async function init() {
    const btn = document.getElementById("start-btn");
    btn.innerText = "Đang tải AI...";
    btn.disabled = true;
    setStatus("ĐANG TẢI", "active");

    try {
        model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
        webcam = new tmImage.Webcam(560, 420, true);
        await webcam.setup();
        await webcam.play();

        document.getElementById("webcam-container").appendChild(webcam.canvas);
        drawROIOverlay(webcam.canvas);
        window.requestAnimationFrame(mainLoop);

        btn.style.display = "none";
        document.getElementById("scan-btn").style.display = "inline-block";
        document.getElementById("reset-btn").style.display = "inline-block";
        document.getElementById("auto-toggle-wrap").style.display = "flex";
        isCameraReady = true;
        setStatus("SẴN SÀNG", "ready");
    } catch (err) {
        console.error(err);
        alert("Lỗi tải Model!\n" + err.message);
        btn.innerText = "🔄 Thử lại";
        btn.disabled = false;
        setStatus("LỖI", "");
    }
}

async function mainLoop() {
    webcam.update();
    loopTick++;

    if (loopTick % 24 === 0) updateConfBars();

    if (autoMode && loopTick % 6 === 0 && isCameraReady && !isScanning) {
        motionPct = detectMotion(webcam.canvas);
        updateMotionUI(motionPct);

        const now = Date.now();
        const cooldownOk = now - lastAutoScan > MOTION_COOLDOWN_MS;
        if (!cooldownOk) {
            window.requestAnimationFrame(mainLoop);
            return;
        }

        if (motionPct >= MOTION_TRIGGER_PCT) {
            motionDetected = true;
            setROIState("motion");
            setStatus("PHÁT HIỆN VẬT THỂ — Đặt vật vào khung...", "motion");
            if (motionTimer) {
                clearTimeout(motionTimer);
                motionTimer = null;
            }
        } else if (motionDetected && motionPct < MOTION_STILL_PCT) {
            if (!motionTimer) {
                setStatus("VẬT THỂ ĐÃ ĐẶT — Đang chuẩn bị scan...", "motion");
                motionTimer = setTimeout(() => {
                    motionTimer = null;
                    motionDetected = false;
                    if (autoMode && !isScanning) scanTrash();
                }, MOTION_CONFIRM_MS);
            }
        } else if (!motionDetected) {
            if (motionTimer) {
                clearTimeout(motionTimer);
                motionTimer = null;
            }
            setROIState("idle");
            setStatus("CHẾ ĐỘ TỰ ĐỘNG — Đặt rác vào khung", "ready");
        }
    }

    window.requestAnimationFrame(mainLoop);
}
