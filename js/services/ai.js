function cropAndResize(canvas, targetSize = MODEL_INPUT_SIZE) {
    const { x, y, size } = getROI(canvas);
    const out = document.createElement("canvas");
    out.width = targetSize;
    out.height = targetSize;
    out.getContext("2d").drawImage(canvas, x, y, size, size, 0, 0, targetSize, targetSize);
    return out;
}

async function smoothPredict(canvas) {
    const preds = await model.predict(canvas);
    predBuffer.push(preds);
    if (predBuffer.length > SMOOTH_FRAMES) predBuffer.shift();

    return preds.map((p, i) => ({
        className: p.className,
        probability: predBuffer.reduce((sum, frame) => sum + frame[i].probability, 0) / predBuffer.length,
    }));
}

function filterBackground(preds) {
    return preds.filter(p => {
        const name = p.className.toLowerCase();
        return !name.includes("background") && !name.includes("nền");
    });
}

async function scanTrash() {
    if (!isCameraReady || isScanning) return;

    const now = Date.now();
    if (now - lastScanMs < SCAN_DEBOUNCE_MS) return;
    lastScanMs = now;

    isScanning = true;
    if (autoMode) lastAutoScan = now;

    if (!autoMode) {
        const scanBtn = document.getElementById("scan-btn");
        scanBtn.classList.add("scanning");
        scanBtn.innerText = "⏳ ĐANG PHÂN TÍCH...";
    }
    setStatus("ĐANG PHÂN TÍCH...", "active");
    setROIState("scanning");

    try {
        const sorted = filterBackground(await smoothPredict(cropAndResize(webcam.canvas)))
            .sort((a, b) => b.probability - a.probability);
        const best = sorted[0] ?? null;

        if (best && best.probability >= CONFIDENCE_THRESHOLD) {
            const key = matchKey(best.className);
            if (key) {
                const info = TRASH_DICT[key];
                const conf = Math.round(best.probability * 100);

                updateStreak();
                const { earned, confBonus, streakBonus } = addPoints(key, conf);
                renderPointsPanel();

                document.getElementById("popup-icon").innerText = info.icon;
                document.getElementById("res-name").innerText = info.name;
                document.getElementById("res-name").style.color = info.color;
                document.getElementById("res-action").innerText = "👉 " + info.action;
                document.getElementById("conf-badge").innerText = conf + "% tin cậy";

                const stepsEl = document.getElementById("res-steps");
                if (stepsEl) {
                    const riskClass = info.risk.replace(/ /g, "-").toLowerCase();
                    stepsEl.innerHTML = `
                        <div class="steps-title">📋 Cách xử lý</div>
                        <ol class="steps-list">
                            ${info.steps.map(s => `<li>${s}</li>`).join("")}
                        </ol>
                        <div class="steps-tip">${info.tip}</div>
                        <div class="steps-risk risk-${riskClass}">
                            ⚠️ Mức độ nguy hại: <strong>${info.risk}</strong>
                        </div>`;
                }

                const popup = document.getElementById("result-popup");
                popup.style.borderColor = info.color;
                popup.style.boxShadow = `0 0 40px ${info.color}44, 0 20px 60px rgba(0,0,0,.85)`;
                popup.classList.add("visible");

                showQR(info.wiki);
                stats[key]++;
                totalTrash++;
                bumpCount(key);
                document.getElementById("total-count").innerText = totalTrash;
                addHistory(info.name, info.icon, info.color, earned);
                speak(info.speak);
                setStatus("ĐÃ NHẬN DIỆN", "done");
                showPointsToast(earned, streakBonus, confBonus);
                clearTimeout(popupTimer);
                return;
            }
        }

        speak("Không nhận diện được. Vui lòng thử lại.");
        setStatus(autoMode ? "CHẾ ĐỘ TỰ ĐỘNG" : "KHÔNG RÕ", autoMode ? "ready" : "");
        setTimeout(resetScanUI, 1200);
    } catch (err) {
        console.error(err);
        setStatus("LỖI QUÉT", "");
        setTimeout(resetScanUI, 1200);
    }
}
