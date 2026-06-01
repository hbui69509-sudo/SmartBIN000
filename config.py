# config.py
BG_COLOR = (20, 20, 25)
PANEL_COLOR = (40, 40, 45)
HEADER_COLOR = (30, 150, 80)
CARD_COLOR = (50, 50, 55)

INSTRUCTIONS = {
    "nhựa": {"name": "RÁC NHỰA", "action": "Bỏ Thùng Vàng", "color": (0, 220, 255), "speak": "Nhựa. Vui lòng bỏ vào thùng màu vàng."},
    "giấy": {"name": "RÁC GIẤY", "action": "Bỏ Thùng Xanh Dương", "color": (255, 150, 0), "speak": "Giấy. Vui lòng bỏ vào thùng màu xanh dương."},
    "kim loại": {"name": "KIM LOẠI", "action": "Bỏ Thùng Vàng", "color": (0, 220, 255), "speak": "Kim loại. Vui lòng bỏ vào thùng màu vàng."},
    "rác điện tử": {"name": "ĐIỆN TỬ", "action": "Thu Gom Riêng", "color": (0, 0, 255), "speak": "Cảnh báo rác nguy hại."},
    "rác hữu cơ": {"name": "HỮU CƠ", "action": "Bỏ Thùng Xanh Lá", "color": (0, 255, 0), "speak": "Rác hữu cơ. Vui lòng bỏ vào thùng màu xanh lá."},
    "rác vô cơ": {"name": "VÔ CƠ", "action": "Bỏ Thùng Đỏ", "color": (0, 100, 255), "speak": "Rác vô cơ sinh hoạt. Vui lòng bỏ vào thùng màu đỏ."}
}

YOLO_TO_TRASH = {
    'bottle': 'nhựa', 'cup': 'nhựa', 'wine glass': 'nhựa',
    'book': 'giấy', 'paper': 'giấy',
    'can': 'kim loại', 'scissors': 'kim loại', 'knife': 'kim loại',
    'cell phone': 'rác điện tử', 'laptop': 'rác điện tử', 'mouse': 'rác điện tử', 'keyboard': 'rác điện tử',
    'apple': 'rác hữu cơ', 'banana': 'rác hữu cơ', 'orange': 'rác hữu cơ', 'carrot': 'rác hữu cơ'
}
