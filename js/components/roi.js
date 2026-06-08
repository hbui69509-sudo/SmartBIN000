function getROI(canvas) {
    const size = Math.floor(Math.min(canvas.width, canvas.height) * ROI_RATIO);
    const x = Math.floor((canvas.width - size) / 2);
    const y = Math.floor((canvas.height - size) / 2);
    return { x, y, size };
}

function drawROIOverlay(canvas) {
    document.getElementById("roi-overlay")?.remove();

    const { x, y, size } = getROI(canvas);
    const W = canvas.width;
    const H = canvas.height;
    const ns = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(ns, "svg");
    svg.id = "roi-overlay";
    Object.assign(svg.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "3",
        transform: "scaleX(-1)",
    });
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    const mask = document.createElementNS(ns, "mask");
    mask.id = "roi-mask";

    const bg = document.createElementNS(ns, "rect");
    bg.setAttribute("width", W);
    bg.setAttribute("height", H);
    bg.setAttribute("fill", "white");

    const hole = document.createElementNS(ns, "rect");
    hole.setAttribute("x", x);
    hole.setAttribute("y", y);
    hole.setAttribute("width", size);
    hole.setAttribute("height", size);
    hole.setAttribute("fill", "black");
    hole.setAttribute("rx", "4");

    mask.append(bg, hole);
    svg.appendChild(mask);

    const shadow = document.createElementNS(ns, "rect");
    shadow.setAttribute("width", W);
    shadow.setAttribute("height", H);
    shadow.setAttribute("fill", "rgba(0,0,0,0.55)");
    shadow.setAttribute("mask", "url(#roi-mask)");
    svg.appendChild(shadow);

    const border = document.createElementNS(ns, "rect");
    border.id = "roi-border";
    border.setAttribute("x", x);
    border.setAttribute("y", y);
    border.setAttribute("width", size);
    border.setAttribute("height", size);
    border.setAttribute("fill", "none");
    border.setAttribute("stroke", "#00e87a");
    border.setAttribute("stroke-width", "2.5");
    border.setAttribute("stroke-dasharray", "8 4");
    border.setAttribute("rx", "4");
    svg.appendChild(border);

    const corners = [
        [x, y, 1, 1],
        [x + size, y, -1, 1],
        [x + size, y + size, -1, -1],
        [x, y + size, 1, -1],
    ];
    corners.forEach(([cx, cy, dx, dy]) => {
        const path = document.createElementNS(ns, "path");
        path.setAttribute("d", `M${cx + dx * 18} ${cy} L${cx} ${cy} L${cx} ${cy + dy * 18}`);
        path.setAttribute("stroke", "#00d4ff");
        path.setAttribute("stroke-width", "3");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        svg.appendChild(path);
    });

    document.getElementById("webcam-container").appendChild(svg);
}

function setROIState(state) {
    const border = document.getElementById("roi-border");
    if (!border) return;

    if (state === "scanning") {
        border.setAttribute("stroke", "#ffc800");
        border.setAttribute("stroke-dasharray", "");
    } else if (state === "motion") {
        border.setAttribute("stroke", "#00d4ff");
        border.setAttribute("stroke-dasharray", "6 3");
    } else {
        border.setAttribute("stroke", "#00e87a");
        border.setAttribute("stroke-dasharray", "8 4");
    }
}
