import cv2
import numpy as np
import os
import threading
from gtts import gTTS
import pygame
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import datetime
import time
from ultralytics import YOLO

# ---------------------------------------------------------
# CẤU HÌNH HỆ THỐNG
# ---------------------------------------------------------
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
pygame.mixer.init()

def write_vietnamese(cv2_img, text, position, text_color=(255, 255, 255), font_size=30):
    pil_img = Image.fromarray(cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(pil_img)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except IOError:
        font = ImageFont.load_default()
    rgb_color = (text_color[2], text_color[1], text_color[0]) 
    draw.text(position, text, font=font, fill=rgb_color)
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

def speak_vietnamese(text):
    def run_speech():
        try:
            tts = gTTS(text=text, lang='vi')
            fp = BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            pygame.mixer.music.load(fp)
            pygame.mixer.music.play()
        except Exception:
            pass
    if not pygame.mixer.music.get_busy():
        threading.Thread(target=run_speech, daemon=True).start()

# ---------------------------------------------------------
# BẢNG MÀU UI (MỚI)
# ---------------------------------------------------------
BG_COLOR = (20, 20, 25)       # Nền tổng thể Dark Mode
PANEL_COLOR = (40, 40, 45)    # Nền của bảng điều khiển
HEADER_COLOR = (30, 150, 80)  # Xanh PTIT
CARD_COLOR = (50, 50, 55)     # Nền của từng thẻ thống kê

# ---------------------------------------------------------
# TỪ ĐIỂN RÁC & YOLO
# ---------------------------------------------------------
instructions = {
    "nhựa": {"name": "RÁC NHỰA", "action": "Bỏ Thùng Vàng", "color": (0, 220, 255), "speak": "Nhựa. Vui lòng bỏ vào thùng màu vàng."},
    "giấy": {"name": "RÁC GIẤY", "action": "Bỏ Thùng Xanh Dương", "color": (255, 150, 0), "speak": "Giấy. Vui lòng bỏ vào thùng màu xanh dương."},
    "kim loại": {"name": "KIM LOẠI", "action": "Bỏ Thùng Vàng", "color": (0, 220, 255), "speak": "Kim loại. Vui lòng bỏ vào thùng màu vàng."},
    "rác điện tử": {"name": "ĐIỆN TỬ", "action": "Thu Gom Riêng", "color": (0, 0, 255), "speak": "Cảnh báo rác nguy hại."},
    "rác hữu cơ": {"name": "HỮU CƠ", "action": "Bỏ Thùng Xanh Lá", "color": (0, 255, 0), "speak": "Rác hữu cơ. Vui lòng bỏ vào thùng màu xanh lá."},
    "rác vô cơ": {"name": "VÔ CƠ", "action": "Bỏ Thùng Đỏ", "color": (0, 100, 255), "speak": "Rác vô cơ sinh hoạt. Vui lòng bỏ vào thùng màu đỏ."}
}

thong_ke_rac = {key: 0 for key in instructions.keys()}

yolo_to_trash = {
    'bottle': 'nhựa', 'cup': 'nhựa', 'wine glass': 'nhựa',
    'book': 'giấy', 'paper': 'giấy',
    'can': 'kim loại', 'scissors': 'kim loại', 'knife': 'kim loại',
    'cell phone': 'rác điện tử', 'laptop': 'rác điện tử', 'mouse': 'rác điện tử', 'keyboard': 'rác điện tử',
    'apple': 'rác hữu cơ', 'banana': 'rác hữu cơ', 'orange': 'rác hữu cơ', 'carrot': 'rác hữu cơ'
}

print("Đang khởi động AI YOLOv8...")
try:
    model = YOLO("yolov8n.pt")
except Exception as e:
    print(f"LỖI TẢI YOLO: {e}")
    exit()

# Cài đặt Camera
camera_id = 1 
camera = cv2.VideoCapture(camera_id)

app_state = "WAITING" 
show_result_until = 0
current_display_info = None
current_confidence = 0
current_bbox = None

print("Giao diện Modern Kiosk đã sẵn sàng!")

# ---------------------------------------------------------
# VÒNG LẶP CHÍNH
# ---------------------------------------------------------
while True:
    success, raw_frame = camera.read()
    if not success:
        time.sleep(0.5)
        continue

    # Canvas tổng (1280x720)
    canvas = np.full((720, 1280, 3), BG_COLOR, dtype=np.uint8)
    
    # Kích thước khung Camera
    cam_x, cam_y = 30, 90
    cam_w, cam_h = 840, 600
    frame_resized = cv2.resize(raw_frame, (cam_w, cam_h))
    
    # ==========================================
    # 1. XỬ LÝ KHUNG HÌNH CAMERA
    # ==========================================
    if app_state == "WAITING":
        # Nút hướng dẫn gọn gàng ở góc dưới
        cv2.rectangle(frame_resized, (240, cam_h - 70), (600, cam_h - 20), (20, 20, 20), -1)
        cv2.rectangle(frame_resized, (240, cam_h - 70), (600, cam_h - 20), (0, 255, 0), 2)
        frame_resized = write_vietnamese(frame_resized, "🎯 ĐẶT RÁC VÀ NHẤN [SPACE]", (265, cam_h - 55), text_color=(0, 255, 0), font_size=20)

    elif app_state == "SHOW_RESULT":
        # Làm mờ khung nền
        dark_overlay = np.zeros_like(frame_resized, dtype=np.uint8)
        frame_resized = cv2.addWeighted(frame_resized, 0.4, dark_overlay, 0.6, 0)
        
        # Vẽ hộp YOLO ôm sát rác
        if current_bbox is not None:
            x1, y1, x2, y2 = current_bbox
            cv2.rectangle(frame_resized, (x1, y1), (x2, y2), current_display_info["color"], 3)
            cv2.rectangle(frame_resized, (x1, max(0, y1-30)), (x1+150, y1), current_display_info["color"], -1)
            frame_resized = write_vietnamese(frame_resized, f"{current_confidence}%", (x1+10, max(5, y1-25)), text_color=(0,0,0), font_size=18)
        
        # Thẻ Kết Quả Nổi (Pop-up Card) tinh tế ở giữa
        card_w, card_h = 560, 130
        card_x = int(cam_w/2 - card_w/2)
        card_y = int(cam_h/2 - card_h/2)
        
        cv2.rectangle(frame_resized, (card_x, card_y), (card_x + card_w, card_y + card_h), (30, 30, 35), -1)
        # Đường kẻ màu mỏng trên cùng của Card
        cv2.rectangle(frame_resized, (card_x, card_y), (card_x + card_w, card_y + 5), current_display_info["color"], -1)
        
        frame_resized = write_vietnamese(frame_resized, f"♻️ {current_display_info['name']}", (card_x + 30, card_y + 25), text_color=current_display_info["color"], font_size=30)
        frame_resized = write_vietnamese(frame_resized, f"Hướng dẫn: {current_display_info['action']}", (card_x + 30, card_y + 75), text_color=(200, 200, 200), font_size=24)

        if time.time() > show_result_until:
            app_state = "WAITING"

    # Gắn Camera vào Canvas và kẻ viền mỏng
    canvas[cam_y:cam_y+cam_h, cam_x:cam_x+cam_w] = frame_resized
    cv2.rectangle(canvas, (cam_x, cam_y), (cam_x+cam_w, cam_y+cam_h), (80, 80, 80), 1)

    # ==========================================
    # 2. THANH HEADER TRÊN CÙNG
    # ==========================================
    cv2.rectangle(canvas, (0, 0), (1280, 60), HEADER_COLOR, -1) 
    canvas = write_vietnamese(canvas, "✨ SMARTBIN KIOSK - PTIT AI", (30, 14), text_color=(255, 255, 255), font_size=26)
    
    # Trạng thái hệ thống nhỏ gọn góc phải
    status_text = "ĐANG CHỜ" if app_state == "WAITING" else "ĐÃ NHẬN DIỆN"
    status_color = (0, 255, 0) if app_state == "WAITING" else (0, 255, 255)
    cv2.rectangle(canvas, (1080, 12), (1250, 48), (20, 100, 50), -1)
    canvas = write_vietnamese(canvas, status_text, (1095, 18), text_color=status_color, font_size=18)

    # ==========================================
    # 3. SIDEBAR THỐNG KÊ (BÊN PHẢI)
    # ==========================================
    side_x, side_y = 900, 90
    side_w, side_h = 350, 600
    
    # Nền Sidebar
    cv2.rectangle(canvas, (side_x, side_y), (side_x + side_w, side_y + side_h), PANEL_COLOR, -1)
    canvas = write_vietnamese(canvas, "📊 THỐNG KÊ RÁC", (side_x + 25, side_y + 20), text_color=(255, 255, 255), font_size=24)
    cv2.line(canvas, (side_x + 25, side_y + 60), (side_x + side_w - 25, side_y + 60), (100, 100, 100), 1)

    y_pos = side_y + 80
    tong_rac = 0
    
    # Vẽ các thẻ (Card) cho từng loại rác
    for key, value in thong_ke_rac.items():
        name = instructions[key]["name"]
        color = instructions[key]["color"]
        
        # Nền thẻ màu xám
        cv2.rectangle(canvas, (side_x + 25, y_pos), (side_x + side_w - 25, y_pos + 45), CARD_COLOR, -1)
        # Vạch màu đánh dấu bên trái thẻ
        cv2.rectangle(canvas, (side_x + 25, y_pos), (side_x + 30, y_pos + 45), color, -1)
        
        canvas = write_vietnamese(canvas, name, (side_x + 45, y_pos + 8), text_color=(220, 220, 220), font_size=20)
        canvas = write_vietnamese(canvas, str(value), (side_x + side_w - 60, y_pos + 8), text_color=(255, 255, 255), font_size=22)
        
        tong_rac += value
        y_pos += 55
    
    # Thẻ TỔNG CỘNG bự chà bá ở dưới cùng
    cv2.rectangle(canvas, (side_x + 25, side_y + side_h - 110), (side_x + side_w - 25, side_y + side_h - 40), (60, 60, 65), -1)
    canvas = write_vietnamese(canvas, "TỔNG CỘNG:", (side_x + 45, side_y + side_h - 90), text_color=(255, 255, 255), font_size=24)
    canvas = write_vietnamese(canvas, str(tong_rac), (side_x + side_w - 70, side_y + side_h - 95), text_color=(0, 255, 0), font_size=32)
    
    # Ghi chú Tắt
    canvas = write_vietnamese(canvas, "Nhấn phím [Q] để Tắt và Lưu Báo cáo", (side_x + 35, side_y + side_h - 25), text_color=(150, 150, 150), font_size=16)

    cv2.imshow("Modern SmartBin UI", canvas)

    # ==========================================
    # 4. XỬ LÝ LỆNH BẤM
    # ==========================================
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord(' ') and app_state == "WAITING":
        
        results = model.predict(frame_resized, conf=0.4, verbose=False)
        detected_valid_trash = False
        
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                yolo_name = model.names[cls_id]
                
                if yolo_name == 'person':
                    continue
                
                if yolo_name in yolo_to_trash:
                    trash_type = yolo_to_trash[yolo_name]
                    current_display_info = instructions[trash_type]
                    current_confidence = round(float(box.conf[0]) * 100)
                    
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    current_bbox = (x1, y1, x2, y2)
                    
                    thong_ke_rac[trash_type] += 1
                    speak_vietnamese(current_display_info["speak"])
                    
                    app_state = "SHOW_RESULT"
                    show_result_until = time.time() + 4
                    detected_valid_trash = True
                    break
            if detected_valid_trash:
                break
                
        if not detected_valid_trash:
            speak_vietnamese("Không nhận diện được rác. Vui lòng thử lại.")

camera.release()
cv2.destroyAllWindows()

# Lưu báo cáo (Giữ nguyên logic cũ)
if tong_rac > 0:
    hom_nay = datetime.datetime.now().strftime("%d_%m_%Y_%H%M")
    with open(f"Bao_cao_rac_{hom_nay}.txt", "w", encoding="utf-8") as f:
        f.write(f"--- BÁO CÁO THỐNG KÊ ({datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}) ---\n\n")
        for loai, so_luong in thong_ke_rac.items():
            f.write(f"- {instructions[loai]['name']}: {so_luong}\n")
        f.write(f"\n=> TỔNG CỘNG: {tong_rac}\n")
