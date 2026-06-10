const MODEL_URL = "https://teachablemachine.withgoogle.com/models/CRCsS6ab8/";
const CONFIDENCE_THRESHOLD = 0.72;
const ROI_RATIO = 0.50;
const MODEL_INPUT_SIZE = 224;
const MAX_HISTORY = 5;
const MOTION_THRESHOLD = 10;
const MOTION_TRIGGER_PCT = 3;
const MOTION_STILL_PCT = 1.5;
const MOTION_COOLDOWN_MS = 4000;
const MOTION_CONFIRM_MS = 800;
const STREAK_TIMEOUT_MS = 30000;
const SMOOTH_FRAMES = 5;
const SCAN_DEBOUNCE_MS = 1500;

const TRASH_DICT = {
    "Nhựa": {
        name: "Nhựa",
        action: "Bỏ Thùng Vàng",
        color: "#00d4ff",
        icon: "🧴",
        wiki: "Nhựa",
        speak: "Nhựa. Vui lòng bỏ vào thùng màu vàng.",
        points: 10,
        risk: "Thấp",
        steps: [
            "Rửa sạch chai lọ, hộp nhựa trước khi bỏ",
            "Loại bỏ nắp kim loại nếu có",
            "Bỏ vào thùng tái chế màu vàng",
            "Nhựa PET, HDPE có thể tái chế thành quần áo, đồ dùng mới",
        ],
        tip: "♻️ 1 chai nhựa tái chế = tiết kiệm đủ điện để chạy bóng đèn 6 tiếng!",
    },
    "Giấy": {
        name: "Giấy",
        action: "Bỏ Thùng Xanh Dương",
        color: "#ff8c00",
        icon: "📄",
        wiki: "Giấy",
        speak: "Giấy. Vui lòng bỏ vào thùng màu xanh dương.",
        points: 8,
        risk: "Thấp",
        steps: [
            "Giữ giấy khô ráo, không dính ướt",
            "Xếp gọn, tháo ghim, kẹp kim loại",
            "Bỏ vào thùng xanh dương hoặc giao cho vựa ve chai",
            "Carton, báo, giấy văn phòng đều tái chế được",
        ],
        tip: "🌳 Tái chế 1 tấn giấy = cứu 17 cây xanh và 26.000 lít nước!",
    },
    "Kim Loại": {
        name: "Kim Loại",
        action: "Bỏ Thùng Vàng",
        color: "#c0c8e0",
        icon: "🔩",
        wiki: "Kim_loại",
        speak: "Kim loại. Vui lòng bỏ vào thùng màu vàng.",
        points: 15,
        risk: "Thấp",
        steps: [
            "Rửa sạch lon, hộp thiếc trước khi bỏ",
            "Có thể bóp dẹp để tiết kiệm chỗ",
            "Bỏ vào thùng tái chế màu vàng",
            "Kim loại có thể tái chế vô hạn lần mà không mất chất lượng",
        ],
        tip: "⚡ Tái chế 1 lon nhôm tiết kiệm điện bằng xem TV 3 tiếng!",
    },
    "Thủy Tinh": {
        name: "Thủy Tinh",
        action: "Cẩn thận, Bỏ Thùng Vàng",
        color: "#a0c8ff",
        icon: "🍾",
        wiki: "Thủy_tinh",
        speak: "Thủy tinh. Cẩn thận rơi vỡ, bỏ vào thùng vàng.",
        points: 12,
        risk: "Trung bình",
        steps: [
            "⚠️ Cẩn thận mảnh vỡ sắc nhọn",
            "Rửa sạch bên trong chai lọ",
            "Đặt nhẹ nhàng vào thùng, không ném mạnh",
            "Thủy tinh có thể tái chế 100%, giữ nguyên chất lượng mãi mãi",
        ],
        tip: "🔄 Thủy tinh là vật liệu tái chế hoàn hảo nhất — không bao giờ giảm chất lượng!",
    },
    "Rác Điện Tử": {
        name: "Rác Điện Tử",
        action: "Thu Gom Riêng",
        color: "#ff3d5a",
        icon: "📱",
        wiki: "Rác_thải_điện_tử",
        speak: "Cảnh báo. Rác điện tử nguy hại, cần thu gom riêng.",
        points: 20,
        risk: "Rất cao",
        steps: [
            "⛔ KHÔNG bỏ vào thùng thường — rất nguy hiểm!",
            "Xóa dữ liệu cá nhân trước khi bỏ",
            "Mang đến điểm thu gom rác điện tử chuyên dụng",
            "Liên hệ nhà sản xuất hoặc chuỗi điện máy để thu hồi miễn phí",
        ],
        tip: "☠️ Pin và vi mạch chứa chì, thủy ngân — gây ung thư nếu thấm vào đất nước!",
    },
    "Rác Hữu Cơ": {
        name: "Rác Hữu Cơ",
        action: "Bỏ Thùng Xanh Lá",
        color: "#00e87a",
        icon: "🍃",
        wiki: "Chất_thải_hữu_cơ",
        speak: "Rác hữu cơ. Vui lòng bỏ vào thùng xanh lá.",
        points: 5,
        risk: "Thấp",
        steps: [
            "Bỏ vào thùng màu xanh lá chuyên rác hữu cơ",
            "Có thể ủ phân compost tại nhà",
            "Vỏ trái cây, thức ăn thừa đều phân hủy tự nhiên",
            "Tuyệt đối không trộn với rác nhựa hoặc rác nguy hại",
        ],
        tip: "🌱 Rác hữu cơ ủ thành phân compost = phân bón tự nhiên siêu tốt cho cây!",
    },
    "Rác Vô Cơ": {
        name: "Rác Vô Cơ",
        action: "Bỏ Thùng Đỏ",
        color: "#4d8cff",
        icon: "🗑️",
        wiki: "Rác_thải",
        speak: "Rác vô cơ sinh hoạt. Vui lòng bỏ thùng đỏ.",
        points: 3,
        risk: "Thấp",
        steps: [
            "Bỏ vào thùng rác màu đỏ hoặc đen (rác thải thông thường)",
            "Buộc chặt túi rác trước khi bỏ",
            "Sẽ được thu gom và xử lý tại bãi chôn lấp",
            "Cố gắng giảm thiểu loại rác này trong sinh hoạt hàng ngày",
        ],
        tip: "💡 Tip: Thay thế đồ nhựa dùng một lần bằng sản phẩm tái sử dụng để giảm rác vô cơ!",
    },
};

const POINT_RANKS = [
    { min: 0, label: "🌱 Tân Binh Xanh", color: "#6b6b80" },
    { min: 50, label: "🌿 Người Bảo Vệ", color: "#00e87a" },
    { min: 150, label: "♻️ Chiến Binh Tái Chế", color: "#00d4ff" },
    { min: 300, label: "⭐ Anh Hùng Môi Trường", color: "#ffc800" },
    { min: 500, label: "🏆 Huyền Thoại Xanh", color: "#ff8c00" },
    { min: 1000, label: "🌍 Vệ Sĩ Trái Đất", color: "#ff3d5a" },
];

const CLASS_ALIASES = {
    "plastic": "nhựa",
    "paper": "giấy",
    "metal": "kim loại",
    "glass": "thủy tinh",
    "electronic": "rác điện tử",
    "organic": "rác hữu cơ",
    "inorganic": "rác vô cơ",
    "nhua": "nhựa",
    "giay": "giấy",
    "kim loai": "kim loại",
    "thuy tinh": "thủy tinh",
    "huu co": "rác hữu cơ",
    "vo co": "rác vô cơ",
    "dien tu": "rác điện tử",
};

const REWARDS = {
    voucher: [
        { id: "v1", icon: "☕", name: "Cà phê miễn phí", cost: 80, tag: "Phổ biến", desc: "1 ly cà phê size M tại căng tin trường hoặc đối tác tham gia." },
        { id: "v2", icon: "🧋", name: "Trà sữa 1/2 giá", cost: 60, tag: "Hot", desc: "Giảm 50% cho 1 ly trà sữa bất kỳ tại chuỗi đối tác." },
        { id: "v3", icon: "🍕", name: "Voucher ăn uống 20K", cost: 120, tag: "", desc: "Phiếu giảm giá 20.000đ tại căng tin hoặc quán ăn đối tác." },
        { id: "v4", icon: "🚲", name: "Thuê xe đạp miễn phí", cost: 50, tag: "", desc: "1 lượt thuê xe đạp công cộng trong khuôn viên trường, miễn phí." },
        { id: "v5", icon: "🖨️", name: "In 20 trang miễn phí", cost: 40, tag: "Tiện ích", desc: "20 tờ A4 in đen trắng miễn phí tại phòng in của trường." },
        { id: "v6", icon: "🎬", name: "Vé xem phim -30%", cost: 150, tag: "Cuối tuần", desc: "Giảm 30% vé xem phim bất kỳ tại rạp đối tác cuối tuần." },
    ],
    item: [
        { id: "i1", icon: "🎒", name: "Túi vải tái chế SmartBin", cost: 200, tag: "Eco", desc: "Túi canvas in logo SmartBin, thân thiện môi trường, dùng thay túi nilon." },
        { id: "i2", icon: "🖊️", name: "Bút làm từ giấy tái chế", cost: 80, tag: "", desc: "Bút bi thân giấy tái chế, mực xanh hoặc đen tuỳ chọn." },
        { id: "i3", icon: "🌿", name: "Hạt giống trồng cây nhỏ", cost: 100, tag: "Xanh", desc: "Gói hạt giống rau thơm (húng quế, hành, cà chua bi) để trồng tại nhà." },
        { id: "i4", icon: "🧴", name: "Bình nước giữ nhiệt", cost: 350, tag: "Premium", desc: "Bình giữ nhiệt 500ml in logo SmartBin, không dùng chai nhựa nữa!" },
        { id: "i5", icon: "📓", name: "Sổ tay giấy tái chế", cost: 160, tag: "", desc: "Sổ tay bìa cứng, ruột giấy tái chế 96 trang, kẻ ngang." },
    ],
    eco: [
        { id: "e1", icon: "🌳", name: "Trồng 1 cây xanh", cost: 300, tag: "Ý nghĩa", desc: "Điểm của bạn tài trợ trồng 1 cây tại rừng phòng hộ — bạn nhận chứng chỉ điện tử." },
        { id: "e2", icon: "🐠", name: "Dọn rác biển 1m²", cost: 150, tag: "", desc: "Đóng góp vào chiến dịch làm sạch bãi biển, bạn nhận badge 'Người Bảo Vệ Đại Dương'." },
        { id: "e3", icon: "⚡", name: "1 kWh điện tái tạo", cost: 200, tag: "Sáng tạo", desc: "Tài trợ sản xuất 1 kWh điện từ năng lượng mặt trời cho cộng đồng." },
        { id: "e4", icon: "🐝", name: "Bảo vệ tổ ong tự nhiên", cost: 120, tag: "Dễ thương", desc: "Hỗ trợ dự án nuôi ong tự nhiên, nhận nhãn 'Người Bạn Của Ong'." },
    ],
    special: [
        { id: "s1", icon: "🏅", name: "Huy hiệu Chiến Binh Xanh", cost: 500, tag: "Độc quyền", desc: "NFT huy hiệu kỹ thuật số độc quyền 'Chiến Binh Xanh PTIT' — cấp số lượng có hạn!" },
        { id: "s2", icon: "🎓", name: "+0.1 điểm rèn luyện", cost: 400, tag: "Học sinh", desc: "Cộng 0.1 vào điểm rèn luyện học kỳ (có xác nhận của Đoàn Trường)." },
        { id: "s3", icon: "📸", name: "Khung ảnh Profile Xanh", cost: 80, tag: "Trend", desc: "Bộ filter ảnh đại diện 'SmartBin Champion' dùng trên MXH." },
        { id: "s4", icon: "🌏", name: "Tên lên Bảng Danh Dự", cost: 250, tag: "Vinh danh", desc: "Tên bạn sẽ xuất hiện trên bảng Anh Hùng Môi Trường tại khuôn viên." },
    ],
};

const BAR_COLORS = ["#00d4ff", "#00e87a", "#ff8c00", "#ffc800", "#ff3d5a", "#4d8cff", "#a0c8ff"];
