import cv2
import numpy as np
from keras.models import load_model
import os
import threading
from gtts import gTTS
import pygame
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import datetime
import time
import mediapipe as mp

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
# BẢNG MÀU UI & TỪ ĐIỂN
# ---------------------------------------------------------
BG_COLOR = (20, 20, 25)
PANEL_COLOR = (40, 40, 45)
HEADER_COLOR = (30, 150, 80)
CARD_COLOR = (50, 50, 55)

instructions = {
    "nhựa": {"name": "RÁC NHỰA", "action": "Bỏ Thùng Vàng", "color": (0, 220, 255), "speak": "Nhựa. Vui lòng bỏ vào thùng màu vàng."},
    "giấy": {"name": "RÁC GIẤY", "action": "Bỏ Thùng Xanh Dương", "color": (255, 150, 0), "speak": "Giấy. Vui lòng bỏ vào thùng màu xanh dương."},
    "kim loại": {"name": "KIM LOẠI", "action": "Bỏ Thùng Vàng", "color": (0, 220, 255), "speak": "Kim loại. Vui lòng bỏ vào thùng màu vàng."},
    "thủy tinh": {"name": "THỦY TINH", "action": "Bỏ Thùng Vàng", "color": (0, 220, 255), "speak": "Thủy tinh. Cẩn thận rơi vỡ, bỏ vào thùng vàng."},
    "rác điện tử": {"name": "ĐIỆN TỬ", "action": "Thu Gom Riêng", "color": (0, 0, 255), "speak": "Cảnh báo rác nguy hại."},
    "rác hữu cơ": {"name": "HỮU CƠ", "action": "Bỏ Thùng Xanh Lá", "color": (0, 255, 0), "speak": "Rác hữu cơ. Vui lòng bỏ vào thùng màu xanh lá."},
    "rác vô cơ": {"name": "VÔ CƠ", "action": "Bỏ Thùng Đỏ", "color": (0, 100, 255), "speak": "Rác vô cơ sinh hoạt. Vui lòng bỏ thùng đỏ."}
}

thong_ke_rac = {key: 0 for key in instructions.keys()}

mp_face_detection = mp.solutions.face_detection
face_detector = mp_face_detection.FaceDetection(min_detection_confidence=0.6)

print("Đang tải AI Teachable Machine...")
try:
    model = load_model("keras_model.h5", compile=False)
    class_names = [line.strip() for line in open("labels.txt", "r", encoding="utf-8").readlines()]
except Exception as e:
    print(f"LỖI TẢI MÔ HÌNH: {e}")
    exit()

camera_id = 1 
camera = cv2.VideoCapture(camera_id)

app_state = "WAITING" 
show_result_until = 0
current_display_info = None
current_confidence = 0

# =========================================================
# BƯỚC TỐI ƯU CỰC MẠNH: VẼ GIAO DIỆN TĨNH SẴN TỪ BÊN NGOÀI
# =========================================================
print("Đang kết xuất Giao diện...")
static_canvas = np.full((720, 1280, 3), BG_COLOR, dtype=np.uint8)

# 1. Vẽ Header (Chỉ làm 1 lần)
cv2.rectangle(static_canvas, (0, 0), (1280, 60), HEADER_COLOR, -1) 
static_canvas = write_vietnamese(static_canvas, "✨ SMARTBIN KIOSK - PTIT AI", (30, 14), text_color=(255, 255, 255), font_size=26)

# 2. Vẽ nền Sidebar Thống Kê (Chỉ làm 1 lần)
side_x, side_y, side_w, side_h = 900, 90, 350, 600
cv2.rectangle(static_canvas, (side_x, side_y), (side_x + side_w, side_y + side_h), PANEL_COLOR, -1)
static_canvas = write_vietnamese(static_canvas, "📊 THỐNG KÊ RÁC", (side_x + 25, side_y + 20), text_color=(255, 255, 255), font_size=24)
cv2.line(static_canvas, (side_x + 25, side_y + 60), (side_x + side_w - 25, side_y + 60), (100, 100, 100), 1)

y_pos_static = side_y + 80
for key in instructions.keys():
    name = instructions[key]["name"]
    color = instructions[key]["color"]
    cv2.rectangle(static_canvas, (side_x + 25, y_pos_static), (side_x + side_w - 25, y_pos_static + 45), CARD_COLOR, -1)
    cv2.rectangle(static_canvas, (side_x + 25, y_pos_static), (side_x + 30, y_pos_static + 45), color, -1)
    static_canvas = write_vietnamese(static_canvas, name, (side_x + 45, y_pos_static + 8), text_color=(220, 220, 220), font_size=20)
    y_pos_static += 55

cv2.rectangle(static_canvas, (side_x + 25, side_y + side_h - 110), (side_x + side_w - 25, side_y + side_h - 40), (60, 60, 65), -1)
static_canvas = write_vietnamese(static_canvas, "TỔNG CỘNG:", (side_x + 45, side_y + side_h - 90), text_color=(255, 255, 255), font_size=24)
static_canvas = write_vietnamese(static_canvas, "Nhấn phím [Q] để Tắt và Lưu Báo cáo", (side_x + 35, side_y + side_h - 25), text_color=(150, 150, 150), font_size=16)

print("Hệ thống đã sẵn sàng không tì vết!")

# ---------------------------------------------------------
# VÒNG LẶP CHÍNH (Siêu nhẹ)
# ---------------------------------------------------------
while True:
    success, raw_frame = camera.read()
    if not success:
        time.sleep(0.5)
        continue

    # Lấy luôn bản nháp tĩnh đã vẽ sẵn, KHÔNG VẼ LẠI TỪ ĐẦU
    canvas = static_canvas.copy()
    
    cam_x, cam_y = 30, 90
    cam_w, cam_h = 840, 600
    frame_resized = cv2.resize(raw_frame, (cam_w, cam_h))
    
    box_size = 400
    start_x = int(cam_w / 2 - box_size / 2)
    start_y = int(cam_h / 2 - box_size / 2)

    # VẼ CAMERA ĐỘNG
    if app_state == "WAITING":
        cv2.rectangle(frame_resized, (start_x, start_y), (start_x + box_size, start_y + box_size), (0, 255, 0), 2)
        cv2.rectangle(frame_resized, (240, cam_h - 70), (600, cam_h - 20), (20, 20, 20), -1)
        cv2.rectangle(frame_resized, (240, cam_h - 70), (600, cam_h - 20), (0, 255, 0), 2)
        frame_resized = write_vietnamese(frame_resized, "🎯 ĐẶT RÁC VÀ NHẤN [SPACE]", (265, cam_h - 55), text_color=(0, 255, 0), font_size=20)

    elif app_state == "SHOW_RESULT":
        dark_overlay = np.zeros_like(frame_resized, dtype=np.uint8)
        frame_resized = cv2.addWeighted(frame_resized, 0.4, dark_overlay, 0.6, 0)
        cv2.rectangle(frame_resized, (start_x, start_y), (start_x + box_size, start_y + box_size), current_display_info["color"], 4)
        
        card_w, card_h = 560, 130
        card_x = int(cam_w/2 - card_w/2)
        card_y = int(cam_h/2 - card_h/2)
        cv2.rectangle(frame_resized, (card_x, card_y), (card_x + card_w, card_y + card_h), (30, 30, 35), -1)
        cv2.rectangle(frame_resized, (card_x, card_y), (card_x + card_w, card_y + 5), current_display_info["color"], -1)
        frame_resized = write_vietnamese(frame_resized, f"♻️ {current_display_info['name']} ({current_confidence}%)", (card_x + 30, card_y + 25), text_color=current_display_info["color"], font_size=30)
        frame_resized = write_vietnamese(frame_resized, f"Hướng dẫn: {current_display_info['action']}", (card_x + 30, card_y + 75), text_color=(200, 200, 200), font_size=24)

        if time.time() > show_result_until:
            app_state = "WAITING"

    canvas[cam_y:cam_y+cam_h, cam_x:cam_x+cam_w] = frame_resized
    cv2.rectangle(canvas, (cam_x, cam_y), (cam_x+cam_w, cam_y+cam_h), (80, 80, 80), 1)

    # CHỈ VẼ THÊM TRẠNG THÁI & SỐ LƯỢNG RÁC VÀO CANVAS MỚI
    status_text = "ĐANG CHỜ" if app_state == "WAITING" else "ĐÃ NHẬN DIỆN"
    status_color = (0, 255, 0) if app_state == "WAITING" else (0, 255, 255)
    cv2.rectangle(canvas, (1080, 12), (1250, 48), (20, 100, 50), -1)
    canvas = write_vietnamese(canvas, status_text, (1095, 18), text_color=status_color, font_size=18)

    y_pos_dynamic = side_y + 80
    tong_rac = 0
    for key, value in thong_ke_rac.items():
        # Chỉ chèn đúng con số vào thay vì chèn cả bảng như trước
        canvas = write_vietnamese(canvas, str(value), (side_x + side_w - 60, y_pos_dynamic + 8), text_color=(255, 255, 255), font_size=22)
        tong_rac += value
        y_pos_dynamic += 55
    
    canvas = write_vietnamese(canvas, str(tong_rac), (side_x + side_w - 70, side_y + side_h - 95), text_color=(0, 255, 0), font_size=32)

    cv2.imshow("Modern SmartBin UI - Optimized", canvas)

    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord(' ') and app_state == "WAITING":
        rgb_frame = cv2.cvtColor(frame_resized, cv2.COLOR_BGR2RGB)
        face_results = face_detector.process(rgb_frame)
        if face_results.detections:
            speak_vietnamese("Phát hiện khuôn mặt. Vui lòng bỏ rác vào khung.")
            continue 
        
        img_crop = frame_resized[start_y:start_y+box_size, start_x:start_x+box_size]
        img_model = cv2.resize(img_crop, (224, 224), interpolation=cv2.INTER_AREA)
        img_array = np.asarray(img_model, dtype=np.float32).reshape(1, 224, 224, 3)
        img_array = (img_array / 127.5) - 1

        prediction = model.predict(img_array, verbose=0)
        best_index = np.argmax(prediction)
        confidence = prediction[0][best_index]
        class_name = class_names[best_index].lower()
        if " " in class_name and class_name.split(" ")[0].isdigit():
            class_name = class_name.split(" ", 1)[1]

        if confidence > 0.75 and "background" not in class_name:
            for k in instructions:
                if k in class_name:
                    current_display_info = instructions[k]
                    current_confidence = round(confidence * 100)
                    thong_ke_rac[k] += 1
                    speak_vietnamese(current_display_info["speak"])
                    app_state = "SHOW_RESULT"
                    show_result_until = time.time() + 4
                    break
        else:
            speak_vietnamese("Không nhận diện được vật thể rõ ràng. Vui lòng thử lại.")

camera.release()
cv2.destroyAllWindows()

if tong_rac > 0:
    hom_nay = datetime.datetime.now().strftime("%d_%m_%Y_%H%M")
    with open(f"Bao_cao_rac_{hom_nay}.txt", "w", encoding="utf-8") as f:
        f.write(f"--- BÁO CÁO THỐNG KÊ ({datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}) ---\n\n")
        for loai, so_luong in thong_ke_rac.items():
            f.write(f"- {instructions[loai]['name']}: {so_luong}\n")
        f.write(f"\n=> TỔNG CỘNG: {tong_rac}\n")
