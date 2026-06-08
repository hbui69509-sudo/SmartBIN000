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
    const items = REWARDS[tab] || [];
    document.getElementById("shop-grid").innerHTML = items
        .map(r => {
            const canAfford = totalPoints >= r.cost;
            const onclickAttr = canAfford ? `onclick="startRedeem('${r.id}')"` : "";
            const tagHTML = r.tag ? `<span class="reward-tag">${r.tag}</span>` : "";
            const costClass = canAfford ? "afford" : "noafford";
            const costIcon = canAfford ? "✅" : "🔒";
            return `
                <div class="reward-card ${canAfford ? "" : "locked"}" ${onclickAttr}>
                    ${tagHTML}
                    <div class="reward-icon">${r.icon}</div>
                    <div class="reward-name">${r.name}</div>
                    <div class="reward-desc">${r.desc}</div>
                    <div class="reward-cost ${costClass}">
                        ${costIcon} <strong>${r.cost}</strong> điểm
                    </div>
                </div>`;
        })
        .join("");
}

function startRedeem(id) {
    const r = Object.values(REWARDS).flat().find(x => x.id === id);
    if (!r) return;
    pendingReward = r;

    document.getElementById("redeem-icon").innerText = r.icon;
    document.getElementById("redeem-name").innerText = r.name;
    document.getElementById("redeem-desc").innerText = r.desc;
    document.getElementById("redeem-cost").innerText = `${r.cost} điểm`;
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
        alert("Không đủ điểm!");
        return;
    }

    totalPoints -= pendingReward.cost;
    renderPointsPanel();
    document.getElementById("shop-pts-num").innerText = totalPoints;

    const code = "SB-" + pendingReward.id.toUpperCase() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();

    document.getElementById("success-anim").innerText = pendingReward.icon;
    document.getElementById("success-msg").innerText = `Bạn đã đổi thành công: ${pendingReward.name}`;
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
